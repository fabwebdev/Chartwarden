import controller from '../controllers/Certification.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery, schemas } from '../middleware/validation.middleware.js';

/**
 * Certification Routes
 * Medicare certification periods, Face-to-Face encounters, and physician orders
 * CRITICAL: Required for Medicare reimbursement
 *
 * CMS Requirements:
 * - Initial certification within 2 days of start of care
 * - Face-to-Face encounters required for 3rd benefit period and beyond
 * - F2F must occur within 90 days before or 30 days after start of care
 * - Physician must have valid credentials (PHYSICIAN, NP, or PA)
 *
 * RESTful Endpoints:
 * - GET /certifications - List all certifications with filtering/pagination
 * - GET /certifications/:id - Retrieve specific certification details
 * - POST /patients/:id/certifications - Create new certification
 * - PATCH /certifications/:id - Update existing certification
 * - DELETE /certifications/:id - Soft delete certification
 * - POST /certifications/:id/sign - Sign certification
 * - POST /certifications/:id/complete - Mark as complete
 * - POST /certifications/:id/revoke - Revoke certification
 * - POST /certifications/:id/validate-f2f - Validate F2F requirements
 *
 * CMS Compliance Validation:
 * - Certification period types: INITIAL_90, SUBSEQUENT_90, SUBSEQUENT_60
 * - Terminal illness narrative is required
 * - Duplicate/overlapping certifications are prevented
 * - Date validation ensures proper certification windows
 * - F2F date range validation (90 days before to 30 days after)
 * - Provider credentials validation for F2F encounters
 */
export default async function certificationRoutes(fastify, options) {
  // ============================================================================
  // CERTIFICATION ROUTES
  // ============================================================================

  // List all certifications with filtering and pagination
  // GET /certifications?status=PENDING&patient_id=123&limit=20&offset=0
  fastify.get('/certifications', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES),
      validateQuery(schemas.certification.list)
    ]
  }, controller.listCertifications.bind(controller));

  // Get patient certifications
  fastify.get('/patients/:id/certifications', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientCertifications.bind(controller));

  // Create certification with CMS validation
  fastify.post('/patients/:id/certifications', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES),
      validateBody(schemas.certification.create)
    ]
  }, controller.createCertification.bind(controller));

  // Get single certification by ID
  fastify.get('/certifications/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCertificationById.bind(controller));

  // Update certification (only unsigned) with validation
  fastify.patch('/certifications/:id', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES),
      validateBody(schemas.certification.update)
    ]
  }, controller.updateCertification.bind(controller));

  // Sign certification (21 CFR Part 11 compliant)
  fastify.post('/certifications/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.signCertification.bind(controller));

  // Complete certification (with timeliness tracking)
  fastify.post('/certifications/:id/complete', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.completeCertification.bind(controller));

  // Revoke certification with required reason
  fastify.post('/certifications/:id/revoke', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES),
      validateBody(schemas.certification.revoke)
    ]
  }, controller.revokeCertification.bind(controller));

  // Soft delete certification
  fastify.delete('/certifications/:id', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES),
      validateBody(schemas.certification.delete)
    ]
  }, controller.deleteCertification.bind(controller));

  // Validate F2F for certification
  fastify.post('/certifications/:id/validate-f2f', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.validateF2FForCertification.bind(controller));

  // Get pending certifications (overdue)
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
  // CMS requires F2F within 90 days before or 30 days after start of care
  // ============================================================================

  // Get patient F2F encounters
  fastify.get('/patients/:id/f2f', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientF2F.bind(controller));

  // Create F2F encounter with CMS validation
  fastify.post('/patients/:id/f2f', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES),
      validateBody(schemas.f2f.create)
    ]
  }, controller.createF2F.bind(controller));

  // Attest F2F encounter (Hospice physician attestation)
  fastify.post('/f2f/:id/attestation', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.attestF2F.bind(controller));

  // ============================================================================
  // ORDER ROUTES
  // Physician orders for medications, treatments, DME, etc.
  // ============================================================================

  // Get patient orders with filtering
  fastify.get('/patients/:id/orders', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientOrders.bind(controller));

  // Create order with validation
  fastify.post('/patients/:id/orders', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES),
      validateBody(schemas.order.create)
    ]
  }, controller.createOrder.bind(controller));

  // Sign order (21 CFR Part 11 compliant)
  fastify.post('/orders/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.signOrder.bind(controller));
}
