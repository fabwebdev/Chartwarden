/**
 * Centralized Error Handling
 * TICKET #016: Error Handler Utility
 *
 * Eliminates duplicate try-catch blocks across 578 locations
 * Provides consistent error responses and logging
 */

import crypto from 'crypto';
import { sanitize } from './logger.js';

/**
 * Base Application Error
 * All custom errors extend this class
 */
export class AppError extends Error {
  constructor(message, statusCode = 500, details = {}) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.name = this.constructor.name;
    this.isOperational = true; // Distinguishes from programming errors
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation Error (422)
 * For invalid input data
 */
export class ValidationError extends AppError {
  constructor(message, details = {}) {
    super(message, 422, details);
  }
}

/**
 * Not Found Error (404)
 * For resources that don't exist
 */
export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(`${resource} not found`, 404);
  }
}

/**
 * Unauthorized Error (401)
 * For authentication failures
 */
export class UnauthorizedError extends AppError {
  constructor(message = 'Unauthorized - Authentication required') {
    super(message, 401);
  }
}

/**
 * Forbidden Error (403)
 * For authorization failures
 */
export class ForbiddenError extends AppError {
  constructor(message = 'Access denied - Insufficient permissions') {
    super(message, 403);
  }
}

/**
 * Bad Request Error (400)
 * For malformed requests
 */
export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(message, 400);
  }
}

/**
 * Conflict Error (409)
 * For resource conflicts (e.g., duplicate entries)
 */
export class ConflictError extends AppError {
  constructor(message = 'Resource conflict') {
    super(message, 409);
  }
}

/**
 * Database Error (500)
 * For database operation failures
 */
export class DatabaseError extends AppError {
  constructor(message = 'Database operation failed', details = {}) {
    super(message, 500, details);
  }
}

/**
 * Handle controller errors with consistent format and logging
 *
 * @param {Error} error - The error object
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 * @param {string} context - Context/function name where error occurred
 * @returns {Object} Fastify reply
 */
export const handleControllerError = (error, request, reply, context = 'Unknown') => {
  const isDevelopment = process.env.NODE_ENV === 'development';
  const isProduction = process.env.NODE_ENV === 'production';

  // Generate unique tracking ID for error correlation
  const trackingId = crypto.randomUUID();

  // Determine if this is an operational error (expected) or programming error (bug)
  const isOperational = error.isOperational || error instanceof AppError;

  // Determine status code
  const statusCode = error.statusCode || 500;

  // Log error with full context (PHI-safe)
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  request.log[logLevel]({
    err: error,
    trackingId,
    context,
    isOperational,
    userId: request.user?.id,
    path: request.url,
    method: request.method,
    statusCode,
    // Sanitize any potential PHI in error details
    details: error.details ? sanitize(error.details) : undefined
  }, `${isOperational ? 'Operational' : 'Programming'} error in ${context}: ${error.message}`);

  // Build response object
  const response = {
    status: statusCode,
    error: getErrorName(statusCode),
    message: isProduction && statusCode === 500 && !isOperational
      ? 'An unexpected error occurred'  // Hide internal errors in production
      : error.message || 'An error occurred',
    trackingId
  };

  // Add validation errors details
  if (error instanceof ValidationError && error.details) {
    response.errors = error.details;
  }

  // Add stack trace in development only
  if (isDevelopment && error.stack) {
    response.stack = error.stack.split('\n');
  }

  // Add helpful hints in development
  if (isDevelopment) {
    response.context = context;
    response.errorType = error.constructor.name;
  }

  return reply.code(statusCode).send(response);
};

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
    422: 'Validation Error',
    500: 'Internal Server Error',
    503: 'Service Unavailable'
  };
  return errorNames[statusCode] || 'Error';
}

/**
 * Async Handler Wrapper
 * Automatically catches errors and passes to error handler
 * Eliminates need for try-catch in controllers
 *
 * @param {Function} fn - Async controller function
 * @param {string} context - Optional context name
 * @returns {Function} Wrapped function
 *
 * @example
 * export const getPatient = asyncHandler(async (request, reply) => {
 *   const patient = await db.select()...;
 *   if (!patient) throw new NotFoundError('Patient');
 *   return { status: 200, data: patient };
 * });
 */
export const asyncHandler = (fn, context) => {
  return async (request, reply) => {
    try {
      return await fn(request, reply);
    } catch (error) {
      // Use function name as context if not provided
      const errorContext = context || fn.name || 'Controller';
      return handleControllerError(error, request, reply, errorContext);
    }
  };
};

/**
 * Async Handler with explicit context
 * Useful when function name isn't descriptive
 *
 * @example
 * export const getPatient = asyncHandlerWithContext('getPatient', async (request, reply) => {
 *   // ...
 * });
 */
export const asyncHandlerWithContext = (context) => {
  return (fn) => asyncHandler(fn, context);
};

/**
 * Validation helper
 * Throws ValidationError if condition is false
 *
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message if validation fails
 * @param {Object} details - Optional validation details
 *
 * @example
 * validate(patient.age >= 0, 'Age must be non-negative', { field: 'age' });
 */
export function validate(condition, message, details = {}) {
  if (!condition) {
    throw new ValidationError(message, details);
  }
}

/**
 * Assert helper
 * Throws error if condition is false
 *
 * @param {boolean} condition - Condition to check
 * @param {string} message - Error message
 * @param {number} statusCode - HTTP status code (default: 500)
 */
export function assert(condition, message, statusCode = 500) {
  if (!condition) {
    throw new AppError(message, statusCode);
  }
}

/**
 * Database error wrapper
 * Converts database errors to AppError
 *
 * @param {Error} error - Database error
 * @returns {AppError} Wrapped error
 */
export function wrapDatabaseError(error) {
  // Check for common database errors
  if (error.code === '23505') {
    // Unique violation
    return new ConflictError('This record already exists');
  }

  if (error.code === '23503') {
    // Foreign key violation
    return new BadRequestError('Referenced record does not exist');
  }

  if (error.code === '23502') {
    // Not null violation
    return new ValidationError('Required field is missing');
  }

  // Generic database error
  return new DatabaseError('Database operation failed', {
    code: error.code,
    detail: error.detail
  });
}

/**
 * Try-Catch wrapper for database operations
 * Automatically converts database errors to AppError
 *
 * @param {Function} fn - Async database operation
 * @returns {Promise} Result of operation
 *
 * @example
 * const patient = await dbTry(() => db.select().from(patients).where(...));
 */
export async function dbTry(fn) {
  try {
    return await fn();
  } catch (error) {
    throw wrapDatabaseError(error);
  }
}

// Export all error classes as a namespace for convenience
export const Errors = {
  AppError,
  ValidationError,
  NotFoundError,
  UnauthorizedError,
  ForbiddenError,
  BadRequestError,
  ConflictError,
  DatabaseError
};

// Export default for convenience
export default {
  asyncHandler,
  asyncHandlerWithContext,
  handleControllerError,
  validate,
  assert,
  dbTry,
  wrapDatabaseError,
  ...Errors
};
