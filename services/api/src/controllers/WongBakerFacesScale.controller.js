import { db } from '../config/db.drizzle.js';
import {
  wong_baker_faces_scales,
  WONG_BAKER_FACES,
  WONG_BAKER_PAIN_SEVERITY,
  faceIndexToScore,
  scoreToFaceIndex,
  calculatePainSeverity
} from '../db/schemas/wongBakerFacesScale.schema.js';
import { patients } from '../db/schemas/index.js';
import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * Wong-Baker FACES Pain Rating Scale Controller
 * Manages visual pain assessments using the 6-face scale
 * Designed for pediatric patients, adults with language barriers, and those who prefer visual scales
 */
class WongBakerFacesScaleController {
  /**
   * Calculate pain severity based on score
   * @param {number} score - Pain score (0, 2, 4, 6, 8, or 10)
   * @returns {string} Pain severity classification
   */
  calculatePainSeverity(score) {
    if (score === 0) return 'NO_PAIN';
    if (score <= 3) return 'MILD';
    if (score <= 6) return 'MODERATE';
    return 'SEVERE';
  }

  /**
   * Validate Wong-Baker FACES score
   * Face index must be 0-5, pain score must be 0, 2, 4, 6, 8, or 10
   * @param {object} data - Assessment data
   * @returns {object} Validation result { valid: boolean, errors: string[] }
   */
  validateScore(data) {
    const errors = [];
    const faceSelected = data.face_selected;

    if (faceSelected === undefined || faceSelected === null) {
      errors.push('face_selected is required');
    } else {
      const numFace = parseInt(faceSelected);
      if (isNaN(numFace) || numFace < 0 || numFace > 5) {
        errors.push('face_selected must be between 0 and 5');
      }
    }

    // Validate reassessment face/score if provided
    if (data.reassessment_face !== undefined && data.reassessment_face !== null) {
      const val = parseInt(data.reassessment_face);
      if (isNaN(val) || val < 0 || val > 5) {
        errors.push('reassessment_face must be between 0 and 5');
      }
    }

    if (data.reassessment_score !== undefined && data.reassessment_score !== null) {
      const val = parseInt(data.reassessment_score);
      const validScores = [0, 2, 4, 6, 8, 10];
      if (isNaN(val) || !validScores.includes(val)) {
        errors.push('reassessment_score must be one of: 0, 2, 4, 6, 8, 10');
      }
    }

    // Validate acceptable pain face/score if provided
    if (data.acceptable_pain_face !== undefined && data.acceptable_pain_face !== null) {
      const val = parseInt(data.acceptable_pain_face);
      if (isNaN(val) || val < 0 || val > 5) {
        errors.push('acceptable_pain_face must be between 0 and 5');
      }
    }

    if (data.acceptable_pain_score !== undefined && data.acceptable_pain_score !== null) {
      const val = parseInt(data.acceptable_pain_score);
      const validScores = [0, 2, 4, 6, 8, 10];
      if (isNaN(val) || !validScores.includes(val)) {
        errors.push('acceptable_pain_score must be one of: 0, 2, 4, 6, 8, 10');
      }
    }

    // Validate parent pain estimate if provided (0-10 scale)
    if (data.parent_pain_estimate !== undefined && data.parent_pain_estimate !== null) {
      const val = parseInt(data.parent_pain_estimate);
      if (isNaN(val) || val < 0 || val > 10) {
        errors.push('parent_pain_estimate must be between 0 and 10');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get all Wong-Baker FACES assessments for a patient
   * GET /patients/:patientId/wong-baker-faces-scales
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(wong_baker_faces_scales.patient_id, parseInt(patientId))];

      if (from_date) {
        conditions.push(gte(wong_baker_faces_scales.assessment_date, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(wong_baker_faces_scales.assessment_date, new Date(to_date)));
      }

      const assessments = await db
        .select()
        .from(wong_baker_faces_scales)
        .where(and(...conditions))
        .orderBy(desc(wong_baker_faces_scales.assessment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'Wong-Baker FACES assessments retrieved successfully',
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient Wong-Baker FACES assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching Wong-Baker FACES assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single Wong-Baker FACES assessment by ID
   * GET /wong-baker-faces-scales/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(wong_baker_faces_scales)
        .where(eq(wong_baker_faces_scales.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Wong-Baker FACES assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching Wong-Baker FACES assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching Wong-Baker FACES assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new Wong-Baker FACES assessment
   * POST /patients/:patientId/wong-baker-faces-scales
   */
  async create(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      // Validate score
      const validation = this.validateScore(data);
      if (!validation.valid) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid Wong-Baker FACES score',
          errors: validation.errors
        };
      }

      // Calculate pain score from face selection
      const faceSelected = parseInt(data.face_selected);
      const painScore = faceIndexToScore(faceSelected);
      const painSeverity = this.calculatePainSeverity(painScore);
      const painPresent = painScore > 0;

      // Calculate reassessment values if provided
      let reassessmentScore = null;
      let reassessmentFace = null;
      if (data.reassessment_face !== undefined && data.reassessment_face !== null) {
        reassessmentFace = parseInt(data.reassessment_face);
        reassessmentScore = faceIndexToScore(reassessmentFace);
      } else if (data.reassessment_score !== undefined && data.reassessment_score !== null) {
        reassessmentScore = parseInt(data.reassessment_score);
        reassessmentFace = scoreToFaceIndex(reassessmentScore);
      }

      // Calculate acceptable pain values if provided
      let acceptablePainScore = null;
      let acceptablePainFace = null;
      if (data.acceptable_pain_face !== undefined && data.acceptable_pain_face !== null) {
        acceptablePainFace = parseInt(data.acceptable_pain_face);
        acceptablePainScore = faceIndexToScore(acceptablePainFace);
      } else if (data.acceptable_pain_score !== undefined && data.acceptable_pain_score !== null) {
        acceptablePainScore = parseInt(data.acceptable_pain_score);
        acceptablePainFace = scoreToFaceIndex(acceptablePainScore);
      }

      const result = await db
        .insert(wong_baker_faces_scales)
        .values({
          patient_id: parseInt(patientId),
          ...data,
          face_selected: faceSelected,
          pain_score: painScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          reassessment_face: reassessmentFace,
          reassessment_score: reassessmentScore,
          acceptable_pain_face: acceptablePainFace,
          acceptable_pain_score: acceptablePainScore,
          parent_pain_estimate: data.parent_pain_estimate !== undefined ? parseInt(data.parent_pain_estimate) : null,
          assessment_date: data.assessment_date ? new Date(data.assessment_date) : new Date(),
          assessed_by_id: data.assessed_by_id || request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await logAudit(request, 'CREATE', 'wong_baker_faces_scales', result[0].id);

      reply.code(201);
      return {
        status: 201,
        message: 'Wong-Baker FACES assessment created successfully',
        data: result[0],
        interpretation: {
          face_selected: faceSelected,
          face_info: WONG_BAKER_FACES[faceSelected],
          pain_score: painScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          severity_description: WONG_BAKER_PAIN_SEVERITY[painSeverity]?.label
        }
      };
    } catch (error) {
      logger.error('Error creating Wong-Baker FACES assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating Wong-Baker FACES assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update a Wong-Baker FACES assessment
   * PATCH /wong-baker-faces-scales/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(wong_baker_faces_scales)
        .where(eq(wong_baker_faces_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Wong-Baker FACES assessment not found'
        };
      }

      // Don't allow updates to signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update a signed Wong-Baker FACES assessment. Use amendment instead.'
        };
      }

      // Validate scores if being updated
      const hasFaceUpdate = data.face_selected !== undefined;
      let faceSelected = existing[0].face_selected;
      let painScore = existing[0].pain_score;
      let painSeverity = existing[0].pain_severity;
      let painPresent = existing[0].pain_present;

      if (hasFaceUpdate) {
        const mergedData = {
          face_selected: data.face_selected ?? existing[0].face_selected,
          reassessment_face: data.reassessment_face ?? existing[0].reassessment_face,
          reassessment_score: data.reassessment_score ?? existing[0].reassessment_score,
          acceptable_pain_face: data.acceptable_pain_face ?? existing[0].acceptable_pain_face,
          acceptable_pain_score: data.acceptable_pain_score ?? existing[0].acceptable_pain_score,
          parent_pain_estimate: data.parent_pain_estimate ?? existing[0].parent_pain_estimate
        };

        const validation = this.validateScore(mergedData);
        if (!validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid Wong-Baker FACES score',
            errors: validation.errors
          };
        }

        faceSelected = parseInt(mergedData.face_selected);
        painScore = faceIndexToScore(faceSelected);
        painSeverity = this.calculatePainSeverity(painScore);
        painPresent = painScore > 0;
      }

      // Remove fields that shouldn't be updated directly
      const { id: _, patient_id, created_by_id, createdAt, ...updateData } = data;

      // Parse integer fields if present
      if (updateData.face_selected !== undefined) updateData.face_selected = parseInt(updateData.face_selected);
      if (updateData.reassessment_face !== undefined) updateData.reassessment_face = parseInt(updateData.reassessment_face);
      if (updateData.reassessment_score !== undefined) updateData.reassessment_score = parseInt(updateData.reassessment_score);
      if (updateData.acceptable_pain_face !== undefined) updateData.acceptable_pain_face = parseInt(updateData.acceptable_pain_face);
      if (updateData.acceptable_pain_score !== undefined) updateData.acceptable_pain_score = parseInt(updateData.acceptable_pain_score);
      if (updateData.parent_pain_estimate !== undefined) updateData.parent_pain_estimate = parseInt(updateData.parent_pain_estimate);

      const result = await db
        .update(wong_baker_faces_scales)
        .set({
          ...updateData,
          pain_score: painScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(wong_baker_faces_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'wong_baker_faces_scales', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Wong-Baker FACES assessment updated successfully',
        data: result[0],
        interpretation: {
          face_selected: faceSelected,
          face_info: WONG_BAKER_FACES[faceSelected],
          pain_score: painScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          severity_description: WONG_BAKER_PAIN_SEVERITY[painSeverity]?.label
        }
      };
    } catch (error) {
      logger.error('Error updating Wong-Baker FACES assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating Wong-Baker FACES assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete a Wong-Baker FACES assessment
   * DELETE /wong-baker-faces-scales/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(wong_baker_faces_scales)
        .where(eq(wong_baker_faces_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Wong-Baker FACES assessment not found'
        };
      }

      // Don't allow deletion of signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete a signed Wong-Baker FACES assessment'
        };
      }

      await db
        .delete(wong_baker_faces_scales)
        .where(eq(wong_baker_faces_scales.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'wong_baker_faces_scales', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'Wong-Baker FACES assessment deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting Wong-Baker FACES assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting Wong-Baker FACES assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign a Wong-Baker FACES assessment (21 CFR Part 11 compliance)
   * POST /wong-baker-faces-scales/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(wong_baker_faces_scales)
        .where(eq(wong_baker_faces_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Wong-Baker FACES assessment not found'
        };
      }

      if (existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Wong-Baker FACES assessment already signed'
        };
      }

      const result = await db
        .update(wong_baker_faces_scales)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(wong_baker_faces_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'wong_baker_faces_scales', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Wong-Baker FACES assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing Wong-Baker FACES assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing Wong-Baker FACES assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend a signed Wong-Baker FACES assessment
   * POST /wong-baker-faces-scales/:id/amend
   */
  async amend(request, reply) {
    try {
      const { id } = request.params;
      const { amendment_reason, ...updateData } = request.body;

      if (!amendment_reason) {
        reply.code(400);
        return {
          status: 400,
          message: 'Amendment reason is required'
        };
      }

      const existing = await db
        .select()
        .from(wong_baker_faces_scales)
        .where(eq(wong_baker_faces_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Wong-Baker FACES assessment not found'
        };
      }

      if (!existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Cannot amend an unsigned assessment. Use update instead.'
        };
      }

      // Recalculate scores if face_selected is being amended
      let faceSelected = existing[0].face_selected;
      let painScore = existing[0].pain_score;
      let painSeverity = existing[0].pain_severity;
      let painPresent = existing[0].pain_present;

      if (updateData.face_selected !== undefined) {
        const mergedData = {
          face_selected: updateData.face_selected ?? existing[0].face_selected,
          reassessment_face: updateData.reassessment_face ?? existing[0].reassessment_face,
          reassessment_score: updateData.reassessment_score ?? existing[0].reassessment_score,
          acceptable_pain_face: updateData.acceptable_pain_face ?? existing[0].acceptable_pain_face,
          acceptable_pain_score: updateData.acceptable_pain_score ?? existing[0].acceptable_pain_score,
          parent_pain_estimate: updateData.parent_pain_estimate ?? existing[0].parent_pain_estimate
        };

        const validation = this.validateScore(mergedData);
        if (!validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid Wong-Baker FACES score',
            errors: validation.errors
          };
        }

        faceSelected = parseInt(mergedData.face_selected);
        painScore = faceIndexToScore(faceSelected);
        painSeverity = this.calculatePainSeverity(painScore);
        painPresent = painScore > 0;
      }

      // Parse integer fields if present
      if (updateData.face_selected !== undefined) updateData.face_selected = parseInt(updateData.face_selected);
      if (updateData.reassessment_face !== undefined) updateData.reassessment_face = parseInt(updateData.reassessment_face);
      if (updateData.reassessment_score !== undefined) updateData.reassessment_score = parseInt(updateData.reassessment_score);
      if (updateData.acceptable_pain_face !== undefined) updateData.acceptable_pain_face = parseInt(updateData.acceptable_pain_face);
      if (updateData.acceptable_pain_score !== undefined) updateData.acceptable_pain_score = parseInt(updateData.acceptable_pain_score);
      if (updateData.parent_pain_estimate !== undefined) updateData.parent_pain_estimate = parseInt(updateData.parent_pain_estimate);

      const result = await db
        .update(wong_baker_faces_scales)
        .set({
          ...updateData,
          pain_score: painScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(wong_baker_faces_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'wong_baker_faces_scales', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'Wong-Baker FACES assessment amended successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error amending Wong-Baker FACES assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending Wong-Baker FACES assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all Wong-Baker FACES assessments (with filters)
   * GET /wong-baker-faces-scales
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        pain_severity,
        min_score,
        max_score,
        face_selected,
        limit = 50,
        offset = 0
      } = request.query;

      const conditions = [];

      if (patient_id) {
        conditions.push(eq(wong_baker_faces_scales.patient_id, parseInt(patient_id)));
      }
      if (pain_severity) {
        conditions.push(eq(wong_baker_faces_scales.pain_severity, pain_severity));
      }
      if (min_score !== undefined) {
        conditions.push(gte(wong_baker_faces_scales.pain_score, parseInt(min_score)));
      }
      if (max_score !== undefined) {
        conditions.push(lte(wong_baker_faces_scales.pain_score, parseInt(max_score)));
      }
      if (face_selected !== undefined) {
        conditions.push(eq(wong_baker_faces_scales.face_selected, parseInt(face_selected)));
      }

      let query = db.select().from(wong_baker_faces_scales);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query
        .orderBy(desc(wong_baker_faces_scales.assessment_date))
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
      logger.error('Error fetching Wong-Baker FACES assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching Wong-Baker FACES assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get Wong-Baker FACES assessment statistics for a patient
   * GET /patients/:patientId/wong-baker-faces-scales/stats
   */
  async getPatientStats(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Get the most recent assessment
      const latestAssessment = await db
        .select()
        .from(wong_baker_faces_scales)
        .where(eq(wong_baker_faces_scales.patient_id, parseInt(patientId)))
        .orderBy(desc(wong_baker_faces_scales.assessment_date))
        .limit(1);

      // Get count of assessments
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(wong_baker_faces_scales)
        .where(eq(wong_baker_faces_scales.patient_id, parseInt(patientId)));

      // Get average scores for the time period
      const avgResult = await db
        .select({
          avg_score: sql`avg(pain_score)`,
          max_score: sql`max(pain_score)`,
          min_score: sql`min(pain_score)`,
          avg_face: sql`avg(face_selected)`
        })
        .from(wong_baker_faces_scales)
        .where(
          and(
            eq(wong_baker_faces_scales.patient_id, parseInt(patientId)),
            gte(wong_baker_faces_scales.assessment_date, startDate)
          )
        );

      // Get severity distribution
      const severityResult = await db
        .select({
          pain_severity: wong_baker_faces_scales.pain_severity,
          count: sql`count(*)`
        })
        .from(wong_baker_faces_scales)
        .where(eq(wong_baker_faces_scales.patient_id, parseInt(patientId)))
        .groupBy(wong_baker_faces_scales.pain_severity);

      const severityDistribution = {};
      for (const row of severityResult) {
        severityDistribution[row.pain_severity || 'UNKNOWN'] = parseInt(row.count);
      }

      // Get face selection distribution
      const faceResult = await db
        .select({
          face_selected: wong_baker_faces_scales.face_selected,
          count: sql`count(*)`
        })
        .from(wong_baker_faces_scales)
        .where(eq(wong_baker_faces_scales.patient_id, parseInt(patientId)))
        .groupBy(wong_baker_faces_scales.face_selected);

      const faceDistribution = {};
      for (const row of faceResult) {
        const faceInfo = WONG_BAKER_FACES[row.face_selected];
        faceDistribution[row.face_selected] = {
          count: parseInt(row.count),
          label: faceInfo?.label,
          score: faceInfo?.score
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: {
          total_assessments: parseInt(countResult[0]?.count || 0),
          latest_assessment: latestAssessment[0] || null,
          period_days: parseInt(days),
          averages: {
            pain_score: parseFloat(avgResult[0]?.avg_score) || null,
            face_selected: parseFloat(avgResult[0]?.avg_face) || null
          },
          score_range: {
            max: parseInt(avgResult[0]?.max_score) || null,
            min: parseInt(avgResult[0]?.min_score) || null
          },
          severity_distribution: severityDistribution,
          face_distribution: faceDistribution
        }
      };
    } catch (error) {
      logger.error('Error fetching Wong-Baker FACES assessment stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching Wong-Baker FACES assessment statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get Wong-Baker FACES score trend for a patient
   * GET /patients/:patientId/wong-baker-faces-scales/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const assessments = await db
        .select({
          id: wong_baker_faces_scales.id,
          assessment_date: wong_baker_faces_scales.assessment_date,
          face_selected: wong_baker_faces_scales.face_selected,
          pain_score: wong_baker_faces_scales.pain_score,
          pain_severity: wong_baker_faces_scales.pain_severity,
          intervention_provided: wong_baker_faces_scales.intervention_provided,
          intervention_effectiveness: wong_baker_faces_scales.intervention_effectiveness,
          reassessment_score: wong_baker_faces_scales.reassessment_score,
          reassessment_face: wong_baker_faces_scales.reassessment_face
        })
        .from(wong_baker_faces_scales)
        .where(
          and(
            eq(wong_baker_faces_scales.patient_id, parseInt(patientId)),
            gte(wong_baker_faces_scales.assessment_date, startDate)
          )
        )
        .orderBy(desc(wong_baker_faces_scales.assessment_date))
        .limit(parseInt(limit));

      reply.code(200);
      return {
        status: 200,
        data: {
          period_days: parseInt(days),
          assessments: assessments.reverse(), // Chronological order for charting
          count: assessments.length
        }
      };
    } catch (error) {
      logger.error('Error fetching Wong-Baker FACES trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching Wong-Baker FACES trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get Wong-Baker FACES scoring reference
   * GET /wong-baker-faces-scales/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          name: 'Wong-Baker FACES Pain Rating Scale',
          full_name: 'Wong-Baker FACES Pain Rating Scale',
          description: 'Visual pain assessment tool using 6 faces representing increasing levels of pain. Originally developed for pediatric patients but widely used for patients of all ages who prefer visual scales or have language barriers.',
          reference: 'Wong DL, Baker CM. Pain in children: comparison of assessment scales. Pediatric Nursing, 1988;14(1):9-17.',
          target_populations: [
            'Pediatric patients (3+ years)',
            'Adults who prefer visual scales',
            'Patients with language barriers',
            'Patients with mild cognitive impairment who can still self-report',
            'Elderly patients'
          ],
          scoring: {
            faces: WONG_BAKER_FACES,
            score_mapping: {
              'Face 0': '0 - No Hurt',
              'Face 1': '2 - Hurts Little Bit',
              'Face 2': '4 - Hurts Little More',
              'Face 3': '6 - Hurts Even More',
              'Face 4': '8 - Hurts Whole Lot',
              'Face 5': '10 - Hurts Worst'
            },
            severity_interpretation: WONG_BAKER_PAIN_SEVERITY
          },
          instructions: {
            for_clinician: 'Show the patient the faces and explain that each face shows how much or how little pain someone feels. Ask the patient to point to or identify the face that best describes their own pain.',
            for_patient: 'Point to the face that shows how much you hurt right now.',
            pediatric_guidance: 'Use age-appropriate language. For young children, explain "This face shows no hurt" for face 0 through "This face shows the worst hurt" for face 5.'
          },
          clinical_guidelines: {
            reassessment_intervals: {
              NO_PAIN: '4-8 hours or as clinically indicated',
              MILD: '2-4 hours',
              MODERATE: '30-60 minutes after intervention',
              SEVERE: '15-30 minutes after intervention'
            },
            intervention_thresholds: {
              non_pharmacological: 'Score >= 2 (Face 1 or higher)',
              pharmacological_consideration: 'Score >= 4 (Face 2 or higher)',
              urgent_intervention: 'Score >= 8 (Face 4 or higher)'
            },
            hospice_considerations: [
              'Focus on comfort goals rather than complete pain elimination',
              'Consider patient\'s acceptable pain level when setting goals',
              'Visual scale particularly helpful for patients with communication difficulties',
              'Include family/caregiver in pain management discussions',
              'For pediatric hospice, involve parents in assessment when possible'
            ]
          },
          when_to_use_alternative_scale: {
            FLACC: 'For non-verbal patients, infants, or severely cognitively impaired',
            PAINAD: 'For patients with advanced dementia',
            NRS: 'For cognitively intact adults who prefer numeric scales'
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching Wong-Baker FACES reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching Wong-Baker FACES reference',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new WongBakerFacesScaleController();
