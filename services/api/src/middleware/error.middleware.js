/**
 * Global Error Handling Middleware
 * TICKET #005: Secure error handling with PHI protection
 * TICKET #016: Centralized error handling integration
 *
 * HIPAA Compliance:
 * - All error messages are sanitized to prevent PHI/PII leakage
 * - Database errors return generic messages
 * - Stack traces only in development
 * - Unique tracking IDs for error correlation
 */

import crypto from 'crypto';
import Handler from "../exceptions/Handler.js";
import {
  AppError,
  ValidationError,
  DatabaseError,
  RateLimitError,
  ErrorCodes,
  getErrorMessage
} from "../utils/errorHandler.js";
import { sanitize } from "../utils/logger.js";

/**
 * Map Fastify validation errors to our ValidationError
 * @param {Error} error - Fastify validation error
 * @returns {ValidationError}
 */
function mapFastifyValidationError(error) {
  const errors = [];

  if (error.validation && Array.isArray(error.validation)) {
    for (const v of error.validation) {
      errors.push({
        field: v.instancePath?.replace('/', '') || v.params?.missingProperty || 'unknown',
        message: v.message || 'Invalid value',
        code: ErrorCodes.VALIDATION_FAILED
      });
    }
  }

  return new ValidationError('The request contains invalid data', { errors });
}

/**
 * Map database errors to our DatabaseError with appropriate codes
 * @param {Error} error - Database error
 * @returns {AppError}
 */
function mapDatabaseError(error) {
  // PostgreSQL error codes
  const pgErrorMap = {
    '23505': { code: ErrorCodes.DATABASE_UNIQUE_VIOLATION, status: 409 },  // Unique violation
    '23503': { code: ErrorCodes.DATABASE_FOREIGN_KEY_VIOLATION, status: 400 },  // Foreign key violation
    '23502': { code: ErrorCodes.VALIDATION_REQUIRED_FIELD, status: 422 },  // Not null violation
    '22P02': { code: ErrorCodes.VALIDATION_INVALID_FORMAT, status: 422 },  // Invalid text representation
    '22003': { code: ErrorCodes.VALIDATION_OUT_OF_RANGE, status: 422 },    // Numeric value out of range
    '42P01': { code: ErrorCodes.DATABASE_ERROR, status: 500 },             // Undefined table
    '42703': { code: ErrorCodes.DATABASE_ERROR, status: 500 },             // Undefined column
    '08006': { code: ErrorCodes.DATABASE_CONNECTION_FAILED, status: 503 }, // Connection failure
    '57P01': { code: ErrorCodes.SYSTEM_MAINTENANCE, status: 503 },         // Admin shutdown
  };

  const mapping = pgErrorMap[error.code];
  if (mapping) {
    const dbError = new DatabaseError(error.message, { code: mapping.code });
    dbError.statusCode = mapping.status;
    return dbError;
  }

  return new DatabaseError(error.message);
}

/**
 * Determine if error is a database error
 * @param {Error} error
 * @returns {boolean}
 */
function isDatabaseError(error) {
  // PostgreSQL errors have a 5-character code
  return error.code && typeof error.code === 'string' && /^[0-9A-Z]{5}$/.test(error.code);
}

/**
 * Determine if error is a Fastify validation error
 * @param {Error} error
 * @returns {boolean}
 */
function isFastifyValidationError(error) {
  return error.validation !== undefined || error.validationContext !== undefined;
}

/**
 * Global error handling middleware for Fastify
 * Works with both old-style errors and new AppError classes
 *
 * @param {Error} error
 * @param {Object} request
 * @param {Object} reply
 */
const errorHandler = (error, request, reply) => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // Generate tracking ID for error correlation
  const trackingId = `ERR-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  // Transform known error types
  let processedError = error;

  // Handle Fastify validation errors
  if (isFastifyValidationError(error)) {
    processedError = mapFastifyValidationError(error);
  }
  // Handle database errors
  else if (isDatabaseError(error)) {
    processedError = mapDatabaseError(error);
  }
  // Ensure AppError instances have proper status
  else if (error instanceof AppError) {
    error.statusCode = error.statusCode || 500;
    error.status = error.statusCode;
    processedError = error;
  }

  // Determine status code
  const statusCode = processedError.statusCode || processedError.status || 500;
  const errorCode = processedError.code || (statusCode >= 500 ? ErrorCodes.SYSTEM_INTERNAL_ERROR : null);
  const isOperational = processedError.isOperational || processedError instanceof AppError;

  // Log error with full context (PHI-safe)
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  const logData = {
    trackingId,
    errorCode,
    statusCode,
    isOperational,
    userId: request.user?.id,
    path: request.url,
    method: request.method,
    // Sanitize details to prevent PHI leakage
    details: processedError.details ? sanitize(processedError.details) : undefined,
    internalMessage: processedError.internalMessage ? sanitize({ m: processedError.internalMessage }).m : undefined
  };

  // Only include error object in logs for 500 errors or development
  if (statusCode >= 500 || isDevelopment) {
    logData.err = error;
  }

  request.log[logLevel](logData, `[${trackingId}] ${isOperational ? 'Operational' : 'Programming'} error: ${error.message}`);

  // Build HIPAA-compliant response
  const response = {
    success: false,
    status: statusCode,
    error: getErrorName(statusCode),
    message: getClientSafeMessage(processedError, statusCode, isOperational, isProduction),
    trackingId
  };

  // Add error code for machine-readable error handling
  if (errorCode) {
    response.code = errorCode;
  }

  // Add validation errors (sanitized)
  if (processedError instanceof ValidationError && processedError.errors?.length > 0) {
    response.errors = processedError.errors.map(e => ({
      field: e.field,
      message: e.message,
      code: e.code
    }));
  }

  // Add rate limit headers
  if (processedError instanceof RateLimitError && processedError.retryAfter) {
    reply.header('Retry-After', processedError.retryAfter);
    response.retryAfter = processedError.retryAfter;
  }

  // Development-only information
  if (isDevelopment) {
    response.errorType = processedError.constructor.name;
    if (error.stack) {
      response.stack = error.stack.split('\n').slice(0, 10);
    }
    // Include original error message for debugging
    if (processedError !== error) {
      response.originalError = error.message;
    }
  }

  return reply.code(statusCode).send(response);
};

/**
 * Get client-safe error message based on environment and error type
 * HIPAA: Never expose internal system details
 */
function getClientSafeMessage(error, statusCode, isOperational, isProduction) {
  // For database errors, always use generic message
  if (error instanceof DatabaseError) {
    return getErrorMessage(error.code || ErrorCodes.DATABASE_ERROR);
  }

  // In production, hide internal errors
  if (isProduction && statusCode >= 500 && !isOperational) {
    return getErrorMessage(ErrorCodes.SYSTEM_INTERNAL_ERROR);
  }

  // For operational errors, use their message
  if (isOperational && error.message) {
    return error.message;
  }

  // Default to generic message
  return getErrorMessage(ErrorCodes.SYSTEM_ERROR);
}

/**
 * Get human-readable error name from status code
 */
function getErrorName(statusCode) {
  const errorNames = {
    400: 'Bad Request',
    401: 'Unauthorized',
    403: 'Forbidden',
    404: 'Not Found',
    409: 'Conflict',
    410: 'Gone',
    415: 'Unsupported Media Type',
    422: 'Validation Error',
    423: 'Locked',
    429: 'Too Many Requests',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
    504: 'Gateway Timeout'
  };
  return errorNames[statusCode] || 'Error';
}

/**
 * Not Found handler for undefined routes
 * @param {Object} request
 * @param {Object} reply
 */
export const notFoundHandler = (request, reply) => {
  const trackingId = `ERR-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

  request.log.warn({
    trackingId,
    path: request.url,
    method: request.method,
    userId: request.user?.id
  }, `[${trackingId}] Route not found: ${request.method} ${request.url}`);

  return reply.code(404).send({
    success: false,
    status: 404,
    error: 'Not Found',
    message: 'The requested resource was not found',
    code: ErrorCodes.RESOURCE_NOT_FOUND,
    trackingId
  });
};

export default errorHandler;
