import controller from '../controllers/EDI837.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * EDI 837 Routes
 * Comprehensive EDI 837 claim file generation for healthcare clearinghouse submission
 *
 * Supports:
 *   - 837I (Institutional Claims) - ANSI X12 005010X223A2
 *   - 837P (Professional Claims) - ANSI X12 005010X222A1
 *
 * Features:
 *   - Single and batch file generation
 *   - Pre-generation validation
 *   - File preview without saving
 *   - Submission tracking
 *   - File download
 *   - HIPAA 5010 compliance
 *
 * Endpoints:
 *   POST /api/edi837/generate/:claimId - Generate 837 for single claim
 *   POST /api/edi837/generate-batch - Generate batch 837 file
 *   POST /api/edi837/validate/:claimId - Validate claim for EDI generation
 *   GET /api/edi837/preview/:claimId - Preview EDI content without saving
 *   GET /api/edi837/claim-types - Get supported claim types
 *   GET /api/edi837/submissions/:claimId - Get submission history for claim
 *   GET /api/edi837/download/:submissionId - Download EDI file
 *   GET /api/edi837/submission-status - Get submission status summary
 */
export default async function edi837Routes(fastify, options) {

  /**
   * Generate 837 EDI file for a single claim
   * POST /api/edi837/generate/:claimId
   *
   * Body: {
   *   claim_type?: '837I' | '837P',  // Auto-detected if not provided
   *   clearinghouse_id?: string,      // Clearinghouse configuration ID
   *   skip_validation?: boolean       // Skip pre-generation validation
   * }
   *
   * Response: {
   *   status: 'success',
   *   message: '837I file generated successfully',
   *   data: {
   *     submission_id, claim_id, claim_type, edi_file_name, edi_file_path,
   *     edi_control_number, file_size_bytes, segment_count, checksum, generated_at
   *   }
   * }
   */
  fastify.post('/edi837/generate/:claimId', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.generate837);

  /**
   * Generate batch 837 EDI file for multiple claims
   * POST /api/edi837/generate-batch
   *
   * Body: {
   *   claim_ids: number[],            // Array of claim IDs (max 5000)
   *   batch_name?: string,            // Custom batch identifier
   *   claim_type?: '837I' | '837P',   // Force specific claim type
   *   clearinghouse_id?: string,      // Clearinghouse configuration ID
   *   continue_on_error?: boolean,    // Continue if individual claims fail (default: true)
   *   skip_validation?: boolean       // Skip pre-generation validation
   * }
   *
   * Response: {
   *   status: 'success',
   *   message: 'Batch 837 file generated for X claims',
   *   data: {
   *     batch_id, submission_ids, edi_file_name, edi_file_path,
   *     claims_processed, claims_failed, failed_claims, processed_claims,
   *     total_charges_cents, file_size_bytes, segment_count, checksum, generated_at
   *   }
   * }
   */
  fastify.post('/edi837/generate-batch', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.generateBatch837);

  /**
   * Validate claim for EDI generation
   * POST /api/edi837/validate/:claimId
   *
   * Body: {
   *   claim_type?: '837I' | '837P'    // Auto-detected if not provided
   * }
   *
   * Response: {
   *   status: 'success',
   *   message: 'Claim is valid for EDI generation',
   *   data: {
   *     claim_id, claim_type, is_valid, errors, warnings, validated_at
   *   }
   * }
   */
  fastify.post('/edi837/validate/:claimId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.validateClaim);

  /**
   * Preview EDI content without saving
   * GET /api/edi837/preview/:claimId
   *
   * Query: {
   *   claim_type?: '837I' | '837P',   // Auto-detected if not provided
   *   clearinghouse_id?: string,      // Clearinghouse configuration ID
   *   skip_validation?: 'true'        // Skip pre-generation validation
   * }
   *
   * Response: {
   *   status: 'success',
   *   message: 'EDI preview generated successfully',
   *   data: {
   *     preview: true, claim_id, claim_type, edi_content,
   *     segment_count, checksum, control_numbers
   *   }
   * }
   */
  fastify.get('/edi837/preview/:claimId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.previewEDI);

  /**
   * Get supported claim types
   * GET /api/edi837/claim-types
   *
   * Response: {
   *   status: 'success',
   *   data: {
   *     claim_types: {
   *       '837I': { name, version, description, bill_type_prefix },
   *       '837P': { name, version, description, bill_type_prefix }
   *     }
   *   }
   * }
   */
  fastify.get('/edi837/claim-types', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getClaimTypes);

  /**
   * Get submission history for a claim
   * GET /api/edi837/submissions/:claimId
   *
   * Response: {
   *   status: 'success',
   *   data: {
   *     claim_id, submission_count, submissions: [
   *       { submission_id, batch_id, submission_date, edi_file_name,
   *         control_numbers, clearinghouse, status, charges_cents, claim_type, ... }
   *     ]
   *   }
   * }
   */
  fastify.get('/edi837/submissions/:claimId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getSubmissionHistory);

  /**
   * Download EDI file
   * GET /api/edi837/download/:submissionId
   *
   * Query: {
   *   format?: 'raw' | 'formatted'    // 'formatted' adds line breaks (default: 'raw')
   * }
   *
   * Response: Raw EDI file content (text/plain)
   */
  fastify.get('/edi837/download/:submissionId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.downloadEDI);

  /**
   * Get submission status summary
   * GET /api/edi837/submission-status
   *
   * Query: {
   *   status?: string,                // Filter by status
   *   date_from?: string,             // Filter from date (ISO format)
   *   date_to?: string,               // Filter to date (ISO format)
   *   clearinghouse_id?: string,      // Filter by clearinghouse
   *   limit?: number,                 // Max results (default: 100)
   *   offset?: number                 // Offset for pagination (default: 0)
   * }
   *
   * Response: {
   *   status: 'success',
   *   data: {
   *     submissions: [...],
   *     summary: { total, by_status, total_charges_cents },
   *     pagination: { limit, offset, returned }
   *   }
   * }
   */
  fastify.get('/edi837/submission-status', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getSubmissionStatus);
}
