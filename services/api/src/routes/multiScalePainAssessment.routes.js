import controller from '../controllers/MultiScalePainAssessment.controller.js';
import { verifyToken } from '../middleware/betterAuth.middleware.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Multi-Scale Pain Assessment Routes
 *
 * Provides RESTful endpoints for managing pain assessments with
 * support for multiple standardized pain scales.
 */
async function multiScalePainAssessmentRoutes(fastify, options) {
  // =========================================
  // REFERENCE ENDPOINT (No auth required for scale info)
  // =========================================
  fastify.get(
    '/pain-assessments/reference',
    {
      schema: {
        description: 'Get pain scale reference information',
        tags: ['Pain Assessments'],
        response: {
          200: {
            type: 'object',
            properties: {
              status: { type: 'number' },
              data: { type: 'object' },
            },
          },
        },
      },
    },
    controller.getReference.bind(controller)
  );

  // =========================================
  // LIST ENDPOINTS
  // =========================================

  // Get all pain assessments (with optional filters)
  fastify.get(
    '/pain-assessments',
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES, PERMISSIONS.VIEW_PATIENT)],
      schema: {
        description: 'Get all pain assessments with optional filters',
        tags: ['Pain Assessments'],
        querystring: {
          type: 'object',
          properties: {
            patient_id: { type: 'integer', description: 'Filter by patient ID' },
            scale_type: {
              type: 'string',
              enum: ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'],
              description: 'Filter by pain scale type',
            },
            from_date: { type: 'string', format: 'date-time', description: 'Filter from date' },
            to_date: { type: 'string', format: 'date-time', description: 'Filter to date' },
            requires_follow_up: { type: 'string', enum: ['true', 'false'], description: 'Filter by follow-up required' },
            limit: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
            offset: { type: 'integer', default: 0, minimum: 0 },
          },
        },
      },
    },
    controller.index.bind(controller)
  );

  // Get pain assessments for a specific patient
  fastify.get(
    '/patients/:patientId/pain-assessments',
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES, PERMISSIONS.VIEW_PATIENT)],
      schema: {
        description: 'Get pain assessments for a specific patient',
        tags: ['Pain Assessments'],
        params: {
          type: 'object',
          properties: {
            patientId: { type: 'integer' },
          },
          required: ['patientId'],
        },
        querystring: {
          type: 'object',
          properties: {
            scale_type: { type: 'string', enum: ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'] },
            from_date: { type: 'string', format: 'date-time' },
            to_date: { type: 'string', format: 'date-time' },
            limit: { type: 'integer', default: 50, minimum: 1, maximum: 200 },
            offset: { type: 'integer', default: 0, minimum: 0 },
          },
        },
      },
    },
    controller.getPatientAssessments.bind(controller)
  );

  // Get pain trend for a patient
  fastify.get(
    '/patients/:patientId/pain-assessments/trend',
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES, PERMISSIONS.VIEW_PATIENT)],
      schema: {
        description: 'Get pain assessment trend/history for a patient',
        tags: ['Pain Assessments'],
        params: {
          type: 'object',
          properties: {
            patientId: { type: 'integer' },
          },
          required: ['patientId'],
        },
        querystring: {
          type: 'object',
          properties: {
            days: { type: 'integer', default: 30, minimum: 1, maximum: 365 },
            scale_type: { type: 'string', enum: ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'] },
            limit: { type: 'integer', default: 100, minimum: 1, maximum: 500 },
          },
        },
      },
    },
    controller.getPatientTrend.bind(controller)
  );

  // =========================================
  // SINGLE RESOURCE ENDPOINTS
  // =========================================

  // Get a single pain assessment by ID
  fastify.get(
    '/pain-assessments/:id',
    {
      preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES, PERMISSIONS.VIEW_PATIENT)],
      schema: {
        description: 'Get a single pain assessment by ID',
        tags: ['Pain Assessments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
          },
          required: ['id'],
        },
      },
    },
    controller.show.bind(controller)
  );

  // =========================================
  // CREATE ENDPOINTS
  // =========================================

  // Create a new pain assessment (global endpoint)
  fastify.post(
    '/pain-assessments',
    {
      preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)],
      schema: {
        description: 'Create a new pain assessment',
        tags: ['Pain Assessments'],
        body: {
          type: 'object',
          required: ['patient_id', 'pain_scale_type'],
          properties: {
            patient_id: { type: 'integer' },
            encounter_id: { type: 'integer' },
            note_id: { type: 'integer' },
            assessment_timestamp: { type: 'string', format: 'date-time' },
            assessment_context: {
              type: 'string',
              enum: ['ROUTINE', 'PRE_MEDICATION', 'POST_MEDICATION', 'ON_DEMAND', 'ADMISSION', 'DISCHARGE', 'FOLLOW_UP'],
            },
            pain_scale_type: {
              type: 'string',
              enum: ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'],
            },
            // NRS
            nrs_score: { type: 'integer', minimum: 0, maximum: 10 },
            // VAS
            vas_score: { type: 'number', minimum: 0, maximum: 100 },
            // Wong-Baker
            wong_baker_score: { type: 'integer', minimum: 0, maximum: 10 },
            wong_baker_face_selected: { type: 'string' },
            // FLACC subscores
            flacc_face: { type: 'integer', minimum: 0, maximum: 2 },
            flacc_legs: { type: 'integer', minimum: 0, maximum: 2 },
            flacc_activity: { type: 'integer', minimum: 0, maximum: 2 },
            flacc_cry: { type: 'integer', minimum: 0, maximum: 2 },
            flacc_consolability: { type: 'integer', minimum: 0, maximum: 2 },
            // PAINAD subscores
            painad_breathing: { type: 'integer', minimum: 0, maximum: 2 },
            painad_negative_vocalization: { type: 'integer', minimum: 0, maximum: 2 },
            painad_facial_expression: { type: 'integer', minimum: 0, maximum: 2 },
            painad_body_language: { type: 'integer', minimum: 0, maximum: 2 },
            painad_consolability: { type: 'integer', minimum: 0, maximum: 2 },
            // CPOT subscores
            cpot_facial_expression: { type: 'integer', minimum: 0, maximum: 2 },
            cpot_body_movements: { type: 'integer', minimum: 0, maximum: 2 },
            cpot_muscle_tension: { type: 'integer', minimum: 0, maximum: 2 },
            cpot_ventilator_compliance: { type: 'integer', minimum: 0, maximum: 2 },
            // Pain characteristics
            pain_location_primary: { type: 'string', maxLength: 255 },
            pain_location_secondary: { type: 'string', maxLength: 255 },
            pain_quality: { type: 'string', maxLength: 255 },
            pain_radiation: { type: 'string', maxLength: 255 },
            pain_onset: { type: 'string', maxLength: 100 },
            pain_pattern: { type: 'string', maxLength: 100 },
            pain_duration_value: { type: 'integer' },
            pain_duration_unit: { type: 'string', maxLength: 50 },
            pain_frequency: { type: 'string', maxLength: 100 },
            // Factors
            aggravating_factors: { type: 'string' },
            relieving_factors: { type: 'string' },
            // Functional impact
            affects_sleep: { type: 'boolean' },
            affects_mobility: { type: 'boolean' },
            affects_appetite: { type: 'boolean' },
            affects_mood: { type: 'boolean' },
            affects_adl: { type: 'boolean' },
            functional_impact_notes: { type: 'string' },
            // Acceptable level
            acceptable_pain_level: { type: 'integer', minimum: 0, maximum: 10 },
            // Intervention
            intervention_given: { type: 'boolean' },
            intervention_type: { type: 'string', enum: ['PHARMACOLOGICAL', 'NON_PHARMACOLOGICAL', 'BOTH'] },
            intervention_description: { type: 'string' },
            intervention_medication: { type: 'string', maxLength: 255 },
            intervention_time: { type: 'string', format: 'date-time' },
            post_intervention_score: { type: 'integer', minimum: 0, maximum: 10 },
            post_intervention_time: { type: 'string', format: 'date-time' },
            intervention_effective: { type: 'boolean' },
            // Flags
            is_breakthrough_pain: { type: 'boolean' },
            requires_follow_up: { type: 'boolean' },
            follow_up_notes: { type: 'string' },
            // Communication
            patient_able_to_self_report: { type: 'boolean' },
            patient_goal_discussed: { type: 'boolean' },
            additional_notes: { type: 'string' },
          },
        },
      },
    },
    controller.store.bind(controller)
  );

  // Create a pain assessment for a specific patient
  fastify.post(
    '/patients/:patientId/pain-assessments',
    {
      preHandler: [requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES)],
      schema: {
        description: 'Create a new pain assessment for a patient',
        tags: ['Pain Assessments'],
        params: {
          type: 'object',
          properties: {
            patientId: { type: 'integer' },
          },
          required: ['patientId'],
        },
        body: {
          type: 'object',
          required: ['pain_scale_type'],
          properties: {
            pain_scale_type: {
              type: 'string',
              enum: ['NRS', 'VAS', 'WONG_BAKER', 'FLACC', 'PAINAD', 'CPOT'],
            },
            // All other properties same as global create
          },
        },
      },
    },
    controller.store.bind(controller)
  );

  // =========================================
  // UPDATE ENDPOINTS
  // =========================================

  // Update a pain assessment
  fastify.patch(
    '/pain-assessments/:id',
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
      schema: {
        description: 'Update a pain assessment (not allowed for signed assessments)',
        tags: ['Pain Assessments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
          },
          required: ['id'],
        },
      },
    },
    controller.update.bind(controller)
  );

  // =========================================
  // DELETE ENDPOINTS
  // =========================================

  // Delete a pain assessment
  fastify.delete(
    '/pain-assessments/:id',
    {
      preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)],
      schema: {
        description: 'Delete a pain assessment (not allowed for signed assessments)',
        tags: ['Pain Assessments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
          },
          required: ['id'],
        },
      },
    },
    controller.delete.bind(controller)
  );

  // =========================================
  // COMPLIANCE ENDPOINTS (21 CFR Part 11)
  // =========================================

  // Sign a pain assessment
  fastify.post(
    '/pain-assessments/:id/sign',
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
      schema: {
        description: 'Sign a pain assessment (21 CFR Part 11 compliance)',
        tags: ['Pain Assessments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
          },
          required: ['id'],
        },
      },
    },
    controller.sign.bind(controller)
  );

  // Amend a signed pain assessment
  fastify.post(
    '/pain-assessments/:id/amend',
    {
      preHandler: [requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES)],
      schema: {
        description: 'Amend a signed pain assessment',
        tags: ['Pain Assessments'],
        params: {
          type: 'object',
          properties: {
            id: { type: 'integer' },
          },
          required: ['id'],
        },
        body: {
          type: 'object',
          required: ['amendment_reason'],
          properties: {
            amendment_reason: { type: 'string', minLength: 1 },
            // Allow updating scores and notes
            nrs_score: { type: 'integer', minimum: 0, maximum: 10 },
            vas_score: { type: 'number', minimum: 0, maximum: 100 },
            wong_baker_score: { type: 'integer', minimum: 0, maximum: 10 },
            flacc_face: { type: 'integer', minimum: 0, maximum: 2 },
            flacc_legs: { type: 'integer', minimum: 0, maximum: 2 },
            flacc_activity: { type: 'integer', minimum: 0, maximum: 2 },
            flacc_cry: { type: 'integer', minimum: 0, maximum: 2 },
            flacc_consolability: { type: 'integer', minimum: 0, maximum: 2 },
            painad_breathing: { type: 'integer', minimum: 0, maximum: 2 },
            painad_negative_vocalization: { type: 'integer', minimum: 0, maximum: 2 },
            painad_facial_expression: { type: 'integer', minimum: 0, maximum: 2 },
            painad_body_language: { type: 'integer', minimum: 0, maximum: 2 },
            painad_consolability: { type: 'integer', minimum: 0, maximum: 2 },
            cpot_facial_expression: { type: 'integer', minimum: 0, maximum: 2 },
            cpot_body_movements: { type: 'integer', minimum: 0, maximum: 2 },
            cpot_muscle_tension: { type: 'integer', minimum: 0, maximum: 2 },
            cpot_ventilator_compliance: { type: 'integer', minimum: 0, maximum: 2 },
            pain_location_primary: { type: 'string' },
            pain_location_secondary: { type: 'string' },
            pain_quality: { type: 'string' },
            pain_radiation: { type: 'string' },
            additional_notes: { type: 'string' },
            post_intervention_score: { type: 'integer', minimum: 0, maximum: 10 },
            intervention_effective: { type: 'boolean' },
          },
        },
      },
    },
    controller.amend.bind(controller)
  );
}

export default multiScalePainAssessmentRoutes;
