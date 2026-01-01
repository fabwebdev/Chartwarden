import controller from '../controllers/Patient.controller.js';
import {
  createPrognosis,
  getAllPrognosis,
  getPrognosisByPatientId,
  prognosisValidation
} from '../controllers/Prognosis.controller.js';
import { validate, validateBody, validateQuery, fields, sanitizedString } from '../middleware/validation.middleware.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';
import * as yup from 'yup';

/**
 * Patient validation schemas
 */
const patientCreateSchema = yup.object({
  first_name: sanitizedString().required('First name is required').min(1).max(100),
  last_name: sanitizedString().required('Last name is required').min(1).max(100),
  middle_name: sanitizedString().max(100),
  mi: sanitizedString().max(10),
  preferred_name: sanitizedString().max(100),
  suffix: sanitizedString().max(20),
  date_of_birth: yup.string().required('Date of birth is required'),
  gender: fields.oneOf(['male', 'female', 'other', 'unknown']),
  marital_status: fields.oneOf(['single', 'married', 'divorced', 'widowed', 'separated', 'domestic_partner']),
  preferred_language: sanitizedString().max(100),
  ssn: fields.ssn(),
  medicare_beneficiary_id: sanitizedString().max(50),
  medicaid_id: sanitizedString().max(50),
  medical_record_number: fields.mrn(),
  email: fields.email(),
  primary_phone: fields.phone(),
  emergency_contact_name: sanitizedString().max(255),
  emergency_contact_phone: fields.phone(),
  emergency_contact_relationship: sanitizedString().max(100),
  oxygen_dependent: yup.number().oneOf([0, 1]),
  patient_consents: yup.number().oneOf([0, 1]),
  hipaa_received: yup.number().oneOf([0, 1]),
  veterans_status: yup.number().oneOf([0, 1]),
  dme_provider: sanitizedString().max(255),
  status: fields.oneOf(['active', 'inactive', 'discharged', 'deceased'])
});

const patientUpdateSchema = yup.object({
  first_name: sanitizedString().min(1).max(100),
  last_name: sanitizedString().min(1).max(100),
  middle_name: sanitizedString().max(100),
  mi: sanitizedString().max(10),
  preferred_name: sanitizedString().max(100),
  suffix: sanitizedString().max(20),
  date_of_birth: yup.string(),
  gender: fields.oneOf(['male', 'female', 'other', 'unknown']),
  marital_status: fields.oneOf(['single', 'married', 'divorced', 'widowed', 'separated', 'domestic_partner']),
  preferred_language: sanitizedString().max(100),
  ssn: fields.ssn(),
  medicare_beneficiary_id: sanitizedString().max(50),
  medicaid_id: sanitizedString().max(50),
  medical_record_number: fields.mrn(),
  email: fields.email(),
  primary_phone: fields.phone(),
  emergency_contact_name: sanitizedString().max(255),
  emergency_contact_phone: fields.phone(),
  emergency_contact_relationship: sanitizedString().max(100),
  oxygen_dependent: yup.number().oneOf([0, 1]),
  patient_consents: yup.number().oneOf([0, 1]),
  hipaa_received: yup.number().oneOf([0, 1]),
  veterans_status: yup.number().oneOf([0, 1]),
  dme_provider: sanitizedString().max(255),
  status: fields.oneOf(['active', 'inactive', 'discharged', 'deceased']),
  updatedAt: yup.string() // For optimistic locking
});

const patientListQuerySchema = yup.object({
  first_name: sanitizedString().max(100),
  last_name: sanitizedString().max(100),
  date_of_birth: yup.string(),
  status: fields.oneOf(['active', 'inactive', 'discharged', 'deceased']),
  medical_record_number: sanitizedString().max(100),
  limit: yup.number().integer().min(1).max(100).default(50),
  offset: yup.number().integer().min(0).default(0),
  sort: fields.oneOf(['first_name', 'last_name', 'date_of_birth', 'createdAt']).default('createdAt'),
  order: fields.oneOf(['asc', 'desc']).default('desc'),
  include_deleted: yup.boolean().default(false)
});

const patientSearchQuerySchema = yup.object({
  q: sanitizedString().min(2, 'Search query must be at least 2 characters').max(200),
  limit: yup.number().integer().min(1).max(50).default(20),
  offset: yup.number().integer().min(0).default(0)
});

const patientIdParamSchema = yup.object({
  id: yup.string().matches(/^\d+$/, 'Patient ID must be a number').required('Patient ID is required')
});

/**
 * Patient Routes
 * HIPAA-compliant patient records management
 *
 * Authorization:
 * - Admin: Full CRUD access, can view/restore deleted records
 * - Doctor: Create, Read, Update patients
 * - Nurse: Read, Update patients
 * - Patient: Read own records only
 */
async function patientRoutes(fastify, options) {
  // ============================================================================
  // Patient CRUD Routes
  // ============================================================================

  /**
   * GET /patients - List all patients with pagination and filtering
   * Requires: VIEW_PATIENT permission
   */
  fastify.get('/patients', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.VIEW_PATIENT),
      validate({ query: patientListQuerySchema })
    ]
  }, controller.index);

  /**
   * GET /patients/search - Search patients
   * Requires: VIEW_PATIENT permission
   */
  fastify.get('/patients/search', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.VIEW_PATIENT),
      validate({ query: patientSearchQuerySchema })
    ]
  }, controller.search);

  /**
   * POST /patients - Create new patient
   * Requires: CREATE_PATIENT permission
   */
  fastify.post('/patients', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.CREATE_PATIENT),
      validateBody(patientCreateSchema)
    ]
  }, controller.store);

  /**
   * GET /patients/:id - Get patient by ID
   * Requires: VIEW_PATIENT permission
   */
  fastify.get('/patients/:id', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.VIEW_PATIENT),
      validate({ params: patientIdParamSchema })
    ]
  }, controller.show);

  /**
   * PUT /patients/:id - Full update patient
   * Requires: UPDATE_PATIENT permission
   */
  fastify.put('/patients/:id', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.UPDATE_PATIENT),
      validate({
        params: patientIdParamSchema,
        body: patientCreateSchema // Full update requires all fields
      })
    ]
  }, controller.update);

  /**
   * PATCH /patients/:id - Partial update patient
   * Requires: UPDATE_PATIENT permission
   */
  fastify.patch('/patients/:id', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.UPDATE_PATIENT),
      validate({
        params: patientIdParamSchema,
        body: patientUpdateSchema
      })
    ]
  }, controller.patch);

  /**
   * DELETE /patients/:id - Delete patient (soft delete by default)
   * Requires: DELETE_PATIENT permission
   * Query params:
   * - hard: 'true' for permanent delete (admin only)
   * - reason: deletion reason for audit
   */
  fastify.delete('/patients/:id', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.DELETE_PATIENT),
      validate({ params: patientIdParamSchema })
    ]
  }, controller.destroy);

  /**
   * POST /patients/:id/restore - Restore soft-deleted patient
   * Requires: DELETE_PATIENT permission (admin only in controller)
   */
  fastify.post('/patients/:id/restore', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.DELETE_PATIENT),
      validate({ params: patientIdParamSchema })
    ]
  }, controller.restore);

  // ============================================================================
  // Legacy Routes (for backward compatibility)
  // NOTE: /patient routes are now handled by patient/Patient.routes.js
  // which is registered with prefix "/patient" in api.routes.js
  // ============================================================================

  /**
   * POST /patient/store - Create patient (legacy route)
   * @deprecated Use POST /patients instead
   */
  fastify.post('/patient/store', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.CREATE_PATIENT),
      validateBody(patientCreateSchema)
    ]
  }, controller.store);

  // ============================================================================
  // Prognosis Routes (related to patients)
  // ============================================================================

  /**
   * POST /prognosis/store - Create prognosis
   */
  fastify.post('/prognosis/store', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES),
      prognosisValidation
    ],
  }, createPrognosis);

  /**
   * GET /prognosis - Get all prognosis records
   */
  fastify.get('/prognosis', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, getAllPrognosis);

  /**
   * GET /prognosis/:id - Get prognosis by patient ID
   */
  fastify.get('/prognosis/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, getPrognosisByPatientId);
}

export default patientRoutes;
