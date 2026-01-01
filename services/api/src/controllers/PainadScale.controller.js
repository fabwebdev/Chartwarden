import { db } from '../config/db.drizzle.js';
import { painad_scales, PAINAD_PAIN_SEVERITY, PAINAD_SCORE_DESCRIPTIONS, PAINAD_DEMENTIA_STAGES, PAINAD_COMMON_CAUSES, PAINAD_NON_PHARM_INTERVENTIONS } from '../db/schemas/painadScale.schema.js';
import { patients } from '../db/schemas/index.js';
import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * PAINAD Scale Controller
 * Manages PAINAD (Pain Assessment in Advanced Dementia) assessments
 * for dementia patients who cannot self-report pain
 */
class PainadScaleController {
  /**
   * Calculate pain severity based on total score
   * @param {number} totalScore - PAINAD total score (0-10)
   * @returns {string} Pain severity classification
   */
  calculatePainSeverity(totalScore) {
    if (totalScore === 0) return 'NO_PAIN';
    if (totalScore <= 3) return 'MILD';
    if (totalScore <= 6) return 'MODERATE';
    return 'SEVERE';
  }

  /**
   * Validate PAINAD component scores (must be 0, 1, or 2)
   * @param {object} data - Assessment data
   * @returns {object} Validation result { valid: boolean, errors: string[] }
   */
  validateScores(data) {
    const errors = [];
    const components = [
      'breathing_score',
      'negative_vocalization_score',
      'facial_expression_score',
      'body_language_score',
      'consolability_score'
    ];

    for (const component of components) {
      const score = data[component];
      if (score === undefined || score === null) {
        errors.push(`${component} is required`);
      } else if (![0, 1, 2].includes(parseInt(score))) {
        errors.push(`${component} must be 0, 1, or 2`);
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Calculate total PAINAD score from components
   * @param {object} data - Assessment data with component scores
   * @returns {number} Total score (0-10)
   */
  calculateTotalScore(data) {
    return (
      parseInt(data.breathing_score || 0) +
      parseInt(data.negative_vocalization_score || 0) +
      parseInt(data.facial_expression_score || 0) +
      parseInt(data.body_language_score || 0) +
      parseInt(data.consolability_score || 0)
    );
  }

  /**
   * Get all PAINAD assessments for a patient
   * GET /patients/:patientId/painad-scales
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(painad_scales.patient_id, parseInt(patientId))];

      if (from_date) {
        conditions.push(gte(painad_scales.assessment_date, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(painad_scales.assessment_date, new Date(to_date)));
      }

      const assessments = await db
        .select()
        .from(painad_scales)
        .where(and(...conditions))
        .orderBy(desc(painad_scales.assessment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'PAINAD assessments retrieved successfully',
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient PAINAD assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching PAINAD assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single PAINAD assessment by ID
   * GET /painad-scales/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(painad_scales)
        .where(eq(painad_scales.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'PAINAD assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching PAINAD assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching PAINAD assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new PAINAD assessment
   * POST /patients/:patientId/painad-scales
   */
  async create(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      // Validate component scores
      const validation = this.validateScores(data);
      if (!validation.valid) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid PAINAD scores',
          errors: validation.errors
        };
      }

      // Calculate total score and pain severity
      const totalScore = this.calculateTotalScore(data);
      const painSeverity = this.calculatePainSeverity(totalScore);
      const painPresent = totalScore > 0;

      const result = await db
        .insert(painad_scales)
        .values({
          patient_id: parseInt(patientId),
          ...data,
          breathing_score: parseInt(data.breathing_score),
          negative_vocalization_score: parseInt(data.negative_vocalization_score),
          facial_expression_score: parseInt(data.facial_expression_score),
          body_language_score: parseInt(data.body_language_score),
          consolability_score: parseInt(data.consolability_score),
          total_score: totalScore,
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

      await logAudit(request, 'CREATE', 'painad_scales', result[0].id);

      reply.code(201);
      return {
        status: 201,
        message: 'PAINAD assessment created successfully',
        data: result[0],
        interpretation: {
          total_score: totalScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          severity_description: PAINAD_PAIN_SEVERITY[painSeverity]?.label
        }
      };
    } catch (error) {
      logger.error('Error creating PAINAD assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating PAINAD assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update a PAINAD assessment
   * PATCH /painad-scales/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(painad_scales)
        .where(eq(painad_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'PAINAD assessment not found'
        };
      }

      // Don't allow updates to signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update a signed PAINAD assessment. Use amendment instead.'
        };
      }

      // Validate scores if any are being updated
      const hasScoreUpdate = [
        'breathing_score',
        'negative_vocalization_score',
        'facial_expression_score',
        'body_language_score',
        'consolability_score'
      ].some(key => data[key] !== undefined);

      let totalScore = existing[0].total_score;
      let painSeverity = existing[0].pain_severity;
      let painPresent = existing[0].pain_present;

      if (hasScoreUpdate) {
        // Merge existing scores with updates for validation
        const mergedData = {
          breathing_score: data.breathing_score ?? existing[0].breathing_score,
          negative_vocalization_score: data.negative_vocalization_score ?? existing[0].negative_vocalization_score,
          facial_expression_score: data.facial_expression_score ?? existing[0].facial_expression_score,
          body_language_score: data.body_language_score ?? existing[0].body_language_score,
          consolability_score: data.consolability_score ?? existing[0].consolability_score
        };

        const validation = this.validateScores(mergedData);
        if (!validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid PAINAD scores',
            errors: validation.errors
          };
        }

        totalScore = this.calculateTotalScore(mergedData);
        painSeverity = this.calculatePainSeverity(totalScore);
        painPresent = totalScore > 0;
      }

      // Remove fields that shouldn't be updated directly
      const { id: _, patient_id, created_by_id, createdAt, ...updateData } = data;

      const result = await db
        .update(painad_scales)
        .set({
          ...updateData,
          total_score: totalScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(painad_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'painad_scales', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'PAINAD assessment updated successfully',
        data: result[0],
        interpretation: {
          total_score: totalScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          severity_description: PAINAD_PAIN_SEVERITY[painSeverity]?.label
        }
      };
    } catch (error) {
      logger.error('Error updating PAINAD assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating PAINAD assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete a PAINAD assessment
   * DELETE /painad-scales/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(painad_scales)
        .where(eq(painad_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'PAINAD assessment not found'
        };
      }

      // Don't allow deletion of signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete a signed PAINAD assessment'
        };
      }

      await db
        .delete(painad_scales)
        .where(eq(painad_scales.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'painad_scales', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'PAINAD assessment deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting PAINAD assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting PAINAD assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign a PAINAD assessment (21 CFR Part 11 compliance)
   * POST /painad-scales/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(painad_scales)
        .where(eq(painad_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'PAINAD assessment not found'
        };
      }

      if (existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'PAINAD assessment already signed'
        };
      }

      const result = await db
        .update(painad_scales)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(painad_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'painad_scales', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'PAINAD assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing PAINAD assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing PAINAD assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend a signed PAINAD assessment
   * POST /painad-scales/:id/amend
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
        .from(painad_scales)
        .where(eq(painad_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'PAINAD assessment not found'
        };
      }

      if (!existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Cannot amend an unsigned assessment. Use update instead.'
        };
      }

      // Recalculate scores if any component scores are being amended
      let totalScore = existing[0].total_score;
      let painSeverity = existing[0].pain_severity;
      let painPresent = existing[0].pain_present;

      const hasScoreUpdate = [
        'breathing_score',
        'negative_vocalization_score',
        'facial_expression_score',
        'body_language_score',
        'consolability_score'
      ].some(key => updateData[key] !== undefined);

      if (hasScoreUpdate) {
        const mergedData = {
          breathing_score: updateData.breathing_score ?? existing[0].breathing_score,
          negative_vocalization_score: updateData.negative_vocalization_score ?? existing[0].negative_vocalization_score,
          facial_expression_score: updateData.facial_expression_score ?? existing[0].facial_expression_score,
          body_language_score: updateData.body_language_score ?? existing[0].body_language_score,
          consolability_score: updateData.consolability_score ?? existing[0].consolability_score
        };

        const validation = this.validateScores(mergedData);
        if (!validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid PAINAD scores',
            errors: validation.errors
          };
        }

        totalScore = this.calculateTotalScore(mergedData);
        painSeverity = this.calculatePainSeverity(totalScore);
        painPresent = totalScore > 0;
      }

      const result = await db
        .update(painad_scales)
        .set({
          ...updateData,
          total_score: totalScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(painad_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'painad_scales', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'PAINAD assessment amended successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error amending PAINAD assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending PAINAD assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all PAINAD assessments (with filters)
   * GET /painad-scales
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        pain_severity,
        dementia_stage,
        min_score,
        max_score,
        limit = 50,
        offset = 0
      } = request.query;

      const conditions = [];

      if (patient_id) {
        conditions.push(eq(painad_scales.patient_id, parseInt(patient_id)));
      }
      if (pain_severity) {
        conditions.push(eq(painad_scales.pain_severity, pain_severity));
      }
      if (dementia_stage) {
        conditions.push(eq(painad_scales.dementia_stage, dementia_stage));
      }
      if (min_score !== undefined) {
        conditions.push(gte(painad_scales.total_score, parseInt(min_score)));
      }
      if (max_score !== undefined) {
        conditions.push(lte(painad_scales.total_score, parseInt(max_score)));
      }

      let query = db.select().from(painad_scales);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query
        .orderBy(desc(painad_scales.assessment_date))
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
      logger.error('Error fetching PAINAD assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching PAINAD assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get PAINAD assessment statistics for a patient
   * GET /patients/:patientId/painad-scales/stats
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
        .from(painad_scales)
        .where(eq(painad_scales.patient_id, parseInt(patientId)))
        .orderBy(desc(painad_scales.assessment_date))
        .limit(1);

      // Get count of assessments
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(painad_scales)
        .where(eq(painad_scales.patient_id, parseInt(patientId)));

      // Get average scores for the time period
      const avgResult = await db
        .select({
          avg_total: sql`avg(total_score)`,
          avg_breathing: sql`avg(breathing_score)`,
          avg_negative_vocalization: sql`avg(negative_vocalization_score)`,
          avg_facial_expression: sql`avg(facial_expression_score)`,
          avg_body_language: sql`avg(body_language_score)`,
          avg_consolability: sql`avg(consolability_score)`,
          max_total: sql`max(total_score)`,
          min_total: sql`min(total_score)`
        })
        .from(painad_scales)
        .where(
          and(
            eq(painad_scales.patient_id, parseInt(patientId)),
            gte(painad_scales.assessment_date, startDate)
          )
        );

      // Get severity distribution
      const severityResult = await db
        .select({
          pain_severity: painad_scales.pain_severity,
          count: sql`count(*)`
        })
        .from(painad_scales)
        .where(eq(painad_scales.patient_id, parseInt(patientId)))
        .groupBy(painad_scales.pain_severity);

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
            total_score: parseFloat(avgResult[0]?.avg_total) || null,
            breathing_score: parseFloat(avgResult[0]?.avg_breathing) || null,
            negative_vocalization_score: parseFloat(avgResult[0]?.avg_negative_vocalization) || null,
            facial_expression_score: parseFloat(avgResult[0]?.avg_facial_expression) || null,
            body_language_score: parseFloat(avgResult[0]?.avg_body_language) || null,
            consolability_score: parseFloat(avgResult[0]?.avg_consolability) || null
          },
          score_range: {
            max: parseInt(avgResult[0]?.max_total) || null,
            min: parseInt(avgResult[0]?.min_total) || null
          },
          severity_distribution: severityDistribution
        }
      };
    } catch (error) {
      logger.error('Error fetching PAINAD assessment stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching PAINAD assessment statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get PAINAD score trend for a patient
   * GET /patients/:patientId/painad-scales/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const assessments = await db
        .select({
          id: painad_scales.id,
          assessment_date: painad_scales.assessment_date,
          total_score: painad_scales.total_score,
          pain_severity: painad_scales.pain_severity,
          breathing_score: painad_scales.breathing_score,
          negative_vocalization_score: painad_scales.negative_vocalization_score,
          facial_expression_score: painad_scales.facial_expression_score,
          body_language_score: painad_scales.body_language_score,
          consolability_score: painad_scales.consolability_score,
          intervention_provided: painad_scales.intervention_provided,
          intervention_effectiveness: painad_scales.intervention_effectiveness
        })
        .from(painad_scales)
        .where(
          and(
            eq(painad_scales.patient_id, parseInt(patientId)),
            gte(painad_scales.assessment_date, startDate)
          )
        )
        .orderBy(desc(painad_scales.assessment_date))
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
      logger.error('Error fetching PAINAD trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching PAINAD trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get PAINAD scoring reference
   * GET /painad-scales/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          name: 'PAINAD Scale',
          full_name: 'Pain Assessment in Advanced Dementia',
          description: 'Behavioral pain assessment tool for patients with advanced dementia who cannot self-report pain',
          target_populations: [
            'Patients with advanced dementia',
            'Non-verbal patients with cognitive impairment',
            'Hospice patients with cognitive decline',
            'Patients unable to self-report pain'
          ],
          reference: 'Warden V, Hurley AC, Volicer L. (2003) Development and psychometric evaluation of the Pain Assessment in Advanced Dementia (PAINAD) scale. Journal of the American Medical Directors Association, 4(1), 9-15.',
          scoring: {
            components: PAINAD_SCORE_DESCRIPTIONS,
            total_range: { min: 0, max: 10 },
            severity_interpretation: PAINAD_PAIN_SEVERITY
          },
          dementia_stages: PAINAD_DEMENTIA_STAGES,
          common_pain_causes: PAINAD_COMMON_CAUSES,
          non_pharmacological_interventions: PAINAD_NON_PHARM_INTERVENTIONS,
          clinical_guidelines: {
            assessment_timing: {
              routine: 'At minimum every shift or with each visit',
              during_care: 'During repositioning, transfers, ADLs',
              post_intervention: '30-60 minutes after intervention'
            },
            reassessment_intervals: {
              NO_PAIN: 'Every shift or visit',
              MILD: 'Every 4 hours or as indicated',
              MODERATE: '1-2 hours after intervention',
              SEVERE: '30-60 minutes after intervention'
            },
            intervention_thresholds: {
              non_pharmacological: 'Score >= 1',
              pharmacological_consideration: 'Score >= 4',
              urgent_intervention: 'Score >= 7'
            }
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching PAINAD reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching PAINAD reference',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new PainadScaleController();
