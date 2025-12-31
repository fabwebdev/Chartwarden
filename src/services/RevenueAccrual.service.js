import { db } from '../db/index.js';
import {
  revenue_accruals,
  revenue_adjustments,
  revenue_recognition_periods
} from '../db/schemas/index.js';
import { claims } from '../db/schemas/billing.schema.js';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';
import { nanoid } from 'nanoid';

import { logger } from '../utils/logger.js';
/**
 * Revenue Accrual Service
 * Phase 3D - Revenue Recognition & Accrual Management
 *
 * Purpose: Track expected revenue as claims progress through lifecycle
 * Features:
 *   - Automatic accrual creation on claim submission
 *   - Expected reimbursement calculation
 *   - Revenue recognition upon service delivery
 *   - Integration with ERA payments and denials
 *   - Period close and AR aging
 *   - GAAP-compliant revenue recognition
 */
class RevenueAccrualService {
  constructor() {
    // Recognition methods
    this.recognitionMethods = {
      ON_SERVICE: 'ON_SERVICE',         // Recognize when service delivered
      ON_SUBMISSION: 'ON_SUBMISSION',   // Recognize when claim submitted
      ON_PAYMENT: 'ON_PAYMENT'          // Recognize only when payment received (cash basis)
    };

    // Contract rate types
    this.contractRateTypes = {
      PER_DIEM: 'PER_DIEM',       // Daily rate
      FFS: 'FFS',                 // Fee for service
      CAPITATED: 'CAPITATED',     // Fixed monthly rate
      BUNDLED: 'BUNDLED'          // Episode-based payment
    };

    // Default collection probabilities by payer type (basis points)
    this.defaultCollectionProbability = {
      MEDICARE: 9500,      // 95%
      MEDICAID: 9000,      // 90%
      COMMERCIAL: 8500,    // 85%
      PRIVATE_PAY: 7000,   // 70%
      DEFAULT: 8000        // 80%
    };
  }

  /**
   * Create revenue accrual for a claim
   * Called when claim is submitted
   */
  async createAccrualForClaim(claimId, userId = null) {
    try {
      // Get claim details
      const [claim] = await db.select()
        .from(claims)
        .where(eq(claims.id, claimId))
        .limit(1);

      if (!claim) {
        throw new Error(`Claim not found: ${claimId}`);
      }

      // Calculate expected reimbursement
      const expectedReimbursement = await this.calculateExpectedReimbursement(claim);

      // Determine recognition method (default: ON_SERVICE for hospice)
      const recognitionMethod = claim.service_type === 'HOSPICE'
        ? this.recognitionMethods.ON_SERVICE
        : this.recognitionMethods.ON_SUBMISSION;

      // Calculate collection probability
      const collectionProbability = await this.calculateCollectionProbability(claim);

      // Determine revenue period (service month)
      const serviceMonth = claim.date_of_service_from.substring(0, 7); // YYYY-MM
      const fiscalYear = parseInt(serviceMonth.substring(0, 4));
      const month = parseInt(serviceMonth.substring(5, 7));
      const fiscalQuarter = Math.ceil(month / 3);

      // Create accrual
      const [accrual] = await db.insert(revenue_accruals)
        .values({
          accrual_id: `ACCR-${nanoid(12)}`,
          claim_id: claimId,
          patient_id: claim.patient_id,
          payer_id: claim.payer_id,
          accrual_date: new Date(),
          service_date_from: claim.date_of_service_from,
          service_date_to: claim.date_of_service_to,
          service_month: serviceMonth,
          billed_amount: claim.total_charge || 0,
          expected_reimbursement: expectedReimbursement.amount,
          accrued_amount: expectedReimbursement.amount,
          recognition_method: recognitionMethod,
          recognition_status: 'ACCRUED',
          recognition_date: recognitionMethod === this.recognitionMethods.ON_SERVICE
            ? claim.date_of_service_from
            : new Date(),
          contract_rate_type: expectedReimbursement.rateType,
          expected_payment_days: expectedReimbursement.expectedDays,
          confidence_level: expectedReimbursement.confidence,
          collection_probability: collectionProbability,
          revenue_period: serviceMonth,
          fiscal_year: fiscalYear,
          fiscal_quarter: fiscalQuarter,
          calculation_method: expectedReimbursement.calculationMethod,
          assumptions: expectedReimbursement.assumptions,
          created_by_id: userId
        })
        .returning();

      return accrual;
    } catch (error) {
      logger.error('Error creating revenue accrual:', error)
      throw error;
    }
  }

  /**
   * Calculate expected reimbursement based on payer contracts
   */
  async calculateExpectedReimbursement(claim) {
    // This is a simplified version - in production, would look up actual contract rates
    let amount = claim.total_charge || 0;
    let rateType = this.contractRateTypes.FFS;
    let expectedDays = 30;
    let confidence = 'MEDIUM';
    let calculationMethod = 'Default calculation';
    let assumptions = {};

    // Medicare typically pays ~90-95% of billed charges for hospice
    if (claim.payer_type === 'MEDICARE') {
      amount = Math.round((claim.total_charge || 0) * 0.93); // 93% collection rate
      rateType = this.contractRateTypes.PER_DIEM;
      expectedDays = 25; // Medicare typically pays faster
      confidence = 'HIGH';
      calculationMethod = 'Medicare per-diem rate calculation';
      assumptions = {
        payerType: 'MEDICARE',
        contractRate: 0.93,
        perDiemRate: true
      };
    }
    // Medicaid varies by state but typically 80-85%
    else if (claim.payer_type === 'MEDICAID') {
      amount = Math.round((claim.total_charge || 0) * 0.82); // 82% collection rate
      rateType = this.contractRateTypes.PER_DIEM;
      expectedDays = 40; // Medicaid can be slower
      confidence = 'MEDIUM';
      calculationMethod = 'Medicaid per-diem rate calculation';
      assumptions = {
        payerType: 'MEDICAID',
        contractRate: 0.82,
        stateVariance: true
      };
    }
    // Commercial payers typically 75-85% due to contract negotiations
    else if (claim.payer_type === 'COMMERCIAL') {
      amount = Math.round((claim.total_charge || 0) * 0.80); // 80% collection rate
      rateType = this.contractRateTypes.FFS;
      expectedDays = 35;
      confidence = 'MEDIUM';
      calculationMethod = 'Commercial contract rate estimation';
      assumptions = {
        payerType: 'COMMERCIAL',
        contractRate: 0.80,
        negotiatedRate: true
      };
    }

    return {
      amount,
      rateType,
      expectedDays,
      confidence,
      calculationMethod,
      assumptions
    };
  }

  /**
   * Calculate collection probability based on payer history
   */
  async calculateCollectionProbability(claim) {
    // In production, would look up actual payer payment patterns
    // For now, use defaults by payer type
    return this.defaultCollectionProbability[claim.payer_type]
      || this.defaultCollectionProbability.DEFAULT;
  }

  /**
   * Update accrual when payment is received
   */
  async updateAccrualFromPayment(claimId, paymentAmount, eraPaymentId, userId = null) {
    const [accrual] = await db.select()
      .from(revenue_accruals)
      .where(eq(revenue_accruals.claim_id, claimId))
      .limit(1);

    if (!accrual) {
      throw new Error(`Accrual not found for claim: ${claimId}`);
    }

    // Update collected amount
    const newCollectedAmount = (accrual.collected_amount || 0) + paymentAmount;

    await db.update(revenue_accruals)
      .set({
        collected_amount: newCollectedAmount,
        recognition_status: newCollectedAmount >= accrual.accrued_amount ? 'COLLECTED' : 'PARTIALLY_COLLECTED',
        updated_at: new Date()
      })
      .where(eq(revenue_accruals.id, accrual.id));

    // If payment is less than expected, create adjustment
    if (paymentAmount < accrual.expected_reimbursement) {
      const adjustmentAmount = paymentAmount - accrual.expected_reimbursement;

      await this.createAdjustment({
        accrualId: accrual.id,
        claimId,
        adjustmentType: 'CONTRACTUAL',
        adjustmentAmount,
        reason: 'Contractual adjustment from ERA payment',
        sourceType: 'ERA',
        eraPaymentId,
        userId
      });
    }
  }

  /**
   * Create revenue adjustment
   */
  async createAdjustment(adjustmentData) {
    const {
      accrualId,
      claimId,
      adjustmentType,
      adjustmentAmount,
      reason,
      sourceType = 'MANUAL',
      sourceReferenceId = null,
      denialId = null,
      appealId = null,
      eraPaymentId = null,
      impactsCurrentPeriod = true,
      requiresApproval = false,
      userId = null
    } = adjustmentData;

    // Get accrual to determine period
    const [accrual] = await db.select()
      .from(revenue_accruals)
      .where(eq(revenue_accruals.id, accrualId))
      .limit(1);

    const periodImpacted = impactsCurrentPeriod
      ? accrual.revenue_period
      : new Date().toISOString().substring(0, 7);

    const [adjustment] = await db.insert(revenue_adjustments)
      .values({
        accrual_id: accrualId,
        claim_id: claimId,
        adjustment_date: new Date(),
        adjustment_type: adjustmentType,
        adjustment_amount: adjustmentAmount,
        reason,
        source_type: sourceType,
        source_reference_id: sourceReferenceId,
        denial_id: denialId,
        appeal_id: appealId,
        era_payment_id: eraPaymentId,
        impacts_current_period: impactsCurrentPeriod,
        period_impacted: periodImpacted,
        requires_approval: requiresApproval,
        approved: !requiresApproval, // Auto-approve if not required
        created_by_id: userId
      })
      .returning();

    // Update accrual adjusted amount
    const newAdjustedAmount = (accrual.adjusted_amount || 0) + adjustmentAmount;
    await db.update(revenue_accruals)
      .set({
        adjusted_amount: newAdjustedAmount,
        updated_at: new Date()
      })
      .where(eq(revenue_accruals.id, accrualId));

    return adjustment;
  }

  /**
   * Write off uncollectible balance
   */
  async writeOffBalance(accrualId, writeOffAmount, reason, userId) {
    const [accrual] = await db.select()
      .from(revenue_accruals)
      .where(eq(revenue_accruals.id, accrualId))
      .limit(1);

    if (!accrual) {
      throw new Error(`Accrual not found: ${accrualId}`);
    }

    // Create write-off adjustment
    await this.createAdjustment({
      accrualId,
      claimId: accrual.claim_id,
      adjustmentType: 'WRITE_OFF',
      adjustmentAmount: -writeOffAmount, // Negative to reduce revenue
      reason,
      sourceType: 'MANUAL',
      requiresApproval: writeOffAmount > 100000, // Require approval for write-offs over $1000
      userId
    });

    // Update accrual
    const newWrittenOffAmount = (accrual.written_off_amount || 0) + writeOffAmount;
    await db.update(revenue_accruals)
      .set({
        written_off_amount: newWrittenOffAmount,
        recognition_status: 'WRITTEN_OFF',
        updated_at: new Date()
      })
      .where(eq(revenue_accruals.id, accrualId));
  }

  /**
   * Close revenue period (monthly/quarterly close)
   */
  async closePeriod(periodLabel, periodType = 'MONTHLY', userId) {
    // Calculate period dates
    const { periodStart, periodEnd, fiscalYear, fiscalQuarter } = this.parsePeriodLabel(periodLabel, periodType);

    // Get all accruals for period
    const accruals = await db.select()
      .from(revenue_accruals)
      .where(eq(revenue_accruals.revenue_period, periodLabel));

    // Calculate totals
    const totals = accruals.reduce((acc, accrual) => {
      acc.totalBilled += accrual.billed_amount || 0;
      acc.totalAccrued += accrual.accrued_amount || 0;
      acc.totalCollected += accrual.collected_amount || 0;
      acc.totalWrittenOff += accrual.written_off_amount || 0;
      acc.totalAdjusted += accrual.adjusted_amount || 0;
      return acc;
    }, {
      totalBilled: 0,
      totalAccrued: 0,
      totalCollected: 0,
      totalWrittenOff: 0,
      totalAdjusted: 0
    });

    const netRevenue = totals.totalAccrued + totals.totalAdjusted - totals.totalWrittenOff;

    // Get AR aging
    const arAging = await this.calculateARAging(periodEnd);

    // Calculate DSO
    const dso = await this.calculateDSO(periodLabel);

    // Create or update period record
    const [period] = await db.insert(revenue_recognition_periods)
      .values({
        period_type: periodType,
        period_start: periodStart,
        period_end: periodEnd,
        period_label: periodLabel,
        fiscal_year: fiscalYear,
        fiscal_quarter: fiscalQuarter,
        status: 'CLOSED',
        closed_date: new Date(),
        closed_by_id: userId,
        total_billed: totals.totalBilled,
        total_accrued: totals.totalAccrued,
        total_collected: totals.totalCollected,
        total_written_off: totals.totalWrittenOff,
        total_adjustments: totals.totalAdjusted,
        net_revenue: netRevenue,
        total_claims: accruals.length,
        days_sales_outstanding: dso,
        ar_aging_0_30: arAging.aging_0_30,
        ar_aging_31_60: arAging.aging_31_60,
        ar_aging_61_90: arAging.aging_61_90,
        ar_aging_91_120: arAging.aging_91_120,
        ar_aging_over_120: arAging.aging_over_120,
        ending_ar: arAging.total_ar
      })
      .returning();

    return period;
  }

  /**
   * Calculate AR aging buckets
   */
  async calculateARAging(asOfDate) {
    const asOf = new Date(asOfDate);

    // Get all outstanding accruals
    const accruals = await db.select()
      .from(revenue_accruals)
      .where(
        and(
          sql`${revenue_accruals.accrued_amount} > ${revenue_accruals.collected_amount} + ${revenue_accruals.written_off_amount}`,
          lte(revenue_accruals.service_date_from, asOf)
        )
      );

    const aging = {
      aging_0_30: 0,
      aging_31_60: 0,
      aging_61_90: 0,
      aging_91_120: 0,
      aging_over_120: 0,
      total_ar: 0
    };

    accruals.forEach(accrual => {
      const outstandingBalance = accrual.accrued_amount - (accrual.collected_amount || 0) - (accrual.written_off_amount || 0);
      const serviceDate = new Date(accrual.service_date_from);
      const daysOld = Math.floor((asOf - serviceDate) / (1000 * 60 * 60 * 24));

      if (daysOld <= 30) {
        aging.aging_0_30 += outstandingBalance;
      } else if (daysOld <= 60) {
        aging.aging_31_60 += outstandingBalance;
      } else if (daysOld <= 90) {
        aging.aging_61_90 += outstandingBalance;
      } else if (daysOld <= 120) {
        aging.aging_91_120 += outstandingBalance;
      } else {
        aging.aging_over_120 += outstandingBalance;
      }

      aging.total_ar += outstandingBalance;
    });

    return aging;
  }

  /**
   * Calculate Days Sales Outstanding (DSO)
   */
  async calculateDSO(periodLabel) {
    // DSO = (Accounts Receivable / Total Revenue) × Number of Days

    const [period] = await db.select()
      .from(revenue_recognition_periods)
      .where(eq(revenue_recognition_periods.period_label, periodLabel))
      .limit(1);

    if (!period || !period.total_accrued) return null;

    const daysInPeriod = 30; // Approximate for monthly
    const ar = period.ending_ar || 0;
    const revenue = period.total_accrued || 1; // Avoid division by zero

    const dso = (ar / revenue) * daysInPeriod;
    return Math.round(dso * 100) / 100; // Round to 2 decimals
  }

  /**
   * Parse period label to get dates
   */
  parsePeriodLabel(periodLabel, periodType) {
    let periodStart, periodEnd, fiscalYear, fiscalQuarter;

    if (periodType === 'MONTHLY') {
      // Format: YYYY-MM
      const [year, month] = periodLabel.split('-').map(Number);
      periodStart = new Date(year, month - 1, 1);
      periodEnd = new Date(year, month, 0); // Last day of month
      fiscalYear = year;
      fiscalQuarter = Math.ceil(month / 3);
    } else if (periodType === 'QUARTERLY') {
      // Format: YYYY-Q1
      const [year, quarter] = periodLabel.split('-Q').map(Number);
      const startMonth = (quarter - 1) * 3;
      periodStart = new Date(year, startMonth, 1);
      periodEnd = new Date(year, startMonth + 3, 0);
      fiscalYear = year;
      fiscalQuarter = quarter;
    }

    return { periodStart, periodEnd, fiscalYear, fiscalQuarter };
  }

  /**
   * Get accruals for a period
   */
  async getAccrualsForPeriod(periodLabel, filters = {}) {
    let query = db.select()
      .from(revenue_accruals)
      .where(eq(revenue_accruals.revenue_period, periodLabel));

    if (filters.payerId) {
      query = query.where(eq(revenue_accruals.payer_id, filters.payerId));
    }

    if (filters.status) {
      query = query.where(eq(revenue_accruals.recognition_status, filters.status));
    }

    const accruals = await query.orderBy(desc(revenue_accruals.accrual_date));

    return accruals;
  }

  /**
   * Get revenue summary
   */
  async getRevenueSummary(startDate, endDate) {
    const summary = await db.select({
      totalBilled: sql`SUM(${revenue_accruals.billed_amount})::bigint`,
      totalAccrued: sql`SUM(${revenue_accruals.accrued_amount})::bigint`,
      totalCollected: sql`SUM(${revenue_accruals.collected_amount})::bigint`,
      totalAdjusted: sql`SUM(${revenue_accruals.adjusted_amount})::bigint`,
      totalWrittenOff: sql`SUM(${revenue_accruals.written_off_amount})::bigint`,
      totalClaims: sql`COUNT(*)::int`
    })
      .from(revenue_accruals)
      .where(
        and(
          gte(revenue_accruals.service_date_from, startDate),
          lte(revenue_accruals.service_date_from, endDate)
        )
      );

    const result = summary[0];
    return {
      ...result,
      netRevenue: (result.totalAccrued || 0) + (result.totalAdjusted || 0) - (result.totalWrittenOff || 0)
    };
  }
}

export default new RevenueAccrualService();
