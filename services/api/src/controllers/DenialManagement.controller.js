import DenialManagementService from '../services/DenialManagement.service.js';
import AppealTrackingService from '../services/AppealTracking.service.js';
import DenialAnalyticsService from '../services/DenialAnalytics.service.js';

import { logger } from '../utils/logger.js';
/**
 * Denial Management Controller
 * Phase 3C - API endpoints for denial workflow and appeals
 *
 * Endpoints:
 *   Denial Management:
 *     - GET    /denials              - Get denials requiring action
 *     - GET    /denials/:id          - Get denial details
 *     - POST   /denials/:id/assign   - Assign denial to user
 *     - POST   /denials/:id/appeal   - Mark for appeal
 *     - POST   /denials/:id/resolve  - Resolve without appeal
 *     - GET    /denials/stats        - Get denial statistics
 *     - GET    /denials/top-reasons  - Get top denial reasons
 *
 *   Appeal Management:
 *     - POST   /appeals              - Create appeal case
 *     - POST   /appeals/:id/submit   - Submit appeal to payer
 *     - POST   /appeals/:id/decision - Record appeal decision
 *     - POST   /appeals/:id/escalate - Escalate to next level
 *     - POST   /appeals/:id/documents - Attach document
 *     - GET    /appeals              - Get appeals requiring action
 *     - GET    /appeals/:id          - Get appeal details
 *     - GET    /appeals/:id/timeline - Get appeal timeline
 *     - GET    /appeals/stats        - Get appeal statistics
 */

class DenialManagementController {
  // ============================================
  // DENIAL ENDPOINTS
  // ============================================

  /**
   * GET /api/denials
   * Get denials requiring action with filters
   */
  async getDenials(req, res) {
    try {
      const {
        priorityLevel,
        assignedTo,
        limit = 50
      } = req.query;

      const filters = {
        priorityLevel,
        assignedTo,
        limit: parseInt(limit)
      };

      const denials = await DenialManagementService.getDenialsRequiringAction(filters);

      res.json({
        success: true,
        count: denials.length,
        denials
      });
    } catch (error) {
      logger.error('Error getting denials:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve denials',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denials/:id
   * Get denial details with reasons
   */
  async getDenial(req, res) {
    try {
      const { id } = req.params;

      const denial = await DenialManagementService.getDenial(parseInt(id));

      if (!denial) {
        return res.status(404).json({
          success: false,
          error: 'Denial not found'
        });
      }

      res.json({
        success: true,
        denial
      });
    } catch (error) {
      logger.error('Error getting denial:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve denial',
        message: error.message
      });
    }
  }

  /**
   * POST /api/denials/:id/assign
   * Assign denial to user for review
   */
  async assignDenial(req, res) {
    try {
      const { id } = req.params;
      const { assignedToId } = req.body;
      const userId = req.user.id;

      if (!assignedToId) {
        return res.status(400).json({
          success: false,
          error: 'assignedToId is required'
        });
      }

      await DenialManagementService.assignDenial(
        parseInt(id),
        assignedToId,
        userId
      );

      res.json({
        success: true,
        message: 'Denial assigned successfully'
      });
    } catch (error) {
      logger.error('Error assigning denial:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to assign denial',
        message: error.message
      });
    }
  }

  /**
   * POST /api/denials/:id/appeal
   * Mark denial for appeal or decline appeal
   */
  async markForAppeal(req, res) {
    try {
      const { id } = req.params;
      const { willAppeal, reason } = req.body;
      const userId = req.user.id;

      if (willAppeal === undefined) {
        return res.status(400).json({
          success: false,
          error: 'willAppeal is required'
        });
      }

      const decision = {
        willAppeal,
        reason
      };

      await DenialManagementService.markForAppeal(
        parseInt(id),
        decision,
        userId
      );

      res.json({
        success: true,
        message: willAppeal
          ? 'Denial marked for appeal'
          : 'Denial declined for appeal',
        willAppeal
      });
    } catch (error) {
      logger.error('Error marking denial for appeal:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to mark denial for appeal',
        message: error.message
      });
    }
  }

  /**
   * POST /api/denials/:id/resolve
   * Resolve denial without appeal
   */
  async resolveDenial(req, res) {
    try {
      const { id } = req.params;
      const { resolutionType, resolutionAmount, notes } = req.body;
      const userId = req.user.id;

      if (!resolutionType) {
        return res.status(400).json({
          success: false,
          error: 'resolutionType is required'
        });
      }

      const resolution = {
        resolutionType,
        resolutionAmount: resolutionAmount ? parseInt(resolutionAmount) : 0,
        notes
      };

      await DenialManagementService.resolveDenial(
        parseInt(id),
        resolution,
        userId
      );

      res.json({
        success: true,
        message: 'Denial resolved successfully',
        resolutionType
      });
    } catch (error) {
      logger.error('Error resolving denial:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to resolve denial',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denials/stats
   * Get denial statistics
   */
  async getDenialStats(req, res) {
    try {
      const { startDate, endDate, payerId } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        payerId: payerId ? parseInt(payerId) : null
      };

      const stats = await DenialManagementService.getDenialStats(filters);

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Error getting denial stats:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve denial statistics',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denials/top-reasons
   * Get top denial reasons by frequency
   */
  async getTopDenialReasons(req, res) {
    try {
      const { limit = 10, startDate, endDate } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null
      };

      const reasons = await DenialManagementService.getTopDenialReasons(
        parseInt(limit),
        filters
      );

      res.json({
        success: true,
        count: reasons.length,
        reasons
      });
    } catch (error) {
      logger.error('Error getting top denial reasons:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve top denial reasons',
        message: error.message
      });
    }
  }

  // ============================================
  // APPEAL ENDPOINTS
  // ============================================

  /**
   * POST /api/appeals
   * Create new appeal case from denial
   */
  async createAppeal(req, res) {
    try {
      const {
        denialId,
        appealLevel,
        appealBasis,
        medicalNecessityRationale,
        policyReference,
        appealContactName,
        appealContactPhone,
        appealContactEmail
      } = req.body;
      const userId = req.user.id;

      // Validate required fields
      if (!denialId || !appealLevel || !appealBasis) {
        return res.status(400).json({
          success: false,
          error: 'denialId, appealLevel, and appealBasis are required'
        });
      }

      const appealData = {
        appealLevel,
        appealBasis,
        medicalNecessityRationale,
        policyReference,
        appealContactName,
        appealContactPhone,
        appealContactEmail
      };

      const appeal = await AppealTrackingService.createAppealCase(
        parseInt(denialId),
        appealData,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Appeal case created successfully',
        appeal
      });
    } catch (error) {
      logger.error('Error creating appeal:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to create appeal case',
        message: error.message
      });
    }
  }

  /**
   * POST /api/appeals/:id/submit
   * Submit appeal to payer
   */
  async submitAppeal(req, res) {
    try {
      const { id } = req.params;
      const {
        submissionMethod,
        trackingNumber,
        confirmationNumber,
        submittedDate
      } = req.body;
      const userId = req.user.id;

      if (!submissionMethod) {
        return res.status(400).json({
          success: false,
          error: 'submissionMethod is required'
        });
      }

      const submissionData = {
        submissionMethod,
        trackingNumber,
        confirmationNumber,
        submittedDate: submittedDate ? new Date(submittedDate) : new Date()
      };

      await AppealTrackingService.submitAppeal(
        parseInt(id),
        submissionData,
        userId
      );

      res.json({
        success: true,
        message: 'Appeal submitted successfully'
      });
    } catch (error) {
      logger.error('Error submitting appeal:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to submit appeal',
        message: error.message
      });
    }
  }

  /**
   * POST /api/appeals/:id/decision
   * Record appeal decision from payer
   */
  async recordDecision(req, res) {
    try {
      const { id } = req.params;
      const {
        decisionType,
        decisionReason,
        decisionDate,
        decisionReceivedDate,
        recoveredAmount,
        finalDeniedAmount
      } = req.body;
      const userId = req.user.id;

      if (!decisionType || !decisionReason) {
        return res.status(400).json({
          success: false,
          error: 'decisionType and decisionReason are required'
        });
      }

      const decisionData = {
        decisionType,
        decisionReason,
        decisionDate: decisionDate ? new Date(decisionDate) : new Date(),
        decisionReceivedDate: decisionReceivedDate ? new Date(decisionReceivedDate) : new Date(),
        recoveredAmount: recoveredAmount ? parseInt(recoveredAmount) : 0,
        finalDeniedAmount: finalDeniedAmount ? parseInt(finalDeniedAmount) : 0
      };

      const result = await AppealTrackingService.recordDecision(
        parseInt(id),
        decisionData,
        userId
      );

      res.json({
        success: true,
        message: 'Appeal decision recorded successfully',
        nextLevel: result.nextLevel,
        willEscalate: result.willEscalate
      });
    } catch (error) {
      logger.error('Error recording decision:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to record appeal decision',
        message: error.message
      });
    }
  }

  /**
   * POST /api/appeals/:id/escalate
   * Escalate appeal to next level
   */
  async escalateAppeal(req, res) {
    try {
      const { id } = req.params;
      const { escalationReason, additionalDocumentation } = req.body;
      const userId = req.user.id;

      if (!escalationReason) {
        return res.status(400).json({
          success: false,
          error: 'escalationReason is required'
        });
      }

      const escalationData = {
        escalationReason,
        additionalDocumentation
      };

      const newAppeal = await AppealTrackingService.escalateAppeal(
        parseInt(id),
        escalationData,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Appeal escalated successfully',
        newAppeal
      });
    } catch (error) {
      logger.error('Error escalating appeal:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to escalate appeal',
        message: error.message
      });
    }
  }

  /**
   * POST /api/appeals/:id/documents
   * Attach document to appeal
   */
  async attachDocument(req, res) {
    try {
      const { id } = req.params;
      const {
        documentType,
        documentName,
        documentDescription,
        filePath,
        fileUrl,
        fileSize,
        fileType,
        mimeType,
        documentDate,
        author,
        isRequired,
        isSensitive
      } = req.body;
      const userId = req.user.id;

      if (!documentType || !documentName) {
        return res.status(400).json({
          success: false,
          error: 'documentType and documentName are required'
        });
      }

      const documentData = {
        documentType,
        documentName,
        documentDescription,
        filePath,
        fileUrl,
        fileSize: fileSize ? parseInt(fileSize) : null,
        fileType,
        mimeType,
        documentDate: documentDate ? new Date(documentDate) : null,
        author,
        isRequired: isRequired === true,
        isSensitive: isSensitive !== false
      };

      const document = await AppealTrackingService.attachDocument(
        parseInt(id),
        documentData,
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Document attached successfully',
        document
      });
    } catch (error) {
      logger.error('Error attaching document:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to attach document',
        message: error.message
      });
    }
  }

  /**
   * GET /api/appeals
   * Get appeals requiring action
   */
  async getAppeals(req, res) {
    try {
      const {
        assignedTo,
        status,
        daysUntilDeadline = 30,
        limit = 50
      } = req.query;

      const filters = {
        assignedTo,
        status,
        daysUntilDeadline: parseInt(daysUntilDeadline),
        limit: parseInt(limit)
      };

      const appeals = await AppealTrackingService.getAppealsRequiringAction(filters);

      res.json({
        success: true,
        count: appeals.length,
        appeals
      });
    } catch (error) {
      logger.error('Error getting appeals:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve appeals',
        message: error.message
      });
    }
  }

  /**
   * GET /api/appeals/:id/timeline
   * Get appeal timeline milestones
   */
  async getAppealTimeline(req, res) {
    try {
      const { id } = req.params;

      const timeline = await AppealTrackingService.getAppealTimeline(parseInt(id));

      res.json({
        success: true,
        count: timeline.length,
        timeline
      });
    } catch (error) {
      logger.error('Error getting appeal timeline:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve appeal timeline',
        message: error.message
      });
    }
  }

  /**
   * GET /api/appeals/stats
   * Get appeal statistics
   */
  async getAppealStats(req, res) {
    try {
      const { startDate, endDate, appealLevel } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        appealLevel
      };

      const stats = await AppealTrackingService.getAppealStats(filters);

      res.json({
        success: true,
        stats
      });
    } catch (error) {
      logger.error('Error getting appeal stats:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve appeal statistics',
        message: error.message
      });
    }
  }

  // ============================================
  // ANALYTICS ENDPOINTS
  // ============================================

  /**
   * GET /api/denials/analytics/trends
   * Get denial trends over time
   */
  async getDenialTrends(req, res) {
    try {
      const { periodType = 'MONTHLY', startDate, endDate, payerId } = req.query;

      const filters = {
        periodType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        payerId: payerId ? parseInt(payerId) : null
      };

      const trends = await DenialAnalyticsService.getDenialTrends(filters);

      res.json({
        success: true,
        count: trends.length,
        trends
      });
    } catch (error) {
      logger.error('Error getting denial trends:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve denial trends',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denials/analytics/top-payers
   * Get top denying payers
   */
  async getTopDenyingPayers(req, res) {
    try {
      const { startDate, endDate, limit = 10 } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        limit: parseInt(limit)
      };

      const payers = await DenialAnalyticsService.getTopDenyingPayers(filters);

      res.json({
        success: true,
        count: payers.length,
        payers
      });
    } catch (error) {
      logger.error('Error getting top denying payers:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve top denying payers',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denials/analytics/dashboard
   * Get dashboard metrics
   */
  async getDashboardMetrics(req, res) {
    try {
      const {
        periodType = 'MONTHLY',
        startDate,
        endDate,
        payerId,
        denialCategoryId,
        limit = 12
      } = req.query;

      const filters = {
        periodType,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        payerId: payerId ? parseInt(payerId) : null,
        denialCategoryId: denialCategoryId ? parseInt(denialCategoryId) : null,
        limit: parseInt(limit)
      };

      const analytics = await DenialAnalyticsService.getDashboardMetrics(filters);

      res.json({
        success: true,
        count: analytics.length,
        analytics
      });
    } catch (error) {
      logger.error('Error getting dashboard metrics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve dashboard metrics',
        message: error.message
      });
    }
  }

  /**
   * POST /api/denials/analytics/calculate
   * Calculate analytics for a period
   */
  async calculateAnalytics(req, res) {
    try {
      const {
        periodType,
        startDate,
        endDate,
        payerId,
        denialCategoryId,
        carcCode
      } = req.body;

      if (!periodType || !startDate || !endDate) {
        return res.status(400).json({
          success: false,
          error: 'periodType, startDate, and endDate are required'
        });
      }

      const dimensions = {
        payerId: payerId ? parseInt(payerId) : null,
        denialCategoryId: denialCategoryId ? parseInt(denialCategoryId) : null,
        carcCode: carcCode || null
      };

      const analytics = await DenialAnalyticsService.calculateAnalytics(
        periodType,
        new Date(startDate),
        new Date(endDate),
        dimensions
      );

      res.status(201).json({
        success: true,
        message: 'Analytics calculated successfully',
        analytics
      });
    } catch (error) {
      logger.error('Error calculating analytics:', error)
      res.status(500).json({
        success: false,
        error: 'Failed to calculate analytics',
        message: error.message
      });
    }
  }

  // ============================================
  // LETTER TEMPLATE ENDPOINTS
  // ============================================

  /**
   * GET /api/letter-templates
   * Get all letter templates with optional filters
   */
  async getLetterTemplates(req, res) {
    try {
      const { appealLevel, payerType, denialCategory, isActive } = req.query;

      const filters = {
        appealLevel,
        payerType,
        denialCategory,
        isActive: isActive === undefined ? true : isActive === 'true'
      };

      const templates = await AppealTrackingService.getLetterTemplates(filters);

      res.json({
        success: true,
        count: templates.length,
        templates
      });
    } catch (error) {
      logger.error('Error getting letter templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve letter templates',
        message: error.message
      });
    }
  }

  /**
   * GET /api/letter-templates/:id
   * Get a specific letter template
   */
  async getLetterTemplate(req, res) {
    try {
      const { id } = req.params;

      const template = await AppealTrackingService.getLetterTemplate(parseInt(id));

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Letter template not found'
        });
      }

      res.json({
        success: true,
        template
      });
    } catch (error) {
      logger.error('Error getting letter template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve letter template',
        message: error.message
      });
    }
  }

  /**
   * POST /api/letter-templates
   * Create a new letter template
   */
  async createLetterTemplate(req, res) {
    try {
      const {
        templateName,
        templateDescription,
        appealLevel,
        payerType,
        denialCategory,
        letterSubject,
        letterBody,
        closingStatement,
        placeholders,
        requiredDocuments,
        regulatoryReference,
        effectiveDate,
        expirationDate,
        tags
      } = req.body;
      const userId = req.user.id;

      if (!templateName || !letterBody) {
        return res.status(400).json({
          success: false,
          error: 'templateName and letterBody are required'
        });
      }

      const templateData = {
        templateName,
        templateDescription,
        appealLevel,
        payerType,
        denialCategory,
        letterSubject,
        letterBody,
        closingStatement,
        placeholders,
        requiredDocuments,
        regulatoryReference,
        effectiveDate: effectiveDate ? new Date(effectiveDate) : null,
        expirationDate: expirationDate ? new Date(expirationDate) : null,
        tags
      };

      const template = await AppealTrackingService.createLetterTemplate(templateData, userId);

      res.status(201).json({
        success: true,
        message: 'Letter template created successfully',
        template
      });
    } catch (error) {
      logger.error('Error creating letter template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create letter template',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/letter-templates/:id
   * Update a letter template
   */
  async updateLetterTemplate(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await AppealTrackingService.updateLetterTemplate(parseInt(id), req.body, userId);

      res.json({
        success: true,
        message: 'Letter template updated successfully'
      });
    } catch (error) {
      logger.error('Error updating letter template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update letter template',
        message: error.message
      });
    }
  }

  /**
   * POST /api/appeals/:id/letters/generate
   * Generate an appeal letter from template
   */
  async generateAppealLetter(req, res) {
    try {
      const { id } = req.params;
      const { templateId, placeholderValues } = req.body;
      const userId = req.user.id;

      if (!templateId) {
        return res.status(400).json({
          success: false,
          error: 'templateId is required'
        });
      }

      const letter = await AppealTrackingService.generateAppealLetter(
        parseInt(id),
        parseInt(templateId),
        placeholderValues || {},
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Appeal letter generated successfully',
        letter
      });
    } catch (error) {
      logger.error('Error generating appeal letter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to generate appeal letter',
        message: error.message
      });
    }
  }

  /**
   * GET /api/appeals/:id/letters
   * Get all letters for an appeal
   */
  async getAppealLetters(req, res) {
    try {
      const { id } = req.params;

      const letters = await AppealTrackingService.getAppealLetters(parseInt(id));

      res.json({
        success: true,
        count: letters.length,
        letters
      });
    } catch (error) {
      logger.error('Error getting appeal letters:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve appeal letters',
        message: error.message
      });
    }
  }

  /**
   * GET /api/letters/:id
   * Get a specific letter
   */
  async getAppealLetter(req, res) {
    try {
      const { id } = req.params;

      const letter = await AppealTrackingService.getAppealLetter(parseInt(id));

      if (!letter) {
        return res.status(404).json({
          success: false,
          error: 'Letter not found'
        });
      }

      res.json({
        success: true,
        letter
      });
    } catch (error) {
      logger.error('Error getting letter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve letter',
        message: error.message
      });
    }
  }

  /**
   * PUT /api/letters/:id
   * Update letter content
   */
  async updateAppealLetter(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await AppealTrackingService.updateAppealLetter(parseInt(id), req.body, userId);

      res.json({
        success: true,
        message: 'Letter updated successfully'
      });
    } catch (error) {
      logger.error('Error updating letter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to update letter',
        message: error.message
      });
    }
  }

  /**
   * POST /api/letters/:id/finalize
   * Finalize a letter
   */
  async finalizeLetter(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await AppealTrackingService.finalizeLetter(parseInt(id), userId);

      res.json({
        success: true,
        message: 'Letter finalized successfully'
      });
    } catch (error) {
      logger.error('Error finalizing letter:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to finalize letter',
        message: error.message
      });
    }
  }

  /**
   * POST /api/letters/:id/send
   * Mark letter as sent
   */
  async markLetterSent(req, res) {
    try {
      const { id } = req.params;
      const { sentMethod, sentTo, trackingNumber } = req.body;
      const userId = req.user.id;

      if (!sentMethod) {
        return res.status(400).json({
          success: false,
          error: 'sentMethod is required'
        });
      }

      await AppealTrackingService.markLetterSent(
        parseInt(id),
        { sentMethod, sentTo, trackingNumber },
        userId
      );

      res.json({
        success: true,
        message: 'Letter marked as sent'
      });
    } catch (error) {
      logger.error('Error marking letter sent:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark letter as sent',
        message: error.message
      });
    }
  }

  // ============================================
  // WORKFLOW TEMPLATE ENDPOINTS
  // ============================================

  /**
   * GET /api/workflow-templates
   * Get all workflow templates
   */
  async getWorkflowTemplates(req, res) {
    try {
      const { appealLevel, payerType, isActive } = req.query;

      const filters = {
        appealLevel,
        payerType,
        isActive: isActive === undefined ? true : isActive === 'true'
      };

      const templates = await AppealTrackingService.getWorkflowTemplates(filters);

      res.json({
        success: true,
        count: templates.length,
        templates
      });
    } catch (error) {
      logger.error('Error getting workflow templates:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve workflow templates',
        message: error.message
      });
    }
  }

  /**
   * GET /api/workflow-templates/:id
   * Get a specific workflow template
   */
  async getWorkflowTemplate(req, res) {
    try {
      const { id } = req.params;

      const template = await AppealTrackingService.getWorkflowTemplate(parseInt(id));

      if (!template) {
        return res.status(404).json({
          success: false,
          error: 'Workflow template not found'
        });
      }

      res.json({
        success: true,
        template
      });
    } catch (error) {
      logger.error('Error getting workflow template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve workflow template',
        message: error.message
      });
    }
  }

  /**
   * POST /api/workflow-templates
   * Create a new workflow template
   */
  async createWorkflowTemplate(req, res) {
    try {
      const {
        workflowName,
        workflowDescription,
        appealLevel,
        payerType,
        denialCategory,
        steps,
        estimatedDurationDays
      } = req.body;
      const userId = req.user.id;

      if (!workflowName || !steps || !Array.isArray(steps)) {
        return res.status(400).json({
          success: false,
          error: 'workflowName and steps array are required'
        });
      }

      const templateData = {
        workflowName,
        workflowDescription,
        appealLevel,
        payerType,
        denialCategory,
        steps,
        estimatedDurationDays: estimatedDurationDays ? parseInt(estimatedDurationDays) : null
      };

      const template = await AppealTrackingService.createWorkflowTemplate(templateData, userId);

      res.status(201).json({
        success: true,
        message: 'Workflow template created successfully',
        template
      });
    } catch (error) {
      logger.error('Error creating workflow template:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create workflow template',
        message: error.message
      });
    }
  }

  /**
   * POST /api/workflow-templates/defaults
   * Create default workflow templates
   */
  async createDefaultWorkflowTemplates(req, res) {
    try {
      const userId = req.user.id;

      const templates = await AppealTrackingService.createDefaultWorkflowTemplates(userId);

      res.status(201).json({
        success: true,
        message: 'Default workflow templates created',
        count: templates.length,
        templates
      });
    } catch (error) {
      logger.error('Error creating default workflows:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create default workflow templates',
        message: error.message
      });
    }
  }

  /**
   * POST /api/appeals/:id/workflow/initialize
   * Initialize workflow for an appeal
   */
  async initializeWorkflow(req, res) {
    try {
      const { id } = req.params;
      const { workflowTemplateId } = req.body;
      const userId = req.user.id;

      if (!workflowTemplateId) {
        return res.status(400).json({
          success: false,
          error: 'workflowTemplateId is required'
        });
      }

      const instance = await AppealTrackingService.initializeWorkflow(
        parseInt(id),
        parseInt(workflowTemplateId),
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Workflow initialized successfully',
        workflow: instance
      });
    } catch (error) {
      logger.error('Error initializing workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to initialize workflow',
        message: error.message
      });
    }
  }

  /**
   * GET /api/appeals/:id/workflow
   * Get workflow instance for an appeal
   */
  async getWorkflowInstance(req, res) {
    try {
      const { id } = req.params;

      const instance = await AppealTrackingService.getWorkflowInstance(parseInt(id));

      if (!instance) {
        return res.status(404).json({
          success: false,
          error: 'No workflow found for this appeal'
        });
      }

      res.json({
        success: true,
        workflow: instance
      });
    } catch (error) {
      logger.error('Error getting workflow instance:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve workflow',
        message: error.message
      });
    }
  }

  /**
   * POST /api/workflows/:id/advance
   * Advance workflow to next step
   */
  async advanceWorkflowStep(req, res) {
    try {
      const { id } = req.params;
      const { notes, actionsCompleted, documentsAttached } = req.body;
      const userId = req.user.id;

      const completionData = {
        notes,
        actionsCompleted: actionsCompleted || [],
        documentsAttached: documentsAttached || []
      };

      const result = await AppealTrackingService.advanceWorkflowStep(
        parseInt(id),
        completionData,
        userId
      );

      res.json({
        success: true,
        message: result.isComplete ? 'Workflow completed' : 'Step completed, moved to next step',
        isComplete: result.isComplete,
        nextStep: result.nextStep
      });
    } catch (error) {
      logger.error('Error advancing workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to advance workflow',
        message: error.message
      });
    }
  }

  /**
   * POST /api/workflows/:id/pause
   * Pause a workflow
   */
  async pauseWorkflow(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      const userId = req.user.id;

      await AppealTrackingService.pauseWorkflow(parseInt(id), reason, userId);

      res.json({
        success: true,
        message: 'Workflow paused'
      });
    } catch (error) {
      logger.error('Error pausing workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to pause workflow',
        message: error.message
      });
    }
  }

  /**
   * POST /api/workflows/:id/resume
   * Resume a paused workflow
   */
  async resumeWorkflow(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await AppealTrackingService.resumeWorkflow(parseInt(id), userId);

      res.json({
        success: true,
        message: 'Workflow resumed'
      });
    } catch (error) {
      logger.error('Error resuming workflow:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to resume workflow',
        message: error.message
      });
    }
  }

  // ============================================
  // STATUS TRACKING ENDPOINTS
  // ============================================

  /**
   * GET /api/appeals/:id/status-history
   * Get status history for an appeal
   */
  async getAppealStatusHistory(req, res) {
    try {
      const { id } = req.params;

      const history = await AppealTrackingService.getAppealStatusHistory(parseInt(id));

      res.json({
        success: true,
        count: history.length,
        history
      });
    } catch (error) {
      logger.error('Error getting status history:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve status history',
        message: error.message
      });
    }
  }

  /**
   * GET /api/appeals/:id/details
   * Get comprehensive appeal details
   */
  async getAppealDetails(req, res) {
    try {
      const { id } = req.params;

      const details = await AppealTrackingService.getAppealDetails(parseInt(id));

      if (!details) {
        return res.status(404).json({
          success: false,
          error: 'Appeal not found'
        });
      }

      res.json({
        success: true,
        ...details
      });
    } catch (error) {
      logger.error('Error getting appeal details:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve appeal details',
        message: error.message
      });
    }
  }

  // ============================================
  // DATA EXPORT ENDPOINTS
  // ============================================

  /**
   * GET /api/denials/export/csv
   * Export denials to CSV format
   */
  async exportDenialsToCSV(req, res) {
    try {
      const {
        startDate,
        endDate,
        payerId,
        status,
        priorityLevel
      } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        payerId: payerId ? parseInt(payerId) : null,
        status,
        priorityLevel
      };

      const csvData = await DenialManagementService.exportDenialsToCSV(filters);

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="denials-export-${new Date().toISOString().split('T')[0]}.csv"`);

      res.send(csvData);
    } catch (error) {
      logger.error('Error exporting denials to CSV:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export denials to CSV',
        message: error.message
      });
    }
  }

  /**
   * GET /api/appeals/export/csv
   * Export appeals to CSV format
   */
  async exportAppealsToCSV(req, res) {
    try {
      const {
        startDate,
        endDate,
        status,
        appealLevel
      } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        status,
        appealLevel
      };

      const csvData = await AppealTrackingService.exportAppealsToCSV(filters);

      res.header('Content-Type', 'text/csv');
      res.header('Content-Disposition', `attachment; filename="appeals-export-${new Date().toISOString().split('T')[0]}.csv"`);

      res.send(csvData);
    } catch (error) {
      logger.error('Error exporting appeals to CSV:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export appeals to CSV',
        message: error.message
      });
    }
  }

  /**
   * GET /api/denials/export/pdf
   * Export denial report to PDF format
   */
  async exportDenialsToPDF(req, res) {
    try {
      const {
        startDate,
        endDate,
        payerId,
        reportType = 'summary' // 'summary' or 'detailed'
      } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        payerId: payerId ? parseInt(payerId) : null,
        reportType
      };

      const pdfBuffer = await DenialManagementService.exportDenialsToPDF(filters);

      res.header('Content-Type', 'application/pdf');
      res.header('Content-Disposition', `attachment; filename="denials-report-${new Date().toISOString().split('T')[0]}.pdf"`);

      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error exporting denials to PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export denials to PDF',
        message: error.message
      });
    }
  }

  /**
   * GET /api/appeals/export/pdf
   * Export appeals report to PDF format
   */
  async exportAppealsToPDF(req, res) {
    try {
      const {
        startDate,
        endDate,
        reportType = 'summary'
      } = req.query;

      const filters = {
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        reportType
      };

      const pdfBuffer = await AppealTrackingService.exportAppealsToPDF(filters);

      res.header('Content-Type', 'application/pdf');
      res.header('Content-Disposition', `attachment; filename="appeals-report-${new Date().toISOString().split('T')[0]}.pdf"`);

      res.send(pdfBuffer);
    } catch (error) {
      logger.error('Error exporting appeals to PDF:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to export appeals to PDF',
        message: error.message
      });
    }
  }

  // ============================================
  // DUPLICATE HANDLING ENDPOINTS
  // ============================================

  /**
   * GET /api/denials/duplicates
   * Find potential duplicate denials
   */
  async findDuplicateDenials(req, res) {
    try {
      const { claimId, patientId, dateRange = 30 } = req.query;

      const filters = {
        claimId: claimId ? parseInt(claimId) : null,
        patientId: patientId ? parseInt(patientId) : null,
        dateRange: parseInt(dateRange)
      };

      const duplicates = await DenialManagementService.findDuplicateDenials(filters);

      res.json({
        success: true,
        count: duplicates.length,
        duplicates
      });
    } catch (error) {
      logger.error('Error finding duplicate denials:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to find duplicate denials',
        message: error.message
      });
    }
  }

  /**
   * POST /api/denials/:id/mark-duplicate
   * Mark a denial as a duplicate of another
   */
  async markAsDuplicate(req, res) {
    try {
      const { id } = req.params;
      const { originalDenialId, reason } = req.body;
      const userId = req.user.id;

      if (!originalDenialId) {
        return res.status(400).json({
          success: false,
          error: 'originalDenialId is required'
        });
      }

      await DenialManagementService.markAsDuplicate(
        parseInt(id),
        parseInt(originalDenialId),
        reason,
        userId
      );

      res.json({
        success: true,
        message: 'Denial marked as duplicate'
      });
    } catch (error) {
      logger.error('Error marking denial as duplicate:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark denial as duplicate',
        message: error.message
      });
    }
  }

  // ============================================
  // EXPIRED DEADLINE HANDLING
  // ============================================

  /**
   * GET /api/denials/expired-deadlines
   * Get denials with expired appeal deadlines
   */
  async getExpiredDeadlines(req, res) {
    try {
      const { limit = 50, includeResolved = false } = req.query;

      const filters = {
        limit: parseInt(limit),
        includeResolved: includeResolved === 'true'
      };

      const expired = await DenialManagementService.getExpiredDeadlines(filters);

      res.json({
        success: true,
        count: expired.length,
        denials: expired
      });
    } catch (error) {
      logger.error('Error getting expired deadlines:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve expired deadlines',
        message: error.message
      });
    }
  }

  /**
   * POST /api/denials/:id/extend-deadline
   * Request deadline extension for a denial
   */
  async requestDeadlineExtension(req, res) {
    try {
      const { id } = req.params;
      const { newDeadline, extensionReason, supportingDocumentation } = req.body;
      const userId = req.user.id;

      if (!newDeadline || !extensionReason) {
        return res.status(400).json({
          success: false,
          error: 'newDeadline and extensionReason are required'
        });
      }

      const result = await DenialManagementService.requestDeadlineExtension(
        parseInt(id),
        new Date(newDeadline),
        extensionReason,
        supportingDocumentation,
        userId
      );

      res.json({
        success: true,
        message: 'Deadline extension requested',
        ...result
      });
    } catch (error) {
      logger.error('Error requesting deadline extension:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to request deadline extension',
        message: error.message
      });
    }
  }

  // ============================================
  // BULK OPERATIONS
  // ============================================

  /**
   * POST /api/denials/bulk-assign
   * Bulk assign denials to a user
   */
  async bulkAssignDenials(req, res) {
    try {
      const { denialIds, assignedToId } = req.body;
      const userId = req.user.id;

      if (!denialIds || !Array.isArray(denialIds) || denialIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'denialIds array is required'
        });
      }

      if (!assignedToId) {
        return res.status(400).json({
          success: false,
          error: 'assignedToId is required'
        });
      }

      const result = await DenialManagementService.bulkAssignDenials(
        denialIds.map(id => parseInt(id)),
        assignedToId,
        userId
      );

      res.json({
        success: true,
        message: `${result.assigned} denials assigned successfully`,
        ...result
      });
    } catch (error) {
      logger.error('Error bulk assigning denials:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk assign denials',
        message: error.message
      });
    }
  }

  /**
   * POST /api/denials/bulk-resolve
   * Bulk resolve denials without appeal
   */
  async bulkResolveDenials(req, res) {
    try {
      const { denialIds, resolutionType, notes } = req.body;
      const userId = req.user.id;

      if (!denialIds || !Array.isArray(denialIds) || denialIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'denialIds array is required'
        });
      }

      if (!resolutionType) {
        return res.status(400).json({
          success: false,
          error: 'resolutionType is required'
        });
      }

      const result = await DenialManagementService.bulkResolveDenials(
        denialIds.map(id => parseInt(id)),
        resolutionType,
        notes,
        userId
      );

      res.json({
        success: true,
        message: `${result.resolved} denials resolved successfully`,
        ...result
      });
    } catch (error) {
      logger.error('Error bulk resolving denials:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to bulk resolve denials',
        message: error.message
      });
    }
  }

  // ============================================
  // PARTIAL APPROVAL HANDLING
  // ============================================

  /**
   * POST /api/appeals/:id/partial-approval
   * Record a partial approval decision
   */
  async recordPartialApproval(req, res) {
    try {
      const { id } = req.params;
      const {
        approvedAmount,
        deniedAmount,
        approvedItems,
        deniedItems,
        decisionReason,
        willAppealRemainder
      } = req.body;
      const userId = req.user.id;

      if (approvedAmount === undefined || deniedAmount === undefined) {
        return res.status(400).json({
          success: false,
          error: 'approvedAmount and deniedAmount are required'
        });
      }

      const result = await AppealTrackingService.recordPartialApproval(
        parseInt(id),
        {
          approvedAmount: parseInt(approvedAmount),
          deniedAmount: parseInt(deniedAmount),
          approvedItems,
          deniedItems,
          decisionReason,
          willAppealRemainder
        },
        userId
      );

      res.json({
        success: true,
        message: 'Partial approval recorded successfully',
        ...result
      });
    } catch (error) {
      logger.error('Error recording partial approval:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to record partial approval',
        message: error.message
      });
    }
  }

  // ============================================
  // MULTI-CLAIM APPEALS
  // ============================================

  /**
   * POST /api/appeals/multi-claim
   * Create an appeal spanning multiple claims
   */
  async createMultiClaimAppeal(req, res) {
    try {
      const {
        denialIds,
        appealLevel,
        appealBasis,
        medicalNecessityRationale,
        policyReference
      } = req.body;
      const userId = req.user.id;

      if (!denialIds || !Array.isArray(denialIds) || denialIds.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'denialIds array is required'
        });
      }

      if (!appealLevel || !appealBasis) {
        return res.status(400).json({
          success: false,
          error: 'appealLevel and appealBasis are required'
        });
      }

      const appeal = await AppealTrackingService.createMultiClaimAppeal(
        denialIds.map(id => parseInt(id)),
        {
          appealLevel,
          appealBasis,
          medicalNecessityRationale,
          policyReference
        },
        userId
      );

      res.status(201).json({
        success: true,
        message: 'Multi-claim appeal created successfully',
        appeal
      });
    } catch (error) {
      logger.error('Error creating multi-claim appeal:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to create multi-claim appeal',
        message: error.message
      });
    }
  }

  /**
   * GET /api/appeals/:id/related-claims
   * Get all claims related to a multi-claim appeal
   */
  async getRelatedClaims(req, res) {
    try {
      const { id } = req.params;

      const claims = await AppealTrackingService.getRelatedClaims(parseInt(id));

      res.json({
        success: true,
        count: claims.length,
        claims
      });
    } catch (error) {
      logger.error('Error getting related claims:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve related claims',
        message: error.message
      });
    }
  }

  // ============================================
  // AUDIT LOGGING
  // ============================================

  /**
   * GET /api/denials/:id/audit-log
   * Get audit log for a denial
   */
  async getDenialAuditLog(req, res) {
    try {
      const { id } = req.params;
      const { limit = 100 } = req.query;

      const auditLog = await DenialManagementService.getDenialAuditLog(
        parseInt(id),
        parseInt(limit)
      );

      res.json({
        success: true,
        count: auditLog.length,
        auditLog
      });
    } catch (error) {
      logger.error('Error getting denial audit log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve denial audit log',
        message: error.message
      });
    }
  }

  /**
   * GET /api/appeals/:id/audit-log
   * Get audit log for an appeal
   */
  async getAppealAuditLog(req, res) {
    try {
      const { id } = req.params;
      const { limit = 100 } = req.query;

      const auditLog = await AppealTrackingService.getAppealAuditLog(
        parseInt(id),
        parseInt(limit)
      );

      res.json({
        success: true,
        count: auditLog.length,
        auditLog
      });
    } catch (error) {
      logger.error('Error getting appeal audit log:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve appeal audit log',
        message: error.message
      });
    }
  }
}

export default new DenialManagementController();
