/**
 * CSRF Protection Middleware
 *
 * SECURITY: TICKET #004 - Prevent Cross-Site Request Forgery attacks
 * HIPAA: Supports §164.312(a)(1) - Access Control
 *
 * This middleware integrates with @fastify/csrf-protection plugin to provide
 * CSRF token validation for all state-changing operations (POST, PUT, DELETE, PATCH).
 *
 * Usage:
 *   // Option 1: Use fastify's built-in csrfProtection hook (recommended)
 *   fastify.post('/api/patients', { onRequest: fastify.csrfProtection }, handler);
 *
 *   // Option 2: Use this custom middleware for additional flexibility
 *   import { csrfProtection } from '../middleware/csrf.middleware.js';
 *   fastify.post('/api/patients', { preHandler: csrfProtection }, handler);
 */

/**
 * Routes that should be exempt from CSRF protection
 * These are typically:
 * - Authentication endpoints (sign-in, sign-up) that don't have a session yet
 * - The CSRF token endpoint itself
 * - Health check endpoints
 */
export const csrfExemptRoutes = [
  '/api/auth/csrf-token',
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/auth/sign-in/email',
  '/api/auth/sign-out',
  '/api/health',
  '/health',
  '/api/status',
  // Validation test routes (development only)
  '/api/validation-test'
];

/**
 * Check if a route should be exempt from CSRF protection
 * @param {string} url - The request URL
 * @returns {boolean} - True if the route should skip CSRF protection
 */
function shouldSkipCsrf(url) {
  // Exact match check
  if (csrfExemptRoutes.includes(url)) {
    return true;
  }

  // Prefix match for validation test routes (development only)
  if (url.startsWith('/api/validation-test')) {
    return true;
  }

  // Check for Better Auth internal routes (they have their own CSRF handling)
  // Only skip specific Better Auth endpoints, not all /api/auth/* routes
  const betterAuthRoutes = [
    '/api/auth/get-session',
    '/api/auth/session',
    '/api/auth/callback'
  ];

  if (betterAuthRoutes.some(route => url.startsWith(route))) {
    return true;
  }

  return false;
}

/**
 * CSRF Protection Pre-Handler
 * Validates CSRF token for state-changing requests
 *
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function csrfProtection(request, reply) {
  try {
    // Skip CSRF validation in development if explicitly disabled
    if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_CSRF === 'true') {
      request.log.warn('CSRF protection disabled in development mode');
      return;
    }

    // Check if route is exempt
    if (shouldSkipCsrf(request.url)) {
      return;
    }

    // Get CSRF token from request (multiple sources supported by @fastify/csrf-protection)
    // The plugin checks: x-csrf-token header, _csrf in body, _csrf in query
    const csrfToken =
      request.headers['x-csrf-token'] ||
      request.headers['csrf-token'] ||
      request.headers['x-xsrf-token'] ||
      request.body?._csrf ||
      request.query?._csrf;

    if (!csrfToken) {
      request.log.warn({
        url: request.url,
        method: request.method
      }, 'CSRF token missing from request');

      reply.code(403);
      return {
        status: 403,
        error: 'CSRF Token Missing',
        message: 'CSRF token is required for this request. Please include the token in the x-csrf-token header.',
        hint: 'Fetch a new token from GET /api/auth/csrf-token'
      };
    }

    // Use fastify's csrfProtection hook to validate the token
    // This is done by calling the hook directly if available
    // The @fastify/csrf-protection plugin decorates fastify with csrfProtection
    if (request.server.csrfProtection) {
      try {
        await request.server.csrfProtection(request, reply);
        // If we get here without an error, the token is valid
        request.log.debug({
          url: request.url,
          method: request.method
        }, 'CSRF token validated');
      } catch (csrfError) {
        request.log.warn({
          url: request.url,
          method: request.method,
          error: csrfError.message
        }, 'CSRF token validation failed');

        reply.code(403);
        return {
          status: 403,
          error: 'Invalid CSRF Token',
          message: 'CSRF token validation failed. The token may be expired or invalid.',
          hint: 'Fetch a new token from GET /api/auth/csrf-token and retry the request'
        };
      }
    }

  } catch (error) {
    request.log.error({ error }, 'CSRF validation error');
    reply.code(403);
    return {
      status: 403,
      error: 'CSRF Validation Error',
      message: 'An error occurred while validating the CSRF token',
      hint: 'Fetch a new token from GET /api/auth/csrf-token and retry the request'
    };
  }
}

/**
 * Auto-apply CSRF protection to all state-changing routes
 * This hook can be registered globally to protect all POST/PUT/DELETE/PATCH routes
 *
 * Usage:
 *   // Register as a global preHandler hook in server.js
 *   app.addHook('preHandler', csrfAutoProtect);
 *
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function csrfAutoProtect(request, reply) {
  // Only protect state-changing HTTP methods
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (!protectedMethods.includes(request.method)) {
    return; // Skip CSRF for GET, HEAD, OPTIONS
  }

  // Skip CSRF validation in development if explicitly disabled
  if (process.env.NODE_ENV !== 'production' && process.env.DISABLE_CSRF === 'true') {
    return;
  }

  // Check if route is exempt
  if (shouldSkipCsrf(request.url)) {
    return;
  }

  // Get CSRF token from request headers or body
  const csrfToken =
    request.headers['x-csrf-token'] ||
    request.headers['csrf-token'] ||
    request.headers['x-xsrf-token'] ||
    request.body?._csrf ||
    request.query?._csrf;

  if (!csrfToken) {
    request.log.warn({
      url: request.url,
      method: request.method
    }, 'CSRF token missing from request');

    reply.code(403);
    return reply.send({
      status: 403,
      error: 'CSRF Token Missing',
      message: 'CSRF token is required for this request. Please include the token in the x-csrf-token header.',
      hint: 'Fetch a new token from GET /api/auth/csrf-token'
    });
  }

  // Use fastify's csrfProtection hook to validate the token
  if (request.server.csrfProtection) {
    try {
      await request.server.csrfProtection(request, reply);
      // Token is valid - continue to route handler
      request.log.debug({
        url: request.url,
        method: request.method
      }, 'CSRF token validated');
    } catch (csrfError) {
      request.log.warn({
        url: request.url,
        method: request.method,
        error: csrfError.message
      }, 'CSRF token validation failed');

      reply.code(403);
      return reply.send({
        status: 403,
        error: 'Invalid CSRF Token',
        message: 'CSRF token validation failed. The token may be expired or invalid.',
        hint: 'Fetch a new token from GET /api/auth/csrf-token and retry the request'
      });
    }
  }
}

export default csrfProtection;
