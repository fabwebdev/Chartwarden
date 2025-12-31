import controller from '../controllers/CarePlan.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Care Plan Routes
 * Patient-centered care planning - Medicare requirement
 */
export default async function carePlanRoutes(fastify, options) {
  // Patient care plans
  fastify.get('/patients/:id/care-plans', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientCarePlans);

  fastify.post('/patients/:id/care-plans', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createCarePlan);

  // Care plan management
  fastify.get('/care-plans/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show);

  fastify.patch('/care-plans/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update);

  fastify.post('/care-plans/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign);

  fastify.post('/care-plans/:id/recertify', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.recertify);

  // Problems
  fastify.get('/patients/:id/problems', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientProblems);

  fastify.post('/patients/:id/problems', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createProblem);

  // Goals
  fastify.get('/patients/:id/goals', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientGoals);

  fastify.post('/patients/:id/goals', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createGoal);

  // Interventions
  fastify.get('/patients/:id/interventions', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientInterventions);

  fastify.post('/patients/:id/interventions', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createIntervention);
}
