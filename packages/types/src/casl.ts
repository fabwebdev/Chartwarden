// =============================================================================
// CASL Isomorphic Authorization Definitions
// Shared between frontend and backend for consistent permission checking
// =============================================================================

/**
 * CASL Actions - Standard CRUD operations plus custom actions
 */
export const CASL_ACTIONS = {
  // Standard actions
  MANAGE: 'manage', // Wildcard for any action
  CREATE: 'create',
  READ: 'read',
  UPDATE: 'update',
  DELETE: 'delete',

  // Custom actions
  VIEW: 'view',
  LIST: 'list',
  GENERATE: 'generate',
  APPROVE: 'approve',
  SIGN: 'sign',
  EXPORT: 'export',
} as const;

export type CaslAction = typeof CASL_ACTIONS[keyof typeof CASL_ACTIONS];

/**
 * CASL Subjects - Entity types that can be authorized
 */
export const CASL_SUBJECTS = {
  // All subjects wildcard
  ALL: 'all',

  // Core entities
  PATIENT: 'Patient',
  USER: 'User',
  STAFF: 'Staff',

  // Clinical documentation
  CLINICAL_NOTE: 'ClinicalNote',
  NURSING_NOTE: 'NursingNote',
  VITAL_SIGN: 'VitalSign',
  PAIN_ASSESSMENT: 'PainAssessment',

  // Medications
  MEDICATION: 'Medication',
  MAR_ENTRY: 'MAREntry',

  // Encounters
  ENCOUNTER: 'Encounter',
  VISIT: 'Visit',

  // Billing & Claims
  CLAIM: 'Claim',
  ERA: 'ERA',
  DENIAL: 'Denial',
  CLEARINGHOUSE: 'Clearinghouse',

  // Reports
  REPORT: 'Report',
  ANALYTICS: 'Analytics',

  // Administration
  ROLE: 'Role',
  PERMISSION: 'Permission',
  AUDIT_LOG: 'AuditLog',
  SETTINGS: 'Settings',

  // Care Plans
  CARE_PLAN: 'CarePlan',
  IDG_MEETING: 'IDGMeeting',

  // Certifications
  CERTIFICATION: 'Certification',

  // Signatures
  SIGNATURE: 'Signature',
} as const;

export type CaslSubject = typeof CASL_SUBJECTS[keyof typeof CASL_SUBJECTS];

/**
 * Roles in the system
 */
export const CASL_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  PHYSICIAN: 'physician',
  NURSE: 'nurse',
  RN: 'rn',
  LPN: 'lpn',
  CNA: 'cna',
  SOCIAL_WORKER: 'social_worker',
  CHAPLAIN: 'chaplain',
  AIDE: 'aide',
  BILLING: 'billing',
  SCHEDULER: 'scheduler',
  MEDICAL_DIRECTOR: 'medical_director',
  PATIENT: 'patient',
  STAFF: 'staff',
} as const;

export type CaslRole = typeof CASL_ROLES[keyof typeof CASL_ROLES];

/**
 * Subject entity interface for ownership-based rules
 */
export interface SubjectEntity {
  __typename?: CaslSubject;
  id?: string;
  ownerId?: string;
  createdById?: string;
  patientId?: string;
  staffId?: string;
  departmentId?: string;
}

/**
 * User context for ability generation
 */
export interface AbilityUser {
  id: string;
  email?: string;
  role: CaslRole | string;
  permissions?: string[];
  departmentId?: string;
  patientId?: string; // For patient users
}

/**
 * Serialized ability rules for transmission
 */
export interface SerializedAbilityRule {
  action: CaslAction | CaslAction[];
  subject: CaslSubject | CaslSubject[];
  conditions?: Record<string, unknown>;
  fields?: string[];
  inverted?: boolean;
  reason?: string;
}

/**
 * Serialized abilities package sent from server to client
 */
export interface SerializedAbilities {
  rules: SerializedAbilityRule[];
  user: {
    id: string;
    role: string;
  };
}

/**
 * Permission mapping from RBAC permissions to CASL action/subject pairs
 */
export const PERMISSION_TO_CASL_MAP: Record<string, { action: CaslAction; subject: CaslSubject }> = {
  // Patient Management
  'view:patient': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.PATIENT },
  'create:patient': { action: CASL_ACTIONS.CREATE, subject: CASL_SUBJECTS.PATIENT },
  'update:patient': { action: CASL_ACTIONS.UPDATE, subject: CASL_SUBJECTS.PATIENT },
  'delete:patient': { action: CASL_ACTIONS.DELETE, subject: CASL_SUBJECTS.PATIENT },

  // Clinical Notes
  'view:clinical_notes': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.CLINICAL_NOTE },
  'create:clinical_notes': { action: CASL_ACTIONS.CREATE, subject: CASL_SUBJECTS.CLINICAL_NOTE },
  'update:clinical_notes': { action: CASL_ACTIONS.UPDATE, subject: CASL_SUBJECTS.CLINICAL_NOTE },
  'delete:clinical_notes': { action: CASL_ACTIONS.DELETE, subject: CASL_SUBJECTS.CLINICAL_NOTE },

  // Vital Signs
  'view:vital_signs': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.VITAL_SIGN },
  'create:vital_signs': { action: CASL_ACTIONS.CREATE, subject: CASL_SUBJECTS.VITAL_SIGN },
  'update:vital_signs': { action: CASL_ACTIONS.UPDATE, subject: CASL_SUBJECTS.VITAL_SIGN },
  'delete:vital_signs': { action: CASL_ACTIONS.DELETE, subject: CASL_SUBJECTS.VITAL_SIGN },

  // Medications
  'view:medications': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.MEDICATION },
  'create:medications': { action: CASL_ACTIONS.CREATE, subject: CASL_SUBJECTS.MEDICATION },
  'update:medications': { action: CASL_ACTIONS.UPDATE, subject: CASL_SUBJECTS.MEDICATION },
  'delete:medications': { action: CASL_ACTIONS.DELETE, subject: CASL_SUBJECTS.MEDICATION },

  // Reports
  'view:reports': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.REPORT },
  'generate:reports': { action: CASL_ACTIONS.GENERATE, subject: CASL_SUBJECTS.REPORT },

  // Admin
  'manage:users': { action: CASL_ACTIONS.MANAGE, subject: CASL_SUBJECTS.USER },
  'manage:roles': { action: CASL_ACTIONS.MANAGE, subject: CASL_SUBJECTS.ROLE },
  'manage:permissions': { action: CASL_ACTIONS.MANAGE, subject: CASL_SUBJECTS.PERMISSION },
  'view:audit_logs': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.AUDIT_LOG },
  'manage:settings': { action: CASL_ACTIONS.MANAGE, subject: CASL_SUBJECTS.SETTINGS },

  // Signatures
  'view:signature': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.SIGNATURE },
  'sign:signature': { action: CASL_ACTIONS.SIGN, subject: CASL_SUBJECTS.SIGNATURE },

  // Encounters
  'view:encounter': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.ENCOUNTER },
  'create:encounter': { action: CASL_ACTIONS.CREATE, subject: CASL_SUBJECTS.ENCOUNTER },
  'update:encounter': { action: CASL_ACTIONS.UPDATE, subject: CASL_SUBJECTS.ENCOUNTER },

  // Claims/Billing
  'view:claim': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.CLAIM },
  'create:claim': { action: CASL_ACTIONS.CREATE, subject: CASL_SUBJECTS.CLAIM },
  'view:denial': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.DENIAL },
  'manage:denial': { action: CASL_ACTIONS.MANAGE, subject: CASL_SUBJECTS.DENIAL },

  // Analytics
  'view:analytics': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.ANALYTICS },
  'export:analytics': { action: CASL_ACTIONS.EXPORT, subject: CASL_SUBJECTS.ANALYTICS },

  // Care Plans
  'view:care_plan': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.CARE_PLAN },
  'create:care_plan': { action: CASL_ACTIONS.CREATE, subject: CASL_SUBJECTS.CARE_PLAN },
  'update:care_plan': { action: CASL_ACTIONS.UPDATE, subject: CASL_SUBJECTS.CARE_PLAN },
  'approve:care_plan': { action: CASL_ACTIONS.APPROVE, subject: CASL_SUBJECTS.CARE_PLAN },

  // IDG Meetings
  'view:idg_meeting': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.IDG_MEETING },
  'create:idg_meeting': { action: CASL_ACTIONS.CREATE, subject: CASL_SUBJECTS.IDG_MEETING },

  // Certifications
  'view:certification': { action: CASL_ACTIONS.VIEW, subject: CASL_SUBJECTS.CERTIFICATION },
  'approve:certification': { action: CASL_ACTIONS.APPROVE, subject: CASL_SUBJECTS.CERTIFICATION },
} as const;

/**
 * Role to permissions mapping (mirroring RBAC)
 */
export const ROLE_PERMISSIONS_MAP: Record<string, string[]> = {
  admin: [
    'view:patient', 'create:patient', 'update:patient', 'delete:patient',
    'view:clinical_notes', 'create:clinical_notes', 'update:clinical_notes', 'delete:clinical_notes',
    'view:vital_signs', 'create:vital_signs', 'update:vital_signs', 'delete:vital_signs',
    'view:medications', 'create:medications', 'update:medications', 'delete:medications',
    'view:reports', 'generate:reports',
    'manage:users', 'manage:roles', 'manage:permissions', 'view:audit_logs', 'manage:settings',
    'view:signature', 'sign:signature',
    'view:encounter', 'create:encounter', 'update:encounter',
    'view:claim', 'create:claim', 'view:denial', 'manage:denial',
    'view:analytics', 'export:analytics',
    'view:care_plan', 'create:care_plan', 'update:care_plan', 'approve:care_plan',
    'view:idg_meeting', 'create:idg_meeting',
    'view:certification', 'approve:certification',
  ],
  doctor: [
    'view:patient', 'create:patient', 'update:patient',
    'view:clinical_notes', 'create:clinical_notes', 'update:clinical_notes',
    'view:vital_signs', 'create:vital_signs', 'update:vital_signs',
    'view:medications', 'create:medications', 'update:medications',
    'view:reports', 'generate:reports',
    'view:signature', 'sign:signature',
    'view:encounter', 'create:encounter', 'update:encounter',
    'view:care_plan', 'create:care_plan', 'update:care_plan', 'approve:care_plan',
    'view:idg_meeting', 'create:idg_meeting',
    'view:certification', 'approve:certification',
  ],
  physician: [
    'view:patient', 'create:patient', 'update:patient',
    'view:clinical_notes', 'create:clinical_notes', 'update:clinical_notes',
    'view:vital_signs', 'create:vital_signs', 'update:vital_signs',
    'view:medications', 'create:medications', 'update:medications',
    'view:reports', 'generate:reports',
    'view:signature', 'sign:signature',
    'view:encounter', 'create:encounter', 'update:encounter',
    'view:care_plan', 'create:care_plan', 'update:care_plan', 'approve:care_plan',
    'view:idg_meeting', 'create:idg_meeting',
    'view:certification', 'approve:certification',
  ],
  nurse: [
    'view:patient', 'update:patient',
    'view:clinical_notes', 'create:clinical_notes', 'update:clinical_notes',
    'view:vital_signs', 'create:vital_signs', 'update:vital_signs',
    'view:medications',
    'view:signature', 'sign:signature',
    'view:encounter', 'create:encounter', 'update:encounter',
    'view:care_plan', 'view:idg_meeting',
  ],
  rn: [
    'view:patient', 'update:patient',
    'view:clinical_notes', 'create:clinical_notes', 'update:clinical_notes',
    'view:vital_signs', 'create:vital_signs', 'update:vital_signs',
    'view:medications',
    'view:signature', 'sign:signature',
    'view:encounter', 'create:encounter', 'update:encounter',
    'view:care_plan', 'create:care_plan',
    'view:idg_meeting',
  ],
  lpn: [
    'view:patient', 'update:patient',
    'view:clinical_notes', 'create:clinical_notes', 'update:clinical_notes',
    'view:vital_signs', 'create:vital_signs', 'update:vital_signs',
    'view:medications',
    'view:signature', 'sign:signature',
    'view:encounter', 'update:encounter',
  ],
  cna: [
    'view:patient',
    'view:clinical_notes',
    'view:vital_signs', 'create:vital_signs',
    'view:encounter', 'update:encounter',
  ],
  social_worker: [
    'view:patient', 'update:patient',
    'view:clinical_notes', 'create:clinical_notes',
    'view:vital_signs',
    'view:signature', 'sign:signature',
    'view:encounter', 'create:encounter',
    'view:care_plan', 'update:care_plan',
    'view:idg_meeting',
  ],
  chaplain: [
    'view:patient',
    'view:clinical_notes', 'create:clinical_notes',
    'view:vital_signs',
    'view:signature', 'sign:signature',
    'view:encounter', 'create:encounter',
    'view:idg_meeting',
  ],
  billing: [
    'view:patient',
    'view:claim', 'create:claim',
    'view:denial', 'manage:denial',
    'view:reports', 'generate:reports',
    'view:analytics', 'export:analytics',
  ],
  scheduler: [
    'view:patient',
    'view:encounter', 'create:encounter', 'update:encounter',
    'view:staff',
  ],
  patient: [
    'view:patient', // Own records only (filtered by conditions)
  ],
  staff: [
    'view:patient',
    'view:clinical_notes',
    'view:vital_signs',
    'view:medications',
  ],
};

/**
 * Helper to get permissions for a role
 */
export function getPermissionsForRole(role: string): string[] {
  return ROLE_PERMISSIONS_MAP[role.toLowerCase()] || [];
}

/**
 * Helper to check if a role has a specific permission
 */
export function roleHasPermission(role: string, permission: string): boolean {
  const permissions = getPermissionsForRole(role);
  return permissions.includes(permission);
}
