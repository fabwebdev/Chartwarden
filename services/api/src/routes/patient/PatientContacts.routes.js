import PatientContactsController from "../../controllers/patient/PatientContacts.controller.js";
import { verifyToken } from "../../middleware/betterAuth.middleware.js";

// JSON Schema definitions for validation and documentation
const patientIdParam = {
  type: 'object',
  properties: {
    patientId: { type: 'string', description: 'Patient ID' }
  },
  required: ['patientId']
};

const contactIdParam = {
  type: 'object',
  properties: {
    patientId: { type: 'string', description: 'Patient ID' },
    id: { type: 'string', description: 'Contact ID' }
  },
  required: ['patientId', 'id']
};

const contactQuerystring = {
  type: 'object',
  properties: {
    type: {
      type: 'string',
      enum: ['EMERGENCY', 'FAMILY', 'CAREGIVER', 'HEALTHCARE_PROXY', 'LEGAL', 'FUNERAL_HOME', 'CLERGY', 'OTHER'],
      description: 'Filter by contact type'
    },
    active_only: {
      type: 'string',
      enum: ['true', 'false'],
      description: 'Filter to active contacts only'
    }
  }
};

const createContactBody = {
  type: 'object',
  properties: {
    contact_type: {
      type: 'string',
      enum: ['EMERGENCY', 'FAMILY', 'CAREGIVER', 'HEALTHCARE_PROXY', 'LEGAL', 'FUNERAL_HOME', 'CLERGY', 'OTHER'],
      description: 'Type of contact'
    },
    first_name: { type: 'string', description: 'Contact first name' },
    last_name: { type: 'string', description: 'Contact last name' },
    middle_name: { type: 'string', description: 'Contact middle name' },
    suffix: { type: 'string', description: 'Name suffix (Jr., Sr., etc.)' },
    preferred_name: { type: 'string', description: 'Preferred name/nickname' },
    relationship: { type: 'string', description: 'Relationship to patient (Spouse, Son, Daughter, etc.)' },
    relationship_detail: { type: 'string', description: 'Additional relationship details' },
    primary_phone: { type: 'string', description: 'Primary phone number' },
    primary_phone_type: {
      type: 'string',
      enum: ['MOBILE', 'HOME', 'WORK'],
      description: 'Type of primary phone'
    },
    secondary_phone: { type: 'string', description: 'Secondary phone number' },
    secondary_phone_type: {
      type: 'string',
      enum: ['MOBILE', 'HOME', 'WORK'],
      description: 'Type of secondary phone'
    },
    email: { type: 'string', format: 'email', description: 'Email address' },
    address_line_1: { type: 'string', description: 'Street address line 1' },
    address_line_2: { type: 'string', description: 'Street address line 2' },
    city: { type: 'string', description: 'City' },
    state: { type: 'string', maxLength: 2, description: 'Two-letter state code' },
    zip_code: { type: 'string', description: 'ZIP code' },
    country: { type: 'string', description: 'Country' },
    preferred_contact_method: {
      type: 'string',
      enum: ['PHONE', 'EMAIL', 'TEXT'],
      description: 'Preferred contact method'
    },
    preferred_contact_time: { type: 'string', description: 'Preferred time to contact' },
    preferred_language: { type: 'string', description: 'Preferred language' },
    priority: { type: 'number', description: 'Contact priority order (1 = first)' },
    is_primary: { type: 'boolean', description: 'Whether this is the primary contact for its type' },
    is_active: { type: 'boolean', description: 'Whether the contact is currently active' },
    authorized_for_phi: { type: 'boolean', description: 'Authorized to receive PHI' },
    authorized_for_decisions: { type: 'boolean', description: 'Can make care decisions' },
    has_key_to_home: { type: 'boolean', description: 'Has key to patient residence' },
    lives_with_patient: { type: 'boolean', description: 'Lives with patient' },
    healthcare_proxy_document: { type: 'boolean', description: 'Healthcare proxy document on file' },
    power_of_attorney: { type: 'boolean', description: 'POA document on file' },
    document_date: { type: 'string', format: 'date-time', description: 'Date of legal document' },
    notes: { type: 'string', description: 'General notes' },
    special_instructions: { type: 'string', description: 'Special contact instructions' }
  },
  required: ['first_name', 'last_name', 'relationship', 'primary_phone']
};

const updateContactBody = {
  type: 'object',
  properties: {
    contact_type: {
      type: 'string',
      enum: ['EMERGENCY', 'FAMILY', 'CAREGIVER', 'HEALTHCARE_PROXY', 'LEGAL', 'FUNERAL_HOME', 'CLERGY', 'OTHER'],
      description: 'Type of contact'
    },
    first_name: { type: 'string', description: 'Contact first name' },
    last_name: { type: 'string', description: 'Contact last name' },
    middle_name: { type: 'string', description: 'Contact middle name' },
    suffix: { type: 'string', description: 'Name suffix (Jr., Sr., etc.)' },
    preferred_name: { type: 'string', description: 'Preferred name/nickname' },
    relationship: { type: 'string', description: 'Relationship to patient' },
    relationship_detail: { type: 'string', description: 'Additional relationship details' },
    primary_phone: { type: 'string', description: 'Primary phone number' },
    primary_phone_type: {
      type: 'string',
      enum: ['MOBILE', 'HOME', 'WORK'],
      description: 'Type of primary phone'
    },
    secondary_phone: { type: 'string', description: 'Secondary phone number' },
    secondary_phone_type: {
      type: 'string',
      enum: ['MOBILE', 'HOME', 'WORK'],
      description: 'Type of secondary phone'
    },
    email: { type: 'string', format: 'email', description: 'Email address' },
    address_line_1: { type: 'string', description: 'Street address line 1' },
    address_line_2: { type: 'string', description: 'Street address line 2' },
    city: { type: 'string', description: 'City' },
    state: { type: 'string', maxLength: 2, description: 'Two-letter state code' },
    zip_code: { type: 'string', description: 'ZIP code' },
    country: { type: 'string', description: 'Country' },
    preferred_contact_method: {
      type: 'string',
      enum: ['PHONE', 'EMAIL', 'TEXT'],
      description: 'Preferred contact method'
    },
    preferred_contact_time: { type: 'string', description: 'Preferred time to contact' },
    preferred_language: { type: 'string', description: 'Preferred language' },
    priority: { type: 'number', description: 'Contact priority order' },
    is_primary: { type: 'boolean', description: 'Whether this is the primary contact for its type' },
    is_active: { type: 'boolean', description: 'Whether the contact is currently active' },
    authorized_for_phi: { type: 'boolean', description: 'Authorized to receive PHI' },
    authorized_for_decisions: { type: 'boolean', description: 'Can make care decisions' },
    has_key_to_home: { type: 'boolean', description: 'Has key to patient residence' },
    lives_with_patient: { type: 'boolean', description: 'Lives with patient' },
    healthcare_proxy_document: { type: 'boolean', description: 'Healthcare proxy document on file' },
    power_of_attorney: { type: 'boolean', description: 'POA document on file' },
    document_date: { type: 'string', format: 'date-time', description: 'Date of legal document' },
    notes: { type: 'string', description: 'General notes' },
    special_instructions: { type: 'string', description: 'Special contact instructions' }
  }
};

// Fastify plugin for patient contacts routes
async function patientContactsRoutes(fastify, options) {
  // ===== NEW RESTful Patient-Scoped Routes =====

  // GET /patients/:patientId/contacts - List all contacts for a patient
  fastify.get("/patients/:patientId/contacts", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get all contacts for a patient',
      tags: ['Patient Contacts'],
      params: patientIdParam,
      querystring: contactQuerystring,
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
  }, PatientContactsController.getPatientContacts.bind(PatientContactsController));

  // GET /patients/:patientId/emergency-contacts - Get emergency contacts only
  fastify.get("/patients/:patientId/emergency-contacts", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get emergency contacts for a patient',
      tags: ['Patient Contacts'],
      params: patientIdParam,
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
  }, PatientContactsController.getEmergencyContacts.bind(PatientContactsController));

  // GET /patients/:patientId/contacts/:id - Get a specific contact
  fastify.get("/patients/:patientId/contacts/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get a specific contact for a patient',
      tags: ['Patient Contacts'],
      params: contactIdParam,
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
  }, PatientContactsController.getContact.bind(PatientContactsController));

  // POST /patients/:patientId/contacts - Create a new contact
  fastify.post("/patients/:patientId/contacts", {
    preHandler: [verifyToken],
    schema: {
      description: 'Create a new contact for a patient',
      tags: ['Patient Contacts'],
      params: patientIdParam,
      body: createContactBody,
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
  }, PatientContactsController.createContact.bind(PatientContactsController));

  // PUT /patients/:patientId/contacts/:id - Update a contact
  fastify.put("/patients/:patientId/contacts/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Update an existing contact',
      tags: ['Patient Contacts'],
      params: contactIdParam,
      body: updateContactBody,
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
  }, PatientContactsController.updateContact.bind(PatientContactsController));

  // DELETE /patients/:patientId/contacts/:id - Soft delete a contact
  fastify.delete("/patients/:patientId/contacts/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Soft delete a contact',
      tags: ['Patient Contacts'],
      params: contactIdParam,
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
  }, PatientContactsController.deleteContact.bind(PatientContactsController));

  // POST /patients/:patientId/contacts/:id/set-primary - Set contact as primary
  fastify.post("/patients/:patientId/contacts/:id/set-primary", {
    preHandler: [verifyToken],
    schema: {
      description: 'Set a contact as the primary for its type',
      tags: ['Patient Contacts'],
      params: contactIdParam,
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
  }, PatientContactsController.setPrimaryContact.bind(PatientContactsController));

  // ===== LEGACY Routes for Backwards Compatibility =====

  // GET /patient-contacts - List all contacts (legacy)
  fastify.get("/patient-contacts", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get all patient contacts (legacy route)',
      tags: ['Patient Contacts (Legacy)']
    }
  }, PatientContactsController.index.bind(PatientContactsController));

  // POST /patient-contacts/store - Create contact (legacy)
  fastify.post("/patient-contacts/store", {
    preHandler: [verifyToken],
    schema: {
      description: 'Create a new patient contact (legacy route)',
      tags: ['Patient Contacts (Legacy)'],
      body: createContactBody
    }
  }, PatientContactsController.store.bind(PatientContactsController));

  // GET /patient-contacts/:id - Get contact (legacy)
  fastify.get("/patient-contacts/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Get a specific patient contact (legacy route)',
      tags: ['Patient Contacts (Legacy)']
    }
  }, PatientContactsController.show.bind(PatientContactsController));

  // PUT /patient-contacts/:id - Update contact (legacy)
  fastify.put("/patient-contacts/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Update a patient contact (legacy route)',
      tags: ['Patient Contacts (Legacy)'],
      body: updateContactBody
    }
  }, PatientContactsController.update.bind(PatientContactsController));

  // DELETE /patient-contacts/:id - Delete contact (legacy)
  fastify.delete("/patient-contacts/:id", {
    preHandler: [verifyToken],
    schema: {
      description: 'Delete a patient contact (legacy route)',
      tags: ['Patient Contacts (Legacy)']
    }
  }, PatientContactsController.destroy.bind(PatientContactsController));
}

export default patientContactsRoutes;
