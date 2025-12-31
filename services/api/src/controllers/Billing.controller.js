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
  claim_procedure_codes
} from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, asc, sql, or, isNull, inArray, like, ilike } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
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
  // ============================================
  // CLAIMS MANAGEMENT
  // ============================================

  /**
   * Get all claims with optional filters
   * GET /claims
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
        end_date
      } = request.query;

      let query = db
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
        .where(isNull(claims.deleted_at));

      // Apply filters
      const filters = [];
      if (status) {
        filters.push(eq(claims.claim_status, status));
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

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query
        .orderBy(desc(claims.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
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
   * Update claim status with history tracking
   * PUT /claims/:id/status
   */
  async updateClaimStatus(request, reply) {
    try {
      const { id } = request.params;
      const { new_status, reason, notes } = request.body;

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
        .where(eq(claims.id, parseInt(id)))
        .limit(1);

      if (!claim[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Claim not found'
        };
      }

      // Record status change in history
      await this.recordStatusChange(
        parseInt(id),
        claim[0].claim_status,
        new_status,
        reason || 'USER_ACTION',
        'MANUAL',
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

      reply.code(200);
      return {
        status: 200,
        message: 'Claim status updated successfully',
        data: result[0]
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
}

export default new BillingController();
