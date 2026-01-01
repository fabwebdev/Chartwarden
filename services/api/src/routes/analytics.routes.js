import controller from '../controllers/Analytics.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Analytics Routes
 * Phase 2D - Enhanced Reporting & Dashboard Data Retrieval
 *
 * Revenue cycle analytics, KPI dashboards, and comprehensive dashboard data
 * Features:
 *   - Dashboard summary with aggregated metrics
 *   - User activity and engagement metrics
 *   - Activity trends (daily, weekly, monthly)
 *   - Performance statistics
 *   - Comprehensive KPI dashboard with 6+ metrics
 *   - Clean claim rate tracking and trends
 *   - Days to payment analysis
 *   - Denial rate by payer breakdown
 *   - Net collection rate calculation
 *   - Revenue forecasting (30/60/90 days)
 *   - AR aging trends over time
 *   - CSV/Excel export capabilities
 *   - Caching for frequently requested data
 *   - Rate limiting for resource-intensive queries
 *
 * Endpoints:
 * - GET /api/analytics/dashboard-summary - Aggregated dashboard metrics
 * - GET /api/dashboard/summary - Alias for dashboard-summary
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

// ==========================================================================
// JSON SCHEMA DEFINITIONS FOR QUERY VALIDATION
// ==========================================================================

/**
 * Schema for date range query parameters
 */
const dateRangeQuerySchema = {
  type: 'object',
  properties: {
    range: {
      type: 'string',
      enum: ['today', 'yesterday', 'last_7_days', 'last_30_days', 'last_90_days', 'current_month', 'last_month', 'ytd'],
      description: 'Predefined date range'
    },
    start_date: {
      type: 'string',
      format: 'date',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Start date in YYYY-MM-DD format'
    },
    end_date: {
      type: 'string',
      format: 'date',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'End date in YYYY-MM-DD format'
    }
  },
  additionalProperties: false
};

/**
 * Schema for pagination query parameters
 */
const paginationQuerySchema = {
  type: 'object',
  properties: {
    page: {
      type: 'integer',
      minimum: 1,
      default: 1,
      description: 'Page number (1-indexed)'
    },
    limit: {
      type: 'integer',
      minimum: 1,
      maximum: 500,
      default: 50,
      description: 'Items per page (max 500)'
    }
  }
};

/**
 * Schema for grouping query parameters
 */
const groupByQuerySchema = {
  type: 'object',
  properties: {
    group_by: {
      type: 'string',
      enum: ['day', 'week', 'month'],
      default: 'day',
      description: 'Time grouping for trends'
    }
  }
};

/**
 * Combined schema for dashboard summary
 */
const dashboardSummaryQuerySchema = {
  type: 'object',
  properties: {
    ...dateRangeQuerySchema.properties
  },
  additionalProperties: false
};

/**
 * Combined schema for user metrics (date range + pagination)
 */
const userMetricsQuerySchema = {
  type: 'object',
  properties: {
    ...dateRangeQuerySchema.properties,
    ...paginationQuerySchema.properties
  },
  additionalProperties: false
};

/**
 * Combined schema for activity trends (date range + grouping)
 */
const activityTrendsQuerySchema = {
  type: 'object',
  properties: {
    ...dateRangeQuerySchema.properties,
    ...groupByQuerySchema.properties
  },
  additionalProperties: false
};

/**
 * Schema for KPI dashboard
 */
const kpiDashboardQuerySchema = {
  type: 'object',
  properties: {
    period: {
      type: 'string',
      enum: ['current_month', 'last_month', 'current_quarter', 'ytd'],
      default: 'current_month',
      description: 'KPI period'
    }
  },
  additionalProperties: false
};

/**
 * Schema for clean claim rate / days to payment (requires dates + optional grouping)
 */
const timeSeriesQuerySchema = {
  type: 'object',
  properties: {
    start_date: {
      type: 'string',
      format: 'date',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Start date in YYYY-MM-DD format'
    },
    end_date: {
      type: 'string',
      format: 'date',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'End date in YYYY-MM-DD format'
    },
    group_by: {
      type: 'string',
      enum: ['day', 'week', 'month'],
      default: 'month',
      description: 'Time grouping'
    }
  },
  required: ['start_date', 'end_date'],
  additionalProperties: false
};

/**
 * Schema for denial rate by payer / AR aging (requires start_date)
 */
const denialRateQuerySchema = {
  type: 'object',
  properties: {
    start_date: {
      type: 'string',
      format: 'date',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Start date in YYYY-MM-DD format'
    },
    end_date: {
      type: 'string',
      format: 'date',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'End date in YYYY-MM-DD format (defaults to today)'
    }
  },
  required: ['start_date'],
  additionalProperties: false
};

/**
 * Schema for revenue forecast
 */
const revenueForecastQuerySchema = {
  type: 'object',
  properties: {
    horizon_days: {
      type: 'integer',
      minimum: 1,
      maximum: 365,
      default: 90,
      description: 'Forecast horizon in days (1-365)'
    }
  },
  additionalProperties: false
};

/**
 * Schema for export report body
 */
const exportReportBodySchema = {
  type: 'object',
  properties: {
    report_type: {
      type: 'string',
      enum: ['clean_claim_rate', 'days_to_payment', 'denial_rate_by_payer', 'net_collection_rate', 'ar_aging_trend'],
      description: 'Type of report to export'
    },
    format: {
      type: 'string',
      enum: ['csv', 'excel'],
      default: 'csv',
      description: 'Export format'
    },
    start_date: {
      type: 'string',
      format: 'date',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'Start date in YYYY-MM-DD format'
    },
    end_date: {
      type: 'string',
      format: 'date',
      pattern: '^\\d{4}-\\d{2}-\\d{2}$',
      description: 'End date in YYYY-MM-DD format'
    }
  },
  required: ['report_type'],
  additionalProperties: false
};

/**
 * Rate limit configuration for analytics endpoints
 * Analytics queries can be resource-intensive, so we apply stricter limits
 */
const analyticsRateLimitConfig = {
  max: 30, // 30 requests per minute for analytics endpoints
  timeWindow: '1 minute',
  keyGenerator: (request) => {
    // Rate limit per user (by user ID if authenticated, or IP)
    return request.user?.id || request.ip;
  },
  errorResponseBuilder: (request, context) => ({
    success: false,
    status: 429,
    error: 'Too Many Requests',
    message: 'Analytics rate limit exceeded. Please wait before making more requests.',
    retryAfter: context.after,
    code: 'ANALYTICS_RATE_LIMIT_EXCEEDED'
  })
};

export default async function analyticsRoutes(fastify, options) {
  // Bind controller methods to preserve 'this' context
  const boundController = {
    getDashboardSummary: controller.getDashboardSummary.bind(controller),
    getUserMetrics: controller.getUserMetrics.bind(controller),
    getActivityTrends: controller.getActivityTrends.bind(controller),
    getPerformanceStats: controller.getPerformanceStats.bind(controller),
    getKPIDashboard: controller.getKPIDashboard.bind(controller),
    getCleanClaimRate: controller.getCleanClaimRate.bind(controller),
    getDaysToPayment: controller.getDaysToPayment.bind(controller),
    getDenialRateByPayer: controller.getDenialRateByPayer.bind(controller),
    getNetCollectionRate: controller.getNetCollectionRate.bind(controller),
    getRevenueForecast: controller.getRevenueForecast.bind(controller),
    getARAgingTrend: controller.getARAgingTrend.bind(controller),
    exportReport: controller.exportReport.bind(controller)
  };

  // ==========================================================================
  // DASHBOARD ENDPOINTS (with /dashboard/* alias)
  // ==========================================================================

  // Get comprehensive dashboard summary
  // Supports: range (today, yesterday, last_7_days, last_30_days, last_90_days, current_month, last_month, ytd)
  //           OR start_date + end_date for custom range
  fastify.get('/analytics/dashboard-summary', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: dashboardSummaryQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getDashboardSummary);

  // Alias: GET /dashboard/summary -> /analytics/dashboard-summary
  fastify.get('/dashboard/summary', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: dashboardSummaryQuerySchema
    }
  }, boundController.getDashboardSummary);

  // ==========================================================================
  // USER ACTIVITY ENDPOINTS
  // ==========================================================================

  // Get user activity and engagement metrics
  // Supports: range, start_date, end_date, page, limit
  fastify.get('/analytics/user-metrics', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: userMetricsQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getUserMetrics);

  // Get activity trends over time
  // Supports: range, start_date, end_date, group_by (day, week, month)
  fastify.get('/analytics/activity-trends', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: activityTrendsQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getActivityTrends);

  // Get performance statistics
  // Supports: range, start_date, end_date
  fastify.get('/analytics/performance-stats', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: dashboardSummaryQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getPerformanceStats);

  // ==========================================================================
  // KPI/REVENUE CYCLE ENDPOINTS
  // ==========================================================================

  // Get comprehensive KPI dashboard
  fastify.get('/analytics/kpi-dashboard', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: kpiDashboardQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getKPIDashboard);

  // Alias: GET /dashboard/kpis -> /analytics/kpi-dashboard
  fastify.get('/dashboard/kpis', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: kpiDashboardQuerySchema
    }
  }, boundController.getKPIDashboard);

  // ==========================================================================
  // TIME-SERIES ANALYTICS ENDPOINTS
  // ==========================================================================

  // Get clean claim rate time-series
  fastify.get('/analytics/clean-claim-rate', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: timeSeriesQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getCleanClaimRate);

  // Get days to payment trend
  fastify.get('/analytics/days-to-payment', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: timeSeriesQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getDaysToPayment);

  // Get denial rate by payer
  fastify.get('/analytics/denial-rate-by-payer', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: denialRateQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getDenialRateByPayer);

  // Get net collection rate
  fastify.get('/analytics/net-collection-rate', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: timeSeriesQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getNetCollectionRate);

  // ==========================================================================
  // FORECASTING & AGING ENDPOINTS
  // ==========================================================================

  // Get revenue forecast
  fastify.get('/analytics/revenue-forecast', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: revenueForecastQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getRevenueForecast);

  // Get AR aging trend
  fastify.get('/analytics/ar-aging-trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: analyticsRateLimitConfig
    },
    schema: {
      querystring: denialRateQuerySchema,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['success'] },
            data: { type: 'object' }
          }
        }
      }
    }
  }, boundController.getARAgingTrend);

  // ==========================================================================
  // EXPORT ENDPOINT
  // ==========================================================================

  // Export analytics report to CSV/Excel
  fastify.post('/analytics/export-report', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    config: {
      rateLimit: {
        ...analyticsRateLimitConfig,
        max: 10 // Even stricter limit for exports
      }
    },
    schema: {
      body: exportReportBodySchema,
      response: {
        200: {
          type: 'string',
          description: 'CSV or Excel file content'
        }
      }
    }
  }, boundController.exportReport);
}
