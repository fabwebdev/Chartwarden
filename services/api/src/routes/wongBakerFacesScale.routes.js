import controller from '../controllers/WongBakerFacesScale.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Wong-Baker FACES Pain Rating Scale Routes
 * Visual pain assessment using 6-face scale
 * Designed for pediatric patients, adults with language barriers, and those who prefer visual scales
 */
export default async function wongBakerFacesScaleRoutes(fastify, options) {
  // =========================================
  // Patient-specific assessment routes
  // =========================================

  // Get all Wong-Baker FACES assessments for a patient
  fastify.get('/patients/:patientId/wong-baker-faces-scales', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAssessments.bind(controller));

  // Create a new Wong-Baker FACES assessment for a patient
  fastify.post('/patients/:patientId/wong-baker-faces-scales', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.create.bind(controller));

  // Get Wong-Baker FACES assessment statistics for a patient
  fastify.get('/patients/:patientId/wong-baker-faces-scales/stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientStats.bind(controller));

  // Get Wong-Baker FACES score trend for a patient
  fastify.get('/patients/:patientId/wong-baker-faces-scales/trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientTrend.bind(controller));

  // =========================================
  // Assessment management routes
  // =========================================

  // Get Wong-Baker FACES scoring reference (public within authenticated routes)
  fastify.get('/wong-baker-faces-scales/reference', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getReference.bind(controller));

  // Get all Wong-Baker FACES assessments (with filters)
  fastify.get('/wong-baker-faces-scales', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.index.bind(controller));

  // Get a single Wong-Baker FACES assessment by ID
  fastify.get('/wong-baker-faces-scales/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show.bind(controller));

  // Update a Wong-Baker FACES assessment
  fastify.patch('/wong-baker-faces-scales/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update.bind(controller));

  // Delete a Wong-Baker FACES assessment
  fastify.delete('/wong-baker-faces-scales/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.delete.bind(controller));

  // =========================================
  // Signature and compliance routes (21 CFR Part 11)
  // =========================================

  // Sign a Wong-Baker FACES assessment
  fastify.post('/wong-baker-faces-scales/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign.bind(controller));

  // Amend a signed Wong-Baker FACES assessment
  fastify.post('/wong-baker-faces-scales/:id/amend', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.amend.bind(controller));
}
