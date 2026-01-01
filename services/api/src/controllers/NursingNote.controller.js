/**
 * Nursing Note Controller
 *
 * Manages nursing note documentation with comprehensive HIPAA compliance,
 * audit logging, and 21 CFR Part 11 signature compliance.
 *
 * Features:
 * - Full CRUD operations with soft delete
 * - Pagination with total counts
 * - Comprehensive filtering (patient, nurse, date range, status, note type)
 * - 21 CFR Part 11 electronic signature compliance
 * - Amendment tracking for signed notes
 * - Cosignature support for supervision
 * - Time-based modification restrictions
 * - HIPAA-compliant audit logging
 */

import { db } from '../config/db.drizzle.js';
import { nursing_clinical_notes, patients, users } from '../db/schemas/index.js';
import { eq, and, desc, or, isNull, gte, lte, sql, count } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';
import { hipaaLogger } from '../utils/hipaaLogger.js';

// Valid note types
const VALID_NOTE_TYPES = ['ASSESSMENT', 'PROGRESS', 'DISCHARGE', 'ADMISSION', 'ROUTINE', 'PRN'];

// Valid note statuses
const VALID_STATUSES = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'PENDING_SIGNATURE', 'SIGNED', 'COSIGNED', 'AMENDED', 'VOID'];

// Maximum note content length
const MAX_CONTENT_LENGTH = 10000;

// Note modification threshold in hours (24 hours without supervisor approval)
const MODIFICATION_THRESHOLD_HOURS = 24;

/**
 * Nursing Note Controller
 * Manages clinical nursing documentation
 */
class NursingNoteController {
  /**
   * Get all nursing notes (with pagination and filters)
   * GET /nursing-notes
   *
   * Query Parameters:
   * - patient_id: Filter by patient
   * - nurse_id: Filter by nurse
   * - note_type: Filter by note type (ASSESSMENT, PROGRESS, DISCHARGE)
   * - status: Filter by status
   * - date_from: Filter notes from this date (ISO format)
   * - date_to: Filter notes up to this date (ISO format)
   * - limit: Number of records to return (default 20, max 100)
   * - offset: Number of records to skip for pagination
   * - page: Page number (alternative to offset)
   * - sort: Sort field (note_timestamp, createdAt)
   * - order: Sort order (asc, desc - default desc)
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        nurse_id,
        note_type,
        status,
        date_from,
        date_to,
        limit = 20,
        offset,
        page = 1,
        sort = 'note_timestamp',
        order = 'desc'
      } = request.query;

      // Build filter conditions
      const conditions = [isNull(nursing_clinical_notes.deleted_at)];

      if (patient_id) {
        conditions.push(eq(nursing_clinical_notes.patient_id, parseInt(patient_id)));
      }
      if (nurse_id) {
        conditions.push(eq(nursing_clinical_notes.nurse_id, nurse_id));
      }
      if (note_type) {
        // Validate note_type
        if (!VALID_NOTE_TYPES.includes(note_type.toUpperCase())) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid note type',
            error: {
              code: 'VALIDATION_ERROR',
              field: 'note_type',
              validValues: VALID_NOTE_TYPES
            }
          };
        }
        conditions.push(eq(nursing_clinical_notes.note_status, note_type.toUpperCase()));
      }
      if (status) {
        if (!VALID_STATUSES.includes(status.toUpperCase())) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid status',
            error: {
              code: 'VALIDATION_ERROR',
              field: 'status',
              validValues: VALID_STATUSES
            }
          };
        }
        conditions.push(eq(nursing_clinical_notes.note_status, status.toUpperCase()));
      }
      if (date_from) {
        const fromDate = new Date(date_from);
        if (isNaN(fromDate.getTime())) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid date_from format',
            error: { code: 'VALIDATION_ERROR', field: 'date_from' }
          };
        }
        conditions.push(gte(nursing_clinical_notes.note_timestamp, fromDate));
      }
      if (date_to) {
        const toDate = new Date(date_to);
        if (isNaN(toDate.getTime())) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid date_to format',
            error: { code: 'VALIDATION_ERROR', field: 'date_to' }
          };
        }
        conditions.push(lte(nursing_clinical_notes.note_timestamp, toDate));
      }

      // Get total count for pagination
      const totalCountResult = await db
        .select({ value: count() })
        .from(nursing_clinical_notes)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.value || 0;

      // Validate and cap limit
      const parsedLimit = Math.min(Math.max(1, parseInt(limit) || 20), 100);

      // Calculate offset from page if offset not provided
      const parsedOffset = offset !== undefined
        ? parseInt(offset) || 0
        : (Math.max(1, parseInt(page) || 1) - 1) * parsedLimit;

      // Determine sort order
      const sortColumn = sort === 'createdAt' ? nursing_clinical_notes.createdAt : nursing_clinical_notes.note_timestamp;
      const sortOrder = order === 'asc' ? sortColumn : desc(sortColumn);

      const results = await db
        .select()
        .from(nursing_clinical_notes)
        .where(and(...conditions))
        .orderBy(sortOrder)
        .limit(parsedLimit)
        .offset(parsedOffset);

      // Log audit for PHI access
      await logAudit(request, 'READ', 'nursing_clinical_notes', null);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        total: totalCount,
        pagination: {
          limit: parsedLimit,
          offset: parsedOffset,
          page: Math.floor(parsedOffset / parsedLimit) + 1,
          totalPages: Math.ceil(totalCount / parsedLimit),
          hasMore: parsedOffset + results.length < totalCount
        }
      };
    } catch (error) {
      hipaaLogger.error('Error fetching nursing notes', { context: 'NursingNoteController.index', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching nursing notes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create new nursing note
   * POST /nursing-notes
   *
   * Required fields:
   * - patient_id: Patient ID (must exist)
   * - note_content or content: Main note content
   * - note_timestamp or note_date: When the note was created
   *
   * Optional fields:
   * - nurse_id: Nurse ID (defaults to current user)
   * - note_type: Type of note (ASSESSMENT, PROGRESS, DISCHARGE)
   * - subjective, objective, assessment, plan: SOAP sections
   * - interventions, patient_response, patient_education, communication
   */
  async store(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.patient_id) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required field: patient_id',
          error: {
            code: 'VALIDATION_ERROR',
            fields: ['patient_id']
          }
        };
      }

      // Validate note content length
      const contentFields = ['content', 'subjective', 'objective', 'assessment', 'plan',
        'interventions', 'patient_response', 'patient_education', 'communication'];
      for (const field of contentFields) {
        if (data[field] && data[field].length > MAX_CONTENT_LENGTH) {
          reply.code(400);
          return {
            status: 400,
            message: `${field} exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
            error: {
              code: 'VALIDATION_ERROR',
              field: field,
              maxLength: MAX_CONTENT_LENGTH
            }
          };
        }
      }

      // Validate timestamp is not in future
      const noteTimestamp = data.note_timestamp ? new Date(data.note_timestamp) : new Date();
      if (noteTimestamp > new Date()) {
        reply.code(400);
        return {
          status: 400,
          message: 'Note timestamp cannot be in the future',
          error: { code: 'VALIDATION_ERROR', field: 'note_timestamp' }
        };
      }

      // Verify patient exists
      const patient = await db
        .select({ id: patients.id, status: patients.status })
        .from(patients)
        .where(eq(patients.id, parseInt(data.patient_id)))
        .limit(1);

      if (!patient[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Patient not found',
          error: { code: 'PATIENT_NOT_FOUND' }
        };
      }

      // Verify nurse exists if provided
      if (data.nurse_id) {
        const nurse = await db
          .select({ id: users.id })
          .from(users)
          .where(eq(users.id, data.nurse_id))
          .limit(1);

        if (!nurse[0]) {
          reply.code(404);
          return {
            status: 404,
            message: 'Nurse not found',
            error: { code: 'NURSE_NOT_FOUND' }
          };
        }
      }

      // Prevent immutable field injection
      const { id, createdAt, deleted_at, signature_hash, signed_at, signed_by_id,
              cosigned_at, cosigned_by_id, amended, amended_at, amended_by_id, ...safeData } = data;

      const result = await db
        .insert(nursing_clinical_notes)
        .values({
          ...safeData,
          patient_id: parseInt(data.patient_id),
          nurse_id: data.nurse_id || request.user?.id,
          nurse_name: data.nurse_name || `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim(),
          nurse_credentials: data.nurse_credentials || request.user?.credentials || null,
          note_status: data.note_status || 'DRAFT',
          note_timestamp: noteTimestamp,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Log audit for PHI creation
      await logAudit(request, 'CREATE', 'nursing_clinical_notes', result[0].id);
      hipaaLogger.dbOperation('create', 'nursing_clinical_notes', result[0].id);

      reply.code(201);
      reply.header('Location', `/api/nursing-notes/${result[0].id}`);
      return {
        status: 201,
        message: 'Nursing note created successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error creating nursing note', { context: 'NursingNoteController.store', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating nursing note',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get nursing note by ID
   * GET /nursing-notes/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      // Validate ID parameter
      const noteId = parseInt(id);
      if (isNaN(noteId)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid nursing note ID',
          error: { code: 'INVALID_ID' }
        };
      }

      const result = await db
        .select()
        .from(nursing_clinical_notes)
        .where(and(
          eq(nursing_clinical_notes.id, noteId),
          isNull(nursing_clinical_notes.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Nursing note not found',
          error: { code: 'NOTE_NOT_FOUND' }
        };
      }

      // Log audit for PHI access
      await logAudit(request, 'READ', 'nursing_clinical_notes', noteId);

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error fetching nursing note', { context: 'NursingNoteController.show', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching nursing note',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update nursing note
   * PUT/PATCH /nursing-notes/:id
   *
   * Notes older than 24 hours require supervisor approval (note_status check).
   * Signed/cosigned notes cannot be updated - use amendments instead.
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate ID parameter
      const noteId = parseInt(id);
      if (isNaN(noteId)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid nursing note ID',
          error: { code: 'INVALID_ID' }
        };
      }

      const existing = await db
        .select()
        .from(nursing_clinical_notes)
        .where(and(
          eq(nursing_clinical_notes.id, noteId),
          isNull(nursing_clinical_notes.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Nursing note not found',
          error: { code: 'NOTE_NOT_FOUND' }
        };
      }

      // Don't allow updates to signed/cosigned notes (must use amendments)
      if (['SIGNED', 'COSIGNED'].includes(existing[0].note_status)) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update signed notes. Use amendments instead.',
          error: { code: 'SIGNED_NOTE_IMMUTABLE' }
        };
      }

      // Check time-based modification restriction (24 hours)
      const noteCreatedAt = new Date(existing[0].createdAt);
      const hoursSinceCreation = (Date.now() - noteCreatedAt.getTime()) / (1000 * 60 * 60);

      if (hoursSinceCreation > MODIFICATION_THRESHOLD_HOURS) {
        // Check if user is supervisor/admin
        const userRole = request.user?.role?.toLowerCase();
        if (!['admin', 'supervisor', 'doctor'].includes(userRole)) {
          reply.code(422);
          return {
            status: 422,
            message: `Notes older than ${MODIFICATION_THRESHOLD_HOURS} hours require supervisor approval`,
            error: {
              code: 'MODIFICATION_THRESHOLD_EXCEEDED',
              hoursOld: Math.round(hoursSinceCreation),
              thresholdHours: MODIFICATION_THRESHOLD_HOURS
            }
          };
        }
      }

      // Validate note content length
      const contentFields = ['content', 'subjective', 'objective', 'assessment', 'plan',
        'interventions', 'patient_response', 'patient_education', 'communication'];
      for (const field of contentFields) {
        if (data[field] && data[field].length > MAX_CONTENT_LENGTH) {
          reply.code(400);
          return {
            status: 400,
            message: `${field} exceeds maximum length of ${MAX_CONTENT_LENGTH} characters`,
            error: {
              code: 'VALIDATION_ERROR',
              field: field,
              maxLength: MAX_CONTENT_LENGTH
            }
          };
        }
      }

      // Validate timestamp if provided
      if (data.note_timestamp) {
        const noteTimestamp = new Date(data.note_timestamp);
        if (noteTimestamp > new Date()) {
          reply.code(400);
          return {
            status: 400,
            message: 'Note timestamp cannot be in the future',
            error: { code: 'VALIDATION_ERROR', field: 'note_timestamp' }
          };
        }
      }

      // Remove immutable fields from update data
      const {
        id: _id,
        patient_id: _patientId,
        created_by_id: _createdById,
        createdAt: _createdAt,
        signature_hash: _signatureHash,
        signed_at: _signedAt,
        signed_by_id: _signedById,
        cosigned_at: _cosignedAt,
        cosigned_by_id: _cosignedById,
        deleted_at: _deletedAt,
        amended: _amended,
        amended_at: _amendedAt,
        amended_by_id: _amendedById,
        amendment_reason: _amendmentReason,
        ...safeData
      } = data;

      // Parse note_timestamp if provided
      if (safeData.note_timestamp) {
        safeData.note_timestamp = new Date(safeData.note_timestamp);
      }

      const result = await db
        .update(nursing_clinical_notes)
        .set({
          ...safeData,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(nursing_clinical_notes.id, noteId))
        .returning();

      // Log audit for PHI update
      await logAudit(request, 'UPDATE', 'nursing_clinical_notes', noteId);
      hipaaLogger.dbOperation('update', 'nursing_clinical_notes', noteId);

      reply.code(200);
      return {
        status: 200,
        message: 'Nursing note updated successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error updating nursing note', { context: 'NursingNoteController.update', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating nursing note',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete nursing note (soft delete)
   * DELETE /nursing-notes/:id
   *
   * Only unsigned notes can be deleted.
   * Signed notes cannot be deleted for compliance.
   */
  async destroy(request, reply) {
    try {
      const { id } = request.params;

      // Validate ID parameter
      const noteId = parseInt(id);
      if (isNaN(noteId)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid nursing note ID',
          error: { code: 'INVALID_ID' }
        };
      }

      const existing = await db
        .select()
        .from(nursing_clinical_notes)
        .where(and(
          eq(nursing_clinical_notes.id, noteId),
          isNull(nursing_clinical_notes.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Nursing note not found',
          error: { code: 'NOTE_NOT_FOUND' }
        };
      }

      // Only allow deletion of unsigned notes
      if (['SIGNED', 'COSIGNED', 'AMENDED'].includes(existing[0].note_status)) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete signed clinical records. Signed records must be retained for compliance.',
          error: { code: 'SIGNED_NOTE_PROTECTED' }
        };
      }

      // Soft delete the note
      await db
        .update(nursing_clinical_notes)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(nursing_clinical_notes.id, noteId));

      // Log audit for PHI deletion
      await logAudit(request, 'DELETE', 'nursing_clinical_notes', noteId);
      hipaaLogger.dbOperation('delete', 'nursing_clinical_notes', noteId);
      hipaaLogger.security('NURSING_NOTE_DELETED', {
        noteId,
        deletedBy: request.user?.id
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Nursing note deleted successfully'
      };
    } catch (error) {
      hipaaLogger.error('Error deleting nursing note', { context: 'NursingNoteController.destroy', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting nursing note',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign nursing note (21 CFR Part 11 compliance)
   * POST /nursing-notes/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      // Validate ID parameter
      const noteId = parseInt(id);
      if (isNaN(noteId)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid nursing note ID',
          error: { code: 'INVALID_ID' }
        };
      }

      const existing = await db
        .select()
        .from(nursing_clinical_notes)
        .where(and(
          eq(nursing_clinical_notes.id, noteId),
          isNull(nursing_clinical_notes.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Nursing note not found',
          error: { code: 'NOTE_NOT_FOUND' }
        };
      }

      if (['SIGNED', 'COSIGNED'].includes(existing[0].note_status)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Note is already signed',
          error: { code: 'ALREADY_SIGNED' }
        };
      }

      // Generate signature hash (21 CFR Part 11)
      const dataToSign = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        content: existing[0].content,
        subjective: existing[0].subjective,
        objective: existing[0].objective,
        assessment: existing[0].assessment,
        plan: existing[0].plan,
        signed_at: new Date().toISOString()
      });
      const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      const result = await db
        .update(nursing_clinical_notes)
        .set({
          note_status: 'SIGNED',
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          signature_hash: signatureHash,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(nursing_clinical_notes.id, noteId))
        .returning();

      // Log audit for clinical note signing (critical for 21 CFR Part 11)
      await logAudit(request, 'SIGN', 'nursing_clinical_notes', noteId);
      hipaaLogger.security('NURSING_NOTE_SIGNED', {
        noteId,
        signedBy: request.user?.id,
        signatureHash
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Nursing note signed successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error signing nursing note', { context: 'NursingNoteController.sign', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing nursing note',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Cosign nursing note (for supervision)
   * POST /nursing-notes/:id/cosign
   */
  async cosign(request, reply) {
    try {
      const { id } = request.params;

      // Validate ID parameter
      const noteId = parseInt(id);
      if (isNaN(noteId)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid nursing note ID',
          error: { code: 'INVALID_ID' }
        };
      }

      const existing = await db
        .select()
        .from(nursing_clinical_notes)
        .where(and(
          eq(nursing_clinical_notes.id, noteId),
          isNull(nursing_clinical_notes.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Nursing note not found',
          error: { code: 'NOTE_NOT_FOUND' }
        };
      }

      if (existing[0].note_status !== 'SIGNED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Note must be signed before cosigning',
          error: { code: 'NOT_SIGNED' }
        };
      }

      if (existing[0].note_status === 'COSIGNED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Note is already cosigned',
          error: { code: 'ALREADY_COSIGNED' }
        };
      }

      const result = await db
        .update(nursing_clinical_notes)
        .set({
          note_status: 'COSIGNED',
          cosigned_at: new Date(),
          cosigned_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(nursing_clinical_notes.id, noteId))
        .returning();

      // Log audit for cosigning
      await logAudit(request, 'COSIGN', 'nursing_clinical_notes', noteId);
      hipaaLogger.security('NURSING_NOTE_COSIGNED', {
        noteId,
        cosignedBy: request.user?.id
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Nursing note cosigned successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error cosigning nursing note', { context: 'NursingNoteController.cosign', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error cosigning nursing note',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add amendment to signed nursing note
   * POST /nursing-notes/:id/amend
   *
   * Body:
   * - amendment_reason: Required - Reason for the amendment
   * - amended_content: Updated content (for specific field being amended)
   */
  async amend(request, reply) {
    try {
      const { id } = request.params;
      const { amendment_reason, amended_content } = request.body;

      // Validate ID parameter
      const noteId = parseInt(id);
      if (isNaN(noteId)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid nursing note ID',
          error: { code: 'INVALID_ID' }
        };
      }

      // Validate amendment_reason
      if (!amendment_reason || amendment_reason.trim().length === 0) {
        reply.code(400);
        return {
          status: 400,
          message: 'Amendment reason is required',
          error: { code: 'VALIDATION_ERROR', field: 'amendment_reason' }
        };
      }

      const existing = await db
        .select()
        .from(nursing_clinical_notes)
        .where(and(
          eq(nursing_clinical_notes.id, noteId),
          isNull(nursing_clinical_notes.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Nursing note not found',
          error: { code: 'NOTE_NOT_FOUND' }
        };
      }

      // Can only amend signed or cosigned notes
      if (!['SIGNED', 'COSIGNED'].includes(existing[0].note_status)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Only signed notes can be amended',
          error: { code: 'NOT_SIGNED' }
        };
      }

      const updateData = {
        note_status: 'AMENDED',
        amended: true,
        amendment_reason: amendment_reason,
        amended_at: new Date(),
        amended_by_id: request.user?.id,
        updated_by_id: request.user?.id,
        updatedAt: new Date()
      };

      // If amended_content is provided, update the content field
      if (amended_content) {
        updateData.content = amended_content;
      }

      const result = await db
        .update(nursing_clinical_notes)
        .set(updateData)
        .where(eq(nursing_clinical_notes.id, noteId))
        .returning();

      // Log audit for amendment (critical for compliance)
      await logAudit(request, 'AMEND', 'nursing_clinical_notes', noteId);
      hipaaLogger.security('NURSING_NOTE_AMENDED', {
        noteId,
        amendedBy: request.user?.id,
        amendmentReason: amendment_reason
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Nursing note amended successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error amending nursing note', { context: 'NursingNoteController.amend', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending nursing note',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get unsigned nursing notes
   * GET /nursing-notes/unsigned
   */
  async getUnsigned(request, reply) {
    try {
      const { nurse_id, limit = 50, offset = 0 } = request.query;

      const conditions = [
        isNull(nursing_clinical_notes.deleted_at),
        or(
          eq(nursing_clinical_notes.note_status, 'COMPLETED'),
          eq(nursing_clinical_notes.note_status, 'PENDING_SIGNATURE')
        )
      ];

      if (nurse_id) {
        conditions.push(eq(nursing_clinical_notes.nurse_id, nurse_id));
      }

      const results = await db
        .select()
        .from(nursing_clinical_notes)
        .where(and(...conditions))
        .orderBy(desc(nursing_clinical_notes.note_timestamp))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Log audit for PHI access
      await logAudit(request, 'READ', 'nursing_clinical_notes', null);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      hipaaLogger.error('Error fetching unsigned nursing notes', { context: 'NursingNoteController.getUnsigned', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching unsigned nursing notes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get patient nursing notes
   * GET /patients/:id/nursing-notes
   */
  async getPatientNotes(request, reply) {
    try {
      const { id } = request.params;
      const { status, limit = 50, offset = 0 } = request.query;

      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid patient ID',
          error: { code: 'INVALID_ID' }
        };
      }

      // Verify patient exists
      const patient = await db
        .select({ id: patients.id })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (!patient[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Patient not found',
          error: { code: 'PATIENT_NOT_FOUND' }
        };
      }

      const conditions = [
        eq(nursing_clinical_notes.patient_id, patientId),
        isNull(nursing_clinical_notes.deleted_at)
      ];

      if (status) {
        conditions.push(eq(nursing_clinical_notes.note_status, status.toUpperCase()));
      }

      const results = await db
        .select()
        .from(nursing_clinical_notes)
        .where(and(...conditions))
        .orderBy(desc(nursing_clinical_notes.note_timestamp))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Log audit for patient PHI access
      await logAudit(request, 'READ', 'nursing_clinical_notes', null);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      hipaaLogger.error('Error fetching patient nursing notes', { context: 'NursingNoteController.getPatientNotes', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching nursing notes',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new NursingNoteController();
