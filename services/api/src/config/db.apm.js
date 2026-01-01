/**
 * Database APM Wrapper for Drizzle ORM
 *
 * Provides automatic query performance monitoring:
 * - Query execution time tracking
 * - Slow query identification
 * - Connection pool utilization monitoring
 * - Error rate tracking
 *
 * This wrapper instruments the database pool to capture
 * performance metrics without modifying application code.
 *
 * HIPAA Compliance: Query content is sanitized before logging,
 * removing all actual values to prevent PHI exposure.
 */

import apmService from '../services/APM.service.js';
import { logger } from '../utils/logger.js';

/**
 * Wrap a pg Pool to add APM instrumentation
 * @param {Pool} pool - The pg Pool instance to wrap
 * @returns {Pool} The wrapped pool with APM instrumentation
 */
export function instrumentPool(pool) {
  // Store original query method
  const originalQuery = pool.query.bind(pool);

  // Override query method to add timing
  pool.query = async function instrumentedQuery(...args) {
    const startTime = process.hrtime.bigint();
    let error = null;

    try {
      const result = await originalQuery(...args);
      return result;
    } catch (err) {
      error = err;
      throw err;
    } finally {
      const endTime = process.hrtime.bigint();
      const durationMs = Number(endTime - startTime) / 1000000;

      // Extract query text for monitoring
      const queryText = typeof args[0] === 'string' ? args[0] : args[0]?.text || '[unknown]';

      // Record to APM service
      apmService.recordQuery(queryText, durationMs, error);
    }
  };

  // Monitor connection pool stats periodically
  const poolMonitorInterval = setInterval(() => {
    try {
      apmService.updateConnectionPool({
        total: pool.totalCount,
        active: pool.totalCount - pool.idleCount,
        idle: pool.idleCount,
        waiting: pool.waitingCount,
      });
    } catch (err) {
      // Pool might not have these properties in all versions
      logger.debug('Failed to get pool stats', { error: err.message });
    }
  }, 5000);

  // Store interval for cleanup
  pool._apmInterval = poolMonitorInterval;

  // Wrap end method to clean up interval
  const originalEnd = pool.end.bind(pool);
  pool.end = async function instrumentedEnd(...args) {
    if (pool._apmInterval) {
      clearInterval(pool._apmInterval);
    }
    return originalEnd(...args);
  };

  logger.info('Database pool instrumented with APM');

  return pool;
}

/**
 * Create a wrapped Drizzle logger that reports to APM
 * This can be passed to Drizzle's logger option
 */
export function createApmLogger() {
  return {
    logQuery(query, params) {
      // Drizzle calls this for each query
      // We primarily use pool instrumentation, but this provides
      // additional query insight if needed
    },
  };
}

export default instrumentPool;
