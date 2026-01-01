import { db } from '../config/db.drizzle.js';
import {
  idg_meeting_documentation,
  idg_documentation_audit,
  idg_compliance_alerts,
  idg_compliance_reports
} from '../db/schemas/idgMeetingDocumentation.schema.js';
import { idg_meetings } from '../db/schemas/idgMeetings.schema.js';
import { eq, and, desc, asc, lte, gte, isNull, sql, count, or, ne } from 'drizzle-orm';
import AuditService from '../services/AuditService.js';
import { AuditActions } from '../constants/auditActions.js';
import { logger } from '../utils/logger.js';

/**
 * IDG Meeting Documentation Controller
 *
 * Manages Interdisciplinary Group meeting documentation lifecycle with
 * CMS 14-day compliance enforcement per 42 CFR §418.56
 *
 * Key Features:
 * - 14-day deadline calculation and enforcement
 * - Draft saves at any time, deadline enforced on final submission
 * - Override mechanism for late submissions (supervisor approval required)
 * - Comprehensive audit trail
 * - Compliance reporting
 */
class IDGMeetingDocumentationController {

  // ============================================================================
  // CONSTANTS
  // ============================================================================

  static CMS_REGULATION = '42 CFR §418.56';
  static DEADLINE_DAYS = 14;
  static MIN_OVERRIDE_JUSTIFICATION_LENGTH = 50;
  static NOTIFICATION_INTERVALS = [10, 7, 3, 1, 0]; // Days before deadline
  static ESCALATION_THRESHOLD_DAYS = 2; // Escalate to supervisor when 2 days remaining

  // ============================================================================
  // CORE CRUD ENDPOINTS
  // ============================================================================

  /**
   * Create new meeting documentation
   * POST /idg-meetings/documentation
   */
  async createDocumentation(request, reply) {
    try {
      const data = request.body;
      const userId = request.user?.id;
      const userName = `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim();

      // Validate meeting exists
      const meeting = await db
        .select()
        .from(idg_meetings)
        .where(eq(idg_meetings.id, parseInt(data.idg_meeting_id)))
        .limit(1);

      if (!meeting[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'IDG meeting not found'
        };
      }

      // Validate meeting date is not in the future
      const meetingDate = new Date(meeting[0].meeting_date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (meetingDate > today) {
        reply.code(422);
        return {
          status: 422,
          message: 'Cannot create documentation for a future meeting. Documentation can only be created after the meeting has occurred.',
          code: 'FUTURE_MEETING_DATE'
        };
      }

      // Check for duplicate documentation
      const existingDoc = await db
        .select({ id: idg_meeting_documentation.id })
        .from(idg_meeting_documentation)
        .where(and(
          eq(idg_meeting_documentation.idg_meeting_id, parseInt(data.idg_meeting_id)),
          isNull(idg_meeting_documentation.deleted_at)
        ))
        .limit(1);

      if (existingDoc[0]) {
        reply.code(409);
        return {
          status: 409,
          message: 'Documentation already exists for this meeting',
          code: 'DUPLICATE_DOCUMENTATION',
          existing_documentation_id: existingDoc[0].id
        };
      }

      // Calculate 14-day deadline (23:59:59 on the 14th day)
      const deadline = this.calculateDeadline(meetingDate);
      const { daysRemaining, hoursRemaining, isOverdue, daysOverdue } = this.calculateTimeRemaining(deadline);

      // Flag if already overdue at creation (backdated entry)
      const isLateAtCreation = isOverdue;

      const result = await db
        .insert(idg_meeting_documentation)
        .values({
          idg_meeting_id: parseInt(data.idg_meeting_id),
          meeting_date: meeting[0].meeting_date,
          meeting_time: meeting[0].meeting_time,
          documentation_deadline: deadline,
          days_remaining: daysRemaining,
          hours_remaining: hoursRemaining,
          is_overdue: isOverdue,
          days_overdue: daysOverdue,
          documentation_status: isLateAtCreation ? 'OVERDUE' : 'DRAFT',
          is_late_submission: isLateAtCreation,
          override_required: isLateAtCreation,
          flagged_in_compliance_report: isLateAtCreation,
          compliance_flag_reason: isLateAtCreation
            ? `Documentation created ${daysOverdue} days after the 14-day deadline (${IDGMeetingDocumentationController.CMS_REGULATION})`
            : null,
          documentation_owner_id: data.documentation_owner_id || userId,
          documentation_owner_name: data.documentation_owner_name || userName,
          documentation_content: data.documentation_content,
          meeting_summary: data.meeting_summary,
          key_decisions: data.key_decisions,
          action_items_summary: data.action_items_summary,
          created_by_id: userId,
          updated_by_id: userId
        })
        .returning();

      const doc = result[0];

      // Create audit entry
      await this.createAuditEntry({
        documentation_id: doc.id,
        idg_meeting_id: doc.idg_meeting_id,
        action: 'CREATE',
        action_description: isLateAtCreation
          ? `Documentation created after 14-day deadline (${daysOverdue} days overdue)`
          : 'Documentation created',
        new_status: doc.documentation_status,
        user_id: userId,
        user_name: userName,
        user_role: request.user?.role,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        deadline_at_action: deadline,
        days_remaining_at_action: daysRemaining,
        was_overdue_at_action: isOverdue,
        new_value: doc
      });

      // Schedule compliance alerts
      await this.scheduleComplianceAlerts(doc);

      // Log to audit service
      await AuditService.createAuditLog({
        user_id: userId,
        action: AuditActions.CLINICAL_NOTE_CREATE,
        resource_type: 'idg_meeting_documentation',
        resource_id: doc.id.toString(),
        status: 'success',
        metadata: JSON.stringify({
          meeting_id: doc.idg_meeting_id,
          deadline: deadline.toISOString(),
          is_late_at_creation: isLateAtCreation
        })
      }, { ip_address: request.ip, user_agent: request.headers['user-agent'] });

      reply.code(201);
      return {
        status: 201,
        message: isLateAtCreation
          ? `Documentation created, but is already past the 14-day deadline. Override required for submission.`
          : 'Documentation created successfully',
        data: {
          ...doc,
          deadline_info: {
            deadline: deadline.toISOString(),
            days_remaining: daysRemaining,
            hours_remaining: hoursRemaining,
            is_overdue: isOverdue,
            days_overdue: daysOverdue,
            override_required: isLateAtCreation
          }
        }
      };
    } catch (error) {
      logger.error('Error creating IDG documentation:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating documentation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get documentation by ID
   * GET /idg-meetings/documentation/:id
   */
  async getDocumentation(request, reply) {
    try {
      const { id } = request.params;

      const doc = await db
        .select()
        .from(idg_meeting_documentation)
        .where(and(
          eq(idg_meeting_documentation.id, parseInt(id)),
          isNull(idg_meeting_documentation.deleted_at)
        ))
        .limit(1);

      if (!doc[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Documentation not found'
        };
      }

      // Recalculate time remaining (real-time)
      const { daysRemaining, hoursRemaining, isOverdue, daysOverdue } =
        this.calculateTimeRemaining(new Date(doc[0].documentation_deadline));

      const result = {
        ...doc[0],
        deadline_info: {
          deadline: doc[0].documentation_deadline,
          days_remaining: daysRemaining,
          hours_remaining: hoursRemaining,
          is_overdue: isOverdue,
          days_overdue: daysOverdue,
          countdown_display: this.formatCountdown(daysRemaining, hoursRemaining)
        }
      };

      reply.code(200);
      return {
        status: 200,
        data: result
      };
    } catch (error) {
      logger.error('Error fetching IDG documentation:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching documentation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update documentation (draft save)
   * PUT /idg-meetings/documentation/:id
   */
  async updateDocumentation(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const userId = request.user?.id;
      const userName = `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim();

      // Fetch existing documentation
      const existing = await db
        .select()
        .from(idg_meeting_documentation)
        .where(and(
          eq(idg_meeting_documentation.id, parseInt(id)),
          isNull(idg_meeting_documentation.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Documentation not found'
        };
      }

      const doc = existing[0];

      // Check if documentation is already submitted/approved (cannot modify finalized docs)
      if (['SUBMITTED', 'APPROVED'].includes(doc.documentation_status)) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot modify finalized documentation. Use addendum endpoint for corrections.',
          code: 'DOCUMENTATION_FINALIZED'
        };
      }

      // Prevent modification of meeting_date after documentation is created
      if (data.meeting_date && data.meeting_date !== doc.meeting_date) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot modify meeting date after documentation has been created',
          code: 'MEETING_DATE_IMMUTABLE'
        };
      }

      // Track changed fields for audit
      const changedFields = [];
      const oldValue = { ...doc };

      Object.keys(data).forEach(key => {
        if (doc[key] !== data[key]) {
          changedFields.push(key);
        }
      });

      // Calculate current deadline status
      const { daysRemaining, hoursRemaining, isOverdue, daysOverdue } =
        this.calculateTimeRemaining(new Date(doc.documentation_deadline));

      // Update documentation
      const result = await db
        .update(idg_meeting_documentation)
        .set({
          ...data,
          days_remaining: daysRemaining,
          hours_remaining: hoursRemaining,
          is_overdue: isOverdue,
          days_overdue: daysOverdue,
          last_draft_save: new Date(),
          draft_version: doc.draft_version + 1,
          documentation_status: isOverdue && doc.documentation_status === 'DRAFT' ? 'OVERDUE' : doc.documentation_status,
          updated_by_id: userId,
          updatedAt: new Date()
        })
        .where(eq(idg_meeting_documentation.id, parseInt(id)))
        .returning();

      // Create audit entry
      await this.createAuditEntry({
        documentation_id: doc.id,
        idg_meeting_id: doc.idg_meeting_id,
        action: 'UPDATE',
        action_description: 'Documentation updated (draft save)',
        previous_status: doc.documentation_status,
        new_status: result[0].documentation_status,
        user_id: userId,
        user_name: userName,
        user_role: request.user?.role,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        deadline_at_action: doc.documentation_deadline,
        days_remaining_at_action: daysRemaining,
        was_overdue_at_action: isOverdue,
        old_value: oldValue,
        new_value: result[0],
        changed_fields: changedFields
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Documentation updated',
        data: {
          ...result[0],
          deadline_info: {
            days_remaining: daysRemaining,
            hours_remaining: hoursRemaining,
            is_overdue: isOverdue,
            days_overdue: daysOverdue,
            countdown_display: this.formatCountdown(daysRemaining, hoursRemaining)
          }
        }
      };
    } catch (error) {
      logger.error('Error updating IDG documentation:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating documentation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete documentation (soft delete with audit trail)
   * DELETE /idg-meetings/documentation/:id
   */
  async deleteDocumentation(request, reply) {
    try {
      const { id } = request.params;
      const { deletion_reason } = request.body;
      const userId = request.user?.id;
      const userName = `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim();

      // Fetch existing documentation
      const existing = await db
        .select()
        .from(idg_meeting_documentation)
        .where(and(
          eq(idg_meeting_documentation.id, parseInt(id)),
          isNull(idg_meeting_documentation.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Documentation not found'
        };
      }

      const doc = existing[0];

      // Require deletion reason
      if (!deletion_reason || deletion_reason.trim().length < 20) {
        reply.code(400);
        return {
          status: 400,
          message: 'Deletion reason is required (minimum 20 characters)',
          code: 'DELETION_REASON_REQUIRED'
        };
      }

      // Soft delete
      const result = await db
        .update(idg_meeting_documentation)
        .set({
          deleted_at: new Date(),
          deletion_reason: deletion_reason.trim(),
          deleted_by_id: userId,
          updated_by_id: userId,
          updatedAt: new Date()
        })
        .where(eq(idg_meeting_documentation.id, parseInt(id)))
        .returning();

      // Create audit entry
      await this.createAuditEntry({
        documentation_id: doc.id,
        idg_meeting_id: doc.idg_meeting_id,
        action: 'DELETE',
        action_description: `Documentation deleted. Reason: ${deletion_reason}`,
        previous_status: doc.documentation_status,
        new_status: 'DELETED',
        user_id: userId,
        user_name: userName,
        user_role: request.user?.role,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        old_value: doc
      });

      // Cancel pending alerts
      await db
        .update(idg_compliance_alerts)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(and(
          eq(idg_compliance_alerts.documentation_id, parseInt(id)),
          eq(idg_compliance_alerts.status, 'PENDING')
        ));

      reply.code(200);
      return {
        status: 200,
        message: 'Documentation deleted',
        data: { id: doc.id, deleted_at: result[0].deleted_at }
      };
    } catch (error) {
      logger.error('Error deleting IDG documentation:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting documentation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // FINAL SUBMISSION WITH 14-DAY ENFORCEMENT
  // ============================================================================

  /**
   * Submit documentation (final submission with deadline enforcement)
   * POST /idg-meetings/documentation/:id/submit
   */
  async submitDocumentation(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;
      const userName = `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim();

      // Fetch documentation
      const existing = await db
        .select()
        .from(idg_meeting_documentation)
        .where(and(
          eq(idg_meeting_documentation.id, parseInt(id)),
          isNull(idg_meeting_documentation.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return { status: 404, message: 'Documentation not found' };
      }

      const doc = existing[0];

      // Check if already submitted
      if (['SUBMITTED', 'APPROVED'].includes(doc.documentation_status)) {
        reply.code(409);
        return {
          status: 409,
          message: 'Documentation has already been submitted',
          code: 'ALREADY_SUBMITTED'
        };
      }

      // Calculate deadline status
      const deadline = new Date(doc.documentation_deadline);
      const { isOverdue, daysOverdue } = this.calculateTimeRemaining(deadline);

      // ENFORCE 14-DAY DEADLINE
      if (isOverdue && !doc.override_granted) {
        reply.code(422);
        return {
          status: 422,
          message: `Documentation submission blocked: The 14-day deadline per ${IDGMeetingDocumentationController.CMS_REGULATION} has expired. ` +
                   `This documentation is ${daysOverdue} days overdue. ` +
                   `Please contact your supervisor or administrator to request a late submission override.`,
          code: 'DEADLINE_EXCEEDED',
          regulation: IDGMeetingDocumentationController.CMS_REGULATION,
          days_overdue: daysOverdue,
          deadline: deadline.toISOString(),
          meeting_date: doc.meeting_date,
          override_required: true,
          override_endpoint: `/api/idg-meetings/documentation/${id}/override`
        };
      }

      // Validate required fields are complete
      const validationResult = this.validateRequiredFields(doc);
      if (!validationResult.isValid) {
        reply.code(400);
        return {
          status: 400,
          message: 'Cannot submit: Required fields are incomplete',
          code: 'INCOMPLETE_FIELDS',
          incomplete_fields: validationResult.incompleteFields
        };
      }

      // Submit the documentation
      const result = await db
        .update(idg_meeting_documentation)
        .set({
          documentation_status: doc.override_granted ? 'OVERRIDDEN' : 'SUBMITTED',
          submitted_date: new Date(),
          submitted_by_id: userId,
          submitted_by_name: userName,
          submission_ip_address: request.ip,
          submission_user_agent: request.headers['user-agent'],
          is_late_submission: doc.override_granted,
          required_fields_complete: true,
          updated_by_id: userId,
          updatedAt: new Date()
        })
        .where(eq(idg_meeting_documentation.id, parseInt(id)))
        .returning();

      // Create audit entry
      await this.createAuditEntry({
        documentation_id: doc.id,
        idg_meeting_id: doc.idg_meeting_id,
        action: 'SUBMIT',
        action_description: doc.override_granted
          ? `Documentation submitted with override (${daysOverdue} days late)`
          : 'Documentation submitted on time',
        previous_status: doc.documentation_status,
        new_status: result[0].documentation_status,
        user_id: userId,
        user_name: userName,
        user_role: request.user?.role,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        deadline_at_action: deadline,
        was_overdue_at_action: isOverdue
      });

      // Cancel pending alerts
      await db
        .update(idg_compliance_alerts)
        .set({ status: 'CANCELLED', updatedAt: new Date() })
        .where(and(
          eq(idg_compliance_alerts.documentation_id, parseInt(id)),
          eq(idg_compliance_alerts.status, 'PENDING')
        ));

      reply.code(200);
      return {
        status: 200,
        message: doc.override_granted
          ? 'Documentation submitted with late submission override'
          : 'Documentation submitted successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error submitting IDG documentation:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error submitting documentation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // OVERRIDE MECHANISM FOR LATE SUBMISSIONS
  // ============================================================================

  /**
   * Request override for late submission
   * POST /idg-meetings/documentation/:id/override
   */
  async requestOverride(request, reply) {
    try {
      const { id } = request.params;
      const { justification } = request.body;
      const userId = request.user?.id;
      const userName = `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim();
      const userRole = request.user?.role?.toLowerCase();

      // Validate justification length
      if (!justification || justification.trim().length < IDGMeetingDocumentationController.MIN_OVERRIDE_JUSTIFICATION_LENGTH) {
        reply.code(400);
        return {
          status: 400,
          message: `Override justification must be at least ${IDGMeetingDocumentationController.MIN_OVERRIDE_JUSTIFICATION_LENGTH} characters`,
          code: 'JUSTIFICATION_TOO_SHORT',
          minimum_length: IDGMeetingDocumentationController.MIN_OVERRIDE_JUSTIFICATION_LENGTH,
          provided_length: justification?.trim().length || 0
        };
      }

      // Fetch documentation
      const existing = await db
        .select()
        .from(idg_meeting_documentation)
        .where(and(
          eq(idg_meeting_documentation.id, parseInt(id)),
          isNull(idg_meeting_documentation.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return { status: 404, message: 'Documentation not found' };
      }

      const doc = existing[0];

      // Check if override is needed
      const { isOverdue, daysOverdue } = this.calculateTimeRemaining(new Date(doc.documentation_deadline));

      if (!isOverdue) {
        reply.code(400);
        return {
          status: 400,
          message: 'Override not required - documentation is within the 14-day deadline',
          code: 'OVERRIDE_NOT_NEEDED'
        };
      }

      // Check user authorization for override (supervisor/admin only)
      const authorizedRoles = ['admin', 'supervisor', 'director', 'compliance_officer'];
      if (!authorizedRoles.includes(userRole)) {
        reply.code(403);
        return {
          status: 403,
          message: 'Override requires supervisor or administrator authorization',
          code: 'INSUFFICIENT_AUTHORIZATION',
          required_roles: authorizedRoles
        };
      }

      // Grant override
      const result = await db
        .update(idg_meeting_documentation)
        .set({
          override_granted: true,
          override_granted_by_id: userId,
          override_granted_by_name: userName,
          override_granted_date: new Date(),
          override_justification: justification.trim(),
          documentation_status: 'OVERDUE', // Keep as overdue until submitted
          flagged_in_compliance_report: true,
          compliance_flag_reason: `Late submission override granted. ${daysOverdue} days past deadline. Justification: ${justification.trim().substring(0, 200)}...`,
          updated_by_id: userId,
          updatedAt: new Date()
        })
        .where(eq(idg_meeting_documentation.id, parseInt(id)))
        .returning();

      // Create audit entry
      await this.createAuditEntry({
        documentation_id: doc.id,
        idg_meeting_id: doc.idg_meeting_id,
        action: 'OVERRIDE',
        action_description: `Late submission override granted by ${userName}. Days overdue: ${daysOverdue}. Justification: ${justification.trim()}`,
        previous_status: doc.documentation_status,
        new_status: 'OVERDUE',
        user_id: userId,
        user_name: userName,
        user_role: userRole,
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        was_overdue_at_action: true,
        new_value: {
          override_justification: justification.trim(),
          days_overdue: daysOverdue
        }
      });

      // TODO: Send notification to compliance team
      // This would integrate with the notification service

      reply.code(200);
      return {
        status: 200,
        message: 'Late submission override granted. Documentation can now be submitted.',
        data: {
          id: doc.id,
          override_granted: true,
          override_granted_by: userName,
          override_granted_date: result[0].override_granted_date,
          days_overdue: daysOverdue,
          next_step: 'Submit the documentation using POST /idg-meetings/documentation/:id/submit'
        }
      };
    } catch (error) {
      logger.error('Error granting override:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error granting override',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // PENDING DOCUMENTATION & DEADLINE STATUS
  // ============================================================================

  /**
   * Get all pending documentation with deadline status
   * GET /idg-meetings/documentation/pending
   */
  async getPendingDocumentation(request, reply) {
    try {
      const { limit = 50, offset = 0, include_overdue = 'true' } = request.query;

      // Fetch pending documentation (DRAFT, IN_PROGRESS, PENDING_REVIEW, OVERDUE)
      const pendingStatuses = ['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'OVERDUE'];

      const docs = await db
        .select()
        .from(idg_meeting_documentation)
        .where(and(
          sql`${idg_meeting_documentation.documentation_status} = ANY(ARRAY['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'OVERDUE']::varchar[])`,
          isNull(idg_meeting_documentation.deleted_at)
        ))
        .orderBy(asc(idg_meeting_documentation.documentation_deadline))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Enrich with real-time deadline status
      const enrichedDocs = docs.map(doc => {
        const { daysRemaining, hoursRemaining, isOverdue, daysOverdue } =
          this.calculateTimeRemaining(new Date(doc.documentation_deadline));

        return {
          ...doc,
          deadline_info: {
            deadline: doc.documentation_deadline,
            days_remaining: daysRemaining,
            hours_remaining: hoursRemaining,
            is_overdue: isOverdue,
            days_overdue: daysOverdue,
            countdown_display: this.formatCountdown(daysRemaining, hoursRemaining),
            urgency_level: this.getUrgencyLevel(daysRemaining, isOverdue)
          }
        };
      });

      // Categorize by urgency
      const categorized = {
        overdue: enrichedDocs.filter(d => d.deadline_info.is_overdue),
        due_today: enrichedDocs.filter(d => !d.deadline_info.is_overdue && d.deadline_info.days_remaining === 0),
        due_tomorrow: enrichedDocs.filter(d => d.deadline_info.days_remaining === 1),
        due_this_week: enrichedDocs.filter(d => d.deadline_info.days_remaining > 1 && d.deadline_info.days_remaining <= 7),
        due_later: enrichedDocs.filter(d => d.deadline_info.days_remaining > 7)
      };

      reply.code(200);
      return {
        status: 200,
        data: enrichedDocs,
        count: enrichedDocs.length,
        summary: {
          total_pending: enrichedDocs.length,
          overdue_count: categorized.overdue.length,
          due_today_count: categorized.due_today.length,
          due_tomorrow_count: categorized.due_tomorrow.length,
          due_this_week_count: categorized.due_this_week.length,
          due_later_count: categorized.due_later.length
        },
        categorized
      };
    } catch (error) {
      logger.error('Error fetching pending documentation:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching pending documentation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // COMPLIANCE REPORTING
  // ============================================================================

  /**
   * Generate compliance report
   * GET /idg-meetings/documentation/compliance-report
   */
  async getComplianceReport(request, reply) {
    try {
      const {
        start_date,
        end_date,
        month,
        year
      } = request.query;

      let startDate, endDate;

      if (month && year) {
        // Monthly report
        startDate = new Date(parseInt(year), parseInt(month) - 1, 1);
        endDate = new Date(parseInt(year), parseInt(month), 0, 23, 59, 59);
      } else if (start_date && end_date) {
        startDate = new Date(start_date);
        endDate = new Date(end_date);
        endDate.setHours(23, 59, 59);
      } else {
        // Default to current month
        const now = new Date();
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
      }

      // Get all documentation in date range
      const allDocs = await db
        .select()
        .from(idg_meeting_documentation)
        .where(and(
          gte(idg_meeting_documentation.meeting_date, startDate.toISOString().split('T')[0]),
          lte(idg_meeting_documentation.meeting_date, endDate.toISOString().split('T')[0]),
          isNull(idg_meeting_documentation.deleted_at)
        ));

      // Get meetings in date range (to identify meetings without documentation)
      const allMeetings = await db
        .select({ id: idg_meetings.id, meeting_date: idg_meetings.meeting_date })
        .from(idg_meetings)
        .where(and(
          gte(idg_meetings.meeting_date, startDate.toISOString().split('T')[0]),
          lte(idg_meetings.meeting_date, endDate.toISOString().split('T')[0])
        ));

      const documentedMeetingIds = new Set(allDocs.map(d => d.idg_meeting_id));
      const meetingsWithoutDocs = allMeetings.filter(m => !documentedMeetingIds.has(m.id));

      // Calculate metrics
      const totalMeetings = allMeetings.length;
      const meetingsWithDocumentation = allDocs.length;
      const meetingsWithoutDocumentation = meetingsWithoutDocs.length;

      const submittedDocs = allDocs.filter(d => ['SUBMITTED', 'APPROVED', 'OVERRIDDEN'].includes(d.documentation_status));
      const onTimeSubmissions = submittedDocs.filter(d => !d.is_late_submission).length;
      const lateSubmissions = submittedDocs.filter(d => d.is_late_submission).length;
      const overriddenSubmissions = submittedDocs.filter(d => d.override_granted).length;
      const pendingSubmissions = allDocs.filter(d => ['DRAFT', 'IN_PROGRESS', 'PENDING_REVIEW', 'OVERDUE'].includes(d.documentation_status)).length;

      // Calculate rates
      const onTimeRate = submittedDocs.length > 0
        ? Math.round((onTimeSubmissions / submittedDocs.length) * 100)
        : 0;
      const complianceRate = totalMeetings > 0
        ? Math.round((onTimeSubmissions / totalMeetings) * 100)
        : 0;

      // Calculate completion time metrics
      const completionTimes = submittedDocs
        .filter(d => d.submitted_date)
        .map(d => {
          const meetingDate = new Date(d.meeting_date);
          const submittedDate = new Date(d.submitted_date);
          return Math.round((submittedDate - meetingDate) / (1000 * 60 * 60)); // hours
        })
        .sort((a, b) => a - b);

      const avgCompletionTime = completionTimes.length > 0
        ? Math.round(completionTimes.reduce((a, b) => a + b, 0) / completionTimes.length)
        : 0;
      const medianCompletionTime = completionTimes.length > 0
        ? completionTimes[Math.floor(completionTimes.length / 2)]
        : 0;

      // Override reasons analysis
      const overrideReasons = submittedDocs
        .filter(d => d.override_granted && d.override_justification)
        .map(d => d.override_justification);

      // Late submission details
      const lateSubmissionDetails = submittedDocs
        .filter(d => d.is_late_submission)
        .map(d => ({
          meeting_id: d.idg_meeting_id,
          documentation_id: d.id,
          meeting_date: d.meeting_date,
          submitted_date: d.submitted_date,
          days_late: d.days_overdue,
          override_justification: d.override_justification
        }));

      const report = {
        report_period: {
          start_date: startDate.toISOString().split('T')[0],
          end_date: endDate.toISOString().split('T')[0],
          month: startDate.getMonth() + 1,
          year: startDate.getFullYear()
        },
        meeting_metrics: {
          total_meetings: totalMeetings,
          meetings_with_documentation: meetingsWithDocumentation,
          meetings_without_documentation: meetingsWithoutDocumentation,
          documentation_coverage_rate: totalMeetings > 0
            ? Math.round((meetingsWithDocumentation / totalMeetings) * 100)
            : 0
        },
        compliance_metrics: {
          on_time_submissions: onTimeSubmissions,
          late_submissions: lateSubmissions,
          overridden_submissions: overriddenSubmissions,
          pending_submissions: pendingSubmissions,
          on_time_rate: onTimeRate,
          compliance_rate: complianceRate,
          regulation_reference: IDGMeetingDocumentationController.CMS_REGULATION
        },
        time_metrics: {
          average_completion_time_hours: avgCompletionTime,
          median_completion_time_hours: medianCompletionTime,
          min_completion_time_hours: completionTimes.length > 0 ? completionTimes[0] : 0,
          max_completion_time_hours: completionTimes.length > 0 ? completionTimes[completionTimes.length - 1] : 0
        },
        override_analysis: {
          total_overrides: overriddenSubmissions,
          override_rate: submittedDocs.length > 0
            ? Math.round((overriddenSubmissions / submittedDocs.length) * 100)
            : 0,
          reasons_summary: this.summarizeOverrideReasons(overrideReasons)
        },
        late_submission_details: lateSubmissionDetails,
        meetings_without_documentation: meetingsWithoutDocs,
        generated_at: new Date().toISOString()
      };

      reply.code(200);
      return {
        status: 200,
        data: report
      };
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error generating compliance report',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get documentation audit trail
   * GET /idg-meetings/documentation/:id/audit-trail
   */
  async getAuditTrail(request, reply) {
    try {
      const { id } = request.params;
      const { limit = 100, offset = 0 } = request.query;

      const auditEntries = await db
        .select()
        .from(idg_documentation_audit)
        .where(eq(idg_documentation_audit.documentation_id, parseInt(id)))
        .orderBy(desc(idg_documentation_audit.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: auditEntries,
        count: auditEntries.length
      };
    } catch (error) {
      logger.error('Error fetching audit trail:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching audit trail',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // HELPER METHODS
  // ============================================================================

  /**
   * Calculate the 14-day deadline from meeting date
   * Deadline is at 23:59:59 on the 14th calendar day after the meeting
   */
  calculateDeadline(meetingDate) {
    const deadline = new Date(meetingDate);
    deadline.setDate(deadline.getDate() + IDGMeetingDocumentationController.DEADLINE_DAYS);
    deadline.setHours(23, 59, 59, 999);
    return deadline;
  }

  /**
   * Calculate time remaining until deadline
   */
  calculateTimeRemaining(deadline) {
    const now = new Date();
    const diff = deadline - now;

    if (diff <= 0) {
      // Past deadline
      const daysOverdue = Math.ceil(Math.abs(diff) / (1000 * 60 * 60 * 24));
      return {
        daysRemaining: 0,
        hoursRemaining: 0,
        isOverdue: true,
        daysOverdue
      };
    }

    const daysRemaining = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hoursRemaining = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));

    return {
      daysRemaining,
      hoursRemaining,
      isOverdue: false,
      daysOverdue: 0
    };
  }

  /**
   * Format countdown for display
   */
  formatCountdown(days, hours) {
    if (days === 0 && hours === 0) {
      return 'Due now';
    } else if (days === 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    } else if (days === 1) {
      return `1 day, ${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    } else {
      return `${days} days, ${hours} hour${hours !== 1 ? 's' : ''} remaining`;
    }
  }

  /**
   * Get urgency level based on days remaining
   */
  getUrgencyLevel(daysRemaining, isOverdue) {
    if (isOverdue) return 'CRITICAL';
    if (daysRemaining === 0) return 'CRITICAL';
    if (daysRemaining <= 1) return 'HIGH';
    if (daysRemaining <= 3) return 'MEDIUM';
    if (daysRemaining <= 7) return 'LOW';
    return 'NORMAL';
  }

  /**
   * Validate required fields before submission
   */
  validateRequiredFields(doc) {
    const requiredFields = [
      'documentation_content',
      'meeting_summary'
    ];

    const incompleteFields = requiredFields.filter(field =>
      !doc[field] || doc[field].trim().length === 0
    );

    return {
      isValid: incompleteFields.length === 0,
      incompleteFields
    };
  }

  /**
   * Create audit entry for documentation changes
   */
  async createAuditEntry(data) {
    try {
      await db
        .insert(idg_documentation_audit)
        .values(data);
    } catch (error) {
      logger.error('Error creating audit entry:', error);
      // Don't throw - audit failures shouldn't block operations
    }
  }

  /**
   * Schedule compliance alerts for a documentation
   */
  async scheduleComplianceAlerts(doc) {
    try {
      const deadline = new Date(doc.documentation_deadline);
      const alerts = [];

      for (const daysBefore of IDGMeetingDocumentationController.NOTIFICATION_INTERVALS) {
        const scheduledFor = new Date(deadline);
        scheduledFor.setDate(scheduledFor.getDate() - daysBefore);
        scheduledFor.setHours(8, 0, 0, 0); // 8 AM

        // Only schedule if the alert time is in the future
        if (scheduledFor > new Date()) {
          let alertType;
          switch (daysBefore) {
            case 10: alertType = '10_DAY_REMINDER'; break;
            case 7: alertType = '7_DAY_REMINDER'; break;
            case 3: alertType = '3_DAY_REMINDER'; break;
            case 1: alertType = '1_DAY_REMINDER'; break;
            case 0: alertType = 'SAME_DAY'; break;
            default: alertType = 'REMINDER';
          }

          alerts.push({
            documentation_id: doc.id,
            idg_meeting_id: doc.idg_meeting_id,
            alert_type: alertType,
            days_before_deadline: daysBefore,
            scheduled_for: scheduledFor,
            recipients: JSON.stringify([{
              user_id: doc.documentation_owner_id,
              name: doc.documentation_owner_name
            }]),
            status: 'PENDING'
          });
        }
      }

      if (alerts.length > 0) {
        await db.insert(idg_compliance_alerts).values(alerts);
      }
    } catch (error) {
      logger.error('Error scheduling compliance alerts:', error);
    }
  }

  /**
   * Summarize override reasons for reporting
   */
  summarizeOverrideReasons(reasons) {
    // Simple categorization - in production this could use NLP
    const categories = {
      'system_issues': 0,
      'staffing': 0,
      'emergency': 0,
      'other': 0
    };

    reasons.forEach(reason => {
      const lowerReason = reason.toLowerCase();
      if (lowerReason.includes('system') || lowerReason.includes('technical') || lowerReason.includes('outage')) {
        categories.system_issues++;
      } else if (lowerReason.includes('staff') || lowerReason.includes('shortage') || lowerReason.includes('absence')) {
        categories.staffing++;
      } else if (lowerReason.includes('emergency') || lowerReason.includes('urgent')) {
        categories.emergency++;
      } else {
        categories.other++;
      }
    });

    return categories;
  }
}

export default new IDGMeetingDocumentationController();
