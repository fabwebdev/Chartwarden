/**
 * Secure Error Handler
 *
 * SECURITY: TICKET #005 - Prevent PHI/PII leakage in error messages
 * HIPAA: §164.514(b) - De-identification of PHI
 * OWASP: A04:2021 - Insecure Design
 *
 * This handler ensures:
 * - No PHI/PII in error responses
 * - No database details exposed to client
 * - No stack traces in production
 * - Unique error tracking IDs
 * - Server-side logging with PII redaction
 */

import crypto from 'crypto';
import { redactPII, redactPIIFromObject } from '../utils/piiRedactor.js';

import { logger } from '../utils/logger.js';
class Handler {
  constructor() {
    /**
     * A list of the exception types that are not reported.
     * @var {Array}
     */
    this.dontReport = [
      // Add error types that shouldn't be logged
    ];

    /**
     * A list of the inputs that are never flashed for validation exceptions.
     * @var {Array}
     */
    this.dontFlash = [
      'current_password',
      'password',
      'password_confirmation',
      'ssn',
      'social_security_number',
      'credit_card',
      'token',
      'api_key',
      'secret'
    ];

    /**
     * Generic error messages for different status codes
     */
    this.genericMessages = {
      400: 'Bad Request',
      401: 'Unauthorized',
      403: 'Forbidden',
      404: 'Resource Not Found',
      405: 'Method Not Allowed',
      409: 'Conflict',
      422: 'Validation Error',
      429: 'Too Many Requests',
      500: 'Internal Server Error',
      502: 'Bad Gateway',
      503: 'Service Unavailable',
      504: 'Gateway Timeout'
    };
  }

  /**
   * Generate a unique error tracking ID
   * @returns {string} Unique error ID
   */
  generateErrorId() {
    return `ERR-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  }

  /**
   * Check if error should be reported
   * @param {Error} error
   * @returns {boolean}
   */
  shouldReport(error) {
    return !this.dontReport.some(type => error instanceof type);
  }

  /**
   * Report or log an exception with PII redaction
   * @param {Error} error
   * @param {string} errorId
   * @param {Object} context
   */
  report(error, errorId, context = {}) {
    if (!this.shouldReport(error)) {
      return;
    }

    // Prepare error details for logging
    const errorDetails = {
      errorId,
      timestamp: new Date().toISOString(),
      name: error.name,
      message: error.message,
      code: error.code,
      status: error.status || error.statusCode || 500,
      ...context
    };

    // Add stack trace in non-production
    if (process.env.NODE_ENV !== 'production') {
      errorDetails.stack = error.stack;
    }

    // Redact PII from error details before logging
    const redactedDetails = redactPIIFromObject(errorDetails, {
      aggressive: true,
      keepIPAddresses: false
    });

    // Log to console (in production, this should go to a logging service)
    logger.error('🔴 Error Report:', JSON.stringify(redactedDetails, null, 2));

    // In production, send to logging service (Sentry, Loggly, etc.)
    if (process.env.NODE_ENV === 'production') {
      // TODO: Send to external logging service
      // Example: Sentry.captureException(error, { extra: redactedDetails });
    }
  }

  /**
   * Sanitize error message - remove database hints, SQL, and PHI
   * @param {string} message
   * @returns {string}
   */
  sanitizeMessage(message) {
    if (!message) return 'An error occurred';

    // Redact PII first
    let sanitized = redactPII(message, { aggressive: true });

    // Remove database-specific error patterns
    const dangerousPatterns = [
      /relation ".*" does not exist/gi,
      /column ".*" does not exist/gi,
      /duplicate key value violates unique constraint/gi,
      /null value in column ".*" violates not-null constraint/gi,
      /foreign key constraint/gi,
      /syntax error at or near/gi,
      /invalid input syntax for type/gi,
      /ERROR:.*DETAIL:/gi,
      /ERROR:.*HINT:/gi,
      /at .* line \d+/gi,
      /in \/.*\.js:\d+/gi
    ];

    for (const pattern of dangerousPatterns) {
      if (pattern.test(sanitized)) {
        return 'A database error occurred. Please contact support.';
      }
    }

    // Truncate very long messages
    if (sanitized.length > 200) {
      sanitized = sanitized.substring(0, 200) + '...';
    }

    return sanitized;
  }

  /**
   * Determine if this is a validation error
   * @param {Error} error
   * @returns {boolean}
   */
  isValidationError(error) {
    return (
      error.statusCode === 422 ||
      error.status === 422 ||
      error.name === 'ValidationError' ||
      error.validation !== undefined ||
      Array.isArray(error.errors)
    );
  }

  /**
   * Sanitize validation errors - keep field names, remove values
   * @param {Array} errors
   * @returns {Array}
   */
  sanitizeValidationErrors(errors) {
    if (!Array.isArray(errors)) {
      return [];
    }

    return errors.map(error => {
      // Keep only safe fields
      const sanitized = {
        type: error.type || 'field',
        msg: this.sanitizeMessage(error.msg || error.message),
        path: error.path || error.field,
        location: error.location || 'body'
      };

      // Remove the actual invalid value (could contain PHI)
      // Never include: error.value, error.actual, error.received

      return sanitized;
    });
  }

  /**
   * Build production-safe error response
   * @param {Error} error
   * @param {string} errorId
   * @returns {Object}
   */
  buildProductionResponse(error, errorId) {
    const status = error.status || error.statusCode || 500;

    // Base response with generic message
    const response = {
      status,
      error: this.genericMessages[status] || 'Error',
      message: this.genericMessages[status] || 'An error occurred',
      errorId // Include error ID so user can reference it when contacting support
    };

    // For validation errors, include sanitized field-level errors
    if (this.isValidationError(error)) {
      response.error = 'Validation Error';
      response.message = 'The request contains invalid data';

      if (error.errors || error.validation) {
        response.errors = this.sanitizeValidationErrors(
          error.errors || error.validation
        );
      }
    }

    // For 404s, we can be a bit more specific
    if (status === 404) {
      response.message = 'The requested resource was not found';
    }

    // For 401/403, generic auth messages
    if (status === 401) {
      response.message = 'Authentication required';
    }

    if (status === 403) {
      response.message = 'You do not have permission to access this resource';
    }

    return response;
  }

  /**
   * Build development error response (includes more details)
   * @param {Error} error
   * @param {string} errorId
   * @returns {Object}
   */
  buildDevelopmentResponse(error, errorId) {
    const status = error.status || error.statusCode || 500;

    const response = {
      status,
      error: error.name || 'Error',
      message: this.sanitizeMessage(error.message),
      errorId
    };

    // Include validation errors
    if (this.isValidationError(error) && (error.errors || error.validation)) {
      response.errors = this.sanitizeValidationErrors(
        error.errors || error.validation
      );
    }

    // Include stack trace in development only
    if (process.env.NODE_ENV === 'development') {
      response.stack = error.stack;

      // Include additional error details (but redact PII)
      if (error.code) response.code = error.code;

      // Sanitize database hints
      if (error.detail) {
        response.detail = redactPII(error.detail, { aggressive: true });
      }

      if (error.hint) {
        response.hint = redactPII(error.hint, { aggressive: true });
      }
    }

    return response;
  }

  /**
   * Render an exception into an HTTP response
   * @param {Object} request
   * @param {Object} reply
   * @param {Error} error
   */
  render(request, reply, error) {
    const errorId = this.generateErrorId();
    const status = error.status || error.statusCode || 500;

    // Build context for logging
    const context = {
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.headers['user-agent'],
      userId: request.user?.id
    };

    // Report error with PII redaction
    this.report(error, errorId, context);

    // Build response based on environment
    let response;
    if (process.env.NODE_ENV === 'production') {
      response = this.buildProductionResponse(error, errorId);
    } else {
      response = this.buildDevelopmentResponse(error, errorId);
    }

    // Send response
    return reply.code(status).send(response);
  }

  /**
   * Register the exception handling callbacks for the application.
   * @param {Function} callback
   */
  reportable(callback) {
    this.reportCallback = callback;
  }

  /**
   * Render an exception for console command errors.
   * @param {Error} error
   */
  renderForConsole(error) {
    const errorId = this.generateErrorId();
    const message = redactPII(error.message, { aggressive: true });

    logger.error(`[${errorId}] Console command error:`, message)

    if (process.env.NODE_ENV === 'development') {
      logger.error(error.stack)
    }
  }
}

export default new Handler();
