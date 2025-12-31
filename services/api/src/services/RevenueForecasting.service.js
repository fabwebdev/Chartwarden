import { db } from '../db/index.js';
import {
  collection_forecasts,
  payer_payment_patterns,
  revenue_accruals
} from '../db/schemas/index.js';
import { claims } from '../db/schemas/billing.schema.js';
import { eq, and, gte, lte, sql, desc } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
/**
 * Revenue Forecasting Service
 * Phase 3D - Collection Forecasting & Payer Analytics
 *
 * Purpose: Forecast cash collections and analyze payer payment behavior
 * Features:
 *   - Monthly/quarterly collection forecasting
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

    const avgAccuracy = accuracy.reduce((sum, a) => sum + a.accuracyPercentage, 0) / accuracy.length;

    return {
      forecasts: accuracy,
      averageAccuracy: avgAccuracy,
      totalForecasts: accuracy.length
    };
  }
}

export default new RevenueForecastingService();
