import { db } from '../config/db.drizzle.js';
import { cap_tracking, patients, payment_applications, claims } from '../db/schemas/index.js';
import { eq, and, gte, lte, sql, isNull } from 'drizzle-orm';
import MailService from '../services/MailService.js';

import { logger } from '../utils/logger.js';
/**
 * Daily Cap Recalculation Job
 * Recalculates Medicare cap for all active patients
 * Schedule: Daily at 2:00 AM
 * Cron: 0 2 * * *
 */
export async function recalculateAllCaps() {
  logger.info('Starting daily cap recalculation job...')

  try {
    const currentYear = new Date().getFullYear();
    const startYear = currentYear - 1;
    const cap_year_start = `${startYear}-10-01`;
    const cap_year_end = `${currentYear}-09-30`;

    // FY 2025 cap amount: $34,465.34 = 3446534 cents
    const cap_amount_cents = parseInt(process.env.CAP_YEAR_AMOUNT_CENTS) || 3446534;

    // Get all patients with claims in current cap year
    const activePatientsResult = await db
      .select({
        patient_id: claims.patient_id
      })
      .from(claims)
      .where(and(
        gte(claims.service_start_date, cap_year_start),
        lte(claims.service_end_date, cap_year_end),
        isNull(claims.deleted_at)
      ))
      .groupBy(claims.patient_id);

    const activePatientIds = activePatientsResult.map(r => r.patient_id);
    logger.info(`Found ${activePatientIds.length} patients with activity in current cap year`)

    let updatedCount = 0;
    let newAlerts = [];

    for (const patient_id of activePatientIds) {
      // Calculate total payments for this patient in cap year
      const paymentTotal = await db
        .select({
          total: sql`COALESCE(SUM(${payment_applications.applied_amount}), 0)`
        })
        .from(payment_applications)
        .innerJoin(claims, eq(payment_applications.claim_id, claims.id))
        .where(and(
          eq(claims.patient_id, patient_id),
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

      // Get existing cap tracking record
      const existing = await db
        .select()
        .from(cap_tracking)
        .where(and(
          eq(cap_tracking.patient_id, patient_id),
          eq(cap_tracking.cap_year, currentYear),
          isNull(cap_tracking.deleted_at)
        ))
        .limit(1);

      // Check for new alert thresholds
      const alert_80_triggered = utilization_percentage >= 80;
      const alert_90_triggered = utilization_percentage >= 90;
      const alert_95_triggered = utilization_percentage >= 95;

      const capData = {
        patient_id: patient_id,
        cap_year: currentYear,
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
        calculation_status: 'CURRENT'
      };

      if (existing[0]) {
        // Update existing record
        await db
          .update(cap_tracking)
          .set(capData)
          .where(eq(cap_tracking.id, existing[0].id));

        // Check for new alerts
        if (alert_80_triggered && !existing[0].alert_80_triggered) {
          newAlerts.push({ patient_id, threshold: 80, utilization: utilization_percentage });
        }
        if (alert_90_triggered && !existing[0].alert_90_triggered) {
          newAlerts.push({ patient_id, threshold: 90, utilization: utilization_percentage });
        }
        if (alert_95_triggered && !existing[0].alert_95_triggered) {
          newAlerts.push({ patient_id, threshold: 95, utilization: utilization_percentage });
        }
      } else {
        // Create new record
        await db
          .insert(cap_tracking)
          .values(capData);

        // Send initial alerts if thresholds already crossed
        if (alert_95_triggered) {
          newAlerts.push({ patient_id, threshold: 95, utilization: utilization_percentage });
        } else if (alert_90_triggered) {
          newAlerts.push({ patient_id, threshold: 90, utilization: utilization_percentage });
        } else if (alert_80_triggered) {
          newAlerts.push({ patient_id, threshold: 80, utilization: utilization_percentage });
        }
      }

      updatedCount++;
    }

    // Send email alerts for new thresholds crossed
    if (newAlerts.length > 0) {
      await sendCapAlerts(newAlerts);
    }

    logger.info(`Cap recalculation completed. Updated ${updatedCount} records, sent ${newAlerts.length} alerts`)

    return {
      success: true,
      updated: updatedCount,
      alerts_sent: newAlerts.length
    };
  } catch (error) {
    logger.error('Error in cap recalculation job:', error)
    throw error;
  }
}

/**
 * Send cap threshold alerts
 */
async function sendCapAlerts(alerts) {
  for (const alert of alerts) {
    try {
      // Get patient info
      const patient = await db
        .select()
        .from(patients)
        .where(eq(patients.id, alert.patient_id))
        .limit(1);

      if (patient[0]) {
        const subject = `Cap Alert: Patient ${patient[0].first_name} ${patient[0].last_name} at ${alert.utilization}% utilization`;
        const message = `
Medicare Hospice Cap Alert

Patient: ${patient[0].first_name} ${patient[0].last_name} (MRN: ${patient[0].medical_record_number})
Cap Utilization: ${alert.utilization}%
Alert Threshold: ${alert.threshold}%

This patient has reached ${alert.threshold}% of their Medicare hospice cap amount.
Please review their care plan and billing to ensure compliance.

This is an automated notification from the Hospice EHR system.
        `;

        // Send email to billing team (configure recipients in .env)
        await MailService.sendMail({
          to: process.env.CAP_ALERT_EMAIL || 'billing@hospice.example.com',
          subject: subject,
          text: message
        });
      }
    } catch (error) {
      logger.error(`Failed to send cap alert for patient ${alert.patient_id}:`, error)
    }
  }
}

export default recalculateAllCaps;
