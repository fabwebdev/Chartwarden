import AnalyticsService from '../services/Analytics.service.js';
import CacheService from '../services/CacheService.js';

import { logger } from '../utils/logger.js';

/**
 * Analytics Controller
 * Phase 2D - Enhanced Reporting & Dashboard Data Retrieval
 *
 * Revenue cycle analytics, KPI dashboards, and comprehensive dashboard data
 * Features:
 *   - Comprehensive KPI dashboard
 *   - Dashboard summary with aggregated metrics
 *   - User activity metrics
 *   - Activity trends (daily, weekly, monthly)
 *   - Clean claim rate tracking
 *   - Days to payment analysis
 *   - Denial rate by payer
 *   - Net collection rate
 *   - Revenue forecasting
 *   - AR aging trends
 *   - Report export (CSV/Excel)
 *   - Caching for frequently requested data
 *   - Pagination for large datasets
 *
 * Endpoints:
 * - GET /api/analytics/dashboard-summary - Aggregated dashboard metrics
 * - GET /api/analytics/user-metrics - User activity and engagement metrics
 * - GET /api/analytics/activity-trends - Activity trends over time
 * - GET /api/analytics/performance-stats - System performance statistics
 * - GET /api/analytics/kpi-dashboard - Comprehensive KPI dashboard
 * - GET /api/analytics/clean-claim-rate - Clean claim rate time-series
 * - GET /api/analytics/days-to-payment - Days to payment trend
 * - GET /api/analytics/denial-rate-by-payer - Denial rates by payer
 * - GET /api/analytics/net-collection-rate - Net collection rate
 * - GET /api/analytics/revenue-forecast - Revenue forecast
 * - GET /api/analytics/ar-aging-trend - AR aging time-series
 * - POST /api/analytics/export-report - Export report to CSV/Excel
 */
class AnalyticsController {
  constructor() {
    this.cachePrefix = 'analytics:';
    this.defaultCacheTTL = 300; // 5 minutes
  }

  /**
   * Build cache key from request parameters
   * @private
   */
  buildCacheKey(endpoint, params = {}) {
    const sortedParams = Object.keys(params)
      .sort()
      .map(key => `${key}=${params[key]}`)
      .join('&');
    return `${this.cachePrefix}${endpoint}:${sortedParams || 'default'}`;
  }

  /**
   * Get cached data or fetch fresh
   * @private
   */
  async getCachedOrFetch(cacheKey, fetchFn, ttl = this.defaultCacheTTL) {
    try {
      const cached = await CacheService.get(cacheKey);
      if (cached) {
        const parsed = typeof cached === 'string' ? JSON.parse(cached) : cached;
        return { data: parsed, fromCache: true };
      }
    } catch (error) {
      // Cache miss or parse error - continue to fetch
    }

    const data = await fetchFn();

    try {
      await CacheService.set(cacheKey, JSON.stringify(data), ttl);
    } catch (error) {
      // Cache set failed - continue without caching
    }

    return { data, fromCache: false };
  }

  /**
   * Parse and validate date range from request
   * @private
   */
  parseDateRange(query) {
    const { start_date, end_date, range } = query;

    // Handle predefined ranges
    if (range) {
      const now = new Date();
      const startDate = new Date();

      switch (range) {
        case 'today':
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'yesterday':
          startDate.setDate(now.getDate() - 1);
          startDate.setHours(0, 0, 0, 0);
          now.setDate(now.getDate() - 1);
          now.setHours(23, 59, 59, 999);
          break;
        case 'last_7_days':
          startDate.setDate(now.getDate() - 7);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'last_30_days':
          startDate.setDate(now.getDate() - 30);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'last_90_days':
          startDate.setDate(now.getDate() - 90);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'current_month':
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          break;
        case 'last_month':
          startDate.setMonth(now.getMonth() - 1);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          now.setDate(0); // Last day of previous month
          now.setHours(23, 59, 59, 999);
          break;
        case 'ytd':
          startDate.setMonth(0);
          startDate.setDate(1);
          startDate.setHours(0, 0, 0, 0);
          break;
        default:
          return { valid: false, error: `Invalid range: ${range}` };
      }

      return { valid: true, startDate, endDate: now, range };
    }

    // Handle custom date range
    if (start_date && end_date) {
      const startDate = new Date(start_date);
      const endDate = new Date(end_date);

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return { valid: false, error: 'Invalid date format. Use YYYY-MM-DD' };
      }

      if (startDate > endDate) {
        return { valid: false, error: 'start_date must be before end_date' };
      }

      // Limit date range to prevent expensive queries (max 1 year)
      const maxRange = 365 * 24 * 60 * 60 * 1000;
      if (endDate - startDate > maxRange) {
        return { valid: false, error: 'Date range cannot exceed 1 year' };
      }

      return { valid: true, startDate, endDate };
    }

    // Default to last 30 days
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);
    startDate.setHours(0, 0, 0, 0);

    return { valid: true, startDate, endDate, range: 'last_30_days' };
  }

  /**
   * Parse pagination parameters
   * @private
   */
  parsePagination(query, defaults = { page: 1, limit: 50, maxLimit: 500 }) {
    const page = Math.max(1, parseInt(query.page) || defaults.page);
    const limit = Math.min(
      defaults.maxLimit,
      Math.max(1, parseInt(query.limit) || defaults.limit)
    );
    const offset = (page - 1) * limit;

    return { page, limit, offset };
  }

  /**
   * Get comprehensive dashboard summary
   * GET /api/analytics/dashboard-summary?range=last_30_days
   *
   * Query: range (today, yesterday, last_7_days, last_30_days, last_90_days, current_month, last_month, ytd)
   *        OR start_date + end_date for custom range
   * Response: { status, data: { period, summary, kpis, trends } }
   */
  async getDashboardSummary(request, reply) {
    try {
      const dateRange = this.parseDateRange(request.query);
      if (!dateRange.valid) {
        reply.code(400);
        return { status: 'error', message: dateRange.error };
      }

      const cacheKey = this.buildCacheKey('dashboard-summary', {
        start: dateRange.startDate.toISOString().split('T')[0],
        end: dateRange.endDate.toISOString().split('T')[0]
      });

      const { data, fromCache } = await this.getCachedOrFetch(cacheKey, async () => {
        return await AnalyticsService.getDashboardSummary(
          dateRange.startDate,
          dateRange.endDate
        );
      });

      reply.code(200);
      reply.header('X-Cache-Status', fromCache ? 'HIT' : 'MISS');
      return {
        status: 'success',
        data
      };
    } catch (error) {
      logger.error('Error in getDashboardSummary:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get dashboard summary',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get user activity and engagement metrics
   * GET /api/analytics/user-metrics?range=last_30_days&page=1&limit=50
   *
   * Query: range, start_date, end_date, page, limit
   * Response: { status, data: { period, metrics, top_users, pagination } }
   */
  async getUserMetrics(request, reply) {
    try {
      const dateRange = this.parseDateRange(request.query);
      if (!dateRange.valid) {
        reply.code(400);
        return { status: 'error', message: dateRange.error };
      }

      const pagination = this.parsePagination(request.query);

      const cacheKey = this.buildCacheKey('user-metrics', {
        start: dateRange.startDate.toISOString().split('T')[0],
        end: dateRange.endDate.toISOString().split('T')[0],
        page: pagination.page,
        limit: pagination.limit
      });

      const { data, fromCache } = await this.getCachedOrFetch(cacheKey, async () => {
        return await AnalyticsService.getUserMetrics(
          dateRange.startDate,
          dateRange.endDate,
          pagination
        );
      });

      reply.code(200);
      reply.header('X-Cache-Status', fromCache ? 'HIT' : 'MISS');
      return {
        status: 'success',
        data
      };
    } catch (error) {
      logger.error('Error in getUserMetrics:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get user metrics',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get activity trends over time
   * GET /api/analytics/activity-trends?range=last_30_days&group_by=day
   *
   * Query: range, start_date, end_date, group_by (day, week, month)
   * Response: { status, data: { period, trends, summary } }
   */
  async getActivityTrends(request, reply) {
    try {
      const dateRange = this.parseDateRange(request.query);
      if (!dateRange.valid) {
        reply.code(400);
        return { status: 'error', message: dateRange.error };
      }

      const groupBy = request.query.group_by || 'day';
      const validGroupBy = ['day', 'week', 'month'];
      if (!validGroupBy.includes(groupBy)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid group_by. Must be one of: ${validGroupBy.join(', ')}`
        };
      }

      const cacheKey = this.buildCacheKey('activity-trends', {
        start: dateRange.startDate.toISOString().split('T')[0],
        end: dateRange.endDate.toISOString().split('T')[0],
        group_by: groupBy
      });

      const { data, fromCache } = await this.getCachedOrFetch(cacheKey, async () => {
        return await AnalyticsService.getActivityTrends(
          dateRange.startDate,
          dateRange.endDate,
          groupBy
        );
      });

      reply.code(200);
      reply.header('X-Cache-Status', fromCache ? 'HIT' : 'MISS');
      return {
        status: 'success',
        data
      };
    } catch (error) {
      logger.error('Error in getActivityTrends:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get activity trends',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get performance statistics
   * GET /api/analytics/performance-stats?range=last_7_days
   *
   * Query: range, start_date, end_date
   * Response: { status, data: { period, response_times, throughput, errors } }
   */
  async getPerformanceStats(request, reply) {
    try {
      const dateRange = this.parseDateRange(request.query);
      if (!dateRange.valid) {
        reply.code(400);
        return { status: 'error', message: dateRange.error };
      }

      const cacheKey = this.buildCacheKey('performance-stats', {
        start: dateRange.startDate.toISOString().split('T')[0],
        end: dateRange.endDate.toISOString().split('T')[0]
      });

      const { data, fromCache } = await this.getCachedOrFetch(cacheKey, async () => {
        return await AnalyticsService.getPerformanceStats(
          dateRange.startDate,
          dateRange.endDate
        );
      }, 60); // Shorter cache TTL for performance stats

      reply.code(200);
      reply.header('X-Cache-Status', fromCache ? 'HIT' : 'MISS');
      return {
        status: 'success',
        data
      };
    } catch (error) {
      logger.error('Error in getPerformanceStats:', error);
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get performance stats',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get comprehensive KPI dashboard
   * GET /api/analytics/kpi-dashboard?period=current_month
   *
   * Query: period (current_month, last_month, current_quarter, ytd)
   * Response: { status, data: { period, kpis, as_of } }
   */
  async getKPIDashboard(request, reply) {
    try {
      const { period = 'current_month' } = request.query;

      const validPeriods = ['current_month', 'last_month', 'current_quarter', 'ytd'];
      if (!validPeriods.includes(period)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid period. Must be one of: ${validPeriods.join(', ')}`
        };
      }

      const dashboard = await AnalyticsService.getKPIDashboard(period);

      reply.code(200);
      return {
        status: 'success',
        data: dashboard
      };
    } catch (error) {
      logger.error('Error in getKPIDashboard:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get KPI dashboard',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get clean claim rate time-series
   * GET /api/analytics/clean-claim-rate?start_date=2024-01-01&end_date=2025-01-15&group_by=month
   *
   * Query: start_date, end_date, group_by (day, week, month)
   * Response: { status, data: { period, data_points, overall_clean_rate } }
   */
  async getCleanClaimRate(request, reply) {
    try {
      const { start_date, end_date, group_by = 'month' } = request.query;

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

      const data = await AnalyticsService.getCleanClaimRateTimeSeries(startDate, endDate, group_by);

      reply.code(200);
      return {
        status: 'success',
        data
      };
    } catch (error) {
      logger.error('Error in getCleanClaimRate:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get clean claim rate',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get days to payment trend
   * GET /api/analytics/days-to-payment?start_date=2024-01-01&end_date=2025-01-15
   *
   * Query: start_date, end_date
   * Response: { status, data: { data_points, overall_average } }
   */
  async getDaysToPayment(request, reply) {
    try {
      const { start_date, end_date, group_by = 'month' } = request.query;

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

      const data = await AnalyticsService.getDaysToPaymentTimeSeries(startDate, endDate, group_by);

      reply.code(200);
      return {
        status: 'success',
        data
      };
    } catch (error) {
      logger.error('Error in getDaysToPayment:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get days to payment',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get denial rate by payer
   * GET /api/analytics/denial-rate-by-payer?start_date=2024-01-01&end_date=2025-01-15
   *
   * Query: start_date, end_date
   * Response: { status, data: { payers } }
   */
  async getDenialRateByPayer(request, reply) {
    try {
      const { start_date, end_date } = request.query;

      if (!start_date) {
        reply.code(400);
        return {
          status: 'error',
          message: 'start_date query parameter is required'
        };
      }

      const startDate = new Date(start_date);
      const endDate = end_date ? new Date(end_date) : new Date();

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Invalid date format. Use YYYY-MM-DD'
        };
      }

      const payers = await AnalyticsService.getDenialRateByPayer(startDate, endDate);

      reply.code(200);
      return {
        status: 'success',
        data: {
          payers
        }
      };
    } catch (error) {
      logger.error('Error in getDenialRateByPayer:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get denial rate by payer',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get net collection rate
   * GET /api/analytics/net-collection-rate?start_date=2024-01-01&end_date=2025-01-15
   *
   * Query: start_date, end_date
   * Response: { status, data: { period, total_charges, total_payments, net_collection_rate, trend_by_month } }
   */
  async getNetCollectionRate(request, reply) {
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

      const data = await AnalyticsService.getNetCollectionRateWithTrend(startDate, endDate);

      reply.code(200);
      return {
        status: 'success',
        data
      };
    } catch (error) {
      logger.error('Error in getNetCollectionRate:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get net collection rate',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get revenue forecast
   * GET /api/analytics/revenue-forecast?horizon_days=90
   *
   * Query: horizon_days (30, 60, or 90)
   * Response: { status, data: { forecast_date, horizons, methodology } }
   */
  async getRevenueForecast(request, reply) {
    try {
      const { horizon_days = 90 } = request.query;

      const horizonDays = parseInt(horizon_days);

      if (isNaN(horizonDays) || horizonDays <= 0 || horizonDays > 365) {
        reply.code(400);
        return {
          status: 'error',
          message: 'horizon_days must be a number between 1 and 365'
        };
      }

      const data = await AnalyticsService.getRevenueForecast(horizonDays);

      reply.code(200);
      return {
        status: 'success',
        data
      };
    } catch (error) {
      logger.error('Error in getRevenueForecast:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get revenue forecast',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Get AR aging trend
   * GET /api/analytics/ar-aging-trend?start_date=2024-01-01&end_date=2025-01-15
   *
   * Query: start_date, end_date
   * Response: { status, data: { data_points } }
   */
  async getARAgingTrend(request, reply) {
    try {
      const { start_date, end_date } = request.query;

      if (!start_date) {
        reply.code(400);
        return {
          status: 'error',
          message: 'start_date query parameter is required'
        };
      }

      const startDate = new Date(start_date);
      const endDate = end_date ? new Date(end_date) : new Date();

      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        reply.code(400);
        return {
          status: 'error',
          message: 'Invalid date format. Use YYYY-MM-DD'
        };
      }

      const data = await AnalyticsService.getARAgingTrend(startDate, endDate);

      reply.code(200);
      return {
        status: 'success',
        data
      };
    } catch (error) {
      logger.error('Error in getARAgingTrend:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to get AR aging trend',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Export analytics report to CSV/Excel
   * POST /api/analytics/export-report
   *
   * Body: { report_type: "clean_claim_rate", format: "csv", start_date: "2024-01-01", end_date: "2025-01-15" }
   * Response: File download (text/csv or application/vnd.openxmlformats-officedocument.spreadsheetml.sheet)
   */
  async exportReport(request, reply) {
    try {
      const { report_type, format = 'csv', start_date, end_date } = request.body;

      if (!report_type) {
        reply.code(400);
        return {
          status: 'error',
          message: 'report_type is required in request body'
        };
      }

      const validReportTypes = [
        'clean_claim_rate',
        'days_to_payment',
        'denial_rate_by_payer',
        'net_collection_rate',
        'ar_aging_trend'
      ];

      if (!validReportTypes.includes(report_type)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid report_type. Must be one of: ${validReportTypes.join(', ')}`
        };
      }

      const validFormats = ['csv', 'excel'];
      if (!validFormats.includes(format)) {
        reply.code(400);
        return {
          status: 'error',
          message: `Invalid format. Must be one of: ${validFormats.join(', ')}`
        };
      }

      // Get the data based on report type
      let data;
      const startDate = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 1));
      const endDate = end_date ? new Date(end_date) : new Date();

      switch (report_type) {
        case 'clean_claim_rate':
          data = await AnalyticsService.getCleanClaimRateTimeSeries(startDate, endDate);
          break;
        case 'days_to_payment':
          data = await AnalyticsService.getDaysToPaymentTimeSeries(startDate, endDate);
          break;
        case 'denial_rate_by_payer':
          data = await AnalyticsService.getDenialRateByPayer(startDate, endDate);
          break;
        case 'net_collection_rate':
          data = await AnalyticsService.getNetCollectionRateWithTrend(startDate, endDate);
          break;
        case 'ar_aging_trend':
          data = await AnalyticsService.getARAgingTrend(startDate, endDate);
          break;
      }

      // Generate CSV content
      const csvContent = this.generateCSV(report_type, data);

      // Set response headers
      const fileName = `${report_type}_${startDate.toISOString().split('T')[0]}_to_${endDate.toISOString().split('T')[0]}.csv`;

      if (format === 'csv') {
        reply.header('Content-Type', 'text/csv');
        reply.header('Content-Disposition', `attachment; filename="${fileName}"`);
        reply.code(200);
        return csvContent;
      } else {
        // For Excel format, would use a library like exceljs
        // For now, return CSV with Excel MIME type
        reply.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        reply.header('Content-Disposition', `attachment; filename="${fileName.replace('.csv', '.xlsx')}"`);
        reply.code(200);
        return csvContent;
      }
    } catch (error) {
      logger.error('Error in exportReport:', error)
      reply.code(500);
      return {
        status: 'error',
        message: error.message || 'Failed to export report',
        error: process.env.NODE_ENV === 'development' ? error.stack : undefined
      };
    }
  }

  /**
   * Generate CSV content from data
   * @private
   */
  generateCSV(reportType, data) {
    let csvLines = [];

    switch (reportType) {
      case 'clean_claim_rate':
        csvLines.push('Period,Total Submitted,Accepted First Pass,Clean Rate (%)');
        data.data_points.forEach(dp => {
          csvLines.push(`${dp.period},${dp.total_submitted},${dp.accepted_first_pass},${dp.clean_rate}`);
        });
        break;

      case 'days_to_payment':
        csvLines.push('Period,Average Days,Median Days,Min Days,Max Days');
        data.data_points.forEach(dp => {
          csvLines.push(`${dp.period},${dp.avg_days},${dp.median_days},${dp.min_days},${dp.max_days}`);
        });
        break;

      case 'denial_rate_by_payer':
        csvLines.push('Payer ID,Payer Name,Total Claims,Denied Claims,Denial Rate (%)');
        data.forEach(payer => {
          csvLines.push(`${payer.payer_id},${payer.payer_name},${payer.total_claims},${payer.denied_claims},${payer.denial_rate}`);
        });
        break;

      case 'net_collection_rate':
        csvLines.push('Period,Net Collection Rate (%)');
        data.trend_by_month.forEach(month => {
          csvLines.push(`${month.period},${month.net_collection_rate}`);
        });
        break;

      case 'ar_aging_trend':
        csvLines.push('Period,0-30 Days,31-60 Days,61-90 Days,91-120 Days,Over 120 Days,Total AR');
        data.data_points.forEach(dp => {
          csvLines.push(`${dp.period},${dp.buckets['0-30_days']},${dp.buckets['31-60_days']},${dp.buckets['61-90_days']},${dp.buckets['91-120_days']},${dp.buckets['over_120_days']},${dp.total_ar}`);
        });
        break;
    }

    return csvLines.join('\n');
  }
}

// Export singleton instance
export default new AnalyticsController();
