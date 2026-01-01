import { db } from '../config/db.drizzle.js';
import {
  bereavement_cases,
  bereavement_contacts,
  bereavement_plans,
  bereavement_encounters,
  bereavement_risk_assessments,
  support_groups,
  support_group_sessions,
  support_group_participants,
  bereavement_follow_ups,
  bereavement_resources,
  bereavement_memorial_services,
  bereavement_memorial_attendees,
  bereavement_documents,
  bereavement_audit_log,
  patients,
  users
} from '../db/schemas/index.js';
import { eq, and, desc, asc, isNull, gte, lte, sql, or, ilike, count } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';

// Allowed document types
const ALLOWED_DOCUMENT_TYPES = ['DEATH_CERTIFICATE', 'SERVICE_AGREEMENT', 'CORRESPONDENCE', 'CONSENT_FORM', 'ASSESSMENT_FORM', 'OTHER'];

// Allowed document MIME types (security)
const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/gif',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain'
];

// Maximum file size (10MB)
const MAX_FILE_SIZE = 10 * 1024 * 1024;

/**
 * Log audit entry for bereavement operations
 */
async function logBereavementAudit(request, action_type, entity_type, entity_id, caseId, changes = null) {
  try {
    await db.insert(bereavement_audit_log).values({
      bereavement_case_id: caseId,
      action_type,
      entity_type,
      entity_id,
      changes_summary: changes,
      user_id: request.user?.id || 'system',
      user_name: request.user?.name || 'System',
      user_role: request.user?.role || 'unknown',
      ip_address: request.ip || request.headers?.['x-forwarded-for'] || 'unknown',
      user_agent: request.headers?.['user-agent'] || 'unknown',
      session_id: request.session?.id || null
    });
  } catch (error) {
    logger.error('Failed to log bereavement audit:', { error: error.message, action_type, entity_type, entity_id });
  }
}

/**
 * Validate required fields for bereavement case creation
 */
function validateBereavementCase(data) {
  const errors = [];

  if (!data.patient_id) {
    errors.push({ field: 'patient_id', message: 'Patient ID is required' });
  }

  if (!data.date_of_death) {
    errors.push({ field: 'date_of_death', message: 'Date of death is required' });
  } else {
    const deathDate = new Date(data.date_of_death);
    const today = new Date();
    if (deathDate > today) {
      errors.push({ field: 'date_of_death', message: 'Date of death cannot be in the future' });
    }
  }

  if (data.case_status && !['ACTIVE', 'COMPLETED', 'CLOSED_EARLY'].includes(data.case_status)) {
    errors.push({ field: 'case_status', message: 'Invalid case status. Must be ACTIVE, COMPLETED, or CLOSED_EARLY' });
  }

  if (data.service_level && !['STANDARD', 'ENHANCED', 'HIGH_RISK'].includes(data.service_level)) {
    errors.push({ field: 'service_level', message: 'Invalid service level. Must be STANDARD, ENHANCED, or HIGH_RISK' });
  }

  return errors;
}

/**
 * Calculate changes between old and new data for audit logging
 */
function calculateChanges(oldData, newData) {
  const changes = {};
  const excludeFields = ['id', 'createdAt', 'created_by_id'];

  for (const key of Object.keys(newData)) {
    if (excludeFields.includes(key)) continue;
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changes[key] = {
        old: oldData[key],
        new: newData[key]
      };
    }
  }

  return Object.keys(changes).length > 0 ? changes : null;
}
/**
 * Bereavement Controller
 * Module K - MEDIUM Priority
 *
 * Purpose: 13-month bereavement requirement, grief support services
 * Compliance: CMS requires hospices to provide bereavement services for 13 months after patient death
 *
 * Endpoints:
 * - Bereavement case management (create, update, close)
 * - Contact management (family/friends receiving services)
 * - Care plan development
 * - Encounter documentation
 * - Risk assessments
 * - Support group management
 */
class BereavementController {
  // ============================================
  // BEREAVEMENT CASES
  // ============================================

  /**
   * Get all bereavement cases with enhanced search and filtering
   * GET /bereavement/cases
   *
   * Query params:
   * - limit: number (default 50, max 100)
   * - offset: number (default 0)
   * - case_status: ACTIVE | COMPLETED | CLOSED_EARLY
   * - service_level: STANDARD | ENHANCED | HIGH_RISK
   * - date_from: YYYY-MM-DD (filter by death date from)
   * - date_to: YYYY-MM-DD (filter by death date to)
   * - search: string (search by patient name, case number)
   * - assigned_counselor_id: string (filter by assigned staff)
   * - sort_by: date_of_death | createdAt | case_status (default: date_of_death)
   * - sort_order: asc | desc (default: desc)
   */
  async getAllCases(request, reply) {
    try {
      const {
        limit = 50,
        offset = 0,
        case_status,
        service_level,
        date_from,
        date_to,
        search,
        assigned_counselor_id,
        sort_by = 'date_of_death',
        sort_order = 'desc'
      } = request.query;

      // Cap limit at 100
      const parsedLimit = Math.min(parseInt(limit) || 50, 100);
      const parsedOffset = parseInt(offset) || 0;

      // Build base query
      const filters = [isNull(bereavement_cases.deleted_at)];

      if (case_status) {
        filters.push(eq(bereavement_cases.case_status, case_status));
      }
      if (service_level) {
        filters.push(eq(bereavement_cases.service_level, service_level));
      }
      if (date_from) {
        filters.push(gte(bereavement_cases.date_of_death, date_from));
      }
      if (date_to) {
        filters.push(lte(bereavement_cases.date_of_death, date_to));
      }
      if (assigned_counselor_id) {
        filters.push(eq(bereavement_cases.assigned_counselor_id, assigned_counselor_id));
      }
      if (search) {
        filters.push(
          or(
            ilike(patients.first_name, `%${search}%`),
            ilike(patients.last_name, `%${search}%`),
            ilike(patients.medical_record_number, `%${search}%`)
          )
        );
      }

      // Get total count for pagination
      const countResult = await db
        .select({ value: count() })
        .from(bereavement_cases)
        .leftJoin(patients, eq(bereavement_cases.patient_id, patients.id))
        .where(and(...filters));
      const totalCount = countResult[0]?.value || 0;

      // Determine sort order
      const sortColumn = {
        date_of_death: bereavement_cases.date_of_death,
        createdAt: bereavement_cases.createdAt,
        case_status: bereavement_cases.case_status
      }[sort_by] || bereavement_cases.date_of_death;

      const orderFn = sort_order === 'asc' ? asc : desc;

      // Execute main query
      const results = await db
        .select({
          case: bereavement_cases,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(bereavement_cases)
        .leftJoin(patients, eq(bereavement_cases.patient_id, patients.id))
        .where(and(...filters))
        .orderBy(orderFn(sortColumn))
        .limit(parsedLimit)
        .offset(parsedOffset);

      reply.code(200);
      return {
        success: true,
        status: 200,
        data: results,
        count: results.length,
        total: totalCount,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + results.length < totalCount
        }
      };
    } catch (error) {
      logger.error('Error fetching bereavement cases:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'FETCH_ERROR',
          message: 'Error fetching bereavement cases'
        }
      };
    }
  }

  /**
   * Create bereavement case
   * POST /bereavement/cases
   */
  async createCase(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      const validationErrors = validateBereavementCase(data);
      if (validationErrors.length > 0) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            fields: validationErrors
          }
        };
      }

      // Remove immutable fields if provided
      const { id, createdAt, deleted_at, ...safeData } = data;

      // Calculate bereavement period (13 months from date of death)
      if (safeData.date_of_death && !safeData.bereavement_end_date) {
        const deathDate = new Date(safeData.date_of_death);
        const endDate = new Date(deathDate);
        endDate.setMonth(endDate.getMonth() + 13);
        safeData.bereavement_end_date = endDate.toISOString().split('T')[0];
        safeData.bereavement_start_date = safeData.date_of_death;
      }

      const result = await db
        .insert(bereavement_cases)
        .values({
          ...safeData,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Log audit entry
      await logBereavementAudit(
        request,
        'CREATE',
        'bereavement_cases',
        result[0].id,
        result[0].id,
        { created: result[0] }
      );

      reply.code(201);
      return {
        success: true,
        status: 201,
        message: 'Bereavement case created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating bereavement case:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'CREATE_ERROR',
          message: 'Error creating bereavement case'
        }
      };
    }
  }

  /**
   * Get bereavement case by ID
   * GET /bereavement/cases/:id
   */
  async getCaseById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select({
          case: bereavement_cases,
          patient: patients
        })
        .from(bereavement_cases)
        .leftJoin(patients, eq(bereavement_cases.patient_id, patients.id))
        .where(and(
          eq(bereavement_cases.id, parseInt(id)),
          isNull(bereavement_cases.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Bereavement case not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching bereavement case:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching bereavement case',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update bereavement case with optimistic locking
   * PATCH /bereavement/cases/:id
   *
   * Supports optimistic locking via updatedAt field.
   * If client provides updatedAt, it will be compared with server value.
   * If they don't match, a 409 Conflict is returned.
   */
  async updateCase(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const caseId = parseInt(id);

      if (isNaN(caseId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid case ID provided'
          }
        };
      }

      // Fetch existing case for optimistic locking check and audit
      const existing = await db
        .select()
        .from(bereavement_cases)
        .where(and(
          eq(bereavement_cases.id, caseId),
          isNull(bereavement_cases.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Bereavement case not found'
          }
        };
      }

      // Optimistic locking check
      if (data.updatedAt) {
        const clientUpdatedAt = new Date(data.updatedAt);
        const serverUpdatedAt = new Date(existing[0].updatedAt);
        if (clientUpdatedAt.getTime() !== serverUpdatedAt.getTime()) {
          reply.code(409);
          return {
            success: false,
            status: 409,
            error: {
              code: 'CONCURRENT_MODIFICATION',
              message: 'This record has been modified by another user. Please refresh and try again.',
              serverUpdatedAt: serverUpdatedAt.toISOString()
            }
          };
        }
      }

      // Remove immutable fields
      const { id: _, createdAt, deleted_at, created_by_id, updatedAt: clientUpdatedAt, ...safeData } = data;

      // Calculate changes for audit
      const changes = calculateChanges(existing[0], safeData);

      const result = await db
        .update(bereavement_cases)
        .set({
          ...safeData,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_cases.id, caseId))
        .returning();

      // Log audit entry with changes
      if (changes) {
        await logBereavementAudit(
          request,
          'UPDATE',
          'bereavement_cases',
          caseId,
          caseId,
          changes
        );
      }

      reply.code(200);
      return {
        success: true,
        status: 200,
        message: 'Bereavement case updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating bereavement case:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Error updating bereavement case'
        }
      };
    }
  }

  /**
   * Soft delete bereavement case
   * DELETE /bereavement/cases/:id
   */
  async deleteCase(request, reply) {
    try {
      const { id } = request.params;
      const { reason } = request.body || {};
      const caseId = parseInt(id);

      if (isNaN(caseId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid case ID provided'
          }
        };
      }

      // Check if case exists
      const existing = await db
        .select()
        .from(bereavement_cases)
        .where(and(
          eq(bereavement_cases.id, caseId),
          isNull(bereavement_cases.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Bereavement case not found'
          }
        };
      }

      // Perform soft delete
      const result = await db
        .update(bereavement_cases)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_cases.id, caseId))
        .returning();

      // Log audit entry
      await logBereavementAudit(
        request,
        'DELETE',
        'bereavement_cases',
        caseId,
        caseId,
        { reason: reason || 'No reason provided', deleted_at: result[0].deleted_at }
      );

      reply.code(200);
      return {
        success: true,
        status: 200,
        message: 'Bereavement case deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting bereavement case:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'DELETE_ERROR',
          message: 'Error deleting bereavement case'
        }
      };
    }
  }

  /**
   * Assign staff member to bereavement case
   * POST /bereavement/cases/:id/assign
   */
  async assignStaff(request, reply) {
    try {
      const { id } = request.params;
      const { assigned_counselor_id } = request.body;
      const caseId = parseInt(id);

      if (isNaN(caseId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid case ID provided'
          }
        };
      }

      if (!assigned_counselor_id) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'assigned_counselor_id is required'
          }
        };
      }

      // Verify case exists
      const existing = await db
        .select()
        .from(bereavement_cases)
        .where(and(
          eq(bereavement_cases.id, caseId),
          isNull(bereavement_cases.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Bereavement case not found'
          }
        };
      }

      const previousCounselor = existing[0].assigned_counselor_id;

      const result = await db
        .update(bereavement_cases)
        .set({
          assigned_counselor_id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_cases.id, caseId))
        .returning();

      // Log audit entry for assignment change
      await logBereavementAudit(
        request,
        'ASSIGNMENT_CHANGE',
        'bereavement_cases',
        caseId,
        caseId,
        {
          assigned_counselor_id: {
            old: previousCounselor,
            new: assigned_counselor_id
          }
        }
      );

      reply.code(200);
      return {
        success: true,
        status: 200,
        message: 'Staff assigned successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error assigning staff:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'ASSIGNMENT_ERROR',
          message: 'Error assigning staff to case'
        }
      };
    }
  }

  /**
   * Get case summary/report
   * GET /bereavement/cases/:id/summary
   */
  async getCaseSummary(request, reply) {
    try {
      const { id } = request.params;
      const caseId = parseInt(id);

      if (isNaN(caseId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid case ID provided'
          }
        };
      }

      // Get case details
      const caseResult = await db
        .select({
          case: bereavement_cases,
          patient: patients,
          counselor: users
        })
        .from(bereavement_cases)
        .leftJoin(patients, eq(bereavement_cases.patient_id, patients.id))
        .leftJoin(users, eq(bereavement_cases.assigned_counselor_id, users.id))
        .where(and(
          eq(bereavement_cases.id, caseId),
          isNull(bereavement_cases.deleted_at)
        ))
        .limit(1);

      if (!caseResult[0]) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Bereavement case not found'
          }
        };
      }

      // Get contacts count
      const contactsCount = await db
        .select({ value: count() })
        .from(bereavement_contacts)
        .where(and(
          eq(bereavement_contacts.bereavement_case_id, caseId),
          isNull(bereavement_contacts.deleted_at)
        ));

      // Get encounters count
      const encountersCount = await db
        .select({ value: count() })
        .from(bereavement_encounters)
        .where(and(
          eq(bereavement_encounters.bereavement_case_id, caseId),
          isNull(bereavement_encounters.deleted_at)
        ));

      // Get follow-ups summary
      const followUpStats = await db
        .select({
          status: bereavement_follow_ups.follow_up_status,
          count: count()
        })
        .from(bereavement_follow_ups)
        .where(and(
          eq(bereavement_follow_ups.bereavement_case_id, caseId),
          isNull(bereavement_follow_ups.deleted_at)
        ))
        .groupBy(bereavement_follow_ups.follow_up_status);

      // Get documents count
      const documentsCount = await db
        .select({ value: count() })
        .from(bereavement_documents)
        .where(and(
          eq(bereavement_documents.bereavement_case_id, caseId),
          isNull(bereavement_documents.deleted_at)
        ));

      // Get latest risk assessment
      const latestRiskAssessment = await db
        .select()
        .from(bereavement_risk_assessments)
        .where(and(
          eq(bereavement_risk_assessments.bereavement_case_id, caseId),
          isNull(bereavement_risk_assessments.deleted_at)
        ))
        .orderBy(desc(bereavement_risk_assessments.assessment_date))
        .limit(1);

      // Log audit entry for viewing report
      await logBereavementAudit(
        request,
        'VIEW',
        'bereavement_case_summary',
        caseId,
        caseId
      );

      reply.code(200);
      return {
        success: true,
        status: 200,
        data: {
          case: caseResult[0].case,
          patient: caseResult[0].patient,
          assigned_counselor: caseResult[0].counselor,
          statistics: {
            total_contacts: contactsCount[0]?.value || 0,
            total_encounters: encountersCount[0]?.value || 0,
            total_documents: documentsCount[0]?.value || 0,
            follow_ups: followUpStats.reduce((acc, stat) => {
              acc[stat.status?.toLowerCase() || 'unknown'] = stat.count;
              return acc;
            }, {})
          },
          latest_risk_assessment: latestRiskAssessment[0] || null,
          bereavement_progress: {
            start_date: caseResult[0].case.bereavement_start_date,
            end_date: caseResult[0].case.bereavement_end_date,
            days_remaining: Math.max(0, Math.ceil(
              (new Date(caseResult[0].case.bereavement_end_date) - new Date()) / (1000 * 60 * 60 * 24)
            ))
          }
        }
      };
    } catch (error) {
      logger.error('Error getting case summary:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'SUMMARY_ERROR',
          message: 'Error generating case summary'
        }
      };
    }
  }

  /**
   * Get audit log for a bereavement case
   * GET /bereavement/cases/:id/audit-log
   */
  async getCaseAuditLog(request, reply) {
    try {
      const { id } = request.params;
      const { limit = 50, offset = 0 } = request.query;
      const caseId = parseInt(id);

      if (isNaN(caseId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid case ID provided'
          }
        };
      }

      const parsedLimit = Math.min(parseInt(limit) || 50, 100);
      const parsedOffset = parseInt(offset) || 0;

      const results = await db
        .select()
        .from(bereavement_audit_log)
        .where(eq(bereavement_audit_log.bereavement_case_id, caseId))
        .orderBy(desc(bereavement_audit_log.action_timestamp))
        .limit(parsedLimit)
        .offset(parsedOffset);

      const totalCount = await db
        .select({ value: count() })
        .from(bereavement_audit_log)
        .where(eq(bereavement_audit_log.bereavement_case_id, caseId));

      reply.code(200);
      return {
        success: true,
        status: 200,
        data: results,
        count: results.length,
        total: totalCount[0]?.value || 0,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + results.length < (totalCount[0]?.value || 0)
        }
      };
    } catch (error) {
      logger.error('Error fetching audit log:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'AUDIT_LOG_ERROR',
          message: 'Error fetching audit log'
        }
      };
    }
  }

  // ============================================
  // BEREAVEMENT CONTACTS
  // ============================================

  /**
   * Get contacts for a bereavement case
   * GET /bereavement/cases/:id/contacts
   */
  async getCaseContacts(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(bereavement_contacts)
        .where(and(
          eq(bereavement_contacts.bereavement_case_id, parseInt(id)),
          isNull(bereavement_contacts.deleted_at)
        ))
        .orderBy(desc(bereavement_contacts.is_primary_contact), bereavement_contacts.last_name);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching bereavement contacts:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching bereavement contacts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add contact to bereavement case
   * POST /bereavement/cases/:id/contacts
   */
  async addContact(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_contacts)
        .values({
          ...data,
          bereavement_case_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Bereavement contact added successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding bereavement contact:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding bereavement contact',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // BEREAVEMENT PLANS
  // ============================================

  /**
   * Get bereavement plans for a case
   * GET /bereavement/cases/:id/plans
   */
  async getCasePlans(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(bereavement_plans)
        .where(and(
          eq(bereavement_plans.bereavement_case_id, parseInt(id)),
          isNull(bereavement_plans.deleted_at)
        ))
        .orderBy(desc(bereavement_plans.plan_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching bereavement plans:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching bereavement plans',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create bereavement plan
   * POST /bereavement/cases/:id/plans
   */
  async createPlan(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_plans)
        .values({
          ...data,
          bereavement_case_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Bereavement plan created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating bereavement plan:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating bereavement plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // BEREAVEMENT ENCOUNTERS
  // ============================================

  /**
   * Get encounters for a bereavement case
   * GET /bereavement/cases/:id/encounters
   */
  async getCaseEncounters(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select({
          encounter: bereavement_encounters,
          contact: bereavement_contacts
        })
        .from(bereavement_encounters)
        .leftJoin(
          bereavement_contacts,
          eq(bereavement_encounters.bereavement_contact_id, bereavement_contacts.id)
        )
        .where(and(
          eq(bereavement_encounters.bereavement_case_id, parseInt(id)),
          isNull(bereavement_encounters.deleted_at)
        ))
        .orderBy(desc(bereavement_encounters.encounter_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching bereavement encounters:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching bereavement encounters',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create bereavement encounter
   * POST /bereavement/cases/:id/encounters
   */
  async createEncounter(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_encounters)
        .values({
          ...data,
          bereavement_case_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Bereavement encounter created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating bereavement encounter:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating bereavement encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // RISK ASSESSMENTS
  // ============================================

  /**
   * Get risk assessments for a case
   * GET /bereavement/cases/:id/risk-assessments
   */
  async getCaseRiskAssessments(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(bereavement_risk_assessments)
        .where(and(
          eq(bereavement_risk_assessments.bereavement_case_id, parseInt(id)),
          isNull(bereavement_risk_assessments.deleted_at)
        ))
        .orderBy(desc(bereavement_risk_assessments.assessment_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching risk assessments:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching risk assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create risk assessment
   * POST /bereavement/cases/:id/risk-assessments
   */
  async createRiskAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Calculate risk score based on boolean factors
      let riskScore = 0;
      const riskFactors = [
        'sudden_death', 'traumatic_death', 'suicide', 'child_death', 'multiple_losses',
        'history_of_mental_illness', 'history_of_substance_abuse', 'limited_social_support',
        'financial_stress', 'caregiver_burden', 'prolonged_grief', 'depression_symptoms',
        'anxiety_symptoms', 'suicidal_ideation', 'functional_impairment'
      ];

      riskFactors.forEach(factor => {
        if (data[factor] === true) {
          riskScore++;
        }
      });

      // Determine risk level
      let riskLevel = 'LOW';
      if (riskScore >= 8) {
        riskLevel = 'HIGH';
      } else if (riskScore >= 4) {
        riskLevel = 'MODERATE';
      }

      const result = await db
        .insert(bereavement_risk_assessments)
        .values({
          ...data,
          total_risk_score: riskScore,
          risk_level: data.risk_level || riskLevel,
          bereavement_case_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Risk assessment created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating risk assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating risk assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // SUPPORT GROUPS
  // ============================================

  /**
   * Get all support groups
   * GET /bereavement/support-groups
   */
  async getAllSupportGroups(request, reply) {
    try {
      const { group_status, group_type } = request.query;

      let query = db
        .select()
        .from(support_groups)
        .where(isNull(support_groups.deleted_at));

      const filters = [];
      if (group_status) {
        filters.push(eq(support_groups.group_status, group_status));
      }
      if (group_type) {
        filters.push(eq(support_groups.group_type, group_type));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(support_groups.group_name);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching support groups:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching support groups',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create support group
   * POST /bereavement/support-groups
   */
  async createSupportGroup(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(support_groups)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Support group created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating support group:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating support group',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get support group sessions
   * GET /bereavement/support-groups/:id/sessions
   */
  async getSupportGroupSessions(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(support_group_sessions)
        .where(and(
          eq(support_group_sessions.support_group_id, parseInt(id)),
          isNull(support_group_sessions.deleted_at)
        ))
        .orderBy(desc(support_group_sessions.session_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching support group sessions:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching support group sessions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create support group session
   * POST /bereavement/support-groups/:id/sessions
   */
  async createSupportGroupSession(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(support_group_sessions)
        .values({
          ...data,
          support_group_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Support group session created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating support group session:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating support group session',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // FOLLOW-UP TRACKING
  // ============================================

  /**
   * Get follow-ups for a bereavement case
   * GET /bereavement/cases/:id/follow-ups
   */
  async getCaseFollowUps(request, reply) {
    try {
      const { id } = request.params;
      const { status, milestone_type } = request.query;

      let query = db
        .select({
          follow_up: bereavement_follow_ups,
          contact: bereavement_contacts
        })
        .from(bereavement_follow_ups)
        .leftJoin(
          bereavement_contacts,
          eq(bereavement_follow_ups.bereavement_contact_id, bereavement_contacts.id)
        )
        .where(and(
          eq(bereavement_follow_ups.bereavement_case_id, parseInt(id)),
          isNull(bereavement_follow_ups.deleted_at)
        ));

      const filters = [];
      if (status) {
        filters.push(eq(bereavement_follow_ups.follow_up_status, status));
      }
      if (milestone_type) {
        filters.push(eq(bereavement_follow_ups.milestone_type, milestone_type));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(bereavement_follow_ups.scheduled_date);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching follow-ups:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching follow-ups',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create follow-up for a bereavement case
   * POST /bereavement/cases/:id/follow-ups
   */
  async createFollowUp(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_follow_ups)
        .values({
          ...data,
          bereavement_case_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Follow-up created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating follow-up:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating follow-up',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update follow-up
   * PATCH /bereavement/follow-ups/:id
   */
  async updateFollowUp(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_follow_ups)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_follow_ups.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Follow-up not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Follow-up updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating follow-up:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating follow-up',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Generate scheduled follow-ups for a bereavement case (standard milestones)
   * POST /bereavement/cases/:id/follow-ups/generate
   */
  async generateStandardFollowUps(request, reply) {
    try {
      const { id } = request.params;
      const { contact_id } = request.body;

      // Get the bereavement case to find the date of death
      const caseResult = await db
        .select()
        .from(bereavement_cases)
        .where(eq(bereavement_cases.id, parseInt(id)))
        .limit(1);

      if (!caseResult[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Bereavement case not found'
        };
      }

      const deathDate = new Date(caseResult[0].date_of_death);

      // Standard follow-up milestones
      const milestones = [
        { type: '1_WEEK', days: 7 },
        { type: '1_MONTH', days: 30 },
        { type: '3_MONTHS', days: 90 },
        { type: '6_MONTHS', days: 180 },
        { type: '1_YEAR', days: 365 }
      ];

      const followUps = milestones.map(milestone => {
        const scheduledDate = new Date(deathDate);
        scheduledDate.setDate(scheduledDate.getDate() + milestone.days);
        return {
          bereavement_case_id: parseInt(id),
          bereavement_contact_id: contact_id ? parseInt(contact_id) : null,
          milestone_type: milestone.type,
          scheduled_date: scheduledDate.toISOString().split('T')[0],
          follow_up_status: 'SCHEDULED',
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        };
      });

      const results = await db
        .insert(bereavement_follow_ups)
        .values(followUps)
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Standard follow-ups generated successfully',
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error generating follow-ups:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error generating follow-ups',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // RESOURCE TRACKING
  // ============================================

  /**
   * Get resources for a bereavement case
   * GET /bereavement/cases/:id/resources
   */
  async getCaseResources(request, reply) {
    try {
      const { id } = request.params;
      const { resource_type } = request.query;

      let query = db
        .select({
          resource: bereavement_resources,
          contact: bereavement_contacts
        })
        .from(bereavement_resources)
        .leftJoin(
          bereavement_contacts,
          eq(bereavement_resources.bereavement_contact_id, bereavement_contacts.id)
        )
        .where(and(
          eq(bereavement_resources.bereavement_case_id, parseInt(id)),
          isNull(bereavement_resources.deleted_at)
        ));

      if (resource_type) {
        query = query.where(eq(bereavement_resources.resource_type, resource_type));
      }

      const results = await query.orderBy(desc(bereavement_resources.date_provided));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching resources:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching resources',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add resource to a bereavement case
   * POST /bereavement/cases/:id/resources
   */
  async addResource(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_resources)
        .values({
          ...data,
          bereavement_case_id: parseInt(id),
          provided_by_id: request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Resource added successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding resource:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding resource',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update resource
   * PATCH /bereavement/resources/:id
   */
  async updateResource(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_resources)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_resources.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Resource not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Resource updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating resource:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating resource',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // MEMORIAL SERVICES
  // ============================================

  /**
   * Get all memorial services
   * GET /bereavement/memorial-services
   */
  async getAllMemorialServices(request, reply) {
    try {
      const { service_status, service_type } = request.query;

      let query = db
        .select()
        .from(bereavement_memorial_services)
        .where(isNull(bereavement_memorial_services.deleted_at));

      const filters = [];
      if (service_status) {
        filters.push(eq(bereavement_memorial_services.service_status, service_status));
      }
      if (service_type) {
        filters.push(eq(bereavement_memorial_services.service_type, service_type));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(desc(bereavement_memorial_services.service_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching memorial services:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching memorial services',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create memorial service
   * POST /bereavement/memorial-services
   */
  async createMemorialService(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(bereavement_memorial_services)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Memorial service created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating memorial service:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating memorial service',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get memorial service by ID
   * GET /bereavement/memorial-services/:id
   */
  async getMemorialServiceById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(bereavement_memorial_services)
        .where(and(
          eq(bereavement_memorial_services.id, parseInt(id)),
          isNull(bereavement_memorial_services.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Memorial service not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching memorial service:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching memorial service',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update memorial service
   * PATCH /bereavement/memorial-services/:id
   */
  async updateMemorialService(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_memorial_services)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_memorial_services.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Memorial service not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Memorial service updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating memorial service:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating memorial service',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get attendees for a memorial service
   * GET /bereavement/memorial-services/:id/attendees
   */
  async getMemorialServiceAttendees(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select({
          attendee: bereavement_memorial_attendees,
          contact: bereavement_contacts
        })
        .from(bereavement_memorial_attendees)
        .leftJoin(
          bereavement_contacts,
          eq(bereavement_memorial_attendees.bereavement_contact_id, bereavement_contacts.id)
        )
        .where(and(
          eq(bereavement_memorial_attendees.memorial_service_id, parseInt(id)),
          isNull(bereavement_memorial_attendees.deleted_at)
        ))
        .orderBy(bereavement_memorial_attendees.attendee_name);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching memorial service attendees:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching memorial service attendees',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Register attendee for a memorial service
   * POST /bereavement/memorial-services/:id/attendees
   */
  async registerMemorialServiceAttendee(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(bereavement_memorial_attendees)
        .values({
          ...data,
          memorial_service_id: parseInt(id),
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Attendee registered successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error registering attendee:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error registering attendee',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update attendee registration
   * PATCH /bereavement/memorial-attendees/:id
   */
  async updateMemorialServiceAttendee(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_memorial_attendees)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_memorial_attendees.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Attendee registration not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Attendee registration updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating attendee registration:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating attendee registration',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // CONTACT UPDATES (Enhanced)
  // ============================================

  /**
   * Update contact information
   * PATCH /bereavement/contacts/:id
   */
  async updateContact(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_contacts)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_contacts.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Contact not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Contact updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating contact:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating contact',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update contact grief assessment
   * PATCH /bereavement/contacts/:id/grief-assessment
   */
  async updateContactGriefAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_contacts)
        .set({
          grief_assessment_score: data.grief_assessment_score,
          grief_assessment_tool: data.grief_assessment_tool,
          grief_assessment_date: data.grief_assessment_date || new Date().toISOString().split('T')[0],
          grief_stage: data.grief_stage,
          grief_notes: data.grief_notes,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_contacts.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Contact not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Grief assessment updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating grief assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating grief assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update contact consent
   * PATCH /bereavement/contacts/:id/consent
   */
  async updateContactConsent(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(bereavement_contacts)
        .set({
          consent_status: data.consent_status,
          consent_date: data.consent_date || new Date().toISOString().split('T')[0],
          consent_signature: data.consent_signature,
          privacy_preferences: data.privacy_preferences,
          can_share_info: data.can_share_info,
          can_contact_via_phone: data.can_contact_via_phone,
          can_contact_via_email: data.can_contact_via_email,
          can_contact_via_mail: data.can_contact_via_mail,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_contacts.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Contact not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Consent updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating consent:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating consent',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // DOCUMENT MANAGEMENT
  // ============================================

  /**
   * Get documents for a bereavement case
   * GET /bereavement/cases/:id/documents
   */
  async getCaseDocuments(request, reply) {
    try {
      const { id } = request.params;
      const { document_type, document_status, limit = 50, offset = 0 } = request.query;
      const caseId = parseInt(id);

      if (isNaN(caseId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid case ID provided'
          }
        };
      }

      const parsedLimit = Math.min(parseInt(limit) || 50, 100);
      const parsedOffset = parseInt(offset) || 0;

      const filters = [
        eq(bereavement_documents.bereavement_case_id, caseId),
        isNull(bereavement_documents.deleted_at)
      ];

      if (document_type) {
        filters.push(eq(bereavement_documents.document_type, document_type));
      }
      if (document_status) {
        filters.push(eq(bereavement_documents.document_status, document_status));
      }

      const results = await db
        .select()
        .from(bereavement_documents)
        .where(and(...filters))
        .orderBy(desc(bereavement_documents.createdAt))
        .limit(parsedLimit)
        .offset(parsedOffset);

      const totalCount = await db
        .select({ value: count() })
        .from(bereavement_documents)
        .where(and(...filters));

      reply.code(200);
      return {
        success: true,
        status: 200,
        data: results,
        count: results.length,
        total: totalCount[0]?.value || 0,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          hasMore: parsedOffset + results.length < (totalCount[0]?.value || 0)
        }
      };
    } catch (error) {
      logger.error('Error fetching documents:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'FETCH_ERROR',
          message: 'Error fetching documents'
        }
      };
    }
  }

  /**
   * Add document to bereavement case
   * POST /bereavement/cases/:id/documents
   *
   * Note: This endpoint records document metadata. File upload should be handled
   * separately via a file upload service that returns the file_path.
   */
  async addDocument(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const caseId = parseInt(id);

      if (isNaN(caseId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid case ID provided'
          }
        };
      }

      // Validate required fields
      const errors = [];
      if (!data.document_type) {
        errors.push({ field: 'document_type', message: 'Document type is required' });
      } else if (!ALLOWED_DOCUMENT_TYPES.includes(data.document_type)) {
        errors.push({ field: 'document_type', message: `Invalid document type. Must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}` });
      }
      if (!data.document_name) {
        errors.push({ field: 'document_name', message: 'Document name is required' });
      }
      if (!data.file_name) {
        errors.push({ field: 'file_name', message: 'File name is required' });
      }
      if (!data.file_path) {
        errors.push({ field: 'file_path', message: 'File path is required' });
      }

      // Validate file type if provided
      if (data.file_type && !ALLOWED_MIME_TYPES.includes(data.file_type)) {
        errors.push({ field: 'file_type', message: `Invalid file type. Allowed types: ${ALLOWED_MIME_TYPES.join(', ')}` });
      }

      // Validate file size if provided
      if (data.file_size && data.file_size > MAX_FILE_SIZE) {
        errors.push({ field: 'file_size', message: `File size exceeds maximum allowed (${MAX_FILE_SIZE / 1024 / 1024}MB)` });
      }

      if (errors.length > 0) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Validation failed',
            fields: errors
          }
        };
      }

      // Verify case exists
      const existingCase = await db
        .select()
        .from(bereavement_cases)
        .where(and(
          eq(bereavement_cases.id, caseId),
          isNull(bereavement_cases.deleted_at)
        ))
        .limit(1);

      if (!existingCase[0]) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Bereavement case not found'
          }
        };
      }

      const result = await db
        .insert(bereavement_documents)
        .values({
          ...data,
          bereavement_case_id: caseId,
          uploaded_by_id: request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Log audit entry
      await logBereavementAudit(
        request,
        'CREATE',
        'bereavement_documents',
        result[0].id,
        caseId,
        { document_type: data.document_type, document_name: data.document_name }
      );

      reply.code(201);
      return {
        success: true,
        status: 201,
        message: 'Document added successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding document:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'CREATE_ERROR',
          message: 'Error adding document'
        }
      };
    }
  }

  /**
   * Get document by ID
   * GET /bereavement/documents/:id
   */
  async getDocumentById(request, reply) {
    try {
      const { id } = request.params;
      const docId = parseInt(id);

      if (isNaN(docId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid document ID provided'
          }
        };
      }

      const result = await db
        .select()
        .from(bereavement_documents)
        .where(and(
          eq(bereavement_documents.id, docId),
          isNull(bereavement_documents.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Document not found'
          }
        };
      }

      reply.code(200);
      return {
        success: true,
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching document:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'FETCH_ERROR',
          message: 'Error fetching document'
        }
      };
    }
  }

  /**
   * Update document metadata
   * PATCH /bereavement/documents/:id
   */
  async updateDocument(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const docId = parseInt(id);

      if (isNaN(docId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid document ID provided'
          }
        };
      }

      // Fetch existing document
      const existing = await db
        .select()
        .from(bereavement_documents)
        .where(and(
          eq(bereavement_documents.id, docId),
          isNull(bereavement_documents.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Document not found'
          }
        };
      }

      // Remove immutable fields
      const { id: _, bereavement_case_id, createdAt, deleted_at, uploaded_by_id, created_by_id, ...safeData } = data;

      // Validate document type if being changed
      if (safeData.document_type && !ALLOWED_DOCUMENT_TYPES.includes(safeData.document_type)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid document type. Must be one of: ${ALLOWED_DOCUMENT_TYPES.join(', ')}`
          }
        };
      }

      const changes = calculateChanges(existing[0], safeData);

      const result = await db
        .update(bereavement_documents)
        .set({
          ...safeData,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_documents.id, docId))
        .returning();

      // Log audit entry
      if (changes) {
        await logBereavementAudit(
          request,
          'UPDATE',
          'bereavement_documents',
          docId,
          existing[0].bereavement_case_id,
          changes
        );
      }

      reply.code(200);
      return {
        success: true,
        status: 200,
        message: 'Document updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating document:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'UPDATE_ERROR',
          message: 'Error updating document'
        }
      };
    }
  }

  /**
   * Delete document (soft delete)
   * DELETE /bereavement/documents/:id
   */
  async deleteDocument(request, reply) {
    try {
      const { id } = request.params;
      const { reason } = request.body || {};
      const docId = parseInt(id);

      if (isNaN(docId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid document ID provided'
          }
        };
      }

      // Fetch existing document
      const existing = await db
        .select()
        .from(bereavement_documents)
        .where(and(
          eq(bereavement_documents.id, docId),
          isNull(bereavement_documents.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Document not found'
          }
        };
      }

      const result = await db
        .update(bereavement_documents)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_documents.id, docId))
        .returning();

      // Log audit entry
      await logBereavementAudit(
        request,
        'DELETE',
        'bereavement_documents',
        docId,
        existing[0].bereavement_case_id,
        { reason: reason || 'No reason provided', document_name: existing[0].document_name }
      );

      reply.code(200);
      return {
        success: true,
        status: 200,
        message: 'Document deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting document:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'DELETE_ERROR',
          message: 'Error deleting document'
        }
      };
    }
  }

  /**
   * Verify document
   * POST /bereavement/documents/:id/verify
   */
  async verifyDocument(request, reply) {
    try {
      const { id } = request.params;
      const { verification_notes, document_status = 'VERIFIED' } = request.body || {};
      const docId = parseInt(id);

      if (isNaN(docId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid document ID provided'
          }
        };
      }

      const validStatuses = ['VERIFIED', 'APPROVED', 'REJECTED'];
      if (!validStatuses.includes(document_status)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: 'VALIDATION_ERROR',
            message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
          }
        };
      }

      // Fetch existing document
      const existing = await db
        .select()
        .from(bereavement_documents)
        .where(and(
          eq(bereavement_documents.id, docId),
          isNull(bereavement_documents.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: 'NOT_FOUND',
            message: 'Document not found'
          }
        };
      }

      const result = await db
        .update(bereavement_documents)
        .set({
          document_status,
          verification_date: new Date().toISOString().split('T')[0],
          verified_by_id: request.user?.id,
          verification_notes,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(bereavement_documents.id, docId))
        .returning();

      // Log audit entry
      await logBereavementAudit(
        request,
        'STATUS_CHANGE',
        'bereavement_documents',
        docId,
        existing[0].bereavement_case_id,
        {
          document_status: {
            old: existing[0].document_status,
            new: document_status
          },
          verification_notes
        }
      );

      reply.code(200);
      return {
        success: true,
        status: 200,
        message: `Document ${document_status.toLowerCase()} successfully`,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error verifying document:', error)
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: 'VERIFY_ERROR',
          message: 'Error verifying document'
        }
      };
    }
  }
}

export default new BereavementController();
