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
 * - Contact management (5 endpoints - including grief assessment and consent)
 * - Care plan development (2 endpoints)
 * - Encounter documentation (2 endpoints)
 * - Risk assessments (2 endpoints)
 * - Support group management (4 endpoints)
 * - Follow-up tracking (4 endpoints)
 * - Resource management (3 endpoints)
 * - Memorial services (6 endpoints)
 * Total: 32 endpoints
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

  // ============================================================================
  // FOLLOW-UP TRACKING ROUTES
  // ============================================================================

  // Get follow-ups for a bereavement case
  fastify.get('/bereavement/cases/:id/follow-ups', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCaseFollowUps);

  // Create follow-up for a bereavement case
  fastify.post('/bereavement/cases/:id/follow-ups', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createFollowUp);

  // Generate standard follow-ups (1 week, 1 month, 3 months, 6 months, 1 year)
  fastify.post('/bereavement/cases/:id/follow-ups/generate', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.generateStandardFollowUps);

  // Update follow-up
  fastify.patch('/bereavement/follow-ups/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateFollowUp);

  // ============================================================================
  // RESOURCE TRACKING ROUTES
  // ============================================================================

  // Get resources for a bereavement case
  fastify.get('/bereavement/cases/:id/resources', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCaseResources);

  // Add resource to a bereavement case
  fastify.post('/bereavement/cases/:id/resources', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.addResource);

  // Update resource
  fastify.patch('/bereavement/resources/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateResource);

  // ============================================================================
  // MEMORIAL SERVICES ROUTES
  // ============================================================================

  // Get all memorial services
  fastify.get('/bereavement/memorial-services', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAllMemorialServices);

  // Create memorial service
  fastify.post('/bereavement/memorial-services', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createMemorialService);

  // Get memorial service by ID
  fastify.get('/bereavement/memorial-services/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getMemorialServiceById);

  // Update memorial service
  fastify.patch('/bereavement/memorial-services/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateMemorialService);

  // Get attendees for a memorial service
  fastify.get('/bereavement/memorial-services/:id/attendees', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getMemorialServiceAttendees);

  // Register attendee for a memorial service
  fastify.post('/bereavement/memorial-services/:id/attendees', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.registerMemorialServiceAttendee);

  // Update attendee registration
  fastify.patch('/bereavement/memorial-attendees/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateMemorialServiceAttendee);

  // ============================================================================
  // CONTACT MANAGEMENT ROUTES (Enhanced)
  // ============================================================================

  // Update contact information
  fastify.patch('/bereavement/contacts/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateContact);

  // Update contact grief assessment
  fastify.patch('/bereavement/contacts/:id/grief-assessment', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateContactGriefAssessment);

  // Update contact consent
  fastify.patch('/bereavement/contacts/:id/consent', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateContactConsent);
}
