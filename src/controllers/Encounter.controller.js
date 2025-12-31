import { db } from '../config/db.drizzle.js';
import { encounters, encounter_addendums, encounter_amendments, encounter_templates, patients } from '../db/schemas/index.js';
import { eq, and, desc, or, isNull } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';
/**
 * Encounter Controller
 * Manages clinical encounter documentation
 * Critical: Required for billing and regulatory compliance
 */
class EncounterController {
  /**
   * Get all encounters (with pagination and filters)
   * GET /encounters
   */
  async index(request, reply) {
    try {
      const { patient_id, discipline, status, limit = 50, offset = 0 } = request.query;

      let query = db.select({
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
      }).from(encounters).where(isNull(encounters.deleted_at));

      if (patient_id) {
        query = query.where(eq(encounters.patient_id, parseInt(patient_id)));
      }
      if (discipline) {
        query = query.where(eq(encounters.discipline, discipline));
      }
      if (status) {
        query = query.where(eq(encounters.encounter_status, status));
      }

      const results = await query
        .orderBy(desc(encounters.encounter_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching encounters:', error)
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
   */
  async store(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(encounters)
        .values({
          ...data,
          encounter_status: data.encounter_status || 'IN_PROGRESS',
          staff_id: data.staff_id || request.user?.id,
          staff_name: data.staff_name || `${request.user?.firstName} ${request.user?.lastName}`,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Encounter created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating encounter:', error)
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
      logger.error('Error fetching encounter:', error)
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
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

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

      // Don't allow updates to signed encounters (must use amendments)
      if (existing[0].encounter_status === 'SIGNED' || existing[0].encounter_status === 'COSIGNED') {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update signed encounters. Use amendments instead.'
        };
      }

      const result = await db
        .update(encounters)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(encounters.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Encounter updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating encounter:', error)
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
   */
  async destroy(request, reply) {
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

      // Only allow deletion of unsigned encounters
      if (existing[0].encounter_status === 'SIGNED' || existing[0].encounter_status === 'COSIGNED') {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete signed encounters'
        };
      }

      // Soft delete
      await db
        .update(encounters)
        .set({
          deleted_at: new Date(),
          updated_by_id: request.user?.id
        })
        .where(eq(encounters.id, parseInt(id)));

      reply.code(200);
      return {
        status: 200,
        message: 'Encounter deleted'
      };
    } catch (error) {
      logger.error('Error deleting encounter:', error)
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

      reply.code(200);
      return {
        status: 200,
        message: 'Encounter signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing encounter:', error)
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

      reply.code(200);
      return {
        status: 200,
        message: 'Encounter cosigned successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error cosigning encounter:', error)
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

      reply.code(201);
      return {
        status: 201,
        message: 'Addendum added successfully',
        data: addendum[0]
      };
    } catch (error) {
      logger.error('Error adding addendum:', error)
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

      reply.code(201);
      return {
        status: 201,
        message: 'Amendment added successfully',
        data: amendment[0]
      };
    } catch (error) {
      logger.error('Error adding amendment:', error)
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

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching unsigned encounters:', error)
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
          message: 'Discipline parameter required'
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

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching encounters by discipline:', error)
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

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching patient encounters:', error)
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
