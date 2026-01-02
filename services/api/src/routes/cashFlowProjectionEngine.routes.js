import CashFlowProjectionEngineController from '../controllers/CashFlowProjectionEngine.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

/**
 * Cash Flow Projection Engine Routes
 * Comprehensive cash flow forecasting with payment timing and collection forecasts
 *
 * All routes require authentication and specific permissions
 */
export default async function cashFlowProjectionEngineRoutes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // EXPENSE CATEGORY ENDPOINTS
  // ============================================

  /**
   * 1. Create expense category
   * POST /api/cashflow/expense-categories
   * Permission: revenue:create
   */
  fastify.post(
    '/expense-categories',
    {
      preHandler: checkPermission('revenue:create'),
      schema: {
        description: 'Create expense category for cash flow categorization',
        tags: ['Cash Flow - Expense Categories'],
        body: {
          type: 'object',
          required: ['categoryCode', 'categoryName', 'categoryType'],
          properties: {
            categoryCode: { type: 'string', description: 'Unique category code' },
            categoryName: { type: 'string', description: 'Category display name' },
            categoryType: {
              type: 'string',
              enum: ['PAYROLL', 'VENDOR', 'RENT', 'UTILITIES', 'SUPPLIES', 'CAPITAL_EXPENDITURE', 'OTHER'],
              description: 'Type of expense'
            },
            parentCategoryId: { type: 'number', description: 'Parent category for hierarchy' },
            defaultPaymentFrequency: { type: 'string', description: 'Default payment frequency' },
            isFixedExpense: { type: 'boolean', description: 'Is this a fixed expense' },
            seasonalVarianceExpected: { type: 'boolean', description: 'Expect seasonal variance' },
            description: { type: 'string', description: 'Category description' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.createExpenseCategory.bind(CashFlowProjectionEngineController)
  );

  /**
   * 2. List expense categories
   * GET /api/cashflow/expense-categories
   * Permission: revenue:view
   */
  fastify.get(
    '/expense-categories',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'List all expense categories',
        tags: ['Cash Flow - Expense Categories'],
        querystring: {
          type: 'object',
          properties: {
            includeInactive: { type: 'string', enum: ['true', 'false'], description: 'Include inactive categories' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.getExpenseCategories.bind(CashFlowProjectionEngineController)
  );

  // ============================================
  // PAYMENT SCHEDULE ENDPOINTS
  // ============================================

  /**
   * 3. Create payment schedule
   * POST /api/cashflow/payment-schedules
   * Permission: revenue:create
   */
  fastify.post(
    '/payment-schedules',
    {
      preHandler: checkPermission('revenue:create'),
      schema: {
        description: 'Create scheduled payment obligation (payroll, rent, vendor, etc.)',
        tags: ['Cash Flow - Payment Schedules'],
        body: {
          type: 'object',
          required: ['scheduleName', 'scheduleType', 'baseAmount', 'paymentFrequency', 'nextPaymentDate', 'effectiveStartDate'],
          properties: {
            scheduleName: { type: 'string', description: 'Schedule name' },
            scheduleType: {
              type: 'string',
              enum: ['PAYROLL', 'RENT', 'VENDOR', 'UTILITY', 'INSURANCE', 'CAPITAL_EXPENSE', 'LOAN_PAYMENT', 'TAX', 'OTHER'],
              description: 'Type of payment schedule'
            },
            expenseCategoryId: { type: 'number', description: 'Expense category reference' },
            payeeName: { type: 'string', description: 'Payee/vendor name' },
            payeeId: { type: 'string', description: 'External vendor ID' },
            baseAmount: { type: 'number', description: 'Base payment amount in cents' },
            variableComponent: { type: 'number', description: 'Variable component in cents' },
            estimatedTotal: { type: 'number', description: 'Estimated total payment in cents' },
            paymentFrequency: {
              type: 'string',
              enum: ['WEEKLY', 'BIWEEKLY', 'SEMIMONTHLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL', 'ONE_TIME'],
              description: 'Payment frequency'
            },
            paymentDay: { type: 'number', description: 'Day of month/week for payment' },
            nextPaymentDate: { type: 'string', format: 'date', description: 'Next payment date' },
            effectiveStartDate: { type: 'string', format: 'date', description: 'Schedule start date' },
            effectiveEndDate: { type: 'string', format: 'date', description: 'Schedule end date' },
            isPerpetual: { type: 'boolean', description: 'Is schedule perpetual' },
            earlyPaymentDiscountRate: { type: 'number', description: 'Early payment discount in basis points' },
            earlyPaymentDiscountDays: { type: 'number', description: 'Days before due for discount' },
            priorityLevel: {
              type: 'string',
              enum: ['CRITICAL', 'HIGH', 'NORMAL', 'LOW', 'DEFERRABLE'],
              description: 'Payment priority'
            },
            canBeDeferred: { type: 'boolean', description: 'Can payment be deferred' },
            maxDeferralDays: { type: 'number', description: 'Maximum deferral days' },
            notes: { type: 'string', description: 'Notes' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.createPaymentSchedule.bind(CashFlowProjectionEngineController)
  );

  /**
   * 4. List active payment schedules
   * GET /api/cashflow/payment-schedules
   * Permission: revenue:view
   */
  fastify.get(
    '/payment-schedules',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'List active payment schedules',
        tags: ['Cash Flow - Payment Schedules'],
        querystring: {
          type: 'object',
          properties: {
            scheduleType: { type: 'string', description: 'Filter by schedule type' },
            priorityLevel: { type: 'string', description: 'Filter by priority level' },
            beforeDate: { type: 'string', format: 'date', description: 'Filter by next payment before date' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.getPaymentSchedules.bind(CashFlowProjectionEngineController)
  );

  /**
   * 5. Get payments due in date range
   * GET /api/cashflow/payment-schedules/due
   * Permission: revenue:view
   */
  fastify.get(
    '/payment-schedules/due',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get expanded list of payments due within a date range',
        tags: ['Cash Flow - Payment Schedules'],
        querystring: {
          type: 'object',
          required: ['startDate', 'endDate'],
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date' },
            endDate: { type: 'string', format: 'date', description: 'End date' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              dateRange: { type: 'object' },
              totals: { type: 'object' },
              grandTotal: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.getPaymentsDue.bind(CashFlowProjectionEngineController)
  );

  // ============================================
  // RECURRING REVENUE ENDPOINTS
  // ============================================

  /**
   * 6. Create recurring revenue stream
   * POST /api/cashflow/recurring-revenue
   * Permission: revenue:create
   */
  fastify.post(
    '/recurring-revenue',
    {
      preHandler: checkPermission('revenue:create'),
      schema: {
        description: 'Create recurring revenue stream with payment cycles',
        tags: ['Cash Flow - Recurring Revenue'],
        body: {
          type: 'object',
          required: ['streamName', 'streamType', 'expectedMonthlyRevenue', 'paymentCycle', 'effectiveStartDate'],
          properties: {
            streamName: { type: 'string', description: 'Revenue stream name' },
            streamType: {
              type: 'string',
              enum: ['PATIENT_SERVICE', 'CONTRACT', 'SUBSCRIPTION', 'GRANT', 'OTHER'],
              description: 'Type of revenue stream'
            },
            payerId: { type: 'number', description: 'Payer reference' },
            customerSegment: { type: 'string', description: 'Customer segment (MEDICARE, MEDICAID, etc.)' },
            expectedMonthlyRevenue: { type: 'number', description: 'Expected monthly revenue in cents' },
            minimumRevenue: { type: 'number', description: 'Minimum guaranteed revenue in cents' },
            maximumRevenue: { type: 'number', description: 'Maximum revenue cap in cents' },
            paymentCycle: {
              type: 'string',
              enum: ['WEEKLY', 'BIWEEKLY', 'MONTHLY', 'QUARTERLY'],
              description: 'Payment cycle'
            },
            expectedCollectionDay: { type: 'number', description: 'Expected day of collection' },
            averageDaysToCollection: { type: 'number', description: 'Average days to collect' },
            baseCollectionRate: { type: 'number', description: 'Expected collection rate in basis points' },
            effectiveStartDate: { type: 'string', format: 'date', description: 'Start date' },
            effectiveEndDate: { type: 'string', format: 'date', description: 'End date' },
            seasonalAdjustmentFactors: { type: 'object', description: 'Monthly seasonal factors' },
            isSeasonal: { type: 'boolean', description: 'Is revenue seasonal' },
            notes: { type: 'string', description: 'Notes' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.createRecurringRevenueStream.bind(CashFlowProjectionEngineController)
  );

  /**
   * 7. List active recurring revenue streams
   * GET /api/cashflow/recurring-revenue
   * Permission: revenue:view
   */
  fastify.get(
    '/recurring-revenue',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'List active recurring revenue streams',
        tags: ['Cash Flow - Recurring Revenue'],
        querystring: {
          type: 'object',
          properties: {
            streamType: { type: 'string', description: 'Filter by stream type' },
            customerSegment: { type: 'string', description: 'Filter by customer segment' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              totalMonthlyRevenue: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.getRecurringRevenueStreams.bind(CashFlowProjectionEngineController)
  );

  // ============================================
  // SCENARIO ENDPOINTS
  // ============================================

  /**
   * 8. Create scenario
   * POST /api/cashflow/scenarios
   * Permission: revenue:forecast
   */
  fastify.post(
    '/scenarios',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Create cash flow scenario with adjustable assumptions',
        tags: ['Cash Flow - Scenarios'],
        body: {
          type: 'object',
          required: ['scenarioName', 'scenarioType'],
          properties: {
            scenarioName: { type: 'string', description: 'Scenario name' },
            scenarioType: {
              type: 'string',
              enum: ['BASE', 'OPTIMISTIC', 'PESSIMISTIC', 'CUSTOM', 'STRESS_TEST'],
              description: 'Type of scenario'
            },
            description: { type: 'string', description: 'Scenario description' },
            collectionRateAdjustment: { type: 'number', description: 'Collection rate adjustment in basis points' },
            daysToCollectionAdjustment: { type: 'number', description: 'Days to collection adjustment' },
            writeOffRateAdjustment: { type: 'number', description: 'Write-off rate adjustment in basis points' },
            revenueGrowthRate: { type: 'number', description: 'Revenue growth rate in basis points' },
            expenseInflationRate: { type: 'number', description: 'Expense inflation rate in basis points' },
            payrollGrowthRate: { type: 'number', description: 'Payroll growth rate in basis points' },
            vendorCostAdjustment: { type: 'number', description: 'Vendor cost adjustment in basis points' },
            isDefault: { type: 'boolean', description: 'Is default scenario' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.createScenario.bind(CashFlowProjectionEngineController)
  );

  /**
   * 9. List scenarios
   * GET /api/cashflow/scenarios
   * Permission: revenue:view
   */
  fastify.get(
    '/scenarios',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'List available cash flow scenarios',
        tags: ['Cash Flow - Scenarios'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.getScenarios.bind(CashFlowProjectionEngineController)
  );

  // ============================================
  // PROJECTION ENDPOINTS
  // ============================================

  /**
   * 10. Generate cash flow projection
   * POST /api/cashflow/projections
   * Permission: revenue:forecast
   */
  fastify.post(
    '/projections',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Generate comprehensive cash flow projection',
        tags: ['Cash Flow - Projections'],
        body: {
          type: 'object',
          properties: {
            horizonDays: { type: 'number', default: 90, description: 'Projection horizon in days (30, 60, 90, etc.)' },
            periodType: {
              type: 'string',
              enum: ['WEEKLY', 'MONTHLY', 'QUARTERLY', 'ANNUAL'],
              default: 'MONTHLY',
              description: 'Projection period type'
            },
            scenarioId: { type: 'number', description: 'Scenario ID to use' },
            openingCashBalance: { type: 'number', default: 0, description: 'Opening cash balance in cents' },
            includeScheduledPayments: { type: 'boolean', default: true, description: 'Include scheduled payments' },
            includeRecurringRevenue: { type: 'boolean', default: true, description: 'Include recurring revenue' },
            adjustForSeasonality: { type: 'boolean', default: true, description: 'Adjust for seasonal patterns' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.generateProjection.bind(CashFlowProjectionEngineController)
  );

  /**
   * 11. Generate 13-week rolling projection
   * POST /api/cashflow/projections/13-week
   * Permission: revenue:forecast
   */
  fastify.post(
    '/projections/13-week',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Generate rolling 13-week cash flow projection (industry standard)',
        tags: ['Cash Flow - Projections'],
        body: {
          type: 'object',
          properties: {
            openingCashBalance: { type: 'number', default: 0, description: 'Opening cash balance in cents' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.generateRolling13WeekProjection.bind(CashFlowProjectionEngineController)
  );

  /**
   * 12. Generate quarterly projection
   * POST /api/cashflow/projections/quarterly
   * Permission: revenue:forecast
   */
  fastify.post(
    '/projections/quarterly',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Generate quarterly cash flow projection for 1 year',
        tags: ['Cash Flow - Projections'],
        body: {
          type: 'object',
          properties: {
            openingCashBalance: { type: 'number', default: 0, description: 'Opening cash balance in cents' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.generateQuarterlyProjection.bind(CashFlowProjectionEngineController)
  );

  /**
   * 13. Generate multi-scenario comparison
   * POST /api/cashflow/projections/scenario-comparison
   * Permission: revenue:forecast
   */
  fastify.post(
    '/projections/scenario-comparison',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Generate projections for all scenarios (base, optimistic, pessimistic) for comparison',
        tags: ['Cash Flow - Projections'],
        body: {
          type: 'object',
          properties: {
            horizonDays: { type: 'number', default: 90, description: 'Projection horizon in days' },
            periodType: { type: 'string', default: 'MONTHLY', description: 'Period type' },
            openingCashBalance: { type: 'number', default: 0, description: 'Opening cash balance in cents' },
            includeScheduledPayments: { type: 'boolean', default: true },
            includeRecurringRevenue: { type: 'boolean', default: true }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.generateScenarioComparison.bind(CashFlowProjectionEngineController)
  );

  /**
   * 14. Update projection with actuals
   * PUT /api/cashflow/projections/:id/actuals
   * Permission: revenue:forecast
   */
  fastify.put(
    '/projections/:id/actuals',
    {
      preHandler: checkPermission('revenue:forecast'),
      schema: {
        description: 'Update cash flow projection with actual results for variance analysis',
        tags: ['Cash Flow - Projections'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Forecast period ID' }
          }
        },
        body: {
          type: 'object',
          required: ['actualCollections', 'actualOutflows'],
          properties: {
            actualCollections: { type: 'number', description: 'Actual collections in cents' },
            actualOutflows: { type: 'number', description: 'Actual outflows in cents' },
            actualEndingCash: { type: 'number', description: 'Actual ending cash balance in cents' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.updateProjectionActuals.bind(CashFlowProjectionEngineController)
  );

  // ============================================
  // HISTORICAL ANALYSIS ENDPOINTS
  // ============================================

  /**
   * 15. Calculate historical patterns
   * POST /api/cashflow/historical-patterns
   * Permission: revenue:analyze
   */
  fastify.post(
    '/historical-patterns',
    {
      preHandler: checkPermission('revenue:analyze'),
      schema: {
        description: 'Calculate historical collection patterns for forecasting model training',
        tags: ['Cash Flow - Historical Analysis'],
        body: {
          type: 'object',
          properties: {
            analysisMonths: { type: 'number', default: 12, description: 'Months of history to analyze' },
            dimension: {
              type: 'string',
              enum: ['OVERALL', 'PAYER', 'SEGMENT'],
              default: 'OVERALL',
              description: 'Analysis dimension'
            }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.calculateHistoricalPatterns.bind(CashFlowProjectionEngineController)
  );

  // ============================================
  // REPORT ENDPOINTS
  // ============================================

  /**
   * 16. Get cash flow summary report
   * GET /api/cashflow/reports/summary
   * Permission: revenue:view
   */
  fastify.get(
    '/reports/summary',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get cash flow summary report with projected vs actual analysis',
        tags: ['Cash Flow - Reports'],
        querystring: {
          type: 'object',
          required: ['startPeriod', 'endPeriod'],
          properties: {
            startPeriod: { type: 'string', description: 'Start period (YYYY-MM or Q1-YYYY)' },
            endPeriod: { type: 'string', description: 'End period (YYYY-MM or Q1-YYYY)' }
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
    CashFlowProjectionEngineController.getCashFlowSummaryReport.bind(CashFlowProjectionEngineController)
  );

  /**
   * 17. Export projection to CSV
   * GET /api/cashflow/reports/export/:id
   * Permission: revenue:view
   */
  fastify.get(
    '/reports/export/:id',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Export cash flow projection to CSV format',
        tags: ['Cash Flow - Reports'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Projection ID' }
          }
        }
      }
    },
    CashFlowProjectionEngineController.exportProjectionToCSV.bind(CashFlowProjectionEngineController)
  );

  // ============================================
  // AUDIT ENDPOINTS
  // ============================================

  /**
   * 18. Get audit log
   * GET /api/cashflow/audit/:entityType/:entityId
   * Permission: revenue:view
   */
  fastify.get(
    '/audit/:entityType/:entityId',
    {
      preHandler: checkPermission('revenue:view'),
      schema: {
        description: 'Get audit log for cash flow entity (tracks assumption changes)',
        tags: ['Cash Flow - Audit'],
        params: {
          type: 'object',
          required: ['entityType', 'entityId'],
          properties: {
            entityType: {
              type: 'string',
              enum: ['SCENARIO', 'FORECAST', 'PAYMENT_SCHEDULE', 'RECURRING_REVENUE', 'EXPENSE_CATEGORY'],
              description: 'Entity type'
            },
            entityId: { type: 'number', description: 'Entity ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    CashFlowProjectionEngineController.getAuditLog.bind(CashFlowProjectionEngineController)
  );
}
