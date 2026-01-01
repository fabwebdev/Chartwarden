import { db } from '../db/index.js';
import {
  era_files,
  era_payments,
  payment_postings,
  posting_exceptions,
  reconciliation_batches
} from '../db/schemas/index.js';
import { claims } from '../db/schemas/billing.schema.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import EDI835Parser from './EDI835Parser.service.js';
import { nanoid } from 'nanoid';

import { logger } from '../utils/logger.js';
/**
 * Payment Posting Service
 * Phase 3B - ERA Processing & Auto-Posting
 *
 * Purpose: Automated payment posting from 835 EDI transactions
 * - Process 835 ERA files
 * - Match payments to claims
 * - Auto-post payments with adjustments
 * - Handle exceptions and partial payments
 * - Daily deposit reconciliation
 *
 * Features:
 *   - Intelligent claim matching
 *   - Automatic posting with audit trail
 *   - Exception detection and routing
 *   - CARC/RARC code handling
 *   - Reconciliation workflows
 */
class PaymentPostingService {
  constructor() {
    this.matchingThreshold = 0.95; // 95% confidence for auto-posting
    this.exceptionSLA = {
      LOW: 7, // days
      MEDIUM: 3,
      HIGH: 1,
      CRITICAL: 0.5 // 12 hours
    };
  }

  /**
   * Process 835 ERA file
   * Main entry point for ERA processing
   * @param {object} params - File processing parameters
   * @returns {Promise<object>} Processing result
   */
  async processERAFile(params) {
    const {
      fileName,
      fileContent,
      uploadedBy
    } = params;

    try {
      // 1. Parse 835 file
      const parsed835 = await EDI835Parser.parse835(fileContent);

      // 2. Create ERA file record
      const eraFile = await this.createERAFileRecord({
        fileName,
        fileContent,
        parsed835,
        uploadedBy
      });

      // 3. Process each claim payment
      const processedPayments = [];
      const exceptions = [];

      for (const claimPayment of parsed835.claimPayments) {
        try {
          const result = await this.processClaimPayment({
            eraFileId: eraFile.id,
            claimPayment,
            payer: parsed835.payer,
            payment: parsed835.payment
          });

          if (result.exception) {
            exceptions.push(result.exception);
          } else {
            processedPayments.push(result.payment);
          }
        } catch (error) {
          logger.error('Error processing claim payment:', error)
          // Create exception for this payment
          exceptions.push({
            type: 'PROCESSING_ERROR',
            reason: error.message,
            claimPayment
          });
        }
      }

      // 4. Update ERA file summary
      await this.updateERAFileSummary(eraFile.id, {
        totalPayments: parsed835.claimPayments.length,
        autoPostedCount: processedPayments.length,
        exceptionCount: exceptions.length,
        totalAmount: parsed835.payment.totalPaymentAmount,
        status: exceptions.length === 0 ? 'COMPLETED' : 'PARTIALLY_POSTED',
        processedAt: new Date()
      });

      return {
        success: true,
        eraFileId: eraFile.id,
        summary: {
          totalClaims: parsed835.claimPayments.length,
          autoPosted: processedPayments.length,
          exceptions: exceptions.length,
          totalAmount: parsed835.payment.totalPaymentAmount
        },
        processedPayments,
        exceptions
      };
    } catch (error) {
      logger.error('Error processing ERA file:', error)
      throw new Error(`ERA file processing failed: ${error.message}`);
    }
  }

  /**
   * Process ERA file with pre-parsed data (for CSV imports)
   * Alternative entry point when data is already parsed
   * @param {object} params - File processing parameters
   * @param {string} params.fileName - Original file name
   * @param {string} params.fileContent - Raw file content
   * @param {object} params.parsedData - Pre-parsed ERA data
   * @param {string} params.uploadedBy - User ID who uploaded
   * @param {string} params.format - File format (CSV, etc.)
   * @returns {Promise<object>} Processing result
   */
  async processERAFileWithParsedData(params) {
    const {
      fileName,
      fileContent,
      parsedData,
      uploadedBy,
      format = 'CSV'
    } = params;

    try {
      // 1. Create ERA file record with pre-parsed data
      const eraFile = await this.createERAFileRecord({
        fileName,
        fileContent,
        parsed835: parsedData, // Use pre-parsed data
        uploadedBy
      });

      // 2. Process each claim payment
      const processedPayments = [];
      const exceptions = [];

      for (const claimPayment of parsedData.claimPayments) {
        try {
          const result = await this.processClaimPayment({
            eraFileId: eraFile.id,
            claimPayment,
            payer: parsedData.payer,
            payment: parsedData.payment
          });

          if (result.exception) {
            exceptions.push(result.exception);
          } else {
            processedPayments.push(result.payment);
          }
        } catch (error) {
          logger.error('Error processing claim payment from CSV:', error);
          exceptions.push({
            type: 'PROCESSING_ERROR',
            reason: error.message,
            claimPayment
          });
        }
      }

      // 3. Update ERA file summary
      await this.updateERAFileSummary(eraFile.id, {
        totalPayments: parsedData.claimPayments.length,
        autoPostedCount: processedPayments.length,
        exceptionCount: exceptions.length,
        totalAmount: parsedData.payment.totalPaymentAmount,
        status: exceptions.length === 0 ? 'COMPLETED' : 'PARTIALLY_POSTED',
        processedAt: new Date()
      });

      return {
        success: true,
        eraFileId: eraFile.id,
        format,
        summary: {
          totalClaims: parsedData.claimPayments.length,
          autoPosted: processedPayments.length,
          exceptions: exceptions.length,
          totalAmount: parsedData.payment.totalPaymentAmount
        },
        processedPayments,
        exceptions
      };
    } catch (error) {
      logger.error('Error processing ERA file with parsed data:', error);
      throw new Error(`ERA file processing failed: ${error.message}`);
    }
  }

  /**
   * Process individual claim payment
   * @private
   */
  async processClaimPayment(params) {
    const { eraFileId, claimPayment, payer, payment } = params;

    // 1. Create ERA payment record
    const eraPayment = await this.createERAPaymentRecord({
      eraFileId,
      claimPayment,
      payer,
      payment
    });

    // 2. Match to claim in database
    const matchResult = await this.matchClaimToDatabase(claimPayment);

    if (!matchResult.found) {
      // Create exception - claim not found
      const exception = await this.createException({
        eraPaymentId: eraPayment.id,
        eraFileId,
        type: 'CLAIM_NOT_FOUND',
        reason: `Claim not found for patient account number: ${claimPayment.patientAccountNumber}`,
        severity: 'HIGH',
        claimPayment
      });

      return { exception };
    }

    if (matchResult.confidence < this.matchingThreshold) {
      // Create exception - low confidence match
      const exception = await this.createException({
        eraPaymentId: eraPayment.id,
        eraFileId,
        type: 'LOW_CONFIDENCE_MATCH',
        reason: `Match confidence ${matchResult.confidence} below threshold ${this.matchingThreshold}`,
        severity: 'MEDIUM',
        claimPayment,
        attemptedClaimId: matchResult.claim.id,
        confidence: matchResult.confidence
      });

      return { exception };
    }

    // 3. Validate payment against claim
    const validation = await this.validatePayment(matchResult.claim, claimPayment);

    if (!validation.valid) {
      // Create exception - validation failed
      const exception = await this.createException({
        eraPaymentId: eraPayment.id,
        eraFileId,
        type: validation.reason,
        reason: validation.message,
        severity: validation.severity || 'MEDIUM',
        claimPayment,
        attemptedClaimId: matchResult.claim.id
      });

      return { exception };
    }

    // 4. Auto-post payment
    const posting = await this.autoPostPayment({
      eraPaymentId: eraPayment.id,
      claim: matchResult.claim,
      claimPayment
    });

    // 5. Update ERA payment status
    await this.updateERAPaymentStatus(eraPayment.id, {
      claimId: matchResult.claim.id,
      postingStatus: 'AUTO_POSTED',
      postedAt: new Date()
    });

    return { payment: posting };
  }

  /**
   * Match claim payment to database claim
   * @private
   */
  async matchClaimToDatabase(claimPayment) {
    // Strategy 1: Match by patient account number
    let claim = await this.findClaimByAccountNumber(claimPayment.patientAccountNumber);

    if (claim) {
      return {
        found: true,
        claim,
        confidence: 1.0,
        matchMethod: 'ACCOUNT_NUMBER'
      };
    }

    // Strategy 2: Match by internal claim ID (from REF segment)
    if (claimPayment.internalClaimId) {
      claim = await this.findClaimById(claimPayment.internalClaimId);

      if (claim) {
        return {
          found: true,
          claim,
          confidence: 0.98,
          matchMethod: 'INTERNAL_CLAIM_ID'
        };
      }
    }

    // Strategy 3: Fuzzy match by patient name and dates
    if (claimPayment.patient && claimPayment.dates) {
      claim = await this.fuzzyMatchClaim({
        patientLastName: claimPayment.patient.lastName,
        patientFirstName: claimPayment.patient.firstName,
        statementFrom: claimPayment.dates.statementFrom,
        statementTo: claimPayment.dates.statementTo,
        totalChargeAmount: claimPayment.totalChargeAmount
      });

      if (claim) {
        // Calculate confidence based on matching fields
        const confidence = this.calculateMatchConfidence(claim, claimPayment);

        return {
          found: true,
          claim,
          confidence,
          matchMethod: 'FUZZY_MATCH'
        };
      }
    }

    return {
      found: false,
      confidence: 0,
      matchMethod: 'NO_MATCH'
    };
  }

  /**
   * Find claim by patient account number
   * @private
   */
  async findClaimByAccountNumber(accountNumber) {
    const [claim] = await db.select()
      .from(claims)
      .where(eq(claims.patient_account_number, accountNumber))
      .limit(1);

    return claim || null;
  }

  /**
   * Find claim by internal claim ID
   * @private
   */
  async findClaimById(claimId) {
    const [claim] = await db.select()
      .from(claims)
      .where(eq(claims.id, parseInt(claimId)))
      .limit(1);

    return claim || null;
  }

  /**
   * Fuzzy match claim
   * @private
   */
  async fuzzyMatchClaim(criteria) {
    // Simplified fuzzy matching - in production, use more sophisticated algorithm
    const matchingClaims = await db.select()
      .from(claims)
      .where(
        and(
          eq(claims.service_start_date, criteria.statementFrom),
          eq(claims.total_charge_amount, criteria.totalChargeAmount)
        )
      )
      .limit(1);

    return matchingClaims[0] || null;
  }

  /**
   * Calculate match confidence score
   * @private
   */
  calculateMatchConfidence(claim, claimPayment) {
    let score = 0;
    let maxScore = 0;

    // Patient name match (30 points)
    maxScore += 30;
    if (claimPayment.patient?.lastName?.toLowerCase() === claim.patient_last_name?.toLowerCase()) {
      score += 30;
    }

    // Date match (25 points)
    maxScore += 25;
    if (claimPayment.dates?.statementFrom === claim.service_start_date) {
      score += 25;
    }

    // Amount match (25 points)
    maxScore += 25;
    if (claimPayment.totalChargeAmount === claim.total_charge_amount) {
      score += 25;
    }

    // Payer match (20 points)
    maxScore += 20;
    if (claim.payer_id) {
      score += 20;
    }

    return parseFloat((score / maxScore).toFixed(2));
  }

  /**
   * Validate payment against claim
   * @private
   */
  async validatePayment(claim, claimPayment) {
    // Check 1: Claim status must allow posting
    if (claim.status === 'PAID' || claim.status === 'CLOSED') {
      return {
        valid: false,
        reason: 'INVALID_CLAIM_STATUS',
        message: `Claim status '${claim.status}' does not allow posting`,
        severity: 'HIGH'
      };
    }

    // Check 2: Prevent duplicate payments
    const existingPayment = await this.checkDuplicatePayment(claim.id, claimPayment);
    if (existingPayment) {
      return {
        valid: false,
        reason: 'DUPLICATE_PAYMENT',
        message: 'Payment already posted for this claim and check number',
        severity: 'CRITICAL'
      };
    }

    // Check 3: Amount validation (payment shouldn't exceed billed amount)
    if (claimPayment.paymentAmount > claim.total_charge_amount) {
      return {
        valid: false,
        reason: 'AMOUNT_MISMATCH',
        message: `Payment amount ${claimPayment.paymentAmount} exceeds billed amount ${claim.total_charge_amount}`,
        severity: 'MEDIUM'
      };
    }

    return {
      valid: true
    };
  }

  /**
   * Check for duplicate payment
   * @private
   */
  async checkDuplicatePayment(claimId, claimPayment) {
    const [existing] = await db.select()
      .from(era_payments)
      .where(
        and(
          eq(era_payments.claim_id, claimId),
          eq(era_payments.check_number, claimPayment.checkNumber || '')
        )
      )
      .limit(1);

    return existing || null;
  }

  /**
   * Auto-post payment to claim
   * @private
   */
  async autoPostPayment(params) {
    const { eraPaymentId, claim, claimPayment } = params;

    // Calculate amounts
    const paymentAmount = claimPayment.paymentAmount;
    const allowedAmount = claimPayment.totalChargeAmount;
    const billedAmount = claim.total_charge_amount;

    // Calculate adjustments from CARC codes
    const totalAdjustments = this.calculateTotalAdjustments(claimPayment);
    const contractualAdjustment = this.calculateContractualAdjustment(claimPayment);
    const patientResponsibility = claimPayment.patientResponsibilityAmount || 0;

    // Calculate new claim balance
    const previousBalance = claim.total_charge_amount - (claim.total_paid || 0);
    const newBalance = previousBalance - paymentAmount;

    // Extract CARC codes
    const adjustmentReasonCodes = EDI835Parser.extractCARCCodes(claimPayment);

    // Create posting record
    const [posting] = await db.insert(payment_postings)
      .values({
        posting_id: nanoid(),
        era_payment_id: eraPaymentId,
        claim_id: claim.id,
        posting_date: new Date(),
        posting_type: 'AUTO',
        posting_level: 'CLAIM',
        payment_amount: paymentAmount,
        allowed_amount: allowedAmount,
        billed_amount: billedAmount,
        adjustment_amount: totalAdjustments,
        contractual_adjustment: contractualAdjustment,
        patient_responsibility: patientResponsibility,
        previous_balance: previousBalance,
        new_balance: newBalance,
        adjustment_reason_codes: adjustmentReasonCodes,
        is_validated: true,
        metadata: {
          claimStatusCode: claimPayment.claimStatusCode,
          paymentStatus: EDI835Parser.getPaymentStatus(claimPayment)
        }
      })
      .returning();

    // Update claim with payment
    await db.update(claims)
      .set({
        total_paid: sql`${claims.total_paid} + ${paymentAmount}`,
        balance: newBalance,
        status: newBalance === 0 ? 'PAID' : 'PARTIALLY_PAID',
        last_payment_date: new Date(),
        updated_at: new Date()
      })
      .where(eq(claims.id, claim.id));

    return posting;
  }

  /**
   * Calculate total adjustments from CARC codes
   * @private
   */
  calculateTotalAdjustments(claimPayment) {
    let total = 0;

    claimPayment.adjustments?.forEach(adj => {
      adj.adjustments?.forEach(item => {
        total += item.amount || 0;
      });
    });

    claimPayment.serviceLines?.forEach(line => {
      line.adjustments?.forEach(adj => {
        adj.adjustments?.forEach(item => {
          total += item.amount || 0;
        });
      });
    });

    return total;
  }

  /**
   * Calculate contractual adjustment (CO group code)
   * @private
   */
  calculateContractualAdjustment(claimPayment) {
    let total = 0;

    claimPayment.adjustments?.forEach(adj => {
      if (adj.groupCode === 'CO') {
        adj.adjustments?.forEach(item => {
          total += item.amount || 0;
        });
      }
    });

    claimPayment.serviceLines?.forEach(line => {
      line.adjustments?.forEach(adj => {
        if (adj.groupCode === 'CO') {
          adj.adjustments?.forEach(item => {
            total += item.amount || 0;
          });
        }
      });
    });

    return total;
  }

  /**
   * Create ERA file record
   * @private
   */
  async createERAFileRecord(data) {
    const { fileName, fileContent, parsed835, uploadedBy } = data;

    const [eraFile] = await db.insert(era_files)
      .values({
        file_id: nanoid(),
        file_name: fileName,
        file_size: fileContent.length,
        edi_835_content: fileContent,
        control_number: parsed835.header.interchangeControlNumber,
        payer_name: parsed835.payer.name,
        payer_identifier: parsed835.payer.identifier,
        production_date: parsed835.payment.productionDate,
        received_date: new Date(),
        status: 'PROCESSING',
        total_claims: parsed835.claimPayments.length,
        total_amount: parsed835.payment.totalPaymentAmount,
        source: 'MANUAL_UPLOAD',
        uploaded_by_id: uploadedBy,
        metadata: {
          header: parsed835.header,
          payer: parsed835.payer,
          payee: parsed835.payee
        }
      })
      .returning();

    return eraFile;
  }

  /**
   * Create ERA payment record
   * @private
   */
  async createERAPaymentRecord(data) {
    const { eraFileId, claimPayment, payer, payment } = data;

    const [eraPayment] = await db.insert(era_payments)
      .values({
        payment_id: nanoid(),
        era_file_id: eraFileId,
        check_number: payment.checkNumber,
        check_date: payment.effectiveDate,
        payer_name: payer.name,
        payer_identifier: payer.identifier,
        total_payment_amount: claimPayment.paymentAmount,
        total_billed_amount: claimPayment.totalChargeAmount,
        total_adjustment_amount: this.calculateTotalAdjustments(claimPayment),
        payment_method: payment.paymentMethod,
        patient_account_number: claimPayment.patientAccountNumber,
        patient_name: `${claimPayment.patient?.firstName || ''} ${claimPayment.patient?.lastName || ''}`.trim(),
        claim_statement_period_start: claimPayment.dates?.statementFrom,
        claim_statement_period_end: claimPayment.dates?.statementTo,
        claim_status: EDI835Parser.getClaimStatusDescription(claimPayment.claimStatusCode),
        service_line_count: claimPayment.serviceLines?.length || 0,
        adjustment_codes: EDI835Parser.extractCARCCodes(claimPayment),
        posting_status: 'PENDING',
        claim_payment_info: claimPayment,
        metadata: {
          internalClaimId: claimPayment.internalClaimId,
          payerClaimControlNumber: claimPayment.payerClaimControlNumber
        }
      })
      .returning();

    return eraPayment;
  }

  /**
   * Create posting exception
   * @private
   */
  async createException(data) {
    const {
      eraPaymentId,
      eraFileId,
      type,
      reason,
      severity,
      claimPayment,
      attemptedClaimId,
      confidence
    } = data;

    // Calculate SLA deadline
    const slaDeadline = new Date();
    slaDeadline.setDate(slaDeadline.getDate() + this.exceptionSLA[severity]);

    const [exception] = await db.insert(posting_exceptions)
      .values({
        exception_id: nanoid(),
        era_payment_id: eraPaymentId,
        era_file_id: eraFileId,
        exception_type: type,
        exception_reason: reason,
        exception_severity: severity,
        check_number: claimPayment.checkNumber,
        payment_amount: claimPayment.paymentAmount,
        patient_account_number: claimPayment.patientAccountNumber,
        attempted_claim_id: attemptedClaimId,
        match_confidence_score: confidence,
        status: 'PENDING',
        sla_deadline: slaDeadline,
        metadata: {
          claimPayment
        }
      })
      .returning();

    return exception;
  }

  /**
   * Update ERA file summary
   * @private
   */
  async updateERAFileSummary(eraFileId, summary) {
    await db.update(era_files)
      .set({
        ...summary,
        updated_at: new Date()
      })
      .where(eq(era_files.id, eraFileId));
  }

  /**
   * Update ERA payment status
   * @private
   */
  async updateERAPaymentStatus(eraPaymentId, updates) {
    await db.update(era_payments)
      .set({
        ...updates,
        updated_at: new Date()
      })
      .where(eq(era_payments.id, eraPaymentId));
  }

  /**
   * Get posting exceptions
   */
  async getPostingExceptions(filters = {}) {
    const { status = 'PENDING', severity, limit = 50 } = filters;

    let query = db.select()
      .from(posting_exceptions)
      .orderBy(desc(posting_exceptions.created_at))
      .limit(limit);

    if (status) {
      query = query.where(eq(posting_exceptions.status, status));
    }

    if (severity) {
      query = query.where(eq(posting_exceptions.exception_severity, severity));
    }

    const exceptions = await query;
    return exceptions;
  }

  /**
   * Resolve posting exception
   */
  async resolveException(exceptionId, resolution) {
    const { resolutionType, notes, resolvedBy } = resolution;

    await db.update(posting_exceptions)
      .set({
        status: 'RESOLVED',
        resolution_type: resolutionType,
        resolution_notes: notes,
        resolved_at: new Date(),
        resolved_by_id: resolvedBy,
        updated_at: new Date()
      })
      .where(eq(posting_exceptions.exception_id, exceptionId));
  }

  /**
   * Get ERA file details
   */
  async getERAFile(fileId) {
    const [file] = await db.select()
      .from(era_files)
      .where(eq(era_files.file_id, fileId))
      .limit(1);

    return file || null;
  }

  /**
   * Get ERA payments for file
   */
  async getERAPayments(fileId) {
    const payments = await db.select()
      .from(era_payments)
      .where(eq(era_payments.era_file_id, parseInt(fileId)))
      .orderBy(desc(era_payments.created_at));

    return payments;
  }

  /**
   * Manual payment posting
   * Post a payment manually with optional claim override
   * @param {object} params - Manual posting parameters
   * @returns {Promise<object>} Posting result
   */
  async manualPostPayment(params) {
    const { paymentId, claimId, postedBy, notes } = params;

    // 1. Get ERA payment
    const [eraPayment] = await db.select()
      .from(era_payments)
      .where(eq(era_payments.payment_id, paymentId))
      .limit(1);

    if (!eraPayment) {
      throw new Error(`ERA payment not found: ${paymentId}`);
    }

    // 2. Check if already posted
    if (eraPayment.posting_status === 'AUTO_POSTED' || eraPayment.posting_status === 'MANUAL_POSTED') {
      throw new Error(`Payment already posted with status: ${eraPayment.posting_status}`);
    }

    // 3. Get claim (either from override or from payment)
    const targetClaimId = claimId || eraPayment.claim_id;

    if (!targetClaimId) {
      throw new Error('No claim ID specified and payment has no associated claim');
    }

    const [claim] = await db.select()
      .from(claims)
      .where(eq(claims.id, parseInt(targetClaimId)))
      .limit(1);

    if (!claim) {
      throw new Error(`Claim not found: ${targetClaimId}`);
    }

    // 4. Validate claim status
    if (claim.status === 'PAID' || claim.status === 'CLOSED') {
      throw new Error(`Cannot post to claim with status: ${claim.status}`);
    }

    // 5. Calculate amounts
    const paymentAmount = eraPayment.total_payment_amount;
    const allowedAmount = eraPayment.total_allowed_amount || eraPayment.total_billed_amount;
    const billedAmount = claim.total_charge_amount;
    const totalAdjustments = eraPayment.total_adjustment_amount || 0;

    // Calculate new claim balance
    const previousBalance = claim.total_charge_amount - (claim.total_paid || 0);
    const newBalance = previousBalance - paymentAmount;

    // 6. Create posting record
    const [posting] = await db.insert(payment_postings)
      .values({
        posting_id: nanoid(),
        era_payment_id: eraPayment.id,
        claim_id: claim.id,
        posting_date: new Date(),
        posting_type: 'MANUAL',
        posting_level: 'CLAIM',
        payment_amount: paymentAmount,
        allowed_amount: allowedAmount,
        billed_amount: billedAmount,
        adjustment_amount: totalAdjustments,
        contractual_adjustment: this.extractContractualAdjustment(eraPayment.adjustment_codes),
        patient_responsibility: this.extractPatientResponsibility(eraPayment.adjustment_codes),
        previous_balance: previousBalance,
        new_balance: newBalance,
        adjustment_reason_codes: eraPayment.adjustment_codes,
        is_validated: true,
        validation_notes: notes,
        posted_by_id: postedBy,
        metadata: {
          manualOverride: claimId !== eraPayment.claim_id,
          originalClaimId: eraPayment.claim_id
        }
      })
      .returning();

    // 7. Update claim
    await db.update(claims)
      .set({
        total_paid: sql`${claims.total_paid} + ${paymentAmount}`,
        balance: newBalance,
        status: newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID',
        last_payment_date: new Date(),
        updated_at: new Date()
      })
      .where(eq(claims.id, claim.id));

    // 8. Update ERA payment status
    await db.update(era_payments)
      .set({
        claim_id: claim.id,
        posting_status: 'MANUAL_POSTED',
        posted_at: new Date(),
        posted_by_id: postedBy,
        is_exception: false,
        updated_at: new Date()
      })
      .where(eq(era_payments.id, eraPayment.id));

    // 9. Resolve any related exceptions
    await db.update(posting_exceptions)
      .set({
        status: 'RESOLVED',
        resolution_type: 'MANUAL_POSTED',
        resolution_notes: notes || 'Payment manually posted',
        resolved_at: new Date(),
        resolved_by_id: postedBy,
        updated_at: new Date()
      })
      .where(eq(posting_exceptions.era_payment_id, eraPayment.id));

    return {
      success: true,
      posting,
      claim: {
        id: claim.id,
        previousBalance,
        newBalance,
        status: newBalance <= 0 ? 'PAID' : 'PARTIALLY_PAID'
      }
    };
  }

  /**
   * Extract contractual adjustment from adjustment codes (CO group)
   * @private
   */
  extractContractualAdjustment(adjustmentCodes) {
    if (!adjustmentCodes || !Array.isArray(adjustmentCodes)) return 0;

    return adjustmentCodes
      .filter(adj => adj.groupCode === 'CO')
      .reduce((sum, adj) => sum + (adj.amount || 0), 0);
  }

  /**
   * Extract patient responsibility from adjustment codes (PR group)
   * @private
   */
  extractPatientResponsibility(adjustmentCodes) {
    if (!adjustmentCodes || !Array.isArray(adjustmentCodes)) return 0;

    return adjustmentCodes
      .filter(adj => adj.groupCode === 'PR')
      .reduce((sum, adj) => sum + (adj.amount || 0), 0);
  }

  /**
   * Get ERA payment by ID
   */
  async getERAPaymentById(paymentId) {
    const [payment] = await db.select()
      .from(era_payments)
      .where(eq(era_payments.payment_id, paymentId))
      .limit(1);

    return payment || null;
  }

  /**
   * Get reconciliation summary statistics
   * @param {object} filters - Date range and status filters
   * @returns {Promise<object>} Summary statistics
   */
  async getReconciliationSummary(filters = {}) {
    const { startDate, endDate, status } = filters;

    // Get all reconciliation batches with filters
    let query = db.select()
      .from(reconciliation_batches)
      .orderBy(desc(reconciliation_batches.batch_date));

    if (startDate) {
      query = query.where(sql`${reconciliation_batches.batch_date} >= ${startDate}`);
    }

    if (endDate) {
      query = query.where(sql`${reconciliation_batches.batch_date} <= ${endDate}`);
    }

    if (status) {
      query = query.where(eq(reconciliation_batches.reconciliation_status, status));
    }

    const batches = await query.limit(100);

    // Calculate summary statistics
    const summary = {
      totalBatches: batches.length,
      totalDeposits: batches.reduce((sum, b) => sum + (b.deposit_amount || 0), 0),
      totalPosted: batches.reduce((sum, b) => sum + (b.total_posted_payments || 0), 0),
      totalVariance: batches.reduce((sum, b) => sum + Math.abs(b.variance_amount || 0), 0),
      reconciledCount: batches.filter(b => b.is_reconciled).length,
      pendingCount: batches.filter(b => b.reconciliation_status === 'PENDING').length,
      varianceCount: batches.filter(b => b.reconciliation_status === 'VARIANCE_IDENTIFIED').length,
      exceptionCount: batches.filter(b => b.reconciliation_status === 'EXCEPTION').length,
      averageVariance: batches.length > 0
        ? Math.round(batches.reduce((sum, b) => sum + Math.abs(b.variance_amount || 0), 0) / batches.length)
        : 0,
      reconciliationRate: batches.length > 0
        ? Math.round((batches.filter(b => b.is_reconciled).length / batches.length) * 100)
        : 0
    };

    return {
      summary,
      batches
    };
  }

  /**
   * Get payment posting dashboard metrics
   * @returns {Promise<object>} Dashboard metrics
   */
  async getPostingDashboardMetrics() {
    // Get ERA file stats
    const [eraStats] = await db.select({
      totalFiles: sql`COUNT(*)`.as('totalFiles'),
      completedFiles: sql`COUNT(*) FILTER (WHERE ${era_files.status} = 'COMPLETED')`.as('completedFiles'),
      partiallyPosted: sql`COUNT(*) FILTER (WHERE ${era_files.status} = 'PARTIALLY_POSTED')`.as('partiallyPosted'),
      errorFiles: sql`COUNT(*) FILTER (WHERE ${era_files.status} = 'ERROR')`.as('errorFiles'),
      totalAmount: sql`COALESCE(SUM(${era_files.total_amount}), 0)`.as('totalAmount'),
      totalAutoPosted: sql`COALESCE(SUM(${era_files.auto_posted_count}), 0)`.as('totalAutoPosted'),
      totalExceptions: sql`COALESCE(SUM(${era_files.exception_count}), 0)`.as('totalExceptions')
    }).from(era_files);

    // Get exception stats
    const [exceptionStats] = await db.select({
      pendingExceptions: sql`COUNT(*) FILTER (WHERE ${posting_exceptions.status} = 'PENDING')`.as('pendingExceptions'),
      overdueExceptions: sql`COUNT(*) FILTER (WHERE ${posting_exceptions.is_overdue} = true)`.as('overdueExceptions'),
      criticalExceptions: sql`COUNT(*) FILTER (WHERE ${posting_exceptions.exception_severity} = 'CRITICAL' AND ${posting_exceptions.status} = 'PENDING')`.as('criticalExceptions'),
      highExceptions: sql`COUNT(*) FILTER (WHERE ${posting_exceptions.exception_severity} = 'HIGH' AND ${posting_exceptions.status} = 'PENDING')`.as('highExceptions'),
      resolvedToday: sql`COUNT(*) FILTER (WHERE DATE(${posting_exceptions.resolved_at}) = CURRENT_DATE)`.as('resolvedToday')
    }).from(posting_exceptions);

    // Get posting stats
    const [postingStats] = await db.select({
      totalPostings: sql`COUNT(*)`.as('totalPostings'),
      autoPostings: sql`COUNT(*) FILTER (WHERE ${payment_postings.posting_type} = 'AUTO')`.as('autoPostings'),
      manualPostings: sql`COUNT(*) FILTER (WHERE ${payment_postings.posting_type} = 'MANUAL')`.as('manualPostings'),
      todayPostings: sql`COUNT(*) FILTER (WHERE DATE(${payment_postings.posting_date}) = CURRENT_DATE)`.as('todayPostings'),
      totalPostedAmount: sql`COALESCE(SUM(${payment_postings.payment_amount}), 0)`.as('totalPostedAmount')
    }).from(payment_postings);

    // Calculate auto-post rate
    const autoPostRate = eraStats.totalAutoPosted + eraStats.totalExceptions > 0
      ? Math.round((parseInt(eraStats.totalAutoPosted) / (parseInt(eraStats.totalAutoPosted) + parseInt(eraStats.totalExceptions))) * 100)
      : 0;

    return {
      eraFiles: {
        total: parseInt(eraStats.totalFiles) || 0,
        completed: parseInt(eraStats.completedFiles) || 0,
        partiallyPosted: parseInt(eraStats.partiallyPosted) || 0,
        errors: parseInt(eraStats.errorFiles) || 0,
        totalAmount: parseInt(eraStats.totalAmount) || 0
      },
      posting: {
        total: parseInt(postingStats.totalPostings) || 0,
        auto: parseInt(postingStats.autoPostings) || 0,
        manual: parseInt(postingStats.manualPostings) || 0,
        today: parseInt(postingStats.todayPostings) || 0,
        totalAmount: parseInt(postingStats.totalPostedAmount) || 0,
        autoPostRate
      },
      exceptions: {
        pending: parseInt(exceptionStats.pendingExceptions) || 0,
        overdue: parseInt(exceptionStats.overdueExceptions) || 0,
        critical: parseInt(exceptionStats.criticalExceptions) || 0,
        high: parseInt(exceptionStats.highExceptions) || 0,
        resolvedToday: parseInt(exceptionStats.resolvedToday) || 0
      }
    };
  }

  /**
   * Reverse a payment posting
   * @param {object} params - Reversal parameters
   * @returns {Promise<object>} Reversal result
   */
  async reversePosting(params) {
    const { postingId, reason, reversedBy } = params;

    // Get posting
    const [posting] = await db.select()
      .from(payment_postings)
      .where(eq(payment_postings.posting_id, postingId))
      .limit(1);

    if (!posting) {
      throw new Error(`Posting not found: ${postingId}`);
    }

    if (posting.is_reversed) {
      throw new Error('Posting has already been reversed');
    }

    // Get claim
    const [claim] = await db.select()
      .from(claims)
      .where(eq(claims.id, posting.claim_id))
      .limit(1);

    if (!claim) {
      throw new Error(`Claim not found: ${posting.claim_id}`);
    }

    // Reverse the posting
    await db.update(payment_postings)
      .set({
        is_reversed: true,
        reversed_at: new Date(),
        reversed_by_id: reversedBy,
        reversal_reason: reason,
        updated_at: new Date()
      })
      .where(eq(payment_postings.id, posting.id));

    // Update claim - reverse the payment amount
    const newBalance = (claim.balance || 0) + posting.payment_amount;
    const newTotalPaid = (claim.total_paid || 0) - posting.payment_amount;

    await db.update(claims)
      .set({
        total_paid: newTotalPaid,
        balance: newBalance,
        status: newBalance > 0 ? 'SUBMITTED' : claim.status,
        updated_at: new Date()
      })
      .where(eq(claims.id, claim.id));

    // Update ERA payment status back to pending
    await db.update(era_payments)
      .set({
        posting_status: 'PENDING',
        posted_at: null,
        updated_at: new Date()
      })
      .where(eq(era_payments.id, posting.era_payment_id));

    return {
      success: true,
      reversedPosting: posting,
      claim: {
        id: claim.id,
        newBalance,
        newTotalPaid
      }
    };
  }
}

// Export singleton instance
export default new PaymentPostingService();
