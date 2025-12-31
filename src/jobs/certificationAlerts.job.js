import { db } from '../config/db.drizzle.js';
import { certification_alerts, certifications, patients } from '../db/schemas/index.js';
import { eq, and, lte, sql, isNull } from 'drizzle-orm';
import MailService from '../services/MailService.js';

import { logger } from '../utils/logger.js';
/**
 * Certification Alert Processing Job
 * Sends alerts for upcoming and overdue certifications
 * Schedule: Hourly
 * Cron: 0 * * * *
 */
export async function processCertificationAlerts() {
  logger.info('Starting certification alert processing job...')

  try {
    const now = new Date();

    // Get pending alerts that are due
    const pendingAlerts = await db
      .select({
        alert: certification_alerts,
        certification: certifications,
        patient: patients
      })
      .from(certification_alerts)
      .innerJoin(certifications, eq(certification_alerts.certification_id, certifications.id))
      .innerJoin(patients, eq(certification_alerts.patient_id, patients.id))
      .where(and(
        eq(certification_alerts.alert_status, 'PENDING'),
        lte(certification_alerts.scheduled_for, now)
      ))
      .orderBy(certification_alerts.scheduled_for);

    logger.info(`Found ${pendingAlerts.length} pending alerts to process`)

    let sentCount = 0;
    let failedCount = 0;

    for (const item of pendingAlerts) {
      try {
        const { alert, certification, patient } = item;

        // Build email content
        const subject = alert.subject || `Certification Alert: ${alert.alert_type}`;
        const message = alert.message || buildAlertMessage(alert, certification, patient);

        // Determine recipients
        const recipients = alert.recipients || [process.env.CERTIFICATION_ALERT_EMAIL || 'clinical@hospice.example.com'];

        // Send email
        for (const recipient of recipients) {
          await MailService.sendMail({
            to: recipient,
            subject: subject,
            text: message,
            html: buildAlertHtml(alert, certification, patient)
          });
        }

        // Mark alert as sent
        await db
          .update(certification_alerts)
          .set({
            alert_status: 'SENT',
            sent_at: new Date()
          })
          .where(eq(certification_alerts.id, alert.id));

        sentCount++;
      } catch (error) {
        logger.error(`Failed to send alert ${item.alert.id}:`, error)

        // Mark alert as failed
        await db
          .update(certification_alerts)
          .set({
            alert_status: 'FAILED',
            metadata: {
              error: error.message,
              failed_at: new Date().toISOString()
            }
          })
          .where(eq(certification_alerts.id, item.alert.id));

        failedCount++;
      }
    }

    logger.info(`Certification alert processing completed. Sent: ${sentCount}, Failed: ${failedCount}`)

    return {
      success: true,
      sent: sentCount,
      failed: failedCount
    };
  } catch (error) {
    logger.error('Error in certification alert processing job:', error)
    throw error;
  }
}

/**
 * Build alert message text
 */
function buildAlertMessage(alert, certification, patient) {
  const patientName = `${patient.first_name} ${patient.last_name}`;
  const mrn = patient.medical_record_number;

  let message = `Certification Alert\n\n`;
  message += `Patient: ${patientName} (MRN: ${mrn})\n`;
  message += `Certification Period: ${certification.certification_period}\n`;
  message += `Start Date: ${certification.start_date}\n`;

  switch (alert.alert_type) {
    case 'UPCOMING_CERT':
      message += `\nCertification Due: ${certification.certification_due_date}\n`;
      message += `\nPhysician certification is required within 2 days of the benefit period start date.\n`;
      break;
    case 'OVERDUE_CERT':
      message += `\nCertification was due: ${certification.certification_due_date}\n`;
      message += `\nWARNING: This certification is overdue. Please complete immediately.\n`;
      break;
    case 'F2F_REQUIRED':
      message += `\nFace-to-Face encounter is required within 30 days before recertification.\n`;
      message += `\nThis is the 3rd or subsequent benefit period, requiring F2F encounter.\n`;
      break;
    case 'F2F_OVERDUE':
      message += `\nWARNING: Face-to-Face encounter is overdue.\n`;
      message += `\nThis is required for Medicare reimbursement.\n`;
      break;
  }

  message += `\nThis is an automated notification from the Hospice EHR system.`;

  return message;
}

/**
 * Build alert HTML
 */
function buildAlertHtml(alert, certification, patient) {
  const patientName = `${patient.first_name} ${patient.last_name}`;
  const mrn = patient.medical_record_number;
  const priority = alert.alert_priority === 'CRITICAL' ? 'red' : alert.alert_priority === 'HIGH' ? 'orange' : 'blue';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
      <div style="background-color: ${priority}; color: white; padding: 20px;">
        <h2 style="margin: 0;">Certification Alert</h2>
        <p style="margin: 5px 0 0 0;">Priority: ${alert.alert_priority}</p>
      </div>

      <div style="padding: 20px; background-color: #f5f5f5;">
        <h3>Patient Information</h3>
        <p><strong>Name:</strong> ${patientName}</p>
        <p><strong>MRN:</strong> ${mrn}</p>

        <h3>Certification Details</h3>
        <p><strong>Period:</strong> ${certification.certification_period}</p>
        <p><strong>Start Date:</strong> ${certification.start_date}</p>
        <p><strong>Due Date:</strong> ${certification.certification_due_date}</p>

        <div style="margin-top: 20px; padding: 15px; background-color: white; border-left: 4px solid ${priority};">
          <p style="margin: 0;">${alert.message}</p>
        </div>

        <p style="margin-top: 20px; font-size: 12px; color: #666;">
          This is an automated notification from the Hospice EHR system.
        </p>
      </div>
    </div>
  `;
}

/**
 * Check for overdue certifications and create alerts
 * Schedule: Daily at 8:00 AM
 * Cron: 0 8 * * *
 */
export async function checkOverdueCertifications() {
  logger.info('Checking for overdue certifications...')

  try {
    const today = new Date().toISOString().split('T')[0];

    // Find certifications that are overdue and don't have overdue alerts
    const overdueCerts = await db
      .select()
      .from(certifications)
      .where(and(
        eq(certifications.certification_status, 'PENDING'),
        lte(certifications.certification_due_date, today),
        isNull(certifications.deleted_at)
      ));

    logger.info(`Found ${overdueCerts.length} overdue certifications`)

    let alertsCreated = 0;

    for (const cert of overdueCerts) {
      // Check if overdue alert already exists
      const existingAlert = await db
        .select()
        .from(certification_alerts)
        .where(and(
          eq(certification_alerts.certification_id, cert.id),
          eq(certification_alerts.alert_type, 'OVERDUE_CERT')
        ))
        .limit(1);

      if (!existingAlert[0]) {
        // Create overdue alert
        await db.insert(certification_alerts).values({
          certification_id: cert.id,
          patient_id: cert.patient_id,
          alert_type: 'OVERDUE_CERT',
          alert_priority: 'CRITICAL',
          scheduled_for: new Date(),
          subject: `OVERDUE: Certification Required for Patient`,
          message: `Certification was due on ${cert.certification_due_date}. Please complete immediately.`,
          recipients: [process.env.CERTIFICATION_ALERT_EMAIL || 'clinical@hospice.example.com']
        });

        alertsCreated++;
      }
    }

    logger.info(`Created ${alertsCreated} overdue certification alerts`)

    return {
      success: true,
      overdue_count: overdueCerts.length,
      alerts_created: alertsCreated
    };
  } catch (error) {
    logger.error('Error checking overdue certifications:', error)
    throw error;
  }
}

export default processCertificationAlerts;
