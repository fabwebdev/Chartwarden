import controller from '../controllers/Encounter.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Encounter Routes
 * Clinical encounter documentation - Required for billing
 */
export default async function encounterRoutes(fastify, options) {
  // Main encounter CRUD routes
  fastify.get('/encounters', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.index);

  fastify.post('/encounters', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.store);

  fastify.get('/encounters/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show);

  fastify.patch('/encounters/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update);

  fastify.delete('/encounters/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.destroy);

  // Signature routes
  fastify.post('/encounters/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign);

  fastify.post('/encounters/:id/cosign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.cosign);

  // Addendum and amendment routes
  fastify.post('/encounters/:id/addendum', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.addAddendum);

  fastify.post('/encounters/:id/amendments', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.addAmendment);

  // Query routes
  fastify.get('/encounters/unsigned', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getUnsigned);

  fastify.get('/encounters/by-discipline', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getByDiscipline);

  // Patient encounters
  fastify.get('/patients/:id/encounters', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientEncounters);
}
