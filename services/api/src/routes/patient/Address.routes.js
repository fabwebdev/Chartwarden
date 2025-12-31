import AddressController from "../../controllers/patient/Address.controller.js";
import { verifyToken } from "../../middleware/betterAuth.middleware.js";

// Fastify plugin for address routes
async function addressRoutes(fastify, options) {
  // ============================================================
  // NEW RESTful API Routes for Patient Addresses
  // ============================================================

  // GET /patients/:patientId/addresses - Get all addresses for a patient
  fastify.get("/patients/:patientId/addresses", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get all addresses for a patient',
      tags: ['Patient Addresses'],
      params: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' }
        },
        required: ['patientId']
      },
      querystring: {
        type: 'object',
        properties: {
          type: { type: 'string', enum: ['PRIMARY', 'BILLING', 'MAILING', 'FACILITY', 'TEMPORARY'], description: 'Filter by address type' },
          active_only: { type: 'string', enum: ['true', 'false'], description: 'Only return active addresses' }
        }
      },
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
  }, AddressController.getPatientAddresses.bind(AddressController));

  // GET /patients/:patientId/addresses/:addressId - Get a specific address
  fastify.get("/patients/:patientId/addresses/:addressId", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get a specific address by ID',
      tags: ['Patient Addresses'],
      params: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' },
          addressId: { type: 'string', description: 'Address ID' }
        },
        required: ['patientId', 'addressId']
      }
    }
  }, AddressController.getAddress.bind(AddressController));

  // POST /patients/:patientId/addresses - Create a new address
  fastify.post("/patients/:patientId/addresses", {
    preHandler: [verifyToken],
    schema: {
      description: 'Create a new address for a patient',
      tags: ['Patient Addresses'],
      params: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' }
        },
        required: ['patientId']
      },
      body: {
        type: 'object',
        properties: {
          address_type: { type: 'string', enum: ['PRIMARY', 'BILLING', 'MAILING', 'FACILITY', 'TEMPORARY'], default: 'PRIMARY' },
          address_line_1: { type: 'string', minLength: 1, maxLength: 255 },
          address_line_2: { type: 'string', maxLength: 255 },
          city: { type: 'string', minLength: 1, maxLength: 100 },
          state: { type: 'string', minLength: 2, maxLength: 2, description: 'Two-letter US state code' },
          zip_code: { type: 'string', pattern: '^\\d{5}(-\\d{4})?$', description: 'ZIP code in format 12345 or 12345-6789' },
          county: { type: 'string', maxLength: 100 },
          cbsa_code: { type: 'string', maxLength: 10 },
          latitude: { type: 'string', maxLength: 20 },
          longitude: { type: 'string', maxLength: 20 },
          phone_number: { type: 'string', maxLength: 20 },
          alternate_phone: { type: 'string', maxLength: 20 },
          is_primary: { type: 'boolean', default: false },
          is_verified: { type: 'boolean', default: false },
          is_active: { type: 'boolean', default: true },
          effective_from: { type: 'string', format: 'date-time' },
          effective_to: { type: 'string', format: 'date-time' },
          notes: { type: 'string', maxLength: 500 }
        },
        required: ['address_line_1', 'city', 'state', 'zip_code']
      }
    }
  }, AddressController.createAddress.bind(AddressController));

  // PUT /patients/:patientId/addresses/:addressId - Update an address
  fastify.put("/patients/:patientId/addresses/:addressId", {
    preHandler: [verifyToken],
    schema: {
      description: 'Update an existing address',
      tags: ['Patient Addresses'],
      params: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' },
          addressId: { type: 'string', description: 'Address ID' }
        },
        required: ['patientId', 'addressId']
      },
      body: {
        type: 'object',
        properties: {
          address_type: { type: 'string', enum: ['PRIMARY', 'BILLING', 'MAILING', 'FACILITY', 'TEMPORARY'] },
          address_line_1: { type: 'string', minLength: 1, maxLength: 255 },
          address_line_2: { type: 'string', maxLength: 255 },
          city: { type: 'string', minLength: 1, maxLength: 100 },
          state: { type: 'string', minLength: 2, maxLength: 2 },
          zip_code: { type: 'string', pattern: '^\\d{5}(-\\d{4})?$' },
          county: { type: 'string', maxLength: 100 },
          cbsa_code: { type: 'string', maxLength: 10 },
          latitude: { type: 'string', maxLength: 20 },
          longitude: { type: 'string', maxLength: 20 },
          phone_number: { type: 'string', maxLength: 20 },
          alternate_phone: { type: 'string', maxLength: 20 },
          is_primary: { type: 'boolean' },
          is_verified: { type: 'boolean' },
          is_active: { type: 'boolean' },
          effective_from: { type: 'string', format: 'date-time' },
          effective_to: { type: 'string', format: 'date-time' },
          notes: { type: 'string', maxLength: 500 }
        }
      }
    }
  }, AddressController.updateAddress.bind(AddressController));

  // DELETE /patients/:patientId/addresses/:addressId - Delete an address (soft delete)
  fastify.delete("/patients/:patientId/addresses/:addressId", {
    preHandler: [verifyToken],
    schema: {
      description: 'Delete an address (soft delete)',
      tags: ['Patient Addresses'],
      params: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' },
          addressId: { type: 'string', description: 'Address ID' }
        },
        required: ['patientId', 'addressId']
      }
    }
  }, AddressController.deleteAddress.bind(AddressController));

  // POST /patients/:patientId/addresses/:addressId/set-primary - Set address as primary
  fastify.post("/patients/:patientId/addresses/:addressId/set-primary", {
    preHandler: [verifyToken],
    schema: {
      description: 'Set an address as the primary address for its type',
      tags: ['Patient Addresses'],
      params: {
        type: 'object',
        properties: {
          patientId: { type: 'string', description: 'Patient ID' },
          addressId: { type: 'string', description: 'Address ID' }
        },
        required: ['patientId', 'addressId']
      }
    }
  }, AddressController.setPrimaryAddress.bind(AddressController));

  // ============================================================
  // Legacy Routes (for backwards compatibility)
  // ============================================================

  // POST /address/store - Legacy store/update address
  fastify.post("/address/store", {
    preHandler: [verifyToken],
  }, AddressController.store.bind(AddressController));

  // GET /address/:id - Legacy get address by patient ID
  fastify.get("/address/:id", {
    preHandler: [verifyToken],
  }, AddressController.show.bind(AddressController));
}

export default addressRoutes;
