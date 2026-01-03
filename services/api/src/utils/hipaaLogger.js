/**
 * HIPAA-Compliant Logger Utility
 *
 * This logger automatically redacts PHI/PII from log messages before output.
 * Use this instead of console.log/console.error for any logging that might
 * contain patient data.
 *
 * HIPAA Reference: 45 CFR §164.312(b) - Audit Controls
 *
 * Usage:
 *   import { hipaaLogger } from '../utils/hipaaLogger.js';
 *
 *   // Instead of: console.log("Request body:", request.body);
 *   // Use: hipaaLogger.info("Request received", { context: "PatientController" });
 *
 *   // For debugging (development only):
 *   hipaaLogger.debug("Processing patient", { patientId: patient.id });
 */

import { logger } from './logger.js';
import { phiRedactionService } from '../services/PHIRedactionService.js';

/**
 * PHI field patterns that should trigger redaction
 */
const PHI_FIELD_PATTERNS = [
  'ssn',
  'social_security',
  'medicare',
  'medicaid',
  'date_of_birth',
  'dob',
  'phone',
  'email',
  'address',
  'first_name',
  'last_name',
  'name',
  'mrn',
  'medical_record',
  'member_id',
  'policy_number',
  'bank',
  'credit',
  'password',
  'token',
  'secret',
  'key',
];

/**
 * Safe fields that can be logged without redaction
 */
const SAFE_FIELDS = [
  'id',
  'action',
  'method',
  'path',
  'statusCode',
  'status',
  'error_code',
  'message',
  'timestamp',
  'duration',
  'count',
  'page',
  'limit',
  'offset',
];

/**
 * Checks if a field name suggests it contains PHI
 * @param {string} fieldName - The field name to check
 * @returns {boolean}
 */
function isPHIField(fieldName) {
  if (!fieldName) return false;
  const lowerField = fieldName.toLowerCase();
  return PHI_FIELD_PATTERNS.some(pattern => lowerField.includes(pattern));
}

/**
 * Checks if a field is safe to log
 * @param {string} fieldName - The field name to check
 * @returns {boolean}
 */
function isSafeField(fieldName) {
  if (!fieldName) return false;
  const lowerField = fieldName.toLowerCase();
  return SAFE_FIELDS.includes(lowerField);
}

/**
 * Deeply redacts PHI from an object, keeping only safe metadata
 * @param {*} data - Data to redact
 * @param {number} depth - Current recursion depth (to prevent infinite loops)
 * @returns {*} Redacted data
 */
function deepRedactPHI(data, depth = 0) {
  if (depth > 10) return '[MAX_DEPTH_REACHED]';

  if (data === null || data === undefined) {
    return data;
  }

  if (typeof data === 'string') {
    // Redact common PHI patterns in strings
    return phiRedactionService.redactPatterns(data);
  }

  if (typeof data === 'number' || typeof data === 'boolean') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => deepRedactPHI(item, depth + 1));
  }

  if (typeof data === 'object') {
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      if (isPHIField(key)) {
        // Redact PHI fields completely
        result[key] = '[REDACTED]';
      } else if (isSafeField(key)) {
        // Safe fields can pass through
        result[key] = value;
      } else if (typeof value === 'object') {
        // Recursively process nested objects
        result[key] = deepRedactPHI(value, depth + 1);
      } else {
        // For other fields, use the PHI redaction service
        result[key] = phiRedactionService.safeRedact(value);
      }
    }
    return result;
  }

  return '[UNKNOWN_TYPE]';
}

/**
 * Creates a safe log message by redacting PHI
 * @param {string} message - Log message
 * @param {object} data - Additional data to log
 * @returns {object} Safe log entry
 */
function createSafeLogEntry(message, data = {}) {
  return {
    message: phiRedactionService.redactStringPatterns(message),
    data: deepRedactPHI(data),
    timestamp: new Date().toISOString(),
  };
}

/**
 * HIPAA-Compliant Logger
 *
 * All methods automatically redact PHI before logging.
 * Use this instead of console.log for any patient-related logging.
 */
export const hipaaLogger = {
  /**
   * Log informational message (production safe)
   * @param {string} message - Log message
   * @param {object} data - Additional safe metadata (will be redacted if PHI detected)
   */
  info(message, data = {}) {
    const safe = createSafeLogEntry(message, data);
    logger.info(safe.message, safe.data);
  },

  /**
   * Log warning message (production safe)
   * @param {string} message - Log message
   * @param {object} data - Additional safe metadata (will be redacted if PHI detected)
   */
  warn(message, data = {}) {
    const safe = createSafeLogEntry(message, data);
    logger.warn(safe.message, safe.data);
  },

  /**
   * Log error message (production safe)
   * @param {string} message - Log message
   * @param {object} data - Additional safe metadata (will be redacted if PHI detected)
   */
  error(message, data = {}) {
    const safe = createSafeLogEntry(message, data);
    // For errors, also include safe error details
    if (data.error instanceof Error) {
      safe.data.errorMessage = data.error.message;
      safe.data.errorCode = data.error.code;
      // Explicitly exclude stack trace in production
      if (process.env.NODE_ENV === 'development') {
        safe.data.stack = data.error.stack;
      }
    }
    logger.error(safe.message, safe.data);
  },

  /**
   * Log debug message (development only - disabled in production)
   * @param {string} message - Log message
   * @param {object} data - Additional safe metadata (will be redacted if PHI detected)
   */
  debug(message, data = {}) {
    if (process.env.NODE_ENV === 'production') {
      return; // Never log debug in production
    }
    const safe = createSafeLogEntry(message, data);
    logger.debug?.(safe.message, safe.data) || logger.info(safe.message, safe.data);
  },

  /**
   * Log API request (safe for production)
   * Logs request metadata without body content
   * @param {object} request - Fastify request object
   * @param {string} context - Controller/route context
   */
  request(request, context = 'API') {
    this.info(`${context} request`, {
      method: request.method,
      path: request.url?.split('?')[0], // Remove query params
      userId: request.user?.id,
      ip: request.ip,
      // Explicitly do NOT log: body, headers, query params
    });
  },

  /**
   * Log API response (safe for production)
   * @param {string} context - Controller/route context
   * @param {number} statusCode - Response status code
   * @param {number} duration - Request duration in ms
   */
  response(context, statusCode, duration = null) {
    this.info(`${context} response`, {
      statusCode,
      duration: duration ? `${duration}ms` : undefined,
    });
  },

  /**
   * Log database operation (safe for production)
   * @param {string} operation - Operation type (create, read, update, delete)
   * @param {string} table - Table name
   * @param {string|number} recordId - Record ID (safe to log)
   */
  dbOperation(operation, table, recordId = null) {
    this.info(`Database ${operation}`, {
      table,
      recordId,
    });
  },

  /**
   * Log security event (always logged, safe for production)
   * @param {string} event - Security event type
   * @param {object} details - Safe event details
   */
  security(event, details = {}) {
    const safe = createSafeLogEntry(`SECURITY: ${event}`, details);
    logger.warn(safe.message, safe.data);
  },
};

export default hipaaLogger;
