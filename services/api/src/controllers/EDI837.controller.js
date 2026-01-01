import EDI837Generator from '../services/EDI837Generator.service.js';
import { db } from '../db/index.js';
import { clearinghouse_submissions } from '../db/schemas/clearinghouse.schema.js';
import { eq, sql, gte, and, desc } from 'drizzle-orm';
import fs from 'fs/promises';

import { logger } from '../utils/logger.js';

/**
 * EDI 837 Controller
 * Comprehensive EDI 837 claim file generation for healthcare clearinghouse submission
 *
 * Features:
 *   - Single and batch 837 file generation (837I and 837P)
 *   - Pre-generation validation
 *   - File preview without saving
 *   - Submission tracking
 *   - File download
 *   - Support for multiple claim types
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
class EDI837Controller {

  /**
   * Generate 837 EDI file for a single claim
   * POST /api/edi837/generate/:claimId
   *
   * @param {object} request - Fastify request
   * @param {object} request.params.claimId - Claim ID to generate
   * @param {object} request.body - Generation options
   * @param {string} request.body.claim_type - Optional: '837I' or '837P' (auto-detected if not provided)
   * @param {string} request.body.clearinghouse_id - Optional: Clearinghouse configuration ID
   * @param {boolean} request.body.skip_validation - Optional: Skip pre-generation validation
   * @param {object} reply - Fastify reply
   */
  async generate837(request, reply) {
    try {
      const { claimId } = request.params;

      if (!claimId) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Claim ID parameter is required'
        };
      }

      const options = {
        claim_type: request.body?.claim_type,
        clearinghouse_id: request.body?.clearinghouse_id,
        skip_validation: request.body?.skip_validation || false
      };

      const result = await EDI837Generator.generate837(parseInt(claimId), options);

      reply.code(200);
      return {
        status: 'success',
        message: `837${result.claim_type === '837I' ? 'I' : 'P'} file generated successfully`,
        data: {
          submission_id: result.submission_id,
          claim_id: result.claim_id,
          claim_type: result.claim_type,
          edi_file_name: result.edi_file_name,
          edi_file_path: result.edi_file_path,
          edi_control_number: result.edi_control_number,
          edi_group_control_number: result.edi_group_control_number,
          edi_transaction_control_number: result.edi_transaction_control_number,
          file_size_bytes: result.file_size_bytes,
          segment_count: result.segment_count,
          checksum: result.checksum,
          generated_at: result.generated_at
        }
      };
    } catch (error) {
      logger.error('Error in generate837:', error);

      let statusCode = 500;
      if (error.message.includes('validation failed') || error.message.includes('scrubbing')) {
        statusCode = 400;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }

      reply.code(statusCode);
      return {
        status: 'error',
        message: error.message || 'Failed to generate 837 file',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Generate batch 837 EDI file for multiple claims
   * POST /api/edi837/generate-batch
   *
   * @param {object} request - Fastify request
   * @param {object} request.body - Request body
   * @param {number[]} request.body.claim_ids - Array of claim IDs to include
   * @param {string} request.body.batch_name - Optional: Custom batch identifier
   * @param {string} request.body.claim_type - Optional: Force specific claim type
   * @param {string} request.body.clearinghouse_id - Optional: Clearinghouse configuration ID
   * @param {boolean} request.body.continue_on_error - Optional: Continue if individual claims fail
   * @param {boolean} request.body.skip_validation - Optional: Skip pre-generation validation
   * @param {object} reply - Fastify reply
   */
  async generateBatch837(request, reply) {
    try {
      const {
        claim_ids,
        batch_name,
        claim_type,
        clearinghouse_id,
        continue_on_error = true,
        skip_validation = false
      } = request.body || {};

      if (!claim_ids || !Array.isArray(claim_ids)) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Request body must contain a "claim_ids" array'
        };
      }

      if (claim_ids.length === 0) {
        reply.code(400);
        return {
          status: 'error',
          message: 'claim_ids array cannot be empty'
        };
      }

      if (claim_ids.length > 5000) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Maximum 5000 claims can be included in a batch file'
        };
      }

      const options = {
        batch_name,
        claim_type,
        clearinghouse_id,
        continue_on_error,
        skip_validation
      };

      const result = await EDI837Generator.generateBatch837(claim_ids, options);

      reply.code(200);
      return {
        status: 'success',
        message: `Batch 837 file generated for ${result.claims_processed} claims` +
                 (result.claims_failed > 0 ? ` (${result.claims_failed} failed)` : ''),
        data: {
          batch_id: result.batch_id,
          submission_ids: result.submission_ids,
          edi_file_name: result.edi_file_name,
          edi_file_path: result.edi_file_path,
          edi_control_number: result.edi_control_number,
          claims_processed: result.claims_processed,
          claims_failed: result.claims_failed,
          failed_claims: result.failed_claims,
          processed_claims: result.processed_claims,
          total_charges_cents: result.total_charges_cents,
          file_size_bytes: result.file_size_bytes,
          segment_count: result.segment_count,
          checksum: result.checksum,
          generated_at: result.generated_at
        }
      };
    } catch (error) {
      logger.error('Error in generateBatch837:', error);

      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to generate batch 837 file',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Validate claim for EDI generation
   * POST /api/edi837/validate/:claimId
   *
   * @param {object} request - Fastify request
   * @param {object} request.params.claimId - Claim ID to validate
   * @param {object} request.body - Validation options
   * @param {string} request.body.claim_type - Optional: '837I' or '837P'
   * @param {object} reply - Fastify reply
   */
  async validateClaim(request, reply) {
    try {
      const { claimId } = request.params;

      if (!claimId) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Claim ID parameter is required'
        };
      }

      const claimType = request.body?.claim_type;

      const result = await EDI837Generator.validateClaim(parseInt(claimId), claimType);

      reply.code(200);
      return {
        status: 'success',
        message: result.is_valid
          ? 'Claim is valid for EDI generation'
          : `Claim validation failed with ${result.errors.length} error(s)`,
        data: {
          claim_id: result.claim_id,
          claim_type: result.claim_type,
          is_valid: result.is_valid,
          errors: result.errors,
          warnings: result.warnings,
          validated_at: result.validated_at
        }
      };
    } catch (error) {
      logger.error('Error in validateClaim:', error);

      let statusCode = 500;
      if (error.message.includes('not found')) {
        statusCode = 404;
      }

      reply.code(statusCode);
      return {
        status: 'error',
        message: error.message || 'Failed to validate claim',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Preview EDI content without saving
   * GET /api/edi837/preview/:claimId
   *
   * @param {object} request - Fastify request
   * @param {object} request.params.claimId - Claim ID to preview
   * @param {object} request.query - Query parameters
   * @param {string} request.query.claim_type - Optional: '837I' or '837P'
   * @param {string} request.query.clearinghouse_id - Optional: Clearinghouse configuration ID
   * @param {object} reply - Fastify reply
   */
  async previewEDI(request, reply) {
    try {
      const { claimId } = request.params;

      if (!claimId) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Claim ID parameter is required'
        };
      }

      const options = {
        claim_type: request.query?.claim_type,
        clearinghouse_id: request.query?.clearinghouse_id,
        skip_validation: request.query?.skip_validation === 'true'
      };

      const result = await EDI837Generator.previewEDI(parseInt(claimId), options);

      reply.code(200);
      return {
        status: 'success',
        message: 'EDI preview generated successfully',
        data: {
          preview: true,
          claim_id: result.claim_id,
          claim_type: result.claim_type,
          edi_content: result.edi_content,
          segment_count: result.segment_count,
          checksum: result.checksum,
          control_numbers: result.control_numbers
        }
      };
    } catch (error) {
      logger.error('Error in previewEDI:', error);

      let statusCode = 500;
      if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('validation failed')) {
        statusCode = 400;
      }

      reply.code(statusCode);
      return {
        status: 'error',
        message: error.message || 'Failed to generate EDI preview',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get supported claim types
   * GET /api/edi837/claim-types
   *
   * @param {object} request - Fastify request
   * @param {object} reply - Fastify reply
   */
  async getClaimTypes(request, reply) {
    try {
      const claimTypes = EDI837Generator.getSupportedClaimTypes();

      reply.code(200);
      return {
        status: 'success',
        data: {
          claim_types: claimTypes
        }
      };
    } catch (error) {
      logger.error('Error in getClaimTypes:', error);

      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get claim types',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get submission history for a claim
   * GET /api/edi837/submissions/:claimId
   *
   * @param {object} request - Fastify request
   * @param {object} request.params.claimId - Claim ID
   * @param {object} reply - Fastify reply
   */
  async getSubmissionHistory(request, reply) {
    try {
      const { claimId } = request.params;

      if (!claimId) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Claim ID parameter is required'
        };
      }

      const submissions = await db
        .select({
          id: clearinghouse_submissions.id,
          claim_id: clearinghouse_submissions.claim_id,
          submission_batch_id: clearinghouse_submissions.submission_batch_id,
          submission_date: clearinghouse_submissions.submission_date,
          submission_method: clearinghouse_submissions.submission_method,
          edi_file_name: clearinghouse_submissions.edi_file_name,
          edi_control_number: clearinghouse_submissions.edi_control_number,
          edi_group_control_number: clearinghouse_submissions.edi_group_control_number,
          edi_transaction_control_number: clearinghouse_submissions.edi_transaction_control_number,
          clearinghouse_name: clearinghouse_submissions.clearinghouse_name,
          clearinghouse_id: clearinghouse_submissions.clearinghouse_id,
          payer_id: clearinghouse_submissions.payer_id,
          acknowledgment_status: clearinghouse_submissions.acknowledgment_status,
          acknowledgment_date: clearinghouse_submissions.acknowledgment_date,
          current_status: clearinghouse_submissions.current_status,
          status_date: clearinghouse_submissions.status_date,
          submitted_charges: clearinghouse_submissions.submitted_charges,
          errors: clearinghouse_submissions.errors,
          warnings: clearinghouse_submissions.warnings,
          metadata: clearinghouse_submissions.metadata,
          created_at: clearinghouse_submissions.created_at
        })
        .from(clearinghouse_submissions)
        .where(eq(clearinghouse_submissions.claim_id, parseInt(claimId)))
        .orderBy(desc(clearinghouse_submissions.submission_date));

      reply.code(200);
      return {
        status: 'success',
        data: {
          claim_id: parseInt(claimId),
          submission_count: submissions.length,
          submissions: submissions.map(s => ({
            submission_id: s.id,
            batch_id: s.submission_batch_id,
            submission_date: s.submission_date,
            submission_method: s.submission_method,
            edi_file_name: s.edi_file_name,
            control_numbers: {
              isa: s.edi_control_number,
              gs: s.edi_group_control_number,
              st: s.edi_transaction_control_number
            },
            clearinghouse: {
              name: s.clearinghouse_name,
              id: s.clearinghouse_id
            },
            status: {
              current: s.current_status,
              acknowledgment: s.acknowledgment_status,
              acknowledgment_date: s.acknowledgment_date,
              updated_at: s.status_date
            },
            charges_cents: s.submitted_charges,
            claim_type: s.metadata?.claim_type,
            errors: s.errors,
            warnings: s.warnings,
            created_at: s.created_at
          }))
        }
      };
    } catch (error) {
      logger.error('Error in getSubmissionHistory:', error);

      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve submission history',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Download EDI file
   * GET /api/edi837/download/:submissionId
   *
   * @param {object} request - Fastify request
   * @param {object} request.params.submissionId - Submission ID
   * @param {object} request.query.format - Optional: 'raw' or 'formatted' (default: 'raw')
   * @param {object} reply - Fastify reply
   */
  async downloadEDI(request, reply) {
    try {
      const { submissionId } = request.params;
      const format = request.query?.format || 'raw';

      if (!submissionId) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Submission ID parameter is required'
        };
      }

      // Get submission record
      const submissionResults = await db
        .select({
          id: clearinghouse_submissions.id,
          edi_file_name: clearinghouse_submissions.edi_file_name,
          edi_file_path: clearinghouse_submissions.edi_file_path,
          edi_content: clearinghouse_submissions.edi_content,
          metadata: clearinghouse_submissions.metadata
        })
        .from(clearinghouse_submissions)
        .where(eq(clearinghouse_submissions.id, parseInt(submissionId)))
        .limit(1);

      if (!submissionResults[0]) {
        reply.code(404);
        return {
          status: 'error',
          message: `Submission ${submissionId} not found`
        };
      }

      const submission = submissionResults[0];

      // Try to read from file first, then fall back to stored content
      let fileContent;
      try {
        if (submission.edi_file_path) {
          fileContent = await fs.readFile(submission.edi_file_path, 'utf8');
        } else if (submission.edi_content) {
          fileContent = submission.edi_content;
        } else {
          throw new Error('EDI content not available');
        }
      } catch (fileError) {
        if (submission.edi_content) {
          fileContent = submission.edi_content;
        } else {
          reply.code(404);
          return {
            status: 'error',
            message: 'EDI file content not found'
          };
        }
      }

      // Format content if requested
      if (format === 'formatted') {
        // Add line breaks after each segment for readability
        fileContent = fileContent.replace(/~/g, '~\n');
      }

      // Set response headers for file download
      reply.header('Content-Type', 'text/plain');
      reply.header('Content-Disposition', `attachment; filename="${submission.edi_file_name || 'edi_837.txt'}"`);
      reply.code(200);
      return fileContent;
    } catch (error) {
      logger.error('Error in downloadEDI:', error);

      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to download EDI file',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get submission status summary
   * GET /api/edi837/submission-status
   *
   * @param {object} request - Fastify request
   * @param {object} request.query - Query parameters
   * @param {string} request.query.status - Filter by status
   * @param {string} request.query.date_from - Filter from date
   * @param {string} request.query.date_to - Filter to date
   * @param {string} request.query.clearinghouse_id - Filter by clearinghouse
   * @param {number} request.query.limit - Max results (default: 100)
   * @param {number} request.query.offset - Offset for pagination (default: 0)
   * @param {object} reply - Fastify reply
   */
  async getSubmissionStatus(request, reply) {
    try {
      const {
        status,
        date_from,
        date_to,
        clearinghouse_id,
        limit = 100,
        offset = 0
      } = request.query || {};

      // Build query filters
      const filters = [];
      if (status) {
        filters.push(eq(clearinghouse_submissions.current_status, status));
      }
      if (date_from) {
        filters.push(gte(clearinghouse_submissions.submission_date, new Date(date_from)));
      }
      if (date_to) {
        filters.push(sql`${clearinghouse_submissions.submission_date} <= ${new Date(date_to)}`);
      }
      if (clearinghouse_id) {
        filters.push(eq(clearinghouse_submissions.clearinghouse_id, clearinghouse_id));
      }

      // Query submissions
      let query = db
        .select({
          id: clearinghouse_submissions.id,
          claim_id: clearinghouse_submissions.claim_id,
          submission_batch_id: clearinghouse_submissions.submission_batch_id,
          submission_date: clearinghouse_submissions.submission_date,
          edi_file_name: clearinghouse_submissions.edi_file_name,
          edi_control_number: clearinghouse_submissions.edi_control_number,
          clearinghouse_name: clearinghouse_submissions.clearinghouse_name,
          current_status: clearinghouse_submissions.current_status,
          acknowledgment_status: clearinghouse_submissions.acknowledgment_status,
          submitted_charges: clearinghouse_submissions.submitted_charges,
          metadata: clearinghouse_submissions.metadata
        })
        .from(clearinghouse_submissions);

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const submissions = await query
        .orderBy(desc(clearinghouse_submissions.submission_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Get summary counts
      const summaryCounts = await db
        .select({
          current_status: clearinghouse_submissions.current_status,
          count: sql`COUNT(*)::int`,
          total_charges: sql`SUM(COALESCE(${clearinghouse_submissions.submitted_charges}, 0))::bigint`
        })
        .from(clearinghouse_submissions)
        .groupBy(clearinghouse_submissions.current_status);

      const summary = {
        total: 0,
        by_status: {},
        total_charges_cents: 0
      };

      for (const row of summaryCounts) {
        const statusKey = (row.current_status || 'unknown').toLowerCase();
        summary.by_status[statusKey] = row.count;
        summary.total += row.count;
        summary.total_charges_cents += parseInt(row.total_charges) || 0;
      }

      reply.code(200);
      return {
        status: 'success',
        data: {
          submissions: submissions.map(s => ({
            submission_id: s.id,
            claim_id: s.claim_id,
            batch_id: s.submission_batch_id,
            submission_date: s.submission_date,
            edi_file_name: s.edi_file_name,
            edi_control_number: s.edi_control_number,
            clearinghouse_name: s.clearinghouse_name,
            current_status: s.current_status,
            acknowledgment_status: s.acknowledgment_status,
            charges_cents: s.submitted_charges,
            claim_type: s.metadata?.claim_type
          })),
          summary,
          pagination: {
            limit: parseInt(limit),
            offset: parseInt(offset),
            returned: submissions.length
          }
        }
      };
    } catch (error) {
      logger.error('Error in getSubmissionStatus:', error);

      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve submission status',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }
}

// Export singleton instance
export default new EDI837Controller();
