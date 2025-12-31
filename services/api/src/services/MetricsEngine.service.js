import { db } from '../db/index.js';
import { claims, payments, payment_applications, ar_aging, payers, billing_periods } from '../db/schemas/billing.schema.js';
import { patients } from '../db/schemas/patient.schema.js';
import { encounters } from '../db/schemas/encounters.schema.js';
import { eq, sql, gte, lte, and, between, isNull, count, sum, avg, desc } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Metrics Engine Service
 *
 * Advanced analytics engine for metrics calculation, dashboard data aggregation,
 * and trend analysis with statistical methods.
 *
 * Features:
 *   - Core KPI calculations with statistical confidence
 *   - Time-series analysis with moving averages
 *   - Trend detection and forecasting
 *   - Clinical and operational metrics
 *   - Comparative period analysis
 *   - Percentile calculations
 */
class MetricsEngineService {
  constructor() {
    // Industry benchmark targets
    this.benchmarks = {
      clean_claim_rate: { target: 95.0, excellent: 98.0, warning: 90.0 },
      days_to_payment: { target: 30, excellent: 21, warning: 45 },
      net_collection_rate: { target: 98.0, excellent: 99.0, warning: 95.0 },
      denial_rate: { target: 5.0, excellent: 2.0, warning: 10.0 },
      first_pass_resolution: { target: 90.0, excellent: 95.0, warning: 85.0 },
      patient_satisfaction: { target: 90.0, excellent: 95.0, warning: 80.0 },
      visit_compliance: { target: 95.0, excellent: 98.0, warning: 90.0 }
    };
  }

  // ==========================================================================
  // STATISTICAL UTILITY METHODS
  // ==========================================================================

  /**
   * Calculate standard deviation
   * @param {number[]} values - Array of numeric values
   * @returns {number} Standard deviation
   */
  calculateStandardDeviation(values) {
    if (!values || values.length < 2) return 0;
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  /**
   * Calculate percentile value
   * @param {number[]} values - Sorted array of values
   * @param {number} percentile - Percentile (0-100)
   * @returns {number} Percentile value
   */
  calculatePercentile(values, percentile) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const index = (percentile / 100) * (sorted.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    if (lower === upper) return sorted[lower];
    return sorted[lower] + (sorted[upper] - sorted[lower]) * (index - lower);
  }

  /**
   * Calculate simple moving average
   * @param {number[]} values - Array of values
   * @param {number} window - Window size
   * @returns {number[]} Moving averages
   */
  calculateMovingAverage(values, window = 3) {
    if (!values || values.length < window) return values;
    const result = [];
    for (let i = 0; i < values.length; i++) {
      if (i < window - 1) {
        result.push(null);
      } else {
        const slice = values.slice(i - window + 1, i + 1);
        result.push(slice.reduce((a, b) => a + b, 0) / window);
      }
    }
    return result;
  }

  /**
   * Calculate exponential moving average
   * @param {number[]} values - Array of values
   * @param {number} alpha - Smoothing factor (0-1)
   * @returns {number[]} EMA values
   */
  calculateEMA(values, alpha = 0.3) {
    if (!values || values.length === 0) return [];
    const ema = [values[0]];
    for (let i = 1; i < values.length; i++) {
      ema.push(alpha * values[i] + (1 - alpha) * ema[i - 1]);
    }
    return ema;
  }

  /**
   * Detect trend direction using linear regression
   * @param {number[]} values - Array of values
   * @returns {object} Trend analysis result
   */
  detectTrend(values) {
    if (!values || values.length < 3) {
      return { direction: 'stable', slope: 0, confidence: 0 };
    }

    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;

    // Calculate R-squared for confidence
    const predictions = values.map((_, i) => yMean + slope * (i - xMean));
    const ssRes = values.reduce((sum, val, i) => sum + Math.pow(val - predictions[i], 2), 0);
    const ssTot = values.reduce((sum, val) => sum + Math.pow(val - yMean, 2), 0);
    const rSquared = ssTot !== 0 ? 1 - (ssRes / ssTot) : 0;

    // Determine direction based on slope significance
    const threshold = yMean * 0.01; // 1% of mean as significance threshold
    let direction = 'stable';
    if (slope > threshold) direction = 'increasing';
    else if (slope < -threshold) direction = 'decreasing';

    return {
      direction,
      slope: parseFloat(slope.toFixed(4)),
      confidence: parseFloat((rSquared * 100).toFixed(1)),
      projectedChange: parseFloat((slope * n).toFixed(2))
    };
  }

  /**
   * Calculate year-over-year change
   * @param {number} current - Current period value
   * @param {number} previous - Previous period value
   * @returns {object} YoY change details
   */
  calculateYoYChange(current, previous) {
    if (!previous || previous === 0) {
      return { change: 0, percentage: 0, direction: 'neutral' };
    }
    const change = current - previous;
    const percentage = (change / previous) * 100;
    return {
      change: parseFloat(change.toFixed(2)),
      percentage: parseFloat(percentage.toFixed(1)),
      direction: percentage > 1 ? 'up' : percentage < -1 ? 'down' : 'neutral'
    };
  }

  // ==========================================================================
  // CORE METRIC CALCULATIONS
  // ==========================================================================

  /**
   * Calculate comprehensive metrics for a date range with statistical analysis
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @returns {Promise<object>} Comprehensive metrics with statistics
   */
  async calculateComprehensiveMetrics(startDate, endDate) {
    try {
      const [
        financialMetrics,
        operationalMetrics,
        claimMetrics,
        collectionMetrics
      ] = await Promise.all([
        this.calculateFinancialMetrics(startDate, endDate),
        this.calculateOperationalMetrics(startDate, endDate),
        this.calculateClaimMetrics(startDate, endDate),
        this.calculateCollectionMetrics(startDate, endDate)
      ]);

      return {
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        financial: financialMetrics,
        operational: operationalMetrics,
        claims: claimMetrics,
        collections: collectionMetrics,
        calculated_at: new Date().toISOString()
      };
    } catch (error) {
      logger.error('Error calculating comprehensive metrics:', error);
      throw new Error(`Failed to calculate comprehensive metrics: ${error.message}`);
    }
  }

  /**
   * Calculate financial metrics
   */
  async calculateFinancialMetrics(startDate, endDate) {
    try {
      const result = await db
        .select({
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
          total_payments: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`,
          total_adjustments: sql`COALESCE(SUM(${claims.total_adjustments}), 0)::bigint`,
          total_balance: sql`COALESCE(SUM(${claims.balance}), 0)::bigint`,
          claim_count: sql`COUNT(*)::int`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        );

      const data = result[0];
      const totalCharges = parseInt(data?.total_charges || 0);
      const totalPayments = parseInt(data?.total_payments || 0);
      const totalAdjustments = parseInt(data?.total_adjustments || 0);

      return {
        total_charges: totalCharges,
        total_charges_formatted: this.formatCurrency(totalCharges),
        total_payments: totalPayments,
        total_payments_formatted: this.formatCurrency(totalPayments),
        total_adjustments: totalAdjustments,
        total_adjustments_formatted: this.formatCurrency(totalAdjustments),
        net_revenue: totalPayments - totalAdjustments,
        net_revenue_formatted: this.formatCurrency(totalPayments - totalAdjustments),
        claim_count: parseInt(data?.claim_count || 0),
        avg_claim_value: data?.claim_count > 0
          ? this.formatCurrency(totalCharges / parseInt(data.claim_count))
          : '$0.00'
      };
    } catch (error) {
      logger.error('Error calculating financial metrics:', error);
      return {
        total_charges: 0,
        total_payments: 0,
        total_adjustments: 0,
        net_revenue: 0,
        claim_count: 0
      };
    }
  }

  /**
   * Calculate operational metrics
   */
  async calculateOperationalMetrics(startDate, endDate) {
    try {
      // Patient census and encounters
      const [censusData, encounterData] = await Promise.all([
        db.select({
          active_patients: sql`COUNT(DISTINCT ${claims.patient_id})::int`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        ),

        db.select({
          total_encounters: sql`COUNT(*)::int`,
          avg_duration: sql`COALESCE(AVG(${encounters.encounter_duration_minutes}), 0)::numeric`
        })
        .from(encounters)
        .where(
          and(
            gte(encounters.encounter_date, startDate),
            lte(encounters.encounter_date, endDate),
            isNull(encounters.deleted_at)
          )
        )
      ]);

      return {
        active_patients: parseInt(censusData[0]?.active_patients || 0),
        total_encounters: parseInt(encounterData[0]?.total_encounters || 0),
        avg_encounter_duration_minutes: parseFloat(encounterData[0]?.avg_duration || 0).toFixed(1),
        encounters_per_patient: censusData[0]?.active_patients > 0
          ? parseFloat((encounterData[0]?.total_encounters / censusData[0].active_patients).toFixed(1))
          : 0
      };
    } catch (error) {
      logger.error('Error calculating operational metrics:', error);
      return {
        active_patients: 0,
        total_encounters: 0,
        avg_encounter_duration_minutes: 0
      };
    }
  }

  /**
   * Calculate claim metrics with detailed breakdown
   */
  async calculateClaimMetrics(startDate, endDate) {
    try {
      const statusBreakdown = await db
        .select({
          status: claims.claim_status,
          count: sql`COUNT(*)::int`,
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        )
        .groupBy(claims.claim_status);

      const cleanClaimData = await db
        .select({
          total: sql`COUNT(*)::int`,
          clean: sql`COUNT(CASE WHEN ${claims.scrubbing_passed} = true THEN 1 END)::int`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        );

      const total = parseInt(cleanClaimData[0]?.total || 0);
      const clean = parseInt(cleanClaimData[0]?.clean || 0);
      const cleanClaimRate = total > 0 ? parseFloat(((clean / total) * 100).toFixed(1)) : 0;

      return {
        clean_claim_rate: cleanClaimRate,
        clean_claim_rate_status: this.evaluateMetric('clean_claim_rate', cleanClaimRate),
        total_claims: total,
        clean_claims: clean,
        status_breakdown: statusBreakdown.map(s => ({
          status: s.status,
          count: s.count,
          total_charges: parseInt(s.total_charges),
          total_charges_formatted: this.formatCurrency(parseInt(s.total_charges))
        }))
      };
    } catch (error) {
      logger.error('Error calculating claim metrics:', error);
      return {
        clean_claim_rate: 0,
        total_claims: 0,
        clean_claims: 0,
        status_breakdown: []
      };
    }
  }

  /**
   * Calculate collection metrics with aging analysis
   */
  async calculateCollectionMetrics(startDate, endDate) {
    try {
      // Days to payment analysis
      const daysToPayment = await db
        .select({
          avg_days: sql`AVG(EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`,
          median_days: sql`PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`,
          min_days: sql`MIN(EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::int`,
          max_days: sql`MAX(EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::int`,
          p25_days: sql`PERCENTILE_CONT(0.25) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`,
          p75_days: sql`PERCENTILE_CONT(0.75) WITHIN GROUP (ORDER BY EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            sql`${claims.paid_date} IS NOT NULL`,
            sql`${claims.submission_date} IS NOT NULL`,
            isNull(claims.deleted_at)
          )
        );

      // Net collection rate
      const collectionData = await db
        .select({
          total_charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
          total_payments: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`,
          total_adjustments: sql`COALESCE(SUM(${claims.total_adjustments}), 0)::bigint`
        })
        .from(claims)
        .where(
          and(
            gte(claims.service_start_date, startDate),
            lte(claims.service_start_date, endDate),
            isNull(claims.deleted_at)
          )
        );

      const totalCharges = parseInt(collectionData[0]?.total_charges || 0);
      const totalPayments = parseInt(collectionData[0]?.total_payments || 0);
      const adjustments = parseInt(collectionData[0]?.total_adjustments || 0);
      const expectedRevenue = totalCharges - adjustments;
      const netCollectionRate = expectedRevenue > 0
        ? parseFloat(((totalPayments / expectedRevenue) * 100).toFixed(1))
        : 0;

      const avgDays = parseFloat(daysToPayment[0]?.avg_days || 0);

      return {
        avg_days_to_payment: parseFloat(avgDays.toFixed(1)),
        avg_days_status: this.evaluateMetric('days_to_payment', avgDays),
        median_days_to_payment: Math.round(parseFloat(daysToPayment[0]?.median_days || 0)),
        min_days: parseInt(daysToPayment[0]?.min_days || 0),
        max_days: parseInt(daysToPayment[0]?.max_days || 0),
        p25_days: Math.round(parseFloat(daysToPayment[0]?.p25_days || 0)),
        p75_days: Math.round(parseFloat(daysToPayment[0]?.p75_days || 0)),
        net_collection_rate: netCollectionRate,
        net_collection_rate_status: this.evaluateMetric('net_collection_rate', netCollectionRate)
      };
    } catch (error) {
      logger.error('Error calculating collection metrics:', error);
      return {
        avg_days_to_payment: 0,
        median_days_to_payment: 0,
        net_collection_rate: 0
      };
    }
  }

  // ==========================================================================
  // TIME-SERIES ANALYSIS
  // ==========================================================================

  /**
   * Get time-series data with trend analysis
   * @param {string} metricType - Type of metric
   * @param {Date} startDate - Start date
   * @param {Date} endDate - End date
   * @param {string} interval - Time interval (day, week, month)
   * @returns {Promise<object>} Time-series with trends
   */
  async getMetricTimeSeries(metricType, startDate, endDate, interval = 'month') {
    try {
      let dataPoints;

      switch (metricType) {
        case 'revenue':
          dataPoints = await this.getRevenueTimeSeries(startDate, endDate, interval);
          break;
        case 'claims':
          dataPoints = await this.getClaimsTimeSeries(startDate, endDate, interval);
          break;
        case 'collections':
          dataPoints = await this.getCollectionsTimeSeries(startDate, endDate, interval);
          break;
        case 'encounters':
          dataPoints = await this.getEncountersTimeSeries(startDate, endDate, interval);
          break;
        default:
          throw new Error(`Unknown metric type: ${metricType}`);
      }

      const values = dataPoints.map(dp => dp.value);
      const movingAvg = this.calculateMovingAverage(values, 3);
      const ema = this.calculateEMA(values);
      const trend = this.detectTrend(values);

      return {
        metric_type: metricType,
        period: {
          start: startDate.toISOString().split('T')[0],
          end: endDate.toISOString().split('T')[0]
        },
        interval,
        data_points: dataPoints.map((dp, i) => ({
          ...dp,
          moving_avg: movingAvg[i],
          ema: ema[i] ? parseFloat(ema[i].toFixed(2)) : null
        })),
        statistics: {
          count: values.length,
          sum: values.reduce((a, b) => a + b, 0),
          mean: values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0,
          std_dev: this.calculateStandardDeviation(values),
          min: Math.min(...values),
          max: Math.max(...values),
          p25: this.calculatePercentile(values, 25),
          p50: this.calculatePercentile(values, 50),
          p75: this.calculatePercentile(values, 75)
        },
        trend
      };
    } catch (error) {
      logger.error('Error getting metric time-series:', error);
      throw new Error(`Failed to get ${metricType} time-series: ${error.message}`);
    }
  }

  /**
   * Get revenue time-series
   */
  async getRevenueTimeSeries(startDate, endDate, interval) {
    const result = await db
      .select({
        period: sql`TO_CHAR(DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${claims.service_start_date}), 'YYYY-MM-DD')`,
        value: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`,
        charges: sql`COALESCE(SUM(${claims.total_charges}), 0)::bigint`,
        claim_count: sql`COUNT(*)::int`
      })
      .from(claims)
      .where(
        and(
          gte(claims.service_start_date, startDate),
          lte(claims.service_start_date, endDate),
          isNull(claims.deleted_at)
        )
      )
      .groupBy(sql`DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${claims.service_start_date})`)
      .orderBy(sql`DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${claims.service_start_date})`);

    return result.map(r => ({
      period: r.period,
      value: parseInt(r.value),
      value_formatted: this.formatCurrency(parseInt(r.value)),
      charges: parseInt(r.charges),
      charges_formatted: this.formatCurrency(parseInt(r.charges)),
      claim_count: r.claim_count
    }));
  }

  /**
   * Get claims time-series
   */
  async getClaimsTimeSeries(startDate, endDate, interval) {
    const result = await db
      .select({
        period: sql`TO_CHAR(DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${claims.service_start_date}), 'YYYY-MM-DD')`,
        value: sql`COUNT(*)::int`,
        clean_claims: sql`COUNT(CASE WHEN ${claims.scrubbing_passed} = true THEN 1 END)::int`,
        denied_claims: sql`COUNT(CASE WHEN ${claims.claim_status} IN ('DENIED', 'REJECTED') THEN 1 END)::int`
      })
      .from(claims)
      .where(
        and(
          gte(claims.service_start_date, startDate),
          lte(claims.service_start_date, endDate),
          isNull(claims.deleted_at)
        )
      )
      .groupBy(sql`DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${claims.service_start_date})`)
      .orderBy(sql`DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${claims.service_start_date})`);

    return result.map(r => ({
      period: r.period,
      value: r.value,
      clean_claims: r.clean_claims,
      denied_claims: r.denied_claims,
      clean_rate: r.value > 0 ? parseFloat(((r.clean_claims / r.value) * 100).toFixed(1)) : 0,
      denial_rate: r.value > 0 ? parseFloat(((r.denied_claims / r.value) * 100).toFixed(1)) : 0
    }));
  }

  /**
   * Get collections time-series
   */
  async getCollectionsTimeSeries(startDate, endDate, interval) {
    const result = await db
      .select({
        period: sql`TO_CHAR(DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${claims.paid_date}), 'YYYY-MM-DD')`,
        value: sql`COALESCE(SUM(${claims.total_paid}), 0)::bigint`,
        claim_count: sql`COUNT(*)::int`,
        avg_days: sql`AVG(EXTRACT(DAY FROM (${claims.paid_date} - ${claims.submission_date})))::numeric`
      })
      .from(claims)
      .where(
        and(
          gte(claims.paid_date, startDate),
          lte(claims.paid_date, endDate),
          sql`${claims.paid_date} IS NOT NULL`,
          isNull(claims.deleted_at)
        )
      )
      .groupBy(sql`DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${claims.paid_date})`)
      .orderBy(sql`DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${claims.paid_date})`);

    return result.map(r => ({
      period: r.period,
      value: parseInt(r.value),
      value_formatted: this.formatCurrency(parseInt(r.value)),
      claim_count: r.claim_count,
      avg_days_to_payment: r.avg_days ? parseFloat(parseFloat(r.avg_days).toFixed(1)) : 0
    }));
  }

  /**
   * Get encounters time-series
   */
  async getEncountersTimeSeries(startDate, endDate, interval) {
    const result = await db
      .select({
        period: sql`TO_CHAR(DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${encounters.encounter_date}), 'YYYY-MM-DD')`,
        value: sql`COUNT(*)::int`,
        avg_duration: sql`AVG(${encounters.encounter_duration_minutes})::numeric`,
        unique_patients: sql`COUNT(DISTINCT ${encounters.patient_id})::int`
      })
      .from(encounters)
      .where(
        and(
          gte(encounters.encounter_date, startDate),
          lte(encounters.encounter_date, endDate),
          isNull(encounters.deleted_at)
        )
      )
      .groupBy(sql`DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${encounters.encounter_date})`)
      .orderBy(sql`DATE_TRUNC(${sql.raw(`'${interval}'`)}, ${encounters.encounter_date})`);

    return result.map(r => ({
      period: r.period,
      value: r.value,
      avg_duration_minutes: r.avg_duration ? parseFloat(parseFloat(r.avg_duration).toFixed(1)) : 0,
      unique_patients: r.unique_patients
    }));
  }

  // ==========================================================================
  // FORECASTING
  // ==========================================================================

  /**
   * Generate forecast using multiple methods
   * @param {string} metricType - Metric to forecast
   * @param {number} periodsAhead - Number of periods to forecast
   * @returns {Promise<object>} Forecast results
   */
  async generateForecast(metricType, periodsAhead = 3) {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const historicalData = await this.getMetricTimeSeries(
        metricType,
        sixMonthsAgo,
        new Date(),
        'month'
      );

      const values = historicalData.data_points.map(dp => dp.value);

      if (values.length < 3) {
        return {
          metric_type: metricType,
          error: 'Insufficient historical data for forecasting',
          min_required_periods: 3,
          available_periods: values.length
        };
      }

      // Simple moving average forecast
      const smaForecast = this.forecastSMA(values, periodsAhead);

      // Exponential smoothing forecast
      const esForecast = this.forecastExponentialSmoothing(values, periodsAhead);

      // Linear trend forecast
      const trendForecast = this.forecastLinearTrend(values, periodsAhead);

      // Combine forecasts (ensemble)
      const ensembleForecast = smaForecast.map((_, i) => ({
        period: i + 1,
        sma: smaForecast[i],
        exponential_smoothing: esForecast[i],
        linear_trend: trendForecast[i],
        ensemble: Math.round((smaForecast[i] + esForecast[i] + trendForecast[i]) / 3)
      }));

      return {
        metric_type: metricType,
        forecast_date: new Date().toISOString().split('T')[0],
        periods_ahead: periodsAhead,
        historical_periods: values.length,
        forecasts: ensembleForecast,
        confidence_interval: this.calculateForecastConfidence(values, ensembleForecast),
        methodology: 'Ensemble (SMA + Exponential Smoothing + Linear Trend)'
      };
    } catch (error) {
      logger.error('Error generating forecast:', error);
      throw new Error(`Failed to generate forecast: ${error.message}`);
    }
  }

  /**
   * Simple Moving Average forecast
   */
  forecastSMA(values, periodsAhead, window = 3) {
    const forecasts = [];
    const workingValues = [...values];

    for (let i = 0; i < periodsAhead; i++) {
      const recentValues = workingValues.slice(-window);
      const forecast = Math.round(recentValues.reduce((a, b) => a + b, 0) / window);
      forecasts.push(forecast);
      workingValues.push(forecast);
    }

    return forecasts;
  }

  /**
   * Exponential Smoothing forecast
   */
  forecastExponentialSmoothing(values, periodsAhead, alpha = 0.3) {
    const ema = this.calculateEMA(values, alpha);
    const lastEMA = ema[ema.length - 1];
    return Array(periodsAhead).fill(Math.round(lastEMA));
  }

  /**
   * Linear Trend forecast
   */
  forecastLinearTrend(values, periodsAhead) {
    const n = values.length;
    const xMean = (n - 1) / 2;
    const yMean = values.reduce((a, b) => a + b, 0) / n;

    let numerator = 0;
    let denominator = 0;

    for (let i = 0; i < n; i++) {
      numerator += (i - xMean) * (values[i] - yMean);
      denominator += Math.pow(i - xMean, 2);
    }

    const slope = denominator !== 0 ? numerator / denominator : 0;
    const intercept = yMean - slope * xMean;

    const forecasts = [];
    for (let i = 0; i < periodsAhead; i++) {
      const x = n + i;
      forecasts.push(Math.round(intercept + slope * x));
    }

    return forecasts;
  }

  /**
   * Calculate forecast confidence intervals
   */
  calculateForecastConfidence(historicalValues, forecasts) {
    const stdDev = this.calculateStandardDeviation(historicalValues);
    const avgForecast = forecasts.reduce((sum, f) => sum + f.ensemble, 0) / forecasts.length;

    return {
      standard_deviation: parseFloat(stdDev.toFixed(2)),
      confidence_95_lower: Math.round(avgForecast - 1.96 * stdDev),
      confidence_95_upper: Math.round(avgForecast + 1.96 * stdDev),
      confidence_level: stdDev < avgForecast * 0.1 ? 'high' :
                       stdDev < avgForecast * 0.25 ? 'medium' : 'low'
    };
  }

  // ==========================================================================
  // HELPER METHODS
  // ==========================================================================

  /**
   * Evaluate metric against benchmarks
   */
  evaluateMetric(metricName, value) {
    const benchmark = this.benchmarks[metricName];
    if (!benchmark) return 'unknown';

    // For metrics where lower is better (days_to_payment, denial_rate)
    const lowerIsBetter = ['days_to_payment', 'denial_rate'].includes(metricName);

    if (lowerIsBetter) {
      if (value <= benchmark.excellent) return 'excellent';
      if (value <= benchmark.target) return 'on_target';
      if (value <= benchmark.warning) return 'warning';
      return 'critical';
    } else {
      if (value >= benchmark.excellent) return 'excellent';
      if (value >= benchmark.target) return 'on_target';
      if (value >= benchmark.warning) return 'warning';
      return 'critical';
    }
  }

  /**
   * Format currency (cents to dollars)
   */
  formatCurrency(cents) {
    const dollars = cents / 100;
    return `$${dollars.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
}

export default new MetricsEngineService();
