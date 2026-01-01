import DenialAnalysisService from '../services/DenialAnalysis.service.js';
import { logger } from '../utils/logger.js';

/**
 * Denial Analysis Controller
 * Advanced Analytics Engine API Endpoints
 *
 * Endpoints:
 *   Trend Analysis:
 *     - GET  /denial-analysis/trends           - Get comprehensive trend analysis with moving averages
 *
 *   Pattern Identification:
 *     - GET  /denial-analysis/patterns         - Identify denial patterns across dimensions
 *     - GET  /denial-analysis/patterns/payers  - Get patterns by payer
 *     - GET  /denial-analysis/patterns/codes   - Get patterns by CARC code
 *
 *   Prevention Strategies:
 *     - GET  /denial-analysis/prevention       - Generate prevention strategies based on patterns
 *
 *   Root Cause Analysis:
 *     - GET  /denial-analysis/root-cause       - Perform root cause analysis
 *
 *   Predictive Analytics:
 *     - GET  /denial-analysis/forecast         - Generate denial rate forecast
 *
 *   Comparative Analysis:
 *     - GET  /denial-analysis/compare          - Compare performance across dimensions
 *     - GET  /denial-analysis/benchmark        - Get benchmark data
 */

class DenialAnalysisController {
  // ============================================
  // TREND ANALYSIS ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/trends
   * Get comprehensive trend analysis with moving averages and trend indicators
   */
  async getTrendAnalysis(req, res) {
    try {
      const {
        periodType = 'MONTHLY',
        startDate,
        endDate,
        payerId,
        denialCategoryId,
        movingAveragePeriods = 3
      } = req.query;

      const filters = {
        periodType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        payerId: payerId ? parseInt(payerId) : null,
        denialCategoryId: denialCategoryId ? parseInt(denialCategoryId) : null,
        movingAveragePeriods: parseInt(movingAveragePeriods)
      };

      const analysis = await DenialAnalysisService.getTrendAnalysis(filters);

      res.json({
        success: true,
        ...analysis
      });
    } catch (error) {
      logger.error('Error getting trend analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve trend analysis',
        message: error.message
      });
    }
  }

  // ============================================
  // PATTERN IDENTIFICATION ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/patterns
   * Identify denial patterns across multiple dimensions
   */
  async identifyPatterns(req, res) {
    try {
      const {
        startDate,
        endDate,
        minOccurrences = 5,
        topN = 20
      } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        minOccurrences: parseInt(minOccurrences),
        topN: parseInt(topN)
      };

      const patterns = await DenialAnalysisService.identifyPatterns(filters);

      res.json({
        success: true,
        ...patterns
      });
    } catch (error) {
      logger.error('Error identifying patterns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to identify denial patterns',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denial-analysis/patterns/payers
   * Get denial patterns specifically by payer
   */
  async getPayerPatterns(req, res) {
    try {
      const {
        startDate,
        endDate,
        limit = 20
      } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

      const patterns = await DenialAnalysisService.getPayerPatterns(start, end, parseInt(limit));

      res.json({
        success: true,
        count: patterns.length,
        patterns,
        analysisMetadata: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting payer patterns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payer patterns',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denial-analysis/patterns/codes
   * Get denial patterns by CARC code
   */
  async getCodePatterns(req, res) {
    try {
      const {
        startDate,
        endDate,
        limit = 20
      } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

      const patterns = await DenialAnalysisService.getCarcCodePatterns(start, end, parseInt(limit));

      res.json({
        success: true,
        count: patterns.length,
        patterns,
        analysisMetadata: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting code patterns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve CARC code patterns',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denial-analysis/patterns/time
   * Get time-based denial patterns (day of week, month trends)
   */
  async getTimePatterns(req, res) {
    try {
      const {
        startDate,
        endDate
      } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 365 * 24 * 60 * 60 * 1000); // 1 year

      const patterns = await DenialAnalysisService.getTimeBasedPatterns(start, end);

      res.json({
        success: true,
        ...patterns,
        analysisMetadata: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting time patterns:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve time-based patterns',
        message: error.message
      });
    }
  }

  // ============================================
  // PREVENTION STRATEGY ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/prevention
   * Generate prevention strategies based on identified patterns
   */
  async getPreventionStrategies(req, res) {
    try {
      const {
        startDate,
        endDate,
        topN = 10
      } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        topN: parseInt(topN)
      };

      const strategies = await DenialAnalysisService.generatePreventionStrategies(filters);

      res.json({
        success: true,
        ...strategies
      });
    } catch (error) {
      logger.error('Error generating prevention strategies:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate prevention strategies',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denial-analysis/prevention/preventable
   * Get analysis of preventable denials
   */
  async getPreventableAnalysis(req, res) {
    try {
      const {
        startDate,
        endDate
      } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : null;

      const analysis = await DenialAnalysisService.analyzePreventableDenials(start, end);

      res.json({
        success: true,
        ...analysis,
        analysisMetadata: {
          startDate: start ? start.toISOString() : null,
          endDate: end.toISOString(),
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error analyzing preventable denials:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze preventable denials',
        message: error.message
      });
    }
  }

  // ============================================
  // ROOT CAUSE ANALYSIS ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/root-cause
   * Perform root cause analysis on denial trends
   */
  async getRootCauseAnalysis(req, res) {
    try {
      const {
        startDate,
        endDate,
        payerId,
        carcCode,
        categoryId
      } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        payerId: payerId ? parseInt(payerId) : null,
        carcCode: carcCode || null,
        categoryId: categoryId ? parseInt(categoryId) : null
      };

      const analysis = await DenialAnalysisService.performRootCauseAnalysis(filters);

      res.json({
        success: true,
        ...analysis
      });
    } catch (error) {
      logger.error('Error performing root cause analysis:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to perform root cause analysis',
        message: error.message
      });
    }
  }

  // ============================================
  // PREDICTIVE ANALYTICS ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/forecast
   * Generate denial rate forecast
   */
  async getForecast(req, res) {
    try {
      const {
        periodType = 'MONTHLY',
        forecastPeriods = 3,
        payerId
      } = req.query;

      const filters = {
        periodType,
        forecastPeriods: parseInt(forecastPeriods),
        payerId: payerId ? parseInt(payerId) : null
      };

      const forecast = await DenialAnalysisService.forecastDenialRate(filters);

      res.json({
        success: true,
        ...forecast
      });
    } catch (error) {
      logger.error('Error generating forecast:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate denial rate forecast',
        message: error.message
      });
    }
  }

  // ============================================
  // COMPARATIVE ANALYSIS ENDPOINTS
  // ============================================

  /**
   * GET /api/denial-analysis/compare
   * Compare performance across dimensions
   */
  async comparePerformance(req, res) {
    try {
      const {
        compareType = 'PAYERS',
        startDate,
        endDate,
        payerIds,
        periodType = 'MONTHLY'
      } = req.query;

      const filters = {
        compareType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        payerIds: payerIds ? payerIds.split(',').map(id => parseInt(id.trim())) : null,
        periodType
      };

      const comparison = await DenialAnalysisService.comparePerformance(filters);

      res.json({
        success: true,
        ...comparison
      });
    } catch (error) {
      logger.error('Error comparing performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare performance',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denial-analysis/compare/payers
   * Compare performance across payers (shorthand endpoint)
   */
  async comparePayerPerformance(req, res) {
    try {
      const {
        startDate,
        endDate,
        payerIds
      } = req.query;

      const filters = {
        compareType: 'PAYERS',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        payerIds: payerIds ? payerIds.split(',').map(id => parseInt(id.trim())) : null
      };

      const comparison = await DenialAnalysisService.comparePerformance(filters);

      res.json({
        success: true,
        ...comparison
      });
    } catch (error) {
      logger.error('Error comparing payer performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare payer performance',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denial-analysis/compare/periods
   * Compare performance across time periods (shorthand endpoint)
   */
  async compareTimePeriods(req, res) {
    try {
      const {
        startDate,
        endDate,
        periodType = 'MONTHLY'
      } = req.query;

      if (!startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'startDate and endDate are required for time period comparison'
        });
      }

      const filters = {
        compareType: 'TIME_PERIODS',
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        periodType
      };

      const comparison = await DenialAnalysisService.comparePerformance(filters);

      res.json({
        success: true,
        ...comparison
      });
    } catch (error) {
      logger.error('Error comparing time periods:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare time periods',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denial-analysis/compare/categories
   * Compare performance across denial categories (shorthand endpoint)
   */
  async compareCategoryPerformance(req, res) {
    try {
      const {
        startDate,
        endDate
      } = req.query;

      const filters = {
        compareType: 'CATEGORIES',
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      };

      const comparison = await DenialAnalysisService.comparePerformance(filters);

      res.json({
        success: true,
        ...comparison
      });
    } catch (error) {
      logger.error('Error comparing category performance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to compare category performance',
        message: error.message
      });
    }
  }

  // ============================================
  // SUMMARY DASHBOARD ENDPOINT
  // ============================================

  /**
   * GET /api/denial-analysis/summary
   * Get a comprehensive summary of denial analysis
   */
  async getSummary(req, res) {
    try {
      const {
        startDate,
        endDate,
        periodType = 'MONTHLY'
      } = req.query;

      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 90 * 24 * 60 * 60 * 1000);

      // Get multiple analyses in parallel
      const [
        trendAnalysis,
        patterns,
        preventionStrategies,
        forecast
      ] = await Promise.all([
        DenialAnalysisService.getTrendAnalysis({
          periodType,
          startDate: start,
          endDate: end,
          movingAveragePeriods: 3
        }),
        DenialAnalysisService.identifyPatterns({
          startDate: start,
          endDate: end,
          topN: 5,
          minOccurrences: 3
        }),
        DenialAnalysisService.generatePreventionStrategies({
          startDate: start,
          endDate: end,
          topN: 5
        }),
        DenialAnalysisService.forecastDenialRate({
          periodType,
          forecastPeriods: 3
        })
      ]);

      res.json({
        success: true,
        summary: {
          trendSummary: trendAnalysis.summary,
          trendIndicators: trendAnalysis.trendIndicators,
          topPatterns: patterns.topPatterns.slice(0, 5),
          topStrategies: preventionStrategies.strategies.slice(0, 3),
          totalPotentialRecovery: preventionStrategies.summary?.totalPotentialRecovery || 0,
          forecast: {
            nextPeriod: forecast.forecast[0] || null,
            confidence: forecast.confidence
          }
        },
        analysisMetadata: {
          startDate: start.toISOString(),
          endDate: end.toISOString(),
          periodType,
          generatedAt: new Date().toISOString()
        }
      });
    } catch (error) {
      logger.error('Error getting denial analysis summary:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve denial analysis summary',
        message: error.message
      });
    }
  }
}

export default new DenialAnalysisController();
