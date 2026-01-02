import RevenueAccrualService from '../services/RevenueAccrual.service.js';
import RevenueForecastingService from '../services/RevenueForecasting.service.js';
import CashFlowProjectionService from '../services/CashFlowProjection.service.js';

import { logger } from '../utils/logger.js';
/**
 * Revenue Recognition Controller
 * Phase 3D - API endpoints for revenue recognition and forecasting
 *
 * Endpoints:
 *   Revenue Accrual:
 *     - POST   /accruals                  - Create accrual for claim
 *     - GET    /accruals/period/:period   - Get accruals for period
 *     - POST   /accruals/:id/adjustment   - Create adjustment
 *     - POST   /accruals/:id/writeoff     - Write off balance
 *     - POST   /periods/:period/close     - Close revenue period
 *     - GET    /summary                   - Get revenue summary
 *
 *   Forecasting:
 *     - POST   /forecasts                 - Create collection forecast
 *     - PUT    /forecasts/:id/actuals     - Update with actuals
 *     - GET    /forecasts/accuracy        - Get forecast accuracy
 *     - POST   /payers/:id/patterns       - Calculate payer patterns
 *
 *   Cash Flow:
 *     - POST   /cashflow/projections      - Create cash flow projection
 *     - PUT    /cashflow/:id/actuals      - Update with actuals
 *     - GET    /cashflow/13week           - Get 13-week rolling projection
 *     - GET    /cashflow/summary          - Get cash flow summary
 */

class RevenueRecognitionController {
  // ============================================
  // REVENUE ACCRUAL ENDPOINTS
  // ============================================

  /**
   * POST /api/revenue/accruals
   * Create revenue accrual for a claim
   */
  async createAccrual(req, res) {
    try {
      const { claimId } = req.body;
      const userId = req.user.id;

      if (!claimId) {
        return res.status(400).json({
          success: false,
          error: 'claimId is required'
        });
      }

      const accrual = await RevenueAccrualService.createAccrualForClaim(
        parseInt(claimId),
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Revenue accrual created successfully',
        accrual
      });
    } catch (error) {
      logger.error('Error creating accrual:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create revenue accrual',
        message: error.message
      });
    }
  }

  /**
   * GET /api/revenue/accruals/period/:period
   * Get accruals for a specific period
   */
  async getAccrualsForPeriod(req, res) {
    try {
      const { period } = req.params;
      const { payerId, status } = req.query;

      const filters = {
        payerId: payerId ? parseInt(payerId) : null,
        status
      };

      const accruals = await RevenueAccrualService.getAccrualsForPeriod(period, filters);

      res.json({
        success: true,
        count: accruals.length,
        period,
        accruals
      });
    } catch (error) {
      logger.error('Error getting accruals:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve accruals',
        message: error.message
      });
    }
  }

  /**
   * POST /api/revenue/accruals/:id/adjustment
   * Create revenue adjustment
   */
  async createAdjustment(req, res) {
    try {
      const { id } = req.params;
      const {
        claimId,
        adjustmentType,
        adjustmentAmount,
        reason,
        sourceType,
        sourceReferenceId,
        denialId,
        appealId,
        eraPaymentId
      } = req.body;
      const userId = req.user.id;

      if (!adjustmentType || !adjustmentAmount || !reason) {
        return res.status(400).json({
          success: false,
          error: 'adjustmentType, adjustmentAmount, and reason are required'
        });
      }

      const adjustment = await RevenueAccrualService.createAdjustment({
        accrualId: parseInt(id),
        claimId: parseInt(claimId),
        adjustmentType,
        adjustmentAmount: parseInt(adjustmentAmount),
        reason,
        sourceType,
        sourceReferenceId,
        denialId: denialId ? parseInt(denialId) : null,
        appealId: appealId ? parseInt(appealId) : null,
        eraPaymentId: eraPaymentId ? parseInt(eraPaymentId) : null,
        userId
      });

      res.status(201).json({
        success: true,
        message: 'Revenue adjustment created successfully',
        adjustment
      });
    } catch (error) {
      logger.error('Error creating adjustment:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create adjustment',
        message: error.message
      });
    }
  }

  /**
   * POST /api/revenue/accruals/:id/writeoff
   * Write off uncollectible balance
   */
  async writeOffBalance(req, res) {
    try {
      const { id } = req.params;
      const { writeOffAmount, reason } = req.body;
      const userId = req.user.id;

      if (!writeOffAmount || !reason) {
        return res.status(400).json({
          success: false,
          error: 'writeOffAmount and reason are required'
        });
      }

      await RevenueAccrualService.writeOffBalance(
        parseInt(id),
        parseInt(writeOffAmount),
        reason,
        userId
      );

      res.json({
        success: true,
        message: 'Balance written off successfully'
      });
    } catch (error) {
      logger.error('Error writing off balance:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to write off balance',
        message: error.message
      });
    }
  }

  /**
   * POST /api/revenue/periods/:period/close
   * Close revenue period
   */
  async closePeriod(req, res) {
    try {
      const { period } = req.params;
      const { periodType = 'MONTHLY' } = req.body;
      const userId = req.user.id;

      const closedPeriod = await RevenueAccrualService.closePeriod(
        period,
        periodType,
        userId
      );

      res.json({
        success: true,
        message: `Period ${period} closed successfully`,
        period: closedPeriod
      });
    } catch (error) {
      logger.error('Error closing period:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to close period',
        message: error.message
      });
    }
  }

  /**
   * GET /api/revenue/summary
   * Get revenue summary for date range
   */
  async getRevenueSummary(req, res) {
    try {
      const { startDate, endDate } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required'
        });
      }

      const summary = await RevenueAccrualService.getRevenueSummary(
        new Date(startDate),
        new Date(endDate)
      );

      res.json({
        success: true,
        period: { startDate, endDate },
        summary
      });
    } catch (error) {
      logger.error('Error getting revenue summary:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve revenue summary',
        message: error.message
      });
    }
  }

  // ============================================
  // FORECASTING ENDPOINTS
  // ============================================

  /**
   * POST /api/revenue/forecasts
   * Create collection forecast
   */
  async createForecast(req, res) {
    try {
      const {
        forecastPeriod,
        forecastType = 'MONTHLY',
        payerId,
        serviceType
      } = req.body;
      const userId = req.user.id;

      if (!forecastPeriod) {
        return res.status(400).json({
          success: false,
          error: 'forecastPeriod is required'
        });
      }

      const dimensions = {
        payerId: payerId ? parseInt(payerId) : null,
        serviceType
      };

      const forecast = await RevenueForecastingService.createForecast(
        forecastPeriod,
        forecastType,
        dimensions,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Forecast created successfully',
        forecast
      });
    } catch (error) {
      logger.error('Error creating forecast:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create forecast',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/revenue/forecasts/:id/actuals
   * Update forecast with actual results
   */
  async updateForecastActuals(req, res) {
    try {
      const { id } = req.params;
      const { actualCollections, actualWriteoffs } = req.body;

      if (actualCollections === undefined) {
        return res.status(400).json({
          success: false,
          error: 'actualCollections is required'
        });
      }

      await RevenueForecastingService.updateForecastActuals(
        parseInt(id),
        parseInt(actualCollections),
        parseInt(actualWriteoffs || 0)
      );

      res.json({
        success: true,
        message: 'Forecast updated with actuals'
      });
    } catch (error) {
      logger.error('Error updating forecast actuals:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update forecast',
        message: error.message
      });
    }
  }

  /**
   * GET /api/revenue/forecasts/accuracy
   * Get forecast accuracy report
   */
  async getForecastAccuracy(req, res) {
    try {
      const { startPeriod, endPeriod } = req.query;

      if (!startPeriod || !endPeriod) {
        return res.status(400).json({
          success: false,
          error: 'startPeriod and endPeriod are required'
        });
      }

      const accuracy = await RevenueForecastingService.getForecastAccuracyReport(
        startPeriod,
        endPeriod
      );

      res.json({
        success: true,
        accuracy
      });
    } catch (error) {
      logger.error('Error getting forecast accuracy:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve forecast accuracy',
        message: error.message
      });
    }
  }

  /**
   * POST /api/revenue/payers/:id/patterns
   * Calculate payer payment patterns
   */
  async calculatePayerPatterns(req, res) {
    try {
      const { id } = req.params;
      const { analysisMonths = 12 } = req.body;

      const patterns = await RevenueForecastingService.calculatePayerPatterns(
        parseInt(id),
        parseInt(analysisMonths)
      );

      res.json({
        success: true,
        message: 'Payer payment patterns calculated',
        patterns
      });
    } catch (error) {
      logger.error('Error calculating payer patterns:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate payer patterns',
        message: error.message
      });
    }
  }

  // ============================================
  // CENSUS-BASED FORECASTING ENDPOINTS
  // ============================================

  /**
   * GET /api/revenue/forecasts/census
   * Get current census data
   */
  async getCurrentCensus(req, res) {
    try {
      const census = await RevenueForecastingService.getCurrentCensus();
      const locBreakdown = await RevenueForecastingService.getCensusByLevelOfCare();

      res.json({
        success: true,
        data: {
          totalCensus: census,
          byLevelOfCare: locBreakdown,
          asOf: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting current census:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve census data',
        message: error.message
      });
    }
  }

  /**
   * GET /api/revenue/forecasts/census/history
   * Get historical census data
   */
  async getHistoricalCensus(req, res) {
    try {
      const { months = 12 } = req.query;

      const censusHistory = await RevenueForecastingService.getHistoricalCensus(
        parseInt(months)
      );

      res.json({
        success: true,
        data: {
          months: parseInt(months),
          history: censusHistory
        }
      });
    } catch (error) {
      logger.error('Error getting historical census:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve historical census',
        message: error.message
      });
    }
  }

  /**
   * POST /api/revenue/forecasts/census-based
   * Generate census-based revenue forecast
   */
  async generateCensusBasedForecast(req, res) {
    try {
      const {
        forecastPeriod,
        projectedCensusGrowth,
        locMixOverride,
        customRates,
        forecastMonths = 3
      } = req.body;

      if (!forecastPeriod) {
        return res.status(400).json({
          success: false,
          error: 'forecastPeriod is required (format: YYYY-MM)'
        });
      }

      const forecast = await RevenueForecastingService.generateCensusBasedForecast(
        forecastPeriod,
        {
          projectedCensusGrowth: projectedCensusGrowth ? parseFloat(projectedCensusGrowth) : 0,
          locMixOverride,
          customRates,
          forecastMonths: parseInt(forecastMonths)
        }
      );

      res.status(201).json({
        success: true,
        message: 'Census-based forecast generated successfully',
        forecast
      });
    } catch (error) {
      logger.error('Error generating census-based forecast:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate census-based forecast',
        message: error.message
      });
    }
  }

  // ============================================
  // LOC-BASED FORECASTING ENDPOINTS
  // ============================================

  /**
   * GET /api/revenue/forecasts/loc/history
   * Get historical level of care distribution
   */
  async getHistoricalLocDistribution(req, res) {
    try {
      const { months = 12 } = req.query;

      const locHistory = await RevenueForecastingService.getHistoricalLocDistribution(
        parseInt(months)
      );

      res.json({
        success: true,
        data: {
          months: parseInt(months),
          history: locHistory
        }
      });
    } catch (error) {
      logger.error('Error getting historical LOC distribution:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve historical LOC distribution',
        message: error.message
      });
    }
  }

  /**
   * POST /api/revenue/forecasts/loc-based
   * Generate LOC-based revenue forecast
   */
  async generateLocBasedForecast(req, res) {
    try {
      const {
        forecastPeriod,
        historicalMonths = 12,
        forecastMonths = 3,
        locGrowthRates
      } = req.body;

      if (!forecastPeriod) {
        return res.status(400).json({
          success: false,
          error: 'forecastPeriod is required (format: YYYY-MM)'
        });
      }

      const forecast = await RevenueForecastingService.generateLocBasedForecast(
        forecastPeriod,
        {
          historicalMonths: parseInt(historicalMonths),
          forecastMonths: parseInt(forecastMonths),
          locGrowthRates
        }
      );

      res.status(201).json({
        success: true,
        message: 'LOC-based forecast generated successfully',
        forecast
      });
    } catch (error) {
      logger.error('Error generating LOC-based forecast:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate LOC-based forecast',
        message: error.message
      });
    }
  }

  // ============================================
  // COMPREHENSIVE & SCENARIO FORECASTING
  // ============================================

  /**
   * POST /api/revenue/forecasts/comprehensive
   * Generate comprehensive revenue forecast using multiple models
   */
  async generateComprehensiveForecast(req, res) {
    try {
      const {
        forecastPeriod,
        forecastMonths = 3,
        historicalMonths = 12,
        weights = { census: 0.3, loc: 0.3, historical: 0.4 }
      } = req.body;

      if (!forecastPeriod) {
        return res.status(400).json({
          success: false,
          error: 'forecastPeriod is required (format: YYYY-MM)'
        });
      }

      const forecast = await RevenueForecastingService.generateComprehensiveForecast(
        forecastPeriod,
        {
          forecastMonths: parseInt(forecastMonths),
          historicalMonths: parseInt(historicalMonths),
          weights
        }
      );

      res.status(201).json({
        success: true,
        message: 'Comprehensive forecast generated successfully',
        forecast
      });
    } catch (error) {
      logger.error('Error generating comprehensive forecast:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate comprehensive forecast',
        message: error.message
      });
    }
  }

  /**
   * POST /api/revenue/forecasts/scenarios
   * Generate scenario-based forecasts (optimistic, base, pessimistic)
   */
  async generateScenarioForecasts(req, res) {
    try {
      const {
        forecastPeriod,
        forecastMonths = 6,
        scenarios = ['optimistic', 'base', 'pessimistic']
      } = req.body;

      if (!forecastPeriod) {
        return res.status(400).json({
          success: false,
          error: 'forecastPeriod is required (format: YYYY-MM)'
        });
      }

      const forecast = await RevenueForecastingService.generateScenarioForecasts(
        forecastPeriod,
        {
          forecastMonths: parseInt(forecastMonths),
          scenarios
        }
      );

      res.status(201).json({
        success: true,
        message: 'Scenario forecasts generated successfully',
        forecast
      });
    } catch (error) {
      logger.error('Error generating scenario forecasts:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate scenario forecasts',
        message: error.message
      });
    }
  }

  /**
   * POST /api/revenue/forecasts/payer/:id
   * Generate payer-specific revenue forecast
   */
  async generatePayerForecast(req, res) {
    try {
      const { id } = req.params;
      const {
        forecastPeriod,
        forecastMonths = 3,
        historicalMonths = 12
      } = req.body;

      if (!forecastPeriod) {
        return res.status(400).json({
          success: false,
          error: 'forecastPeriod is required (format: YYYY-MM)'
        });
      }

      const forecast = await RevenueForecastingService.generatePayerForecast(
        parseInt(id),
        forecastPeriod,
        {
          forecastMonths: parseInt(forecastMonths),
          historicalMonths: parseInt(historicalMonths)
        }
      );

      res.status(201).json({
        success: true,
        message: 'Payer-specific forecast generated successfully',
        forecast
      });
    } catch (error) {
      logger.error('Error generating payer forecast:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate payer forecast',
        message: error.message
      });
    }
  }

  /**
   * GET /api/revenue/forecasts/historical
   * Get historical revenue data
   */
  async getHistoricalRevenue(req, res) {
    try {
      const { months = 12, payerId, levelOfCare } = req.query;

      const historicalData = await RevenueForecastingService.getHistoricalRevenue(
        parseInt(months),
        {
          payerId: payerId ? parseInt(payerId) : null,
          levelOfCare
        }
      );

      res.json({
        success: true,
        data: {
          months: parseInt(months),
          filters: { payerId, levelOfCare },
          history: historicalData
        }
      });
    } catch (error) {
      logger.error('Error getting historical revenue:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve historical revenue',
        message: error.message
      });
    }
  }

  // ============================================
  // CASH FLOW ENDPOINTS
  // ============================================

  /**
   * POST /api/revenue/cashflow/projections
   * Create cash flow projection
   */
  async createCashFlowProjection(req, res) {
    try {
      const {
        projectionForPeriod,
        projectionType = 'SHORT_TERM',
        weeksAhead,
        monthsAhead,
        includeOutflows = false,
        sensitivityScenarios = false
      } = req.body;
      const userId = req.user.id;

      if (!projectionForPeriod) {
        return res.status(400).json({
          success: false,
          error: 'projectionForPeriod is required'
        });
      }

      const options = {
        weeksAhead,
        monthsAhead,
        includeOutflows,
        sensitivityScenarios
      };

      const projection = await CashFlowProjectionService.createProjection(
        projectionForPeriod,
        projectionType,
        options,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Cash flow projection created successfully',
        projection
      });
    } catch (error) {
      logger.error('Error creating cash flow projection:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create projection',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/revenue/cashflow/:id/actuals
   * Update projection with actual results
   */
  async updateProjectionActuals(req, res) {
    try {
      const { id } = req.params;
      const { actualCollections, actualNetCashFlow } = req.body;

      if (actualCollections === undefined) {
        return res.status(400).json({
          success: false,
          error: 'actualCollections is required'
        });
      }

      await CashFlowProjectionService.updateProjectionActuals(
        parseInt(id),
        parseInt(actualCollections),
        parseInt(actualNetCashFlow || 0)
      );

      res.json({
        success: true,
        message: 'Projection updated with actuals'
      });
    } catch (error) {
      logger.error('Error updating projection actuals:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to update projection',
        message: error.message
      });
    }
  }

  /**
   * GET /api/revenue/cashflow/13week
   * Get rolling 13-week cash flow projection
   */
  async get13WeekProjection(req, res) {
    try {
      const userId = req.user.id;

      const projections = await CashFlowProjectionService.getRolling13WeekProjection(userId);

      res.json({
        success: true,
        count: projections.length,
        projections
      });
    } catch (error) {
      logger.error('Error getting 13-week projection:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve 13-week projection',
        message: error.message
      });
    }
  }

  /**
   * GET /api/revenue/cashflow/summary
   * Get cash flow summary
   */
  async getCashFlowSummary(req, res) {
    try {
      const { startPeriod, endPeriod } = req.query;

      if (!startPeriod || !endPeriod) {
        return res.status(400).json({
          success: false,
          error: 'startPeriod and endPeriod are required'
        });
      }

      const summary = await CashFlowProjectionService.getCashFlowSummary(
        startPeriod,
        endPeriod
      );

      res.json({
        success: true,
        summary
      });
    } catch (error) {
      logger.error('Error getting cash flow summary:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve cash flow summary',
        message: error.message
      });
    }
  }
}

export default new RevenueRecognitionController();
