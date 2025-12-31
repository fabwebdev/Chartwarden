import controller from '../controllers/Staff.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Staff Management Routes
 * Module H - MEDIUM Priority
 *
 * Purpose: Employee tracking, credential expiration alerts, caseload management
 * Compliance: State licensing requirements, HIPAA workforce security
 *
 * Endpoints:
 * - Staff profile management (4 endpoints)
 * - Credential tracking (3 endpoints)
 * - Caseload management (2 endpoints)
 * - Schedule management (2 endpoints)
 * - Productivity tracking (2 endpoints)
 * - Training management (2 endpoints)
 * Total: 15 endpoints
 */
export default async function staffRoutes(fastify, options) {
  // ============================================================================
  // STAFF PROFILE ROUTES
  // ============================================================================

  // Get all staff
  fastify.get('/staff', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]
  }, controller.getAllStaff);

  // Create staff profile
  fastify.post('/staff', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_USER)]
  }, controller.createStaff);

  // Get staff by ID
  fastify.get('/staff/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]
  }, controller.getStaffById);

  // Update staff profile
  fastify.patch('/staff/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]
  }, controller.updateStaff);

  // ============================================================================
  // CREDENTIAL ROUTES
  // ============================================================================

  // Get staff credentials
  fastify.get('/staff/:id/credentials', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]
  }, controller.getStaffCredentials);

  // Add credential to staff
  fastify.post('/staff/:id/credentials', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]
  }, controller.addCredential);

  // Get expiring credentials (all staff)
  fastify.get('/staff/credentials/expiring', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]
  }, controller.getExpiringCredentials);

  // ============================================================================
  // CASELOAD ROUTES
  // ============================================================================

  // Get staff caseload
  fastify.get('/staff/:id/caseload', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT)]
  }, controller.getStaffCaseload);

  // Assign patient to staff
  fastify.post('/staff/:id/caseload', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_PATIENT)]
  }, controller.assignPatient);

  // ============================================================================
  // SCHEDULE ROUTES
  // ============================================================================

  // Get staff schedule
  fastify.get('/staff/:id/schedule', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]
  }, controller.getStaffSchedule);

  // Create schedule entry
  fastify.post('/staff/:id/schedule', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]
  }, controller.createSchedule);

  // ============================================================================
  // PRODUCTIVITY ROUTES
  // ============================================================================

  // Get staff productivity metrics
  fastify.get('/staff/:id/productivity', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]
  }, controller.getStaffProductivity);

  // Record productivity metrics
  fastify.post('/staff/:id/productivity', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]
  }, controller.recordProductivity);

  // ============================================================================
  // TRAINING ROUTES
  // ============================================================================

  // Get staff training records
  fastify.get('/staff/:id/training', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]
  }, controller.getStaffTraining);

  // Add training record
  fastify.post('/staff/:id/training', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]
  }, controller.addTraining);
}
