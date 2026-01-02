import { db } from '../db/index.js';
import {
  collection_forecasts,
  payer_payment_patterns,
  revenue_accruals,
  benefit_periods,
  benefit_period_loc
} from '../db/schemas/index.js';
import { claims, payers, billing_periods, contracts } from '../db/schemas/billing.schema.js';
import { patients } from '../db/schemas/patient.schema.js';
import { eq, and, gte, lte, sql, desc, isNull, count, sum, avg } from 'drizzle-orm';

import { logger } from '../utils/logger.js';

/**
 * Medicare Hospice Payment Rates (FY 2024/2025)
 * These are approximate national rates - actual rates vary by CBSA
 * All values in cents
 */
const HOSPICE_RATES = {
  RHC: 21300,    // Routine Home Care - ~$213/day
  CHC: 106600,   // Continuous Home Care - ~$1,066/day (8+ hours)
  GIP: 108500,   // General Inpatient Care - ~$1,085/day
  IRC: 50200,    // Inpatient Respite Care - ~$502/day
};

/**
 * Revenue Code to Level of Care mapping
 */
const REVENUE_CODE_LOC = {
  '0651': 'RHC',
  '0652': 'CHC',
  '0655': 'GIP',
  '0656': 'IRC',
};

/**
 * Revenue Forecasting Service
 * Phase 3D - Collection Forecasting & Payer Analytics
 *
 * Purpose: Forecast cash collections and analyze payer payment behavior
 * Features:
 *   - Monthly/quarterly collection forecasting
 *   - Census-based revenue forecasting
 *   - Level of care-based forecasting
 *   - Payer payment pattern analysis
 *   - Historical trend analysis
 *   - Forecast accuracy tracking
 *   - Confidence level calculation
 */
class RevenueForecastingService {
  /**
   * Create collection forecast for a period
   */
  async createForecast(forecastPeriod, forecastType = 'MONTHLY', dimensions = {}, userId = null) {
    try {
      const { payerId, serviceType } = dimensions;

      // Get historical data (last 6-12 months)
      const historicalMonths = forecastType === 'YEARLY' ? 24 : 6;
      const historicalData = await this.getHistoricalCollections(historicalMonths, dimensions);

      // Calculate forecasted collections using weighted average
      const forecastedCollections = this.calculateWeightedForecast(historicalData);

      // Estimate write-offs and denials based on history
      const forecastedWriteoffs = Math.round(forecastedCollections * 0.08); // 8% write-off rate
      const forecastedDenials = Math.round(forecastedCollections * 0.12); // 12% denial rate
      const forecastedAppealsRecovery = Math.round(forecastedDenials * 0.45); // 45% recovery rate

      // Calculate confidence based on data stability
      const { confidenceLevel, confidencePercentage } = this.calculateConfidence(historicalData);

      // Create forecast record
      const [forecast] = await db.insert(collection_forecasts)
        .values({
          forecast_period: forecastPeriod,
          forecast_created_date: new Date(),
          forecast_type: forecastType,
          payer_id: payerId || null,
          service_type: serviceType || null,
          forecasted_collections: forecastedCollections,
          forecasted_writeoffs: forecastedWriteoffs,
          forecasted_denials: forecastedDenials,
          forecasted_appeals_recovery: forecastedAppealsRecovery,
          confidence_level: confidenceLevel,
          confidence_percentage: confidencePercentage,
          calculation_method: 'WEIGHTED_HISTORICAL_AVERAGE',
          assumptions: {
            historicalMonths,
            writeOffRate: 0.08,
            denialRate: 0.12,
            appealRecoveryRate: 0.45,
            payerId,
            serviceType
          },
          historical_data_range: {
            months: historicalMonths,
            dataPoints: historicalData.length
          },
          forecast_status: 'DRAFT',
          created_by_id: userId
        })
        .returning();

      return forecast;
    } catch (error) {
      logger.error('Error creating forecast:', error)
      throw error;
    }
  }

  /**
   * Get historical collections data
   */
  async getHistoricalCollections(months, dimensions = {}) {
    const { payerId, serviceType } = dimensions;

    // Calculate date range
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    // Build query
    let query = db.select({
      period: revenue_accruals.revenue_period,
      totalCollected: sql`SUM(${revenue_accruals.collected_amount})::bigint`,
      totalBilled: sql`SUM(${revenue_accruals.billed_amount})::bigint`,
      totalWrittenOff: sql`SUM(${revenue_accruals.written_off_amount})::bigint`
    })
      .from(revenue_accruals)
      .where(
        and(
          gte(revenue_accruals.service_date_from, startDate),
          lte(revenue_accruals.service_date_from, endDate)
        )
      )
      .groupBy(revenue_accruals.revenue_period);

    if (payerId) {
      query = query.where(eq(revenue_accruals.payer_id, payerId));
    }

    const data = await query.orderBy(revenue_accruals.revenue_period);
    return data;
  }

  /**
   * Calculate weighted forecast (recent months weighted higher)
   */
  calculateWeightedForecast(historicalData) {
    if (historicalData.length === 0) return 0;

    let weightedSum = 0;
    let totalWeight = 0;

    historicalData.forEach((month, index) => {
      // More recent months get higher weight
      const weight = index + 1; // Linear weighting: 1, 2, 3, ...
      weightedSum += (month.totalCollected || 0) * weight;
      totalWeight += weight;
    });

    return Math.round(weightedSum / totalWeight);
  }

  /**
   * Calculate forecast confidence level
   */
  calculateConfidence(historicalData) {
    if (historicalData.length < 3) {
      return { confidenceLevel: 'LOW', confidencePercentage: 4000 }; // 40%
    }

    // Calculate coefficient of variation
    const values = historicalData.map(d => d.totalCollected || 0);
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);
    const coefficientOfVariation = mean > 0 ? (stdDev / mean) : 1;

    // Lower CV = higher confidence
    if (coefficientOfVariation < 0.15) {
      return { confidenceLevel: 'HIGH', confidencePercentage: 9000 }; // 90%
    } else if (coefficientOfVariation < 0.30) {
      return { confidenceLevel: 'MEDIUM', confidencePercentage: 7000 }; // 70%
    } else {
      return { confidenceLevel: 'LOW', confidencePercentage: 5000 }; // 50%
    }
  }

  /**
   * Update forecast with actual results
   */
  async updateForecastActuals(forecastId, actualCollections, actualWriteoffs) {
    const [forecast] = await db.select()
      .from(collection_forecasts)
      .where(eq(collection_forecasts.id, forecastId))
      .limit(1);

    if (!forecast) {
      throw new Error(`Forecast not found: ${forecastId}`);
    }

    const varianceAmount = actualCollections - forecast.forecasted_collections;
    const variancePercentage = forecast.forecasted_collections > 0
      ? Math.round((varianceAmount / forecast.forecasted_collections) * 10000)
      : 0;

    await db.update(collection_forecasts)
      .set({
        actual_collections: actualCollections,
        actual_writeoffs: actualWriteoffs,
        variance_amount: varianceAmount,
        variance_percentage: variancePercentage,
        forecast_status: 'ACTUAL',
        locked: true,
        locked_at: new Date(),
        updated_at: new Date()
      })
      .where(eq(collection_forecasts.id, forecastId));
  }

  /**
   * Calculate payer payment patterns
   */
  async calculatePayerPatterns(payerId, analysisMonths = 12) {
    try {
      // Calculate period
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - analysisMonths);

      // Get all claims for this payer in the period
      const claimData = await db.select({
        totalSubmitted: sql`COUNT(*)::int`,
        totalPaid: sql`COUNT(CASE WHEN ${claims.claim_status} = 'PAID' THEN 1 END)::int`,
        totalDenied: sql`COUNT(CASE WHEN ${claims.claim_status} = 'DENIED' THEN 1 END)::int`,
        totalBilled: sql`SUM(${claims.total_charge})::bigint`,
        totalPaidAmount: sql`SUM(CASE WHEN ${claims.claim_status} = 'PAID' THEN ${claims.total_charge} ELSE 0 END)::bigint`
      })
        .from(claims)
        .where(
          and(
            eq(claims.payer_id, payerId),
            gte(claims.date_of_service_from, startDate),
            lte(claims.date_of_service_from, endDate)
          )
        );

      const stats = claimData[0];

      // Calculate rates (basis points)
      const collectionRate = stats.totalBilled > 0
        ? Math.round((stats.totalPaidAmount / stats.totalBilled) * 10000)
        : 0;

      const denialRate = stats.totalSubmitted > 0
        ? Math.round((stats.totalDenied / stats.totalSubmitted) * 10000)
        : 0;

      // Calculate average days to payment (simplified - would need actual payment dates)
      const avgDaysToPayment = 32; // Placeholder

      // Calculate payment reliability score (0-100)
      const reliabilityScore = this.calculateReliabilityScore({
        collectionRate,
        denialRate,
        avgDaysToPayment
      });

      // Create or update pattern record
      const [pattern] = await db.insert(payer_payment_patterns)
        .values({
          payer_id: payerId,
          analysis_period_start: startDate,
          analysis_period_end: endDate,
          last_calculated: new Date(),
          total_claims_submitted: stats.totalSubmitted,
          total_claims_paid: stats.totalPaid,
          total_claims_denied: stats.totalDenied,
          total_billed_amount: stats.totalBilled,
          total_paid_amount: stats.totalPaidAmount,
          avg_days_to_payment: avgDaysToPayment,
          collection_rate: collectionRate,
          denial_rate: denialRate,
          payment_reliability_score: reliabilityScore,
          payment_pattern: this.classifyPaymentPattern(reliabilityScore),
          risk_level: this.assessRiskLevel(collectionRate, denialRate)
        })
        .returning();

      return pattern;
    } catch (error) {
      logger.error('Error calculating payer patterns:', error)
      throw error;
    }
  }

  /**
   * Calculate payment reliability score (0-100)
   */
  calculateReliabilityScore({ collectionRate, denialRate, avgDaysToPayment }) {
    // High collection rate = good (max 50 points)
    const collectionPoints = Math.min((collectionRate / 10000) * 50, 50);

    // Low denial rate = good (max 30 points)
    const denialPoints = Math.max(0, 30 - ((denialRate / 10000) * 30));

    // Fast payment = good (max 20 points)
    const speedPoints = Math.max(0, 20 - (avgDaysToPayment / 60) * 20);

    return Math.round(collectionPoints + denialPoints + speedPoints);
  }

  /**
   * Classify payment pattern
   */
  classifyPaymentPattern(reliabilityScore) {
    if (reliabilityScore >= 80) return 'CONSISTENT';
    if (reliabilityScore >= 60) return 'VARIABLE';
    return 'IRREGULAR';
  }

  /**
   * Assess risk level
   */
  assessRiskLevel(collectionRate, denialRate) {
    if (collectionRate >= 8500 && denialRate <= 1000) return 'LOW';  // 85%+ collection, 10%- denial
    if (collectionRate >= 7000 && denialRate <= 2000) return 'MEDIUM'; // 70%+ collection, 20%- denial
    return 'HIGH';
  }

  /**
   * Get forecast accuracy report
   */
  async getForecastAccuracyReport(startPeriod, endPeriod) {
    const forecasts = await db.select()
      .from(collection_forecasts)
      .where(
        and(
          gte(collection_forecasts.forecast_period, startPeriod),
          lte(collection_forecasts.forecast_period, endPeriod),
          eq(collection_forecasts.forecast_status, 'ACTUAL')
        )
      );

    const accuracy = forecasts.map(f => ({
      period: f.forecast_period,
      forecasted: f.forecasted_collections,
      actual: f.actual_collections,
      variance: f.variance_amount,
      variancePercentage: f.variance_percentage / 100, // Convert from basis points
      accuracyPercentage: 100 - Math.abs(f.variance_percentage / 100)
    }));

    const avgAccuracy = accuracy.length > 0
      ? accuracy.reduce((sum, a) => sum + a.accuracyPercentage, 0) / accuracy.length
      : 0;

    return {
      forecasts: accuracy,
      averageAccuracy: avgAccuracy,
      totalForecasts: accuracy.length
    };
  }

  // ============================================
  // CENSUS-BASED FORECASTING
  // ============================================

  /**
   * Get current patient census
   * Returns count of active patients with active benefit periods
   */
  async getCurrentCensus() {
    try {
      const today = new Date().toISOString().split('T')[0];

      // Count active patients with active benefit periods
      const censusData = await db.select({
        totalActive: sql`COUNT(DISTINCT ${patients.id})::int`,
      })
        .from(patients)
        .innerJoin(benefit_periods, eq(patients.id, benefit_periods.patient_id))
        .where(
          and(
            eq(benefit_periods.status, 'ACTIVE'),
            lte(benefit_periods.start_date, today),
            gte(benefit_periods.end_date, today),
            isNull(patients.deleted_at)
          )
        );

      return censusData[0]?.totalActive || 0;
    } catch (error) {
      logger.error('Error getting current census:', error);
      throw error;
    }
  }

  /**
   * Get historical census data by month
   * Returns census counts for the specified number of months
   */
  async getHistoricalCensus(months = 12) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      // Get monthly census snapshots based on active benefit periods
      const censusData = await db.select({
        period: sql`TO_CHAR(${benefit_periods.start_date}, 'YYYY-MM')`,
        activePatients: sql`COUNT(DISTINCT ${benefit_periods.patient_id})::int`,
      })
        .from(benefit_periods)
        .where(
          and(
            gte(benefit_periods.start_date, startDate.toISOString().split('T')[0]),
            lte(benefit_periods.start_date, endDate.toISOString().split('T')[0]),
            eq(benefit_periods.status, 'ACTIVE')
          )
        )
        .groupBy(sql`TO_CHAR(${benefit_periods.start_date}, 'YYYY-MM')`)
        .orderBy(sql`TO_CHAR(${benefit_periods.start_date}, 'YYYY-MM')`);

      return censusData;
    } catch (error) {
      logger.error('Error getting historical census:', error);
      throw error;
    }
  }

  /**
   * Get census by level of care
   * Returns breakdown of current census by LOC
   */
  async getCensusByLevelOfCare() {
    try {
      const today = new Date().toISOString().split('T')[0];

      const locCensus = await db.select({
        levelOfCare: benefit_period_loc.level_of_care,
        patientCount: sql`COUNT(DISTINCT ${benefit_period_loc.patient_id})::int`,
      })
        .from(benefit_period_loc)
        .innerJoin(benefit_periods, eq(benefit_period_loc.benefit_period_id, benefit_periods.id))
        .where(
          and(
            eq(benefit_period_loc.status, 'ACTIVE'),
            eq(benefit_periods.status, 'ACTIVE'),
            lte(benefit_period_loc.effective_date, today),
            sql`(${benefit_period_loc.end_date} IS NULL OR ${benefit_period_loc.end_date} >= ${today})`
          )
        )
        .groupBy(benefit_period_loc.level_of_care);

      // Build result with all LOC types
      const result = {
        RHC: 0,
        CHC: 0,
        GIP: 0,
        IRC: 0,
        total: 0,
      };

      locCensus.forEach(loc => {
        const locType = loc.levelOfCare?.toUpperCase();
        if (locType && result.hasOwnProperty(locType)) {
          result[locType] = loc.patientCount;
          result.total += loc.patientCount;
        }
      });

      return result;
    } catch (error) {
      logger.error('Error getting census by LOC:', error);
      throw error;
    }
  }

  /**
   * Generate census-based revenue forecast
   * Forecasts revenue based on current/projected census and LOC mix
   */
  async generateCensusBasedForecast(forecastPeriod, options = {}) {
    try {
      const {
        projectedCensusGrowth = 0, // Percentage growth per month (e.g., 0.02 for 2%)
        locMixOverride = null,     // Override LOC distribution
        customRates = null,        // Custom payment rates (override Medicare rates)
        forecastMonths = 3,        // Number of months to forecast
      } = options;

      // Get current census and LOC breakdown
      const currentCensus = await this.getCurrentCensus();
      const locBreakdown = await this.getCensusByLevelOfCare();
      const historicalCensus = await this.getHistoricalCensus(12);

      // Calculate LOC percentages from current or use override
      const locMix = locMixOverride || this.calculateLocMix(locBreakdown);

      // Use custom rates or default Medicare rates
      const rates = customRates || HOSPICE_RATES;

      // Calculate historical trends
      const censusTrend = this.calculateCensusTrend(historicalCensus);

      // Generate monthly forecasts
      const monthlyForecasts = [];
      let projectedCensus = currentCensus;

      for (let month = 0; month < forecastMonths; month++) {
        // Apply growth rate or use trend
        const growthRate = projectedCensusGrowth > 0
          ? projectedCensusGrowth
          : censusTrend.monthlyGrowthRate;

        projectedCensus = Math.round(projectedCensus * (1 + growthRate));

        // Calculate projected revenue by LOC
        const monthRevenue = this.calculateMonthlyRevenue(projectedCensus, locMix, rates);

        // Calculate forecast period
        const forecastDate = new Date(forecastPeriod + '-01');
        forecastDate.setMonth(forecastDate.getMonth() + month);
        const periodLabel = forecastDate.toISOString().slice(0, 7);

        monthlyForecasts.push({
          period: periodLabel,
          projectedCensus,
          locBreakdown: {
            RHC: Math.round(projectedCensus * locMix.RHC),
            CHC: Math.round(projectedCensus * locMix.CHC),
            GIP: Math.round(projectedCensus * locMix.GIP),
            IRC: Math.round(projectedCensus * locMix.IRC),
          },
          revenue: monthRevenue,
        });
      }

      // Calculate confidence level based on data quality
      const { confidenceLevel, confidencePercentage } = this.calculateCensusConfidence(
        historicalCensus,
        censusTrend
      );

      return {
        forecastType: 'CENSUS_BASED',
        generatedAt: new Date().toISOString(),
        currentCensus,
        currentLocBreakdown: locBreakdown,
        locMix,
        paymentRates: rates,
        historicalTrend: censusTrend,
        monthlyForecasts,
        summary: {
          totalProjectedRevenue: monthlyForecasts.reduce((sum, m) => sum + m.revenue.total, 0),
          averageMonthlyRevenue: Math.round(
            monthlyForecasts.reduce((sum, m) => sum + m.revenue.total, 0) / forecastMonths
          ),
          projectedEndingCensus: projectedCensus,
        },
        confidence: {
          level: confidenceLevel,
          percentage: confidencePercentage,
        },
        assumptions: {
          growthRate: projectedCensusGrowth || censusTrend.monthlyGrowthRate,
          locMix,
          rates,
          dataPointsUsed: historicalCensus.length,
        },
      };
    } catch (error) {
      logger.error('Error generating census-based forecast:', error);
      throw error;
    }
  }

  /**
   * Calculate LOC mix percentages
   */
  calculateLocMix(locBreakdown) {
    const total = locBreakdown.total || 1; // Avoid division by zero
    return {
      RHC: locBreakdown.RHC / total || 0.92,  // Default: ~92% RHC
      CHC: locBreakdown.CHC / total || 0.02,  // Default: ~2% CHC
      GIP: locBreakdown.GIP / total || 0.04,  // Default: ~4% GIP
      IRC: locBreakdown.IRC / total || 0.02,  // Default: ~2% IRC
    };
  }

  /**
   * Calculate census trend from historical data
   */
  calculateCensusTrend(historicalCensus) {
    if (historicalCensus.length < 2) {
      return {
        direction: 'STABLE',
        monthlyGrowthRate: 0,
        averageCensus: historicalCensus[0]?.activePatients || 0,
        volatility: 'LOW',
      };
    }

    const censusValues = historicalCensus.map(h => h.activePatients || 0);
    const avgCensus = censusValues.reduce((a, b) => a + b, 0) / censusValues.length;

    // Calculate growth rate between first and last periods
    const firstPeriod = censusValues[0];
    const lastPeriod = censusValues[censusValues.length - 1];
    const periods = historicalCensus.length - 1;

    const totalGrowth = firstPeriod > 0 ? (lastPeriod - firstPeriod) / firstPeriod : 0;
    const monthlyGrowthRate = periods > 0 ? totalGrowth / periods : 0;

    // Calculate volatility (coefficient of variation)
    const variance = censusValues.reduce((sum, val) =>
      sum + Math.pow(val - avgCensus, 2), 0) / censusValues.length;
    const stdDev = Math.sqrt(variance);
    const cv = avgCensus > 0 ? stdDev / avgCensus : 0;

    let volatility = 'LOW';
    if (cv > 0.3) volatility = 'HIGH';
    else if (cv > 0.15) volatility = 'MEDIUM';

    let direction = 'STABLE';
    if (monthlyGrowthRate > 0.02) direction = 'GROWING';
    else if (monthlyGrowthRate < -0.02) direction = 'DECLINING';

    return {
      direction,
      monthlyGrowthRate,
      averageCensus: Math.round(avgCensus),
      volatility,
      coefficientOfVariation: cv,
    };
  }

  /**
   * Calculate monthly revenue based on census and LOC mix
   */
  calculateMonthlyRevenue(census, locMix, rates) {
    const daysInMonth = 30; // Approximate

    const byLoc = {
      RHC: Math.round(census * locMix.RHC * rates.RHC * daysInMonth),
      CHC: Math.round(census * locMix.CHC * rates.CHC * daysInMonth),
      GIP: Math.round(census * locMix.GIP * rates.GIP * daysInMonth),
      IRC: Math.round(census * locMix.IRC * rates.IRC * daysInMonth),
    };

    return {
      byLoc,
      total: Object.values(byLoc).reduce((a, b) => a + b, 0),
    };
  }

  /**
   * Calculate confidence level for census-based forecast
   */
  calculateCensusConfidence(historicalCensus, trend) {
    let score = 50; // Base score

    // More data points = higher confidence
    if (historicalCensus.length >= 12) score += 20;
    else if (historicalCensus.length >= 6) score += 10;
    else if (historicalCensus.length < 3) score -= 20;

    // Lower volatility = higher confidence
    if (trend.volatility === 'LOW') score += 20;
    else if (trend.volatility === 'MEDIUM') score += 10;
    else score -= 10;

    // Stable trends = higher confidence
    if (trend.direction === 'STABLE') score += 10;

    let confidenceLevel = 'MEDIUM';
    if (score >= 80) confidenceLevel = 'HIGH';
    else if (score < 50) confidenceLevel = 'LOW';

    return {
      confidenceLevel,
      confidencePercentage: Math.min(Math.max(score * 100, 2000), 9500), // 20%-95% in basis points
    };
  }

  // ============================================
  // LEVEL OF CARE-BASED FORECASTING
  // ============================================

  /**
   * Get historical LOC distribution over time
   */
  async getHistoricalLocDistribution(months = 12) {
    try {
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const locHistory = await db.select({
        period: sql`TO_CHAR(${benefit_period_loc.effective_date}, 'YYYY-MM')`,
        levelOfCare: benefit_period_loc.level_of_care,
        patientDays: sql`COUNT(*)::int`,
      })
        .from(benefit_period_loc)
        .where(
          and(
            gte(benefit_period_loc.effective_date, startDate.toISOString().split('T')[0]),
            lte(benefit_period_loc.effective_date, endDate.toISOString().split('T')[0])
          )
        )
        .groupBy(
          sql`TO_CHAR(${benefit_period_loc.effective_date}, 'YYYY-MM')`,
          benefit_period_loc.level_of_care
        )
        .orderBy(sql`TO_CHAR(${benefit_period_loc.effective_date}, 'YYYY-MM')`);

      // Transform into period-based structure
      const periodMap = {};
      locHistory.forEach(row => {
        if (!periodMap[row.period]) {
          periodMap[row.period] = { RHC: 0, CHC: 0, GIP: 0, IRC: 0, total: 0 };
        }
        const loc = row.levelOfCare?.toUpperCase();
        if (loc && periodMap[row.period].hasOwnProperty(loc)) {
          periodMap[row.period][loc] = row.patientDays;
          periodMap[row.period].total += row.patientDays;
        }
      });

      return Object.entries(periodMap).map(([period, data]) => ({
        period,
        ...data,
        locMix: this.calculateLocMix(data),
      }));
    } catch (error) {
      logger.error('Error getting historical LOC distribution:', error);
      throw error;
    }
  }

  /**
   * Generate LOC-based revenue forecast
   * Analyzes historical LOC trends to forecast revenue
   */
  async generateLocBasedForecast(forecastPeriod, options = {}) {
    try {
      const {
        historicalMonths = 12,
        forecastMonths = 3,
        locGrowthRates = null, // Custom growth rates by LOC
      } = options;

      // Get historical LOC distribution
      const locHistory = await this.getHistoricalLocDistribution(historicalMonths);

      // Analyze trends for each LOC
      const locTrends = this.analyzeLocTrends(locHistory);

      // Get current census
      const currentCensus = await this.getCurrentCensus();
      const currentLocBreakdown = await this.getCensusByLevelOfCare();

      // Generate forecasts
      const monthlyForecasts = [];
      let projectedLoc = { ...currentLocBreakdown };
      delete projectedLoc.total;

      for (let month = 0; month < forecastMonths; month++) {
        // Apply growth rates for each LOC
        Object.keys(projectedLoc).forEach(loc => {
          const growthRate = locGrowthRates?.[loc] || locTrends[loc]?.monthlyGrowthRate || 0;
          projectedLoc[loc] = Math.round(projectedLoc[loc] * (1 + growthRate));
        });

        // Calculate revenue by LOC
        const revenueByLoc = {};
        let totalRevenue = 0;
        const daysInMonth = 30;

        Object.keys(HOSPICE_RATES).forEach(loc => {
          const patients = projectedLoc[loc] || 0;
          const revenue = patients * HOSPICE_RATES[loc] * daysInMonth;
          revenueByLoc[loc] = revenue;
          totalRevenue += revenue;
        });

        // Calculate forecast period
        const forecastDate = new Date(forecastPeriod + '-01');
        forecastDate.setMonth(forecastDate.getMonth() + month);
        const periodLabel = forecastDate.toISOString().slice(0, 7);

        monthlyForecasts.push({
          period: periodLabel,
          locBreakdown: { ...projectedLoc },
          totalPatients: Object.values(projectedLoc).reduce((a, b) => a + b, 0),
          revenue: {
            byLoc: revenueByLoc,
            total: totalRevenue,
          },
        });
      }

      // Calculate confidence
      const { confidenceLevel, confidencePercentage } = this.calculateLocConfidence(
        locHistory,
        locTrends
      );

      return {
        forecastType: 'LOC_BASED',
        generatedAt: new Date().toISOString(),
        currentCensus,
        currentLocBreakdown,
        locTrends,
        monthlyForecasts,
        summary: {
          totalProjectedRevenue: monthlyForecasts.reduce((sum, m) => sum + m.revenue.total, 0),
          averageMonthlyRevenue: Math.round(
            monthlyForecasts.reduce((sum, m) => sum + m.revenue.total, 0) / forecastMonths
          ),
          revenueByLoc: monthlyForecasts.reduce((acc, m) => {
            Object.keys(m.revenue.byLoc).forEach(loc => {
              acc[loc] = (acc[loc] || 0) + m.revenue.byLoc[loc];
            });
            return acc;
          }, {}),
        },
        confidence: {
          level: confidenceLevel,
          percentage: confidencePercentage,
        },
        assumptions: {
          historicalMonthsAnalyzed: historicalMonths,
          forecastMonths,
          locGrowthRates: locGrowthRates || locTrends,
          paymentRates: HOSPICE_RATES,
        },
      };
    } catch (error) {
      logger.error('Error generating LOC-based forecast:', error);
      throw error;
    }
  }

  /**
   * Analyze trends for each level of care
   */
  analyzeLocTrends(locHistory) {
    const trends = {};

    ['RHC', 'CHC', 'GIP', 'IRC'].forEach(loc => {
      const values = locHistory.map(h => h[loc] || 0);

      if (values.length < 2) {
        trends[loc] = {
          direction: 'STABLE',
          monthlyGrowthRate: 0,
          average: values[0] || 0,
        };
        return;
      }

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const firstVal = values[0];
      const lastVal = values[values.length - 1];
      const totalGrowth = firstVal > 0 ? (lastVal - firstVal) / firstVal : 0;
      const monthlyGrowth = totalGrowth / (values.length - 1);

      let direction = 'STABLE';
      if (monthlyGrowth > 0.02) direction = 'GROWING';
      else if (monthlyGrowth < -0.02) direction = 'DECLINING';

      trends[loc] = {
        direction,
        monthlyGrowthRate: monthlyGrowth,
        average: Math.round(avg),
      };
    });

    return trends;
  }

  /**
   * Calculate confidence for LOC-based forecast
   */
  calculateLocConfidence(locHistory, locTrends) {
    let score = 50;

    // More historical data = higher confidence
    if (locHistory.length >= 12) score += 20;
    else if (locHistory.length >= 6) score += 10;
    else if (locHistory.length < 3) score -= 20;

    // Stable trends = higher confidence
    const stableTrends = Object.values(locTrends).filter(t => t.direction === 'STABLE').length;
    score += stableTrends * 5;

    let confidenceLevel = 'MEDIUM';
    if (score >= 80) confidenceLevel = 'HIGH';
    else if (score < 50) confidenceLevel = 'LOW';

    return {
      confidenceLevel,
      confidencePercentage: Math.min(Math.max(score * 100, 2000), 9500),
    };
  }

  // ============================================
  // HISTORICAL DATA-BASED FORECASTING
  // ============================================

  /**
   * Get historical revenue data
   */
  async getHistoricalRevenue(months = 12, dimensions = {}) {
    try {
      const { payerId, levelOfCare } = dimensions;
      const endDate = new Date();
      const startDate = new Date();
      startDate.setMonth(startDate.getMonth() - months);

      const conditions = [
        gte(revenue_accruals.service_date_from, startDate.toISOString().split('T')[0]),
        lte(revenue_accruals.service_date_from, endDate.toISOString().split('T')[0]),
      ];

      if (payerId) {
        conditions.push(eq(revenue_accruals.payer_id, payerId));
      }

      const revenueData = await db.select({
        period: revenue_accruals.revenue_period,
        totalBilled: sql`SUM(${revenue_accruals.billed_amount})::bigint`,
        totalCollected: sql`SUM(${revenue_accruals.collected_amount})::bigint`,
        totalAccrued: sql`SUM(${revenue_accruals.accrued_amount})::bigint`,
        totalWrittenOff: sql`SUM(${revenue_accruals.written_off_amount})::bigint`,
        claimCount: sql`COUNT(DISTINCT ${revenue_accruals.claim_id})::int`,
        patientCount: sql`COUNT(DISTINCT ${revenue_accruals.patient_id})::int`,
      })
        .from(revenue_accruals)
        .where(and(...conditions))
        .groupBy(revenue_accruals.revenue_period)
        .orderBy(revenue_accruals.revenue_period);

      return revenueData;
    } catch (error) {
      logger.error('Error getting historical revenue:', error);
      throw error;
    }
  }

  /**
   * Generate comprehensive revenue forecast using multiple models
   * Combines census, LOC, and historical data approaches
   */
  async generateComprehensiveForecast(forecastPeriod, options = {}) {
    try {
      const {
        forecastMonths = 3,
        historicalMonths = 12,
        weights = { census: 0.3, loc: 0.3, historical: 0.4 }, // Weights for each model
      } = options;

      // Run all three forecast models in parallel
      const [censusForcast, locForecast, historicalData] = await Promise.all([
        this.generateCensusBasedForecast(forecastPeriod, { forecastMonths }),
        this.generateLocBasedForecast(forecastPeriod, { forecastMonths, historicalMonths }),
        this.getHistoricalRevenue(historicalMonths),
      ]);

      // Calculate historical trend-based forecast
      const historicalForecast = this.calculateHistoricalTrendForecast(
        historicalData,
        forecastPeriod,
        forecastMonths
      );

      // Combine forecasts using weighted average
      const combinedForecasts = [];
      for (let i = 0; i < forecastMonths; i++) {
        const censusRev = censusForcast.monthlyForecasts[i]?.revenue?.total || 0;
        const locRev = locForecast.monthlyForecasts[i]?.revenue?.total || 0;
        const histRev = historicalForecast.monthlyForecasts[i]?.projectedRevenue || 0;

        const weightedRevenue = Math.round(
          censusRev * weights.census +
          locRev * weights.loc +
          histRev * weights.historical
        );

        const forecastDate = new Date(forecastPeriod + '-01');
        forecastDate.setMonth(forecastDate.getMonth() + i);

        combinedForecasts.push({
          period: forecastDate.toISOString().slice(0, 7),
          projectedRevenue: weightedRevenue,
          breakdown: {
            censusBased: censusRev,
            locBased: locRev,
            historicalBased: histRev,
          },
          weights,
        });
      }

      // Calculate overall confidence (weighted average of model confidences)
      const overallConfidence = Math.round(
        censusForcast.confidence.percentage * weights.census +
        locForecast.confidence.percentage * weights.loc +
        (historicalForecast.confidence?.percentage || 7000) * weights.historical
      );

      return {
        forecastType: 'COMPREHENSIVE',
        generatedAt: new Date().toISOString(),
        forecastPeriod,
        models: {
          census: {
            weight: weights.census,
            confidence: censusForcast.confidence,
          },
          loc: {
            weight: weights.loc,
            confidence: locForecast.confidence,
          },
          historical: {
            weight: weights.historical,
            confidence: historicalForecast.confidence || { level: 'MEDIUM', percentage: 7000 },
          },
        },
        monthlyForecasts: combinedForecasts,
        summary: {
          totalProjectedRevenue: combinedForecasts.reduce((sum, f) => sum + f.projectedRevenue, 0),
          averageMonthlyRevenue: Math.round(
            combinedForecasts.reduce((sum, f) => sum + f.projectedRevenue, 0) / forecastMonths
          ),
        },
        confidence: {
          level: overallConfidence >= 7500 ? 'HIGH' : overallConfidence >= 5000 ? 'MEDIUM' : 'LOW',
          percentage: overallConfidence,
        },
        detailedModels: {
          census: censusForcast,
          loc: locForecast,
          historical: historicalForecast,
        },
      };
    } catch (error) {
      logger.error('Error generating comprehensive forecast:', error);
      throw error;
    }
  }

  /**
   * Calculate forecast based on historical revenue trends
   */
  calculateHistoricalTrendForecast(historicalData, forecastPeriod, forecastMonths) {
    if (!historicalData || historicalData.length === 0) {
      return {
        monthlyForecasts: Array(forecastMonths).fill({ projectedRevenue: 0 }),
        confidence: { level: 'LOW', percentage: 2000 },
      };
    }

    // Calculate weighted average revenue
    const weightedRevenue = this.calculateWeightedForecast(historicalData);

    // Calculate trend
    const revenueValues = historicalData.map(d => Number(d.totalCollected) || 0);
    const avgRevenue = revenueValues.reduce((a, b) => a + b, 0) / revenueValues.length;

    // Calculate growth rate
    let monthlyGrowthRate = 0;
    if (revenueValues.length > 1 && revenueValues[0] > 0) {
      const totalGrowth = (revenueValues[revenueValues.length - 1] - revenueValues[0]) / revenueValues[0];
      monthlyGrowthRate = totalGrowth / (revenueValues.length - 1);
    }

    // Generate monthly forecasts
    const monthlyForecasts = [];
    let projectedRevenue = weightedRevenue;

    for (let i = 0; i < forecastMonths; i++) {
      projectedRevenue = Math.round(projectedRevenue * (1 + monthlyGrowthRate));
      const forecastDate = new Date(forecastPeriod + '-01');
      forecastDate.setMonth(forecastDate.getMonth() + i);

      monthlyForecasts.push({
        period: forecastDate.toISOString().slice(0, 7),
        projectedRevenue,
      });
    }

    // Calculate confidence
    const { confidenceLevel, confidencePercentage } = this.calculateConfidence(historicalData);

    return {
      historicalSummary: {
        averageMonthlyRevenue: Math.round(avgRevenue),
        weightedAverageRevenue: weightedRevenue,
        monthlyGrowthRate,
        dataPoints: historicalData.length,
      },
      monthlyForecasts,
      confidence: {
        level: confidenceLevel,
        percentage: confidencePercentage,
      },
    };
  }

  // ============================================
  // SCENARIO ANALYSIS
  // ============================================

  /**
   * Generate scenario-based forecasts (best, base, worst case)
   */
  async generateScenarioForecasts(forecastPeriod, options = {}) {
    try {
      const {
        forecastMonths = 6,
        scenarios = ['optimistic', 'base', 'pessimistic'],
      } = options;

      const baseForecast = await this.generateComprehensiveForecast(forecastPeriod, {
        forecastMonths,
      });

      const scenarioForecasts = {};

      scenarios.forEach(scenario => {
        let adjustmentFactor;
        switch (scenario) {
          case 'optimistic':
            adjustmentFactor = 1.15; // 15% higher
            break;
          case 'pessimistic':
            adjustmentFactor = 0.85; // 15% lower
            break;
          default:
            adjustmentFactor = 1.0;
        }

        scenarioForecasts[scenario] = {
          adjustmentFactor,
          monthlyForecasts: baseForecast.monthlyForecasts.map(f => ({
            ...f,
            projectedRevenue: Math.round(f.projectedRevenue * adjustmentFactor),
          })),
          summary: {
            totalProjectedRevenue: Math.round(
              baseForecast.summary.totalProjectedRevenue * adjustmentFactor
            ),
            averageMonthlyRevenue: Math.round(
              baseForecast.summary.averageMonthlyRevenue * adjustmentFactor
            ),
          },
        };
      });

      return {
        forecastType: 'SCENARIO_ANALYSIS',
        generatedAt: new Date().toISOString(),
        forecastPeriod,
        forecastMonths,
        baseModel: baseForecast.confidence,
        scenarios: scenarioForecasts,
        comparison: {
          optimisticVsBase: scenarios.includes('optimistic')
            ? Math.round((scenarioForecasts.optimistic.summary.totalProjectedRevenue -
                baseForecast.summary.totalProjectedRevenue) / baseForecast.summary.totalProjectedRevenue * 10000)
            : null,
          pessimisticVsBase: scenarios.includes('pessimistic')
            ? Math.round((scenarioForecasts.pessimistic.summary.totalProjectedRevenue -
                baseForecast.summary.totalProjectedRevenue) / baseForecast.summary.totalProjectedRevenue * 10000)
            : null,
        },
      };
    } catch (error) {
      logger.error('Error generating scenario forecasts:', error);
      throw error;
    }
  }

  // ============================================
  // PAYER-SPECIFIC FORECASTING
  // ============================================

  /**
   * Generate payer-specific revenue forecast
   */
  async generatePayerForecast(payerId, forecastPeriod, options = {}) {
    try {
      const { forecastMonths = 3, historicalMonths = 12 } = options;

      // Get historical data for this payer
      const historicalData = await this.getHistoricalRevenue(historicalMonths, { payerId });

      // Get payer patterns
      const payerPatterns = await this.calculatePayerPatterns(payerId, historicalMonths);

      // Calculate forecast
      const historicalForecast = this.calculateHistoricalTrendForecast(
        historicalData,
        forecastPeriod,
        forecastMonths
      );

      // Apply payer-specific adjustments
      const adjustedForecasts = historicalForecast.monthlyForecasts.map(f => ({
        ...f,
        // Apply collection rate adjustment
        expectedCollections: Math.round(
          f.projectedRevenue * (payerPatterns?.collection_rate || 9000) / 10000
        ),
        projectedDenials: Math.round(
          f.projectedRevenue * (payerPatterns?.denial_rate || 500) / 10000
        ),
        projectedWriteoffs: Math.round(f.projectedRevenue * 800 / 10000), // 8% write-off assumption
      }));

      return {
        forecastType: 'PAYER_SPECIFIC',
        generatedAt: new Date().toISOString(),
        payerId,
        payerPatterns: {
          collectionRate: payerPatterns?.collection_rate,
          denialRate: payerPatterns?.denial_rate,
          riskLevel: payerPatterns?.risk_level,
          reliabilityScore: payerPatterns?.payment_reliability_score,
        },
        monthlyForecasts: adjustedForecasts,
        summary: {
          totalProjectedBilled: adjustedForecasts.reduce((sum, f) => sum + f.projectedRevenue, 0),
          totalExpectedCollections: adjustedForecasts.reduce((sum, f) => sum + f.expectedCollections, 0),
          totalProjectedDenials: adjustedForecasts.reduce((sum, f) => sum + f.projectedDenials, 0),
          netExpectedRevenue: adjustedForecasts.reduce((sum, f) =>
            sum + f.expectedCollections - f.projectedWriteoffs, 0),
        },
        confidence: historicalForecast.confidence,
      };
    } catch (error) {
      logger.error('Error generating payer forecast:', error);
      throw error;
    }
  }
}

export default new RevenueForecastingService();
