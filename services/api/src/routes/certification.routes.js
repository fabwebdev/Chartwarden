import controller from '../controllers/Certification.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Certification Routes
 * Medicare certification periods, Face-to-Face encounters, and physician orders
 * CRITICAL: Required for Medicare reimbursement
 */
export default async function certificationRoutes(fastify, options) {
  // ============================================================================
  // CERTIFICATION ROUTES
  // ============================================================================

  // Get patient certifications
  fastify.get('/patients/:id/certifications', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientCertifications);

  // Create certification
  fastify.post('/patients/:id/certifications', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createCertification);

  // Sign certification
  fastify.post('/certifications/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.signCertification);

  // Complete certification (with timeliness tracking)
  fastify.post('/certifications/:id/complete', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.completeCertification);

  // Get pending certifications
  fastify.get('/certifications/pending', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPendingCertifications);

  // Get certifications due within 30 days
  fastify.get('/certifications/due', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCertificationsDue);

  // Get overdue certifications
  fastify.get('/certifications/overdue', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCertificationsOverdue);

  // ============================================================================
  // FACE-TO-FACE ENCOUNTER ROUTES
  // ============================================================================

  // Get patient F2F encounters
  fastify.get('/patients/:id/f2f', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientF2F);

  // Create F2F encounter
  fastify.post('/patients/:id/f2f', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createF2F);

  // Attest F2F encounter
  fastify.post('/f2f/:id/attestation', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.attestF2F);

  // ============================================================================
  // ORDER ROUTES
  // ============================================================================

  // Get patient orders
  fastify.get('/patients/:id/orders', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientOrders);

  // Create order
  fastify.post('/patients/:id/orders', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createOrder);

  // Sign order
  fastify.post('/orders/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.signOrder);
}
