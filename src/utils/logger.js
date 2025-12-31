/**
 * Logger Utilities
 * TICKET #015: Pino Logger Utilities with PHI Protection
 *
 * Provides safe logging functions that automatically sanitize PHI/PII
 */

import pino from 'pino';
import { loggerConfig } from '../config/logging.config.js';

/**
 * Base logger instance for non-request contexts
 * Use this in services, jobs, and other non-HTTP contexts
 */
export const logger = pino(loggerConfig);

/**
 * PHI/PII Fields that should never be logged
 * Comprehensive list based on HIPAA Safe Harbor method
 */
const PHI_PII_FIELDS = [
  // Identifiers
  'ssn', 'socialSecurityNumber', 'social_security_number',
  'mrn', 'medicalRecordNumber', 'medical_record_number',
  'patient_id', 'patientId',

  // Names
  'firstName', 'first_name', 'lastName', 'last_name',
  'middleName', 'middle_name', 'fullName', 'full_name',
  'name', 'patient_name', 'patientName',

  // Dates
  'dateOfBirth', 'date_of_birth', 'dob', 'birthDate', 'birth_date',
  'deathDate', 'death_date', 'date_of_death', 'admissionDate', 'dischargeDate',

  // Contact
  'email', 'emailAddress', 'email_address',
  'phone', 'phoneNumber', 'phone_number',
  'mobile', 'mobileNumber', 'fax', 'faxNumber',

  // Address
  'address', 'street', 'streetAddress', 'street_address',
  'address1', 'address2', 'city', 'state',
  'zipcode', 'zip_code', 'postalCode', 'postal_code', 'country',

  // Medical/Financial
  'diagnosis', 'diagnoses', 'condition', 'conditions',
  'medication', 'medications', 'treatment', 'treatments',
  'procedure', 'procedures', 'creditCard', 'credit_card',
  'accountNumber', 'account_number',

  // Security
  'password', 'token', 'access_token', 'refresh_token',
  'api_key', 'apiKey', 'secret'
];

/**
 * Recursively sanitize an object by removing/redacting PHI/PII fields
 * @param {*} data - Data to sanitize
 * @param {number} depth - Current recursion depth (prevent infinite loops)
 * @returns {*} Sanitized data
 */
export function sanitize(data, depth = 0) {
  // Prevent infinite recursion
  if (depth > 10) {
    return '[MAX_DEPTH_EXCEEDED]';
  }

  // Handle null/undefined
  if (data === null || data === undefined) {
    return data;
  }

  // Handle primitives
  if (typeof data !== 'object') {
    return data;
  }

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map(item => sanitize(item, depth + 1));
  }

  // Handle objects
  const sanitized = {};

  for (const [key, value] of Object.entries(data)) {
    // Check if field name matches PHI/PII pattern
    const keyLower = key.toLowerCase();
    const isPHI = PHI_PII_FIELDS.some(field =>
      keyLower === field.toLowerCase() ||
      keyLower.includes(field.toLowerCase())
    );

    if (isPHI) {
      // Redact PHI fields
      sanitized[key] = '[REDACTED]';
    } else if (typeof value === 'object' && value !== null) {
      // Recursively sanitize nested objects
      sanitized[key] = sanitize(value, depth + 1);
    } else {
      // Keep safe fields
      sanitized[key] = value;
    }
  }

  return sanitized;
}

/**
 * Safe logging functions with automatic PHI sanitization
 * Use these instead of console.log throughout the application
 */

/**
 * Log debug message with optional sanitized data
 * @param {string} message - Log message
 * @param {Object} data - Optional data object (will be sanitized)
 */
export function debug(message, data = null) {
  if (data) {
    logger.debug({ data: sanitize(data) }, message);
  } else {
    logger.debug(message);
  }
}

/**
 * Log info message with optional sanitized data
 * @param {string} message - Log message
 * @param {Object} data - Optional data object (will be sanitized)
 */
export function info(message, data = null) {
  if (data) {
    logger.info({ data: sanitize(data) }, message);
  } else {
    logger.info(message);
  }
}

/**
 * Log warning message with optional sanitized data
 * @param {string} message - Log message
 * @param {Object} data - Optional data object (will be sanitized)
 */
export function warn(message, data = null) {
  if (data) {
    logger.warn({ data: sanitize(data) }, message);
  } else {
    logger.warn(message);
  }
}

/**
 * Log error message with optional sanitized data
 * @param {string} message - Log message
 * @param {Error|Object} error - Error object or data (will be sanitized)
 */
export function error(message, errorObj = null) {
  if (errorObj instanceof Error) {
    logger.error({ err: errorObj }, message);
  } else if (errorObj) {
    logger.error({ data: sanitize(errorObj) }, message);
  } else {
    logger.error(message);
  }
}

/**
 * Log fatal error message (application should exit after this)
 * @param {string} message - Log message
 * @param {Error|Object} error - Error object or data (will be sanitized)
 */
export function fatal(message, errorObj = null) {
  if (errorObj instanceof Error) {
    logger.fatal({ err: errorObj }, message);
  } else if (errorObj) {
    logger.fatal({ data: sanitize(errorObj) }, message);
  } else {
    logger.fatal(message);
  }
}

/**
 * Create a child logger with additional context
 * Useful for adding request ID, user ID, etc.
 * @param {Object} bindings - Context to bind to all logs
 * @returns {Object} Child logger instance
 */
export function createChildLogger(bindings = {}) {
  // Sanitize bindings to prevent PHI leakage
  const sanitizedBindings = sanitize(bindings);
  return logger.child(sanitizedBindings);
}

/**
 * Log with specific log level
 * @param {string} level - Log level (debug, info, warn, error, fatal)
 * @param {string} message - Log message
 * @param {Object} data - Optional data object (will be sanitized)
 */
export function log(level, message, data = null) {
  const validLevels = ['debug', 'info', 'warn', 'error', 'fatal'];

  if (!validLevels.includes(level)) {
    level = 'info';
  }

  if (data) {
    logger[level]({ data: sanitize(data) }, message);
  } else {
    logger[level](message);
  }
}

/**
 * Log audit event (for HIPAA compliance tracking)
 * @param {string} action - Action performed (e.g., 'patient.view', 'patient.update')
 * @param {Object} context - Context data (userId, patientId, etc. - will be partially sanitized)
 */
export function audit(action, context = {}) {
  // For audit logs, we keep IDs but sanitize PHI
  const auditContext = {
    action,
    userId: context.userId || context.user_id,
    patientId: context.patientId || context.patient_id,
    resourceId: context.resourceId || context.resource_id,
    ip: context.ip,
    userAgent: context.userAgent,
    timestamp: new Date().toISOString(),
    // Sanitize the rest
    ...sanitize(context)
  };

  logger.info({ audit: auditContext }, `AUDIT: ${action}`);
}

/**
 * Log database query (without sensitive data)
 * @param {string} query - SQL query or operation name
 * @param {number} duration - Query duration in ms
 * @param {Object} meta - Additional metadata (will be sanitized)
 */
export function logQuery(query, duration, meta = {}) {
  logger.debug({
    query,
    duration,
    ...sanitize(meta)
  }, 'Database query executed');
}

/**
 * Log HTTP request (safe for PHI environments)
 * @param {Object} request - Fastify request object
 * @param {number} duration - Request duration in ms
 */
export function logRequest(request, duration) {
  logger.info({
    req: {
      id: request.id,
      method: request.method,
      url: request.url,
      ip: request.ip,
      userAgent: request.headers?.['user-agent'],
      userId: request.user?.id,
      duration
    }
  }, `${request.method} ${request.url}`);
}

// Export all functions as default object for convenience
export default {
  logger,
  debug,
  info,
  warn,
  error,
  fatal,
  log,
  audit,
  logQuery,
  logRequest,
  sanitize,
  createChildLogger
};
