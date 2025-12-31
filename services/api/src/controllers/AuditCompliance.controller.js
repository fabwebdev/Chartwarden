/**
 * Audit Compliance Controller
 *
 * HIPAA-compliant audit reporting endpoints for compliance officers
 * and administrators.
 */

import AuditService from '../services/AuditService.js';
import { generateRetentionReport, checkRetentionCompliance } from '../jobs/auditRetention.job.js';
import { logger } from '../utils/logger.js';
import { AuditActions } from '../constants/auditActions.js';

/**
 * Get compliance report for a date range
 * GET /api/audit/compliance/report
 */
export const getComplianceReport = async (request, reply) => {
  try {
    const { startDate, endDate } = request.query;

    if (!startDate || !endDate) {
      reply.code(400);
      return {
        success: false,
        status: 400,
        message: 'startDate and endDate query parameters are required',
      };
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    if (isNaN(start.getTime()) || isNaN(end.getTime())) {
      reply.code(400);
      return {
        success: false,
        status: 400,
        message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
      };
    }

    if (start > end) {
      reply.code(400);
      return {
        success: false,
        status: 400,
        message: 'startDate must be before endDate',
      };
    }

    const report = await AuditService.getComplianceReport(start, end);

    // Log this access
    await AuditService.createAuditLog({
      user_id: request.user?.id,
      action: AuditActions.COMPLIANCE_AUDIT_EXPORT,
      resource_type: 'audit_logs',
      resource_id: null,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
      status: 'success',
      metadata: JSON.stringify({ startDate, endDate }),
    }, {}, { immediate: true });

    return {
      success: true,
      status: 200,
      data: report,
    };
  } catch (error) {
    logger.error('Get compliance report error:', error);
    reply.code(500);
    return {
      success: false,
      status: 500,
      message: 'Server error while generating compliance report',
    };
  }
};

/**
 * Get user activity report
 * GET /api/audit/compliance/user/:userId
 */
export const getUserActivityReport = async (request, reply) => {
  try {
    const { userId } = request.params;
    const { startDate, endDate } = request.query;

    let start = null;
    let end = null;

    if (startDate && endDate) {
      start = new Date(startDate);
      end = new Date(endDate);

      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          message: 'Invalid date format. Use ISO 8601 format (YYYY-MM-DD)',
        };
      }
    }

    const report = await AuditService.getUserActivityReport(userId, start, end);

    // Log this access
    await AuditService.createAuditLog({
      user_id: request.user?.id,
      action: AuditActions.COMPLIANCE_HIPAA_REVIEW,
      resource_type: 'users',
      resource_id: userId,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
      status: 'success',
    }, {}, { immediate: true });

    return {
      success: true,
      status: 200,
      data: report,
    };
  } catch (error) {
    logger.error('Get user activity report error:', error);
    reply.code(500);
    return {
      success: false,
      status: 500,
      message: 'Server error while generating user activity report',
    };
  }
};

/**
 * Get resource access history
 * GET /api/audit/compliance/resource/:resourceType/:resourceId
 */
export const getResourceAccessHistory = async (request, reply) => {
  try {
    const { resourceType, resourceId } = request.params;

    const history = await AuditService.getResourceAccessHistory(resourceType, resourceId);

    // Log this access
    await AuditService.createAuditLog({
      user_id: request.user?.id,
      action: AuditActions.COMPLIANCE_HIPAA_REVIEW,
      resource_type: resourceType,
      resource_id: resourceId,
      ip_address: request.ip,
      user_agent: request.headers['user-agent'],
      status: 'success',
    }, {}, { immediate: true });

    return {
      success: true,
      status: 200,
      data: history,
    };
  } catch (error) {
    logger.error('Get resource access history error:', error);
    reply.code(500);
    return {
      success: false,
      status: 500,
      message: 'Server error while fetching resource access history',
    };
  }
};

/**
 * Get retention compliance status
 * GET /api/audit/compliance/retention
 */
export const getRetentionStatus = async (request, reply) => {
  try {
    const [report, compliance] = await Promise.all([
      generateRetentionReport(),
      checkRetentionCompliance(),
    ]);

    return {
      success: true,
      status: 200,
      data: {
        report,
        compliance,
      },
    };
  } catch (error) {
    logger.error('Get retention status error:', error);
    reply.code(500);
    return {
      success: false,
      status: 500,
      message: 'Server error while checking retention status',
    };
  }
};

/**
 * Get audit service statistics
 * GET /api/audit/compliance/stats
 */
export const getAuditStats = async (request, reply) => {
  try {
    const stats = AuditService.getStats();

    return {
      success: true,
      status: 200,
      data: stats,
    };
  } catch (error) {
    logger.error('Get audit stats error:', error);
    reply.code(500);
    return {
      success: false,
      status: 500,
      message: 'Server error while fetching audit statistics',
    };
  }
};

/**
 * Get archival candidates
 * GET /api/audit/compliance/archival
 */
export const getArchivalCandidates = async (request, reply) => {
  try {
    const { retentionYears = 6 } = request.query;
    const years = parseInt(retentionYears, 10);

    if (isNaN(years) || years < 1 || years > 20) {
      reply.code(400);
      return {
        success: false,
        status: 400,
        message: 'retentionYears must be between 1 and 20',
      };
    }

    const candidates = await AuditService.getArchivalCandidates(years);

    return {
      success: true,
      status: 200,
      data: candidates,
    };
  } catch (error) {
    logger.error('Get archival candidates error:', error);
    reply.code(500);
    return {
      success: false,
      status: 500,
      message: 'Server error while checking archival candidates',
    };
  }
};

export default {
  getComplianceReport,
  getUserActivityReport,
  getResourceAccessHistory,
  getRetentionStatus,
  getAuditStats,
  getArchivalCandidates,
};
