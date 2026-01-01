import { db } from '../db/index.js';
import {
  denial_analytics,
  claim_denials,
  appeal_cases,
  denial_reasons,
  carc_codes,
  denial_categories
} from '../db/schemas/index.js';
import { claims, payers } from '../db/schemas/billing.schema.js';
import { eq, and, gte, lte, sql, desc, asc, isNotNull, inArray, or } from 'drizzle-orm';

import { logger } from '../utils/logger.js';

/**
 * Denial Analysis Service
 * Advanced Analytics Engine for Trend Analysis, Pattern Identification, and Prevention Strategies
 *
 * Purpose: Provide deep insights into denial patterns to enable proactive denial prevention
 *
 * Features:
 *   - Time-series trend analysis with moving averages
 *   - Pattern identification by payer, CARC code, category, and time
 *   - Prevention strategy recommendations
 *   - Predictive denial rate forecasting
 *   - Root cause analysis
 *   - Comparative benchmarking
 *   - Seasonal pattern detection
 *   - Denial hotspot identification
 */
class DenialAnalysisService {
  constructor() {
    this.periodTypes = {
      DAILY: 'DAILY',
      WEEKLY: 'WEEKLY',
      MONTHLY: 'MONTHLY',
      QUARTERLY: 'QUARTERLY',
      YEARLY: 'YEARLY'
    };

    // Standard prevention strategy templates by denial category
    this.preventionStrategies = {
      'AUTHORIZATION': {
        title: 'Prior Authorization Improvement',
        actions: [
          'Implement real-time eligibility verification before service delivery',
          'Create automated prior authorization request workflow',
          'Set up authorization expiration alerts 7 days before expiry',
          'Train staff on payer-specific authorization requirements',
          'Establish direct communication channels with payer auth departments'
        ],
        priority: 'HIGH',
        estimatedImpact: 30 // Expected reduction percentage
      },
      'ELIGIBILITY': {
        title: 'Eligibility Verification Enhancement',
        actions: [
          'Perform eligibility check within 24 hours of admission',
          'Verify coverage at each level of care change',
          'Implement batch eligibility verification for recurring patients',
          'Create patient coverage alerts for gaps in insurance',
          'Cross-train admission staff on payer eligibility requirements'
        ],
        priority: 'HIGH',
        estimatedImpact: 25
      },
      'CODING': {
        title: 'Coding Accuracy Program',
        actions: [
          'Conduct monthly coding accuracy audits',
          'Provide quarterly coder education sessions',
          'Implement pre-submission claim scrubbing',
          'Review and update charge capture workflows',
          'Establish coding specialist review for high-value claims'
        ],
        priority: 'MEDIUM',
        estimatedImpact: 20
      },
      'DOCUMENTATION': {
        title: 'Documentation Improvement Initiative',
        actions: [
          'Create documentation templates for common procedures',
          'Implement real-time clinical documentation improvement (CDI)',
          'Train providers on payer-specific documentation requirements',
          'Establish peer review process for clinical notes',
          'Create documentation checklists for high-denial services'
        ],
        priority: 'MEDIUM',
        estimatedImpact: 22
      },
      'TIMELY_FILING': {
        title: 'Timely Filing Compliance',
        actions: [
          'Implement claim submission within 5 days of service',
          'Create aging alerts for claims approaching filing deadlines',
          'Establish escalation process for claims over 30 days',
          'Review and streamline claim workflow bottlenecks',
          'Monitor payer-specific filing deadlines'
        ],
        priority: 'CRITICAL',
        estimatedImpact: 40
      },
      'DUPLICATE': {
        title: 'Duplicate Claim Prevention',
        actions: [
          'Implement duplicate claim detection before submission',
          'Create clear claim resubmission protocols',
          'Train billing staff on proper claim correction procedures',
          'Review claim batching processes for duplicates',
          'Establish claim status tracking to prevent re-billing'
        ],
        priority: 'LOW',
        estimatedImpact: 15
      },
      'MEDICAL_NECESSITY': {
        title: 'Medical Necessity Documentation',
        actions: [
          'Implement clinical criteria checklists for hospice services',
          'Enhance face-to-face encounter documentation',
          'Create medical necessity templates aligned with LCD/NCD',
          'Conduct prospective utilization review',
          'Train clinicians on medical necessity documentation'
        ],
        priority: 'HIGH',
        estimatedImpact: 28
      },
      'CONTRACTUAL': {
        title: 'Contract Compliance Review',
        actions: [
          'Audit current payer contracts for fee schedule accuracy',
          'Review bundling rules and carve-out provisions',
          'Verify rates against claims payment',
          'Negotiate contract amendments for unfavorable terms',
          'Maintain current payer fee schedules in billing system'
        ],
        priority: 'MEDIUM',
        estimatedImpact: 18
      }
    };
  }

  // ============================================
  // TREND ANALYSIS METHODS
  // ============================================

  /**
   * Get comprehensive trend analysis with moving averages
   * Provides time-series data with trend indicators
   */
  async getTrendAnalysis(filters = {}) {
    try {
      const {
        periodType = 'MONTHLY',
        startDate,
        endDate,
        payerId,
        denialCategoryId,
        movingAveragePeriods = 3
      } = filters;

      // Calculate date range if not provided
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : this.getDateOffset(end, periodType, -12);

      // Get raw trend data
      const trendData = await this.getRawTrendData(periodType, start, end, payerId, denialCategoryId);

      if (trendData.length === 0) {
        return {
          periods: [],
          summary: this.getEmptySummary(),
          movingAverages: [],
          trendIndicators: { direction: 'STABLE', strength: 0 }
        };
      }

      // Calculate moving averages
      const movingAverages = this.calculateMovingAverages(trendData, movingAveragePeriods);

      // Calculate trend indicators
      const trendIndicators = this.calculateTrendIndicators(trendData);

      // Calculate period-over-period changes
      const periodsWithChanges = this.calculatePeriodChanges(trendData);

      // Generate summary statistics
      const summary = this.calculateTrendSummary(trendData);

      return {
        periods: periodsWithChanges,
        summary,
        movingAverages,
        trendIndicators,
        analysisMetadata: {
          periodType,
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          dataPoints: trendData.length,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error in getTrendAnalysis:', error);
      throw error;
    }
  }

  /**
   * Get raw trend data from denial analytics
   */
  async getRawTrendData(periodType, startDate, endDate, payerId = null, denialCategoryId = null) {
    let conditions = [
      eq(denial_analytics.period_type, periodType),
      gte(denial_analytics.period_start, startDate),
      lte(denial_analytics.period_end, endDate)
    ];

    if (payerId) {
      conditions.push(eq(denial_analytics.payer_id, payerId));
    } else {
      conditions.push(sql`${denial_analytics.payer_id} IS NULL`);
    }

    if (denialCategoryId) {
      conditions.push(eq(denial_analytics.denial_category_id, denialCategoryId));
    } else {
      conditions.push(sql`${denial_analytics.denial_category_id} IS NULL`);
    }

    const results = await db.select()
      .from(denial_analytics)
      .where(and(...conditions))
      .orderBy(asc(denial_analytics.period_start));

    return results;
  }

  /**
   * Calculate moving averages for trend data
   */
  calculateMovingAverages(data, periods) {
    const movingAverages = [];

    for (let i = 0; i < data.length; i++) {
      const windowStart = Math.max(0, i - periods + 1);
      const window = data.slice(windowStart, i + 1);

      const avgDenialRate = window.reduce((sum, d) => sum + (d.denial_rate || 0), 0) / window.length;
      const avgDenials = window.reduce((sum, d) => sum + (d.total_denials || 0), 0) / window.length;
      const avgDeniedAmount = window.reduce((sum, d) => sum + (d.total_denied_amount || 0), 0) / window.length;
      const avgAppealSuccessRate = window.reduce((sum, d) => sum + (d.appeal_success_rate || 0), 0) / window.length;

      movingAverages.push({
        periodStart: data[i].period_start,
        periodEnd: data[i].period_end,
        movingAvgDenialRate: Math.round(avgDenialRate),
        movingAvgDenials: Math.round(avgDenials),
        movingAvgDeniedAmount: Math.round(avgDeniedAmount),
        movingAvgAppealSuccessRate: Math.round(avgAppealSuccessRate),
        windowSize: window.length
      });
    }

    return movingAverages;
  }

  /**
   * Calculate trend indicators using linear regression
   */
  calculateTrendIndicators(data) {
    if (data.length < 2) {
      return { direction: 'STABLE', strength: 0, confidence: 0 };
    }

    // Extract denial rates for regression
    const rates = data.map((d, i) => ({ x: i, y: d.denial_rate || 0 }));

    // Simple linear regression
    const n = rates.length;
    const sumX = rates.reduce((sum, r) => sum + r.x, 0);
    const sumY = rates.reduce((sum, r) => sum + r.y, 0);
    const sumXY = rates.reduce((sum, r) => sum + r.x * r.y, 0);
    const sumX2 = rates.reduce((sum, r) => sum + r.x * r.x, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const meanY = sumY / n;
    const ssTotal = rates.reduce((sum, r) => sum + Math.pow(r.y - meanY, 2), 0);
    const ssResidual = rates.reduce((sum, r) => {
      const predicted = intercept + slope * r.x;
      return sum + Math.pow(r.y - predicted, 2);
    }, 0);
    const rSquared = ssTotal === 0 ? 0 : 1 - (ssResidual / ssTotal);

    // Determine direction and strength
    const absSlope = Math.abs(slope);
    let direction = 'STABLE';
    let strength = 0;

    if (absSlope > 50) { // More than 0.5% change per period
      direction = slope > 0 ? 'INCREASING' : 'DECREASING';
      strength = Math.min(100, Math.round(absSlope / 10)); // Normalize to 0-100
    }

    return {
      direction,
      strength,
      confidence: Math.round(rSquared * 100),
      slope: Math.round(slope),
      projectedNextPeriod: Math.round(intercept + slope * n)
    };
  }

  /**
   * Calculate period-over-period changes
   */
  calculatePeriodChanges(data) {
    return data.map((period, index) => {
      const previous = index > 0 ? data[index - 1] : null;

      let denialRateChange = 0;
      let denialCountChange = 0;
      let deniedAmountChange = 0;

      if (previous) {
        denialRateChange = previous.denial_rate > 0
          ? Math.round(((period.denial_rate - previous.denial_rate) / previous.denial_rate) * 10000)
          : 0;
        denialCountChange = previous.total_denials > 0
          ? Math.round(((period.total_denials - previous.total_denials) / previous.total_denials) * 10000)
          : 0;
        deniedAmountChange = previous.total_denied_amount > 0
          ? Math.round(((period.total_denied_amount - previous.total_denied_amount) / previous.total_denied_amount) * 10000)
          : 0;
      }

      return {
        ...period,
        denialRateChangePercent: denialRateChange / 100, // Convert from basis points to percentage
        denialCountChangePercent: denialCountChange / 100,
        deniedAmountChangePercent: deniedAmountChange / 100,
        changeDirection: denialRateChange > 0 ? 'UP' : denialRateChange < 0 ? 'DOWN' : 'STABLE'
      };
    });
  }

  /**
   * Calculate trend summary statistics
   */
  calculateTrendSummary(data) {
    if (data.length === 0) return this.getEmptySummary();

    const denialRates = data.map(d => d.denial_rate || 0);
    const denialCounts = data.map(d => d.total_denials || 0);
    const deniedAmounts = data.map(d => d.total_denied_amount || 0);
    const appealSuccessRates = data.map(d => d.appeal_success_rate || 0);

    return {
      periodsCovered: data.length,
      denialRate: {
        min: Math.min(...denialRates),
        max: Math.max(...denialRates),
        average: Math.round(denialRates.reduce((a, b) => a + b, 0) / denialRates.length),
        latest: denialRates[denialRates.length - 1],
        standardDeviation: this.calculateStandardDeviation(denialRates)
      },
      totalDenials: {
        total: denialCounts.reduce((a, b) => a + b, 0),
        average: Math.round(denialCounts.reduce((a, b) => a + b, 0) / denialCounts.length),
        min: Math.min(...denialCounts),
        max: Math.max(...denialCounts)
      },
      totalDeniedAmount: {
        total: deniedAmounts.reduce((a, b) => a + b, 0),
        average: Math.round(deniedAmounts.reduce((a, b) => a + b, 0) / deniedAmounts.length)
      },
      appealSuccessRate: {
        average: Math.round(appealSuccessRates.reduce((a, b) => a + b, 0) / appealSuccessRates.length),
        latest: appealSuccessRates[appealSuccessRates.length - 1]
      }
    };
  }

  getEmptySummary() {
    return {
      periodsCovered: 0,
      denialRate: { min: 0, max: 0, average: 0, latest: 0, standardDeviation: 0 },
      totalDenials: { total: 0, average: 0, min: 0, max: 0 },
      totalDeniedAmount: { total: 0, average: 0 },
      appealSuccessRate: { average: 0, latest: 0 }
    };
  }

  calculateStandardDeviation(values) {
    if (values.length === 0) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.round(Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length));
  }

  // ============================================
  // PATTERN IDENTIFICATION METHODS
  // ============================================

  /**
   * Identify denial patterns across multiple dimensions
   */
  async identifyPatterns(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        minOccurrences = 5,
        topN = 20
      } = filters;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000); // 90 days

      // Get patterns by different dimensions
      const [
        payerPatterns,
        carcCodePatterns,
        categoryPatterns,
        timePatterns,
        combinedPatterns
      ] = await Promise.all([
        this.getPayerPatterns(start, end, topN),
        this.getCarcCodePatterns(start, end, topN),
        this.getCategoryPatterns(start, end, topN),
        this.getTimeBasedPatterns(start, end),
        this.getCombinedPatterns(start, end, minOccurrences, topN)
      ]);

      // Calculate pattern significance scores
      const scoredPatterns = this.scorePatterns([
        ...payerPatterns.map(p => ({ ...p, dimension: 'PAYER' })),
        ...carcCodePatterns.map(p => ({ ...p, dimension: 'CARC_CODE' })),
        ...categoryPatterns.map(p => ({ ...p, dimension: 'CATEGORY' })),
        ...combinedPatterns.map(p => ({ ...p, dimension: 'COMBINED' }))
      ]);

      return {
        patterns: {
          byPayer: payerPatterns,
          byCarcCode: carcCodePatterns,
          byCategory: categoryPatterns,
          byTime: timePatterns,
          combined: combinedPatterns
        },
        topPatterns: scoredPatterns.slice(0, topN),
        analysisMetadata: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          minOccurrences,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error in identifyPatterns:', error);
      throw error;
    }
  }

  /**
   * Get denial patterns by payer
   */
  async getPayerPatterns(startDate, endDate, limit) {
    const results = await db.select({
      payerId: claim_denials.payer_id,
      payerName: payers.name,
      denialCount: sql`COUNT(*)::int`,
      totalDeniedAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`,
      preventableCount: sql`COUNT(CASE WHEN ${claim_denials.is_preventable} = true THEN 1 END)::int`,
      appealedCount: sql`COUNT(CASE WHEN ${claim_denials.will_appeal} = true THEN 1 END)::int`,
      avgDaysToResolve: sql`AVG(EXTRACT(DAY FROM (${claim_denials.resolved_date}::timestamp - ${claim_denials.denial_date}::timestamp)))::int`,
      topCarcCode: sql`MODE() WITHIN GROUP (ORDER BY ${claim_denials.primary_denial_reason})`
    })
      .from(claim_denials)
      .leftJoin(payers, eq(claim_denials.payer_id, payers.id))
      .where(
        and(
          gte(claim_denials.denial_date, startDate),
          lte(claim_denials.denial_date, endDate),
          isNotNull(claim_denials.payer_id)
        )
      )
      .groupBy(claim_denials.payer_id, payers.name)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(limit);

    return results.map(r => ({
      ...r,
      preventableRate: r.denialCount > 0 ? Math.round((r.preventableCount / r.denialCount) * 10000) : 0,
      appealRate: r.denialCount > 0 ? Math.round((r.appealedCount / r.denialCount) * 10000) : 0
    }));
  }

  /**
   * Get denial patterns by CARC code
   */
  async getCarcCodePatterns(startDate, endDate, limit) {
    const results = await db.select({
      carcCode: denial_reasons.carc_code,
      carcDescription: carc_codes.description,
      category: carc_codes.category,
      denialCount: sql`COUNT(DISTINCT ${denial_reasons.denial_id})::int`,
      totalAdjustmentAmount: sql`COALESCE(SUM(${denial_reasons.adjustment_amount}), 0)::bigint`,
      appealableCount: sql`COUNT(CASE WHEN ${denial_reasons.is_appealable} = true THEN 1 END)::int`,
      avgAppealSuccess: carc_codes.average_appeal_success_rate,
      recommendedAction: carc_codes.recommended_action
    })
      .from(denial_reasons)
      .innerJoin(claim_denials, eq(denial_reasons.denial_id, claim_denials.id))
      .leftJoin(carc_codes, eq(denial_reasons.carc_code, carc_codes.code))
      .where(
        and(
          gte(claim_denials.denial_date, startDate),
          lte(claim_denials.denial_date, endDate)
        )
      )
      .groupBy(
        denial_reasons.carc_code,
        carc_codes.description,
        carc_codes.category,
        carc_codes.average_appeal_success_rate,
        carc_codes.recommended_action
      )
      .orderBy(desc(sql`COUNT(DISTINCT ${denial_reasons.denial_id})`))
      .limit(limit);

    return results;
  }

  /**
   * Get denial patterns by category
   */
  async getCategoryPatterns(startDate, endDate, limit) {
    const results = await db.select({
      categoryId: claim_denials.denial_category_id,
      categoryName: denial_categories.name,
      categoryCode: denial_categories.code,
      denialCount: sql`COUNT(*)::int`,
      totalDeniedAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`,
      preventableCount: sql`COUNT(CASE WHEN ${claim_denials.is_preventable} = true THEN 1 END)::int`,
      avgResolutionDays: sql`AVG(EXTRACT(DAY FROM (${claim_denials.resolved_date}::timestamp - ${claim_denials.denial_date}::timestamp)))::int`,
      typicalResolutionTime: denial_categories.typical_resolution_time_days
    })
      .from(claim_denials)
      .leftJoin(denial_categories, eq(claim_denials.denial_category_id, denial_categories.id))
      .where(
        and(
          gte(claim_denials.denial_date, startDate),
          lte(claim_denials.denial_date, endDate),
          isNotNull(claim_denials.denial_category_id)
        )
      )
      .groupBy(
        claim_denials.denial_category_id,
        denial_categories.name,
        denial_categories.code,
        denial_categories.typical_resolution_time_days
      )
      .orderBy(desc(sql`COUNT(*)`))
      .limit(limit);

    return results.map(r => ({
      ...r,
      preventableRate: r.denialCount > 0 ? Math.round((r.preventableCount / r.denialCount) * 10000) : 0
    }));
  }

  /**
   * Get time-based patterns (day of week, month trends)
   */
  async getTimeBasedPatterns(startDate, endDate) {
    // Day of week pattern
    const dayOfWeekPattern = await db.select({
      dayOfWeek: sql`EXTRACT(DOW FROM ${claim_denials.denial_date})::int`,
      denialCount: sql`COUNT(*)::int`,
      avgDeniedAmount: sql`AVG(${claim_denials.denied_amount})::bigint`
    })
      .from(claim_denials)
      .where(
        and(
          gte(claim_denials.denial_date, startDate),
          lte(claim_denials.denial_date, endDate)
        )
      )
      .groupBy(sql`EXTRACT(DOW FROM ${claim_denials.denial_date})`)
      .orderBy(sql`EXTRACT(DOW FROM ${claim_denials.denial_date})`);

    // Month pattern
    const monthPattern = await db.select({
      month: sql`EXTRACT(MONTH FROM ${claim_denials.denial_date})::int`,
      denialCount: sql`COUNT(*)::int`,
      avgDeniedAmount: sql`AVG(${claim_denials.denied_amount})::bigint`
    })
      .from(claim_denials)
      .where(
        and(
          gte(claim_denials.denial_date, startDate),
          lte(claim_denials.denial_date, endDate)
        )
      )
      .groupBy(sql`EXTRACT(MONTH FROM ${claim_denials.denial_date})`)
      .orderBy(sql`EXTRACT(MONTH FROM ${claim_denials.denial_date})`);

    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'];

    return {
      byDayOfWeek: dayOfWeekPattern.map(d => ({
        ...d,
        dayName: dayNames[d.dayOfWeek]
      })),
      byMonth: monthPattern.map(m => ({
        ...m,
        monthName: monthNames[m.month - 1]
      })),
      peakDenialDay: dayOfWeekPattern.length > 0
        ? dayNames[dayOfWeekPattern.reduce((max, d) => d.denialCount > max.denialCount ? d : max).dayOfWeek]
        : null,
      peakDenialMonth: monthPattern.length > 0
        ? monthNames[monthPattern.reduce((max, m) => m.denialCount > max.denialCount ? m : max).month - 1]
        : null
    };
  }

  /**
   * Get combined patterns (payer + CARC code combinations)
   */
  async getCombinedPatterns(startDate, endDate, minOccurrences, limit) {
    const results = await db.select({
      payerId: claim_denials.payer_id,
      payerName: payers.name,
      carcCode: claim_denials.primary_denial_reason,
      carcDescription: carc_codes.description,
      denialCount: sql`COUNT(*)::int`,
      totalDeniedAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`,
      preventableCount: sql`COUNT(CASE WHEN ${claim_denials.is_preventable} = true THEN 1 END)::int`
    })
      .from(claim_denials)
      .leftJoin(payers, eq(claim_denials.payer_id, payers.id))
      .leftJoin(carc_codes, eq(claim_denials.primary_denial_reason, carc_codes.code))
      .where(
        and(
          gte(claim_denials.denial_date, startDate),
          lte(claim_denials.denial_date, endDate),
          isNotNull(claim_denials.payer_id),
          isNotNull(claim_denials.primary_denial_reason)
        )
      )
      .groupBy(
        claim_denials.payer_id,
        payers.name,
        claim_denials.primary_denial_reason,
        carc_codes.description
      )
      .having(sql`COUNT(*) >= ${minOccurrences}`)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(limit);

    return results.map(r => ({
      ...r,
      patternKey: `${r.payerName || r.payerId}_${r.carcCode}`,
      preventableRate: r.denialCount > 0 ? Math.round((r.preventableCount / r.denialCount) * 10000) : 0
    }));
  }

  /**
   * Score patterns by significance
   */
  scorePatterns(patterns) {
    return patterns.map(p => {
      // Calculate significance score based on:
      // - Denial count (volume impact)
      // - Total denied amount (financial impact)
      // - Preventable rate (actionability)
      const volumeScore = Math.min(100, (p.denialCount || 0) / 10);
      const amountScore = Math.min(100, (p.totalDeniedAmount || 0) / 100000);
      const preventableScore = (p.preventableRate || 0) / 100;

      const significanceScore = Math.round(
        volumeScore * 0.3 + amountScore * 0.4 + preventableScore * 0.3
      );

      return {
        ...p,
        significanceScore,
        priority: significanceScore >= 70 ? 'CRITICAL' :
                  significanceScore >= 50 ? 'HIGH' :
                  significanceScore >= 30 ? 'MEDIUM' : 'LOW'
      };
    }).sort((a, b) => b.significanceScore - a.significanceScore);
  }

  // ============================================
  // PREVENTION STRATEGY METHODS
  // ============================================

  /**
   * Generate prevention strategies based on identified patterns
   */
  async generatePreventionStrategies(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        topN = 10
      } = filters;

      // Get current patterns
      const patterns = await this.identifyPatterns({
        startDate,
        endDate,
        topN: 50,
        minOccurrences: 3
      });

      // Group denials by preventable reason
      const preventableAnalysis = await this.analyzePreventableDenials(startDate, endDate);

      // Generate strategies for each major pattern
      const strategies = [];

      // Add category-based strategies
      for (const categoryPattern of patterns.patterns.byCategory) {
        const categoryCode = categoryPattern.categoryCode?.toUpperCase() || 'GENERAL';
        const strategy = this.preventionStrategies[categoryCode] || this.getGenericStrategy(categoryCode);

        if (categoryPattern.preventableRate > 1000) { // More than 10% preventable
          strategies.push({
            patternType: 'CATEGORY',
            patternId: categoryPattern.categoryId,
            patternName: categoryPattern.categoryName || categoryCode,
            denialCount: categoryPattern.denialCount,
            totalDeniedAmount: categoryPattern.totalDeniedAmount,
            preventableRate: categoryPattern.preventableRate,
            strategy: {
              ...strategy,
              customRecommendations: this.getCustomRecommendations(categoryPattern)
            },
            estimatedRecovery: Math.round(
              (categoryPattern.totalDeniedAmount || 0) * (strategy.estimatedImpact / 100) *
              ((categoryPattern.preventableRate || 0) / 10000)
            )
          });
        }
      }

      // Add payer-specific strategies
      for (const payerPattern of patterns.patterns.byPayer.slice(0, 5)) {
        if (payerPattern.preventableRate > 1500) { // More than 15% preventable
          strategies.push({
            patternType: 'PAYER',
            patternId: payerPattern.payerId,
            patternName: payerPattern.payerName,
            denialCount: payerPattern.denialCount,
            totalDeniedAmount: payerPattern.totalDeniedAmount,
            preventableRate: payerPattern.preventableRate,
            topCarcCode: payerPattern.topCarcCode,
            strategy: {
              title: `Payer-Specific Strategy: ${payerPattern.payerName}`,
              actions: [
                `Review contract terms with ${payerPattern.payerName}`,
                `Set up dedicated liaison for ${payerPattern.payerName} claims`,
                `Analyze ${payerPattern.topCarcCode} denial code patterns`,
                'Implement payer-specific claim scrubbing rules',
                'Schedule quarterly performance review meetings'
              ],
              priority: payerPattern.preventableRate > 3000 ? 'CRITICAL' : 'HIGH',
              estimatedImpact: Math.round(payerPattern.preventableRate / 500)
            },
            estimatedRecovery: Math.round(
              (payerPattern.totalDeniedAmount || 0) * 0.2 *
              ((payerPattern.preventableRate || 0) / 10000)
            )
          });
        }
      }

      // Sort by estimated recovery and take top N
      const prioritizedStrategies = strategies
        .sort((a, b) => b.estimatedRecovery - a.estimatedRecovery)
        .slice(0, topN);

      // Calculate total potential recovery
      const totalPotentialRecovery = prioritizedStrategies.reduce(
        (sum, s) => sum + (s.estimatedRecovery || 0), 0
      );

      return {
        strategies: prioritizedStrategies,
        summary: {
          totalStrategies: prioritizedStrategies.length,
          criticalStrategies: prioritizedStrategies.filter(s => s.strategy?.priority === 'CRITICAL').length,
          highStrategies: prioritizedStrategies.filter(s => s.strategy?.priority === 'HIGH').length,
          totalPotentialRecovery,
          topPreventableCategories: preventableAnalysis.topCategories
        },
        preventableAnalysis,
        analysisMetadata: {
          startDate: startDate ? new Date(startDate).toISOString() : null,
          endDate: endDate ? new Date(endDate).toISOString() : null,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error in generatePreventionStrategies:', error);
      throw error;
    }
  }

  /**
   * Analyze preventable denials
   */
  async analyzePreventableDenials(startDate, endDate) {
    const end = endDate ? new Date(endDate) : new Date();
    const start = startDate ? new Date(startDate) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

    // Get preventable denial breakdown
    const preventableBreakdown = await db.select({
      isPreventable: claim_denials.is_preventable,
      count: sql`COUNT(*)::int`,
      totalAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`
    })
      .from(claim_denials)
      .where(
        and(
          gte(claim_denials.denial_date, start),
          lte(claim_denials.denial_date, end)
        )
      )
      .groupBy(claim_denials.is_preventable);

    // Get preventable reasons
    const preventableReasons = await db.select({
      reason: claim_denials.preventable_reason,
      rootCause: claim_denials.root_cause,
      count: sql`COUNT(*)::int`,
      totalAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`
    })
      .from(claim_denials)
      .where(
        and(
          gte(claim_denials.denial_date, start),
          lte(claim_denials.denial_date, end),
          eq(claim_denials.is_preventable, true)
        )
      )
      .groupBy(claim_denials.preventable_reason, claim_denials.root_cause)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    // Get preventable by category
    const preventableByCategory = await db.select({
      categoryId: claim_denials.denial_category_id,
      categoryName: denial_categories.name,
      count: sql`COUNT(*)::int`,
      totalAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`
    })
      .from(claim_denials)
      .leftJoin(denial_categories, eq(claim_denials.denial_category_id, denial_categories.id))
      .where(
        and(
          gte(claim_denials.denial_date, start),
          lte(claim_denials.denial_date, end),
          eq(claim_denials.is_preventable, true)
        )
      )
      .groupBy(claim_denials.denial_category_id, denial_categories.name)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    const totalPreventable = preventableBreakdown.find(p => p.isPreventable === true);
    const totalNonPreventable = preventableBreakdown.find(p => p.isPreventable === false);
    const totalUnknown = preventableBreakdown.find(p => p.isPreventable === null);

    return {
      breakdown: {
        preventable: {
          count: totalPreventable?.count || 0,
          amount: totalPreventable?.totalAmount || 0
        },
        nonPreventable: {
          count: totalNonPreventable?.count || 0,
          amount: totalNonPreventable?.totalAmount || 0
        },
        unknown: {
          count: totalUnknown?.count || 0,
          amount: totalUnknown?.totalAmount || 0
        }
      },
      topReasons: preventableReasons,
      topCategories: preventableByCategory,
      preventableRate: this.calculatePreventableRate(preventableBreakdown)
    };
  }

  calculatePreventableRate(breakdown) {
    const preventable = breakdown.find(p => p.isPreventable === true)?.count || 0;
    const total = breakdown.reduce((sum, p) => sum + (p.count || 0), 0);
    return total > 0 ? Math.round((preventable / total) * 10000) : 0;
  }

  getGenericStrategy(category) {
    return {
      title: `${category} Denial Reduction`,
      actions: [
        'Conduct root cause analysis on recent denials',
        'Review and update claim submission workflows',
        'Implement pre-submission claim validation',
        'Schedule staff training on denial prevention',
        'Monitor denial patterns and adjust processes'
      ],
      priority: 'MEDIUM',
      estimatedImpact: 15
    };
  }

  getCustomRecommendations(pattern) {
    const recommendations = [];

    if (pattern.preventableRate > 5000) {
      recommendations.push('URGENT: Over 50% of these denials are preventable - immediate action required');
    }

    if (pattern.avgResolutionDays > 30) {
      recommendations.push(`Resolution time (${pattern.avgResolutionDays} days) exceeds target - streamline workflow`);
    }

    if (pattern.typicalResolutionTime && pattern.avgResolutionDays > pattern.typicalResolutionTime * 1.5) {
      recommendations.push('Resolution time significantly above typical - investigate process bottlenecks');
    }

    return recommendations;
  }

  // ============================================
  // ROOT CAUSE ANALYSIS METHODS
  // ============================================

  /**
   * Perform root cause analysis on denial trends
   */
  async performRootCauseAnalysis(filters = {}) {
    try {
      const {
        startDate,
        endDate,
        payerId,
        carcCode,
        categoryId
      } = filters;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Build conditions
      let conditions = [
        gte(claim_denials.denial_date, start),
        lte(claim_denials.denial_date, end)
      ];

      if (payerId) conditions.push(eq(claim_denials.payer_id, payerId));
      if (carcCode) conditions.push(eq(claim_denials.primary_denial_reason, carcCode));
      if (categoryId) conditions.push(eq(claim_denials.denial_category_id, categoryId));

      // Get root cause distribution
      const rootCauses = await db.select({
        rootCause: claim_denials.root_cause,
        count: sql`COUNT(*)::int`,
        totalAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`,
        preventableCount: sql`COUNT(CASE WHEN ${claim_denials.is_preventable} = true THEN 1 END)::int`
      })
        .from(claim_denials)
        .where(and(...conditions, isNotNull(claim_denials.root_cause)))
        .groupBy(claim_denials.root_cause)
        .orderBy(desc(sql`COUNT(*)`))
        .limit(20);

      // Get denial type distribution
      const denialTypes = await db.select({
        denialType: claim_denials.denial_type,
        count: sql`COUNT(*)::int`,
        totalAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`
      })
        .from(claim_denials)
        .where(and(...conditions))
        .groupBy(claim_denials.denial_type)
        .orderBy(desc(sql`COUNT(*)`));

      // Get resolution type distribution
      const resolutionTypes = await db.select({
        resolutionType: claim_denials.resolution_type,
        count: sql`COUNT(*)::int`,
        totalAmount: sql`COALESCE(SUM(${claim_denials.resolution_amount}), 0)::bigint`
      })
        .from(claim_denials)
        .where(and(...conditions, isNotNull(claim_denials.resolution_type)))
        .groupBy(claim_denials.resolution_type)
        .orderBy(desc(sql`COUNT(*)`));

      // Get process stage analysis (where in the workflow denials originate)
      const stageAnalysis = await this.analyzeProcessStages(conditions);

      // Get correlation analysis
      const correlations = await this.analyzeCorrelations(conditions);

      return {
        rootCauses: rootCauses.map(rc => ({
          ...rc,
          percentage: 0, // Will be calculated below
          preventableRate: rc.count > 0 ? Math.round((rc.preventableCount / rc.count) * 10000) : 0
        })),
        denialTypes,
        resolutionTypes,
        stageAnalysis,
        correlations,
        summary: this.generateRootCauseSummary(rootCauses, denialTypes, resolutionTypes),
        analysisMetadata: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          filters: { payerId, carcCode, categoryId },
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error in performRootCauseAnalysis:', error);
      throw error;
    }
  }

  async analyzeProcessStages(conditions) {
    // Analyze at which stage issues originate based on denial reasons
    const stageMapping = {
      'AUTHORIZATION': 'Pre-Service',
      'ELIGIBILITY': 'Admission',
      'CODING': 'Charge Capture',
      'DOCUMENTATION': 'Clinical Documentation',
      'TIMELY_FILING': 'Claim Submission',
      'DUPLICATE': 'Claim Submission',
      'CONTRACTUAL': 'Contract Management'
    };

    const results = await db.select({
      categoryCode: denial_categories.code,
      count: sql`COUNT(*)::int`,
      totalAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`
    })
      .from(claim_denials)
      .leftJoin(denial_categories, eq(claim_denials.denial_category_id, denial_categories.id))
      .where(and(...conditions))
      .groupBy(denial_categories.code)
      .orderBy(desc(sql`COUNT(*)`));

    const stageData = {};
    for (const result of results) {
      const stage = stageMapping[result.categoryCode?.toUpperCase()] || 'Other';
      if (!stageData[stage]) {
        stageData[stage] = { count: 0, totalAmount: 0 };
      }
      stageData[stage].count += result.count || 0;
      stageData[stage].totalAmount += result.totalAmount || 0;
    }

    return Object.entries(stageData).map(([stage, data]) => ({
      stage,
      ...data
    })).sort((a, b) => b.count - a.count);
  }

  async analyzeCorrelations(conditions) {
    // Find correlations between denial attributes
    const correlations = [];

    // Payer-Code correlation
    const payerCodeCorrelation = await db.select({
      payerId: claim_denials.payer_id,
      carcCode: claim_denials.primary_denial_reason,
      count: sql`COUNT(*)::int`
    })
      .from(claim_denials)
      .where(and(...conditions, isNotNull(claim_denials.payer_id), isNotNull(claim_denials.primary_denial_reason)))
      .groupBy(claim_denials.payer_id, claim_denials.primary_denial_reason)
      .orderBy(desc(sql`COUNT(*)`))
      .limit(10);

    if (payerCodeCorrelation.length > 0) {
      correlations.push({
        type: 'PAYER_CODE',
        description: 'Top payer and denial code combinations',
        data: payerCodeCorrelation
      });
    }

    return correlations;
  }

  generateRootCauseSummary(rootCauses, denialTypes, resolutionTypes) {
    const totalRootCause = rootCauses.reduce((sum, rc) => sum + rc.count, 0);
    const totalDenials = denialTypes.reduce((sum, dt) => sum + dt.count, 0);

    // Add percentages to root causes
    rootCauses.forEach(rc => {
      rc.percentage = totalRootCause > 0 ? Math.round((rc.count / totalRootCause) * 10000) : 0;
    });

    return {
      totalDenialsAnalyzed: totalDenials,
      rootCausesIdentified: rootCauses.length,
      topRootCause: rootCauses[0]?.rootCause || 'Unknown',
      denialTypeBreakdown: denialTypes.reduce((acc, dt) => {
        acc[dt.denialType] = dt.count;
        return acc;
      }, {}),
      resolutionEffectiveness: this.calculateResolutionEffectiveness(resolutionTypes)
    };
  }

  calculateResolutionEffectiveness(resolutionTypes) {
    const recoveredTypes = ['APPEAL_WON', 'PAYER_ERROR_CORRECTED', 'CORRECTED_RESUBMIT'];
    const lostTypes = ['WRITTEN_OFF', 'APPEAL_LOST'];

    let recovered = 0;
    let lost = 0;

    for (const rt of resolutionTypes) {
      if (recoveredTypes.includes(rt.resolutionType)) {
        recovered += rt.count;
      } else if (lostTypes.includes(rt.resolutionType)) {
        lost += rt.count;
      }
    }

    const total = recovered + lost;
    return {
      recoveredCount: recovered,
      lostCount: lost,
      recoveryRate: total > 0 ? Math.round((recovered / total) * 10000) : 0
    };
  }

  // ============================================
  // PREDICTIVE ANALYTICS METHODS
  // ============================================

  /**
   * Generate denial rate forecast
   */
  async forecastDenialRate(filters = {}) {
    try {
      const {
        periodType = 'MONTHLY',
        forecastPeriods = 3,
        payerId
      } = filters;

      // Get historical data (at least 6 periods)
      const end = new Date();
      const start = this.getDateOffset(end, periodType, -12);

      const historicalData = await this.getRawTrendData(periodType, start, end, payerId);

      if (historicalData.length < 3) {
        return {
          forecast: [],
          confidence: 'LOW',
          message: 'Insufficient historical data for reliable forecast',
          historicalDataPoints: historicalData.length
        };
      }

      // Simple moving average forecast
      const forecastData = [];
      const rates = historicalData.map(d => d.denial_rate || 0);
      const recentAvg = rates.slice(-3).reduce((a, b) => a + b, 0) / 3;

      // Calculate trend
      const trendIndicators = this.calculateTrendIndicators(historicalData);
      const periodAdjustment = trendIndicators.slope || 0;

      let lastPeriodEnd = new Date(historicalData[historicalData.length - 1].period_end);

      for (let i = 1; i <= forecastPeriods; i++) {
        const periodStart = this.getNextPeriodStart(lastPeriodEnd, periodType);
        const periodEnd = this.getNextPeriodEnd(periodStart, periodType);

        // Forecast = Recent Average + (Trend * Period Number)
        const forecastRate = Math.max(0, Math.round(recentAvg + (periodAdjustment * i)));

        forecastData.push({
          periodStart,
          periodEnd,
          forecastedDenialRate: forecastRate,
          confidenceInterval: {
            low: Math.max(0, forecastRate - this.calculateConfidenceInterval(rates)),
            high: forecastRate + this.calculateConfidenceInterval(rates)
          },
          periodNumber: i
        });

        lastPeriodEnd = periodEnd;
      }

      // Determine confidence level
      const confidence = this.determineForecastConfidence(historicalData, trendIndicators);

      return {
        forecast: forecastData,
        confidence,
        trendIndicators,
        historicalSummary: {
          dataPoints: historicalData.length,
          avgDenialRate: Math.round(rates.reduce((a, b) => a + b, 0) / rates.length),
          latestDenialRate: rates[rates.length - 1],
          trendDirection: trendIndicators.direction
        },
        analysisMetadata: {
          periodType,
          forecastPeriods,
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error in forecastDenialRate:', error);
      throw error;
    }
  }

  calculateConfidenceInterval(values) {
    const stdDev = this.calculateStandardDeviation(values);
    return Math.round(stdDev * 1.96); // 95% confidence interval
  }

  determineForecastConfidence(data, trendIndicators) {
    if (data.length < 6) return 'LOW';
    if (data.length < 12) {
      return trendIndicators.confidence > 70 ? 'MEDIUM' : 'LOW';
    }
    return trendIndicators.confidence > 80 ? 'HIGH' :
           trendIndicators.confidence > 60 ? 'MEDIUM' : 'LOW';
  }

  // ============================================
  // COMPARATIVE ANALYSIS METHODS
  // ============================================

  /**
   * Compare performance across payers or time periods
   */
  async comparePerformance(filters = {}) {
    try {
      const {
        compareType = 'PAYERS', // PAYERS, TIME_PERIODS, CATEGORIES
        startDate,
        endDate,
        payerIds,
        periodType = 'MONTHLY'
      } = filters;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 180 * 24 * 60 * 60 * 1000); // 6 months

      let comparison;

      switch (compareType) {
        case 'PAYERS':
          comparison = await this.compareByPayers(start, end, payerIds);
          break;
        case 'TIME_PERIODS':
          comparison = await this.compareTimePeriods(start, end, periodType);
          break;
        case 'CATEGORIES':
          comparison = await this.compareByCategories(start, end);
          break;
        default:
          throw new Error(`Invalid compare type: ${compareType}`);
      }

      return {
        compareType,
        comparison,
        analysisMetadata: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          generatedAt: new Date().toISOString()
        }
      };
    } catch (error) {
      logger.error('Error in comparePerformance:', error);
      throw error;
    }
  }

  async compareByPayers(startDate, endDate, payerIds) {
    let conditions = [
      gte(claim_denials.denial_date, startDate),
      lte(claim_denials.denial_date, endDate),
      isNotNull(claim_denials.payer_id)
    ];

    if (payerIds && payerIds.length > 0) {
      conditions.push(inArray(claim_denials.payer_id, payerIds));
    }

    const results = await db.select({
      payerId: claim_denials.payer_id,
      payerName: payers.name,
      totalDenials: sql`COUNT(*)::int`,
      totalDeniedAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`,
      totalBilledAmount: sql`COALESCE(SUM(${claim_denials.billed_amount}), 0)::bigint`,
      preventableCount: sql`COUNT(CASE WHEN ${claim_denials.is_preventable} = true THEN 1 END)::int`,
      appealedCount: sql`COUNT(CASE WHEN ${claim_denials.will_appeal} = true THEN 1 END)::int`,
      resolvedCount: sql`COUNT(CASE WHEN ${claim_denials.denial_status} = 'RESOLVED' THEN 1 END)::int`,
      avgResolutionDays: sql`AVG(EXTRACT(DAY FROM (${claim_denials.resolved_date}::timestamp - ${claim_denials.denial_date}::timestamp)))::int`
    })
      .from(claim_denials)
      .leftJoin(payers, eq(claim_denials.payer_id, payers.id))
      .where(and(...conditions))
      .groupBy(claim_denials.payer_id, payers.name)
      .orderBy(desc(sql`COUNT(*)`));

    // Calculate rates and rankings
    const rankedResults = results.map((r, index) => ({
      ...r,
      rank: index + 1,
      denialRate: r.totalBilledAmount > 0
        ? Math.round((r.totalDeniedAmount / r.totalBilledAmount) * 10000)
        : 0,
      preventableRate: r.totalDenials > 0
        ? Math.round((r.preventableCount / r.totalDenials) * 10000)
        : 0,
      appealRate: r.totalDenials > 0
        ? Math.round((r.appealedCount / r.totalDenials) * 10000)
        : 0,
      resolutionRate: r.totalDenials > 0
        ? Math.round((r.resolvedCount / r.totalDenials) * 10000)
        : 0
    }));

    // Calculate benchmarks
    const benchmark = this.calculateBenchmark(rankedResults);

    return {
      payers: rankedResults,
      benchmark,
      insights: this.generatePayerInsights(rankedResults, benchmark)
    };
  }

  async compareTimePeriods(startDate, endDate, periodType) {
    // Get current period data
    const currentPeriod = await this.getPeriodMetrics(startDate, endDate);

    // Get previous period data
    const periodLength = endDate.getTime() - startDate.getTime();
    const previousStart = new Date(startDate.getTime() - periodLength);
    const previousEnd = new Date(startDate.getTime() - 1);
    const previousPeriod = await this.getPeriodMetrics(previousStart, previousEnd);

    // Calculate changes
    const changes = {
      denialCountChange: previousPeriod.totalDenials > 0
        ? Math.round(((currentPeriod.totalDenials - previousPeriod.totalDenials) / previousPeriod.totalDenials) * 10000)
        : 0,
      deniedAmountChange: previousPeriod.totalDeniedAmount > 0
        ? Math.round(((currentPeriod.totalDeniedAmount - previousPeriod.totalDeniedAmount) / previousPeriod.totalDeniedAmount) * 10000)
        : 0,
      denialRateChange: previousPeriod.denialRate > 0
        ? Math.round(((currentPeriod.denialRate - previousPeriod.denialRate) / previousPeriod.denialRate) * 10000)
        : 0,
      preventableRateChange: previousPeriod.preventableRate > 0
        ? Math.round(((currentPeriod.preventableRate - previousPeriod.preventableRate) / previousPeriod.preventableRate) * 10000)
        : 0
    };

    return {
      currentPeriod: {
        ...currentPeriod,
        startDate,
        endDate
      },
      previousPeriod: {
        ...previousPeriod,
        startDate: previousStart,
        endDate: previousEnd
      },
      changes,
      performanceAssessment: this.assessPeriodPerformance(changes)
    };
  }

  async compareByCategories(startDate, endDate) {
    const results = await db.select({
      categoryId: claim_denials.denial_category_id,
      categoryName: denial_categories.name,
      categoryCode: denial_categories.code,
      totalDenials: sql`COUNT(*)::int`,
      totalDeniedAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`,
      preventableCount: sql`COUNT(CASE WHEN ${claim_denials.is_preventable} = true THEN 1 END)::int`,
      resolvedCount: sql`COUNT(CASE WHEN ${claim_denials.denial_status} = 'RESOLVED' THEN 1 END)::int`,
      avgResolutionDays: sql`AVG(EXTRACT(DAY FROM (${claim_denials.resolved_date}::timestamp - ${claim_denials.denial_date}::timestamp)))::int`
    })
      .from(claim_denials)
      .leftJoin(denial_categories, eq(claim_denials.denial_category_id, denial_categories.id))
      .where(
        and(
          gte(claim_denials.denial_date, startDate),
          lte(claim_denials.denial_date, endDate)
        )
      )
      .groupBy(claim_denials.denial_category_id, denial_categories.name, denial_categories.code)
      .orderBy(desc(sql`COUNT(*)`));

    return {
      categories: results.map(r => ({
        ...r,
        preventableRate: r.totalDenials > 0
          ? Math.round((r.preventableCount / r.totalDenials) * 10000)
          : 0,
        resolutionRate: r.totalDenials > 0
          ? Math.round((r.resolvedCount / r.totalDenials) * 10000)
          : 0
      })),
      totalDenials: results.reduce((sum, r) => sum + r.totalDenials, 0),
      insights: this.generateCategoryInsights(results)
    };
  }

  async getPeriodMetrics(startDate, endDate) {
    const result = await db.select({
      totalDenials: sql`COUNT(*)::int`,
      totalDeniedAmount: sql`COALESCE(SUM(${claim_denials.denied_amount}), 0)::bigint`,
      totalBilledAmount: sql`COALESCE(SUM(${claim_denials.billed_amount}), 0)::bigint`,
      preventableCount: sql`COUNT(CASE WHEN ${claim_denials.is_preventable} = true THEN 1 END)::int`,
      resolvedCount: sql`COUNT(CASE WHEN ${claim_denials.denial_status} = 'RESOLVED' THEN 1 END)::int`
    })
      .from(claim_denials)
      .where(
        and(
          gte(claim_denials.denial_date, startDate),
          lte(claim_denials.denial_date, endDate)
        )
      );

    const metrics = result[0];
    return {
      ...metrics,
      denialRate: metrics.totalBilledAmount > 0
        ? Math.round((metrics.totalDeniedAmount / metrics.totalBilledAmount) * 10000)
        : 0,
      preventableRate: metrics.totalDenials > 0
        ? Math.round((metrics.preventableCount / metrics.totalDenials) * 10000)
        : 0,
      resolutionRate: metrics.totalDenials > 0
        ? Math.round((metrics.resolvedCount / metrics.totalDenials) * 10000)
        : 0
    };
  }

  calculateBenchmark(payers) {
    if (payers.length === 0) return null;

    const denialRates = payers.map(p => p.denialRate);
    const preventableRates = payers.map(p => p.preventableRate);
    const resolutionDays = payers.map(p => p.avgResolutionDays).filter(d => d != null);

    return {
      avgDenialRate: Math.round(denialRates.reduce((a, b) => a + b, 0) / denialRates.length),
      avgPreventableRate: Math.round(preventableRates.reduce((a, b) => a + b, 0) / preventableRates.length),
      avgResolutionDays: resolutionDays.length > 0
        ? Math.round(resolutionDays.reduce((a, b) => a + b, 0) / resolutionDays.length)
        : null,
      bestPerformer: payers.reduce((best, p) => p.denialRate < best.denialRate ? p : best),
      worstPerformer: payers.reduce((worst, p) => p.denialRate > worst.denialRate ? p : worst)
    };
  }

  generatePayerInsights(payers, benchmark) {
    const insights = [];

    for (const payer of payers.slice(0, 5)) {
      if (payer.denialRate > benchmark.avgDenialRate * 1.5) {
        insights.push({
          type: 'WARNING',
          payer: payer.payerName,
          message: `${payer.payerName} denial rate (${(payer.denialRate / 100).toFixed(2)}%) is significantly above average`,
          recommendation: 'Review contract terms and claim submission processes'
        });
      }

      if (payer.preventableRate > 3000) {
        insights.push({
          type: 'ACTION',
          payer: payer.payerName,
          message: `${payer.payerName} has ${(payer.preventableRate / 100).toFixed(2)}% preventable denials`,
          recommendation: 'Implement targeted prevention strategies'
        });
      }
    }

    return insights;
  }

  generateCategoryInsights(categories) {
    const insights = [];
    const topCategory = categories[0];

    if (topCategory) {
      insights.push({
        type: 'INFO',
        message: `${topCategory.categoryName || 'Unknown'} is the leading denial category with ${topCategory.totalDenials} denials`,
        impact: topCategory.totalDeniedAmount
      });
    }

    const highPreventable = categories.filter(c => c.preventableRate > 5000);
    if (highPreventable.length > 0) {
      insights.push({
        type: 'ACTION',
        message: `${highPreventable.length} categories have over 50% preventable denials`,
        categories: highPreventable.map(c => c.categoryName)
      });
    }

    return insights;
  }

  assessPeriodPerformance(changes) {
    let assessment = 'STABLE';
    let areas = [];

    if (changes.denialRateChange < -500) {
      assessment = 'IMPROVING';
      areas.push('Denial rate decreased');
    } else if (changes.denialRateChange > 500) {
      assessment = 'DECLINING';
      areas.push('Denial rate increased');
    }

    if (changes.preventableRateChange < -500) {
      areas.push('Preventable denials reduced');
    } else if (changes.preventableRateChange > 500) {
      areas.push('Preventable denials increased');
    }

    return { assessment, details: areas };
  }

  // ============================================
  // UTILITY METHODS
  // ============================================

  getDateOffset(date, periodType, periods) {
    const result = new Date(date);
    switch (periodType) {
      case 'DAILY':
        result.setDate(result.getDate() + periods);
        break;
      case 'WEEKLY':
        result.setDate(result.getDate() + (periods * 7));
        break;
      case 'MONTHLY':
        result.setMonth(result.getMonth() + periods);
        break;
      case 'QUARTERLY':
        result.setMonth(result.getMonth() + (periods * 3));
        break;
      case 'YEARLY':
        result.setFullYear(result.getFullYear() + periods);
        break;
    }
    return result;
  }

  getNextPeriodStart(lastEnd, periodType) {
    const start = new Date(lastEnd);
    start.setDate(start.getDate() + 1);
    return start;
  }

  getNextPeriodEnd(periodStart, periodType) {
    const end = new Date(periodStart);
    switch (periodType) {
      case 'DAILY':
        break;
      case 'WEEKLY':
        end.setDate(end.getDate() + 6);
        break;
      case 'MONTHLY':
        end.setMonth(end.getMonth() + 1);
        end.setDate(0);
        break;
      case 'QUARTERLY':
        end.setMonth(end.getMonth() + 3);
        end.setDate(0);
        break;
      case 'YEARLY':
        end.setFullYear(end.getFullYear() + 1);
        end.setDate(0);
        break;
    }
    return end;
  }
}

export default new DenialAnalysisService();
