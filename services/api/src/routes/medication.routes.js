import controller from '../controllers/Medication.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Medication Routes
 * Medication management, MAR, comfort kits, and controlled substances
 * CRITICAL: Clinical necessity and regulatory compliance
 */
export default async function medicationRoutes(fastify, options) {
  // ============================================================================
  // MEDICATION ROUTES
  // ============================================================================

  // Get patient medications
  fastify.get('/patients/:id/medications', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientMedications);

  // Create medication
  fastify.post('/patients/:id/medications', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createMedication);

  // Discontinue medication
  fastify.post('/patients/:id/medications/:medId/discontinue', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.discontinueMedication);

  // Hold medication
  fastify.post('/patients/:id/medications/:medId/hold', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.holdMedication);

  // Pause medication
  fastify.post('/patients/:id/medications/:medId/pause', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.pauseMedication);

  // Resume medication
  fastify.post('/patients/:id/medications/:medId/resume', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.resumeMedication);

  // ============================================================================
  // MAR (MEDICATION ADMINISTRATION RECORD) ROUTES
  // ============================================================================

  // Get patient MAR entries
  fastify.get('/patients/:id/mar', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientMAR);

  // Create MAR entry
  fastify.post('/patients/:id/mar', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createMAREntry);

  // ============================================================================
  // COMFORT KIT ROUTES
  // ============================================================================

  // Get patient comfort kit
  fastify.get('/patients/:id/comfort-kit', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientComfortKit);

  // Create comfort kit
  fastify.post('/patients/:id/comfort-kit', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createComfortKit);

  // Destroy comfort kit
  fastify.post('/patients/:id/comfort-kit/destroy', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.destroyComfortKit);

  // ============================================================================
  // MEDICATION RECONCILIATION ROUTES
  // ============================================================================

  // Create medication reconciliation
  fastify.post('/patients/:id/medication-reconciliation', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createMedicationReconciliation);
}
