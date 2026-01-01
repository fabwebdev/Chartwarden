import JobScheduler from '../jobs/scheduler.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

import { logger } from '../utils/logger.js';

/**
 * Jobs Routes
 * Admin routes for managing and triggering background jobs
 * Only available in development environment or to admin users
 */
export default async function jobsRoutes(fastify, options) {
  // Get scheduler status
  fastify.get('/jobs/status', {
    preHandler: [requireAnyPermission(PERMISSIONS.MANAGE_SETTINGS)]
  }, async (request, reply) => {
    return {
      success: true,
      data: {
        scheduler_enabled: process.env.ENABLE_SCHEDULER === 'true',
        available_jobs: [
          'cap-recalculation',
          'certification-alerts',
          'overdue-certifications',
          'audit-retention',
          'audit-compliance-check'
        ],
        timezone: process.env.TZ || 'America/New_York'
      }
    };
  });

  // Manually trigger a specific job
  fastify.post('/jobs/:jobName/run', {
    preHandler: [requireAnyPermission(PERMISSIONS.MANAGE_SETTINGS)]
  }, async (request, reply) => {
    const { jobName } = request.params;

    // Validate job name
    const validJobs = [
      'cap-recalculation',
      'certification-alerts',
      'overdue-certifications',
      'audit-retention',
      'audit-compliance-check'
    ];

    if (!validJobs.includes(jobName)) {
      return reply.code(400).send({
        success: false,
        error: {
          code: 'INVALID_JOB',
          message: `Invalid job name. Valid jobs: ${validJobs.join(', ')}`
        }
      });
    }

    try {
      logger.info(`Manual job trigger requested: ${jobName}`, {
        user_id: request.user?.id,
        job: jobName
      });

      const result = await JobScheduler.runJob(jobName);

      logger.info(`Manual job completed: ${jobName}`, {
        user_id: request.user?.id,
        job: jobName,
        result
      });

      return {
        success: true,
        data: {
          job: jobName,
          executed_at: new Date().toISOString(),
          result
        }
      };
    } catch (error) {
      logger.error(`Manual job failed: ${jobName}`, {
        user_id: request.user?.id,
        job: jobName,
        error: error.message
      });

      return reply.code(500).send({
        success: false,
        error: {
          code: 'JOB_EXECUTION_FAILED',
          message: error.message
        }
      });
    }
  });
}
