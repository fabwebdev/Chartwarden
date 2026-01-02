import NutritionAssessmentController from '../controllers/NutritionAssessment.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Nutrition Assessment Routes
 *
 * Comprehensive routes for nutrition assessment management including:
 * - CRUD operations for nutrition assessments
 * - Dietary intake record tracking
 * - Food preferences management
 * - Dietary restrictions/allergies
 * - Nutritional metrics and calculations
 * - Reference data endpoints
 */
async function nutritionAssessmentRoutes(fastify, options) {
  // =========================================
  // REFERENCE DATA ENDPOINTS (Read-only)
  // =========================================

  // Get nutrition problems types
  fastify.get('/nutrition/problems-types', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getProblemsTypes.bind(NutritionAssessmentController));

  // Get nutrition templates
  fastify.get('/nutrition/templates', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getTemplates.bind(NutritionAssessmentController));

  // Get meal types
  fastify.get('/nutrition/meal-types', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getMealTypes.bind(NutritionAssessmentController));

  // Get intake categories
  fastify.get('/nutrition/intake-categories', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getIntakeCategories.bind(NutritionAssessmentController));

  // Get food groups
  fastify.get('/nutrition/food-groups', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getFoodGroups.bind(NutritionAssessmentController));

  // Get appetite levels
  fastify.get('/nutrition/appetite-levels', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getAppetiteLevels.bind(NutritionAssessmentController));

  // =========================================
  // NUTRITION ASSESSMENT CRUD
  // =========================================

  // Get all assessments for a patient
  fastify.get('/patients/:patientId/nutrition-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getPatientAssessments.bind(NutritionAssessmentController));

  // Get a specific assessment
  fastify.get('/nutrition-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getAssessmentById.bind(NutritionAssessmentController));

  // Create a new assessment
  fastify.post('/patients/:patientId/nutrition-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_NUTRITION, PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.createAssessment.bind(NutritionAssessmentController));

  // Update an assessment
  fastify.put('/nutrition-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_NUTRITION, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.updateAssessment.bind(NutritionAssessmentController));

  // Delete an assessment
  fastify.delete('/nutrition-assessments/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_NUTRITION, PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.deleteAssessment.bind(NutritionAssessmentController));

  // =========================================
  // DIETARY INTAKE RECORDS
  // =========================================

  // Get intake records for a patient with filtering
  fastify.get('/patients/:patientId/nutrition/intake-records', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getPatientIntakeRecords.bind(NutritionAssessmentController));

  // Get a specific intake record
  fastify.get('/nutrition/intake-records/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getIntakeRecordById.bind(NutritionAssessmentController));

  // Create a new intake record
  fastify.post('/patients/:patientId/nutrition/intake-records', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_NUTRITION, PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.createIntakeRecord.bind(NutritionAssessmentController));

  // Update an intake record
  fastify.put('/nutrition/intake-records/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_NUTRITION, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.updateIntakeRecord.bind(NutritionAssessmentController));

  // Delete an intake record
  fastify.delete('/nutrition/intake-records/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_NUTRITION, PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.deleteIntakeRecord.bind(NutritionAssessmentController));

  // =========================================
  // FOOD PREFERENCES
  // =========================================

  // Get food preferences for a patient
  fastify.get('/patients/:patientId/nutrition/food-preferences', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getPatientFoodPreferences.bind(NutritionAssessmentController));

  // Create a new food preference
  fastify.post('/patients/:patientId/nutrition/food-preferences', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_NUTRITION, PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.createFoodPreference.bind(NutritionAssessmentController));

  // Update a food preference
  fastify.put('/nutrition/food-preferences/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_NUTRITION, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.updateFoodPreference.bind(NutritionAssessmentController));

  // Delete (deactivate) a food preference
  fastify.delete('/nutrition/food-preferences/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_NUTRITION, PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.deleteFoodPreference.bind(NutritionAssessmentController));

  // =========================================
  // DIETARY RESTRICTIONS
  // =========================================

  // Get dietary restrictions for a patient
  fastify.get('/patients/:patientId/nutrition/dietary-restrictions', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getPatientDietaryRestrictions.bind(NutritionAssessmentController));

  // Create a new dietary restriction
  fastify.post('/patients/:patientId/nutrition/dietary-restrictions', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_NUTRITION, PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.createDietaryRestriction.bind(NutritionAssessmentController));

  // Update a dietary restriction
  fastify.put('/nutrition/dietary-restrictions/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_NUTRITION, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.updateDietaryRestriction.bind(NutritionAssessmentController));

  // Delete (deactivate) a dietary restriction
  fastify.delete('/nutrition/dietary-restrictions/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_NUTRITION, PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, NutritionAssessmentController.deleteDietaryRestriction.bind(NutritionAssessmentController));

  // =========================================
  // NUTRITIONAL METRICS & CALCULATIONS
  // =========================================

  // Get nutritional metrics for a patient (date range aggregations)
  fastify.get('/patients/:patientId/nutrition/metrics', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getPatientNutritionMetrics.bind(NutritionAssessmentController));

  // Get goals comparison (actual vs target intake)
  fastify.get('/patients/:patientId/nutrition/goals-comparison', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getGoalsComparison.bind(NutritionAssessmentController));

  // =========================================
  // COMPREHENSIVE SUMMARY
  // =========================================

  // Get complete nutrition summary for a patient
  fastify.get('/patients/:patientId/nutrition/summary', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_NUTRITION, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, NutritionAssessmentController.getPatientNutritionSummary.bind(NutritionAssessmentController));
}

export default nutritionAssessmentRoutes;
