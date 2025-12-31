/**
 * Centralized Error Handling
 * TICKET #016: Error Handler Utility
 *
 * Eliminates duplicate try-catch blocks across 578 locations
 * Provides consistent error responses and logging
 *
 * HIPAA Compliance:
 * - All error messages are sanitized to prevent PHI/PII leakage
 * - Error codes provide machine-readable error types
 * - Tracking IDs enable error correlation without exposing internals
 */

import crypto from 'crypto';
import { sanitize } from './logger.js';
import {
  ErrorCodes,
  ErrorMessages,
  ErrorStatusCodes,
  getErrorMessage,
  getStatusCode
} from '../constants/errorCodes.js';

/**
 * Base Application Error
 * All custom errors extend this class
 */
export class AppError extends Error {
  /**
   * @param {string} message - Human-readable error message
   * @param {number} statusCode - HTTP status code
   * @param {Object} options - Additional options
   * @param {string} options.code - Error code from ErrorCodes
   * @param {Object} options.details - Additional error details
   * @param {string} options.field - Field name for validation errors
   */
  constructor(message, statusCode = 500, options = {}) {
    // Support legacy (message, statusCode, details) signature
    const opts = typeof options === 'object' && !Array.isArray(options)
      ? options
      : { details: options };

    super(message);
    this.statusCode = statusCode;
    this.code = opts.code || ErrorCodes.SYSTEM_ERROR;
    this.details = opts.details || {};
    this.field = opts.field;
    this.name = this.constructor.name;
    this.isOperational = true; // Distinguishes from programming errors
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Create AppError from error code
   * @param {string} code - Error code from ErrorCodes
   * @param {Object} options - Additional options
   * @returns {AppError}
   */
  static fromCode(code, options = {}) {
    const message = options.message || getErrorMessage(code);
    const statusCode = getStatusCode(code);
    return new AppError(message, statusCode, { code, ...options });
  }
}

/**
 * Validation Error (422)
 * For invalid input data
 */
export class ValidationError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Options including details, field, errors array
   */
  constructor(message, options = {}) {
    const opts = typeof options === 'object' && !Array.isArray(options)
      ? options
      : { details: options };

    super(message, 422, {
      code: opts.code || ErrorCodes.VALIDATION_FAILED,
      details: opts.details,
      field: opts.field
    });

    // Support array of validation errors
    this.errors = opts.errors || [];
  }

  /**
   * Add a field validation error
   * @param {string} field - Field name
   * @param {string} message - Error message
   * @param {string} code - Optional error code
   */
  addFieldError(field, message, code = ErrorCodes.VALIDATION_FAILED) {
    this.errors.push({ field, message, code });
    return this;
  }

  /**
   * Create ValidationError for a required field
   * @param {string} field - Field name
   * @returns {ValidationError}
   */
  static requiredField(field) {
    return new ValidationError(`${field} is required`, {
      field,
      code: ErrorCodes.VALIDATION_REQUIRED_FIELD,
      errors: [{ field, message: 'This field is required', code: ErrorCodes.VALIDATION_REQUIRED_FIELD }]
    });
  }

  /**
   * Create ValidationError for invalid format
   * @param {string} field - Field name
   * @param {string} expectedFormat - Description of expected format
   * @returns {ValidationError}
   */
  static invalidFormat(field, expectedFormat) {
    return new ValidationError(`Invalid ${field} format`, {
      field,
      code: ErrorCodes.VALIDATION_INVALID_FORMAT,
      errors: [{ field, message: `Expected format: ${expectedFormat}`, code: ErrorCodes.VALIDATION_INVALID_FORMAT }]
    });
  }
}

/**
 * Not Found Error (404)
 * For resources that don't exist
 */
export class NotFoundError extends AppError {
  /**
   * @param {string} resource - Resource type (e.g., 'Patient', 'Medication')
   * @param {string} code - Optional specific error code
   */
  constructor(resource = 'Resource', code) {
    const errorCode = code || ErrorCodes.RESOURCE_NOT_FOUND;
    super(
      getErrorMessage(errorCode) || `${resource} not found`,
      404,
      { code: errorCode }
    );
    this.resource = resource;
  }

  static patient() {
    return new NotFoundError('Patient', ErrorCodes.RESOURCE_PATIENT_NOT_FOUND);
  }

  static user() {
    return new NotFoundError('User', ErrorCodes.RESOURCE_USER_NOT_FOUND);
  }

  static medication() {
    return new NotFoundError('Medication', ErrorCodes.RESOURCE_MEDICATION_NOT_FOUND);
  }

  static encounter() {
    return new NotFoundError('Encounter', ErrorCodes.RESOURCE_ENCOUNTER_NOT_FOUND);
  }

  static order() {
    return new NotFoundError('Order', ErrorCodes.RESOURCE_ORDER_NOT_FOUND);
  }

  static document() {
    return new NotFoundError('Document', ErrorCodes.RESOURCE_DOCUMENT_NOT_FOUND);
  }
}

/**
 * Unauthorized Error (401)
 * For authentication failures
 */
export class UnauthorizedError extends AppError {
  /**
   * @param {string} message - Optional custom message
   * @param {string} code - Error code from ErrorCodes
   */
  constructor(message, code = ErrorCodes.AUTH_REQUIRED) {
    super(
      message || getErrorMessage(code),
      401,
      { code }
    );
  }

  static sessionExpired() {
    return new UnauthorizedError(null, ErrorCodes.AUTH_SESSION_EXPIRED);
  }

  static invalidCredentials() {
    return new UnauthorizedError(null, ErrorCodes.AUTH_INVALID_CREDENTIALS);
  }

  static tokenExpired() {
    return new UnauthorizedError(null, ErrorCodes.AUTH_TOKEN_EXPIRED);
  }

  static accountLocked() {
    return new UnauthorizedError(null, ErrorCodes.AUTH_ACCOUNT_LOCKED);
  }

  static mfaRequired() {
    return new UnauthorizedError(null, ErrorCodes.AUTH_MFA_REQUIRED);
  }
}

/**
 * Forbidden Error (403)
 * For authorization failures
 */
export class ForbiddenError extends AppError {
  /**
   * @param {string} message - Optional custom message
   * @param {string} code - Error code from ErrorCodes
   */
  constructor(message, code = ErrorCodes.AUTHZ_FORBIDDEN) {
    super(
      message || getErrorMessage(code),
      403,
      { code }
    );
  }

  static insufficientPermissions() {
    return new ForbiddenError(null, ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS);
  }

  static patientAccessDenied() {
    return new ForbiddenError(null, ErrorCodes.AUTHZ_PATIENT_ACCESS_DENIED);
  }

  static facilityAccessDenied() {
    return new ForbiddenError(null, ErrorCodes.AUTHZ_FACILITY_ACCESS_DENIED);
  }

  static phiAccessDenied() {
    return new ForbiddenError(null, ErrorCodes.HIPAA_PHI_ACCESS_DENIED);
  }
}

/**
 * Bad Request Error (400)
 * For malformed requests
 */
export class BadRequestError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code from ErrorCodes
   */
  constructor(message, code = ErrorCodes.BAD_REQUEST) {
    super(
      message || getErrorMessage(code),
      400,
      { code }
    );
  }

  static malformedJson() {
    return new BadRequestError(null, ErrorCodes.BAD_REQUEST_MALFORMED_JSON);
  }

  static missingParameter(param) {
    return new BadRequestError(
      `Missing required parameter: ${param}`,
      ErrorCodes.BAD_REQUEST_MISSING_PARAMETER
    );
  }

  static invalidParameter(param) {
    return new BadRequestError(
      `Invalid parameter: ${param}`,
      ErrorCodes.BAD_REQUEST_INVALID_PARAMETER
    );
  }
}

/**
 * Conflict Error (409)
 * For resource conflicts (e.g., duplicate entries)
 */
export class ConflictError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {string} code - Error code from ErrorCodes
   */
  constructor(message, code = ErrorCodes.RESOURCE_CONFLICT) {
    super(
      message || getErrorMessage(code),
      409,
      { code }
    );
  }

  static alreadyExists(resource) {
    return new ConflictError(
      `${resource} already exists`,
      ErrorCodes.RESOURCE_ALREADY_EXISTS
    );
  }

  static duplicateEntry() {
    return new ConflictError(null, ErrorCodes.DATABASE_UNIQUE_VIOLATION);
  }
}

/**
 * Database Error (500)
 * For database operation failures
 * HIPAA: Never expose database details to clients
 */
export class DatabaseError extends AppError {
  /**
   * @param {string} message - Internal error message (not sent to client)
   * @param {Object} options - Options including internal details
   */
  constructor(message = 'Database operation failed', options = {}) {
    const opts = typeof options === 'object' && !Array.isArray(options)
      ? options
      : { details: options };

    super(
      getErrorMessage(ErrorCodes.DATABASE_ERROR), // Always use safe message
      500,
      { code: opts.code || ErrorCodes.DATABASE_ERROR, details: opts.details }
    );
    // Store internal message for logging (never sent to client)
    this.internalMessage = message;
  }

  static connectionFailed() {
    return new DatabaseError('Database connection failed', {
      code: ErrorCodes.DATABASE_CONNECTION_FAILED
    });
  }

  static queryFailed(internalMessage) {
    const err = new DatabaseError(internalMessage || 'Query failed', {
      code: ErrorCodes.DATABASE_QUERY_FAILED
    });
    return err;
  }

  static transactionFailed(internalMessage) {
    return new DatabaseError(internalMessage || 'Transaction failed', {
      code: ErrorCodes.DATABASE_TRANSACTION_FAILED
    });
  }
}

/**
 * Rate Limit Error (429)
 * For rate limiting
 */
export class RateLimitError extends AppError {
  /**
   * @param {string} message - Error message
   * @param {Object} options - Options including retryAfter
   */
  constructor(message, options = {}) {
    super(
      message || getErrorMessage(ErrorCodes.RATE_LIMIT_EXCEEDED),
      429,
      { code: options.code || ErrorCodes.RATE_LIMIT_EXCEEDED }
    );
    this.retryAfter = options.retryAfter;
  }

  static loginAttempts(retryAfter) {
    return new RateLimitError(null, {
      code: ErrorCodes.RATE_LIMIT_LOGIN_ATTEMPTS,
      retryAfter
    });
  }
}

/**
 * Service Unavailable Error (503)
 * For service outages
 */
export class ServiceUnavailableError extends AppError {
  constructor(message, code = ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE) {
    super(
      message || getErrorMessage(code),
      503,
      { code }
    );
  }

  static maintenance() {
    return new ServiceUnavailableError(null, ErrorCodes.SYSTEM_MAINTENANCE);
  }
}

/**
 * Handle controller errors with consistent format and logging
 * HIPAA-compliant error handling that:
 * - Never exposes PHI/PII in error responses
 * - Includes error codes for machine-readable error types
 * - Generates tracking IDs for error correlation
 * - Logs full context server-side only
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

  // Determine status code and error code
  const statusCode = error.statusCode || 500;
  const errorCode = error.code || (isOperational ? null : ErrorCodes.SYSTEM_INTERNAL_ERROR);

  // Log error with full context (PHI-safe via sanitize)
  const logLevel = statusCode >= 500 ? 'error' : 'warn';
  request.log[logLevel]({
    err: error,
    trackingId,
    errorCode,
    context,
    isOperational,
    userId: request.user?.id,
    path: request.url,
    method: request.method,
    statusCode,
    // Sanitize any potential PHI in error details
    details: error.details ? sanitize(error.details) : undefined,
    // Include internal message for database errors (not sent to client)
    internalMessage: error.internalMessage ? sanitize({ msg: error.internalMessage }).msg : undefined
  }, `${isOperational ? 'Operational' : 'Programming'} error in ${context}: ${error.message}`);

  // Build HIPAA-compliant response object
  const response = {
    success: false,
    status: statusCode,
    error: getErrorName(statusCode),
    // In production, hide internal errors; use generic message for 500s
    message: isProduction && statusCode === 500 && !isOperational
      ? getErrorMessage(ErrorCodes.SYSTEM_INTERNAL_ERROR)
      : error.message || getErrorMessage(ErrorCodes.SYSTEM_ERROR),
    trackingId
  };

  // Add error code for machine-readable error type
  if (errorCode) {
    response.code = errorCode;
  }

  // Add validation errors for ValidationError instances
  if (error instanceof ValidationError) {
    if (error.errors && error.errors.length > 0) {
      // Sanitize validation errors - remove values, keep field names and messages
      response.errors = error.errors.map(e => ({
        field: e.field,
        message: e.message,
        code: e.code
      }));
    } else if (error.details && Object.keys(error.details).length > 0) {
      // Legacy support for details object
      response.errors = error.details;
    }
  }

  // Add Rate Limit specific headers
  if (error instanceof RateLimitError && error.retryAfter) {
    reply.header('Retry-After', error.retryAfter);
    response.retryAfter = error.retryAfter;
  }

  // Add stack trace and development info ONLY in development
  if (isDevelopment) {
    if (error.stack) {
      response.stack = error.stack.split('\n');
    }
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
  DatabaseError,
  RateLimitError,
  ServiceUnavailableError
};

// Re-export error codes for convenience
export { ErrorCodes, ErrorMessages, getErrorMessage, getStatusCode } from '../constants/errorCodes.js';

// Export default for convenience
export default {
  asyncHandler,
  asyncHandlerWithContext,
  handleControllerError,
  validate,
  assert,
  dbTry,
  wrapDatabaseError,
  ErrorCodes,
  ...Errors
};
