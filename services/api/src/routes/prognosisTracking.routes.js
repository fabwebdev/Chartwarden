import PrognosisTrackingController from "../controllers/PrognosisTracking.controller.js";
import { verifyToken } from "../middleware/betterAuth.middleware.js";

/**
 * Prognosis Tracking Routes
 * Comprehensive prognosis tracking for hospice patients
 *
 * Base path: /api/prognosis-tracking
 */
async function prognosisTrackingRoutes(fastify, options) {
  // Get enum values for dropdowns
  fastify.get("/enums", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.getEnums.bind(PrognosisTrackingController));

  // List all prognosis tracking records with filters
  fastify.get("/", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.index.bind(PrognosisTrackingController));

  // Get current prognosis for a patient
  fastify.get("/patient/:patientId/current", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.getCurrentByPatient.bind(PrognosisTrackingController));

  // Get prognosis history for a patient
  fastify.get("/patient/:patientId/history", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.getHistoryByPatient.bind(PrognosisTrackingController));

  // Get prognosis trends for a patient
  fastify.get("/patient/:patientId/trends", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.getPatientTrends.bind(PrognosisTrackingController));

  // Get a specific prognosis tracking record
  fastify.get("/:id", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.show.bind(PrognosisTrackingController));

  // Create a new prognosis tracking record
  fastify.post("/", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.create.bind(PrognosisTrackingController));

  // Update a prognosis tracking record
  fastify.put("/:id", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.update.bind(PrognosisTrackingController));

  // Soft delete (archive) a prognosis tracking record
  fastify.delete("/:id", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.delete.bind(PrognosisTrackingController));

  // Add clinical indicator to a prognosis record
  fastify.post("/:id/indicators", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.addClinicalIndicator.bind(PrognosisTrackingController));

  // Get clinical indicators for a prognosis record
  fastify.get("/:id/indicators", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.getClinicalIndicators.bind(PrognosisTrackingController));

  // Record outcome for a prognosis
  fastify.post("/:id/outcomes", {
    preHandler: [verifyToken],
  }, PrognosisTrackingController.recordOutcome.bind(PrognosisTrackingController));
}

export default prognosisTrackingRoutes;
