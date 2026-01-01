import DenialAnalysisController from '../controllers/DenialAnalysis.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

/**
 * Denial Analysis Routes
 * Advanced Analytics Engine API for Trend Analysis, Pattern Identification, and Prevention Strategies
 *
 * All routes require authentication and specific permissions
 */
export default async function denialAnalysisRoutes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // SUMMARY DASHBOARD ENDPOINT
  // ============================================

  /**
   * GET /api/denial-analysis/summary
   * Get comprehensive denial analysis summary
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/summary',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Get comprehensive denial analysis summary including trends, patterns, strategies, and forecasts',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            periodType: {
              type: 'string',
              enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
              default: 'MONTHLY',
              description: 'Time period granularity'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              summary: { type: 'object' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.getSummary.bind(DenialAnalysisController)
  );

  // ============================================
  // TREND ANALYSIS ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/trends
   * Get comprehensive trend analysis with moving averages
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/trends',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Get comprehensive trend analysis with moving averages and trend indicators',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            periodType: {
              type: 'string',
              enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
              default: 'MONTHLY',
              description: 'Time period granularity'
            },
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            payerId: { type: 'number', description: 'Filter by payer ID' },
            denialCategoryId: { type: 'number', description: 'Filter by denial category ID' },
            movingAveragePeriods: { type: 'number', default: 3, minimum: 2, maximum: 12, description: 'Number of periods for moving average' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              periods: { type: 'array' },
              summary: { type: 'object' },
              movingAverages: { type: 'array' },
              trendIndicators: { type: 'object' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.getTrendAnalysis.bind(DenialAnalysisController)
  );

  // ============================================
  // PATTERN IDENTIFICATION ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/patterns
   * Identify denial patterns across multiple dimensions
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/patterns',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Identify denial patterns across multiple dimensions (payer, CARC code, category, time)',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            minOccurrences: { type: 'number', default: 5, minimum: 1, description: 'Minimum occurrences for pattern' },
            topN: { type: 'number', default: 20, minimum: 1, maximum: 100, description: 'Number of top patterns to return' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              patterns: { type: 'object' },
              topPatterns: { type: 'array' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.identifyPatterns.bind(DenialAnalysisController)
  );

  /**
   * GET /api/denial-analysis/patterns/payers
   * Get denial patterns by payer
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/patterns/payers',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Get denial patterns grouped by payer',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            limit: { type: 'number', default: 20, minimum: 1, maximum: 100 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              patterns: { type: 'array' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.getPayerPatterns.bind(DenialAnalysisController)
  );

  /**
   * GET /api/denial-analysis/patterns/codes
   * Get denial patterns by CARC code
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/patterns/codes',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Get denial patterns grouped by CARC code',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            limit: { type: 'number', default: 20, minimum: 1, maximum: 100 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              patterns: { type: 'array' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.getCodePatterns.bind(DenialAnalysisController)
  );

  /**
   * GET /api/denial-analysis/patterns/time
   * Get time-based denial patterns
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/patterns/time',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Get time-based denial patterns (day of week, monthly trends)',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              byDayOfWeek: { type: 'array' },
              byMonth: { type: 'array' },
              peakDenialDay: { type: ['string', 'null'] },
              peakDenialMonth: { type: ['string', 'null'] },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.getTimePatterns.bind(DenialAnalysisController)
  );

  // ============================================
  // PREVENTION STRATEGY ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/prevention
   * Generate prevention strategies based on identified patterns
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/prevention',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Generate prevention strategies based on identified denial patterns',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            topN: { type: 'number', default: 10, minimum: 1, maximum: 50, description: 'Number of top strategies to return' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              strategies: { type: 'array' },
              summary: { type: 'object' },
              preventableAnalysis: { type: 'object' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.getPreventionStrategies.bind(DenialAnalysisController)
  );

  /**
   * GET /api/denial-analysis/prevention/preventable
   * Get analysis of preventable denials
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/prevention/preventable',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Get detailed analysis of preventable denials',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              breakdown: { type: 'object' },
              topReasons: { type: 'array' },
              topCategories: { type: 'array' },
              preventableRate: { type: 'number' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.getPreventableAnalysis.bind(DenialAnalysisController)
  );

  // ============================================
  // ROOT CAUSE ANALYSIS ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/root-cause
   * Perform root cause analysis on denial trends
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/root-cause',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Perform root cause analysis on denial trends with optional filters',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            payerId: { type: 'number', description: 'Filter by payer ID' },
            carcCode: { type: 'string', description: 'Filter by CARC code' },
            categoryId: { type: 'number', description: 'Filter by denial category ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              rootCauses: { type: 'array' },
              denialTypes: { type: 'array' },
              resolutionTypes: { type: 'array' },
              stageAnalysis: { type: 'array' },
              correlations: { type: 'array' },
              summary: { type: 'object' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.getRootCauseAnalysis.bind(DenialAnalysisController)
  );

  // ============================================
  // PREDICTIVE ANALYTICS ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/forecast
   * Generate denial rate forecast
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/forecast',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Generate denial rate forecast based on historical trends',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            periodType: {
              type: 'string',
              enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
              default: 'MONTHLY',
              description: 'Time period granularity for forecast'
            },
            forecastPeriods: { type: 'number', default: 3, minimum: 1, maximum: 12, description: 'Number of periods to forecast' },
            payerId: { type: 'number', description: 'Filter by payer ID for payer-specific forecast' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              forecast: { type: 'array' },
              confidence: { type: 'string' },
              trendIndicators: { type: 'object' },
              historicalSummary: { type: 'object' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.getForecast.bind(DenialAnalysisController)
  );

  // ============================================
  // COMPARATIVE ANALYSIS ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/compare
   * Compare performance across dimensions
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/compare',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Compare denial performance across different dimensions',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            compareType: {
              type: 'string',
              enum: ['PAYERS', 'TIME_PERIODS', 'CATEGORIES'],
              default: 'PAYERS',
              description: 'Dimension to compare'
            },
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            payerIds: { type: 'string', description: 'Comma-separated payer IDs for comparison' },
            periodType: {
              type: 'string',
              enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
              default: 'MONTHLY',
              description: 'Period type for time comparison'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              compareType: { type: 'string' },
              comparison: { type: 'object' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.comparePerformance.bind(DenialAnalysisController)
  );

  /**
   * GET /api/denial-analysis/compare/payers
   * Compare performance across payers
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/compare/payers',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Compare denial performance across payers',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            payerIds: { type: 'string', description: 'Comma-separated payer IDs for comparison' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              compareType: { type: 'string' },
              comparison: { type: 'object' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.comparePayerPerformance.bind(DenialAnalysisController)
  );

  /**
   * GET /api/denial-analysis/compare/periods
   * Compare performance across time periods
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/compare/periods',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Compare denial performance between current and previous time periods',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD) - REQUIRED' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD) - REQUIRED' },
            periodType: {
              type: 'string',
              enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
              default: 'MONTHLY',
              description: 'Period type for comparison'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              compareType: { type: 'string' },
              comparison: { type: 'object' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.compareTimePeriods.bind(DenialAnalysisController)
  );

  /**
   * GET /api/denial-analysis/compare/categories
   * Compare performance across denial categories
   * Permission: denials:view-analytics
   */
  fastify.get(
    '/compare/categories',
    {
      preHandler: checkPermission('denials:view-analytics'),
      schema: {
        description: 'Compare denial performance across denial categories',
        tags: ['Denial Analysis'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              compareType: { type: 'string' },
              comparison: { type: 'object' },
              analysisMetadata: { type: 'object' }
            }
          }
        }
      }
    },
    DenialAnalysisController.compareCategoryPerformance.bind(DenialAnalysisController)
  );
}
