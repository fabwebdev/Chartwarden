import controller from '../controllers/MetricsEngine.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Metrics Engine Routes
 *
 * Advanced analytics endpoints for metrics calculation, dashboard aggregation,
 * and trend analysis with statistical methods.
 *
 * Endpoints:
 * - GET /api/metrics/comprehensive - Comprehensive metrics for a period
 * - GET /api/metrics/time-series/:type - Time-series data with trends
 * - GET /api/metrics/forecast/:type - Metric forecasting
 * - GET /api/metrics/statistics/:type - Statistical analysis
 * - GET /api/metrics/compare - Period comparison
 * - GET /api/dashboards/executive - Executive dashboard
 * - GET /api/dashboards/financial - Financial dashboard
 * - GET /api/dashboards/clinical - Clinical dashboard
 */
export default async function metricsEngineRoutes(fastify, options) {

  // ==========================================================================
  // COMPREHENSIVE METRICS
  // ==========================================================================

  /**
   * Get comprehensive metrics for a date range
   * Query: start_date, end_date
   */
  fastify.get('/metrics/comprehensive', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    schema: {
      description: 'Get comprehensive metrics including financial, operational, claims, and collection data',
      tags: ['Metrics'],
      querystring: {
        type: 'object',
        required: ['start_date', 'end_date'],
        properties: {
          start_date: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          end_date: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, controller.getComprehensiveMetrics);

  // ==========================================================================
  // TIME-SERIES ANALYSIS
  // ==========================================================================

  /**
   * Get time-series data with trend analysis
   * Params: type (revenue, claims, collections, encounters)
   * Query: start_date, end_date, interval
   */
  fastify.get('/metrics/time-series/:type', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    schema: {
      description: 'Get time-series data with moving averages, EMA, and trend detection',
      tags: ['Metrics'],
      params: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['revenue', 'claims', 'collections', 'encounters'],
            description: 'Metric type'
          }
        }
      },
      querystring: {
        type: 'object',
        required: ['start_date', 'end_date'],
        properties: {
          start_date: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          end_date: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
          interval: {
            type: 'string',
            enum: ['day', 'week', 'month', 'quarter'],
            default: 'month',
            description: 'Time interval for aggregation'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, controller.getTimeSeries);

  // ==========================================================================
  // FORECASTING
  // ==========================================================================

  /**
   * Get metric forecast
   * Params: type (revenue, claims, collections, encounters)
   * Query: periods_ahead
   */
  fastify.get('/metrics/forecast/:type', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    schema: {
      description: 'Generate forecast using ensemble methods (SMA, Exponential Smoothing, Linear Trend)',
      tags: ['Metrics'],
      params: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['revenue', 'claims', 'collections', 'encounters'],
            description: 'Metric type to forecast'
          }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          periods_ahead: {
            type: 'integer',
            minimum: 1,
            maximum: 12,
            default: 3,
            description: 'Number of periods to forecast'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, controller.getForecast);

  // ==========================================================================
  // STATISTICAL ANALYSIS
  // ==========================================================================

  /**
   * Get statistical analysis for a metric
   * Params: type
   * Query: start_date, end_date
   */
  fastify.get('/metrics/statistics/:type', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    schema: {
      description: 'Get detailed statistical analysis including distribution, outliers, skewness, and kurtosis',
      tags: ['Metrics'],
      params: {
        type: 'object',
        properties: {
          type: {
            type: 'string',
            enum: ['revenue', 'claims', 'collections', 'encounters'],
            description: 'Metric type'
          }
        }
      },
      querystring: {
        type: 'object',
        required: ['start_date', 'end_date'],
        properties: {
          start_date: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
          end_date: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, controller.getStatistics);

  // ==========================================================================
  // PERIOD COMPARISON
  // ==========================================================================

  /**
   * Compare metrics between two periods
   * Query: current_start, current_end, previous_start, previous_end
   */
  fastify.get('/metrics/compare', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    schema: {
      description: 'Compare metrics between two time periods with change analysis',
      tags: ['Metrics'],
      querystring: {
        type: 'object',
        required: ['current_start', 'current_end', 'previous_start', 'previous_end'],
        properties: {
          current_start: { type: 'string', format: 'date', description: 'Current period start date' },
          current_end: { type: 'string', format: 'date', description: 'Current period end date' },
          previous_start: { type: 'string', format: 'date', description: 'Previous period start date' },
          previous_end: { type: 'string', format: 'date', description: 'Previous period end date' }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, controller.comparePeriods);

  // ==========================================================================
  // DASHBOARD AGGREGATION
  // ==========================================================================

  /**
   * Get executive dashboard
   * Query: period, include_comparison
   */
  fastify.get('/dashboards/executive', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    schema: {
      description: 'Get comprehensive executive dashboard with KPIs, financial, clinical, operational, and compliance summaries',
      tags: ['Dashboards'],
      querystring: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['current_month', 'last_month', 'current_quarter', 'ytd', 'last_30_days', 'last_90_days'],
            default: 'current_month',
            description: 'Dashboard period'
          },
          include_comparison: {
            type: 'string',
            enum: ['true', 'false'],
            default: 'true',
            description: 'Include previous period comparison'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, controller.getExecutiveDashboard);

  /**
   * Get financial dashboard
   * Query: period
   */
  fastify.get('/dashboards/financial', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    schema: {
      description: 'Get financial dashboard with revenue trends, AR aging, and payer mix analysis',
      tags: ['Dashboards'],
      querystring: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['current_month', 'last_month', 'current_quarter', 'ytd', 'last_30_days', 'last_90_days'],
            default: 'current_month',
            description: 'Dashboard period'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, controller.getFinancialDashboard);

  /**
   * Get clinical dashboard
   * Query: period
   */
  fastify.get('/dashboards/clinical', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)],
    schema: {
      description: 'Get clinical dashboard with encounter trends and discipline distribution',
      tags: ['Dashboards'],
      querystring: {
        type: 'object',
        properties: {
          period: {
            type: 'string',
            enum: ['current_month', 'last_month', 'current_quarter', 'ytd', 'last_30_days', 'last_90_days'],
            default: 'current_month',
            description: 'Dashboard period'
          }
        }
      },
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'string' },
            data: { type: 'object' }
          }
        }
      }
    }
  }, controller.getClinicalDashboard);
}
