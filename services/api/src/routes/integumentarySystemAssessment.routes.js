import controller from '../controllers/IntegumentarySystemAssessment.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Integumentary System Assessment Routes
 * Comprehensive skin, hair, and nail assessment for hospice patients
 * Follows NPIAP staging guidelines, Braden Scale, and WOCN guidelines
 */
export default async function integumentarySystemAssessmentRoutes(fastify, options) {
  // =========================================
  // Patient-specific assessment routes
  // =========================================

  // Get all integumentary system assessments for a patient
  fastify.get('/patients/:patientId/integumentary-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAssessments.bind(controller));

  // Create a new integumentary system assessment for a patient
  fastify.post('/patients/:patientId/integumentary-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.create.bind(controller));

  // Get integumentary system assessment statistics for a patient
  fastify.get('/patients/:patientId/integumentary-system-assessments/stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientStats.bind(controller));

  // Get integumentary assessment trend for a patient
  fastify.get('/patients/:patientId/integumentary-system-assessments/trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientTrend.bind(controller));

  // =========================================
  // Assessment management routes
  // =========================================

  // Get integumentary assessment reference data
  fastify.get('/integumentary-system-assessments/reference', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getReference.bind(controller));

  // Get all integumentary system assessments (with filters)
  fastify.get('/integumentary-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.index.bind(controller));

  // Get a single integumentary system assessment by ID
  fastify.get('/integumentary-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show.bind(controller));

  // Update an integumentary system assessment
  fastify.patch('/integumentary-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update.bind(controller));

  // Delete an integumentary system assessment
  fastify.delete('/integumentary-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.delete.bind(controller));

  // =========================================
  // Signature and compliance routes (21 CFR Part 11)
  // =========================================

  // Sign an integumentary system assessment
  fastify.post('/integumentary-system-assessments/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign.bind(controller));

  // Amend a signed integumentary system assessment
  fastify.post('/integumentary-system-assessments/:id/amend', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.amend.bind(controller));
}
