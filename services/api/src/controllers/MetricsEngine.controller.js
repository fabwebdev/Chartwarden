import MetricsEngineService from '../services/MetricsEngine.service.js';
import DashboardAggregationService from '../services/DashboardAggregation.service.js';
import { logger } from '../utils/logger.js';

/**
 * Metrics Engine Controller
 *
 * Advanced analytics endpoints for metrics calculation, dashboard aggregation,
 * and trend analysis.
 *
 * Endpoints:
 * - GET /api/metrics/comprehensive - Comprehensive metrics for a period
 * - GET /api/metrics/time-series/:type - Time-series data with trends
 * - GET /api/metrics/forecast/:type - Metric forecasting
 * - GET /api/dashboards/executive - Executive dashboard
 * - GET /api/dashboards/financial - Financial dashboard
 * - GET /api/dashboards/clinical - Clinical dashboard
 * - GET /api/metrics/compare - Period comparison
 */
class MetricsEngineController {

  // ==========================================================================
  // COMPREHENSIVE METRICS
  // ==========================================================================

  /**
   * Get comprehensive metrics for a date range
   * GET /api/metrics/comprehensive
   *
   * Query: start_date, end_date
   * Response: { status, data: { period, financial, operational, claims, collections } }
   */
  async getComprehensiveMetrics(request, reply) {
    try {
      const { start_date, end_date } = request.query;

      if (!start_date || !end_date) {
        reply.code(400);
        return {
          status: 'error',
          message: 'start_date and end_date query parameters are required'
        };
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Invalid date format. Use YYYY-MM-DD'
        };
      }

      if (startDate > endDate) {
        reply.code(400);
        return {
          status: 'error',
          message: 'start_date must be before end_date'
        };
      }

      const metrics = await MetricsEngineService.calculateComprehensiveMetrics(startDate, endDate);

      reply.code(200);
      return {
        status: 'success',
        data: metrics
      };
    } catch (error) {
      logger.error('Error in getComprehensiveMetrics:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get comprehensive metrics',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  // ==========================================================================
  // TIME-SERIES ANALYSIS
  // ==========================================================================

  /**
   * Get time-series data with trend analysis
   * GET /api/metrics/time-series/:type
   *
   * Params: type (revenue, claims, collections, encounters)
   * Query: start_date, end_date, interval (day, week, month)
   * Response: { status, data: { data_points, statistics, trend } }
   */
  async getTimeSeries(request, reply) {
    try {
      const { type } = request.params;
      const { start_date, end_date, interval = 'month' } = request.query;

      const validTypes = ['revenue', 'claims', 'collections', 'encounters'];
      if (!validTypes.includes(type)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid metric type. Must be one of: ${validTypes.join(', ')}`
        };
      }

      if (!start_date || !end_date) {
        reply.code(400);
        return {
          status: 'error',
          message: 'start_date and end_date query parameters are required'
        };
      }

      const validIntervals = ['day', 'week', 'month', 'quarter'];
      if (!validIntervals.includes(interval)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid interval. Must be one of: ${validIntervals.join(', ')}`
        };
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Invalid date format. Use YYYY-MM-DD'
        };
      }

      const timeSeries = await MetricsEngineService.getMetricTimeSeries(type, startDate, endDate, interval);

      reply.code(200);
      return {
        status: 'success',
        data: timeSeries
      };
    } catch (error) {
      logger.error('Error in getTimeSeries:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get time-series data',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  // ==========================================================================
  // FORECASTING
  // ==========================================================================

  /**
   * Get metric forecast
   * GET /api/metrics/forecast/:type
   *
   * Params: type (revenue, claims, collections, encounters)
   * Query: periods_ahead (default: 3)
   * Response: { status, data: { forecasts, confidence_interval, methodology } }
   */
  async getForecast(request, reply) {
    try {
      const { type } = request.params;
      const { periods_ahead = 3 } = request.query;

      const validTypes = ['revenue', 'claims', 'collections', 'encounters'];
      if (!validTypes.includes(type)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid metric type. Must be one of: ${validTypes.join(', ')}`
        };
      }

      const periodsAhead = parseInt(periods_ahead);
      if (isNaN(periodsAhead) || periodsAhead < 1 || periodsAhead > 12) {
        reply.code(400);
        return {
          status: 'error',
          message: 'periods_ahead must be a number between 1 and 12'
        };
      }

      const forecast = await MetricsEngineService.generateForecast(type, periodsAhead);

      reply.code(200);
      return {
        status: 'success',
        data: forecast
      };
    } catch (error) {
      logger.error('Error in getForecast:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to generate forecast',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  // ==========================================================================
  // DASHBOARD AGGREGATION
  // ==========================================================================

  /**
   * Get executive dashboard
   * GET /api/dashboards/executive
   *
   * Query: period (current_month, last_month, current_quarter, ytd, last_30_days, last_90_days)
   * Response: { status, data: { period, kpis, financial, clinical, operational, compliance, alerts } }
   */
  async getExecutiveDashboard(request, reply) {
    try {
      const { period = 'current_month', include_comparison = 'true' } = request.query;

      const validPeriods = ['current_month', 'last_month', 'current_quarter', 'ytd', 'last_30_days', 'last_90_days'];
      if (!validPeriods.includes(period)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
        };
      }

      const dashboard = await DashboardAggregationService.getExecutiveDashboard({
        period,
        includeComparison: include_comparison === 'true'
      });

      reply.code(200);
      return {
        status: 'success',
        data: dashboard
      };
    } catch (error) {
      logger.error('Error in getExecutiveDashboard:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get executive dashboard',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get financial dashboard
   * GET /api/dashboards/financial
   *
   * Query: period
   * Response: { status, data: { summary, revenue_trend, ar_aging_trend, payer_mix } }
   */
  async getFinancialDashboard(request, reply) {
    try {
      const { period = 'current_month' } = request.query;

      const validPeriods = ['current_month', 'last_month', 'current_quarter', 'ytd', 'last_30_days', 'last_90_days'];
      if (!validPeriods.includes(period)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
        };
      }

      const dashboard = await DashboardAggregationService.getFinancialDashboard({ period });

      reply.code(200);
      return {
        status: 'success',
        data: dashboard
      };
    } catch (error) {
      logger.error('Error in getFinancialDashboard:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get financial dashboard',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get clinical dashboard
   * GET /api/dashboards/clinical
   *
   * Query: period
   * Response: { status, data: { summary, encounter_trend, discipline_distribution } }
   */
  async getClinicalDashboard(request, reply) {
    try {
      const { period = 'current_month' } = request.query;

      const validPeriods = ['current_month', 'last_month', 'current_quarter', 'ytd', 'last_30_days', 'last_90_days'];
      if (!validPeriods.includes(period)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
        };
      }

      const dashboard = await DashboardAggregationService.getClinicalDashboard({ period });

      reply.code(200);
      return {
        status: 'success',
        data: dashboard
      };
    } catch (error) {
      logger.error('Error in getClinicalDashboard:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get clinical dashboard',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  // ==========================================================================
  // PERIOD COMPARISON
  // ==========================================================================

  /**
   * Compare metrics between two periods
   * GET /api/metrics/compare
   *
   * Query: current_start, current_end, previous_start, previous_end
   * Response: { status, data: { current, previous, comparison } }
   */
  async comparePeriods(request, reply) {
    try {
      const { current_start, current_end, previous_start, previous_end } = request.query;

      if (!current_start || !current_end || !previous_start || !previous_end) {
        reply.code(400);
        return {
          status: 'error',
          message: 'All date parameters are required: current_start, current_end, previous_start, previous_end'
        };
      }

      const currentStartDate = new Date(current_start);
      const currentEndDate = new Date(current_end);
      const previousStartDate = new Date(previous_start);
      const previousEndDate = new Date(previous_end);

      if ([currentStartDate, currentEndDate, previousStartDate, previousEndDate].some(d => isNaN(d.getTime()))) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Invalid date format. Use YYYY-MM-DD'
        };
      }

      const [currentMetrics, previousMetrics] = await Promise.all([
        MetricsEngineService.calculateComprehensiveMetrics(currentStartDate, currentEndDate),
        MetricsEngineService.calculateComprehensiveMetrics(previousStartDate, previousEndDate)
      ]);

      // Calculate comparisons
      const comparison = {
        revenue: {
          current: currentMetrics.financial.total_payments,
          previous: previousMetrics.financial.total_payments,
          change: MetricsEngineService.calculateYoYChange(
            currentMetrics.financial.total_payments,
            previousMetrics.financial.total_payments
          )
        },
        claims: {
          current: currentMetrics.claims.total_claims,
          previous: previousMetrics.claims.total_claims,
          change: MetricsEngineService.calculateYoYChange(
            currentMetrics.claims.total_claims,
            previousMetrics.claims.total_claims
          )
        },
        clean_claim_rate: {
          current: currentMetrics.claims.clean_claim_rate,
          previous: previousMetrics.claims.clean_claim_rate,
          change: MetricsEngineService.calculateYoYChange(
            currentMetrics.claims.clean_claim_rate,
            previousMetrics.claims.clean_claim_rate
          )
        },
        days_to_payment: {
          current: currentMetrics.collections.avg_days_to_payment,
          previous: previousMetrics.collections.avg_days_to_payment,
          change: MetricsEngineService.calculateYoYChange(
            currentMetrics.collections.avg_days_to_payment,
            previousMetrics.collections.avg_days_to_payment
          ),
          improved: currentMetrics.collections.avg_days_to_payment < previousMetrics.collections.avg_days_to_payment
        },
        net_collection_rate: {
          current: currentMetrics.collections.net_collection_rate,
          previous: previousMetrics.collections.net_collection_rate,
          change: MetricsEngineService.calculateYoYChange(
            currentMetrics.collections.net_collection_rate,
            previousMetrics.collections.net_collection_rate
          )
        }
      };

      reply.code(200);
      return {
        status: 'success',
        data: {
          current_period: {
            start: current_start,
            end: current_end,
            metrics: currentMetrics
          },
          previous_period: {
            start: previous_start,
            end: previous_end,
            metrics: previousMetrics
          },
          comparison
        }
      };
    } catch (error) {
      logger.error('Error in comparePeriods:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to compare periods',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  // ==========================================================================
  // STATISTICAL ANALYSIS
  // ==========================================================================

  /**
   * Get statistical analysis for a metric
   * GET /api/metrics/statistics/:type
   *
   * Params: type (revenue, claims, collections, encounters)
   * Query: start_date, end_date
   * Response: { status, data: { statistics, distribution, outliers } }
   */
  async getStatistics(request, reply) {
    try {
      const { type } = request.params;
      const { start_date, end_date } = request.query;

      const validTypes = ['revenue', 'claims', 'collections', 'encounters'];
      if (!validTypes.includes(type)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid metric type. Must be one of: ${validTypes.join(', ')}`
        };
      }

      if (!start_date || !end_date) {
        reply.code(400);
        return {
          status: 'error',
          message: 'start_date and end_date query parameters are required'
        };
      }

      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Invalid date format. Use YYYY-MM-DD'
        };
      }

      // Get time series data for statistical analysis
      const timeSeries = await MetricsEngineService.getMetricTimeSeries(type, startDate, endDate, 'day');
      const values = timeSeries.data_points.map(dp => dp.value);

      // Calculate additional statistics
      const statistics = {
        ...timeSeries.statistics,
        variance: Math.pow(timeSeries.statistics.std_dev, 2),
        coefficient_of_variation: timeSeries.statistics.mean > 0
          ? (timeSeries.statistics.std_dev / timeSeries.statistics.mean) * 100
          : 0,
        skewness: this.calculateSkewness(values),
        kurtosis: this.calculateKurtosis(values)
      };

      // Detect outliers using IQR method
      const q1 = timeSeries.statistics.p25;
      const q3 = timeSeries.statistics.p75;
      const iqr = q3 - q1;
      const lowerBound = q1 - 1.5 * iqr;
      const upperBound = q3 + 1.5 * iqr;

      const outliers = timeSeries.data_points.filter(dp =>
        dp.value < lowerBound || dp.value > upperBound
      ).map(dp => ({
        period: dp.period,
        value: dp.value,
        type: dp.value < lowerBound ? 'low' : 'high'
      }));

      reply.code(200);
      return {
        status: 'success',
        data: {
          metric_type: type,
          period: timeSeries.period,
          statistics: {
            ...statistics,
            coefficient_of_variation: parseFloat(statistics.coefficient_of_variation.toFixed(2)),
            skewness: parseFloat(statistics.skewness.toFixed(4)),
            kurtosis: parseFloat(statistics.kurtosis.toFixed(4))
          },
          distribution: {
            iqr,
            lower_bound: lowerBound,
            upper_bound: upperBound
          },
          outliers,
          trend: timeSeries.trend
        }
      };
    } catch (error) {
      logger.error('Error in getStatistics:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get statistics',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Calculate skewness
   * @private
   */
  calculateSkewness(values) {
    if (!values || values.length < 3) return 0;

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const stdDev = MetricsEngineService.calculateStandardDeviation(values);

    if (stdDev === 0) return 0;

    const cubedDiffs = values.map(v => Math.pow((v - mean) / stdDev, 3));
    return cubedDiffs.reduce((a, b) => a + b, 0) / n;
  }

  /**
   * Calculate kurtosis
   * @private
   */
  calculateKurtosis(values) {
    if (!values || values.length < 4) return 0;

    const n = values.length;
    const mean = values.reduce((a, b) => a + b, 0) / n;
    const stdDev = MetricsEngineService.calculateStandardDeviation(values);

    if (stdDev === 0) return 0;

    const fourthPowerDiffs = values.map(v => Math.pow((v - mean) / stdDev, 4));
    return (fourthPowerDiffs.reduce((a, b) => a + b, 0) / n) - 3; // Excess kurtosis
  }
}

export default new MetricsEngineController();
