import { db } from '../config/db.drizzle.js';
import { care_plans, problems, goals, interventions, care_plan_revisions, care_plan_templates, patients } from '../db/schemas/index.js';
import { eq, and, desc } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';
/**
 * Care Plan Controller
 * Manages patient-centered care planning
 * Critical: Medicare requirement for all hospice patients
 */
class CarePlanController {
  /**
   * Get all care plans for a patient
   * GET /patients/:id/care-plans
   */
  async getPatientCarePlans(request, reply) {
    try {
      const { id } = request.params;

      const carePlans = await db
        .select()
        .from(care_plans)
        .where(eq(care_plans.patient_id, parseInt(id)))
        .orderBy(desc(care_plans.effective_date));

      reply.code(200);
      return {
        status: 200,
        data: carePlans
      };
    } catch (error) {
      logger.error('Error fetching patient care plans:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching care plans',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create new care plan
   * POST /patients/:id/care-plans
   */
  async createCarePlan(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(care_plans)
        .values({
          patient_id: parseInt(id),
          care_plan_status: data.care_plan_status || 'DRAFT',
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Care plan created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating care plan:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating care plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get care plan by ID (with related problems, goals, interventions)
   * GET /care-plans/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const carePlan = await db
        .select()
        .from(care_plans)
        .where(eq(care_plans.id, parseInt(id)))
        .limit(1);

      if (!carePlan[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Care plan not found'
        };
      }

      // Fetch related problems
      const relatedProblems = await db
        .select()
        .from(problems)
        .where(eq(problems.care_plan_id, parseInt(id)))
        .orderBy(desc(problems.problem_priority));

      // Fetch related goals
      const relatedGoals = await db
        .select()
        .from(goals)
        .where(eq(goals.care_plan_id, parseInt(id)))
        .orderBy(desc(goals.start_date));

      // Fetch related interventions
      const relatedInterventions = await db
        .select()
        .from(interventions)
        .where(eq(interventions.care_plan_id, parseInt(id)))
        .orderBy(desc(interventions.start_date));

      // Fetch revisions
      const revisions = await db
        .select()
        .from(care_plan_revisions)
        .where(eq(care_plan_revisions.care_plan_id, parseInt(id)))
        .orderBy(desc(care_plan_revisions.revision_date));

      reply.code(200);
      return {
        status: 200,
        data: {
          ...carePlan[0],
          problems: relatedProblems,
          goals: relatedGoals,
          interventions: relatedInterventions,
          revisions
        }
      };
    } catch (error) {
      logger.error('Error fetching care plan:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching care plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update care plan
   * PATCH /care-plans/:id
  */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const existing = await db
        .select()
        .from(care_plans)
        .where(eq(care_plans.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Care plan not found'
        };
      }

      // Don't allow updates to signed care plans (must use revisions)
      if (existing[0].care_plan_status === 'SIGNED') {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update signed care plans. Create a revision instead.'
        };
      }

      const result = await db
        .update(care_plans)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(care_plans.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Care plan updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating care plan:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating care plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign care plan (21 CFR Part 11 compliance)
   * POST /care-plans/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;
      const { signature_type = 'RN' } = request.body; // RN or PHYSICIAN

      const existing = await db
        .select()
        .from(care_plans)
        .where(eq(care_plans.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Care plan not found'
        };
      }

      // Generate signature hash
      const dataToSign = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        effective_date: existing[0].effective_date,
        version: existing[0].version
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
        credentials: request.user?.role || 'Unknown'
      };

      const updateData = {
        updated_by_id: request.user?.id,
        updatedAt: new Date()
      };

      if (signature_type === 'PHYSICIAN') {
        updateData.physician_signature = signature;
      } else {
        updateData.rn_signature = signature;
      }

      // Mark as signed if both signatures present
      if (signature_type === 'RN' && existing[0].physician_signature) {
        updateData.care_plan_status = 'SIGNED';
      } else if (signature_type === 'PHYSICIAN' && existing[0].rn_signature) {
        updateData.care_plan_status = 'SIGNED';
      } else {
        updateData.care_plan_status = 'PENDING_SIGNATURE';
      }

      const result = await db
        .update(care_plans)
        .set(updateData)
        .where(eq(care_plans.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: `Care plan ${signature_type.toLowerCase()} signature added`,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing care plan:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing care plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Recertify care plan (for Medicare recertification periods)
   * POST /care-plans/:id/recertify
  */
  async recertify(request, reply) {
    try {
      const { id } = request.params;
      const { recertification_date, revision_reason } = request.body;

      const existing = await db
        .select()
        .from(care_plans)
        .where(eq(care_plans.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Care plan not found'
        };
      }

      // Create new version of care plan for recertification
      const newVersion = await db
        .insert(care_plans)
        .values({
          ...existing[0],
          id: undefined, // Remove ID to create new record
          version: (existing[0].version || 1) + 1,
          care_plan_status: 'DRAFT',
          effective_date: recertification_date || new Date(),
          recertification_date: recertification_date || new Date(),
          previous_version_id: parseInt(id),
          revision_reason: revision_reason || 'Recertification',
          physician_signature: null,
          rn_signature: null,
          patient_signature: null,
          recertified_by_id: request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      // Mark old version as revised
      await db
        .update(care_plans)
        .set({
          care_plan_status: 'REVISED',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(care_plans.id, parseInt(id)));

      // Create revision record
      await db
        .insert(care_plan_revisions)
        .values({
          care_plan_id: parseInt(id),
          patient_id: existing[0].patient_id,
          revision_date: recertification_date || new Date(),
          revision_number: (existing[0].version || 1) + 1,
          revision_type: 'RECERTIFICATION',
          revision_reason: revision_reason || 'Medicare recertification period',
          revised_by_id: request.user?.id,
          revised_by_name: `${request.user?.firstName} ${request.user?.lastName}`
        });

      reply.code(201);
      return {
        status: 201,
        message: 'Care plan recertified',
        data: newVersion[0]
      };
    } catch (error) {
      logger.error('Error recertifying care plan:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error recertifying care plan',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get patient problems
   * GET /patients/:id/problems
   */
  async getPatientProblems(request, reply) {
    try {
      const { id } = request.params;

      const patientProblems = await db
        .select()
        .from(problems)
        .where(eq(problems.patient_id, parseInt(id)))
        .orderBy(desc(problems.problem_priority), desc(problems.identified_date));

      reply.code(200);
      return {
        status: 200,
        data: patientProblems
      };
    } catch (error) {
      logger.error('Error fetching patient problems:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching problems',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create problem
   * POST /patients/:id/problems
   */
  async createProblem(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(problems)
        .values({
          patient_id: parseInt(id),
          identified_by_id: request.user?.id,
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Problem created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating problem:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating problem',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get patient goals
   * GET /patients/:id/goals
   */
  async getPatientGoals(request, reply) {
    try {
      const { id } = request.params;

      const patientGoals = await db
        .select()
        .from(goals)
        .where(eq(goals.patient_id, parseInt(id)))
        .orderBy(desc(goals.start_date));

      reply.code(200);
      return {
        status: 200,
        data: patientGoals
      };
    } catch (error) {
      logger.error('Error fetching patient goals:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching goals',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create goal
   * POST /patients/:id/goals
   */
  async createGoal(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(goals)
        .values({
          patient_id: parseInt(id),
          responsible_staff_id: data.responsible_staff_id || request.user?.id,
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Goal created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating goal:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating goal',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get patient interventions
   * GET /patients/:id/interventions
   */
  async getPatientInterventions(request, reply) {
    try {
      const { id } = request.params;

      const patientInterventions = await db
        .select()
        .from(interventions)
        .where(eq(interventions.patient_id, parseInt(id)))
        .orderBy(desc(interventions.start_date));

      reply.code(200);
      return {
        status: 200,
        data: patientInterventions
      };
    } catch (error) {
      logger.error('Error fetching patient interventions:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching interventions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create intervention
   * POST /patients/:id/interventions
   */
  async createIntervention(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(interventions)
        .values({
          patient_id: parseInt(id),
          responsible_staff_id: data.responsible_staff_id || request.user?.id,
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Intervention created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating intervention:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating intervention',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update problem
   * PATCH /problems/:id
   */
  async updateProblem(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const existing = await db
        .select()
        .from(problems)
        .where(eq(problems.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Problem not found'
        };
      }

      const result = await db
        .update(problems)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(problems.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Problem updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating problem:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating problem',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update goal
   * PATCH /goals/:id
   */
  async updateGoal(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const existing = await db
        .select()
        .from(goals)
        .where(eq(goals.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Goal not found'
        };
      }

      const result = await db
        .update(goals)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(goals.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Goal updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating goal:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating goal',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update goal progress - specialized endpoint for progress tracking
   * POST /goals/:id/progress
   */
  async updateGoalProgress(request, reply) {
    try {
      const { id } = request.params;
      const { progress_level, progress_notes, barriers_to_achievement, modifications_needed } = request.body;

      const existing = await db
        .select()
        .from(goals)
        .where(eq(goals.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Goal not found'
        };
      }

      const updateData = {
        updated_by_id: request.user?.id,
        updatedAt: new Date()
      };

      if (progress_level) updateData.progress_level = progress_level;
      if (progress_notes) updateData.progress_notes = progress_notes;
      if (barriers_to_achievement) updateData.barriers_to_achievement = barriers_to_achievement;
      if (modifications_needed) updateData.modifications_needed = modifications_needed;

      // Auto-update goal_status based on progress_level
      if (progress_level === 'GOAL_ACHIEVED') {
        updateData.goal_status = 'ACHIEVED';
        updateData.achieved_date = new Date().toISOString().split('T')[0];
      } else if (progress_level === 'REGRESSION') {
        updateData.goal_status = 'IN_PROGRESS'; // Keep in progress but note regression
      } else if (['MINIMAL_PROGRESS', 'MODERATE_PROGRESS', 'SIGNIFICANT_PROGRESS'].includes(progress_level)) {
        updateData.goal_status = 'IN_PROGRESS';
      }

      const result = await db
        .update(goals)
        .set(updateData)
        .where(eq(goals.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Goal progress updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating goal progress:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating goal progress',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update intervention
   * PATCH /interventions/:id
   */
  async updateIntervention(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const existing = await db
        .select()
        .from(interventions)
        .where(eq(interventions.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Intervention not found'
        };
      }

      const result = await db
        .update(interventions)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(interventions.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Intervention updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating intervention:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating intervention',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Record intervention performed - increment counter and update dates
   * POST /interventions/:id/performed
   */
  async recordInterventionPerformed(request, reply) {
    try {
      const { id } = request.params;
      const { effectiveness_rating, evaluation_notes, patient_response, next_scheduled_date } = request.body;

      const existing = await db
        .select()
        .from(interventions)
        .where(eq(interventions.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Intervention not found'
        };
      }

      const updateData = {
        last_performed_date: new Date().toISOString().split('T')[0],
        times_performed: (existing[0].times_performed || 0) + 1,
        intervention_status: 'IN_PROGRESS',
        updated_by_id: request.user?.id,
        updatedAt: new Date()
      };

      if (effectiveness_rating) updateData.effectiveness_rating = effectiveness_rating;
      if (evaluation_notes) updateData.evaluation_notes = evaluation_notes;
      if (patient_response) updateData.patient_response = patient_response;
      if (next_scheduled_date) updateData.next_scheduled_date = next_scheduled_date;

      const result = await db
        .update(interventions)
        .set(updateData)
        .where(eq(interventions.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Intervention performed recorded',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error recording intervention performed:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error recording intervention performed',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Discontinue intervention
   * POST /interventions/:id/discontinue
   */
  async discontinueIntervention(request, reply) {
    try {
      const { id } = request.params;
      const { discontinuation_reason } = request.body;

      const existing = await db
        .select()
        .from(interventions)
        .where(eq(interventions.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Intervention not found'
        };
      }

      const result = await db
        .update(interventions)
        .set({
          intervention_status: 'DISCONTINUED',
          discontinued_date: new Date().toISOString().split('T')[0],
          discontinuation_reason: discontinuation_reason,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(interventions.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Intervention discontinued',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error discontinuing intervention:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error discontinuing intervention',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Resolve problem
   * POST /problems/:id/resolve
   */
  async resolveProblem(request, reply) {
    try {
      const { id } = request.params;
      const { notes } = request.body;

      const existing = await db
        .select()
        .from(problems)
        .where(eq(problems.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Problem not found'
        };
      }

      const result = await db
        .update(problems)
        .set({
          problem_status: 'RESOLVED',
          resolved_date: new Date().toISOString().split('T')[0],
          notes: notes || existing[0].notes,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(problems.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Problem resolved',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error resolving problem:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error resolving problem',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get care plan templates
   * GET /care-plan-templates
   */
  async getTemplates(request, reply) {
    try {
      const { diagnosis_category, is_public } = request.query;

      let query = db
        .select()
        .from(care_plan_templates)
        .where(eq(care_plan_templates.is_active, true));

      if (diagnosis_category) {
        query = query.where(eq(care_plan_templates.diagnosis_category, diagnosis_category));
      }

      if (is_public === 'true') {
        query = query.where(eq(care_plan_templates.is_public, true));
      }

      const templates = await query.orderBy(desc(care_plan_templates.use_count));

      reply.code(200);
      return {
        status: 200,
        data: templates
      };
    } catch (error) {
      logger.error('Error fetching care plan templates:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching templates',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create care plan template
   * POST /care-plan-templates
   */
  async createTemplate(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(care_plan_templates)
        .values({
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Template created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating template:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating template',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new CarePlanController();
