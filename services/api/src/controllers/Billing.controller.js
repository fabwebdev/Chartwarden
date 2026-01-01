import { db } from '../config/db.drizzle.js';
import {
  payers,
  notice_of_election,
  claims,
  claim_service_lines,
  payments,
  payment_applications,
  billing_periods,
  ar_aging,
  contracts,
  patients,
  billing_codes,
  claim_submission_history,
  claim_status_history,
  claim_diagnosis_codes,
  claim_procedure_codes,
  invoices,
  invoice_line_items,
  invoice_payments,
  billing_statements,
  statement_line_items
} from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, asc, sql, or, isNull, inArray, like, ilike, count } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
import AuditService from '../services/AuditService.js';

/**
 * Claim Status Workflow Configuration
 * Defines valid status transitions to prevent invalid state changes
 */
const CLAIM_STATUS_WORKFLOW = {
  DRAFT: ['READY_TO_SUBMIT', 'VOID'],
  READY_TO_SUBMIT: ['DRAFT', 'SUBMITTED', 'VOID'],
  SUBMITTED: ['ACCEPTED', 'REJECTED', 'VOID'],
  ACCEPTED: ['PAID', 'DENIED', 'APPEALED', 'VOID'],
  REJECTED: ['DRAFT', 'APPEALED', 'VOID'],
  PAID: ['VOID'], // Terminal state - only void allowed
  DENIED: ['APPEALED', 'VOID'],
  APPEALED: ['ACCEPTED', 'DENIED', 'PAID', 'VOID'],
  VOID: [] // Terminal state - no transitions allowed
};

/**
 * Terminal claim statuses that cannot be modified (except for specific fields)
 */
const TERMINAL_STATUSES = ['PAID', 'VOID'];

/**
 * Billing Controller
 * Module G - HIGH Priority
 *
 * Purpose: Claims, payments, NOE, AR aging
 * Compliance: Revenue cycle critical, CMS billing requirements
 *
 * Endpoints:
 * - Claims management (create, submit, void, query)
 * - Notice of Election (NOE) submission
 * - Payment processing and application
 * - AR aging reports
 * - Billing period tracking
 * - Billing codes reference (ICD-10, CPT, HCPCS, Revenue)
 * - Claim submission history tracking
 * - Claim status history tracking
 */
class BillingController {
  /**
   * Validates if a status transition is allowed
   * @param {string} currentStatus - Current claim status
   * @param {string} newStatus - Target status
   * @returns {Object} { valid: boolean, message?: string }
   */
  validateStatusTransition(currentStatus, newStatus) {
    if (!currentStatus) {
      return { valid: true }; // New claim, any initial status is fine
    }

    if (currentStatus === newStatus) {
      return { valid: true }; // No change
    }

    const allowedTransitions = CLAIM_STATUS_WORKFLOW[currentStatus];
    if (!allowedTransitions) {
      return {
        valid: false,
        message: `Unknown current status: ${currentStatus}`
      };
    }

    if (!allowedTransitions.includes(newStatus)) {
      return {
        valid: false,
        message: `Invalid status transition from ${currentStatus} to ${newStatus}. Allowed transitions: ${allowedTransitions.join(', ') || 'none'}`
      };
    }

    return { valid: true };
  }

  /**
   * Creates audit log entry for claim operations
   */
  async createClaimAuditLog(action, claimId, userId, oldData, newData, request) {
    try {
      await AuditService.createAuditLog({
        user_id: userId,
        action: action,
        resource_type: 'claims',
        resource_id: String(claimId),
        ip_address: request?.ip || request?.headers?.['x-forwarded-for'],
        user_agent: request?.headers?.['user-agent'],
        status: 'success',
        metadata: JSON.stringify({
          changes: this.computeChanges(oldData, newData)
        })
      });
    } catch (error) {
      logger.error('Failed to create audit log for claim:', error);
    }
  }

  /**
   * Computes changes between old and new data for audit logging
   */
  computeChanges(oldData, newData) {
    if (!oldData) return { action: 'CREATE' };
    if (!newData) return { action: 'DELETE' };

    const changes = {};
    const financialFields = ['total_charges', 'total_paid', 'total_adjustments', 'balance'];

    for (const key of Object.keys(newData)) {
      if (oldData[key] !== newData[key]) {
        changes[key] = {
          from: oldData[key],
          to: newData[key],
          isFinancial: financialFields.includes(key)
        };
      }
    }

    return changes;
  }
  // ============================================
  // CLAIMS MANAGEMENT
  // ============================================

  /**
   * Get all claims with optional filters
   * GET /claims
   *
   * Query Parameters:
   * - limit: Number of results per page (default: 50)
   * - offset: Starting offset for pagination (default: 0)
   * - status: Filter by claim status
   * - patient_id: Filter by patient ID
   * - payer_id: Filter by payer ID
   * - start_date: Filter by service start date (>=)
   * - end_date: Filter by service end date (<=)
   * - min_amount: Filter by minimum total_charges (in cents)
   * - max_amount: Filter by maximum total_charges (in cents)
   * - created_by: Filter by user who created the claim
   * - sort_by: Field to sort by (default: createdAt)
   * - sort_order: Sort direction (asc/desc, default: desc)
   */
  async getAllClaims(request, reply) {
    try {
      const {
        limit = 50,
        offset = 0,
        status,
        patient_id,
        payer_id,
        start_date,
        end_date,
        min_amount,
        max_amount,
        created_by,
        sort_by = 'createdAt',
        sort_order = 'desc'
      } = request.query;

      // Build base filter conditions
      const filters = [isNull(claims.deleted_at)];

      // Apply filters
      if (status) {
        // Support comma-separated statuses
        const statuses = status.split(',').map(s => s.trim());
        if (statuses.length > 1) {
          filters.push(inArray(claims.claim_status, statuses));
        } else {
          filters.push(eq(claims.claim_status, status));
        }
      }
      if (patient_id) {
        filters.push(eq(claims.patient_id, parseInt(patient_id)));
      }
      if (payer_id) {
        filters.push(eq(claims.payer_id, parseInt(payer_id)));
      }
      if (start_date) {
        filters.push(gte(claims.service_start_date, start_date));
      }
      if (end_date) {
        filters.push(lte(claims.service_end_date, end_date));
      }
      // Amount range filters
      if (min_amount) {
        filters.push(gte(claims.total_charges, parseInt(min_amount)));
      }
      if (max_amount) {
        filters.push(lte(claims.total_charges, parseInt(max_amount)));
      }
      // User filter
      if (created_by) {
        filters.push(eq(claims.created_by_id, created_by));
      }

      // Build order by clause
      const sortField = claims[sort_by] || claims.createdAt;
      const orderByClause = sort_order === 'asc' ? asc(sortField) : desc(sortField);

      // Execute data query
      const results = await db
        .select({
          claim: claims,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          },
          payer: {
            id: payers.id,
            payer_name: payers.payer_name,
            payer_type: payers.payer_type
          }
        })
        .from(claims)
        .leftJoin(patients, eq(claims.patient_id, patients.id))
        .leftJoin(payers, eq(claims.payer_id, payers.id))
        .where(and(...filters))
        .orderBy(orderByClause)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Get total count for pagination
      const countResult = await db
        .select({ total: count() })
        .from(claims)
        .where(and(...filters));

      const total = Number(countResult[0]?.total || 0);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        total: total,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: total,
          pages: Math.ceil(total / parseInt(limit)),
          currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1
        }
      };
    } catch (error) {
      logger.error('Error fetching claims:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching claims',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get claim by ID with service lines
   * GET /claims/:id
   */
  async getClaimById(request, reply) {
    try {
      const { id } = request.params;

      // Get claim with related data
      const claimResult = await db
        .select({
          claim: claims,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          },
          payer: payers
        })
        .from(claims)
        .leftJoin(patients, eq(claims.patient_id, patients.id))
        .leftJoin(payers, eq(claims.payer_id, payers.id))
        .where(and(
          eq(claims.id, parseInt(id)),
          isNull(claims.deleted_at)
        ))
        .limit(1);

      if (!claimResult[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Claim not found'
        };
      }

      // Get service lines
      const serviceLines = await db
        .select()
        .from(claim_service_lines)
        .where(eq(claim_service_lines.claim_id, parseInt(id)))
        .orderBy(claim_service_lines.line_number);

      // Get payments applied to this claim
      const paymentsApplied = await db
        .select({
          application: payment_applications,
          payment: payments
        })
        .from(payment_applications)
        .leftJoin(payments, eq(payment_applications.payment_id, payments.id))
        .where(eq(payment_applications.claim_id, parseInt(id)));

      reply.code(200);
      return {
        status: 200,
        data: {
          ...claimResult[0],
          service_lines: serviceLines,
          payments_applied: paymentsApplied
        }
      };
    } catch (error) {
      logger.error('Error fetching claim:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching claim',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create new claim
   * POST /claims
   */
  /**
   * Create new claim with UB-04 fields
   * POST /claims
   * Enhanced with complete UB-04 field support
   */
  async createClaim(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.patient_id || !data.service_start_date || !data.service_end_date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: patient_id, service_start_date, service_end_date'
        };
      }

      // Generate claim number
      const claimNumber = await this.generateClaimNumber();

      // Create claim with UB-04 fields
      const result = await db
        .insert(claims)
        .values({
          // Existing fields
          patient_id: parseInt(data.patient_id),
          payer_id: data.payer_id ? parseInt(data.payer_id) : null,
          claim_number: claimNumber,
          claim_type: data.claim_type || 'INSTITUTIONAL',
          claim_status: 'DRAFT',
          service_start_date: data.service_start_date,
          service_end_date: data.service_end_date,
          bill_type: data.bill_type,
          total_charges: data.total_charges || 0,
          metadata: data.metadata,
          notes: data.notes,

          // UB-04 Fields
          occurrence_codes: data.occurrence_codes || null,
          value_codes: data.value_codes || null,
          condition_codes: data.condition_codes || null,
          attending_physician_npi: data.attending_physician_npi || null,
          attending_physician_name: data.attending_physician_name || null,
          attending_physician_qualifier: data.attending_physician_qualifier || null,
          operating_physician_npi: data.operating_physician_npi || null,
          operating_physician_name: data.operating_physician_name || null,
          other_physician_npi: data.other_physician_npi || null,
          other_physician_name: data.other_physician_name || null,
          admission_date: data.admission_date || null,
          admission_hour: data.admission_hour || null,
          admission_type: data.admission_type || null,
          admission_source: data.admission_source || null,
          discharge_status: data.discharge_status || null,
          discharge_hour: data.discharge_hour || null,
          statement_from_date: data.statement_from_date || data.service_start_date,
          statement_to_date: data.statement_to_date || data.service_end_date,
          principal_diagnosis_code: data.principal_diagnosis_code || null,
          principal_diagnosis_qualifier: data.principal_diagnosis_qualifier || '0',
          other_diagnosis_codes: data.other_diagnosis_codes || null,
          patient_reason_diagnosis: data.patient_reason_diagnosis || null,
          external_cause_injury_codes: data.external_cause_injury_codes || null,
          remarks: data.remarks || null,
          document_control_number: data.document_control_number || null,
          employer_name: data.employer_name || null,
          treatment_authorization_codes: data.treatment_authorization_codes || null,

          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create service lines if provided
      if (data.service_lines && data.service_lines.length > 0) {
        const serviceLinesToInsert = data.service_lines.map((line, index) => ({
          claim_id: result[0].id,
          line_number: index + 1,
          service_date: line.service_date,
          revenue_code: line.revenue_code,
          level_of_care: line.level_of_care,
          units: line.units,
          charges: line.charges,
          hcpcs_code: line.hcpcs_code
        }));

        await db.insert(claim_service_lines).values(serviceLinesToInsert);
      }

      // Create audit log for claim creation
      await this.createClaimAuditLog('CREATE', result[0].id, request.user?.id, null, result[0], request);

      reply.code(201);
      return {
        status: 201,
        message: 'Claim created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating claim:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating claim',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update claim
   * PUT /claims/:id
   *
   * Updates an existing claim with validation for:
   * - Status workflow transitions
   * - Terminal state modifications
   * - Amount changes with audit logging
   * - Concurrent update handling via updatedAt check
   */
  async updateClaim(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Get existing claim
      const existing = await db
        .select()
        .from(claims)
        .where(and(
          eq(claims.id, parseInt(id)),
          isNull(claims.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Claim not found'
        };
      }

      const currentClaim = existing[0];

      // Check for terminal status - prevent modifications except specific allowed fields
      if (TERMINAL_STATUSES.includes(currentClaim.claim_status)) {
        // Only allow notes and metadata updates for terminal claims
        const allowedFieldsForTerminal = ['notes', 'metadata'];
        const attemptedFields = Object.keys(data).filter(k => !allowedFieldsForTerminal.includes(k));

        if (attemptedFields.length > 0) {
          reply.code(400);
          return {
            status: 400,
            message: `Claim is in terminal status (${currentClaim.claim_status}). Only notes and metadata can be updated.`,
            attempted_fields: attemptedFields
          };
        }
      }

      // Validate status transition if status is being changed
      if (data.claim_status && data.claim_status !== currentClaim.claim_status) {
        const transitionResult = this.validateStatusTransition(currentClaim.claim_status, data.claim_status);
        if (!transitionResult.valid) {
          reply.code(400);
          return {
            status: 400,
            message: transitionResult.message,
            current_status: currentClaim.claim_status,
            requested_status: data.claim_status,
            allowed_transitions: CLAIM_STATUS_WORKFLOW[currentClaim.claim_status] || []
          };
        }
      }

      // Concurrent update check - if client provides expected updatedAt, verify it matches
      if (data.expected_updated_at) {
        const expectedDate = new Date(data.expected_updated_at).getTime();
        const actualDate = new Date(currentClaim.updatedAt).getTime();
        if (expectedDate !== actualDate) {
          reply.code(409);
          return {
            status: 409,
            message: 'Claim was modified by another user. Please refresh and try again.',
            current_updated_at: currentClaim.updatedAt
          };
        }
      }

      // Validate amount changes (prevent negative amounts for certain fields)
      if (data.total_charges !== undefined && parseInt(data.total_charges) < 0) {
        reply.code(400);
        return {
          status: 400,
          message: 'Total charges cannot be negative'
        };
      }

      // Build update object
      const updateData = {
        ...data,
        updated_by_id: request.user?.id,
        updatedAt: new Date()
      };

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.claim_number;
      delete updateData.created_by_id;
      delete updateData.createdAt;
      delete updateData.expected_updated_at;

      // Update claim
      const result = await db
        .update(claims)
        .set(updateData)
        .where(eq(claims.id, parseInt(id)))
        .returning();

      // Create audit log with change tracking
      await this.createClaimAuditLog('UPDATE', parseInt(id), request.user?.id, currentClaim, result[0], request);

      // If status changed, also record in status history
      if (data.claim_status && data.claim_status !== currentClaim.claim_status) {
        await this.recordStatusChange(
          parseInt(id),
          currentClaim.claim_status,
          data.claim_status,
          data.status_change_reason || 'USER_ACTION',
          'MANUAL',
          null,
          request.user?.id,
          data.status_change_notes
        );
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Claim updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating claim:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating claim',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update claim amount
   * PUT /claims/:id/amount
   *
   * Specialized endpoint for updating claim financial amounts
   * with enhanced validation and audit logging
   */
  async updateClaimAmount(request, reply) {
    try {
      const { id } = request.params;
      const { total_charges, total_adjustments, notes } = request.body;

      // Get existing claim
      const existing = await db
        .select()
        .from(claims)
        .where(and(
          eq(claims.id, parseInt(id)),
          isNull(claims.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Claim not found'
        };
      }

      const currentClaim = existing[0];

      // Prevent amount changes on terminal claims
      if (TERMINAL_STATUSES.includes(currentClaim.claim_status)) {
        reply.code(400);
        return {
          status: 400,
          message: `Cannot modify amounts on claim with terminal status: ${currentClaim.claim_status}`
        };
      }

      // Validate amounts
      if (total_charges !== undefined && parseInt(total_charges) < 0) {
        reply.code(400);
        return {
          status: 400,
          message: 'Total charges cannot be negative'
        };
      }

      // Calculate new balance
      const newCharges = total_charges !== undefined ? parseInt(total_charges) : currentClaim.total_charges;
      const newAdjustments = total_adjustments !== undefined ? parseInt(total_adjustments) : (currentClaim.total_adjustments || 0);
      const currentPaid = currentClaim.total_paid || 0;
      const newBalance = newCharges - currentPaid - newAdjustments;

      // Update claim
      const result = await db
        .update(claims)
        .set({
          total_charges: newCharges,
          total_adjustments: newAdjustments,
          balance: newBalance,
          notes: notes || currentClaim.notes,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(claims.id, parseInt(id)))
        .returning();

      // Create audit log specifically for financial changes
      await this.createClaimAuditLog('UPDATE_AMOUNT', parseInt(id), request.user?.id,
        { total_charges: currentClaim.total_charges, total_adjustments: currentClaim.total_adjustments, balance: currentClaim.balance },
        { total_charges: newCharges, total_adjustments: newAdjustments, balance: newBalance },
        request
      );

      reply.code(200);
      return {
        status: 200,
        message: 'Claim amount updated successfully',
        data: result[0],
        financial_summary: {
          previous: {
            total_charges: currentClaim.total_charges,
            total_adjustments: currentClaim.total_adjustments,
            balance: currentClaim.balance
          },
          current: {
            total_charges: newCharges,
            total_adjustments: newAdjustments,
            balance: newBalance
          }
        }
      };
    } catch (error) {
      logger.error('Error updating claim amount:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating claim amount',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete claim (soft delete)
   * DELETE /claims/:id
   *
   * Performs soft delete by setting deleted_at timestamp.
   * Prevents deletion of claims in certain statuses.
   */
  async deleteClaim(request, reply) {
    try {
      const { id } = request.params;
      const { reason } = request.body || {};

      // Get existing claim
      const existing = await db
        .select()
        .from(claims)
        .where(and(
          eq(claims.id, parseInt(id)),
          isNull(claims.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Claim not found'
        };
      }

      const currentClaim = existing[0];

      // Prevent deletion of submitted/paid claims
      const nonDeletableStatuses = ['SUBMITTED', 'ACCEPTED', 'PAID'];
      if (nonDeletableStatuses.includes(currentClaim.claim_status)) {
        reply.code(400);
        return {
          status: 400,
          message: `Cannot delete claim with status: ${currentClaim.claim_status}. Use void action instead.`,
          suggestion: 'POST /claims/:id/void'
        };
      }

      // Soft delete
      const result = await db
        .update(claims)
        .set({
          deleted_at: new Date(),
          notes: reason ? `${currentClaim.notes || ''}\n[DELETED: ${reason}]` : currentClaim.notes,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(claims.id, parseInt(id)))
        .returning();

      // Create audit log for deletion
      await this.createClaimAuditLog('DELETE', parseInt(id), request.user?.id, currentClaim, null, request);

      reply.code(200);
      return {
        status: 200,
        message: 'Claim deleted successfully',
        data: {
          id: result[0].id,
          claim_number: result[0].claim_number,
          deleted_at: result[0].deleted_at
        }
      };
    } catch (error) {
      logger.error('Error deleting claim:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting claim',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Submit claim with UB-04 validation
   * POST /claims/:id/submit
   * Enhanced with UB-04 completeness validation
   */
  async submitClaim(request, reply) {
    try {
      const { id } = request.params;

      // Get claim
      const existing = await db
        .select()
        .from(claims)
        .where(eq(claims.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Claim not found'
        };
      }

      // Validate claim can be submitted
      if (existing[0].claim_status === 'SUBMITTED' || existing[0].claim_status === 'PAID') {
        reply.code(400);
        return {
          status: 400,
          message: 'Claim has already been submitted or paid'
        };
      }

      // Get service lines to validate
      const serviceLines = await db
        .select()
        .from(claim_service_lines)
        .where(eq(claim_service_lines.claim_id, parseInt(id)));

      if (serviceLines.length === 0) {
        reply.code(400);
        return {
          status: 400,
          message: 'Claim must have at least one service line before submission'
        };
      }

      // UB-04 Validation
      const validationErrors = [];
      const claim = existing[0];

      // Required fields for hospice claims
      if (!claim.bill_type) validationErrors.push('Bill Type (FL 4) is required');
      if (!claim.statement_from_date) validationErrors.push('Statement From Date (FL 6) is required');
      if (!claim.statement_to_date) validationErrors.push('Statement To Date (FL 6) is required');
      if (!claim.admission_date) validationErrors.push('Admission Date (FL 12) is required');
      if (!claim.principal_diagnosis_code) validationErrors.push('Principal Diagnosis (FL 67) is required');
      if (!claim.attending_physician_npi) validationErrors.push('Attending Physician NPI (FL 76) is required');
      if (!claim.attending_physician_name) validationErrors.push('Attending Physician Name (FL 76) is required');

      // Hospice-specific validations
      if (claim.bill_type && !claim.bill_type.startsWith('81') && !claim.bill_type.startsWith('82')) {
        validationErrors.push('Bill Type must be 81x or 82x for hospice claims');
      }

      if (validationErrors.length > 0) {
        reply.code(400);
        return {
          status: 400,
          message: 'Claim validation failed',
          validation_errors: validationErrors
        };
      }

      // Update claim status
      const result = await db
        .update(claims)
        .set({
          claim_status: 'SUBMITTED',
          submission_date: new Date(),
          submission_method: request.body.submission_method || 'ELECTRONIC',
          clearinghouse_trace_number: request.body.clearinghouse_trace_number,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(claims.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Claim submitted successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error submitting claim:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error submitting claim',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Void claim
   * POST /claims/:id/void
   */
  async voidClaim(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(claims)
        .set({
          claim_status: 'VOID',
          notes: request.body.void_reason || 'Claim voided',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(claims.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Claim not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Claim voided successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error voiding claim:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error voiding claim',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get unbilled periods
   * GET /claims/unbilled
   */
  async getUnbilledPeriods(request, reply) {
    try {
      const results = await db
        .select({
          period: billing_periods,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(billing_periods)
        .leftJoin(patients, eq(billing_periods.patient_id, patients.id))
        .where(eq(billing_periods.billed, false))
        .orderBy(billing_periods.period_start);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching unbilled periods:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching unbilled periods',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get rejected claims
   * GET /claims/rejected
   */
  async getRejectedClaims(request, reply) {
    try {
      const results = await db
        .select({
          claim: claims,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name
          },
          payer: {
            id: payers.id,
            payer_name: payers.payer_name
          }
        })
        .from(claims)
        .leftJoin(patients, eq(claims.patient_id, patients.id))
        .leftJoin(payers, eq(claims.payer_id, payers.id))
        .where(and(
          or(
            eq(claims.claim_status, 'REJECTED'),
            eq(claims.claim_status, 'DENIED')
          ),
          isNull(claims.deleted_at)
        ))
        .orderBy(desc(claims.denial_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching rejected claims:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching rejected claims',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // NOTICE OF ELECTION (NOE)
  // ============================================

  /**
   * Submit Notice of Election for patient
   * POST /patients/:id/noe
   */
  async submitNOE(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate required fields
      if (!data.noe_date || !data.effective_date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: noe_date, effective_date'
        };
      }

      // Calculate NOE timeliness (must be within 5 days of effective date)
      const noeDate = new Date(data.noe_date);
      const effectiveDate = new Date(data.effective_date);
      const daysDiff = Math.floor((noeDate - effectiveDate) / (1000 * 60 * 60 * 24));
      const noeTimeliness = daysDiff <= 5 ? 'TIMELY' : 'LATE';

      const result = await db
        .insert(notice_of_election)
        .values({
          patient_id: parseInt(id),
          noe_date: data.noe_date,
          effective_date: data.effective_date,
          noe_status: 'SUBMITTED',
          noe_timeliness: noeTimeliness,
          benefit_period: data.benefit_period,
          submission_date: new Date(),
          payer_id: data.payer_id ? parseInt(data.payer_id) : null,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Notice of Election submitted successfully',
        data: result[0],
        timeliness_warning: noeTimeliness === 'LATE' ? 'NOE was filed late (more than 5 days after effective date)' : null
      };
    } catch (error) {
      logger.error('Error submitting NOE:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error submitting NOE',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // PAYMENTS
  // ============================================

  /**
   * Get all payments
   * GET /payments
   */
  async getAllPayments(request, reply) {
    try {
      const { limit = 50, offset = 0, status, payer_id } = request.query;

      let query = db
        .select({
          payment: payments,
          payer: {
            id: payers.id,
            payer_name: payers.payer_name,
            payer_type: payers.payer_type
          }
        })
        .from(payments)
        .leftJoin(payers, eq(payments.payer_id, payers.id))
        .where(isNull(payments.deleted_at));

      const filters = [];
      if (status) {
        filters.push(eq(payments.payment_status, status));
      }
      if (payer_id) {
        filters.push(eq(payments.payer_id, parseInt(payer_id)));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query
        .orderBy(desc(payments.payment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching payments:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching payments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create payment
   * POST /payments
   */
  async createPayment(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.payment_date || !data.payment_amount) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: payment_date, payment_amount'
        };
      }

      const result = await db
        .insert(payments)
        .values({
          payer_id: data.payer_id ? parseInt(data.payer_id) : null,
          payment_date: data.payment_date,
          payment_amount: parseInt(data.payment_amount),
          payment_method: data.payment_method,
          payment_status: 'PENDING',
          check_number: data.check_number,
          reference_number: data.reference_number,
          unapplied_amount: parseInt(data.payment_amount), // Initially all unapplied
          notes: data.notes,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Payment created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating payment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating payment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Apply payment to claims
   * POST /payments/:id/apply
   */
  async applyPayment(request, reply) {
    try {
      const { id } = request.params;
      const { applications } = request.body; // Array of { claim_id, applied_amount, adjustment_amount }

      if (!applications || applications.length === 0) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required field: applications (array)'
        };
      }

      // Get payment
      const payment = await db
        .select()
        .from(payments)
        .where(eq(payments.id, parseInt(id)))
        .limit(1);

      if (!payment[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Payment not found'
        };
      }

      // Calculate total applied amount
      const totalApplied = applications.reduce((sum, app) => sum + parseInt(app.applied_amount), 0);

      // Insert payment applications
      const applicationPromises = applications.map(app =>
        db.insert(payment_applications).values({
          payment_id: parseInt(id),
          claim_id: parseInt(app.claim_id),
          applied_amount: parseInt(app.applied_amount),
          adjustment_amount: app.adjustment_amount ? parseInt(app.adjustment_amount) : null,
          write_off_amount: app.write_off_amount ? parseInt(app.write_off_amount) : null,
          adjustment_reason_codes: app.adjustment_reason_codes,
          notes: app.notes,
          created_by_id: request.user?.id
        })
      );

      await Promise.all(applicationPromises);

      // Update payment unapplied amount and status
      const newUnappliedAmount = payment[0].payment_amount - totalApplied;
      await db
        .update(payments)
        .set({
          unapplied_amount: newUnappliedAmount,
          payment_status: newUnappliedAmount === 0 ? 'APPLIED' : 'PENDING',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(payments.id, parseInt(id)));

      // Update claim balances
      for (const app of applications) {
        const claim = await db
          .select()
          .from(claims)
          .where(eq(claims.id, parseInt(app.claim_id)))
          .limit(1);

        if (claim[0]) {
          const newPaidAmount = (claim[0].total_paid || 0) + parseInt(app.applied_amount);
          const newBalance = (claim[0].total_charges || 0) - newPaidAmount;

          await db
            .update(claims)
            .set({
              total_paid: newPaidAmount,
              balance: newBalance,
              claim_status: newBalance <= 0 ? 'PAID' : claim[0].claim_status,
              paid_date: newBalance <= 0 ? new Date() : claim[0].paid_date,
              updated_by_id: request.user?.id,
              updatedAt: new Date()
            })
            .where(eq(claims.id, parseInt(app.claim_id)));
        }
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Payment applied successfully',
        applications_count: applications.length,
        total_applied: totalApplied,
        unapplied_amount: newUnappliedAmount
      };
    } catch (error) {
      logger.error('Error applying payment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error applying payment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // AR AGING & REPORTS
  // ============================================

  /**
   * Get AR aging report
   * GET /billing/ar-aging
   */
  async getARAgingReport(request, reply) {
    try {
      const { payer_id, aging_bucket } = request.query;

      let query = db
        .select({
          ar_aging: ar_aging,
          claim: claims,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          },
          payer: {
            id: payers.id,
            payer_name: payers.payer_name
          }
        })
        .from(ar_aging)
        .innerJoin(claims, eq(ar_aging.claim_id, claims.id))
        .leftJoin(patients, eq(claims.patient_id, patients.id))
        .leftJoin(payers, eq(claims.payer_id, payers.id));

      const filters = [];
      if (payer_id) {
        filters.push(eq(claims.payer_id, parseInt(payer_id)));
      }
      if (aging_bucket) {
        filters.push(eq(ar_aging.aging_bucket, aging_bucket));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(desc(ar_aging.days_outstanding));

      // Calculate summary statistics
      const summary = results.reduce((acc, row) => {
        acc.total_balance += row.ar_aging.balance || 0;
        acc.total_claims += 1;

        const bucket = row.ar_aging.aging_bucket || 'UNKNOWN';
        if (!acc.by_bucket[bucket]) {
          acc.by_bucket[bucket] = { balance: 0, count: 0 };
        }
        acc.by_bucket[bucket].balance += row.ar_aging.balance || 0;
        acc.by_bucket[bucket].count += 1;

        return acc;
      }, {
        total_balance: 0,
        total_claims: 0,
        by_bucket: {}
      });

      reply.code(200);
      return {
        status: 200,
        data: results,
        summary: summary
      };
    } catch (error) {
      logger.error('Error fetching AR aging report:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching AR aging report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get billing periods
   * GET /billing/periods
   */
  async getBillingPeriods(request, reply) {
    try {
      const { patient_id, billed } = request.query;

      let query = db
        .select({
          period: billing_periods,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name
          },
          claim: claims
        })
        .from(billing_periods)
        .leftJoin(patients, eq(billing_periods.patient_id, patients.id))
        .leftJoin(claims, eq(billing_periods.claim_id, claims.id));

      const filters = [];
      if (patient_id) {
        filters.push(eq(billing_periods.patient_id, parseInt(patient_id)));
      }
      if (billed !== undefined) {
        filters.push(eq(billing_periods.billed, billed === 'true'));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(billing_periods.period_start);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching billing periods:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching billing periods',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // BILLING CODES MANAGEMENT
  // ============================================

  /**
   * Get all billing codes with optional filters
   * GET /billing/codes
   */
  async getBillingCodes(request, reply) {
    try {
      const {
        limit = 50,
        offset = 0,
        code_type,
        search,
        hospice_only,
        level_of_care
      } = request.query;

      let query = db
        .select()
        .from(billing_codes)
        .where(eq(billing_codes.is_active, true));

      const filters = [eq(billing_codes.is_active, true)];

      if (code_type) {
        filters.push(eq(billing_codes.code_type, code_type));
      }

      if (search) {
        filters.push(
          or(
            ilike(billing_codes.code, `%${search}%`),
            ilike(billing_codes.short_description, `%${search}%`)
          )
        );
      }

      if (hospice_only === 'true') {
        filters.push(eq(billing_codes.hospice_applicable, true));
      }

      if (level_of_care) {
        filters.push(eq(billing_codes.level_of_care, level_of_care));
      }

      const results = await db
        .select()
        .from(billing_codes)
        .where(and(...filters))
        .orderBy(billing_codes.code)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching billing codes:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching billing codes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get billing code by ID
   * GET /billing/codes/:id
   */
  async getBillingCodeById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(billing_codes)
        .where(eq(billing_codes.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Billing code not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching billing code:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching billing code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new billing code
   * POST /billing/codes
   */
  async createBillingCode(request, reply) {
    try {
      const data = request.body;

      if (!data.code || !data.code_type || !data.short_description) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: code, code_type, short_description'
        };
      }

      const result = await db
        .insert(billing_codes)
        .values({
          code: data.code,
          code_type: data.code_type,
          short_description: data.short_description,
          long_description: data.long_description,
          category: data.category,
          subcategory: data.subcategory,
          effective_date: data.effective_date,
          termination_date: data.termination_date,
          default_rate: data.default_rate,
          rate_type: data.rate_type,
          hospice_applicable: data.hospice_applicable || false,
          level_of_care: data.level_of_care,
          is_active: true,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Billing code created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating billing code:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating billing code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update a billing code
   * PUT /billing/codes/:id
   */
  async updateBillingCode(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(billing_codes)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(billing_codes.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Billing code not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Billing code updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating billing code:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating billing code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // CLAIM SUBMISSION HISTORY
  // ============================================

  /**
   * Get submission history for a claim
   * GET /claims/:id/submissions
   */
  async getClaimSubmissionHistory(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(claim_submission_history)
        .where(eq(claim_submission_history.claim_id, parseInt(id)))
        .orderBy(desc(claim_submission_history.submission_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching claim submission history:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching claim submission history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Record a new submission attempt for a claim
   * POST /claims/:id/submissions
   */
  async recordClaimSubmission(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Get the current submission count for this claim
      const existingSubmissions = await db
        .select({ count: sql`count(*)` })
        .from(claim_submission_history)
        .where(eq(claim_submission_history.claim_id, parseInt(id)));

      const submissionNumber = parseInt(existingSubmissions[0]?.count || 0) + 1;

      // Get claim's current charges
      const claim = await db
        .select()
        .from(claims)
        .where(eq(claims.id, parseInt(id)))
        .limit(1);

      if (!claim[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Claim not found'
        };
      }

      const result = await db
        .insert(claim_submission_history)
        .values({
          claim_id: parseInt(id),
          submission_number: submissionNumber,
          submission_type: data.submission_type || 'ORIGINAL',
          submission_date: new Date(),
          submission_method: data.submission_method || 'ELECTRONIC',
          clearinghouse_id: data.clearinghouse_id,
          edi_interchange_control_number: data.edi_interchange_control_number,
          edi_group_control_number: data.edi_group_control_number,
          edi_transaction_control_number: data.edi_transaction_control_number,
          clearinghouse_trace_number: data.clearinghouse_trace_number,
          clearinghouse_status: 'PENDING',
          submitted_charges: claim[0].total_charges,
          outbound_file_reference: data.outbound_file_reference,
          submitted_by_id: request.user?.id,
          notes: data.notes
        })
        .returning();

      // Also record status history
      await this.recordStatusChange(
        parseInt(id),
        claim[0].claim_status,
        'SUBMITTED',
        'USER_ACTION',
        'MANUAL',
        result[0].id,
        request.user?.id
      );

      // Update claim status
      await db
        .update(claims)
        .set({
          claim_status: 'SUBMITTED',
          submission_date: new Date(),
          submission_method: data.submission_method || 'ELECTRONIC',
          clearinghouse_trace_number: data.clearinghouse_trace_number,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(claims.id, parseInt(id)));

      reply.code(201);
      return {
        status: 201,
        message: 'Claim submission recorded successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error recording claim submission:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error recording claim submission',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update submission response (from clearinghouse/payer)
   * PUT /claims/:claimId/submissions/:submissionId
   */
  async updateSubmissionResponse(request, reply) {
    try {
      const { claimId, submissionId } = request.params;
      const data = request.body;

      const result = await db
        .update(claim_submission_history)
        .set({
          clearinghouse_response_date: data.clearinghouse_response_date,
          clearinghouse_status: data.clearinghouse_status,
          payer_claim_number: data.payer_claim_number,
          payer_response_date: data.payer_response_date,
          payer_status: data.payer_status,
          response_code: data.response_code,
          response_message: data.response_message,
          rejection_reasons: data.rejection_reasons,
          inbound_file_reference: data.inbound_file_reference,
          notes: data.notes,
          updatedAt: new Date()
        })
        .where(
          and(
            eq(claim_submission_history.id, parseInt(submissionId)),
            eq(claim_submission_history.claim_id, parseInt(claimId))
          )
        )
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Submission record not found'
        };
      }

      // If payer responded with final status, update claim status accordingly
      if (data.payer_status === 'ACCEPTED' || data.payer_status === 'REJECTED') {
        const claim = await db
          .select()
          .from(claims)
          .where(eq(claims.id, parseInt(claimId)))
          .limit(1);

        const newClaimStatus = data.payer_status === 'ACCEPTED' ? 'ACCEPTED' : 'REJECTED';

        await this.recordStatusChange(
          parseInt(claimId),
          claim[0]?.claim_status,
          newClaimStatus,
          'PAYER_RESPONSE',
          'PAYER',
          parseInt(submissionId),
          request.user?.id
        );

        await db
          .update(claims)
          .set({
            claim_status: newClaimStatus,
            denial_reason: data.payer_status === 'REJECTED' ? data.response_message : null,
            denial_date: data.payer_status === 'REJECTED' ? new Date() : null,
            updated_by_id: request.user?.id,
            updatedAt: new Date()
          })
          .where(eq(claims.id, parseInt(claimId)));
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Submission response updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating submission response:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating submission response',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // CLAIM STATUS HISTORY
  // ============================================

  /**
   * Get status history for a claim
   * GET /claims/:id/status-history
   */
  async getClaimStatusHistory(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(claim_status_history)
        .where(eq(claim_status_history.claim_id, parseInt(id)))
        .orderBy(desc(claim_status_history.status_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching claim status history:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching claim status history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update claim status with history tracking and workflow validation
   * PUT /claims/:id/status
   *
   * Validates status transitions according to the claim workflow:
   * - DRAFT -> READY_TO_SUBMIT, VOID
   * - READY_TO_SUBMIT -> DRAFT, SUBMITTED, VOID
   * - SUBMITTED -> ACCEPTED, REJECTED, VOID
   * - ACCEPTED -> PAID, DENIED, APPEALED, VOID
   * - REJECTED -> DRAFT, APPEALED, VOID
   * - PAID -> VOID (terminal)
   * - DENIED -> APPEALED, VOID
   * - APPEALED -> ACCEPTED, DENIED, PAID, VOID
   * - VOID -> (terminal, no transitions)
   */
  async updateClaimStatus(request, reply) {
    try {
      const { id } = request.params;
      const { new_status, reason, notes, force } = request.body;

      if (!new_status) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required field: new_status'
        };
      }

      // Get current claim
      const claim = await db
        .select()
        .from(claims)
        .where(and(
          eq(claims.id, parseInt(id)),
          isNull(claims.deleted_at)
        ))
        .limit(1);

      if (!claim[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Claim not found'
        };
      }

      const currentStatus = claim[0].claim_status;

      // Validate status transition
      const transitionResult = this.validateStatusTransition(currentStatus, new_status);
      if (!transitionResult.valid) {
        // Allow force override for admins if explicitly requested
        if (!force) {
          reply.code(400);
          return {
            status: 400,
            message: transitionResult.message,
            current_status: currentStatus,
            requested_status: new_status,
            allowed_transitions: CLAIM_STATUS_WORKFLOW[currentStatus] || [],
            hint: 'Set force=true to override workflow validation (admin only)'
          };
        }
        // Log force override
        logger.warn(`Force status transition override: ${currentStatus} -> ${new_status} by user ${request.user?.id}`);
      }

      // Record status change in history
      await this.recordStatusChange(
        parseInt(id),
        currentStatus,
        new_status,
        reason || 'USER_ACTION',
        force ? 'FORCE_OVERRIDE' : 'MANUAL',
        null,
        request.user?.id,
        notes
      );

      // Update claim status
      const result = await db
        .update(claims)
        .set({
          claim_status: new_status,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(claims.id, parseInt(id)))
        .returning();

      // Create audit log
      await this.createClaimAuditLog('STATUS_CHANGE', parseInt(id), request.user?.id,
        { claim_status: currentStatus },
        { claim_status: new_status, force: !!force },
        request
      );

      reply.code(200);
      return {
        status: 200,
        message: 'Claim status updated successfully',
        data: result[0],
        transition: {
          from: currentStatus,
          to: new_status,
          forced: !!force
        }
      };
    } catch (error) {
      logger.error('Error updating claim status:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating claim status',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get valid status transitions for a claim
   * GET /claims/:id/status/transitions
   */
  async getValidStatusTransitions(request, reply) {
    try {
      const { id } = request.params;

      const claim = await db
        .select()
        .from(claims)
        .where(and(
          eq(claims.id, parseInt(id)),
          isNull(claims.deleted_at)
        ))
        .limit(1);

      if (!claim[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Claim not found'
        };
      }

      const currentStatus = claim[0].claim_status;
      const allowedTransitions = CLAIM_STATUS_WORKFLOW[currentStatus] || [];

      reply.code(200);
      return {
        status: 200,
        data: {
          claim_id: claim[0].id,
          claim_number: claim[0].claim_number,
          current_status: currentStatus,
          allowed_transitions: allowedTransitions,
          is_terminal: TERMINAL_STATUSES.includes(currentStatus),
          workflow: CLAIM_STATUS_WORKFLOW
        }
      };
    } catch (error) {
      logger.error('Error getting status transitions:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error getting status transitions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Helper method to record status changes
   */
  async recordStatusChange(
    claimId,
    previousStatus,
    newStatus,
    changeReason,
    changeSource,
    submissionHistoryId,
    userId,
    notes = null
  ) {
    const claim = await db
      .select()
      .from(claims)
      .where(eq(claims.id, claimId))
      .limit(1);

    await db.insert(claim_status_history).values({
      claim_id: claimId,
      previous_status: previousStatus,
      new_status: newStatus,
      status_date: new Date(),
      change_reason: changeReason,
      change_source: changeSource,
      submission_history_id: submissionHistoryId,
      charges_at_change: claim[0]?.total_charges,
      paid_at_change: claim[0]?.total_paid,
      balance_at_change: claim[0]?.balance,
      notes: notes,
      changed_by_id: userId
    });
  }

  // ============================================
  // CLAIM DIAGNOSIS CODES
  // ============================================

  /**
   * Get diagnosis codes for a claim
   * GET /claims/:id/diagnosis-codes
   */
  async getClaimDiagnosisCodes(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(claim_diagnosis_codes)
        .where(eq(claim_diagnosis_codes.claim_id, parseInt(id)))
        .orderBy(asc(claim_diagnosis_codes.sequence_number));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching claim diagnosis codes:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching claim diagnosis codes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add diagnosis code to a claim
   * POST /claims/:id/diagnosis-codes
   */
  async addClaimDiagnosisCode(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      if (!data.diagnosis_code || !data.diagnosis_type) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: diagnosis_code, diagnosis_type'
        };
      }

      // Get next sequence number if not provided
      let sequenceNumber = data.sequence_number;
      if (!sequenceNumber) {
        const existing = await db
          .select({ max: sql`max(sequence_number)` })
          .from(claim_diagnosis_codes)
          .where(eq(claim_diagnosis_codes.claim_id, parseInt(id)));
        sequenceNumber = (parseInt(existing[0]?.max) || 0) + 1;
      }

      const result = await db
        .insert(claim_diagnosis_codes)
        .values({
          claim_id: parseInt(id),
          diagnosis_code: data.diagnosis_code,
          diagnosis_code_qualifier: data.diagnosis_code_qualifier || '0',
          sequence_number: sequenceNumber,
          diagnosis_type: data.diagnosis_type,
          poa_indicator: data.poa_indicator
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Diagnosis code added successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding claim diagnosis code:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding claim diagnosis code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete diagnosis code from a claim
   * DELETE /claims/:claimId/diagnosis-codes/:codeId
   */
  async deleteClaimDiagnosisCode(request, reply) {
    try {
      const { claimId, codeId } = request.params;

      const result = await db
        .delete(claim_diagnosis_codes)
        .where(
          and(
            eq(claim_diagnosis_codes.id, parseInt(codeId)),
            eq(claim_diagnosis_codes.claim_id, parseInt(claimId))
          )
        )
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Diagnosis code not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Diagnosis code deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting claim diagnosis code:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting claim diagnosis code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // CLAIM PROCEDURE CODES
  // ============================================

  /**
   * Get procedure codes for a claim
   * GET /claims/:id/procedure-codes
   */
  async getClaimProcedureCodes(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(claim_procedure_codes)
        .where(eq(claim_procedure_codes.claim_id, parseInt(id)))
        .orderBy(asc(claim_procedure_codes.sequence_number));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching claim procedure codes:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching claim procedure codes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add procedure code to a claim
   * POST /claims/:id/procedure-codes
   */
  async addClaimProcedureCode(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      if (!data.procedure_code || !data.procedure_code_type) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: procedure_code, procedure_code_type'
        };
      }

      // Get next sequence number if not provided
      let sequenceNumber = data.sequence_number;
      if (!sequenceNumber) {
        const existing = await db
          .select({ max: sql`max(sequence_number)` })
          .from(claim_procedure_codes)
          .where(eq(claim_procedure_codes.claim_id, parseInt(id)));
        sequenceNumber = (parseInt(existing[0]?.max) || 0) + 1;
      }

      const result = await db
        .insert(claim_procedure_codes)
        .values({
          claim_id: parseInt(id),
          service_line_id: data.service_line_id ? parseInt(data.service_line_id) : null,
          procedure_code: data.procedure_code,
          procedure_code_type: data.procedure_code_type,
          modifier_1: data.modifier_1,
          modifier_2: data.modifier_2,
          modifier_3: data.modifier_3,
          modifier_4: data.modifier_4,
          procedure_date: data.procedure_date,
          units: data.units || 1,
          charges: data.charges,
          sequence_number: sequenceNumber
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Procedure code added successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding claim procedure code:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding claim procedure code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete procedure code from a claim
   * DELETE /claims/:claimId/procedure-codes/:codeId
   */
  async deleteClaimProcedureCode(request, reply) {
    try {
      const { claimId, codeId } = request.params;

      const result = await db
        .delete(claim_procedure_codes)
        .where(
          and(
            eq(claim_procedure_codes.id, parseInt(codeId)),
            eq(claim_procedure_codes.claim_id, parseInt(claimId))
          )
        )
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Procedure code not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Procedure code deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting claim procedure code:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting claim procedure code',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // INVOICES MANAGEMENT
  // ============================================

  /**
   * Get all invoices with optional filters
   * GET /billing/invoices
   *
   * Query Parameters:
   * - limit: Number of results per page (default: 50)
   * - offset: Starting offset for pagination (default: 0)
   * - status: Filter by invoice status
   * - patient_id: Filter by patient ID
   * - payer_id: Filter by payer ID
   * - start_date: Filter by invoice date (>=)
   * - end_date: Filter by invoice date (<=)
   * - min_amount: Filter by minimum total_amount
   * - max_amount: Filter by maximum total_amount
   * - sort_by: Field to sort by (default: createdAt)
   * - sort_order: Sort direction (asc/desc, default: desc)
   */
  async getAllInvoices(request, reply) {
    try {
      const {
        limit = 50,
        offset = 0,
        status,
        patient_id,
        payer_id,
        start_date,
        end_date,
        min_amount,
        max_amount,
        sort_by = 'createdAt',
        sort_order = 'desc'
      } = request.query;

      const filters = [isNull(invoices.deleted_at)];

      if (status) {
        const statuses = status.split(',').map(s => s.trim());
        if (statuses.length > 1) {
          filters.push(inArray(invoices.invoice_status, statuses));
        } else {
          filters.push(eq(invoices.invoice_status, status));
        }
      }
      if (patient_id) {
        filters.push(eq(invoices.patient_id, parseInt(patient_id)));
      }
      if (payer_id) {
        filters.push(eq(invoices.payer_id, parseInt(payer_id)));
      }
      if (start_date) {
        filters.push(gte(invoices.invoice_date, start_date));
      }
      if (end_date) {
        filters.push(lte(invoices.invoice_date, end_date));
      }
      if (min_amount) {
        filters.push(gte(invoices.total_amount, parseInt(min_amount)));
      }
      if (max_amount) {
        filters.push(lte(invoices.total_amount, parseInt(max_amount)));
      }

      const sortField = invoices[sort_by] || invoices.createdAt;
      const orderByClause = sort_order === 'asc' ? asc(sortField) : desc(sortField);

      const results = await db
        .select({
          invoice: invoices,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          },
          payer: {
            id: payers.id,
            payer_name: payers.payer_name,
            payer_type: payers.payer_type
          }
        })
        .from(invoices)
        .leftJoin(patients, eq(invoices.patient_id, patients.id))
        .leftJoin(payers, eq(invoices.payer_id, payers.id))
        .where(and(...filters))
        .orderBy(orderByClause)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      const countResult = await db
        .select({ total: count() })
        .from(invoices)
        .where(and(...filters));

      const total = Number(countResult[0]?.total || 0);

      reply.code(200);
      return {
        success: true,
        data: results,
        count: results.length,
        total: total,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: total,
          pages: Math.ceil(total / parseInt(limit)),
          currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1
        }
      };
    } catch (error) {
      logger.error('Error fetching invoices:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching invoices'
        }
      };
    }
  }

  /**
   * Get invoice by ID with line items
   * GET /billing/invoices/:id
   */
  async getInvoiceById(request, reply) {
    try {
      const { id } = request.params;

      const invoiceResult = await db
        .select({
          invoice: invoices,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          },
          payer: payers
        })
        .from(invoices)
        .leftJoin(patients, eq(invoices.patient_id, patients.id))
        .leftJoin(payers, eq(invoices.payer_id, payers.id))
        .where(and(
          eq(invoices.id, parseInt(id)),
          isNull(invoices.deleted_at)
        ))
        .limit(1);

      if (!invoiceResult[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Invoice not found'
          }
        };
      }

      // Get line items
      const lineItems = await db
        .select()
        .from(invoice_line_items)
        .where(eq(invoice_line_items.invoice_id, parseInt(id)))
        .orderBy(invoice_line_items.line_number);

      // Get payments for this invoice
      const invoicePaymentsList = await db
        .select()
        .from(invoice_payments)
        .where(eq(invoice_payments.invoice_id, parseInt(id)))
        .orderBy(desc(invoice_payments.payment_date));

      reply.code(200);
      return {
        success: true,
        data: {
          ...invoiceResult[0],
          line_items: lineItems,
          payments: invoicePaymentsList
        }
      };
    } catch (error) {
      logger.error('Error fetching invoice:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching invoice'
        }
      };
    }
  }

  /**
   * Create invoice from approved claims
   * POST /billing/invoices
   *
   * Body:
   * - claim_ids: Array of claim IDs to include (optional)
   * - patient_id: Patient ID (required if no claim_ids)
   * - payer_id: Payer ID (optional)
   * - line_items: Manual line items (optional)
   * - payment_terms: Payment terms (default: NET_30)
   * - notes: Invoice notes
   */
  async createInvoice(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.claim_ids?.length && !data.patient_id && !data.line_items?.length) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either claim_ids, patient_id with line_items, or manual line_items are required'
          }
        };
      }

      // Generate invoice number
      const invoiceNumber = await this.generateInvoiceNumber();

      // Calculate due date based on payment terms
      const invoiceDate = new Date();
      let dueDate = new Date(invoiceDate);
      switch (data.payment_terms) {
        case 'NET_45':
          dueDate.setDate(dueDate.getDate() + 45);
          break;
        case 'NET_60':
          dueDate.setDate(dueDate.getDate() + 60);
          break;
        case 'DUE_ON_RECEIPT':
          // Due date is today
          break;
        case 'NET_30':
        default:
          dueDate.setDate(dueDate.getDate() + 30);
          break;
      }

      let patientId = data.patient_id;
      let payerId = data.payer_id;
      let lineItemsToCreate = [];
      let subtotal = 0;

      // If claim_ids provided, generate line items from claims
      if (data.claim_ids?.length) {
        const claimsData = await db
          .select()
          .from(claims)
          .where(and(
            inArray(claims.id, data.claim_ids.map(id => parseInt(id))),
            eq(claims.claim_status, 'ACCEPTED'),
            isNull(claims.deleted_at)
          ));

        if (claimsData.length === 0) {
          reply.code(400);
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'No approved claims found with the provided IDs'
            }
          };
        }

        // Use the first claim's patient and payer if not specified
        if (!patientId) patientId = claimsData[0].patient_id;
        if (!payerId) payerId = claimsData[0].payer_id;

        // Create line items from claims
        claimsData.forEach((claim, index) => {
          const claimAmount = claim.total_charges || 0;
          subtotal += claimAmount;
          lineItemsToCreate.push({
            line_number: index + 1,
            claim_id: claim.id,
            description: `Claim ${claim.claim_number} - Service Period: ${claim.service_start_date} to ${claim.service_end_date}`,
            service_date: claim.service_start_date,
            quantity: 1,
            unit_price: claimAmount,
            line_total: claimAmount,
            net_amount: claimAmount
          });
        });
      }

      // Add manual line items if provided
      if (data.line_items?.length) {
        const startLineNumber = lineItemsToCreate.length + 1;
        data.line_items.forEach((item, index) => {
          const lineTotal = (item.quantity || 1) * (item.unit_price || 0);
          const discountAmt = item.discount_amount || 0;
          const adjustmentAmt = item.adjustment_amount || 0;
          const netAmount = lineTotal - discountAmt - adjustmentAmt;
          subtotal += netAmount;

          lineItemsToCreate.push({
            line_number: startLineNumber + index,
            description: item.description,
            service_date: item.service_date,
            revenue_code: item.revenue_code,
            cpt_code: item.cpt_code,
            hcpcs_code: item.hcpcs_code,
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            line_total: lineTotal,
            discount_percent: item.discount_percent || 0,
            discount_amount: discountAmt,
            adjustment_amount: adjustmentAmt,
            adjustment_reason: item.adjustment_reason,
            net_amount: netAmount
          });
        });
      }

      // Calculate totals
      const taxAmount = data.tax_amount || 0;
      const discountAmount = data.discount_amount || 0;
      const totalAmount = subtotal + taxAmount - discountAmount;

      // Create invoice
      const invoiceResult = await db
        .insert(invoices)
        .values({
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate.toISOString().split('T')[0],
          due_date: dueDate.toISOString().split('T')[0],
          invoice_status: 'DRAFT',
          patient_id: patientId ? parseInt(patientId) : null,
          payer_id: payerId ? parseInt(payerId) : null,
          billing_period_start: data.billing_period_start,
          billing_period_end: data.billing_period_end,
          subtotal: subtotal,
          tax_amount: taxAmount,
          discount_amount: discountAmount,
          total_amount: totalAmount,
          amount_paid: 0,
          balance_due: totalAmount,
          payment_terms: data.payment_terms || 'NET_30',
          notes: data.notes,
          internal_notes: data.internal_notes,
          metadata: data.metadata,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create line items
      if (lineItemsToCreate.length > 0) {
        const lineItemsWithInvoiceId = lineItemsToCreate.map(item => ({
          ...item,
          invoice_id: invoiceResult[0].id
        }));
        await db.insert(invoice_line_items).values(lineItemsWithInvoiceId);
      }

      reply.code(201);
      return {
        success: true,
        data: invoiceResult[0],
        message: 'Invoice created successfully'
      };
    } catch (error) {
      logger.error('Error creating invoice:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error creating invoice'
        }
      };
    }
  }

  /**
   * Update invoice
   * PUT /billing/invoices/:id
   */
  async updateInvoice(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const existing = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, parseInt(id)),
          isNull(invoices.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Invoice not found'
          }
        };
      }

      // Prevent updates to PAID or VOID invoices
      if (['PAID', 'VOID'].includes(existing[0].invoice_status)) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'INVALID_STATUS',
            message: `Cannot update invoice with status: ${existing[0].invoice_status}`
          }
        };
      }

      const updateData = {
        ...data,
        updated_by_id: request.user?.id,
        updatedAt: new Date()
      };

      delete updateData.id;
      delete updateData.invoice_number;
      delete updateData.created_by_id;
      delete updateData.createdAt;

      const result = await db
        .update(invoices)
        .set(updateData)
        .where(eq(invoices.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        success: true,
        data: result[0],
        message: 'Invoice updated successfully'
      };
    } catch (error) {
      logger.error('Error updating invoice:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error updating invoice'
        }
      };
    }
  }

  /**
   * Record payment against invoice
   * POST /billing/invoices/:id/payments
   */
  async recordInvoicePayment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      if (!data.payment_amount || !data.payment_date) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: payment_amount, payment_date'
          }
        };
      }

      // Get invoice
      const invoice = await db
        .select()
        .from(invoices)
        .where(and(
          eq(invoices.id, parseInt(id)),
          isNull(invoices.deleted_at)
        ))
        .limit(1);

      if (!invoice[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Invoice not found'
          }
        };
      }

      const paymentAmount = parseInt(data.payment_amount);

      // Create payment record
      const paymentResult = await db
        .insert(invoice_payments)
        .values({
          invoice_id: parseInt(id),
          payment_id: data.payment_id ? parseInt(data.payment_id) : null,
          payment_date: data.payment_date,
          payment_amount: paymentAmount,
          payment_method: data.payment_method,
          reference_number: data.reference_number,
          check_number: data.check_number,
          transaction_id: data.transaction_id,
          notes: data.notes,
          created_by_id: request.user?.id
        })
        .returning();

      // Update invoice amounts
      const newAmountPaid = (invoice[0].amount_paid || 0) + paymentAmount;
      const newBalanceDue = invoice[0].total_amount - newAmountPaid;
      let newStatus = invoice[0].invoice_status;

      if (newBalanceDue <= 0) {
        newStatus = 'PAID';
      } else if (newAmountPaid > 0) {
        newStatus = 'PARTIALLY_PAID';
      }

      await db
        .update(invoices)
        .set({
          amount_paid: newAmountPaid,
          balance_due: Math.max(0, newBalanceDue),
          invoice_status: newStatus,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(invoices.id, parseInt(id)));

      reply.code(201);
      return {
        success: true,
        data: paymentResult[0],
        message: 'Payment recorded successfully',
        invoice_summary: {
          total_amount: invoice[0].total_amount,
          amount_paid: newAmountPaid,
          balance_due: Math.max(0, newBalanceDue),
          status: newStatus
        }
      };
    } catch (error) {
      logger.error('Error recording invoice payment:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error recording invoice payment'
        }
      };
    }
  }

  /**
   * Get payment history for an invoice
   * GET /billing/invoices/:id/payments
   */
  async getInvoicePayments(request, reply) {
    try {
      const { id } = request.params;

      const paymentsList = await db
        .select()
        .from(invoice_payments)
        .where(eq(invoice_payments.invoice_id, parseInt(id)))
        .orderBy(desc(invoice_payments.payment_date));

      reply.code(200);
      return {
        success: true,
        data: paymentsList,
        count: paymentsList.length
      };
    } catch (error) {
      logger.error('Error fetching invoice payments:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching invoice payments'
        }
      };
    }
  }

  // ============================================
  // BILLING STATEMENTS
  // ============================================

  /**
   * Get all billing statements with optional filters
   * GET /billing/statements
   */
  async getAllStatements(request, reply) {
    try {
      const {
        limit = 50,
        offset = 0,
        status,
        patient_id,
        payer_id,
        start_date,
        end_date,
        sort_by = 'createdAt',
        sort_order = 'desc'
      } = request.query;

      const filters = [isNull(billing_statements.deleted_at)];

      if (status) {
        filters.push(eq(billing_statements.statement_status, status));
      }
      if (patient_id) {
        filters.push(eq(billing_statements.patient_id, parseInt(patient_id)));
      }
      if (payer_id) {
        filters.push(eq(billing_statements.payer_id, parseInt(payer_id)));
      }
      if (start_date) {
        filters.push(gte(billing_statements.statement_date, start_date));
      }
      if (end_date) {
        filters.push(lte(billing_statements.statement_date, end_date));
      }

      const sortField = billing_statements[sort_by] || billing_statements.createdAt;
      const orderByClause = sort_order === 'asc' ? asc(sortField) : desc(sortField);

      const results = await db
        .select({
          statement: billing_statements,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          },
          payer: {
            id: payers.id,
            payer_name: payers.payer_name,
            payer_type: payers.payer_type
          }
        })
        .from(billing_statements)
        .leftJoin(patients, eq(billing_statements.patient_id, patients.id))
        .leftJoin(payers, eq(billing_statements.payer_id, payers.id))
        .where(and(...filters))
        .orderBy(orderByClause)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      const countResult = await db
        .select({ total: count() })
        .from(billing_statements)
        .where(and(...filters));

      const total = Number(countResult[0]?.total || 0);

      reply.code(200);
      return {
        success: true,
        data: results,
        count: results.length,
        total: total,
        pagination: {
          limit: parseInt(limit),
          offset: parseInt(offset),
          total: total,
          pages: Math.ceil(total / parseInt(limit)),
          currentPage: Math.floor(parseInt(offset) / parseInt(limit)) + 1
        }
      };
    } catch (error) {
      logger.error('Error fetching billing statements:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching billing statements'
        }
      };
    }
  }

  /**
   * Get statement by ID with line items
   * GET /billing/statements/:id
   */
  async getStatementById(request, reply) {
    try {
      const { id } = request.params;

      const statementResult = await db
        .select({
          statement: billing_statements,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          },
          payer: payers
        })
        .from(billing_statements)
        .leftJoin(patients, eq(billing_statements.patient_id, patients.id))
        .leftJoin(payers, eq(billing_statements.payer_id, payers.id))
        .where(and(
          eq(billing_statements.id, parseInt(id)),
          isNull(billing_statements.deleted_at)
        ))
        .limit(1);

      if (!statementResult[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Statement not found'
          }
        };
      }

      // Get line items
      const lineItems = await db
        .select()
        .from(statement_line_items)
        .where(eq(statement_line_items.statement_id, parseInt(id)))
        .orderBy(statement_line_items.line_date);

      reply.code(200);
      return {
        success: true,
        data: {
          ...statementResult[0],
          line_items: lineItems
        }
      };
    } catch (error) {
      logger.error('Error fetching statement:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching statement'
        }
      };
    }
  }

  /**
   * Generate billing statement for a period
   * POST /billing/statements
   */
  async generateStatement(request, reply) {
    try {
      const data = request.body;

      if (!data.period_start || !data.period_end) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields: period_start, period_end'
          }
        };
      }

      if (!data.patient_id && !data.payer_id) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Either patient_id or payer_id is required'
          }
        };
      }

      const statementNumber = await this.generateStatementNumber();
      const statementDate = new Date().toISOString().split('T')[0];

      // Get invoices for the period
      const invoiceFilters = [
        isNull(invoices.deleted_at),
        gte(invoices.invoice_date, data.period_start),
        lte(invoices.invoice_date, data.period_end)
      ];

      if (data.patient_id) {
        invoiceFilters.push(eq(invoices.patient_id, parseInt(data.patient_id)));
      }
      if (data.payer_id) {
        invoiceFilters.push(eq(invoices.payer_id, parseInt(data.payer_id)));
      }

      const periodInvoices = await db
        .select()
        .from(invoices)
        .where(and(...invoiceFilters))
        .orderBy(invoices.invoice_date);

      // Calculate statement totals
      let newCharges = 0;
      let paymentsReceived = 0;
      let adjustments = 0;

      periodInvoices.forEach(inv => {
        newCharges += inv.total_amount || 0;
        paymentsReceived += inv.amount_paid || 0;
      });

      // Calculate aging buckets based on invoice dates
      const today = new Date();
      let currentAmount = 0;
      let amount30Days = 0;
      let amount60Days = 0;
      let amount90Days = 0;
      let amountOver120Days = 0;

      periodInvoices.forEach(inv => {
        if (inv.balance_due > 0) {
          const invoiceDate = new Date(inv.invoice_date);
          const daysOutstanding = Math.floor((today - invoiceDate) / (1000 * 60 * 60 * 24));

          if (daysOutstanding <= 30) {
            currentAmount += inv.balance_due;
          } else if (daysOutstanding <= 60) {
            amount30Days += inv.balance_due;
          } else if (daysOutstanding <= 90) {
            amount60Days += inv.balance_due;
          } else if (daysOutstanding <= 120) {
            amount90Days += inv.balance_due;
          } else {
            amountOver120Days += inv.balance_due;
          }
        }
      });

      const currentBalance = newCharges - paymentsReceived - adjustments + (data.previous_balance || 0);

      // Create statement
      const statementResult = await db
        .insert(billing_statements)
        .values({
          statement_number: statementNumber,
          statement_date: statementDate,
          period_start: data.period_start,
          period_end: data.period_end,
          patient_id: data.patient_id ? parseInt(data.patient_id) : null,
          payer_id: data.payer_id ? parseInt(data.payer_id) : null,
          previous_balance: data.previous_balance || 0,
          new_charges: newCharges,
          payments_received: paymentsReceived,
          adjustments: adjustments,
          current_balance: currentBalance,
          current_amount: currentAmount,
          amount_30_days: amount30Days,
          amount_60_days: amount60Days,
          amount_90_days: amount90Days,
          amount_over_120_days: amountOver120Days,
          statement_status: 'GENERATED',
          notes: data.notes,
          metadata: data.metadata,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Create line items from invoices
      const lineItemsToCreate = [];

      // Add balance forward if applicable
      if (data.previous_balance && data.previous_balance !== 0) {
        lineItemsToCreate.push({
          statement_id: statementResult[0].id,
          line_date: data.period_start,
          description: 'Previous Balance',
          line_type: 'BALANCE_FORWARD',
          amount: data.previous_balance,
          running_balance: data.previous_balance
        });
      }

      let runningBalance = data.previous_balance || 0;

      // Add invoice charges
      periodInvoices.forEach(inv => {
        runningBalance += inv.total_amount || 0;
        lineItemsToCreate.push({
          statement_id: statementResult[0].id,
          invoice_id: inv.id,
          line_date: inv.invoice_date,
          description: `Invoice #${inv.invoice_number}`,
          line_type: 'CHARGE',
          amount: inv.total_amount || 0,
          running_balance: runningBalance
        });

        // Add payment if any
        if (inv.amount_paid > 0) {
          runningBalance -= inv.amount_paid;
          lineItemsToCreate.push({
            statement_id: statementResult[0].id,
            invoice_id: inv.id,
            line_date: inv.invoice_date,
            description: `Payment - Invoice #${inv.invoice_number}`,
            line_type: 'PAYMENT',
            amount: -inv.amount_paid,
            running_balance: runningBalance
          });
        }
      });

      if (lineItemsToCreate.length > 0) {
        await db.insert(statement_line_items).values(lineItemsToCreate);
      }

      reply.code(201);
      return {
        success: true,
        data: statementResult[0],
        message: 'Statement generated successfully',
        summary: {
          invoices_included: periodInvoices.length,
          new_charges: newCharges,
          payments_received: paymentsReceived,
          current_balance: currentBalance
        }
      };
    } catch (error) {
      logger.error('Error generating statement:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error generating statement'
        }
      };
    }
  }

  // ============================================
  // DASHBOARD & ANALYTICS
  // ============================================

  /**
   * Get billing dashboard with KPIs
   * GET /billing/dashboard
   */
  async getBillingDashboard(request, reply) {
    try {
      const { period = 'current_month' } = request.query;

      // Calculate date range based on period
      const now = new Date();
      let startDate, endDate;

      switch (period) {
        case 'current_month':
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
          break;
        case 'last_month':
          startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
          endDate = new Date(now.getFullYear(), now.getMonth(), 0);
          break;
        case 'current_quarter':
          const quarter = Math.floor(now.getMonth() / 3);
          startDate = new Date(now.getFullYear(), quarter * 3, 1);
          endDate = new Date(now.getFullYear(), quarter * 3 + 3, 0);
          break;
        case 'ytd':
          startDate = new Date(now.getFullYear(), 0, 1);
          endDate = now;
          break;
        case 'last_30_days':
          startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        case 'last_90_days':
          startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
          endDate = now;
          break;
        default:
          startDate = new Date(now.getFullYear(), now.getMonth(), 1);
          endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
      }

      // Get claims for the period
      const periodClaims = await db
        .select()
        .from(claims)
        .where(and(
          gte(claims.service_start_date, startDate.toISOString().split('T')[0]),
          lte(claims.service_start_date, endDate.toISOString().split('T')[0]),
          isNull(claims.deleted_at)
        ));

      // Calculate KPIs
      const totalClaims = periodClaims.length;
      const totalRevenue = periodClaims.reduce((sum, c) => sum + (c.total_charges || 0), 0);
      const totalPayments = periodClaims.reduce((sum, c) => sum + (c.total_paid || 0), 0);
      const totalOutstanding = periodClaims.reduce((sum, c) => sum + (c.balance || 0), 0);

      const acceptedClaims = periodClaims.filter(c => ['ACCEPTED', 'PAID'].includes(c.claim_status)).length;
      const cleanClaimRate = totalClaims > 0 ? (acceptedClaims / totalClaims) * 100 : 0;
      const collectionRate = totalRevenue > 0 ? (totalPayments / totalRevenue) * 100 : 0;

      const deniedClaims = periodClaims.filter(c => c.claim_status === 'DENIED').length;
      const denialRate = totalClaims > 0 ? (deniedClaims / totalClaims) * 100 : 0;

      // Calculate average days to payment
      const paidClaims = periodClaims.filter(c => c.paid_date && c.submission_date);
      const avgDaysToPayment = paidClaims.length > 0
        ? paidClaims.reduce((sum, c) => {
            const diffTime = new Date(c.paid_date).getTime() - new Date(c.submission_date).getTime();
            return sum + Math.floor(diffTime / (1000 * 60 * 60 * 24));
          }, 0) / paidClaims.length
        : 0;

      // Claims by status
      const statusCounts = {};
      periodClaims.forEach(c => {
        if (!statusCounts[c.claim_status]) {
          statusCounts[c.claim_status] = { count: 0, amount: 0 };
        }
        statusCounts[c.claim_status].count++;
        statusCounts[c.claim_status].amount += c.total_charges || 0;
      });

      const claimsByStatus = Object.entries(statusCounts).map(([status, data]) => ({
        status,
        count: data.count,
        amount: data.amount,
        amount_formatted: `$${(data.amount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
      }));

      // Action required counts
      const readyToSubmit = periodClaims.filter(c => c.claim_status === 'READY_TO_SUBMIT').length;
      const rejectedClaims = periodClaims.filter(c => c.claim_status === 'REJECTED').length;
      const deniedClaimsCount = periodClaims.filter(c => c.claim_status === 'DENIED').length;

      // Get unbilled periods count
      const unbilledResult = await db
        .select({ count: count() })
        .from(billing_periods)
        .where(eq(billing_periods.billed, false));
      const unbilledPeriods = Number(unbilledResult[0]?.count || 0);

      // Get top payers
      const payerStats = {};
      periodClaims.forEach(c => {
        if (c.payer_id) {
          if (!payerStats[c.payer_id]) {
            payerStats[c.payer_id] = { claim_count: 0, total_billed: 0, total_paid: 0 };
          }
          payerStats[c.payer_id].claim_count++;
          payerStats[c.payer_id].total_billed += c.total_charges || 0;
          payerStats[c.payer_id].total_paid += c.total_paid || 0;
        }
      });

      // Get payer names
      const payerIds = Object.keys(payerStats).map(id => parseInt(id));
      const payerNames = payerIds.length > 0 ? await db
        .select({ id: payers.id, payer_name: payers.payer_name })
        .from(payers)
        .where(inArray(payers.id, payerIds)) : [];

      const payerNameMap = {};
      payerNames.forEach(p => { payerNameMap[p.id] = p.payer_name; });

      const topPayers = Object.entries(payerStats)
        .map(([payerId, data]) => ({
          payer_id: parseInt(payerId),
          payer_name: payerNameMap[payerId] || 'Unknown',
          claim_count: data.claim_count,
          total_billed: data.total_billed,
          total_paid: data.total_paid,
          collection_rate: data.total_billed > 0 ? (data.total_paid / data.total_billed) * 100 : 0
        }))
        .sort((a, b) => b.total_billed - a.total_billed)
        .slice(0, 5);

      // AR Aging buckets
      const arBuckets = [
        { bucket: 'Current (0-30)', min: 0, max: 30 },
        { bucket: '31-60 Days', min: 31, max: 60 },
        { bucket: '61-90 Days', min: 61, max: 90 },
        { bucket: '90+ Days', min: 91, max: Infinity }
      ];

      const arAgingData = arBuckets.map(bucket => {
        const bucketClaims = periodClaims.filter(c => {
          if (c.balance <= 0) return false;
          const daysSince = Math.floor((now.getTime() - new Date(c.service_start_date).getTime()) / (1000 * 60 * 60 * 24));
          return daysSince >= bucket.min && daysSince <= bucket.max;
        });
        const totalAmount = bucketClaims.reduce((sum, c) => sum + (c.balance || 0), 0);
        return {
          bucket: bucket.bucket,
          claim_count: bucketClaims.length,
          total_amount: totalAmount,
          total_amount_formatted: `$${(totalAmount / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          percentage: totalOutstanding > 0 ? (totalAmount / totalOutstanding) * 100 : 0
        };
      });

      reply.code(200);
      return {
        success: true,
        data: {
          period: {
            label: period.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
            start: startDate.toISOString().split('T')[0],
            end: endDate.toISOString().split('T')[0]
          },
          kpis: {
            total_claims: totalClaims,
            total_revenue: totalRevenue,
            total_revenue_formatted: `$${(totalRevenue / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            total_payments: totalPayments,
            total_payments_formatted: `$${(totalPayments / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            total_outstanding: totalOutstanding,
            total_outstanding_formatted: `$${(totalOutstanding / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
            collection_rate: Math.round(collectionRate * 10) / 10,
            clean_claim_rate: Math.round(cleanClaimRate * 10) / 10,
            denial_rate: Math.round(denialRate * 10) / 10,
            avg_days_to_payment: Math.round(avgDaysToPayment),
            claims_by_status: claimsByStatus
          },
          trends: {
            revenue_trend: 'stable',
            revenue_change: 0,
            collection_trend: 'stable',
            collection_change: 0
          },
          ar_aging: arAgingData,
          top_payers: topPayers,
          recent_activity: [],
          action_required: {
            ready_to_submit: readyToSubmit,
            rejected_claims: rejectedClaims,
            denied_claims: deniedClaimsCount,
            unbilled_periods: unbilledPeriods
          },
          generated_at: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error fetching billing dashboard:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching billing dashboard'
        }
      };
    }
  }

  /**
   * Get billing KPIs
   * GET /billing/kpis
   */
  async getBillingKPIs(request, reply) {
    try {
      // Get summary counts
      const claimsCounts = await db
        .select({
          status: claims.claim_status,
          count: count(),
          total_charges: sql`SUM(${claims.total_charges})`,
          total_paid: sql`SUM(${claims.total_paid})`
        })
        .from(claims)
        .where(isNull(claims.deleted_at))
        .groupBy(claims.claim_status);

      const totalClaims = claimsCounts.reduce((sum, c) => sum + Number(c.count), 0);
      const totalCharges = claimsCounts.reduce((sum, c) => sum + Number(c.total_charges || 0), 0);
      const totalPaid = claimsCounts.reduce((sum, c) => sum + Number(c.total_paid || 0), 0);

      const collectionRate = totalCharges > 0 ? (totalPaid / totalCharges) * 100 : 0;

      reply.code(200);
      return {
        success: true,
        data: {
          total_claims: totalClaims,
          total_revenue: totalCharges,
          total_revenue_formatted: `$${(totalCharges / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          total_payments: totalPaid,
          total_payments_formatted: `$${(totalPaid / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
          collection_rate: Math.round(collectionRate * 10) / 10,
          claims_by_status: claimsCounts.map(c => ({
            status: c.status,
            count: Number(c.count),
            amount: Number(c.total_charges || 0),
            amount_formatted: `$${(Number(c.total_charges || 0) / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
          }))
        }
      };
    } catch (error) {
      logger.error('Error fetching billing KPIs:', error);
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          message: 'Error fetching billing KPIs'
        }
      };
    }
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  /**
   * Generate unique claim number
   */
  async generateClaimNumber() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `CLM-${year}-${timestamp}${random}`;
  }

  /**
   * Generate unique invoice number
   */
  async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `INV-${year}-${timestamp}${random}`;
  }

  /**
   * Generate unique statement number
   */
  async generateStatementNumber() {
    const year = new Date().getFullYear();
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const timestamp = Date.now().toString().slice(-6);
    return `STMT-${year}${month}-${timestamp}`;
  }
}

export default new BillingController();
