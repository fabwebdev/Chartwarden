/**
 * Standardized Error Codes
 * HIPAA-compliant error codes for consistent API error responses
 *
 * Error Code Format: CATEGORY_SPECIFIC_ERROR
 * Categories:
 *   - AUTH: Authentication errors
 *   - AUTHZ: Authorization errors
 *   - VALIDATION: Input validation errors
 *   - RESOURCE: Resource-related errors
 *   - DATABASE: Database operation errors
 *   - RATE_LIMIT: Rate limiting errors
 *   - SYSTEM: System/server errors
 *   - HIPAA: HIPAA-specific compliance errors
 */

export const ErrorCodes = {
  // Authentication Errors (401)
  AUTH_REQUIRED: 'AUTH_REQUIRED',
  AUTH_INVALID_CREDENTIALS: 'AUTH_INVALID_CREDENTIALS',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_TOKEN_INVALID: 'AUTH_TOKEN_INVALID',
  AUTH_TOKEN_EXPIRED: 'AUTH_TOKEN_EXPIRED',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_DISABLED: 'AUTH_ACCOUNT_DISABLED',
  AUTH_EMAIL_NOT_VERIFIED: 'AUTH_EMAIL_NOT_VERIFIED',
  AUTH_MFA_REQUIRED: 'AUTH_MFA_REQUIRED',
  AUTH_MFA_INVALID: 'AUTH_MFA_INVALID',

  // Authorization Errors (403)
  AUTHZ_FORBIDDEN: 'AUTHZ_FORBIDDEN',
  AUTHZ_INSUFFICIENT_PERMISSIONS: 'AUTHZ_INSUFFICIENT_PERMISSIONS',
  AUTHZ_ROLE_REQUIRED: 'AUTHZ_ROLE_REQUIRED',
  AUTHZ_RESOURCE_ACCESS_DENIED: 'AUTHZ_RESOURCE_ACCESS_DENIED',
  AUTHZ_PATIENT_ACCESS_DENIED: 'AUTHZ_PATIENT_ACCESS_DENIED',
  AUTHZ_FACILITY_ACCESS_DENIED: 'AUTHZ_FACILITY_ACCESS_DENIED',

  // Validation Errors (422)
  VALIDATION_FAILED: 'VALIDATION_FAILED',
  VALIDATION_REQUIRED_FIELD: 'VALIDATION_REQUIRED_FIELD',
  VALIDATION_INVALID_FORMAT: 'VALIDATION_INVALID_FORMAT',
  VALIDATION_INVALID_EMAIL: 'VALIDATION_INVALID_EMAIL',
  VALIDATION_INVALID_PHONE: 'VALIDATION_INVALID_PHONE',
  VALIDATION_INVALID_DATE: 'VALIDATION_INVALID_DATE',
  VALIDATION_INVALID_SSN: 'VALIDATION_INVALID_SSN',
  VALIDATION_INVALID_MRN: 'VALIDATION_INVALID_MRN',
  VALIDATION_INVALID_NPI: 'VALIDATION_INVALID_NPI',
  VALIDATION_OUT_OF_RANGE: 'VALIDATION_OUT_OF_RANGE',
  VALIDATION_STRING_TOO_LONG: 'VALIDATION_STRING_TOO_LONG',
  VALIDATION_STRING_TOO_SHORT: 'VALIDATION_STRING_TOO_SHORT',
  VALIDATION_INVALID_ENUM: 'VALIDATION_INVALID_ENUM',
  VALIDATION_INVALID_UUID: 'VALIDATION_INVALID_UUID',

  // Resource Errors (404, 409)
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  RESOURCE_PATIENT_NOT_FOUND: 'RESOURCE_PATIENT_NOT_FOUND',
  RESOURCE_USER_NOT_FOUND: 'RESOURCE_USER_NOT_FOUND',
  RESOURCE_ENCOUNTER_NOT_FOUND: 'RESOURCE_ENCOUNTER_NOT_FOUND',
  RESOURCE_MEDICATION_NOT_FOUND: 'RESOURCE_MEDICATION_NOT_FOUND',
  RESOURCE_ORDER_NOT_FOUND: 'RESOURCE_ORDER_NOT_FOUND',
  RESOURCE_DOCUMENT_NOT_FOUND: 'RESOURCE_DOCUMENT_NOT_FOUND',
  RESOURCE_ALREADY_EXISTS: 'RESOURCE_ALREADY_EXISTS',
  RESOURCE_CONFLICT: 'RESOURCE_CONFLICT',
  RESOURCE_DELETED: 'RESOURCE_DELETED',
  RESOURCE_LOCKED: 'RESOURCE_LOCKED',

  // Bad Request Errors (400)
  BAD_REQUEST: 'BAD_REQUEST',
  BAD_REQUEST_MALFORMED_JSON: 'BAD_REQUEST_MALFORMED_JSON',
  BAD_REQUEST_MISSING_PARAMETER: 'BAD_REQUEST_MISSING_PARAMETER',
  BAD_REQUEST_INVALID_PARAMETER: 'BAD_REQUEST_INVALID_PARAMETER',
  BAD_REQUEST_UNSUPPORTED_MEDIA_TYPE: 'BAD_REQUEST_UNSUPPORTED_MEDIA_TYPE',

  // Database Errors (500)
  DATABASE_ERROR: 'DATABASE_ERROR',
  DATABASE_CONNECTION_FAILED: 'DATABASE_CONNECTION_FAILED',
  DATABASE_QUERY_FAILED: 'DATABASE_QUERY_FAILED',
  DATABASE_CONSTRAINT_VIOLATION: 'DATABASE_CONSTRAINT_VIOLATION',
  DATABASE_UNIQUE_VIOLATION: 'DATABASE_UNIQUE_VIOLATION',
  DATABASE_FOREIGN_KEY_VIOLATION: 'DATABASE_FOREIGN_KEY_VIOLATION',
  DATABASE_TRANSACTION_FAILED: 'DATABASE_TRANSACTION_FAILED',

  // Rate Limiting Errors (429)
  RATE_LIMIT_EXCEEDED: 'RATE_LIMIT_EXCEEDED',
  RATE_LIMIT_TOO_MANY_REQUESTS: 'RATE_LIMIT_TOO_MANY_REQUESTS',
  RATE_LIMIT_LOGIN_ATTEMPTS: 'RATE_LIMIT_LOGIN_ATTEMPTS',

  // System Errors (500, 502, 503, 504)
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SYSTEM_INTERNAL_ERROR: 'SYSTEM_INTERNAL_ERROR',
  SYSTEM_SERVICE_UNAVAILABLE: 'SYSTEM_SERVICE_UNAVAILABLE',
  SYSTEM_MAINTENANCE: 'SYSTEM_MAINTENANCE',
  SYSTEM_TIMEOUT: 'SYSTEM_TIMEOUT',
  SYSTEM_EXTERNAL_SERVICE_FAILED: 'SYSTEM_EXTERNAL_SERVICE_FAILED',

  // HIPAA-Specific Errors
  HIPAA_AUDIT_FAILED: 'HIPAA_AUDIT_FAILED',
  HIPAA_PHI_ACCESS_DENIED: 'HIPAA_PHI_ACCESS_DENIED',
  HIPAA_CONSENT_REQUIRED: 'HIPAA_CONSENT_REQUIRED',
  HIPAA_BREAK_THE_GLASS_REQUIRED: 'HIPAA_BREAK_THE_GLASS_REQUIRED',
  HIPAA_ENCRYPTION_FAILED: 'HIPAA_ENCRYPTION_FAILED'
};

/**
 * HIPAA-compliant error messages
 * These messages are safe to return to clients
 * - Never reveal system internals
 * - Never include PHI
 * - Never expose database details
 */
export const ErrorMessages = {
  // Authentication
  [ErrorCodes.AUTH_REQUIRED]: 'Authentication required',
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 'Invalid credentials',
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 'Your session has expired. Please sign in again',
  [ErrorCodes.AUTH_TOKEN_INVALID]: 'Invalid authentication token',
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 'Authentication token has expired',
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 'Account is locked. Please contact support',
  [ErrorCodes.AUTH_ACCOUNT_DISABLED]: 'Account is disabled',
  [ErrorCodes.AUTH_EMAIL_NOT_VERIFIED]: 'Please verify your email address',
  [ErrorCodes.AUTH_MFA_REQUIRED]: 'Multi-factor authentication required',
  [ErrorCodes.AUTH_MFA_INVALID]: 'Invalid verification code',

  // Authorization
  [ErrorCodes.AUTHZ_FORBIDDEN]: 'Access denied',
  [ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS]: 'You do not have permission to perform this action',
  [ErrorCodes.AUTHZ_ROLE_REQUIRED]: 'This action requires additional permissions',
  [ErrorCodes.AUTHZ_RESOURCE_ACCESS_DENIED]: 'Access to this resource is denied',
  [ErrorCodes.AUTHZ_PATIENT_ACCESS_DENIED]: 'You do not have access to this patient record',
  [ErrorCodes.AUTHZ_FACILITY_ACCESS_DENIED]: 'You do not have access to this facility',

  // Validation
  [ErrorCodes.VALIDATION_FAILED]: 'The request contains invalid data',
  [ErrorCodes.VALIDATION_REQUIRED_FIELD]: 'This field is required',
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 'Invalid format',
  [ErrorCodes.VALIDATION_INVALID_EMAIL]: 'Please enter a valid email address',
  [ErrorCodes.VALIDATION_INVALID_PHONE]: 'Please enter a valid phone number',
  [ErrorCodes.VALIDATION_INVALID_DATE]: 'Please enter a valid date',
  [ErrorCodes.VALIDATION_INVALID_SSN]: 'Please enter a valid SSN',
  [ErrorCodes.VALIDATION_INVALID_MRN]: 'Please enter a valid MRN',
  [ErrorCodes.VALIDATION_INVALID_NPI]: 'Please enter a valid NPI',
  [ErrorCodes.VALIDATION_OUT_OF_RANGE]: 'Value is out of the allowed range',
  [ErrorCodes.VALIDATION_STRING_TOO_LONG]: 'Value exceeds maximum length',
  [ErrorCodes.VALIDATION_STRING_TOO_SHORT]: 'Value is below minimum length',
  [ErrorCodes.VALIDATION_INVALID_ENUM]: 'Invalid option selected',
  [ErrorCodes.VALIDATION_INVALID_UUID]: 'Invalid identifier format',

  // Resource
  [ErrorCodes.RESOURCE_NOT_FOUND]: 'The requested resource was not found',
  [ErrorCodes.RESOURCE_PATIENT_NOT_FOUND]: 'Patient record not found',
  [ErrorCodes.RESOURCE_USER_NOT_FOUND]: 'User not found',
  [ErrorCodes.RESOURCE_ENCOUNTER_NOT_FOUND]: 'Encounter not found',
  [ErrorCodes.RESOURCE_MEDICATION_NOT_FOUND]: 'Medication not found',
  [ErrorCodes.RESOURCE_ORDER_NOT_FOUND]: 'Order not found',
  [ErrorCodes.RESOURCE_DOCUMENT_NOT_FOUND]: 'Document not found',
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 'This resource already exists',
  [ErrorCodes.RESOURCE_CONFLICT]: 'This operation conflicts with existing data',
  [ErrorCodes.RESOURCE_DELETED]: 'This resource has been deleted',
  [ErrorCodes.RESOURCE_LOCKED]: 'This resource is currently locked',

  // Bad Request
  [ErrorCodes.BAD_REQUEST]: 'Invalid request',
  [ErrorCodes.BAD_REQUEST_MALFORMED_JSON]: 'Invalid JSON in request body',
  [ErrorCodes.BAD_REQUEST_MISSING_PARAMETER]: 'Required parameter is missing',
  [ErrorCodes.BAD_REQUEST_INVALID_PARAMETER]: 'Invalid parameter value',
  [ErrorCodes.BAD_REQUEST_UNSUPPORTED_MEDIA_TYPE]: 'Unsupported content type',

  // Database (generic messages - never expose DB details)
  [ErrorCodes.DATABASE_ERROR]: 'A data error occurred. Please try again',
  [ErrorCodes.DATABASE_CONNECTION_FAILED]: 'Service temporarily unavailable',
  [ErrorCodes.DATABASE_QUERY_FAILED]: 'Unable to process request',
  [ErrorCodes.DATABASE_CONSTRAINT_VIOLATION]: 'This operation is not allowed',
  [ErrorCodes.DATABASE_UNIQUE_VIOLATION]: 'This record already exists',
  [ErrorCodes.DATABASE_FOREIGN_KEY_VIOLATION]: 'Related record does not exist',
  [ErrorCodes.DATABASE_TRANSACTION_FAILED]: 'Unable to complete operation',

  // Rate Limiting
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 'Too many requests. Please wait before trying again',
  [ErrorCodes.RATE_LIMIT_TOO_MANY_REQUESTS]: 'Request limit exceeded. Please slow down',
  [ErrorCodes.RATE_LIMIT_LOGIN_ATTEMPTS]: 'Too many login attempts. Please try again later',

  // System (generic messages - never expose system details)
  [ErrorCodes.SYSTEM_ERROR]: 'An unexpected error occurred',
  [ErrorCodes.SYSTEM_INTERNAL_ERROR]: 'An unexpected error occurred. Please try again',
  [ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE]: 'Service temporarily unavailable',
  [ErrorCodes.SYSTEM_MAINTENANCE]: 'System is under maintenance. Please try again later',
  [ErrorCodes.SYSTEM_TIMEOUT]: 'The request took too long. Please try again',
  [ErrorCodes.SYSTEM_EXTERNAL_SERVICE_FAILED]: 'External service unavailable',

  // HIPAA
  [ErrorCodes.HIPAA_AUDIT_FAILED]: 'Unable to process request',
  [ErrorCodes.HIPAA_PHI_ACCESS_DENIED]: 'Access to protected health information denied',
  [ErrorCodes.HIPAA_CONSENT_REQUIRED]: 'Patient consent required for this action',
  [ErrorCodes.HIPAA_BREAK_THE_GLASS_REQUIRED]: 'Emergency access authorization required',
  [ErrorCodes.HIPAA_ENCRYPTION_FAILED]: 'Security error. Please contact support'
};

/**
 * Map error codes to HTTP status codes
 */
export const ErrorStatusCodes = {
  // 400 Bad Request
  [ErrorCodes.BAD_REQUEST]: 400,
  [ErrorCodes.BAD_REQUEST_MALFORMED_JSON]: 400,
  [ErrorCodes.BAD_REQUEST_MISSING_PARAMETER]: 400,
  [ErrorCodes.BAD_REQUEST_INVALID_PARAMETER]: 400,
  [ErrorCodes.BAD_REQUEST_UNSUPPORTED_MEDIA_TYPE]: 415,

  // 401 Unauthorized
  [ErrorCodes.AUTH_REQUIRED]: 401,
  [ErrorCodes.AUTH_INVALID_CREDENTIALS]: 401,
  [ErrorCodes.AUTH_SESSION_EXPIRED]: 401,
  [ErrorCodes.AUTH_TOKEN_INVALID]: 401,
  [ErrorCodes.AUTH_TOKEN_EXPIRED]: 401,
  [ErrorCodes.AUTH_ACCOUNT_LOCKED]: 401,
  [ErrorCodes.AUTH_ACCOUNT_DISABLED]: 401,
  [ErrorCodes.AUTH_EMAIL_NOT_VERIFIED]: 401,
  [ErrorCodes.AUTH_MFA_REQUIRED]: 401,
  [ErrorCodes.AUTH_MFA_INVALID]: 401,

  // 403 Forbidden
  [ErrorCodes.AUTHZ_FORBIDDEN]: 403,
  [ErrorCodes.AUTHZ_INSUFFICIENT_PERMISSIONS]: 403,
  [ErrorCodes.AUTHZ_ROLE_REQUIRED]: 403,
  [ErrorCodes.AUTHZ_RESOURCE_ACCESS_DENIED]: 403,
  [ErrorCodes.AUTHZ_PATIENT_ACCESS_DENIED]: 403,
  [ErrorCodes.AUTHZ_FACILITY_ACCESS_DENIED]: 403,
  [ErrorCodes.HIPAA_PHI_ACCESS_DENIED]: 403,
  [ErrorCodes.HIPAA_CONSENT_REQUIRED]: 403,
  [ErrorCodes.HIPAA_BREAK_THE_GLASS_REQUIRED]: 403,

  // 404 Not Found
  [ErrorCodes.RESOURCE_NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_PATIENT_NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_USER_NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_ENCOUNTER_NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_MEDICATION_NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_ORDER_NOT_FOUND]: 404,
  [ErrorCodes.RESOURCE_DOCUMENT_NOT_FOUND]: 404,

  // 409 Conflict
  [ErrorCodes.RESOURCE_ALREADY_EXISTS]: 409,
  [ErrorCodes.RESOURCE_CONFLICT]: 409,
  [ErrorCodes.RESOURCE_LOCKED]: 423,

  // 410 Gone
  [ErrorCodes.RESOURCE_DELETED]: 410,

  // 422 Unprocessable Entity
  [ErrorCodes.VALIDATION_FAILED]: 422,
  [ErrorCodes.VALIDATION_REQUIRED_FIELD]: 422,
  [ErrorCodes.VALIDATION_INVALID_FORMAT]: 422,
  [ErrorCodes.VALIDATION_INVALID_EMAIL]: 422,
  [ErrorCodes.VALIDATION_INVALID_PHONE]: 422,
  [ErrorCodes.VALIDATION_INVALID_DATE]: 422,
  [ErrorCodes.VALIDATION_INVALID_SSN]: 422,
  [ErrorCodes.VALIDATION_INVALID_MRN]: 422,
  [ErrorCodes.VALIDATION_INVALID_NPI]: 422,
  [ErrorCodes.VALIDATION_OUT_OF_RANGE]: 422,
  [ErrorCodes.VALIDATION_STRING_TOO_LONG]: 422,
  [ErrorCodes.VALIDATION_STRING_TOO_SHORT]: 422,
  [ErrorCodes.VALIDATION_INVALID_ENUM]: 422,
  [ErrorCodes.VALIDATION_INVALID_UUID]: 422,

  // 429 Too Many Requests
  [ErrorCodes.RATE_LIMIT_EXCEEDED]: 429,
  [ErrorCodes.RATE_LIMIT_TOO_MANY_REQUESTS]: 429,
  [ErrorCodes.RATE_LIMIT_LOGIN_ATTEMPTS]: 429,

  // 500 Internal Server Error
  [ErrorCodes.DATABASE_ERROR]: 500,
  [ErrorCodes.DATABASE_QUERY_FAILED]: 500,
  [ErrorCodes.DATABASE_CONSTRAINT_VIOLATION]: 500,
  [ErrorCodes.DATABASE_UNIQUE_VIOLATION]: 409,
  [ErrorCodes.DATABASE_FOREIGN_KEY_VIOLATION]: 400,
  [ErrorCodes.DATABASE_TRANSACTION_FAILED]: 500,
  [ErrorCodes.SYSTEM_ERROR]: 500,
  [ErrorCodes.SYSTEM_INTERNAL_ERROR]: 500,
  [ErrorCodes.HIPAA_AUDIT_FAILED]: 500,
  [ErrorCodes.HIPAA_ENCRYPTION_FAILED]: 500,

  // 502 Bad Gateway
  [ErrorCodes.SYSTEM_EXTERNAL_SERVICE_FAILED]: 502,

  // 503 Service Unavailable
  [ErrorCodes.DATABASE_CONNECTION_FAILED]: 503,
  [ErrorCodes.SYSTEM_SERVICE_UNAVAILABLE]: 503,
  [ErrorCodes.SYSTEM_MAINTENANCE]: 503,

  // 504 Gateway Timeout
  [ErrorCodes.SYSTEM_TIMEOUT]: 504
};

/**
 * Get HIPAA-compliant error message for a code
 * @param {string} code - Error code
 * @returns {string} Safe error message
 */
export function getErrorMessage(code) {
  return ErrorMessages[code] || ErrorMessages[ErrorCodes.SYSTEM_ERROR];
}

/**
 * Get HTTP status code for an error code
 * @param {string} code - Error code
 * @returns {number} HTTP status code
 */
export function getStatusCode(code) {
  return ErrorStatusCodes[code] || 500;
}

export default {
  ErrorCodes,
  ErrorMessages,
  ErrorStatusCodes,
  getErrorMessage,
  getStatusCode
};
