import ElectronicSignatureController from '../controllers/ElectronicSignature.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Electronic Signature Routes
 *
 * 21 CFR Part 11 Compliant Electronic Signature API
 *
 * All routes require authentication via the global auth middleware.
 * Additional permission checks are applied where needed.
 */
async function electronicSignatureRoutes(fastify, options) {
  // ============================================================================
  // SIGNATURE CREATION & MANAGEMENT
  // ============================================================================

  /**
   * Create a new electronic signature
   * POST /electronic-signatures
   *
   * Required body fields:
   * - document_type: Type of document being signed (e.g., 'encounter', 'order', 'certification')
   * - document_id: ID of the document being signed
   * - signature_type: TYPED | DRAWN | BIOMETRIC | PIN | SMART_CARD | DIGITAL_CERT
   * - signature_meaning: AUTHOR | REVIEWER | APPROVER | VERIFIER | WITNESS | COSIGNER | etc.
   * - signature_statement: Legal statement the signer is acknowledging
   * - signature_data: Actual signature data (typed name, base64 image, etc.)
   *
   * Optional fields:
   * - document_content: Content to hash for integrity verification
   * - document_version: Version of the document (default: '1.0')
   * - signature_image_format: Format for DRAWN signatures (PNG, SVG)
   * - requires_cosigner: Whether a cosignature is required (default: false)
   * - required_cosigner_id: Specific user ID required to cosign
   * - required_cosigner_role: Role required for cosigner (e.g., 'doctor')
   * - cosignature_deadline: Deadline for cosignature
   * - regulatory_context: Regulatory framework (default: 'HIPAA')
   * - metadata: Additional metadata object
   */
  fastify.post('/electronic-signatures', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, ElectronicSignatureController.create);

  /**
   * Get electronic signature by ID
   * GET /electronic-signatures/:id
   */
  fastify.get('/electronic-signatures/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, ElectronicSignatureController.show);

  /**
   * Get all signatures for a specific document
   * GET /electronic-signatures/document/:documentType/:documentId
   *
   * Query parameters:
   * - status: Filter by signature status (VALID, PENDING_REVIEW, REVOKED, etc.)
   * - meaning: Filter by signature meaning (AUTHOR, COSIGNER, etc.)
   * - include_superseded: Include superseded signatures (default: false)
   */
  fastify.get('/electronic-signatures/document/:documentType/:documentId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, ElectronicSignatureController.getByDocument);

  // ============================================================================
  // SIGNATURE VERIFICATION
  // ============================================================================

  /**
   * Verify signature integrity
   * POST /electronic-signatures/:id/verify
   *
   * Verifies that the document content matches the stored hash.
   * Required body:
   * - document_content: Content to verify against stored hash
   */
  fastify.post('/electronic-signatures/:id/verify', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, ElectronicSignatureController.verify);

  /**
   * Create a verification token for external verification
   * POST /electronic-signatures/:id/verification-token
   *
   * Creates a token that can be used to verify the signature without authentication.
   * Useful for sharing verification links with external parties.
   *
   * Optional body:
   * - expires_in_hours: Hours until token expires (default: 24)
   * - max_uses: Maximum number of times token can be used (default: unlimited)
   */
  fastify.post('/electronic-signatures/:id/verification-token', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, ElectronicSignatureController.createVerificationToken);

  /**
   * Verify signature using external token (public endpoint)
   * GET /electronic-signatures/verify-token/:token
   *
   * This endpoint does not require authentication - anyone with the token
   * can verify the signature. Rate limiting should be applied.
   */
  fastify.get('/electronic-signatures/verify-token/:token', {
    // No authentication required for token-based verification
  }, ElectronicSignatureController.verifyByToken);

  // ============================================================================
  // COSIGNATURE WORKFLOW
  // ============================================================================

  /**
   * Cosign a signature
   * POST /electronic-signatures/:id/cosign
   *
   * Creates a cosignature for a document that requires cosigning.
   * The cosigner must be authorized (matching required_cosigner_id or required_cosigner_role).
   *
   * Required body:
   * - signature_data: Cosigner's signature data
   *
   * Optional body:
   * - signature_type: Type of signature (default: TYPED)
   * - signature_statement: Custom statement (default: standard cosigner statement)
   * - signature_image_format: Format for DRAWN signatures
   */
  fastify.post('/electronic-signatures/:id/cosign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, ElectronicSignatureController.cosign);

  /**
   * Get pending cosignatures for the current user
   * GET /electronic-signatures/pending-cosignatures
   *
   * Returns all signatures that require cosigning by the current user
   * based on their user ID or role.
   */
  fastify.get('/electronic-signatures/pending-cosignatures', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, ElectronicSignatureController.getPendingCosignatures);

  // ============================================================================
  // SIGNATURE REVOCATION
  // ============================================================================

  /**
   * Revoke a signature
   * POST /electronic-signatures/:id/revoke
   *
   * Marks a signature as revoked. This is an immutable operation -
   * the signature record is preserved for audit purposes.
   *
   * Required body:
   * - revocation_reason: Reason for revoking the signature
   */
  fastify.post('/electronic-signatures/:id/revoke', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, ElectronicSignatureController.revoke);

  // ============================================================================
  // AUDIT & REPORTING
  // ============================================================================

  /**
   * Get signature audit trail
   * GET /electronic-signatures/:id/audit-trail
   *
   * Returns the complete audit trail for a signature, including
   * all events (creation, views, verifications, etc.).
   */
  fastify.get('/electronic-signatures/:id/audit-trail', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_AUDIT_LOGS)]
  }, ElectronicSignatureController.getAuditTrail);

  /**
   * Get current user's signature history
   * GET /electronic-signatures/my-signatures
   *
   * Query parameters:
   * - limit: Number of results (default: 50)
   * - offset: Pagination offset (default: 0)
   * - status: Filter by status
   * - document_type: Filter by document type
   * - start_date: Filter by signed_at >= date
   * - end_date: Filter by signed_at <= date
   */
  fastify.get('/electronic-signatures/my-signatures', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, ElectronicSignatureController.getMySignatures);

  /**
   * Get compliance report for signatures
   * GET /electronic-signatures/compliance-report
   *
   * Generates a compliance report with signature statistics.
   *
   * Query parameters:
   * - start_date: Start of reporting period (default: 30 days ago)
   * - end_date: End of reporting period (default: now)
   */
  fastify.get('/electronic-signatures/compliance-report', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_AUDIT_LOGS, PERMISSIONS.VIEW_REPORTS)]
  }, ElectronicSignatureController.getComplianceReport);
}

export default electronicSignatureRoutes;
