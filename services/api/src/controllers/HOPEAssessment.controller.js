import { db } from '../config/db.drizzle.js';
import { hope_assessments, hope_submissions, hope_compliance_metrics, hope_symptom_tracking, patients } from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, sql, or } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';
/**
 * HOPE Assessment Controller
 * Manages Hospice Outcomes & Patient Evaluation (HOPE) assessments
 * Critical: Non-compliance can result in 4% Medicare payment reduction
 */
class HOPEAssessmentController {
  /**
   * Get all HOPE assessments for a patient
   * GET /patients/:id/hope-assessments
   */
  async getPatientAssessments(request, reply) {
    try {
      const { id } = request.params;

      const assessments = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.patient_id, parseInt(id)))
        .orderBy(desc(hope_assessments.assessment_date));

      reply.code(200);
      return {
        status: 200,
        data: assessments
      };
    } catch (error) {
      logger.error('Error fetching patient HOPE assessments:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create admission assessment (within 5 days of admission)
   * POST /patients/:id/hope-assessments/admission
   */
  async createAdmissionAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Calculate due date (5 days from admission)
      const admissionDate = new Date();
      const dueDate = new Date(admissionDate);
      dueDate.setDate(dueDate.getDate() + 5);

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: 'ADMISSION',
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: admissionDate,
          due_date: dueDate,
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Admission assessment created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating admission assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create HUV1 assessment (days 6-15 after admission)
   * POST /patients/:id/hope-assessments/huv1
   */
  async createHUV1Assessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Calculate due date (day 6-15 after admission)
      const assessmentDate = new Date();
      const dueDate = new Date(assessmentDate);
      dueDate.setDate(dueDate.getDate() + 9); // Day 15 is the deadline

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: 'HUV1',
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'HUV1 assessment created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating HUV1 assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create HUV2 assessment (days 16-30 after admission)
   * POST /patients/:id/hope-assessments/huv2
   */
  async createHUV2Assessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Calculate due date (day 16-30 after admission)
      const assessmentDate = new Date();
      const dueDate = new Date(assessmentDate);
      dueDate.setDate(dueDate.getDate() + 14); // Day 30 is the deadline

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: 'HUV2',
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'HUV2 assessment created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating HUV2 assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create discharge assessment
   * POST /patients/:id/hope-assessments/discharge
   */
  async createDischargeAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const assessmentDate = new Date();

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: 'DISCHARGE',
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Discharge assessment created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating discharge assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create symptom follow-up visit (within 48hrs of moderate/severe symptoms)
   * POST /patients/:id/hope-assessments/sfv
   */
  async createSFVAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Calculate due date (48 hours from symptom occurrence)
      const assessmentDate = new Date();
      const dueDate = new Date(assessmentDate);
      dueDate.setHours(dueDate.getHours() + 48);

      const result = await db
        .insert(hope_assessments)
        .values({
          patient_id: parseInt(id),
          assessment_type: 'SYMPTOM_FOLLOWUP',
          assessment_status: data.assessment_status || 'IN_PROGRESS',
          assessment_date: assessmentDate,
          due_date: dueDate,
          sfv_triggered: true,
          sfv_trigger_date: data.sfv_trigger_date || assessmentDate,
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Symptom follow-up assessment created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating SFV assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get assessment by ID
   * GET /hope-assessments/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update assessment
   * PATCH /hope-assessments/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      // Don't allow updates to signed assessments
      if (existing[0].assessment_status === 'SIGNED' || existing[0].assessment_status === 'SUBMITTED') {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update signed or submitted assessments'
        };
      }

      const result = await db
        .update(hope_assessments)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hope_assessments.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Assessment updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign assessment (21 CFR Part 11 compliance)
   * POST /hope-assessments/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      if (existing[0].assessment_status === 'SIGNED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Assessment already signed'
        };
      }

      // Generate signature hash (SHA-256 of assessment data)
      const dataToSign = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        assessment_type: existing[0].assessment_type,
        assessment_date: existing[0].assessment_date,
        completed_date: new Date().toISOString()
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
        meaning: 'Signature attesting to the accuracy and completeness of this HOPE assessment',
        credentials: request.user?.role || 'Unknown'
      };

      const result = await db
        .update(hope_assessments)
        .set({
          signature: signature,
          assessment_status: 'SIGNED',
          completed_date: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hope_assessments.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Submit assessment to iQIES (CMS system)
   * POST /hope-assessments/:id/submit
   */
  async submit(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(eq(hope_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Assessment not found'
        };
      }

      if (existing[0].assessment_status !== 'SIGNED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Assessment must be signed before submission'
        };
      }

      // Create submission record
      const submissionPayload = {
        assessment_id: existing[0].id,
        patient_id: existing[0].patient_id,
        assessment_type: existing[0].assessment_type,
        assessment_date: existing[0].assessment_date,
        // ... full HOPE data would go here
        submitted_at: new Date().toISOString()
      };

      const submission = await db
        .insert(hope_submissions)
        .values({
          hope_assessment_id: parseInt(id),
          patient_id: existing[0].patient_id,
          submission_date: new Date(),
          submission_type: 'INITIAL',
          submission_status: 'PENDING',
          submission_payload: submissionPayload,
          submitted_by_id: request.user?.id
        })
        .returning();

      // Update assessment status
      await db
        .update(hope_assessments)
        .set({
          assessment_status: 'SUBMITTED',
          submitted_to_iqies: true,
          submission_id: submission[0].id.toString(),
          submission_date: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hope_assessments.id, parseInt(id)));

      // TODO: Actual iQIES integration would happen here
      // This would involve calling the CMS iQIES API

      reply.code(200);
      return {
        status: 200,
        message: 'Assessment submitted to iQIES',
        data: {
          assessment: existing[0],
          submission: submission[0]
        }
      };
    } catch (error) {
      logger.error('Error submitting assessment:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error submitting assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get pending assessments (not yet completed)
   * GET /hope-assessments/pending
   */
  async getPending(request, reply) {
    try {
      const assessments = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(
          or(
            eq(hope_assessments.assessment_status, 'NOT_STARTED'),
            eq(hope_assessments.assessment_status, 'IN_PROGRESS')
          )
        )
        .orderBy(hope_assessments.due_date);

      reply.code(200);
      return {
        status: 200,
        data: assessments,
        count: assessments.length
      };
    } catch (error) {
      logger.error('Error fetching pending assessments:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get overdue assessments (past due date)
   * GET /hope-assessments/overdue
   */
  async getOverdue(request, reply) {
    try {
      const now = new Date();

      const assessments = await db
        .select({
          id: hope_assessments.id,
          patient_id: hope_assessments.patient_id,
          assessment_type: hope_assessments.assessment_type,
          assessment_status: hope_assessments.assessment_status,
          assessment_date: hope_assessments.assessment_date,
          due_date: hope_assessments.due_date,
          completed_date: hope_assessments.completed_date,
          patient_age: hope_assessments.patient_age,
          patient_gender: hope_assessments.patient_gender,
          patient_race: hope_assessments.patient_race,
          patient_ethnicity: hope_assessments.patient_ethnicity,
          primary_diagnosis: hope_assessments.primary_diagnosis,
          caregiver_available: hope_assessments.caregiver_available,
          caregiver_relationship: hope_assessments.caregiver_relationship,
          caregiver_assessment: hope_assessments.caregiver_assessment,
          caregiver_hours_per_week: hope_assessments.caregiver_hours_per_week,
          functional_self_care: hope_assessments.functional_self_care,
          functional_mobility: hope_assessments.functional_mobility,
          cognitive_status: hope_assessments.cognitive_status,
          bims_score: hope_assessments.bims_score,
          bims_details: hope_assessments.bims_details,
          phq2_little_interest: hope_assessments.phq2_little_interest,
          phq2_feeling_down: hope_assessments.phq2_feeling_down,
          phq2_total_score: hope_assessments.phq2_total_score,
          pain_present: hope_assessments.pain_present,
          pain_severity: hope_assessments.pain_severity,
          pain_frequency: hope_assessments.pain_frequency,
          pain_interference: hope_assessments.pain_interference,
          symptoms: hope_assessments.symptoms,
          sfv_triggered: hope_assessments.sfv_triggered,
          sfv_trigger_date: hope_assessments.sfv_trigger_date,
          sfv_trigger_symptoms: hope_assessments.sfv_trigger_symptoms,
          spiritual_assessment: hope_assessments.spiritual_assessment,
          cultural_assessment: hope_assessments.cultural_assessment,
          social_assessment: hope_assessments.social_assessment,
          safety_assessment: hope_assessments.safety_assessment,
          environment_assessment: hope_assessments.environment_assessment,
          goals_of_care: hope_assessments.goals_of_care,
          advance_directives_status: hope_assessments.advance_directives_status,
          code_status: hope_assessments.code_status,
          clinical_notes: hope_assessments.clinical_notes,
          recommendations: hope_assessments.recommendations,
          signature: hope_assessments.signature,
          submitted_to_iqies: hope_assessments.submitted_to_iqies,
          submission_id: hope_assessments.submission_id,
          submission_date: hope_assessments.submission_date,
          created_by_id: hope_assessments.created_by_id,
          updated_by_id: hope_assessments.updated_by_id,
          createdAt: hope_assessments.createdAt,
          updatedAt: hope_assessments.updatedAt
        })
        .from(hope_assessments)
        .where(
          and(
            lte(hope_assessments.due_date, now),
            or(
              eq(hope_assessments.assessment_status, 'NOT_STARTED'),
              eq(hope_assessments.assessment_status, 'IN_PROGRESS')
            )
          )
        )
        .orderBy(hope_assessments.due_date);

      reply.code(200);
      return {
        status: 200,
        data: assessments,
        count: assessments.length
      };
    } catch (error) {
      logger.error('Error fetching overdue assessments:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get compliance metrics (90% threshold requirement)
   * GET /hope-assessments/compliance
   */
  async getCompliance(request, reply) {
    try {
      const { period_start, period_end, assessment_type } = request.query;

      let query = db.select({
        id: hope_compliance_metrics.id,
        reporting_period_start: hope_compliance_metrics.reporting_period_start,
        reporting_period_end: hope_compliance_metrics.reporting_period_end,
        reporting_year: hope_compliance_metrics.reporting_year,
        reporting_quarter: hope_compliance_metrics.reporting_quarter,
        assessment_type: hope_compliance_metrics.assessment_type,
        total_required: hope_compliance_metrics.total_required,
        total_completed: hope_compliance_metrics.total_completed,
        total_completed_timely: hope_compliance_metrics.total_completed_timely,
        total_overdue: hope_compliance_metrics.total_overdue,
        total_missing: hope_compliance_metrics.total_missing,
        completion_rate: hope_compliance_metrics.completion_rate,
        timeliness_rate: hope_compliance_metrics.timeliness_rate,
        compliance_rate: hope_compliance_metrics.compliance_rate,
        meets_threshold: hope_compliance_metrics.meets_threshold,
        penalty_applied: hope_compliance_metrics.penalty_applied,
        penalty_amount: hope_compliance_metrics.penalty_amount,
        status_breakdown: hope_compliance_metrics.status_breakdown,
        notes: hope_compliance_metrics.notes,
        action_plan: hope_compliance_metrics.action_plan,
        calculated_by_id: hope_compliance_metrics.calculated_by_id,
        createdAt: hope_compliance_metrics.createdAt,
        updatedAt: hope_compliance_metrics.updatedAt
      }).from(hope_compliance_metrics);

      if (period_start && period_end) {
        query = query.where(
          and(
            gte(hope_compliance_metrics.reporting_period_start, new Date(period_start)),
            lte(hope_compliance_metrics.reporting_period_end, new Date(period_end))
          )
        );
      }

      if (assessment_type) {
        query = query.where(eq(hope_compliance_metrics.assessment_type, assessment_type));
      }

      const metrics = await query.orderBy(desc(hope_compliance_metrics.reporting_period_end));

      reply.code(200);
      return {
        status: 200,
        data: metrics
      };
    } catch (error) {
      logger.error('Error fetching compliance metrics:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching compliance metrics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new HOPEAssessmentController();
