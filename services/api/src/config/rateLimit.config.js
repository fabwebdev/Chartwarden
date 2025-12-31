/**
 * Rate Limiting Configuration
 *
 * Implements tiered rate limiting based on authentication status:
 * - Unauthenticated users: 100 requests per minute (SECURITY requirement)
 * - Authenticated users: 500 requests per minute (higher limit for logged-in users)
 *
 * Uses Redis for distributed rate limiting when available,
 * falls back to in-memory store for single-instance deployments.
 *
 * SECURITY: Prevents brute-force attacks on authentication endpoints
 * TICKET: #003 - Phase 0 Critical Security Fix
 * HIPAA: Supports §164.312(a)(2)(i) - Unique User Identification
 */

import auth from './betterAuth.js';
import { fromNodeHeaders } from 'better-auth/node';
import { logger } from '../utils/logger.js';

// Rate limit threshold values
export const RATE_LIMITS = {
  // Unauthenticated users - stricter limits (100 req/min as specified)
  UNAUTHENTICATED: {
    max: 100,
    timeWindow: '1 minute',
    timeWindowMs: 60000,
  },
  // Authenticated users - higher limits for better user experience
  AUTHENTICATED: {
    max: 500,
    timeWindow: '1 minute',
    timeWindowMs: 60000,
  },
  // Login endpoint - extra strict to prevent brute-force
  LOGIN: {
    max: 5,
    timeWindow: '15 minutes',
    timeWindowMs: 900000,
  },
  // Signup endpoint - prevent mass account creation
  SIGNUP: {
    max: 3,
    timeWindow: '1 hour',
    timeWindowMs: 3600000,
  },
  // Password reset - prevent enumeration attacks
  PASSWORD_RESET: {
    max: 3,
    timeWindow: '1 hour',
    timeWindowMs: 3600000,
  },
};

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
 * Check if the current request is from an authenticated user
 * Uses Better Auth session validation without fully loading user data
 *
 * @param {Object} request - Fastify request object
 * @returns {Promise<boolean>} True if authenticated
 */
async function isAuthenticated(request) {
  try {
    const sessionToken = request.cookies?.['better-auth.session_token'];
    if (!sessionToken) {
      return false;
    }

    // Quick session validation without full user loading
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
      cookies: request.cookies,
    });

    return !!session?.user;
  } catch (error) {
    // Session validation failed - treat as unauthenticated
    logger.debug('Rate limit auth check failed', { error: error.message });
    return false;
  }
}

/**
 * Get Redis store for distributed rate limiting
 * Returns the Redis client if available
 *
 * @returns {Promise<Object|null>} Redis client or null
 */
export async function getRedisStore() {
  try {
    const redisService = (await import('../services/RedisService.js')).default;
    const isConnected = await redisService.isConnected();

    if (isConnected) {
      const client = await redisService.getClient();
      logger.info('Rate limiting using Redis store for distributed limiting');
      return client;
    }
  } catch (error) {
    logger.debug('Redis not available for rate limiting, using in-memory store', {
      error: error.message,
    });
  }

  return null;
}

/**
 * Build the global rate limit plugin configuration
 * Implements tiered rate limiting: 100 req/min unauthenticated, 500 req/min authenticated
 *
 * @param {Object|null} redisClient - Optional Redis client for distributed limiting
 * @returns {Object} Fastify rate-limit plugin configuration
 */
export function buildGlobalRateLimitConfig(redisClient = null) {
  const config = {
    global: true,
    // Default to unauthenticated limit - will be overridden dynamically
    max: RATE_LIMITS.UNAUTHENTICATED.max,
    timeWindow: RATE_LIMITS.UNAUTHENTICATED.timeWindow,

    // Use Redis if available for distributed limiting
    ...(redisClient && { redis: redisClient }),

    // Cache size for in-memory fallback
    cache: 10000,

    // Allow unlimited requests from localhost in development
    allowList: function(request) {
      if (process.env.NODE_ENV !== 'production') {
        const ip = request.ip;
        return ip === '127.0.0.1' || ip === '::1' || ip === 'localhost';
      }
      return false;
    },

    // Key generator - uses IP address
    keyGenerator: function(request) {
      return request.ip;
    },

    // Dynamic max based on authentication status
    max: async function(request, key) {
      const authenticated = await isAuthenticated(request);

      if (authenticated) {
        logger.debug('Rate limit: authenticated user', {
          ip: request.ip,
          max: RATE_LIMITS.AUTHENTICATED.max,
        });
        return RATE_LIMITS.AUTHENTICATED.max;
      }

      logger.debug('Rate limit: unauthenticated user', {
        ip: request.ip,
        max: RATE_LIMITS.UNAUTHENTICATED.max,
      });
      return RATE_LIMITS.UNAUTHENTICATED.max;
    },

    // HIPAA-compliant error response (no sensitive data)
    errorResponseBuilder: function(request, context) {
      return {
        success: false,
        status: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: context.after,
        code: 'RATE_LIMIT_EXCEEDED',
      };
    },

    // Add rate limit headers to all responses
    addHeaders: {
      'x-ratelimit-limit': true,
      'x-ratelimit-remaining': true,
      'x-ratelimit-reset': true,
      'retry-after': true,
    },

    // Hook to run when rate limit is approaching
    onExceeding: function(request, key) {
      logger.warn('Rate limit approaching', {
        ip: request.ip,
        path: request.url,
        key,
      });
    },

    // Hook to run when rate limit is exceeded
    onExceeded: function(request, key) {
      logger.warn('Rate limit exceeded', {
        ip: request.ip,
        path: request.url,
        method: request.method,
        key,
      });
    },
  };

  return config;
}

/**
 * Rate limit configurations for different endpoints (legacy format for backward compatibility)
 */
export const rateLimitConfig = {
  // Global rate limit with authentication-aware dynamic limiting
  global: {
    max: RATE_LIMITS.UNAUTHENTICATED.max,
    timeWindow: RATE_LIMITS.UNAUTHENTICATED.timeWindow,
    cache: 10000,
    allowList: function(request) {
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
        success: false,
        status: 429,
        error: 'Too Many Requests',
        message: 'Rate limit exceeded. Please try again later.',
        retryAfter: context.after,
        code: 'RATE_LIMIT_EXCEEDED',
      };
    },
  },

  // Authentication endpoints - stricter limits
  auth: {
    signIn: {
      max: RATE_LIMITS.LOGIN.max,
      timeWindow: RATE_LIMITS.LOGIN.timeWindow,
      keyGenerator: authRateLimitKeyGenerator,
      errorResponseBuilder: function(request, context) {
        return {
          success: false,
          status: 429,
          error: 'Too Many Login Attempts',
          message: 'Too many login attempts. Please try again in 15 minutes.',
          retryAfter: context.after,
          lockoutDuration: '15 minutes',
          code: 'LOGIN_RATE_LIMIT_EXCEEDED',
        };
      },
    },

    signUp: {
      max: RATE_LIMITS.SIGNUP.max,
      timeWindow: RATE_LIMITS.SIGNUP.timeWindow,
      keyGenerator: authRateLimitKeyGenerator,
      errorResponseBuilder: function(request, context) {
        return {
          success: false,
          status: 429,
          error: 'Too Many Signup Attempts',
          message: 'Too many signup attempts. Please try again in 1 hour.',
          retryAfter: context.after,
          code: 'SIGNUP_RATE_LIMIT_EXCEEDED',
        };
      },
    },

    forgotPassword: {
      max: RATE_LIMITS.PASSWORD_RESET.max,
      timeWindow: RATE_LIMITS.PASSWORD_RESET.timeWindow,
      keyGenerator: authRateLimitKeyGenerator,
      errorResponseBuilder: function(request, context) {
        return {
          success: false,
          status: 429,
          error: 'Too Many Password Reset Attempts',
          message: 'Too many password reset attempts. Please try again in 1 hour.',
          retryAfter: context.after,
          code: 'PASSWORD_RESET_RATE_LIMIT_EXCEEDED',
        };
      },
    },
  },

  // API endpoints - uses dynamic authentication-based limiting
  api: {
    max: async function(request, key) {
      const authenticated = await isAuthenticated(request);
      return authenticated ? RATE_LIMITS.AUTHENTICATED.max : RATE_LIMITS.UNAUTHENTICATED.max;
    },
    timeWindow: RATE_LIMITS.UNAUTHENTICATED.timeWindow,
    keyGenerator: function(request) {
      // For API calls, use IP address
      return `api:${request.ip}`;
    },
  },
};

export default rateLimitConfig;
