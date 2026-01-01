import controller from '../controllers/CardiacSystemAssessment.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Cardiac System Assessment Routes
 * Comprehensive cardiac/cardiovascular assessment for hospice patients
 * Follows AHA guidelines, JNC BP classifications, and NYHA functional classification
 */
export default async function cardiacSystemAssessmentRoutes(fastify, options) {
  // =========================================
  // Patient-specific assessment routes
  // =========================================

  // Get all cardiac system assessments for a patient
  fastify.get('/patients/:patientId/cardiac-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAssessments.bind(controller));

  // Create a new cardiac system assessment for a patient
  fastify.post('/patients/:patientId/cardiac-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.create.bind(controller));

  // Get cardiac system assessment statistics for a patient
  fastify.get('/patients/:patientId/cardiac-system-assessments/stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientStats.bind(controller));

  // Get cardiac assessment trend for a patient
  fastify.get('/patients/:patientId/cardiac-system-assessments/trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientTrend.bind(controller));

  // =========================================
  // Assessment management routes
  // =========================================

  // Get cardiac assessment reference data
  fastify.get('/cardiac-system-assessments/reference', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getReference.bind(controller));

  // Get all cardiac system assessments (with filters)
  fastify.get('/cardiac-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.index.bind(controller));

  // Get a single cardiac system assessment by ID
  fastify.get('/cardiac-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show.bind(controller));

  // Update a cardiac system assessment
  fastify.patch('/cardiac-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update.bind(controller));

  // Delete a cardiac system assessment
  fastify.delete('/cardiac-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.delete.bind(controller));

  // =========================================
  // Signature and compliance routes (21 CFR Part 11)
  // =========================================

  // Sign a cardiac system assessment
  fastify.post('/cardiac-system-assessments/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign.bind(controller));

  // Amend a signed cardiac system assessment
  fastify.post('/cardiac-system-assessments/:id/amend', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.amend.bind(controller));
}
