import controller from '../controllers/EndocrineSystemAssessment.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Endocrine System Assessment Routes
 * Comprehensive endocrine system assessment for hospice patients
 * Follows ADA guidelines, American Thyroid Association guidelines,
 * and Endocrine Society clinical practice guidelines
 */
export default async function endocrineSystemAssessmentRoutes(fastify, options) {
  // =========================================
  // Patient-specific assessment routes
  // =========================================

  // Get all endocrine system assessments for a patient
  fastify.get('/patients/:patientId/endocrine-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAssessments.bind(controller));

  // Create a new endocrine system assessment for a patient
  fastify.post('/patients/:patientId/endocrine-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.create.bind(controller));

  // Get endocrine system assessment statistics for a patient
  fastify.get('/patients/:patientId/endocrine-system-assessments/stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientStats.bind(controller));

  // Get endocrine assessment trend for a patient
  fastify.get('/patients/:patientId/endocrine-system-assessments/trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientTrend.bind(controller));

  // =========================================
  // Assessment management routes
  // =========================================

  // Get endocrine assessment reference data
  fastify.get('/endocrine-system-assessments/reference', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getReference.bind(controller));

  // Get all endocrine system assessments (with filters)
  fastify.get('/endocrine-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.index.bind(controller));

  // Get a single endocrine system assessment by ID
  fastify.get('/endocrine-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show.bind(controller));

  // Update an endocrine system assessment
  fastify.patch('/endocrine-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update.bind(controller));

  // Delete an endocrine system assessment
  fastify.delete('/endocrine-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.delete.bind(controller));

  // =========================================
  // Signature and compliance routes (21 CFR Part 11)
  // =========================================

  // Sign an endocrine system assessment
  fastify.post('/endocrine-system-assessments/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign.bind(controller));

  // Amend a signed endocrine system assessment
  fastify.post('/endocrine-system-assessments/:id/amend', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.amend.bind(controller));
}
