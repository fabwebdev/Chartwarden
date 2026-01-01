import { db } from '../config/db.drizzle.js';
import { respiratory_system_assessments, RESPIRATORY_PATTERNS, RESPIRATORY_BREATH_SOUNDS, RESPIRATORY_ADVENTITIOUS_SOUNDS, RESPIRATORY_MMRC_SCALE, RESPIRATORY_NORMAL_RANGES, RESPIRATORY_ABG_RANGES, RESPIRATORY_O2_DEVICES } from '../db/schemas/respiratorySystemAssessment.schema.js';
import { eq, and, desc, sql, gte, lte } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * Respiratory System Assessment Controller
 * Manages comprehensive pulmonary assessments for hospice patients
 * Follows ATS guidelines, GOLD guidelines, and NCCN dyspnea guidelines
 */
class RespiratorySystemAssessmentController {
  /**
   * Classify respiratory rate status
   * @param {number} rate - Respiratory rate in breaths/min
   * @returns {string} Status classification
   */
  classifyRespiratoryRate(rate) {
    if (!rate) return null;
    const ranges = RESPIRATORY_NORMAL_RANGES.respiratory_rate;

    if (rate < ranges.low) return 'BRADYPNEA';
    if (rate > ranges.high) return 'TACHYPNEA';
    return 'NORMAL';
  }

  /**
   * Classify oxygen saturation status
   * @param {number} spo2 - SpO2 percentage
   * @returns {string} Status classification
   */
  classifyOxygenSaturation(spo2) {
    if (!spo2) return null;
    const ranges = RESPIRATORY_NORMAL_RANGES.spo2;

    if (spo2 < ranges.critical_low) return 'CRITICAL';
    if (spo2 < ranges.low) return 'HYPOXEMIA';
    return 'NORMAL';
  }

  /**
   * Classify peak flow status based on personal best
   * @param {number} current - Current peak flow
   * @param {number} personalBest - Personal best peak flow
   * @returns {string} Zone classification (GREEN, YELLOW, RED)
   */
  classifyPeakFlow(current, personalBest) {
    if (!current || !personalBest) return null;
    const percent = (current / personalBest) * 100;
    const ranges = RESPIRATORY_NORMAL_RANGES.peak_flow_percent;

    if (percent >= ranges.green) return 'GREEN';
    if (percent >= ranges.yellow) return 'YELLOW';
    return 'RED';
  }

  /**
   * Interpret ABG results
   * @param {object} abg - ABG values (ph, pco2, hco3)
   * @returns {string} ABG interpretation
   */
  interpretABG(abg) {
    if (!abg.abg_ph || !abg.abg_pco2) return null;

    const ph = parseFloat(abg.abg_ph);
    const pco2 = parseFloat(abg.abg_pco2);
    const hco3 = parseFloat(abg.abg_hco3) || 24;

    // Simplified ABG interpretation
    if (ph >= 7.35 && ph <= 7.45 && pco2 >= 35 && pco2 <= 45) {
      return 'NORMAL';
    }

    if (ph < 7.35) {
      if (pco2 > 45) return 'RESPIRATORY_ACIDOSIS';
      if (hco3 < 22) return 'METABOLIC_ACIDOSIS';
      return 'MIXED_ACIDOSIS';
    }

    if (ph > 7.45) {
      if (pco2 < 35) return 'RESPIRATORY_ALKALOSIS';
      if (hco3 > 26) return 'METABOLIC_ALKALOSIS';
      return 'MIXED_ALKALOSIS';
    }

    return 'COMPENSATED';
  }

  /**
   * Check for respiratory alerts
   * @param {object} data - Assessment data
   * @returns {object} Alert information
   */
  checkRespiratoryAlerts(data) {
    const alerts = [];

    // Critical SpO2
    if (data.spo2_percentage && data.spo2_percentage < 88) {
      alerts.push({
        type: 'CRITICAL_SPO2',
        severity: 'CRITICAL',
        message: `SpO2 ${data.spo2_percentage}% is critically low`
      });
    }

    // Severe respiratory distress
    if (data.respiratory_effort === 'SEVERELY_LABORED') {
      alerts.push({
        type: 'SEVERE_RESPIRATORY_DISTRESS',
        severity: 'CRITICAL',
        message: 'Severely labored breathing - immediate intervention may be required'
      });
    }

    // Agonal breathing (pre-terminal)
    if (data.respiratory_pattern === 'AGONAL') {
      alerts.push({
        type: 'AGONAL_BREATHING',
        severity: 'CRITICAL',
        message: 'Agonal breathing pattern - may indicate end-of-life'
      });
    }

    // Cheyne-Stokes breathing
    if (data.respiratory_pattern === 'CHEYNE_STOKES') {
      alerts.push({
        type: 'CHEYNE_STOKES',
        severity: 'HIGH',
        message: 'Cheyne-Stokes breathing pattern detected'
      });
    }

    // Death rattle
    if (data.death_rattle_present) {
      alerts.push({
        type: 'DEATH_RATTLE',
        severity: 'HIGH',
        message: 'Death rattle present - end-of-life care measures may be appropriate'
      });
    }

    // Hemoptysis
    if (data.hemoptysis) {
      alerts.push({
        type: 'HEMOPTYSIS',
        severity: data.hemoptysis_amount === 'MASSIVE' ? 'CRITICAL' : 'HIGH',
        message: `Hemoptysis (${data.hemoptysis_amount || 'present'}) - provider notification may be required`
      });
    }

    return {
      alerts,
      has_alerts: alerts.length > 0,
      critical_count: alerts.filter(a => a.severity === 'CRITICAL').length
    };
  }

  /**
   * Get all respiratory system assessments for a patient
   * GET /patients/:patientId/respiratory-system-assessments
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(respiratory_system_assessments.patient_id, parseInt(patientId))];

      if (from_date) {
        conditions.push(gte(respiratory_system_assessments.assessment_date, new Date(from_date)));
      }
      if (to_date) {
        conditions.push(lte(respiratory_system_assessments.assessment_date, new Date(to_date)));
      }

      const assessments = await db
        .select()
        .from(respiratory_system_assessments)
        .where(and(...conditions))
        .orderBy(desc(respiratory_system_assessments.assessment_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'Respiratory system assessments retrieved successfully',
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient respiratory system assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching respiratory system assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single respiratory system assessment by ID
   * GET /respiratory-system-assessments/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(respiratory_system_assessments)
        .where(eq(respiratory_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Respiratory system assessment not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching respiratory system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching respiratory system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new respiratory system assessment
   * POST /patients/:patientId/respiratory-system-assessments
   */
  async create(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      // Auto-calculate derived values
      const rrStatus = this.classifyRespiratoryRate(data.respiratory_rate);
      const spo2Status = this.classifyOxygenSaturation(data.spo2_percentage);
      const peakFlowZone = this.classifyPeakFlow(data.peak_flow, data.peak_flow_personal_best);
      const abgInterpretation = this.interpretABG(data);

      const result = await db
        .insert(respiratory_system_assessments)
        .values({
          patient_id: parseInt(patientId),
          ...data,
          peak_flow_zone: data.peak_flow_zone || peakFlowZone,
          abg_interpretation: data.abg_interpretation || abgInterpretation,
          assessment_date: data.assessment_date ? new Date(data.assessment_date) : new Date(),
          assessed_by_id: data.assessed_by_id || request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      await logAudit(request, 'CREATE', 'respiratory_system_assessments', result[0].id);

      // Check for respiratory alerts
      const alertInfo = this.checkRespiratoryAlerts(data);

      reply.code(201);
      return {
        status: 201,
        message: 'Respiratory system assessment created successfully',
        data: result[0],
        interpretations: {
          respiratory_rate_status: rrStatus,
          spo2_status: spo2Status,
          peak_flow_zone: peakFlowZone,
          abg_interpretation: abgInterpretation,
          mmrc_description: data.mmrc_grade !== undefined ? RESPIRATORY_MMRC_SCALE[data.mmrc_grade] : null
        },
        alerts: alertInfo.has_alerts ? alertInfo : null
      };
    } catch (error) {
      logger.error('Error creating respiratory system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating respiratory system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update a respiratory system assessment
   * PATCH /respiratory-system-assessments/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(respiratory_system_assessments)
        .where(eq(respiratory_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Respiratory system assessment not found'
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
        .update(respiratory_system_assessments)
        .set({
          ...updateData,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(respiratory_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'respiratory_system_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Respiratory system assessment updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating respiratory system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating respiratory system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete a respiratory system assessment
   * DELETE /respiratory-system-assessments/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db
        .select()
        .from(respiratory_system_assessments)
        .where(eq(respiratory_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Respiratory system assessment not found'
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
        .delete(respiratory_system_assessments)
        .where(eq(respiratory_system_assessments.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'respiratory_system_assessments', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'Respiratory system assessment deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting respiratory system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting respiratory system assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign a respiratory system assessment (21 CFR Part 11 compliance)
   * POST /respiratory-system-assessments/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(respiratory_system_assessments)
        .where(eq(respiratory_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Respiratory system assessment not found'
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
        .update(respiratory_system_assessments)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(respiratory_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'respiratory_system_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Respiratory system assessment signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing respiratory system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Amend a signed respiratory system assessment
   * POST /respiratory-system-assessments/:id/amend
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
        .from(respiratory_system_assessments)
        .where(eq(respiratory_system_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Respiratory system assessment not found'
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
        .update(respiratory_system_assessments)
        .set({
          ...updateData,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(respiratory_system_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'respiratory_system_assessments', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'Respiratory system assessment amended successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error amending respiratory system assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get all respiratory system assessments (with filters)
   * GET /respiratory-system-assessments
   */
  async index(request, reply) {
    try {
      const {
        patient_id,
        overall_status,
        supplemental_oxygen,
        dyspnea_present,
        limit = 50,
        offset = 0
      } = request.query;

      const conditions = [];

      if (patient_id) {
        conditions.push(eq(respiratory_system_assessments.patient_id, parseInt(patient_id)));
      }
      if (overall_status) {
        conditions.push(eq(respiratory_system_assessments.overall_status, overall_status));
      }
      if (supplemental_oxygen !== undefined) {
        conditions.push(eq(respiratory_system_assessments.supplemental_oxygen, supplemental_oxygen === 'true'));
      }
      if (dyspnea_present !== undefined) {
        conditions.push(eq(respiratory_system_assessments.dyspnea_present, dyspnea_present === 'true'));
      }

      let query = db.select().from(respiratory_system_assessments);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query
        .orderBy(desc(respiratory_system_assessments.assessment_date))
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
      logger.error('Error fetching respiratory system assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get respiratory assessment statistics for a patient
   * GET /patients/:patientId/respiratory-system-assessments/stats
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
        .from(respiratory_system_assessments)
        .where(eq(respiratory_system_assessments.patient_id, parseInt(patientId)))
        .orderBy(desc(respiratory_system_assessments.assessment_date))
        .limit(1);

      // Get count of assessments
      const countResult = await db
        .select({ count: sql`count(*)` })
        .from(respiratory_system_assessments)
        .where(eq(respiratory_system_assessments.patient_id, parseInt(patientId)));

      // Get average vital signs for the time period
      const avgResult = await db
        .select({
          avg_rr: sql`avg(respiratory_rate)`,
          avg_spo2: sql`avg(spo2_percentage)`,
          min_spo2: sql`min(spo2_percentage)`,
          max_spo2: sql`max(spo2_percentage)`,
          avg_o2_flow: sql`avg(oxygen_flow_rate)`
        })
        .from(respiratory_system_assessments)
        .where(
          and(
            eq(respiratory_system_assessments.patient_id, parseInt(patientId)),
            gte(respiratory_system_assessments.assessment_date, startDate)
          )
        );

      // Get count on supplemental oxygen
      const o2Result = await db
        .select({ count: sql`count(*)` })
        .from(respiratory_system_assessments)
        .where(
          and(
            eq(respiratory_system_assessments.patient_id, parseInt(patientId)),
            eq(respiratory_system_assessments.supplemental_oxygen, true)
          )
        );

      // Get dyspnea distribution
      const dyspneaResult = await db
        .select({
          dyspnea_severity: respiratory_system_assessments.dyspnea_severity,
          count: sql`count(*)`
        })
        .from(respiratory_system_assessments)
        .where(
          and(
            eq(respiratory_system_assessments.patient_id, parseInt(patientId)),
            eq(respiratory_system_assessments.dyspnea_present, true)
          )
        )
        .groupBy(respiratory_system_assessments.dyspnea_severity);

      const dyspneaDistribution = {};
      for (const row of dyspneaResult) {
        if (row.dyspnea_severity) {
          dyspneaDistribution[row.dyspnea_severity] = parseInt(row.count);
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
            respiratory_rate: parseFloat(avgResult[0]?.avg_rr) || null,
            spo2_percentage: parseFloat(avgResult[0]?.avg_spo2) || null,
            oxygen_flow_rate: parseFloat(avgResult[0]?.avg_o2_flow) || null
          },
          spo2_range: {
            min: parseFloat(avgResult[0]?.min_spo2) || null,
            max: parseFloat(avgResult[0]?.max_spo2) || null
          },
          on_supplemental_oxygen: parseInt(o2Result[0]?.count || 0),
          dyspnea_distribution: dyspneaDistribution,
          normal_ranges: RESPIRATORY_NORMAL_RANGES
        }
      };
    } catch (error) {
      logger.error('Error fetching respiratory system assessment stats:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching statistics',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get respiratory assessment trend for a patient
   * GET /patients/:patientId/respiratory-system-assessments/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      const assessments = await db
        .select({
          id: respiratory_system_assessments.id,
          assessment_date: respiratory_system_assessments.assessment_date,
          overall_status: respiratory_system_assessments.overall_status,
          respiratory_rate: respiratory_system_assessments.respiratory_rate,
          respiratory_pattern: respiratory_system_assessments.respiratory_pattern,
          respiratory_effort: respiratory_system_assessments.respiratory_effort,
          spo2_percentage: respiratory_system_assessments.spo2_percentage,
          supplemental_oxygen: respiratory_system_assessments.supplemental_oxygen,
          oxygen_flow_rate: respiratory_system_assessments.oxygen_flow_rate,
          dyspnea_present: respiratory_system_assessments.dyspnea_present,
          dyspnea_severity: respiratory_system_assessments.dyspnea_severity,
          mmrc_grade: respiratory_system_assessments.mmrc_grade,
          cough_present: respiratory_system_assessments.cough_present
        })
        .from(respiratory_system_assessments)
        .where(
          and(
            eq(respiratory_system_assessments.patient_id, parseInt(patientId)),
            gte(respiratory_system_assessments.assessment_date, startDate)
          )
        )
        .orderBy(desc(respiratory_system_assessments.assessment_date))
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
      logger.error('Error fetching respiratory trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get respiratory assessment reference data
   * GET /respiratory-system-assessments/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          name: 'Respiratory System Assessment',
          description: 'Comprehensive pulmonary assessment for hospice patients',
          clinical_standards: [
            'American Thoracic Society (ATS) guidelines',
            'Global Initiative for Chronic Obstructive Lung Disease (GOLD)',
            'National Comprehensive Cancer Network (NCCN) dyspnea guidelines'
          ],
          assessment_components: [
            'Respiratory rate and pattern',
            'Respiratory effort',
            'Oxygen saturation',
            'Breath sounds',
            'Chest assessment',
            'Cough assessment',
            'Sputum assessment',
            'Dyspnea assessment (mMRC scale)',
            'Airway management',
            'Ventilator settings (if applicable)',
            'Pulmonary function',
            'Arterial blood gas',
            'Hospice-specific respiratory care'
          ],
          classifications: {
            respiratory_patterns: RESPIRATORY_PATTERNS,
            breath_sounds: RESPIRATORY_BREATH_SOUNDS,
            adventitious_sounds: RESPIRATORY_ADVENTITIOUS_SOUNDS,
            mmrc_scale: RESPIRATORY_MMRC_SCALE,
            oxygen_delivery_devices: RESPIRATORY_O2_DEVICES
          },
          reference_ranges: {
            vital_signs: RESPIRATORY_NORMAL_RANGES,
            abg: RESPIRATORY_ABG_RANGES
          }
        }
      };
    } catch (error) {
      logger.error('Error fetching respiratory reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching reference data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new RespiratorySystemAssessmentController();
