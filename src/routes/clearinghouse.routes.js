import controller from '../controllers/Clearinghouse.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Clearinghouse Routes
 * Phase 2C - 837I EDI Generation
 *
 * Electronic claim submission via 837I EDI files
 * Features:
 *   - Single and batch 837I file generation
 *   - X12 format compliance (005010X223A2)
 *   - Clearinghouse submission tracking
 *   - 277 acknowledgment processing
 *   - EDI file download
 *
 * Endpoints:
 * - POST /api/clearinghouse/generate-837i/:claimId - Generate 837I for single claim
 * - POST /api/clearinghouse/generate-batch - Generate batch 837I
 * - GET /api/clearinghouse/submissions/:claimId - Get submission history
 * - POST /api/clearinghouse/submit/:submissionId - Submit to clearinghouse
 * - GET /api/clearinghouse/download-edi/:submissionId - Download EDI file
 * - POST /api/clearinghouse/process-277 - Process 277 acknowledgment
 * - GET /api/clearinghouse/submission-status - Get all submission statuses
 */
export default async function clearinghouseRoutes(fastify, options) {

  // Generate 837I EDI file for single claim
  fastify.post('/clearinghouse/generate-837i/:claimId', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.generate837I);

  // Generate batch 837I file for multiple claims
  fastify.post('/clearinghouse/generate-batch', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.generateBatch837I);

  // Get submission history for claim
  fastify.get('/clearinghouse/submissions/:claimId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getSubmissionHistory);

  // Submit EDI file to clearinghouse via SFTP
  fastify.post('/clearinghouse/submit/:submissionId', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.submitToClearinghouse);

  // Download EDI file
  fastify.get('/clearinghouse/download-edi/:submissionId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.downloadEDIFile);

  // Process 277 acknowledgment from clearinghouse
  fastify.post('/clearinghouse/process-277', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.process277Acknowledgment);

  // Get all submission statuses
  fastify.get('/clearinghouse/submission-status', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getSubmissionStatuses);
}
