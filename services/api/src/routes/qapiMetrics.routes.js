import QAPIMetricsController from "../controllers/QAPIMetrics.controller.js";
import { PERMISSIONS } from "../config/rbac.js";
import { requireAnyPermission } from "../middleware/rbac.middleware.js";

/**
 * QAPI Metrics Routes
 * Comprehensive Quality Assurance and Performance Tracking endpoints
 *
 * Includes:
 * - Product areas management (5 routes)
 * - Tags management (2 routes)
 * - Metric definitions (5 routes)
 * - Metric thresholds (4 routes)
 * - Metric values/time-series (3 routes)
 * - Improvement initiatives (7 routes)
 * - Initiative metrics linking (2 routes)
 * - Metric snapshots (2 routes)
 * - Initiative dependencies (2 routes)
 * - Webhooks management (5 routes)
 * - Change log (1 route)
 */
export default async function qapiMetricsRoutes(fastify, options) {

  // ==================== PRODUCT AREAS MANAGEMENT ====================

  // Get all product areas
  fastify.get("/product-areas", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getAllProductAreas.bind(QAPIMetricsController));

  // Get product area by ID
  fastify.get("/product-areas/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getProductAreaById.bind(QAPIMetricsController));

  // Create product area
  fastify.post("/product-areas", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.createProductArea.bind(QAPIMetricsController));

  // Update product area
  fastify.put("/product-areas/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.updateProductArea.bind(QAPIMetricsController));

  // Delete product area
  fastify.delete("/product-areas/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.DELETE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.deleteProductArea.bind(QAPIMetricsController));

  // ==================== TAGS MANAGEMENT ====================

  // Get all tags
  fastify.get("/tags", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getAllTags.bind(QAPIMetricsController));

  // Create tag
  fastify.post("/tags", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.createTag.bind(QAPIMetricsController));

  // ==================== METRIC DEFINITIONS ====================

  // Get all metric definitions
  fastify.get("/metric-definitions", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getAllMetricDefinitions.bind(QAPIMetricsController));

  // Get metric definition by ID
  fastify.get("/metric-definitions/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getMetricDefinitionById.bind(QAPIMetricsController));

  // Create metric definition
  fastify.post("/metric-definitions", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.createMetricDefinition.bind(QAPIMetricsController));

  // Update metric definition
  fastify.put("/metric-definitions/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.updateMetricDefinition.bind(QAPIMetricsController));

  // Delete metric definition
  fastify.delete("/metric-definitions/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.DELETE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.deleteMetricDefinition.bind(QAPIMetricsController));

  // ==================== METRIC THRESHOLDS ====================

  // Get thresholds for a metric
  fastify.get("/metrics/:metric_id/thresholds", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getMetricThresholds.bind(QAPIMetricsController));

  // Create metric threshold
  fastify.post("/metric-thresholds", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.createMetricThreshold.bind(QAPIMetricsController));

  // Update metric threshold
  fastify.put("/metric-thresholds/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.updateMetricThreshold.bind(QAPIMetricsController));

  // Delete metric threshold
  fastify.delete("/metric-thresholds/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.DELETE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.deleteMetricThreshold.bind(QAPIMetricsController));

  // ==================== METRIC VALUES (TIME-SERIES) ====================

  // Record metric value
  fastify.post("/metric-values", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.recordMetricValue.bind(QAPIMetricsController));

  // Get metric values
  fastify.get("/metric-values", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getMetricValues.bind(QAPIMetricsController));

  // Get metric aggregations
  fastify.get("/metric-aggregations", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getMetricAggregations.bind(QAPIMetricsController));

  // ==================== IMPROVEMENT INITIATIVES ====================

  // Get all initiatives
  fastify.get("/initiatives", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getAllInitiatives.bind(QAPIMetricsController));

  // Get initiative by ID
  fastify.get("/initiatives/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getInitiativeById.bind(QAPIMetricsController));

  // Create initiative
  fastify.post("/initiatives", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.createInitiative.bind(QAPIMetricsController));

  // Update initiative
  fastify.put("/initiatives/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.updateInitiative.bind(QAPIMetricsController));

  // Approve initiative
  fastify.post("/initiatives/:id/approve", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.approveInitiative.bind(QAPIMetricsController));

  // Delete initiative
  fastify.delete("/initiatives/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.DELETE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.deleteInitiative.bind(QAPIMetricsController));

  // ==================== INITIATIVE METRICS LINKING ====================

  // Link metric to initiative
  fastify.post("/initiative-metrics", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.linkMetricToInitiative.bind(QAPIMetricsController));

  // Unlink metric from initiative
  fastify.delete("/initiative-metrics/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.DELETE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.unlinkMetricFromInitiative.bind(QAPIMetricsController));

  // ==================== METRIC SNAPSHOTS ====================

  // Create metric snapshot
  fastify.post("/metric-snapshots", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.createMetricSnapshot.bind(QAPIMetricsController));

  // Get initiative snapshots
  fastify.get("/initiatives/:initiative_id/snapshots", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getInitiativeSnapshots.bind(QAPIMetricsController));

  // ==================== INITIATIVE DEPENDENCIES ====================

  // Add initiative dependency
  fastify.post("/initiative-dependencies", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.addInitiativeDependency.bind(QAPIMetricsController));

  // Remove initiative dependency
  fastify.delete("/initiative-dependencies/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.DELETE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.removeInitiativeDependency.bind(QAPIMetricsController));

  // ==================== WEBHOOKS MANAGEMENT ====================

  // Get all webhooks
  fastify.get("/webhooks", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getAllWebhooks.bind(QAPIMetricsController));

  // Create webhook
  fastify.post("/webhooks", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.CREATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.createWebhook.bind(QAPIMetricsController));

  // Update webhook
  fastify.put("/webhooks/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.UPDATE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.updateWebhook.bind(QAPIMetricsController));

  // Delete webhook
  fastify.delete("/webhooks/:id", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.DELETE_CLINICAL_NOTES
    )]
  }, QAPIMetricsController.deleteWebhook.bind(QAPIMetricsController));

  // Get webhook events
  fastify.get("/webhook-events", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getWebhookEvents.bind(QAPIMetricsController));

  // ==================== CHANGE LOG (AUDIT TRAIL) ====================

  // Get change log
  fastify.get("/change-log", {
    preHandler: [requireAnyPermission(
      PERMISSIONS.VIEW_CLINICAL_NOTES,
      PERMISSIONS.VIEW_PATIENT_DETAILS
    )]
  }, QAPIMetricsController.getChangeLog.bind(QAPIMetricsController));
}
