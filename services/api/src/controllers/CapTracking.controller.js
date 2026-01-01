import { db } from '../config/db.drizzle.js';
import {
  cap_tracking,
  patients,
  payment_applications,
  claims,
  compliance_status,
  compliance_issues,
  compliance_alert_config,
  compliance_notifications,
  cap_tracking_history,
  compliance_audit_log
} from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, asc, sql, or, isNull, inArray, between, lt, gt, count, sum } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Cap Tracking Controller
 * Manages Medicare hospice cap amount tracking and compliance monitoring
 * CRITICAL: CMS compliance requirement
 */
class CapTrackingController {

  // ============================================================================
  // CAP TRACKING CORE ENDPOINTS
  // ============================================================================

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
        // Store history before update
        await this._storeCapHistory(existing[0], request.user?.id);

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

      // Create compliance issues if thresholds exceeded
      if (alerts_triggered.length > 0) {
        await this._createCapComplianceIssues(result[0], alerts_triggered, request.user?.id);
      }

      // Log audit event
      await this._logAudit(request, 'CALCULATE', 'CAP_TRACKING', result[0].id, parseInt(patient_id), existing[0] || null, result[0]);

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
      logger.error('Error calculating cap:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error calculating cap',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all cap tracking records with pagination
   * GET /caps
   *
   * Query: { cap_year?, status?, limit?, offset?, sort?, order? }
   * Response: { status, data: [cap_tracking_records], pagination }
   */
  async getAllCaps(request, reply) {
    try {
      const {
        cap_year,
        status,
        limit = 50,
        offset = 0,
        sort = 'cap_year',
        order = 'desc'
      } = request.query;

      const conditions = [isNull(cap_tracking.deleted_at)];

      if (cap_year) {
        conditions.push(eq(cap_tracking.cap_year, parseInt(cap_year)));
      }

      if (status === 'exceeded') {
        conditions.push(eq(cap_tracking.cap_exceeded, true));
      } else if (status === 'warning') {
        conditions.push(and(
          gte(cap_tracking.utilization_percentage, 80),
          eq(cap_tracking.cap_exceeded, false)
        ));
      } else if (status === 'normal') {
        conditions.push(lt(cap_tracking.utilization_percentage, 80));
      }

      // Get total count
      const [{ count: total }] = await db
        .select({ count: sql`COUNT(*)` })
        .from(cap_tracking)
        .where(and(...conditions));

      // Get paginated results with patient info
      const orderColumn = cap_tracking[sort] || cap_tracking.cap_year;
      const orderDir = order === 'asc' ? asc(orderColumn) : desc(orderColumn);

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
        .where(and(...conditions))
        .orderBy(orderDir)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        pagination: {
          total: parseInt(total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(parseInt(total) / parseInt(limit))
        }
      };
    } catch (error) {
      logger.error('Error fetching cap records:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching cap records',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get cap tracking by ID
   * GET /caps/:id
   */
  async getCapById(request, reply) {
    try {
      const { id } = request.params;

      const [result] = await db
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
          eq(cap_tracking.id, parseInt(id)),
          isNull(cap_tracking.deleted_at)
        ))
        .limit(1);

      if (!result) {
        reply.code(404);
        return {
          status: 404,
          message: 'Cap tracking record not found'
        };
      }

      // Log audit event
      await this._logAudit(request, 'READ', 'CAP_TRACKING', result.cap.id, result.cap.patient_id);

      reply.code(200);
      return {
        status: 200,
        data: result
      };
    } catch (error) {
      logger.error('Error fetching cap by ID:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching cap record',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update cap tracking record
   * PUT /caps/:id
   */
  async updateCap(request, reply) {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // Get existing record
      const [existing] = await db
        .select()
        .from(cap_tracking)
        .where(and(
          eq(cap_tracking.id, parseInt(id)),
          isNull(cap_tracking.deleted_at)
        ))
        .limit(1);

      if (!existing) {
        reply.code(404);
        return {
          status: 404,
          message: 'Cap tracking record not found'
        };
      }

      // Store history before update
      await this._storeCapHistory(existing, request.user?.id);

      // Update record
      const [result] = await db
        .update(cap_tracking)
        .set({
          ...updateData,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(cap_tracking.id, parseInt(id)))
        .returning();

      // Log audit event
      await this._logAudit(request, 'UPDATE', 'CAP_TRACKING', result.id, result.patient_id, existing, result);

      reply.code(200);
      return {
        status: 200,
        message: 'Cap tracking record updated successfully',
        data: result
      };
    } catch (error) {
      logger.error('Error updating cap:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating cap record',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete cap tracking record (soft delete)
   * DELETE /caps/:id
   */
  async deleteCap(request, reply) {
    try {
      const { id } = request.params;

      // Get existing record
      const [existing] = await db
        .select()
        .from(cap_tracking)
        .where(and(
          eq(cap_tracking.id, parseInt(id)),
          isNull(cap_tracking.deleted_at)
        ))
        .limit(1);

      if (!existing) {
        reply.code(404);
        return {
          status: 404,
          message: 'Cap tracking record not found'
        };
      }

      // Soft delete
      const [result] = await db
        .update(cap_tracking)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id
        })
        .where(eq(cap_tracking.id, parseInt(id)))
        .returning();

      // Log audit event
      await this._logAudit(request, 'DELETE', 'CAP_TRACKING', result.id, result.patient_id, existing, result);

      reply.code(200);
      return {
        status: 200,
        message: 'Cap tracking record deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting cap:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting cap record',
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

      const conditions = [
        eq(cap_tracking.patient_id, parseInt(id)),
        isNull(cap_tracking.deleted_at)
      ];

      if (cap_year) {
        conditions.push(eq(cap_tracking.cap_year, parseInt(cap_year)));
      }

      const results = await db
        .select()
        .from(cap_tracking)
        .where(and(...conditions))
        .orderBy(desc(cap_tracking.cap_year));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching patient cap:', error);
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
          eq(cap_tracking.cap_exceeded, false),
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
      logger.error('Error fetching patients approaching cap:', error);
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
      logger.error('Error fetching cap exceeded patients:', error);
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
      logger.error('Error generating cap utilization report:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error generating cap utilization report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get cap utilization metrics and historical trends
   * GET /caps/metrics
   *
   * Query: { cap_year?, months? }
   */
  async getCapMetrics(request, reply) {
    try {
      const { cap_year, months = 12 } = request.query;
      const currentYear = new Date().getFullYear();
      const yearToCheck = cap_year ? parseInt(cap_year) : currentYear;

      // Get current snapshot
      const currentData = await db
        .select()
        .from(cap_tracking)
        .where(and(
          eq(cap_tracking.cap_year, yearToCheck),
          isNull(cap_tracking.deleted_at)
        ));

      // Get historical trends
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - parseInt(months));

      const historicalData = await db
        .select()
        .from(cap_tracking_history)
        .where(and(
          eq(cap_tracking_history.cap_year, yearToCheck),
          gte(cap_tracking_history.snapshot_date, startDate.toISOString().split('T')[0])
        ))
        .orderBy(asc(cap_tracking_history.snapshot_date));

      // Calculate metrics
      const metrics = {
        current_year: yearToCheck,
        total_patients: currentData.length,
        total_cap_utilization: 0,
        average_utilization: 0,
        total_payments_cents: 0,
        total_cap_amount_cents: 0,
        patients_exceeded: 0,
        patients_at_risk: 0, // 80-99% utilization
        patients_healthy: 0, // < 80% utilization
        utilization_distribution: {
          under_50: 0,
          '50_to_79': 0,
          '80_to_89': 0,
          '90_to_99': 0,
          '100_plus': 0
        },
        trends: []
      };

      // Calculate distribution
      currentData.forEach(record => {
        const util = parseFloat(record.utilization_percentage);
        metrics.total_payments_cents += record.total_payments_cents;
        metrics.total_cap_amount_cents += record.cap_amount_cents;

        if (record.cap_exceeded) {
          metrics.patients_exceeded++;
          metrics.utilization_distribution['100_plus']++;
        } else if (util >= 90) {
          metrics.patients_at_risk++;
          metrics.utilization_distribution['90_to_99']++;
        } else if (util >= 80) {
          metrics.patients_at_risk++;
          metrics.utilization_distribution['80_to_89']++;
        } else if (util >= 50) {
          metrics.patients_healthy++;
          metrics.utilization_distribution['50_to_79']++;
        } else {
          metrics.patients_healthy++;
          metrics.utilization_distribution.under_50++;
        }
      });

      if (currentData.length > 0) {
        metrics.total_cap_utilization = ((metrics.total_payments_cents / metrics.total_cap_amount_cents) * 100).toFixed(2);
        metrics.average_utilization = (currentData.reduce((sum, r) => sum + parseFloat(r.utilization_percentage), 0) / currentData.length).toFixed(2);
      }

      // Aggregate historical trends by date
      const trendMap = new Map();
      historicalData.forEach(record => {
        const date = record.snapshot_date;
        if (!trendMap.has(date)) {
          trendMap.set(date, {
            date,
            total_payments: 0,
            total_utilization: 0,
            count: 0
          });
        }
        const entry = trendMap.get(date);
        entry.total_payments += record.total_payments_cents;
        entry.total_utilization += parseFloat(record.utilization_percentage);
        entry.count++;
      });

      metrics.trends = Array.from(trendMap.values()).map(entry => ({
        date: entry.date,
        average_utilization: (entry.total_utilization / entry.count).toFixed(2),
        total_payments_cents: entry.total_payments
      }));

      reply.code(200);
      return {
        status: 200,
        data: metrics
      };
    } catch (error) {
      logger.error('Error fetching cap metrics:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching cap metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get cap tracking history for a patient
   * GET /caps/:id/history
   */
  async getCapHistory(request, reply) {
    try {
      const { id } = request.params;
      const { limit = 100, offset = 0 } = request.query;

      const results = await db
        .select()
        .from(cap_tracking_history)
        .where(eq(cap_tracking_history.cap_tracking_id, parseInt(id)))
        .orderBy(desc(cap_tracking_history.snapshot_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching cap history:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching cap history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Bulk recalculate caps for all patients
   * POST /caps/recalculate
   *
   * Body: { cap_year?, patient_ids? }
   */
  async bulkRecalculate(request, reply) {
    try {
      const { cap_year, patient_ids } = request.body;
      const currentYear = new Date().getFullYear();
      const yearToCheck = cap_year ? parseInt(cap_year) : currentYear;

      // Get patients to recalculate
      let patientsToProcess;
      if (patient_ids && patient_ids.length > 0) {
        patientsToProcess = patient_ids.map(id => parseInt(id));
      } else {
        // Get all patients with cap tracking records for the year
        const existingRecords = await db
          .select({ patient_id: cap_tracking.patient_id })
          .from(cap_tracking)
          .where(and(
            eq(cap_tracking.cap_year, yearToCheck),
            isNull(cap_tracking.deleted_at)
          ));
        patientsToProcess = existingRecords.map(r => r.patient_id);
      }

      const results = {
        total: patientsToProcess.length,
        successful: 0,
        failed: 0,
        errors: []
      };

      // Process each patient
      for (const patientId of patientsToProcess) {
        try {
          // Simulate the request object for calculateCap
          const mockRequest = {
            body: { patient_id: patientId, cap_year: yearToCheck },
            user: request.user
          };
          const mockReply = { code: () => {} };

          await this.calculateCap(mockRequest, mockReply);
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            patient_id: patientId,
            error: error.message
          });
        }
      }

      // Log audit event
      await this._logAudit(request, 'BULK_RECALCULATE', 'CAP_TRACKING', null, null, null, { results });

      reply.code(200);
      return {
        status: 200,
        message: 'Bulk recalculation completed',
        data: results
      };
    } catch (error) {
      logger.error('Error in bulk recalculation:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error in bulk recalculation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // COMPLIANCE STATUS ENDPOINTS
  // ============================================================================

  /**
   * Get overall compliance status
   * GET /compliance/status
   *
   * Query: { status?, limit?, offset? }
   */
  async getComplianceStatus(request, reply) {
    try {
      const { status, limit = 50, offset = 0 } = request.query;

      const conditions = [isNull(compliance_status.deleted_at)];

      if (status) {
        conditions.push(eq(compliance_status.overall_status, status.toUpperCase()));
      }

      const [{ count: total }] = await db
        .select({ count: sql`COUNT(*)` })
        .from(compliance_status)
        .where(and(...conditions));

      const results = await db
        .select({
          compliance: compliance_status,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(compliance_status)
        .leftJoin(patients, eq(compliance_status.patient_id, patients.id))
        .where(and(...conditions))
        .orderBy(desc(compliance_status.updatedAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        pagination: {
          total: parseInt(total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(parseInt(total) / parseInt(limit))
        }
      };
    } catch (error) {
      logger.error('Error fetching compliance status:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching compliance status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get compliance status for a patient
   * GET /patients/:id/compliance
   */
  async getPatientCompliance(request, reply) {
    try {
      const { id } = request.params;

      const [result] = await db
        .select()
        .from(compliance_status)
        .where(and(
          eq(compliance_status.patient_id, parseInt(id)),
          isNull(compliance_status.deleted_at)
        ))
        .limit(1);

      if (!result) {
        reply.code(404);
        return {
          status: 404,
          message: 'Compliance status not found for this patient'
        };
      }

      // Get active issues
      const issues = await db
        .select()
        .from(compliance_issues)
        .where(and(
          eq(compliance_issues.patient_id, parseInt(id)),
          eq(compliance_issues.status, 'OPEN'),
          isNull(compliance_issues.deleted_at)
        ))
        .orderBy(desc(compliance_issues.createdAt));

      reply.code(200);
      return {
        status: 200,
        data: {
          status: result,
          active_issues: issues
        }
      };
    } catch (error) {
      logger.error('Error fetching patient compliance:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching patient compliance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get compliance reports
   * GET /compliance/reports
   *
   * Query: { report_type?, start_date?, end_date? }
   */
  async getComplianceReports(request, reply) {
    try {
      const { report_type = 'summary', start_date, end_date } = request.query;

      const report = {
        generated_at: new Date().toISOString(),
        report_type,
        period: {
          start: start_date || null,
          end: end_date || null
        }
      };

      // Get compliance status counts
      const statusCounts = await db
        .select({
          status: compliance_status.overall_status,
          count: sql`COUNT(*)`
        })
        .from(compliance_status)
        .where(isNull(compliance_status.deleted_at))
        .groupBy(compliance_status.overall_status);

      // Get issue counts by category
      const issueCounts = await db
        .select({
          category: compliance_issues.issue_category,
          status: compliance_issues.status,
          count: sql`COUNT(*)`
        })
        .from(compliance_issues)
        .where(isNull(compliance_issues.deleted_at))
        .groupBy(compliance_issues.issue_category, compliance_issues.status);

      // Get cap tracking summary
      const currentYear = new Date().getFullYear();
      const capSummary = await db
        .select({
          total: sql`COUNT(*)`,
          exceeded: sql`SUM(CASE WHEN cap_exceeded THEN 1 ELSE 0 END)`,
          warning: sql`SUM(CASE WHEN utilization_percentage >= 80 AND NOT cap_exceeded THEN 1 ELSE 0 END)`,
          healthy: sql`SUM(CASE WHEN utilization_percentage < 80 THEN 1 ELSE 0 END)`
        })
        .from(cap_tracking)
        .where(and(
          eq(cap_tracking.cap_year, currentYear),
          isNull(cap_tracking.deleted_at)
        ));

      report.data = {
        compliance_status_distribution: statusCounts.reduce((acc, row) => {
          acc[row.status] = parseInt(row.count);
          return acc;
        }, {}),
        issues_by_category: issueCounts,
        cap_tracking_summary: capSummary[0] || {
          total: 0,
          exceeded: 0,
          warning: 0,
          healthy: 0
        }
      };

      reply.code(200);
      return {
        status: 200,
        data: report
      };
    } catch (error) {
      logger.error('Error generating compliance reports:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error generating compliance reports',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // COMPLIANCE ISSUES ENDPOINTS
  // ============================================================================

  /**
   * Get all compliance issues
   * GET /compliance/issues
   *
   * Query: { status?, category?, severity?, patient_id?, limit?, offset? }
   */
  async getComplianceIssues(request, reply) {
    try {
      const { status, category, severity, patient_id, limit = 50, offset = 0 } = request.query;

      const conditions = [isNull(compliance_issues.deleted_at)];

      if (status) conditions.push(eq(compliance_issues.status, status.toUpperCase()));
      if (category) conditions.push(eq(compliance_issues.issue_category, category.toUpperCase()));
      if (severity) conditions.push(eq(compliance_issues.severity, severity.toUpperCase()));
      if (patient_id) conditions.push(eq(compliance_issues.patient_id, parseInt(patient_id)));

      const [{ count: total }] = await db
        .select({ count: sql`COUNT(*)` })
        .from(compliance_issues)
        .where(and(...conditions));

      const results = await db
        .select({
          issue: compliance_issues,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(compliance_issues)
        .leftJoin(patients, eq(compliance_issues.patient_id, patients.id))
        .where(and(...conditions))
        .orderBy(desc(compliance_issues.severity), desc(compliance_issues.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        pagination: {
          total: parseInt(total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(parseInt(total) / parseInt(limit))
        }
      };
    } catch (error) {
      logger.error('Error fetching compliance issues:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching compliance issues',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a compliance issue
   * POST /compliance/issues
   */
  async createComplianceIssue(request, reply) {
    try {
      const issueData = request.body;

      const [result] = await db
        .insert(compliance_issues)
        .values({
          ...issueData,
          created_by_id: request.user?.id
        })
        .returning();

      // Update compliance status
      await this._updateComplianceStatus(issueData.patient_id, request.user?.id);

      // Log audit event
      await this._logAudit(request, 'CREATE', 'COMPLIANCE_ISSUE', result.id, issueData.patient_id, null, result);

      reply.code(201);
      return {
        status: 201,
        message: 'Compliance issue created successfully',
        data: result
      };
    } catch (error) {
      logger.error('Error creating compliance issue:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating compliance issue',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update a compliance issue
   * PUT /compliance/issues/:id
   */
  async updateComplianceIssue(request, reply) {
    try {
      const { id } = request.params;
      const updateData = request.body;

      const [existing] = await db
        .select()
        .from(compliance_issues)
        .where(and(
          eq(compliance_issues.id, parseInt(id)),
          isNull(compliance_issues.deleted_at)
        ))
        .limit(1);

      if (!existing) {
        reply.code(404);
        return {
          status: 404,
          message: 'Compliance issue not found'
        };
      }

      // Handle resolution
      if (updateData.status === 'RESOLVED' && existing.status !== 'RESOLVED') {
        updateData.resolved_at = new Date();
        updateData.resolved_by_id = request.user?.id;
      }

      const [result] = await db
        .update(compliance_issues)
        .set({
          ...updateData,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(compliance_issues.id, parseInt(id)))
        .returning();

      // Update compliance status
      await this._updateComplianceStatus(existing.patient_id, request.user?.id);

      // Log audit event
      await this._logAudit(request, 'UPDATE', 'COMPLIANCE_ISSUE', result.id, result.patient_id, existing, result);

      reply.code(200);
      return {
        status: 200,
        message: 'Compliance issue updated successfully',
        data: result
      };
    } catch (error) {
      logger.error('Error updating compliance issue:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating compliance issue',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Resolve a compliance issue
   * POST /compliance/issues/:id/resolve
   */
  async resolveComplianceIssue(request, reply) {
    try {
      const { id } = request.params;
      const { resolution_notes } = request.body;

      const [existing] = await db
        .select()
        .from(compliance_issues)
        .where(and(
          eq(compliance_issues.id, parseInt(id)),
          isNull(compliance_issues.deleted_at)
        ))
        .limit(1);

      if (!existing) {
        reply.code(404);
        return {
          status: 404,
          message: 'Compliance issue not found'
        };
      }

      const [result] = await db
        .update(compliance_issues)
        .set({
          status: 'RESOLVED',
          resolved_at: new Date(),
          resolved_by_id: request.user?.id,
          resolution_notes,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(compliance_issues.id, parseInt(id)))
        .returning();

      // Update compliance status
      await this._updateComplianceStatus(existing.patient_id, request.user?.id);

      // Log audit event
      await this._logAudit(request, 'RESOLVE', 'COMPLIANCE_ISSUE', result.id, result.patient_id, existing, result);

      reply.code(200);
      return {
        status: 200,
        message: 'Compliance issue resolved successfully',
        data: result
      };
    } catch (error) {
      logger.error('Error resolving compliance issue:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error resolving compliance issue',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // ALERT CONFIGURATION ENDPOINTS
  // ============================================================================

  /**
   * Get alert configurations
   * GET /compliance/alerts/config
   */
  async getAlertConfigs(request, reply) {
    try {
      const results = await db
        .select()
        .from(compliance_alert_config)
        .where(isNull(compliance_alert_config.deleted_at))
        .orderBy(asc(compliance_alert_config.alert_type));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching alert configs:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching alert configurations',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create or update alert configuration
   * POST /compliance/alerts/config
   */
  async upsertAlertConfig(request, reply) {
    try {
      const configData = request.body;

      // Check if config exists
      const [existing] = await db
        .select()
        .from(compliance_alert_config)
        .where(eq(compliance_alert_config.alert_type, configData.alert_type))
        .limit(1);

      let result;
      if (existing) {
        [result] = await db
          .update(compliance_alert_config)
          .set({
            ...configData,
            updated_by_id: request.user?.id,
            updatedAt: new Date()
          })
          .where(eq(compliance_alert_config.id, existing.id))
          .returning();
      } else {
        [result] = await db
          .insert(compliance_alert_config)
          .values({
            ...configData,
            created_by_id: request.user?.id
          })
          .returning();
      }

      // Log audit event
      await this._logAudit(request, existing ? 'UPDATE' : 'CREATE', 'ALERT_CONFIG', result.id, null, existing, result);

      reply.code(existing ? 200 : 201);
      return {
        status: existing ? 200 : 201,
        message: `Alert configuration ${existing ? 'updated' : 'created'} successfully`,
        data: result
      };
    } catch (error) {
      logger.error('Error upserting alert config:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error saving alert configuration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Toggle alert enabled status
   * PUT /compliance/alerts/config/:id/toggle
   */
  async toggleAlertConfig(request, reply) {
    try {
      const { id } = request.params;

      const [existing] = await db
        .select()
        .from(compliance_alert_config)
        .where(eq(compliance_alert_config.id, parseInt(id)))
        .limit(1);

      if (!existing) {
        reply.code(404);
        return {
          status: 404,
          message: 'Alert configuration not found'
        };
      }

      const [result] = await db
        .update(compliance_alert_config)
        .set({
          is_enabled: !existing.is_enabled,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(compliance_alert_config.id, parseInt(id)))
        .returning();

      // Log audit event
      await this._logAudit(request, 'TOGGLE', 'ALERT_CONFIG', result.id, null, existing, result);

      reply.code(200);
      return {
        status: 200,
        message: `Alert ${result.is_enabled ? 'enabled' : 'disabled'} successfully`,
        data: result
      };
    } catch (error) {
      logger.error('Error toggling alert config:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error toggling alert configuration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get notification history
   * GET /compliance/notifications
   *
   * Query: { patient_id?, status?, type?, limit?, offset? }
   */
  async getNotifications(request, reply) {
    try {
      const { patient_id, status, type, limit = 50, offset = 0 } = request.query;

      const conditions = [];

      if (patient_id) conditions.push(eq(compliance_notifications.patient_id, parseInt(patient_id)));
      if (status) conditions.push(eq(compliance_notifications.status, status.toUpperCase()));
      if (type) conditions.push(eq(compliance_notifications.notification_type, type.toUpperCase()));

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const [{ count: total }] = await db
        .select({ count: sql`COUNT(*)` })
        .from(compliance_notifications)
        .where(whereClause);

      const results = await db
        .select({
          notification: compliance_notifications,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name
          }
        })
        .from(compliance_notifications)
        .leftJoin(patients, eq(compliance_notifications.patient_id, patients.id))
        .where(whereClause)
        .orderBy(desc(compliance_notifications.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        pagination: {
          total: parseInt(total),
          limit: parseInt(limit),
          offset: parseInt(offset),
          pages: Math.ceil(parseInt(total) / parseInt(limit))
        }
      };
    } catch (error) {
      logger.error('Error fetching notifications:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching notifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Store cap tracking history
   * @private
   */
  async _storeCapHistory(record, userId) {
    try {
      await db
        .insert(cap_tracking_history)
        .values({
          cap_tracking_id: record.id,
          patient_id: record.patient_id,
          cap_year: record.cap_year,
          snapshot_date: new Date().toISOString().split('T')[0],
          cap_amount_cents: record.cap_amount_cents,
          total_payments_cents: record.total_payments_cents,
          remaining_cap_cents: record.remaining_cap_cents,
          utilization_percentage: record.utilization_percentage,
          cap_exceeded: record.cap_exceeded,
          created_by_id: userId
        });
    } catch (error) {
      logger.error('Error storing cap history:', error);
    }
  }

  /**
   * Create compliance issues for cap alerts
   * @private
   */
  async _createCapComplianceIssues(capRecord, alertsTriggered, userId) {
    try {
      for (const alert of alertsTriggered) {
        const issueType = alert === '80%' ? 'CAP_WARNING_80' :
          alert === '90%' ? 'CAP_WARNING_90' :
            alert === '95%' ? 'CAP_WARNING_95' : 'CAP_EXCEEDED';

        const severity = alert === '80%' ? 'MEDIUM' :
          alert === '90%' ? 'HIGH' : 'CRITICAL';

        await db
          .insert(compliance_issues)
          .values({
            patient_id: capRecord.patient_id,
            issue_type: issueType,
            issue_category: 'CAP',
            severity,
            title: `Cap utilization reached ${alert}`,
            description: `Patient has reached ${alert} cap utilization (${capRecord.utilization_percentage}%). Current payments: $${(capRecord.total_payments_cents / 100).toFixed(2)}`,
            status: 'OPEN',
            related_cap_tracking_id: capRecord.id,
            created_by_id: userId
          });
      }

      // Update compliance status
      await this._updateComplianceStatus(capRecord.patient_id, userId);
    } catch (error) {
      logger.error('Error creating cap compliance issues:', error);
    }
  }

  /**
   * Update patient compliance status
   * @private
   */
  async _updateComplianceStatus(patientId, userId) {
    try {
      // Get or create compliance status
      let [existing] = await db
        .select()
        .from(compliance_status)
        .where(eq(compliance_status.patient_id, parseInt(patientId)))
        .limit(1);

      // Count open issues by severity
      const issuesCount = await db
        .select({
          severity: compliance_issues.severity,
          count: sql`COUNT(*)`
        })
        .from(compliance_issues)
        .where(and(
          eq(compliance_issues.patient_id, parseInt(patientId)),
          eq(compliance_issues.status, 'OPEN'),
          isNull(compliance_issues.deleted_at)
        ))
        .groupBy(compliance_issues.severity);

      const criticalCount = issuesCount.find(i => i.severity === 'CRITICAL')?.count || 0;
      const highCount = issuesCount.find(i => i.severity === 'HIGH')?.count || 0;
      const totalOpen = issuesCount.reduce((sum, i) => sum + parseInt(i.count), 0);

      // Determine overall status
      let overallStatus = 'COMPLIANT';
      if (criticalCount > 0) {
        overallStatus = 'NON_COMPLIANT';
      } else if (highCount > 0) {
        overallStatus = 'WARNING';
      } else if (totalOpen > 0) {
        overallStatus = 'PENDING_REVIEW';
      }

      // Calculate score (100 - deductions for issues)
      const score = Math.max(0, 100 - (criticalCount * 30) - (highCount * 15) - (totalOpen * 5));

      // Get cap status
      const currentYear = new Date().getFullYear();
      const [capRecord] = await db
        .select()
        .from(cap_tracking)
        .where(and(
          eq(cap_tracking.patient_id, parseInt(patientId)),
          eq(cap_tracking.cap_year, currentYear),
          isNull(cap_tracking.deleted_at)
        ))
        .limit(1);

      const capStatus = capRecord?.cap_exceeded ? 'EXCEEDED' :
        parseFloat(capRecord?.utilization_percentage || 0) >= 80 ? 'WARNING' : 'COMPLIANT';

      const statusData = {
        overall_status: overallStatus,
        overall_score: score.toString(),
        cap_compliance_status: capStatus,
        active_issues_count: totalOpen,
        critical_issues_count: parseInt(criticalCount),
        last_compliance_check: new Date(),
        updated_by_id: userId
      };

      if (existing) {
        await db
          .update(compliance_status)
          .set({
            ...statusData,
            updatedAt: new Date()
          })
          .where(eq(compliance_status.id, existing.id));
      } else {
        await db
          .insert(compliance_status)
          .values({
            patient_id: parseInt(patientId),
            ...statusData,
            created_by_id: userId
          });
      }
    } catch (error) {
      logger.error('Error updating compliance status:', error);
    }
  }

  /**
   * Log audit event for compliance operations
   * @private
   */
  async _logAudit(request, action, resourceType, resourceId, patientId, oldValues = null, newValues = null) {
    try {
      await db
        .insert(compliance_audit_log)
        .values({
          user_id: request.user?.id || 'system',
          user_email: request.user?.email,
          user_role: request.user?.role,
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          action,
          resource_type: resourceType,
          resource_id: resourceId,
          patient_id: patientId,
          old_values: oldValues ? JSON.stringify(oldValues) : null,
          new_values: newValues ? JSON.stringify(newValues) : null,
          request_method: request.method,
          request_path: request.url,
          request_params: request.params ? JSON.stringify(request.params) : null,
          result: 'SUCCESS'
        });
    } catch (error) {
      logger.error('Error logging audit event:', error);
    }
  }
}

export default new CapTrackingController();
