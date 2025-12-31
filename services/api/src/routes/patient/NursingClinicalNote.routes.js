import * as NursingClinicalNoteController from "../../controllers/patient/NursingClinicalNote.controller.js";
import authenticate from "../../middleware/betterAuth.middleware.js";
import { PERMISSIONS } from "../../config/rbac.js";
import { requireAnyPermission } from "../../middleware/rbac.middleware.js";

/**
 * Nursing Clinical Note Routes
 * Clinical documentation for nursing visits with rich text content
 */
async function nursingClinicalNoteRoutes(fastify, options) {
  // ============================================================================
  // Main CRUD Routes
  // ============================================================================

  // List all nursing clinical notes with filters
  fastify.get(
    "/",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.index
  );

  // Create new nursing clinical note
  fastify.post(
    "/",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.create
  );

  // Get nursing clinical note by ID
  fastify.get(
    "/:id",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.show
  );

  // Update nursing clinical note
  fastify.put(
    "/:id",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.update
  );

  fastify.patch(
    "/:id",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.update
  );

  // Store (create or update) nursing clinical note
  fastify.post(
    "/:id",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES, PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.store
  );

  // Delete nursing clinical note (soft delete)
  fastify.delete(
    "/:id",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.destroy
  );

  // ============================================================================
  // Signature Routes (21 CFR Part 11 Compliance)
  // ============================================================================

  // Sign nursing clinical note
  fastify.post(
    "/:id/sign",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.sign
  );

  // Update note status
  fastify.patch(
    "/:id/status",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.updateStatus
  );

  // ============================================================================
  // Query Routes
  // ============================================================================

  // Get unsigned notes
  fastify.get(
    "/unsigned",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.getUnsignedNotes
  );

  // Get notes by nurse
  fastify.get(
    "/by-nurse/:nurse_id",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.getNotesByNurse
  );

  // Get notes by patient
  fastify.get(
    "/by-patient/:patient_id",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES, PERMISSIONS.VIEW_PATIENT)],
    },
    NursingClinicalNoteController.getNotesByPatient
  );

  // ============================================================================
  // Backward Compatibility Routes
  // ============================================================================

  // Backward compatibility: support double path for existing frontend
  fastify.get(
    "/nursing-clinical-notes/:id",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.show
  );

  fastify.put(
    "/nursing-clinical-notes/:id",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.update
  );

  fastify.post(
    "/nursing-clinical-notes/:id",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES, PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.store
  );

  // ============================================================================
  // Related Clinical Data Routes
  // ============================================================================

  // Vital signs routes
  fastify.get(
    "/vital_signs/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_VITAL_SIGNS)],
    },
    NursingClinicalNoteController.getVitalSigns
  );

  fastify.post(
    "/vital_signs/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.CREATE_VITAL_SIGNS, PERMISSIONS.UPDATE_VITAL_SIGNS)],
    },
    NursingClinicalNoteController.autoSaveVitalSigns
  );

  // Scales, tools, and lab data routes
  fastify.get(
    "/scales_tools_lab_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.indexScaleToolLabData
  );

  fastify.post(
    "/scales_tools_lab_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.autoSaveScaleToolLabData
  );

  // Pain data routes
  fastify.get(
    "/pain_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.indexPainData
  );

  fastify.post(
    "/pain_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.autoSavePainData
  );

  // Painad data routes
  fastify.get(
    "/painad_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.indexPainadData
  );

  fastify.post(
    "/painad_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.autoSavePainadData
  );

  // Flacc data routes
  fastify.get(
    "/flacc_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.indexFlaccData
  );

  fastify.post(
    "/flacc_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.autoSaveFlaccData
  );

  // Cardiovascular data routes
  fastify.get(
    "/cardiovascular_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.indexCardiovascularData
  );

  fastify.post(
    "/cardiovascular_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.autoSaveCardiovascularData
  );

  // Respiratory data routes
  fastify.get(
    "/respiratory_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.indexRespiratoryData
  );

  fastify.post(
    "/respiratory_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.autoSaveRespiratoryData
  );

  // Genitourinary data routes
  fastify.get(
    "/genitourinary_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.indexGenitourinaryData
  );

  fastify.post(
    "/genitourinary_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.autoSaveGenitourinaryData
  );

  // Gastrointestinal data routes
  fastify.get(
    "/gastrointestinal_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.indexGastrointestinalData
  );

  fastify.post(
    "/gastrointestinal_data/:noteId",
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
    },
    NursingClinicalNoteController.autoSaveGastrointestinalData
  );
}

export default nursingClinicalNoteRoutes;
