import CashFlowProjectionEngineService from '../services/CashFlowProjectionEngine.service.js';
import { logger } from '../utils/logger.js';

/**
 * Cash Flow Projection Engine Controller
 * API endpoints for comprehensive cash flow forecasting
 *
 * Endpoints:
 *   Expense Categories:
 *     - POST   /expense-categories              - Create expense category
 *     - GET    /expense-categories              - List expense categories
 *
 *   Payment Schedules:
 *     - POST   /payment-schedules               - Create payment schedule
 *     - GET    /payment-schedules               - List active schedules
 *     - GET    /payment-schedules/due           - Get payments due in range
 *
 *   Recurring Revenue:
 *     - POST   /recurring-revenue               - Create recurring revenue stream
 *     - GET    /recurring-revenue               - List active streams
 *
 *   Scenarios:
 *     - POST   /scenarios                       - Create scenario
 *     - GET    /scenarios                       - List scenarios
 *
 *   Projections:
 *     - POST   /projections                     - Generate projection
 *     - POST   /projections/13-week             - Generate 13-week rolling projection
 *     - POST   /projections/quarterly           - Generate quarterly projection
 *     - POST   /projections/scenario-comparison - Generate multi-scenario comparison
 *     - PUT    /projections/:id/actuals         - Update with actuals
 *
 *   Historical Analysis:
 *     - POST   /historical-patterns             - Calculate historical patterns
 *
 *   Reports:
 *     - GET    /reports/summary                 - Get cash flow summary report
 *     - GET    /reports/export/:id              - Export projection to CSV
 *
 *   Audit:
 *     - GET    /audit/:entityType/:entityId     - Get audit log for entity
 */

class CashFlowProjectionEngineController {
  // ============================================
  // EXPENSE CATEGORY ENDPOINTS
  // ============================================

  /**
   * POST /api/cashflow/expense-categories
   * Create expense category
   */
  async createExpenseCategory(req, res) {
    try {
      const userId = req.user?.id;
      const data = req.body;

      if (!data.categoryCode || !data.categoryName || !data.categoryType) {
        return res.status(400).json({
          success: false,
          error: 'categoryCode, categoryName, and categoryType are required'
        });
      }

      const category = await CashFlowProjectionEngineService.createExpenseCategory(data, userId);

      res.status(201).json({
        success: true,
        message: 'Expense category created successfully',
        data: category
      });
    } catch (error) {
      logger.error('Error creating expense category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create expense category',
        message: error.message
      });
    }
  }

  /**
   * GET /api/cashflow/expense-categories
   * List expense categories
   */
  async getExpenseCategories(req, res) {
    try {
      const { includeInactive } = req.query;

      const categories = await CashFlowProjectionEngineService.getExpenseCategories(
        includeInactive === 'true'
      );

      res.json({
        success: true,
        count: categories.length,
        data: categories
      });
    } catch (error) {
      logger.error('Error getting expense categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve expense categories',
        message: error.message
      });
    }
  }

  // ============================================
  // PAYMENT SCHEDULE ENDPOINTS
  // ============================================

  /**
   * POST /api/cashflow/payment-schedules
   * Create payment schedule
   */
  async createPaymentSchedule(req, res) {
    try {
      const userId = req.user?.id;
      const data = req.body;

      if (!data.scheduleName || !data.scheduleType || !data.baseAmount ||
        !data.paymentFrequency || !data.nextPaymentDate || !data.effectiveStartDate) {
        return res.status(400).json({
          success: false,
          error: 'scheduleName, scheduleType, baseAmount, paymentFrequency, nextPaymentDate, and effectiveStartDate are required'
        });
      }

      const schedule = await CashFlowProjectionEngineService.createPaymentSchedule(data, userId);

      res.status(201).json({
        success: true,
        message: 'Payment schedule created successfully',
        data: schedule
      });
    } catch (error) {
      logger.error('Error creating payment schedule:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create payment schedule',
        message: error.message
      });
    }
  }

  /**
   * GET /api/cashflow/payment-schedules
   * List active payment schedules
   */
  async getPaymentSchedules(req, res) {
    try {
      const { scheduleType, priorityLevel, beforeDate } = req.query;

      const schedules = await CashFlowProjectionEngineService.getActivePaymentSchedules({
        scheduleType,
        priorityLevel,
        beforeDate
      });

      res.json({
        success: true,
        count: schedules.length,
        data: schedules
      });
    } catch (error) {
      logger.error('Error getting payment schedules:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payment schedules',
        message: error.message
      });
    }
  }

  /**
   * GET /api/cashflow/payment-schedules/due
   * Get payments due in date range
   */
  async getPaymentsDue(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
      }

      const payments = await CashFlowProjectionEngineService.getPaymentsDueInRange(startDate, endDate);

      // Calculate totals by type
      const totals = {};
      let grandTotal = 0;
      for (const payment of payments) {
        totals[payment.scheduleType] = (totals[payment.scheduleType] || 0) + payment.amount;
        grandTotal += payment.amount;
      }

      res.json({
        success: true,
        count: payments.length,
        dateRange: { startDate, endDate },
        totals,
        grandTotal,
        data: payments
      });
    } catch (error) {
      logger.error('Error getting payments due:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payments due',
        message: error.message
      });
    }
  }

  // ============================================
  // RECURRING REVENUE ENDPOINTS
  // ============================================

  /**
   * POST /api/cashflow/recurring-revenue
   * Create recurring revenue stream
   */
  async createRecurringRevenueStream(req, res) {
    try {
      const userId = req.user?.id;
      const data = req.body;

      if (!data.streamName || !data.streamType || !data.expectedMonthlyRevenue ||
        !data.paymentCycle || !data.effectiveStartDate) {
        return res.status(400).json({
          success: false,
          error: 'streamName, streamType, expectedMonthlyRevenue, paymentCycle, and effectiveStartDate are required'
        });
      }

      const stream = await CashFlowProjectionEngineService.createRecurringRevenueStream(data, userId);

      res.status(201).json({
        success: true,
        message: 'Recurring revenue stream created successfully',
        data: stream
      });
    } catch (error) {
      logger.error('Error creating recurring revenue stream:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create recurring revenue stream',
        message: error.message
      });
    }
  }

  /**
   * GET /api/cashflow/recurring-revenue
   * List active recurring revenue streams
   */
  async getRecurringRevenueStreams(req, res) {
    try {
      const { streamType, customerSegment } = req.query;

      const streams = await CashFlowProjectionEngineService.getActiveRevenueStreams({
        streamType,
        customerSegment
      });

      // Calculate totals
      let totalMonthlyRevenue = 0;
      for (const stream of streams) {
        totalMonthlyRevenue += Number(stream.expected_monthly_revenue) || 0;
      }

      res.json({
        success: true,
        count: streams.length,
        totalMonthlyRevenue,
        data: streams
      });
    } catch (error) {
      logger.error('Error getting recurring revenue streams:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve recurring revenue streams',
        message: error.message
      });
    }
  }

  // ============================================
  // SCENARIO ENDPOINTS
  // ============================================

  /**
   * POST /api/cashflow/scenarios
   * Create cash flow scenario
   */
  async createScenario(req, res) {
    try {
      const userId = req.user?.id;
      const data = req.body;

      if (!data.scenarioName || !data.scenarioType) {
        return res.status(400).json({
          success: false,
          error: 'scenarioName and scenarioType are required'
        });
      }

      const scenario = await CashFlowProjectionEngineService.createScenario(data, userId);

      res.status(201).json({
        success: true,
        message: 'Scenario created successfully',
        data: scenario
      });
    } catch (error) {
      logger.error('Error creating scenario:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create scenario',
        message: error.message
      });
    }
  }

  /**
   * GET /api/cashflow/scenarios
   * List scenarios
   */
  async getScenarios(req, res) {
    try {
      const scenarios = await CashFlowProjectionEngineService.getDefaultScenarios();

      res.json({
        success: true,
        count: scenarios.length,
        data: scenarios
      });
    } catch (error) {
      logger.error('Error getting scenarios:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve scenarios',
        message: error.message
      });
    }
  }

  // ============================================
  // PROJECTION ENDPOINTS
  // ============================================

  /**
   * POST /api/cashflow/projections
   * Generate cash flow projection
   */
  async generateProjection(req, res) {
    try {
      const userId = req.user?.id;
      const {
        horizonDays = 90,
        periodType = 'MONTHLY',
        scenarioId,
        openingCashBalance = 0,
        includeScheduledPayments = true,
        includeRecurringRevenue = true,
        adjustForSeasonality = true
      } = req.body;

      const projection = await CashFlowProjectionEngineService.generateProjection({
        horizonDays: parseInt(horizonDays),
        periodType,
        scenarioId: scenarioId ? parseInt(scenarioId) : null,
        openingCashBalance: parseInt(openingCashBalance),
        includeScheduledPayments,
        includeRecurringRevenue,
        adjustForSeasonality
      }, userId);

      res.status(201).json({
        success: true,
        message: 'Cash flow projection generated successfully',
        data: projection
      });
    } catch (error) {
      logger.error('Error generating projection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate projection',
        message: error.message
      });
    }
  }

  /**
   * POST /api/cashflow/projections/13-week
   * Generate rolling 13-week cash flow projection
   */
  async generateRolling13WeekProjection(req, res) {
    try {
      const userId = req.user?.id;
      const { openingCashBalance = 0 } = req.body;

      const projection = await CashFlowProjectionEngineService.generateRolling13WeekProjection(
        parseInt(openingCashBalance),
        userId
      );

      res.status(201).json({
        success: true,
        message: '13-week rolling projection generated successfully',
        data: projection
      });
    } catch (error) {
      logger.error('Error generating 13-week projection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate 13-week projection',
        message: error.message
      });
    }
  }

  /**
   * POST /api/cashflow/projections/quarterly
   * Generate quarterly cash flow projection
   */
  async generateQuarterlyProjection(req, res) {
    try {
      const userId = req.user?.id;
      const { openingCashBalance = 0 } = req.body;

      const projection = await CashFlowProjectionEngineService.generateQuarterlyProjection(
        parseInt(openingCashBalance),
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Quarterly projection generated successfully',
        data: projection
      });
    } catch (error) {
      logger.error('Error generating quarterly projection:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate quarterly projection',
        message: error.message
      });
    }
  }

  /**
   * POST /api/cashflow/projections/scenario-comparison
   * Generate multi-scenario comparison
   */
  async generateScenarioComparison(req, res) {
    try {
      const userId = req.user?.id;
      const {
        horizonDays = 90,
        periodType = 'MONTHLY',
        openingCashBalance = 0,
        includeScheduledPayments = true,
        includeRecurringRevenue = true
      } = req.body;

      const comparison = await CashFlowProjectionEngineService.generateScenarioComparison({
        horizonDays: parseInt(horizonDays),
        periodType,
        openingCashBalance: parseInt(openingCashBalance),
        includeScheduledPayments,
        includeRecurringRevenue
      }, userId);

      res.status(201).json({
        success: true,
        message: 'Scenario comparison generated successfully',
        data: comparison
      });
    } catch (error) {
      logger.error('Error generating scenario comparison:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate scenario comparison',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/cashflow/projections/:id/actuals
   * Update projection with actual results
   */
  async updateProjectionActuals(req, res) {
    try {
      const userId = req.user?.id;
      const { id } = req.params;
      const { actualCollections, actualOutflows, actualEndingCash } = req.body;

      if (actualCollections === undefined || actualOutflows === undefined) {
        return res.status(400).json({
          success: false,
          error: 'actualCollections and actualOutflows are required'
        });
      }

      const result = await CashFlowProjectionEngineService.updateForecastActuals(
        parseInt(id),
        {
          actualCollections: parseInt(actualCollections),
          actualOutflows: parseInt(actualOutflows),
          actualEndingCash: actualEndingCash !== undefined ? parseInt(actualEndingCash) : null
        },
        userId
      );

      res.json({
        success: true,
        message: 'Projection updated with actuals',
        data: result
      });
    } catch (error) {
      logger.error('Error updating projection actuals:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update projection actuals',
        message: error.message
      });
    }
  }

  // ============================================
  // HISTORICAL ANALYSIS ENDPOINTS
  // ============================================

  /**
   * POST /api/cashflow/historical-patterns
   * Calculate historical collection patterns
   */
  async calculateHistoricalPatterns(req, res) {
    try {
      const { analysisMonths = 12, dimension = 'OVERALL' } = req.body;

      const patterns = await CashFlowProjectionEngineService.calculateHistoricalPatterns(
        parseInt(analysisMonths),
        dimension
      );

      res.status(201).json({
        success: true,
        message: 'Historical patterns calculated successfully',
        count: patterns.length,
        data: patterns
      });
    } catch (error) {
      logger.error('Error calculating historical patterns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to calculate historical patterns',
        message: error.message
      });
    }
  }

  // ============================================
  // REPORT ENDPOINTS
  // ============================================

  /**
   * GET /api/cashflow/reports/summary
   * Get cash flow summary report
   */
  async getCashFlowSummaryReport(req, res) {
    try {
      const { startPeriod, endPeriod } = req.query;

      if (!startPeriod || !endPeriod) {
        return res.status(400).json({
          success: false,
          error: 'startPeriod and endPeriod are required'
        });
      }

      const summary = await CashFlowProjectionEngineService.getCashFlowSummaryReport(
        startPeriod,
        endPeriod
      );

      res.json({
        success: true,
        data: summary
      });
    } catch (error) {
      logger.error('Error getting cash flow summary report:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cash flow summary report',
        message: error.message
      });
    }
  }

  /**
   * GET /api/cashflow/reports/export/:id
   * Export projection to CSV
   */
  async exportProjectionToCSV(req, res) {
    try {
      const { id } = req.params;

      const csv = await CashFlowProjectionEngineService.exportProjectionToCSV(parseInt(id));

      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=cash-flow-projection-${id}.csv`);
      res.send(csv);
    } catch (error) {
      logger.error('Error exporting projection to CSV:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export projection',
        message: error.message
      });
    }
  }

  // ============================================
  // AUDIT ENDPOINTS
  // ============================================

  /**
   * GET /api/cashflow/audit/:entityType/:entityId
   * Get audit log for entity
   */
  async getAuditLog(req, res) {
    try {
      const { entityType, entityId } = req.params;

      const auditLog = await CashFlowProjectionEngineService.getAuditLog(
        entityType,
        parseInt(entityId)
      );

      res.json({
        success: true,
        count: auditLog.length,
        data: auditLog
      });
    } catch (error) {
      logger.error('Error getting audit log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve audit log',
        message: error.message
      });
    }
  }
}

export default new CashFlowProjectionEngineController();
