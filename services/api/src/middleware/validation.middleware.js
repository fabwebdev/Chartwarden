/**
 * Yup Validation Middleware
 * TICKET #017: Request Payload Validation and Sanitization
 *
 * Provides comprehensive request validation using Yup schemas with:
 * - Body, query, and params validation
 * - Input sanitization (XSS protection, trimming)
 * - HIPAA-compliant error responses
 * - Proper integration with existing error handling
 *
 * @example
 * import { validate, schemas } from '../middleware/validation.middleware.js';
 *
 * fastify.post('/patients', {
 *   preHandler: [authenticate, validate(schemas.patient.create)]
 * }, patientController.create);
 */

import * as yup from 'yup';
import { ValidationError } from '../utils/errorHandler.js';
import { ErrorCodes } from '../constants/errorCodes.js';

/**
 * Sanitize string input to prevent XSS and clean whitespace
 * @param {string} value - Input value to sanitize
 * @returns {string} Sanitized string
 */
function sanitizeString(value) {
  if (typeof value !== 'string') return value;

  return value
    .trim()
    // Remove null bytes
    .replace(/\0/g, '')
    // Escape HTML entities to prevent XSS
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

/**
 * Create a sanitized string schema
 * Use this for any user-provided text input
 */
export const sanitizedString = () =>
  yup.string().transform((value) => (value ? sanitizeString(value) : value));

/**
 * Create a trimmed string that preserves HTML entities
 * Use for fields that may legitimately contain special characters
 */
export const trimmedString = () =>
  yup.string().transform((value) => (value ? value.trim() : value));

/**
 * Map Yup error types to application error codes
 */
const YUP_ERROR_TYPE_MAP = {
  required: ErrorCodes.VALIDATION_REQUIRED_FIELD,
  typeError: ErrorCodes.VALIDATION_INVALID_FORMAT,
  email: ErrorCodes.VALIDATION_INVALID_EMAIL,
  min: ErrorCodes.VALIDATION_STRING_TOO_SHORT,
  max: ErrorCodes.VALIDATION_STRING_TOO_LONG,
  matches: ErrorCodes.VALIDATION_INVALID_FORMAT,
  oneOf: ErrorCodes.VALIDATION_INVALID_ENUM,
  uuid: ErrorCodes.VALIDATION_INVALID_UUID,
  date: ErrorCodes.VALIDATION_INVALID_DATE
};

/**
 * Get error code from Yup validation error type
 * @param {string} type - Yup error type
 * @param {string} path - Field path for specific field codes
 * @returns {string} Error code
 */
function getValidationErrorCode(type, path) {
  // Check for specific field types
  if (path) {
    const fieldName = path.toLowerCase();
    if (fieldName.includes('email')) return ErrorCodes.VALIDATION_INVALID_EMAIL;
    if (fieldName.includes('phone')) return ErrorCodes.VALIDATION_INVALID_PHONE;
    if (fieldName.includes('ssn')) return ErrorCodes.VALIDATION_INVALID_SSN;
    if (fieldName.includes('mrn')) return ErrorCodes.VALIDATION_INVALID_MRN;
    if (fieldName.includes('npi')) return ErrorCodes.VALIDATION_INVALID_NPI;
    if (fieldName.includes('date') || fieldName.includes('dob')) return ErrorCodes.VALIDATION_INVALID_DATE;
  }

  return YUP_ERROR_TYPE_MAP[type] || ErrorCodes.VALIDATION_FAILED;
}

/**
 * Transform Yup validation errors into application ValidationError
 * @param {yup.ValidationError} yupError - Yup validation error
 * @returns {ValidationError} Application validation error
 */
function transformYupError(yupError) {
  const errors = [];

  if (yupError.inner && yupError.inner.length > 0) {
    // Multiple validation errors
    for (const err of yupError.inner) {
      errors.push({
        field: err.path || 'unknown',
        message: err.message,
        code: getValidationErrorCode(err.type, err.path)
      });
    }
  } else {
    // Single validation error
    errors.push({
      field: yupError.path || 'unknown',
      message: yupError.message,
      code: getValidationErrorCode(yupError.type, yupError.path)
    });
  }

  const validationError = new ValidationError('The request contains invalid data', {
    code: ErrorCodes.VALIDATION_FAILED,
    errors
  });

  return validationError;
}

/**
 * Validation configuration options
 * @typedef {Object} ValidationOptions
 * @property {yup.Schema} [body] - Schema for request body
 * @property {yup.Schema} [query] - Schema for query parameters
 * @property {yup.Schema} [params] - Schema for URL parameters
 * @property {boolean} [stripUnknown=true] - Remove fields not in schema
 * @property {boolean} [abortEarly=false] - Return all errors, not just first
 */

/**
 * Create validation middleware from Yup schema(s)
 *
 * @param {ValidationOptions|yup.Schema} schemaOrOptions - Yup schema or options object
 * @returns {Function} Fastify preHandler middleware
 *
 * @example
 * // Simple body validation
 * validate(yup.object({ name: yup.string().required() }))
 *
 * @example
 * // Full options
 * validate({
 *   body: createPatientSchema,
 *   query: paginationSchema,
 *   params: yup.object({ id: yup.string().uuid().required() })
 * })
 */
export function validate(schemaOrOptions) {
  // Normalize input to options object
  const options = schemaOrOptions instanceof yup.Schema
    ? { body: schemaOrOptions }
    : schemaOrOptions;

  const {
    body: bodySchema,
    query: querySchema,
    params: paramsSchema,
    stripUnknown = true,
    abortEarly = false
  } = options;

  return async function validationMiddleware(request, reply) {
    const validationContext = {
      abortEarly,
      stripUnknown
    };

    try {
      // Validate body
      if (bodySchema && request.body) {
        request.body = await bodySchema.validate(request.body, validationContext);
      }

      // Validate query parameters
      if (querySchema && request.query) {
        request.query = await querySchema.validate(request.query, validationContext);
      }

      // Validate URL parameters
      if (paramsSchema && request.params) {
        request.params = await paramsSchema.validate(request.params, validationContext);
      }
    } catch (error) {
      if (error instanceof yup.ValidationError) {
        throw transformYupError(error);
      }
      throw error;
    }
  };
}

/**
 * Create a validation middleware that only validates body
 * Convenience wrapper for the most common use case
 *
 * @param {yup.Schema} schema - Yup schema for request body
 * @returns {Function} Fastify preHandler middleware
 */
export function validateBody(schema) {
  return validate({ body: schema });
}

/**
 * Create a validation middleware that only validates query
 *
 * @param {yup.Schema} schema - Yup schema for query parameters
 * @returns {Function} Fastify preHandler middleware
 */
export function validateQuery(schema) {
  return validate({ query: schema });
}

/**
 * Create a validation middleware that only validates params
 *
 * @param {yup.Schema} schema - Yup schema for URL parameters
 * @returns {Function} Fastify preHandler middleware
 */
export function validateParams(schema) {
  return validate({ params: schema });
}

// ============================================================================
// Common Validation Schemas
// ============================================================================

/**
 * Common field validators with sanitization
 */
export const fields = {
  /**
   * UUID field validator
   */
  uuid: () => yup.string().uuid('Invalid ID format'),

  /**
   * Required UUID (for route params)
   */
  requiredUuid: () => yup.string().uuid('Invalid ID format').required('ID is required'),

  /**
   * Email field with sanitization
   */
  email: () =>
    sanitizedString()
      .email('Please enter a valid email address')
      .max(255, 'Email must be at most 255 characters')
      .lowercase(),

  /**
   * Required email
   */
  requiredEmail: () => fields.email().required('Email is required'),

  /**
   * Phone number with basic formatting validation
   */
  phone: () =>
    sanitizedString()
      .matches(
        /^[\d\s\-\+\(\)\.]+$/,
        'Please enter a valid phone number'
      )
      .max(20, 'Phone number is too long'),

  /**
   * Name field (first name, last name, etc.)
   */
  name: () =>
    sanitizedString()
      .min(1, 'Name is required')
      .max(100, 'Name must be at most 100 characters'),

  /**
   * Required name
   */
  requiredName: () => fields.name().required('Name is required'),

  /**
   * Password field (no sanitization to preserve special chars)
   */
  password: () =>
    yup.string()
      .min(8, 'Password must be at least 8 characters')
      .max(128, 'Password must be at most 128 characters'),

  /**
   * Required password
   */
  requiredPassword: () => fields.password().required('Password is required'),

  /**
   * Date field (accepts ISO date strings)
   */
  date: () => yup.date().typeError('Please enter a valid date'),

  /**
   * Required date
   */
  requiredDate: () => fields.date().required('Date is required'),

  /**
   * Text area / long text content
   */
  text: () =>
    sanitizedString()
      .max(10000, 'Text content is too long'),

  /**
   * Short description or notes
   */
  shortText: () =>
    sanitizedString()
      .max(500, 'Text must be at most 500 characters'),

  /**
   * Medical Record Number (MRN)
   */
  mrn: () =>
    sanitizedString()
      .matches(/^[A-Za-z0-9\-]+$/, 'Please enter a valid MRN'),

  /**
   * Social Security Number (format: XXX-XX-XXXX or XXXXXXXXX)
   */
  ssn: () =>
    sanitizedString()
      .matches(
        /^(\d{3}-?\d{2}-?\d{4}|\d{9})$/,
        'Please enter a valid SSN'
      ),

  /**
   * National Provider Identifier (NPI)
   */
  npi: () =>
    sanitizedString()
      .matches(/^\d{10}$/, 'Please enter a valid 10-digit NPI'),

  /**
   * Positive integer
   */
  positiveInt: () =>
    yup.number()
      .integer('Must be a whole number')
      .positive('Must be a positive number'),

  /**
   * Boolean field
   */
  boolean: () => yup.boolean(),

  /**
   * Enum/select field
   * @param {Array} values - Allowed values
   * @param {string} [message] - Custom error message
   */
  oneOf: (values, message) =>
    yup.string().oneOf(values, message || `Must be one of: ${values.join(', ')}`)
};

/**
 * Common pagination schema for list endpoints
 */
export const paginationSchema = yup.object({
  page: yup.number().integer().min(1).default(1),
  limit: yup.number().integer().min(1).max(100).default(20),
  sort: sanitizedString(),
  order: yup.string().oneOf(['asc', 'desc']).default('asc')
});

/**
 * Common ID parameter schema
 */
export const idParamSchema = yup.object({
  id: fields.requiredUuid()
});

/**
 * Common search query schema
 */
export const searchSchema = yup.object({
  q: sanitizedString().max(200, 'Search query is too long'),
  page: yup.number().integer().min(1).default(1),
  limit: yup.number().integer().min(1).max(100).default(20)
});

// ============================================================================
// Domain-Specific Schemas
// ============================================================================

/**
 * Authentication schemas
 */
export const authSchemas = {
  signIn: yup.object({
    email: fields.requiredEmail(),
    password: yup.string().required('Password is required'),
    rememberMe: yup.boolean().default(false)
  }),

  signUp: yup.object({
    email: fields.requiredEmail(),
    password: fields.requiredPassword(),
    firstName: fields.requiredName(),
    lastName: fields.requiredName()
  }),

  forgotPassword: yup.object({
    email: fields.requiredEmail()
  }),

  resetPassword: yup.object({
    token: yup.string().required('Reset token is required'),
    password: fields.requiredPassword(),
    confirmPassword: yup.string()
      .oneOf([yup.ref('password')], 'Passwords must match')
      .required('Please confirm your password')
  }),

  changePassword: yup.object({
    currentPassword: yup.string().required('Current password is required'),
    newPassword: fields.requiredPassword(),
    confirmPassword: yup.string()
      .oneOf([yup.ref('newPassword')], 'Passwords must match')
      .required('Please confirm your password')
  })
};

/**
 * Patient schemas
 */
export const patientSchemas = {
  create: yup.object({
    firstName: fields.requiredName(),
    lastName: fields.requiredName(),
    dateOfBirth: fields.requiredDate(),
    gender: fields.oneOf(['male', 'female', 'other', 'unknown']),
    email: fields.email(),
    phone: fields.phone(),
    address: sanitizedString().max(500),
    city: sanitizedString().max(100),
    state: sanitizedString().max(50),
    zipCode: sanitizedString().matches(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
    mrn: fields.mrn(),
    ssn: fields.ssn(),
    primaryDiagnosis: sanitizedString().max(500),
    admissionDate: fields.date(),
    notes: fields.text()
  }),

  update: yup.object({
    firstName: fields.name(),
    lastName: fields.name(),
    dateOfBirth: fields.date(),
    gender: fields.oneOf(['male', 'female', 'other', 'unknown']),
    email: fields.email(),
    phone: fields.phone(),
    address: sanitizedString().max(500),
    city: sanitizedString().max(100),
    state: sanitizedString().max(50),
    zipCode: sanitizedString().matches(/^\d{5}(-\d{4})?$/, 'Invalid ZIP code'),
    mrn: fields.mrn(),
    ssn: fields.ssn(),
    primaryDiagnosis: sanitizedString().max(500),
    admissionDate: fields.date(),
    dischargeDate: fields.date(),
    notes: fields.text()
  })
};

/**
 * User management schemas
 */
export const userSchemas = {
  create: yup.object({
    email: fields.requiredEmail(),
    password: fields.requiredPassword(),
    firstName: fields.requiredName(),
    lastName: fields.requiredName(),
    role: yup.string().required('Role is required')
  }),

  update: yup.object({
    email: fields.email(),
    firstName: fields.name(),
    lastName: fields.name(),
    role: yup.string(),
    isActive: yup.boolean()
  }),

  updateProfile: yup.object({
    firstName: fields.name(),
    lastName: fields.name(),
    phone: fields.phone()
  })
};

/**
 * Encounter/Visit schemas
 */
export const encounterSchemas = {
  create: yup.object({
    patientId: fields.requiredUuid(),
    encounterType: fields.oneOf([
      'routine_visit',
      'admission',
      'discharge',
      'death',
      'recertification',
      'idg_review',
      'phone_call',
      'medication_review'
    ]).required('Encounter type is required'),
    encounterDate: fields.requiredDate(),
    notes: fields.text(),
    vitalSigns: yup.object({
      temperature: yup.number().min(90).max(110),
      pulse: yup.number().integer().min(20).max(300),
      respiratoryRate: yup.number().integer().min(5).max(60),
      bloodPressureSystolic: yup.number().integer().min(50).max(300),
      bloodPressureDiastolic: yup.number().integer().min(30).max(200),
      oxygenSaturation: yup.number().integer().min(50).max(100),
      painLevel: yup.number().integer().min(0).max(10)
    }).default(undefined)
  }),

  update: yup.object({
    encounterType: fields.oneOf([
      'routine_visit',
      'admission',
      'discharge',
      'death',
      'recertification',
      'idg_review',
      'phone_call',
      'medication_review'
    ]),
    encounterDate: fields.date(),
    notes: fields.text(),
    status: fields.oneOf(['draft', 'completed', 'signed', 'amended']),
    vitalSigns: yup.object({
      temperature: yup.number().min(90).max(110),
      pulse: yup.number().integer().min(20).max(300),
      respiratoryRate: yup.number().integer().min(5).max(60),
      bloodPressureSystolic: yup.number().integer().min(50).max(300),
      bloodPressureDiastolic: yup.number().integer().min(30).max(200),
      oxygenSaturation: yup.number().integer().min(50).max(100),
      painLevel: yup.number().integer().min(0).max(10)
    }).default(undefined)
  })
};

/**
 * Medication schemas
 */
export const medicationSchemas = {
  create: yup.object({
    patientId: fields.requiredUuid(),
    medicationName: sanitizedString().required('Medication name is required').max(200),
    dosage: sanitizedString().required('Dosage is required').max(100),
    route: fields.oneOf([
      'oral',
      'sublingual',
      'topical',
      'transdermal',
      'subcutaneous',
      'intramuscular',
      'intravenous',
      'rectal',
      'inhalation',
      'ophthalmic',
      'otic',
      'nasal',
      'other'
    ]).required('Route is required'),
    frequency: sanitizedString().required('Frequency is required').max(100),
    startDate: fields.requiredDate(),
    endDate: fields.date(),
    prescriberId: fields.uuid(),
    instructions: fields.text(),
    isPrn: yup.boolean().default(false),
    prnReason: sanitizedString().max(500)
  }),

  update: yup.object({
    medicationName: sanitizedString().max(200),
    dosage: sanitizedString().max(100),
    route: fields.oneOf([
      'oral',
      'sublingual',
      'topical',
      'transdermal',
      'subcutaneous',
      'intramuscular',
      'intravenous',
      'rectal',
      'inhalation',
      'ophthalmic',
      'otic',
      'nasal',
      'other'
    ]),
    frequency: sanitizedString().max(100),
    startDate: fields.date(),
    endDate: fields.date(),
    prescriberId: fields.uuid(),
    instructions: fields.text(),
    isPrn: yup.boolean(),
    prnReason: sanitizedString().max(500),
    isActive: yup.boolean()
  })
};

/**
 * Certification schemas (CMS Compliance)
 * Validates Medicare certification data per CMS requirements
 */
export const certificationSchemas = {
  create: yup.object({
    certification_period: fields.oneOf(
      ['INITIAL_90', 'SUBSEQUENT_90', 'SUBSEQUENT_60'],
      'Invalid certification period. CMS allows: INITIAL_90 (first 90 days), SUBSEQUENT_90 (second 90 days), SUBSEQUENT_60 (subsequent 60-day periods)'
    ).required('Certification period is required per CMS requirements'),
    certification_status: fields.oneOf(
      ['PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'REVOKED']
    ).default('PENDING'),
    start_date: fields.requiredDate()
      .test('not-too-old', 'Retroactive certifications more than 30 days in the past require additional documentation', function(value) {
        if (!value) return true;
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        return new Date(value) >= thirtyDaysAgo;
      }),
    end_date: fields.requiredDate()
      .test('after-start', 'End date must be after start date', function(value) {
        const { start_date } = this.parent;
        if (!value || !start_date) return true;
        return new Date(value) > new Date(start_date);
      }),
    terminal_illness_narrative: sanitizedString()
      .required('Terminal illness narrative is required for CMS certification')
      .min(50, 'Terminal illness narrative must be at least 50 characters for CMS compliance')
      .max(5000, 'Terminal illness narrative exceeds maximum length'),
    clinical_progression: sanitizedString().max(5000),
    decline_indicators: sanitizedString().max(5000),
    noe_id: yup.number().integer().positive().nullable(),
    alert_recipients: yup.array().of(yup.string().email()).default([])
  }),

  update: yup.object({
    terminal_illness_narrative: sanitizedString()
      .min(50, 'Terminal illness narrative must be at least 50 characters for CMS compliance')
      .max(5000, 'Terminal illness narrative exceeds maximum length'),
    clinical_progression: sanitizedString().max(5000),
    decline_indicators: sanitizedString().max(5000)
  }),

  list: yup.object({
    status: fields.oneOf(['PENDING', 'ACTIVE', 'COMPLETED', 'EXPIRED', 'REVOKED']),
    patient_id: yup.number().integer().positive(),
    period: fields.oneOf(['INITIAL_90', 'SUBSEQUENT_90', 'SUBSEQUENT_60']),
    start_date_from: fields.date(),
    start_date_to: fields.date(),
    limit: yup.number().integer().min(1).max(100).default(50),
    offset: yup.number().integer().min(0).default(0),
    sort_by: fields.oneOf(['start_date', 'end_date', 'certification_due_date']).default('start_date'),
    sort_order: fields.oneOf(['asc', 'desc']).default('desc')
  }),

  revoke: yup.object({
    revocation_reason: sanitizedString()
      .required('Revocation reason is required for audit trail')
      .min(10, 'Revocation reason must be at least 10 characters')
      .max(1000, 'Revocation reason exceeds maximum length')
  }),

  delete: yup.object({
    reason: sanitizedString()
      .max(1000, 'Reason exceeds maximum length')
  })
};

/**
 * Face-to-Face encounter schemas (CMS Compliance)
 * Validates F2F encounter data per CMS requirements
 */
export const f2fSchemas = {
  create: yup.object({
    encounter_date: fields.requiredDate(),
    performed_by_id: fields.uuid(),
    performed_by_name: sanitizedString()
      .required('Provider name is required for Face-to-Face encounters')
      .max(255),
    performed_by_type: fields.oneOf(
      ['PHYSICIAN', 'NP', 'PA'],
      'CMS requires Face-to-Face encounters to be performed by PHYSICIAN, NP, or PA'
    ).required('Provider type is required'),
    visit_type: fields.oneOf(['IN_PERSON', 'TELEHEALTH']).default('IN_PERSON'),
    findings: sanitizedString()
      .required('Findings documentation is required for Face-to-Face encounters')
      .min(50, 'Findings must be at least 50 characters')
      .max(10000),
    terminal_prognosis_confirmed: yup.boolean().default(true),
    certification_id: yup.number().integer().positive()
  })
};

/**
 * Order schemas
 */
export const orderSchemas = {
  create: yup.object({
    order_type: fields.oneOf(
      ['MEDICATION', 'TREATMENT', 'DME', 'LABORATORY', 'IMAGING', 'CONSULTATION', 'OTHER']
    ).required('Order type is required'),
    order_status: fields.oneOf(['ACTIVE', 'COMPLETED', 'DISCONTINUED', 'EXPIRED', 'PENDING']).default('ACTIVE'),
    order_priority: fields.oneOf(['ROUTINE', 'URGENT', 'STAT']).default('ROUTINE'),
    order_description: sanitizedString()
      .required('Order description is required')
      .min(10, 'Order description must be at least 10 characters')
      .max(5000),
    start_date: fields.requiredDate(),
    end_date: fields.date(),
    ordered_by_id: fields.uuid(),
    is_verbal_order: yup.boolean().default(false),
    physician_name: sanitizedString().max(255),
    read_back_verified: yup.boolean()
  })
};

/**
 * All domain schemas organized by resource
 */
export const schemas = {
  auth: authSchemas,
  patient: patientSchemas,
  user: userSchemas,
  encounter: encounterSchemas,
  medication: medicationSchemas,
  certification: certificationSchemas,
  f2f: f2fSchemas,
  order: orderSchemas,
  common: {
    pagination: paginationSchema,
    idParam: idParamSchema,
    search: searchSchema
  }
};

/**
 * Legacy validation middleware (no-op for backward compatibility)
 * Use the new validate(), validateBody(), validateQuery(), or validateParams()
 * functions with Yup schemas instead.
 *
 * @deprecated Use validate(schema) instead
 */
const legacyValidate = async (request, reply) => {
  // No-op for backward compatibility with existing routes
  // that import `import validate from '../middleware/validation.middleware.js'`
  // New code should use: validate(yup.object({ ... }))
};

// Default export maintains backward compatibility
export default legacyValidate;
