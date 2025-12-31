import { db } from '../db/index.js';
import {
  denial_analytics,
  claim_denials,
  appeal_cases,
  denial_reasons
} from '../db/schemas/index.js';
import { claims } from '../db/schemas/billing.schema.js';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
/**
 * Denial Analytics Service
 * Phase 3C - Pre-calculated Denial Metrics for Reporting
 *
 * Purpose: Calculate and store denial analytics for dashboards and reports
 * Features:
 *   - Period-based aggregation (daily, weekly, monthly, quarterly, yearly)
 *   - Denial rate calculation
 *   - Appeal success rate tracking
 *   - Recovery rate metrics
 *   - Trend analysis
 *   - Payer, category, and CARC code breakdowns
 */
class DenialAnalyticsService {
  constructor() {
    this.periodTypes = {
      DAILY: 'DAILY',
      WEEKLY: 'WEEKLY',
      MONTHLY: 'MONTHLY',
      QUARTERLY: 'QUARTERLY',
      YEARLY: 'YEARLY'
    };
  }

  /**
   * Calculate and store analytics for a date range
   * Can be run as a scheduled job
   */
  async calculateAnalytics(periodType, startDate, endDate, dimensions = {}) {
    try {
      const { payerId, denialCategoryId, carcCode } = dimensions;

      // Build dimension filters
      let denialFilters = [
        gte(claim_denials.denial_date, startDate),
        lte(claim_denials.denial_date, endDate)
      ];

      if (payerId) denialFilters.push(eq(claim_denials.payer_id, payerId));
      if (denialCategoryId) denialFilters.push(eq(claim_denials.denial_category_id, denialCategoryId));
      if (carcCode) denialFilters.push(eq(claim_denials.primary_denial_reason, carcCode));

      // Get denial metrics
      const denialMetrics = await this.getDenialMetrics(denialFilters);

      // Get appeal metrics
      const appealMetrics = await this.getAppealMetrics(startDate, endDate, dimensions);

      // Calculate rates (stored as basis points: 0-10000 = 0.00%-100.00%)
      const denialRate = this.calculateDenialRate(denialMetrics, startDate, endDate, payerId);
      const appealRate = denialMetrics.totalDenials > 0
        ? Math.round((appealMetrics.totalAppeals / denialMetrics.totalDenials) * 10000)
        : 0;
      const appealSuccessRate = appealMetrics.totalDecided > 0
        ? Math.round(((appealMetrics.appealsWon + appealMetrics.appealsPartial) / appealMetrics.totalDecided) * 10000)
        : 0;
      const preventableRate = denialMetrics.totalDenials > 0
        ? Math.round((denialMetrics.preventableDenials / denialMetrics.totalDenials) * 10000)
        : 0;
      const recoveryRate = denialMetrics.totalDeniedAmount > 0
        ? Math.round((appealMetrics.totalRecoveredAmount / denialMetrics.totalDeniedAmount) * 10000)
        : 0;

      // Get previous period for trending
      const previousPeriod = this.getPreviousPeriod(periodType, startDate, endDate);
      const trendData = await this.calculateTrend(
        periodType,
        previousPeriod.start,
        previousPeriod.end,
        dimensions
      );

      // Store analytics record
      const [analytics] = await db.insert(denial_analytics)
        .values({
          period_type: periodType,
          period_start: startDate,
          period_end: endDate,
          payer_id: payerId || null,
          denial_category_id: denialCategoryId || null,
          carc_code: carcCode || null,

          // Volume metrics
          total_denials: denialMetrics.totalDenials,
          full_denials: denialMetrics.fullDenials,
          partial_denials: denialMetrics.partialDenials,
          preventable_denials: denialMetrics.preventableDenials,

          // Financial metrics (in cents)
          total_denied_amount: denialMetrics.totalDeniedAmount,
          total_appealed_amount: appealMetrics.totalAppealedAmount,
          total_recovered_amount: appealMetrics.totalRecoveredAmount,
          total_written_off_amount: denialMetrics.totalWrittenOffAmount,

          // Appeal metrics
          total_appeals: appealMetrics.totalAppeals,
          appeals_won: appealMetrics.appealsWon,
          appeals_lost: appealMetrics.appealsLost,
          appeals_pending: appealMetrics.appealsPending,

          // Rates (basis points)
          denial_rate: denialRate,
          appeal_rate: appealRate,
          appeal_success_rate: appealSuccessRate,
          preventable_rate: preventableRate,
          recovery_rate: recoveryRate,

          // Timing metrics (days)
          avg_appeal_cycle_time: appealMetrics.avgCycleTime,
          avg_time_to_appeal: appealMetrics.avgTimeToAppeal,
          avg_decision_time: appealMetrics.avgDecisionTime,

          // Trending
          trend_direction: trendData.direction,
          trend_percentage: trendData.percentage,

          calculation_date: new Date()
        })
        .returning();

      return analytics;
    } catch (error) {
      logger.error('Error calculating analytics:', error)
      throw error;
    }
  }

  /**
   * Get denial metrics for period
   */
  async getDenialMetrics(filters) {
    const result = await db.select({
      totalDenials: sql`COUNT(*)::int`,
      totalDeniedAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`,
      fullDenials: sql`COUNT(CASE WHEN ${claim_denials.denial_type} = 'FULL_DENIAL' THEN 1 END)::int`,
      partialDenials: sql`COUNT(CASE WHEN ${claim_denials.denial_type} = 'PARTIAL_DENIAL' THEN 1 END)::int`,
      preventableDenials: sql`COUNT(CASE WHEN ${claim_denials.is_preventable} = true THEN 1 END)::int`,
      totalWrittenOffAmount: sql`COALESCE(SUM(CASE WHEN ${claim_denials.resolution_type} = 'WRITE_OFF' THEN ${claim_denials.denied_amount} ELSE 0 END), 0)::bigint`
    })
      .from(claim_denials)
      .where(and(...filters));

    return result[0];
  }

  /**
   * Get appeal metrics for period
   */
  async getAppealMetrics(startDate, endDate, dimensions = {}) {
    const { payerId } = dimensions;

    // Build filters
    let appealFilters = [
      gte(appeal_cases.submitted_date, startDate),
      lte(appeal_cases.submitted_date, endDate)
    ];

    // Join with denial to filter by payer if needed
    let query = db.select({
      totalAppeals: sql`COUNT(*)::int`,
      totalAppealedAmount: sql`COALESCE(SUM(${appeal_cases.appealed_amount}), 0)::bigint`,
      totalRecoveredAmount: sql`COALESCE(SUM(${appeal_cases.recovered_amount}), 0)::bigint`,
      appealsWon: sql`COUNT(CASE WHEN ${appeal_cases.decision_type} = 'APPROVED' THEN 1 END)::int`,
      appealsPartial: sql`COUNT(CASE WHEN ${appeal_cases.decision_type} = 'PARTIAL_APPROVAL' THEN 1 END)::int`,
      appealsLost: sql`COUNT(CASE WHEN ${appeal_cases.decision_type} = 'DENIED' THEN 1 END)::int`,
      appealsPending: sql`COUNT(CASE WHEN ${appeal_cases.appeal_status} IN ('PREPARING', 'SUBMITTED', 'UNDER_REVIEW') THEN 1 END)::int`,
      avgCycleTime: sql`AVG(${appeal_cases.total_cycle_time_days})::int`,
      avgTimeToAppeal: sql`AVG(${appeal_cases.preparation_time_days})::int`,
      avgDecisionTime: sql`AVG(${appeal_cases.decision_time_days})::int`
    })
      .from(appeal_cases);

    if (payerId) {
      query = query
        .innerJoin(claim_denials, eq(appeal_cases.denial_id, claim_denials.id))
        .where(and(...appealFilters, eq(claim_denials.payer_id, payerId)));
    } else {
      query = query.where(and(...appealFilters));
    }

    const result = await query;
    const metrics = result[0];

    return {
      ...metrics,
      totalDecided: (metrics.appealsWon || 0) + (metrics.appealsPartial || 0) + (metrics.appealsLost || 0)
    };
  }

  /**
   * Calculate denial rate
   * Denial Rate = (Total Denials / Total Claims Submitted) * 10000
   */
  async calculateDenialRate(denialMetrics, startDate, endDate, payerId = null) {
    // Get total claims submitted in period
    let claimFilters = [
      gte(claims.date_of_service_from, startDate),
      lte(claims.date_of_service_from, endDate)
    ];

    if (payerId) {
      claimFilters.push(eq(claims.payer_id, payerId));
    }

    const claimResult = await db.select({
      totalClaims: sql`COUNT(*)::int`
    })
      .from(claims)
      .where(and(...claimFilters));

    const totalClaims = claimResult[0]?.totalClaims || 0;

    if (totalClaims === 0) return 0;

    // Return basis points (0-10000)
    return Math.round((denialMetrics.totalDenials / totalClaims) * 10000);
  }

  /**
   * Calculate trend compared to previous period
   */
  async calculateTrend(periodType, previousStart, previousEnd, dimensions) {
    // Get analytics for previous period if it exists
    let query = db.select()
      .from(denial_analytics)
      .where(
        and(
          eq(denial_analytics.period_type, periodType),
          eq(denial_analytics.period_start, previousStart),
          eq(denial_analytics.period_end, previousEnd)
        )
      );

    if (dimensions.payerId) {
      query = query.where(eq(denial_analytics.payer_id, dimensions.payerId));
    }
    if (dimensions.denialCategoryId) {
      query = query.where(eq(denial_analytics.denial_category_id, dimensions.denialCategoryId));
    }
    if (dimensions.carcCode) {
      query = query.where(eq(denial_analytics.carc_code, dimensions.carcCode));
    }

    const previous = await query.limit(1);

    if (previous.length === 0) {
      return { direction: 'STABLE', percentage: 0 };
    }

    // Compare denial rates
    const previousRate = previous[0].denial_rate || 0;

    // Calculate current rate
    const denialFilters = [
      gte(claim_denials.denial_date, previousStart),
      lte(claim_denials.denial_date, previousEnd)
    ];
    if (dimensions.payerId) denialFilters.push(eq(claim_denials.payer_id, dimensions.payerId));

    const currentMetrics = await this.getDenialMetrics(denialFilters);
    const currentRate = await this.calculateDenialRate(
      currentMetrics,
      previousStart,
      previousEnd,
      dimensions.payerId
    );

    if (previousRate === 0) {
      return { direction: 'STABLE', percentage: 0 };
    }

    const percentageChange = Math.round(((currentRate - previousRate) / previousRate) * 10000);

    let direction;
    if (Math.abs(percentageChange) < 500) { // Less than 5% change
      direction = 'STABLE';
    } else if (percentageChange > 0) {
      direction = 'UP'; // Increasing denials (bad trend)
    } else {
      direction = 'DOWN'; // Decreasing denials (good trend)
    }

    return {
      direction,
      percentage: Math.abs(percentageChange)
    };
  }

  /**
   * Get previous period dates
   */
  getPreviousPeriod(periodType, startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    const diff = end - start;

    const previousEnd = new Date(start);
    previousEnd.setTime(previousEnd.getTime() - 1); // Day before current start

    const previousStart = new Date(previousEnd);
    previousStart.setTime(previousStart.getTime() - diff);

    return {
      start: previousStart,
      end: previousEnd
    };
  }

  /**
   * Get analytics for dashboard
   */
  async getDashboardMetrics(filters = {}) {
    const {
      periodType = 'MONTHLY',
      startDate,
      endDate,
      payerId,
      denialCategoryId,
      limit = 12
    } = filters;

    let query = db.select()
      .from(denial_analytics)
      .where(eq(denial_analytics.period_type, periodType));

    if (startDate && endDate) {
      query = query.where(
        and(
          gte(denial_analytics.period_start, startDate),
          lte(denial_analytics.period_end, endDate)
        )
      );
    }

    if (payerId) {
      query = query.where(eq(denial_analytics.payer_id, payerId));
    }

    if (denialCategoryId) {
      query = query.where(eq(denial_analytics.denial_category_id, denialCategoryId));
    }

    const analytics = await query
      .orderBy(desc(denial_analytics.period_start))
      .limit(limit);

    return analytics;
  }

  /**
   * Get top denying payers
   */
  async getTopDenyingPayers(filters = {}) {
    const { startDate, endDate, limit = 10 } = filters;

    let whereConditions = [
      eq(denial_analytics.period_type, 'MONTHLY')
    ];

    if (startDate && endDate) {
      whereConditions.push(
        and(
          gte(denial_analytics.period_start, startDate),
          lte(denial_analytics.period_end, endDate)
        )
      );
    }

    const results = await db.select({
      payerId: denial_analytics.payer_id,
      totalDenials: sql`SUM(${denial_analytics.total_denials})::int`,
      totalDeniedAmount: sql`SUM(${denial_analytics.total_denied_amount})::bigint`,
      avgDenialRate: sql`AVG(${denial_analytics.denial_rate})::int`,
      avgAppealSuccessRate: sql`AVG(${denial_analytics.appeal_success_rate})::int`
    })
      .from(denial_analytics)
      .where(and(...whereConditions))
      .groupBy(denial_analytics.payer_id)
      .orderBy(desc(sql`SUM(${denial_analytics.total_denials})`))
      .limit(limit);

    return results;
  }

  /**
   * Get denial trends over time
   */
  async getDenialTrends(filters = {}) {
    const {
      periodType = 'MONTHLY',
      startDate,
      endDate,
      payerId
    } = filters;

    let query = db.select({
      periodStart: denial_analytics.period_start,
      periodEnd: denial_analytics.period_end,
      totalDenials: denial_analytics.total_denials,
      totalDeniedAmount: denial_analytics.total_denied_amount,
      denialRate: denial_analytics.denial_rate,
      appealSuccessRate: denial_analytics.appeal_success_rate,
      recoveryRate: denial_analytics.recovery_rate,
      trendDirection: denial_analytics.trend_direction
    })
      .from(denial_analytics)
      .where(eq(denial_analytics.period_type, periodType));

    if (startDate && endDate) {
      query = query.where(
        and(
          gte(denial_analytics.period_start, startDate),
          lte(denial_analytics.period_end, endDate)
        )
      );
    }

    if (payerId) {
      query = query.where(eq(denial_analytics.payer_id, payerId));
    }

    const trends = await query.orderBy(denial_analytics.period_start);

    return trends;
  }

  /**
   * Recalculate all analytics for a period
   * Useful for backfilling or corrections
   */
  async recalculateAllPeriods(periodType, startDate, endDate) {
    const periods = this.generatePeriods(periodType, startDate, endDate);
    const results = [];

    for (const period of periods) {
      // Delete existing analytics
      await db.delete(denial_analytics)
        .where(
          and(
            eq(denial_analytics.period_type, periodType),
            eq(denial_analytics.period_start, period.start),
            eq(denial_analytics.period_end, period.end)
          )
        );

      // Recalculate
      const analytics = await this.calculateAnalytics(
        periodType,
        period.start,
        period.end
      );

      results.push(analytics);
    }

    return results;
  }

  /**
   * Generate period ranges
   */
  generatePeriods(periodType, startDate, endDate) {
    const periods = [];
    let current = new Date(startDate);
    const end = new Date(endDate);

    while (current <= end) {
      const periodStart = new Date(current);
      let periodEnd;

      switch (periodType) {
        case 'DAILY':
          periodEnd = new Date(current);
          current.setDate(current.getDate() + 1);
          break;
        case 'WEEKLY':
          periodEnd = new Date(current);
          periodEnd.setDate(periodEnd.getDate() + 6);
          current.setDate(current.getDate() + 7);
          break;
        case 'MONTHLY':
          periodEnd = new Date(current.getFullYear(), current.getMonth() + 1, 0);
          current.setMonth(current.getMonth() + 1);
          break;
        case 'QUARTERLY':
          const quarter = Math.floor(current.getMonth() / 3);
          periodEnd = new Date(current.getFullYear(), (quarter + 1) * 3, 0);
          current.setMonth((quarter + 1) * 3);
          break;
        case 'YEARLY':
          periodEnd = new Date(current.getFullYear(), 11, 31);
          current.setFullYear(current.getFullYear() + 1);
          break;
      }

      if (periodEnd > end) periodEnd = new Date(end);

      periods.push({
        start: periodStart,
        end: periodEnd
      });
    }

    return periods;
  }
}

export default new DenialAnalyticsService();
