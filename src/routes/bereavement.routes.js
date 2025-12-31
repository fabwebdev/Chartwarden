import controller from '../controllers/Bereavement.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Bereavement Routes
 * Module K - MEDIUM Priority
 *
 * Purpose: 13-month bereavement requirement, grief support services
 * Compliance: CMS requires hospices to provide bereavement services for 13 months after patient death
 *
 * Endpoints:
 * - Bereavement case management (4 endpoints)
 * - Contact management (2 endpoints)
 * - Care plan development (2 endpoints)
 * - Encounter documentation (2 endpoints)
 * - Risk assessments (2 endpoints)
 * - Support group management (4 endpoints)
 * Total: 16 endpoints (exceeds spec of 14)
 */
export default async function bereavementRoutes(fastify, options) {
  // ============================================================================
  // BEREAVEMENT CASES ROUTES
  // ============================================================================

  // Get all bereavement cases
  fastify.get('/bereavement/cases', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAllCases);

  // Create bereavement case
  fastify.post('/bereavement/cases', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createCase);

  // Get bereavement case by ID
  fastify.get('/bereavement/cases/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCaseById);

  // Update bereavement case
  fastify.patch('/bereavement/cases/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateCase);

  // ============================================================================
  // BEREAVEMENT CONTACTS ROUTES
  // ============================================================================

  // Get contacts for a bereavement case
  fastify.get('/bereavement/cases/:id/contacts', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCaseContacts);

  // Add contact to bereavement case
  fastify.post('/bereavement/cases/:id/contacts', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.addContact);

  // ============================================================================
  // BEREAVEMENT PLANS ROUTES
  // ============================================================================

  // Get bereavement plans for a case
  fastify.get('/bereavement/cases/:id/plans', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCasePlans);

  // Create bereavement plan
  fastify.post('/bereavement/cases/:id/plans', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createPlan);

  // ============================================================================
  // BEREAVEMENT ENCOUNTERS ROUTES
  // ============================================================================

  // Get encounters for a bereavement case
  fastify.get('/bereavement/cases/:id/encounters', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCaseEncounters);

  // Create bereavement encounter
  fastify.post('/bereavement/cases/:id/encounters', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createEncounter);

  // ============================================================================
  // RISK ASSESSMENTS ROUTES
  // ============================================================================

  // Get risk assessments for a case
  fastify.get('/bereavement/cases/:id/risk-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCaseRiskAssessments);

  // Create risk assessment
  fastify.post('/bereavement/cases/:id/risk-assessments', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createRiskAssessment);

  // ============================================================================
  // SUPPORT GROUPS ROUTES
  // ============================================================================

  // Get all support groups
  fastify.get('/bereavement/support-groups', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAllSupportGroups);

  // Create support group
  fastify.post('/bereavement/support-groups', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createSupportGroup);

  // Get support group sessions
  fastify.get('/bereavement/support-groups/:id/sessions', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getSupportGroupSessions);

  // Create support group session
  fastify.post('/bereavement/support-groups/:id/sessions', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createSupportGroupSession);
}
