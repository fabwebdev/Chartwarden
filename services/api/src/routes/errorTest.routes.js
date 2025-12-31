/**
 * Error Handling Test Routes
 * For verifying HIPAA-compliant error handling
 *
 * These routes are for testing purposes only.
 * They demonstrate various error scenarios and the proper error responses.
 */

import {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  DatabaseError,
  RateLimitError,
  ServiceUnavailableError,
  asyncHandler,
  ErrorCodes
} from '../utils/errorHandler.js';

async function errorTestRoutes(fastify, options) {
  /**
   * Test 404 Not Found error
   * GET /api/error-test/not-found
   */
  fastify.get('/error-test/not-found', asyncHandler(async (request, reply) => {
    throw new NotFoundError('Patient');
  }, 'testNotFound'));

  /**
   * Test 401 Unauthorized error
   * GET /api/error-test/unauthorized
   */
  fastify.get('/error-test/unauthorized', asyncHandler(async (request, reply) => {
    throw UnauthorizedError.sessionExpired();
  }, 'testUnauthorized'));

  /**
   * Test 403 Forbidden error
   * GET /api/error-test/forbidden
   */
  fastify.get('/error-test/forbidden', asyncHandler(async (request, reply) => {
    throw ForbiddenError.insufficientPermissions();
  }, 'testForbidden'));

  /**
   * Test 400 Bad Request error
   * GET /api/error-test/bad-request
   */
  fastify.get('/error-test/bad-request', asyncHandler(async (request, reply) => {
    throw BadRequestError.missingParameter('patientId');
  }, 'testBadRequest'));

  /**
   * Test 422 Validation error with field errors
   * POST /api/error-test/validation
   */
  fastify.post('/error-test/validation', asyncHandler(async (request, reply) => {
    const validationError = new ValidationError('Validation failed', {
      errors: [
        { field: 'email', message: 'Invalid email format', code: ErrorCodes.VALIDATION_INVALID_EMAIL },
        { field: 'phone', message: 'Invalid phone format', code: ErrorCodes.VALIDATION_INVALID_PHONE }
      ]
    });
    throw validationError;
  }, 'testValidation'));

  /**
   * Test 409 Conflict error
   * GET /api/error-test/conflict
   */
  fastify.get('/error-test/conflict', asyncHandler(async (request, reply) => {
    throw ConflictError.alreadyExists('Patient record');
  }, 'testConflict'));

  /**
   * Test 500 Database error (HIPAA-safe - no DB details exposed)
   * GET /api/error-test/database
   */
  fastify.get('/error-test/database', asyncHandler(async (request, reply) => {
    throw DatabaseError.queryFailed('SELECT * FROM patients WHERE id = 123');
  }, 'testDatabase'));

  /**
   * Test 429 Rate Limit error
   * GET /api/error-test/rate-limit
   */
  fastify.get('/error-test/rate-limit', asyncHandler(async (request, reply) => {
    throw RateLimitError.loginAttempts(60);
  }, 'testRateLimit'));

  /**
   * Test 503 Service Unavailable error
   * GET /api/error-test/service-unavailable
   */
  fastify.get('/error-test/service-unavailable', asyncHandler(async (request, reply) => {
    throw ServiceUnavailableError.maintenance();
  }, 'testServiceUnavailable'));

  /**
   * Test unhandled error (programming error)
   * This simulates an unexpected error that would be caught by the global handler
   * GET /api/error-test/unhandled
   */
  fastify.get('/error-test/unhandled', asyncHandler(async (request, reply) => {
    // This simulates an unexpected programming error
    const obj = null;
    return obj.property; // This will throw a TypeError
  }, 'testUnhandled'));

  /**
   * Test error with PHI in message (should be sanitized)
   * GET /api/error-test/phi-leak
   */
  fastify.get('/error-test/phi-leak', asyncHandler(async (request, reply) => {
    // This error message contains PHI that should be logged securely but not returned to client
    throw new AppError(
      'Error processing patient John Doe (SSN: 123-45-6789, DOB: 01/15/1950)',
      500,
      { code: ErrorCodes.SYSTEM_ERROR }
    );
  }, 'testPhiLeak'));

  /**
   * Test successful response (for comparison)
   * GET /api/error-test/success
   */
  fastify.get('/error-test/success', async (request, reply) => {
    return {
      success: true,
      status: 200,
      message: 'Error handling test endpoint is working',
      data: {
        timestamp: new Date().toISOString(),
        availableTests: [
          'GET /api/error-test/not-found - 404 Not Found',
          'GET /api/error-test/unauthorized - 401 Unauthorized',
          'GET /api/error-test/forbidden - 403 Forbidden',
          'GET /api/error-test/bad-request - 400 Bad Request',
          'POST /api/error-test/validation - 422 Validation Error',
          'GET /api/error-test/conflict - 409 Conflict',
          'GET /api/error-test/database - 500 Database Error (safe)',
          'GET /api/error-test/rate-limit - 429 Rate Limit',
          'GET /api/error-test/service-unavailable - 503 Service Unavailable',
          'GET /api/error-test/unhandled - 500 Unhandled Error',
          'GET /api/error-test/phi-leak - 500 PHI Sanitization Test'
        ]
      }
    };
  });
}

export default errorTestRoutes;
