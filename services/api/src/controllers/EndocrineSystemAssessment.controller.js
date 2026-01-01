import { db } from '../config/db.drizzle.js';
import { endocrine_system_assessments, ENDOCRINE_THYROID_STATUS, ENDOCRINE_DIABETES_TYPES, ENDOCRINE_HBA1C_TARGETS, ENDOCRINE_GLUCOSE_RANGES, ENDOCRINE_THYROID_RANGES, ENDOCRINE_CALCIUM_RANGES } from '../db/schemas/endocrineSystemAssessment.schema.js';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * Endocrine System Assessment Controller
 * Manages comprehensive endocrine system assessments for hospice patients
 * Follows ADA guidelines, American Thyroid Association guidelines,
 * and Endocrine Society clinical practice guidelines
 */
class EndocrineSystemAssessmentController {
  /**
   * Classify HbA1c value for hospice care context
   * @param {number} hba1c - HbA1c percentage
   * @returns {string} HbA1c classification
   */
  classifyHbA1c(hba1c) {
    if (!hba1c) return null;
    if (hba1c < 6.5) return 'STRICT';
    if (hba1c <= 7.0) return 'STANDARD';
    if (hba1c <= 8.0) return 'MODERATE';
    return 'HOSPICE_COMFORT';
  }

  /**
   * Classify blood glucose reading
   * @param {number} glucose - Blood glucose in mg/dL
   * @param {string} type - 'fasting' or 'random'
   * @returns {string} Glucose classification
   */
  classifyGlucose(glucose, type = 'random') {
    if (!glucose) return null;
    const ranges = ENDOCRINE_GLUCOSE_RANGES[type] || ENDOCRINE_GLUCOSE_RANGES.random;

    if (glucose < 54) return 'SEVERE_HYPOGLYCEMIA';
    if (glucose < 70) return 'HYPOGLYCEMIA';
    if (glucose <= ranges.normal_high) return 'NORMAL';
    if (glucose < ranges.high) return 'ELEVATED';
    return 'HYPERGLYCEMIA';
  }

  /**
   * Classify thyroid status based on TSH and symptoms
   * @param {number} tsh - TSH value in mIU/L
   * @returns {string} Thyroid classification
   */
  classifyThyroidFromTSH(tsh) {
    if (!tsh) return null;
    const ranges = ENDOCRINE_THYROID_RANGES.tsh;

    if (tsh < ranges.low) return 'HYPERTHYROID';
    if (tsh > ranges.high) return 'HYPOTHYROID';
    return 'EUTHYROID';
  }

  /**
   * Get all endocrine system assessments for a patient
   * GET /patients/:patientId/endocrine-system-assessments
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(endocrine_system_assessments.patient_id, parseInt(patientId))];

      if (from_date) {
        conditions.push(gte(endocrine_system_assessments.assessment_date, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(endocrine_system_assessments.assessment_date, new Date(to_date)));
      }

      const assessments = await db
        .select()
        .from(endocrine_system_assessments)
        .where(and(...conditions))
        .orderBy(desc(endocrine_system_assessments.assessment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'Endocrine system assessments retrieved successfully',
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient endocrine system assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching endocrine system assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single endocrine system assessment by ID
   * GET /endocrine-system-assessments/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(endocrine_system_assessments)
        .where(eq(endocrine_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Endocrine system assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching endocrine system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching endocrine system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new endocrine system assessment
   * POST /patients/:patientId/endocrine-system-assessments
   */
  async create(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      const result = await db
        .insert(endocrine_system_assessments)
        .values({
          patient_id: parseInt(patientId),
          ...data,
          assessment_date: data.assessment_date ? new Date(data.assessment_date) : new Date(),
          assessed_by_id: data.assessed_by_id || request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await logAudit(request, 'CREATE', 'endocrine_system_assessments', result[0].id);

      // Provide clinical interpretations
      const interpretations = {
        hba1c_classification: this.classifyHbA1c(data.hba1c_value),
        fasting_glucose_classification: this.classifyGlucose(data.blood_glucose_fasting, 'fasting'),
        random_glucose_classification: this.classifyGlucose(data.blood_glucose_random, 'random'),
        thyroid_tsh_interpretation: this.classifyThyroidFromTSH(data.tsh_value)
      };

      reply.code(201);
      return {
        status: 201,
        message: 'Endocrine system assessment created successfully',
        data: result[0],
        interpretations
      };
    } catch (error) {
      logger.error('Error creating endocrine system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating endocrine system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update an endocrine system assessment
   * PATCH /endocrine-system-assessments/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(endocrine_system_assessments)
        .where(eq(endocrine_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Endocrine system assessment not found'
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

      // Remove fields that shouldn't be updated directly
      const { id: _, patient_id, created_by_id, createdAt, ...updateData } = data;

      const result = await db
        .update(endocrine_system_assessments)
        .set({
          ...updateData,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(endocrine_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'endocrine_system_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Endocrine system assessment updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating endocrine system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating endocrine system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete an endocrine system assessment
   * DELETE /endocrine-system-assessments/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(endocrine_system_assessments)
        .where(eq(endocrine_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Endocrine system assessment not found'
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
        .delete(endocrine_system_assessments)
        .where(eq(endocrine_system_assessments.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'endocrine_system_assessments', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'Endocrine system assessment deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting endocrine system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting endocrine system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign an endocrine system assessment (21 CFR Part 11 compliance)
   * POST /endocrine-system-assessments/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(endocrine_system_assessments)
        .where(eq(endocrine_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Endocrine system assessment not found'
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
        .update(endocrine_system_assessments)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(endocrine_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'endocrine_system_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Endocrine system assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing endocrine system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend a signed endocrine system assessment
   * POST /endocrine-system-assessments/:id/amend
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
        .from(endocrine_system_assessments)
        .where(eq(endocrine_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Endocrine system assessment not found'
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
        .update(endocrine_system_assessments)
        .set({
          ...updateData,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(endocrine_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'endocrine_system_assessments', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'Endocrine system assessment amended successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error amending endocrine system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all endocrine system assessments (with filters)
   * GET /endocrine-system-assessments
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        overall_status,
        diabetes_type,
        thyroid_status,
        limit = 50,
        offset = 0
      } = request.query;

      const conditions = [];

      if (patient_id) {
        conditions.push(eq(endocrine_system_assessments.patient_id, parseInt(patient_id)));
      }
      if (overall_status) {
        conditions.push(eq(endocrine_system_assessments.overall_status, overall_status));
      }
      if (diabetes_type) {
        conditions.push(eq(endocrine_system_assessments.diabetes_type, diabetes_type));
      }
      if (thyroid_status) {
        conditions.push(eq(endocrine_system_assessments.thyroid_status, thyroid_status));
      }

      let query = db.select().from(endocrine_system_assessments);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query
        .orderBy(desc(endocrine_system_assessments.assessment_date))
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
      logger.error('Error fetching endocrine system assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get endocrine assessment statistics for a patient
   * GET /patients/:patientId/endocrine-system-assessments/stats
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
        .from(endocrine_system_assessments)
        .where(eq(endocrine_system_assessments.patient_id, parseInt(patientId)))
        .orderBy(desc(endocrine_system_assessments.assessment_date))
        .limit(1);

      // Get count of assessments
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(endocrine_system_assessments)
        .where(eq(endocrine_system_assessments.patient_id, parseInt(patientId)));

      // Get average glucose readings for the time period
      const avgResult = await db
        .select({
          avg_glucose_fasting: sql`avg(blood_glucose_fasting)`,
          avg_glucose_random: sql`avg(blood_glucose_random)`,
          avg_hba1c: sql`avg(hba1c_value)`,
          max_glucose_fasting: sql`max(blood_glucose_fasting)`,
          min_glucose_fasting: sql`min(blood_glucose_fasting)`
        })
        .from(endocrine_system_assessments)
        .where(
          and(
            eq(endocrine_system_assessments.patient_id, parseInt(patientId)),
            gte(endocrine_system_assessments.assessment_date, startDate)
          )
        );

      // Get hypoglycemia episode count
      const hypoResult = await db
        .select({ count: sql`count(*)` })
        .from(endocrine_system_assessments)
        .where(
          and(
            eq(endocrine_system_assessments.patient_id, parseInt(patientId)),
            eq(endocrine_system_assessments.hypoglycemia_episodes, true)
          )
        );

      reply.code(200);
      return {
        status: 200,
        data: {
          total_assessments: parseInt(countResult[0]?.count || 0),
          latest_assessment: latestAssessment[0] || null,
          period_days: parseInt(days),
          averages: {
            blood_glucose_fasting: parseFloat(avgResult[0]?.avg_glucose_fasting) || null,
            blood_glucose_random: parseFloat(avgResult[0]?.avg_glucose_random) || null,
            hba1c: parseFloat(avgResult[0]?.avg_hba1c) || null
          },
          glucose_ranges: {
            fasting: {
              min: parseInt(avgResult[0]?.min_glucose_fasting) || null,
              max: parseInt(avgResult[0]?.max_glucose_fasting) || null
            }
          },
          hypoglycemia_episodes: parseInt(hypoResult[0]?.count || 0),
          reference_ranges: {
            glucose: ENDOCRINE_GLUCOSE_RANGES,
            hba1c_targets: ENDOCRINE_HBA1C_TARGETS
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching endocrine system assessment stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get endocrine assessment trend for a patient
   * GET /patients/:patientId/endocrine-system-assessments/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const assessments = await db
        .select({
          id: endocrine_system_assessments.id,
          assessment_date: endocrine_system_assessments.assessment_date,
          overall_status: endocrine_system_assessments.overall_status,
          blood_glucose_fasting: endocrine_system_assessments.blood_glucose_fasting,
          blood_glucose_random: endocrine_system_assessments.blood_glucose_random,
          hba1c_value: endocrine_system_assessments.hba1c_value,
          thyroid_status: endocrine_system_assessments.thyroid_status,
          tsh_value: endocrine_system_assessments.tsh_value,
          hypoglycemia_episodes: endocrine_system_assessments.hypoglycemia_episodes,
          diabetes_type: endocrine_system_assessments.diabetes_type
        })
        .from(endocrine_system_assessments)
        .where(
          and(
            eq(endocrine_system_assessments.patient_id, parseInt(patientId)),
            gte(endocrine_system_assessments.assessment_date, startDate)
          )
        )
        .orderBy(desc(endocrine_system_assessments.assessment_date))
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
      logger.error('Error fetching endocrine trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get endocrine assessment reference data
   * GET /endocrine-system-assessments/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          name: 'Endocrine System Assessment',
          description: 'Comprehensive endocrine system assessment for hospice patients',
          clinical_standards: [
            'American Diabetes Association (ADA) guidelines',
            'American Thyroid Association guidelines',
            'Endocrine Society clinical practice guidelines'
          ],
          assessment_components: [
            'Thyroid function and examination',
            'Glucose metabolism and diabetes management',
            'Adrenal function',
            'Pituitary function',
            'Parathyroid/Calcium metabolism',
            'Metabolic indicators',
            'Laboratory values'
          ],
          classifications: {
            thyroid_status: ENDOCRINE_THYROID_STATUS,
            diabetes_types: ENDOCRINE_DIABETES_TYPES,
            hba1c_targets: ENDOCRINE_HBA1C_TARGETS
          },
          reference_ranges: {
            glucose: ENDOCRINE_GLUCOSE_RANGES,
            thyroid: ENDOCRINE_THYROID_RANGES,
            calcium: ENDOCRINE_CALCIUM_RANGES
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching endocrine reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching reference data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new EndocrineSystemAssessmentController();
