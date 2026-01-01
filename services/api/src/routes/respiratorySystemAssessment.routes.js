import controller from '../controllers/RespiratorySystemAssessment.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Respiratory System Assessment Routes
 * Comprehensive pulmonary assessment for hospice patients
 * Follows ATS guidelines, GOLD guidelines, and NCCN dyspnea guidelines
 */
export default async function respiratorySystemAssessmentRoutes(fastify, options) {
  // =========================================
  // Patient-specific assessment routes
  // =========================================

  // Get all respiratory system assessments for a patient
  fastify.get('/patients/:patientId/respiratory-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAssessments.bind(controller));

  // Create a new respiratory system assessment for a patient
  fastify.post('/patients/:patientId/respiratory-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.create.bind(controller));

  // Get respiratory system assessment statistics for a patient
  fastify.get('/patients/:patientId/respiratory-system-assessments/stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientStats.bind(controller));

  // Get respiratory assessment trend for a patient
  fastify.get('/patients/:patientId/respiratory-system-assessments/trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientTrend.bind(controller));

  // =========================================
  // Assessment management routes
  // =========================================

  // Get respiratory assessment reference data
  fastify.get('/respiratory-system-assessments/reference', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getReference.bind(controller));

  // Get all respiratory system assessments (with filters)
  fastify.get('/respiratory-system-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.index.bind(controller));

  // Get a single respiratory system assessment by ID
  fastify.get('/respiratory-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show.bind(controller));

  // Update a respiratory system assessment
  fastify.patch('/respiratory-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update.bind(controller));

  // Delete a respiratory system assessment
  fastify.delete('/respiratory-system-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.delete.bind(controller));

  // =========================================
  // Signature and compliance routes (21 CFR Part 11)
  // =========================================

  // Sign a respiratory system assessment
  fastify.post('/respiratory-system-assessments/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign.bind(controller));

  // Amend a signed respiratory system assessment
  fastify.post('/respiratory-system-assessments/:id/amend', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.amend.bind(controller));
}
