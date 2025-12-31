import controller from '../controllers/IDGMeeting.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * IDG Meeting Routes
 * Interdisciplinary Group team meetings - 14-day compliance requirement
 */
export default async function idgMeetingRoutes(fastify, options) {
  // Main IDG meeting routes
  fastify.get('/idg-meetings', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.index);

  fastify.post('/idg-meetings', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.store);

  fastify.get('/idg-meetings/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show);

  fastify.patch('/idg-meetings/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.update);

  // Meeting workflow
  fastify.post('/idg-meetings/:id/start', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.start);

  fastify.post('/idg-meetings/:id/complete', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.complete);

  // Attendee management
  fastify.get('/idg-meetings/:id/attendees', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAttendees);

  fastify.post('/idg-meetings/:id/attendees', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.addAttendee);

  // Patient reviews
  fastify.get('/idg-meetings/:id/reviews', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getReviews);

  fastify.post('/idg-meetings/:id/reviews', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.addReview);

  fastify.post('/idg-meetings/:id/reviews/:patientId/complete', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.completeReview);

  // Compliance tracking
  fastify.get('/idg/overdue', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getOverdue);

  fastify.get('/idg/schedule', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getSchedule);

  // Patient-specific
  fastify.get('/patients/:id/idg-reviews', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientReviews);
}
