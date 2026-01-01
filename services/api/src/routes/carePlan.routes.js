import controller from '../controllers/CarePlan.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Care Plan Routes
 * Patient-centered care planning - Medicare requirement
 *
 * Features:
 * - Full CRUD for care plans, problems, goals, and interventions
 * - Pagination and filtering support on list endpoints
 * - Goal tracking with milestones and progress updates
 * - Intervention monitoring with performance tracking
 * - Optimistic locking for concurrent update protection
 * - Soft deletes with active dependency protection
 */
export default async function carePlanRoutes(fastify, options) {
  // ============================================================================
  // CARE PLANS
  // ============================================================================

  // List all care plans (with pagination and filtering)
  fastify.get('/care-plans', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAllCarePlans);

  // Patient care plans (with pagination and filtering)
  fastify.get('/patients/:id/care-plans', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientCarePlans);

  fastify.post('/patients/:id/care-plans', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createCarePlan);

  // Care plan by ID (includes related problems, goals, interventions)
  fastify.get('/care-plans/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show);

  // Update care plan (with optimistic locking via version field)
  fastify.patch('/care-plans/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update);

  // Delete/archive care plan (protected: cannot delete with active interventions)
  fastify.delete('/care-plans/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.delete);

  // Sign care plan (21 CFR Part 11 compliance)
  fastify.post('/care-plans/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign);

  // Recertify care plan (Medicare recertification)
  fastify.post('/care-plans/:id/recertify', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.recertify);

  // ============================================================================
  // PROBLEMS
  // ============================================================================

  // Patient problems (with pagination and filtering)
  fastify.get('/patients/:id/problems', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientProblems);

  // Get problem by ID (includes related goals and interventions)
  fastify.get('/problems/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getProblemById);

  fastify.post('/patients/:id/problems', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createProblem);

  fastify.patch('/problems/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateProblem);

  // Delete problem (soft delete - protected: cannot delete with active goals)
  fastify.delete('/problems/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.deleteProblem);

  // Resolve problem
  fastify.post('/problems/:id/resolve', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.resolveProblem);

  // ============================================================================
  // GOALS
  // ============================================================================

  // Patient goals (with pagination and filtering)
  fastify.get('/patients/:id/goals', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientGoals);

  // Get goal by ID (includes related interventions and problem)
  fastify.get('/goals/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getGoalById);

  fastify.post('/patients/:id/goals', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createGoal);

  fastify.patch('/goals/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateGoal);

  // Delete goal (soft delete - protected: cannot delete with active interventions)
  fastify.delete('/goals/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.deleteGoal);

  // Update goal progress
  fastify.post('/goals/:id/progress', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateGoalProgress);

  // Discontinue goal (with status transition validation)
  fastify.post('/goals/:id/discontinue', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.discontinueGoal);

  // Add milestone to goal
  fastify.post('/goals/:id/milestones', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.addGoalMilestone);

  // ============================================================================
  // INTERVENTIONS
  // ============================================================================

  // Patient interventions (with pagination and filtering)
  fastify.get('/patients/:id/interventions', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientInterventions);

  // Get intervention by ID (includes related goal and problem)
  fastify.get('/interventions/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getInterventionById);

  fastify.post('/patients/:id/interventions', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createIntervention);

  fastify.patch('/interventions/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateIntervention);

  // Delete intervention (soft delete)
  fastify.delete('/interventions/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.deleteIntervention);

  // Record intervention performed
  fastify.post('/interventions/:id/performed', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.recordInterventionPerformed);

  // Discontinue intervention
  fastify.post('/interventions/:id/discontinue', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.discontinueIntervention);

  // ============================================================================
  // CARE PLAN TEMPLATES
  // ============================================================================

  fastify.get('/care-plan-templates', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getTemplates);

  fastify.post('/care-plan-templates', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createTemplate);
}
