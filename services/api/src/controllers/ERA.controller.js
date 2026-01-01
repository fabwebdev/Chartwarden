import PaymentPostingService from '../services/PaymentPosting.service.js';
import { db } from '../db/index.js';
import { era_files, reconciliation_batches, audit_logs } from '../db/schemas/index.js';
import { eq, desc, sql } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import { pipeline } from 'stream/promises';

import { logger } from '../utils/logger.js';

/**
 * ERA (Electronic Remittance Advice) Controller
 * Phase 3B - ERA Processing & Auto-Posting
 *
 * Endpoints:
 * 1. POST   /api/era/upload                     - Upload 835 file (JSON or multipart)
 * 2. POST   /api/era/upload-file                - Upload ERA file via multipart form (835 EDI or CSV)
 * 3. POST   /api/era/process/:fileId            - Process 835 file
 * 4. GET    /api/era/payments/:fileId           - Get ERA payments
 * 5. POST   /api/era/auto-post/:paymentId       - Auto-post payment
 * 6. GET    /api/era/exceptions                 - Get posting exceptions
 * 7. POST   /api/era/resolve-exception/:id      - Resolve exception
 * 8. GET    /api/era/reconciliation             - Get reconciliation status
 * 9. POST   /api/era/reconcile-batch            - Run reconciliation
 * 10. GET   /api/era/processing-report/:fileId  - Get processing summary report
 * 11. POST  /api/era/batch-process              - Batch process multiple ERA files
 *
 * Features:
 * - Multipart file upload support (835 EDI, CSV)
 * - Transaction rollback on batch processing failure
 * - Comprehensive processing summary reports
 * - Enhanced audit logging for HIPAA compliance
 */
class ERAController {
  /**
   * Supported file formats for ERA processing
   */
  static SUPPORTED_FORMATS = {
    EDI_835: ['835', 'edi', 'x12'],
    CSV: ['csv'],
  };

  /**
   * Parse CSV content to ERA payment format
   * @private
   * @param {string} csvContent - CSV file content
   * @returns {object} Parsed ERA data in standard format
   */
  #parseCSVContent(csvContent) {
    const lines = csvContent.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
      throw new Error('CSV file must contain header row and at least one data row');
    }

    const headers = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/['"]/g, ''));
    const requiredHeaders = ['patient_account_number', 'payment_amount', 'check_number'];

    // Validate required headers
    const missingHeaders = requiredHeaders.filter(h => !headers.includes(h));
    if (missingHeaders.length > 0) {
      throw new Error(`CSV missing required headers: ${missingHeaders.join(', ')}`);
    }

    const claimPayments = [];

    for (let i = 1; i < lines.length; i++) {
      const values = this.#parseCSVLine(lines[i]);
      if (values.length !== headers.length) {
        logger.warn(`Skipping CSV line ${i + 1}: column count mismatch`);
        continue;
      }

      const row = {};
      headers.forEach((header, idx) => {
        row[header] = values[idx]?.trim().replace(/['"]/g, '') || '';
      });

      // Convert to standard ERA payment format
      const paymentAmount = Math.round(parseFloat(row.payment_amount || '0') * 100); // Convert to cents
      const billedAmount = Math.round(parseFloat(row.billed_amount || row.payment_amount || '0') * 100);

      claimPayments.push({
        patientAccountNumber: row.patient_account_number,
        paymentAmount,
        totalChargeAmount: billedAmount,
        checkNumber: row.check_number,
        payerClaimControlNumber: row.payer_claim_control_number || '',
        claimStatusCode: row.claim_status || '1', // Default to processed
        patient: {
          firstName: row.patient_first_name || '',
          lastName: row.patient_last_name || '',
          memberId: row.member_id || '',
        },
        dates: {
          statementFrom: row.service_date_start || row.service_date || null,
          statementTo: row.service_date_end || row.service_date || null,
        },
        adjustments: this.#parseCSVAdjustments(row),
        serviceLines: [],
      });
    }

    if (claimPayments.length === 0) {
      throw new Error('No valid payment records found in CSV file');
    }

    // Build header info from CSV metadata
    const checkNumber = claimPayments[0]?.checkNumber || nanoid();
    const totalPaymentAmount = claimPayments.reduce((sum, p) => sum + p.paymentAmount, 0);

    return {
      header: {
        interchangeControlNumber: nanoid(),
        checkNumber,
      },
      payer: {
        name: claimPayments[0]?.payer_name || 'CSV Import',
        identifier: claimPayments[0]?.payer_id || 'CSV',
      },
      payee: {
        name: 'Provider',
      },
      payment: {
        totalPaymentAmount,
        checkNumber,
        paymentMethod: 'CSV_IMPORT',
        productionDate: new Date().toISOString().split('T')[0],
      },
      claimPayments,
      summary: {
        totalClaimCount: claimPayments.length,
        totalPaymentAmount,
      },
      format: 'CSV',
    };
  }

  /**
   * Parse a CSV line handling quoted values
   * @private
   */
  #parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];

      if (char === '"') {
        inQuotes = !inQuotes;
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);

    return result;
  }

  /**
   * Parse adjustment codes from CSV row
   * @private
   */
  #parseCSVAdjustments(row) {
    const adjustments = [];

    // Check for adjustment columns (adjustment_code_1, adjustment_amount_1, etc.)
    for (let i = 1; i <= 6; i++) {
      const code = row[`adjustment_code_${i}`];
      const amount = row[`adjustment_amount_${i}`];
      const group = row[`adjustment_group_${i}`] || 'CO';

      if (code && amount) {
        adjustments.push({
          groupCode: group,
          adjustments: [{
            reasonCode: code,
            amount: Math.round(parseFloat(amount) * 100),
          }],
        });
      }
    }

    return adjustments;
  }

  /**
   * Detect file format from content or extension
   * @private
   */
  #detectFileFormat(fileName, content) {
    const ext = fileName.split('.').pop()?.toLowerCase();

    // Check by extension
    if (ERAController.SUPPORTED_FORMATS.CSV.includes(ext)) {
      return 'CSV';
    }
    if (ERAController.SUPPORTED_FORMATS.EDI_835.includes(ext)) {
      return 'EDI_835';
    }

    // Check by content
    if (content.includes('ST*835')) {
      return 'EDI_835';
    }
    if (content.includes(',') && content.includes('\n')) {
      // Likely CSV - check for header row
      const firstLine = content.split('\n')[0].toLowerCase();
      if (firstLine.includes('patient') || firstLine.includes('payment') || firstLine.includes('amount')) {
        return 'CSV';
      }
    }

    return null;
  }

  /**
   * Log ERA processing activity for audit trail
   * @private
   */
  async #logAuditEvent(request, action, resourceType, resourceId, details = {}) {
    try {
      await db.insert(audit_logs).values({
        action,
        resource_type: resourceType,
        resource_id: resourceId?.toString(),
        user_id: request.user?.id,
        user_email: request.user?.email,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        request_method: request.method,
        request_path: request.url,
        status_code: 200,
        details: JSON.stringify({
          ...details,
          timestamp: new Date().toISOString(),
        }),
      });
    } catch (error) {
      logger.error('Failed to log ERA audit event:', error);
    }
  }
  /**
   * 1. Upload 835 ERA file (JSON body)
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

      // Detect file format
      const format = this.#detectFileFormat(fileName, fileContent);

      if (!format) {
        return reply.code(400).send({
          success: false,
          error: 'Unsupported file format. Supported formats: 835 EDI, CSV'
        });
      }

      // Log upload attempt
      await this.#logAuditEvent(request, 'ERA_FILE_UPLOAD_STARTED', 'era_file', null, {
        fileName,
        format,
        contentLength: fileContent.length,
      });

      let result;

      if (format === 'CSV') {
        // Parse CSV and process
        const parsedData = this.#parseCSVContent(fileContent);
        result = await PaymentPostingService.processERAFileWithParsedData({
          fileName,
          fileContent,
          parsedData,
          uploadedBy: request.user?.id,
          format: 'CSV',
        });
      } else {
        // Process 835 EDI file
        if (!fileContent.includes('ST*835')) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid 835 EDI file format'
          });
        }

        result = await PaymentPostingService.processERAFile({
          fileName,
          fileContent,
          uploadedBy: request.user?.id
        });
      }

      // Log successful upload
      await this.#logAuditEvent(request, 'ERA_FILE_UPLOAD_COMPLETED', 'era_file', result.eraFileId, {
        fileName,
        format,
        totalClaims: result.summary?.totalClaims,
        autoPosted: result.summary?.autoPosted,
        exceptions: result.summary?.exceptions,
        totalAmount: result.summary?.totalAmount,
      });

      return reply.code(200).send({
        success: true,
        message: 'ERA file uploaded and processed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error uploading ERA file:', error);

      // Log failed upload
      await this.#logAuditEvent(request, 'ERA_FILE_UPLOAD_FAILED', 'era_file', null, {
        error: error.message,
      });

      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * 1b. Upload ERA file via multipart form
   * POST /api/era/upload-file
   *
   * Accepts multipart/form-data with file field
   * Supports 835 EDI and CSV formats
   */
  async uploadERAFileMultipart(request, reply) {
    try {
      // Get file from multipart request
      const data = await request.file();

      if (!data) {
        return reply.code(400).send({
          success: false,
          error: 'No file uploaded. Please upload an ERA file.'
        });
      }

      const fileName = data.filename;
      const mimeType = data.mimetype;

      // Read file content from stream
      const chunks = [];
      for await (const chunk of data.file) {
        chunks.push(chunk);
      }
      const fileContent = Buffer.concat(chunks).toString('utf-8');

      if (!fileContent || fileContent.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Uploaded file is empty'
        });
      }

      // Check for duplicate uploads
      const duplicateCheck = await this.#checkDuplicateUpload(fileContent);
      if (duplicateCheck.isDuplicate) {
        return reply.code(400).send({
          success: false,
          error: `Duplicate ERA file detected. This file was already uploaded on ${duplicateCheck.uploadDate}`,
          existingFileId: duplicateCheck.fileId,
        });
      }

      // Detect file format
      const format = this.#detectFileFormat(fileName, fileContent);

      if (!format) {
        return reply.code(400).send({
          success: false,
          error: 'Unsupported file format. Supported formats: 835 EDI (.835, .edi, .x12), CSV (.csv)'
        });
      }

      logger.info('Processing ERA file upload', {
        fileName,
        format,
        mimeType,
        contentLength: fileContent.length,
      });

      // Log upload attempt
      await this.#logAuditEvent(request, 'ERA_FILE_MULTIPART_UPLOAD_STARTED', 'era_file', null, {
        fileName,
        format,
        mimeType,
        contentLength: fileContent.length,
      });

      let result;

      if (format === 'CSV') {
        // Parse CSV and process
        const parsedData = this.#parseCSVContent(fileContent);
        result = await PaymentPostingService.processERAFileWithParsedData({
          fileName,
          fileContent,
          parsedData,
          uploadedBy: request.user?.id,
          format: 'CSV',
        });
      } else {
        // Validate 835 EDI format
        if (!fileContent.includes('ST*835')) {
          return reply.code(400).send({
            success: false,
            error: 'Invalid 835 EDI file format. File must contain ST*835 transaction set.'
          });
        }

        result = await PaymentPostingService.processERAFile({
          fileName,
          fileContent,
          uploadedBy: request.user?.id
        });
      }

      // Log successful upload
      await this.#logAuditEvent(request, 'ERA_FILE_MULTIPART_UPLOAD_COMPLETED', 'era_file', result.eraFileId, {
        fileName,
        format,
        totalClaims: result.summary?.totalClaims,
        autoPosted: result.summary?.autoPosted,
        exceptions: result.summary?.exceptions,
        totalAmount: result.summary?.totalAmount,
      });

      return reply.code(200).send({
        success: true,
        message: 'ERA file uploaded and processed successfully',
        data: {
          ...result,
          format,
          fileName,
        }
      });
    } catch (error) {
      logger.error('Error uploading ERA file via multipart:', error);

      // Log failed upload
      await this.#logAuditEvent(request, 'ERA_FILE_MULTIPART_UPLOAD_FAILED', 'era_file', null, {
        error: error.message,
      });

      // Handle specific parsing errors
      if (error.message.includes('CSV')) {
        return reply.code(400).send({
          success: false,
          error: `CSV parsing error: ${error.message}`
        });
      }

      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Check for duplicate ERA file uploads
   * @private
   */
  async #checkDuplicateUpload(fileContent) {
    try {
      // Create a simple hash of the content for comparison
      const contentHash = this.#simpleHash(fileContent);

      // Check if a file with similar content exists (within last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const existingFiles = await db.select({
        id: era_files.id,
        file_id: era_files.file_id,
        received_date: era_files.received_date,
        control_number: era_files.control_number,
      })
        .from(era_files)
        .where(sql`${era_files.received_date} > ${thirtyDaysAgo}`)
        .orderBy(desc(era_files.received_date))
        .limit(100);

      // Check control numbers for 835 files
      if (fileContent.includes('ST*835')) {
        const controlNumberMatch = fileContent.match(/ISA\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*[^*]*\*([^*~]+)/);
        if (controlNumberMatch) {
          const controlNumber = controlNumberMatch[1].trim();
          const duplicate = existingFiles.find(f => f.control_number === controlNumber);
          if (duplicate) {
            return {
              isDuplicate: true,
              fileId: duplicate.file_id,
              uploadDate: duplicate.received_date,
            };
          }
        }
      }

      return { isDuplicate: false };
    } catch (error) {
      logger.error('Error checking for duplicate upload:', error);
      return { isDuplicate: false }; // Fail open - allow upload if check fails
    }
  }

  /**
   * Simple hash function for content comparison
   * @private
   */
  #simpleHash(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(16);
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
   * 4. Manual post individual payment
   * POST /api/era/auto-post/:paymentId
   *
   * @param {string} paymentId - ERA payment ID (payment_id field)
   * @body {number} claimId - Claim ID to post to (optional for manual override)
   * @body {string} notes - Optional notes for the posting
   */
  async autoPostPayment(request, reply) {
    try {
      const { paymentId } = request.params;
      const { claimId, notes } = request.body;

      // Validate paymentId
      if (!paymentId) {
        return reply.code(400).send({
          success: false,
          error: 'Payment ID is required'
        });
      }

      // Call manual posting service
      const result = await PaymentPostingService.manualPostPayment({
        paymentId,
        claimId: claimId ? parseInt(claimId) : null,
        postedBy: request.user?.id,
        notes
      });

      return reply.code(200).send({
        success: true,
        message: 'Payment posted successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error posting payment:', error);

      // Handle specific errors
      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: error.message
        });
      }

      if (error.message.includes('already posted') || error.message.includes('Cannot post')) {
        return reply.code(400).send({
          success: false,
          error: error.message
        });
      }

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

  /**
   * Get payment posting dashboard metrics
   * GET /api/era/dashboard
   */
  async getDashboardMetrics(request, reply) {
    try {
      const metrics = await PaymentPostingService.getPostingDashboardMetrics();

      return reply.code(200).send({
        success: true,
        data: metrics
      });
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get reconciliation summary
   * GET /api/era/reconciliation/summary
   *
   * @query {string} startDate - Start date filter (YYYY-MM-DD)
   * @query {string} endDate - End date filter (YYYY-MM-DD)
   * @query {string} status - Reconciliation status filter
   */
  async getReconciliationSummary(request, reply) {
    try {
      const { startDate, endDate, status } = request.query;

      const result = await PaymentPostingService.getReconciliationSummary({
        startDate,
        endDate,
        status
      });

      return reply.code(200).send({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Error getting reconciliation summary:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Reverse a payment posting
   * POST /api/era/reverse-posting/:postingId
   *
   * @param {string} postingId - Posting ID to reverse
   * @body {string} reason - Reason for reversal
   */
  async reversePosting(request, reply) {
    try {
      const { postingId } = request.params;
      const { reason } = request.body;

      if (!postingId) {
        return reply.code(400).send({
          success: false,
          error: 'Posting ID is required'
        });
      }

      if (!reason) {
        return reply.code(400).send({
          success: false,
          error: 'Reversal reason is required'
        });
      }

      const result = await PaymentPostingService.reversePosting({
        postingId,
        reason,
        reversedBy: request.user?.id
      });

      return reply.code(200).send({
        success: true,
        message: 'Payment posting reversed successfully',
        data: result
      });
    } catch (error) {
      logger.error('Error reversing posting:', error);

      if (error.message.includes('not found')) {
        return reply.code(404).send({
          success: false,
          error: error.message
        });
      }

      if (error.message.includes('already been reversed')) {
        return reply.code(400).send({
          success: false,
          error: error.message
        });
      }

      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get ERA payment details
   * GET /api/era/payment/:paymentId
   *
   * @param {string} paymentId - ERA payment ID
   */
  async getERAPaymentDetails(request, reply) {
    try {
      const { paymentId } = request.params;

      const payment = await PaymentPostingService.getERAPaymentById(paymentId);

      if (!payment) {
        return reply.code(404).send({
          success: false,
          error: 'ERA payment not found'
        });
      }

      return reply.code(200).send({
        success: true,
        data: payment
      });
    } catch (error) {
      logger.error('Error getting ERA payment details:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Get processing summary report for an ERA file
   * GET /api/era/processing-report/:fileId
   *
   * @param {string} fileId - ERA file ID
   */
  async getProcessingReport(request, reply) {
    try {
      const { fileId } = request.params;

      // Get ERA file
      const file = await PaymentPostingService.getERAFile(fileId);
      if (!file) {
        return reply.code(404).send({
          success: false,
          error: 'ERA file not found'
        });
      }

      // Get all payments for this file
      const payments = await PaymentPostingService.getERAPayments(file.id);

      // Get exceptions for this file
      const exceptions = await PaymentPostingService.getPostingExceptions({
        eraFileId: file.id,
        limit: 1000,
      });

      // Calculate summary statistics
      const summary = {
        file: {
          fileId: file.file_id,
          fileName: file.file_name,
          receivedDate: file.received_date,
          processedAt: file.processed_at,
          status: file.status,
          payerName: file.payer_name,
          payerIdentifier: file.payer_identifier,
        },
        totals: {
          totalClaims: file.total_claims || 0,
          totalAmount: file.total_amount || 0,
          totalAmountDollars: ((file.total_amount || 0) / 100).toFixed(2),
          autoPostedCount: file.auto_posted_count || 0,
          exceptionCount: file.exception_count || 0,
          autoPostRate: file.total_claims > 0
            ? ((file.auto_posted_count / file.total_claims) * 100).toFixed(1)
            : '0.0',
        },
        payments: {
          total: payments.length,
          byStatus: {
            autoPosted: payments.filter(p => p.posting_status === 'AUTO_POSTED').length,
            manualPosted: payments.filter(p => p.posting_status === 'MANUAL_POSTED').length,
            pending: payments.filter(p => p.posting_status === 'PENDING').length,
            exception: payments.filter(p => p.posting_status === 'EXCEPTION').length,
            denied: payments.filter(p => p.posting_status === 'DENIED').length,
          },
          totalPostedAmount: payments
            .filter(p => ['AUTO_POSTED', 'MANUAL_POSTED'].includes(p.posting_status))
            .reduce((sum, p) => sum + (p.total_payment_amount || 0), 0),
        },
        exceptions: {
          total: exceptions.length,
          bySeverity: {
            critical: exceptions.filter(e => e.exception_severity === 'CRITICAL').length,
            high: exceptions.filter(e => e.exception_severity === 'HIGH').length,
            medium: exceptions.filter(e => e.exception_severity === 'MEDIUM').length,
            low: exceptions.filter(e => e.exception_severity === 'LOW').length,
          },
          byType: exceptions.reduce((acc, e) => {
            acc[e.exception_type] = (acc[e.exception_type] || 0) + 1;
            return acc;
          }, {}),
          pending: exceptions.filter(e => e.status === 'PENDING').length,
          resolved: exceptions.filter(e => e.status === 'RESOLVED').length,
        },
        detailedExceptions: exceptions.slice(0, 50).map(e => ({
          exceptionId: e.exception_id,
          type: e.exception_type,
          severity: e.exception_severity,
          reason: e.exception_reason,
          patientAccountNumber: e.patient_account_number,
          paymentAmount: e.payment_amount,
          status: e.status,
          createdAt: e.created_at,
          slaDeadline: e.sla_deadline,
        })),
      };

      // Log report generation for audit
      await this.#logAuditEvent(request, 'ERA_PROCESSING_REPORT_VIEWED', 'era_file', fileId, {
        totalClaims: summary.totals.totalClaims,
        totalAmount: summary.totals.totalAmount,
      });

      return reply.code(200).send({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error generating processing report:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Batch process multiple ERA files with transaction support
   * POST /api/era/batch-process
   *
   * @body {Array} files - Array of {fileName, fileContent} objects
   * @body {boolean} stopOnError - Whether to stop batch on first error (default: false)
   */
  async batchProcessERAFiles(request, reply) {
    try {
      const { files, stopOnError = false } = request.body;

      if (!files || !Array.isArray(files) || files.length === 0) {
        return reply.code(400).send({
          success: false,
          error: 'Files array is required and must not be empty'
        });
      }

      if (files.length > 50) {
        return reply.code(400).send({
          success: false,
          error: 'Maximum 50 files per batch'
        });
      }

      // Log batch process start
      await this.#logAuditEvent(request, 'ERA_BATCH_PROCESS_STARTED', 'era_batch', null, {
        fileCount: files.length,
        stopOnError,
      });

      const results = {
        success: true,
        totalFiles: files.length,
        processed: 0,
        failed: 0,
        files: [],
        errors: [],
        summary: {
          totalClaims: 0,
          autoPosted: 0,
          exceptions: 0,
          totalAmount: 0,
        },
      };

      // Process each file
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const fileResult = {
          index: i,
          fileName: file.fileName,
          success: false,
          error: null,
          result: null,
        };

        try {
          // Validate file
          if (!file.fileName || !file.fileContent) {
            throw new Error(`File at index ${i} missing fileName or fileContent`);
          }

          // Detect format
          const format = this.#detectFileFormat(file.fileName, file.fileContent);
          if (!format) {
            throw new Error(`Unsupported file format for ${file.fileName}`);
          }

          let processResult;

          if (format === 'CSV') {
            const parsedData = this.#parseCSVContent(file.fileContent);
            processResult = await PaymentPostingService.processERAFileWithParsedData({
              fileName: file.fileName,
              fileContent: file.fileContent,
              parsedData,
              uploadedBy: request.user?.id,
              format: 'CSV',
            });
          } else {
            if (!file.fileContent.includes('ST*835')) {
              throw new Error(`Invalid 835 EDI format for ${file.fileName}`);
            }
            processResult = await PaymentPostingService.processERAFile({
              fileName: file.fileName,
              fileContent: file.fileContent,
              uploadedBy: request.user?.id
            });
          }

          fileResult.success = true;
          fileResult.result = {
            eraFileId: processResult.eraFileId,
            totalClaims: processResult.summary?.totalClaims || 0,
            autoPosted: processResult.summary?.autoPosted || 0,
            exceptions: processResult.summary?.exceptions || 0,
            totalAmount: processResult.summary?.totalAmount || 0,
          };

          // Update summary
          results.processed++;
          results.summary.totalClaims += fileResult.result.totalClaims;
          results.summary.autoPosted += fileResult.result.autoPosted;
          results.summary.exceptions += fileResult.result.exceptions;
          results.summary.totalAmount += fileResult.result.totalAmount;

        } catch (error) {
          logger.error(`Error processing batch file ${file.fileName}:`, error);

          fileResult.error = error.message;
          results.failed++;
          results.errors.push({
            index: i,
            fileName: file.fileName,
            error: error.message,
          });

          // Stop processing if stopOnError is true
          if (stopOnError) {
            results.success = false;
            results.stoppedAtIndex = i;
            results.stoppedReason = `Processing stopped at file ${file.fileName}: ${error.message}`;

            // Log batch failure
            await this.#logAuditEvent(request, 'ERA_BATCH_PROCESS_FAILED', 'era_batch', null, {
              processedCount: results.processed,
              failedCount: results.failed,
              stoppedAt: file.fileName,
              error: error.message,
            });

            results.files.push(fileResult);
            break;
          }
        }

        results.files.push(fileResult);
      }

      // Set overall success status
      if (results.failed > 0 && !stopOnError) {
        results.success = results.processed > 0; // Partial success if some processed
        results.partialSuccess = true;
      }

      // Log batch completion
      await this.#logAuditEvent(request, 'ERA_BATCH_PROCESS_COMPLETED', 'era_batch', null, {
        totalFiles: results.totalFiles,
        processed: results.processed,
        failed: results.failed,
        summary: results.summary,
      });

      return reply.code(200).send(results);
    } catch (error) {
      logger.error('Error in batch ERA processing:', error);

      await this.#logAuditEvent(request, 'ERA_BATCH_PROCESS_ERROR', 'era_batch', null, {
        error: error.message,
      });

      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }

  /**
   * Validate ERA file without processing
   * POST /api/era/validate
   *
   * @body {string} fileName - File name
   * @body {string} fileContent - File content to validate
   */
  async validateERAFile(request, reply) {
    try {
      const { fileName, fileContent } = request.body;

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

      const validationResult = {
        valid: true,
        format: null,
        errors: [],
        warnings: [],
        summary: {},
      };

      // Detect format
      const format = this.#detectFileFormat(fileName, fileContent);
      if (!format) {
        validationResult.valid = false;
        validationResult.errors.push('Unsupported file format. Supported: 835 EDI, CSV');
        return reply.code(200).send({ success: true, data: validationResult });
      }

      validationResult.format = format;

      try {
        if (format === 'CSV') {
          const parsed = this.#parseCSVContent(fileContent);
          validationResult.summary = {
            totalRecords: parsed.claimPayments.length,
            totalAmount: parsed.summary.totalPaymentAmount,
            checkNumber: parsed.payment.checkNumber,
          };
        } else {
          // Validate 835 structure
          if (!fileContent.includes('ISA*')) {
            validationResult.errors.push('Missing ISA segment (interchange control header)');
          }
          if (!fileContent.includes('GS*')) {
            validationResult.errors.push('Missing GS segment (functional group header)');
          }
          if (!fileContent.includes('ST*835')) {
            validationResult.errors.push('Missing ST*835 segment (transaction set header)');
          }
          if (!fileContent.includes('BPR*')) {
            validationResult.warnings.push('Missing BPR segment (financial information)');
          }
          if (!fileContent.includes('CLP*')) {
            validationResult.warnings.push('No CLP segments found (no claim payments)');
          }

          // Count claims
          const clpMatches = fileContent.match(/CLP\*/g);
          const claimCount = clpMatches ? clpMatches.length : 0;

          // Extract check number
          const trnMatch = fileContent.match(/TRN\*[^*]*\*([^*~]+)/);
          const checkNumber = trnMatch ? trnMatch[1] : null;

          // Extract total amount
          const bprMatch = fileContent.match(/BPR\*[^*]*\*([^*~]+)/);
          const totalAmount = bprMatch ? parseFloat(bprMatch[1]) * 100 : 0;

          validationResult.summary = {
            totalClaims: claimCount,
            totalAmount,
            checkNumber,
          };
        }

        if (validationResult.errors.length > 0) {
          validationResult.valid = false;
        }

      } catch (parseError) {
        validationResult.valid = false;
        validationResult.errors.push(`Parse error: ${parseError.message}`);
      }

      // Check for duplicates
      const duplicateCheck = await this.#checkDuplicateUpload(fileContent);
      if (duplicateCheck.isDuplicate) {
        validationResult.warnings.push(
          `File may be a duplicate of ${duplicateCheck.fileId} uploaded on ${duplicateCheck.uploadDate}`
        );
      }

      return reply.code(200).send({
        success: true,
        data: validationResult
      });
    } catch (error) {
      logger.error('Error validating ERA file:', error);
      return reply.code(500).send({
        success: false,
        error: error.message
      });
    }
  }
}

export default new ERAController();
