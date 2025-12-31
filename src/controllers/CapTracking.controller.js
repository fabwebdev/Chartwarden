import { db } from '../config/db.drizzle.js';
import { cap_tracking, patients, payment_applications, claims, payments } from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, sql, or, isNull, inArray } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
/**
 * Cap Tracking Controller
 * Manages Medicare hospice cap amount tracking
 * CRITICAL: CMS compliance requirement
 */
class CapTrackingController {

  /**
   * Calculate cap for a patient for a given cap year
   * POST /billing/cap-tracking/calculate
   *
   * Body: { patient_id, cap_year }
   * Response: { status, data: { cap_tracking_record, alerts_triggered } }
   */
  async calculateCap(request, reply) {
    try {
      const { patient_id, cap_year } = request.body;

      if (!patient_id || !cap_year) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: patient_id, cap_year'
        };
      }

      // Get or create cap tracking record
      const existing = await db
        .select()
        .from(cap_tracking)
        .where(and(
          eq(cap_tracking.patient_id, parseInt(patient_id)),
          eq(cap_tracking.cap_year, parseInt(cap_year)),
          isNull(cap_tracking.deleted_at)
        ))
        .limit(1);

      // Calculate cap year dates (Oct 1 - Sep 30)
      const startYear = cap_year - 1;
      const cap_year_start = `${startYear}-10-01`;
      const cap_year_end = `${cap_year}-09-30`;

      // FY 2025 cap amount: $34,465.34 = 3446534 cents
      // This should be configurable by year
      const cap_amount_cents = parseInt(process.env.CAP_YEAR_AMOUNT_CENTS) || 3446534;

      // Calculate total payments in cap year
      const paymentTotal = await db
        .select({
          total: sql`COALESCE(SUM(${payment_applications.applied_amount}), 0)`
        })
        .from(payment_applications)
        .innerJoin(claims, eq(payment_applications.claim_id, claims.id))
        .where(and(
          eq(claims.patient_id, parseInt(patient_id)),
          gte(claims.service_start_date, cap_year_start),
          lte(claims.service_end_date, cap_year_end),
          isNull(claims.deleted_at)
        ));

      const total_payments_cents = parseInt(paymentTotal[0]?.total || 0);
      const remaining_cap_cents = cap_amount_cents - total_payments_cents;
      const utilization_percentage = ((total_payments_cents / cap_amount_cents) * 100).toFixed(2);

      // Check if cap exceeded
      const cap_exceeded = total_payments_cents > cap_amount_cents;
      const cap_exceeded_amount_cents = cap_exceeded ? total_payments_cents - cap_amount_cents : null;

      // Check alert thresholds
      const alerts_triggered = [];
      const alert_80_triggered = utilization_percentage >= 80;
      const alert_90_triggered = utilization_percentage >= 90;
      const alert_95_triggered = utilization_percentage >= 95;

      if (alert_80_triggered && (!existing[0] || !existing[0].alert_80_triggered)) {
        alerts_triggered.push('80%');
      }
      if (alert_90_triggered && (!existing[0] || !existing[0].alert_90_triggered)) {
        alerts_triggered.push('90%');
      }
      if (alert_95_triggered && (!existing[0] || !existing[0].alert_95_triggered)) {
        alerts_triggered.push('95%');
      }

      const capData = {
        patient_id: parseInt(patient_id),
        cap_year: parseInt(cap_year),
        cap_year_start_date: cap_year_start,
        cap_year_end_date: cap_year_end,
        cap_amount_cents: cap_amount_cents,
        total_payments_cents: total_payments_cents,
        remaining_cap_cents: remaining_cap_cents,
        utilization_percentage: utilization_percentage,
        cap_exceeded: cap_exceeded,
        cap_exceeded_date: cap_exceeded && !existing[0]?.cap_exceeded ? new Date().toISOString().split('T')[0] : existing[0]?.cap_exceeded_date,
        cap_exceeded_amount_cents: cap_exceeded_amount_cents,
        alert_80_triggered: alert_80_triggered,
        alert_80_date: alert_80_triggered && !existing[0]?.alert_80_triggered ? new Date() : existing[0]?.alert_80_date,
        alert_90_triggered: alert_90_triggered,
        alert_90_date: alert_90_triggered && !existing[0]?.alert_90_triggered ? new Date() : existing[0]?.alert_90_date,
        alert_95_triggered: alert_95_triggered,
        alert_95_date: alert_95_triggered && !existing[0]?.alert_95_triggered ? new Date() : existing[0]?.alert_95_date,
        last_calculated_at: new Date(),
        calculation_status: 'CURRENT',
        updated_by_id: request.user?.id
      };

      let result;
      if (existing[0]) {
        // Update existing record
        result = await db
          .update(cap_tracking)
          .set(capData)
          .where(eq(cap_tracking.id, existing[0].id))
          .returning();
      } else {
        // Create new record
        result = await db
          .insert(cap_tracking)
          .values({
            ...capData,
            created_by_id: request.user?.id
          })
          .returning();
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Cap calculated successfully',
        data: {
          cap_tracking: result[0],
          alerts_triggered: alerts_triggered
        }
      };
    } catch (error) {
      logger.error('Error calculating cap:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error calculating cap',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get cap tracking for a patient
   * GET /patients/:id/cap-tracking
   *
   * Query: { cap_year? }
   * Response: { status, data: [cap_tracking_records] }
   */
  async getPatientCap(request, reply) {
    try {
      const { id } = request.params;
      const { cap_year } = request.query;

      let query = db
        .select()
        .from(cap_tracking)
        .where(and(
          eq(cap_tracking.patient_id, parseInt(id)),
          isNull(cap_tracking.deleted_at)
        ));

      if (cap_year) {
        query = query.where(eq(cap_tracking.cap_year, parseInt(cap_year)));
      }

      const results = await query.orderBy(desc(cap_tracking.cap_year));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching patient cap:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching patient cap',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get patients approaching cap
   * GET /billing/cap-tracking/approaching
   *
   * Query: { threshold? (default 80), cap_year? }
   * Response: { status, data: [patients_with_cap_tracking] }
   */
  async getPatientsApproachingCap(request, reply) {
    try {
      const { threshold = 80, cap_year } = request.query;
      const currentYear = new Date().getFullYear();
      const yearToCheck = cap_year ? parseInt(cap_year) : currentYear;

      const results = await db
        .select({
          cap: cap_tracking,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(cap_tracking)
        .leftJoin(patients, eq(cap_tracking.patient_id, patients.id))
        .where(and(
          eq(cap_tracking.cap_year, yearToCheck),
          gte(cap_tracking.utilization_percentage, parseFloat(threshold)),
          isNull(cap_tracking.deleted_at)
        ))
        .orderBy(desc(cap_tracking.utilization_percentage));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching patients approaching cap:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching patients approaching cap',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get cap exceeded patients
   * GET /billing/cap-tracking/exceeded
   *
   * Query: { cap_year? }
   * Response: { status, data: [patients_exceeding_cap] }
   */
  async getCapExceededPatients(request, reply) {
    try {
      const { cap_year } = request.query;
      const currentYear = new Date().getFullYear();
      const yearToCheck = cap_year ? parseInt(cap_year) : currentYear;

      const results = await db
        .select({
          cap: cap_tracking,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(cap_tracking)
        .leftJoin(patients, eq(cap_tracking.patient_id, patients.id))
        .where(and(
          eq(cap_tracking.cap_year, yearToCheck),
          eq(cap_tracking.cap_exceeded, true),
          isNull(cap_tracking.deleted_at)
        ))
        .orderBy(desc(cap_tracking.cap_exceeded_amount_cents));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching cap exceeded patients:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching cap exceeded patients',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get cap utilization report
   * GET /billing/cap-tracking/report
   *
   * Query: { cap_year? }
   * Response: { status, data: { summary, breakdown } }
   */
  async getCapUtilizationReport(request, reply) {
    try {
      const { cap_year } = request.query;
      const currentYear = new Date().getFullYear();
      const yearToCheck = cap_year ? parseInt(cap_year) : currentYear;

      const results = await db
        .select()
        .from(cap_tracking)
        .where(and(
          eq(cap_tracking.cap_year, yearToCheck),
          isNull(cap_tracking.deleted_at)
        ));

      // Calculate summary statistics
      const summary = results.reduce((acc, record) => {
        acc.total_patients += 1;
        acc.total_cap_amount += record.cap_amount_cents;
        acc.total_payments += record.total_payments_cents;
        acc.total_remaining += record.remaining_cap_cents;

        if (record.cap_exceeded) {
          acc.patients_exceeded += 1;
          acc.total_exceeded_amount += record.cap_exceeded_amount_cents || 0;
        }

        if (record.utilization_percentage >= 80) acc.patients_above_80 += 1;
        if (record.utilization_percentage >= 90) acc.patients_above_90 += 1;
        if (record.utilization_percentage >= 95) acc.patients_above_95 += 1;

        return acc;
      }, {
        total_patients: 0,
        total_cap_amount: 0,
        total_payments: 0,
        total_remaining: 0,
        patients_exceeded: 0,
        total_exceeded_amount: 0,
        patients_above_80: 0,
        patients_above_90: 0,
        patients_above_95: 0
      });

      // Add average utilization
      summary.average_utilization = results.length > 0
        ? (results.reduce((sum, r) => sum + parseFloat(r.utilization_percentage), 0) / results.length).toFixed(2)
        : 0;

      reply.code(200);
      return {
        status: 200,
        data: {
          summary: summary,
          breakdown: results
        }
      };
    } catch (error) {
      logger.error('Error generating cap utilization report:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error generating cap utilization report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new CapTrackingController();
