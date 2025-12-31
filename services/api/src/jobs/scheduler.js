import cron from 'node-cron';
import { recalculateAllCaps } from './capRecalculation.job.js';
import { processCertificationAlerts, checkOverdueCertifications } from './certificationAlerts.job.js';

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
      default:
        throw new Error(`Unknown job: ${jobName}`);
    }
  }
}

export default new JobScheduler();
