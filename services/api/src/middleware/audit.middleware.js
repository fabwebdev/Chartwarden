import AuditService from '../services/AuditService.js';
import { AuditActions, PHIResourceTypes } from '../constants/auditActions.js';

import { logger } from '../utils/logger.js';

/**
 * Configuration for comprehensive audit logging
 */
const AUDIT_CONFIG = {
  // Routes that should always be audited (beyond PHI routes)
  alwaysAuditPrefixes: [
    '/api/patient',
    '/api/patients',
    '/api/discharge',
    '/api/admission-information',
    '/api/cardiac-assessment',
    '/api/benefit-period',
    '/api/encounter',
    '/api/medication',
    '/api/care-plan',
    '/api/vital-signs',
    '/api/nursing-clinical-notes',
    '/api/pain',
    '/api/prognosis',
    '/api/nutrition',
    '/api/certification',
    '/api/hope',
    '/api/idg',
    '/api/bereavement',
    '/api/staff',
    '/api/user',
    '/api/rbac',
    '/api/permission',
    '/api/role',
    '/api/billing',
    '/api/claims',
    '/api/eligibility',
    '/api/era',
    '/api/denials',
    '/api/revenue',
    '/api/reports',
    '/api/analytics',
    '/api/signature',
    '/api/recordCompletionSignatures',
  ],

  // Routes to exclude from audit logging
  excludePrefixes: [
    '/api/health',
    '/api/security/health',
    '/api/auth/csrf',
  ],

  // Map HTTP methods to audit actions
  methodActionMap: {
    'GET': AuditActions.READ,
    'POST': AuditActions.CREATE,
    'PUT': AuditActions.UPDATE,
    'PATCH': AuditActions.UPDATE,
    'DELETE': AuditActions.DELETE,
  },
};

/**
 * Extract resource type from URL path
 * @param {string} url - Request URL
 * @returns {string} Resource type (table name)
 */
function extractResourceType(url) {
  // Remove query string
  const path = url.split('?')[0];

  // Remove /api prefix
  const apiPath = path.replace(/^\/api\/?/, '');

  // Split path segments
  const segments = apiPath.split('/').filter(Boolean);

  if (segments.length === 0) {
    return 'api';
  }

  // First segment is typically the resource type
  const resource = segments[0];

  // Map common route patterns to table names
  const resourceMap = {
    'patient': 'patients',
    'patients': 'patients',
    'discharge': 'discharges',
    'admission-information': 'admission_information',
    'cardiac-assessment': 'cardiac_assessments',
    'benefit-period': 'benefit_periods',
    'benefit-periods': 'benefit_periods',
    'encounter': 'encounters',
    'encounters': 'encounters',
    'medication': 'medications',
    'medications': 'medications',
    'care-plan': 'care_plans',
    'vital-signs': 'vital_signs',
    'nursing-clinical-notes': 'nursing_clinical_notes',
    'pain': 'pain_assessments',
    'prognosis': 'prognoses',
    'nutrition-assessment': 'nutrition_assessments',
    'certification': 'certifications',
    'hope': 'hope_assessments',
    'idg': 'idg_meetings',
    'bereavement': 'bereavement_records',
    'staff': 'staff',
    'user': 'users',
    'users': 'users',
    'rbac': 'rbac',
    'permission': 'permissions',
    'permissions': 'permissions',
    'role': 'roles',
    'roles': 'roles',
    'billing': 'billing',
    'claims': 'claims',
    'eligibility': 'eligibility',
    'era': 'era_records',
    'denials': 'denials',
    'revenue': 'revenue',
    'reports': 'reports',
    'analytics': 'analytics',
    'signature': 'signatures',
    'recordCompletionSignatures': 'signatures',
    'auth': 'auth',
    'address': 'addresses',
    'dme-provider': 'dme_providers',
    'dnr': 'dnr_records',
    'emergency-preparedness-level': 'emergency_preparedness',
    'liaison-primary': 'liaisons',
    'liaison-secondary': 'liaisons',
    'living-arrangements': 'living_arrangements',
    'patient-identifiers': 'patient_identifiers',
    'patient-pharmacy': 'patient_pharmacies',
    'payer-information': 'payer_information',
    'primary-diagnosis': 'diagnoses',
    'race-ethnicity': 'race_ethnicity',
    'spiritual-preference': 'spiritual_preferences',
    'select': 'select_options',
    'visit-information': 'visit_information',
    'his-pdf': 'his_pdfs',
    'endocrine-assessment': 'endocrine_assessments',
    'hematological-assessment': 'hematological_assessments',
    'integumentary-assessment': 'integumentary_assessments',
    'scheduling': 'schedules',
    'qapi': 'qapi_records',
    'cbsa': 'cbsa_lookups',
    'cap-tracking': 'cap_tracking',
    'clearinghouse': 'clearinghouse',
  };

  return resourceMap[resource] || resource;
}

/**
 * Extract record ID from URL path
 * @param {string} url - Request URL
 * @returns {string|null} Record ID if found
 */
function extractRecordId(url) {
  // Remove query string
  const path = url.split('?')[0];

  // Remove /api prefix
  const apiPath = path.replace(/^\/api\/?/, '');

  // Split path segments
  const segments = apiPath.split('/').filter(Boolean);

  // Look for numeric or UUID-like IDs in path
  for (let i = segments.length - 1; i >= 0; i--) {
    const segment = segments[i];
    // Check if it's a numeric ID or UUID
    if (/^\d+$/.test(segment) || /^[a-f0-9-]{20,}$/i.test(segment)) {
      return segment;
    }
  }

  return null;
}

/**
 * Determine the specific audit action based on method, URL, and context
 * @param {string} method - HTTP method
 * @param {string} url - Request URL
 * @param {string} resourceType - Resource type
 * @returns {string} Audit action
 */
function determineAuditAction(method, url, resourceType) {
  const baseAction = AUDIT_CONFIG.methodActionMap[method] || 'READ';

  // Check for specific action patterns in URL
  const lowerUrl = url.toLowerCase();

  // Authentication actions
  if (lowerUrl.includes('/auth/')) {
    if (lowerUrl.includes('sign-in') || lowerUrl.includes('login')) {
      return AuditActions.AUTH_LOGIN;
    }
    if (lowerUrl.includes('sign-out') || lowerUrl.includes('logout')) {
      return AuditActions.AUTH_LOGOUT;
    }
    if (lowerUrl.includes('password')) {
      return AuditActions.AUTH_PASSWORD_CHANGE;
    }
  }

  // PHI-related resources get specific actions
  if (PHIResourceTypes.includes(resourceType)) {
    switch (method) {
      case 'GET':
        return lowerUrl.includes('search') || lowerUrl.includes('list')
          ? AuditActions.PHI_SEARCH
          : AuditActions.PHI_VIEW;
      case 'POST':
        if (lowerUrl.includes('export')) return AuditActions.PHI_EXPORT;
        if (lowerUrl.includes('print')) return AuditActions.PHI_PRINT;
        if (lowerUrl.includes('download')) return AuditActions.PHI_DOWNLOAD;
        break;
    }
  }

  // Patient-specific actions
  if (resourceType === 'patients') {
    switch (method) {
      case 'POST':
        if (lowerUrl.includes('admit')) return AuditActions.PATIENT_ADMIT;
        if (lowerUrl.includes('discharge')) return AuditActions.PATIENT_DISCHARGE;
        if (lowerUrl.includes('transfer')) return AuditActions.PATIENT_TRANSFER;
        return AuditActions.PATIENT_CREATE;
      case 'GET':
        return AuditActions.PATIENT_READ;
      case 'PUT':
      case 'PATCH':
        return AuditActions.PATIENT_UPDATE;
      case 'DELETE':
        return AuditActions.PATIENT_DELETE;
    }
  }

  // Clinical actions
  if (['nursing_clinical_notes', 'assessments', 'care_plans', 'encounters'].includes(resourceType)) {
    switch (method) {
      case 'POST':
        if (lowerUrl.includes('sign')) return AuditActions.CLINICAL_NOTE_SIGN;
        return AuditActions.CLINICAL_NOTE_CREATE;
      case 'GET':
        return AuditActions.CLINICAL_NOTE_READ;
      case 'PUT':
      case 'PATCH':
        return AuditActions.CLINICAL_NOTE_UPDATE;
    }
  }

  // Admin actions
  if (['users', 'roles', 'permissions', 'rbac'].includes(resourceType)) {
    switch (method) {
      case 'POST':
        if (resourceType === 'users') return AuditActions.ADMIN_USER_CREATE;
        if (resourceType === 'roles') return AuditActions.ADMIN_ROLE_ASSIGN;
        if (resourceType === 'permissions') return AuditActions.ADMIN_PERMISSION_GRANT;
        break;
      case 'PUT':
      case 'PATCH':
        if (resourceType === 'users') return AuditActions.ADMIN_USER_UPDATE;
        break;
      case 'DELETE':
        if (resourceType === 'users') return AuditActions.ADMIN_USER_DELETE;
        if (resourceType === 'roles') return AuditActions.ADMIN_ROLE_REVOKE;
        if (resourceType === 'permissions') return AuditActions.ADMIN_PERMISSION_REVOKE;
        break;
    }
  }

  return baseAction;
}

/**
 * Check if a request should be audited
 * @param {string} url - Request URL
 * @param {string} method - HTTP method
 * @returns {boolean}
 */
function shouldAuditRequest(url, method) {
  // Exclude health checks and other non-auditable routes
  for (const prefix of AUDIT_CONFIG.excludePrefixes) {
    if (url.startsWith(prefix)) {
      return false;
    }
  }

  // OPTIONS requests don't need auditing
  if (method === 'OPTIONS' || method === 'HEAD') {
    return false;
  }

  // Check if it's in the always-audit list
  for (const prefix of AUDIT_CONFIG.alwaysAuditPrefixes) {
    if (url.startsWith(prefix)) {
      return true;
    }
  }

  // Audit all API routes that modify data
  if (url.startsWith('/api/') && ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) {
    return true;
  }

  return false;
}

/**
 * Extract client IP address from request
 * @param {Object} request - Fastify request object
 * @returns {string} IP address
 */
function extractIpAddress(request) {
  return request.ip ||
    request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
    request.headers['x-real-ip'] ||
    request.socket?.remoteAddress ||
    'unknown';
}

/**
 * Extract user name from request user object
 * @param {Object} user - User object from request
 * @returns {string|null} User name
 */
function extractUserName(user) {
  if (!user) return null;
  return [user.firstName, user.lastName].filter(Boolean).join(' ').trim() ||
    user.name ||
    user.fullName ||
    user.email ||
    null;
}

/**
 * Comprehensive audit middleware for automatic request/response logging
 * This middleware automatically logs all API requests that match the audit criteria
 *
 * Features:
 * - Automatically detects resource type from URL
 * - Maps HTTP methods to appropriate audit actions
 * - Captures request timing for performance monitoring
 * - Logs response status for success/failure tracking
 * - HIPAA-compliant: never logs actual health data
 *
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export const comprehensiveAuditHandler = async (request, reply) => {
  const url = request.url;
  const method = request.method;

  // Check if this request should be audited
  if (!shouldAuditRequest(url, method)) {
    return;
  }

  // Don't audit if response indicates client error (except auth failures)
  const statusCode = reply.statusCode;
  const isAuthRoute = url.includes('/auth/');

  // Always log auth failures for security monitoring
  if (statusCode >= 400 && !isAuthRoute) {
    // Still log failed requests but with appropriate action
    // This helps with security monitoring
  }

  try {
    const resourceType = extractResourceType(url);
    const recordId = extractRecordId(url) || request.params?.id || request.body?.id || null;
    const action = determineAuditAction(method, url, resourceType);
    const ipAddress = extractIpAddress(request);
    const userAgent = request.headers['user-agent'] || 'unknown';
    const userId = request.user?.id || null;
    const userName = extractUserName(request.user);

    // Calculate request duration if start time was captured
    const requestDuration = request.auditStartTime
      ? Date.now() - request.auditStartTime
      : null;

    // Prepare audit log data - NEVER include actual health data
    const auditData = {
      user_id: userId,
      action: action,
      table_name: resourceType,
      record_id: recordId ? (typeof recordId === 'string' && /^\d+$/.test(recordId) ? parseInt(recordId) : recordId.toString()) : null,
      old_value: null, // Never log actual health data
      new_value: null, // Never log actual health data
      ip_address: ipAddress,
      user_agent: userAgent,
      status: statusCode < 400 ? 'success' : 'failure',
      metadata: JSON.stringify({
        method: method,
        path: url.split('?')[0], // Don't log query parameters
        statusCode: statusCode,
        duration_ms: requestDuration,
      }),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Log to audit service
    await AuditService.createAuditLog(auditData, {
      user_name: userName,
      user_email: request.user?.email || null,
      request_id: request.id,
    });

    // Also log via Pino for observability
    if (request.log) {
      request.log.info({
        type: 'audit',
        action: action,
        resource: resourceType,
        recordId: recordId,
        userId: userId,
        status: statusCode < 400 ? 'success' : 'failure',
        duration_ms: requestDuration,
      }, `Audit: ${method} ${url.split('?')[0]}`);
    }
  } catch (error) {
    // Don't fail the request if audit logging fails
    logger.error('Comprehensive audit logging error:', error);
    if (request.log) {
      request.log.error({ err: error }, 'Failed to create comprehensive audit log');
    }
  }
};

/**
 * Pre-request hook to capture start time for duration tracking
 * @param {Object} request - Fastify request object
 * @param {Object} reply - Fastify reply object
 */
export const auditPreHandler = async (request, reply) => {
  // Capture start time for request duration calculation
  request.auditStartTime = Date.now();
};

/**
 * Audit middleware factory
 * Creates middleware that logs health data operations without logging actual health data
 *
 * @param {string} action - Action type: 'CREATE', 'READ', 'UPDATE', 'DELETE'
 * @param {string} tableName - Table/resource name (e.g., 'patients', 'discharge')
 * @returns {Function} Fastify middleware function
 */
export const audit = (action, tableName) => {
  return async (request, reply) => {
    // Store audit information for later use
    request.audit = {
      action,
      tableName,
      timestamp: new Date()
    };
  };
};

/**
 * Post-handler middleware to log audit after operation completes
 * This should be used as onResponse hook
 */
export const auditLogHandler = async (request, reply) => {
  // Only log if audit info was set and operation was successful
  if (!request.audit || reply.statusCode >= 400) {
    return;
  }

  try {
    // Get user ID (Better Auth uses nanoid strings for user IDs)
    const userId = request.user?.id || null;
    const recordId = request.params?.id || request.body?.id || null;
    
    // Extract IP address
    const ipAddress = request.ip || 
                     request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     request.headers['x-real-ip'] ||
                     request.socket?.remoteAddress ||
                     'unknown';
    
    // Extract user agent
    const userAgent = request.headers['user-agent'] || 'unknown';
    
    // Prepare audit log data - DO NOT include actual health data
    const userName =
      [request.user?.firstName, request.user?.lastName].filter(Boolean).join(" ").trim() ||
      request.user?.name ||
      request.user?.fullName ||
      request.user?.email ||
      null;

    const auditData = {
      user_id: userId,
      action: request.audit.action,
      table_name: request.audit.tableName,
      record_id: recordId ? parseInt(recordId) : null,
      old_value: null, // Never log actual health data
      new_value: null, // Never log actual health data
      ip_address: ipAddress,
      user_agent: userAgent,
      createdAt: request.audit.timestamp || new Date(),
      updatedAt: new Date()
    };

    // Log to database
    await AuditService.createAuditLog(auditData, {
      user_name: userName,
      user_email: request.user?.email || null,
    });
    
    // Also log via Pino (for external systems)
    if (request.log) {
      request.log.info({
        type: 'audit',
        ...auditData
      }, `Health data ${request.audit.action} on ${request.audit.tableName}`);
    }
  } catch (error) {
    // Don't fail the request if audit logging fails, but log the error
    logger.error('Audit logging error:', error)
    if (request.log) {
      request.log.error({ err: error }, 'Failed to create audit log');
    }
  }
};

/**
 * Helper function to log audit from controllers
 * Use this when you need more control over what gets logged
 * 
 * @param {Object} request - Fastify request object
 * @param {string} action - Action type: 'CREATE', 'READ', 'UPDATE', 'DELETE'
 * @param {string} tableName - Table/resource name
 * @param {number|null} recordId - Record ID (optional)
 */
export const logAudit = async (request, action, tableName, recordId = null) => {
  try {
    // Get user ID (can be string for nanoid or number)
    const userId = request.user?.id || null;
    
    const userName =
      [request.user?.firstName, request.user?.lastName].filter(Boolean).join(" ").trim() ||
      request.user?.name ||
      request.user?.fullName ||
      request.user?.email ||
      null;
    
    const ipAddress = request.ip || 
                     request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
                     request.headers['x-real-ip'] ||
                     request.socket?.remoteAddress ||
                     'unknown';
    
    const userAgent = request.headers['user-agent'] || 'unknown';
    
    const auditData = {
      user_id: userId,
      action,
      table_name: tableName,
      record_id: recordId ? parseInt(recordId) : null,
      old_value: null, // Never log actual health data
      new_value: null, // Never log actual health data
      ip_address: ipAddress,
      user_agent: userAgent,
      createdAt: new Date(),
      updatedAt: new Date()
    };

    await AuditService.createAuditLog(auditData, {
      user_name: userName,
      user_email: request.user?.email || null,
    });
    
    if (request.log) {
      request.log.info({
        type: 'audit',
        ...auditData
      }, `Health data ${action} on ${tableName}`);
    }
  } catch (error) {
    logger.error('Audit logging error:', error)
    if (request.log) {
      request.log.error({ err: error }, 'Failed to create audit log');
    }
  }
};

// Model hook for automatic audit logging (placeholder for Drizzle)
export const addAuditHooks = (model, modelName) => {
  // In Drizzle, we would implement audit logging differently
  // This is a placeholder to maintain compatibility
  logger.info(`Audit hooks would be added for ${modelName} (Drizzle implementation)`);
};

// Export audit logs schema reference
export { audit_logs } from '../db/schemas/auditLog.schema.js';