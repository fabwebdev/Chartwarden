import PaymentPostingService from '../services/PaymentPosting.service.js';
import { db } from '../db/index.js';
import { era_files, reconciliation_batches } from '../db/schemas/index.js';
import { eq } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { logger } from '../utils/logger.js';
/**
 * ERA (Electronic Remittance Advice) Controller
 * Phase 3B - ERA Processing & Auto-Posting
 *
 * Endpoints:
 * 1. POST   /api/era/upload                     - Upload 835 file
 * 2. POST   /api/era/process/:fileId            - Process 835 file
 * 3. GET    /api/era/payments/:fileId           - Get ERA payments
 * 4. POST   /api/era/auto-post/:paymentId       - Auto-post payment
 * 5. GET    /api/era/exceptions                 - Get posting exceptions
 * 6. POST   /api/era/resolve-exception/:id      - Resolve exception
 * 7. GET    /api/era/reconciliation             - Get reconciliation status
 * 8. POST   /api/era/reconcile-batch            - Run reconciliation
 */
class ERAController {
  /**
   * 1. Upload 835 ERA file
   * POST /api/era/upload
   *
   * @body {string} fileName - File name
   * @body {string} fileContent - Raw 835 EDI content
   */
  async uploadERAFile(request, reply) {
    try {
      const { fileName, fileContent } = request.body;

      // Validation
      if (!fileName) {
        return reply.code(400).send({
          success: false,
          error: 'File name is required'
        });
      }

      if (!fileContent) {
        return reply.code(400).send({
          success: false,
          error: 'File content is required'
        });
      }

      // Basic validation - check for 835 transaction
      if (!fileContent.includes('ST*835')) {
        return reply.code(400).send({
          success: false,
          error: 'Invalid 835 EDI file format'
        });
      }

      // Process the ERA file
      const result = await PaymentPostingService.processERAFile({
        fileName,
        fileContent,
        uploadedBy: request.user?.id
      });

      return reply.code(200).send({
        success: true,
        message: 'ERA file uploaded and processed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error uploading ERA file:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 2. Process uploaded 835 file
   * POST /api/era/process/:fileId
   *
   * @param {string} fileId - ERA file ID
   */
  async processERAFile(request, reply) {
    try {
      const { fileId } = request.params;

      // Get ERA file from database
      const eraFile = await PaymentPostingService.getERAFile(fileId);

      if (!eraFile) {
        return reply.code(404).send({
          success: false,
          error: 'ERA file not found'
        });
      }

      // Check if already processed
      if (eraFile.status === 'COMPLETED') {
        return reply.code(400).send({
          success: false,
          error: 'ERA file has already been processed'
        });
      }

      // Reprocess the file
      const result = await PaymentPostingService.processERAFile({
        fileName: eraFile.file_name,
        fileContent: eraFile.edi_835_content,
        uploadedBy: request.user?.id
      });

      return reply.code(200).send({
        success: true,
        message: 'ERA file processed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error processing ERA file:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 3. Get ERA payments for file
   * GET /api/era/payments/:fileId
   *
   * @param {string} fileId - ERA file ID (integer ID, not file_id string)
   */
  async getERAPayments(request, reply) {
    try {
      const { fileId } = request.params;

      const payments = await PaymentPostingService.getERAPayments(fileId);

      return reply.code(200).send({
        success: true,
        count: payments.length,
        data: payments
      });
    } catch (error) {
      logger.error('Error getting ERA payments:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 4. Auto-post individual payment (manual trigger)
   * POST /api/era/auto-post/:paymentId
   *
   * @param {number} paymentId - ERA payment ID
   * @body {number} claimId - Claim ID to post to (optional for manual override)
   */
  async autoPostPayment(request, reply) {
    try {
      const { paymentId } = request.params;
      const { claimId } = request.body;

      // This would implement manual posting logic
      // For now, return not implemented
      return reply.code(501).send({
        success: false,
        error: 'Manual posting not yet implemented - payments are auto-posted during file processing'
      });
    } catch (error) {
      logger.error('Error auto-posting payment:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 5. Get posting exceptions
   * GET /api/era/exceptions
   *
   * @query {string} status - Exception status (PENDING, ASSIGNED, IN_REVIEW, RESOLVED)
   * @query {string} severity - Exception severity (LOW, MEDIUM, HIGH, CRITICAL)
   * @query {number} limit - Limit results
   */
  async getPostingExceptions(request, reply) {
    try {
      const {
        status = 'PENDING',
        severity,
        limit = 50
      } = request.query;

      const exceptions = await PaymentPostingService.getPostingExceptions({
        status,
        severity,
        limit: parseInt(limit)
      });

      // Calculate overdue exceptions
      const now = new Date();
      const overdueCount = exceptions.filter(e =>
        e.sla_deadline && new Date(e.sla_deadline) < now
      ).length;

      return reply.code(200).send({
        success: true,
        count: exceptions.length,
        overdueCount,
        data: exceptions
      });
    } catch (error) {
      logger.error('Error getting posting exceptions:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 6. Resolve posting exception
   * POST /api/era/resolve-exception/:id
   *
   * @param {string} id - Exception ID
   * @body {string} resolutionType - Resolution type
   * @body {string} notes - Resolution notes
   */
  async resolveException(request, reply) {
    try {
      const { id } = request.params;
      const { resolutionType, notes } = request.body;

      // Validation
      if (!resolutionType) {
        return reply.code(400).send({
          success: false,
          error: 'Resolution type is required'
        });
      }

      const validResolutionTypes = [
        'MANUAL_POSTED',
        'CLAIM_CORRECTED',
        'PAYER_CONTACTED',
        'WRITTEN_OFF',
        'REFUNDED'
      ];

      if (!validResolutionTypes.includes(resolutionType)) {
        return reply.code(400).send({
          success: false,
          error: `Invalid resolution type. Must be one of: ${validResolutionTypes.join(', ')}`
        });
      }

      await PaymentPostingService.resolveException(id, {
        resolutionType,
        notes,
        resolvedBy: request.user?.id
      });

      return reply.code(200).send({
        success: true,
        message: 'Exception resolved successfully'
      });
    } catch (error) {
      logger.error('Error resolving exception:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 7. Get reconciliation status
   * GET /api/era/reconciliation
   *
   * @query {string} batchDate - Batch date (YYYY-MM-DD)
   */
  async getReconciliationStatus(request, reply) {
    try {
      const { batchDate } = request.query;

      let query = db.select()
        .from(reconciliation_batches)
        .orderBy(reconciliation_batches.batch_date);

      if (batchDate) {
        query = query.where(eq(reconciliation_batches.batch_date, batchDate));
      }

      const batches = await query.limit(30);

      return reply.code(200).send({
        success: true,
        count: batches.length,
        data: batches
      });
    } catch (error) {
      logger.error('Error getting reconciliation status:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 8. Run reconciliation batch
   * POST /api/era/reconcile-batch
   *
   * @body {string} batchDate - Batch date (YYYY-MM-DD)
   * @body {number} depositAmount - Expected deposit amount in cents
   * @body {number} bankStatementAmount - Actual bank amount in cents
   */
  async reconcileBatch(request, reply) {
    try {
      const {
        batchDate,
        depositAmount,
        bankStatementAmount
      } = request.body;

      // Validation
      if (!batchDate) {
        return reply.code(400).send({
          success: false,
          error: 'Batch date is required'
        });
      }

      // Get all ERA files for the batch date
      const eraFilesForDate = await db.select()
        .from(era_files)
        .where(eq(era_files.production_date, batchDate));

      // Calculate totals
      const totalEraPayments = eraFilesForDate.reduce((sum, file) =>
        sum + (file.total_amount || 0), 0
      );

      const varianceAmount = (bankStatementAmount || depositAmount) - totalEraPayments;

      // Create reconciliation batch
      const [batch] = await db.insert(reconciliation_batches)
        .values({
          batch_id: nanoid(),
          batch_date: batchDate,
          deposit_date: batchDate,
          deposit_amount: depositAmount,
          bank_statement_amount: bankStatementAmount,
          era_file_count: eraFilesForDate.length,
          total_era_payments: totalEraPayments,
          total_posted_payments: totalEraPayments, // Simplified - should sum actual postings
          variance_amount: varianceAmount,
          is_reconciled: Math.abs(varianceAmount) < 100, // Within $1.00
          reconciliation_status: Math.abs(varianceAmount) < 100 ? 'RECONCILED' : 'VARIANCE_IDENTIFIED',
          reconciled_by_id: request.user?.id,
          metadata: {
            eraFiles: eraFilesForDate.map(f => f.id)
          }
        })
        .returning();

      return reply.code(200).send({
        success: true,
        message: 'Reconciliation batch created',
        data: batch
      });
    } catch (error) {
      logger.error('Error reconciling batch:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Additional helper endpoints
   */

  /**
   * Get ERA file list
   * GET /api/era/files
   */
  async getERAFiles(request, reply) {
    try {
      const { status, limit = 50 } = request.query;

      let query = db.select()
        .from(era_files)
        .orderBy(era_files.received_date)
        .limit(parseInt(limit));

      if (status) {
        query = query.where(eq(era_files.status, status));
      }

      const files = await query;

      return reply.code(200).send({
        success: true,
        count: files.length,
        data: files
      });
    } catch (error) {
      logger.error('Error getting ERA files:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get ERA file details
   * GET /api/era/file/:fileId
   */
  async getERAFileDetails(request, reply) {
    try {
      const { fileId } = request.params;

      const file = await PaymentPostingService.getERAFile(fileId);

      if (!file) {
        return reply.code(404).send({
          success: false,
          error: 'ERA file not found'
        });
      }

      return reply.code(200).send({
        success: true,
        data: file
      });
    } catch (error) {
      logger.error('Error getting ERA file details:', error)
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ERAController();
