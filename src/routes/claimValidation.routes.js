import controller from '../controllers/ClaimValidation.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Claim Validation Routes
 * Phase 2B - Claim Scrubbing System
 *
 * Comprehensive pre-submission claim validation with auto-fix capability
 * Features:
 *   - 20+ validation rules (required fields, format, range, cross-field)
 *   - Field-level error reporting with suggestions
 *   - Auto-fix capability for common errors
 *   - Validation history tracking
 *   - Batch scrubbing for multiple claims
 *
 * Endpoints:
 * - POST /api/claims/:id/scrub - Scrub single claim
 * - GET /api/claims/:id/validation-results - Get latest validation results
 * - GET /api/claims/:id/validation-history - Get validation history
 * - POST /api/claims/:id/auto-fix - Auto-fix claim errors
 * - GET /api/claims/failed-validation - Get claims failing validation
 * - POST /api/claims/batch-scrub - Batch scrub claims
 */
export default async function claimValidationRoutes(fastify, options) {

  // Scrub claim - Run comprehensive validation
  fastify.post('/claims/:id/scrub', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.scrubClaim);

  // Get latest validation results for claim
  fastify.get('/claims/:id/validation-results', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getLatestValidationResults);

  // Get validation history for claim
  fastify.get('/claims/:id/validation-history', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getValidationHistory);

  // Auto-fix claim errors
  fastify.post('/claims/:id/auto-fix', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.autoFixClaim);

  // Get all claims failing validation
  fastify.get('/claims/failed-validation', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getFailingClaims);

  // Batch scrub claims
  fastify.post('/claims/batch-scrub', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.batchScrubClaims);
}
