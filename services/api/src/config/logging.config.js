/**
 * Logging Configuration
 * TICKET #015: Pino Logger with PHI/PII Redaction
 *
 * HIPAA Compliance:
 * - Redacts all PHI (Protected Health Information)
 * - Redacts all PII (Personally Identifiable Information)
 * - Structured logging for audit trails
 * - Environment-specific log levels
 */

import pino from 'pino';

const isDevelopment = process.env.NODE_ENV === 'development';
const isProduction = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

/**
 * HIPAA PHI/PII Redaction Paths
 * These fields will be automatically redacted from all logs
 */
const redactPaths = [
  // Authentication & Security
  'req.headers.authorization',
  'req.headers.cookie',
  'req.headers["set-cookie"]',
  'res.headers["set-cookie"]',
  '*.password',
  '*.token',
  '*.access_token',
  '*.refresh_token',
  '*.api_key',
  '*.apiKey',
  '*.secret',

  // PHI - Patient Identifiers
  '*.ssn',
  '*.social_security_number',
  '*.socialSecurityNumber',
  '*.mrn',
  '*.medical_record_number',
  '*.medicalRecordNumber',
  '*.patient_id',
  '*.patientId',

  // PHI - Demographics
  '*.firstName',
  '*.first_name',
  '*.lastName',
  '*.last_name',
  '*.middleName',
  '*.middle_name',
  '*.fullName',
  '*.full_name',
  '*.name',
  '*.patient_name',
  '*.patientName',

  // PHI - Contact Information
  '*.email',
  '*.emailAddress',
  '*.email_address',
  '*.phone',
  '*.phoneNumber',
  '*.phone_number',
  '*.mobile',
  '*.mobileNumber',
  '*.fax',
  '*.faxNumber',

  // PHI - Dates (could identify patient)
  '*.dateOfBirth',
  '*.date_of_birth',
  '*.dob',
  '*.birthDate',
  '*.birth_date',
  '*.deathDate',
  '*.death_date',
  '*.date_of_death',

  // PHI - Addresses
  '*.address',
  '*.street',
  '*.streetAddress',
  '*.street_address',
  '*.address1',
  '*.address2',
  '*.city',
  '*.state',
  '*.zipcode',
  '*.zip_code',
  '*.postalCode',
  '*.postal_code',
  '*.country',

  // PHI - Medical Information
  '*.diagnosis',
  '*.diagnoses',
  '*.condition',
  '*.conditions',
  '*.medication',
  '*.medications',
  '*.treatment',
  '*.treatments',
  '*.procedure',
  '*.procedures',
  '*.labResult',
  '*.lab_result',
  '*.vitalSign',
  '*.vital_sign',
  '*.assessment',
  '*.care_plan',
  '*.carePlan',

  // Financial Information
  '*.credit_card',
  '*.creditCard',
  '*.cvv',
  '*.accountNumber',
  '*.account_number',
  '*.routingNumber',
  '*.routing_number',

  // Request Body Redaction
  'req.body.password',
  'req.body.ssn',
  'req.body.email',
  'req.body.firstName',
  'req.body.lastName',
  'req.body.dateOfBirth',
  'req.body.phone',
  'req.body.address',
  'req.body.*.password',
  'req.body.*.ssn',
  'req.body.*.email'
];

/**
 * Sanitize query parameters
 * Remove any potential PHI from query strings
 */
function sanitizeQuery(query) {
  if (!query || typeof query !== 'object') {
    return query;
  }

  const sanitized = { ...query };
  const sensitiveParams = ['email', 'ssn', 'phone', 'name', 'dob'];

  for (const param of sensitiveParams) {
    if (param in sanitized) {
      sanitized[param] = '[REDACTED]';
    }
  }

  return sanitized;
}

/**
 * Sanitize route parameters
 * Keep IDs but remove any PHI
 */
function sanitizeParams(params) {
  if (!params || typeof params !== 'object') {
    return params;
  }

  const sanitized = { ...params };

  // Only redact if it looks like PHI (not a UUID or numeric ID)
  for (const key in sanitized) {
    const value = sanitized[key];
    if (typeof value === 'string' && value.length > 0) {
      // Keep IDs (UUIDs, numeric IDs)
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value) &&
          !/^\d+$/.test(value) &&
          (key.includes('name') || key.includes('email'))) {
        sanitized[key] = '[REDACTED]';
      }
    }
  }

  return sanitized;
}

/**
 * Pino Logger Configuration
 */
export const loggerConfig = {
  // Log level by environment
  level: process.env.LOG_LEVEL || (isTest ? 'silent' : isDevelopment ? 'debug' : 'info'),

  // Redact sensitive data automatically
  redact: {
    paths: redactPaths,
    censor: '[REDACTED]',
    remove: false // Keep the field with [REDACTED] value for debugging
  },

  // Structured logging format
  formatters: {
    level: (label) => {
      return { level: label.toUpperCase() };
    },
    bindings: (bindings) => {
      return {
        pid: bindings.pid,
        host: bindings.hostname,
        node_version: process.version
      };
    }
  },

  // Pretty print in development, JSON in production
  transport: isDevelopment && !isTest ? {
    target: 'pino-pretty',
    options: {
      colorize: true,
      translateTime: 'SYS:standard',
      ignore: 'pid,hostname',
      singleLine: false,
      messageFormat: '{levelLabel} - {msg}'
    }
  } : undefined,

  // Custom serializers for objects
  serializers: {
    req: (req) => ({
      id: req.id,
      method: req.method,
      url: req.url,
      path: req.routerPath,
      query: sanitizeQuery(req.query),
      params: sanitizeParams(req.params),
      // Never log request body (may contain PHI)
      ip: req.ip,
      userAgent: req.headers?.['user-agent']
    }),
    res: (res) => ({
      statusCode: res.statusCode
    }),
    err: pino.stdSerializers.err,
    error: pino.stdSerializers.err,
    user: (user) => ({
      id: user?.id,
      // Never log email, name, or other PII
      role: user?.role
    })
  },

  // Base metadata included in every log
  base: {
    env: process.env.NODE_ENV || 'development',
    app: 'hospice-ehr-backend',
    version: process.env.npm_package_version || '1.0.0'
  },

  // Timestamp
  timestamp: pino.stdTimeFunctions.isoTime
};

/**
 * Create a child logger instance
 * @param {Object} bindings - Additional context to bind to logger
 * @returns {Object} Child logger instance
 */
export function createLogger(bindings = {}) {
  return pino(loggerConfig).child(bindings);
}

export default loggerConfig;
