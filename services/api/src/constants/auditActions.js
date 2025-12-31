/**
 * HIPAA-Compliant Audit Action Constants
 *
 * Standardized action types for comprehensive audit logging.
 * These actions cover all HIPAA-required access tracking.
 *
 * Format: CATEGORY_ACTION
 * Categories:
 *   - AUTH: Authentication events
 *   - PHI: Protected Health Information access
 *   - PATIENT: Patient record operations
 *   - CLINICAL: Clinical data operations
 *   - ADMIN: Administrative operations
 *   - SYSTEM: System-level events
 *   - COMPLIANCE: Compliance-specific events
 */

export const AuditActions = {
  // Authentication Events
  AUTH_LOGIN: 'AUTH_LOGIN',
  AUTH_LOGIN_FAILED: 'AUTH_LOGIN_FAILED',
  AUTH_LOGOUT: 'AUTH_LOGOUT',
  AUTH_PASSWORD_CHANGE: 'AUTH_PASSWORD_CHANGE',
  AUTH_PASSWORD_RESET_REQUEST: 'AUTH_PASSWORD_RESET_REQUEST',
  AUTH_PASSWORD_RESET_COMPLETE: 'AUTH_PASSWORD_RESET_COMPLETE',
  AUTH_MFA_ENABLED: 'AUTH_MFA_ENABLED',
  AUTH_MFA_DISABLED: 'AUTH_MFA_DISABLED',
  AUTH_MFA_VERIFIED: 'AUTH_MFA_VERIFIED',
  AUTH_MFA_FAILED: 'AUTH_MFA_FAILED',
  AUTH_SESSION_CREATED: 'AUTH_SESSION_CREATED',
  AUTH_SESSION_EXPIRED: 'AUTH_SESSION_EXPIRED',
  AUTH_SESSION_REVOKED: 'AUTH_SESSION_REVOKED',
  AUTH_ACCOUNT_LOCKED: 'AUTH_ACCOUNT_LOCKED',
  AUTH_ACCOUNT_UNLOCKED: 'AUTH_ACCOUNT_UNLOCKED',

  // PHI Access Events (Required for HIPAA)
  PHI_VIEW: 'PHI_VIEW',
  PHI_SEARCH: 'PHI_SEARCH',
  PHI_EXPORT: 'PHI_EXPORT',
  PHI_PRINT: 'PHI_PRINT',
  PHI_DOWNLOAD: 'PHI_DOWNLOAD',
  PHI_EMAIL: 'PHI_EMAIL',
  PHI_FAX: 'PHI_FAX',
  PHI_DISCLOSURE: 'PHI_DISCLOSURE',
  PHI_AMENDMENT_REQUEST: 'PHI_AMENDMENT_REQUEST',
  PHI_AMENDMENT_APPROVED: 'PHI_AMENDMENT_APPROVED',
  PHI_AMENDMENT_DENIED: 'PHI_AMENDMENT_DENIED',

  // Patient Record Operations
  PATIENT_CREATE: 'PATIENT_CREATE',
  PATIENT_READ: 'PATIENT_READ',
  PATIENT_UPDATE: 'PATIENT_UPDATE',
  PATIENT_DELETE: 'PATIENT_DELETE',
  PATIENT_ADMIT: 'PATIENT_ADMIT',
  PATIENT_DISCHARGE: 'PATIENT_DISCHARGE',
  PATIENT_TRANSFER: 'PATIENT_TRANSFER',
  PATIENT_MERGE: 'PATIENT_MERGE',
  PATIENT_UNMERGE: 'PATIENT_UNMERGE',

  // Clinical Data Operations
  CLINICAL_NOTE_CREATE: 'CLINICAL_NOTE_CREATE',
  CLINICAL_NOTE_READ: 'CLINICAL_NOTE_READ',
  CLINICAL_NOTE_UPDATE: 'CLINICAL_NOTE_UPDATE',
  CLINICAL_NOTE_SIGN: 'CLINICAL_NOTE_SIGN',
  CLINICAL_NOTE_COSIGN: 'CLINICAL_NOTE_COSIGN',
  CLINICAL_NOTE_ADDENDUM: 'CLINICAL_NOTE_ADDENDUM',
  CLINICAL_ORDER_CREATE: 'CLINICAL_ORDER_CREATE',
  CLINICAL_ORDER_READ: 'CLINICAL_ORDER_READ',
  CLINICAL_ORDER_UPDATE: 'CLINICAL_ORDER_UPDATE',
  CLINICAL_ORDER_DISCONTINUE: 'CLINICAL_ORDER_DISCONTINUE',
  CLINICAL_ORDER_SIGN: 'CLINICAL_ORDER_SIGN',
  CLINICAL_MEDICATION_ADMINISTER: 'CLINICAL_MEDICATION_ADMINISTER',
  CLINICAL_MEDICATION_REFUSE: 'CLINICAL_MEDICATION_REFUSE',
  CLINICAL_MEDICATION_HOLD: 'CLINICAL_MEDICATION_HOLD',
  CLINICAL_ASSESSMENT_CREATE: 'CLINICAL_ASSESSMENT_CREATE',
  CLINICAL_ASSESSMENT_UPDATE: 'CLINICAL_ASSESSMENT_UPDATE',
  CLINICAL_CARE_PLAN_CREATE: 'CLINICAL_CARE_PLAN_CREATE',
  CLINICAL_CARE_PLAN_UPDATE: 'CLINICAL_CARE_PLAN_UPDATE',
  CLINICAL_ENCOUNTER_CREATE: 'CLINICAL_ENCOUNTER_CREATE',
  CLINICAL_ENCOUNTER_UPDATE: 'CLINICAL_ENCOUNTER_UPDATE',
  CLINICAL_ENCOUNTER_CLOSE: 'CLINICAL_ENCOUNTER_CLOSE',

  // Administrative Operations
  ADMIN_USER_CREATE: 'ADMIN_USER_CREATE',
  ADMIN_USER_UPDATE: 'ADMIN_USER_UPDATE',
  ADMIN_USER_DELETE: 'ADMIN_USER_DELETE',
  ADMIN_USER_DEACTIVATE: 'ADMIN_USER_DEACTIVATE',
  ADMIN_USER_REACTIVATE: 'ADMIN_USER_REACTIVATE',
  ADMIN_ROLE_ASSIGN: 'ADMIN_ROLE_ASSIGN',
  ADMIN_ROLE_REVOKE: 'ADMIN_ROLE_REVOKE',
  ADMIN_PERMISSION_GRANT: 'ADMIN_PERMISSION_GRANT',
  ADMIN_PERMISSION_REVOKE: 'ADMIN_PERMISSION_REVOKE',
  ADMIN_CONFIG_CHANGE: 'ADMIN_CONFIG_CHANGE',
  ADMIN_FACILITY_CREATE: 'ADMIN_FACILITY_CREATE',
  ADMIN_FACILITY_UPDATE: 'ADMIN_FACILITY_UPDATE',

  // System Events
  SYSTEM_STARTUP: 'SYSTEM_STARTUP',
  SYSTEM_SHUTDOWN: 'SYSTEM_SHUTDOWN',
  SYSTEM_BACKUP_START: 'SYSTEM_BACKUP_START',
  SYSTEM_BACKUP_COMPLETE: 'SYSTEM_BACKUP_COMPLETE',
  SYSTEM_BACKUP_FAILED: 'SYSTEM_BACKUP_FAILED',
  SYSTEM_RESTORE_START: 'SYSTEM_RESTORE_START',
  SYSTEM_RESTORE_COMPLETE: 'SYSTEM_RESTORE_COMPLETE',
  SYSTEM_ERROR: 'SYSTEM_ERROR',
  SYSTEM_SECURITY_ALERT: 'SYSTEM_SECURITY_ALERT',

  // Compliance Events
  COMPLIANCE_AUDIT_EXPORT: 'COMPLIANCE_AUDIT_EXPORT',
  COMPLIANCE_REPORT_GENERATED: 'COMPLIANCE_REPORT_GENERATED',
  COMPLIANCE_BREAK_GLASS: 'COMPLIANCE_BREAK_GLASS',
  COMPLIANCE_CONSENT_OBTAINED: 'COMPLIANCE_CONSENT_OBTAINED',
  COMPLIANCE_CONSENT_REVOKED: 'COMPLIANCE_CONSENT_REVOKED',
  COMPLIANCE_HIPAA_REVIEW: 'COMPLIANCE_HIPAA_REVIEW',

  // Generic CRUD (backward compatibility)
  CREATE: 'CREATE',
  READ: 'READ',
  UPDATE: 'UPDATE',
  DELETE: 'DELETE',
  LIST: 'LIST',
  SEARCH: 'SEARCH',
  EXPORT: 'EXPORT',
  IMPORT: 'IMPORT',
};

/**
 * Resource types that contain PHI
 * Used to determine when enhanced audit logging is required
 */
export const PHIResourceTypes = [
  'patients',
  'encounters',
  'medications',
  'diagnoses',
  'orders',
  'clinical_notes',
  'assessments',
  'care_plans',
  'vital_signs',
  'allergies',
  'immunizations',
  'lab_results',
  'documents',
  'consents',
  'advance_directives',
];

/**
 * Actions that always require audit logging
 * Even if the system is under high load, these must be logged
 */
export const CriticalAuditActions = [
  AuditActions.AUTH_LOGIN,
  AuditActions.AUTH_LOGIN_FAILED,
  AuditActions.AUTH_LOGOUT,
  AuditActions.AUTH_PASSWORD_CHANGE,
  AuditActions.PHI_VIEW,
  AuditActions.PHI_EXPORT,
  AuditActions.PHI_DISCLOSURE,
  AuditActions.ADMIN_USER_CREATE,
  AuditActions.ADMIN_USER_DELETE,
  AuditActions.ADMIN_ROLE_ASSIGN,
  AuditActions.ADMIN_ROLE_REVOKE,
  AuditActions.COMPLIANCE_BREAK_GLASS,
];

/**
 * Actions that indicate potential security concerns
 * These should trigger alerts
 */
export const SecurityAlertActions = [
  AuditActions.AUTH_LOGIN_FAILED,
  AuditActions.AUTH_ACCOUNT_LOCKED,
  AuditActions.AUTH_MFA_FAILED,
  AuditActions.COMPLIANCE_BREAK_GLASS,
  AuditActions.SYSTEM_SECURITY_ALERT,
];

/**
 * Audit retention periods (in years)
 * HIPAA requires minimum 6 years for PHI access logs
 */
export const AuditRetention = {
  PHI_ACCESS: 6,           // HIPAA minimum for PHI access
  AUTHENTICATION: 6,       // Keep auth logs same as PHI
  ADMINISTRATIVE: 7,       // Administrative actions
  SYSTEM: 3,               // System events
  DEFAULT: 6,              // Default retention
};

/**
 * Check if an action involves PHI
 * @param {string} action - Audit action
 * @returns {boolean}
 */
export function isPHIAction(action) {
  return action.startsWith('PHI_') ||
         action.startsWith('PATIENT_') ||
         action.startsWith('CLINICAL_');
}

/**
 * Check if an action is critical and must always be logged
 * @param {string} action - Audit action
 * @returns {boolean}
 */
export function isCriticalAction(action) {
  return CriticalAuditActions.includes(action);
}

/**
 * Check if an action should trigger a security alert
 * @param {string} action - Audit action
 * @returns {boolean}
 */
export function isSecurityAlertAction(action) {
  return SecurityAlertActions.includes(action);
}

/**
 * Get retention period for an action type
 * @param {string} action - Audit action
 * @returns {number} Years to retain
 */
export function getRetentionYears(action) {
  if (action.startsWith('PHI_') ||
      action.startsWith('PATIENT_') ||
      action.startsWith('CLINICAL_')) {
    return AuditRetention.PHI_ACCESS;
  }
  if (action.startsWith('AUTH_')) {
    return AuditRetention.AUTHENTICATION;
  }
  if (action.startsWith('ADMIN_')) {
    return AuditRetention.ADMINISTRATIVE;
  }
  if (action.startsWith('SYSTEM_')) {
    return AuditRetention.SYSTEM;
  }
  return AuditRetention.DEFAULT;
}

export default {
  AuditActions,
  PHIResourceTypes,
  CriticalAuditActions,
  SecurityAlertActions,
  AuditRetention,
  isPHIAction,
  isCriticalAction,
  isSecurityAlertAction,
  getRetentionYears,
};
