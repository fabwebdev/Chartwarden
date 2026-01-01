/**
 * Nursing Note Routes
 *
 * REST API routes for nursing note management with:
 * - RBAC-based authorization
 * - Request validation using Yup schemas
 * - HIPAA-compliant operations
 * - 21 CFR Part 11 signature compliance
 */

import controller from '../controllers/NursingNote.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';
import { validate, sanitizedString, fields } from '../middleware/validation.middleware.js';
import * as yup from 'yup';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Validation schema for creating nursing notes
 */
const createNursingNoteSchema = yup.object({
  patient_id: yup.number()
    .integer()
    .positive()
    .required('Patient ID is required'),

  nurse_id: yup.string()
    .nullable(),

  nurse_name: sanitizedString()
    .max(255, 'Nurse name must be at most 255 characters'),

  nurse_credentials: sanitizedString()
    .max(100, 'Nurse credentials must be at most 100 characters'),

  note_date: sanitizedString()
    .max(255),

  note_timestamp: yup.date()
    .max(new Date(), 'Note timestamp cannot be in the future')
    .nullable(),

  note_status: yup.string()
    .oneOf(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'PENDING_SIGNATURE'], 'Invalid note status')
    .default('DRAFT'),

  // SOAP sections
  subjective: sanitizedString()
    .max(10000, 'Subjective section must be at most 10000 characters'),

  objective: sanitizedString()
    .max(10000, 'Objective section must be at most 10000 characters'),

  assessment: sanitizedString()
    .max(10000, 'Assessment section must be at most 10000 characters'),

  plan: sanitizedString()
    .max(10000, 'Plan section must be at most 10000 characters'),

  // Main content
  content: sanitizedString()
    .max(10000, 'Content must be at most 10000 characters'),

  content_format: yup.string()
    .oneOf(['html', 'json', 'markdown'], 'Invalid content format')
    .default('html'),

  // Additional clinical sections
  interventions: sanitizedString()
    .max(10000, 'Interventions must be at most 10000 characters'),

  patient_response: sanitizedString()
    .max(10000, 'Patient response must be at most 10000 characters'),

  patient_education: sanitizedString()
    .max(10000, 'Patient education must be at most 10000 characters'),

  communication: sanitizedString()
    .max(10000, 'Communication must be at most 10000 characters'),

  // Visit timing
  time_in: sanitizedString()
    .max(255),

  time_out: sanitizedString()
    .max(255),

  prn_visit: yup.boolean()
    .default(false),

  // Additional fields
  benefit_period_id: yup.number()
    .integer()
    .positive()
    .nullable(),

  patient_name: sanitizedString()
    .max(255),

  patient_number: sanitizedString()
    .max(255),

  location_name: sanitizedString()
    .max(255),

  location_number: sanitizedString()
    .max(255)
});

/**
 * Validation schema for updating nursing notes
 */
const updateNursingNoteSchema = yup.object({
  nurse_name: sanitizedString()
    .max(255),

  nurse_credentials: sanitizedString()
    .max(100),

  note_date: sanitizedString()
    .max(255),

  note_timestamp: yup.date()
    .max(new Date(), 'Note timestamp cannot be in the future')
    .nullable(),

  note_status: yup.string()
    .oneOf(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'PENDING_SIGNATURE'], 'Invalid note status'),

  // SOAP sections
  subjective: sanitizedString()
    .max(10000),

  objective: sanitizedString()
    .max(10000),

  assessment: sanitizedString()
    .max(10000),

  plan: sanitizedString()
    .max(10000),

  content: sanitizedString()
    .max(10000),

  content_format: yup.string()
    .oneOf(['html', 'json', 'markdown']),

  interventions: sanitizedString()
    .max(10000),

  patient_response: sanitizedString()
    .max(10000),

  patient_education: sanitizedString()
    .max(10000),

  communication: sanitizedString()
    .max(10000),

  time_in: sanitizedString()
    .max(255),

  time_out: sanitizedString()
    .max(255),

  prn_visit: yup.boolean()
});

/**
 * Validation schema for query parameters
 */
const listQuerySchema = yup.object({
  patient_id: yup.number().integer().positive(),
  nurse_id: yup.string(),
  note_type: yup.string().oneOf(['ASSESSMENT', 'PROGRESS', 'DISCHARGE', 'ADMISSION', 'ROUTINE', 'PRN']),
  status: yup.string().oneOf(['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'PENDING_SIGNATURE', 'SIGNED', 'COSIGNED', 'AMENDED', 'VOID']),
  date_from: yup.date(),
  date_to: yup.date(),
  limit: yup.number().integer().min(1).max(100).default(20),
  offset: yup.number().integer().min(0).default(0),
  page: yup.number().integer().min(1).default(1),
  sort: yup.string().oneOf(['note_timestamp', 'createdAt']).default('note_timestamp'),
  order: yup.string().oneOf(['asc', 'desc']).default('desc')
});

/**
 * Validation schema for amendment
 */
const amendmentSchema = yup.object({
  amendment_reason: sanitizedString()
    .required('Amendment reason is required')
    .min(10, 'Amendment reason must be at least 10 characters')
    .max(1000, 'Amendment reason must be at most 1000 characters'),

  amended_content: sanitizedString()
    .max(10000, 'Amended content must be at most 10000 characters')
});

// ============================================================================
// Route Definitions
// ============================================================================

/**
 * Nursing Note Routes
 * Clinical documentation for nursing visits
 */
export default async function nursingNoteRoutes(fastify, options) {
  // ============================================================================
  // Main CRUD Routes
  // ============================================================================

  /**
   * GET /nursing-notes
   * List nursing notes with filtering and pagination
   */
  fastify.get('/nursing-notes', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES),
      validate({ query: listQuerySchema })
    ]
  }, controller.index);

  /**
   * POST /nursing-notes
   * Create a new nursing note
   */
  fastify.post('/nursing-notes', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES),
      validate({ body: createNursingNoteSchema })
    ]
  }, controller.store);

  /**
   * GET /nursing-notes/:id
   * Get a specific nursing note by ID
   */
  fastify.get('/nursing-notes/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.show);

  /**
   * PUT /nursing-notes/:id
   * Update an existing nursing note (full update)
   */
  fastify.put('/nursing-notes/:id', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES),
      validate({ body: updateNursingNoteSchema })
    ]
  }, controller.update);

  /**
   * PATCH /nursing-notes/:id
   * Partially update an existing nursing note
   */
  fastify.patch('/nursing-notes/:id', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES),
      validate({ body: updateNursingNoteSchema })
    ]
  }, controller.update);

  /**
   * DELETE /nursing-notes/:id
   * Soft delete a nursing note (unsigned only)
   */
  fastify.delete('/nursing-notes/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.destroy);

  // ============================================================================
  // Signature Routes (21 CFR Part 11 Compliance)
  // ============================================================================

  /**
   * POST /nursing-notes/:id/sign
   * Electronically sign a nursing note
   */
  fastify.post('/nursing-notes/:id/sign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.sign);

  /**
   * POST /nursing-notes/:id/cosign
   * Cosign a signed nursing note (supervision)
   */
  fastify.post('/nursing-notes/:id/cosign', {
    preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)]
  }, controller.cosign);

  /**
   * POST /nursing-notes/:id/amend
   * Add an amendment to a signed nursing note
   */
  fastify.post('/nursing-notes/:id/amend', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES),
      validate({ body: amendmentSchema })
    ]
  }, controller.amend);

  // ============================================================================
  // Query Routes
  // ============================================================================

  /**
   * GET /nursing-notes/unsigned
   * Get all unsigned (pending signature) nursing notes
   */
  fastify.get('/nursing-notes/unsigned', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getUnsigned);

  /**
   * GET /patients/:id/nursing-notes
   * Get all nursing notes for a specific patient
   */
  fastify.get('/patients/:id/nursing-notes', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.VIEW_PATIENT, PERMISSIONS.VIEW_CLINICAL_NOTES)
    ]
  }, controller.getPatientNotes);
}
