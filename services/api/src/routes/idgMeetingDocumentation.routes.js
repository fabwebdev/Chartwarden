import controller from '../controllers/IDGMeetingDocumentation.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * IDG Meeting Documentation Routes
 *
 * CMS 14-Day Compliance Enforcement for IDG Meeting Documentation
 * Per 42 CFR §418.56, documentation must be completed within 14 calendar days
 *
 * Endpoints:
 * - POST   /idg-meetings/documentation              - Create new documentation
 * - GET    /idg-meetings/documentation/:id          - Get specific documentation
 * - PUT    /idg-meetings/documentation/:id          - Update documentation (draft save)
 * - DELETE /idg-meetings/documentation/:id          - Delete documentation (soft delete)
 * - POST   /idg-meetings/documentation/:id/submit   - Submit documentation (final submission with deadline enforcement)
 * - POST   /idg-meetings/documentation/:id/override - Request late submission override (supervisor only)
 * - GET    /idg-meetings/documentation/pending      - List pending documentation with deadline status
 * - GET    /idg-meetings/documentation/compliance-report - Generate compliance metrics report
 * - GET    /idg-meetings/documentation/:id/audit-trail - Get documentation audit trail
 */
export default async function idgMeetingDocumentationRoutes(fastify, options) {

  // ============================================================================
  // CORE CRUD ENDPOINTS
  // ============================================================================

  /**
   * Create new IDG meeting documentation
   * POST /idg-meetings/documentation
   *
   * Required body:
   * - idg_meeting_id: number (required)
   * - documentation_content: string (optional, can be added later)
   * - meeting_summary: string (optional)
   * - documentation_owner_id: string (optional, defaults to current user)
   *
   * Validation:
   * - Meeting must exist
   * - Meeting date cannot be in the future
   * - Cannot create duplicate documentation for the same meeting
   * - If already past 14-day deadline, documentation is flagged for override
   */
  fastify.post('/idg-meetings/documentation', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createDocumentation.bind(controller));

  /**
   * Get documentation by ID
   * GET /idg-meetings/documentation/:id
   *
   * Returns documentation with real-time deadline countdown
   */
  fastify.get('/idg-meetings/documentation/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getDocumentation.bind(controller));

  /**
   * Update documentation (draft save)
   * PUT /idg-meetings/documentation/:id
   *
   * Notes:
   * - Draft saves are allowed at any time (no deadline enforcement)
   * - Cannot modify meeting_date after creation
   * - Cannot update finalized (submitted/approved) documentation
   * - Each update increments draft_version
   */
  fastify.put('/idg-meetings/documentation/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateDocumentation.bind(controller));

  /**
   * Delete documentation (soft delete with audit trail)
   * DELETE /idg-meetings/documentation/:id
   *
   * Required body:
   * - deletion_reason: string (minimum 20 characters)
   *
   * Notes:
   * - Requires administrator role
   * - Creates immutable audit trail entry
   * - Cancels pending compliance alerts
   */
  fastify.delete('/idg-meetings/documentation/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.deleteDocumentation.bind(controller));

  // ============================================================================
  // SUBMISSION & OVERRIDE ENDPOINTS
  // ============================================================================

  /**
   * Submit documentation (final submission with 14-day deadline enforcement)
   * POST /idg-meetings/documentation/:id/submit
   *
   * IMPORTANT: This endpoint enforces the CMS 14-day deadline per 42 CFR §418.56
   *
   * Behavior:
   * - If within deadline: Accepts submission, marks as SUBMITTED
   * - If past deadline without override: Returns HTTP 422 with CMS regulation reference
   * - If past deadline with override: Accepts submission, marks as OVERRIDDEN
   *
   * Validation:
   * - Required fields must be complete
   * - Cannot resubmit already submitted documentation
   */
  fastify.post('/idg-meetings/documentation/:id/submit', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.submitDocumentation.bind(controller));

  /**
   * Request late submission override
   * POST /idg-meetings/documentation/:id/override
   *
   * Required body:
   * - justification: string (minimum 50 characters)
   *
   * Authorization:
   * - Requires supervisor, administrator, director, or compliance_officer role
   *
   * Effects:
   * - Grants override for this documentation
   * - Flags documentation in compliance reports
   * - Creates audit trail entry
   * - Notifies compliance team (when notification service available)
   */
  fastify.post('/idg-meetings/documentation/:id/override', {
    preHandler: [requireAnyPermission(PERMISSIONS.MANAGE_SETTINGS)] // Admin-level permission
  }, controller.requestOverride.bind(controller));

  // ============================================================================
  // PENDING & COMPLIANCE ENDPOINTS
  // ============================================================================

  /**
   * Get all pending documentation with deadline status
   * GET /idg-meetings/documentation/pending
   *
   * Query params:
   * - limit: number (default 50)
   * - offset: number (default 0)
   * - include_overdue: boolean (default true)
   *
   * Returns:
   * - List of pending documentation with real-time deadline countdown
   * - Summary counts by urgency category
   * - Categorized lists (overdue, due_today, due_tomorrow, etc.)
   */
  fastify.get('/idg-meetings/documentation/pending', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getPendingDocumentation.bind(controller));

  /**
   * Generate compliance report
   * GET /idg-meetings/documentation/compliance-report
   *
   * Query params:
   * - month: number (1-12)
   * - year: number (e.g., 2024)
   * OR
   * - start_date: ISO date string
   * - end_date: ISO date string
   *
   * Returns comprehensive compliance metrics:
   * - Total meetings and documentation coverage
   * - On-time vs late submission rates
   * - Override statistics and reasons
   * - Average completion times
   * - Meetings without documentation
   * - CMS regulation reference (42 CFR §418.56)
   */
  fastify.get('/idg-meetings/documentation/compliance-report', {
    preHandler: [requireAnyPermission(PERMISSIONS.GENERATE_REPORTS)]
  }, controller.getComplianceReport.bind(controller));

  /**
   * Get documentation audit trail
   * GET /idg-meetings/documentation/:id/audit-trail
   *
   * Query params:
   * - limit: number (default 100)
   * - offset: number (default 0)
   *
   * Returns immutable audit log entries for the documentation including:
   * - All status transitions
   * - User actions (create, update, submit, override)
   * - IP addresses and user agents
   * - Deadline status at time of each action
   */
  fastify.get('/idg-meetings/documentation/:id/audit-trail', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_AUDIT_LOGS)]
  }, controller.getAuditTrail.bind(controller));
}
