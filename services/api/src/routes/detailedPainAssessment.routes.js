import controller from '../controllers/DetailedPainAssessment.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Detailed Pain Assessment Routes
 * Comprehensive pain assessments including location, quality, severity, triggers, and interventions
 */
export default async function detailedPainAssessmentRoutes(fastify, options) {
  // Patient-specific assessment routes
  fastify.get('/patients/:patientId/detailed-pain-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAssessments);

  fastify.post('/patients/:patientId/detailed-pain-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.create);

  fastify.get('/patients/:patientId/detailed-pain-assessments/stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientStats);

  // Assessment management routes
  fastify.get('/detailed-pain-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.index);

  fastify.get('/detailed-pain-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show);

  fastify.patch('/detailed-pain-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update);

  fastify.delete('/detailed-pain-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.delete);

  fastify.post('/detailed-pain-assessments/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign);
}
