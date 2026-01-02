import cron from 'node-cron';
import { recalculateAllCaps } from './capRecalculation.job.js';
import { processCertificationAlerts, checkOverdueCertifications } from './certificationAlerts.job.js';
import { runRetentionJob, checkRetentionCompliance } from './auditRetention.job.js';
import { processComplianceAlerts, checkOverdueDocumentation, generateMonthlyComplianceReport } from './idgComplianceAlerts.job.js';
import { processScheduledReports, triggerScheduledReports } from './scheduledReports.job.js';

import { logger } from '../utils/logger.js';
/**
 * Job Scheduler
 * Manages all background jobs and cron schedules
 */
class JobScheduler {
  constructor() {
    this.jobs = [];
  }

  /**
   * Initialize all scheduled jobs
   */
  init() {
    logger.info('Initializing job scheduler...')

    // Cap Recalculation - Daily at 2:00 AM
    this.jobs.push(
      cron.schedule('0 2 * * *', async () => {
        logger.info('Running scheduled cap recalculation job')
        try {
          await recalculateAllCaps();
        } catch (error) {
          logger.error('Cap recalculation job failed:', error)
        }
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'America/New_York'
      })
    );

    // Certification Alerts - Hourly
    this.jobs.push(
      cron.schedule('0 * * * *', async () => {
        logger.info('Running scheduled certification alert processing')
        try {
          await processCertificationAlerts();
        } catch (error) {
          logger.error('Certification alert processing failed:', error)
        }
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'America/New_York'
      })
    );

    // Overdue Certification Check - Daily at 8:00 AM
    this.jobs.push(
      cron.schedule('0 8 * * *', async () => {
        logger.info('Running scheduled overdue certification check')
        try {
          await checkOverdueCertifications();
        } catch (error) {
          logger.error('Overdue certification check failed:', error)
        }
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'America/New_York'
      })
    );

    // Audit Retention Compliance Check - Daily at 3:00 AM
    this.jobs.push(
      cron.schedule('0 3 * * *', async () => {
        logger.info('Running scheduled audit retention compliance check')
        try {
          await checkRetentionCompliance();
        } catch (error) {
          logger.error('Audit retention compliance check failed:', error)
        }
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'America/New_York'
      })
    );

    // Audit Log Archival - Weekly on Sunday at 1:00 AM
    this.jobs.push(
      cron.schedule('0 1 * * 0', async () => {
        logger.info('Running scheduled audit log retention job')
        try {
          await runRetentionJob();
        } catch (error) {
          logger.error('Audit log retention job failed:', error)
        }
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'America/New_York'
      })
    );

    // ============================================================================
    // IDG 14-DAY COMPLIANCE JOBS (42 CFR §418.56)
    // ============================================================================

    // IDG Compliance Alerts - Every 2 hours during business hours
    this.jobs.push(
      cron.schedule('0 */2 6-20 * * *', async () => {
        logger.info('Running scheduled IDG compliance alert processing')
        try {
          await processComplianceAlerts();
        } catch (error) {
          logger.error('IDG compliance alert processing failed:', error)
        }
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'America/New_York'
      })
    );

    // IDG Overdue Documentation Check - Daily at 6:00 AM
    this.jobs.push(
      cron.schedule('0 6 * * *', async () => {
        logger.info('Running scheduled IDG overdue documentation check')
        try {
          await checkOverdueDocumentation();
        } catch (error) {
          logger.error('IDG overdue documentation check failed:', error)
        }
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'America/New_York'
      })
    );

    // IDG Monthly Compliance Report Generation - 1st of each month at 1:00 AM
    this.jobs.push(
      cron.schedule('0 1 1 * *', async () => {
        logger.info('Running scheduled IDG monthly compliance report generation')
        try {
          const now = new Date();
          // Generate report for previous month
          const prevMonth = now.getMonth() === 0 ? 12 : now.getMonth();
          const prevYear = now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
          await generateMonthlyComplianceReport(prevMonth, prevYear);
        } catch (error) {
          logger.error('IDG monthly compliance report generation failed:', error)
        }
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'America/New_York'
      })
    );

    // ============================================================================
    // SCHEDULED REPORTS PROCESSING
    // ============================================================================

    // Scheduled Reports - Every 5 minutes
    // Checks for reports due and executes them with delivery
    this.jobs.push(
      cron.schedule('*/5 * * * *', async () => {
        logger.info('Running scheduled reports processing')
        try {
          await processScheduledReports();
        } catch (error) {
          logger.error('Scheduled reports processing failed:', error)
        }
      }, {
        scheduled: true,
        timezone: process.env.TZ || 'America/New_York'
      })
    );

    logger.info(`Initialized ${this.jobs.length} scheduled jobs`)
  }

  /**
   * Stop all scheduled jobs
   */
  stop() {
    logger.info('Stopping all scheduled jobs...')
    this.jobs.forEach(job => job.stop());
    logger.info('All scheduled jobs stopped')
  }

  /**
   * Run a specific job manually (for testing)
   */
  async runJob(jobName) {
    logger.info(`Manually running job: ${jobName}`)

    switch (jobName) {
      case 'cap-recalculation':
        return await recalculateAllCaps();
      case 'certification-alerts':
        return await processCertificationAlerts();
      case 'overdue-certifications':
        return await checkOverdueCertifications();
      case 'audit-retention':
        return await runRetentionJob();
      case 'audit-compliance-check':
        return await checkRetentionCompliance();
      case 'idg-compliance-alerts':
        return await processComplianceAlerts();
      case 'idg-overdue-check':
        return await checkOverdueDocumentation();
      case 'idg-monthly-report':
        const now = new Date();
        return await generateMonthlyComplianceReport(now.getMonth() + 1, now.getFullYear());
      case 'scheduled-reports':
        return await triggerScheduledReports();
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

export default new JobScheduler();
