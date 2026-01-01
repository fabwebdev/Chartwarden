import { db } from '../config/db.drizzle.js';
import { integumentary_system_assessments, INTEGUMENTARY_PRESSURE_INJURY_STAGES, INTEGUMENTARY_BRADEN_SCALE, INTEGUMENTARY_BRADEN_RISK_LEVELS, INTEGUMENTARY_EDEMA_SCALE, INTEGUMENTARY_WOUND_BED } from '../db/schemas/integumentarySystemAssessment.schema.js';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * Integumentary System Assessment Controller
 * Manages comprehensive skin, hair, and nail assessments for hospice patients
 * Follows NPIAP staging guidelines, Braden Scale, and WOCN guidelines
 */
class IntegumentarySystemAssessmentController {
  /**
   * Calculate Braden Scale total score
   * @param {object} data - Assessment data with Braden subscores
   * @returns {number} Total Braden score (6-23)
   */
  calculateBradenScore(data) {
    const sensory = parseInt(data.braden_sensory_perception) || 0;
    const moisture = parseInt(data.braden_moisture) || 0;
    const activity = parseInt(data.braden_activity) || 0;
    const mobility = parseInt(data.braden_mobility) || 0;
    const nutrition = parseInt(data.braden_nutrition) || 0;
    const friction = parseInt(data.braden_friction_shear) || 0;

    return sensory + moisture + activity + mobility + nutrition + friction;
  }

  /**
   * Classify Braden risk level based on total score
   * @param {number} score - Total Braden score
   * @returns {string} Risk level classification
   */
  classifyBradenRisk(score) {
    if (!score || score < 6) return null;
    if (score <= 9) return 'VERY_HIGH';
    if (score <= 12) return 'HIGH';
    if (score <= 14) return 'MODERATE';
    if (score <= 18) return 'MILD';
    return 'NO_RISK';
  }

  /**
   * Validate Braden subscores
   * @param {object} data - Assessment data
   * @returns {object} Validation result
   */
  validateBradenScores(data) {
    const errors = [];
    const subscores = {
      braden_sensory_perception: { min: 1, max: 4 },
      braden_moisture: { min: 1, max: 4 },
      braden_activity: { min: 1, max: 4 },
      braden_mobility: { min: 1, max: 4 },
      braden_nutrition: { min: 1, max: 4 },
      braden_friction_shear: { min: 1, max: 3 }
    };

    for (const [key, range] of Object.entries(subscores)) {
      if (data[key] !== undefined && data[key] !== null) {
        const value = parseInt(data[key]);
        if (value < range.min || value > range.max) {
          errors.push(`${key} must be between ${range.min} and ${range.max}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }

  /**
   * Check for wound care alerts
   * @param {object} data - Assessment data
   * @returns {object} Alert information
   */
  checkWoundAlerts(data) {
    const alerts = [];

    // High risk Braden score
    if (data.braden_total_score && data.braden_total_score <= 12) {
      alerts.push({
        type: 'HIGH_PRESSURE_INJURY_RISK',
        severity: data.braden_total_score <= 9 ? 'CRITICAL' : 'HIGH',
        message: `Braden score ${data.braden_total_score} indicates ${data.braden_total_score <= 9 ? 'very high' : 'high'} risk for pressure injury`
      });
    }

    // Pressure injuries present
    if (data.pressure_injury_present && data.pressure_injury_count > 0) {
      alerts.push({
        type: 'PRESSURE_INJURIES_PRESENT',
        severity: 'HIGH',
        message: `${data.pressure_injury_count} pressure injur${data.pressure_injury_count > 1 ? 'ies' : 'y'} documented`
      });
    }

    // Stage 3 or 4 pressure injuries
    const severeStages = ['STAGE_3', 'STAGE_4', 'UNSTAGEABLE', 'DTPI'];
    if (data.pi_sacrum_stage && severeStages.includes(data.pi_sacrum_stage)) {
      alerts.push({
        type: 'SEVERE_PRESSURE_INJURY',
        severity: 'CRITICAL',
        message: `Sacrum pressure injury ${data.pi_sacrum_stage} requires wound care evaluation`
      });
    }

    // Infection signs
    if (data.infection_signs_present) {
      alerts.push({
        type: 'INFECTION_SIGNS',
        severity: 'HIGH',
        message: 'Signs of infection present - provider notification may be required'
      });
    }

    return {
      alerts,
      has_alerts: alerts.length > 0,
      critical_count: alerts.filter(a => a.severity === 'CRITICAL').length
    };
  }

  /**
   * Get all integumentary system assessments for a patient
   * GET /patients/:patientId/integumentary-system-assessments
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(integumentary_system_assessments.patient_id, parseInt(patientId))];

      if (from_date) {
        conditions.push(gte(integumentary_system_assessments.assessment_date, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(integumentary_system_assessments.assessment_date, new Date(to_date)));
      }

      const assessments = await db
        .select()
        .from(integumentary_system_assessments)
        .where(and(...conditions))
        .orderBy(desc(integumentary_system_assessments.assessment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'Integumentary system assessments retrieved successfully',
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient integumentary system assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching integumentary system assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single integumentary system assessment by ID
   * GET /integumentary-system-assessments/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(integumentary_system_assessments)
        .where(eq(integumentary_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Integumentary system assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching integumentary system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching integumentary system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new integumentary system assessment
   * POST /patients/:patientId/integumentary-system-assessments
   */
  async create(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      // Validate Braden scores if provided
      if (data.braden_sensory_perception !== undefined) {
        const validation = this.validateBradenScores(data);
        if (!validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid Braden scores',
            errors: validation.errors
          };
        }
      }

      // Calculate Braden score and risk level
      const bradenScore = this.calculateBradenScore(data);
      const bradenRisk = this.classifyBradenRisk(bradenScore);

      const result = await db
        .insert(integumentary_system_assessments)
        .values({
          patient_id: parseInt(patientId),
          ...data,
          braden_total_score: data.braden_total_score || (bradenScore > 0 ? bradenScore : null),
          braden_risk_level: data.braden_risk_level || bradenRisk,
          assessment_date: data.assessment_date ? new Date(data.assessment_date) : new Date(),
          assessed_by_id: data.assessed_by_id || request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await logAudit(request, 'CREATE', 'integumentary_system_assessments', result[0].id);

      // Check for wound care alerts
      const alertInfo = this.checkWoundAlerts({
        ...data,
        braden_total_score: bradenScore > 0 ? bradenScore : data.braden_total_score
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Integumentary system assessment created successfully',
        data: result[0],
        braden_interpretation: bradenScore > 0 ? {
          total_score: bradenScore,
          risk_level: bradenRisk,
          risk_description: INTEGUMENTARY_BRADEN_RISK_LEVELS[bradenRisk]?.label
        } : null,
        alerts: alertInfo.has_alerts ? alertInfo : null
      };
    } catch (error) {
      logger.error('Error creating integumentary system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating integumentary system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update an integumentary system assessment
   * PATCH /integumentary-system-assessments/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(integumentary_system_assessments)
        .where(eq(integumentary_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Integumentary system assessment not found'
        };
      }

      // Don't allow updates to signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update a signed assessment. Use amendment instead.'
        };
      }

      // Validate and recalculate Braden if subscores are being updated
      const hasBradenUpdate = ['braden_sensory_perception', 'braden_moisture', 'braden_activity',
        'braden_mobility', 'braden_nutrition', 'braden_friction_shear'].some(key => data[key] !== undefined);

      let bradenScore = existing[0].braden_total_score;
      let bradenRisk = existing[0].braden_risk_level;

      if (hasBradenUpdate) {
        const mergedData = {
          braden_sensory_perception: data.braden_sensory_perception ?? existing[0].braden_sensory_perception,
          braden_moisture: data.braden_moisture ?? existing[0].braden_moisture,
          braden_activity: data.braden_activity ?? existing[0].braden_activity,
          braden_mobility: data.braden_mobility ?? existing[0].braden_mobility,
          braden_nutrition: data.braden_nutrition ?? existing[0].braden_nutrition,
          braden_friction_shear: data.braden_friction_shear ?? existing[0].braden_friction_shear
        };

        const validation = this.validateBradenScores(mergedData);
        if (!validation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid Braden scores',
            errors: validation.errors
          };
        }

        bradenScore = this.calculateBradenScore(mergedData);
        bradenRisk = this.classifyBradenRisk(bradenScore);
      }

      // Remove fields that shouldn't be updated directly
      const { id: _, patient_id, created_by_id, createdAt, ...updateData } = data;

      const result = await db
        .update(integumentary_system_assessments)
        .set({
          ...updateData,
          braden_total_score: bradenScore,
          braden_risk_level: bradenRisk,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(integumentary_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'integumentary_system_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Integumentary system assessment updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating integumentary system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating integumentary system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete an integumentary system assessment
   * DELETE /integumentary-system-assessments/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(integumentary_system_assessments)
        .where(eq(integumentary_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Integumentary system assessment not found'
        };
      }

      // Don't allow deletion of signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete a signed assessment'
        };
      }

      await db
        .delete(integumentary_system_assessments)
        .where(eq(integumentary_system_assessments.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'integumentary_system_assessments', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'Integumentary system assessment deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting integumentary system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting integumentary system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign an integumentary system assessment (21 CFR Part 11 compliance)
   * POST /integumentary-system-assessments/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(integumentary_system_assessments)
        .where(eq(integumentary_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Integumentary system assessment not found'
        };
      }

      if (existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Assessment already signed'
        };
      }

      const result = await db
        .update(integumentary_system_assessments)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(integumentary_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'integumentary_system_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Integumentary system assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing integumentary system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend a signed integumentary system assessment
   * POST /integumentary-system-assessments/:id/amend
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
        .from(integumentary_system_assessments)
        .where(eq(integumentary_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Integumentary system assessment not found'
        };
      }

      if (!existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Cannot amend an unsigned assessment. Use update instead.'
        };
      }

      const result = await db
        .update(integumentary_system_assessments)
        .set({
          ...updateData,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(integumentary_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'integumentary_system_assessments', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'Integumentary system assessment amended successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error amending integumentary system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all integumentary system assessments (with filters)
   * GET /integumentary-system-assessments
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        overall_status,
        pressure_injury_present,
        braden_risk_level,
        limit = 50,
        offset = 0
      } = request.query;

      const conditions = [];

      if (patient_id) {
        conditions.push(eq(integumentary_system_assessments.patient_id, parseInt(patient_id)));
      }
      if (overall_status) {
        conditions.push(eq(integumentary_system_assessments.overall_status, overall_status));
      }
      if (pressure_injury_present !== undefined) {
        conditions.push(eq(integumentary_system_assessments.pressure_injury_present, pressure_injury_present === 'true'));
      }
      if (braden_risk_level) {
        conditions.push(eq(integumentary_system_assessments.braden_risk_level, braden_risk_level));
      }

      let query = db.select().from(integumentary_system_assessments);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query
        .orderBy(desc(integumentary_system_assessments.assessment_date))
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
      logger.error('Error fetching integumentary system assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get integumentary assessment statistics for a patient
   * GET /patients/:patientId/integumentary-system-assessments/stats
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
        .from(integumentary_system_assessments)
        .where(eq(integumentary_system_assessments.patient_id, parseInt(patientId)))
        .orderBy(desc(integumentary_system_assessments.assessment_date))
        .limit(1);

      // Get count of assessments
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(integumentary_system_assessments)
        .where(eq(integumentary_system_assessments.patient_id, parseInt(patientId)));

      // Get Braden score averages
      const avgResult = await db
        .select({
          avg_braden: sql`avg(braden_total_score)`,
          min_braden: sql`min(braden_total_score)`,
          max_braden: sql`max(braden_total_score)`
        })
        .from(integumentary_system_assessments)
        .where(
          and(
            eq(integumentary_system_assessments.patient_id, parseInt(patientId)),
            gte(integumentary_system_assessments.assessment_date, startDate)
          )
        );

      // Get pressure injury count
      const piResult = await db
        .select({ count: sql`count(*)` })
        .from(integumentary_system_assessments)
        .where(
          and(
            eq(integumentary_system_assessments.patient_id, parseInt(patientId)),
            eq(integumentary_system_assessments.pressure_injury_present, true)
          )
        );

      // Get Braden risk distribution
      const riskResult = await db
        .select({
          braden_risk_level: integumentary_system_assessments.braden_risk_level,
          count: sql`count(*)`
        })
        .from(integumentary_system_assessments)
        .where(eq(integumentary_system_assessments.patient_id, parseInt(patientId)))
        .groupBy(integumentary_system_assessments.braden_risk_level);

      const riskDistribution = {};
      for (const row of riskResult) {
        if (row.braden_risk_level) {
          riskDistribution[row.braden_risk_level] = parseInt(row.count);
        }
      }

      reply.code(200);
      return {
        status: 200,
        data: {
          total_assessments: parseInt(countResult[0]?.count || 0),
          latest_assessment: latestAssessment[0] || null,
          period_days: parseInt(days),
          braden_score: {
            average: parseFloat(avgResult[0]?.avg_braden) || null,
            min: parseInt(avgResult[0]?.min_braden) || null,
            max: parseInt(avgResult[0]?.max_braden) || null
          },
          pressure_injury_assessments: parseInt(piResult[0]?.count || 0),
          braden_risk_distribution: riskDistribution,
          braden_risk_levels: INTEGUMENTARY_BRADEN_RISK_LEVELS
        }
      };
    } catch (error) {
      logger.error('Error fetching integumentary system assessment stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get integumentary assessment trend for a patient
   * GET /patients/:patientId/integumentary-system-assessments/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const assessments = await db
        .select({
          id: integumentary_system_assessments.id,
          assessment_date: integumentary_system_assessments.assessment_date,
          overall_status: integumentary_system_assessments.overall_status,
          braden_total_score: integumentary_system_assessments.braden_total_score,
          braden_risk_level: integumentary_system_assessments.braden_risk_level,
          pressure_injury_present: integumentary_system_assessments.pressure_injury_present,
          pressure_injury_count: integumentary_system_assessments.pressure_injury_count,
          skin_intact: integumentary_system_assessments.skin_intact,
          edema_present: integumentary_system_assessments.edema_present,
          infection_signs_present: integumentary_system_assessments.infection_signs_present
        })
        .from(integumentary_system_assessments)
        .where(
          and(
            eq(integumentary_system_assessments.patient_id, parseInt(patientId)),
            gte(integumentary_system_assessments.assessment_date, startDate)
          )
        )
        .orderBy(desc(integumentary_system_assessments.assessment_date))
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
      logger.error('Error fetching integumentary trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get integumentary assessment reference data
   * GET /integumentary-system-assessments/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          name: 'Integumentary System Assessment',
          description: 'Comprehensive skin, hair, and nail assessment for hospice patients',
          clinical_standards: [
            'National Pressure Injury Advisory Panel (NPIAP) staging',
            'Braden Scale for Predicting Pressure Sore Risk',
            'Wound, Ostomy and Continence Nurses Society (WOCN) guidelines'
          ],
          assessment_components: [
            'General skin assessment',
            'Braden Scale (pressure injury risk)',
            'Pressure injury assessment',
            'Other wounds',
            'Lesions and skin changes',
            'Edema assessment',
            'Hair assessment',
            'Nail assessment',
            'Diabetic foot assessment',
            'Infection signs'
          ],
          classifications: {
            pressure_injury_stages: INTEGUMENTARY_PRESSURE_INJURY_STAGES,
            braden_scale: INTEGUMENTARY_BRADEN_SCALE,
            braden_risk_levels: INTEGUMENTARY_BRADEN_RISK_LEVELS,
            edema_scale: INTEGUMENTARY_EDEMA_SCALE,
            wound_bed_types: INTEGUMENTARY_WOUND_BED
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching integumentary reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching reference data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new IntegumentarySystemAssessmentController();
