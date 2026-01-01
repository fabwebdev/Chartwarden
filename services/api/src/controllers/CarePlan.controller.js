import { db } from '../config/db.drizzle.js';
import { care_plans, problems, goals, interventions, care_plan_revisions, care_plan_templates, patients, users } from '../db/schemas/index.js';
import { eq, and, desc, or, gte, lte, sql, ne, asc, isNull } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';

// Goal milestone schema for tracking within goals
const GOAL_STATUS_TRANSITIONS = {
  NOT_STARTED: ['IN_PROGRESS', 'DISCONTINUED'],
  IN_PROGRESS: ['ACHIEVED', 'PARTIALLY_ACHIEVED', 'NOT_ACHIEVED', 'DISCONTINUED', 'REVISED'],
  ACHIEVED: [], // Final state
  PARTIALLY_ACHIEVED: ['IN_PROGRESS', 'ACHIEVED', 'DISCONTINUED'],
  NOT_ACHIEVED: ['IN_PROGRESS', 'DISCONTINUED'],
  DISCONTINUED: [], // Final state
  REVISED: ['NOT_STARTED', 'IN_PROGRESS'] // Can restart after revision
};

const INTERVENTION_STATUS_TRANSITIONS = {
  PLANNED: ['IN_PROGRESS', 'DISCONTINUED', 'ON_HOLD'],
  IN_PROGRESS: ['COMPLETED', 'DISCONTINUED', 'ON_HOLD'],
  ON_HOLD: ['IN_PROGRESS', 'DISCONTINUED'],
  COMPLETED: [], // Final state
  DISCONTINUED: [] // Final state
};
/**
 * Care Plan Controller
 * Manages patient-centered care planning
 * Critical: Medicare requirement for all hospice patients
 */
class CarePlanController {
  /**
   * Get all care plans for a patient with pagination and filtering
   * GET /patients/:id/care-plans
   * Query params: page, limit, status, start_date, end_date, provider_id
   */
  async getPatientCarePlans(request, reply) {
    try {
      const { id } = request.params;
      const { page = 1, limit = 20, status, start_date, end_date, provider_id } = request.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build conditions array
      const conditions = [eq(care_plans.patient_id, parseInt(id))];

      if (status) {
        conditions.push(eq(care_plans.care_plan_status, status));
      }
      if (start_date) {
        conditions.push(gte(care_plans.effective_date, start_date));
      }
      if (end_date) {
        conditions.push(lte(care_plans.effective_date, end_date));
      }
      if (provider_id) {
        conditions.push(eq(care_plans.created_by_id, provider_id));
      }

      // Get total count for pagination
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(care_plans)
        .where(and(...conditions));

      const total = parseInt(countResult[0]?.count || 0);

      // Get paginated results
      const carePlans = await db
        .select()
        .from(care_plans)
        .where(and(...conditions))
        .orderBy(desc(care_plans.effective_date))
        .limit(limitNum)
        .offset(offset);

      reply.code(200);
      return {
        status: 200,
        data: carePlans,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
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
   * Get all care plans with advanced filtering (across all patients)
   * GET /care-plans
   * Query params: page, limit, status, patient_id, start_date, end_date, provider_id
   */
  async getAllCarePlans(request, reply) {
    try {
      const { page = 1, limit = 20, status, patient_id, start_date, end_date, provider_id } = request.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build conditions array
      const conditions = [];

      if (patient_id) {
        conditions.push(eq(care_plans.patient_id, parseInt(patient_id)));
      }
      if (status) {
        conditions.push(eq(care_plans.care_plan_status, status));
      }
      if (start_date) {
        conditions.push(gte(care_plans.effective_date, start_date));
      }
      if (end_date) {
        conditions.push(lte(care_plans.effective_date, end_date));
      }
      if (provider_id) {
        conditions.push(eq(care_plans.created_by_id, provider_id));
      }

      // Get total count for pagination
      const countQuery = conditions.length > 0
        ? db.select({ count: sql`count(*)` }).from(care_plans).where(and(...conditions))
        : db.select({ count: sql`count(*)` }).from(care_plans);

      const countResult = await countQuery;
      const total = parseInt(countResult[0]?.count || 0);

      // Get paginated results
      const query = conditions.length > 0
        ? db.select().from(care_plans).where(and(...conditions))
        : db.select().from(care_plans);

      const carePlans = await query
        .orderBy(desc(care_plans.effective_date))
        .limit(limitNum)
        .offset(offset);

      reply.code(200);
      return {
        status: 200,
        data: carePlans,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      logger.error('Error fetching care plans:', error)
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
   * Update care plan with optimistic locking
   * PATCH /care-plans/:id
   * Include 'version' in body for concurrent update protection
  */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const { version: clientVersion, ...data } = request.body;

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

      // Optimistic locking - check version if provided
      if (clientVersion !== undefined && existing[0].version !== clientVersion) {
        reply.code(409);
        return {
          status: 409,
          message: 'Care plan has been modified by another user. Please refresh and try again.',
          currentVersion: existing[0].version
        };
      }

      const result = await db
        .update(care_plans)
        .set({
          ...data,
          version: (existing[0].version || 1) + 1,
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
   * Delete care plan
   * DELETE /care-plans/:id
   * Protected: Cannot delete care plans with active interventions
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;
      const { force = false } = request.query;

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

      // Don't allow deletion of signed care plans
      if (existing[0].care_plan_status === 'SIGNED') {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete signed care plans. Archive instead.'
        };
      }

      // Check for active interventions
      const activeInterventions = await db
        .select({ count: sql`count(*)` })
        .from(interventions)
        .where(and(
          eq(interventions.care_plan_id, parseInt(id)),
          or(
            eq(interventions.intervention_status, 'PLANNED'),
            eq(interventions.intervention_status, 'IN_PROGRESS'),
            eq(interventions.intervention_status, 'ON_HOLD')
          )
        ));

      const activeCount = parseInt(activeInterventions[0]?.count || 0);

      if (activeCount > 0 && !force) {
        reply.code(409);
        return {
          status: 409,
          message: `Cannot delete care plan with ${activeCount} active intervention(s). Discontinue interventions first or use force=true.`,
          activeInterventions: activeCount
        };
      }

      // If force=true, discontinue all active interventions first
      if (force && activeCount > 0) {
        await db
          .update(interventions)
          .set({
            intervention_status: 'DISCONTINUED',
            discontinued_date: new Date().toISOString().split('T')[0],
            discontinuation_reason: 'Care plan deleted',
            updated_by_id: request.user?.id,
            updatedAt: new Date()
          })
          .where(and(
            eq(interventions.care_plan_id, parseInt(id)),
            or(
              eq(interventions.intervention_status, 'PLANNED'),
              eq(interventions.intervention_status, 'IN_PROGRESS'),
              eq(interventions.intervention_status, 'ON_HOLD')
            )
          ));
      }

      // Soft delete by archiving
      const result = await db
        .update(care_plans)
        .set({
          care_plan_status: 'ARCHIVED',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(care_plans.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Care plan archived successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error deleting care plan:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting care plan',
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
   * Get patient problems with pagination and filtering
   * GET /patients/:id/problems
   * Query params: page, limit, status, category, care_plan_id, priority
   */
  async getPatientProblems(request, reply) {
    try {
      const { id } = request.params;
      const { page = 1, limit = 20, status, category, care_plan_id, priority } = request.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build conditions array
      const conditions = [eq(problems.patient_id, parseInt(id))];

      if (status) {
        conditions.push(eq(problems.problem_status, status));
      }
      if (category) {
        conditions.push(eq(problems.problem_category, category));
      }
      if (care_plan_id) {
        conditions.push(eq(problems.care_plan_id, parseInt(care_plan_id)));
      }
      if (priority) {
        conditions.push(eq(problems.problem_priority, priority));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(problems)
        .where(and(...conditions));

      const total = parseInt(countResult[0]?.count || 0);

      const patientProblems = await db
        .select()
        .from(problems)
        .where(and(...conditions))
        .orderBy(desc(problems.problem_priority), desc(problems.identified_date))
        .limit(limitNum)
        .offset(offset);

      reply.code(200);
      return {
        status: 200,
        data: patientProblems,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
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
   * Get problem by ID with related goals and interventions
   * GET /problems/:id
   */
  async getProblemById(request, reply) {
    try {
      const { id } = request.params;

      const problem = await db
        .select()
        .from(problems)
        .where(eq(problems.id, parseInt(id)))
        .limit(1);

      if (!problem[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Problem not found'
        };
      }

      // Get related goals
      const relatedGoals = await db
        .select()
        .from(goals)
        .where(eq(goals.problem_id, parseInt(id)))
        .orderBy(desc(goals.start_date));

      // Get related interventions
      const relatedInterventions = await db
        .select()
        .from(interventions)
        .where(eq(interventions.problem_id, parseInt(id)))
        .orderBy(desc(interventions.start_date));

      reply.code(200);
      return {
        status: 200,
        data: {
          ...problem[0],
          goals: relatedGoals,
          interventions: relatedInterventions
        }
      };
    } catch (error) {
      logger.error('Error fetching problem:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching problem',
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
   * Get patient goals with pagination and filtering
   * GET /patients/:id/goals
   * Query params: page, limit, status, progress_level, care_plan_id, problem_id, responsible_staff_id
   */
  async getPatientGoals(request, reply) {
    try {
      const { id } = request.params;
      const { page = 1, limit = 20, status, progress_level, care_plan_id, problem_id, responsible_staff_id } = request.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build conditions array
      const conditions = [eq(goals.patient_id, parseInt(id))];

      if (status) {
        conditions.push(eq(goals.goal_status, status));
      }
      if (progress_level) {
        conditions.push(eq(goals.progress_level, progress_level));
      }
      if (care_plan_id) {
        conditions.push(eq(goals.care_plan_id, parseInt(care_plan_id)));
      }
      if (problem_id) {
        conditions.push(eq(goals.problem_id, parseInt(problem_id)));
      }
      if (responsible_staff_id) {
        conditions.push(eq(goals.responsible_staff_id, responsible_staff_id));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(goals)
        .where(and(...conditions));

      const total = parseInt(countResult[0]?.count || 0);

      const patientGoals = await db
        .select()
        .from(goals)
        .where(and(...conditions))
        .orderBy(desc(goals.start_date))
        .limit(limitNum)
        .offset(offset);

      reply.code(200);
      return {
        status: 200,
        data: patientGoals,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
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
   * Get goal by ID with related interventions and milestones
   * GET /goals/:id
   */
  async getGoalById(request, reply) {
    try {
      const { id } = request.params;

      const goal = await db
        .select()
        .from(goals)
        .where(eq(goals.id, parseInt(id)))
        .limit(1);

      if (!goal[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Goal not found'
        };
      }

      // Get related interventions
      const relatedInterventions = await db
        .select()
        .from(interventions)
        .where(eq(interventions.goal_id, parseInt(id)))
        .orderBy(desc(interventions.start_date));

      // Get related problem if exists
      let relatedProblem = null;
      if (goal[0].problem_id) {
        const problemResult = await db
          .select()
          .from(problems)
          .where(eq(problems.id, goal[0].problem_id))
          .limit(1);
        relatedProblem = problemResult[0] || null;
      }

      reply.code(200);
      return {
        status: 200,
        data: {
          ...goal[0],
          interventions: relatedInterventions,
          problem: relatedProblem
        }
      };
    } catch (error) {
      logger.error('Error fetching goal:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching goal',
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
   * Get patient interventions with pagination and filtering
   * GET /patients/:id/interventions
   * Query params: page, limit, status, category, care_plan_id, goal_id, discipline, responsible_staff_id
   */
  async getPatientInterventions(request, reply) {
    try {
      const { id } = request.params;
      const { page = 1, limit = 20, status, category, care_plan_id, goal_id, discipline, responsible_staff_id } = request.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build conditions array
      const conditions = [eq(interventions.patient_id, parseInt(id))];

      if (status) {
        conditions.push(eq(interventions.intervention_status, status));
      }
      if (category) {
        conditions.push(eq(interventions.intervention_category, category));
      }
      if (care_plan_id) {
        conditions.push(eq(interventions.care_plan_id, parseInt(care_plan_id)));
      }
      if (goal_id) {
        conditions.push(eq(interventions.goal_id, parseInt(goal_id)));
      }
      if (discipline) {
        conditions.push(eq(interventions.discipline, discipline));
      }
      if (responsible_staff_id) {
        conditions.push(eq(interventions.responsible_staff_id, responsible_staff_id));
      }

      // Get total count
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(interventions)
        .where(and(...conditions));

      const total = parseInt(countResult[0]?.count || 0);

      const patientInterventions = await db
        .select()
        .from(interventions)
        .where(and(...conditions))
        .orderBy(desc(interventions.start_date))
        .limit(limitNum)
        .offset(offset);

      reply.code(200);
      return {
        status: 200,
        data: patientInterventions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
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
   * Get intervention by ID with related goal and problem
   * GET /interventions/:id
   */
  async getInterventionById(request, reply) {
    try {
      const { id } = request.params;

      const intervention = await db
        .select()
        .from(interventions)
        .where(eq(interventions.id, parseInt(id)))
        .limit(1);

      if (!intervention[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Intervention not found'
        };
      }

      // Get related goal if exists
      let relatedGoal = null;
      if (intervention[0].goal_id) {
        const goalResult = await db
          .select()
          .from(goals)
          .where(eq(goals.id, intervention[0].goal_id))
          .limit(1);
        relatedGoal = goalResult[0] || null;
      }

      // Get related problem if exists
      let relatedProblem = null;
      if (intervention[0].problem_id) {
        const problemResult = await db
          .select()
          .from(problems)
          .where(eq(problems.id, intervention[0].problem_id))
          .limit(1);
        relatedProblem = problemResult[0] || null;
      }

      reply.code(200);
      return {
        status: 200,
        data: {
          ...intervention[0],
          goal: relatedGoal,
          problem: relatedProblem
        }
      };
    } catch (error) {
      logger.error('Error fetching intervention:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching intervention',
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
   * Discontinue goal with validation
   * POST /goals/:id/discontinue
   */
  async discontinueGoal(request, reply) {
    try {
      const { id } = request.params;
      const { discontinuation_reason, notes } = request.body;

      if (!discontinuation_reason) {
        reply.code(400);
        return {
          status: 400,
          message: 'Discontinuation reason is required'
        };
      }

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

      // Check if goal can be discontinued based on current status
      const currentStatus = existing[0].goal_status;
      const allowedTransitions = GOAL_STATUS_TRANSITIONS[currentStatus] || [];

      if (!allowedTransitions.includes('DISCONTINUED')) {
        reply.code(403);
        return {
          status: 403,
          message: `Cannot discontinue goal with status '${currentStatus}'. Goal is already in a final state.`
        };
      }

      // Discontinue all related active interventions
      await db
        .update(interventions)
        .set({
          intervention_status: 'DISCONTINUED',
          discontinued_date: new Date().toISOString().split('T')[0],
          discontinuation_reason: 'Goal discontinued',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(interventions.goal_id, parseInt(id)),
          or(
            eq(interventions.intervention_status, 'PLANNED'),
            eq(interventions.intervention_status, 'IN_PROGRESS'),
            eq(interventions.intervention_status, 'ON_HOLD')
          )
        ));

      const result = await db
        .update(goals)
        .set({
          goal_status: 'DISCONTINUED',
          discontinued_date: new Date().toISOString().split('T')[0],
          progress_notes: notes ? `${existing[0].progress_notes || ''}\n\n[Discontinued] ${notes}` : existing[0].progress_notes,
          modifications_needed: discontinuation_reason,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(goals.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Goal discontinued',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error discontinuing goal:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error discontinuing goal',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add milestone to goal
   * POST /goals/:id/milestones
   */
  async addGoalMilestone(request, reply) {
    try {
      const { id } = request.params;
      const { milestone_description, milestone_date, achieved = false, notes } = request.body;

      if (!milestone_description) {
        reply.code(400);
        return {
          status: 400,
          message: 'Milestone description is required'
        };
      }

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

      // Append milestone to progress notes in a structured format
      const milestoneEntry = `\n[Milestone ${milestone_date || new Date().toISOString().split('T')[0]}] ${milestone_description}${achieved ? ' ✓ ACHIEVED' : ''}${notes ? ` - ${notes}` : ''}`;

      const result = await db
        .update(goals)
        .set({
          progress_notes: (existing[0].progress_notes || '') + milestoneEntry,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(goals.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Milestone added to goal',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding goal milestone:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding goal milestone',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete problem (soft delete via status change)
   * DELETE /problems/:id
   */
  async deleteProblem(request, reply) {
    try {
      const { id } = request.params;

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

      // Check for active goals related to this problem
      const activeGoals = await db
        .select({ count: sql`count(*)` })
        .from(goals)
        .where(and(
          eq(goals.problem_id, parseInt(id)),
          or(
            eq(goals.goal_status, 'NOT_STARTED'),
            eq(goals.goal_status, 'IN_PROGRESS')
          )
        ));

      const activeGoalCount = parseInt(activeGoals[0]?.count || 0);

      if (activeGoalCount > 0) {
        reply.code(409);
        return {
          status: 409,
          message: `Cannot delete problem with ${activeGoalCount} active goal(s). Discontinue or resolve goals first.`,
          activeGoals: activeGoalCount
        };
      }

      // Soft delete by marking as resolved
      const result = await db
        .update(problems)
        .set({
          problem_status: 'RESOLVED',
          resolved_date: new Date().toISOString().split('T')[0],
          notes: `${existing[0].notes || ''}\n[Deleted by user]`,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(problems.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Problem deleted (marked as resolved)',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error deleting problem:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting problem',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete goal (soft delete via discontinue)
   * DELETE /goals/:id
   */
  async deleteGoal(request, reply) {
    try {
      const { id } = request.params;

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

      // Check for active interventions related to this goal
      const activeInterventions = await db
        .select({ count: sql`count(*)` })
        .from(interventions)
        .where(and(
          eq(interventions.goal_id, parseInt(id)),
          or(
            eq(interventions.intervention_status, 'PLANNED'),
            eq(interventions.intervention_status, 'IN_PROGRESS'),
            eq(interventions.intervention_status, 'ON_HOLD')
          )
        ));

      const activeCount = parseInt(activeInterventions[0]?.count || 0);

      if (activeCount > 0) {
        reply.code(409);
        return {
          status: 409,
          message: `Cannot delete goal with ${activeCount} active intervention(s). Discontinue interventions first.`,
          activeInterventions: activeCount
        };
      }

      // Soft delete by marking as discontinued
      const result = await db
        .update(goals)
        .set({
          goal_status: 'DISCONTINUED',
          discontinued_date: new Date().toISOString().split('T')[0],
          progress_notes: `${existing[0].progress_notes || ''}\n[Deleted by user]`,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(goals.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Goal deleted (discontinued)',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error deleting goal:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting goal',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete intervention (soft delete via discontinue)
   * DELETE /interventions/:id
   */
  async deleteIntervention(request, reply) {
    try {
      const { id } = request.params;

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

      // Soft delete by marking as discontinued
      const result = await db
        .update(interventions)
        .set({
          intervention_status: 'DISCONTINUED',
          discontinued_date: new Date().toISOString().split('T')[0],
          discontinuation_reason: 'Deleted by user',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(interventions.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Intervention deleted (discontinued)',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error deleting intervention:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting intervention',
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
