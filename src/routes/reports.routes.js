import ReportsController from "../controllers/Reports.controller.js";
import { PERMISSIONS } from "../config/rbac.js";
import { requireAnyPermission } from "../middleware/rbac.middleware.js";

/**
 * Reports Routes
 * Generates various reports by querying existing data
 * No database tables needed - aggregates data from all modules
 *
 * Report Categories:
 * - Census Reports (4 routes)
 * - Clinical Compliance Reports (5 routes)
 * - Billing Reports (4 routes)
 * - QAPI Reports (4 routes)
 * - Staff Reports (3 routes)
 * - Bereavement Reports (1 route)
 * - Executive Dashboard (1 route)
 */
export default async function reportsRoutes(fastify, options) {
  // ==================== CENSUS REPORTS ====================

  // Get current census
  fastify.get("/reports/census/current", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_PATIENT_DETAILS,
      PERMISSIONS.VIEW_CLINICAL_NOTES
    )]
  }, ReportsController.getCurrentCensus);

  // Get census by level of care
  fastify.get("/reports/census/by-level-of-care", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_PATIENT_DETAILS,
      PERMISSIONS.VIEW_CLINICAL_NOTES
    )]
  }, ReportsController.getCensusByLevelOfCare);

  // Get admissions and discharges
  fastify.get("/reports/census/admissions-discharges", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_PATIENT_DETAILS,
      PERMISSIONS.VIEW_CLINICAL_NOTES
    )]
  }, ReportsController.getAdmissionsDischarges);

  // Get average length of stay
  fastify.get("/reports/census/average-los", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_PATIENT_DETAILS,
      PERMISSIONS.VIEW_CLINICAL_NOTES
    )]
  }, ReportsController.getAverageLengthOfStay);

  // ==================== CLINICAL COMPLIANCE REPORTS ====================

  // Get recertifications due
  fastify.get("/reports/compliance/recertifications-due", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getRecertificationsDue);

  // Get overdue visits
  fastify.get("/reports/compliance/overdue-visits", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getOverdueVisits);

  // Get IDG meeting compliance
  fastify.get("/reports/compliance/idg-meetings", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES
    )]
  }, ReportsController.getIDGMeetingCompliance);

  // Get medication reconciliation status
  fastify.get("/reports/compliance/medication-reconciliation", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getMedicationReconciliation);

  // ==================== BILLING REPORTS ====================

  // Get pending claims
  fastify.get("/reports/billing/pending-claims", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getPendingClaims);

  // Get AR aging summary
  fastify.get("/reports/billing/ar-aging-summary", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getARAgingSummary);

  // Get revenue by payer
  fastify.get("/reports/billing/revenue-by-payer", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getRevenueByPayer);

  // Get unbilled periods
  fastify.get("/reports/billing/unbilled-periods", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getUnbilledPeriods);

  // ==================== QAPI REPORTS ====================

  // Get incidents summary
  fastify.get("/reports/qapi/incidents-summary", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getIncidentsSummary);

  // Get grievances summary
  fastify.get("/reports/qapi/grievances-summary", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getGrievancesSummary);

  // Get quality measures dashboard
  fastify.get("/reports/qapi/quality-measures-dashboard", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getQualityMeasuresDashboard);

  // Get chart audit scores
  fastify.get("/reports/qapi/chart-audit-scores", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getChartAuditScores);

  // ==================== STAFF REPORTS ====================

  // Get staff productivity
  fastify.get("/reports/staff/productivity", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getStaffProductivity);

  // Get credential expirations
  fastify.get("/reports/staff/credential-expirations", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getCredentialExpirations);

  // Get caseload summary
  fastify.get("/reports/staff/caseload-summary", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getCaseloadSummary);

  // ==================== BEREAVEMENT REPORTS ====================

  // Get active bereavement cases
  fastify.get("/reports/bereavement/active-cases", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getActiveBereavementCases);

  // ==================== EXECUTIVE DASHBOARD ====================

  // Get executive dashboard summary
  fastify.get("/reports/executive/dashboard", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportsController.getExecutiveDashboard);
}
