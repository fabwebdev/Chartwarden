import { db } from '../config/db.drizzle.js';
import { encounters, encounter_addendums, encounter_amendments, encounter_templates, patients } from '../db/schemas/index.js';
import { eq, and, desc, or, isNull, gte, lte, sql, count } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';
import { hipaaLogger } from '../utils/hipaaLogger.js';
/**
 * Encounter Controller
 * Manages clinical encounter documentation
 * Critical: Required for billing and regulatory compliance
 */
class EncounterController {
  /**
   * Get all encounters (with pagination and filters)
   * GET /encounters
   *
   * Query Parameters:
   * - patient_id: Filter by patient
   * - discipline: Filter by discipline (REGISTERED_NURSE, SOCIAL_WORKER, etc.)
   * - status: Filter by status (SCHEDULED, IN_PROGRESS, COMPLETED, SIGNED, etc.)
   * - staff_id: Filter by staff member
   * - date_from: Filter encounters from this date (ISO format)
   * - date_to: Filter encounters up to this date (ISO format)
   * - limit: Number of records to return (default 50, max 100)
   * - offset: Number of records to skip for pagination
   * - sort: Sort field (encounter_date, createdAt)
   * - order: Sort order (asc, desc - default desc)
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        discipline,
        status,
        staff_id,
        date_from,
        date_to,
        limit = 50,
        offset = 0,
        sort = 'encounter_date',
        order = 'desc'
      } = request.query;

      // Build filter conditions
      const conditions = [isNull(encounters.deleted_at)];

      if (patient_id) {
        conditions.push(eq(encounters.patient_id, parseInt(patient_id)));
      }
      if (discipline) {
        conditions.push(eq(encounters.discipline, discipline));
      }
      if (status) {
        conditions.push(eq(encounters.encounter_status, status));
      }
      if (staff_id) {
        conditions.push(eq(encounters.staff_id, staff_id));
      }
      if (date_from) {
        conditions.push(gte(encounters.encounter_date, new Date(date_from)));
      }
      if (date_to) {
        conditions.push(lte(encounters.encounter_date, new Date(date_to)));
      }

      // Get total count for pagination
      const totalCountResult = await db
        .select({ value: count() })
        .from(encounters)
        .where(and(...conditions));
      const totalCount = totalCountResult[0]?.value || 0;

      // Validate and cap limit
      const parsedLimit = Math.min(parseInt(limit) || 50, 100);
      const parsedOffset = parseInt(offset) || 0;

      // Determine sort order
      const sortColumn = sort === 'createdAt' ? encounters.createdAt : encounters.encounter_date;
      const sortOrder = order === 'asc' ? sortColumn : desc(sortColumn);

      const results = await db.select({
        id: encounters.id,
        patient_id: encounters.patient_id,
        encounter_type: encounters.encounter_type,
        encounter_status: encounters.encounter_status,
        encounter_date: encounters.encounter_date,
        encounter_duration_minutes: encounters.encounter_duration_minutes,
        visit_location: encounters.visit_location,
        visit_address: encounters.visit_address,
        discipline: encounters.discipline,
        staff_id: encounters.staff_id,
        staff_name: encounters.staff_name,
        staff_credentials: encounters.staff_credentials,
        cosigner_id: encounters.cosigner_id,
        cosigner_name: encounters.cosigner_name,
        gps_check_in: encounters.gps_check_in,
        gps_check_out: encounters.gps_check_out,
        subjective: encounters.subjective,
        objective: encounters.objective,
        assessment: encounters.assessment,
        plan: encounters.plan,
        vital_signs: encounters.vital_signs,
        pain_assessment: encounters.pain_assessment,
        symptoms: encounters.symptoms,
        interventions: encounters.interventions,
        medications_administered: encounters.medications_administered,
        patient_education: encounters.patient_education,
        education_topics: encounters.education_topics,
        patient_understanding: encounters.patient_understanding,
        caregiver_present: encounters.caregiver_present,
        caregiver_name: encounters.caregiver_name,
        caregiver_assessment: encounters.caregiver_assessment,
        caregiver_education: encounters.caregiver_education,
        caregiver_coping: encounters.caregiver_coping,
        emotional_status: encounters.emotional_status,
        spiritual_concerns: encounters.spiritual_concerns,
        social_concerns: encounters.social_concerns,
        safety_concerns: encounters.safety_concerns,
        fall_risk: encounters.fall_risk,
        skin_integrity: encounters.skin_integrity,
        environment_assessment: encounters.environment_assessment,
        home_safety_issues: encounters.home_safety_issues,
        communication_with_physician: encounters.communication_with_physician,
        communication_with_team: encounters.communication_with_team,
        orders_received: encounters.orders_received,
        clinical_notes: encounters.clinical_notes,
        follow_up_needed: encounters.follow_up_needed,
        recommendations: encounters.recommendations,
        attachments: encounters.attachments,
        signature: encounters.signature,
        cosignature: encounters.cosignature,
        amended: encounters.amended,
        amendment_count: encounters.amendment_count,
        created_by_id: encounters.created_by_id,
        updated_by_id: encounters.updated_by_id,
        deleted_at: encounters.deleted_at,
        createdAt: encounters.createdAt,
        updatedAt: encounters.updatedAt
      })
        .from(encounters)
        .where(and(...conditions))
        .orderBy(sortOrder)
        .limit(parsedLimit)
        .offset(parsedOffset);

      // Log audit for PHI access
      await logAudit(request, 'READ', 'encounters', null);

      reply.code(200);
      return {
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
      hipaaLogger.error('Error fetching encounters', { context: 'EncounterController.index', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching encounters',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create new encounter
   * POST /encounters
   *
   * Required fields:
   * - patient_id: Patient ID (must exist and be active)
   * - encounter_type: Type of encounter (ADMISSION_VISIT, ROUTINE_VISIT, PRN_VISIT, etc.)
   * - encounter_date: Date/time of encounter
   * - discipline: Staff discipline (REGISTERED_NURSE, SOCIAL_WORKER, CHAPLAIN, etc.)
   *
   * Optional fields:
   * - staff_id: Staff member ID (defaults to current user)
   * - visit_location: Location type (PATIENT_HOME, ASSISTED_LIVING_FACILITY, etc.)
   * - All SOAP fields, vital signs, assessments, etc.
   */
  async store(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      const requiredFields = ['patient_id', 'encounter_type', 'encounter_date', 'discipline'];
      const missingFields = requiredFields.filter(field => !data[field]);

      if (missingFields.length > 0) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields',
          error: {
            code: 'VALIDATION_ERROR',
            fields: missingFields
          }
        };
      }

      // Validate encounter_type
      const validEncounterTypes = [
        'ADMISSION_VISIT', 'ROUTINE_VISIT', 'PRN_VISIT', 'RECERTIFICATION_VISIT',
        'DISCHARGE_VISIT', 'DEATH_VISIT', 'BEREAVEMENT_VISIT', 'ON_CALL_VISIT',
        'SUPERVISORY_VISIT', 'CONTINUOUS_CARE', 'INPATIENT_RESPITE', 'GIP_VISIT'
      ];
      if (!validEncounterTypes.includes(data.encounter_type)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid encounter type',
          error: {
            code: 'VALIDATION_ERROR',
            field: 'encounter_type',
            validValues: validEncounterTypes
          }
        };
      }

      // Validate discipline
      const validDisciplines = [
        'REGISTERED_NURSE', 'LICENSED_PRACTICAL_NURSE', 'CERTIFIED_NURSING_ASSISTANT',
        'SOCIAL_WORKER', 'CHAPLAIN', 'VOLUNTEER', 'PHYSICIAN', 'NURSE_PRACTITIONER',
        'PHYSICAL_THERAPIST', 'OCCUPATIONAL_THERAPIST', 'SPEECH_THERAPIST',
        'DIETITIAN', 'PHARMACIST', 'BEREAVEMENT_COUNSELOR', 'MUSIC_THERAPIST'
      ];
      if (!validDisciplines.includes(data.discipline)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid discipline',
          error: {
            code: 'VALIDATION_ERROR',
            field: 'discipline',
            validValues: validDisciplines
          }
        };
      }

      // Verify patient exists and is active
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

      // Prevent immutable field injection
      const { id, createdAt, deleted_at, signature, cosignature, ...safeData } = data;

      const result = await db
        .insert(encounters)
        .values({
          ...safeData,
          patient_id: parseInt(data.patient_id),
          encounter_date: new Date(data.encounter_date),
          encounter_status: data.encounter_status || 'IN_PROGRESS',
          staff_id: data.staff_id || request.user?.id,
          staff_name: data.staff_name || `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim(),
          staff_credentials: data.staff_credentials || request.user?.credentials || null,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Log audit for PHI creation
      await logAudit(request, 'CREATE', 'encounters', result[0].id);
      hipaaLogger.dbOperation('create', 'encounters', result[0].id);

      reply.code(201);
      return {
        status: 201,
        message: 'Encounter created successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error creating encounter', { context: 'EncounterController.store', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get encounter by ID
   * GET /encounters/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select({
          id: encounters.id,
          patient_id: encounters.patient_id,
          encounter_type: encounters.encounter_type,
          encounter_status: encounters.encounter_status,
          encounter_date: encounters.encounter_date,
          encounter_duration_minutes: encounters.encounter_duration_minutes,
          visit_location: encounters.visit_location,
          visit_address: encounters.visit_address,
          discipline: encounters.discipline,
          staff_id: encounters.staff_id,
          staff_name: encounters.staff_name,
          staff_credentials: encounters.staff_credentials,
          cosigner_id: encounters.cosigner_id,
          cosigner_name: encounters.cosigner_name,
          gps_check_in: encounters.gps_check_in,
          gps_check_out: encounters.gps_check_out,
          subjective: encounters.subjective,
          objective: encounters.objective,
          assessment: encounters.assessment,
          plan: encounters.plan,
          vital_signs: encounters.vital_signs,
          pain_assessment: encounters.pain_assessment,
          symptoms: encounters.symptoms,
          interventions: encounters.interventions,
          medications_administered: encounters.medications_administered,
          patient_education: encounters.patient_education,
          education_topics: encounters.education_topics,
          patient_understanding: encounters.patient_understanding,
          caregiver_present: encounters.caregiver_present,
          caregiver_name: encounters.caregiver_name,
          caregiver_assessment: encounters.caregiver_assessment,
          caregiver_education: encounters.caregiver_education,
          caregiver_coping: encounters.caregiver_coping,
          emotional_status: encounters.emotional_status,
          spiritual_concerns: encounters.spiritual_concerns,
          social_concerns: encounters.social_concerns,
          safety_concerns: encounters.safety_concerns,
          fall_risk: encounters.fall_risk,
          skin_integrity: encounters.skin_integrity,
          environment_assessment: encounters.environment_assessment,
          home_safety_issues: encounters.home_safety_issues,
          communication_with_physician: encounters.communication_with_physician,
          communication_with_team: encounters.communication_with_team,
          orders_received: encounters.orders_received,
          clinical_notes: encounters.clinical_notes,
          follow_up_needed: encounters.follow_up_needed,
          recommendations: encounters.recommendations,
          attachments: encounters.attachments,
          signature: encounters.signature,
          cosignature: encounters.cosignature,
          amended: encounters.amended,
          amendment_count: encounters.amendment_count,
          created_by_id: encounters.created_by_id,
          updated_by_id: encounters.updated_by_id,
          deleted_at: encounters.deleted_at,
          createdAt: encounters.createdAt,
          updatedAt: encounters.updatedAt
        })
        .from(encounters)
        .where(and(
          eq(encounters.id, parseInt(id)),
          isNull(encounters.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Encounter not found'
        };
      }

      // Fetch addendums
      const addendums = await db
        .select({
          id: encounter_addendums.id,
          encounter_id: encounter_addendums.encounter_id,
          patient_id: encounter_addendums.patient_id,
          addendum_date: encounter_addendums.addendum_date,
          addendum_reason: encounter_addendums.addendum_reason,
          addendum_content: encounter_addendums.addendum_content,
          added_by_id: encounter_addendums.added_by_id,
          added_by_name: encounter_addendums.added_by_name,
          signature: encounter_addendums.signature,
          createdAt: encounter_addendums.createdAt,
          updatedAt: encounter_addendums.updatedAt
        })
        .from(encounter_addendums)
        .where(eq(encounter_addendums.encounter_id, parseInt(id)))
        .orderBy(desc(encounter_addendums.addendum_date));

      // Fetch amendments
      const amendments = await db
        .select({
          id: encounter_amendments.id,
          encounter_id: encounter_amendments.encounter_id,
          patient_id: encounter_amendments.patient_id,
          amendment_date: encounter_amendments.amendment_date,
          amendment_reason: encounter_amendments.amendment_reason,
          field_amended: encounter_amendments.field_amended,
          original_value: encounter_amendments.original_value,
          amended_value: encounter_amendments.amended_value,
          amendment_notes: encounter_amendments.amendment_notes,
          amended_by_id: encounter_amendments.amended_by_id,
          amended_by_name: encounter_amendments.amended_by_name,
          signature: encounter_amendments.signature,
          createdAt: encounter_amendments.createdAt,
          updatedAt: encounter_amendments.updatedAt
        })
        .from(encounter_amendments)
        .where(eq(encounter_amendments.encounter_id, parseInt(id)))
        .orderBy(desc(encounter_amendments.amendment_date));

      // Log audit for PHI access
      await logAudit(request, 'READ', 'encounters', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        data: {
          ...result[0],
          addendums,
          amendments
        }
      };
    } catch (error) {
      hipaaLogger.error('Error fetching encounter', { context: 'EncounterController.show', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update encounter
   * PATCH /encounters/:id
   *
   * Updates allowed fields on an unsigned encounter.
   * Signed/cosigned encounters cannot be updated directly - use amendments instead.
   *
   * Immutable fields (cannot be changed):
   * - id, patient_id, created_by_id, createdAt, signature, cosignature
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate ID parameter
      const encounterId = parseInt(id);
      if (isNaN(encounterId)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid encounter ID',
          error: { code: 'INVALID_ID' }
        };
      }

      const existing = await db
        .select({
          id: encounters.id,
          patient_id: encounters.patient_id,
          encounter_status: encounters.encounter_status,
          staff_id: encounters.staff_id,
          created_by_id: encounters.created_by_id,
          createdAt: encounters.createdAt
        })
        .from(encounters)
        .where(and(
          eq(encounters.id, encounterId),
          isNull(encounters.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Encounter not found',
          error: { code: 'ENCOUNTER_NOT_FOUND' }
        };
      }

      // Don't allow updates to signed encounters (must use amendments)
      if (existing[0].encounter_status === 'SIGNED' || existing[0].encounter_status === 'COSIGNED') {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update signed encounters. Use amendments instead.',
          error: { code: 'SIGNED_ENCOUNTER_IMMUTABLE' }
        };
      }

      // Don't allow updates to amended status directly
      if (existing[0].encounter_status === 'AMENDED') {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update amended encounters directly.',
          error: { code: 'AMENDED_ENCOUNTER_RESTRICTED' }
        };
      }

      // Remove immutable fields from update data
      const {
        id: _id,
        patient_id: _patientId,
        created_by_id: _createdById,
        createdAt: _createdAt,
        signature: _signature,
        cosignature: _cosignature,
        deleted_at: _deletedAt,
        amended: _amended,
        amendment_count: _amendmentCount,
        ...safeData
      } = data;

      // Validate encounter_type if provided
      if (safeData.encounter_type) {
        const validEncounterTypes = [
          'ADMISSION_VISIT', 'ROUTINE_VISIT', 'PRN_VISIT', 'RECERTIFICATION_VISIT',
          'DISCHARGE_VISIT', 'DEATH_VISIT', 'BEREAVEMENT_VISIT', 'ON_CALL_VISIT',
          'SUPERVISORY_VISIT', 'CONTINUOUS_CARE', 'INPATIENT_RESPITE', 'GIP_VISIT'
        ];
        if (!validEncounterTypes.includes(safeData.encounter_type)) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid encounter type',
            error: { code: 'VALIDATION_ERROR', field: 'encounter_type' }
          };
        }
      }

      // Validate discipline if provided
      if (safeData.discipline) {
        const validDisciplines = [
          'REGISTERED_NURSE', 'LICENSED_PRACTICAL_NURSE', 'CERTIFIED_NURSING_ASSISTANT',
          'SOCIAL_WORKER', 'CHAPLAIN', 'VOLUNTEER', 'PHYSICIAN', 'NURSE_PRACTITIONER',
          'PHYSICAL_THERAPIST', 'OCCUPATIONAL_THERAPIST', 'SPEECH_THERAPIST',
          'DIETITIAN', 'PHARMACIST', 'BEREAVEMENT_COUNSELOR', 'MUSIC_THERAPIST'
        ];
        if (!validDisciplines.includes(safeData.discipline)) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid discipline',
            error: { code: 'VALIDATION_ERROR', field: 'discipline' }
          };
        }
      }

      // Parse encounter_date if provided
      if (safeData.encounter_date) {
        safeData.encounter_date = new Date(safeData.encounter_date);
      }

      const result = await db
        .update(encounters)
        .set({
          ...safeData,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(encounters.id, encounterId))
        .returning();

      // Log audit for PHI update
      await logAudit(request, 'UPDATE', 'encounters', encounterId);
      hipaaLogger.dbOperation('update', 'encounters', encounterId);

      reply.code(200);
      return {
        status: 200,
        message: 'Encounter updated successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error updating encounter', { context: 'EncounterController.update', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete encounter (soft delete, unsigned only)
   * DELETE /encounters/:id
   *
   * Only unsigned encounters can be deleted.
   * Signed/cosigned encounters cannot be deleted to maintain audit trail.
   * Encounters with dependent records (addendums, amendments) cannot be deleted.
   *
   * Query Parameters:
   * - force: Set to 'true' to force delete even with dependent records (admin only)
   */
  async destroy(request, reply) {
    try {
      const { id } = request.params;
      const { force } = request.query;

      // Validate ID parameter
      const encounterId = parseInt(id);
      if (isNaN(encounterId)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid encounter ID',
          error: { code: 'INVALID_ID' }
        };
      }

      const existing = await db
        .select({
          id: encounters.id,
          patient_id: encounters.patient_id,
          encounter_status: encounters.encounter_status,
          staff_id: encounters.staff_id
        })
        .from(encounters)
        .where(and(
          eq(encounters.id, encounterId),
          isNull(encounters.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Encounter not found',
          error: { code: 'ENCOUNTER_NOT_FOUND' }
        };
      }

      // Only allow deletion of unsigned encounters
      if (existing[0].encounter_status === 'SIGNED' || existing[0].encounter_status === 'COSIGNED') {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete signed encounters. Signed clinical records must be retained for compliance.',
          error: { code: 'SIGNED_ENCOUNTER_PROTECTED' }
        };
      }

      // Check for dependent records (addendums)
      const addendumCount = await db
        .select({ value: count() })
        .from(encounter_addendums)
        .where(eq(encounter_addendums.encounter_id, encounterId));

      // Check for dependent records (amendments)
      const amendmentCount = await db
        .select({ value: count() })
        .from(encounter_amendments)
        .where(eq(encounter_amendments.encounter_id, encounterId));

      const hasAddendums = (addendumCount[0]?.value || 0) > 0;
      const hasAmendments = (amendmentCount[0]?.value || 0) > 0;

      if ((hasAddendums || hasAmendments) && force !== 'true') {
        reply.code(409);
        return {
          status: 409,
          message: 'Cannot delete encounter with dependent records',
          error: {
            code: 'HAS_DEPENDENT_RECORDS',
            addendums: addendumCount[0]?.value || 0,
            amendments: amendmentCount[0]?.value || 0
          }
        };
      }

      // Soft delete the encounter
      await db
        .update(encounters)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(encounters.id, encounterId));

      // Log audit for PHI deletion
      await logAudit(request, 'DELETE', 'encounters', encounterId);
      hipaaLogger.dbOperation('delete', 'encounters', encounterId);
      hipaaLogger.security('ENCOUNTER_DELETED', {
        encounterId,
        deletedBy: request.user?.id,
        force: force === 'true'
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Encounter deleted successfully'
      };
    } catch (error) {
      hipaaLogger.error('Error deleting encounter', { context: 'EncounterController.destroy', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign encounter (21 CFR Part 11 compliance)
   * POST /encounters/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select({
          id: encounters.id,
          patient_id: encounters.patient_id,
          encounter_type: encounters.encounter_type,
          encounter_status: encounters.encounter_status,
          encounter_date: encounters.encounter_date,
          encounter_duration_minutes: encounters.encounter_duration_minutes,
          visit_location: encounters.visit_location,
          visit_address: encounters.visit_address,
          discipline: encounters.discipline,
          staff_id: encounters.staff_id,
          staff_name: encounters.staff_name,
          staff_credentials: encounters.staff_credentials,
          cosigner_id: encounters.cosigner_id,
          cosigner_name: encounters.cosigner_name,
          gps_check_in: encounters.gps_check_in,
          gps_check_out: encounters.gps_check_out,
          subjective: encounters.subjective,
          objective: encounters.objective,
          assessment: encounters.assessment,
          plan: encounters.plan,
          vital_signs: encounters.vital_signs,
          pain_assessment: encounters.pain_assessment,
          symptoms: encounters.symptoms,
          interventions: encounters.interventions,
          medications_administered: encounters.medications_administered,
          patient_education: encounters.patient_education,
          education_topics: encounters.education_topics,
          patient_understanding: encounters.patient_understanding,
          caregiver_present: encounters.caregiver_present,
          caregiver_name: encounters.caregiver_name,
          caregiver_assessment: encounters.caregiver_assessment,
          caregiver_education: encounters.caregiver_education,
          caregiver_coping: encounters.caregiver_coping,
          emotional_status: encounters.emotional_status,
          spiritual_concerns: encounters.spiritual_concerns,
          social_concerns: encounters.social_concerns,
          safety_concerns: encounters.safety_concerns,
          fall_risk: encounters.fall_risk,
          skin_integrity: encounters.skin_integrity,
          environment_assessment: encounters.environment_assessment,
          home_safety_issues: encounters.home_safety_issues,
          communication_with_physician: encounters.communication_with_physician,
          communication_with_team: encounters.communication_with_team,
          orders_received: encounters.orders_received,
          clinical_notes: encounters.clinical_notes,
          follow_up_needed: encounters.follow_up_needed,
          recommendations: encounters.recommendations,
          attachments: encounters.attachments,
          signature: encounters.signature,
          cosignature: encounters.cosignature,
          amended: encounters.amended,
          amendment_count: encounters.amendment_count,
          created_by_id: encounters.created_by_id,
          updated_by_id: encounters.updated_by_id,
          deleted_at: encounters.deleted_at,
          createdAt: encounters.createdAt,
          updatedAt: encounters.updatedAt
        })
        .from(encounters)
        .where(and(
          eq(encounters.id, parseInt(id)),
          isNull(encounters.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Encounter not found'
        };
      }

      if (existing[0].encounter_status === 'SIGNED' || existing[0].encounter_status === 'COSIGNED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Encounter already signed'
        };
      }

      // Generate signature hash
      const dataToSign = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        encounter_type: existing[0].encounter_type,
        encounter_date: existing[0].encounter_date,
        subjective: existing[0].subjective,
        objective: existing[0].objective,
        assessment: existing[0].assessment,
        plan: existing[0].plan
      });
      const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      const signature = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName} ${request.user?.lastName}`,
        signedAt: new Date().toISOString(),
        signatureType: 'ELECTRONIC',
        signatureHash: signatureHash,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        meaning: 'Signature attesting to the accuracy and completeness of this clinical encounter',
        credentials: request.user?.role || 'Unknown'
      };

      const result = await db
        .update(encounters)
        .set({
          signature: signature,
          encounter_status: 'SIGNED',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(encounters.id, parseInt(id)))
        .returning();

      // Log audit for clinical note signing (critical for 21 CFR Part 11)
      await logAudit(request, 'SIGN', 'encounters', parseInt(id));
      hipaaLogger.security('ENCOUNTER_SIGNED', {
        encounterId: parseInt(id),
        signedBy: request.user?.id,
        signatureHash: signatureHash
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Encounter signed successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error signing encounter', { context: 'EncounterController.sign', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Cosign encounter (for supervision, students, etc.)
   * POST /encounters/:id/cosign
   */
  async cosign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select({
          id: encounters.id,
          patient_id: encounters.patient_id,
          encounter_type: encounters.encounter_type,
          encounter_status: encounters.encounter_status,
          encounter_date: encounters.encounter_date,
          encounter_duration_minutes: encounters.encounter_duration_minutes,
          visit_location: encounters.visit_location,
          visit_address: encounters.visit_address,
          discipline: encounters.discipline,
          staff_id: encounters.staff_id,
          staff_name: encounters.staff_name,
          staff_credentials: encounters.staff_credentials,
          cosigner_id: encounters.cosigner_id,
          cosigner_name: encounters.cosigner_name,
          gps_check_in: encounters.gps_check_in,
          gps_check_out: encounters.gps_check_out,
          subjective: encounters.subjective,
          objective: encounters.objective,
          assessment: encounters.assessment,
          plan: encounters.plan,
          vital_signs: encounters.vital_signs,
          pain_assessment: encounters.pain_assessment,
          symptoms: encounters.symptoms,
          interventions: encounters.interventions,
          medications_administered: encounters.medications_administered,
          patient_education: encounters.patient_education,
          education_topics: encounters.education_topics,
          patient_understanding: encounters.patient_understanding,
          caregiver_present: encounters.caregiver_present,
          caregiver_name: encounters.caregiver_name,
          caregiver_assessment: encounters.caregiver_assessment,
          caregiver_education: encounters.caregiver_education,
          caregiver_coping: encounters.caregiver_coping,
          emotional_status: encounters.emotional_status,
          spiritual_concerns: encounters.spiritual_concerns,
          social_concerns: encounters.social_concerns,
          safety_concerns: encounters.safety_concerns,
          fall_risk: encounters.fall_risk,
          skin_integrity: encounters.skin_integrity,
          environment_assessment: encounters.environment_assessment,
          home_safety_issues: encounters.home_safety_issues,
          communication_with_physician: encounters.communication_with_physician,
          communication_with_team: encounters.communication_with_team,
          orders_received: encounters.orders_received,
          clinical_notes: encounters.clinical_notes,
          follow_up_needed: encounters.follow_up_needed,
          recommendations: encounters.recommendations,
          attachments: encounters.attachments,
          signature: encounters.signature,
          cosignature: encounters.cosignature,
          amended: encounters.amended,
          amendment_count: encounters.amendment_count,
          created_by_id: encounters.created_by_id,
          updated_by_id: encounters.updated_by_id,
          deleted_at: encounters.deleted_at,
          createdAt: encounters.createdAt,
          updatedAt: encounters.updatedAt
        })
        .from(encounters)
        .where(and(
          eq(encounters.id, parseInt(id)),
          isNull(encounters.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Encounter not found'
        };
      }

      if (existing[0].encounter_status !== 'SIGNED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Encounter must be signed before cosigning'
        };
      }

      if (existing[0].encounter_status === 'COSIGNED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Encounter already cosigned'
        };
      }

      // Generate cosignature hash
      const dataToSign = JSON.stringify({
        ...existing[0],
        cosigned_at: new Date().toISOString()
      });
      const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      const cosignature = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName} ${request.user?.lastName}`,
        signedAt: new Date().toISOString(),
        signatureType: 'COSIGNATURE',
        signatureHash: signatureHash,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        meaning: 'Cosignature attesting to the review and supervision of this clinical encounter',
        credentials: request.user?.role || 'Unknown'
      };

      const result = await db
        .update(encounters)
        .set({
          cosignature: cosignature,
          cosigner_id: request.user?.id,
          cosigner_name: `${request.user?.firstName} ${request.user?.lastName}`,
          encounter_status: 'COSIGNED',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(encounters.id, parseInt(id)))
        .returning();

      // Log audit for clinical note cosigning (critical for 21 CFR Part 11)
      await logAudit(request, 'COSIGN', 'encounters', parseInt(id));
      hipaaLogger.security('ENCOUNTER_COSIGNED', {
        encounterId: parseInt(id),
        cosignedBy: request.user?.id,
        signatureHash: signatureHash
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Encounter cosigned successfully',
        data: result[0]
      };
    } catch (error) {
      hipaaLogger.error('Error cosigning encounter', { context: 'EncounterController.cosign', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error cosigning encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add addendum to signed encounter
   * POST /encounters/:id/addendum
   */
  async addAddendum(request, reply) {
    try {
      const { id } = request.params;
      const { addendum_reason, addendum_content } = request.body;

      const existing = await db
        .select({
          id: encounters.id,
          patient_id: encounters.patient_id,
          encounter_type: encounters.encounter_type,
          encounter_status: encounters.encounter_status,
          encounter_date: encounters.encounter_date,
          encounter_duration_minutes: encounters.encounter_duration_minutes,
          visit_location: encounters.visit_location,
          visit_address: encounters.visit_address,
          discipline: encounters.discipline,
          staff_id: encounters.staff_id,
          staff_name: encounters.staff_name,
          staff_credentials: encounters.staff_credentials,
          cosigner_id: encounters.cosigner_id,
          cosigner_name: encounters.cosigner_name,
          gps_check_in: encounters.gps_check_in,
          gps_check_out: encounters.gps_check_out,
          subjective: encounters.subjective,
          objective: encounters.objective,
          assessment: encounters.assessment,
          plan: encounters.plan,
          vital_signs: encounters.vital_signs,
          pain_assessment: encounters.pain_assessment,
          symptoms: encounters.symptoms,
          interventions: encounters.interventions,
          medications_administered: encounters.medications_administered,
          patient_education: encounters.patient_education,
          education_topics: encounters.education_topics,
          patient_understanding: encounters.patient_understanding,
          caregiver_present: encounters.caregiver_present,
          caregiver_name: encounters.caregiver_name,
          caregiver_assessment: encounters.caregiver_assessment,
          caregiver_education: encounters.caregiver_education,
          caregiver_coping: encounters.caregiver_coping,
          emotional_status: encounters.emotional_status,
          spiritual_concerns: encounters.spiritual_concerns,
          social_concerns: encounters.social_concerns,
          safety_concerns: encounters.safety_concerns,
          fall_risk: encounters.fall_risk,
          skin_integrity: encounters.skin_integrity,
          environment_assessment: encounters.environment_assessment,
          home_safety_issues: encounters.home_safety_issues,
          communication_with_physician: encounters.communication_with_physician,
          communication_with_team: encounters.communication_with_team,
          orders_received: encounters.orders_received,
          clinical_notes: encounters.clinical_notes,
          follow_up_needed: encounters.follow_up_needed,
          recommendations: encounters.recommendations,
          attachments: encounters.attachments,
          signature: encounters.signature,
          cosignature: encounters.cosignature,
          amended: encounters.amended,
          amendment_count: encounters.amendment_count,
          created_by_id: encounters.created_by_id,
          updated_by_id: encounters.updated_by_id,
          deleted_at: encounters.deleted_at,
          createdAt: encounters.createdAt,
          updatedAt: encounters.updatedAt
        })
        .from(encounters)
        .where(and(
          eq(encounters.id, parseInt(id)),
          isNull(encounters.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Encounter not found'
        };
      }

      // Generate signature hash
      const dataToSign = JSON.stringify({
        encounter_id: parseInt(id),
        addendum_content,
        added_at: new Date().toISOString()
      });
      const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      const signature = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName} ${request.user?.lastName}`,
        signedAt: new Date().toISOString(),
        signatureType: 'ELECTRONIC',
        signatureHash: signatureHash,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        meaning: 'Signature attesting to this addendum',
        credentials: request.user?.role || 'Unknown'
      };

      const addendum = await db
        .insert(encounter_addendums)
        .values({
          encounter_id: parseInt(id),
          patient_id: existing[0].patient_id,
          addendum_date: new Date(),
          addendum_reason,
          addendum_content,
          added_by_id: request.user?.id,
          added_by_name: `${request.user?.firstName} ${request.user?.lastName}`,
          signature
        })
        .returning();

      // Log audit for addendum creation
      await logAudit(request, 'CREATE', 'encounter_addendums', addendum[0].id);
      hipaaLogger.dbOperation('create', 'encounter_addendums', addendum[0].id);

      reply.code(201);
      return {
        status: 201,
        message: 'Addendum added successfully',
        data: addendum[0]
      };
    } catch (error) {
      hipaaLogger.error('Error adding addendum', { context: 'EncounterController.addAddendum', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding addendum',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend signed encounter
   * POST /encounters/:id/amendments
   */
  async addAmendment(request, reply) {
    try {
      const { id } = request.params;
      const { amendment_reason, field_amended, original_value, amended_value, amendment_notes } = request.body;

      const existing = await db
        .select({
          id: encounters.id,
          patient_id: encounters.patient_id,
          encounter_type: encounters.encounter_type,
          encounter_status: encounters.encounter_status,
          encounter_date: encounters.encounter_date,
          encounter_duration_minutes: encounters.encounter_duration_minutes,
          visit_location: encounters.visit_location,
          visit_address: encounters.visit_address,
          discipline: encounters.discipline,
          staff_id: encounters.staff_id,
          staff_name: encounters.staff_name,
          staff_credentials: encounters.staff_credentials,
          cosigner_id: encounters.cosigner_id,
          cosigner_name: encounters.cosigner_name,
          gps_check_in: encounters.gps_check_in,
          gps_check_out: encounters.gps_check_out,
          subjective: encounters.subjective,
          objective: encounters.objective,
          assessment: encounters.assessment,
          plan: encounters.plan,
          vital_signs: encounters.vital_signs,
          pain_assessment: encounters.pain_assessment,
          symptoms: encounters.symptoms,
          interventions: encounters.interventions,
          medications_administered: encounters.medications_administered,
          patient_education: encounters.patient_education,
          education_topics: encounters.education_topics,
          patient_understanding: encounters.patient_understanding,
          caregiver_present: encounters.caregiver_present,
          caregiver_name: encounters.caregiver_name,
          caregiver_assessment: encounters.caregiver_assessment,
          caregiver_education: encounters.caregiver_education,
          caregiver_coping: encounters.caregiver_coping,
          emotional_status: encounters.emotional_status,
          spiritual_concerns: encounters.spiritual_concerns,
          social_concerns: encounters.social_concerns,
          safety_concerns: encounters.safety_concerns,
          fall_risk: encounters.fall_risk,
          skin_integrity: encounters.skin_integrity,
          environment_assessment: encounters.environment_assessment,
          home_safety_issues: encounters.home_safety_issues,
          communication_with_physician: encounters.communication_with_physician,
          communication_with_team: encounters.communication_with_team,
          orders_received: encounters.orders_received,
          clinical_notes: encounters.clinical_notes,
          follow_up_needed: encounters.follow_up_needed,
          recommendations: encounters.recommendations,
          attachments: encounters.attachments,
          signature: encounters.signature,
          cosignature: encounters.cosignature,
          amended: encounters.amended,
          amendment_count: encounters.amendment_count,
          created_by_id: encounters.created_by_id,
          updated_by_id: encounters.updated_by_id,
          deleted_at: encounters.deleted_at,
          createdAt: encounters.createdAt,
          updatedAt: encounters.updatedAt
        })
        .from(encounters)
        .where(and(
          eq(encounters.id, parseInt(id)),
          isNull(encounters.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Encounter not found'
        };
      }

      // Generate signature hash
      const dataToSign = JSON.stringify({
        encounter_id: parseInt(id),
        field_amended,
        original_value,
        amended_value,
        amended_at: new Date().toISOString()
      });
      const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      const signature = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName} ${request.user?.lastName}`,
        signedAt: new Date().toISOString(),
        signatureType: 'ELECTRONIC',
        signatureHash: signatureHash,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        meaning: 'Signature attesting to this amendment',
        credentials: request.user?.role || 'Unknown'
      };

      const amendment = await db
        .insert(encounter_amendments)
        .values({
          encounter_id: parseInt(id),
          patient_id: existing[0].patient_id,
          amendment_date: new Date(),
          amendment_reason,
          field_amended,
          original_value,
          amended_value,
          amendment_notes,
          amended_by_id: request.user?.id,
          amended_by_name: `${request.user?.firstName} ${request.user?.lastName}`,
          signature
        })
        .returning();

      // Update encounter to mark as amended
      await db
        .update(encounters)
        .set({
          amended: true,
          amendment_count: (existing[0].amendment_count || 0) + 1,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(encounters.id, parseInt(id)));

      // Log audit for amendment creation (critical for compliance)
      await logAudit(request, 'CREATE', 'encounter_amendments', amendment[0].id);
      hipaaLogger.security('ENCOUNTER_AMENDED', {
        encounterId: parseInt(id),
        amendmentId: amendment[0].id,
        fieldAmended: field_amended,
        amendedBy: request.user?.id
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Amendment added successfully',
        data: amendment[0]
      };
    } catch (error) {
      hipaaLogger.error('Error adding amendment', { context: 'EncounterController.addAmendment', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding amendment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get unsigned encounters
   * GET /encounters/unsigned
   */
  async getUnsigned(request, reply) {
    try {
      const { discipline, staff_id } = request.query;

      let query = db
        .select({
          id: encounters.id,
          patient_id: encounters.patient_id,
          encounter_type: encounters.encounter_type,
          encounter_status: encounters.encounter_status,
          encounter_date: encounters.encounter_date,
          encounter_duration_minutes: encounters.encounter_duration_minutes,
          visit_location: encounters.visit_location,
          visit_address: encounters.visit_address,
          discipline: encounters.discipline,
          staff_id: encounters.staff_id,
          staff_name: encounters.staff_name,
          staff_credentials: encounters.staff_credentials,
          cosigner_id: encounters.cosigner_id,
          cosigner_name: encounters.cosigner_name,
          gps_check_in: encounters.gps_check_in,
          gps_check_out: encounters.gps_check_out,
          subjective: encounters.subjective,
          objective: encounters.objective,
          assessment: encounters.assessment,
          plan: encounters.plan,
          vital_signs: encounters.vital_signs,
          pain_assessment: encounters.pain_assessment,
          symptoms: encounters.symptoms,
          interventions: encounters.interventions,
          medications_administered: encounters.medications_administered,
          patient_education: encounters.patient_education,
          education_topics: encounters.education_topics,
          patient_understanding: encounters.patient_understanding,
          caregiver_present: encounters.caregiver_present,
          caregiver_name: encounters.caregiver_name,
          caregiver_assessment: encounters.caregiver_assessment,
          caregiver_education: encounters.caregiver_education,
          caregiver_coping: encounters.caregiver_coping,
          emotional_status: encounters.emotional_status,
          spiritual_concerns: encounters.spiritual_concerns,
          social_concerns: encounters.social_concerns,
          safety_concerns: encounters.safety_concerns,
          fall_risk: encounters.fall_risk,
          skin_integrity: encounters.skin_integrity,
          environment_assessment: encounters.environment_assessment,
          home_safety_issues: encounters.home_safety_issues,
          communication_with_physician: encounters.communication_with_physician,
          communication_with_team: encounters.communication_with_team,
          orders_received: encounters.orders_received,
          clinical_notes: encounters.clinical_notes,
          follow_up_needed: encounters.follow_up_needed,
          recommendations: encounters.recommendations,
          attachments: encounters.attachments,
          signature: encounters.signature,
          cosignature: encounters.cosignature,
          amended: encounters.amended,
          amendment_count: encounters.amendment_count,
          created_by_id: encounters.created_by_id,
          updated_by_id: encounters.updated_by_id,
          deleted_at: encounters.deleted_at,
          createdAt: encounters.createdAt,
          updatedAt: encounters.updatedAt
        })
        .from(encounters)
        .where(and(
          or(
            eq(encounters.encounter_status, 'COMPLETED'),
            eq(encounters.encounter_status, 'UNSIGNED')
          ),
          isNull(encounters.deleted_at)
        ));

      if (discipline) {
        query = query.where(eq(encounters.discipline, discipline));
      }
      if (staff_id) {
        query = query.where(eq(encounters.staff_id, staff_id));
      }

      const results = await query.orderBy(desc(encounters.encounter_date));

      // Log audit for PHI access
      await logAudit(request, 'READ', 'encounters', null);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      hipaaLogger.error('Error fetching unsigned encounters', { context: 'EncounterController.getUnsigned', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching unsigned encounters',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get encounters by discipline
   * GET /encounters/by-discipline
   */
  async getByDiscipline(request, reply) {
    try {
      const { discipline } = request.query;

      if (!discipline) {
        reply.code(400);
        return {
          status: 400,
          message: 'Discipline parameter required',
          error: { code: 'VALIDATION_ERROR', field: 'discipline' }
        };
      }

      const results = await db
        .select({
          id: encounters.id,
          patient_id: encounters.patient_id,
          encounter_type: encounters.encounter_type,
          encounter_status: encounters.encounter_status,
          encounter_date: encounters.encounter_date,
          encounter_duration_minutes: encounters.encounter_duration_minutes,
          visit_location: encounters.visit_location,
          visit_address: encounters.visit_address,
          discipline: encounters.discipline,
          staff_id: encounters.staff_id,
          staff_name: encounters.staff_name,
          staff_credentials: encounters.staff_credentials,
          cosigner_id: encounters.cosigner_id,
          cosigner_name: encounters.cosigner_name,
          gps_check_in: encounters.gps_check_in,
          gps_check_out: encounters.gps_check_out,
          subjective: encounters.subjective,
          objective: encounters.objective,
          assessment: encounters.assessment,
          plan: encounters.plan,
          vital_signs: encounters.vital_signs,
          pain_assessment: encounters.pain_assessment,
          symptoms: encounters.symptoms,
          interventions: encounters.interventions,
          medications_administered: encounters.medications_administered,
          patient_education: encounters.patient_education,
          education_topics: encounters.education_topics,
          patient_understanding: encounters.patient_understanding,
          caregiver_present: encounters.caregiver_present,
          caregiver_name: encounters.caregiver_name,
          caregiver_assessment: encounters.caregiver_assessment,
          caregiver_education: encounters.caregiver_education,
          caregiver_coping: encounters.caregiver_coping,
          emotional_status: encounters.emotional_status,
          spiritual_concerns: encounters.spiritual_concerns,
          social_concerns: encounters.social_concerns,
          safety_concerns: encounters.safety_concerns,
          fall_risk: encounters.fall_risk,
          skin_integrity: encounters.skin_integrity,
          environment_assessment: encounters.environment_assessment,
          home_safety_issues: encounters.home_safety_issues,
          communication_with_physician: encounters.communication_with_physician,
          communication_with_team: encounters.communication_with_team,
          orders_received: encounters.orders_received,
          clinical_notes: encounters.clinical_notes,
          follow_up_needed: encounters.follow_up_needed,
          recommendations: encounters.recommendations,
          attachments: encounters.attachments,
          signature: encounters.signature,
          cosignature: encounters.cosignature,
          amended: encounters.amended,
          amendment_count: encounters.amendment_count,
          created_by_id: encounters.created_by_id,
          updated_by_id: encounters.updated_by_id,
          deleted_at: encounters.deleted_at,
          createdAt: encounters.createdAt,
          updatedAt: encounters.updatedAt
        })
        .from(encounters)
        .where(and(
          eq(encounters.discipline, discipline),
          isNull(encounters.deleted_at)
        ))
        .orderBy(desc(encounters.encounter_date));

      // Log audit for PHI access
      await logAudit(request, 'READ', 'encounters', null);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      hipaaLogger.error('Error fetching encounters by discipline', { context: 'EncounterController.getByDiscipline', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching encounters',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get patient encounters
   * GET /patients/:id/encounters
   */
  async getPatientEncounters(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select({
          id: encounters.id,
          patient_id: encounters.patient_id,
          encounter_type: encounters.encounter_type,
          encounter_status: encounters.encounter_status,
          encounter_date: encounters.encounter_date,
          encounter_duration_minutes: encounters.encounter_duration_minutes,
          visit_location: encounters.visit_location,
          visit_address: encounters.visit_address,
          discipline: encounters.discipline,
          staff_id: encounters.staff_id,
          staff_name: encounters.staff_name,
          staff_credentials: encounters.staff_credentials,
          cosigner_id: encounters.cosigner_id,
          cosigner_name: encounters.cosigner_name,
          gps_check_in: encounters.gps_check_in,
          gps_check_out: encounters.gps_check_out,
          subjective: encounters.subjective,
          objective: encounters.objective,
          assessment: encounters.assessment,
          plan: encounters.plan,
          vital_signs: encounters.vital_signs,
          pain_assessment: encounters.pain_assessment,
          symptoms: encounters.symptoms,
          interventions: encounters.interventions,
          medications_administered: encounters.medications_administered,
          patient_education: encounters.patient_education,
          education_topics: encounters.education_topics,
          patient_understanding: encounters.patient_understanding,
          caregiver_present: encounters.caregiver_present,
          caregiver_name: encounters.caregiver_name,
          caregiver_assessment: encounters.caregiver_assessment,
          caregiver_education: encounters.caregiver_education,
          caregiver_coping: encounters.caregiver_coping,
          emotional_status: encounters.emotional_status,
          spiritual_concerns: encounters.spiritual_concerns,
          social_concerns: encounters.social_concerns,
          safety_concerns: encounters.safety_concerns,
          fall_risk: encounters.fall_risk,
          skin_integrity: encounters.skin_integrity,
          environment_assessment: encounters.environment_assessment,
          home_safety_issues: encounters.home_safety_issues,
          communication_with_physician: encounters.communication_with_physician,
          communication_with_team: encounters.communication_with_team,
          orders_received: encounters.orders_received,
          clinical_notes: encounters.clinical_notes,
          follow_up_needed: encounters.follow_up_needed,
          recommendations: encounters.recommendations,
          attachments: encounters.attachments,
          signature: encounters.signature,
          cosignature: encounters.cosignature,
          amended: encounters.amended,
          amendment_count: encounters.amendment_count,
          created_by_id: encounters.created_by_id,
          updated_by_id: encounters.updated_by_id,
          deleted_at: encounters.deleted_at,
          createdAt: encounters.createdAt,
          updatedAt: encounters.updatedAt
        })
        .from(encounters)
        .where(and(
          eq(encounters.patient_id, parseInt(id)),
          isNull(encounters.deleted_at)
        ))
        .orderBy(desc(encounters.encounter_date));

      // Log audit for patient PHI access
      await logAudit(request, 'READ', 'encounters', null);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      hipaaLogger.error('Error fetching patient encounters', { context: 'EncounterController.getPatientEncounters', error });
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching encounters',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new EncounterController();
