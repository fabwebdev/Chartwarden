import PatientPayerController from "../../controllers/patient/PatientPayer.controller.js";
import { verifyToken } from "../../middleware/betterAuth.middleware.js";

// JSON Schema definitions for validation and documentation
const patientIdParam = {
  type: 'object',
  properties: {
    patientId: { type: 'string', description: 'Patient ID' }
  },
  required: ['patientId']
};

const payerIdParam = {
  type: 'object',
  properties: {
    patientId: { type: 'string', description: 'Patient ID' },
    id: { type: 'string', description: 'Payer ID' }
  },
  required: ['patientId', 'id']
};

const payerQuerystring = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['MEDICARE', 'MEDICAID', 'COMMERCIAL', 'MANAGED_CARE', 'TRICARE', 'CHAMPVA', 'WORKERS_COMP', 'AUTO', 'SELF_PAY', 'OTHER'],
      description: 'Filter by payer type'
    },
    active_only: {
      type: 'string',
      enum: ['true', 'false'],
      description: 'Filter to active payers only'
    },
    primary_only: {
      type: 'string',
      enum: ['true', 'false'],
      description: 'Filter to primary payer only'
    }
  }
};

const createPayerBody = {
  type: 'object',
  properties: {
    payer_type: {
      type: 'string',
      enum: ['MEDICARE', 'MEDICAID', 'COMMERCIAL', 'MANAGED_CARE', 'TRICARE', 'CHAMPVA', 'WORKERS_COMP', 'AUTO', 'SELF_PAY', 'OTHER'],
      description: 'Type of payer'
    },
    payer_order: { type: 'number', minimum: 1, maximum: 10, description: 'Order of payer (1=Primary, 2=Secondary, etc.)' },
    payer_name: { type: 'string', description: 'Insurance company name' },
    payer_id: { type: 'string', description: 'Payer ID for EDI submissions' },
    payer_phone: { type: 'string', description: 'Payer phone number' },
    payer_fax: { type: 'string', description: 'Payer fax number' },
    payer_email: { type: 'string', format: 'email', description: 'Payer email address' },
    payer_website: { type: 'string', description: 'Payer website URL' },
    payer_address_line1: { type: 'string', description: 'Payer address line 1' },
    payer_address_line2: { type: 'string', description: 'Payer address line 2' },
    payer_city: { type: 'string', description: 'Payer city' },
    payer_state: { type: 'string', maxLength: 2, description: 'Two-letter state code' },
    payer_zip: { type: 'string', description: 'Payer ZIP code' },
    payer_country: { type: 'string', description: 'Payer country' },
    policy_number: { type: 'string', description: 'Member/subscriber ID' },
    group_number: { type: 'string', description: 'Group/employer ID' },
    group_name: { type: 'string', description: 'Employer/group name' },
    plan_name: { type: 'string', description: 'Specific plan name' },
    plan_type: { type: 'string', description: 'Plan type (HMO, PPO, etc.)' },
    subscriber_id: { type: 'string', description: 'Subscriber ID if different from patient' },
    subscriber_name: { type: 'string', description: 'Subscriber name' },
    subscriber_dob: { type: 'string', format: 'date', description: 'Subscriber date of birth' },
    subscriber_relationship: {
      type: 'string',
      enum: ['SELF', 'SPOUSE', 'CHILD', 'OTHER'],
      description: 'Relationship of patient to subscriber'
    },
    medicare_beneficiary_id: { type: 'string', maxLength: 11, description: 'Medicare Beneficiary Identifier (MBI)' },
    medicare_part_a_effective: { type: 'string', format: 'date', description: 'Medicare Part A effective date' },
    medicare_part_b_effective: { type: 'string', format: 'date', description: 'Medicare Part B effective date' },
    medicare_hospice_election_date: { type: 'string', format: 'date', description: 'Hospice election date' },
    medicare_advantage_plan: { type: 'boolean', description: 'Is this a Medicare Advantage plan?' },
    medicare_advantage_plan_name: { type: 'string', description: 'Medicare Advantage plan name' },
    medicaid_id: { type: 'string', description: 'Medicaid ID' },
    medicaid_state: { type: 'string', maxLength: 2, description: 'State issuing Medicaid' },
    medicaid_plan_name: { type: 'string', description: 'Medicaid plan name' },
    is_dual_eligible: { type: 'boolean', description: 'Is patient dual-eligible (Medicare + Medicaid)?' },
    effective_date: { type: 'string', format: 'date', description: 'Coverage start date' },
    termination_date: { type: 'string', format: 'date', description: 'Coverage end date' },
    authorization_number: { type: 'string', description: 'Authorization/pre-certification number' },
    authorization_start_date: { type: 'string', format: 'date', description: 'Authorization start date' },
    authorization_end_date: { type: 'string', format: 'date', description: 'Authorization end date' },
    authorization_units: { type: 'number', description: 'Authorized days/visits' },
    authorization_notes: { type: 'string', description: 'Authorization notes' },
    cob_order: { type: 'number', description: 'Coordination of benefits order' },
    accepts_assignment: { type: 'boolean', description: 'Provider accepts assignment' },
    assignment_of_benefits: { type: 'boolean', description: 'Patient assigns benefits to provider' },
    is_verified: { type: 'boolean', description: 'Has eligibility been verified?' },
    eligibility_status: {
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'UNKNOWN'],
      description: 'Current eligibility status'
    },
    is_active: { type: 'boolean', description: 'Is this payer currently active?' },
    is_primary: { type: 'boolean', description: 'Is this the primary payer?' },
    notes: { type: 'string', description: 'General notes' },
    internal_notes: { type: 'string', description: 'Staff-only notes' }
  },
  required: ['payer_type', 'payer_name']
};

const updatePayerBody = {
  type: 'object',
  properties: {
    ...createPayerBody.properties
  }
  // No required fields for update
};

const verifyPayerBody = {
  type: 'object',
  properties: {
    verification_method: { type: 'string', description: 'How eligibility was verified (EDI 270/271, Portal, Phone)' },
    verification_response: { type: 'string', description: 'Raw verification response' },
    eligibility_status: {
      type: 'string',
      enum: ['ACTIVE', 'INACTIVE', 'PENDING', 'UNKNOWN'],
      description: 'Eligibility status from verification'
    }
  }
};

const reorderPayersBody = {
  type: 'object',
  properties: {
    payer_orders: {
      type: 'array',
      items: {
        type: 'object',
        properties: {
          id: { type: 'number', description: 'Payer ID' },
          order: { type: 'number', minimum: 1, description: 'New order position' }
        },
        required: ['id', 'order']
      },
      description: 'Array of payer IDs with their new order positions'
    }
  },
  required: ['payer_orders']
};

// Fastify plugin for patient payers routes
async function patientPayerRoutes(fastify, options) {
  // ===== RESTful Patient-Scoped Routes =====

  // GET /patients/:patientId/payers - List all payers for a patient
  fastify.get("/patients/:patientId/payers", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get all payers for a patient',
      tags: ['Patient Payers'],
      params: patientIdParam,
      querystring: payerQuerystring,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            data: { type: 'array' },
            count: { type: 'number' }
          }
        }
      }
    }
  }, PatientPayerController.getPatientPayers.bind(PatientPayerController));

  // GET /patients/:patientId/payers/primary - Get primary payer for a patient
  fastify.get("/patients/:patientId/payers/primary", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get the primary payer for a patient',
      tags: ['Patient Payers'],
      params: patientIdParam,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, PatientPayerController.getPrimaryPayer.bind(PatientPayerController));

  // GET /patients/:patientId/payers/:id - Get a specific payer
  fastify.get("/patients/:patientId/payers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get a specific payer for a patient',
      tags: ['Patient Payers'],
      params: payerIdParam,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            data: { type: 'object' }
          }
        },
        404: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, PatientPayerController.getPayer.bind(PatientPayerController));

  // POST /patients/:patientId/payers - Create a new payer
  fastify.post("/patients/:patientId/payers", {
    preHandler: [verifyToken],
    schema: {
      description: 'Create a new payer for a patient',
      tags: ['Patient Payers'],
      params: patientIdParam,
      body: createPayerBody,
      response: {
        201: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' },
            errors: { type: 'array' }
          }
        },
        404: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, PatientPayerController.createPayer.bind(PatientPayerController));

  // PUT /patients/:patientId/payers/:id - Update a payer
  fastify.put("/patients/:patientId/payers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Update an existing payer',
      tags: ['Patient Payers'],
      params: payerIdParam,
      body: updatePayerBody,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' },
            errors: { type: 'array' }
          }
        },
        404: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, PatientPayerController.updatePayer.bind(PatientPayerController));

  // DELETE /patients/:patientId/payers/:id - Soft delete a payer
  fastify.delete("/patients/:patientId/payers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Soft delete a payer',
      tags: ['Patient Payers'],
      params: payerIdParam,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, PatientPayerController.deletePayer.bind(PatientPayerController));

  // POST /patients/:patientId/payers/:id/set-primary - Set payer as primary
  fastify.post("/patients/:patientId/payers/:id/set-primary", {
    preHandler: [verifyToken],
    schema: {
      description: 'Set a payer as the primary payer',
      tags: ['Patient Payers'],
      params: payerIdParam,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, PatientPayerController.setPrimaryPayer.bind(PatientPayerController));

  // POST /patients/:patientId/payers/:id/verify - Verify payer eligibility
  fastify.post("/patients/:patientId/payers/:id/verify", {
    preHandler: [verifyToken],
    schema: {
      description: 'Mark a payer as verified after eligibility check',
      tags: ['Patient Payers'],
      params: payerIdParam,
      body: verifyPayerBody,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            data: { type: 'object' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, PatientPayerController.verifyPayer.bind(PatientPayerController));

  // POST /patients/:patientId/payers/reorder - Reorder payers for COB
  fastify.post("/patients/:patientId/payers/reorder", {
    preHandler: [verifyToken],
    schema: {
      description: 'Reorder payers for coordination of benefits',
      tags: ['Patient Payers'],
      params: patientIdParam,
      body: reorderPayersBody,
      response: {
        200: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            data: { type: 'array' },
            message: { type: 'string' }
          }
        },
        400: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' }
          }
        },
        404: {
          type: 'object',
          properties: {
            status: { type: 'number' },
            message: { type: 'string' }
          }
        }
      }
    }
  }, PatientPayerController.reorderPayers.bind(PatientPayerController));

  // ===== LEGACY Routes for Backwards Compatibility =====

  // GET /patient-payers - List all payers (legacy)
  fastify.get("/patient-payers", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get all patient payers (legacy route)',
      tags: ['Patient Payers (Legacy)']
    }
  }, PatientPayerController.index.bind(PatientPayerController));

  // POST /patient-payers/store - Create payer (legacy)
  fastify.post("/patient-payers/store", {
    preHandler: [verifyToken],
    schema: {
      description: 'Create a new patient payer (legacy route)',
      tags: ['Patient Payers (Legacy)'],
      body: {
        type: 'object',
        properties: {
          patient_id: { type: 'number', description: 'Patient ID' },
          ...createPayerBody.properties
        },
        required: ['patient_id', 'payer_type', 'payer_name']
      }
    }
  }, PatientPayerController.store.bind(PatientPayerController));

  // GET /patient-payers/:id - Get payer (legacy)
  fastify.get("/patient-payers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get a specific patient payer (legacy route)',
      tags: ['Patient Payers (Legacy)']
    }
  }, PatientPayerController.show.bind(PatientPayerController));

  // PUT /patient-payers/:id - Update payer (legacy)
  fastify.put("/patient-payers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Update a patient payer (legacy route)',
      tags: ['Patient Payers (Legacy)'],
      body: updatePayerBody
    }
  }, PatientPayerController.update.bind(PatientPayerController));

  // DELETE /patient-payers/:id - Delete payer (legacy)
  fastify.delete("/patient-payers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Delete a patient payer (legacy route)',
      tags: ['Patient Payers (Legacy)']
    }
  }, PatientPayerController.destroy.bind(PatientPayerController));
}

export default patientPayerRoutes;
