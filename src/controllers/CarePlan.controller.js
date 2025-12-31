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
}

export default new CarePlanController();
