import { db } from '../config/db.drizzle.js';
import { hematological_system_assessments, HEMATOLOGICAL_ANEMIA_SEVERITY, HEMATOLOGICAL_ANEMIA_TYPES, HEMATOLOGICAL_CBC_RANGES, HEMATOLOGICAL_COAG_RANGES, HEMATOLOGICAL_IRON_RANGES } from '../db/schemas/hematologicalSystemAssessment.schema.js';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * Hematological System Assessment Controller
 * Manages comprehensive blood and coagulation assessments for hospice patients
 * Follows American Society of Hematology guidelines and WHO anemia classification
 */
class HematologicalSystemAssessmentController {
  /**
   * Classify anemia severity based on hemoglobin (WHO classification)
   * @param {number} hemoglobin - Hemoglobin in g/dL
   * @returns {string} Anemia severity classification
   */
  classifyAnemiaSeverity(hemoglobin) {
    if (!hemoglobin) return null;
    if (hemoglobin >= 11.0) return 'NONE';
    if (hemoglobin >= 8.0) return 'MODERATE';
    return 'SEVERE';
  }

  /**
   * Classify anemia morphology based on MCV
   * @param {number} mcv - Mean Corpuscular Volume in fL
   * @returns {string} Morphology classification
   */
  classifyAnemiaMorphology(mcv) {
    if (!mcv) return null;
    if (mcv < 80) return 'MICROCYTIC';
    if (mcv > 100) return 'MACROCYTIC';
    return 'NORMOCYTIC';
  }

  /**
   * Check if CBC values are critical
   * @param {object} data - Assessment data with CBC values
   * @returns {object} Critical value flags
   */
  checkCriticalValues(data) {
    const critical = {
      wbc_low: data.wbc_count && data.wbc_count < HEMATOLOGICAL_CBC_RANGES.wbc.critical_low,
      wbc_high: data.wbc_count && data.wbc_count > HEMATOLOGICAL_CBC_RANGES.wbc.critical_high,
      hemoglobin_low: data.hemoglobin && data.hemoglobin < HEMATOLOGICAL_CBC_RANGES.hemoglobin_male.critical_low,
      platelets_low: data.platelet_count && data.platelet_count < HEMATOLOGICAL_CBC_RANGES.platelets.critical_low,
      platelets_high: data.platelet_count && data.platelet_count > HEMATOLOGICAL_CBC_RANGES.platelets.critical_high
    };

    critical.any_critical = Object.values(critical).some(v => v === true);
    return critical;
  }

  /**
   * Calculate INR status for patients on anticoagulation
   * @param {number} inr - INR value
   * @param {number} targetLow - Target INR low
   * @param {number} targetHigh - Target INR high
   * @returns {string} INR status
   */
  classifyINRStatus(inr, targetLow = 2.0, targetHigh = 3.0) {
    if (!inr) return null;
    if (inr < targetLow) return 'SUBTHERAPEUTIC';
    if (inr > targetHigh) return 'SUPRATHERAPEUTIC';
    return 'THERAPEUTIC';
  }

  /**
   * Get all hematological system assessments for a patient
   * GET /patients/:patientId/hematological-system-assessments
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(hematological_system_assessments.patient_id, parseInt(patientId))];

      if (from_date) {
        conditions.push(gte(hematological_system_assessments.assessment_date, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(hematological_system_assessments.assessment_date, new Date(to_date)));
      }

      const assessments = await db
        .select()
        .from(hematological_system_assessments)
        .where(and(...conditions))
        .orderBy(desc(hematological_system_assessments.assessment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'Hematological system assessments retrieved successfully',
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient hematological system assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching hematological system assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single hematological system assessment by ID
   * GET /hematological-system-assessments/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(hematological_system_assessments)
        .where(eq(hematological_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Hematological system assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching hematological system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching hematological system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new hematological system assessment
   * POST /patients/:patientId/hematological-system-assessments
   */
  async create(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      // Auto-calculate derived values
      const anemiaSeverity = this.classifyAnemiaSeverity(data.hemoglobin);
      const anemiaMorphology = this.classifyAnemiaMorphology(data.mcv);
      const criticalValues = this.checkCriticalValues(data);
      const inrStatus = this.classifyINRStatus(data.inr, data.inr_target_low, data.inr_target_high);

      const result = await db
        .insert(hematological_system_assessments)
        .values({
          patient_id: parseInt(patientId),
          ...data,
          anemia_severity: data.anemia_severity || (data.anemia_present ? anemiaSeverity : null),
          anemia_morphology: data.anemia_morphology || (data.anemia_present ? anemiaMorphology : null),
          inr_in_range: data.on_anticoagulation ? (inrStatus === 'THERAPEUTIC') : null,
          assessment_date: data.assessment_date ? new Date(data.assessment_date) : new Date(),
          assessed_by_id: data.assessed_by_id || request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await logAudit(request, 'CREATE', 'hematological_system_assessments', result[0].id);

      reply.code(201);
      return {
        status: 201,
        message: 'Hematological system assessment created successfully',
        data: result[0],
        interpretations: {
          anemia_severity: anemiaSeverity,
          anemia_morphology: anemiaMorphology,
          inr_status: inrStatus,
          critical_values: criticalValues
        },
        alerts: criticalValues.any_critical ? {
          critical_values_present: true,
          message: 'Critical lab values detected - provider notification may be required'
        } : null
      };
    } catch (error) {
      logger.error('Error creating hematological system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating hematological system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update a hematological system assessment
   * PATCH /hematological-system-assessments/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(hematological_system_assessments)
        .where(eq(hematological_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Hematological system assessment not found'
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
        .update(hematological_system_assessments)
        .set({
          ...updateData,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hematological_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'hematological_system_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Hematological system assessment updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating hematological system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating hematological system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete a hematological system assessment
   * DELETE /hematological-system-assessments/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(hematological_system_assessments)
        .where(eq(hematological_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Hematological system assessment not found'
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
        .delete(hematological_system_assessments)
        .where(eq(hematological_system_assessments.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'hematological_system_assessments', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'Hematological system assessment deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting hematological system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting hematological system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign a hematological system assessment (21 CFR Part 11 compliance)
   * POST /hematological-system-assessments/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(hematological_system_assessments)
        .where(eq(hematological_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Hematological system assessment not found'
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
        .update(hematological_system_assessments)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hematological_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'hematological_system_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Hematological system assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing hematological system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend a signed hematological system assessment
   * POST /hematological-system-assessments/:id/amend
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
        .from(hematological_system_assessments)
        .where(eq(hematological_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Hematological system assessment not found'
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
        .update(hematological_system_assessments)
        .set({
          ...updateData,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(hematological_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'hematological_system_assessments', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'Hematological system assessment amended successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error amending hematological system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all hematological system assessments (with filters)
   * GET /hematological-system-assessments
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        overall_status,
        anemia_present,
        on_anticoagulation,
        limit = 50,
        offset = 0
      } = request.query;

      const conditions = [];

      if (patient_id) {
        conditions.push(eq(hematological_system_assessments.patient_id, parseInt(patient_id)));
      }
      if (overall_status) {
        conditions.push(eq(hematological_system_assessments.overall_status, overall_status));
      }
      if (anemia_present !== undefined) {
        conditions.push(eq(hematological_system_assessments.anemia_present, anemia_present === 'true'));
      }
      if (on_anticoagulation !== undefined) {
        conditions.push(eq(hematological_system_assessments.on_anticoagulation, on_anticoagulation === 'true'));
      }

      let query = db.select().from(hematological_system_assessments);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query
        .orderBy(desc(hematological_system_assessments.assessment_date))
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
      logger.error('Error fetching hematological system assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get hematological assessment statistics for a patient
   * GET /patients/:patientId/hematological-system-assessments/stats
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
        .from(hematological_system_assessments)
        .where(eq(hematological_system_assessments.patient_id, parseInt(patientId)))
        .orderBy(desc(hematological_system_assessments.assessment_date))
        .limit(1);

      // Get count of assessments
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(hematological_system_assessments)
        .where(eq(hematological_system_assessments.patient_id, parseInt(patientId)));

      // Get average lab values for the time period
      const avgResult = await db
        .select({
          avg_hemoglobin: sql`avg(hemoglobin)`,
          avg_hematocrit: sql`avg(hematocrit)`,
          avg_wbc: sql`avg(wbc_count)`,
          avg_platelets: sql`avg(platelet_count)`,
          avg_inr: sql`avg(inr)`,
          min_hemoglobin: sql`min(hemoglobin)`,
          max_hemoglobin: sql`max(hemoglobin)`
        })
        .from(hematological_system_assessments)
        .where(
          and(
            eq(hematological_system_assessments.patient_id, parseInt(patientId)),
            gte(hematological_system_assessments.assessment_date, startDate)
          )
        );

      // Get bleeding episode count
      const bleedingResult = await db
        .select({ count: sql`count(*)` })
        .from(hematological_system_assessments)
        .where(
          and(
            eq(hematological_system_assessments.patient_id, parseInt(patientId)),
            eq(hematological_system_assessments.active_bleeding, true)
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
            hemoglobin: parseFloat(avgResult[0]?.avg_hemoglobin) || null,
            hematocrit: parseFloat(avgResult[0]?.avg_hematocrit) || null,
            wbc_count: parseFloat(avgResult[0]?.avg_wbc) || null,
            platelet_count: parseFloat(avgResult[0]?.avg_platelets) || null,
            inr: parseFloat(avgResult[0]?.avg_inr) || null
          },
          hemoglobin_range: {
            min: parseFloat(avgResult[0]?.min_hemoglobin) || null,
            max: parseFloat(avgResult[0]?.max_hemoglobin) || null
          },
          bleeding_episodes: parseInt(bleedingResult[0]?.count || 0),
          reference_ranges: {
            cbc: HEMATOLOGICAL_CBC_RANGES,
            coagulation: HEMATOLOGICAL_COAG_RANGES,
            iron_studies: HEMATOLOGICAL_IRON_RANGES
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching hematological system assessment stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get hematological assessment trend for a patient
   * GET /patients/:patientId/hematological-system-assessments/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const assessments = await db
        .select({
          id: hematological_system_assessments.id,
          assessment_date: hematological_system_assessments.assessment_date,
          overall_status: hematological_system_assessments.overall_status,
          hemoglobin: hematological_system_assessments.hemoglobin,
          hematocrit: hematological_system_assessments.hematocrit,
          wbc_count: hematological_system_assessments.wbc_count,
          platelet_count: hematological_system_assessments.platelet_count,
          inr: hematological_system_assessments.inr,
          anemia_present: hematological_system_assessments.anemia_present,
          anemia_severity: hematological_system_assessments.anemia_severity,
          active_bleeding: hematological_system_assessments.active_bleeding
        })
        .from(hematological_system_assessments)
        .where(
          and(
            eq(hematological_system_assessments.patient_id, parseInt(patientId)),
            gte(hematological_system_assessments.assessment_date, startDate)
          )
        )
        .orderBy(desc(hematological_system_assessments.assessment_date))
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
      logger.error('Error fetching hematological trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get hematological assessment reference data
   * GET /hematological-system-assessments/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          name: 'Hematological System Assessment',
          description: 'Comprehensive blood and coagulation assessment for hospice patients',
          clinical_standards: [
            'American Society of Hematology guidelines',
            'WHO anemia classification',
            'Common lab reference ranges'
          ],
          assessment_components: [
            'Complete Blood Count (CBC)',
            'Anemia assessment and classification',
            'Coagulation assessment',
            'Bleeding assessment',
            'Clotting/Thrombosis risk',
            'Lymphatic system',
            'Transfusion history'
          ],
          classifications: {
            anemia_severity: HEMATOLOGICAL_ANEMIA_SEVERITY,
            anemia_types: HEMATOLOGICAL_ANEMIA_TYPES
          },
          reference_ranges: {
            cbc: HEMATOLOGICAL_CBC_RANGES,
            coagulation: HEMATOLOGICAL_COAG_RANGES,
            iron_studies: HEMATOLOGICAL_IRON_RANGES
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching hematological reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching reference data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new HematologicalSystemAssessmentController();
