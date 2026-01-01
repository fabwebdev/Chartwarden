import PatientIdentifiersController from "../../controllers/patient/PatientIdentifiers.controller.js";
import { verifyToken } from "../../middleware/betterAuth.middleware.js";

// JSON Schema definitions for validation and documentation
const patientIdParam = {
  type: 'object',
  properties: {
    patientId: { type: 'string', description: 'Patient ID' }
  },
  required: ['patientId']
};

const identifierIdParam = {
  type: 'object',
  properties: {
    patientId: { type: 'string', description: 'Patient ID' },
    id: { type: 'string', description: 'Identifier ID' }
  },
  required: ['patientId', 'id']
};

const identifierQuerystring = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['MRN', 'SSN', 'MEDICARE', 'MEDICAID', 'INSURANCE', 'NPI', 'OTHER'],
      description: 'Filter by identifier type'
    },
    active_only: {
      type: 'string',
      enum: ['true', 'false'],
      description: 'Filter to active identifiers only'
    }
  }
};

const createIdentifierBody = {
  type: 'object',
  properties: {
    identifier_type: {
      type: 'string',
      enum: ['MRN', 'SSN', 'MEDICARE', 'MEDICAID', 'INSURANCE', 'NPI', 'OTHER'],
      description: 'Type of identifier'
    },
    identifier_value: { type: 'string', description: 'The identifier value' },
    facility_id: { type: 'number', description: 'Associated facility ID' },
    facility_name: { type: 'string', description: 'Name of issuing facility' },
    issuing_authority: { type: 'string', description: 'Authority that issued the identifier' },
    issuing_state: { type: 'string', maxLength: 2, description: 'Two-letter state code' },
    is_primary: { type: 'boolean', description: 'Whether this is the primary identifier of its type' },
    is_active: { type: 'boolean', description: 'Whether the identifier is currently active' },
    is_verified: { type: 'boolean', description: 'Whether the identifier has been verified' },
    effective_from: { type: 'string', format: 'date-time', description: 'When the identifier became valid' },
    effective_to: { type: 'string', format: 'date-time', description: 'When the identifier expired' },
    notes: { type: 'string', description: 'Additional notes' }
  },
  required: ['identifier_type', 'identifier_value']
};

const updateIdentifierBody = {
  type: 'object',
  properties: {
    identifier_type: {
      type: 'string',
      enum: ['MRN', 'SSN', 'MEDICARE', 'MEDICAID', 'INSURANCE', 'NPI', 'OTHER'],
      description: 'Type of identifier'
    },
    identifier_value: { type: 'string', description: 'The identifier value' },
    facility_id: { type: 'number', description: 'Associated facility ID' },
    facility_name: { type: 'string', description: 'Name of issuing facility' },
    issuing_authority: { type: 'string', description: 'Authority that issued the identifier' },
    issuing_state: { type: 'string', maxLength: 2, description: 'Two-letter state code' },
    is_primary: { type: 'boolean', description: 'Whether this is the primary identifier of its type' },
    is_active: { type: 'boolean', description: 'Whether the identifier is currently active' },
    is_verified: { type: 'boolean', description: 'Whether the identifier has been verified' },
    effective_from: { type: 'string', format: 'date-time', description: 'When the identifier became valid' },
    effective_to: { type: 'string', format: 'date-time', description: 'When the identifier expired' },
    notes: { type: 'string', description: 'Additional notes' }
  }
};

const verifyIdentifierBody = {
  type: 'object',
  properties: {
    verification_method: { type: 'string', description: 'How the identifier was verified' },
    verification_notes: { type: 'string', description: 'Notes about the verification' }
  }
};

// Fastify plugin for patient identifiers routes
async function patientIdentifiersRoutes(fastify, options) {
  // ===== NEW RESTful Patient-Scoped Routes =====

  // GET /patients/:patientId/identifiers - List all identifiers for a patient
  fastify.get("/patients/:patientId/identifiers", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get all identifiers for a patient',
      tags: ['Patient Identifiers'],
      params: patientIdParam,
      querystring: identifierQuerystring,
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
  }, PatientIdentifiersController.getPatientIdentifiers.bind(PatientIdentifiersController));

  // GET /patients/:patientId/identifiers/:id - Get a specific identifier
  fastify.get("/patients/:patientId/identifiers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get a specific identifier for a patient',
      tags: ['Patient Identifiers'],
      params: identifierIdParam,
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
  }, PatientIdentifiersController.getIdentifier.bind(PatientIdentifiersController));

  // POST /patients/:patientId/identifiers - Create a new identifier
  fastify.post("/patients/:patientId/identifiers", {
    preHandler: [verifyToken],
    schema: {
      description: 'Create a new identifier for a patient',
      tags: ['Patient Identifiers'],
      params: patientIdParam,
      body: createIdentifierBody,
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
  }, PatientIdentifiersController.createIdentifier.bind(PatientIdentifiersController));

  // PUT /patients/:patientId/identifiers/:id - Update an identifier
  fastify.put("/patients/:patientId/identifiers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Update an existing identifier',
      tags: ['Patient Identifiers'],
      params: identifierIdParam,
      body: updateIdentifierBody,
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
  }, PatientIdentifiersController.updateIdentifier.bind(PatientIdentifiersController));

  // DELETE /patients/:patientId/identifiers/:id - Soft delete an identifier
  fastify.delete("/patients/:patientId/identifiers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Soft delete an identifier',
      tags: ['Patient Identifiers'],
      params: identifierIdParam,
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
  }, PatientIdentifiersController.deleteIdentifier.bind(PatientIdentifiersController));

  // POST /patients/:patientId/identifiers/:id/set-primary - Set identifier as primary
  fastify.post("/patients/:patientId/identifiers/:id/set-primary", {
    preHandler: [verifyToken],
    schema: {
      description: 'Set an identifier as the primary for its type',
      tags: ['Patient Identifiers'],
      params: identifierIdParam,
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
  }, PatientIdentifiersController.setPrimaryIdentifier.bind(PatientIdentifiersController));

  // POST /patients/:patientId/identifiers/:id/verify - Verify an identifier
  fastify.post("/patients/:patientId/identifiers/:id/verify", {
    preHandler: [verifyToken],
    schema: {
      description: 'Mark an identifier as verified',
      tags: ['Patient Identifiers'],
      params: identifierIdParam,
      body: verifyIdentifierBody,
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
  }, PatientIdentifiersController.verifyIdentifier.bind(PatientIdentifiersController));

  // ===== LEGACY Routes for Backwards Compatibility =====

  // GET /patient-identifiers - List all identifiers (legacy)
  fastify.get("/patient-identifiers", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get all patient identifiers (legacy route)',
      tags: ['Patient Identifiers (Legacy)']
    }
  }, PatientIdentifiersController.index.bind(PatientIdentifiersController));

  // POST /patient-identifiers/store - Create identifier (legacy)
  fastify.post("/patient-identifiers/store", {
    preHandler: [verifyToken],
    schema: {
      description: 'Create a new patient identifier (legacy route)',
      tags: ['Patient Identifiers (Legacy)'],
      body: createIdentifierBody
    }
  }, PatientIdentifiersController.store.bind(PatientIdentifiersController));

  // GET /patient-identifiers/:id - Get identifier (legacy)
  fastify.get("/patient-identifiers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get a specific patient identifier (legacy route)',
      tags: ['Patient Identifiers (Legacy)']
    }
  }, PatientIdentifiersController.show.bind(PatientIdentifiersController));

  // PUT /patient-identifiers/:id - Update identifier (legacy)
  fastify.put("/patient-identifiers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Update a patient identifier (legacy route)',
      tags: ['Patient Identifiers (Legacy)'],
      body: updateIdentifierBody
    }
  }, PatientIdentifiersController.update.bind(PatientIdentifiersController));

  // DELETE /patient-identifiers/:id - Delete identifier (legacy)
  fastify.delete("/patient-identifiers/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Delete a patient identifier (legacy route)',
      tags: ['Patient Identifiers (Legacy)']
    }
  }, PatientIdentifiersController.destroy.bind(PatientIdentifiersController));
}

export default patientIdentifiersRoutes;
