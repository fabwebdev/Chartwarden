import { db } from '../db/index.js';
import {
  claim_denials,
  denial_reasons,
  denial_categories
} from '../db/schemas/index.js';
import { claims } from '../db/schemas/billing.schema.js';
import { eq, and, desc, gte, lte, sql, or } from 'drizzle-orm';
import { nanoid } from 'nanoid';
import DenialCodesService from './DenialCodes.service.js';

import { logger } from '../utils/logger.js';
/**
 * Denial Management Service
 * Phase 3C - Complete Denial Workflow Management
 *
 * Purpose: Track denied claims, calculate priority, categorize denials
 * Features:
 *   - Automated denial detection from ERA 835 files
 *   - Priority scoring and categorization
 *   - Preventability assessment
 *   - Appeal deadline tracking
 *   - Root cause analysis
 */
class DenialManagementService {
  constructor() {
    // Appeal deadline days by payer type
    this.appealDeadlines = {
      MEDICARE: 120, // 120 days for Medicare redetermination
      MEDICAID: 60,  // 60 days for Medicaid (varies by state)
      COMMERCIAL: 180, // 180 days typical for commercial
      DEFAULT: 90
    };

    // Priority scoring weights
    this.priorityWeights = {
      amount: 0.40,         // 40% weight to dollar amount
      appealability: 0.30,  // 30% weight to appeal success chance
      preventability: 0.20, // 20% weight to preventability
      daysToDeadline: 0.10  // 10% weight to urgency
    };
  }

  /**
   * Create denial from ERA payment
   * Automatically called when ERA payment has denials
   */
  async createDenialFromERA(eraPayment, userId = null) {
    try {
      const {
        id: eraPaymentId,
        claim_id: claimId,
        patient_account_number: patientAccountNumber,
        total_billed_amount: billedAmount,
        total_payment_amount: paymentAmount,
        total_allowed_amount: allowedAmount,
        adjustment_codes: adjustmentCodes,
        check_number: checkNumber,
        claim_status: claimStatus
      } = eraPayment;

      // Calculate denied amount
      const deniedAmount = billedAmount - paymentAmount;

      if (deniedAmount <= 0) {
        return null; // No denial
      }

      // Determine denial type
      const denialType = paymentAmount === 0 ? 'FULL_DENIAL' : 'PARTIAL_DENIAL';

      // Get claim details
      const [claim] = await db.select()
        .from(claims)
        .where(eq(claims.id, claimId))
        .limit(1);

      if (!claim) {
        throw new Error(`Claim not found: ${claimId}`);
      }

      // Analyze adjustment codes
      const analysis = await DenialCodesService.analyzeAdjustments(adjustmentCodes);
      const primaryCARC = adjustmentCodes[0]?.reasonCode;

      // Categorize denial
      const category = await this.categorizeDenial(primaryCARC);

      // Calculate appeal deadline
      const appealDeadline = this.calculateAppealDeadline(
        new Date(),
        claim.payer_type || 'DEFAULT'
      );

      // Assess preventability
      const preventability = await this.assessPreventability(adjustmentCodes, claim);

      // Create denial record
      const [denial] = await db.insert(claim_denials)
        .values({
          denial_id: `DN-${nanoid(12)}`,
          claim_id: claimId,
          patient_id: claim.patient_id,
          payer_id: claim.payer_id,
          denial_date: new Date(),
          era_payment_id: eraPaymentId,
          check_number: checkNumber,
          denial_type: denialType,
          denial_status: 'IDENTIFIED',
          billed_amount: billedAmount,
          denied_amount: deniedAmount,
          allowed_amount: allowedAmount,
          paid_amount: paymentAmount,
          denial_category_id: category?.id,
          primary_denial_reason: primaryCARC,
          is_preventable: preventability.isPreventable,
          preventable_reason: preventability.reason,
          root_cause: preventability.rootCause,
          is_appealable: analysis.appealable.length > 0,
          appeal_deadline: appealDeadline,
          days_until_deadline: this.calculateDaysUntilDeadline(appealDeadline),
          identified_by_id: userId
        })
        .returning();

      // Create denial reason records
      await this.createDenialReasons(denial.id, adjustmentCodes);

      // Calculate and update priority
      await this.calculatePriority(denial.id);

      return denial;
    } catch (error) {
      logger.error('Error creating denial from ERA:', error)
      throw error;
    }
  }

  /**
   * Create denial reasons from adjustment codes
   */
  async createDenialReasons(denialId, adjustmentCodes) {
    const reasons = adjustmentCodes.map((adj, index) => ({
      denial_id: denialId,
      carc_code: adj.reasonCode,
      group_code: adj.groupCode,
      adjustment_amount: adj.amount,
      adjustment_quantity: adj.quantity,
      is_primary_reason: index === 0,
      metadata: {
        originalIndex: index,
        rarcCodes: adj.rarcCodes || []
      }
    }));

    await db.insert(denial_reasons).values(reasons);
  }

  /**
   * Categorize denial based on CARC code
   */
  async categorizeDenial(carcCode) {
    if (!carcCode) return null;

    // Get all categories
    const categories = await db.select()
      .from(denial_categories)
      .where(eq(denial_categories.is_active, true));

    // Find category containing this CARC code
    for (const category of categories) {
      if (category.carc_codes && category.carc_codes.includes(carcCode)) {
        return category;
      }
    }

    return null;
  }

  /**
   * Assess if denial was preventable
   */
  async assessPreventability(adjustmentCodes, claim) {
    const preventableCategories = [
      'AUTH',          // Authorization missing
      'TIMELY',        // Timely filing
      'CODING',        // Coding errors
      'ELIGIBILITY',   // Eligibility issues
      'DUPLICATE'      // Duplicate claims
    ];

    const preventableCodes = ['197', '29', '4', '5', '11', '16', '27', '31', '18'];

    for (const adj of adjustmentCodes) {
      if (preventableCodes.includes(adj.reasonCode)) {
        const carcCode = await DenialCodesService.getCARCCode(adj.reasonCode);

        return {
          isPreventable: true,
          reason: carcCode?.description || 'Preventable denial',
          rootCause: this.determineRootCause(adj.reasonCode, claim)
        };
      }
    }

    return {
      isPreventable: false,
      reason: null,
      rootCause: null
    };
  }

  /**
   * Determine root cause of preventable denial
   */
  determineRootCause(carcCode, claim) {
    const rootCauses = {
      '197': 'Missing prior authorization - workflow failure',
      '29': 'Timely filing limit exceeded - delayed submission',
      '4': 'Incorrect modifier - coding error',
      '5': 'Invalid place of service - billing error',
      '11': 'Diagnosis/procedure mismatch - coding error',
      '16': 'Missing information - incomplete claim',
      '27': 'Coverage terminated - eligibility verification failure',
      '31': 'Patient not identified - demographic data error',
      '18': 'Duplicate claim - billing system issue'
    };

    return rootCauses[carcCode] || 'Unknown root cause';
  }

  /**
   * Calculate appeal deadline
   */
  calculateAppealDeadline(denialDate, payerType) {
    const days = this.appealDeadlines[payerType] || this.appealDeadlines.DEFAULT;
    const deadline = new Date(denialDate);
    deadline.setDate(deadline.getDate() + days);
    return deadline;
  }

  /**
   * Calculate days until deadline
   */
  calculateDaysUntilDeadline(deadline) {
    if (!deadline) return null;

    const now = new Date();
    const deadlineDate = new Date(deadline);
    const diffTime = deadlineDate - now;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    return diffDays;
  }

  /**
   * Calculate priority score for denial
   * Score 0-100 based on amount, appealability, preventability, urgency
   */
  async calculatePriority(denialId) {
    const [denial] = await db.select()
      .from(claim_denials)
      .where(eq(claim_denials.id, denialId))
      .limit(1);

    if (!denial) return;

    // Amount score (0-100, normalized to max $50k)
    const maxAmount = 5000000; // $50,000 in cents
    const amountScore = Math.min((denial.denied_amount / maxAmount) * 100, 100);

    // Appealability score (0-100)
    let appealabilityScore = 0;
    if (denial.is_appealable) {
      const carcCode = await DenialCodesService.getCARCCode(denial.primary_denial_reason);
      appealabilityScore = carcCode?.average_appeal_success_rate || 50;
    }

    // Preventability score (100 if preventable, 0 if not)
    const preventabilityScore = denial.is_preventable ? 100 : 0;

    // Urgency score based on days to deadline (0-100)
    const daysRemaining = denial.days_until_deadline || 0;
    let urgencyScore = 0;
    if (daysRemaining > 0) {
      urgencyScore = Math.max(0, 100 - (daysRemaining / 120) * 100);
    } else {
      urgencyScore = 100; // Past deadline
    }

    // Weighted total score
    const priorityScore = Math.round(
      (amountScore * this.priorityWeights.amount) +
      (appealabilityScore * this.priorityWeights.appealability) +
      (preventabilityScore * this.priorityWeights.preventability) +
      (urgencyScore * this.priorityWeights.daysToDeadline)
    );

    // Determine priority level
    let priorityLevel;
    if (priorityScore >= 80) priorityLevel = 'CRITICAL';
    else if (priorityScore >= 60) priorityLevel = 'HIGH';
    else if (priorityScore >= 40) priorityLevel = 'MEDIUM';
    else priorityLevel = 'LOW';

    // Update denial
    await db.update(claim_denials)
      .set({
        priority_score: priorityScore,
        priority_level: priorityLevel,
        updated_at: new Date()
      })
      .where(eq(claim_denials.id, denialId));

    return { priorityScore, priorityLevel };
  }

  /**
   * Get denial by ID
   */
  async getDenial(denialId) {
    const [denial] = await db.select()
      .from(claim_denials)
      .where(eq(claim_denials.id, denialId))
      .limit(1);

    if (!denial) return null;

    // Get denial reasons
    const reasons = await db.select()
      .from(denial_reasons)
      .where(eq(denial_reasons.denial_id, denialId));

    return {
      ...denial,
      reasons
    };
  }

  /**
   * Get denials requiring action
   * Returns denials that need review, assignment, or appeal decision
   */
  async getDenialsRequiringAction(filters = {}) {
    let query = db.select()
      .from(claim_denials)
      .where(
        or(
          eq(claim_denials.denial_status, 'IDENTIFIED'),
          eq(claim_denials.denial_status, 'UNDER_REVIEW'),
          and(
            eq(claim_denials.is_appealable, true),
            eq(claim_denials.will_appeal, null)
          )
        )
      );

    if (filters.priorityLevel) {
      query = query.where(eq(claim_denials.priority_level, filters.priorityLevel));
    }

    if (filters.assignedTo) {
      query = query.where(eq(claim_denials.assigned_to_id, filters.assignedTo));
    }

    const denials = await query
      .orderBy(desc(claim_denials.priority_score))
      .limit(filters.limit || 50);

    return denials;
  }

  /**
   * Assign denial to user
   */
  async assignDenial(denialId, userId, assignedBy) {
    await db.update(claim_denials)
      .set({
        assigned_to_id: userId,
        assigned_at: new Date(),
        assigned_by_id: assignedBy,
        denial_status: 'UNDER_REVIEW',
        updated_at: new Date()
      })
      .where(eq(claim_denials.id, denialId));
  }

  /**
   * Mark denial for appeal
   */
  async markForAppeal(denialId, decision, userId) {
    const { willAppeal, reason } = decision;

    await db.update(claim_denials)
      .set({
        will_appeal: willAppeal,
        appeal_decision_date: new Date(),
        appeal_decision_by_id: userId,
        appeal_decision_reason: reason,
        denial_status: willAppeal ? 'APPEALING' : 'RESOLVED',
        updated_at: new Date()
      })
      .where(eq(claim_denials.id, denialId));
  }

  /**
   * Resolve denial without appeal
   */
  async resolveDenial(denialId, resolution, userId) {
    const {
      resolutionType,
      resolutionAmount,
      notes
    } = resolution;

    await db.update(claim_denials)
      .set({
        resolved_date: new Date(),
        resolved_by_id: userId,
        resolution_type: resolutionType,
        resolution_amount: resolutionAmount || 0,
        resolution_notes: notes,
        denial_status: 'RESOLVED',
        updated_at: new Date()
      })
      .where(eq(claim_denials.id, denialId));
  }

  /**
   * Get denial statistics
   */
  async getDenialStats(filters = {}) {
    const { startDate, endDate, payerId } = filters;

    let whereConditions = [];

    if (startDate && endDate) {
      whereConditions.push(
        and(
          gte(claim_denials.denial_date, startDate),
          lte(claim_denials.denial_date, endDate)
        )
      );
    }

    if (payerId) {
      whereConditions.push(eq(claim_denials.payer_id, payerId));
    }

    const stats = await db.select({
      totalDenials: sql`COUNT(*)::int`,
      totalDeniedAmount: sql`SUM(${claim_denials.denied_amount})::bigint`,
      fullDenials: sql`COUNT(CASE WHEN ${claim_denials.denial_type} = 'FULL_DENIAL' THEN 1 END)::int`,
      partialDenials: sql`COUNT(CASE WHEN ${claim_denials.denial_type} = 'PARTIAL_DENIAL' THEN 1 END)::int`,
      preventableDenials: sql`COUNT(CASE WHEN ${claim_denials.is_preventable} = true THEN 1 END)::int`,
      appealableDenials: sql`COUNT(CASE WHEN ${claim_denials.is_appealable} = true THEN 1 END)::int`,
      criticalPriority: sql`COUNT(CASE WHEN ${claim_denials.priority_level} = 'CRITICAL' THEN 1 END)::int`,
      highPriority: sql`COUNT(CASE WHEN ${claim_denials.priority_level} = 'HIGH' THEN 1 END)::int`
    })
      .from(claim_denials)
      .where(whereConditions.length > 0 ? and(...whereConditions) : undefined);

    return stats[0];
  }

  /**
   * Get top denial reasons
   */
  async getTopDenialReasons(limit = 10, filters = {}) {
    const { startDate, endDate } = filters;

    const reasons = await db.select({
      carcCode: denial_reasons.carc_code,
      count: sql`COUNT(*)::int`,
      totalAmount: sql`SUM(${denial_reasons.adjustment_amount})::bigint`
    })
      .from(denial_reasons)
      .innerJoin(claim_denials, eq(denial_reasons.denial_id, claim_denials.id))
      .where(
        startDate && endDate
          ? and(
              gte(claim_denials.denial_date, startDate),
              lte(claim_denials.denial_date, endDate)
            )
          : undefined
      )
      .groupBy(denial_reasons.carc_code)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(limit);

    // Enrich with CARC code details
    const enriched = await Promise.all(
      reasons.map(async (reason) => {
        const carcCode = await DenialCodesService.getCARCCode(reason.carcCode);
        return {
          ...reason,
          description: carcCode?.description,
          isAppealable: carcCode?.is_appealable,
          recommendedAction: carcCode?.recommended_action
        };
      })
    );

    return enriched;
  }
}

export default new DenialManagementService();
