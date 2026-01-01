import { db } from '../config/db.drizzle.js';
import { cardiac_system_assessments, CARDIAC_NYHA_CLASSES, CARDIAC_BP_CLASSIFICATIONS, CARDIAC_EDEMA_SCALE, CARDIAC_NORMAL_RANGES } from '../db/schemas/cardiacSystemAssessment.schema.js';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * Cardiac System Assessment Controller
 * Manages comprehensive cardiac/cardiovascular assessments for hospice patients
 * Follows AHA guidelines, JNC blood pressure classifications, and NYHA functional classification
 */
class CardiacSystemAssessmentController {
  /**
   * Classify blood pressure based on JNC 8 guidelines
   * @param {number} systolic - Systolic BP in mmHg
   * @param {number} diastolic - Diastolic BP in mmHg
   * @returns {string} BP classification
   */
  classifyBloodPressure(systolic, diastolic) {
    if (!systolic || !diastolic) return null;

    if (systolic >= 180 || diastolic >= 120) return 'HTN_CRISIS';
    if (systolic >= 140 || diastolic >= 90) return 'HTN_STAGE_2';
    if ((systolic >= 130 && systolic < 140) || (diastolic >= 80 && diastolic < 90)) return 'HTN_STAGE_1';
    if (systolic >= 120 && systolic < 130 && diastolic < 80) return 'ELEVATED';
    if (systolic < 120 && diastolic < 80) return 'NORMAL';

    return 'UNKNOWN';
  }

  /**
   * Calculate Mean Arterial Pressure (MAP)
   * @param {number} systolic - Systolic BP
   * @param {number} diastolic - Diastolic BP
   * @returns {number} MAP in mmHg
   */
  calculateMAP(systolic, diastolic) {
    if (!systolic || !diastolic) return null;
    return Math.round(diastolic + (systolic - diastolic) / 3);
  }

  /**
   * Check for orthostatic hypotension
   * @param {object} data - Assessment data with orthostatic readings
   * @returns {boolean} Whether orthostatic hypotension is present
   */
  checkOrthostatic(data) {
    if (!data.orthostatic_systolic_supine || !data.orthostatic_systolic_standing) return null;

    const systolicDrop = data.orthostatic_systolic_supine - data.orthostatic_systolic_standing;
    const diastolicDrop = (data.orthostatic_diastolic_supine || 0) - (data.orthostatic_diastolic_standing || 0);

    // Orthostatic if systolic drops ≥20 or diastolic drops ≥10
    return systolicDrop >= 20 || diastolicDrop >= 10;
  }

  /**
   * Get all cardiac system assessments for a patient
   * GET /patients/:patientId/cardiac-system-assessments
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(cardiac_system_assessments.patient_id, parseInt(patientId))];

      if (from_date) {
        conditions.push(gte(cardiac_system_assessments.assessment_date, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(cardiac_system_assessments.assessment_date, new Date(to_date)));
      }

      const assessments = await db
        .select()
        .from(cardiac_system_assessments)
        .where(and(...conditions))
        .orderBy(desc(cardiac_system_assessments.assessment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'Cardiac system assessments retrieved successfully',
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient cardiac system assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching cardiac system assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single cardiac system assessment by ID
   * GET /cardiac-system-assessments/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(cardiac_system_assessments)
        .where(eq(cardiac_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Cardiac system assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching cardiac system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching cardiac system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new cardiac system assessment
   * POST /patients/:patientId/cardiac-system-assessments
   */
  async create(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      // Auto-calculate derived values
      const bpClassification = this.classifyBloodPressure(data.bp_systolic, data.bp_diastolic);
      const meanArterialPressure = this.calculateMAP(data.bp_systolic, data.bp_diastolic);
      const orthostaticPositive = this.checkOrthostatic(data);

      const result = await db
        .insert(cardiac_system_assessments)
        .values({
          patient_id: parseInt(patientId),
          ...data,
          bp_classification: data.bp_classification || bpClassification,
          mean_arterial_pressure: data.mean_arterial_pressure || meanArterialPressure,
          orthostatic_positive: data.orthostatic_positive ?? orthostaticPositive,
          assessment_date: data.assessment_date ? new Date(data.assessment_date) : new Date(),
          assessed_by_id: data.assessed_by_id || request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await logAudit(request, 'CREATE', 'cardiac_system_assessments', result[0].id);

      reply.code(201);
      return {
        status: 201,
        message: 'Cardiac system assessment created successfully',
        data: result[0],
        calculated_values: {
          bp_classification: bpClassification,
          bp_classification_label: CARDIAC_BP_CLASSIFICATIONS[bpClassification]?.label,
          mean_arterial_pressure: meanArterialPressure,
          orthostatic_positive: orthostaticPositive,
          nyha_class_description: data.nyha_class ? CARDIAC_NYHA_CLASSES[data.nyha_class] : null
        }
      };
    } catch (error) {
      logger.error('Error creating cardiac system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating cardiac system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update a cardiac system assessment
   * PATCH /cardiac-system-assessments/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(cardiac_system_assessments)
        .where(eq(cardiac_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Cardiac system assessment not found'
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

      // Recalculate derived values if BP is being updated
      let bpClassification = existing[0].bp_classification;
      let meanArterialPressure = existing[0].mean_arterial_pressure;

      const systolic = data.bp_systolic ?? existing[0].bp_systolic;
      const diastolic = data.bp_diastolic ?? existing[0].bp_diastolic;

      if (data.bp_systolic !== undefined || data.bp_diastolic !== undefined) {
        bpClassification = this.classifyBloodPressure(systolic, diastolic);
        meanArterialPressure = this.calculateMAP(systolic, diastolic);
      }

      // Remove fields that shouldn't be updated directly
      const { id: _, patient_id, created_by_id, createdAt, ...updateData } = data;

      const result = await db
        .update(cardiac_system_assessments)
        .set({
          ...updateData,
          bp_classification: data.bp_classification || bpClassification,
          mean_arterial_pressure: data.mean_arterial_pressure || meanArterialPressure,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(cardiac_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'cardiac_system_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Cardiac system assessment updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating cardiac system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating cardiac system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete a cardiac system assessment
   * DELETE /cardiac-system-assessments/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(cardiac_system_assessments)
        .where(eq(cardiac_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Cardiac system assessment not found'
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
        .delete(cardiac_system_assessments)
        .where(eq(cardiac_system_assessments.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'cardiac_system_assessments', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'Cardiac system assessment deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting cardiac system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting cardiac system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign a cardiac system assessment (21 CFR Part 11 compliance)
   * POST /cardiac-system-assessments/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(cardiac_system_assessments)
        .where(eq(cardiac_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Cardiac system assessment not found'
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
        .update(cardiac_system_assessments)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(cardiac_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'cardiac_system_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Cardiac system assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing cardiac system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend a signed cardiac system assessment
   * POST /cardiac-system-assessments/:id/amend
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
        .from(cardiac_system_assessments)
        .where(eq(cardiac_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Cardiac system assessment not found'
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
        .update(cardiac_system_assessments)
        .set({
          ...updateData,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(cardiac_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'cardiac_system_assessments', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'Cardiac system assessment amended successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error amending cardiac system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all cardiac system assessments (with filters)
   * GET /cardiac-system-assessments
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        overall_status,
        nyha_class,
        limit = 50,
        offset = 0
      } = request.query;

      const conditions = [];

      if (patient_id) {
        conditions.push(eq(cardiac_system_assessments.patient_id, parseInt(patient_id)));
      }
      if (overall_status) {
        conditions.push(eq(cardiac_system_assessments.overall_status, overall_status));
      }
      if (nyha_class) {
        conditions.push(eq(cardiac_system_assessments.nyha_class, nyha_class));
      }

      let query = db.select().from(cardiac_system_assessments);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query
        .orderBy(desc(cardiac_system_assessments.assessment_date))
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
      logger.error('Error fetching cardiac system assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get cardiac assessment statistics for a patient
   * GET /patients/:patientId/cardiac-system-assessments/stats
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
        .from(cardiac_system_assessments)
        .where(eq(cardiac_system_assessments.patient_id, parseInt(patientId)))
        .orderBy(desc(cardiac_system_assessments.assessment_date))
        .limit(1);

      // Get count of assessments
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(cardiac_system_assessments)
        .where(eq(cardiac_system_assessments.patient_id, parseInt(patientId)));

      // Get average vital signs for the time period
      const avgResult = await db
        .select({
          avg_heart_rate: sql`avg(heart_rate)`,
          avg_bp_systolic: sql`avg(bp_systolic)`,
          avg_bp_diastolic: sql`avg(bp_diastolic)`,
          max_heart_rate: sql`max(heart_rate)`,
          min_heart_rate: sql`min(heart_rate)`,
          max_bp_systolic: sql`max(bp_systolic)`,
          min_bp_systolic: sql`min(bp_systolic)`
        })
        .from(cardiac_system_assessments)
        .where(
          and(
            eq(cardiac_system_assessments.patient_id, parseInt(patientId)),
            gte(cardiac_system_assessments.assessment_date, startDate)
          )
        );

      // Get NYHA class distribution
      const nyhaResult = await db
        .select({
          nyha_class: cardiac_system_assessments.nyha_class,
          count: sql`count(*)`
        })
        .from(cardiac_system_assessments)
        .where(eq(cardiac_system_assessments.patient_id, parseInt(patientId)))
        .groupBy(cardiac_system_assessments.nyha_class);

      const nyhaDistribution = {};
      for (const row of nyhaResult) {
        if (row.nyha_class) {
          nyhaDistribution[row.nyha_class] = parseInt(row.count);
        }
      }

      reply.code(200);
      return {
        status: 200,
        data: {
          total_assessments: parseInt(countResult[0]?.count || 0),
          latest_assessment: latestAssessment[0] || null,
          period_days: parseInt(days),
          averages: {
            heart_rate: parseFloat(avgResult[0]?.avg_heart_rate) || null,
            bp_systolic: parseFloat(avgResult[0]?.avg_bp_systolic) || null,
            bp_diastolic: parseFloat(avgResult[0]?.avg_bp_diastolic) || null
          },
          ranges: {
            heart_rate: {
              min: parseInt(avgResult[0]?.min_heart_rate) || null,
              max: parseInt(avgResult[0]?.max_heart_rate) || null
            },
            bp_systolic: {
              min: parseInt(avgResult[0]?.min_bp_systolic) || null,
              max: parseInt(avgResult[0]?.max_bp_systolic) || null
            }
          },
          nyha_distribution: nyhaDistribution,
          normal_ranges: CARDIAC_NORMAL_RANGES
        }
      };
    } catch (error) {
      logger.error('Error fetching cardiac system assessment stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get cardiac assessment trend for a patient
   * GET /patients/:patientId/cardiac-system-assessments/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const assessments = await db
        .select({
          id: cardiac_system_assessments.id,
          assessment_date: cardiac_system_assessments.assessment_date,
          overall_status: cardiac_system_assessments.overall_status,
          heart_rate: cardiac_system_assessments.heart_rate,
          bp_systolic: cardiac_system_assessments.bp_systolic,
          bp_diastolic: cardiac_system_assessments.bp_diastolic,
          bp_classification: cardiac_system_assessments.bp_classification,
          nyha_class: cardiac_system_assessments.nyha_class,
          edema_present: cardiac_system_assessments.edema_present,
          edema_severity: cardiac_system_assessments.edema_severity,
          dyspnea_present: cardiac_system_assessments.dyspnea_present,
          chest_pain_present: cardiac_system_assessments.chest_pain_present
        })
        .from(cardiac_system_assessments)
        .where(
          and(
            eq(cardiac_system_assessments.patient_id, parseInt(patientId)),
            gte(cardiac_system_assessments.assessment_date, startDate)
          )
        )
        .orderBy(desc(cardiac_system_assessments.assessment_date))
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
      logger.error('Error fetching cardiac trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get cardiac assessment reference data
   * GET /cardiac-system-assessments/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          name: 'Cardiac System Assessment',
          description: 'Comprehensive cardiac/cardiovascular assessment for hospice patients',
          clinical_standards: [
            'American Heart Association (AHA) guidelines',
            'Joint National Committee (JNC) blood pressure classifications',
            'New York Heart Association (NYHA) functional classification'
          ],
          assessment_components: [
            'Heart rate and rhythm',
            'Heart sounds and murmurs',
            'Blood pressure measurements',
            'Peripheral pulses',
            'Edema assessment',
            'Perfusion and circulation',
            'Jugular venous assessment',
            'Cardiac symptoms',
            'Functional status (NYHA)',
            'Cardiac devices'
          ],
          classifications: {
            blood_pressure: CARDIAC_BP_CLASSIFICATIONS,
            nyha_classes: CARDIAC_NYHA_CLASSES,
            edema_scale: CARDIAC_EDEMA_SCALE
          },
          normal_ranges: CARDIAC_NORMAL_RANGES
        }
      };
    } catch (error) {
      logger.error('Error fetching cardiac reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching reference data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new CardiacSystemAssessmentController();
