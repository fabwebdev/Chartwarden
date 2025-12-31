/**
 * CSRF Protection Middleware
 *
 * SECURITY: TICKET #004 - Prevent Cross-Site Request Forgery attacks
 * HIPAA: Supports §164.312(a)(1) - Access Control
 *
 * Usage:
 *   import { csrfProtection } from '../middleware/csrf.middleware.js';
 *
 *   fastify.post('/api/patients', { preHandler: csrfProtection }, async (request, reply) => {
 *     // Route handler
 *   });
 */

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

    // CSRF protection is automatically handled by @fastify/csrf-protection
    // The plugin expects the token in the request body, headers, or query
    // Common header names: x-csrf-token, csrf-token, x-xsrf-token

    // Get CSRF token from request (multiple sources)
    const csrfToken =
      request.headers['x-csrf-token'] ||
      request.headers['csrf-token'] ||
      request.headers['x-xsrf-token'] ||
      request.body?._csrf ||
      request.query?._csrf;

    if (!csrfToken) {
      reply.code(403);
      return {
        status: 403,
        error: 'CSRF Token Missing',
        message: 'CSRF token is required for this request. Please include the token in the x-csrf-token header.',
        hint: 'Fetch a new token from GET /api/auth/csrf-token'
      };
    }

    // Verify the CSRF token
    // @fastify/csrf-protection provides reply.csrfProtection() method
    const isValid = await request.csrfProtection();

    if (!isValid) {
      reply.code(403);
      return {
        status: 403,
        error: 'Invalid CSRF Token',
        message: 'CSRF token validation failed. The token may be expired or invalid.',
        hint: 'Fetch a new token from GET /api/auth/csrf-token and retry the request'
      };
    }

    // Token is valid, continue to route handler
    request.log.info({
      url: request.url,
      method: request.method
    }, 'CSRF token validated');

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
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export async function csrfAutoProtect(request, reply) {
  // Only protect state-changing HTTP methods
  const protectedMethods = ['POST', 'PUT', 'DELETE', 'PATCH'];

  if (!protectedMethods.includes(request.method)) {
    return; // Skip CSRF for GET, HEAD, OPTIONS
  }

  // Skip CSRF for specific routes (like the CSRF token endpoint itself)
  const skipRoutes = [
    '/api/auth/csrf-token',
    '/api/auth/sign-in',
    '/api/auth/sign-up',
    // Better Auth routes (they have their own CSRF protection)
    '/api/auth/'
  ];

  const shouldSkip = skipRoutes.some(route => request.url.startsWith(route));
  if (shouldSkip) {
    return;
  }

  // Apply CSRF protection
  await csrfProtection(request, reply);
}

/**
 * Exempted routes from CSRF protection
 * Add routes here that should not require CSRF tokens
 */
export const csrfExemptRoutes = [
  '/api/auth/csrf-token',
  '/api/auth/sign-in',
  '/api/auth/sign-up',
  '/api/health',
  '/api/status'
];

export default csrfProtection;
