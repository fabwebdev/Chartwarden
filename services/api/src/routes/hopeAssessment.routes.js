import controller from '../controllers/HOPEAssessment.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * HOPE Assessment Routes
 * Hospice Outcomes & Patient Evaluation (HOPE) - CMS requirement
 * Critical: Non-compliance can result in 4% Medicare payment reduction
 *
 * CMS References:
 * - 42 CFR § 418.54 - Condition of Participation: Initial and Comprehensive Assessment
 * - 42 CFR § 418.56 - Condition of Participation: Hospice Aide and Homemaker Services
 * - 42 CFR § 418.58 - Condition of Participation: Quality Assessment and Performance Improvement
 * - 42 CFR § 418.76 - Condition of Participation: Hospice Care Team
 * - 21 CFR Part 11 - Electronic Records; Electronic Signatures
 */
export default async function hopeAssessmentRoutes(fastify, options) {
  // ============================================================================
  // Query routes (must be registered before parameterized routes)
  // ============================================================================
  fastify.get('/hope-assessments/pending', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPending);

  fastify.get('/hope-assessments/overdue', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getOverdue);

  fastify.get('/hope-assessments/compliance', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getCompliance);

  // ============================================================================
  // Patient-specific assessment creation routes
  // ============================================================================
  fastify.get('/patients/:id/hope-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAssessments);

  // Admission assessment (within 5 days of admission) - RN required
  fastify.post('/patients/:id/hope-assessments/admission', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createAdmissionAssessment);

  // HUV1 - HOPE Update Visit 1 (days 6-15 after admission)
  fastify.post('/patients/:id/hope-assessments/huv1', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createHUV1Assessment);

  // HUV2 - HOPE Update Visit 2 (days 16-30 after admission)
  fastify.post('/patients/:id/hope-assessments/huv2', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createHUV2Assessment);

  // Discharge assessment (within 2 days of discharge)
  fastify.post('/patients/:id/hope-assessments/discharge', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createDischargeAssessment);

  // Transfer assessment (within 2 days of transfer)
  fastify.post('/patients/:id/hope-assessments/transfer', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createTransferAssessment);

  // Resumption of care assessment (within 5 days of resumption)
  fastify.post('/patients/:id/hope-assessments/resumption', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createResumptionAssessment);

  // Recertification assessment (within 5 days of recertification)
  fastify.post('/patients/:id/hope-assessments/recertification', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createRecertificationAssessment);

  // Symptom Follow-up Visit (within 48 hours of moderate/severe symptom)
  fastify.post('/patients/:id/hope-assessments/sfv', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createSFVAssessment);

  // ============================================================================
  // Assessment management routes
  // ============================================================================

  // Get single assessment
  fastify.get('/hope-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show);

  // Update assessment (blocked if signed/submitted per 21 CFR Part 11)
  fastify.patch('/hope-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update);

  // Delete assessment (soft delete - blocked if signed/submitted)
  fastify.delete('/hope-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.delete);

  // ============================================================================
  // Validation and signature routes
  // ============================================================================

  // Validate assessment for CMS compliance
  fastify.post('/hope-assessments/:id/validate', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.validate);

  // Sign assessment (21 CFR Part 11 compliant electronic signature)
  fastify.post('/hope-assessments/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign);

  // Submit assessment to CMS iQIES system
  fastify.post('/hope-assessments/:id/submit', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.submit);
}
