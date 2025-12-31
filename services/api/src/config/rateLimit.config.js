/**
 * Rate Limiting Configuration
 *
 * SECURITY: Prevents brute-force attacks on authentication endpoints
 * TICKET: #003 - Phase 0 Critical Security Fix
 * HIPAA: Supports §164.312(a)(2)(i) - Unique User Identification
 */

/**
 * Custom key generator for rate limiting
 * Combines IP address and email/username for more granular rate limiting
 *
 * @param {Object} request - Fastify request object
 * @returns {string} Rate limit key
 */
export function authRateLimitKeyGenerator(request) {
  const ip = request.ip || request.headers['x-forwarded-for'] || request.headers['x-real-ip'] || 'unknown';

  // For auth routes, combine IP + email/username for more specific limiting
  const email = request.body?.email || request.body?.username || '';

  if (email) {
    return `${ip}:${email.toLowerCase()}`;
  }

  // Fallback to IP only
  return ip;
}

/**
 * Rate limit configurations for different endpoints
 */
export const rateLimitConfig = {
  // Global rate limit (applies to all endpoints if not overridden)
  global: {
    max: 100, // Maximum 100 requests
    timeWindow: '1 minute', // Per minute per IP
    cache: 10000, // Cache size
    allowList: function(request) {
      // Allow unlimited requests from localhost in development
      if (process.env.NODE_ENV !== 'production') {
        const ip = request.ip;
        return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
      }
      return false;
    },
    keyGenerator: function(request) {
      return request.ip;
    },
    errorResponseBuilder: function(request, context) {
      return {
        status: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: context.after
      };
    }
  },

  // Authentication endpoints - stricter limits
  auth: {
    signIn: {
      max: 5, // Maximum 5 login attempts
      timeWindow: '15 minutes', // Per 15 minutes
      keyGenerator: authRateLimitKeyGenerator,
      errorResponseBuilder: function(request, context) {
        return {
          status: 429,
          error: 'Too Many Login Attempts',
          message: 'Too many login attempts. Please try again in 15 minutes.',
          retryAfter: context.after,
          lockoutDuration: '15 minutes'
        };
      }
    },

    signUp: {
      max: 3, // Maximum 3 signup attempts
      timeWindow: '1 hour', // Per hour
      keyGenerator: authRateLimitKeyGenerator,
      errorResponseBuilder: function(request, context) {
        return {
          status: 429,
          error: 'Too Many Signup Attempts',
          message: 'Too many signup attempts. Please try again in 1 hour.',
          retryAfter: context.after
        };
      }
    },

    forgotPassword: {
      max: 3, // Maximum 3 password reset requests
      timeWindow: '1 hour', // Per hour
      keyGenerator: authRateLimitKeyGenerator,
      errorResponseBuilder: function(request, context) {
        return {
          status: 429,
          error: 'Too Many Password Reset Attempts',
          message: 'Too many password reset attempts. Please try again in 1 hour.',
          retryAfter: context.after
        };
      }
    }
  },

  // API endpoints - moderate limits
  api: {
    max: 60, // Maximum 60 requests
    timeWindow: '1 minute', // Per minute per IP
    keyGenerator: function(request) {
      // For authenticated API calls, use user ID + IP
      if (request.user && request.user.id) {
        return `api:${request.user.id}:${request.ip}`;
      }
      return `api:${request.ip}`;
    }
  }
};

export default rateLimitConfig;
