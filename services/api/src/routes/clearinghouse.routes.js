import controller from '../controllers/Clearinghouse.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Clearinghouse Routes
 * Phase 2C - 837I EDI Generation & Claim Submission/Response Tracking
 *
 * Comprehensive clearinghouse management for electronic claim submission
 * Features:
 *   - Clearinghouse configuration management (CRUD)
 *   - Single and batch 837I file generation
 *   - X12 format compliance (005010X223A2)
 *   - Transmission batch management and tracking
 *   - Clearinghouse submission tracking with full lifecycle
 *   - Response file processing (TA1, 999, 277CA, 277)
 *   - Status history and audit trail
 *   - Retry and resubmission functionality
 *   - EDI file download
 *
 * Configuration Endpoints:
 * - GET /api/clearinghouse/configurations - List all configurations
 * - GET /api/clearinghouse/configurations/:id - Get configuration by ID
 * - POST /api/clearinghouse/configurations - Create configuration
 * - PUT /api/clearinghouse/configurations/:id - Update configuration
 * - DELETE /api/clearinghouse/configurations/:id - Delete configuration
 *
 * Transmission Batch Endpoints:
 * - GET /api/clearinghouse/batches - List transmission batches
 * - GET /api/clearinghouse/batches/:batchId - Get batch details
 * - POST /api/clearinghouse/batches/:batchId/retry - Retry failed batch
 *
 * Submission Endpoints:
 * - POST /api/clearinghouse/generate-837i/:claimId - Generate 837I for single claim
 * - POST /api/clearinghouse/generate-batch - Generate batch 837I
 * - GET /api/clearinghouse/submissions/:claimId - Get submission history for claim
 * - POST /api/clearinghouse/submit/:submissionId - Submit to clearinghouse
 * - POST /api/clearinghouse/submissions/:submissionId/retry - Retry submission
 * - GET /api/clearinghouse/submissions/:submissionId/history - Get status history
 * - GET /api/clearinghouse/submission-status - Get all submission statuses
 *
 * Response Processing Endpoints:
 * - POST /api/clearinghouse/responses/upload - Upload response file
 * - GET /api/clearinghouse/responses - List response files
 * - GET /api/clearinghouse/responses/:fileId - Get response file details
 * - POST /api/clearinghouse/responses/:fileId/process - Process response file
 * - POST /api/clearinghouse/process-277 - Process 277 acknowledgment (legacy)
 *
 * File Download:
 * - GET /api/clearinghouse/download-edi/:submissionId - Download EDI file
 */
export default async function clearinghouseRoutes(fastify, options) {

  // ==========================================
  // CLEARINGHOUSE CONFIGURATION MANAGEMENT
  // ==========================================

  // List all clearinghouse configurations
  fastify.get('/clearinghouse/configurations', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.listConfigurations.bind(controller));

  // Get clearinghouse configuration by ID
  fastify.get('/clearinghouse/configurations/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getConfiguration.bind(controller));

  // Create clearinghouse configuration
  fastify.post('/clearinghouse/configurations', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createConfiguration.bind(controller));

  // Update clearinghouse configuration
  fastify.put('/clearinghouse/configurations/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateConfiguration.bind(controller));

  // Delete clearinghouse configuration
  fastify.delete('/clearinghouse/configurations/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.deleteConfiguration.bind(controller));

  // ==========================================
  // TRANSMISSION BATCH MANAGEMENT
  // ==========================================

  // List transmission batches
  fastify.get('/clearinghouse/batches', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.listBatches.bind(controller));

  // Get transmission batch details
  fastify.get('/clearinghouse/batches/:batchId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getBatchDetails.bind(controller));

  // Retry failed transmission batch
  fastify.post('/clearinghouse/batches/:batchId/retry', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.retryBatch.bind(controller));

  // ==========================================
  // RESPONSE FILE PROCESSING
  // ==========================================

  // Upload response file (TA1, 999, 277CA, 277)
  fastify.post('/clearinghouse/responses/upload', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.uploadResponseFile.bind(controller));

  // List response files
  fastify.get('/clearinghouse/responses', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.listResponseFiles.bind(controller));

  // Get response file details
  fastify.get('/clearinghouse/responses/:fileId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getResponseFileDetails.bind(controller));

  // Process response file
  fastify.post('/clearinghouse/responses/:fileId/process', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.processResponseFile.bind(controller));

  // ==========================================
  // SUBMISSION MANAGEMENT (includes legacy + new)
  // ==========================================

  // Generate 837I EDI file for single claim
  fastify.post('/clearinghouse/generate-837i/:claimId', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.generate837I);

  // Generate batch 837I file for multiple claims
  fastify.post('/clearinghouse/generate-batch', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.generateBatch837I);

  // Retry failed submission
  fastify.post('/clearinghouse/submissions/:submissionId/retry', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.retrySubmission.bind(controller));

  // Get submission status history
  fastify.get('/clearinghouse/submissions/:submissionId/history', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getSubmissionHistory.bind(controller));

  // Get submission history for claim (legacy - must come after more specific routes)
  fastify.get('/clearinghouse/submissions/:claimId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getSubmissionsForClaim.bind(controller));

  // Submit EDI file to clearinghouse via SFTP
  fastify.post('/clearinghouse/submit/:submissionId', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.submitToClearinghouse);

  // Download EDI file
  fastify.get('/clearinghouse/download-edi/:submissionId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.downloadEDIFile);

  // Process 277 acknowledgment from clearinghouse (legacy endpoint)
  fastify.post('/clearinghouse/process-277', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.process277Acknowledgment);

  // Get all submission statuses
  fastify.get('/clearinghouse/submission-status', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getSubmissionStatuses);
}
