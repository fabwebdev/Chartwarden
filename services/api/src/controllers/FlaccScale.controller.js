import { db } from '../config/db.drizzle.js';
import { flacc_scales, FLACC_PAIN_SEVERITY } from '../db/schemas/flaccScale.schema.js';
import { patients } from '../db/schemas/index.js';
import { eq, and, desc, sql, gte, lte, between } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * FLACC Scale Controller
 * Manages FLACC (Face, Legs, Activity, Cry, Consolability) pain assessments
 * for pediatric and non-verbal patients
 */
class FlaccScaleController {
  /**
   * Calculate pain severity based on total score
   * @param {number} totalScore - FLACC total score (0-10)
   * @returns {string} Pain severity classification
   */
  calculatePainSeverity(totalScore) {
    if (totalScore === 0) return 'NO_PAIN';
    if (totalScore <= 3) return 'MILD';
    if (totalScore <= 6) return 'MODERATE';
    return 'SEVERE';
  }

  /**
   * Validate FLACC component scores (must be 0, 1, or 2)
   * @param {object} data - Assessment data
   * @returns {object} Validation result { valid: boolean, errors: string[] }
   */
  validateScores(data) {
    const errors = [];
    const components = ['face_score', 'legs_score', 'activity_score', 'cry_score', 'consolability_score'];

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
   * Calculate total FLACC score from components
   * @param {object} data - Assessment data with component scores
   * @returns {number} Total score (0-10)
   */
  calculateTotalScore(data) {
    return (
      parseInt(data.face_score || 0) +
      parseInt(data.legs_score || 0) +
      parseInt(data.activity_score || 0) +
      parseInt(data.cry_score || 0) +
      parseInt(data.consolability_score || 0)
    );
  }

  /**
   * Get all FLACC assessments for a patient
   * GET /patients/:patientId/flacc-scales
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(flacc_scales.patient_id, parseInt(patientId))];

      if (from_date) {
        conditions.push(gte(flacc_scales.assessment_date, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(flacc_scales.assessment_date, new Date(to_date)));
      }

      const assessments = await db
        .select()
        .from(flacc_scales)
        .where(and(...conditions))
        .orderBy(desc(flacc_scales.assessment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'FLACC assessments retrieved successfully',
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient FLACC assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching FLACC assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single FLACC assessment by ID
   * GET /flacc-scales/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(flacc_scales)
        .where(eq(flacc_scales.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'FLACC assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching FLACC assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching FLACC assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new FLACC assessment
   * POST /patients/:patientId/flacc-scales
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
          message: 'Invalid FLACC scores',
          errors: validation.errors
        };
      }

      // Calculate total score and pain severity
      const totalScore = this.calculateTotalScore(data);
      const painSeverity = this.calculatePainSeverity(totalScore);
      const painPresent = totalScore > 0;

      const result = await db
        .insert(flacc_scales)
        .values({
          patient_id: parseInt(patientId),
          ...data,
          face_score: parseInt(data.face_score),
          legs_score: parseInt(data.legs_score),
          activity_score: parseInt(data.activity_score),
          cry_score: parseInt(data.cry_score),
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

      await logAudit(request, 'CREATE', 'flacc_scales', result[0].id);

      reply.code(201);
      return {
        status: 201,
        message: 'FLACC assessment created successfully',
        data: result[0],
        interpretation: {
          total_score: totalScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          severity_description: FLACC_PAIN_SEVERITY[painSeverity]?.label
        }
      };
    } catch (error) {
      logger.error('Error creating FLACC assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating FLACC assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update a FLACC assessment
   * PATCH /flacc-scales/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(flacc_scales)
        .where(eq(flacc_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'FLACC assessment not found'
        };
      }

      // Don't allow updates to signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update a signed FLACC assessment. Use amendment instead.'
        };
      }

      // Validate scores if any are being updated
      const hasScoreUpdate = ['face_score', 'legs_score', 'activity_score', 'cry_score', 'consolability_score']
        .some(key => data[key] !== undefined);

      let totalScore = existing[0].total_score;
      let painSeverity = existing[0].pain_severity;
      let painPresent = existing[0].pain_present;

      if (hasScoreUpdate) {
        // Merge existing scores with updates for validation
        const mergedData = {
          face_score: data.face_score ?? existing[0].face_score,
          legs_score: data.legs_score ?? existing[0].legs_score,
          activity_score: data.activity_score ?? existing[0].activity_score,
          cry_score: data.cry_score ?? existing[0].cry_score,
          consolability_score: data.consolability_score ?? existing[0].consolability_score
        };

        const validation = this.validateScores(mergedData);
        if (!validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid FLACC scores',
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
        .update(flacc_scales)
        .set({
          ...updateData,
          total_score: totalScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(flacc_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'flacc_scales', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'FLACC assessment updated successfully',
        data: result[0],
        interpretation: {
          total_score: totalScore,
          pain_severity: painSeverity,
          pain_present: painPresent,
          severity_description: FLACC_PAIN_SEVERITY[painSeverity]?.label
        }
      };
    } catch (error) {
      logger.error('Error updating FLACC assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating FLACC assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete a FLACC assessment
   * DELETE /flacc-scales/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(flacc_scales)
        .where(eq(flacc_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'FLACC assessment not found'
        };
      }

      // Don't allow deletion of signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete a signed FLACC assessment'
        };
      }

      await db
        .delete(flacc_scales)
        .where(eq(flacc_scales.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'flacc_scales', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'FLACC assessment deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting FLACC assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting FLACC assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign a FLACC assessment (21 CFR Part 11 compliance)
   * POST /flacc-scales/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(flacc_scales)
        .where(eq(flacc_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'FLACC assessment not found'
        };
      }

      if (existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'FLACC assessment already signed'
        };
      }

      const result = await db
        .update(flacc_scales)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(flacc_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'flacc_scales', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'FLACC assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing FLACC assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing FLACC assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend a signed FLACC assessment
   * POST /flacc-scales/:id/amend
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
        .from(flacc_scales)
        .where(eq(flacc_scales.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'FLACC assessment not found'
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

      const hasScoreUpdate = ['face_score', 'legs_score', 'activity_score', 'cry_score', 'consolability_score']
        .some(key => updateData[key] !== undefined);

      if (hasScoreUpdate) {
        const mergedData = {
          face_score: updateData.face_score ?? existing[0].face_score,
          legs_score: updateData.legs_score ?? existing[0].legs_score,
          activity_score: updateData.activity_score ?? existing[0].activity_score,
          cry_score: updateData.cry_score ?? existing[0].cry_score,
          consolability_score: updateData.consolability_score ?? existing[0].consolability_score
        };

        const validation = this.validateScores(mergedData);
        if (!validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid FLACC scores',
            errors: validation.errors
          };
        }

        totalScore = this.calculateTotalScore(mergedData);
        painSeverity = this.calculatePainSeverity(totalScore);
        painPresent = totalScore > 0;
      }

      const result = await db
        .update(flacc_scales)
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
        .where(eq(flacc_scales.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'flacc_scales', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'FLACC assessment amended successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error amending FLACC assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending FLACC assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all FLACC assessments (with filters)
   * GET /flacc-scales
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        pain_severity,
        patient_population,
        min_score,
        max_score,
        limit = 50,
        offset = 0
      } = request.query;

      const conditions = [];

      if (patient_id) {
        conditions.push(eq(flacc_scales.patient_id, parseInt(patient_id)));
      }
      if (pain_severity) {
        conditions.push(eq(flacc_scales.pain_severity, pain_severity));
      }
      if (patient_population) {
        conditions.push(eq(flacc_scales.patient_population, patient_population));
      }
      if (min_score !== undefined) {
        conditions.push(gte(flacc_scales.total_score, parseInt(min_score)));
      }
      if (max_score !== undefined) {
        conditions.push(lte(flacc_scales.total_score, parseInt(max_score)));
      }

      let query = db.select().from(flacc_scales);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query
        .orderBy(desc(flacc_scales.assessment_date))
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
      logger.error('Error fetching FLACC assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching FLACC assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get FLACC assessment statistics for a patient
   * GET /patients/:patientId/flacc-scales/stats
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
        .from(flacc_scales)
        .where(eq(flacc_scales.patient_id, parseInt(patientId)))
        .orderBy(desc(flacc_scales.assessment_date))
        .limit(1);

      // Get count of assessments
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(flacc_scales)
        .where(eq(flacc_scales.patient_id, parseInt(patientId)));

      // Get average scores for the time period
      const avgResult = await db
        .select({
          avg_total: sql`avg(total_score)`,
          avg_face: sql`avg(face_score)`,
          avg_legs: sql`avg(legs_score)`,
          avg_activity: sql`avg(activity_score)`,
          avg_cry: sql`avg(cry_score)`,
          avg_consolability: sql`avg(consolability_score)`,
          max_total: sql`max(total_score)`,
          min_total: sql`min(total_score)`
        })
        .from(flacc_scales)
        .where(
          and(
            eq(flacc_scales.patient_id, parseInt(patientId)),
            gte(flacc_scales.assessment_date, startDate)
          )
        );

      // Get severity distribution
      const severityResult = await db
        .select({
          pain_severity: flacc_scales.pain_severity,
          count: sql`count(*)`
        })
        .from(flacc_scales)
        .where(eq(flacc_scales.patient_id, parseInt(patientId)))
        .groupBy(flacc_scales.pain_severity);

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
            face_score: parseFloat(avgResult[0]?.avg_face) || null,
            legs_score: parseFloat(avgResult[0]?.avg_legs) || null,
            activity_score: parseFloat(avgResult[0]?.avg_activity) || null,
            cry_score: parseFloat(avgResult[0]?.avg_cry) || null,
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
      logger.error('Error fetching FLACC assessment stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching FLACC assessment statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get FLACC score trend for a patient
   * GET /patients/:patientId/flacc-scales/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const assessments = await db
        .select({
          id: flacc_scales.id,
          assessment_date: flacc_scales.assessment_date,
          total_score: flacc_scales.total_score,
          pain_severity: flacc_scales.pain_severity,
          face_score: flacc_scales.face_score,
          legs_score: flacc_scales.legs_score,
          activity_score: flacc_scales.activity_score,
          cry_score: flacc_scales.cry_score,
          consolability_score: flacc_scales.consolability_score,
          intervention_provided: flacc_scales.intervention_provided,
          intervention_effectiveness: flacc_scales.intervention_effectiveness
        })
        .from(flacc_scales)
        .where(
          and(
            eq(flacc_scales.patient_id, parseInt(patientId)),
            gte(flacc_scales.assessment_date, startDate)
          )
        )
        .orderBy(desc(flacc_scales.assessment_date))
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
      logger.error('Error fetching FLACC trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching FLACC trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get FLACC scoring reference
   * GET /flacc-scales/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          name: 'FLACC Scale',
          full_name: 'Face, Legs, Activity, Cry, Consolability',
          description: 'Behavioral pain assessment tool for pediatric and non-verbal patients',
          target_populations: [
            'Pediatric patients (2 months to 7 years)',
            'Non-verbal patients',
            'Cognitively impaired patients',
            'Sedated patients',
            'Intubated patients'
          ],
          scoring: {
            components: {
              face: {
                0: 'No particular expression or smile',
                1: 'Occasional grimace or frown, withdrawn, disinterested',
                2: 'Frequent to constant quivering chin, clenched jaw'
              },
              legs: {
                0: 'Normal position or relaxed',
                1: 'Uneasy, restless, tense',
                2: 'Kicking, or legs drawn up'
              },
              activity: {
                0: 'Lying quietly, normal position, moves easily',
                1: 'Squirming, shifting back and forth, tense',
                2: 'Arched, rigid or jerking'
              },
              cry: {
                0: 'No cry (awake or asleep)',
                1: 'Moans or whimpers, occasional complaint',
                2: 'Crying steadily, screams or sobs, frequent complaints'
              },
              consolability: {
                0: 'Content, relaxed',
                1: 'Reassured by occasional touching, hugging or being talked to, distractible',
                2: 'Difficult to console or comfort'
              }
            },
            total_range: { min: 0, max: 10 },
            severity_interpretation: FLACC_PAIN_SEVERITY
          },
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
            }
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching FLACC reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching FLACC reference',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new FlaccScaleController();
