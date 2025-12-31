import { db } from '../config/db.drizzle.js';
import { detailed_pain_assessments, patients } from '../db/schemas/index.js';
import { eq, and, desc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * Detailed Pain Assessment Controller
 * Manages comprehensive pain assessments including location, quality, severity, triggers, and interventions
 */
class DetailedPainAssessmentController {
  /**
   * Get all detailed pain assessments for a patient
   * GET /patients/:patientId/detailed-pain-assessments
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;

      const assessments = await db
        .select()
        .from(detailed_pain_assessments)
        .where(eq(detailed_pain_assessments.patient_id, parseInt(patientId)))
        .orderBy(desc(detailed_pain_assessments.assessment_date));

      reply.code(200);
      return {
        status: 200,
        message: 'Pain assessments retrieved successfully',
        data: assessments,
        count: assessments.length
      };
    } catch (error) {
      logger.error('Error fetching patient pain assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching pain assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single detailed pain assessment by ID
   * GET /detailed-pain-assessments/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(detailed_pain_assessments)
        .where(eq(detailed_pain_assessments.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Pain assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new detailed pain assessment
   * POST /patients/:patientId/detailed-pain-assessments
   */
  async create(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      const result = await db
        .insert(detailed_pain_assessments)
        .values({
          patient_id: parseInt(patientId),
          ...data,
          assessment_date: data.assessment_date ? new Date(data.assessment_date) : new Date(),
          assessed_by_id: request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await logAudit(request, 'CREATE', 'detailed_pain_assessments', result[0].id);

      reply.code(201);
      return {
        status: 201,
        message: 'Pain assessment created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update a detailed pain assessment
   * PATCH /detailed-pain-assessments/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(detailed_pain_assessments)
        .where(eq(detailed_pain_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Pain assessment not found'
        };
      }

      // Don't allow updates to signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update a signed pain assessment'
        };
      }

      // Remove fields that shouldn't be updated directly
      const { id: _, patient_id, created_by_id, createdAt, ...updateData } = data;

      const result = await db
        .update(detailed_pain_assessments)
        .set({
          ...updateData,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(detailed_pain_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'detailed_pain_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Pain assessment updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete a detailed pain assessment
   * DELETE /detailed-pain-assessments/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(detailed_pain_assessments)
        .where(eq(detailed_pain_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Pain assessment not found'
        };
      }

      // Don't allow deletion of signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete a signed pain assessment'
        };
      }

      await db
        .delete(detailed_pain_assessments)
        .where(eq(detailed_pain_assessments.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'detailed_pain_assessments', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'Pain assessment deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign a pain assessment (21 CFR Part 11 compliance)
   * POST /detailed-pain-assessments/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(detailed_pain_assessments)
        .where(eq(detailed_pain_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Pain assessment not found'
        };
      }

      if (existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Pain assessment already signed'
        };
      }

      const result = await db
        .update(detailed_pain_assessments)
        .set({
          signed_at: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(detailed_pain_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'detailed_pain_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Pain assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all detailed pain assessments (with filters)
   * GET /detailed-pain-assessments
   */
  async index(request, reply) {
    try {
      const { patient_id, pain_status, limit = 50, offset = 0 } = request.query;

      let query = db.select().from(detailed_pain_assessments);

      const conditions = [];
      if (patient_id) {
        conditions.push(eq(detailed_pain_assessments.patient_id, parseInt(patient_id)));
      }
      if (pain_status) {
        conditions.push(eq(detailed_pain_assessments.pain_status, pain_status));
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query
        .orderBy(desc(detailed_pain_assessments.assessment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching pain assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching pain assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get pain assessment statistics for a patient
   * GET /patients/:patientId/detailed-pain-assessments/stats
   */
  async getPatientStats(request, reply) {
    try {
      const { patientId } = request.params;

      // Get the most recent assessment
      const latestAssessment = await db
        .select()
        .from(detailed_pain_assessments)
        .where(eq(detailed_pain_assessments.patient_id, parseInt(patientId)))
        .orderBy(desc(detailed_pain_assessments.assessment_date))
        .limit(1);

      // Get count of assessments
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(detailed_pain_assessments)
        .where(eq(detailed_pain_assessments.patient_id, parseInt(patientId)));

      // Get average pain levels
      const avgResult = await db
        .select({
          avg_current: sql`avg(pain_level_current)`,
          avg_at_rest: sql`avg(pain_level_at_rest)`,
          avg_with_activity: sql`avg(pain_level_with_activity)`
        })
        .from(detailed_pain_assessments)
        .where(eq(detailed_pain_assessments.patient_id, parseInt(patientId)));

      reply.code(200);
      return {
        status: 200,
        data: {
          total_assessments: parseInt(countResult[0]?.count || 0),
          latest_assessment: latestAssessment[0] || null,
          averages: {
            pain_level_current: parseFloat(avgResult[0]?.avg_current) || null,
            pain_level_at_rest: parseFloat(avgResult[0]?.avg_at_rest) || null,
            pain_level_with_activity: parseFloat(avgResult[0]?.avg_with_activity) || null
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching pain assessment stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching pain assessment statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new DetailedPainAssessmentController();
