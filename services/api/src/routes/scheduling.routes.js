import controller from '../controllers/Scheduling.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Scheduling Routes
 * Module J - MEDIUM Priority
 *
 * Purpose: Calendar management, GPS check-in/out, on-call rotations
 * Compliance: Visit frequency requirements, on-call coverage, timeliness tracking
 *
 * Endpoints:
 * - Scheduled visits management (9 endpoints)
 * - Recurring visit templates (4 endpoints)
 * - On-call schedule management (3 endpoints)
 * - On-call log tracking (2 endpoints)
 * - Visit compliance monitoring (3 endpoints)
 * - Staff availability (2 endpoints) - NEW
 * - Strict scheduling (1 endpoint) - NEW
 * - Scheduling conflict tracking (6 endpoints)
 * Total: 30 endpoints
 */
export default async function schedulingRoutes(fastify, options) {
  // ============================================================================
  // SCHEDULED VISITS ROUTES
  // ============================================================================

  // Get all visits with filters
  fastify.get('/visits', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAllVisits);

  // Create scheduled visit
  fastify.post('/visits', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createVisit);

  // Get visit by ID
  fastify.get('/visits/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getVisitById);

  // Update visit
  fastify.patch('/visits/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateVisit);

  // Check in to visit (GPS tracking)
  fastify.post('/visits/:id/checkin', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.checkIn);

  // Check out from visit (GPS tracking)
  fastify.post('/visits/:id/checkout', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.checkOut);

  // Cancel visit
  fastify.post('/visits/:id/cancel', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.cancelVisit);

  // Reschedule visit
  fastify.post('/visits/:id/reschedule', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.rescheduleVisit);

  // Confirm visit
  fastify.post('/visits/:id/confirm', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.confirmVisit);

  // ============================================================================
  // RECURRING VISITS ROUTES
  // ============================================================================

  // Get recurring visit templates
  fastify.get('/recurring-visits', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getRecurringVisits);

  // Create recurring visit template
  fastify.post('/recurring-visits', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createRecurringVisit);

  // Update recurring visit template
  fastify.patch('/recurring-visits/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateRecurringVisit);

  // Deactivate recurring visit
  fastify.post('/recurring-visits/:id/deactivate', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.deactivateRecurringVisit);

  // ============================================================================
  // ON-CALL SCHEDULE ROUTES
  // ============================================================================

  // Get on-call schedules
  fastify.get('/on-call', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]
  }, controller.getOnCallSchedules);

  // Create on-call schedule
  fastify.post('/on-call', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_USER)]
  }, controller.createOnCallSchedule);

  // Get current on-call staff
  fastify.get('/on-call/current', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_USERS)]
  }, controller.getCurrentOnCall);

  // ============================================================================
  // ON-CALL LOGS ROUTES
  // ============================================================================

  // Get on-call logs
  fastify.get('/on-call/logs', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getOnCallLogs);

  // Create on-call log entry
  fastify.post('/on-call/logs', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createOnCallLog);

  // ============================================================================
  // VISIT COMPLIANCE ROUTES
  // ============================================================================

  // Get visit compliance reports
  fastify.get('/compliance/visits', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getVisitCompliance);

  // Get non-compliant patients
  fastify.get('/compliance/visits/non-compliant', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getNonCompliantPatients);

  // Get overdue RN visits
  fastify.get('/compliance/visits/rn-overdue', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getOverdueRNVisits);

  // ============================================================================
  // STAFF AVAILABILITY ROUTES
  // ============================================================================

  // Get available time slots for a staff member
  fastify.get('/staff/:staff_id/available-slots', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAvailableSlots);

  // Check staff availability for a specific time range
  fastify.get('/staff/:staff_id/check-availability', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.checkStaffAvailability);

  // ============================================================================
  // STRICT SCHEDULING ROUTE
  // ============================================================================

  // Schedule a visit with strict conflict prevention (rejects if conflicts exist)
  fastify.post('/visits/schedule-strict', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.scheduleVisitStrict);

  // ============================================================================
  // SCHEDULING CONFLICTS ROUTES
  // ============================================================================

  // Get scheduling conflicts
  fastify.get('/conflicts', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getConflicts);

  // Detect conflicts for staff on a date
  fastify.get('/conflicts/detect', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.detectConflicts);

  // Get unresolved conflicts count
  fastify.get('/conflicts/unresolved-count', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getUnresolvedConflictsCount);

  // Create/record a conflict
  fastify.post('/conflicts', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createConflict);

  // Resolve a conflict
  fastify.post('/conflicts/:id/resolve', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.resolveConflict);

  // Acknowledge a conflict
  fastify.post('/conflicts/:id/acknowledge', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.acknowledgeConflict);
}
