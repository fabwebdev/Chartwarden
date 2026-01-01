import controller from '../../controllers/patient/VitalSigns.controller.js';
import { index, store, show, update } from '../../controllers/patient/VitalSigns.controller.js';
import { verifyToken } from '../../middleware/betterAuth.middleware.js';
import { PERMISSIONS } from '../../config/rbac.js';
import { requireAnyPermission } from '../../middleware/rbac.middleware.js';

/**
 * Vital Signs Routes
 * Comprehensive vital signs (BP, HR, RR, Temp, SpO2, Pain) with timestamp, value, and unit information
 *
 * Routes are organized into:
 * 1. Patient-scoped routes: /patients/:patientId/vital-signs
 * 2. Global routes: /vital-signs
 */
async function vitalSignsRoutes(fastify, options) {
  // =========================================
  // Patient-scoped vital signs routes
  // =========================================

  // Get all vital signs for a patient
  fastify.get('/patients/:patientId/vital-signs', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientVitalSigns.bind(controller));

  // Get latest vital signs for a patient
  fastify.get('/patients/:patientId/vital-signs/latest', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getLatestVitalSigns.bind(controller));

  // Get vital signs statistics for a patient
  fastify.get('/patients/:patientId/vital-signs/stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientStats.bind(controller));

  // Get vital signs trend for a patient
  fastify.get('/patients/:patientId/vital-signs/trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientTrend.bind(controller));

  // Create vital signs for a patient
  fastify.post('/patients/:patientId/vital-signs', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.create.bind(controller));

  // =========================================
  // Global vital signs routes (legacy + new)
  // =========================================

  // Get vital signs reference information
  fastify.get('/vital-signs/reference', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getReference.bind(controller));

  // Get all vital signs (with filters)
  fastify.get('/vital-signs', {
    preHandler: [verifyToken]
  }, index);

  // Create new vital signs
  fastify.post('/vital-signs/store', {
    preHandler: [verifyToken]
  }, store);

  // Get a single vital sign record by ID
  fastify.get('/vital-signs/:id', {
    preHandler: [verifyToken]
  }, show);

  // Update vital signs by ID (legacy pattern - POST)
  fastify.post('/vital-signs/:id', {
    preHandler: [verifyToken]
  }, update);

  // Update vital signs by ID (RESTful pattern - PATCH)
  fastify.patch('/vital-signs/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update.bind(controller));

  // Delete vital signs by ID
  fastify.delete('/vital-signs/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.delete.bind(controller));

  // =========================================
  // Signature and compliance routes (21 CFR Part 11)
  // =========================================

  // Sign vital signs
  fastify.post('/vital-signs/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign.bind(controller));

  // Amend signed vital signs
  fastify.post('/vital-signs/:id/amend', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.amend.bind(controller));
}

export default vitalSignsRoutes;
