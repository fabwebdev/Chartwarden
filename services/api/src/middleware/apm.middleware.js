/**
 * APM Middleware
 *
 * Provides automatic performance monitoring for:
 * - API request/response times with percentile tracking
 * - Request throughput and error rates
 * - Payload size monitoring
 *
 * Designed for minimal overhead (< 5% performance impact)
 *
 * HIPAA Compliance: Only tracks performance metrics,
 * never logs actual health data or PHI.
 */

import apmService from '../services/APM.service.js';

/**
 * Pre-handler hook to capture request start time
 * This should be registered early in the hook chain
 */
export const apmPreHandler = async (request, reply) => {
  // Use high-resolution timer for accurate measurements
  request.apmStartTime = process.hrtime.bigint();
};

/**
 * Response hook to record request metrics
 * This should be registered as an onResponse hook
 */
export const apmResponseHandler = async (request, reply) => {
  // Skip if start time wasn't captured
  if (!request.apmStartTime) {
    return;
  }

  // Calculate duration in milliseconds
  const endTime = process.hrtime.bigint();
  const durationNs = Number(endTime - request.apmStartTime);
  const durationMs = durationNs / 1000000;

  // Skip health check endpoints to avoid noise
  if (request.url.startsWith('/api/health') ||
      request.url.startsWith('/health') ||
      request.url === '/') {
    return;
  }

  // Record the request in APM service
  apmService.recordRequest(request, reply, durationMs);
};

/**
 * Error handler hook to track errors
 */
export const apmErrorHandler = async (error, request, reply) => {
  // Record error timing if available
  if (request.apmStartTime) {
    const endTime = process.hrtime.bigint();
    const durationNs = Number(endTime - request.apmStartTime);
    const durationMs = durationNs / 1000000;

    // Record as a failed request (reply.statusCode will be the error code)
    apmService.recordRequest(request, reply, durationMs);
  }
};

/**
 * Create APM hooks object for Fastify registration
 * Usage: fastify.addHook('onRequest', apmHooks.onRequest)
 */
export const apmHooks = {
  onRequest: apmPreHandler,
  onResponse: apmResponseHandler,
  onError: apmErrorHandler,
};

export default apmHooks;
