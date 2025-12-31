import BenefitPeriodController from "../../controllers/patient/BenefitPeriod.controller.js";
import { authenticate } from "../../middleware/betterAuth.middleware.js";
import { checkPermission } from "../../middleware/permission.middleware.js";

/**
 * Medicare Hospice Benefit Period Routes
 *
 * Comprehensive API for managing hospice benefit periods including:
 * - Medicare benefit period types (90-day initial, 90-day subsequent, 60-day)
 * - Level of Care (RHC, CHC, GIP, IRC) tracking
 * - Election and revocation history
 *
 * Compliance: CMS hospice benefit requirements, 42 CFR 418
 */
async function benefitPeriodRoutes(fastify, options) {
  // =====================================================
  // BENEFIT PERIOD CRUD OPERATIONS
  // =====================================================

  /**
   * Create next benefit period for a patient
   * POST /patient/:patientId/benefit-periods/create-next
   * Permission: benefit-periods:create
   */
  fastify.post(
    "/patient/:patientId/benefit-periods/create-next",
    {
      preHandler: [authenticate, checkPermission('benefit-periods:create')],
      schema: {
        description: 'Create the next Medicare hospice benefit period for a patient',
        tags: ['Benefit Periods'],
        params: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'number', description: 'Patient ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            election_date: { type: 'string', format: 'date', description: 'Hospice election date' },
            election_statement_signed: { type: 'boolean', description: 'Whether election statement is signed' },
            certification_date: { type: 'string', format: 'date', description: 'Physician certification date' },
            certifying_physician_id: { type: 'number', description: 'Certifying physician ID' },
            terminal_prognosis_confirmed: { type: 'boolean', description: 'Terminal prognosis confirmation' },
            prognosis_6_months_or_less: { type: 'boolean', description: 'Prognosis of 6 months or less' },
            notes: { type: 'string', description: 'Additional notes' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    BenefitPeriodController.createNextPeriod.bind(BenefitPeriodController)
  );

  /**
   * List all benefit periods for a patient
   * GET /patient/:patientId/benefit-periods
   * Permission: benefit-periods:view
   */
  fastify.get(
    "/patient/:patientId/benefit-periods",
    {
      preHandler: [authenticate, checkPermission('benefit-periods:view')],
      schema: {
        description: 'List all benefit periods for a patient',
        tags: ['Benefit Periods'],
        params: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'number', description: 'Patient ID' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            status: { type: 'string', enum: ['ACTIVE', 'REVOKED', 'DISCHARGED', 'EXPIRED', 'PENDING'] },
            includeDeleted: { type: 'boolean', default: false }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    BenefitPeriodController.listBenefitPeriods.bind(BenefitPeriodController)
  );

  /**
   * Get current active benefit period for a patient
   * GET /patient/:patientId/current-benefit-period
   * Permission: benefit-periods:view
   */
  fastify.get(
    "/patient/:patientId/current-benefit-period",
    {
      preHandler: [authenticate, checkPermission('benefit-periods:view')],
      schema: {
        description: 'Get the current active benefit period for a patient with level of care',
        tags: ['Benefit Periods'],
        params: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'number', description: 'Patient ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    BenefitPeriodController.getCurrentBenefitPeriod.bind(BenefitPeriodController)
  );

  /**
   * Get election history for a patient
   * GET /patient/:patientId/elections
   * Permission: benefit-periods:view
   */
  fastify.get(
    "/patient/:patientId/elections",
    {
      preHandler: [authenticate, checkPermission('benefit-periods:view')],
      schema: {
        description: 'Get hospice election and revocation history for a patient',
        tags: ['Benefit Periods'],
        params: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'number', description: 'Patient ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    BenefitPeriodController.getElectionHistory.bind(BenefitPeriodController)
  );

  /**
   * Get single benefit period with details
   * GET /:id
   * Permission: benefit-periods:view
   */
  fastify.get(
    "/:id",
    {
      preHandler: [authenticate, checkPermission('benefit-periods:view')],
      schema: {
        description: 'Get a benefit period with level of care and election history',
        tags: ['Benefit Periods'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Benefit period ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    BenefitPeriodController.getBenefitPeriod.bind(BenefitPeriodController)
  );

  /**
   * Update benefit period
   * PUT /:id
   * Permission: benefit-periods:update
   */
  fastify.put(
    "/:id",
    {
      preHandler: [authenticate, checkPermission('benefit-periods:update')],
      schema: {
        description: 'Update a benefit period',
        tags: ['Benefit Periods'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Benefit period ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            election_date: { type: 'string', format: 'date' },
            election_statement_signed: { type: 'boolean' },
            election_statement_date: { type: 'string', format: 'date' },
            certification_date: { type: 'string', format: 'date' },
            certifying_physician_id: { type: 'number' },
            recertification_required_by: { type: 'string', format: 'date' },
            face_to_face_completed: { type: 'boolean' },
            face_to_face_date: { type: 'string', format: 'date' },
            revocation_date: { type: 'string', format: 'date' },
            revocation_reason: { type: 'string' },
            discharge_date: { type: 'string', format: 'date' },
            discharge_reason: { type: 'string' },
            status: { type: 'string', enum: ['ACTIVE', 'REVOKED', 'DISCHARGED', 'EXPIRED', 'PENDING'] },
            terminal_prognosis_confirmed: { type: 'boolean' },
            prognosis_6_months_or_less: { type: 'boolean' },
            noe_filed: { type: 'boolean' },
            noe_filed_date: { type: 'string', format: 'date' },
            noe_timely: { type: 'boolean' },
            notes: { type: 'string' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    BenefitPeriodController.updateBenefitPeriod.bind(BenefitPeriodController)
  );

  // =====================================================
  // LEVEL OF CARE OPERATIONS
  // =====================================================

  /**
   * Add level of care change to a benefit period
   * POST /:id/loc
   * Permission: benefit-periods:manage-loc
   */
  fastify.post(
    "/:id/loc",
    {
      preHandler: [authenticate, checkPermission('benefit-periods:manage-loc')],
      schema: {
        description: 'Add a level of care change (RHC, CHC, GIP, IRC) to a benefit period',
        tags: ['Benefit Periods', 'Level of Care'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Benefit period ID' }
          }
        },
        body: {
          type: 'object',
          required: ['level_of_care', 'effective_date'],
          properties: {
            level_of_care: {
              type: 'string',
              enum: ['RHC', 'CHC', 'GIP', 'IRC'],
              description: 'RHC=Routine Home Care, CHC=Continuous Home Care, GIP=General Inpatient, IRC=Inpatient Respite'
            },
            effective_date: { type: 'string', format: 'date', description: 'When level of care begins' },
            end_date: { type: 'string', format: 'date', description: 'When level of care ends (optional)' },
            chc_start_time: { type: 'string', format: 'date-time', description: 'CHC start time' },
            chc_end_time: { type: 'string', format: 'date-time', description: 'CHC end time' },
            chc_total_hours: { type: 'number', description: 'Total CHC hours (minimum 8 required)' },
            facility_id: { type: 'number', description: 'Facility ID for GIP/IRC' },
            facility_name: { type: 'string', description: 'Facility name for GIP/IRC' },
            facility_npi: { type: 'string', description: 'Facility NPI for GIP/IRC' },
            respite_day_count: { type: 'number', description: 'IRC days (max 5 consecutive per benefit period)' },
            crisis_reason: { type: 'string', description: 'Crisis reason for CHC (required documentation)' },
            physician_order_date: { type: 'string', format: 'date' },
            ordering_physician_id: { type: 'number' },
            notes: { type: 'string' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    BenefitPeriodController.addLevelOfCare.bind(BenefitPeriodController)
  );

  /**
   * Get level of care history for a benefit period
   * GET /:id/loc
   * Permission: benefit-periods:view
   */
  fastify.get(
    "/:id/loc",
    {
      preHandler: [authenticate, checkPermission('benefit-periods:view')],
      schema: {
        description: 'Get level of care history for a benefit period',
        tags: ['Benefit Periods', 'Level of Care'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Benefit period ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    BenefitPeriodController.getLevelOfCareHistory.bind(BenefitPeriodController)
  );

  // =====================================================
  // ELECTION/REVOCATION OPERATIONS
  // =====================================================

  /**
   * Record election or revocation for a benefit period
   * POST /:id/election
   * Permission: benefit-periods:manage-election
   */
  fastify.post(
    "/:id/election",
    {
      preHandler: [authenticate, checkPermission('benefit-periods:manage-election')],
      schema: {
        description: 'Record an election, revocation, or transfer for a benefit period',
        tags: ['Benefit Periods', 'Elections'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Benefit period ID' }
          }
        },
        body: {
          type: 'object',
          required: ['election_type', 'election_date', 'effective_date'],
          properties: {
            election_type: {
              type: 'string',
              enum: ['INITIAL_ELECTION', 'RE_ELECTION', 'REVOCATION', 'TRANSFER_IN', 'TRANSFER_OUT'],
              description: 'Type of election action'
            },
            election_date: { type: 'string', format: 'date', description: 'Date of election action' },
            effective_date: { type: 'string', format: 'date', description: 'Effective date of action' },
            election_statement_signed: { type: 'boolean' },
            election_statement_date: { type: 'string', format: 'date' },
            witness_name: { type: 'string' },
            witness_signature_date: { type: 'string', format: 'date' },
            hospice_provider_name: { type: 'string' },
            hospice_provider_npi: { type: 'string' },
            attending_physician_id: { type: 'number' },
            attending_physician_name: { type: 'string' },
            physician_acknowledgment_date: { type: 'string', format: 'date' },
            revocation_effective_date: { type: 'string', format: 'date' },
            revocation_reason: { type: 'string' },
            remaining_days_in_period: { type: 'number', description: 'Days forfeited upon revocation' },
            transfer_from_hospice: { type: 'string' },
            transfer_to_hospice: { type: 'string' },
            transfer_date: { type: 'string', format: 'date' },
            notes: { type: 'string' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    BenefitPeriodController.recordElection.bind(BenefitPeriodController)
  );

  // =====================================================
  // LEGACY ROUTES (backwards compatibility)
  // =====================================================

  /**
   * Add nursing clinical note to a benefit period
   * POST /benefit-periods/:benefitPeriodId/nursing-clinical-notes
   */
  fastify.post(
    "/benefit-periods/:benefitPeriodId/nursing-clinical-notes",
    {
      preHandler: [authenticate],
      schema: {
        description: 'Add a nursing clinical note to a benefit period',
        tags: ['Benefit Periods', 'Clinical Notes']
      }
    },
    BenefitPeriodController.addNursingClinicalNote.bind(BenefitPeriodController)
  );

  /**
   * Get patient chart with benefit periods and nursing clinical notes
   * GET /patients/:id/chart
   */
  fastify.get(
    "/patients/:id/chart",
    {
      preHandler: [authenticate],
      schema: {
        description: 'Get patient chart with benefit periods and nursing clinical notes',
        tags: ['Benefit Periods', 'Patient Chart']
      }
    },
    BenefitPeriodController.getPatientChart.bind(BenefitPeriodController)
  );
}

export default benefitPeriodRoutes;
