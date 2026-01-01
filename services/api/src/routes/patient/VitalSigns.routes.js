import controller from '../../controllers/patient/VitalSigns.controller.js';
import { index, store, show, update } from '../../controllers/patient/VitalSigns.controller.js';
import { verifyToken } from '../../middleware/betterAuth.middleware.js';
import { PERMISSIONS } from '../../config/rbac.js';
import { requireAnyPermission, requirePermission } from '../../middleware/rbac.middleware.js';

/**
 * Vital Signs Routes
 * Comprehensive vital signs (BP, HR, RR, Temp, SpO2, Pain) with timestamp, value, and unit information
 *
 * RBAC Permissions:
 * - Nurse: create, read (VIEW_VITAL_SIGNS, CREATE_VITAL_SIGNS)
 * - Doctor: create, read, update (VIEW_VITAL_SIGNS, CREATE_VITAL_SIGNS, UPDATE_VITAL_SIGNS)
 * - Admin: full CRUD + view deleted (all vital signs permissions + VIEW_AUDIT_LOGS)
 *
 * Routes are organized into:
 * 1. Patient-scoped routes: /patients/:patientId/vital-signs
 * 2. Global routes: /vital-signs
 * 3. Signature/compliance routes: /vital-signs/:id/sign, /vital-signs/:id/amend
 * 4. Admin routes: /vital-signs/:id/restore
 */
async function vitalSignsRoutes(fastify, options) {
  // =========================================
  // Patient-scoped vital signs routes
  // =========================================

  // Get all vital signs for a patient
  // Nurses, Doctors, Admin can view
  fastify.get('/patients/:patientId/vital-signs', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_VITAL_SIGNS)]
  }, controller.getPatientVitalSigns.bind(controller));

  // Get latest vital signs for a patient
  // Nurses, Doctors, Admin can view
  fastify.get('/patients/:patientId/vital-signs/latest', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_VITAL_SIGNS)]
  }, controller.getLatestVitalSigns.bind(controller));

  // Get vital signs statistics for a patient
  // Nurses, Doctors, Admin can view
  fastify.get('/patients/:patientId/vital-signs/stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_VITAL_SIGNS)]
  }, controller.getPatientStats.bind(controller));

  // Get vital signs trend for a patient
  // Nurses, Doctors, Admin can view
  fastify.get('/patients/:patientId/vital-signs/trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_VITAL_SIGNS)]
  }, controller.getPatientTrend.bind(controller));

  // Create vital signs for a patient
  // Nurses, Doctors, Admin can create
  fastify.post('/patients/:patientId/vital-signs', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_VITAL_SIGNS)]
  }, controller.create.bind(controller));

  // =========================================
  // Global vital signs routes
  // =========================================

  // Get vital signs reference information (normal ranges, methods, etc.)
  // Anyone with view permission can access reference data
  fastify.get('/vital-signs/reference', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_VITAL_SIGNS)]
  }, controller.getReference.bind(controller));

  // Get all vital signs (with filters)
  // Nurses, Doctors, Admin can view
  fastify.get('/vital-signs', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_VITAL_SIGNS)]
  }, index);

  // Create new vital signs (legacy route)
  // Nurses, Doctors, Admin can create
  fastify.post('/vital-signs/store', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_VITAL_SIGNS)]
  }, store);

  // Get a single vital sign record by ID
  // Nurses, Doctors, Admin can view
  fastify.get('/vital-signs/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_VITAL_SIGNS)]
  }, show);

  // Update vital signs by ID (legacy pattern - POST)
  // Doctors, Admin can update
  fastify.post('/vital-signs/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_VITAL_SIGNS)]
  }, update);

  // Full update vital signs by ID (RESTful pattern - PUT)
  // Replaces entire record, requires version for optimistic locking
  // Doctors, Admin can update
  fastify.put('/vital-signs/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_VITAL_SIGNS)]
  }, controller.fullUpdate.bind(controller));

  // Partial update vital signs by ID (RESTful pattern - PATCH)
  // Updates only specified fields, requires version for optimistic locking
  // Doctors, Admin can update
  fastify.patch('/vital-signs/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_VITAL_SIGNS)]
  }, controller.update.bind(controller));

  // Soft delete vital signs by ID
  // Admin only can delete
  fastify.delete('/vital-signs/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_VITAL_SIGNS)]
  }, controller.delete.bind(controller));

  // =========================================
  // Admin-only routes
  // =========================================

  // Restore soft-deleted vital signs
  // Admin only (requires DELETE permission + VIEW_AUDIT_LOGS for accessing deleted records)
  fastify.post('/vital-signs/:id/restore', {
    preHandler: [requirePermission(PERMISSIONS.DELETE_VITAL_SIGNS, PERMISSIONS.VIEW_AUDIT_LOGS)]
  }, controller.restore.bind(controller));

  // =========================================
  // Signature and compliance routes (21 CFR Part 11)
  // =========================================

  // Sign vital signs record
  // Creates an electronic signature attestation
  // Nurses, Doctors, Admin can sign their own records
  fastify.post('/vital-signs/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_VITAL_SIGNS, PERMISSIONS.UPDATE_VITAL_SIGNS)]
  }, controller.sign.bind(controller));

  // Amend signed vital signs record
  // Creates a new version with amendment reason (original preserved)
  // Doctors, Admin can amend
  fastify.post('/vital-signs/:id/amend', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_VITAL_SIGNS)]
  }, controller.amend.bind(controller));
}

export default vitalSignsRoutes;
