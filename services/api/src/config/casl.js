import { AbilityBuilder, createMongoAbility } from "@casl/ability";
import { ROLES, PERMISSIONS, ROLE_PERMISSIONS } from "./rbac.js";

// Define CASL actions and subjects
// These mirror the shared types in @chartwarden/types/casl
export const ACTIONS = {
  MANAGE: "manage", // Wildcard for any action
  CREATE: "create",
  READ: "read",
  UPDATE: "update",
  DELETE: "delete",
  VIEW: "view", // Custom action for viewing
  LIST: "list",
  GENERATE: "generate", // Custom action for generating reports
  APPROVE: "approve",
  SIGN: "sign",
  EXPORT: "export",
};

export const SUBJECTS = {
  ALL: "all", // Wildcard for any subject
  PATIENT: "Patient",
  USER: "User",
  STAFF: "Staff",
  CLINICAL_NOTE: "ClinicalNote",
  NURSING_NOTE: "NursingNote",
  VITAL_SIGN: "VitalSign",
  PAIN_ASSESSMENT: "PainAssessment",
  MEDICATION: "Medication",
  MAR_ENTRY: "MAREntry",
  ENCOUNTER: "Encounter",
  VISIT: "Visit",
  CLAIM: "Claim",
  ERA: "ERA",
  DENIAL: "Denial",
  CLEARINGHOUSE: "Clearinghouse",
  REPORT: "Report",
  ANALYTICS: "Analytics",
  ROLE: "Role",
  PERMISSION: "Permission",
  AUDIT_LOG: "AuditLog",
  SETTINGS: "Settings",
  CARE_PLAN: "CarePlan",
  IDG_MEETING: "IDGMeeting",
  CERTIFICATION: "Certification",
  SIGNATURE: "Signature",
};

// Map RBAC permissions to CASL actions and subjects
const permissionToCaslMap = {
  // Patient Management
  [PERMISSIONS.VIEW_PATIENT]: {
    action: ACTIONS.VIEW,
    subject: SUBJECTS.PATIENT,
  },
  [PERMISSIONS.CREATE_PATIENT]: {
    action: ACTIONS.CREATE,
    subject: SUBJECTS.PATIENT,
  },
  [PERMISSIONS.UPDATE_PATIENT]: {
    action: ACTIONS.UPDATE,
    subject: SUBJECTS.PATIENT,
  },
  [PERMISSIONS.DELETE_PATIENT]: {
    action: ACTIONS.DELETE,
    subject: SUBJECTS.PATIENT,
  },

  // Clinical Notes
  [PERMISSIONS.VIEW_CLINICAL_NOTES]: {
    action: ACTIONS.VIEW,
    subject: SUBJECTS.CLINICAL_NOTE,
  },
  [PERMISSIONS.CREATE_CLINICAL_NOTES]: {
    action: ACTIONS.CREATE,
    subject: SUBJECTS.CLINICAL_NOTE,
  },
  [PERMISSIONS.UPDATE_CLINICAL_NOTES]: {
    action: ACTIONS.UPDATE,
    subject: SUBJECTS.CLINICAL_NOTE,
  },
  [PERMISSIONS.DELETE_CLINICAL_NOTES]: {
    action: ACTIONS.DELETE,
    subject: SUBJECTS.CLINICAL_NOTE,
  },

  // Vital Signs
  [PERMISSIONS.VIEW_VITAL_SIGNS]: {
    action: ACTIONS.VIEW,
    subject: SUBJECTS.VITAL_SIGN,
  },
  [PERMISSIONS.CREATE_VITAL_SIGNS]: {
    action: ACTIONS.CREATE,
    subject: SUBJECTS.VITAL_SIGN,
  },
  [PERMISSIONS.UPDATE_VITAL_SIGNS]: {
    action: ACTIONS.UPDATE,
    subject: SUBJECTS.VITAL_SIGN,
  },
  [PERMISSIONS.DELETE_VITAL_SIGNS]: {
    action: ACTIONS.DELETE,
    subject: SUBJECTS.VITAL_SIGN,
  },

  // Medications
  [PERMISSIONS.VIEW_MEDICATIONS]: {
    action: ACTIONS.VIEW,
    subject: SUBJECTS.MEDICATION,
  },
  [PERMISSIONS.CREATE_MEDICATIONS]: {
    action: ACTIONS.CREATE,
    subject: SUBJECTS.MEDICATION,
  },
  [PERMISSIONS.UPDATE_MEDICATIONS]: {
    action: ACTIONS.UPDATE,
    subject: SUBJECTS.MEDICATION,
  },
  [PERMISSIONS.DELETE_MEDICATIONS]: {
    action: ACTIONS.DELETE,
    subject: SUBJECTS.MEDICATION,
  },

  // Reports
  [PERMISSIONS.VIEW_REPORTS]: {
    action: ACTIONS.VIEW,
    subject: SUBJECTS.REPORT,
  },
  [PERMISSIONS.GENERATE_REPORTS]: {
    action: ACTIONS.GENERATE,
    subject: SUBJECTS.REPORT,
  },

  // Admin
  [PERMISSIONS.MANAGE_USERS]: {
    action: ACTIONS.MANAGE,
    subject: SUBJECTS.USER,
  },
  [PERMISSIONS.MANAGE_ROLES]: {
    action: ACTIONS.MANAGE,
    subject: SUBJECTS.ROLE,
  },
  [PERMISSIONS.MANAGE_PERMISSIONS]: {
    action: ACTIONS.MANAGE,
    subject: SUBJECTS.PERMISSION,
  },
  [PERMISSIONS.VIEW_AUDIT_LOGS]: {
    action: ACTIONS.VIEW,
    subject: SUBJECTS.AUDIT_LOG,
  },
};

/**
 * Extended permission map including new subjects
 */
const extendedPermissionMap = {
  ...permissionToCaslMap,
  // Signatures
  "view:signature": { action: ACTIONS.VIEW, subject: SUBJECTS.SIGNATURE },
  "sign:signature": { action: ACTIONS.SIGN, subject: SUBJECTS.SIGNATURE },
  // Encounters
  "view:encounter": { action: ACTIONS.VIEW, subject: SUBJECTS.ENCOUNTER },
  "create:encounter": { action: ACTIONS.CREATE, subject: SUBJECTS.ENCOUNTER },
  "update:encounter": { action: ACTIONS.UPDATE, subject: SUBJECTS.ENCOUNTER },
  // Claims/Billing
  "view:claim": { action: ACTIONS.VIEW, subject: SUBJECTS.CLAIM },
  "create:claim": { action: ACTIONS.CREATE, subject: SUBJECTS.CLAIM },
  "view:denial": { action: ACTIONS.VIEW, subject: SUBJECTS.DENIAL },
  "manage:denial": { action: ACTIONS.MANAGE, subject: SUBJECTS.DENIAL },
  // Analytics
  "view:analytics": { action: ACTIONS.VIEW, subject: SUBJECTS.ANALYTICS },
  "export:analytics": { action: ACTIONS.EXPORT, subject: SUBJECTS.ANALYTICS },
  // Care Plans
  "view:care_plan": { action: ACTIONS.VIEW, subject: SUBJECTS.CARE_PLAN },
  "create:care_plan": { action: ACTIONS.CREATE, subject: SUBJECTS.CARE_PLAN },
  "update:care_plan": { action: ACTIONS.UPDATE, subject: SUBJECTS.CARE_PLAN },
  "approve:care_plan": { action: ACTIONS.APPROVE, subject: SUBJECTS.CARE_PLAN },
  // IDG Meetings
  "view:idg_meeting": { action: ACTIONS.VIEW, subject: SUBJECTS.IDG_MEETING },
  "create:idg_meeting": { action: ACTIONS.CREATE, subject: SUBJECTS.IDG_MEETING },
  // Certifications
  "view:certification": { action: ACTIONS.VIEW, subject: SUBJECTS.CERTIFICATION },
  "approve:certification": { action: ACTIONS.APPROVE, subject: SUBJECTS.CERTIFICATION },
  // Settings
  "manage:settings": { action: ACTIONS.MANAGE, subject: SUBJECTS.SETTINGS },
  // Staff
  "view:staff": { action: ACTIONS.VIEW, subject: SUBJECTS.STAFF },
};

/**
 * Role to permissions mapping for extended roles
 * This supplements ROLE_PERMISSIONS for roles not in the base RBAC config
 */
const EXTENDED_ROLE_PERMISSIONS = {
  physician: [
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
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
  ],
  rn: [
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.UPDATE_PATIENT,
    PERMISSIONS.VIEW_CLINICAL_NOTES,
    PERMISSIONS.CREATE_CLINICAL_NOTES,
    PERMISSIONS.UPDATE_CLINICAL_NOTES,
    PERMISSIONS.VIEW_VITAL_SIGNS,
    PERMISSIONS.CREATE_VITAL_SIGNS,
    PERMISSIONS.UPDATE_VITAL_SIGNS,
    PERMISSIONS.VIEW_MEDICATIONS,
  ],
  lpn: [
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.UPDATE_PATIENT,
    PERMISSIONS.VIEW_CLINICAL_NOTES,
    PERMISSIONS.CREATE_CLINICAL_NOTES,
    PERMISSIONS.UPDATE_CLINICAL_NOTES,
    PERMISSIONS.VIEW_VITAL_SIGNS,
    PERMISSIONS.CREATE_VITAL_SIGNS,
    PERMISSIONS.UPDATE_VITAL_SIGNS,
    PERMISSIONS.VIEW_MEDICATIONS,
  ],
  cna: [
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.VIEW_CLINICAL_NOTES,
    PERMISSIONS.VIEW_VITAL_SIGNS,
    PERMISSIONS.CREATE_VITAL_SIGNS,
  ],
  social_worker: [
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.UPDATE_PATIENT,
    PERMISSIONS.VIEW_CLINICAL_NOTES,
    PERMISSIONS.CREATE_CLINICAL_NOTES,
    PERMISSIONS.VIEW_VITAL_SIGNS,
  ],
  chaplain: [
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.VIEW_CLINICAL_NOTES,
    PERMISSIONS.CREATE_CLINICAL_NOTES,
    PERMISSIONS.VIEW_VITAL_SIGNS,
  ],
  billing: [
    PERMISSIONS.VIEW_PATIENT,
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
  ],
  scheduler: [
    PERMISSIONS.VIEW_PATIENT,
  ],
  medical_director: [
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
    PERMISSIONS.VIEW_REPORTS,
    PERMISSIONS.GENERATE_REPORTS,
    PERMISSIONS.VIEW_AUDIT_LOGS,
  ],
};

/**
 * Function to define user abilities based on their role
 * Supports ownership-based permissions via conditions
 * @param {Object} user - User object with id, role, and optional patientId
 * @returns {Object} CASL ability instance
 */
export function defineUserAbilities(user) {
  const { can, cannot, build } = new AbilityBuilder(createMongoAbility);

  // Get user role (default to patient if not specified)
  const userRole = user.role || ROLES.PATIENT;

  // Get permissions for the user's role from both base and extended configs
  const basePermissions = ROLE_PERMISSIONS[userRole] || [];
  const extendedPermissions = EXTENDED_ROLE_PERMISSIONS[userRole] || [];
  const rolePermissions = [...new Set([...basePermissions, ...extendedPermissions])];

  // Grant abilities based on role permissions
  rolePermissions.forEach((permission) => {
    const caslRule = extendedPermissionMap[permission] || permissionToCaslMap[permission];
    if (caslRule) {
      can(caslRule.action, caslRule.subject);
    }
  });

  // Special rules for specific roles with ownership-based conditions
  switch (userRole) {
    case ROLES.ADMIN:
      // Admins can manage everything
      can(ACTIONS.MANAGE, SUBJECTS.ALL);
      break;

    case ROLES.DOCTOR:
    case "physician":
    case "medical_director":
      // Doctors can view all patients
      can(ACTIONS.VIEW, SUBJECTS.PATIENT);
      // Can sign documents
      can(ACTIONS.SIGN, SUBJECTS.SIGNATURE);
      // Can approve care plans and certifications
      can(ACTIONS.APPROVE, SUBJECTS.CARE_PLAN);
      can(ACTIONS.APPROVE, SUBJECTS.CERTIFICATION);
      break;

    case ROLES.NURSE:
    case "rn":
    case "lpn":
      // Nurses can sign documents
      can(ACTIONS.SIGN, SUBJECTS.SIGNATURE);
      // Can only update their own clinical notes
      can(ACTIONS.UPDATE, SUBJECTS.CLINICAL_NOTE, { createdById: user.id });
      break;

    case "cna":
      // CNAs can only update vital signs they created
      can(ACTIONS.UPDATE, SUBJECTS.VITAL_SIGN, { createdById: user.id });
      break;

    case "social_worker":
    case "chaplain":
      // Can sign documents
      can(ACTIONS.SIGN, SUBJECTS.SIGNATURE);
      // Can view care plans
      can(ACTIONS.VIEW, SUBJECTS.CARE_PLAN);
      break;

    case "billing":
      // Billing staff can manage claims and denials
      can(ACTIONS.VIEW, SUBJECTS.CLAIM);
      can(ACTIONS.CREATE, SUBJECTS.CLAIM);
      can(ACTIONS.UPDATE, SUBJECTS.CLAIM);
      can(ACTIONS.VIEW, SUBJECTS.DENIAL);
      can(ACTIONS.MANAGE, SUBJECTS.DENIAL);
      can(ACTIONS.VIEW, SUBJECTS.ERA);
      can(ACTIONS.VIEW, SUBJECTS.ANALYTICS);
      can(ACTIONS.EXPORT, SUBJECTS.ANALYTICS);
      break;

    case "scheduler":
      // Schedulers can manage encounters
      can(ACTIONS.VIEW, SUBJECTS.ENCOUNTER);
      can(ACTIONS.CREATE, SUBJECTS.ENCOUNTER);
      can(ACTIONS.UPDATE, SUBJECTS.ENCOUNTER);
      can(ACTIONS.VIEW, SUBJECTS.STAFF);
      break;

    case ROLES.PATIENT:
      // Patients can only view their own records
      if (user.patientId) {
        can(ACTIONS.VIEW, SUBJECTS.PATIENT, { id: user.patientId });
        can(ACTIONS.VIEW, SUBJECTS.MEDICATION, { patientId: user.patientId });
        can(ACTIONS.VIEW, SUBJECTS.VITAL_SIGN, { patientId: user.patientId });
        can(ACTIONS.VIEW, SUBJECTS.CLINICAL_NOTE, { patientId: user.patientId });
        can(ACTIONS.VIEW, SUBJECTS.CARE_PLAN, { patientId: user.patientId });
      } else {
        // Fallback if patientId not linked
        can(ACTIONS.VIEW, SUBJECTS.PATIENT);
      }
      break;

    case ROLES.STAFF:
      // General staff have read-only access
      can(ACTIONS.VIEW, SUBJECTS.PATIENT);
      can(ACTIONS.VIEW, SUBJECTS.CLINICAL_NOTE);
      can(ACTIONS.VIEW, SUBJECTS.VITAL_SIGN);
      can(ACTIONS.VIEW, SUBJECTS.MEDICATION);
      break;
  }

  return build();
}

/**
 * Serialize abilities to JSON for transmission to frontend
 * @param {Object} ability - CASL ability instance
 * @param {Object} user - User object
 * @returns {Object} Serialized abilities
 */
export function serializeAbilities(ability, user) {
  return {
    rules: ability.rules.map((rule) => ({
      action: rule.action,
      subject: rule.subject,
      conditions: rule.conditions,
      fields: rule.fields,
      inverted: rule.inverted,
      reason: rule.reason,
    })),
    user: {
      id: user.id,
      role: user.role,
    },
  };
}

// Function to check if user can perform an action on a subject
export function canUser(user, action, subject) {
  const ability = defineUserAbilities(user);
  return ability.can(action, subject);
}

// Function to check if user cannot perform an action on a subject
export function cannotUser(user, action, subject) {
  const ability = defineUserAbilities(user);
  return ability.cannot(action, subject);
}

// CASL middleware for Fastify
export function requireCaslAbility(action, subject) {
  return async (request, reply) => {
    // Check if user is authenticated
    if (!request.user) {
      reply.code(401);
      return {
        status: 401,
        message: "Access denied. Authentication required.",
      };
    }

    // Check if user has the required ability
    const ability = defineUserAbilities(request.user);
    if (ability.cannot(action, subject)) {
      reply.code(403);
      return {
        status: 403,
        message: "Access denied. Insufficient permissions.",
      };
    }

    // Attach ability to request for further use
    request.ability = ability;
  };
}

export default {
  ACTIONS,
  SUBJECTS,
  defineUserAbilities,
  serializeAbilities,
  canUser,
  cannotUser,
  requireCaslAbility,
};
