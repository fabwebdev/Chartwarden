import { db } from '../../config/db.drizzle.js';
import { vital_signs, VITAL_SIGN_RANGES } from '../../db/schemas/vitalSign.schema.js';
import { patients } from '../../db/schemas/index.js';
import { eq, and, desc, sql, gte, lte, or } from 'drizzle-orm';
import { logger } from '../../utils/logger.js';
import { logAudit } from '../../middleware/audit.middleware.js';

/**
 * Vital Signs Controller
 * Manages comprehensive vital signs (BP, HR, RR, Temp, SpO2, Pain) with timestamp, value, and unit information
 */
class VitalSignsController {
  /**
   * Helper function to clean data - convert empty strings to null for numeric fields
   */
  cleanVitalSignData(data) {
    const cleaned = { ...data };

    // Integer fields - convert empty strings to null
    const integerFields = [
      'heart_rate',
      'bp_systolic',
      'bp_diastolic',
      'respiratory_rate',
      'bp_mmhg',
      'pain_score',
      'pain_post_intervention_score',
      'weight_change_period_days'
    ];

    // Decimal fields - convert empty strings to null
    const decimalFields = [
      'degrees_fahrenheit',
      'degrees_celsius',
      'pulse_oximetry_percentage',
      'oxygen_flow_rate',
      'body_height_inches',
      'body_height_cm',
      'body_weight_lbs',
      'body_weight_kg',
      'body_weight_ibs',
      'bmi_kg_m2',
      'bmi_percentage',
      'weight_change_percentage'
    ];

    // Clean integer fields
    integerFields.forEach(field => {
      if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {
        cleaned[field] = null;
      } else if (typeof cleaned[field] === 'string') {
        const parsed = parseInt(cleaned[field], 10);
        cleaned[field] = isNaN(parsed) ? null : parsed;
      }
    });

    // Clean decimal fields
    decimalFields.forEach(field => {
      if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {
        cleaned[field] = null;
      } else if (typeof cleaned[field] === 'string') {
        const parsed = parseFloat(cleaned[field]);
        cleaned[field] = isNaN(parsed) ? null : parsed;
      }
    });

    // Clean string fields - convert empty strings to null
    Object.keys(cleaned).forEach(key => {
      if (typeof cleaned[key] === 'string' && cleaned[key].trim() === '') {
        cleaned[key] = null;
      }
    });

    return cleaned;
  }

  /**
   * Check if vital signs are abnormal based on defined ranges
   * @param {object} data - Vital sign data
   * @returns {object} { isAbnormal: boolean, abnormalValues: string[] }
   */
  checkAbnormalValues(data) {
    const abnormalValues = [];

    // Check temperature
    if (data.degrees_fahrenheit !== null && data.degrees_fahrenheit !== undefined) {
      const temp = parseFloat(data.degrees_fahrenheit);
      const range = VITAL_SIGN_RANGES.temperature_fahrenheit;
      if (temp < range.critical_low || temp > range.critical_high) {
        abnormalValues.push(`TEMP_CRITICAL:${temp}F`);
      } else if (temp < range.low || temp > range.high) {
        abnormalValues.push(`TEMP_ABNORMAL:${temp}F`);
      }
    }

    // Check heart rate
    if (data.heart_rate !== null && data.heart_rate !== undefined) {
      const hr = parseInt(data.heart_rate);
      const range = VITAL_SIGN_RANGES.heart_rate;
      if (hr < range.critical_low || hr > range.critical_high) {
        abnormalValues.push(`HR_CRITICAL:${hr}`);
      } else if (hr < range.low || hr > range.high) {
        abnormalValues.push(`HR_ABNORMAL:${hr}`);
      }
    }

    // Check blood pressure systolic
    if (data.bp_systolic !== null && data.bp_systolic !== undefined) {
      const sys = parseInt(data.bp_systolic);
      const range = VITAL_SIGN_RANGES.bp_systolic;
      if (sys < range.critical_low || sys > range.critical_high) {
        abnormalValues.push(`BP_SYS_CRITICAL:${sys}`);
      } else if (sys < range.low || sys > range.high) {
        abnormalValues.push(`BP_SYS_ABNORMAL:${sys}`);
      }
    }

    // Check blood pressure diastolic
    if (data.bp_diastolic !== null && data.bp_diastolic !== undefined) {
      const dia = parseInt(data.bp_diastolic);
      const range = VITAL_SIGN_RANGES.bp_diastolic;
      if (dia < range.critical_low || dia > range.critical_high) {
        abnormalValues.push(`BP_DIA_CRITICAL:${dia}`);
      } else if (dia < range.low || dia > range.high) {
        abnormalValues.push(`BP_DIA_ABNORMAL:${dia}`);
      }
    }

    // Check respiratory rate
    if (data.respiratory_rate !== null && data.respiratory_rate !== undefined) {
      const rr = parseInt(data.respiratory_rate);
      const range = VITAL_SIGN_RANGES.respiratory_rate;
      if (rr < range.critical_low || rr > range.critical_high) {
        abnormalValues.push(`RR_CRITICAL:${rr}`);
      } else if (rr < range.low || rr > range.high) {
        abnormalValues.push(`RR_ABNORMAL:${rr}`);
      }
    }

    // Check SpO2
    if (data.pulse_oximetry_percentage !== null && data.pulse_oximetry_percentage !== undefined) {
      const spo2 = parseFloat(data.pulse_oximetry_percentage);
      const range = VITAL_SIGN_RANGES.spo2;
      if (spo2 < range.critical_low) {
        abnormalValues.push(`SPO2_CRITICAL:${spo2}%`);
      } else if (spo2 < range.low) {
        abnormalValues.push(`SPO2_ABNORMAL:${spo2}%`);
      }
    }

    // Check pain score
    if (data.pain_score !== null && data.pain_score !== undefined) {
      const pain = parseInt(data.pain_score);
      const range = VITAL_SIGN_RANGES.pain_score;
      if (pain >= range.critical_high) {
        abnormalValues.push(`PAIN_CRITICAL:${pain}`);
      } else if (pain > range.high) {
        abnormalValues.push(`PAIN_ABNORMAL:${pain}`);
      }
    }

    return {
      isAbnormal: abnormalValues.length > 0,
      abnormalValues: abnormalValues
    };
  }

  /**
   * Get all vital signs (with optional filters)
   * GET /vital-signs
   */
  async index(request, reply) {
    try {
      const { patient_id, limit = 50, offset = 0, from_date, to_date, abnormal_only } = request.query;

      let conditions = [];

      if (patient_id) {
        conditions.push(eq(vital_signs.patient_id, parseInt(patient_id)));
      }

      if (from_date) {
        conditions.push(gte(vital_signs.measurement_timestamp, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(vital_signs.measurement_timestamp, new Date(to_date)));
      }

      if (abnormal_only === 'true') {
        conditions.push(eq(vital_signs.is_abnormal, true));
      }

      let query = db.select().from(vital_signs);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const vitalSigns = await query
        .orderBy(desc(vital_signs.measurement_timestamp))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: vitalSigns,
        count: vitalSigns.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching vital signs:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Server error while fetching vital signs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all vital signs for a specific patient
   * GET /patients/:patientId/vital-signs
   */
  async getPatientVitalSigns(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(vital_signs.patient_id, parseInt(patientId))];

      if (from_date) {
        conditions.push(gte(vital_signs.measurement_timestamp, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(vital_signs.measurement_timestamp, new Date(to_date)));
      }

      const vitalSigns = await db
        .select()
        .from(vital_signs)
        .where(and(...conditions))
        .orderBy(desc(vital_signs.measurement_timestamp))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'Vital signs retrieved successfully',
        data: vitalSigns,
        count: vitalSigns.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient vital signs:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching vital signs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get latest vital signs for a patient
   * GET /patients/:patientId/vital-signs/latest
   */
  async getLatestVitalSigns(request, reply) {
    try {
      const { patientId } = request.params;

      const result = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.patient_id, parseInt(patientId)))
        .orderBy(desc(vital_signs.measurement_timestamp))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'No vital signs found for this patient'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching latest vital signs:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching latest vital signs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single vital sign record by ID
   * GET /vital-signs/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Vital signs not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching vital signs:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Server error while fetching vital signs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Store new vital signs
   * POST /vital-signs/store or POST /patients/:patientId/vital-signs
   */
  async store(request, reply) {
    try {
      const patientId = request.params?.patientId || request.body?.patient_id;
      const cleanedData = this.cleanVitalSignData(request.body);

      // Check for abnormal values
      const { isAbnormal, abnormalValues } = this.checkAbnormalValues(cleanedData);

      const insertData = {
        ...cleanedData,
        patient_id: patientId ? parseInt(patientId) : cleanedData.patient_id,
        is_abnormal: isAbnormal,
        abnormal_values: abnormalValues.length > 0 ? JSON.stringify(abnormalValues) : null,
        measurement_timestamp: cleanedData.measurement_timestamp ? new Date(cleanedData.measurement_timestamp) : new Date(),
        measured_by_id: cleanedData.measured_by_id || request.user?.id,
        created_by_id: request.user?.id,
        updated_by_id: request.user?.id,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const newVitalSign = await db.insert(vital_signs).values(insertData).returning();
      const vitalSign = newVitalSign[0];

      await logAudit(request, 'CREATE', 'vital_signs', vitalSign.id);

      reply.code(201);
      return {
        status: 201,
        message: 'Vital signs created successfully',
        data: vitalSign,
        alerts: isAbnormal ? {
          has_abnormal_values: true,
          abnormal_values: abnormalValues
        } : null
      };
    } catch (error) {
      logger.error('Error creating vital signs:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Server error while creating vital signs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create vital signs for a patient
   * POST /patients/:patientId/vital-signs
   */
  async create(request, reply) {
    return this.store(request, reply);
  }

  /**
   * Update vital signs by ID (upsert pattern for backward compatibility)
   * POST /vital-signs/:id or PATCH /vital-signs/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const vitalSignData = this.cleanVitalSignData(request.body);
      const idNum = parseInt(id);

      // First, check if vital signs exist with this ID (as vital_signs.id)
      const existingVitalSign = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.id, idNum))
        .limit(1);

      let result;
      if (existingVitalSign[0]) {
        // Don't allow updates to signed assessments
        if (existingVitalSign[0].signed_at) {
          reply.code(403);
          return {
            status: 403,
            message: 'Cannot update signed vital signs. Use amendment instead.'
          };
        }

        // Check for abnormal values
        const mergedData = { ...existingVitalSign[0], ...vitalSignData };
        const { isAbnormal, abnormalValues } = this.checkAbnormalValues(mergedData);

        // Remove fields that shouldn't be updated directly
        const { id: _, patient_id, created_by_id, createdAt, ...updateData } = vitalSignData;

        result = await db
          .update(vital_signs)
          .set({
            ...updateData,
            is_abnormal: isAbnormal,
            abnormal_values: abnormalValues.length > 0 ? JSON.stringify(abnormalValues) : null,
            updated_by_id: request.user?.id,
            updatedAt: new Date()
          })
          .where(eq(vital_signs.id, idNum))
          .returning();

        await logAudit(request, 'UPDATE', 'vital_signs', result[0].id);

        reply.code(200);
        return {
          status: 200,
          message: 'Vital signs updated successfully',
          data: result[0],
          alerts: isAbnormal ? {
            has_abnormal_values: true,
            abnormal_values: abnormalValues
          } : null
        };
      } else {
        // ID doesn't exist as vital_signs id, so treat it as note_id for backward compatibility
        const existingByNoteId = await db
          .select()
          .from(vital_signs)
          .where(eq(vital_signs.note_id, idNum))
          .limit(1);

        if (existingByNoteId[0]) {
          // Don't allow updates to signed assessments
          if (existingByNoteId[0].signed_at) {
            reply.code(403);
            return {
              status: 403,
              message: 'Cannot update signed vital signs. Use amendment instead.'
            };
          }

          const mergedData = { ...existingByNoteId[0], ...vitalSignData };
          const { isAbnormal, abnormalValues } = this.checkAbnormalValues(mergedData);

          result = await db
            .update(vital_signs)
            .set({
              ...vitalSignData,
              is_abnormal: isAbnormal,
              abnormal_values: abnormalValues.length > 0 ? JSON.stringify(abnormalValues) : null,
              updated_by_id: request.user?.id,
              updatedAt: new Date()
            })
            .where(eq(vital_signs.note_id, idNum))
            .returning();

          await logAudit(request, 'UPDATE', 'vital_signs', result[0].id);

          reply.code(200);
          return {
            status: 200,
            message: 'Vital signs updated successfully',
            data: result[0]
          };
        } else {
          // Create new vital signs with note_id from URL
          const { isAbnormal, abnormalValues } = this.checkAbnormalValues(vitalSignData);

          vitalSignData.note_id = idNum;
          if (vitalSignData.id) {
            delete vitalSignData.id;
          }

          const now = new Date();
          result = await db
            .insert(vital_signs)
            .values({
              ...vitalSignData,
              is_abnormal: isAbnormal,
              abnormal_values: abnormalValues.length > 0 ? JSON.stringify(abnormalValues) : null,
              measurement_timestamp: vitalSignData.measurement_timestamp ? new Date(vitalSignData.measurement_timestamp) : now,
              created_by_id: request.user?.id,
              updated_by_id: request.user?.id,
              createdAt: now,
              updatedAt: now
            })
            .returning();

          await logAudit(request, 'CREATE', 'vital_signs', result[0].id);

          reply.code(201);
          return {
            status: 201,
            message: 'Vital signs created successfully',
            data: result[0]
          };
        }
      }
    } catch (error) {
      logger.error('Error in update vital signs:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Server error while updating vital signs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete vital signs by ID
   * DELETE /vital-signs/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Vital signs not found'
        };
      }

      // Don't allow deletion of signed records
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete signed vital signs'
        };
      }

      await db
        .delete(vital_signs)
        .where(eq(vital_signs.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'vital_signs', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'Vital signs deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting vital signs:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting vital signs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign vital signs (21 CFR Part 11 compliance)
   * POST /vital-signs/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Vital signs not found'
        };
      }

      if (existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Vital signs already signed'
        };
      }

      const result = await db
        .update(vital_signs)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(vital_signs.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'vital_signs', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Vital signs signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing vital signs:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing vital signs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend signed vital signs
   * POST /vital-signs/:id/amend
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
        .from(vital_signs)
        .where(eq(vital_signs.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Vital signs not found'
        };
      }

      if (!existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Cannot amend unsigned vital signs. Use update instead.'
        };
      }

      const cleanedData = this.cleanVitalSignData(updateData);
      const mergedData = { ...existing[0], ...cleanedData };
      const { isAbnormal, abnormalValues } = this.checkAbnormalValues(mergedData);

      const result = await db
        .update(vital_signs)
        .set({
          ...cleanedData,
          is_abnormal: isAbnormal,
          abnormal_values: abnormalValues.length > 0 ? JSON.stringify(abnormalValues) : null,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(vital_signs.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'vital_signs', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'Vital signs amended successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error amending vital signs:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending vital signs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get vital signs statistics for a patient
   * GET /patients/:patientId/vital-signs/stats
   */
  async getPatientStats(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      // Get the most recent vital signs
      const latestVitalSigns = await db
        .select()
        .from(vital_signs)
        .where(eq(vital_signs.patient_id, parseInt(patientId)))
        .orderBy(desc(vital_signs.measurement_timestamp))
        .limit(1);

      // Get count of vital signs
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(vital_signs)
        .where(eq(vital_signs.patient_id, parseInt(patientId)));

      // Get average values for the time period
      const avgResult = await db
        .select({
          avg_temp: sql`avg(degrees_fahrenheit)`,
          avg_heart_rate: sql`avg(heart_rate)`,
          avg_bp_systolic: sql`avg(bp_systolic)`,
          avg_bp_diastolic: sql`avg(bp_diastolic)`,
          avg_respiratory_rate: sql`avg(respiratory_rate)`,
          avg_spo2: sql`avg(pulse_oximetry_percentage)`,
          avg_pain: sql`avg(pain_score)`,
          max_temp: sql`max(degrees_fahrenheit)`,
          min_temp: sql`min(degrees_fahrenheit)`,
          max_heart_rate: sql`max(heart_rate)`,
          min_heart_rate: sql`min(heart_rate)`,
          max_bp_systolic: sql`max(bp_systolic)`,
          min_bp_systolic: sql`min(bp_systolic)`,
          max_pain: sql`max(pain_score)`,
          abnormal_count: sql`sum(case when is_abnormal then 1 else 0 end)`
        })
        .from(vital_signs)
        .where(
          and(
            eq(vital_signs.patient_id, parseInt(patientId)),
            gte(vital_signs.measurement_timestamp, startDate)
          )
        );

      reply.code(200);
      return {
        status: 200,
        data: {
          total_records: parseInt(countResult[0]?.count || 0),
          latest_vital_signs: latestVitalSigns[0] || null,
          period_days: parseInt(days),
          averages: {
            temperature: parseFloat(avgResult[0]?.avg_temp) || null,
            heart_rate: parseFloat(avgResult[0]?.avg_heart_rate) || null,
            bp_systolic: parseFloat(avgResult[0]?.avg_bp_systolic) || null,
            bp_diastolic: parseFloat(avgResult[0]?.avg_bp_diastolic) || null,
            respiratory_rate: parseFloat(avgResult[0]?.avg_respiratory_rate) || null,
            spo2: parseFloat(avgResult[0]?.avg_spo2) || null,
            pain_score: parseFloat(avgResult[0]?.avg_pain) || null
          },
          ranges: {
            temperature: {
              max: parseFloat(avgResult[0]?.max_temp) || null,
              min: parseFloat(avgResult[0]?.min_temp) || null
            },
            heart_rate: {
              max: parseInt(avgResult[0]?.max_heart_rate) || null,
              min: parseInt(avgResult[0]?.min_heart_rate) || null
            },
            bp_systolic: {
              max: parseInt(avgResult[0]?.max_bp_systolic) || null,
              min: parseInt(avgResult[0]?.min_bp_systolic) || null
            },
            pain_score: {
              max: parseInt(avgResult[0]?.max_pain) || null
            }
          },
          abnormal_count: parseInt(avgResult[0]?.abnormal_count) || 0
        }
      };
    } catch (error) {
      logger.error('Error fetching vital signs stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching vital signs statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get vital signs trend for a patient
   * GET /patients/:patientId/vital-signs/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const vitalSigns = await db
        .select({
          id: vital_signs.id,
          measurement_timestamp: vital_signs.measurement_timestamp,
          degrees_fahrenheit: vital_signs.degrees_fahrenheit,
          heart_rate: vital_signs.heart_rate,
          bp_systolic: vital_signs.bp_systolic,
          bp_diastolic: vital_signs.bp_diastolic,
          respiratory_rate: vital_signs.respiratory_rate,
          pulse_oximetry_percentage: vital_signs.pulse_oximetry_percentage,
          pain_score: vital_signs.pain_score,
          is_abnormal: vital_signs.is_abnormal
        })
        .from(vital_signs)
        .where(
          and(
            eq(vital_signs.patient_id, parseInt(patientId)),
            gte(vital_signs.measurement_timestamp, startDate)
          )
        )
        .orderBy(desc(vital_signs.measurement_timestamp))
        .limit(parseInt(limit));

      reply.code(200);
      return {
        status: 200,
        data: {
          period_days: parseInt(days),
          vital_signs: vitalSigns.reverse(), // Chronological order for charting
          count: vitalSigns.length
        }
      };
    } catch (error) {
      logger.error('Error fetching vital signs trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching vital signs trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get vital signs reference information
   * GET /vital-signs/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          name: 'Vital Signs',
          description: 'Standard vital signs for patient assessment',
          measurements: {
            blood_pressure: {
              name: 'Blood Pressure',
              unit: 'mmHg',
              components: ['Systolic', 'Diastolic'],
              normal_ranges: VITAL_SIGN_RANGES.bp_systolic
            },
            heart_rate: {
              name: 'Heart Rate',
              unit: 'BPM',
              normal_ranges: VITAL_SIGN_RANGES.heart_rate
            },
            respiratory_rate: {
              name: 'Respiratory Rate',
              unit: 'breaths/min',
              normal_ranges: VITAL_SIGN_RANGES.respiratory_rate
            },
            temperature: {
              name: 'Temperature',
              unit: 'F',
              normal_ranges: VITAL_SIGN_RANGES.temperature_fahrenheit
            },
            spo2: {
              name: 'Oxygen Saturation (SpO2)',
              unit: '%',
              normal_ranges: VITAL_SIGN_RANGES.spo2
            },
            pain: {
              name: 'Pain Score',
              unit: '0-10 scale',
              normal_ranges: VITAL_SIGN_RANGES.pain_score
            }
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching vital signs reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching vital signs reference',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

// Create controller instance
const controller = new VitalSignsController();

// Export instance methods for routes (bound to controller instance)
export const index = controller.index.bind(controller);
export const store = controller.store.bind(controller);
export const show = controller.show.bind(controller);
export const update = controller.update.bind(controller);

// Export controller instance for new routes
export default controller;
