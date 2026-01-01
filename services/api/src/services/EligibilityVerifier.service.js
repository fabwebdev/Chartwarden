import { db } from '../db/index.js';
import {
  eligibility_requests,
  eligibility_responses,
  patient_coverage,
  benefit_details
} from '../db/schemas/index.js';
import { patients } from '../db/schemas/patient.schema.js';
import { payers } from '../db/schemas/billing.schema.js';
import { eq, and, desc, gte, lte, sql, count } from 'drizzle-orm';
import EDI270Generator from './EDI270Generator.service.js';
import EDI271Parser from './EDI271Parser.service.js';
import { nanoid } from 'nanoid';

import { logger } from '../utils/logger.js';
/**
 * Eligibility Verifier Service
 * Phase 3A - Real-time Insurance Eligibility Verification
 *
 * Purpose: Orchestrate end-to-end eligibility verification workflow
 * - Generate 270 EDI transactions
 * - Submit to clearinghouses
 * - Parse 271 responses
 * - Update database with results
 * - Manage eligibility cache
 *
 * Features:
 *   - Real-time eligibility verification
 *   - Batch eligibility checks
 *   - 30-day cache management
 *   - Auto-reverification on cache expiry
 *   - Patient coverage snapshot updates
 */
class EligibilityVerifier {
  constructor() {
    this.cacheValidityDays = 30;
  }

  /**
   * Verify patient eligibility
   * Main entry point for eligibility verification
   * @param {object} params - Verification parameters
   * @returns {Promise<object>} Verification result
   */
  async verifyEligibility(params) {
    const {
      patientId,
      payerId,
      serviceType = 'HOSPICE',
      forceRefresh = false,
      submittedBy
    } = params;

    try {
      // 1. Check cache first (unless force refresh)
      if (!forceRefresh) {
        const cachedCoverage = await this.getCachedCoverage(patientId);
        if (cachedCoverage && this.isCacheValid(cachedCoverage)) {
          return {
            source: 'CACHE',
            cached: true,
            coverage: cachedCoverage,
            message: 'Eligibility retrieved from cache'
          };
        }
      }

      // 2. Get patient and payer information
      const patient = await this.getPatient(patientId);
      const payer = payerId ? await this.getPayer(payerId) : null;

      if (!patient) {
        throw new Error(`Patient not found: ${patientId}`);
      }

      // 3. Generate 270 EDI transaction
      const { ediContent, controlNumbers, requestId } = await EDI270Generator.generate270({
        patient,
        payer,
        provider: null, // Will use default from generator
        serviceType,
        requestType: 'REAL_TIME'
      });

      // 4. Create eligibility request record
      const request = await this.createEligibilityRequest({
        requestId,
        patientId,
        payerId,
        serviceType,
        ediContent,
        controlNumbers,
        submittedBy
      });

      // 5. Submit to clearinghouse (simulated for now)
      const submissionResult = await this.submitToClearinghouse({
        ediContent,
        requestId,
        clearinghouseName: payer?.clearinghouse_name || 'DEFAULT_CLEARINGHOUSE'
      });

      // 6. Update request status
      await this.updateRequestStatus(request.id, {
        status: 'SENT',
        sent_at: new Date(),
        clearinghouse_trace_id: submissionResult.traceId
      });

      // 7. Simulate 271 response (in production, this would be async)
      // For now, return pending status
      return {
        source: 'REAL_TIME',
        cached: false,
        requestId,
        status: 'PENDING',
        message: 'Eligibility verification request submitted successfully',
        request
      };
    } catch (error) {
      logger.error('Error verifying eligibility:', error)
      throw new Error(`Eligibility verification failed: ${error.message}`);
    }
  }

  /**
   * Process 271 EDI response
   * Called when 271 response is received from clearinghouse
   * @param {object} params - Response parameters
   * @returns {Promise<object>} Processed result
   */
  async process271Response(params) {
    const {
      requestId,
      edi271Content,
      receivedAt = new Date()
    } = params;

    try {
      // 1. Find the original request
      const [request] = await db.select()
        .from(eligibility_requests)
        .where(eq(eligibility_requests.request_id, requestId))
        .limit(1);

      if (!request) {
        throw new Error(`Eligibility request not found: ${requestId}`);
      }

      // 2. Parse 271 response
      const parsed271 = await EDI271Parser.parse271(edi271Content);

      // 3. Create eligibility response record
      const response = await this.createEligibilityResponse({
        requestId: request.id,
        patientId: request.patient_id,
        payerId: request.payer_id,
        edi271Content,
        parsed271,
        receivedAt
      });

      // 4. Extract and store benefit details
      if (parsed271.benefits && parsed271.benefits.length > 0) {
        await this.storeBenefitDetails(response.id, request.patient_id, parsed271.benefits);
      }

      // 5. Update patient coverage snapshot
      await this.updatePatientCoverage(request.patient_id, response.id, parsed271);

      // 6. Update request status
      await this.updateRequestStatus(request.id, {
        status: 'RECEIVED'
      });

      return {
        success: true,
        responseId: response.id,
        eligibility: {
          isEligible: parsed271.eligibility.isEligible,
          status: parsed271.eligibility.status,
          coverageDates: parsed271.eligibility.coverageDates
        },
        message: 'Eligibility response processed successfully'
      };
    } catch (error) {
      logger.error('Error processing 271 response:', error)
      throw new Error(`271 processing failed: ${error.message}`);
    }
  }

  /**
   * Batch verify eligibility for multiple patients
   * @param {Array} patientIds - Array of patient IDs
   * @returns {Promise<Array>} Verification results
   */
  async batchVerifyEligibility(patientIds, options = {}) {
    const results = [];

    for (const patientId of patientIds) {
      try {
        const result = await this.verifyEligibility({
          patientId,
          ...options
        });
        results.push({
          patientId,
          success: true,
          result
        });
      } catch (error) {
        results.push({
          patientId,
          success: false,
          error: error.message
        });
      }
    }

    return results;
  }

  /**
   * Get cached coverage for patient
   * @private
   */
  async getCachedCoverage(patientId) {
    const [coverage] = await db.select()
      .from(patient_coverage)
      .where(eq(patient_coverage.patient_id, patientId))
      .limit(1);

    return coverage || null;
  }

  /**
   * Check if cache is still valid
   * @private
   */
  isCacheValid(coverage) {
    if (!coverage.cache_expires_at) return false;
    return new Date() < new Date(coverage.cache_expires_at);
  }

  /**
   * Get patient information
   * @private
   */
  async getPatient(patientId) {
    const [patient] = await db.select()
      .from(patients)
      .where(eq(patients.id, patientId))
      .limit(1);

    return patient || null;
  }

  /**
   * Get payer information
   * @private
   */
  async getPayer(payerId) {
    const [payer] = await db.select()
      .from(payers)
      .where(eq(payers.id, payerId))
      .limit(1);

    return payer || null;
  }

  /**
   * Create eligibility request record
   * @private
   */
  async createEligibilityRequest(data) {
    const [request] = await db.insert(eligibility_requests)
      .values({
        request_id: data.requestId,
        patient_id: data.patientId,
        payer_id: data.payerId,
        request_type: 'REAL_TIME',
        service_type: data.serviceType,
        edi_270_content: data.ediContent,
        control_number: data.controlNumbers.isa.toString(),
        status: 'PENDING',
        created_by_id: data.submittedBy,
        metadata: {
          controlNumbers: data.controlNumbers
        }
      })
      .returning();

    return request;
  }

  /**
   * Submit to clearinghouse
   * @private
   * TODO: Implement actual clearinghouse integration (SFTP, API, HTTPS)
   */
  async submitToClearinghouse(data) {
    // Simulated submission - in production, this would:
    // 1. Connect to clearinghouse via SFTP/API/HTTPS
    // 2. Submit the 270 EDI file
    // 3. Receive acknowledgment
    // 4. Return trace ID

    // For now, simulate successful submission
    return {
      success: true,
      traceId: nanoid(),
      submittedAt: new Date(),
      clearinghouseName: data.clearinghouseName
    };
  }

  /**
   * Update eligibility request status
   * @private
   */
  async updateRequestStatus(requestId, updates) {
    await db.update(eligibility_requests)
      .set({
        ...updates,
        updated_at: new Date()
      })
      .where(eq(eligibility_requests.id, requestId));
  }

  /**
   * Create eligibility response record
   * @private
   */
  async createEligibilityResponse(data) {
    const { parsed271 } = data;

    // Calculate cache expiration (30 days from now)
    const validUntil = new Date();
    validUntil.setDate(validUntil.getDate() + this.cacheValidityDays);

    // Extract financial amounts
    const copay = EDI271Parser.extractCopay(parsed271.benefits);
    const deductible = EDI271Parser.extractDeductible(parsed271.benefits);
    const oopMax = EDI271Parser.extractOutOfPocketMax(parsed271.benefits);

    const [response] = await db.insert(eligibility_responses)
      .values({
        request_id: data.requestId,
        response_id: nanoid(),
        patient_id: data.patientId,
        payer_id: data.payerId,
        edi_271_content: data.edi271Content,
        control_number: parsed271.header.interchangeControlNumber,
        response_date: new Date(parsed271.header.transactionDate || Date.now()),
        received_at: data.receivedAt,

        // Eligibility status
        eligibility_status: parsed271.eligibility.status,
        is_eligible: parsed271.eligibility.isEligible,

        // Coverage dates
        coverage_effective_date: parsed271.eligibility.coverageDates.effectiveDate,
        coverage_termination_date: parsed271.eligibility.coverageDates.terminationDate,

        // Subscriber info
        subscriber_id: parsed271.subscriber.memberId,
        subscriber_name: `${parsed271.subscriber.firstName} ${parsed271.subscriber.lastName}`,

        // Financial info
        copay_amount: copay,
        deductible_amount: deductible.amount,
        out_of_pocket_max: oopMax.max,

        // Additional info
        limitations: EDI271Parser.extractLimitations(parsed271.benefits, parsed271.additional),
        authorization_required: EDI271Parser.isAuthorizationRequired(parsed271.benefits),

        // Cache management
        valid_until: validUntil,
        is_current: true,

        metadata: {
          header: parsed271.header,
          serviceTypeCode: parsed271.eligibility.serviceTypeCode
        }
      })
      .returning();

    // Mark other responses for this patient as not current
    await db.update(eligibility_responses)
      .set({ is_current: false })
      .where(
        and(
          eq(eligibility_responses.patient_id, data.patientId),
          eq(eligibility_responses.is_current, true)
        )
      );

    return response;
  }

  /**
   * Store benefit details
   * @private
   */
  async storeBenefitDetails(responseId, patientId, benefits) {
    const benefitRecords = benefits.map(benefit => ({
      response_id: responseId,
      patient_id: patientId,
      service_type_code: benefit.serviceTypeCode,
      coverage_level: benefit.coverageLevel,
      time_period_qualifier: benefit.timePeriodQualifier,
      monetary_amount: benefit.monetaryAmount,
      percentage_amount: benefit.percentageAmount,
      quantity: benefit.quantity,
      in_network: benefit.inPlanNetwork,
      benefit_type: this.determineBenefitType(benefit),
      description: benefit.description,
      authorization_required: benefit.authorizationRequired,
      additional_info: {
        insuranceTypeCode: benefit.insuranceTypeCode,
        planCoverageDescription: benefit.planCoverageDescription,
        compositeMedicalProcedure: benefit.compositeMedicalProcedure,
        compositeDiagnosis: benefit.compositeDiagnosis
      }
    }));

    await db.insert(benefit_details).values(benefitRecords);
  }

  /**
   * Determine benefit type from EB segment
   * @private
   */
  determineBenefitType(benefit) {
    const insuranceTypeCode = benefit.insuranceTypeCode;

    if (insuranceTypeCode === 'C') return 'DEDUCTIBLE';
    if (insuranceTypeCode === 'G') return 'OUT_OF_POCKET';
    if (insuranceTypeCode === 'A') return 'COINSURANCE';
    if (benefit.monetaryAmount && benefit.serviceTypeCode) return 'COPAY';
    if (benefit.quantity) return 'LIMIT';

    return 'OTHER';
  }

  /**
   * Update patient coverage snapshot
   * @private
   */
  async updatePatientCoverage(patientId, responseId, parsed271) {
    const copay = EDI271Parser.extractCopay(parsed271.benefits);
    const deductible = EDI271Parser.extractDeductible(parsed271.benefits);
    const oopMax = EDI271Parser.extractOutOfPocketMax(parsed271.benefits);

    // Calculate cache expiration
    const cacheExpiresAt = new Date();
    cacheExpiresAt.setDate(cacheExpiresAt.getDate() + this.cacheValidityDays);

    // Check if coverage record exists
    const [existing] = await db.select()
      .from(patient_coverage)
      .where(eq(patient_coverage.patient_id, patientId))
      .limit(1);

    const coverageData = {
      patient_id: patientId,
      is_active: parsed271.eligibility.isEligible,
      eligibility_verified: true,
      last_verified_date: new Date(),
      effective_date: parsed271.eligibility.coverageDates.effectiveDate,
      termination_date: parsed271.eligibility.coverageDates.terminationDate,
      member_id: parsed271.subscriber.memberId,
      copay_amount: copay,
      deductible_amount: deductible.amount,
      deductible_remaining: deductible.remaining,
      out_of_pocket_max: oopMax.max,
      out_of_pocket_remaining: oopMax.remaining,
      authorization_required: EDI271Parser.isAuthorizationRequired(parsed271.benefits),
      hospice_covered: parsed271.eligibility.serviceTypeCode === '42',
      limitations: EDI271Parser.extractLimitations(parsed271.benefits, parsed271.additional),
      latest_response_id: responseId,
      cache_expires_at: cacheExpiresAt,
      needs_reverification: false,
      updated_at: new Date()
    };

    if (existing) {
      // Update existing record
      await db.update(patient_coverage)
        .set(coverageData)
        .where(eq(patient_coverage.id, existing.id));
    } else {
      // Insert new record
      await db.insert(patient_coverage).values(coverageData);
    }
  }

  /**
   * Get eligibility history for patient
   * @param {number} patientId - Patient ID
   * @returns {Promise<Array>} Eligibility history
   */
  async getEligibilityHistory(patientId, limit = 10) {
    const history = await db.select()
      .from(eligibility_responses)
      .where(eq(eligibility_responses.patient_id, patientId))
      .orderBy(desc(eligibility_responses.response_date))
      .limit(limit);

    return history;
  }

  /**
   * Get current patient coverage
   * @param {number} patientId - Patient ID
   * @returns {Promise<object>} Current coverage
   */
  async getCurrentCoverage(patientId) {
    const [coverage] = await db.select()
      .from(patient_coverage)
      .where(eq(patient_coverage.patient_id, patientId))
      .limit(1);

    if (!coverage) {
      return null;
    }

    // Check if cache needs reverification
    const needsReverification = !this.isCacheValid(coverage);

    return {
      ...coverage,
      cacheExpired: needsReverification,
      daysUntilExpiration: this.getDaysUntilExpiration(coverage.cache_expires_at)
    };
  }

  /**
   * Get days until cache expiration
   * @private
   */
  getDaysUntilExpiration(expiresAt) {
    if (!expiresAt) return 0;
    const now = new Date();
    const expires = new Date(expiresAt);
    const diffMs = expires - now;
    const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return Math.max(0, diffDays);
  }

  /**
   * Get patients needing reverification
   * @returns {Promise<Array>} Patients needing reverification
   */
  async getPatientsNeedingReverification() {
    const now = new Date();

    const patientsNeedingVerification = await db.select({
      patientId: patient_coverage.patient_id,
      lastVerified: patient_coverage.last_verified_date,
      cacheExpiresAt: patient_coverage.cache_expires_at
    })
      .from(patient_coverage)
      .where(
        and(
          eq(patient_coverage.is_active, true),
          // Cache expired or will expire in next 7 days
          eq(patient_coverage.needs_reverification, false)
        )
      );

    return patientsNeedingVerification.filter(p => {
      if (!p.cacheExpiresAt) return true;
      const daysUntilExpiration = this.getDaysUntilExpiration(p.cacheExpiresAt);
      return daysUntilExpiration <= 7;
    });
  }

  /**
   * Mark patient for reverification
   * @param {number} patientId - Patient ID
   * @param {string} reason - Reason for reverification
   */
  async markForReverification(patientId, reason) {
    await db.update(patient_coverage)
      .set({
        needs_reverification: true,
        reverification_reason: reason,
        updated_at: new Date()
      })
      .where(eq(patient_coverage.patient_id, patientId));
  }

  /**
   * Get eligibility request by ID
   * @param {string} requestId - Request ID
   * @returns {Promise<object>} Request details
   */
  async getRequest(requestId) {
    const [request] = await db.select()
      .from(eligibility_requests)
      .where(eq(eligibility_requests.request_id, requestId))
      .limit(1);

    return request || null;
  }

  /**
   * Get benefit details for response
   * @param {number} responseId - Response ID
   * @returns {Promise<Array>} Benefit details
   */
  async getBenefitDetails(responseId) {
    const benefits = await db.select()
      .from(benefit_details)
      .where(eq(benefit_details.response_id, responseId));

    return benefits;
  }

  /**
   * List eligibility requests with filtering and pagination
   * @param {object} params - Filter and pagination parameters
   * @returns {Promise<object>} Requests and total count
   */
  async listRequests(params = {}) {
    const {
      status,
      startDate,
      endDate,
      providerNpi,
      limit = 20,
      offset = 0
    } = params;

    // Build filter conditions
    const conditions = [];

    if (status) {
      conditions.push(eq(eligibility_requests.status, status));
    }

    if (startDate) {
      conditions.push(gte(eligibility_requests.request_date, startDate));
    }

    if (endDate) {
      // Add a day to include the end date fully
      const endOfDay = new Date(endDate);
      endOfDay.setHours(23, 59, 59, 999);
      conditions.push(lte(eligibility_requests.request_date, endOfDay));
    }

    if (providerNpi) {
      conditions.push(eq(eligibility_requests.provider_npi, providerNpi));
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db.select({ count: count() })
      .from(eligibility_requests)
      .where(whereClause);

    const total = countResult?.count || 0;

    // Get requests with pagination
    let query = db.select()
      .from(eligibility_requests)
      .orderBy(desc(eligibility_requests.request_date))
      .limit(limit)
      .offset(offset);

    if (whereClause) {
      query = query.where(whereClause);
    }

    const requests = await query;

    return {
      requests,
      total
    };
  }

  /**
   * Update eligibility request
   * @param {string} requestId - Request ID (unique tracking ID)
   * @param {object} updates - Fields to update
   * @returns {Promise<object|null>} Updated request or null if not found
   */
  async updateRequest(requestId, updates) {
    const { status, metadata, errorMessage, updatedBy } = updates;

    // First find the request
    const [existingRequest] = await db.select()
      .from(eligibility_requests)
      .where(eq(eligibility_requests.request_id, requestId))
      .limit(1);

    if (!existingRequest) {
      return null;
    }

    // Build update object
    const updateData = {
      updated_at: new Date()
    };

    if (status) {
      updateData.status = status;
    }

    if (errorMessage) {
      updateData.error_message = errorMessage;
    }

    if (metadata) {
      // Merge with existing metadata
      updateData.metadata = {
        ...existingRequest.metadata,
        ...metadata,
        lastUpdatedBy: updatedBy,
        lastUpdatedAt: new Date().toISOString()
      };
    }

    // Perform update
    const [updatedRequest] = await db.update(eligibility_requests)
      .set(updateData)
      .where(eq(eligibility_requests.id, existingRequest.id))
      .returning();

    return updatedRequest;
  }

  /**
   * Get verification status by request ID
   * @param {string} requestId - Request ID (unique tracking ID)
   * @returns {Promise<object|null>} Verification status or null if not found
   */
  async getVerificationStatus(requestId) {
    // Get the request
    const [request] = await db.select()
      .from(eligibility_requests)
      .where(eq(eligibility_requests.request_id, requestId))
      .limit(1);

    if (!request) {
      return null;
    }

    // Try to get the response if status is RECEIVED
    let response = null;
    if (request.status === 'RECEIVED') {
      [response] = await db.select()
        .from(eligibility_responses)
        .where(eq(eligibility_responses.request_id, request.id))
        .limit(1);
    }

    // Build status object
    const statusResult = {
      requestId: request.request_id,
      status: request.status,
      patientId: request.patient_id,
      payerId: request.payer_id,
      serviceType: request.service_type,
      requestDate: request.request_date,
      sentAt: request.sent_at,
      createdAt: request.created_at,
      updatedAt: request.updated_at
    };

    // Add error info if applicable
    if (request.status === 'ERROR' || request.status === 'TIMEOUT') {
      statusResult.errorMessage = request.error_message;
      statusResult.retryCount = request.retry_count;
    }

    // Add tracking info
    if (request.clearinghouse_trace_id) {
      statusResult.clearinghouseTraceId = request.clearinghouse_trace_id;
      statusResult.clearinghouseName = request.clearinghouse_name;
    }

    // Add response info if available
    if (response) {
      statusResult.response = {
        responseId: response.response_id,
        receivedAt: response.received_at,
        eligibilityStatus: response.eligibility_status,
        isEligible: response.is_eligible,
        coverageEffectiveDate: response.coverage_effective_date,
        coverageTerminationDate: response.coverage_termination_date,
        planName: response.plan_name,
        validUntil: response.valid_until
      };
    }

    return statusResult;
  }

  /**
   * Query coverage information with flexible filters
   * @param {object} filters - Filter parameters
   * @returns {Promise<object>} Coverage records and total count
   */
  async queryCoverage(filters = {}) {
    const {
      patientId,
      memberId,
      payerId,
      isActive,
      serviceDate,
      authorizationRequired,
      hospiceCovered,
      needsReverification,
      includeExpired = false,
      limit = 20,
      offset = 0
    } = filters;

    // Build filter conditions
    const conditions = [];

    if (patientId !== undefined) {
      conditions.push(eq(patient_coverage.patient_id, patientId));
    }

    if (memberId) {
      conditions.push(eq(patient_coverage.member_id, memberId));
    }

    if (payerId !== undefined) {
      conditions.push(eq(patient_coverage.payer_id, payerId));
    }

    if (isActive !== undefined) {
      conditions.push(eq(patient_coverage.is_active, isActive));
    }

    if (authorizationRequired !== undefined) {
      conditions.push(eq(patient_coverage.authorization_required, authorizationRequired));
    }

    if (hospiceCovered !== undefined) {
      conditions.push(eq(patient_coverage.hospice_covered, hospiceCovered));
    }

    if (needsReverification !== undefined) {
      conditions.push(eq(patient_coverage.needs_reverification, needsReverification));
    }

    // Filter by service date - coverage must be effective on that date
    if (serviceDate) {
      conditions.push(lte(patient_coverage.effective_date, serviceDate));
      // Termination date is null (ongoing) or after service date
      conditions.push(
        sql`(${patient_coverage.termination_date} IS NULL OR ${patient_coverage.termination_date} >= ${serviceDate})`
      );
    }

    // Filter out expired cache unless includeExpired is true
    if (!includeExpired) {
      const now = new Date();
      conditions.push(
        sql`(${patient_coverage.cache_expires_at} IS NULL OR ${patient_coverage.cache_expires_at} >= ${now})`
      );
    }

    // Build the where clause
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const [countResult] = await db.select({ count: count() })
      .from(patient_coverage)
      .where(whereClause);

    const total = parseInt(countResult?.count || 0);

    // Get coverage records with pagination
    let query = db.select()
      .from(patient_coverage)
      .orderBy(desc(patient_coverage.last_verified_date))
      .limit(limit)
      .offset(offset);

    if (whereClause) {
      query = query.where(whereClause);
    }

    const records = await query;

    // Transform records to include cache status
    const coverage = records.map(record => ({
      id: record.id,
      patientId: record.patient_id,
      payerId: record.payer_id,
      isActive: record.is_active,
      eligibilityVerified: record.eligibility_verified,
      lastVerifiedDate: record.last_verified_date,
      effectiveDate: record.effective_date,
      terminationDate: record.termination_date,
      planName: record.plan_name,
      planNumber: record.plan_number,
      groupNumber: record.group_number,
      memberId: record.member_id,
      copayAmount: record.copay_amount,
      deductibleAmount: record.deductible_amount,
      deductibleRemaining: record.deductible_remaining,
      outOfPocketMax: record.out_of_pocket_max,
      outOfPocketRemaining: record.out_of_pocket_remaining,
      authorizationRequired: record.authorization_required,
      authorizationNumber: record.authorization_number,
      authorizationExpiration: record.authorization_expiration,
      hospiceCovered: record.hospice_covered,
      limitations: record.limitations,
      cacheExpiresAt: record.cache_expires_at,
      needsReverification: record.needs_reverification,
      reverificationReason: record.reverification_reason,
      cacheStatus: {
        expired: !this.isCacheValid(record),
        daysUntilExpiration: this.getDaysUntilExpiration(record.cache_expires_at)
      }
    }));

    return {
      coverage,
      total
    };
  }

  /**
   * Get comprehensive coverage summary for a patient
   * @param {number} patientId - Patient ID
   * @returns {Promise<object|null>} Coverage summary with benefits and history
   */
  async getCoverageSummary(patientId) {
    // Get current coverage
    const coverage = await this.getCurrentCoverage(patientId);

    if (!coverage) {
      return null;
    }

    // Get benefit details from latest response
    let benefits = [];
    if (coverage.latest_response_id) {
      benefits = await this.getBenefitDetails(coverage.latest_response_id);
    }

    // Get recent verification history (last 5)
    const recentVerifications = await this.getEligibilityHistory(patientId, 5);

    // Generate recommendations based on coverage status
    const recommendations = [];

    if (!coverage.eligibility_verified) {
      recommendations.push({
        type: 'ACTION_REQUIRED',
        priority: 'HIGH',
        message: 'Eligibility has not been verified. Please verify coverage before providing services.'
      });
    }

    if (coverage.cacheExpired) {
      recommendations.push({
        type: 'REVERIFICATION_NEEDED',
        priority: 'MEDIUM',
        message: 'Coverage cache has expired. Consider reverifying eligibility.'
      });
    } else if (coverage.daysUntilExpiration && coverage.daysUntilExpiration <= 7) {
      recommendations.push({
        type: 'EXPIRING_SOON',
        priority: 'LOW',
        message: `Coverage verification expires in ${coverage.daysUntilExpiration} days. Plan ahead for reverification.`
      });
    }

    if (coverage.needs_reverification) {
      recommendations.push({
        type: 'REVERIFICATION_FLAGGED',
        priority: 'HIGH',
        message: coverage.reverification_reason || 'Patient flagged for eligibility reverification.'
      });
    }

    if (coverage.authorization_required) {
      const hasAuth = coverage.authorization_number && coverage.authorization_expiration;
      if (!hasAuth) {
        recommendations.push({
          type: 'AUTHORIZATION_NEEDED',
          priority: 'HIGH',
          message: 'Coverage requires prior authorization. Obtain authorization before providing services.'
        });
      } else {
        const authExpires = new Date(coverage.authorization_expiration);
        const daysUntilAuthExpires = Math.ceil((authExpires - new Date()) / (1000 * 60 * 60 * 24));
        if (daysUntilAuthExpires <= 7) {
          recommendations.push({
            type: 'AUTHORIZATION_EXPIRING',
            priority: 'MEDIUM',
            message: `Authorization expires in ${daysUntilAuthExpires} days. Request renewal if needed.`
          });
        }
      }
    }

    if (!coverage.hospice_covered) {
      recommendations.push({
        type: 'NO_HOSPICE_COVERAGE',
        priority: 'HIGH',
        message: 'Hospice services are not covered under this plan. Verify coverage or explore alternative options.'
      });
    }

    return {
      coverage: {
        ...coverage,
        // Add formatted financial amounts (convert from cents to dollars)
        copayAmountFormatted: coverage.copay_amount ? (coverage.copay_amount / 100).toFixed(2) : null,
        deductibleAmountFormatted: coverage.deductible_amount ? (coverage.deductible_amount / 100).toFixed(2) : null,
        deductibleRemainingFormatted: coverage.deductible_remaining ? (coverage.deductible_remaining / 100).toFixed(2) : null,
        outOfPocketMaxFormatted: coverage.out_of_pocket_max ? (coverage.out_of_pocket_max / 100).toFixed(2) : null,
        outOfPocketRemainingFormatted: coverage.out_of_pocket_remaining ? (coverage.out_of_pocket_remaining / 100).toFixed(2) : null
      },
      benefits: benefits.map(b => ({
        ...b,
        monetaryAmountFormatted: b.monetary_amount ? (b.monetary_amount / 100).toFixed(2) : null
      })),
      recentVerifications: recentVerifications.map(v => ({
        responseId: v.response_id,
        responseDate: v.response_date,
        eligibilityStatus: v.eligibility_status,
        isEligible: v.is_eligible,
        planName: v.plan_name
      })),
      recommendations
    };
  }

  /**
   * Retry a failed eligibility verification
   * @param {string} requestId - Original request ID
   * @param {string} userId - User initiating retry
   * @returns {Promise<object|null>} Retry result
   */
  async retryVerification(requestId, userId) {
    // Find the original request
    const [originalRequest] = await db.select()
      .from(eligibility_requests)
      .where(eq(eligibility_requests.request_id, requestId))
      .limit(1);

    if (!originalRequest) {
      return null;
    }

    // Only allow retry for ERROR or TIMEOUT status
    if (!['ERROR', 'TIMEOUT'].includes(originalRequest.status)) {
      return {
        error: `Cannot retry request with status '${originalRequest.status}'. Only ERROR or TIMEOUT requests can be retried.`
      };
    }

    // Check retry count limit (max 3 retries)
    const maxRetries = 3;
    if (originalRequest.retry_count >= maxRetries) {
      return {
        error: `Maximum retry limit (${maxRetries}) reached for this request.`
      };
    }

    try {
      // Update original request retry count
      await db.update(eligibility_requests)
        .set({
          retry_count: (originalRequest.retry_count || 0) + 1,
          updated_at: new Date()
        })
        .where(eq(eligibility_requests.id, originalRequest.id));

      // Create new verification request based on original
      const result = await this.verifyEligibility({
        patientId: originalRequest.patient_id,
        payerId: originalRequest.payer_id,
        serviceType: originalRequest.service_type,
        forceRefresh: true,
        submittedBy: userId
      });

      return {
        originalRequestId: requestId,
        newRequestId: result.requestId,
        status: result.status,
        retryCount: (originalRequest.retry_count || 0) + 1,
        message: 'Verification retry initiated successfully'
      };
    } catch (error) {
      logger.error('Error retrying verification:', error);
      return {
        error: `Retry failed: ${error.message}`
      };
    }
  }

  /**
   * Cancel a pending eligibility request
   * @param {string} requestId - Request ID to cancel
   * @param {string} reason - Reason for cancellation
   * @param {string} userId - User initiating cancellation
   * @returns {Promise<object|null>} Cancellation result
   */
  async cancelRequest(requestId, reason, userId) {
    // Find the request
    const [request] = await db.select()
      .from(eligibility_requests)
      .where(eq(eligibility_requests.request_id, requestId))
      .limit(1);

    if (!request) {
      return null;
    }

    // Only allow cancellation for PENDING or SENT status
    if (!['PENDING', 'SENT'].includes(request.status)) {
      return {
        error: `Cannot cancel request with status '${request.status}'. Only PENDING or SENT requests can be cancelled.`
      };
    }

    // Update request status to CANCELLED
    await db.update(eligibility_requests)
      .set({
        status: 'CANCELLED',
        error_message: reason || 'Cancelled by user',
        metadata: {
          ...request.metadata,
          cancelledBy: userId,
          cancelledAt: new Date().toISOString(),
          cancellationReason: reason
        },
        updated_at: new Date()
      })
      .where(eq(eligibility_requests.id, request.id));

    return {
      success: true,
      requestId,
      previousStatus: request.status,
      newStatus: 'CANCELLED'
    };
  }
}

// Export singleton instance
export default new EligibilityVerifier();
