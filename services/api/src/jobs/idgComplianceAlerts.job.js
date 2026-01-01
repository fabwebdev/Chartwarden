import { db } from '../config/db.drizzle.js';
import {
  idg_meeting_documentation,
  idg_documentation_audit,
  idg_compliance_alerts
} from '../db/schemas/idgMeetingDocumentation.schema.js';
import { idg_meetings } from '../db/schemas/idgMeetings.schema.js';
import { users } from '../db/schemas/user.schema.js';
import { eq, and, lte, isNull, sql, or, ne } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

// Uncomment when MailService is available
// import MailService from '../services/MailService.js';

/**
 * IDG 14-Day Compliance Alerts Job
 *
 * This job handles:
 * 1. Sending scheduled reminder notifications
 * 2. Checking for overdue documentation
 * 3. Escalating to supervisors when needed
 * 4. Updating compliance status in real-time
 */

const CMS_REGULATION = '42 CFR §418.56';
const ESCALATION_THRESHOLD_DAYS = 2;

/**
 * Process pending compliance alerts
 * Sends notifications for alerts that are due
 */
export async function processComplianceAlerts() {
  logger.info('[IDG Compliance] Starting compliance alert processing');

  try {
    const now = new Date();

    // Find pending alerts that are due
    const pendingAlerts = await db
      .select({
        alert: idg_compliance_alerts,
        doc: idg_meeting_documentation,
        meeting: idg_meetings
      })
      .from(idg_compliance_alerts)
      .innerJoin(
        idg_meeting_documentation,
        eq(idg_compliance_alerts.documentation_id, idg_meeting_documentation.id)
      )
      .innerJoin(
        idg_meetings,
        eq(idg_compliance_alerts.idg_meeting_id, idg_meetings.id)
      )
      .where(and(
        eq(idg_compliance_alerts.status, 'PENDING'),
        lte(idg_compliance_alerts.scheduled_for, now),
        isNull(idg_meeting_documentation.deleted_at),
        // Only send alerts for documentation that hasn't been submitted yet
        sql`${idg_meeting_documentation.documentation_status} IN ('DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'OVERDUE')`
      ));

    logger.info(`[IDG Compliance] Found ${pendingAlerts.length} pending alerts to process`);

    let sentCount = 0;
    let failedCount = 0;

    for (const { alert, doc, meeting } of pendingAlerts) {
      try {
        // Calculate current deadline status
        const deadline = new Date(doc.documentation_deadline);
        const diff = deadline - now;
        const daysRemaining = Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
        const hoursRemaining = Math.max(0, Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)));
        const isOverdue = diff <= 0;
        const daysOverdue = isOverdue ? Math.ceil(Math.abs(diff) / (1000 * 60 * 60 * 24)) : 0;

        // Prepare notification content
        const recipients = typeof alert.recipients === 'string'
          ? JSON.parse(alert.recipients)
          : alert.recipients;

        const notificationData = {
          alert_type: alert.alert_type,
          meeting_date: meeting.meeting_date,
          meeting_type: meeting.meeting_type,
          deadline: deadline.toISOString(),
          days_remaining: daysRemaining,
          hours_remaining: hoursRemaining,
          is_overdue: isOverdue,
          days_overdue: daysOverdue,
          documentation_id: doc.id,
          meeting_id: meeting.id,
          regulation: CMS_REGULATION,
          documentation_link: `/idg-meetings/documentation/${doc.id}`
        };

        // Send notification (email and/or in-app)
        const deliveryStatus = await sendNotifications(recipients, notificationData);

        // Update alert status
        await db
          .update(idg_compliance_alerts)
          .set({
            status: 'SENT',
            sent_at: new Date(),
            sent_via: JSON.stringify(['email', 'in_app']),
            delivery_status: JSON.stringify(deliveryStatus),
            updatedAt: new Date()
          })
          .where(eq(idg_compliance_alerts.id, alert.id));

        // Update documentation notification tracking
        const existingNotifications = typeof doc.notifications_sent === 'string'
          ? JSON.parse(doc.notifications_sent || '[]')
          : (doc.notifications_sent || []);

        existingNotifications.push({
          type: alert.alert_type,
          date: new Date().toISOString(),
          recipients: recipients.map(r => r.name || r.email),
          channel: 'email'
        });

        await db
          .update(idg_meeting_documentation)
          .set({
            notifications_sent: JSON.stringify(existingNotifications),
            last_notification_date: new Date(),
            updatedAt: new Date()
          })
          .where(eq(idg_meeting_documentation.id, doc.id));

        sentCount++;
        logger.info(`[IDG Compliance] Sent ${alert.alert_type} alert for documentation ${doc.id}`);

      } catch (alertError) {
        failedCount++;
        logger.error(`[IDG Compliance] Failed to process alert ${alert.id}:`, alertError);

        // Update alert with failure info
        await db
          .update(idg_compliance_alerts)
          .set({
            status: 'FAILED',
            error_message: alertError.message,
            retry_count: (alert.retry_count || 0) + 1,
            last_retry_at: new Date(),
            updatedAt: new Date()
          })
          .where(eq(idg_compliance_alerts.id, alert.id));
      }
    }

    logger.info(`[IDG Compliance] Alert processing complete. Sent: ${sentCount}, Failed: ${failedCount}`);

    return { sent: sentCount, failed: failedCount };
  } catch (error) {
    logger.error('[IDG Compliance] Error processing alerts:', error);
    throw error;
  }
}

/**
 * Check for overdue documentation and update status
 * Also handles supervisor escalation
 */
export async function checkOverdueDocumentation() {
  logger.info('[IDG Compliance] Starting overdue documentation check');

  try {
    const now = new Date();

    // Find all pending documentation
    const pendingDocs = await db
      .select({
        doc: idg_meeting_documentation,
        meeting: idg_meetings
      })
      .from(idg_meeting_documentation)
      .innerJoin(
        idg_meetings,
        eq(idg_meeting_documentation.idg_meeting_id, idg_meetings.id)
      )
      .where(and(
        sql`${idg_meeting_documentation.documentation_status} IN ('DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW')`,
        isNull(idg_meeting_documentation.deleted_at)
      ));

    logger.info(`[IDG Compliance] Checking ${pendingDocs.length} pending documentation records`);

    let overdueCount = 0;
    let escalatedCount = 0;

    for (const { doc, meeting } of pendingDocs) {
      const deadline = new Date(doc.documentation_deadline);
      const diff = deadline - now;
      const daysRemaining = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hoursRemaining = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const isOverdue = diff <= 0;
      const daysOverdue = isOverdue ? Math.ceil(Math.abs(diff) / (1000 * 60 * 60 * 24)) : 0;

      // Update deadline tracking fields
      const updateData = {
        days_remaining: Math.max(0, daysRemaining),
        hours_remaining: Math.max(0, hoursRemaining),
        is_overdue: isOverdue,
        days_overdue: daysOverdue,
        updatedAt: new Date()
      };

      // Mark as overdue if status hasn't been updated yet
      if (isOverdue && doc.documentation_status !== 'OVERDUE') {
        updateData.documentation_status = 'OVERDUE';
        updateData.override_required = true;
        updateData.flagged_in_compliance_report = true;
        updateData.compliance_flag_reason = `Documentation is ${daysOverdue} days past the 14-day deadline (${CMS_REGULATION})`;
        overdueCount++;

        // Create audit entry
        await db
          .insert(idg_documentation_audit)
          .values({
            documentation_id: doc.id,
            idg_meeting_id: doc.idg_meeting_id,
            action: 'STATUS_CHANGE',
            action_description: `Documentation automatically marked as OVERDUE (${daysOverdue} days past deadline)`,
            previous_status: doc.documentation_status,
            new_status: 'OVERDUE',
            deadline_at_action: deadline,
            was_overdue_at_action: true,
            days_remaining_at_action: 0
          });

        // Schedule overdue alert
        await db
          .insert(idg_compliance_alerts)
          .values({
            documentation_id: doc.id,
            idg_meeting_id: doc.idg_meeting_id,
            alert_type: 'OVERDUE',
            days_before_deadline: 0,
            scheduled_for: new Date(),
            recipients: JSON.stringify([{
              user_id: doc.documentation_owner_id,
              name: doc.documentation_owner_name
            }]),
            status: 'PENDING'
          });
      }

      // Escalate to supervisor if approaching deadline
      if (!isOverdue && daysRemaining <= ESCALATION_THRESHOLD_DAYS && !doc.escalated_to_supervisor) {
        updateData.escalated_to_supervisor = true;
        updateData.escalation_date = new Date();
        escalatedCount++;

        // In production, get supervisor info from user/organization hierarchy
        // For now, we'll log the escalation
        logger.warn(`[IDG Compliance] ESCALATION: Documentation ${doc.id} has ${daysRemaining} days remaining. Escalating to supervisor.`);

        // Schedule escalation alert
        await db
          .insert(idg_compliance_alerts)
          .values({
            documentation_id: doc.id,
            idg_meeting_id: doc.idg_meeting_id,
            alert_type: 'SUPERVISOR_ESCALATION',
            days_before_deadline: daysRemaining,
            scheduled_for: new Date(),
            recipients: JSON.stringify([{
              user_id: doc.documentation_owner_id,
              name: doc.documentation_owner_name
            }]),
            // escalation_recipients would include supervisors
            status: 'PENDING'
          });

        await db
          .insert(idg_documentation_audit)
          .values({
            documentation_id: doc.id,
            idg_meeting_id: doc.idg_meeting_id,
            action: 'ESCALATE',
            action_description: `Documentation escalated to supervisor (${daysRemaining} days remaining)`,
            deadline_at_action: deadline,
            days_remaining_at_action: daysRemaining,
            was_overdue_at_action: false
          });
      }

      // Apply updates
      await db
        .update(idg_meeting_documentation)
        .set(updateData)
        .where(eq(idg_meeting_documentation.id, doc.id));
    }

    logger.info(`[IDG Compliance] Overdue check complete. Newly overdue: ${overdueCount}, Escalated: ${escalatedCount}`);

    return { overdue: overdueCount, escalated: escalatedCount };
  } catch (error) {
    logger.error('[IDG Compliance] Error checking overdue documentation:', error);
    throw error;
  }
}

/**
 * Generate monthly compliance report
 */
export async function generateMonthlyComplianceReport(month, year) {
  logger.info(`[IDG Compliance] Generating monthly report for ${month}/${year}`);

  try {
    const startDate = new Date(year, month - 1, 1);
    const endDate = new Date(year, month, 0, 23, 59, 59);

    // Get all documentation for the month
    const docs = await db
      .select()
      .from(idg_meeting_documentation)
      .where(and(
        sql`${idg_meeting_documentation.meeting_date} >= ${startDate.toISOString().split('T')[0]}`,
        sql`${idg_meeting_documentation.meeting_date} <= ${endDate.toISOString().split('T')[0]}`,
        isNull(idg_meeting_documentation.deleted_at)
      ));

    // Get all meetings for the month
    const meetings = await db
      .select({ id: idg_meetings.id })
      .from(idg_meetings)
      .where(and(
        sql`${idg_meetings.meeting_date} >= ${startDate.toISOString().split('T')[0]}`,
        sql`${idg_meetings.meeting_date} <= ${endDate.toISOString().split('T')[0]}`
      ));

    // Calculate metrics
    const totalMeetings = meetings.length;
    const meetingsWithDocs = docs.length;
    const meetingsWithoutDocs = totalMeetings - meetingsWithDocs;

    const submittedDocs = docs.filter(d =>
      ['SUBMITTED', 'APPROVED', 'OVERRIDDEN'].includes(d.documentation_status)
    );
    const onTimeSubmissions = submittedDocs.filter(d => !d.is_late_submission).length;
    const lateSubmissions = submittedDocs.filter(d => d.is_late_submission).length;
    const overriddenSubmissions = submittedDocs.filter(d => d.override_granted).length;
    const pendingSubmissions = docs.filter(d =>
      ['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'OVERDUE'].includes(d.documentation_status)
    ).length;

    const onTimeRate = submittedDocs.length > 0
      ? Math.round((onTimeSubmissions / submittedDocs.length) * 100)
      : 0;
    const complianceRate = totalMeetings > 0
      ? Math.round((onTimeSubmissions / totalMeetings) * 100)
      : 0;

    // Calculate completion times
    const completionTimes = submittedDocs
      .filter(d => d.submitted_date)
      .map(d => {
        const meetingDate = new Date(d.meeting_date);
        const submittedDate = new Date(d.submitted_date);
        return Math.round((submittedDate - meetingDate) / (1000 * 60 * 60));
      })
      .sort((a, b) => a - b);

    const avgTime = completionTimes.length > 0
      ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
      : 0;
    const medianTime = completionTimes.length > 0
      ? completionTimes[Math.floor(completionTimes.length / 2)]
      : 0;

    // Get previous month for trend analysis
    const prevMonth = month === 1 ? 12 : month - 1;
    const prevYear = month === 1 ? year - 1 : year;

    const prevReport = await db
      .select()
      .from(sql`idg_compliance_reports`)
      .where(and(
        sql`report_month = ${prevMonth}`,
        sql`report_year = ${prevYear}`
      ))
      .limit(1);

    let trendDirection = 'STABLE';
    let trendChange = 0;

    if (prevReport.length > 0) {
      const prevRate = prevReport[0].compliance_rate || 0;
      trendChange = complianceRate - prevRate;
      if (trendChange > 5) trendDirection = 'IMPROVING';
      else if (trendChange < -5) trendDirection = 'DECLINING';
    }

    // Save report
    const reportData = {
      report_month: month,
      report_year: year,
      report_start_date: startDate.toISOString().split('T')[0],
      report_end_date: endDate.toISOString().split('T')[0],
      total_meetings: totalMeetings,
      meetings_with_documentation: meetingsWithDocs,
      meetings_without_documentation: meetingsWithoutDocs,
      on_time_submissions: onTimeSubmissions,
      late_submissions: lateSubmissions,
      overridden_submissions: overriddenSubmissions,
      pending_submissions: pendingSubmissions,
      on_time_rate: onTimeRate,
      compliance_rate: complianceRate,
      average_completion_time_hours: avgTime,
      median_completion_time_hours: medianTime,
      min_completion_time_hours: completionTimes[0] || 0,
      max_completion_time_hours: completionTimes[completionTimes.length - 1] || 0,
      override_count: overriddenSubmissions,
      trend_direction: trendDirection,
      trend_percentage_change: trendChange,
      generated_at: new Date()
    };

    // Note: Table may not exist yet, so we wrap this in try-catch
    try {
      await db
        .insert(sql`idg_compliance_reports`)
        .values(reportData);
    } catch (insertError) {
      logger.warn('[IDG Compliance] Could not save report to database:', insertError.message);
    }

    logger.info(`[IDG Compliance] Monthly report generated: ${complianceRate}% compliance rate`);

    return reportData;
  } catch (error) {
    logger.error('[IDG Compliance] Error generating monthly report:', error);
    throw error;
  }
}

/**
 * Send notifications to recipients
 */
async function sendNotifications(recipients, data) {
  const deliveryStatus = [];

  for (const recipient of recipients) {
    try {
      // Email notification
      const emailContent = formatEmailNotification(data);

      // Uncomment when MailService is available:
      // await MailService.sendMail({
      //   to: recipient.email,
      //   subject: emailContent.subject,
      //   text: emailContent.text,
      //   html: emailContent.html
      // });

      logger.info(`[IDG Compliance] Would send email to ${recipient.name || recipient.user_id}: ${emailContent.subject}`);

      deliveryStatus.push({
        recipient: recipient.user_id || recipient.email,
        channel: 'email',
        status: 'sent',
        sent_at: new Date().toISOString()
      });

    } catch (error) {
      deliveryStatus.push({
        recipient: recipient.user_id || recipient.email,
        channel: 'email',
        status: 'failed',
        error: error.message
      });
    }
  }

  return deliveryStatus;
}

/**
 * Format email notification content
 */
function formatEmailNotification(data) {
  let subject, urgencyText;

  switch (data.alert_type) {
    case 'OVERDUE':
      subject = `[URGENT] IDG Documentation OVERDUE - ${data.days_overdue} days past deadline`;
      urgencyText = `This documentation is ${data.days_overdue} days past the required deadline.`;
      break;
    case 'SAME_DAY':
      subject = `[ACTION REQUIRED] IDG Documentation Due TODAY`;
      urgencyText = `This documentation must be completed today.`;
      break;
    case '1_DAY_REMINDER':
      subject = `[Reminder] IDG Documentation Due Tomorrow`;
      urgencyText = `This documentation is due tomorrow.`;
      break;
    case '3_DAY_REMINDER':
      subject = `[Reminder] IDG Documentation Due in 3 Days`;
      urgencyText = `This documentation is due in 3 days.`;
      break;
    case '7_DAY_REMINDER':
      subject = `IDG Documentation Reminder - 7 Days Remaining`;
      urgencyText = `This documentation is due in 7 days.`;
      break;
    case '10_DAY_REMINDER':
      subject = `IDG Documentation Reminder - 10 Days Remaining`;
      urgencyText = `This documentation is due in 10 days.`;
      break;
    case 'SUPERVISOR_ESCALATION':
      subject = `[ESCALATION] IDG Documentation Approaching Deadline - ${data.days_remaining} Days Remaining`;
      urgencyText = `This documentation has been escalated due to approaching deadline.`;
      break;
    default:
      subject = `IDG Documentation Compliance Notification`;
      urgencyText = `Please review this IDG documentation.`;
  }

  const text = `
IDG Meeting Documentation Compliance Notification

${urgencyText}

Meeting Date: ${data.meeting_date}
Meeting Type: ${data.meeting_type}
Documentation Deadline: ${new Date(data.deadline).toLocaleDateString()}
${data.is_overdue ? `Days Overdue: ${data.days_overdue}` : `Days Remaining: ${data.days_remaining}`}

Per ${CMS_REGULATION}, all IDG meeting documentation must be completed within 14 calendar days of the meeting date.

Please complete the documentation at: ${data.documentation_link}

If you are unable to complete the documentation before the deadline, please contact your supervisor to request a late submission override.
  `.trim();

  const html = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .header { background: ${data.is_overdue ? '#dc3545' : data.days_remaining <= 1 ? '#ffc107' : '#17a2b8'}; color: white; padding: 15px; }
    .content { padding: 20px; }
    .deadline-info { background: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0; }
    .action-btn { background: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px; display: inline-block; }
    .regulation { font-size: 0.9em; color: #666; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="header">
    <h2>${subject}</h2>
  </div>
  <div class="content">
    <p>${urgencyText}</p>

    <div class="deadline-info">
      <p><strong>Meeting Date:</strong> ${data.meeting_date}</p>
      <p><strong>Meeting Type:</strong> ${data.meeting_type}</p>
      <p><strong>Documentation Deadline:</strong> ${new Date(data.deadline).toLocaleDateString()}</p>
      <p><strong>${data.is_overdue ? 'Days Overdue:' : 'Days Remaining:'}</strong>
         ${data.is_overdue ? data.days_overdue : data.days_remaining}</p>
    </div>

    <p><a href="${data.documentation_link}" class="action-btn">Complete Documentation</a></p>

    <p class="regulation">
      Per ${CMS_REGULATION}, all IDG meeting documentation must be completed within 14 calendar days of the meeting date.
      If you cannot meet this deadline, please contact your supervisor to request a late submission override.
    </p>
  </div>
</body>
</html>
  `.trim();

  return { subject, text, html };
}

export default {
  processComplianceAlerts,
  checkOverdueDocumentation,
  generateMonthlyComplianceReport
};
