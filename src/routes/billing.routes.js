import controller from '../controllers/Billing.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Billing Routes
 * Module G - HIGH Priority
 *
 * Purpose: Claims, payments, NOE, AR aging
 * Compliance: Revenue cycle critical, CMS billing requirements
 *
 * Endpoints:
 * - Claims management (create, submit, void, query)
 * - Notice of Election (NOE) submission
 * - Payment processing and application
 * - AR aging reports
 * - Billing period tracking
 */
export default async function billingRoutes(fastify, options) {
  // ============================================================================
  // CLAIMS ROUTES
  // ============================================================================

  // Get all claims (with filters)
  fastify.get('/claims', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAllClaims);

  // Create new claim
  fastify.post('/claims', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createClaim);

  // Get claim by ID (with service lines and payments)
  fastify.get('/claims/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getClaimById);

  // Submit claim
  fastify.post('/claims/:id/submit', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.submitClaim);

  // Void claim
  fastify.post('/claims/:id/void', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.voidClaim);

  // Get unbilled periods (ready to bill)
  fastify.get('/claims/unbilled', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getUnbilledPeriods);

  // Get rejected/denied claims
  fastify.get('/claims/rejected', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getRejectedClaims);

  // ============================================================================
  // NOTICE OF ELECTION (NOE) ROUTES
  // ============================================================================

  // Submit NOE for patient
  fastify.post('/patients/:id/noe', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.submitNOE);

  // ============================================================================
  // PAYMENT ROUTES
  // ============================================================================

  // Get all payments
  fastify.get('/payments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAllPayments);

  // Create payment
  fastify.post('/payments', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createPayment);

  // Apply payment to claims
  fastify.post('/payments/:id/apply', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.applyPayment);

  // ============================================================================
  // AR AGING & BILLING PERIOD ROUTES
  // ============================================================================

  // Get AR aging report
  fastify.get('/billing/ar-aging', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getARAgingReport);

  // Get billing periods
  fastify.get('/billing/periods', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getBillingPeriods);
}
