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
  // MEDICATION ORDER ROUTES
  // ============================================================================

  // Get patient medications
  fastify.get('/patients/:id/medications', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientMedications);

  // Get single medication
  fastify.get('/patients/:id/medications/:medId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getMedication);

  // Get medication schedule for a patient
  fastify.get('/patients/:id/medications/schedule', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getMedicationSchedule);

  // Create medication order
  fastify.post('/patients/:id/medications', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_MEDICATIONS, PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createMedication);

  // Update medication order
  fastify.put('/patients/:id/medications/:medId', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_MEDICATIONS, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateMedication);

  // Cancel medication order
  fastify.delete('/patients/:id/medications/:medId', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_MEDICATIONS, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.cancelMedication);

  // Check drug interactions and allergy conflicts
  fastify.post('/patients/:id/medications/check-interactions', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.checkInteractions);

  // Discontinue medication
  fastify.post('/patients/:id/medications/:medId/discontinue', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_MEDICATIONS, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.discontinueMedication);

  // Hold medication
  fastify.post('/patients/:id/medications/:medId/hold', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_MEDICATIONS, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.holdMedication);

  // Pause medication
  fastify.post('/patients/:id/medications/:medId/pause', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_MEDICATIONS, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.pauseMedication);

  // Resume medication
  fastify.post('/patients/:id/medications/:medId/resume', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_MEDICATIONS, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.resumeMedication);

  // ============================================================================
  // MAR (MEDICATION ADMINISTRATION RECORD) ROUTES
  // ============================================================================

  // Get patient MAR entries
  fastify.get('/patients/:id/mar', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientMAR);

  // Get single MAR entry
  fastify.get('/patients/:id/mar/:marId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getMAREntry);

  // Create MAR entry (record medication administration)
  fastify.post('/patients/:id/mar', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_MEDICATIONS, PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createMAREntry);

  // Update MAR entry
  fastify.put('/patients/:id/mar/:marId', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_MEDICATIONS, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateMAREntry);

  // ============================================================================
  // COMFORT KIT ROUTES
  // ============================================================================

  // Get patient comfort kit
  fastify.get('/patients/:id/comfort-kit', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientComfortKit);

  // Create comfort kit
  fastify.post('/patients/:id/comfort-kit', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_MEDICATIONS, PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createComfortKit);

  // Destroy comfort kit
  fastify.post('/patients/:id/comfort-kit/destroy', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_MEDICATIONS, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.destroyComfortKit);

  // ============================================================================
  // MEDICATION RECONCILIATION ROUTES
  // ============================================================================

  // Get medication reconciliation history
  fastify.get('/patients/:id/medication-reconciliation', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getMedicationReconciliationHistory);

  // Get single medication reconciliation
  fastify.get('/patients/:id/medication-reconciliation/:reconId', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getMedicationReconciliation);

  // Create medication reconciliation
  fastify.post('/patients/:id/medication-reconciliation', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_MEDICATIONS, PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createMedicationReconciliation);

  // Compare home medications with current orders
  fastify.post('/patients/:id/medication-reconciliation/compare', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.compareMedications);

  // ============================================================================
  // PATIENT ALLERGIES ROUTES
  // ============================================================================

  // Get patient allergies
  fastify.get('/patients/:id/allergies', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientAllergies);

  // Create patient allergy
  fastify.post('/patients/:id/allergies', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_MEDICATIONS, PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createPatientAllergy);

  // Update patient allergy
  fastify.put('/patients/:id/allergies/:allergyId', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_MEDICATIONS, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updatePatientAllergy);

  // Delete patient allergy
  fastify.delete('/patients/:id/allergies/:allergyId', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_MEDICATIONS, PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.deletePatientAllergy);

  // ============================================================================
  // CONTROLLED SUBSTANCE LOG ROUTES
  // ============================================================================

  // Get controlled substance log for patient
  fastify.get('/patients/:id/controlled-substances', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_MEDICATIONS, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getControlledSubstanceLog);
}
