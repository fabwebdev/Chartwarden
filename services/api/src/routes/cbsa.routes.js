import controller from '../controllers/CBSA.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * CBSA Routes
 * Phase 2A - Electronic Submission Features
 *
 * CBSA (Core Based Statistical Area) tracking for UB-04 Value Codes 61 and G8
 * CMS Requirement: Track CBSA for routine/continuous home care and inpatient care
 */
export default async function cbsaRoutes(fastify, options) {

  // Autocomplete search for CBSA titles/cities
  fastify.get('/cbsa/autocomplete', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.autocomplete);

  // Lookup CBSA by ZIP code
  fastify.get('/cbsa/lookup/:zip', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.lookupByZip);

  // Auto-populate CBSA on claim service lines
  fastify.post('/cbsa/auto-populate/:claimId', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.autoPopulateClaim);

  // Validate CBSA completeness on claim
  fastify.get('/cbsa/validate/:claimId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.validateClaim);

  // Get all CBSA codes (paginated)
  fastify.get('/cbsa/codes', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getAllCodes);

  // Bulk import CBSA codes (admin only)
  fastify.post('/cbsa/bulk-import', {
    preHandler: [requireAnyPermission(PERMISSIONS.MANAGE_SYSTEM)]
  }, controller.bulkImport);

  // Clear CBSA cache (admin only)
  fastify.post('/cbsa/clear-cache', {
    preHandler: [requireAnyPermission(PERMISSIONS.MANAGE_SYSTEM)]
  }, controller.clearCache);

  // Get CBSA cache statistics (admin only)
  fastify.get('/cbsa/cache-stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.MANAGE_SYSTEM)]
  }, controller.getCacheStats);
}
