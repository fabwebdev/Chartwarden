import { getAuditLogs, getUserAuditLogs, getAuditLogById } from '../controllers/Audit.controller.js';
import {
  getComplianceReport,
  getUserActivityReport,
  getResourceAccessHistory,
  getRetentionStatus,
  getAuditStats,
  getArchivalCandidates,
} from '../controllers/AuditCompliance.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { requireRole } from '../middleware/rbac.middleware.js';
import { ROLES } from '../config/rbac.js';

// Fastify plugin for audit routes
async function auditRoutes(fastify, options) {
  // =====================
  // Compliance Endpoints (Admin only)
  // =====================

  // Get compliance report for date range
  // GET /api/audit/compliance/report?startDate=2024-01-01&endDate=2024-12-31
  fastify.get('/compliance/report', {
    preHandler: [authenticate, requireRole(ROLES.ADMIN)],
  }, getComplianceReport);

  // Get user activity report
  // GET /api/audit/compliance/user/:userId?startDate=2024-01-01&endDate=2024-12-31
  fastify.get('/compliance/user/:userId', {
    preHandler: [authenticate, requireRole(ROLES.ADMIN)],
  }, getUserActivityReport);

  // Get resource access history
  // GET /api/audit/compliance/resource/:resourceType/:resourceId
  fastify.get('/compliance/resource/:resourceType/:resourceId', {
    preHandler: [authenticate, requireRole(ROLES.ADMIN)],
  }, getResourceAccessHistory);

  // Get retention compliance status
  // GET /api/audit/compliance/retention
  fastify.get('/compliance/retention', {
    preHandler: [authenticate, requireRole(ROLES.ADMIN)],
  }, getRetentionStatus);

  // Get audit service statistics
  // GET /api/audit/compliance/stats
  fastify.get('/compliance/stats', {
    preHandler: [authenticate, requireRole(ROLES.ADMIN)],
  }, getAuditStats);

  // Get archival candidates
  // GET /api/audit/compliance/archival?retentionYears=6
  fastify.get('/compliance/archival', {
    preHandler: [authenticate, requireRole(ROLES.ADMIN)],
  }, getArchivalCandidates);

  // =====================
  // Basic Audit Log Endpoints
  // =====================

  // Admin routes for audit logs
  fastify.get('/', {
    preHandler: [authenticate, requireRole(ROLES.ADMIN)],
  }, getAuditLogs);

  fastify.get('/:id', {
    preHandler: [authenticate, requireRole(ROLES.ADMIN)],
  }, getAuditLogById);

  // User route to get their own audit logs
  fastify.get('/user/logs', {
    preHandler: [authenticate],
  }, getUserAuditLogs);
}

export default auditRoutes;
