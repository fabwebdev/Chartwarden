import controller from '../controllers/CapTracking.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Cap Tracking Routes
 * Medicare hospice cap amount tracking
 * CRITICAL: CMS compliance requirement
 */
export default async function capTrackingRoutes(fastify, options) {

  // Calculate cap for patient
  fastify.post('/billing/cap-tracking/calculate', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.calculateCap);

  // Get patient cap tracking
  fastify.get('/patients/:id/cap-tracking', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientCap);

  // Get patients approaching cap
  fastify.get('/billing/cap-tracking/approaching', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientsApproachingCap);

  // Get cap exceeded patients
  fastify.get('/billing/cap-tracking/exceeded', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCapExceededPatients);

  // Get cap utilization report
  fastify.get('/billing/cap-tracking/report', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getCapUtilizationReport);
}
