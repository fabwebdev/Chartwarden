import { db } from "../config/db.drizzle.js";
import {
  report_schedules,
  generated_reports,
  report_recipients,
  report_access_logs
} from "../db/schemas/index.js";
import { users } from "../db/schemas/user.schema.js";
import { eq, and, isNull, inArray } from "drizzle-orm";
import { logger } from "../utils/logger.js";
import MailService from "./MailService.js";
import fs from "fs/promises";
import path from "path";

/**
 * Report Delivery Service
 * Handles multi-channel delivery of generated reports
 *
 * Delivery Channels:
 * - EMAIL: Send report as attachment to specified recipients
 * - WEBHOOK: POST report data or URL to webhook endpoint
 * - FILE: Store in designated file location
 * - DOWNLOAD: On-demand retrieval via API
 *
 * HIPAA Compliance:
 * - All deliveries are logged
 * - PHI handling with encryption in transit
 * - Delivery audit trail maintained
 */
class ReportDeliveryService {
  constructor() {
    // Retry configuration
    this.maxRetries = parseInt(process.env.DELIVERY_MAX_RETRIES) || 3;
    this.retryDelayMs = parseInt(process.env.DELIVERY_RETRY_DELAY_MS) || 60000;

    // Delivery metrics
    this.metrics = {
      totalDeliveries: 0,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      deliveriesByChannel: {
        EMAIL: 0,
        WEBHOOK: 0,
        FILE: 0
      }
    };
  }

  /**
   * Deliver a generated report to all configured recipients
   * @param {number} generatedReportId - ID of the generated report
   * @param {number} scheduleId - Optional schedule ID for scheduled deliveries
   * @returns {Object} Delivery results
   */
  async deliverReport(generatedReportId, scheduleId = null) {
    const startTime = Date.now();
    const deliveryResults = [];

    try {
      // Get the generated report
      const [report] = await db
        .select()
        .from(generated_reports)
        .where(eq(generated_reports.id, generatedReportId));

      if (!report) {
        throw new Error(`Generated report ${generatedReportId} not found`);
      }

      if (report.status !== 'SUCCESS') {
        throw new Error(`Cannot deliver report with status: ${report.status}`);
      }

      // Get recipients from schedule or direct configuration
      let recipients = [];
      if (scheduleId) {
        recipients = await this.getScheduleRecipients(scheduleId);
      }

      // If no recipients configured, mark as not required
      if (recipients.length === 0) {
        await this.updateDeliveryStatus(generatedReportId, 'NOT_REQUIRED', []);
        return {
          status: 'NOT_REQUIRED',
          message: 'No recipients configured',
          deliveryResults: []
        };
      }

      // Get schedule for email customization
      let schedule = null;
      if (scheduleId) {
        [schedule] = await db
          .select()
          .from(report_schedules)
          .where(eq(report_schedules.id, scheduleId));
      }

      // Deliver to each recipient
      for (const recipient of recipients) {
        try {
          const result = await this.deliverToRecipient(report, recipient, schedule);
          deliveryResults.push({
            recipient,
            status: 'SUCCESS',
            deliveredAt: new Date(),
            ...result
          });
          this.metrics.successfulDeliveries++;
        } catch (error) {
          logger.error(`Delivery failed for recipient:`, { recipient, error: error.message });
          deliveryResults.push({
            recipient,
            status: 'FAILED',
            error: error.message,
            failedAt: new Date()
          });
          this.metrics.failedDeliveries++;
        }
      }

      this.metrics.totalDeliveries++;

      // Determine overall delivery status
      const allSuccess = deliveryResults.every(r => r.status === 'SUCCESS');
      const allFailed = deliveryResults.every(r => r.status === 'FAILED');
      const overallStatus = allSuccess ? 'DELIVERED' : allFailed ? 'FAILED' : 'PARTIAL';

      // Update report delivery status
      await this.updateDeliveryStatus(
        generatedReportId,
        overallStatus,
        deliveryResults
      );

      return {
        status: overallStatus,
        deliveryResults,
        duration: Date.now() - startTime
      };

    } catch (error) {
      logger.error(`Report delivery failed:`, error);

      await this.updateDeliveryStatus(generatedReportId, 'FAILED', [{
        error: error.message,
        failedAt: new Date()
      }]);

      throw error;
    }
  }

  /**
   * Get recipients for a schedule
   */
  async getScheduleRecipients(scheduleId) {
    const recipients = await db
      .select()
      .from(report_recipients)
      .where(and(
        eq(report_recipients.schedule_id, scheduleId),
        eq(report_recipients.is_active, true)
      ));

    // Resolve user IDs to emails
    const resolvedRecipients = [];

    for (const recipient of recipients) {
      switch (recipient.recipient_type) {
        case 'USER':
          if (recipient.user_id) {
            const [user] = await db
              .select({ email: users.email, name: users.name })
              .from(users)
              .where(eq(users.id, recipient.user_id));
            if (user?.email) {
              resolvedRecipients.push({
                ...recipient,
                email: user.email,
                name: user.name
              });
            }
          }
          break;

        case 'EMAIL':
          if (recipient.email) {
            resolvedRecipients.push(recipient);
          }
          break;

        case 'ROLE':
          // Get all users with the specified role
          if (recipient.role) {
            const usersWithRole = await db
              .select({ id: users.id, email: users.email, name: users.name })
              .from(users)
              .where(eq(users.role, recipient.role));

            for (const user of usersWithRole) {
              if (user.email) {
                resolvedRecipients.push({
                  ...recipient,
                  user_id: user.id,
                  email: user.email,
                  name: user.name
                });
              }
            }
          }
          break;

        case 'WEBHOOK':
          if (recipient.webhook_url) {
            resolvedRecipients.push(recipient);
          }
          break;
      }
    }

    return resolvedRecipients;
  }

  /**
   * Deliver report to a single recipient
   */
  async deliverToRecipient(report, recipient, schedule) {
    switch (recipient.recipient_type) {
      case 'USER':
      case 'EMAIL':
      case 'ROLE':
        return await this.deliverViaEmail(report, recipient, schedule);

      case 'WEBHOOK':
        return await this.deliverViaWebhook(report, recipient);

      default:
        throw new Error(`Unsupported recipient type: ${recipient.recipient_type}`);
    }
  }

  /**
   * Deliver report via email
   */
  async deliverViaEmail(report, recipient, schedule) {
    if (!recipient.email) {
      throw new Error('No email address for recipient');
    }

    this.metrics.deliveriesByChannel.EMAIL++;

    // Build email content
    const subject = recipient.custom_subject ||
      schedule?.email_subject ||
      `Report Ready: ${report.output_filename}`;

    const body = recipient.custom_body ||
      schedule?.email_body ||
      this.buildDefaultEmailBody(report);

    const emailOptions = {
      to: recipient.email,
      subject,
      html: body
    };

    // Attach report file if configured
    if (recipient.include_attachment !== false) {
      try {
        const fileContent = await fs.readFile(report.storage_path);
        emailOptions.attachments = [{
          filename: report.output_filename,
          content: fileContent,
          contentType: report.mime_type
        }];
      } catch (error) {
        logger.error(`Failed to attach file: ${error.message}`);
        // Continue without attachment
      }
    }

    // Include inline content if configured
    if (recipient.include_inline && report.mime_type === 'text/html') {
      try {
        const htmlContent = await fs.readFile(report.storage_path, 'utf-8');
        emailOptions.html = body + '\n<hr>\n' + htmlContent;
      } catch (error) {
        logger.error(`Failed to include inline content: ${error.message}`);
      }
    }

    const result = await MailService.send(emailOptions);

    return {
      channel: 'EMAIL',
      messageId: result.messageId,
      recipient: recipient.email
    };
  }

  /**
   * Build default email body
   */
  buildDefaultEmailBody(report) {
    return `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6;">
          <h2>Your Report is Ready</h2>
          <p>Your requested report has been generated and is attached to this email.</p>
          <table style="border-collapse: collapse; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Report:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${report.output_filename}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Format:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${report.output_format}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Generated:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${new Date(report.completed_at).toLocaleString()}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd; font-weight: bold;">Size:</td>
              <td style="padding: 8px; border: 1px solid #ddd;">${this.formatFileSize(report.file_size_bytes)}</td>
            </tr>
          </table>
          <p style="color: #666; font-size: 0.9em;">
            This is an automated message from the Chartwarden EHR System.
            Please do not reply to this email.
          </p>
          <hr>
          <p style="color: #999; font-size: 0.8em;">
            CONFIDENTIALITY NOTICE: This email and any attachments may contain Protected Health Information (PHI)
            that is privileged and confidential. If you are not the intended recipient, please notify the sender
            immediately and delete this message.
          </p>
        </body>
      </html>
    `;
  }

  /**
   * Deliver report via webhook
   */
  async deliverViaWebhook(report, recipient) {
    if (!recipient.webhook_url) {
      throw new Error('No webhook URL for recipient');
    }

    this.metrics.deliveriesByChannel.WEBHOOK++;

    const payload = {
      event: 'report.generated',
      timestamp: new Date().toISOString(),
      report: {
        id: report.id,
        filename: report.output_filename,
        format: report.output_format,
        size: report.file_size_bytes,
        generatedAt: report.completed_at,
        configurationId: report.configuration_id,
        checksum: report.file_checksum
      }
    };

    const response = await fetch(recipient.webhook_url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Chartwarden-Event': 'report.generated',
        'X-Chartwarden-Timestamp': payload.timestamp
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      throw new Error(`Webhook delivery failed: ${response.status} ${response.statusText}`);
    }

    return {
      channel: 'WEBHOOK',
      statusCode: response.status,
      webhookUrl: recipient.webhook_url
    };
  }

  /**
   * Update delivery status on generated report
   */
  async updateDeliveryStatus(generatedReportId, status, attempts) {
    const updates = {
      delivery_status: status,
      delivery_attempts: attempts
    };

    if (status === 'DELIVERED' || status === 'PARTIAL') {
      updates.delivered_at = new Date();
      updates.delivered_to = attempts
        .filter(a => a.status === 'SUCCESS')
        .map(a => ({
          type: a.recipient?.recipient_type,
          email: a.recipient?.email,
          deliveredAt: a.deliveredAt
        }));
    }

    await db
      .update(generated_reports)
      .set(updates)
      .where(eq(generated_reports.id, generatedReportId));
  }

  /**
   * Retry failed deliveries for a report
   */
  async retryFailedDeliveries(generatedReportId) {
    const [report] = await db
      .select()
      .from(generated_reports)
      .where(eq(generated_reports.id, generatedReportId));

    if (!report) {
      throw new Error('Generated report not found');
    }

    if (report.delivery_status !== 'FAILED' && report.delivery_status !== 'PARTIAL') {
      throw new Error('Can only retry failed or partial deliveries');
    }

    // Get failed attempts
    const failedAttempts = (report.delivery_attempts || [])
      .filter(a => a.status === 'FAILED');

    if (failedAttempts.length === 0) {
      return { status: 'NO_FAILURES', message: 'No failed deliveries to retry' };
    }

    // Re-attempt delivery
    return await this.deliverReport(generatedReportId, report.schedule_id);
  }

  /**
   * Log report access for HIPAA compliance
   */
  async logAccess(generatedReportId, userId, accessType, requestInfo = {}) {
    await db.insert(report_access_logs).values({
      generated_report_id: generatedReportId,
      user_id: userId,
      access_type: accessType,
      ip_address: requestInfo.ip,
      user_agent: requestInfo.userAgent,
      success: true
    });
  }

  /**
   * Log failed access attempt
   */
  async logFailedAccess(generatedReportId, userId, accessType, error, requestInfo = {}) {
    await db.insert(report_access_logs).values({
      generated_report_id: generatedReportId,
      user_id: userId,
      access_type: accessType,
      ip_address: requestInfo.ip,
      user_agent: requestInfo.userAgent,
      success: false,
      error_message: error
    });
  }

  /**
   * Format file size for display
   */
  formatFileSize(bytes) {
    if (!bytes) return '0 B';
    const units = ['B', 'KB', 'MB', 'GB'];
    let i = 0;
    let size = bytes;
    while (size >= 1024 && i < units.length - 1) {
      size /= 1024;
      i++;
    }
    return `${size.toFixed(1)} ${units[i]}`;
  }

  /**
   * Get delivery metrics
   */
  getMetrics() {
    return {
      ...this.metrics,
      successRate: this.metrics.totalDeliveries > 0
        ? ((this.metrics.successfulDeliveries / this.metrics.totalDeliveries) * 100).toFixed(2) + '%'
        : '0%'
    };
  }
}

export default new ReportDeliveryService();
