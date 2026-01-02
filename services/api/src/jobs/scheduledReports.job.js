import { db } from "../config/db.drizzle.js";
import { report_schedules } from "../db/schemas/index.js";
import { eq, and, isNull, lte, asc } from "drizzle-orm";
import { logger } from "../utils/logger.js";
import ReportExecutionService from "../services/ReportExecutionService.js";
import ReportDeliveryService from "../services/ReportDeliveryService.js";

/**
 * Scheduled Reports Job
 * Processes all due scheduled reports
 *
 * This job runs at configured intervals to:
 * 1. Find all schedules with next_execution_at <= now
 * 2. Execute each report using ReportExecutionService
 * 3. Deliver results using ReportDeliveryService
 * 4. Update schedule with next execution time
 *
 * HIPAA Compliance:
 * - All executions are logged
 * - Error handling with audit trail
 * - Rate limiting to prevent abuse
 */

// Track concurrent executions to prevent overload
let isRunning = false;
const MAX_CONCURRENT_REPORTS = parseInt(process.env.MAX_CONCURRENT_REPORTS) || 5;

/**
 * Process all due scheduled reports
 * @returns {Object} Execution summary
 */
export async function processScheduledReports() {
  // Prevent concurrent runs
  if (isRunning) {
    logger.warn('Scheduled reports job already running, skipping...');
    return { skipped: true, reason: 'Job already running' };
  }

  isRunning = true;
  const startTime = Date.now();
  const results = {
    processed: 0,
    successful: 0,
    failed: 0,
    skipped: 0,
    details: []
  };

  try {
    logger.info('Starting scheduled reports job...');

    // Initialize the execution service (ensure output directory exists)
    await ReportExecutionService.initialize();

    // Find all due schedules
    const now = new Date();
    const dueSchedules = await db
      .select()
      .from(report_schedules)
      .where(and(
        eq(report_schedules.is_active, true),
        isNull(report_schedules.deleted_at),
        lte(report_schedules.next_execution_at, now)
      ))
      .orderBy(asc(report_schedules.next_execution_at))
      .limit(MAX_CONCURRENT_REPORTS * 2); // Get more than we'll process in case some skip

    if (dueSchedules.length === 0) {
      logger.info('No scheduled reports due for execution');
      return { ...results, message: 'No reports due' };
    }

    logger.info(`Found ${dueSchedules.length} scheduled reports due for execution`);

    // Process schedules with concurrency limit
    const chunks = chunkArray(dueSchedules, MAX_CONCURRENT_REPORTS);

    for (const chunk of chunks) {
      const chunkResults = await Promise.allSettled(
        chunk.map(schedule => executeScheduledReport(schedule))
      );

      for (let i = 0; i < chunkResults.length; i++) {
        const result = chunkResults[i];
        const schedule = chunk[i];

        results.processed++;

        if (result.status === 'fulfilled') {
          if (result.value.skipped) {
            results.skipped++;
            results.details.push({
              schedule_id: schedule.id,
              status: 'SKIPPED',
              reason: result.value.reason
            });
          } else {
            results.successful++;
            results.details.push({
              schedule_id: schedule.id,
              configuration_id: schedule.configuration_id,
              status: 'SUCCESS',
              report_id: result.value.reportId,
              delivery_status: result.value.deliveryStatus
            });
          }
        } else {
          results.failed++;
          results.details.push({
            schedule_id: schedule.id,
            configuration_id: schedule.configuration_id,
            status: 'FAILED',
            error: result.reason?.message || 'Unknown error'
          });
          logger.error(`Scheduled report ${schedule.id} failed:`, result.reason);
        }
      }
    }

    const duration = Date.now() - startTime;
    logger.info(`Scheduled reports job completed in ${duration}ms`, results);

    return {
      ...results,
      duration_ms: duration
    };

  } catch (error) {
    logger.error('Scheduled reports job failed:', error);
    throw error;
  } finally {
    isRunning = false;
  }
}

/**
 * Execute a single scheduled report
 * @param {Object} schedule - Schedule record
 * @returns {Object} Execution result
 */
async function executeScheduledReport(schedule) {
  logger.info(`Executing scheduled report: ${schedule.id} (config: ${schedule.configuration_id})`);

  try {
    // Check if within pause period
    if (schedule.pause_start_date && schedule.pause_end_date) {
      const now = new Date();
      const pauseStart = new Date(schedule.pause_start_date);
      const pauseEnd = new Date(schedule.pause_end_date);

      if (now >= pauseStart && now <= pauseEnd) {
        logger.info(`Schedule ${schedule.id} is paused until ${pauseEnd}`);
        return { skipped: true, reason: 'Schedule is paused' };
      }
    }

    // Check if schedule has ended
    if (schedule.end_date && new Date(schedule.end_date) < new Date()) {
      logger.info(`Schedule ${schedule.id} has ended`);

      // Deactivate the schedule
      await db
        .update(report_schedules)
        .set({
          is_active: false,
          updated_at: new Date()
        })
        .where(eq(report_schedules.id, schedule.id));

      return { skipped: true, reason: 'Schedule has ended' };
    }

    // Execute the report
    const report = await ReportExecutionService.executeReport(schedule.configuration_id, {
      parameters: schedule.schedule_parameters,
      outputFormat: schedule.output_format,
      executionType: 'SCHEDULED',
      scheduleId: schedule.id
    });

    if (report.skipped) {
      return report;
    }

    // Deliver if successful
    let deliveryStatus = 'NOT_REQUIRED';
    if (report.status === 'SUCCESS') {
      try {
        const deliveryResult = await ReportDeliveryService.deliverReport(report.id, schedule.id);
        deliveryStatus = deliveryResult.status;
      } catch (deliveryError) {
        logger.error(`Delivery failed for report ${report.id}:`, deliveryError);
        deliveryStatus = 'FAILED';
      }
    }

    return {
      reportId: report.id,
      status: report.status,
      deliveryStatus
    };

  } catch (error) {
    logger.error(`Error executing scheduled report ${schedule.id}:`, error);
    throw error;
  }
}

/**
 * Get the current status of the scheduled reports job
 * @returns {Object} Job status
 */
export function getScheduledReportsJobStatus() {
  return {
    isRunning,
    maxConcurrent: MAX_CONCURRENT_REPORTS
  };
}

/**
 * Manually trigger scheduled reports processing
 * (Useful for testing and admin operations)
 */
export async function triggerScheduledReports() {
  return await processScheduledReports();
}

/**
 * Helper function to chunk an array
 */
function chunkArray(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

export default {
  processScheduledReports,
  getScheduledReportsJobStatus,
  triggerScheduledReports
};
