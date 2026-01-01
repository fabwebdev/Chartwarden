import { db } from '../config/db.drizzle.js';
import { numeric_rating_scales, NRS_PAIN_SEVERITY } from '../db/schemas/numericRatingScale.schema.js';
import { patients } from '../db/schemas/index.js';
import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * Numeric Rating Scale (NRS) Controller
 * Manages self-reported pain assessments using the 0-10 numeric scale
 * Gold standard for pain assessment in cognitively intact adult patients
 */
class NumericRatingScaleController {
  /**
   * Calculate pain severity based on score
   * @param {number} score - NRS pain score (0-10)
   * @returns {string} Pain severity classification
   */
  calculatePainSeverity(score) {
    if (score === 0) return 'NO_PAIN';
    if (score <= 3) return 'MILD';
    if (score <= 6) return 'MODERATE';
    return 'SEVERE';
  }

  /**
   * Validate NRS pain score (must be 0-10)
   * @param {object} data - Assessment data
   * @returns {object} Validation result { valid: boolean, errors: string[] }
   */
  validateScore(data) {
    const errors = [];
    const score = data.pain_score;

    if (score === undefined || score === null) {
      errors.push('pain_score is required');
    } else {
      const numScore = parseInt(score);
      if (isNaN(numScore) || numScore < 0 || numScore > 10) {
        errors.push('pain_score must be between 0 and 10');
      }
    }

    // Validate optional 24h scores if provided
    const optionalScores = ['worst_pain_24h', 'best_pain_24h', 'average_pain_24h', 'acceptable_pain_level'];
    for (const field of optionalScores) {
      if (data[field] !== undefined && data[field] !== null) {
        const val = parseInt(data[field]);
        if (isNaN(val) || val < 0 || val > 10) {
          errors.push(`${field} must be between 0 and 10`);
        }
      }
    }

    // Validate relief percentage if provided
    if (data.relief_percentage !== undefined && data.relief_percentage !== null) {
      const relief = parseInt(data.relief_percentage);
      if (isNaN(relief) || relief < 0 || relief > 100) {
        errors.push('relief_percentage must be between 0 and 100');
      }
    }

    // Validate reassessment score if provided
    if (data.reassessment_score !== undefined && data.reassessment_score !== null) {
      const reassess = parseInt(data.reassessment_score);
      if (isNaN(reassess) || reassess < 0 || reassess > 10) {
        errors.push('reassessment_score must be between 0 and 10');
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Get all NRS assessments for a patient
   * GET /patients/:patientId/numeric-rating-scales
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(numeric_rating_scales.patient_id, parseInt(patientId))];

      if (from_date) {
        conditions.push(gte(numeric_rating_scales.assessment_date, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(numeric_rating_scales.assessment_date, new Date(to_date)));
      }

      const assessments = await db
        .select()
        .from(numeric_rating_scales)
        .where(and(...conditions))
        .orderBy(desc(numeric_rating_scales.assessment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'NRS assessments retrieved successfully',
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient NRS assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching NRS assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single NRS assessment by ID
   * GET /numeric-rating-scales/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(numeric_rating_scales)
        .where(eq(numeric_rating_scales.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'NRS assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching NRS assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching NRS assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new NRS assessment
   * POST /patients/:patientId/numeric-rating-scales
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
          message: 'Invalid NRS score',
          errors: validation.errors
        };
      }

      // Calculate pain severity
      const painScore = parseInt(data.pain_score);
      const painSeverity = this.calculatePainSeverity(painScore);
      const painPresent = painScore > 0;

      const result = await db
        .insert(numeric_rating_scales)
        .values({
          patient_id: parseInt(patientId),
          ...data,
          pain_score: painScore,
          worst_pain_24h: data.worst_pain_24h !== undefined ? parseInt(data.worst_pain_24h) : null,
          best_pain_24h: data.best_pain_24h !== undefined ? parseInt(data.best_pain_24h) : null,
          average_pain_24h: data.average_pain_24h !== undefined ? parseInt(data.average_pain_24h) : null,
          acceptable_pain_level: data.acceptable_pain_level !== undefined ? parseInt(data.acceptable_pain_level) : null,
          relief_percentage: data.relief_percentage !== undefined ? parseInt(data.relief_percentage) : null,
          reassessment_score: data.reassessment_score !== undefined ? parseInt(data.reassessment_score) : null,
          pain_severity: painSeverity,
          pain_present: painPresent,
          assessment_date: data.assessment_date ? new Date(data.assessment_date) : new Date(),
          assessed_by_id: data.assessed_by_id || request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await logAudit(request, 'CREATE', 'numeric_rating_scales', result[0].id);

      reply.code(201);
      return {
        status: 201,
        message: 'NRS assessment created successfully',
        data: result[0],
        interpretation: {
          pain_score: painScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          severity_description: NRS_PAIN_SEVERITY[painSeverity]?.label
        }
      };
    } catch (error) {
      logger.error('Error creating NRS assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating NRS assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update an NRS assessment
   * PATCH /numeric-rating-scales/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(numeric_rating_scales)
        .where(eq(numeric_rating_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'NRS assessment not found'
        };
      }

      // Don't allow updates to signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update a signed NRS assessment. Use amendment instead.'
        };
      }

      // Validate scores if being updated
      const hasScoreUpdate = data.pain_score !== undefined;
      let painScore = existing[0].pain_score;
      let painSeverity = existing[0].pain_severity;
      let painPresent = existing[0].pain_present;

      if (hasScoreUpdate) {
        // Merge existing with updates for validation
        const mergedData = {
          pain_score: data.pain_score ?? existing[0].pain_score,
          worst_pain_24h: data.worst_pain_24h ?? existing[0].worst_pain_24h,
          best_pain_24h: data.best_pain_24h ?? existing[0].best_pain_24h,
          average_pain_24h: data.average_pain_24h ?? existing[0].average_pain_24h,
          acceptable_pain_level: data.acceptable_pain_level ?? existing[0].acceptable_pain_level,
          relief_percentage: data.relief_percentage ?? existing[0].relief_percentage,
          reassessment_score: data.reassessment_score ?? existing[0].reassessment_score
        };

        const validation = this.validateScore(mergedData);
        if (!validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid NRS score',
            errors: validation.errors
          };
        }

        painScore = parseInt(mergedData.pain_score);
        painSeverity = this.calculatePainSeverity(painScore);
        painPresent = painScore > 0;
      }

      // Remove fields that shouldn't be updated directly
      const { id: _, patient_id, created_by_id, createdAt, ...updateData } = data;

      // Parse integer fields if present
      if (updateData.pain_score !== undefined) updateData.pain_score = parseInt(updateData.pain_score);
      if (updateData.worst_pain_24h !== undefined) updateData.worst_pain_24h = parseInt(updateData.worst_pain_24h);
      if (updateData.best_pain_24h !== undefined) updateData.best_pain_24h = parseInt(updateData.best_pain_24h);
      if (updateData.average_pain_24h !== undefined) updateData.average_pain_24h = parseInt(updateData.average_pain_24h);
      if (updateData.acceptable_pain_level !== undefined) updateData.acceptable_pain_level = parseInt(updateData.acceptable_pain_level);
      if (updateData.relief_percentage !== undefined) updateData.relief_percentage = parseInt(updateData.relief_percentage);
      if (updateData.reassessment_score !== undefined) updateData.reassessment_score = parseInt(updateData.reassessment_score);

      const result = await db
        .update(numeric_rating_scales)
        .set({
          ...updateData,
          pain_severity: painSeverity,
          pain_present: painPresent,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(numeric_rating_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'numeric_rating_scales', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'NRS assessment updated successfully',
        data: result[0],
        interpretation: {
          pain_score: painScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          severity_description: NRS_PAIN_SEVERITY[painSeverity]?.label
        }
      };
    } catch (error) {
      logger.error('Error updating NRS assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating NRS assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete an NRS assessment
   * DELETE /numeric-rating-scales/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(numeric_rating_scales)
        .where(eq(numeric_rating_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'NRS assessment not found'
        };
      }

      // Don't allow deletion of signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete a signed NRS assessment'
        };
      }

      await db
        .delete(numeric_rating_scales)
        .where(eq(numeric_rating_scales.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'numeric_rating_scales', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'NRS assessment deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting NRS assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting NRS assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign an NRS assessment (21 CFR Part 11 compliance)
   * POST /numeric-rating-scales/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(numeric_rating_scales)
        .where(eq(numeric_rating_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'NRS assessment not found'
        };
      }

      if (existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'NRS assessment already signed'
        };
      }

      const result = await db
        .update(numeric_rating_scales)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(numeric_rating_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'numeric_rating_scales', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'NRS assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing NRS assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing NRS assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend a signed NRS assessment
   * POST /numeric-rating-scales/:id/amend
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
        .from(numeric_rating_scales)
        .where(eq(numeric_rating_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'NRS assessment not found'
        };
      }

      if (!existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Cannot amend an unsigned assessment. Use update instead.'
        };
      }

      // Recalculate scores if pain_score is being amended
      let painScore = existing[0].pain_score;
      let painSeverity = existing[0].pain_severity;
      let painPresent = existing[0].pain_present;

      if (updateData.pain_score !== undefined) {
        const mergedData = {
          pain_score: updateData.pain_score ?? existing[0].pain_score,
          worst_pain_24h: updateData.worst_pain_24h ?? existing[0].worst_pain_24h,
          best_pain_24h: updateData.best_pain_24h ?? existing[0].best_pain_24h,
          average_pain_24h: updateData.average_pain_24h ?? existing[0].average_pain_24h,
          acceptable_pain_level: updateData.acceptable_pain_level ?? existing[0].acceptable_pain_level,
          relief_percentage: updateData.relief_percentage ?? existing[0].relief_percentage,
          reassessment_score: updateData.reassessment_score ?? existing[0].reassessment_score
        };

        const validation = this.validateScore(mergedData);
        if (!validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid NRS score',
            errors: validation.errors
          };
        }

        painScore = parseInt(mergedData.pain_score);
        painSeverity = this.calculatePainSeverity(painScore);
        painPresent = painScore > 0;
      }

      // Parse integer fields if present
      if (updateData.pain_score !== undefined) updateData.pain_score = parseInt(updateData.pain_score);
      if (updateData.worst_pain_24h !== undefined) updateData.worst_pain_24h = parseInt(updateData.worst_pain_24h);
      if (updateData.best_pain_24h !== undefined) updateData.best_pain_24h = parseInt(updateData.best_pain_24h);
      if (updateData.average_pain_24h !== undefined) updateData.average_pain_24h = parseInt(updateData.average_pain_24h);
      if (updateData.acceptable_pain_level !== undefined) updateData.acceptable_pain_level = parseInt(updateData.acceptable_pain_level);
      if (updateData.relief_percentage !== undefined) updateData.relief_percentage = parseInt(updateData.relief_percentage);
      if (updateData.reassessment_score !== undefined) updateData.reassessment_score = parseInt(updateData.reassessment_score);

      const result = await db
        .update(numeric_rating_scales)
        .set({
          ...updateData,
          pain_severity: painSeverity,
          pain_present: painPresent,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(numeric_rating_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'numeric_rating_scales', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'NRS assessment amended successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error amending NRS assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending NRS assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all NRS assessments (with filters)
   * GET /numeric-rating-scales
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        pain_severity,
        min_score,
        max_score,
        limit = 50,
        offset = 0
      } = request.query;

      const conditions = [];

      if (patient_id) {
        conditions.push(eq(numeric_rating_scales.patient_id, parseInt(patient_id)));
      }
      if (pain_severity) {
        conditions.push(eq(numeric_rating_scales.pain_severity, pain_severity));
      }
      if (min_score !== undefined) {
        conditions.push(gte(numeric_rating_scales.pain_score, parseInt(min_score)));
      }
      if (max_score !== undefined) {
        conditions.push(lte(numeric_rating_scales.pain_score, parseInt(max_score)));
      }

      let query = db.select().from(numeric_rating_scales);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query
        .orderBy(desc(numeric_rating_scales.assessment_date))
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
      logger.error('Error fetching NRS assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching NRS assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get NRS assessment statistics for a patient
   * GET /patients/:patientId/numeric-rating-scales/stats
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
        .from(numeric_rating_scales)
        .where(eq(numeric_rating_scales.patient_id, parseInt(patientId)))
        .orderBy(desc(numeric_rating_scales.assessment_date))
        .limit(1);

      // Get count of assessments
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(numeric_rating_scales)
        .where(eq(numeric_rating_scales.patient_id, parseInt(patientId)));

      // Get average scores for the time period
      const avgResult = await db
        .select({
          avg_score: sql`avg(pain_score)`,
          max_score: sql`max(pain_score)`,
          min_score: sql`min(pain_score)`,
          avg_worst_24h: sql`avg(worst_pain_24h)`,
          avg_best_24h: sql`avg(best_pain_24h)`,
          avg_average_24h: sql`avg(average_pain_24h)`
        })
        .from(numeric_rating_scales)
        .where(
          and(
            eq(numeric_rating_scales.patient_id, parseInt(patientId)),
            gte(numeric_rating_scales.assessment_date, startDate)
          )
        );

      // Get severity distribution
      const severityResult = await db
        .select({
          pain_severity: numeric_rating_scales.pain_severity,
          count: sql`count(*)`
        })
        .from(numeric_rating_scales)
        .where(eq(numeric_rating_scales.patient_id, parseInt(patientId)))
        .groupBy(numeric_rating_scales.pain_severity);

      const severityDistribution = {};
      for (const row of severityResult) {
        severityDistribution[row.pain_severity || 'UNKNOWN'] = parseInt(row.count);
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
            worst_24h: parseFloat(avgResult[0]?.avg_worst_24h) || null,
            best_24h: parseFloat(avgResult[0]?.avg_best_24h) || null,
            average_24h: parseFloat(avgResult[0]?.avg_average_24h) || null
          },
          score_range: {
            max: parseInt(avgResult[0]?.max_score) || null,
            min: parseInt(avgResult[0]?.min_score) || null
          },
          severity_distribution: severityDistribution
        }
      };
    } catch (error) {
      logger.error('Error fetching NRS assessment stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching NRS assessment statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get NRS score trend for a patient
   * GET /patients/:patientId/numeric-rating-scales/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const assessments = await db
        .select({
          id: numeric_rating_scales.id,
          assessment_date: numeric_rating_scales.assessment_date,
          pain_score: numeric_rating_scales.pain_score,
          pain_severity: numeric_rating_scales.pain_severity,
          worst_pain_24h: numeric_rating_scales.worst_pain_24h,
          best_pain_24h: numeric_rating_scales.best_pain_24h,
          average_pain_24h: numeric_rating_scales.average_pain_24h,
          acceptable_pain_level: numeric_rating_scales.acceptable_pain_level,
          intervention_provided: numeric_rating_scales.intervention_provided,
          intervention_effectiveness: numeric_rating_scales.intervention_effectiveness
        })
        .from(numeric_rating_scales)
        .where(
          and(
            eq(numeric_rating_scales.patient_id, parseInt(patientId)),
            gte(numeric_rating_scales.assessment_date, startDate)
          )
        )
        .orderBy(desc(numeric_rating_scales.assessment_date))
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
      logger.error('Error fetching NRS trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching NRS trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get NRS scoring reference
   * GET /numeric-rating-scales/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          name: 'Numeric Rating Scale (NRS)',
          full_name: 'Numeric Pain Rating Scale',
          description: 'Self-reported pain assessment tool using a 0-10 numeric scale. The gold standard for pain assessment in cognitively intact patients who can self-report.',
          target_populations: [
            'Adult patients who can self-report',
            'Cognitively intact patients',
            'Patients who understand numeric concepts',
            'Alert and oriented patients'
          ],
          scoring: {
            range: { min: 0, max: 10 },
            score_descriptions: {
              0: 'No pain',
              1: 'Minimal pain - barely noticeable',
              2: 'Minor pain - does not interfere with activities',
              3: 'Noticeable pain - can be ignored',
              4: 'Moderate pain - can ignore if engaged in task',
              5: 'Moderately strong pain - cannot be ignored for long',
              6: 'Moderately strong pain - interferes with concentration',
              7: 'Severe pain - interferes with normal daily activities',
              8: 'Intense pain - difficult to do anything',
              9: 'Excruciating pain - cannot do anything',
              10: 'Unbearable pain - worst possible pain'
            },
            severity_interpretation: NRS_PAIN_SEVERITY
          },
          additional_assessments: {
            worst_pain_24h: 'Worst pain level experienced in the last 24 hours',
            best_pain_24h: 'Lowest pain level experienced in the last 24 hours',
            average_pain_24h: 'Average pain level over the last 24 hours',
            acceptable_pain_level: 'Pain level the patient finds acceptable as a comfort goal'
          },
          pain_descriptors: [
            'Aching', 'Sharp', 'Burning', 'Stabbing', 'Throbbing',
            'Cramping', 'Dull', 'Shooting', 'Tingling', 'Pressure'
          ],
          clinical_guidelines: {
            reassessment_intervals: {
              NO_PAIN: '4-8 hours or as clinically indicated',
              MILD: '2-4 hours',
              MODERATE: '30-60 minutes after intervention',
              SEVERE: '15-30 minutes after intervention'
            },
            intervention_thresholds: {
              non_pharmacological: 'Score >= 1',
              pharmacological_consideration: 'Score >= 4',
              urgent_intervention: 'Score >= 7'
            },
            hospice_considerations: [
              'Focus on comfort goals rather than complete pain elimination',
              'Consider patient\'s acceptable pain level when setting goals',
              'Balance pain control with alertness preferences',
              'Include family/caregiver in pain management discussions',
              'Document breakthrough pain patterns for medication titration'
            ]
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching NRS reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching NRS reference',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new NumericRatingScaleController();
