import DenialManagementService from '../services/DenialManagement.service.js';
import AppealTrackingService from '../services/AppealTracking.service.js';

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
}

export default new DenialManagementController();
