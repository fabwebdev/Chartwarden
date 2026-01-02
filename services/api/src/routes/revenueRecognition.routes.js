import RevenueRecognitionController from '../controllers/RevenueRecognition.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

/**
 * Revenue Recognition Routes
 * Phase 3D - Revenue Accrual, Forecasting, and Cash Flow
 *
 * All routes require authentication and specific permissions
 */
export default async function revenueRecognitionRoutes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // REVENUE ACCRUAL ENDPOINTS
  // ============================================

  /**
   * 1. Create revenue accrual
   * POST /api/revenue/accruals
   * Permission: revenue:create
   */
  fastify.post(
    '/accruals',
    {
      preHandler: checkPermission('revenue:create'),
      schema: {
        description: 'Create revenue accrual for a claim',
        tags: ['Revenue Recognition'],
        body: {
          type: 'object',
          required: ['claimId'],
          properties: {
            claimId: { type: 'number', description: 'Claim ID' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              accrual: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.createAccrual.bind(RevenueRecognitionController)
  );

  /**
   * 2. Get accruals for period
   * GET /api/revenue/accruals/period/:period
   * Permission: revenue:view
   */
  fastify.get(
    '/accruals/period/:period',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get revenue accruals for a specific period',
        tags: ['Revenue Recognition'],
        params: {
          type: 'object',
          required: ['period'],
          properties: {
            period: { type: 'string', description: 'Period label (YYYY-MM)' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            payerId: { type: 'number', description: 'Filter by payer ID' },
            status: { type: 'string', description: 'Filter by recognition status' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              period: { type: 'string' },
              accruals: { type: 'array' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.getAccrualsForPeriod.bind(RevenueRecognitionController)
  );

  /**
   * 3. Create revenue adjustment
   * POST /api/revenue/accruals/:id/adjustment
   * Permission: revenue:adjust
   */
  fastify.post(
    '/accruals/:id/adjustment',
    {
      preHandler: checkPermission('revenue:adjust'),
      schema: {
        description: 'Create revenue adjustment for an accrual',
        tags: ['Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Accrual ID' }
          }
        },
        body: {
          type: 'object',
          required: ['claimId', 'adjustmentType', 'adjustmentAmount', 'reason'],
          properties: {
            claimId: { type: 'number', description: 'Claim ID' },
            adjustmentType: {
              type: 'string',
              enum: ['CONTRACTUAL', 'WRITE_OFF', 'BAD_DEBT', 'DENIAL', 'CORRECTION', 'APPEAL_RECOVERY'],
              description: 'Type of adjustment'
            },
            adjustmentAmount: { type: 'number', description: 'Adjustment amount (in cents, can be negative)' },
            reason: { type: 'string', description: 'Reason for adjustment' },
            sourceType: { type: 'string', description: 'Source of adjustment' },
            sourceReferenceId: { type: 'string', description: 'Source reference ID' },
            denialId: { type: 'number', description: 'Related denial ID' },
            appealId: { type: 'number', description: 'Related appeal ID' },
            eraPaymentId: { type: 'number', description: 'Related ERA payment ID' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              adjustment: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.createAdjustment.bind(RevenueRecognitionController)
  );

  /**
   * 4. Write off balance
   * POST /api/revenue/accruals/:id/writeoff
   * Permission: revenue:writeoff
   */
  fastify.post(
    '/accruals/:id/writeoff',
    {
      preHandler: checkPermission('revenue:writeoff'),
      schema: {
        description: 'Write off uncollectible balance',
        tags: ['Revenue Recognition'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Accrual ID' }
          }
        },
        body: {
          type: 'object',
          required: ['writeOffAmount', 'reason'],
          properties: {
            writeOffAmount: { type: 'number', description: 'Amount to write off (in cents)' },
            reason: { type: 'string', description: 'Reason for write-off' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.writeOffBalance.bind(RevenueRecognitionController)
  );

  /**
   * 5. Close revenue period
   * POST /api/revenue/periods/:period/close
   * Permission: revenue:close-period
   */
  fastify.post(
    '/periods/:period/close',
    {
      preHandler: checkPermission('revenue:close-period'),
      schema: {
        description: 'Close revenue recognition period (monthly/quarterly)',
        tags: ['Revenue Recognition'],
        params: {
          type: 'object',
          required: ['period'],
          properties: {
            period: { type: 'string', description: 'Period label (YYYY-MM or YYYY-Q1)' }
          }
        },
        body: {
          type: 'object',
          properties: {
            periodType: {
              type: 'string',
              enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
              default: 'MONTHLY'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              period: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.closePeriod.bind(RevenueRecognitionController)
  );

  /**
   * 6. Get revenue summary
   * GET /api/revenue/summary
   * Permission: revenue:view
   */
  fastify.get(
    '/summary',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get revenue summary for date range',
        tags: ['Revenue Recognition'],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
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
              period: { type: 'object' },
              summary: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.getRevenueSummary.bind(RevenueRecognitionController)
  );

  // ============================================
  // FORECASTING ENDPOINTS
  // ============================================

  /**
   * 7. Create collection forecast
   * POST /api/revenue/forecasts
   * Permission: revenue:forecast
   */
  fastify.post(
    '/forecasts',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Create collection forecast for a period',
        tags: ['Revenue Forecasting'],
        body: {
          type: 'object',
          required: ['forecastPeriod'],
          properties: {
            forecastPeriod: { type: 'string', description: 'Forecast period (YYYY-MM)' },
            forecastType: {
              type: 'string',
              enum: ['MONTHLY', 'QUARTERLY', 'YEARLY'],
              default: 'MONTHLY'
            },
            payerId: { type: 'number', description: 'Filter by payer ID' },
            serviceType: { type: 'string', description: 'Filter by service type' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              forecast: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.createForecast.bind(RevenueRecognitionController)
  );

  /**
   * 8. Update forecast with actuals
   * PUT /api/revenue/forecasts/:id/actuals
   * Permission: revenue:forecast
   */
  fastify.put(
    '/forecasts/:id/actuals',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Update forecast with actual results',
        tags: ['Revenue Forecasting'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Forecast ID' }
          }
        },
        body: {
          type: 'object',
          required: ['actualCollections'],
          properties: {
            actualCollections: { type: 'number', description: 'Actual collections (in cents)' },
            actualWriteoffs: { type: 'number', description: 'Actual write-offs (in cents)' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.updateForecastActuals.bind(RevenueRecognitionController)
  );

  /**
   * 9. Get forecast accuracy
   * GET /api/revenue/forecasts/accuracy
   * Permission: revenue:view
   */
  fastify.get(
    '/forecasts/accuracy',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get forecast accuracy report',
        tags: ['Revenue Forecasting'],
        querystring: {
          type: 'object',
          required: ['startPeriod', 'endPeriod'],
          properties: {
            startPeriod: { type: 'string', description: 'Start period (YYYY-MM)' },
            endPeriod: { type: 'string', description: 'End period (YYYY-MM)' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              accuracy: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.getForecastAccuracy.bind(RevenueRecognitionController)
  );

  /**
   * 10. Calculate payer payment patterns
   * POST /api/revenue/payers/:id/patterns
   * Permission: revenue:analyze
   */
  fastify.post(
    '/payers/:id/patterns',
    {
      preHandler: checkPermission('revenue:analyze'),
      schema: {
        description: 'Calculate payer payment patterns',
        tags: ['Revenue Forecasting'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Payer ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            analysisMonths: {
              type: 'number',
              default: 12,
              description: 'Number of months to analyze'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              patterns: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.calculatePayerPatterns.bind(RevenueRecognitionController)
  );

  // ============================================
  // CENSUS-BASED FORECASTING ENDPOINTS
  // ============================================

  /**
   * 11. Get current census data
   * GET /api/revenue/forecasts/census
   * Permission: revenue:view
   */
  fastify.get(
    '/forecasts/census',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get current census and level of care breakdown',
        tags: ['Revenue Forecasting - Census'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.getCurrentCensus.bind(RevenueRecognitionController)
  );

  /**
   * 12. Get historical census data
   * GET /api/revenue/forecasts/census/history
   * Permission: revenue:view
   */
  fastify.get(
    '/forecasts/census/history',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get historical census data by month',
        tags: ['Revenue Forecasting - Census'],
        querystring: {
          type: 'object',
          properties: {
            months: { type: 'number', default: 12, description: 'Number of months of history' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.getHistoricalCensus.bind(RevenueRecognitionController)
  );

  /**
   * 13. Generate census-based revenue forecast
   * POST /api/revenue/forecasts/census-based
   * Permission: revenue:forecast
   */
  fastify.post(
    '/forecasts/census-based',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Generate revenue forecast based on census and LOC mix',
        tags: ['Revenue Forecasting - Census'],
        body: {
          type: 'object',
          required: ['forecastPeriod'],
          properties: {
            forecastPeriod: { type: 'string', description: 'Start period for forecast (YYYY-MM)' },
            projectedCensusGrowth: { type: 'number', description: 'Monthly census growth rate (e.g., 0.02 for 2%)' },
            locMixOverride: { type: 'object', description: 'Override LOC distribution percentages' },
            customRates: { type: 'object', description: 'Custom payment rates by LOC' },
            forecastMonths: { type: 'number', default: 3, description: 'Number of months to forecast' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              forecast: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.generateCensusBasedForecast.bind(RevenueRecognitionController)
  );

  // ============================================
  // LOC-BASED FORECASTING ENDPOINTS
  // ============================================

  /**
   * 14. Get historical LOC distribution
   * GET /api/revenue/forecasts/loc/history
   * Permission: revenue:view
   */
  fastify.get(
    '/forecasts/loc/history',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get historical level of care distribution by month',
        tags: ['Revenue Forecasting - LOC'],
        querystring: {
          type: 'object',
          properties: {
            months: { type: 'number', default: 12, description: 'Number of months of history' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.getHistoricalLocDistribution.bind(RevenueRecognitionController)
  );

  /**
   * 15. Generate LOC-based revenue forecast
   * POST /api/revenue/forecasts/loc-based
   * Permission: revenue:forecast
   */
  fastify.post(
    '/forecasts/loc-based',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Generate revenue forecast based on level of care trends',
        tags: ['Revenue Forecasting - LOC'],
        body: {
          type: 'object',
          required: ['forecastPeriod'],
          properties: {
            forecastPeriod: { type: 'string', description: 'Start period for forecast (YYYY-MM)' },
            historicalMonths: { type: 'number', default: 12, description: 'Months of historical data to analyze' },
            forecastMonths: { type: 'number', default: 3, description: 'Number of months to forecast' },
            locGrowthRates: { type: 'object', description: 'Custom growth rates by LOC' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              forecast: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.generateLocBasedForecast.bind(RevenueRecognitionController)
  );

  // ============================================
  // COMPREHENSIVE FORECASTING ENDPOINTS
  // ============================================

  /**
   * 16. Generate comprehensive revenue forecast
   * POST /api/revenue/forecasts/comprehensive
   * Permission: revenue:forecast
   */
  fastify.post(
    '/forecasts/comprehensive',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Generate comprehensive forecast using multiple models (census, LOC, historical)',
        tags: ['Revenue Forecasting - Comprehensive'],
        body: {
          type: 'object',
          required: ['forecastPeriod'],
          properties: {
            forecastPeriod: { type: 'string', description: 'Start period for forecast (YYYY-MM)' },
            forecastMonths: { type: 'number', default: 3, description: 'Number of months to forecast' },
            historicalMonths: { type: 'number', default: 12, description: 'Months of historical data' },
            weights: {
              type: 'object',
              description: 'Model weights (must sum to 1.0)',
              properties: {
                census: { type: 'number', default: 0.3 },
                loc: { type: 'number', default: 0.3 },
                historical: { type: 'number', default: 0.4 }
              }
            }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              forecast: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.generateComprehensiveForecast.bind(RevenueRecognitionController)
  );

  /**
   * 17. Generate scenario-based forecasts
   * POST /api/revenue/forecasts/scenarios
   * Permission: revenue:forecast
   */
  fastify.post(
    '/forecasts/scenarios',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Generate scenario-based forecasts (optimistic, base, pessimistic)',
        tags: ['Revenue Forecasting - Scenarios'],
        body: {
          type: 'object',
          required: ['forecastPeriod'],
          properties: {
            forecastPeriod: { type: 'string', description: 'Start period for forecast (YYYY-MM)' },
            forecastMonths: { type: 'number', default: 6, description: 'Number of months to forecast' },
            scenarios: {
              type: 'array',
              items: { type: 'string', enum: ['optimistic', 'base', 'pessimistic'] },
              default: ['optimistic', 'base', 'pessimistic']
            }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              forecast: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.generateScenarioForecasts.bind(RevenueRecognitionController)
  );

  /**
   * 18. Generate payer-specific forecast
   * POST /api/revenue/forecasts/payer/:id
   * Permission: revenue:forecast
   */
  fastify.post(
    '/forecasts/payer/:id',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Generate payer-specific revenue forecast',
        tags: ['Revenue Forecasting - Payer'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Payer ID' }
          }
        },
        body: {
          type: 'object',
          required: ['forecastPeriod'],
          properties: {
            forecastPeriod: { type: 'string', description: 'Start period for forecast (YYYY-MM)' },
            forecastMonths: { type: 'number', default: 3, description: 'Number of months to forecast' },
            historicalMonths: { type: 'number', default: 12, description: 'Months of historical data' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              forecast: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.generatePayerForecast.bind(RevenueRecognitionController)
  );

  /**
   * 19. Get historical revenue data
   * GET /api/revenue/forecasts/historical
   * Permission: revenue:view
   */
  fastify.get(
    '/forecasts/historical',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get historical revenue data for analysis',
        tags: ['Revenue Forecasting - Historical'],
        querystring: {
          type: 'object',
          properties: {
            months: { type: 'number', default: 12, description: 'Number of months of history' },
            payerId: { type: 'number', description: 'Filter by payer ID' },
            levelOfCare: { type: 'string', description: 'Filter by level of care' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.getHistoricalRevenue.bind(RevenueRecognitionController)
  );

  // ============================================
  // CASH FLOW ENDPOINTS
  // ============================================

  /**
   * 11. Create cash flow projection
   * POST /api/revenue/cashflow/projections
   * Permission: revenue:forecast
   */
  fastify.post(
    '/cashflow/projections',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Create cash flow projection',
        tags: ['Cash Flow'],
        body: {
          type: 'object',
          required: ['projectionForPeriod'],
          properties: {
            projectionForPeriod: { type: 'string', description: 'Period to project (YYYY-MM)' },
            projectionType: {
              type: 'string',
              enum: ['SHORT_TERM', 'LONG_TERM', 'ROLLING'],
              default: 'SHORT_TERM'
            },
            weeksAhead: { type: 'number', description: 'Weeks ahead for short-term' },
            monthsAhead: { type: 'number', description: 'Months ahead for long-term' },
            includeOutflows: { type: 'boolean', default: false },
            sensitivityScenarios: { type: 'boolean', default: false }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              projection: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.createCashFlowProjection.bind(RevenueRecognitionController)
  );

  /**
   * 12. Update projection with actuals
   * PUT /api/revenue/cashflow/:id/actuals
   * Permission: revenue:forecast
   */
  fastify.put(
    '/cashflow/:id/actuals',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Update cash flow projection with actual results',
        tags: ['Cash Flow'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Projection ID' }
          }
        },
        body: {
          type: 'object',
          required: ['actualCollections'],
          properties: {
            actualCollections: { type: 'number', description: 'Actual collections (in cents)' },
            actualNetCashFlow: { type: 'number', description: 'Actual net cash flow (in cents)' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.updateProjectionActuals.bind(RevenueRecognitionController)
  );

  /**
   * 13. Get 13-week rolling projection
   * GET /api/revenue/cashflow/13week
   * Permission: revenue:view
   */
  fastify.get(
    '/cashflow/13week',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get rolling 13-week cash flow projection',
        tags: ['Cash Flow'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              projections: { type: 'array' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.get13WeekProjection.bind(RevenueRecognitionController)
  );

  /**
   * 14. Get cash flow summary
   * GET /api/revenue/cashflow/summary
   * Permission: revenue:view
   */
  fastify.get(
    '/cashflow/summary',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get cash flow summary for period range',
        tags: ['Cash Flow'],
        querystring: {
          type: 'object',
          required: ['startPeriod', 'endPeriod'],
          properties: {
            startPeriod: { type: 'string', description: 'Start period (YYYY-MM)' },
            endPeriod: { type: 'string', description: 'End period (YYYY-MM)' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              summary: { type: 'object' }
            }
          }
        }
      }
    },
    RevenueRecognitionController.getCashFlowSummary.bind(RevenueRecognitionController)
  );
}
