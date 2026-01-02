import ReportManagementController from "../controllers/ReportManagement.controller.js";
import { PERMISSIONS } from "../config/rbac.js";
import { requireAnyPermission } from "../middleware/rbac.middleware.js";

/**
 * Report Management Routes
 * Comprehensive report generation, scheduling, and delivery system
 *
 * Route Categories:
 * - Report Configurations (CRUD + versioning)
 * - Report Schedules (CRUD + toggle + due/execute)
 * - Generated Reports (list, get, execute, download, retry, deliver)
 * - Report Metrics & Access Logs
 * - User Favorites (CRUD)
 *
 * HIPAA Compliance:
 * - All access is logged via report_access_logs
 * - RBAC permission checks on all endpoints
 * - Audit trail for all operations
 */
export default async function reportManagementRoutes(fastify, options) {
  // ==================== REPORT CONFIGURATIONS ====================

  // List all report configurations
  fastify.get("/report-management/configurations", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.listConfigurations);

  // Get a single report configuration
  fastify.get("/report-management/configurations/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.getConfiguration);

  // Create a new report configuration
  fastify.post("/report-management/configurations", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.createConfiguration);

  // Update a report configuration
  fastify.put("/report-management/configurations/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.updateConfiguration);

  // Delete a report configuration
  fastify.delete("/report-management/configurations/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.deleteConfiguration);

  // Get configuration version history
  fastify.get("/report-management/configurations/:id/versions", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.getConfigurationVersions);

  // Execute a report manually (synchronous)
  fastify.post("/report-management/configurations/:id/execute", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.executeReport);

  // Execute a report asynchronously (background job)
  fastify.post("/report-management/configurations/:id/execute-async", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.executeReportAsync);

  // Get execution history for a configuration
  fastify.get("/report-management/configurations/:id/history", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.getExecutionHistory);

  // ==================== REPORT SCHEDULES ====================

  // List all schedules
  fastify.get("/report-management/schedules", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.listSchedules);

  // Get a single schedule
  fastify.get("/report-management/schedules/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.getSchedule);

  // Create a new schedule
  fastify.post("/report-management/schedules", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.createSchedule);

  // Update a schedule
  fastify.put("/report-management/schedules/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.updateSchedule);

  // Delete a schedule
  fastify.delete("/report-management/schedules/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.deleteSchedule);

  // Toggle schedule active status
  fastify.patch("/report-management/schedules/:id/toggle", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.toggleSchedule);

  // Get due scheduled reports
  fastify.get("/report-management/schedules/due", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.MANAGE_SETTINGS
    )]
  }, ReportManagementController.getDueSchedules);

  // Execute all due scheduled reports
  fastify.post("/report-management/schedules/execute-due", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.GENERATE_REPORTS,
      PERMISSIONS.MANAGE_SETTINGS
    )]
  }, ReportManagementController.executeDueSchedules);

  // ==================== GENERATED REPORTS ====================

  // List generated reports
  fastify.get("/report-management/generated", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.listGeneratedReports);

  // Get failed reports
  fastify.get("/report-management/generated/failed", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.getFailedReports);

  // Get a single generated report
  fastify.get("/report-management/generated/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.getGeneratedReport);

  // Download a generated report file
  fastify.get("/report-management/generated/:id/download", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.downloadReport);

  // Retry a failed report execution
  fastify.post("/report-management/generated/:id/retry", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.GENERATE_REPORTS,
      PERMISSIONS.VIEW_CLINICAL_NOTES
    )]
  }, ReportManagementController.retryReport);

  // Deliver a generated report to recipients
  fastify.post("/report-management/generated/:id/deliver", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.GENERATE_REPORTS,
      PERMISSIONS.VIEW_CLINICAL_NOTES
    )]
  }, ReportManagementController.deliverReport);

  // Cancel a running or pending report
  fastify.post("/report-management/generated/:id/cancel", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.GENERATE_REPORTS,
      PERMISSIONS.VIEW_CLINICAL_NOTES
    )]
  }, ReportManagementController.cancelReport);

  // Get access logs for a generated report (HIPAA compliance)
  fastify.get("/report-management/generated/:id/access-logs", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_AUDIT_LOGS,
      PERMISSIONS.MANAGE_SETTINGS
    )]
  }, ReportManagementController.getAccessLogs);

  // ==================== METRICS ====================

  // Get report execution and delivery metrics
  fastify.get("/report-management/metrics", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_REPORTS,
      PERMISSIONS.MANAGE_SETTINGS
    )]
  }, ReportManagementController.getMetrics);

  // ==================== USER FAVORITES ====================

  // Get user's favorite reports
  fastify.get("/report-management/favorites", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.getFavorites);

  // Add a report to favorites
  fastify.post("/report-management/favorites", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.addFavorite);

  // Remove a report from favorites
  fastify.delete("/report-management/favorites/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, ReportManagementController.removeFavorite);
}
