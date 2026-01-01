import controller from '../controllers/Billing.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Billing Routes
 * Module G - HIGH Priority
 *
 * Purpose: Claims, payments, NOE, AR aging, invoices, statements
 * Compliance: Revenue cycle critical, CMS billing requirements
 *
 * Endpoints:
 * - Claims management (create, submit, void, query)
 * - Notice of Election (NOE) submission
 * - Payment processing and application
 * - AR aging reports
 * - Billing period tracking
 * - Billing codes reference (ICD-10, CPT, HCPCS, Revenue)
 * - Claim submission history tracking
 * - Claim status history tracking
 * - Claim diagnosis and procedure codes
 * - Invoice management (create, update, payments)
 * - Billing statements (generate, list)
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

  // Get unbilled periods (ready to bill) - MUST be before :id route
  fastify.get('/claims/unbilled', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getUnbilledPeriods);

  // Get rejected/denied claims - MUST be before :id route
  fastify.get('/claims/rejected', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getRejectedClaims);

  // Get claim by ID (with service lines and payments)
  fastify.get('/claims/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getClaimById);

  // Update claim (full update)
  fastify.put('/claims/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateClaim);

  // Delete claim (soft delete)
  fastify.delete('/claims/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.deleteClaim);

  // Submit claim
  fastify.post('/claims/:id/submit', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.submitClaim);

  // Void claim
  fastify.post('/claims/:id/void', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.voidClaim);

  // Update claim amount (specialized endpoint for financial updates)
  fastify.put('/claims/:id/amount', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateClaimAmount);

  // Update claim status with history tracking and workflow validation (full update)
  fastify.put('/claims/:id/status', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateClaimStatus);

  // Update claim status (PATCH - partial update per REST specification)
  fastify.patch('/claims/:id/status', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateClaimStatus);

  // Get valid status transitions for a claim
  fastify.get('/claims/:id/status/transitions', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getValidStatusTransitions);

  // ============================================================================
  // CLAIM SUBMISSION HISTORY ROUTES
  // ============================================================================

  // Get submission history for a claim
  fastify.get('/claims/:id/submissions', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getClaimSubmissionHistory);

  // Record a new submission attempt
  fastify.post('/claims/:id/submissions', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.recordClaimSubmission);

  // Update submission response (from clearinghouse/payer)
  fastify.put('/claims/:claimId/submissions/:submissionId', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateSubmissionResponse);

  // ============================================================================
  // CLAIM STATUS HISTORY ROUTES
  // ============================================================================

  // Get status history for a claim
  fastify.get('/claims/:id/status-history', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getClaimStatusHistory);

  // ============================================================================
  // CLAIM DIAGNOSIS CODES ROUTES
  // ============================================================================

  // Get diagnosis codes for a claim
  fastify.get('/claims/:id/diagnosis-codes', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getClaimDiagnosisCodes);

  // Add diagnosis code to a claim
  fastify.post('/claims/:id/diagnosis-codes', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.addClaimDiagnosisCode);

  // Delete diagnosis code from a claim
  fastify.delete('/claims/:claimId/diagnosis-codes/:codeId', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.deleteClaimDiagnosisCode);

  // ============================================================================
  // CLAIM PROCEDURE CODES ROUTES
  // ============================================================================

  // Get procedure codes for a claim
  fastify.get('/claims/:id/procedure-codes', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getClaimProcedureCodes);

  // Add procedure code to a claim
  fastify.post('/claims/:id/procedure-codes', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.addClaimProcedureCode);

  // Delete procedure code from a claim
  fastify.delete('/claims/:claimId/procedure-codes/:codeId', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.deleteClaimProcedureCode);

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
  // DASHBOARD & ANALYTICS ROUTES
  // ============================================================================

  // Get billing dashboard with KPIs
  fastify.get('/billing/dashboard', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getBillingDashboard);

  // Get billing KPIs
  fastify.get('/billing/kpis', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getBillingKPIs);

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

  // ============================================================================
  // BILLING CODES ROUTES
  // ============================================================================

  // Get all billing codes (with filters)
  fastify.get('/billing/codes', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getBillingCodes);

  // Get billing code by ID
  fastify.get('/billing/codes/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getBillingCodeById);

  // Create billing code
  fastify.post('/billing/codes', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createBillingCode);

  // Update billing code
  fastify.put('/billing/codes/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateBillingCode);

  // ============================================================================
  // INVOICE ROUTES
  // ============================================================================

  // Get all invoices (with filters)
  fastify.get('/billing/invoices', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAllInvoices);

  // Get invoice by ID (with line items and payments)
  fastify.get('/billing/invoices/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getInvoiceById);

  // Create invoice from approved claims
  fastify.post('/billing/invoices', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.createInvoice);

  // Update invoice
  fastify.put('/billing/invoices/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.updateInvoice);

  // Record payment against invoice
  fastify.post('/billing/invoices/:id/payments', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.recordInvoicePayment);

  // Get payment history for an invoice
  fastify.get('/billing/invoices/:id/payments', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getInvoicePayments);

  // ============================================================================
  // BILLING STATEMENT ROUTES
  // ============================================================================

  // Get all billing statements (with filters)
  fastify.get('/billing/statements', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getAllStatements);

  // Get statement by ID (with line items)
  fastify.get('/billing/statements/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getStatementById);

  // Generate billing statement for a period
  fastify.post('/billing/statements', {
    preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)]
  }, controller.generateStatement);
}
