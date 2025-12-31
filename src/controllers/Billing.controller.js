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
  patients
} from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, sql, or, isNull, inArray } from 'drizzle-orm';

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
