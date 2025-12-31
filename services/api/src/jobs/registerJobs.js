/**
 * Job Registry - Register all jobs at application startup
 *
 * SECURITY: This replaces the dangerous eval() pattern with a secure
 * whitelist of allowed jobs. Only pre-registered jobs can be executed.
 *
 * Usage:
 *   import { registerAllJobs } from './jobs/registerJobs.js';
 *
 *   // In server.js startup:
 *   registerAllJobs();
 *
 *   // To queue a job:
 *   await Queue.push('default', 'send-email', { to: 'user@example.com', ... });
 */

import Queue from '../facades/Queue.js';
import { logger } from '../utils/logger.js';
import {
    sendEmailJob,
    sendPasswordResetEmailJob,
    sendWelcomeEmailJob,
    sendNotificationEmailJob
} from './SendEmailJob.js';

/**
 * Register all available jobs
 * Call this function once during application startup
 */
export function registerAllJobs() {
    // Email jobs
    Queue.registerJob('send-email', sendEmailJob);
    Queue.registerJob('send-password-reset-email', sendPasswordResetEmailJob);
    Queue.registerJob('send-welcome-email', sendWelcomeEmailJob);
    Queue.registerJob('send-notification-email', sendNotificationEmailJob);

    // Add more jobs here as needed:
    // Queue.registerJob('generate-pdf', generatePdfJob);
    // Queue.registerJob('process-report', processReportJob);

    logger.info(`✅ Registered ${Queue.getRegisteredJobNames().length} queue jobs`);
    logger.info('Available jobs:', Queue.getRegisteredJobNames().join(', '));
}

/**
 * Example usage in controllers/services:
 *
 * // Queue a job
 * const jobId = await Queue.push('default', 'send-email', {
 *     to: 'patient@example.com',
 *     subject: 'Appointment Reminder',
 *     body: 'Your appointment is tomorrow at 10am'
 * });
 *
 * // Process jobs (typically in a background worker)
 * await Queue.process();
 */
