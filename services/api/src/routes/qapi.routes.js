import QAPIController from "../controllers/QAPI.controller.js";
import { PERMISSIONS } from "../config/rbac.js";
import { requireAnyPermission } from "../middleware/rbac.middleware.js";

/**
 * QAPI Routes
 * Quality Assurance and Performance Improvement endpoints
 *
 * Includes:
 * - Incident management (6 routes)
 * - Grievance management (6 routes)
 * - Quality measures (4 routes)
 * - Performance improvement projects (3 routes)
 * - Chart audits (2 routes)
 * - Infection control (3 routes)
 */
export default async function qapiRoutes(fastify, options) {
  // ==================== INCIDENTS MANAGEMENT ====================

  // Get all incidents
  fastify.get("/incidents", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIController.getAllIncidents);

  // Get incident by ID
  fastify.get("/incidents/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIController.getIncidentById);

  // Create new incident
  fastify.post("/incidents", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIController.createIncident);

  // Update incident
  fastify.put("/incidents/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIController.updateIncident);

  // Close incident
  fastify.post("/incidents/:id/close", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIController.closeIncident);

  // Delete incident
  fastify.delete("/incidents/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.DELETE_CLINICAL_NOTES
    )]
  }, QAPIController.deleteIncident);

  // ==================== GRIEVANCES MANAGEMENT ====================

  // Get all grievances
  fastify.get("/grievances", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIController.getAllGrievances);

  // Get grievance by ID
  fastify.get("/grievances/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIController.getGrievanceById);

  // Create new grievance
  fastify.post("/grievances", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIController.createGrievance);

  // Update grievance
  fastify.put("/grievances/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIController.updateGrievance);

  // Resolve grievance
  fastify.post("/grievances/:id/resolve", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIController.resolveGrievance);

  // Delete grievance
  fastify.delete("/grievances/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.DELETE_CLINICAL_NOTES
    )]
  }, QAPIController.deleteGrievance);

  // ==================== QUALITY MEASURES ====================

  // Get all quality measures
  fastify.get("/quality-measures", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIController.getAllQualityMeasures);

  // Create quality measure
  fastify.post("/quality-measures", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIController.createQualityMeasure);

  // Record measure data point
  fastify.post("/quality-measures/data", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIController.recordMeasureData);

  // Get measure trends
  fastify.get("/quality-measures/trends", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIController.getMeasureTrends);

  // ==================== PERFORMANCE IMPROVEMENT PROJECTS ====================

  // Get all PIPs
  fastify.get("/pips", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIController.getAllPIPs);

  // Create new PIP
  fastify.post("/pips", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIController.createPIP);

  // Update PIP
  fastify.put("/pips/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIController.updatePIP);

  // ==================== CHART AUDITS ====================

  // Conduct chart audit
  fastify.post("/chart-audits", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIController.conductChartAudit);

  // Get audit results
  fastify.get("/chart-audits", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIController.getAuditResults);

  // ==================== INFECTION CONTROL ====================

  // Get all infections
  fastify.get("/infections", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIController.getAllInfections);

  // Report new infection
  fastify.post("/infections", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIController.reportInfection);

  // Update infection report
  fastify.put("/infections/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIController.updateInfection);
}
