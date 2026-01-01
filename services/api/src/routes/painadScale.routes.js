import controller from '../controllers/PainadScale.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * PAINAD Scale Routes
 * Pain Assessment in Advanced Dementia - Behavioral Pain Assessment Tool
 * For dementia patients who cannot self-report pain
 */
export default async function painadScaleRoutes(fastify, options) {
  // =========================================
  // Patient-specific assessment routes
  // =========================================

  // Get all PAINAD assessments for a patient
  fastify.get('/patients/:patientId/painad-scales', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAssessments.bind(controller));

  // Create a new PAINAD assessment for a patient
  fastify.post('/patients/:patientId/painad-scales', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.create.bind(controller));

  // Get PAINAD assessment statistics for a patient
  fastify.get('/patients/:patientId/painad-scales/stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientStats.bind(controller));

  // Get PAINAD score trend for a patient
  fastify.get('/patients/:patientId/painad-scales/trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientTrend.bind(controller));

  // =========================================
  // Assessment management routes
  // =========================================

  // Get PAINAD scoring reference (public within authenticated routes)
  fastify.get('/painad-scales/reference', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getReference.bind(controller));

  // Get all PAINAD assessments (with filters)
  fastify.get('/painad-scales', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.index.bind(controller));

  // Get a single PAINAD assessment by ID
  fastify.get('/painad-scales/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show.bind(controller));

  // Update a PAINAD assessment
  fastify.patch('/painad-scales/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update.bind(controller));

  // Delete a PAINAD assessment
  fastify.delete('/painad-scales/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.delete.bind(controller));

  // =========================================
  // Signature and compliance routes (21 CFR Part 11)
  // =========================================

  // Sign a PAINAD assessment
  fastify.post('/painad-scales/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign.bind(controller));

  // Amend a signed PAINAD assessment
  fastify.post('/painad-scales/:id/amend', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.amend.bind(controller));
}
