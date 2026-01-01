import { db } from '../config/db.drizzle.js';
import {
  multi_scale_pain_assessments,
  PAIN_SCALE_TYPES,
  PAIN_SCALE_RANGES,
  normalizeToTenScale,
  getPainIntensityLevel,
} from '../db/schemas/multiScalePainAssessment.schema.js';
import { patients } from '../db/schemas/index.js';
import { eq, and, desc, gte, lte, sql, or } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import { logAudit } from '../middleware/audit.middleware.js';

/**
 * Multi-Scale Pain Assessment Controller
 *
 * Manages pain assessments with support for multiple standardized scales:
 * - NRS (Numeric Rating Scale)
 * - VAS (Visual Analog Scale)
 * - Wong-Baker FACES
 * - FLACC (Face, Legs, Activity, Cry, Consolability)
 * - PAINAD (Pain Assessment in Advanced Dementia)
 * - CPOT (Critical Care Pain Observation Tool)
 *
 * HIPAA/21 CFR Part 11 Compliant
 */
class MultiScalePainAssessmentController {
  /**
   * Clean and normalize assessment data
   */
  cleanAssessmentData(data) {
    const cleaned = { ...data };

    // Integer fields - convert empty strings to null
    const integerFields = [
      'nrs_score',
      'wong_baker_score',
      'flacc_face',
      'flacc_legs',
      'flacc_activity',
      'flacc_cry',
      'flacc_consolability',
      'flacc_total_score',
      'painad_breathing',
      'painad_negative_vocalization',
      'painad_facial_expression',
      'painad_body_language',
      'painad_consolability',
      'painad_total_score',
      'cpot_facial_expression',
      'cpot_body_movements',
      'cpot_muscle_tension',
      'cpot_ventilator_compliance',
      'cpot_total_score',
      'normalized_pain_score',
      'pain_duration_value',
      'acceptable_pain_level',
      'post_intervention_score',
    ];

    // Decimal fields
    const decimalFields = ['vas_score'];

    // Clean integer fields
    integerFields.forEach((field) => {
      if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {
        cleaned[field] = null;
      } else if (typeof cleaned[field] === 'string') {
        const parsed = parseInt(cleaned[field], 10);
        cleaned[field] = isNaN(parsed) ? null : parsed;
      }
    });

    // Clean decimal fields
    decimalFields.forEach((field) => {
      if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {
        cleaned[field] = null;
      } else if (typeof cleaned[field] === 'string') {
        const parsed = parseFloat(cleaned[field]);
        cleaned[field] = isNaN(parsed) ? null : parsed;
      }
    });

    // Clean string fields - convert empty strings to null
    Object.keys(cleaned).forEach((key) => {
      if (typeof cleaned[key] === 'string' && cleaned[key].trim() === '') {
        cleaned[key] = null;
      }
    });

    return cleaned;
  }

  /**
   * Validate scale-specific scores
   */
  validateScaleScores(data) {
    const errors = [];
    const scaleType = data.pain_scale_type;

    if (!scaleType) {
      errors.push({ field: 'pain_scale_type', message: 'Pain scale type is required' });
      return errors;
    }

    if (!PAIN_SCALE_TYPES[scaleType]) {
      errors.push({ field: 'pain_scale_type', message: `Invalid pain scale type: ${scaleType}` });
      return errors;
    }

    const range = PAIN_SCALE_RANGES[scaleType];

    switch (scaleType) {
      case 'NRS':
        if (data.nrs_score !== null && data.nrs_score !== undefined) {
          if (data.nrs_score < range.min || data.nrs_score > range.max) {
            errors.push({ field: 'nrs_score', message: `NRS score must be between ${range.min} and ${range.max}` });
          }
        }
        break;

      case 'VAS':
        if (data.vas_score !== null && data.vas_score !== undefined) {
          if (data.vas_score < range.min || data.vas_score > range.max) {
            errors.push({ field: 'vas_score', message: `VAS score must be between ${range.min} and ${range.max}mm` });
          }
        }
        break;

      case 'WONG_BAKER':
        if (data.wong_baker_score !== null && data.wong_baker_score !== undefined) {
          if (data.wong_baker_score < range.min || data.wong_baker_score > range.max) {
            errors.push({ field: 'wong_baker_score', message: `Wong-Baker score must be between ${range.min} and ${range.max}` });
          }
        }
        break;

      case 'FLACC':
        ['flacc_face', 'flacc_legs', 'flacc_activity', 'flacc_cry', 'flacc_consolability'].forEach((field) => {
          if (data[field] !== null && data[field] !== undefined) {
            if (data[field] < 0 || data[field] > range.subscale_max) {
              errors.push({ field, message: `${field} must be between 0 and ${range.subscale_max}` });
            }
          }
        });
        break;

      case 'PAINAD':
        ['painad_breathing', 'painad_negative_vocalization', 'painad_facial_expression', 'painad_body_language', 'painad_consolability'].forEach((field) => {
          if (data[field] !== null && data[field] !== undefined) {
            if (data[field] < 0 || data[field] > range.subscale_max) {
              errors.push({ field, message: `${field} must be between 0 and ${range.subscale_max}` });
            }
          }
        });
        break;

      case 'CPOT':
        ['cpot_facial_expression', 'cpot_body_movements', 'cpot_muscle_tension', 'cpot_ventilator_compliance'].forEach((field) => {
          if (data[field] !== null && data[field] !== undefined) {
            if (data[field] < 0 || data[field] > range.subscale_max) {
              errors.push({ field, message: `${field} must be between 0 and ${range.subscale_max}` });
            }
          }
        });
        break;
    }

    // Validate acceptable pain level
    if (data.acceptable_pain_level !== null && data.acceptable_pain_level !== undefined) {
      if (data.acceptable_pain_level < 0 || data.acceptable_pain_level > 10) {
        errors.push({ field: 'acceptable_pain_level', message: 'Acceptable pain level must be between 0 and 10' });
      }
    }

    // Validate post-intervention score
    if (data.post_intervention_score !== null && data.post_intervention_score !== undefined) {
      if (data.post_intervention_score < 0 || data.post_intervention_score > 10) {
        errors.push({ field: 'post_intervention_score', message: 'Post-intervention score must be between 0 and 10' });
      }
    }

    return errors;
  }

  /**
   * Calculate total score for behavioral scales
   */
  calculateTotalScores(data) {
    const result = { ...data };

    // Calculate FLACC total
    if (data.pain_scale_type === 'FLACC') {
      const flaccFields = ['flacc_face', 'flacc_legs', 'flacc_activity', 'flacc_cry', 'flacc_consolability'];
      const hasAnyFlacc = flaccFields.some((f) => data[f] !== null && data[f] !== undefined);
      if (hasAnyFlacc) {
        result.flacc_total_score = flaccFields.reduce((sum, field) => sum + (data[field] || 0), 0);
      }
    }

    // Calculate PAINAD total
    if (data.pain_scale_type === 'PAINAD') {
      const painadFields = ['painad_breathing', 'painad_negative_vocalization', 'painad_facial_expression', 'painad_body_language', 'painad_consolability'];
      const hasAnyPainad = painadFields.some((f) => data[f] !== null && data[f] !== undefined);
      if (hasAnyPainad) {
        result.painad_total_score = painadFields.reduce((sum, field) => sum + (data[field] || 0), 0);
      }
    }

    // Calculate CPOT total
    if (data.pain_scale_type === 'CPOT') {
      const cpotFields = ['cpot_facial_expression', 'cpot_body_movements', 'cpot_muscle_tension', 'cpot_ventilator_compliance'];
      const hasAnyCpot = cpotFields.some((f) => data[f] !== null && data[f] !== undefined);
      if (hasAnyCpot) {
        result.cpot_total_score = cpotFields.reduce((sum, field) => sum + (data[field] || 0), 0);
      }
    }

    // Calculate normalized pain score (0-10)
    let rawScore = null;
    switch (data.pain_scale_type) {
      case 'NRS':
        rawScore = data.nrs_score;
        break;
      case 'VAS':
        rawScore = data.vas_score;
        break;
      case 'WONG_BAKER':
        rawScore = data.wong_baker_score;
        break;
      case 'FLACC':
        rawScore = result.flacc_total_score;
        break;
      case 'PAINAD':
        rawScore = result.painad_total_score;
        break;
      case 'CPOT':
        rawScore = result.cpot_total_score;
        break;
    }

    result.normalized_pain_score = normalizeToTenScale(rawScore, data.pain_scale_type);

    return result;
  }

  /**
   * Get all pain assessments with optional filters
   * GET /pain-assessments
   */
  async index(request, reply) {
    try {
      const { patient_id, scale_type, limit = 50, offset = 0, from_date, to_date, requires_follow_up } = request.query;

      let conditions = [];

      if (patient_id) {
        conditions.push(eq(multi_scale_pain_assessments.patient_id, parseInt(patient_id)));
      }

      if (scale_type) {
        conditions.push(eq(multi_scale_pain_assessments.pain_scale_type, scale_type));
      }

      if (from_date) {
        conditions.push(gte(multi_scale_pain_assessments.assessment_timestamp, new Date(from_date)));
      }

      if (to_date) {
        conditions.push(lte(multi_scale_pain_assessments.assessment_timestamp, new Date(to_date)));
      }

      if (requires_follow_up === 'true') {
        conditions.push(eq(multi_scale_pain_assessments.requires_follow_up, true));
      }

      let query = db.select().from(multi_scale_pain_assessments);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const assessments = await query.orderBy(desc(multi_scale_pain_assessments.assessment_timestamp)).limit(parseInt(limit)).offset(parseInt(offset));

      // Get total count for pagination
      let countQuery = db.select({ count: sql`count(*)` }).from(multi_scale_pain_assessments);
      if (conditions.length > 0) {
        countQuery = countQuery.where(and(...conditions));
      }
      const countResult = await countQuery;
      const total = parseInt(countResult[0]?.count || 0);

      reply.code(200);
      return {
        status: 200,
        message: 'Pain assessments retrieved successfully',
        data: assessments,
        pagination: {
          total,
          limit: parseInt(limit),
          offset: parseInt(offset),
          totalPages: Math.ceil(total / parseInt(limit)),
        },
      };
    } catch (error) {
      logger.error('Error fetching pain assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Server error while fetching pain assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Get pain assessments for a specific patient
   * GET /patients/:patientId/pain-assessments
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { scale_type, limit = 50, offset = 0, from_date, to_date } = request.query;

      let conditions = [eq(multi_scale_pain_assessments.patient_id, parseInt(patientId))];

      if (scale_type) {
        conditions.push(eq(multi_scale_pain_assessments.pain_scale_type, scale_type));
      }

      if (from_date) {
        conditions.push(gte(multi_scale_pain_assessments.assessment_timestamp, new Date(from_date)));
      }

      if (to_date) {
        conditions.push(lte(multi_scale_pain_assessments.assessment_timestamp, new Date(to_date)));
      }

      const assessments = await db
        .select()
        .from(multi_scale_pain_assessments)
        .where(and(...conditions))
        .orderBy(desc(multi_scale_pain_assessments.assessment_timestamp))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        message: 'Patient pain assessments retrieved successfully',
        data: assessments,
        count: assessments.length,
        limit: parseInt(limit),
        offset: parseInt(offset),
      };
    } catch (error) {
      logger.error('Error fetching patient pain assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching patient pain assessments',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Get a single pain assessment by ID
   * GET /pain-assessments/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(multi_scale_pain_assessments)
        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Pain assessment not found',
        };
      }

      // Add pain intensity level interpretation
      const assessment = result[0];
      const intensityLevel = getPainIntensityLevel(assessment.normalized_pain_score);

      reply.code(200);
      return {
        status: 200,
        data: {
          ...assessment,
          pain_intensity: intensityLevel,
        },
      };
    } catch (error) {
      logger.error('Error fetching pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Server error while fetching pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Create a new pain assessment
   * POST /pain-assessments
   */
  async store(request, reply) {
    try {
      const patientId = request.params?.patientId || request.body?.patient_id;

      if (!patientId) {
        reply.code(400);
        return {
          status: 400,
          message: 'Validation failed',
          errors: [{ field: 'patient_id', message: 'Patient ID is required' }],
        };
      }

      const cleanedData = this.cleanAssessmentData(request.body);

      // Validate scale-specific scores
      const validationErrors = this.validateScaleScores(cleanedData);
      if (validationErrors.length > 0) {
        reply.code(400);
        return {
          status: 400,
          message: 'Validation failed',
          errors: validationErrors,
        };
      }

      // Calculate total scores for behavioral scales
      const calculatedData = this.calculateTotalScores(cleanedData);

      // Remove fields that shouldn't be set during creation
      delete calculatedData.id;
      delete calculatedData.signed_at;
      delete calculatedData.signed_by_id;
      delete calculatedData.amended;
      delete calculatedData.amendment_reason;
      delete calculatedData.amended_at;
      delete calculatedData.amended_by_id;

      const insertData = {
        ...calculatedData,
        patient_id: parseInt(patientId),
        assessment_timestamp: calculatedData.assessment_timestamp ? new Date(calculatedData.assessment_timestamp) : new Date(),
        assessed_by_id: calculatedData.assessed_by_id || request.user?.id,
        created_by_id: request.user?.id,
        updated_by_id: request.user?.id,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newAssessment = await db.insert(multi_scale_pain_assessments).values(insertData).returning();
      const assessment = newAssessment[0];

      await logAudit(request, 'CREATE', 'multi_scale_pain_assessments', assessment.id);

      // Get pain intensity for response
      const intensityLevel = getPainIntensityLevel(assessment.normalized_pain_score);

      reply.code(201);
      return {
        status: 201,
        message: 'Pain assessment created successfully',
        data: {
          ...assessment,
          pain_intensity: intensityLevel,
        },
      };
    } catch (error) {
      logger.error('Error creating pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Server error while creating pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Update a pain assessment
   * PATCH /pain-assessments/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(multi_scale_pain_assessments)
        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Pain assessment not found',
        };
      }

      // Don't allow updates to signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update signed pain assessment. Use amendment instead.',
        };
      }

      const cleanedData = this.cleanAssessmentData(request.body);

      // Merge with existing data for validation
      const mergedData = { ...existing[0], ...cleanedData };

      // Validate scale-specific scores
      const validationErrors = this.validateScaleScores(mergedData);
      if (validationErrors.length > 0) {
        reply.code(400);
        return {
          status: 400,
          message: 'Validation failed',
          errors: validationErrors,
        };
      }

      // Calculate total scores
      const calculatedData = this.calculateTotalScores(mergedData);

      // Remove fields that shouldn't be updated directly
      const {
        id: _,
        patient_id,
        created_by_id,
        createdAt,
        signed_at,
        signed_by_id,
        signature_id,
        amended,
        amendment_reason,
        amended_at,
        amended_by_id,
        ...updateData
      } = calculatedData;

      const result = await db
        .update(multi_scale_pain_assessments)
        .set({
          ...updateData,
          updated_by_id: request.user?.id,
          updatedAt: new Date(),
        })
        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'UPDATE', 'multi_scale_pain_assessments', result[0].id);

      const intensityLevel = getPainIntensityLevel(result[0].normalized_pain_score);

      reply.code(200);
      return {
        status: 200,
        message: 'Pain assessment updated successfully',
        data: {
          ...result[0],
          pain_intensity: intensityLevel,
        },
      };
    } catch (error) {
      logger.error('Error updating pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Server error while updating pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Delete a pain assessment
   * DELETE /pain-assessments/:id
   */
  async delete(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(multi_scale_pain_assessments)
        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Pain assessment not found',
        };
      }

      // Don't allow deletion of signed assessments
      if (existing[0].signed_at) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot delete signed pain assessment',
        };
      }

      await db.delete(multi_scale_pain_assessments).where(eq(multi_scale_pain_assessments.id, parseInt(id)));

      await logAudit(request, 'DELETE', 'multi_scale_pain_assessments', parseInt(id));

      reply.code(200);
      return {
        status: 200,
        message: 'Pain assessment deleted successfully',
      };
    } catch (error) {
      logger.error('Error deleting pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Sign a pain assessment (21 CFR Part 11 compliance)
   * POST /pain-assessments/:id/sign
   */
  async sign(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(multi_scale_pain_assessments)
        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Pain assessment not found',
        };
      }

      if (existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Pain assessment already signed',
        };
      }

      const result = await db
        .update(multi_scale_pain_assessments)
        .set({
          signed_at: new Date(),
          signed_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date(),
        })
        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'SIGN', 'multi_scale_pain_assessments', result[0].id);

      reply.code(200);
      return {
        status: 200,
        message: 'Pain assessment signed successfully',
        data: result[0],
      };
    } catch (error) {
      logger.error('Error signing pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Amend a signed pain assessment
   * POST /pain-assessments/:id/amend
   */
  async amend(request, reply) {
    try {
      const { id } = request.params;
      const { amendment_reason, ...updateData } = request.body;

      if (!amendment_reason) {
        reply.code(400);
        return {
          status: 400,
          message: 'Amendment reason is required',
        };
      }

      const existing = await db
        .select()
        .from(multi_scale_pain_assessments)
        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Pain assessment not found',
        };
      }

      if (!existing[0].signed_at) {
        reply.code(400);
        return {
          status: 400,
          message: 'Cannot amend unsigned pain assessment. Use update instead.',
        };
      }

      const cleanedData = this.cleanAssessmentData(updateData);
      const mergedData = { ...existing[0], ...cleanedData };
      const calculatedData = this.calculateTotalScores(mergedData);

      // Only update allowed fields
      const { nrs_score, vas_score, wong_baker_score, wong_baker_face_selected, flacc_face, flacc_legs, flacc_activity, flacc_cry, flacc_consolability, flacc_total_score, painad_breathing, painad_negative_vocalization, painad_facial_expression, painad_body_language, painad_consolability, painad_total_score, cpot_facial_expression, cpot_body_movements, cpot_muscle_tension, cpot_ventilator_compliance, cpot_total_score, normalized_pain_score, pain_location_primary, pain_location_secondary, pain_quality, pain_radiation, additional_notes, post_intervention_score, intervention_effective } = calculatedData;

      const result = await db
        .update(multi_scale_pain_assessments)
        .set({
          nrs_score,
          vas_score,
          wong_baker_score,
          wong_baker_face_selected,
          flacc_face,
          flacc_legs,
          flacc_activity,
          flacc_cry,
          flacc_consolability,
          flacc_total_score,
          painad_breathing,
          painad_negative_vocalization,
          painad_facial_expression,
          painad_body_language,
          painad_consolability,
          painad_total_score,
          cpot_facial_expression,
          cpot_body_movements,
          cpot_muscle_tension,
          cpot_ventilator_compliance,
          cpot_total_score,
          normalized_pain_score,
          pain_location_primary,
          pain_location_secondary,
          pain_quality,
          pain_radiation,
          additional_notes,
          post_intervention_score,
          intervention_effective,
          amended: true,
          amendment_reason,
          amended_at: new Date(),
          amended_by_id: request.user?.id,
          updated_by_id: request.user?.id,
          updatedAt: new Date(),
        })
        .where(eq(multi_scale_pain_assessments.id, parseInt(id)))
        .returning();

      await logAudit(request, 'AMEND', 'multi_scale_pain_assessments', result[0].id, { amendment_reason });

      reply.code(200);
      return {
        status: 200,
        message: 'Pain assessment amended successfully',
        data: result[0],
      };
    } catch (error) {
      logger.error('Error amending pain assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error amending pain assessment',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Get pain assessment history/trend for a patient
   * GET /patients/:patientId/pain-assessments/trend
   */
  async getPatientTrend(request, reply) {
    try {
      const { patientId } = request.params;
      const { days = 30, scale_type, limit = 100 } = request.query;

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - parseInt(days));

      let conditions = [eq(multi_scale_pain_assessments.patient_id, parseInt(patientId)), gte(multi_scale_pain_assessments.assessment_timestamp, startDate)];

      if (scale_type) {
        conditions.push(eq(multi_scale_pain_assessments.pain_scale_type, scale_type));
      }

      const assessments = await db
        .select({
          id: multi_scale_pain_assessments.id,
          assessment_timestamp: multi_scale_pain_assessments.assessment_timestamp,
          pain_scale_type: multi_scale_pain_assessments.pain_scale_type,
          normalized_pain_score: multi_scale_pain_assessments.normalized_pain_score,
          nrs_score: multi_scale_pain_assessments.nrs_score,
          vas_score: multi_scale_pain_assessments.vas_score,
          wong_baker_score: multi_scale_pain_assessments.wong_baker_score,
          flacc_total_score: multi_scale_pain_assessments.flacc_total_score,
          painad_total_score: multi_scale_pain_assessments.painad_total_score,
          cpot_total_score: multi_scale_pain_assessments.cpot_total_score,
          pain_location_primary: multi_scale_pain_assessments.pain_location_primary,
          intervention_given: multi_scale_pain_assessments.intervention_given,
          post_intervention_score: multi_scale_pain_assessments.post_intervention_score,
          intervention_effective: multi_scale_pain_assessments.intervention_effective,
        })
        .from(multi_scale_pain_assessments)
        .where(and(...conditions))
        .orderBy(desc(multi_scale_pain_assessments.assessment_timestamp))
        .limit(parseInt(limit));

      // Calculate averages
      const avgResult = await db
        .select({
          avg_score: sql`avg(normalized_pain_score)`,
          max_score: sql`max(normalized_pain_score)`,
          min_score: sql`min(normalized_pain_score)`,
          count: sql`count(*)`,
          interventions_count: sql`sum(case when intervention_given then 1 else 0 end)`,
          effective_interventions: sql`sum(case when intervention_effective then 1 else 0 end)`,
        })
        .from(multi_scale_pain_assessments)
        .where(and(...conditions));

      reply.code(200);
      return {
        status: 200,
        data: {
          period_days: parseInt(days),
          assessments: assessments.reverse(), // Chronological order for charting
          count: assessments.length,
          statistics: {
            average_score: parseFloat(avgResult[0]?.avg_score) || null,
            max_score: parseInt(avgResult[0]?.max_score) || null,
            min_score: parseInt(avgResult[0]?.min_score) || null,
            total_assessments: parseInt(avgResult[0]?.count) || 0,
            interventions_given: parseInt(avgResult[0]?.interventions_count) || 0,
            effective_interventions: parseInt(avgResult[0]?.effective_interventions) || 0,
          },
        },
      };
    } catch (error) {
      logger.error('Error fetching pain assessment trend:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching pain assessment trend data',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Get reference information for pain scales
   * GET /pain-assessments/reference
   */
  async getReference(request, reply) {
    try {
      reply.code(200);
      return {
        status: 200,
        data: {
          scales: PAIN_SCALE_TYPES,
          ranges: PAIN_SCALE_RANGES,
          intensity_levels: {
            NONE: { min: 0, max: 0, label: 'No Pain' },
            MILD: { min: 1, max: 3, label: 'Mild Pain' },
            MODERATE: { min: 4, max: 6, label: 'Moderate Pain' },
            SEVERE: { min: 7, max: 10, label: 'Severe Pain' },
          },
          scale_descriptions: {
            NRS: {
              name: 'Numeric Rating Scale',
              description: 'Self-reported pain intensity from 0 (no pain) to 10 (worst pain imaginable)',
              use_case: 'Patients who can self-report',
              range: '0-10',
            },
            VAS: {
              name: 'Visual Analog Scale',
              description: '100mm line where patient marks their pain level',
              use_case: 'Research settings, detailed measurement',
              range: '0-100mm',
            },
            WONG_BAKER: {
              name: 'Wong-Baker FACES Pain Rating Scale',
              description: 'Pictorial scale with facial expressions',
              use_case: 'Pediatric patients, patients with communication barriers',
              range: '0-10',
            },
            FLACC: {
              name: 'Face, Legs, Activity, Cry, Consolability',
              description: 'Behavioral pain assessment for non-verbal patients',
              use_case: 'Pediatric, cognitively impaired, sedated patients',
              range: '0-10 (sum of 5 categories, 0-2 each)',
            },
            PAINAD: {
              name: 'Pain Assessment in Advanced Dementia',
              description: 'Behavioral scale for patients with dementia',
              use_case: 'Patients with advanced dementia who cannot self-report',
              range: '0-10 (sum of 5 categories, 0-2 each)',
            },
            CPOT: {
              name: 'Critical Care Pain Observation Tool',
              description: 'Behavioral scale for ICU patients',
              use_case: 'Intubated, sedated, or unconscious patients',
              range: '0-8 (sum of 4 categories, 0-2 each)',
            },
          },
        },
      };
    } catch (error) {
      logger.error('Error fetching pain assessment reference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching pain assessment reference',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }
}

// Create controller instance
const controller = new MultiScalePainAssessmentController();

// Export instance methods for routes (bound to controller instance)
export const index = controller.index.bind(controller);
export const show = controller.show.bind(controller);
export const store = controller.store.bind(controller);
export const update = controller.update.bind(controller);

// Export controller instance for new routes
export default controller;
