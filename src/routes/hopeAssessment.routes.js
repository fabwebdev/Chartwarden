import controller from '../controllers/HOPEAssessment.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * HOPE Assessment Routes
 * Hospice Outcomes & Patient Evaluation (HOPE) - CMS requirement
 * Critical: Non-compliance can result in 4% Medicare payment reduction
 */
export default async function hopeAssessmentRoutes(fastify, options) {
  // Patient-specific assessment routes
  fastify.get('/patients/:id/hope-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAssessments);

  fastify.post('/patients/:id/hope-assessments/admission', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createAdmissionAssessment);

  fastify.post('/patients/:id/hope-assessments/huv1', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createHUV1Assessment);

  fastify.post('/patients/:id/hope-assessments/huv2', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createHUV2Assessment);

  fastify.post('/patients/:id/hope-assessments/discharge', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createDischargeAssessment);

  fastify.post('/patients/:id/hope-assessments/sfv', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createSFVAssessment);

  // Assessment management routes
  fastify.get('/hope-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show);

  fastify.patch('/hope-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update);

  fastify.post('/hope-assessments/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign);

  fastify.post('/hope-assessments/:id/submit', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.submit);

  // Query routes
  fastify.get('/hope-assessments/pending', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPending);

  fastify.get('/hope-assessments/overdue', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getOverdue);

  fastify.get('/hope-assessments/compliance', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getCompliance);
}
