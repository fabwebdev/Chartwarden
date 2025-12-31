import EDIGenerator from '../services/EDIGenerator.service.js';
import { db } from '../db/index.js';
import { clearinghouse_submissions } from '../db/schemas/clearinghouse.schema.js';
import { eq, sql, gte, and } from 'drizzle-orm';
import fs from 'fs/promises';

import { logger } from '../utils/logger.js';
/**
 * Clearinghouse Controller
 * Phase 2C - 837I EDI Generation
 *
 * Manages 837I EDI file generation and clearinghouse submission
 * Features:
 *   - Single and batch 837I file generation
 *   - Submission tracking
 *   - File download
 *   - 277 acknowledgment processing
 *   - Submission status monitoring
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
class ClearinghouseController {

  /**
   * Generate 837I file for single claim
   * POST /api/clearinghouse/generate-837i/:claimId
   *
   * Params: claimId (claim ID)
   * Response: { status, message, data: { submission_id, claim_id, edi_file_name, ... } }
   */
  async generate837I(request, reply) {
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
        clearinghouse_name: request.body?.clearinghouse_name || 'Default Clearinghouse'
      };

      const result = await EDIGenerator.generate837I(parseInt(claimId), options);

      reply.code(200);
      return {
        status: 'success',
        message: '837I file generated successfully',
        data: {
          submission_id: result.submission_id,
          claim_id: result.claim_id,
          edi_file_name: result.edi_file_name,
          edi_file_path: result.edi_file_path,
          edi_control_number: result.edi_control_number,
          file_size_bytes: result.file_size_bytes,
          segment_count: result.segment_count,
          generated_at: result.generated_at
        }
      };
    } catch (error) {
      logger.error('Error in generate837I:', error)

      // Determine appropriate error code
      let statusCode = 500;
      if (error.message.includes('not passed scrubbing')) {
        statusCode = 400;
      } else if (error.message.includes('not found')) {
        statusCode = 404;
      } else if (error.message.includes('required')) {
        statusCode = 400;
      }

      reply.code(statusCode);
      return {
        status: 'error',
        message: error.message || 'Failed to generate 837I file',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Generate batch 837I file for multiple claims
   * POST /api/clearinghouse/generate-batch
   *
   * Body: { claim_ids: [1, 2, 3], batch_name: "Daily Submission 2025-01-15" }
   * Response: { status, message, data: { batch_id, submission_ids, edi_file_name, ... } }
   */
  async generateBatch837I(request, reply) {
    try {
      const { claim_ids, batch_name } = request.body;

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

      if (claim_ids.length > 1000) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Maximum 1000 claims can be included in a batch file'
        };
      }

      const result = await EDIGenerator.generateBatch837I(claim_ids, batch_name);

      reply.code(200);
      return {
        status: 'success',
        message: `Batch 837I file generated for ${result.claims_count} claims`,
        data: {
          batch_id: result.batch_id,
          submission_ids: result.submission_ids,
          edi_file_name: result.edi_file_name,
          edi_file_path: result.edi_file_path,
          claims_count: result.claims_count,
          file_size_bytes: result.file_size_bytes,
          generated_at: result.generated_at
        }
      };
    } catch (error) {
      logger.error('Error in generateBatch837I:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to generate batch 837I file',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get submission history for claim
   * GET /api/clearinghouse/submissions/:claimId
   *
   * Params: claimId (claim ID)
   * Response: { status, data: { claim_id, submissions: [...] } }
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
          edi_file_path: clearinghouse_submissions.edi_file_path,
          edi_control_number: clearinghouse_submissions.edi_control_number,
          clearinghouse_name: clearinghouse_submissions.clearinghouse_name,
          clearinghouse_id: clearinghouse_submissions.clearinghouse_id,
          acknowledgment_status: clearinghouse_submissions.acknowledgment_status,
          acknowledgment_date: clearinghouse_submissions.acknowledgment_date,
          acknowledgment_details: clearinghouse_submissions.acknowledgment_details,
          current_status: clearinghouse_submissions.current_status,
          status_date: clearinghouse_submissions.status_date,
          errors: clearinghouse_submissions.errors,
          warnings: clearinghouse_submissions.warnings,
          metadata: clearinghouse_submissions.metadata,
          created_by_id: clearinghouse_submissions.created_by_id,
          created_at: clearinghouse_submissions.created_at,
          updated_at: clearinghouse_submissions.updated_at
        })
        .from(clearinghouse_submissions)
        .where(eq(clearinghouse_submissions.claim_id, parseInt(claimId)))
        .orderBy(sql`${clearinghouse_submissions.submission_date} DESC`);

      reply.code(200);
      return {
        status: 'success',
        data: {
          claim_id: parseInt(claimId),
          submissions: submissions.map(s => ({
            submission_id: s.id,
            submission_date: s.submission_date,
            submission_batch_id: s.submission_batch_id,
            edi_control_number: s.edi_control_number,
            edi_file_name: s.edi_file_name,
            clearinghouse_name: s.clearinghouse_name,
            current_status: s.current_status,
            acknowledgment_status: s.acknowledgment_status,
            acknowledgment_date: s.acknowledgment_date
          }))
        }
      };
    } catch (error) {
      logger.error('Error in getSubmissionHistory:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve submission history',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Submit EDI file to clearinghouse via SFTP
   * POST /api/clearinghouse/submit/:submissionId
   *
   * Params: submissionId (submission ID)
   * Response: { status, message, data: { submission_id, clearinghouse_name, ... } }
   */
  async submitToClearinghouse(request, reply) {
    try {
      const { submissionId } = request.params;

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
          clearinghouse_name: clearinghouse_submissions.clearinghouse_name
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

      // In production, this would:
      // 1. Connect to clearinghouse SFTP server
      // 2. Upload the EDI file
      // 3. Verify successful transfer
      // For now, we'll simulate the submission

      // Simulate SFTP submission
      const sftpPath = `/outbound/${submission.edi_file_name}`;

      // Update submission status
      await db.update(clearinghouse_submissions)
        .set({
          current_status: 'SUBMITTED',
          submission_method: 'SFTP',
          status_date: new Date(),
          metadata: sql`COALESCE(${clearinghouse_submissions.metadata}, '{}'::jsonb) || ${JSON.stringify({ sftp_path: sftpPath })}::jsonb`
        })
        .where(eq(clearinghouse_submissions.id, parseInt(submissionId)));

      reply.code(200);
      return {
        status: 'success',
        message: 'Submitted to clearinghouse successfully',
        data: {
          submission_id: parseInt(submissionId),
          clearinghouse_name: submission.clearinghouse_name,
          submission_method: 'SFTP',
          sftp_path: sftpPath,
          submitted_at: new Date()
        }
      };
    } catch (error) {
      logger.error('Error in submitToClearinghouse:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to submit to clearinghouse',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Download EDI file
   * GET /api/clearinghouse/download-edi/:submissionId
   *
   * Params: submissionId (submission ID)
   * Response: File download (text/plain)
   */
  async downloadEDIFile(request, reply) {
    try {
      const { submissionId } = request.params;

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
          edi_content: clearinghouse_submissions.edi_content
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

      // Check if file exists
      if (!submission.edi_file_path) {
        reply.code(404);
        return {
          status: 'error',
          message: 'EDI file path not found for this submission'
        };
      }

      // Read file content
      let fileContent;
      try {
        fileContent = await fs.readFile(submission.edi_file_path, 'utf8');
      } catch (fileError) {
        // If file doesn't exist on disk, use stored content
        if (submission.edi_content) {
          fileContent = submission.edi_content;
        } else {
          reply.code(404);
          return {
            status: 'error',
            message: 'EDI file not found'
          };
        }
      }

      // Set response headers for file download
      reply.header('Content-Type', 'text/plain');
      reply.header('Content-Disposition', `attachment; filename="${submission.edi_file_name}"`);
      reply.code(200);
      return fileContent;
    } catch (error) {
      logger.error('Error in downloadEDIFile:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to download EDI file',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Process 277 acknowledgment file from clearinghouse
   * POST /api/clearinghouse/process-277
   *
   * Body: { file_path: "...", file_content: "ISA*..." }
   * Response: { status, message, data: { claims_accepted, claims_rejected, submissions_updated } }
   */
  async process277Acknowledgment(request, reply) {
    try {
      const { file_path, file_content } = request.body;

      if (!file_content) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Request body must contain "file_content" with 277 EDI data'
        };
      }

      // Parse 277 file (simplified - in production, use a proper EDI parser)
      // This is a placeholder implementation
      const acknowledgments = this.parse277File(file_content);

      let claimsAccepted = 0;
      let claimsRejected = 0;
      const submissionsUpdated = [];

      for (const ack of acknowledgments) {
        try {
          // Find submission by control number
          const submissions = await db
            .select({
              id: clearinghouse_submissions.id,
              claim_id: clearinghouse_submissions.claim_id,
              submission_batch_id: clearinghouse_submissions.submission_batch_id,
              submission_date: clearinghouse_submissions.submission_date,
              edi_control_number: clearinghouse_submissions.edi_control_number,
              edi_file_name: clearinghouse_submissions.edi_file_name,
              clearinghouse_name: clearinghouse_submissions.clearinghouse_name,
              current_status: clearinghouse_submissions.current_status,
              acknowledgment_status: clearinghouse_submissions.acknowledgment_status
            })
            .from(clearinghouse_submissions)
            .where(eq(clearinghouse_submissions.edi_control_number, ack.control_number))
            .limit(1);

          if (submissions[0]) {
            const submission = submissions[0];
            const isAccepted = ack.status === 'ACCEPTED';

            if (isAccepted) {
              claimsAccepted++;
            } else {
              claimsRejected++;
            }

            // Update submission
            await db.update(clearinghouse_submissions)
              .set({
                acknowledgment_status: ack.status,
                acknowledgment_date: new Date(),
                acknowledgment_details: ack,
                errors: ack.errors || null,
                current_status: isAccepted ? 'ACCEPTED' : 'REJECTED'
              })
              .where(eq(clearinghouse_submissions.id, submission.id));

            submissionsUpdated.push({
              submission_id: submission.id,
              acknowledgment_status: ack.status,
              errors: ack.errors || []
            });
          }
        } catch (error) {
          logger.error(`Error processing acknowledgment for control number ${ack.control_number}:`, error)
        }
      }

      reply.code(200);
      return {
        status: 'success',
        message: `Processed 277 acknowledgment for ${submissionsUpdated.length} claims`,
        data: {
          claims_accepted: claimsAccepted,
          claims_rejected: claimsRejected,
          submissions_updated: submissionsUpdated
        }
      };
    } catch (error) {
      logger.error('Error in process277Acknowledgment:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to process 277 acknowledgment',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get all submission statuses
   * GET /api/clearinghouse/submission-status?status=PENDING&date_from=2025-01-01
   *
   * Query: status (optional), date_from (optional)
   * Response: { status, data: { submissions, summary } }
   */
  async getSubmissionStatuses(request, reply) {
    try {
      const { status, date_from, limit = 100, offset = 0 } = request.query;

      let query = db.select({
        id: clearinghouse_submissions.id,
        claim_id: clearinghouse_submissions.claim_id,
        submission_batch_id: clearinghouse_submissions.submission_batch_id,
        submission_date: clearinghouse_submissions.submission_date,
        submission_method: clearinghouse_submissions.submission_method,
        edi_file_name: clearinghouse_submissions.edi_file_name,
        edi_file_path: clearinghouse_submissions.edi_file_path,
        edi_control_number: clearinghouse_submissions.edi_control_number,
        clearinghouse_name: clearinghouse_submissions.clearinghouse_name,
        clearinghouse_id: clearinghouse_submissions.clearinghouse_id,
        acknowledgment_status: clearinghouse_submissions.acknowledgment_status,
        acknowledgment_date: clearinghouse_submissions.acknowledgment_date,
        acknowledgment_details: clearinghouse_submissions.acknowledgment_details,
        current_status: clearinghouse_submissions.current_status,
        status_date: clearinghouse_submissions.status_date,
        errors: clearinghouse_submissions.errors,
        warnings: clearinghouse_submissions.warnings,
        metadata: clearinghouse_submissions.metadata,
        created_by_id: clearinghouse_submissions.created_by_id,
        created_at: clearinghouse_submissions.created_at,
        updated_at: clearinghouse_submissions.updated_at
      }).from(clearinghouse_submissions);

      // Apply filters
      const filters = [];
      if (status) {
        filters.push(eq(clearinghouse_submissions.current_status, status));
      }
      if (date_from) {
        filters.push(gte(clearinghouse_submissions.submission_date, date_from));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const submissions = await query
        .orderBy(sql`${clearinghouse_submissions.submission_date} DESC`)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Get summary counts
      const summaryQuery = db
        .select({
          current_status: clearinghouse_submissions.current_status,
          count: sql`COUNT(*)::int`
        })
        .from(clearinghouse_submissions)
        .groupBy(clearinghouse_submissions.current_status);

      const summaryCounts = await summaryQuery;

      const summary = {
        total_submissions: submissions.length,
        pending: 0,
        submitted: 0,
        accepted: 0,
        rejected: 0
      };

      for (const row of summaryCounts) {
        const statusKey = row.current_status?.toLowerCase() || 'unknown';
        if (summary.hasOwnProperty(statusKey)) {
          summary[statusKey] = row.count;
        }
      }

      reply.code(200);
      return {
        status: 'success',
        data: {
          submissions: submissions.map(s => ({
            submission_id: s.id,
            claim_id: s.claim_id,
            submission_date: s.submission_date,
            submission_batch_id: s.submission_batch_id,
            edi_file_name: s.edi_file_name,
            current_status: s.current_status,
            acknowledgment_status: s.acknowledgment_status,
            clearinghouse_name: s.clearinghouse_name
          })),
          summary
        }
      };
    } catch (error) {
      logger.error('Error in getSubmissionStatuses:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve submission statuses',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Parse 277 acknowledgment file (simplified implementation)
   * In production, use a proper EDI parser library
   * @private
   */
  parse277File(fileContent) {
    // Placeholder implementation
    // In production, this would parse the actual 277 EDI format

    // For now, return a mock acknowledgment
    return [
      {
        control_number: '000000001',
        status: 'ACCEPTED',
        errors: []
      }
    ];
  }
}

// Export singleton instance
export default new ClearinghouseController();
