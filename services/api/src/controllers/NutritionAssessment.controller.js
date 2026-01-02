import { db } from '../config/db.drizzle.js';
import {
  nutrition_assessment,
  nutrition_intake_records,
  nutrition_food_preferences,
  nutrition_dietary_restrictions,
  nutrition_problems_type,
  nutrition_template,
  patients,
  MEAL_TYPES,
  INTAKE_CATEGORIES,
  PORTION_CONSUMED,
  APPETITE_LEVELS,
  PREFERENCE_TYPES,
  RESTRICTION_TYPES,
  FOOD_GROUPS
} from '../db/schemas/index.js';
import { eq, and, or, desc, asc, gte, lte, count, sql, isNull, between, ilike } from 'drizzle-orm';
import { logger } from '../utils/logger.js';
import AuditService from '../services/AuditService.js';

/**
 * Nutrition Assessment Controller
 *
 * Comprehensive controller for managing nutrition assessments and dietary tracking
 * for hospice patients. Supports CRUD operations for assessments, intake records,
 * food preferences, dietary restrictions, and nutritional metrics calculation.
 */
class NutritionAssessmentController {

  // =========================================
  // VALIDATION HELPERS
  // =========================================

  /**
   * Validate nutrition assessment data
   */
  validateAssessmentData(data) {
    const errors = [];

    if (!data.patient_id) {
      errors.push('Patient ID is required');
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate intake record data
   */
  validateIntakeRecordData(data) {
    const errors = [];

    if (!data.patient_id) {
      errors.push('Patient ID is required');
    }

    if (!data.meal_type) {
      errors.push('Meal type is required');
    } else if (!Object.values(MEAL_TYPES).includes(data.meal_type)) {
      errors.push(`Invalid meal type. Must be one of: ${Object.values(MEAL_TYPES).join(', ')}`);
    }

    if (data.intake_category && !Object.values(INTAKE_CATEGORIES).includes(data.intake_category)) {
      errors.push(`Invalid intake category. Must be one of: ${Object.values(INTAKE_CATEGORIES).join(', ')}`);
    }

    if (data.portion_consumed_percent !== undefined) {
      const percent = Number(data.portion_consumed_percent);
      if (isNaN(percent) || percent < 0 || percent > 100) {
        errors.push('Portion consumed percent must be between 0 and 100');
      }
    }

    if (data.calories_estimated !== undefined) {
      const calories = Number(data.calories_estimated);
      if (isNaN(calories) || calories < 0) {
        errors.push('Calories must be a non-negative number');
      }
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate food preference data
   */
  validateFoodPreferenceData(data) {
    const errors = [];

    if (!data.patient_id) {
      errors.push('Patient ID is required');
    }

    if (!data.preference_type) {
      errors.push('Preference type is required');
    } else if (!Object.values(PREFERENCE_TYPES).includes(data.preference_type)) {
      errors.push(`Invalid preference type. Must be one of: ${Object.values(PREFERENCE_TYPES).join(', ')}`);
    }

    return { isValid: errors.length === 0, errors };
  }

  /**
   * Validate dietary restriction data
   */
  validateDietaryRestrictionData(data) {
    const errors = [];

    if (!data.patient_id) {
      errors.push('Patient ID is required');
    }

    if (!data.restriction_type) {
      errors.push('Restriction type is required');
    } else if (!Object.values(RESTRICTION_TYPES).includes(data.restriction_type)) {
      errors.push(`Invalid restriction type. Must be one of: ${Object.values(RESTRICTION_TYPES).join(', ')}`);
    }

    if (!data.food_item) {
      errors.push('Food item is required');
    }

    return { isValid: errors.length === 0, errors };
  }

  // =========================================
  // NUTRITION ASSESSMENT CRUD
  // =========================================

  /**
   * Get all nutrition assessments for a patient with pagination
   * GET /patients/:patientId/nutrition-assessments
   */
  async getPatientAssessments(request, reply) {
    try {
      const { patientId } = request.params;
      const { page = 1, limit = 10, sortBy = 'createdAt', sortOrder = 'desc' } = request.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Verify patient exists
      const patientExists = await db.select({ id: patients.id })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (patientExists.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Patient not found' };
      }

      // Get total count
      const countResult = await db.select({ count: sql`count(*)` })
        .from(nutrition_assessment)
        .where(eq(nutrition_assessment.patient_id, patientId));
      const total = Number(countResult[0].count);

      // Get assessments with pagination
      const orderColumn = sortOrder === 'asc' ? asc : desc;
      const assessments = await db.select()
        .from(nutrition_assessment)
        .where(eq(nutrition_assessment.patient_id, patientId))
        .orderBy(orderColumn(nutrition_assessment.createdAt))
        .limit(limitNum)
        .offset(offset);

      reply.code(200);
      return {
        status: 200,
        data: assessments,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      logger.error('Error fetching nutrition assessments:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Get a specific nutrition assessment by ID
   * GET /nutrition-assessments/:id
   */
  async getAssessmentById(request, reply) {
    try {
      const { id } = request.params;

      const assessment = await db.select()
        .from(nutrition_assessment)
        .where(eq(nutrition_assessment.id, id))
        .limit(1);

      if (assessment.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Nutrition assessment not found' };
      }

      reply.code(200);
      return { status: 200, data: assessment[0] };
    } catch (error) {
      logger.error('Error fetching nutrition assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new nutrition assessment
   * POST /patients/:patientId/nutrition-assessments
   */
  async createAssessment(request, reply) {
    try {
      const { patientId } = request.params;
      const data = { ...request.body, patient_id: patientId };

      // Validate input
      const validation = this.validateAssessmentData(data);
      if (!validation.isValid) {
        reply.code(400);
        return { status: 400, message: 'Validation failed', errors: validation.errors };
      }

      // Verify patient exists
      const patientExists = await db.select({ id: patients.id })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (patientExists.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Patient not found' };
      }

      const now = new Date();
      const nutritionProblemsTypeIdsString = Array.isArray(data.nutrition_problems_type_ids)
        ? data.nutrition_problems_type_ids.join(',')
        : (data.nutrition_problems_type_ids || '');

      const nutritionTemplateIdsString = Array.isArray(data.nutrition_template_ids)
        ? data.nutrition_template_ids.join(',')
        : (data.nutrition_template_ids || '');

      const result = await db.insert(nutrition_assessment)
        .values({
          patient_id: patientId,
          nutrition_problems_type_ids: nutritionProblemsTypeIdsString,
          nutrition_template_ids: nutritionTemplateIdsString,
          comments: data.comments,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      // Create audit log
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'CREATE',
          resource_type: 'nutrition_assessment',
          resource_id: String(result[0].id),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            patient_id: patientId,
            nutrition_problems_type_ids: nutritionProblemsTypeIdsString,
            nutrition_template_ids: nutritionTemplateIdsString
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for nutrition assessment creation:', auditError);
      }

      reply.code(201);
      return {
        status: 201,
        message: 'Nutrition assessment created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating nutrition assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Update a nutrition assessment
   * PUT /nutrition-assessments/:id
   */
  async updateAssessment(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if assessment exists
      const existing = await db.select()
        .from(nutrition_assessment)
        .where(eq(nutrition_assessment.id, id))
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Nutrition assessment not found' };
      }

      const now = new Date();
      const updateData = {
        updatedAt: now
      };

      if (data.nutrition_problems_type_ids !== undefined) {
        updateData.nutrition_problems_type_ids = Array.isArray(data.nutrition_problems_type_ids)
          ? data.nutrition_problems_type_ids.join(',')
          : data.nutrition_problems_type_ids;
      }

      if (data.nutrition_template_ids !== undefined) {
        updateData.nutrition_template_ids = Array.isArray(data.nutrition_template_ids)
          ? data.nutrition_template_ids.join(',')
          : data.nutrition_template_ids;
      }

      if (data.comments !== undefined) {
        updateData.comments = data.comments;
      }

      const result = await db.update(nutrition_assessment)
        .set(updateData)
        .where(eq(nutrition_assessment.id, id))
        .returning();

      // Create audit log
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'UPDATE',
          resource_type: 'nutrition_assessment',
          resource_id: String(id),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            updated_fields: Object.keys(updateData),
            previous_values: existing[0]
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for nutrition assessment update:', auditError);
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Nutrition assessment updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating nutrition assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Delete a nutrition assessment (soft delete)
   * DELETE /nutrition-assessments/:id
   */
  async deleteAssessment(request, reply) {
    try {
      const { id } = request.params;

      // Check if assessment exists
      const existing = await db.select()
        .from(nutrition_assessment)
        .where(eq(nutrition_assessment.id, id))
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Nutrition assessment not found' };
      }

      // For now, hard delete since schema doesn't have deleted_at
      await db.delete(nutrition_assessment)
        .where(eq(nutrition_assessment.id, id));

      // Create audit log
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'DELETE',
          resource_type: 'nutrition_assessment',
          resource_id: String(id),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            deleted_record: existing[0]
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for nutrition assessment deletion:', auditError);
      }

      reply.code(200);
      return { status: 200, message: 'Nutrition assessment deleted' };
    } catch (error) {
      logger.error('Error deleting nutrition assessment:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  // =========================================
  // DIETARY INTAKE RECORDS
  // =========================================

  /**
   * Get intake records for a patient with filtering
   * GET /patients/:patientId/nutrition/intake-records
   */
  async getPatientIntakeRecords(request, reply) {
    try {
      const { patientId } = request.params;
      const {
        page = 1,
        limit = 20,
        startDate,
        endDate,
        mealType,
        intakeCategory,
        sortOrder = 'desc'
      } = request.query;

      const pageNum = Math.max(1, parseInt(page));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit)));
      const offset = (pageNum - 1) * limitNum;

      // Build conditions
      const conditions = [eq(nutrition_intake_records.patient_id, patientId)];

      if (startDate) {
        conditions.push(gte(nutrition_intake_records.intake_datetime, new Date(startDate)));
      }

      if (endDate) {
        conditions.push(lte(nutrition_intake_records.intake_datetime, new Date(endDate)));
      }

      if (mealType) {
        conditions.push(eq(nutrition_intake_records.meal_type, mealType));
      }

      if (intakeCategory) {
        conditions.push(eq(nutrition_intake_records.intake_category, intakeCategory));
      }

      // Get total count
      const countResult = await db.select({ count: sql`count(*)` })
        .from(nutrition_intake_records)
        .where(and(...conditions));
      const total = Number(countResult[0].count);

      // Get records with pagination
      const orderFn = sortOrder === 'asc' ? asc : desc;
      const records = await db.select()
        .from(nutrition_intake_records)
        .where(and(...conditions))
        .orderBy(orderFn(nutrition_intake_records.intake_datetime))
        .limit(limitNum)
        .offset(offset);

      reply.code(200);
      return {
        status: 200,
        data: records,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      logger.error('Error fetching intake records:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Get a specific intake record
   * GET /nutrition/intake-records/:id
   */
  async getIntakeRecordById(request, reply) {
    try {
      const { id } = request.params;

      const record = await db.select()
        .from(nutrition_intake_records)
        .where(eq(nutrition_intake_records.id, id))
        .limit(1);

      if (record.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Intake record not found' };
      }

      reply.code(200);
      return { status: 200, data: record[0] };
    } catch (error) {
      logger.error('Error fetching intake record:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new intake record
   * POST /patients/:patientId/nutrition/intake-records
   */
  async createIntakeRecord(request, reply) {
    try {
      const { patientId } = request.params;
      const data = { ...request.body, patient_id: patientId };

      // Validate input
      const validation = this.validateIntakeRecordData(data);
      if (!validation.isValid) {
        reply.code(400);
        return { status: 400, message: 'Validation failed', errors: validation.errors };
      }

      const now = new Date();
      const result = await db.insert(nutrition_intake_records)
        .values({
          patient_id: patientId,
          encounter_id: data.encounter_id || null,
          note_id: data.note_id || null,
          intake_datetime: data.intake_datetime ? new Date(data.intake_datetime) : now,
          meal_type: data.meal_type,
          intake_category: data.intake_category || null,
          food_description: data.food_description || null,
          beverage_description: data.beverage_description || null,
          food_items_json: data.food_items_json ? JSON.stringify(data.food_items_json) : null,
          portion_offered: data.portion_offered || null,
          portion_consumed_percent: data.portion_consumed_percent ?? null,
          portion_consumed_description: data.portion_consumed_description || null,
          solid_food_consumed_percent: data.solid_food_consumed_percent ?? null,
          liquid_consumed_percent: data.liquid_consumed_percent ?? null,
          calories_estimated: data.calories_estimated ?? null,
          protein_grams: data.protein_grams ?? null,
          carbohydrates_grams: data.carbohydrates_grams ?? null,
          fat_grams: data.fat_grams ?? null,
          fiber_grams: data.fiber_grams ?? null,
          sugar_grams: data.sugar_grams ?? null,
          sodium_mg: data.sodium_mg ?? null,
          fluid_intake_ml: data.fluid_intake_ml ?? null,
          fluid_intake_oz: data.fluid_intake_oz ?? null,
          fluid_type: data.fluid_type || null,
          fluid_consistency: data.fluid_consistency || null,
          appetite_level: data.appetite_level || null,
          tolerated_well: data.tolerated_well ?? true,
          nausea_present: data.nausea_present ?? false,
          vomiting: data.vomiting ?? false,
          feeding_method: data.feeding_method || null,
          assistance_level: data.assistance_level || null,
          meal_refused: data.meal_refused ?? false,
          refusal_reason: data.refusal_reason || null,
          refusal_details: data.refusal_details || null,
          notes: data.notes || null,
          documented_by_id: request.user?.id || null,
          created_by_id: request.user?.id || null,
          updated_by_id: request.user?.id || null,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      // Create audit log
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'CREATE',
          resource_type: 'nutrition_intake_record',
          resource_id: String(result[0].id),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            patient_id: patientId,
            meal_type: data.meal_type,
            intake_datetime: data.intake_datetime
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for intake record creation:', auditError);
      }

      reply.code(201);
      return {
        status: 201,
        message: 'Intake record created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating intake record:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Update an intake record
   * PUT /nutrition/intake-records/:id
   */
  async updateIntakeRecord(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Check if record exists
      const existing = await db.select()
        .from(nutrition_intake_records)
        .where(eq(nutrition_intake_records.id, id))
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Intake record not found' };
      }

      const now = new Date();
      const updateData = {
        updated_by_id: request.user?.id || null,
        updatedAt: now
      };

      // Copy over provided fields
      const allowedFields = [
        'meal_type', 'intake_category', 'food_description', 'beverage_description',
        'portion_offered', 'portion_consumed_percent', 'portion_consumed_description',
        'solid_food_consumed_percent', 'liquid_consumed_percent', 'calories_estimated',
        'protein_grams', 'carbohydrates_grams', 'fat_grams', 'fiber_grams', 'sugar_grams',
        'sodium_mg', 'fluid_intake_ml', 'fluid_intake_oz', 'fluid_type', 'fluid_consistency',
        'appetite_level', 'tolerated_well', 'nausea_present', 'vomiting', 'feeding_method',
        'assistance_level', 'meal_refused', 'refusal_reason', 'refusal_details', 'notes'
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }

      if (data.intake_datetime) {
        updateData.intake_datetime = new Date(data.intake_datetime);
      }

      if (data.food_items_json) {
        updateData.food_items_json = JSON.stringify(data.food_items_json);
      }

      const result = await db.update(nutrition_intake_records)
        .set(updateData)
        .where(eq(nutrition_intake_records.id, id))
        .returning();

      // Create audit log
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'UPDATE',
          resource_type: 'nutrition_intake_record',
          resource_id: String(id),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            updated_fields: Object.keys(updateData)
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for intake record update:', auditError);
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Intake record updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating intake record:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Delete an intake record
   * DELETE /nutrition/intake-records/:id
   */
  async deleteIntakeRecord(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db.select()
        .from(nutrition_intake_records)
        .where(eq(nutrition_intake_records.id, id))
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Intake record not found' };
      }

      await db.delete(nutrition_intake_records)
        .where(eq(nutrition_intake_records.id, id));

      // Create audit log
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'DELETE',
          resource_type: 'nutrition_intake_record',
          resource_id: String(id),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            deleted_record: existing[0]
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for intake record deletion:', auditError);
      }

      reply.code(200);
      return { status: 200, message: 'Intake record deleted' };
    } catch (error) {
      logger.error('Error deleting intake record:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  // =========================================
  // FOOD PREFERENCES
  // =========================================

  /**
   * Get food preferences for a patient
   * GET /patients/:patientId/nutrition/food-preferences
   */
  async getPatientFoodPreferences(request, reply) {
    try {
      const { patientId } = request.params;
      const { preferenceType, activeOnly = 'true' } = request.query;

      const conditions = [eq(nutrition_food_preferences.patient_id, patientId)];

      if (activeOnly === 'true') {
        conditions.push(eq(nutrition_food_preferences.is_active, true));
      }

      if (preferenceType) {
        conditions.push(eq(nutrition_food_preferences.preference_type, preferenceType));
      }

      const preferences = await db.select()
        .from(nutrition_food_preferences)
        .where(and(...conditions))
        .orderBy(desc(nutrition_food_preferences.createdAt));

      reply.code(200);
      return { status: 200, data: preferences };
    } catch (error) {
      logger.error('Error fetching food preferences:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Create a food preference
   * POST /patients/:patientId/nutrition/food-preferences
   */
  async createFoodPreference(request, reply) {
    try {
      const { patientId } = request.params;
      const data = { ...request.body, patient_id: patientId };

      const validation = this.validateFoodPreferenceData(data);
      if (!validation.isValid) {
        reply.code(400);
        return { status: 400, message: 'Validation failed', errors: validation.errors };
      }

      const now = new Date();
      const result = await db.insert(nutrition_food_preferences)
        .values({
          patient_id: patientId,
          preference_type: data.preference_type,
          preference_category: data.preference_category || null,
          food_item: data.food_item || null,
          food_group: data.food_group || null,
          description: data.description || null,
          preference_strength: data.preference_strength || null,
          priority_level: data.priority_level ?? 1,
          is_mandatory: data.is_mandatory ?? false,
          cultural_background: data.cultural_background || null,
          religious_requirement: data.religious_requirement || null,
          dietary_philosophy: data.dietary_philosophy || null,
          texture_preference: data.texture_preference || null,
          temperature_preference: data.temperature_preference || null,
          seasoning_preference: data.seasoning_preference || null,
          portion_size_preference: data.portion_size_preference || null,
          is_active: data.is_active ?? true,
          effective_date: data.effective_date ? new Date(data.effective_date) : now,
          source_of_information: data.source_of_information || null,
          reported_by: data.reported_by || null,
          notes: data.notes || null,
          created_by_id: request.user?.id || null,
          updated_by_id: request.user?.id || null,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Food preference created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating food preference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Update a food preference
   * PUT /nutrition/food-preferences/:id
   */
  async updateFoodPreference(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const existing = await db.select()
        .from(nutrition_food_preferences)
        .where(eq(nutrition_food_preferences.id, id))
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Food preference not found' };
      }

      const now = new Date();
      const updateData = {
        updated_by_id: request.user?.id || null,
        updatedAt: now
      };

      const allowedFields = [
        'preference_type', 'preference_category', 'food_item', 'food_group',
        'description', 'preference_strength', 'priority_level', 'is_mandatory',
        'cultural_background', 'religious_requirement', 'dietary_philosophy',
        'texture_preference', 'temperature_preference', 'seasoning_preference',
        'portion_size_preference', 'is_active', 'source_of_information',
        'reported_by', 'notes'
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }

      if (data.effective_date) {
        updateData.effective_date = new Date(data.effective_date);
      }

      const result = await db.update(nutrition_food_preferences)
        .set(updateData)
        .where(eq(nutrition_food_preferences.id, id))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Food preference updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating food preference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Delete (deactivate) a food preference
   * DELETE /nutrition/food-preferences/:id
   */
  async deleteFoodPreference(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db.select()
        .from(nutrition_food_preferences)
        .where(eq(nutrition_food_preferences.id, id))
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Food preference not found' };
      }

      // Soft delete by setting is_active to false
      await db.update(nutrition_food_preferences)
        .set({
          is_active: false,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(nutrition_food_preferences.id, id));

      reply.code(200);
      return { status: 200, message: 'Food preference deactivated' };
    } catch (error) {
      logger.error('Error deleting food preference:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  // =========================================
  // DIETARY RESTRICTIONS
  // =========================================

  /**
   * Get dietary restrictions for a patient
   * GET /patients/:patientId/nutrition/dietary-restrictions
   */
  async getPatientDietaryRestrictions(request, reply) {
    try {
      const { patientId } = request.params;
      const { restrictionType, activeOnly = 'true', severity } = request.query;

      const conditions = [eq(nutrition_dietary_restrictions.patient_id, patientId)];

      if (activeOnly === 'true') {
        conditions.push(eq(nutrition_dietary_restrictions.is_active, true));
      }

      if (restrictionType) {
        conditions.push(eq(nutrition_dietary_restrictions.restriction_type, restrictionType));
      }

      if (severity) {
        conditions.push(eq(nutrition_dietary_restrictions.severity, severity));
      }

      const restrictions = await db.select()
        .from(nutrition_dietary_restrictions)
        .where(and(...conditions))
        .orderBy(desc(nutrition_dietary_restrictions.createdAt));

      reply.code(200);
      return { status: 200, data: restrictions };
    } catch (error) {
      logger.error('Error fetching dietary restrictions:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Create a dietary restriction
   * POST /patients/:patientId/nutrition/dietary-restrictions
   */
  async createDietaryRestriction(request, reply) {
    try {
      const { patientId } = request.params;
      const data = { ...request.body, patient_id: patientId };

      const validation = this.validateDietaryRestrictionData(data);
      if (!validation.isValid) {
        reply.code(400);
        return { status: 400, message: 'Validation failed', errors: validation.errors };
      }

      const now = new Date();
      const result = await db.insert(nutrition_dietary_restrictions)
        .values({
          patient_id: patientId,
          restriction_type: data.restriction_type,
          restriction_category: data.restriction_category || null,
          food_item: data.food_item,
          food_group: data.food_group || null,
          allergen_code: data.allergen_code || null,
          severity: data.severity || null,
          reaction_type: data.reaction_type || null,
          reaction_description: data.reaction_description || null,
          is_permanent: data.is_permanent ?? true,
          is_active: data.is_active ?? true,
          effective_date: data.effective_date ? new Date(data.effective_date) : now,
          expiration_date: data.expiration_date ? new Date(data.expiration_date) : null,
          diagnosed_by: data.diagnosed_by || null,
          diagnosis_date: data.diagnosis_date ? new Date(data.diagnosis_date) : null,
          verification_method: data.verification_method || null,
          medical_condition_related: data.medical_condition_related || null,
          icd10_code: data.icd10_code || null,
          avoidance_instructions: data.avoidance_instructions || null,
          cross_contamination_risk: data.cross_contamination_risk ?? false,
          safe_alternatives: data.safe_alternatives || null,
          emergency_treatment: data.emergency_treatment || null,
          epipen_available: data.epipen_available ?? false,
          epipen_location: data.epipen_location || null,
          notify_on_admission: data.notify_on_admission ?? true,
          notify_dietary: data.notify_dietary ?? true,
          display_on_chart: data.display_on_chart ?? true,
          source_of_information: data.source_of_information || null,
          verified: data.verified ?? false,
          notes: data.notes || null,
          created_by_id: request.user?.id || null,
          updated_by_id: request.user?.id || null,
          createdAt: now,
          updatedAt: now
        })
        .returning();

      // Create audit log for allergy/restriction creation (important for safety)
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'CREATE',
          resource_type: 'nutrition_dietary_restriction',
          resource_id: String(result[0].id),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            patient_id: patientId,
            restriction_type: data.restriction_type,
            food_item: data.food_item,
            severity: data.severity
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for dietary restriction creation:', auditError);
      }

      reply.code(201);
      return {
        status: 201,
        message: 'Dietary restriction created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating dietary restriction:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Update a dietary restriction
   * PUT /nutrition/dietary-restrictions/:id
   */
  async updateDietaryRestriction(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const existing = await db.select()
        .from(nutrition_dietary_restrictions)
        .where(eq(nutrition_dietary_restrictions.id, id))
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Dietary restriction not found' };
      }

      const now = new Date();
      const updateData = {
        updated_by_id: request.user?.id || null,
        updatedAt: now
      };

      const allowedFields = [
        'restriction_type', 'restriction_category', 'food_item', 'food_group',
        'allergen_code', 'severity', 'reaction_type', 'reaction_description',
        'is_permanent', 'is_active', 'diagnosed_by', 'verification_method',
        'medical_condition_related', 'icd10_code', 'avoidance_instructions',
        'cross_contamination_risk', 'safe_alternatives', 'emergency_treatment',
        'epipen_available', 'epipen_location', 'notify_on_admission',
        'notify_dietary', 'display_on_chart', 'source_of_information',
        'verified', 'notes'
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }

      if (data.effective_date) {
        updateData.effective_date = new Date(data.effective_date);
      }

      if (data.expiration_date) {
        updateData.expiration_date = new Date(data.expiration_date);
      }

      if (data.diagnosis_date) {
        updateData.diagnosis_date = new Date(data.diagnosis_date);
      }

      if (data.last_reaction_date) {
        updateData.last_reaction_date = new Date(data.last_reaction_date);
      }

      const result = await db.update(nutrition_dietary_restrictions)
        .set(updateData)
        .where(eq(nutrition_dietary_restrictions.id, id))
        .returning();

      // Audit log for restriction updates
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'UPDATE',
          resource_type: 'nutrition_dietary_restriction',
          resource_id: String(id),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            updated_fields: Object.keys(updateData),
            previous_severity: existing[0].severity,
            new_severity: data.severity
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for dietary restriction update:', auditError);
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Dietary restriction updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating dietary restriction:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Delete (deactivate) a dietary restriction
   * DELETE /nutrition/dietary-restrictions/:id
   */
  async deleteDietaryRestriction(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db.select()
        .from(nutrition_dietary_restrictions)
        .where(eq(nutrition_dietary_restrictions.id, id))
        .limit(1);

      if (existing.length === 0) {
        reply.code(404);
        return { status: 404, message: 'Dietary restriction not found' };
      }

      // Soft delete
      await db.update(nutrition_dietary_restrictions)
        .set({
          is_active: false,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(nutrition_dietary_restrictions.id, id));

      // Audit log
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'DELETE',
          resource_type: 'nutrition_dietary_restriction',
          resource_id: String(id),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            deactivated_restriction: {
              food_item: existing[0].food_item,
              restriction_type: existing[0].restriction_type,
              severity: existing[0].severity
            }
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for dietary restriction deletion:', auditError);
      }

      reply.code(200);
      return { status: 200, message: 'Dietary restriction deactivated' };
    } catch (error) {
      logger.error('Error deleting dietary restriction:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  // =========================================
  // NUTRITIONAL METRICS & CALCULATIONS
  // =========================================

  /**
   * Calculate and return nutritional metrics for a patient
   * GET /patients/:patientId/nutrition/metrics
   */
  async getPatientNutritionMetrics(request, reply) {
    try {
      const { patientId } = request.params;
      const { startDate, endDate, period = 'day' } = request.query;

      // Default to last 7 days if no date range specified
      const end = endDate ? new Date(endDate) : new Date();
      const start = startDate ? new Date(startDate) : new Date(end.getTime() - 7 * 24 * 60 * 60 * 1000);

      // Get all intake records in the date range
      const records = await db.select()
        .from(nutrition_intake_records)
        .where(and(
          eq(nutrition_intake_records.patient_id, patientId),
          gte(nutrition_intake_records.intake_datetime, start),
          lte(nutrition_intake_records.intake_datetime, end)
        ))
        .orderBy(asc(nutrition_intake_records.intake_datetime));

      // Calculate aggregated metrics
      const metrics = {
        period: { start: start.toISOString(), end: end.toISOString() },
        totalRecords: records.length,
        totals: {
          calories: 0,
          protein_grams: 0,
          carbohydrates_grams: 0,
          fat_grams: 0,
          fiber_grams: 0,
          sugar_grams: 0,
          sodium_mg: 0,
          fluid_ml: 0
        },
        averages: {
          calories_per_day: 0,
          protein_grams_per_day: 0,
          carbohydrates_grams_per_day: 0,
          fat_grams_per_day: 0,
          fluid_ml_per_day: 0
        },
        mealBreakdown: {},
        appetiteTrends: {},
        portionConsumption: {
          average_percent: 0,
          total_meals: 0,
          refused_meals: 0
        }
      };

      // Process records
      let totalPortionPercent = 0;
      let portionCount = 0;

      for (const record of records) {
        // Sum totals
        if (record.calories_estimated) metrics.totals.calories += Number(record.calories_estimated);
        if (record.protein_grams) metrics.totals.protein_grams += Number(record.protein_grams);
        if (record.carbohydrates_grams) metrics.totals.carbohydrates_grams += Number(record.carbohydrates_grams);
        if (record.fat_grams) metrics.totals.fat_grams += Number(record.fat_grams);
        if (record.fiber_grams) metrics.totals.fiber_grams += Number(record.fiber_grams);
        if (record.sugar_grams) metrics.totals.sugar_grams += Number(record.sugar_grams);
        if (record.sodium_mg) metrics.totals.sodium_mg += Number(record.sodium_mg);
        if (record.fluid_intake_ml) metrics.totals.fluid_ml += Number(record.fluid_intake_ml);

        // Meal breakdown
        const mealType = record.meal_type;
        if (!metrics.mealBreakdown[mealType]) {
          metrics.mealBreakdown[mealType] = { count: 0, calories: 0 };
        }
        metrics.mealBreakdown[mealType].count++;
        if (record.calories_estimated) {
          metrics.mealBreakdown[mealType].calories += Number(record.calories_estimated);
        }

        // Appetite trends
        if (record.appetite_level) {
          if (!metrics.appetiteTrends[record.appetite_level]) {
            metrics.appetiteTrends[record.appetite_level] = 0;
          }
          metrics.appetiteTrends[record.appetite_level]++;
        }

        // Portion consumption
        if (record.portion_consumed_percent !== null) {
          totalPortionPercent += Number(record.portion_consumed_percent);
          portionCount++;
        }

        if (record.meal_refused) {
          metrics.portionConsumption.refused_meals++;
        }
        metrics.portionConsumption.total_meals++;
      }

      // Calculate averages
      const daysDiff = Math.max(1, Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
      metrics.averages.calories_per_day = Math.round(metrics.totals.calories / daysDiff);
      metrics.averages.protein_grams_per_day = Math.round(metrics.totals.protein_grams / daysDiff * 10) / 10;
      metrics.averages.carbohydrates_grams_per_day = Math.round(metrics.totals.carbohydrates_grams / daysDiff * 10) / 10;
      metrics.averages.fat_grams_per_day = Math.round(metrics.totals.fat_grams / daysDiff * 10) / 10;
      metrics.averages.fluid_ml_per_day = Math.round(metrics.totals.fluid_ml / daysDiff);

      if (portionCount > 0) {
        metrics.portionConsumption.average_percent = Math.round(totalPortionPercent / portionCount);
      }

      // Round totals
      for (const key of Object.keys(metrics.totals)) {
        metrics.totals[key] = Math.round(metrics.totals[key] * 10) / 10;
      }

      reply.code(200);
      return { status: 200, data: metrics };
    } catch (error) {
      logger.error('Error calculating nutrition metrics:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Get dietary goals and compare with actual intake
   * GET /patients/:patientId/nutrition/goals-comparison
   */
  async getGoalsComparison(request, reply) {
    try {
      const { patientId } = request.params;
      const { date } = request.query;

      // Get the date range (single day or today)
      const targetDate = date ? new Date(date) : new Date();
      const startOfDay = new Date(targetDate);
      startOfDay.setHours(0, 0, 0, 0);
      const endOfDay = new Date(targetDate);
      endOfDay.setHours(23, 59, 59, 999);

      // Get intake records for the day
      const records = await db.select()
        .from(nutrition_intake_records)
        .where(and(
          eq(nutrition_intake_records.patient_id, patientId),
          gte(nutrition_intake_records.intake_datetime, startOfDay),
          lte(nutrition_intake_records.intake_datetime, endOfDay)
        ));

      // Calculate actual intake
      const actual = {
        calories: 0,
        protein_grams: 0,
        carbohydrates_grams: 0,
        fat_grams: 0,
        fluid_ml: 0
      };

      for (const record of records) {
        if (record.calories_estimated) actual.calories += Number(record.calories_estimated);
        if (record.protein_grams) actual.protein_grams += Number(record.protein_grams);
        if (record.carbohydrates_grams) actual.carbohydrates_grams += Number(record.carbohydrates_grams);
        if (record.fat_grams) actual.fat_grams += Number(record.fat_grams);
        if (record.fluid_intake_ml) actual.fluid_ml += Number(record.fluid_intake_ml);
      }

      // Default daily goals (could be customized per patient in future)
      const goals = {
        calories: 1800,
        protein_grams: 60,
        carbohydrates_grams: 225,
        fat_grams: 60,
        fluid_ml: 2000
      };

      // Calculate percentage of goal achieved
      const comparison = {
        date: targetDate.toISOString().split('T')[0],
        goals,
        actual: {
          calories: Math.round(actual.calories),
          protein_grams: Math.round(actual.protein_grams * 10) / 10,
          carbohydrates_grams: Math.round(actual.carbohydrates_grams * 10) / 10,
          fat_grams: Math.round(actual.fat_grams * 10) / 10,
          fluid_ml: Math.round(actual.fluid_ml)
        },
        percentOfGoal: {
          calories: Math.round((actual.calories / goals.calories) * 100),
          protein_grams: Math.round((actual.protein_grams / goals.protein_grams) * 100),
          carbohydrates_grams: Math.round((actual.carbohydrates_grams / goals.carbohydrates_grams) * 100),
          fat_grams: Math.round((actual.fat_grams / goals.fat_grams) * 100),
          fluid_ml: Math.round((actual.fluid_ml / goals.fluid_ml) * 100)
        },
        mealsLogged: records.length
      };

      reply.code(200);
      return { status: 200, data: comparison };
    } catch (error) {
      logger.error('Error calculating goals comparison:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  // =========================================
  // REFERENCE DATA
  // =========================================

  /**
   * Get nutrition problems types
   * GET /nutrition/problems-types
   */
  async getProblemsTypes(request, reply) {
    try {
      const types = await db.select()
        .from(nutrition_problems_type)
        .orderBy(asc(nutrition_problems_type.name));

      reply.code(200);
      return { status: 200, data: types };
    } catch (error) {
      logger.error('Error fetching nutrition problems types:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Get nutrition templates
   * GET /nutrition/templates
   */
  async getTemplates(request, reply) {
    try {
      const templates = await db.select()
        .from(nutrition_template)
        .orderBy(asc(nutrition_template.name));

      reply.code(200);
      return { status: 200, data: templates };
    } catch (error) {
      logger.error('Error fetching nutrition templates:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }

  /**
   * Get available meal types
   * GET /nutrition/meal-types
   */
  async getMealTypes(request, reply) {
    reply.code(200);
    return { status: 200, data: MEAL_TYPES };
  }

  /**
   * Get intake categories
   * GET /nutrition/intake-categories
   */
  async getIntakeCategories(request, reply) {
    reply.code(200);
    return { status: 200, data: INTAKE_CATEGORIES };
  }

  /**
   * Get food groups
   * GET /nutrition/food-groups
   */
  async getFoodGroups(request, reply) {
    reply.code(200);
    return { status: 200, data: FOOD_GROUPS };
  }

  /**
   * Get appetite levels
   * GET /nutrition/appetite-levels
   */
  async getAppetiteLevels(request, reply) {
    reply.code(200);
    return { status: 200, data: APPETITE_LEVELS };
  }

  /**
   * Get comprehensive nutrition summary for a patient
   * GET /patients/:patientId/nutrition/summary
   */
  async getPatientNutritionSummary(request, reply) {
    try {
      const { patientId } = request.params;

      // Fetch all related data in parallel
      const [
        assessments,
        recentIntake,
        preferences,
        restrictions
      ] = await Promise.all([
        db.select()
          .from(nutrition_assessment)
          .where(eq(nutrition_assessment.patient_id, patientId))
          .orderBy(desc(nutrition_assessment.createdAt))
          .limit(1),
        db.select()
          .from(nutrition_intake_records)
          .where(eq(nutrition_intake_records.patient_id, patientId))
          .orderBy(desc(nutrition_intake_records.intake_datetime))
          .limit(10),
        db.select()
          .from(nutrition_food_preferences)
          .where(and(
            eq(nutrition_food_preferences.patient_id, patientId),
            eq(nutrition_food_preferences.is_active, true)
          )),
        db.select()
          .from(nutrition_dietary_restrictions)
          .where(and(
            eq(nutrition_dietary_restrictions.patient_id, patientId),
            eq(nutrition_dietary_restrictions.is_active, true)
          ))
      ]);

      const summary = {
        currentAssessment: assessments[0] || null,
        recentIntakeRecords: recentIntake,
        activePreferences: preferences,
        activeRestrictions: restrictions,
        criticalAlerts: restrictions.filter(r =>
          r.severity === 'SEVERE' || r.severity === 'LIFE_THREATENING'
        ),
        statistics: {
          totalPreferences: preferences.length,
          totalRestrictions: restrictions.length,
          recentMealsLogged: recentIntake.length
        }
      };

      reply.code(200);
      return { status: 200, data: summary };
    } catch (error) {
      logger.error('Error fetching nutrition summary:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Internal server error',
        error: process.env.NODE_ENV !== 'production' ? error.message : undefined
      };
    }
  }
}

export default new NutritionAssessmentController();
