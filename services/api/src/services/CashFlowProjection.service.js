import { db } from '../db/index.js';
import {
  cash_flow_projections,
  revenue_accruals,
  collection_forecasts
} from '../db/schemas/index.js';
import { eq, and, gte, lte, sql } from 'drizzle-orm';
import RevenueForecastingService from './RevenueForecasting.service.js';

import { logger } from '../utils/logger.js';
/**
 * Cash Flow Projection Service
 * Phase 3D - Cash Flow Forecasting & Working Capital Analysis
 *
 * Purpose: Project cash collections and manage working capital needs
 * Features:
 *   - Short-term (weekly) cash flow projections
 *   - Long-term (monthly/quarterly) projections
 *   - Working capital analysis
 *   - Sensitivity analysis (best/worst case)
 *   - Variance tracking and accuracy metrics
 */
class CashFlowProjectionService {
  /**
   * Create cash flow projection
   */
  async createProjection(projectionForPeriod, projectionType = 'SHORT_TERM', options = {}, userId = null) {
    try {
      const {
        weeksAhead = 4,
        monthsAhead = 3,
        includeOutflows = false,
        sensitivityScenarios = false
      } = options;

      // Get projected collections based on outstanding AR and forecasts
      const projectedCollections = await this.projectCollections(projectionForPeriod, projectionType);

      // Estimate appeal recoveries
      const projectedAppealRecoveries = Math.round(projectedCollections * 0.05); // 5% from appeals

      // Calculate total inflows
      const totalProjectedInflows = projectedCollections + projectedAppealRecoveries;

      // Project outflows (if requested)
      let totalProjectedOutflows = 0;
      let projectedPayroll = 0;
      let projectedVendorPayments = 0;

      if (includeOutflows) {
        const outflows = await this.projectOutflows(projectionForPeriod);
        totalProjectedOutflows = outflows.total;
        projectedPayroll = outflows.payroll;
        projectedVendorPayments = outflows.vendorPayments;
      }

      // Net cash flow
      const projectedNetCashFlow = totalProjectedInflows - totalProjectedOutflows;

      // Project AR and working capital
      const { projectedAR, projectedWorkingCapital } = await this.projectWorkingCapital(projectionForPeriod);

      // Calculate confidence based on data quality
      const { confidenceLevel, confidencePercentage } = this.calculateConfidence(projectionType);

      // Assumptions
      const assumptions = {
        projectionType,
        weeksAhead,
        monthsAhead,
        collectionAssumptions: {
          expectedCollectionRate: 0.85,
          averageDaysToPayment: 32,
          appealRecoveryRate: 0.05
        }
      };

      // Sensitivity analysis
      let sensitivityAnalysis = null;
      if (sensitivityScenarios) {
        sensitivityAnalysis = this.performSensitivityAnalysis(projectedCollections);
      }

      // Create projection record
      const [projection] = await db.insert(cash_flow_projections)
        .values({
          projection_date: new Date(),
          projection_for_period: projectionForPeriod,
          projection_type: projectionType,
          weeks_ahead: weeksAhead,
          months_ahead: monthsAhead,
          projected_collections: projectedCollections,
          projected_appeal_recoveries: projectedAppealRecoveries,
          total_projected_inflows: totalProjectedInflows,
          projected_payroll: projectedPayroll,
          projected_vendor_payments: projectedVendorPayments,
          total_projected_outflows: totalProjectedOutflows,
          projected_net_cash_flow: projectedNetCashFlow,
          projected_ar: projectedAR,
          projected_working_capital: projectedWorkingCapital,
          confidence_level: confidenceLevel,
          confidence_percentage: confidencePercentage,
          methodology: projectionType === 'SHORT_TERM' ? 'AR_AGING_ANALYSIS' : 'HISTORICAL_TREND_ANALYSIS',
          assumptions,
          sensitivity_analysis: sensitivityAnalysis,
          created_by_id: userId
        })
        .returning();

      return projection;
    } catch (error) {
      logger.error('Error creating cash flow projection:', error)
      throw error;
    }
  }

  /**
   * Project collections based on AR aging and payment patterns
   */
  async projectCollections(projectionForPeriod, projectionType) {
    if (projectionType === 'SHORT_TERM') {
      // Use AR aging for short-term (next 4 weeks)
      return await this.projectCollectionsFromAR();
    } else {
      // Use historical trends for long-term
      return await this.projectCollectionsFromTrends(projectionForPeriod);
    }
  }

  /**
   * Project collections from AR aging (short-term)
   */
  async projectCollectionsFromAR() {
    // Get outstanding AR
    const outstandingAR = await db.select({
      total: sql`SUM(${revenue_accruals.accrued_amount} - ${revenue_accruals.collected_amount} - ${revenue_accruals.written_off_amount})::bigint`
    })
      .from(revenue_accruals)
      .where(
        sql`${revenue_accruals.accrued_amount} > ${revenue_accruals.collected_amount} + ${revenue_accruals.written_off_amount}`
      );

    const totalAR = outstandingAR[0]?.total || 0;

    // Assume 30% of AR will be collected in next 4 weeks (based on typical payment patterns)
    const expectedCollections = Math.round(totalAR * 0.30);

    return expectedCollections;
  }

  /**
   * Project collections from historical trends (long-term)
   */
  async projectCollectionsFromTrends(projectionForPeriod) {
    // Get recent historical collections
    const historical = await RevenueForecastingService.getHistoricalCollections(6);

    if (historical.length === 0) return 0;

    // Calculate average
    const avgCollections = historical.reduce((sum, h) => sum + (h.totalCollected || 0), 0) / historical.length;

    // Apply growth trend if detected
    const growthRate = this.calculateGrowthRate(historical);
    const projectedCollections = Math.round(avgCollections * (1 + growthRate));

    return projectedCollections;
  }

  /**
   * Calculate growth rate from historical data
   */
  calculateGrowthRate(historical) {
    if (historical.length < 2) return 0;

    const firstHalf = historical.slice(0, Math.floor(historical.length / 2));
    const secondHalf = historical.slice(Math.floor(historical.length / 2));

    const avgFirst = firstHalf.reduce((sum, h) => sum + (h.totalCollected || 0), 0) / firstHalf.length;
    const avgSecond = secondHalf.reduce((sum, h) => sum + (h.totalCollected || 0), 0) / secondHalf.length;

    if (avgFirst === 0) return 0;

    const growthRate = (avgSecond - avgFirst) / avgFirst;
    return Math.max(-0.2, Math.min(0.2, growthRate)); // Cap at +/- 20%
  }

  /**
   * Project outflows (simplified - would integrate with AP system)
   */
  async projectOutflows(projectionForPeriod) {
    // This is simplified - in production would pull from AP system
    // Assume typical monthly expenses
    const projectedPayroll = 500000000; // $5M in cents
    const projectedVendorPayments = 200000000; // $2M in cents
    const projectedOtherExpenses = 100000000; // $1M in cents

    return {
      payroll: projectedPayroll,
      vendorPayments: projectedVendorPayments,
      otherExpenses: projectedOtherExpenses,
      total: projectedPayroll + projectedVendorPayments + projectedOtherExpenses
    };
  }

  /**
   * Project working capital (AR - AP)
   */
  async projectWorkingCapital(projectionForPeriod) {
    // Get current AR
    const currentAR = await db.select({
      total: sql`SUM(${revenue_accruals.accrued_amount} - ${revenue_accruals.collected_amount} - ${revenue_accruals.written_off_amount})::bigint`
    })
      .from(revenue_accruals)
      .where(
        sql`${revenue_accruals.accrued_amount} > ${revenue_accruals.collected_amount} + ${revenue_accruals.written_off_amount}`
      );

    const projectedAR = currentAR[0]?.total || 0;

    // AP projection (simplified)
    const projectedAP = 300000000; // $3M in cents

    const projectedWorkingCapital = projectedAR - projectedAP;

    return {
      projectedAR,
      projectedAP,
      projectedWorkingCapital
    };
  }

  /**
   * Calculate confidence level
   */
  calculateConfidence(projectionType) {
    // Short-term projections more confident due to known AR
    if (projectionType === 'SHORT_TERM') {
      return {
        confidenceLevel: 'HIGH',
        confidencePercentage: 8500 // 85%
      };
    } else {
      return {
        confidenceLevel: 'MEDIUM',
        confidencePercentage: 7000 // 70%
      };
    }
  }

  /**
   * Perform sensitivity analysis (best/worst case scenarios)
   */
  performSensitivityAnalysis(baseProjection) {
    return {
      bestCase: {
        scenario: 'OPTIMISTIC',
        projectedCollections: Math.round(baseProjection * 1.15), // 15% better
        assumptions: {
          collectionRate: 0.95,
          averageDaysToPayment: 25,
          denialRate: 0.08
        }
      },
      baseCase: {
        scenario: 'EXPECTED',
        projectedCollections: baseProjection,
        assumptions: {
          collectionRate: 0.85,
          averageDaysToPayment: 32,
          denialRate: 0.12
        }
      },
      worstCase: {
        scenario: 'PESSIMISTIC',
        projectedCollections: Math.round(baseProjection * 0.80), // 20% worse
        assumptions: {
          collectionRate: 0.70,
          averageDaysToPayment: 45,
          denialRate: 0.20
        }
      }
    };
  }

  /**
   * Update projection with actual results
   */
  async updateProjectionActuals(projectionId, actualCollections, actualNetCashFlow) {
    const [projection] = await db.select()
      .from(cash_flow_projections)
      .where(eq(cash_flow_projections.id, projectionId))
      .limit(1);

    if (!projection) {
      throw new Error(`Projection not found: ${projectionId}`);
    }

    const varianceAmount = actualCollections - projection.projected_collections;
    const variancePercentage = projection.projected_collections > 0
      ? Math.round((varianceAmount / projection.projected_collections) * 10000)
      : 0;

    await db.update(cash_flow_projections)
      .set({
        actual_collections: actualCollections,
        actual_net_cash_flow: actualNetCashFlow,
        variance_amount: varianceAmount,
        variance_percentage: variancePercentage,
        updated_at: new Date()
      })
      .where(eq(cash_flow_projections.id, projectionId));
  }

  /**
   * Get rolling 13-week cash flow projection
   */
  async getRolling13WeekProjection(userId = null) {
    const projections = [];

    // Create weekly projections for next 13 weeks
    for (let week = 0; week < 13; week++) {
      const projectionDate = new Date();
      projectionDate.setDate(projectionDate.getDate() + (week * 7));

      const periodLabel = projectionDate.toISOString().substring(0, 7); // YYYY-MM

      const projection = await this.createProjection(
        periodLabel,
        'SHORT_TERM',
        { weeksAhead: 1 },
        userId
      );

      projections.push(projection);
    }

    return projections;
  }

  /**
   * Get cash flow summary
   */
  async getCashFlowSummary(startPeriod, endPeriod) {
    const projections = await db.select()
      .from(cash_flow_projections)
      .where(
        and(
          gte(cash_flow_projections.projection_for_period, startPeriod),
          lte(cash_flow_projections.projection_for_period, endPeriod)
        )
      );

    const summary = {
      totalProjectedInflows: 0,
      totalProjectedOutflows: 0,
      totalProjectedNetCashFlow: 0,
      totalActualCollections: 0,
      averageVariancePercentage: 0,
      projectionCount: projections.length
    };

    projections.forEach(p => {
      summary.totalProjectedInflows += p.total_projected_inflows || 0;
      summary.totalProjectedOutflows += p.total_projected_outflows || 0;
      summary.totalProjectedNetCashFlow += p.projected_net_cash_flow || 0;
      summary.totalActualCollections += p.actual_collections || 0;
    });

    // Calculate average variance
    const completedProjections = projections.filter(p => p.actual_collections !== null);
    if (completedProjections.length > 0) {
      const avgVariance = completedProjections.reduce((sum, p) => sum + Math.abs(p.variance_percentage || 0), 0) / completedProjections.length;
      summary.averageVariancePercentage = avgVariance / 100; // Convert from basis points
    }

    return summary;
  }
}

export default new CashFlowProjectionService();
