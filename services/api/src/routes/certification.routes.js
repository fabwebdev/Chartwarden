import controller from '../controllers/Certification.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Certification Routes
 * Medicare certification periods, Face-to-Face encounters, and physician orders
 * CRITICAL: Required for Medicare reimbursement
 *
 * CMS Requirements:
 * - Initial certification within 2 days of start of care
 * - Face-to-Face required from 3rd benefit period onwards
 * - F2F must occur within 90 days before or 30 days after start of care
 */
export default async function certificationRoutes(fastify, options) {
  // ============================================================================
  // CERTIFICATION ROUTES
  // ============================================================================

  // Get patient certifications
  fastify.get('/patients/:id/certifications', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientCertifications.bind(controller));

  // Create certification
  fastify.post('/patients/:id/certifications', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createCertification.bind(controller));

  // Get single certification by ID
  fastify.get('/certifications/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCertificationById.bind(controller));

  // Update certification (only unsigned)
  fastify.patch('/certifications/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateCertification.bind(controller));

  // Sign certification
  fastify.post('/certifications/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.signCertification.bind(controller));

  // Complete certification (with timeliness tracking)
  fastify.post('/certifications/:id/complete', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.completeCertification.bind(controller));

  // Revoke certification
  fastify.post('/certifications/:id/revoke', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.revokeCertification.bind(controller));

  // Validate F2F for certification
  fastify.post('/certifications/:id/validate-f2f', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.validateF2FForCertification.bind(controller));

  // Get pending certifications
  fastify.get('/certifications/pending', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPendingCertifications.bind(controller));

  // Get certifications due within 30 days
  fastify.get('/certifications/due', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCertificationsDue.bind(controller));

  // Get overdue certifications
  fastify.get('/certifications/overdue', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCertificationsOverdue.bind(controller));

  // ============================================================================
  // FACE-TO-FACE ENCOUNTER ROUTES
  // ============================================================================

  // Get patient F2F encounters
  fastify.get('/patients/:id/f2f', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientF2F.bind(controller));

  // Create F2F encounter
  fastify.post('/patients/:id/f2f', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createF2F.bind(controller));

  // Attest F2F encounter
  fastify.post('/f2f/:id/attestation', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.attestF2F.bind(controller));

  // ============================================================================
  // ORDER ROUTES
  // ============================================================================

  // Get patient orders
  fastify.get('/patients/:id/orders', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientOrders.bind(controller));

  // Create order
  fastify.post('/patients/:id/orders', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createOrder.bind(controller));

  // Sign order
  fastify.post('/orders/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.signOrder.bind(controller));
}
