import EDIGenerator from '../services/EDIGenerator.service.js';
import { db } from '../db/index.js';
import {
  clearinghouse_configurations,
  clearinghouse_transmission_batches,
  clearinghouse_submissions,
  clearinghouse_response_files,
  clearinghouse_response_details,
  clearinghouse_submission_status_history
} from '../db/schemas/clearinghouse.schema.js';
import { eq, sql, gte, lte, and, desc, or, isNull } from 'drizzle-orm';
import fs from 'fs/promises';
import { nanoid } from 'nanoid';

import { logger } from '../utils/logger.js';
/**
 * Clearinghouse Controller
 * Phase 2C - 837I EDI Generation & Claim Submission/Response Tracking
 *
 * Comprehensive clearinghouse management for electronic claim submission
 * Features:
 *   - Clearinghouse configuration management (CRUD)
 *   - Single and batch 837I file generation
 *   - Transmission batch management and tracking
 *   - Submission tracking with full lifecycle
 *   - Response file processing (TA1, 999, 277CA, 277)
 *   - Status history and audit trail
 *   - Retry and resubmission functionality
 *   - File download
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
 * - GET /api/clearinghouse/submissions/:claimId - Get submission history
 * - POST /api/clearinghouse/submit/:submissionId - Submit to clearinghouse
 * - POST /api/clearinghouse/submissions/:submissionId/retry - Retry submission
 * - GET /api/clearinghouse/submission-status - Get all submission statuses
 * - GET /api/clearinghouse/submissions/:submissionId/history - Get status history
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
class ClearinghouseController {

  // ==========================================
  // CLEARINGHOUSE CONFIGURATION MANAGEMENT
  // ==========================================

  /**
   * List all clearinghouse configurations
   * GET /api/clearinghouse/configurations
   *
   * Query: active_only (optional), type (optional)
   * Response: { success, data: configurations[] }
   */
  async listConfigurations(request, reply) {
    try {
      const { active_only, type, limit = 50, offset = 0 } = request.query;

      let query = db.select().from(clearinghouse_configurations);

      const filters = [];
      if (active_only === 'true') {
        filters.push(eq(clearinghouse_configurations.is_active, true));
      }
      if (type) {
        filters.push(eq(clearinghouse_configurations.clearinghouse_type, type));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const configurations = await query
        .orderBy(desc(clearinghouse_configurations.created_at))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      return reply.code(200).send({
        success: true,
        count: configurations.length,
        data: configurations
      });
    } catch (error) {
      logger.error('Error listing clearinghouse configurations:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get clearinghouse configuration by ID
   * GET /api/clearinghouse/configurations/:id
   *
   * Params: id (configuration ID)
   * Response: { success, data: configuration }
   */
  async getConfiguration(request, reply) {
    try {
      const { id } = request.params;

      const [configuration] = await db
        .select()
        .from(clearinghouse_configurations)
        .where(eq(clearinghouse_configurations.id, parseInt(id)))
        .limit(1);

      if (!configuration) {
        return reply.code(404).send({
          success: false,
          error: `Configuration ${id} not found`
        });
      }

      return reply.code(200).send({
        success: true,
        data: configuration
      });
    } catch (error) {
      logger.error('Error getting clearinghouse configuration:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Create clearinghouse configuration
   * POST /api/clearinghouse/configurations
   *
   * Body: { name, clearinghouse_id, clearinghouse_type, connection_type, ... }
   * Response: { success, message, data: configuration }
   */
  async createConfiguration(request, reply) {
    try {
      const {
        name,
        clearinghouse_id,
        description,
        clearinghouse_type,
        connection_type,
        host,
        port,
        username,
        credential_vault_key,
        sftp_inbound_path,
        sftp_outbound_path,
        sftp_response_path,
        api_base_url,
        api_version,
        submitter_id,
        submitter_qualifier,
        receiver_id,
        receiver_qualifier,
        application_sender_code,
        application_receiver_code,
        supported_transactions,
        default_payer_id,
        is_production,
        is_active,
        auto_fetch_responses,
        response_poll_interval_minutes,
        metadata
      } = request.body;

      // Validation
      if (!name || !clearinghouse_id || !clearinghouse_type || !connection_type) {
        return reply.code(400).send({
          success: false,
          error: 'name, clearinghouse_id, clearinghouse_type, and connection_type are required'
        });
      }

      // Check for duplicate clearinghouse_id
      const [existing] = await db
        .select()
        .from(clearinghouse_configurations)
        .where(eq(clearinghouse_configurations.clearinghouse_id, clearinghouse_id))
        .limit(1);

      if (existing) {
        return reply.code(409).send({
          success: false,
          error: `Clearinghouse ID ${clearinghouse_id} already exists`
        });
      }

      const [configuration] = await db
        .insert(clearinghouse_configurations)
        .values({
          name,
          clearinghouse_id,
          description,
          clearinghouse_type,
          connection_type,
          host,
          port,
          username,
          credential_vault_key,
          sftp_inbound_path,
          sftp_outbound_path,
          sftp_response_path,
          api_base_url,
          api_version,
          submitter_id,
          submitter_qualifier,
          receiver_id,
          receiver_qualifier,
          application_sender_code,
          application_receiver_code,
          supported_transactions,
          default_payer_id,
          is_production: is_production ?? false,
          is_active: is_active ?? true,
          auto_fetch_responses: auto_fetch_responses ?? true,
          response_poll_interval_minutes: response_poll_interval_minutes ?? 30,
          metadata,
          created_by_id: request.user?.id
        })
        .returning();

      return reply.code(201).send({
        success: true,
        message: 'Clearinghouse configuration created successfully',
        data: configuration
      });
    } catch (error) {
      logger.error('Error creating clearinghouse configuration:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Update clearinghouse configuration
   * PUT /api/clearinghouse/configurations/:id
   *
   * Params: id (configuration ID)
   * Body: { name, clearinghouse_type, ... }
   * Response: { success, message, data: configuration }
   */
  async updateConfiguration(request, reply) {
    try {
      const { id } = request.params;
      const updateData = request.body;

      // Check if exists
      const [existing] = await db
        .select()
        .from(clearinghouse_configurations)
        .where(eq(clearinghouse_configurations.id, parseInt(id)))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({
          success: false,
          error: `Configuration ${id} not found`
        });
      }

      // If updating clearinghouse_id, check for duplicates
      if (updateData.clearinghouse_id && updateData.clearinghouse_id !== existing.clearinghouse_id) {
        const [duplicate] = await db
          .select()
          .from(clearinghouse_configurations)
          .where(eq(clearinghouse_configurations.clearinghouse_id, updateData.clearinghouse_id))
          .limit(1);

        if (duplicate) {
          return reply.code(409).send({
            success: false,
            error: `Clearinghouse ID ${updateData.clearinghouse_id} already exists`
          });
        }
      }

      const [configuration] = await db
        .update(clearinghouse_configurations)
        .set({
          ...updateData,
          updated_by_id: request.user?.id,
          updated_at: new Date()
        })
        .where(eq(clearinghouse_configurations.id, parseInt(id)))
        .returning();

      return reply.code(200).send({
        success: true,
        message: 'Clearinghouse configuration updated successfully',
        data: configuration
      });
    } catch (error) {
      logger.error('Error updating clearinghouse configuration:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Delete clearinghouse configuration
   * DELETE /api/clearinghouse/configurations/:id
   *
   * Params: id (configuration ID)
   * Response: { success, message }
   */
  async deleteConfiguration(request, reply) {
    try {
      const { id } = request.params;

      // Check if exists
      const [existing] = await db
        .select()
        .from(clearinghouse_configurations)
        .where(eq(clearinghouse_configurations.id, parseInt(id)))
        .limit(1);

      if (!existing) {
        return reply.code(404).send({
          success: false,
          error: `Configuration ${id} not found`
        });
      }

      // Check if there are any batches using this configuration
      const [batchCount] = await db
        .select({ count: sql`COUNT(*)::int` })
        .from(clearinghouse_transmission_batches)
        .where(eq(clearinghouse_transmission_batches.clearinghouse_config_id, parseInt(id)));

      if (batchCount.count > 0) {
        return reply.code(400).send({
          success: false,
          error: `Cannot delete configuration with ${batchCount.count} existing transmission batches. Deactivate instead.`
        });
      }

      await db
        .delete(clearinghouse_configurations)
        .where(eq(clearinghouse_configurations.id, parseInt(id)));

      return reply.code(200).send({
        success: true,
        message: 'Clearinghouse configuration deleted successfully'
      });
    } catch (error) {
      logger.error('Error deleting clearinghouse configuration:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  // ==========================================
  // TRANSMISSION BATCH MANAGEMENT
  // ==========================================

  /**
   * List transmission batches
   * GET /api/clearinghouse/batches
   *
   * Query: status, clearinghouse_id, date_from, date_to, limit, offset
   * Response: { success, data: { batches, summary } }
   */
  async listBatches(request, reply) {
    try {
      const { status, clearinghouse_id, date_from, date_to, limit = 50, offset = 0 } = request.query;

      let query = db.select().from(clearinghouse_transmission_batches);

      const filters = [];
      if (status) {
        filters.push(eq(clearinghouse_transmission_batches.transmission_status, status));
      }
      if (clearinghouse_id) {
        filters.push(eq(clearinghouse_transmission_batches.clearinghouse_config_id, parseInt(clearinghouse_id)));
      }
      if (date_from) {
        filters.push(gte(clearinghouse_transmission_batches.batch_date, date_from));
      }
      if (date_to) {
        filters.push(lte(clearinghouse_transmission_batches.batch_date, date_to));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const batches = await query
        .orderBy(desc(clearinghouse_transmission_batches.created_at))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Get summary counts by status
      const summaryResult = await db
        .select({
          status: clearinghouse_transmission_batches.transmission_status,
          count: sql`COUNT(*)::int`,
          total_claims: sql`SUM(${clearinghouse_transmission_batches.claim_count})::int`,
          total_charges: sql`SUM(${clearinghouse_transmission_batches.total_charges})::bigint`
        })
        .from(clearinghouse_transmission_batches)
        .groupBy(clearinghouse_transmission_batches.transmission_status);

      const summary = {};
      for (const row of summaryResult) {
        summary[row.status] = {
          count: row.count,
          total_claims: row.total_claims || 0,
          total_charges: row.total_charges || 0
        };
      }

      return reply.code(200).send({
        success: true,
        count: batches.length,
        data: {
          batches,
          summary
        }
      });
    } catch (error) {
      logger.error('Error listing transmission batches:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get transmission batch details
   * GET /api/clearinghouse/batches/:batchId
   *
   * Params: batchId
   * Response: { success, data: { batch, submissions } }
   */
  async getBatchDetails(request, reply) {
    try {
      const { batchId } = request.params;

      // Get batch
      const [batch] = await db
        .select()
        .from(clearinghouse_transmission_batches)
        .where(eq(clearinghouse_transmission_batches.id, parseInt(batchId)))
        .limit(1);

      if (!batch) {
        return reply.code(404).send({
          success: false,
          error: `Batch ${batchId} not found`
        });
      }

      // Get submissions in this batch
      const submissions = await db
        .select({
          id: clearinghouse_submissions.id,
          claim_id: clearinghouse_submissions.claim_id,
          edi_control_number: clearinghouse_submissions.edi_control_number,
          current_status: clearinghouse_submissions.current_status,
          acknowledgment_status: clearinghouse_submissions.acknowledgment_status,
          submitted_charges: clearinghouse_submissions.submitted_charges,
          errors: clearinghouse_submissions.errors,
          created_at: clearinghouse_submissions.created_at
        })
        .from(clearinghouse_submissions)
        .where(eq(clearinghouse_submissions.batch_id, parseInt(batchId)))
        .orderBy(clearinghouse_submissions.id);

      return reply.code(200).send({
        success: true,
        data: {
          batch,
          submissions
        }
      });
    } catch (error) {
      logger.error('Error getting batch details:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Retry failed transmission batch
   * POST /api/clearinghouse/batches/:batchId/retry
   *
   * Params: batchId
   * Response: { success, message, data }
   */
  async retryBatch(request, reply) {
    try {
      const { batchId } = request.params;

      // Get batch
      const [batch] = await db
        .select()
        .from(clearinghouse_transmission_batches)
        .where(eq(clearinghouse_transmission_batches.id, parseInt(batchId)))
        .limit(1);

      if (!batch) {
        return reply.code(404).send({
          success: false,
          error: `Batch ${batchId} not found`
        });
      }

      // Check if retryable
      if (!['FAILED', 'REJECTED'].includes(batch.transmission_status)) {
        return reply.code(400).send({
          success: false,
          error: `Cannot retry batch with status ${batch.transmission_status}. Only FAILED or REJECTED batches can be retried.`
        });
      }

      if (batch.retry_count >= batch.max_retries) {
        return reply.code(400).send({
          success: false,
          error: `Batch has exceeded maximum retry attempts (${batch.max_retries})`
        });
      }

      // Update batch for retry
      const [updatedBatch] = await db
        .update(clearinghouse_transmission_batches)
        .set({
          transmission_status: 'PENDING',
          status_date: new Date(),
          retry_count: batch.retry_count + 1,
          last_retry_at: new Date(),
          transmission_errors: null,
          updated_at: new Date()
        })
        .where(eq(clearinghouse_transmission_batches.id, parseInt(batchId)))
        .returning();

      // Update submissions in batch
      await db
        .update(clearinghouse_submissions)
        .set({
          current_status: 'PENDING',
          status_date: new Date(),
          retry_count: sql`${clearinghouse_submissions.retry_count} + 1`,
          last_retry_at: new Date(),
          updated_at: new Date()
        })
        .where(and(
          eq(clearinghouse_submissions.batch_id, parseInt(batchId)),
          or(
            eq(clearinghouse_submissions.current_status, 'ERROR'),
            eq(clearinghouse_submissions.current_status, 'REJECTED')
          )
        ));

      return reply.code(200).send({
        success: true,
        message: `Batch ${batchId} queued for retry (attempt ${updatedBatch.retry_count} of ${updatedBatch.max_retries})`,
        data: updatedBatch
      });
    } catch (error) {
      logger.error('Error retrying batch:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  // ==========================================
  // RESPONSE FILE PROCESSING
  // ==========================================

  /**
   * Upload response file (TA1, 999, 277CA, 277)
   * POST /api/clearinghouse/responses/upload
   *
   * Body: { file_name, file_content, response_type, clearinghouse_id }
   * Response: { success, message, data: response_file }
   */
  async uploadResponseFile(request, reply) {
    try {
      const { file_name, file_content, response_type, clearinghouse_id, source } = request.body;

      // Validation
      if (!file_name || !file_content || !response_type) {
        return reply.code(400).send({
          success: false,
          error: 'file_name, file_content, and response_type are required'
        });
      }

      const validResponseTypes = ['TA1', '999', '277CA', '277', '835', 'OTHER'];
      if (!validResponseTypes.includes(response_type)) {
        return reply.code(400).send({
          success: false,
          error: `Invalid response_type. Must be one of: ${validResponseTypes.join(', ')}`
        });
      }

      // Generate file ID and checksum
      const fileId = nanoid();
      const fileChecksum = this.generateChecksum(file_content);

      // Parse control numbers from EDI content
      const { originalIcn, responseIcn, responseGcn } = this.extractControlNumbers(file_content, response_type);

      // Find original batch if we have the original ICN
      let originalBatchId = null;
      if (originalIcn) {
        const [batch] = await db
          .select({ id: clearinghouse_transmission_batches.id })
          .from(clearinghouse_transmission_batches)
          .where(eq(clearinghouse_transmission_batches.interchange_control_number, originalIcn))
          .limit(1);
        originalBatchId = batch?.id || null;
      }

      // Get clearinghouse config if provided
      let configId = null;
      let clearinghouseName = null;
      if (clearinghouse_id) {
        const [config] = await db
          .select()
          .from(clearinghouse_configurations)
          .where(eq(clearinghouse_configurations.clearinghouse_id, clearinghouse_id))
          .limit(1);
        if (config) {
          configId = config.id;
          clearinghouseName = config.name;
        }
      }

      // Create response file record
      const [responseFile] = await db
        .insert(clearinghouse_response_files)
        .values({
          file_id: fileId,
          file_name,
          file_size: file_content.length,
          file_checksum: fileChecksum,
          response_type,
          clearinghouse_config_id: configId,
          clearinghouse_name: clearinghouseName,
          original_batch_id: originalBatchId,
          original_icn: originalIcn,
          response_icn: responseIcn,
          response_gcn: responseGcn,
          received_date: new Date(),
          processing_status: 'PENDING',
          edi_content: file_content,
          source: source || 'MANUAL_UPLOAD'
        })
        .returning();

      return reply.code(201).send({
        success: true,
        message: 'Response file uploaded successfully',
        data: responseFile
      });
    } catch (error) {
      logger.error('Error uploading response file:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * List response files
   * GET /api/clearinghouse/responses
   *
   * Query: response_type, status, date_from, date_to, limit, offset
   * Response: { success, data: response_files[] }
   */
  async listResponseFiles(request, reply) {
    try {
      const { response_type, status, date_from, date_to, limit = 50, offset = 0 } = request.query;

      let query = db.select().from(clearinghouse_response_files);

      const filters = [];
      if (response_type) {
        filters.push(eq(clearinghouse_response_files.response_type, response_type));
      }
      if (status) {
        filters.push(eq(clearinghouse_response_files.processing_status, status));
      }
      if (date_from) {
        filters.push(gte(clearinghouse_response_files.received_date, new Date(date_from)));
      }
      if (date_to) {
        filters.push(lte(clearinghouse_response_files.received_date, new Date(date_to)));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const responseFiles = await query
        .orderBy(desc(clearinghouse_response_files.received_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      return reply.code(200).send({
        success: true,
        count: responseFiles.length,
        data: responseFiles
      });
    } catch (error) {
      logger.error('Error listing response files:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get response file details with parsed responses
   * GET /api/clearinghouse/responses/:fileId
   *
   * Params: fileId
   * Response: { success, data: { file, details } }
   */
  async getResponseFileDetails(request, reply) {
    try {
      const { fileId } = request.params;

      // Get response file
      const [file] = await db
        .select()
        .from(clearinghouse_response_files)
        .where(eq(clearinghouse_response_files.id, parseInt(fileId)))
        .limit(1);

      if (!file) {
        return reply.code(404).send({
          success: false,
          error: `Response file ${fileId} not found`
        });
      }

      // Get response details
      const details = await db
        .select()
        .from(clearinghouse_response_details)
        .where(eq(clearinghouse_response_details.response_file_id, parseInt(fileId)))
        .orderBy(clearinghouse_response_details.id);

      return reply.code(200).send({
        success: true,
        data: {
          file,
          details
        }
      });
    } catch (error) {
      logger.error('Error getting response file details:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Process response file
   * POST /api/clearinghouse/responses/:fileId/process
   *
   * Params: fileId
   * Response: { success, message, data: processing_result }
   */
  async processResponseFile(request, reply) {
    try {
      const { fileId } = request.params;

      // Get response file
      const [file] = await db
        .select()
        .from(clearinghouse_response_files)
        .where(eq(clearinghouse_response_files.id, parseInt(fileId)))
        .limit(1);

      if (!file) {
        return reply.code(404).send({
          success: false,
          error: `Response file ${fileId} not found`
        });
      }

      if (file.processing_status === 'PROCESSED') {
        return reply.code(400).send({
          success: false,
          error: 'Response file has already been processed'
        });
      }

      // Update status to processing
      await db
        .update(clearinghouse_response_files)
        .set({
          processing_status: 'PROCESSING',
          updated_at: new Date()
        })
        .where(eq(clearinghouse_response_files.id, parseInt(fileId)));

      // Parse the response file based on type
      let processingResult;
      try {
        switch (file.response_type) {
          case 'TA1':
            processingResult = await this.processTA1Response(file);
            break;
          case '999':
            processingResult = await this.process999Response(file);
            break;
          case '277CA':
          case '277':
            processingResult = await this.process277Response(file);
            break;
          default:
            processingResult = { accepted: 0, rejected: 0, errors: 0, details: [] };
        }
      } catch (parseError) {
        // Update status to error
        await db
          .update(clearinghouse_response_files)
          .set({
            processing_status: 'ERROR',
            processing_errors: { error: parseError.message },
            updated_at: new Date()
          })
          .where(eq(clearinghouse_response_files.id, parseInt(fileId)));

        throw parseError;
      }

      // Update file with processing results
      await db
        .update(clearinghouse_response_files)
        .set({
          processing_status: 'PROCESSED',
          processed_at: new Date(),
          total_transactions: processingResult.accepted + processingResult.rejected + processingResult.errors,
          accepted_count: processingResult.accepted,
          rejected_count: processingResult.rejected,
          error_count: processingResult.errors,
          processed_by_id: request.user?.id,
          updated_at: new Date()
        })
        .where(eq(clearinghouse_response_files.id, parseInt(fileId)));

      return reply.code(200).send({
        success: true,
        message: `Response file processed: ${processingResult.accepted} accepted, ${processingResult.rejected} rejected`,
        data: processingResult
      });
    } catch (error) {
      logger.error('Error processing response file:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  // ==========================================
  // SUBMISSION RETRY & STATUS HISTORY
  // ==========================================

  /**
   * Retry failed submission
   * POST /api/clearinghouse/submissions/:submissionId/retry
   *
   * Params: submissionId
   * Response: { success, message, data }
   */
  async retrySubmission(request, reply) {
    try {
      const { submissionId } = request.params;

      // Get submission
      const [submission] = await db
        .select()
        .from(clearinghouse_submissions)
        .where(eq(clearinghouse_submissions.id, parseInt(submissionId)))
        .limit(1);

      if (!submission) {
        return reply.code(404).send({
          success: false,
          error: `Submission ${submissionId} not found`
        });
      }

      // Check if retryable
      if (!submission.can_retry) {
        return reply.code(400).send({
          success: false,
          error: 'This submission cannot be retried'
        });
      }

      if (!['ERROR', 'REJECTED'].includes(submission.current_status)) {
        return reply.code(400).send({
          success: false,
          error: `Cannot retry submission with status ${submission.current_status}. Only ERROR or REJECTED submissions can be retried.`
        });
      }

      const previousStatus = submission.current_status;

      // Update submission for retry
      const [updatedSubmission] = await db
        .update(clearinghouse_submissions)
        .set({
          current_status: 'PENDING',
          status_date: new Date(),
          retry_count: submission.retry_count + 1,
          last_retry_at: new Date(),
          errors: null,
          warnings: null,
          updated_at: new Date(),
          updated_by_id: request.user?.id
        })
        .where(eq(clearinghouse_submissions.id, parseInt(submissionId)))
        .returning();

      // Record status history
      await db.insert(clearinghouse_submission_status_history).values({
        submission_id: parseInt(submissionId),
        previous_status: previousStatus,
        new_status: 'PENDING',
        status_date: new Date(),
        change_source: 'USER_ACTION',
        reason: `Manual retry requested (attempt ${updatedSubmission.retry_count})`,
        changed_by_id: request.user?.id
      });

      return reply.code(200).send({
        success: true,
        message: `Submission ${submissionId} queued for retry (attempt ${updatedSubmission.retry_count})`,
        data: updatedSubmission
      });
    } catch (error) {
      logger.error('Error retrying submission:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get submission status history
   * GET /api/clearinghouse/submissions/:submissionId/history
   *
   * Params: submissionId
   * Response: { success, data: history[] }
   */
  async getSubmissionHistory(request, reply) {
    try {
      const { submissionId } = request.params;

      // Check if this is a claim ID (legacy) or submission ID
      // If it's a submission ID, get history; if claim ID, get submission list
      const isSubmissionId = request.path.includes('/history');

      if (isSubmissionId) {
        // Get status history for specific submission
        const history = await db
          .select()
          .from(clearinghouse_submission_status_history)
          .where(eq(clearinghouse_submission_status_history.submission_id, parseInt(submissionId)))
          .orderBy(desc(clearinghouse_submission_status_history.status_date));

        return reply.code(200).send({
          success: true,
          count: history.length,
          data: history
        });
      }

      // Legacy behavior: Get submissions for claim
      return this.getSubmissionsForClaim(request, reply);
    } catch (error) {
      logger.error('Error getting submission history:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get submissions for a specific claim (legacy endpoint support)
   * @private
   */
  async getSubmissionsForClaim(request, reply) {
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
      logger.error('Error in getSubmissionsForClaim:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to retrieve submission history',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  // ==========================================
  // HELPER METHODS
  // ==========================================

  /**
   * Generate simple checksum for file content
   * @private
   */
  generateChecksum(content) {
    let hash = 0;
    for (let i = 0; i < content.length; i++) {
      const char = content.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16).padStart(16, '0');
  }

  /**
   * Extract control numbers from EDI content
   * @private
   */
  extractControlNumbers(content, responseType) {
    const result = {
      originalIcn: null,
      responseIcn: null,
      responseGcn: null
    };

    try {
      // Parse ISA segment for response ICN
      const isaMatch = content.match(/ISA\*[^~]*\*([^~*]+)~/);
      if (isaMatch) {
        const isaParts = content.split('~')[0].split('*');
        if (isaParts.length >= 14) {
          result.responseIcn = isaParts[13]?.trim();
        }
      }

      // Parse GS segment for GCN
      const gsMatch = content.match(/GS\*[^~]*~/);
      if (gsMatch) {
        const gsParts = gsMatch[0].split('*');
        if (gsParts.length >= 7) {
          result.responseGcn = gsParts[6]?.trim();
        }
      }

      // For TA1, the original ICN is in the TA1 segment
      if (responseType === 'TA1') {
        const ta1Match = content.match(/TA1\*([^*]+)\*/);
        if (ta1Match) {
          result.originalIcn = ta1Match[1]?.trim();
        }
      }

      // For 999/277, look for AK1/AK2 segments
      if (responseType === '999') {
        const ak1Match = content.match(/AK1\*[^*]+\*([^~*]+)/);
        if (ak1Match) {
          result.originalIcn = ak1Match[1]?.trim();
        }
      }
    } catch (e) {
      logger.warn('Error extracting control numbers:', e);
    }

    return result;
  }

  /**
   * Process TA1 (Interchange Acknowledgment) response
   * @private
   */
  async processTA1Response(file) {
    const result = { accepted: 0, rejected: 0, errors: 0, details: [] };
    const content = file.edi_content;

    // Parse TA1 segments
    const ta1Segments = content.match(/TA1\*[^~]+~/g) || [];

    for (const segment of ta1Segments) {
      const parts = segment.replace('~', '').split('*');
      const originalIcn = parts[1];
      const ackCode = parts[4]; // A, E, or R

      let responseStatus;
      if (ackCode === 'A') {
        responseStatus = 'ACCEPTED';
        result.accepted++;
      } else if (ackCode === 'E') {
        responseStatus = 'ACCEPTED_WITH_ERRORS';
        result.accepted++;
      } else {
        responseStatus = 'REJECTED';
        result.rejected++;
      }

      // Find matching submission
      const [submission] = await db
        .select()
        .from(clearinghouse_submissions)
        .where(eq(clearinghouse_submissions.edi_control_number, originalIcn))
        .limit(1);

      if (submission) {
        // Update submission
        await db
          .update(clearinghouse_submissions)
          .set({
            ta1_received: true,
            ta1_received_at: new Date(),
            ta1_status: ackCode,
            ta1_error_code: parts[5] || null,
            ta1_details: { segment: segment, note_code: parts[5] },
            current_status: responseStatus === 'REJECTED' ? 'REJECTED' : submission.current_status,
            updated_at: new Date()
          })
          .where(eq(clearinghouse_submissions.id, submission.id));

        // Create response detail
        await db.insert(clearinghouse_response_details).values({
          response_file_id: file.id,
          submission_id: submission.id,
          claim_id: submission.claim_id,
          response_type: 'TA1',
          original_icn: originalIcn,
          response_status: responseStatus,
          ta1_acknowledgment_code: ackCode,
          ta1_note_code: parts[5] || null,
          raw_segments: { ta1: segment }
        });

        // Record status history if status changed
        if (responseStatus === 'REJECTED') {
          await db.insert(clearinghouse_submission_status_history).values({
            submission_id: submission.id,
            previous_status: submission.current_status,
            new_status: 'REJECTED',
            status_date: new Date(),
            change_source: 'TA1_RESPONSE',
            response_file_id: file.id,
            reason: `TA1 rejection - Error code: ${parts[5] || 'Unknown'}`
          });
        }
      }

      result.details.push({
        original_icn: originalIcn,
        ack_code: ackCode,
        status: responseStatus,
        submission_found: !!submission
      });
    }

    return result;
  }

  /**
   * Process 999 (Functional Acknowledgment) response
   * @private
   */
  async process999Response(file) {
    const result = { accepted: 0, rejected: 0, errors: 0, details: [] };
    const content = file.edi_content;

    // Parse AK9 segments for overall acknowledgment
    const ak9Match = content.match(/AK9\*([^*]+)\*(\d+)\*(\d+)\*(\d+)/);
    if (ak9Match) {
      const ackCode = ak9Match[1];
      const acceptedCount = parseInt(ak9Match[3]);
      const rejectedCount = parseInt(ak9Match[2]) - acceptedCount;

      result.accepted = acceptedCount;
      result.rejected = rejectedCount;

      // Find original ICN from AK1 segment
      const ak1Match = content.match(/AK1\*[^*]+\*([^~*]+)/);
      const originalGcn = ak1Match ? ak1Match[1] : null;

      if (originalGcn) {
        // Update submissions that match this GCN
        const submissions = await db
          .select()
          .from(clearinghouse_submissions)
          .where(eq(clearinghouse_submissions.edi_group_control_number, originalGcn));

        for (const submission of submissions) {
          const isAccepted = ackCode === 'A' || ackCode === 'E';

          await db
            .update(clearinghouse_submissions)
            .set({
              ack_999_received: true,
              ack_999_received_at: new Date(),
              ack_999_status: ackCode,
              ack_999_details: { ak9: ak9Match[0] },
              current_status: isAccepted ? 'ACKNOWLEDGED' : 'REJECTED',
              updated_at: new Date()
            })
            .where(eq(clearinghouse_submissions.id, submission.id));

          // Create response detail
          await db.insert(clearinghouse_response_details).values({
            response_file_id: file.id,
            submission_id: submission.id,
            claim_id: submission.claim_id,
            response_type: '999',
            original_gcn: originalGcn,
            response_status: isAccepted ? 'ACCEPTED' : 'REJECTED',
            ack_999_code: ackCode,
            raw_segments: { ak9: ak9Match[0] }
          });

          // Record status history
          await db.insert(clearinghouse_submission_status_history).values({
            submission_id: submission.id,
            previous_status: submission.current_status,
            new_status: isAccepted ? 'ACKNOWLEDGED' : 'REJECTED',
            status_date: new Date(),
            change_source: '999_RESPONSE',
            response_file_id: file.id,
            reason: `999 Functional Acknowledgment - Code: ${ackCode}`
          });
        }
      }
    }

    return result;
  }

  /**
   * Process 277 (Claim Status) response
   * @private
   */
  async process277Response(file) {
    const result = { accepted: 0, rejected: 0, errors: 0, details: [] };
    const content = file.edi_content;

    // Parse STC segments for claim status
    const stcSegments = content.match(/STC\*[^~]+~/g) || [];

    for (const segment of stcSegments) {
      const parts = segment.replace('~', '').split('*');
      const statusInfo = parts[1]?.split(':') || [];
      const categoryCode = statusInfo[0];
      const statusCode = statusInfo[1];

      // Determine if accepted or rejected based on category code
      // A0-A2 = Accepted, A3+ = Various pending/rejected states
      const isAccepted = categoryCode && ['A0', 'A1', 'A2'].includes(categoryCode);

      if (isAccepted) {
        result.accepted++;
      } else {
        result.rejected++;
      }

      // Look for claim reference in preceding REF segments
      // This is simplified - production would need full EDI parsing
      const refMatch = content.match(/REF\*D9\*([^~*]+)/);
      const claimRef = refMatch ? refMatch[1] : null;

      result.details.push({
        category_code: categoryCode,
        status_code: statusCode,
        claim_reference: claimRef,
        status: isAccepted ? 'ACCEPTED' : 'REJECTED'
      });
    }

    // Update any matching submissions
    if (file.original_batch_id) {
      const submissions = await db
        .select()
        .from(clearinghouse_submissions)
        .where(eq(clearinghouse_submissions.batch_id, file.original_batch_id));

      for (const submission of submissions) {
        await db
          .update(clearinghouse_submissions)
          .set({
            acknowledgment_status: result.accepted > 0 ? 'ACCEPTED' : 'REJECTED',
            acknowledgment_date: new Date(),
            acknowledgment_details: { stc_count: stcSegments.length, summary: result },
            current_status: result.accepted > 0 ? 'PAYER_RECEIVED' : 'REJECTED',
            updated_at: new Date()
          })
          .where(eq(clearinghouse_submissions.id, submission.id));

        // Record status history
        await db.insert(clearinghouse_submission_status_history).values({
          submission_id: submission.id,
          previous_status: submission.current_status,
          new_status: result.accepted > 0 ? 'PAYER_RECEIVED' : 'REJECTED',
          status_date: new Date(),
          change_source: '277_RESPONSE',
          response_file_id: file.id
        });
      }
    }

    return result;
  }

  // ==========================================
  // EXISTING METHODS (ORIGINAL IMPLEMENTATION)
  // ==========================================

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
