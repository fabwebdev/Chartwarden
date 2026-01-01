import controller from '../controllers/NumericRatingScale.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Numeric Rating Scale (NRS) Routes
 * Self-reported pain assessment using 0-10 numeric scale
 * Gold standard for pain assessment in cognitively intact patients
 */
export default async function numericRatingScaleRoutes(fastify, options) {
  // =========================================
  // Patient-specific assessment routes
  // =========================================

  // Get all NRS assessments for a patient
  fastify.get('/patients/:patientId/numeric-rating-scales', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAssessments.bind(controller));

  // Create a new NRS assessment for a patient
  fastify.post('/patients/:patientId/numeric-rating-scales', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.create.bind(controller));

  // Get NRS assessment statistics for a patient
  fastify.get('/patients/:patientId/numeric-rating-scales/stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientStats.bind(controller));

  // Get NRS score trend for a patient
  fastify.get('/patients/:patientId/numeric-rating-scales/trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientTrend.bind(controller));

  // =========================================
  // Assessment management routes
  // =========================================

  // Get NRS scoring reference (public within authenticated routes)
  fastify.get('/numeric-rating-scales/reference', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getReference.bind(controller));

  // Get all NRS assessments (with filters)
  fastify.get('/numeric-rating-scales', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.index.bind(controller));

  // Get a single NRS assessment by ID
  fastify.get('/numeric-rating-scales/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show.bind(controller));

  // Update an NRS assessment
  fastify.patch('/numeric-rating-scales/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update.bind(controller));

  // Delete an NRS assessment
  fastify.delete('/numeric-rating-scales/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.delete.bind(controller));

  // =========================================
  // Signature and compliance routes (21 CFR Part 11)
  // =========================================

  // Sign an NRS assessment
  fastify.post('/numeric-rating-scales/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign.bind(controller));

  // Amend a signed NRS assessment
  fastify.post('/numeric-rating-scales/:id/amend', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.amend.bind(controller));
}
