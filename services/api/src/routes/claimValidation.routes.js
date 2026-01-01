import controller from '../controllers/ClaimValidation.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Claim Validation Routes
 * Phase 2B/3B - Claim Scrubbing System with HIPAA 837 Compliance
 *
 * Comprehensive pre-submission claim validation with auto-fix capability
 * Features:
 *   - 50+ validation rules (HIPAA 837, coverage, coding standards)
 *   - Field-level error reporting with suggestions
 *   - Auto-fix capability for common errors
 *   - Validation history tracking
 *   - Batch scrubbing for multiple claims
 *   - HIPAA 837I compliance validation
 *   - Coverage requirement validation (NOE, eligibility, benefit periods)
 *   - Coding standard validation (ICD-10, revenue codes, HCPCS)
 *   - Comprehensive report generation (detailed, summary, CSV)
 *
 * Endpoints:
 * - POST /api/claims/:id/scrub - Scrub single claim (with comprehensive validation)
 * - POST /api/claims/:id/validate-comprehensive - Run only comprehensive validation
 * - GET /api/claims/:id/validation-results - Get latest validation results
 * - GET /api/claims/:id/validation-history - Get validation history
 * - POST /api/claims/:id/auto-fix - Auto-fix claim errors
 * - GET /api/claims/failed-validation - Get claims failing validation
 * - POST /api/claims/batch-scrub - Batch scrub claims
 * - GET /api/claims/validation-rules - Get available validation rules
 * - GET /api/claims/:id/validation-report - Generate claim validation report
 * - GET /api/claims/validation-report/batch - Generate batch validation report
 * - GET /api/claims/validation-report/compliance - Generate compliance audit report
 * - GET /api/claims/validation-report/trends - Generate error trend report
 */
export default async function claimValidationRoutes(fastify, options) {

  // Get available validation rules (must be before parameterized routes)
  fastify.get('/claims/validation-rules', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getValidationRules);

  // Get all claims failing validation (must be before parameterized routes)
  fastify.get('/claims/failed-validation', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getFailingClaims);

  // Batch scrub claims (must be before parameterized routes)
  fastify.post('/claims/batch-scrub', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.batchScrubClaims);

  // Report endpoints (must be before parameterized routes)
  // Batch validation report
  fastify.get('/claims/validation-report/batch', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getBatchValidationReport);

  // Compliance audit report
  fastify.get('/claims/validation-report/compliance', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getComplianceReport);

  // Error trend report
  fastify.get('/claims/validation-report/trends', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getErrorTrendReport);

  // Scrub claim - Run comprehensive validation
  fastify.post('/claims/:id/scrub', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.scrubClaim);

  // Validate claim comprehensively - Direct access to HIPAA/coverage/coding rules
  fastify.post('/claims/:id/validate-comprehensive', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.validateComprehensive);

  // Get latest validation results for claim
  fastify.get('/claims/:id/validation-results', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getLatestValidationResults);

  // Get validation history for claim
  fastify.get('/claims/:id/validation-history', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getValidationHistory);

  // Get claim validation report
  fastify.get('/claims/:id/validation-report', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getClaimValidationReport);

  // Auto-fix claim errors
  fastify.post('/claims/:id/auto-fix', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.autoFixClaim);
}
