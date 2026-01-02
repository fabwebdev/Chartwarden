// RBAC Configuration for the application
// Role-Based Access Control with ABAC integration

// Define roles
export const ROLES = {
  ADMIN: "admin",
  DOCTOR: "doctor",
  NURSE: "nurse",
  PATIENT: "patient",
  STAFF: "staff",
};

// Define permissions
export const PERMISSIONS = {
  // Patient Management
  VIEW_PATIENT: "view:patient",
  CREATE_PATIENT: "create:patient",
  UPDATE_PATIENT: "update:patient",
  DELETE_PATIENT: "delete:patient",

  // Clinical Notes
  VIEW_CLINICAL_NOTES: "view:clinical_notes",
  CREATE_CLINICAL_NOTES: "create:clinical_notes",
  UPDATE_CLINICAL_NOTES: "update:clinical_notes",
  DELETE_CLINICAL_NOTES: "delete:clinical_notes",

  // Vital Signs
  VIEW_VITAL_SIGNS: "view:vital_signs",
  CREATE_VITAL_SIGNS: "create:vital_signs",
  UPDATE_VITAL_SIGNS: "update:vital_signs",
  DELETE_VITAL_SIGNS: "delete:vital_signs",

  // Medications
  VIEW_MEDICATIONS: "view:medications",
  CREATE_MEDICATIONS: "create:medications",
  UPDATE_MEDICATIONS: "update:medications",
  DELETE_MEDICATIONS: "delete:medications",

  // Pain Assessments
  VIEW_PAIN_ASSESSMENTS: "view:pain_assessments",
  CREATE_PAIN_ASSESSMENTS: "create:pain_assessments",
  UPDATE_PAIN_ASSESSMENTS: "update:pain_assessments",
  DELETE_PAIN_ASSESSMENTS: "delete:pain_assessments",

  // Nutrition Assessments
  VIEW_NUTRITION: "view:nutrition",
  CREATE_NUTRITION: "create:nutrition",
  UPDATE_NUTRITION: "update:nutrition",
  DELETE_NUTRITION: "delete:nutrition",

  // Eligibility & Coverage Verification
  ELIGIBILITY_VIEW: "eligibility:view",
  ELIGIBILITY_VERIFY: "eligibility:verify",
  ELIGIBILITY_BATCH_VERIFY: "eligibility:batch-verify",
  ELIGIBILITY_PROCESS: "eligibility:process",
  ELIGIBILITY_MANAGE: "eligibility:manage",

  // Staff/User Management
  VIEW_USERS: "view:users",
  CREATE_USER: "create:user",
  UPDATE_USER: "update:user",
  DELETE_USER: "delete:user",

  // Reports
  VIEW_REPORTS: "view:reports",
  GENERATE_REPORTS: "generate:reports",
  DELETE_REPORTS: "delete:reports",

  // Patient Details (used by report access)
  VIEW_PATIENT_DETAILS: "view:patient_details",

  // Admin
  MANAGE_USERS: "manage:users",
  MANAGE_ROLES: "manage:roles",
  MANAGE_PERMISSIONS: "manage:permissions",
  VIEW_AUDIT_LOGS: "view:audit_logs",
  MANAGE_SETTINGS: "manage:settings",
};

// Define role-permission mappings
export const ROLE_PERMISSIONS = {
  [ROLES.ADMIN]: [
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.CREATE_PATIENT,
    PERMISSIONS.UPDATE_PATIENT,
    PERMISSIONS.DELETE_PATIENT,
    PERMISSIONS.VIEW_CLINICAL_NOTES,
    PERMISSIONS.CREATE_CLINICAL_NOTES,
    PERMISSIONS.UPDATE_CLINICAL_NOTES,
    PERMISSIONS.DELETE_CLINICAL_NOTES,
    PERMISSIONS.VIEW_VITAL_SIGNS,
    PERMISSIONS.CREATE_VITAL_SIGNS,
    PERMISSIONS.UPDATE_VITAL_SIGNS,
    PERMISSIONS.DELETE_VITAL_SIGNS,
    PERMISSIONS.VIEW_MEDICATIONS,
    PERMISSIONS.CREATE_MEDICATIONS,
    PERMISSIONS.UPDATE_MEDICATIONS,
    PERMISSIONS.DELETE_MEDICATIONS,
    // Pain Assessments - Admin has all permissions
    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,
    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,
    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,
    PERMISSIONS.DELETE_PAIN_ASSESSMENTS,
    // Nutrition Assessments - Admin has all permissions
    PERMISSIONS.VIEW_NUTRITION,
    PERMISSIONS.CREATE_NUTRITION,
    PERMISSIONS.UPDATE_NUTRITION,
    PERMISSIONS.DELETE_NUTRITION,
    // Eligibility - Admin has all permissions
    PERMISSIONS.ELIGIBILITY_VIEW,
    PERMISSIONS.ELIGIBILITY_VERIFY,
    PERMISSIONS.ELIGIBILITY_BATCH_VERIFY,
    PERMISSIONS.ELIGIBILITY_PROCESS,
    PERMISSIONS.ELIGIBILITY_MANAGE,
    // Staff/User Management - Admin has all permissions
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.CREATE_USER,
    PERMISSIONS.UPDATE_USER,
    PERMISSIONS.DELETE_USER,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.DELETE_REPORTS,
    PERMISSIONS.VIEW_PATIENT_DETAILS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.MANAGE_ROLES,
    PERMISSIONS.MANAGE_PERMISSIONS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
    PERMISSIONS.MANAGE_SETTINGS,
  ],

  [ROLES.DOCTOR]: [
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.CREATE_PATIENT,
    PERMISSIONS.UPDATE_PATIENT,
    PERMISSIONS.VIEW_CLINICAL_NOTES,
    PERMISSIONS.CREATE_CLINICAL_NOTES,
    PERMISSIONS.UPDATE_CLINICAL_NOTES,
    PERMISSIONS.VIEW_VITAL_SIGNS,
    PERMISSIONS.CREATE_VITAL_SIGNS,
    PERMISSIONS.UPDATE_VITAL_SIGNS,
    PERMISSIONS.VIEW_MEDICATIONS,
    PERMISSIONS.CREATE_MEDICATIONS,
    PERMISSIONS.UPDATE_MEDICATIONS,
    // Pain Assessments - Doctors can view, create, and update
    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,
    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,
    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,
    // Nutrition Assessments - Doctors can view, create, and update
    PERMISSIONS.VIEW_NUTRITION,
    PERMISSIONS.CREATE_NUTRITION,
    PERMISSIONS.UPDATE_NUTRITION,
    // Eligibility - Doctors can view and verify
    PERMISSIONS.ELIGIBILITY_VIEW,
    PERMISSIONS.ELIGIBILITY_VERIFY,
    // Staff/User Management - Doctors can view staff
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_PATIENT_DETAILS,
  ],

  [ROLES.NURSE]: [
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.UPDATE_PATIENT,
    PERMISSIONS.VIEW_CLINICAL_NOTES,
    PERMISSIONS.CREATE_CLINICAL_NOTES,
    PERMISSIONS.UPDATE_CLINICAL_NOTES,
    PERMISSIONS.VIEW_VITAL_SIGNS,
    PERMISSIONS.CREATE_VITAL_SIGNS,
    PERMISSIONS.UPDATE_VITAL_SIGNS,
    PERMISSIONS.VIEW_MEDICATIONS,
    // Pain Assessments - Nurses can view, create, and update
    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,
    PERMISSIONS.CREATE_PAIN_ASSESSMENTS,
    PERMISSIONS.UPDATE_PAIN_ASSESSMENTS,
    // Nutrition Assessments - Nurses can view, create, and update
    PERMISSIONS.VIEW_NUTRITION,
    PERMISSIONS.CREATE_NUTRITION,
    PERMISSIONS.UPDATE_NUTRITION,
    // Eligibility - Nurses can view coverage
    PERMISSIONS.ELIGIBILITY_VIEW,
    // Staff/User Management - Nurses can view staff
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_PATIENT_DETAILS,
  ],

  [ROLES.PATIENT]: [PERMISSIONS.VIEW_PATIENT],

  [ROLES.STAFF]: [
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.VIEW_CLINICAL_NOTES,
    PERMISSIONS.VIEW_VITAL_SIGNS,
    PERMISSIONS.VIEW_MEDICATIONS,
    // Pain Assessments - Staff can view
    PERMISSIONS.VIEW_PAIN_ASSESSMENTS,
    // Nutrition Assessments - Staff can view
    PERMISSIONS.VIEW_NUTRITION,
    // Eligibility - Staff can view and verify (billing staff role)
    PERMISSIONS.ELIGIBILITY_VIEW,
    PERMISSIONS.ELIGIBILITY_VERIFY,
    PERMISSIONS.ELIGIBILITY_BATCH_VERIFY,
    // Staff/User Management - Staff can view other staff
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.VIEW_PATIENT_DETAILS,
  ],
};

// Helper function to check if a role has a specific permission
export function hasPermission(role, permission) {
  const permissions = ROLE_PERMISSIONS[role];
  return permissions ? permissions.includes(permission) : false;
}

// Helper function to check if a user has a specific permission
export function userHasPermission(userRole, requiredPermission) {
  return hasPermission(userRole, requiredPermission);
}

// Helper function to check if a user has any of the required permissions
export function userHasAnyPermission(userRole, requiredPermissions) {
  return requiredPermissions.some((permission) =>
    hasPermission(userRole, permission)
  );
}

// Helper function to check if a user has all of the required permissions
export function userHasAllPermissions(userRole, requiredPermissions) {
  return requiredPermissions.every((permission) =>
    hasPermission(userRole, permission)
  );
}

export default {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  hasPermission,
  userHasPermission,
  userHasAnyPermission,
  userHasAllPermissions,
};
