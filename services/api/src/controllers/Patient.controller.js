import { db } from '../config/db.drizzle.js';
import { patients } from '../db/schemas/index.js';
import { eq, and, or, isNull, gte, lte, desc, asc, like, ilike, count, sql } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';
import { hipaaLogger } from '../utils/hipaaLogger.js';
import { ROLES } from '../config/rbac.js';

/**
 * Patient Controller
 * HIPAA-compliant CRUD operations for patient medical records
 *
 * Features:
 * - Full CRUD operations with role-based access control
 * - Soft delete with deleted_at timestamp
 * - Optimistic locking via version/updated_at
 * - Comprehensive audit logging
 * - Pagination, filtering, and sorting
 * - Duplicate prevention (SSN, MRN)
 */
class PatientController {
  /**
   * Get all patients (with pagination and filters)
   * GET /patients
   *
   * Query Parameters:
   * - first_name: Filter by first name (partial match)
   * - last_name: Filter by last name (partial match)
   * - date_of_birth: Filter by exact date of birth
   * - status: Filter by status (active, inactive, discharged, deceased)
   * - medical_record_number: Filter by MRN
   * - limit: Number of records to return (default 50, max 100)
   * - offset: Number of records to skip for pagination
   * - sort: Sort field (first_name, last_name, date_of_birth, createdAt)
   * - order: Sort order (asc, desc - default desc)
   * - include_deleted: Include soft-deleted records (admin only)
   */
  async index(request, reply) {
    try {
      const {
        first_name,
        last_name,
        date_of_birth,
        status,
        medical_record_number,
        limit = 50,
        offset = 0,
        sort = 'createdAt',
        order = 'desc',
        include_deleted = false
      } = request.query;

      // Build filter conditions
      const conditions = [];

      // Note: deleted_at and status columns don't exist yet - skipping soft delete filter

      // Apply filters
      if (first_name) {
        conditions.push(ilike(patients.first_name, `%${first_name}%`));
      }
      if (last_name) {
        conditions.push(ilike(patients.last_name, `%${last_name}%`));
      }
      if (date_of_birth) {
        conditions.push(eq(patients.date_of_birth, date_of_birth));
      }
      // Note: status and medical_record_number columns don't exist yet

      // Role-based data scoping for patients role (can only see own record)
      if (request.user?.role === ROLES.PATIENT && request.user?.patientId) {
        conditions.push(eq(patients.id, request.user.patientId));
      }

      // Get total count for pagination
      const totalCountResult = await db
        .select({ value: count() })
        .from(patients)
        .where(conditions.length > 0 ? and(...conditions) : undefined);
      const totalCount = totalCountResult[0]?.value || 0;

      // Validate and cap limit
      const parsedLimit = Math.min(parseInt(limit) || 50, 100);
      const parsedOffset = parseInt(offset) || 0;

      // Determine sort column
      let sortColumn;
      switch (sort) {
        case 'first_name':
          sortColumn = patients.first_name;
          break;
        case 'last_name':
          sortColumn = patients.last_name;
          break;
        case 'date_of_birth':
          sortColumn = patients.date_of_birth;
          break;
        default:
          sortColumn = patients.created_at;
      }
      const sortOrder = order === 'asc' ? asc(sortColumn) : desc(sortColumn);

      const results = await db.select({
        id: patients.id,
        first_name: patients.first_name,
        last_name: patients.last_name,
        middle_name: patients.middle_name,
        date_of_birth: patients.date_of_birth,
        gender: patients.gender,
        ssn: patients.ssn,
        patient_pharmacy_id: patients.patient_pharmacy_id,
        primary_diagnosis_id: patients.primary_diagnosis_id,
        race_ethnicity_id: patients.race_ethnicity_id,
        dme_provider_id: patients.dme_provider_id,
        liaison_primary_id: patients.liaison_primary_id,
        liaison_secondary_id: patients.liaison_secondary_id,
        dnr_id: patients.dnr_id,
        emergency_preparedness_level_id: patients.emergency_preparedness_level_id,
        patient_identifier_id: patients.patient_identifier_id,
        created_at: patients.created_at,
        updated_at: patients.updated_at
      })
        .from(patients)
        .where(conditions.length > 0 ? and(...conditions) : undefined)
        .orderBy(sortOrder)
        .limit(parsedLimit)
        .offset(parsedOffset);

      // Log audit for PHI access
      await logAudit(request, 'READ', 'patients', null);

      reply.code(200);
      return {
        success: true,
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
      hipaaLogger.error('Error fetching patients', { context: 'PatientController.index', error });
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error fetching patients'
        }
      };
    }
  }

  /**
   * Create new patient
   * POST /patients
   *
   * Required fields:
   * - first_name: Patient's first name
   * - last_name: Patient's last name
   * - date_of_birth: Date of birth (must be in the past)
   *
   * Optional fields:
   * - All other patient fields (contact info, identifiers, etc.)
   */
  async store(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      const requiredFields = ['first_name', 'last_name', 'date_of_birth'];
      const missingFields = requiredFields.filter(field => !data[field]);

      if (missingFields.length > 0) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Missing required fields',
            fields: missingFields.map(field => ({
              field,
              message: `${field.replace(/_/g, ' ')} is required`
            }))
          }
        };
      }

      // Validate date of birth is in the past
      const dob = new Date(data.date_of_birth);
      if (isNaN(dob.getTime())) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid date format',
            fields: [{ field: 'date_of_birth', message: 'Date of birth must be a valid date' }]
          }
        };
      }
      if (dob >= new Date()) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid date of birth',
            fields: [{ field: 'date_of_birth', message: 'Date of birth must be in the past' }]
          }
        };
      }

      // Validate email format if provided
      if (data.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid email format',
            fields: [{ field: 'email', message: 'Please provide a valid email address' }]
          }
        };
      }

      // Validate phone format if provided (basic validation)
      if (data.primary_phone && !/^[\d\s\-\+\(\)\.]+$/.test(data.primary_phone)) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid phone format',
            fields: [{ field: 'primary_phone', message: 'Please provide a valid phone number' }]
          }
        };
      }

      // Check for duplicate SSN if provided
      if (data.ssn) {
        const existingSSN = await db
          .select({ id: patients.id })
          .from(patients)
          .where(and(
            eq(patients.ssn, data.ssn),
            isNull(patients.deleted_at)
          ))
          .limit(1);

        if (existingSSN.length > 0) {
          reply.code(409);
          return {
            success: false,
            error: {
              code: 'DUPLICATE_RECORD',
              message: 'A patient with this SSN already exists',
              fields: [{ field: 'ssn', message: 'SSN must be unique' }]
            }
          };
        }
      }

      // Check for duplicate medical record number if provided
      if (data.medical_record_number) {
        const existingMRN = await db
          .select({ id: patients.id })
          .from(patients)
          .where(and(
            eq(patients.medical_record_number, data.medical_record_number),
            isNull(patients.deleted_at)
          ))
          .limit(1);

        if (existingMRN.length > 0) {
          reply.code(409);
          return {
            success: false,
            error: {
              code: 'DUPLICATE_RECORD',
              message: 'A patient with this medical record number already exists',
              fields: [{ field: 'medical_record_number', message: 'Medical record number must be unique' }]
            }
          };
        }
      }

      // Prevent immutable field injection
      const { id, createdAt, deleted_at, ...safeData } = data;

      const result = await db
        .insert(patients)
        .values({
          ...safeData,
          status: data.status || 'active',
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Log audit for PHI creation
      await logAudit(request, 'CREATE', 'patients', result[0].id);
      hipaaLogger.dbOperation('create', 'patients', result[0].id);

      reply.code(201).header('Location', `/api/patients/${result[0].id}`);
      return {
        success: true,
        message: 'Patient created successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error creating patient', { context: 'PatientController.store', error });
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error creating patient'
        }
      };
    }
  }

  /**
   * Get patient by ID
   * GET /patients/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      // Validate ID parameter
      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid patient ID format'
          }
        };
      }

      // Role-based access check for patient role
      if (request.user?.role === ROLES.PATIENT && request.user?.patientId !== patientId) {
        reply.code(403);
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'You can only view your own records'
          }
        };
      }

      // Check if admin is requesting deleted records
      const isAdmin = request.user?.role === ROLES.ADMIN;
      const conditions = [eq(patients.id, patientId)];
      if (!isAdmin) {
        conditions.push(isNull(patients.deleted_at));
      }

      const result = await db
        .select({
          id: patients.id,
          first_name: patients.first_name,
          last_name: patients.last_name,
          middle_name: patients.middle_name,
          mi: patients.mi,
          preferred_name: patients.preferred_name,
          suffix: patients.suffix,
          date_of_birth: patients.date_of_birth,
          gender: patients.gender,
          marital_status: patients.marital_status,
          preferred_language: patients.preferred_language,
          ssn: patients.ssn,
          medicare_beneficiary_id: patients.medicare_beneficiary_id,
          medicaid_id: patients.medicaid_id,
          medical_record_number: patients.medical_record_number,
          email: patients.email,
          primary_phone: patients.primary_phone,
          emergency_contact_name: patients.emergency_contact_name,
          emergency_contact_phone: patients.emergency_contact_phone,
          emergency_contact_relationship: patients.emergency_contact_relationship,
          oxygen_dependent: patients.oxygen_dependent,
          patient_consents: patients.patient_consents,
          hipaa_received: patients.hipaa_received,
          veterans_status: patients.veterans_status,
          dme_provider: patients.dme_provider,
          patient_pharmacy_id: patients.patient_pharmacy_id,
          primary_diagnosis_id: patients.primary_diagnosis_id,
          race_ethnicity_id: patients.race_ethnicity_id,
          liaison_primary_id: patients.liaison_primary_id,
          liaison_secondary_id: patients.liaison_secondary_id,
          dnr_id: patients.dnr_id,
          emergency_preparedness_level_id: patients.emergency_preparedness_level_id,
          patient_identifier_id: patients.patient_identifier_id,
          status: patients.status,
          deleted_at: patients.deleted_at,
          createdAt: patients.createdAt,
          updatedAt: patients.updatedAt
        })
        .from(patients)
        .where(and(...conditions))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Patient not found'
          }
        };
      }

      // Log audit for PHI access
      await logAudit(request, 'READ', 'patients', patientId);

      reply.code(200);
      return {
        success: true,
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error fetching patient', { context: 'PatientController.show', error });
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error fetching patient'
        }
      };
    }
  }

  /**
   * Update patient by ID (full update - PUT)
   * PUT /patients/:id
   */
  async update(request, reply) {
    return this._updatePatient(request, reply, 'full');
  }

  /**
   * Partial update patient by ID (PATCH)
   * PATCH /patients/:id
   */
  async patch(request, reply) {
    return this._updatePatient(request, reply, 'partial');
  }

  /**
   * Internal method for updating patient
   * @param {Object} request - Fastify request
   * @param {Object} reply - Fastify reply
   * @param {string} mode - 'full' for PUT, 'partial' for PATCH
   */
  async _updatePatient(request, reply, mode = 'partial') {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate ID parameter
      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid patient ID format'
          }
        };
      }

      // For full update (PUT), validate required fields
      if (mode === 'full') {
        const requiredFields = ['first_name', 'last_name', 'date_of_birth'];
        const missingFields = requiredFields.filter(field => !data[field]);
        if (missingFields.length > 0) {
          reply.code(400);
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Missing required fields for full update',
              fields: missingFields.map(field => ({
                field,
                message: `${field.replace(/_/g, ' ')} is required`
              }))
            }
          };
        }
      }

      // Check if patient exists and is not deleted
      const existing = await db
        .select({
          id: patients.id,
          status: patients.status,
          updatedAt: patients.updatedAt,
          deleted_at: patients.deleted_at
        })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Patient not found'
          }
        };
      }

      // Check if patient is soft-deleted (only admin can update deleted records)
      if (existing[0].deleted_at && request.user?.role !== ROLES.ADMIN) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Patient not found'
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
            error: {
              code: 'CONCURRENT_MODIFICATION',
              message: 'This record has been modified by another user. Please refresh and try again.',
              serverUpdatedAt: serverUpdatedAt.toISOString()
            }
          };
        }
      }

      // Validate date of birth if provided
      if (data.date_of_birth) {
        const dob = new Date(data.date_of_birth);
        if (isNaN(dob.getTime())) {
          reply.code(400);
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid date format',
              fields: [{ field: 'date_of_birth', message: 'Date of birth must be a valid date' }]
            }
          };
        }
        if (dob >= new Date()) {
          reply.code(400);
          return {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              message: 'Invalid date of birth',
              fields: [{ field: 'date_of_birth', message: 'Date of birth must be in the past' }]
            }
          };
        }
      }

      // Check for duplicate SSN if being updated
      if (data.ssn && data.ssn !== existing[0].ssn) {
        const existingSSN = await db
          .select({ id: patients.id })
          .from(patients)
          .where(and(
            eq(patients.ssn, data.ssn),
            isNull(patients.deleted_at)
          ))
          .limit(1);

        if (existingSSN.length > 0 && existingSSN[0].id !== patientId) {
          reply.code(409);
          return {
            success: false,
            error: {
              code: 'DUPLICATE_RECORD',
              message: 'A patient with this SSN already exists',
              fields: [{ field: 'ssn', message: 'SSN must be unique' }]
            }
          };
        }
      }

      // Check for duplicate MRN if being updated
      if (data.medical_record_number && data.medical_record_number !== existing[0].medical_record_number) {
        const existingMRN = await db
          .select({ id: patients.id })
          .from(patients)
          .where(and(
            eq(patients.medical_record_number, data.medical_record_number),
            isNull(patients.deleted_at)
          ))
          .limit(1);

        if (existingMRN.length > 0 && existingMRN[0].id !== patientId) {
          reply.code(409);
          return {
            success: false,
            error: {
              code: 'DUPLICATE_RECORD',
              message: 'A patient with this medical record number already exists',
              fields: [{ field: 'medical_record_number', message: 'Medical record number must be unique' }]
            }
          };
        }
      }

      // Remove immutable fields from update data
      const {
        id: _id,
        createdAt: _createdAt,
        deleted_at: _deletedAt,
        updatedAt: _updatedAt,
        ...safeData
      } = data;

      const result = await db
        .update(patients)
        .set({
          ...safeData,
          updatedAt: new Date()
        })
        .where(eq(patients.id, patientId))
        .returning();

      // Log audit for PHI update
      await logAudit(request, 'UPDATE', 'patients', patientId);
      hipaaLogger.dbOperation('update', 'patients', patientId);

      reply.code(200);
      return {
        success: true,
        message: 'Patient updated successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error updating patient', { context: 'PatientController.update', error });
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error updating patient'
        }
      };
    }
  }

  /**
   * Delete patient (soft delete)
   * DELETE /patients/:id
   *
   * Implements soft delete by setting deleted_at timestamp.
   * Only admins can perform hard deletes.
   *
   * Query Parameters:
   * - hard: Set to 'true' to permanently delete (admin only)
   * - reason: Deletion reason for audit trail
   */
  async destroy(request, reply) {
    try {
      const { id } = request.params;
      const { hard = false, reason } = request.query;

      // Validate ID parameter
      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid patient ID format'
          }
        };
      }

      // Check if patient exists
      const existing = await db
        .select({
          id: patients.id,
          first_name: patients.first_name,
          last_name: patients.last_name,
          status: patients.status,
          deleted_at: patients.deleted_at
        })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Patient not found'
          }
        };
      }

      // Check if already soft-deleted
      if (existing[0].deleted_at && hard !== 'true') {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Patient not found'
          }
        };
      }

      // Hard delete requires admin role
      if (hard === 'true') {
        if (request.user?.role !== ROLES.ADMIN) {
          reply.code(403);
          return {
            success: false,
            error: {
              code: 'ACCESS_DENIED',
              message: 'Only administrators can permanently delete patient records'
            }
          };
        }

        // Note: In HIPAA-compliant systems, hard delete should rarely be used
        // For compliance, we log this security event
        hipaaLogger.security('PATIENT_HARD_DELETE_ATTEMPT', {
          patientId,
          deletedBy: request.user?.id,
          reason: reason || 'No reason provided'
        });

        // Perform hard delete
        await db
          .delete(patients)
          .where(eq(patients.id, patientId));

        await logAudit(request, 'HARD_DELETE', 'patients', patientId);

        reply.code(204);
        return;
      }

      // Soft delete
      await db
        .update(patients)
        .set({
          deleted_at: new Date(),
          updatedAt: new Date()
        })
        .where(eq(patients.id, patientId));

      // Log audit for PHI deletion
      await logAudit(request, 'DELETE', 'patients', patientId);
      hipaaLogger.dbOperation('delete', 'patients', patientId);
      hipaaLogger.security('PATIENT_SOFT_DELETE', {
        patientId,
        deletedBy: request.user?.id,
        reason: reason || 'No reason provided'
      });

      reply.code(200);
      return {
        success: true,
        message: 'Patient deleted successfully'
      };
    } catch (error) {
      hipaaLogger.error('Error deleting patient', { context: 'PatientController.destroy', error });
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error deleting patient'
        }
      };
    }
  }

  /**
   * Restore soft-deleted patient (admin only)
   * POST /patients/:id/restore
   */
  async restore(request, reply) {
    try {
      const { id } = request.params;

      // Validate ID parameter
      const patientId = parseInt(id);
      if (isNaN(patientId)) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'INVALID_ID',
            message: 'Invalid patient ID format'
          }
        };
      }

      // Only admin can restore
      if (request.user?.role !== ROLES.ADMIN) {
        reply.code(403);
        return {
          success: false,
          error: {
            code: 'ACCESS_DENIED',
            message: 'Only administrators can restore deleted patient records'
          }
        };
      }

      // Check if patient exists and is deleted
      const existing = await db
        .select({
          id: patients.id,
          deleted_at: patients.deleted_at
        })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          success: false,
          error: {
            code: 'NOT_FOUND',
            message: 'Patient not found'
          }
        };
      }

      if (!existing[0].deleted_at) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'NOT_DELETED',
            message: 'Patient is not deleted'
          }
        };
      }

      // Restore patient
      const result = await db
        .update(patients)
        .set({
          deleted_at: null,
          updatedAt: new Date()
        })
        .where(eq(patients.id, patientId))
        .returning();

      // Log audit for restore
      await logAudit(request, 'RESTORE', 'patients', patientId);
      hipaaLogger.security('PATIENT_RESTORED', {
        patientId,
        restoredBy: request.user?.id
      });

      reply.code(200);
      return {
        success: true,
        message: 'Patient restored successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error restoring patient', { context: 'PatientController.restore', error });
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error restoring patient'
        }
      };
    }
  }

  /**
   * Search patients
   * GET /patients/search
   *
   * Query Parameters:
   * - q: Search query (searches first_name, last_name, MRN, email)
   * - limit: Number of records to return (default 20, max 50)
   * - offset: Number of records to skip
   */
  async search(request, reply) {
    try {
      const { q, limit = 20, offset = 0 } = request.query;

      if (!q || q.trim().length < 2) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Search query must be at least 2 characters'
          }
        };
      }

      const searchTerm = `%${q.trim()}%`;
      const parsedLimit = Math.min(parseInt(limit) || 20, 50);
      const parsedOffset = parseInt(offset) || 0;

      // Build search conditions
      const searchConditions = or(
        ilike(patients.first_name, searchTerm),
        ilike(patients.last_name, searchTerm),
        ilike(patients.medical_record_number, searchTerm),
        ilike(patients.email, searchTerm)
      );

      // Role-based filtering
      const conditions = [
        searchConditions,
        isNull(patients.deleted_at)
      ];

      // Patients can only search for themselves
      if (request.user?.role === ROLES.PATIENT && request.user?.patientId) {
        conditions.push(eq(patients.id, request.user.patientId));
      }

      const results = await db
        .select({
          id: patients.id,
          first_name: patients.first_name,
          last_name: patients.last_name,
          date_of_birth: patients.date_of_birth,
          medical_record_number: patients.medical_record_number,
          email: patients.email,
          primary_phone: patients.primary_phone,
          status: patients.status
        })
        .from(patients)
        .where(and(...conditions))
        .limit(parsedLimit)
        .offset(parsedOffset);

      // Log audit for PHI search
      await logAudit(request, 'SEARCH', 'patients', null);

      reply.code(200);
      return {
        success: true,
        data: results,
        count: results.length
      };
    } catch (error) {
      hipaaLogger.error('Error searching patients', { context: 'PatientController.search', error });
      reply.code(500);
      return {
        success: false,
        error: {
          code: 'INTERNAL_SERVER_ERROR',
          message: 'Error searching patients'
        }
      };
    }
  }
}

export default new PatientController();
