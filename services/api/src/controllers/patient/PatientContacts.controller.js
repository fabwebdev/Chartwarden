import { db } from "../../config/db.drizzle.js";
import { patient_contacts } from "../../db/schemas/patientContact.schema.js";
import { patients } from "../../db/schemas/patient.schema.js";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { logger } from '../../utils/logger.js';

// Valid contact types
const VALID_CONTACT_TYPES = [
  'EMERGENCY',
  'FAMILY',
  'CAREGIVER',
  'HEALTHCARE_PROXY',
  'LEGAL',
  'FUNERAL_HOME',
  'CLERGY',
  'OTHER'
];

// Valid phone types
const VALID_PHONE_TYPES = ['MOBILE', 'HOME', 'WORK'];

// Valid contact methods
const VALID_CONTACT_METHODS = ['PHONE', 'EMAIL', 'TEXT'];

// Valid US state codes
const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
];

class PatientContactsController {
  /**
   * Validate contact data
   */
  validateContactData(data) {
    const errors = [];

    if (!data.first_name) {
      errors.push('first_name is required');
    }

    if (!data.last_name) {
      errors.push('last_name is required');
    }

    if (!data.relationship) {
      errors.push('relationship is required');
    }

    if (!data.primary_phone) {
      errors.push('primary_phone is required');
    }

    if (data.contact_type && !VALID_CONTACT_TYPES.includes(data.contact_type)) {
      errors.push(`contact_type must be one of: ${VALID_CONTACT_TYPES.join(', ')}`);
    }

    if (data.primary_phone_type && !VALID_PHONE_TYPES.includes(data.primary_phone_type)) {
      errors.push(`primary_phone_type must be one of: ${VALID_PHONE_TYPES.join(', ')}`);
    }

    if (data.secondary_phone_type && !VALID_PHONE_TYPES.includes(data.secondary_phone_type)) {
      errors.push(`secondary_phone_type must be one of: ${VALID_PHONE_TYPES.join(', ')}`);
    }

    if (data.preferred_contact_method && !VALID_CONTACT_METHODS.includes(data.preferred_contact_method)) {
      errors.push(`preferred_contact_method must be one of: ${VALID_CONTACT_METHODS.join(', ')}`);
    }

    if (data.state && !US_STATE_CODES.includes(data.state)) {
      errors.push('state must be a valid US state code');
    }

    if (data.email && !data.email.includes('@')) {
      errors.push('email must be a valid email address');
    }

    return errors;
  }

  /**
   * Get all contacts for a patient
   * GET /patients/:patientId/contacts
   */
  async getPatientContacts(request, reply) {
    try {
      const { patientId } = request.params;
      const { type, active_only } = request.query;

      // Build query conditions
      let conditions = [
        eq(patient_contacts.patient_id, patientId),
        isNull(patient_contacts.deleted_at)
      ];

      // Filter by type if specified
      if (type) {
        conditions.push(eq(patient_contacts.contact_type, type));
      }

      // Filter by active status if specified
      if (active_only === 'true') {
        conditions.push(eq(patient_contacts.is_active, true));
      }

      const contacts = await db.select()
        .from(patient_contacts)
        .where(and(...conditions))
        .orderBy(asc(patient_contacts.priority), desc(patient_contacts.is_primary), desc(patient_contacts.createdAt));

      reply.code(200);
      return {
        status: 200,
        data: contacts,
        count: contacts.length
      };
    } catch (error) {
      logger.error("Error fetching patient contacts:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Get a specific contact by ID
   * GET /patients/:patientId/contacts/:id
   */
  async getContact(request, reply) {
    try {
      const { patientId, id } = request.params;

      const contacts = await db.select()
        .from(patient_contacts)
        .where(and(
          eq(patient_contacts.id, id),
          eq(patient_contacts.patient_id, patientId),
          isNull(patient_contacts.deleted_at)
        ))
        .limit(1);

      const contact = contacts[0];

      if (!contact) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient contact not found",
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: contact
      };
    } catch (error) {
      logger.error("Error fetching patient contact:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Create a new contact for a patient
   * POST /patients/:patientId/contacts
   */
  async createContact(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      // Validate data
      const errors = this.validateContactData(data);
      if (errors.length > 0) {
        reply.code(400);
        return {
          status: 400,
          message: "Validation failed",
          errors
        };
      }

      // Verify patient exists
      const patientResult = await db.select({ id: patients.id })
        .from(patients)
        .where(eq(patients.id, patientId))
        .limit(1);

      if (!patientResult[0]) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient not found"
        };
      }

      // If this is marked as primary, unset other primary contacts of the same type
      if (data.is_primary) {
        await db.update(patient_contacts)
          .set({ is_primary: false, updatedAt: new Date() })
          .where(and(
            eq(patient_contacts.patient_id, patientId),
            eq(patient_contacts.contact_type, data.contact_type || 'EMERGENCY'),
            eq(patient_contacts.is_primary, true),
            isNull(patient_contacts.deleted_at)
          ));
      }

      // Create the contact
      const contactData = {
        patient_id: patientId,
        contact_type: data.contact_type || 'EMERGENCY',
        first_name: data.first_name,
        last_name: data.last_name,
        middle_name: data.middle_name || null,
        suffix: data.suffix || null,
        preferred_name: data.preferred_name || null,
        relationship: data.relationship,
        relationship_detail: data.relationship_detail || null,
        primary_phone: data.primary_phone,
        primary_phone_type: data.primary_phone_type || 'MOBILE',
        secondary_phone: data.secondary_phone || null,
        secondary_phone_type: data.secondary_phone_type || null,
        email: data.email || null,
        address_line_1: data.address_line_1 || null,
        address_line_2: data.address_line_2 || null,
        city: data.city || null,
        state: data.state || null,
        zip_code: data.zip_code || null,
        country: data.country || 'USA',
        preferred_contact_method: data.preferred_contact_method || 'PHONE',
        preferred_contact_time: data.preferred_contact_time || null,
        preferred_language: data.preferred_language || null,
        priority: data.priority || 1,
        is_primary: data.is_primary || false,
        is_active: data.is_active !== undefined ? data.is_active : true,
        authorized_for_phi: data.authorized_for_phi || false,
        authorized_for_decisions: data.authorized_for_decisions || false,
        has_key_to_home: data.has_key_to_home || false,
        lives_with_patient: data.lives_with_patient || false,
        healthcare_proxy_document: data.healthcare_proxy_document || false,
        power_of_attorney: data.power_of_attorney || false,
        document_date: data.document_date || null,
        notes: data.notes || null,
        special_instructions: data.special_instructions || null,
        created_by_id: request.user?.id || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(patient_contacts)
        .values(contactData)
        .returning();

      reply.code(201);
      return {
        status: 201,
        data: result[0],
        message: "Patient contact created successfully"
      };
    } catch (error) {
      logger.error("Error creating patient contact:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Update an existing contact
   * PUT /patients/:patientId/contacts/:id
   */
  async updateContact(request, reply) {
    try {
      const { patientId, id } = request.params;
      const data = request.body;

      // Check if contact exists
      const existingContacts = await db.select()
        .from(patient_contacts)
        .where(and(
          eq(patient_contacts.id, id),
          eq(patient_contacts.patient_id, patientId),
          isNull(patient_contacts.deleted_at)
        ))
        .limit(1);

      const existingContact = existingContacts[0];

      if (!existingContact) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient contact not found",
        };
      }

      // Validate data if key fields are being changed
      if (data.first_name || data.last_name || data.relationship || data.primary_phone) {
        const validationData = {
          first_name: data.first_name || existingContact.first_name,
          last_name: data.last_name || existingContact.last_name,
          relationship: data.relationship || existingContact.relationship,
          primary_phone: data.primary_phone || existingContact.primary_phone,
          contact_type: data.contact_type,
          primary_phone_type: data.primary_phone_type,
          secondary_phone_type: data.secondary_phone_type,
          preferred_contact_method: data.preferred_contact_method,
          state: data.state,
          email: data.email
        };
        const errors = this.validateContactData(validationData);
        if (errors.length > 0) {
          reply.code(400);
          return {
            status: 400,
            message: "Validation failed",
            errors
          };
        }
      }

      // If this is being marked as primary, unset other primary contacts of the same type
      const contactType = data.contact_type || existingContact.contact_type;
      if (data.is_primary === true) {
        await db.update(patient_contacts)
          .set({ is_primary: false, updatedAt: new Date() })
          .where(and(
            eq(patient_contacts.patient_id, patientId),
            eq(patient_contacts.contact_type, contactType),
            eq(patient_contacts.is_primary, true),
            isNull(patient_contacts.deleted_at)
          ));
      }

      // Build update data
      const updateData = {
        ...data,
        updated_by_id: request.user?.id || null,
        updatedAt: new Date()
      };

      // Remove fields that shouldn't be updated directly
      delete updateData.id;
      delete updateData.patient_id;
      delete updateData.created_by_id;
      delete updateData.createdAt;
      delete updateData.deleted_at;

      const result = await db.update(patient_contacts)
        .set(updateData)
        .where(eq(patient_contacts.id, id))
        .returning();

      reply.code(200);
      return {
        status: 200,
        data: result[0],
        message: "Patient contact updated successfully"
      };
    } catch (error) {
      logger.error("Error updating patient contact:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Soft delete a contact
   * DELETE /patients/:patientId/contacts/:id
   */
  async deleteContact(request, reply) {
    try {
      const { patientId, id } = request.params;

      // Check if contact exists
      const existingContacts = await db.select()
        .from(patient_contacts)
        .where(and(
          eq(patient_contacts.id, id),
          eq(patient_contacts.patient_id, patientId),
          isNull(patient_contacts.deleted_at)
        ))
        .limit(1);

      const existingContact = existingContacts[0];

      if (!existingContact) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient contact not found",
        };
      }

      // Soft delete
      await db.update(patient_contacts)
        .set({
          deleted_at: new Date(),
          is_active: false,
          updated_by_id: request.user?.id || null,
          updatedAt: new Date()
        })
        .where(eq(patient_contacts.id, id));

      reply.code(200);
      return {
        status: 200,
        message: "Patient contact deleted successfully"
      };
    } catch (error) {
      logger.error("Error deleting patient contact:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Set a contact as primary for its type
   * POST /patients/:patientId/contacts/:id/set-primary
   */
  async setPrimaryContact(request, reply) {
    try {
      const { patientId, id } = request.params;

      // Check if contact exists
      const existingContacts = await db.select()
        .from(patient_contacts)
        .where(and(
          eq(patient_contacts.id, id),
          eq(patient_contacts.patient_id, patientId),
          isNull(patient_contacts.deleted_at)
        ))
        .limit(1);

      const existingContact = existingContacts[0];

      if (!existingContact) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient contact not found",
        };
      }

      // Unset other primary contacts of the same type
      await db.update(patient_contacts)
        .set({ is_primary: false, updatedAt: new Date() })
        .where(and(
          eq(patient_contacts.patient_id, patientId),
          eq(patient_contacts.contact_type, existingContact.contact_type),
          eq(patient_contacts.is_primary, true),
          isNull(patient_contacts.deleted_at)
        ));

      // Set this contact as primary
      const result = await db.update(patient_contacts)
        .set({
          is_primary: true,
          updated_by_id: request.user?.id || null,
          updatedAt: new Date()
        })
        .where(eq(patient_contacts.id, id))
        .returning();

      reply.code(200);
      return {
        status: 200,
        data: result[0],
        message: "Contact set as primary successfully"
      };
    } catch (error) {
      logger.error("Error setting primary contact:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Get emergency contacts only (convenience endpoint)
   * GET /patients/:patientId/emergency-contacts
   */
  async getEmergencyContacts(request, reply) {
    try {
      const { patientId } = request.params;

      const contacts = await db.select()
        .from(patient_contacts)
        .where(and(
          eq(patient_contacts.patient_id, patientId),
          eq(patient_contacts.contact_type, 'EMERGENCY'),
          eq(patient_contacts.is_active, true),
          isNull(patient_contacts.deleted_at)
        ))
        .orderBy(asc(patient_contacts.priority), desc(patient_contacts.is_primary));

      reply.code(200);
      return {
        status: 200,
        data: contacts,
        count: contacts.length
      };
    } catch (error) {
      logger.error("Error fetching emergency contacts:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  // Legacy methods for backwards compatibility with old routes
  async index(request, reply) {
    try {
      const contacts = await db.select()
        .from(patient_contacts)
        .where(isNull(patient_contacts.deleted_at))
        .orderBy(asc(patient_contacts.priority));

      reply.code(200);
      return contacts;
    } catch (error) {
      logger.error("Error fetching patient contacts:", error);
      reply.code(500);
      return {
        message: "Internal server error",
        error: error.message,
      };
    }
  }

  async store(request, reply) {
    try {
      const data = request.body;

      // Validate data
      const errors = this.validateContactData(data);
      if (errors.length > 0) {
        reply.code(400);
        return {
          message: "Validation failed",
          errors
        };
      }

      const result = await db.insert(patient_contacts)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      reply.code(201);
      return result[0];
    } catch (error) {
      logger.error("Error creating patient contact:", error);
      reply.code(500);
      return {
        message: "Internal server error",
        error: error.message,
      };
    }
  }

  async show(request, reply) {
    try {
      const { id } = request.params;
      const contacts = await db.select()
        .from(patient_contacts)
        .where(and(
          eq(patient_contacts.id, id),
          isNull(patient_contacts.deleted_at)
        ))
        .limit(1);

      const contact = contacts[0];

      if (!contact) {
        reply.code(404);
        return { message: "Patient contact not found" };
      }

      reply.code(200);
      return contact;
    } catch (error) {
      logger.error("Error fetching patient contact:", error);
      reply.code(500);
      return {
        message: "Internal server error",
        error: error.message,
      };
    }
  }

  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const existingContacts = await db.select()
        .from(patient_contacts)
        .where(and(
          eq(patient_contacts.id, id),
          isNull(patient_contacts.deleted_at)
        ))
        .limit(1);

      const existingContact = existingContacts[0];

      if (!existingContact) {
        reply.code(404);
        return { message: "Patient contact not found" };
      }

      const result = await db.update(patient_contacts)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(patient_contacts.id, id))
        .returning();

      reply.code(200);
      return result[0];
    } catch (error) {
      logger.error("Error updating patient contact:", error);
      reply.code(500);
      return {
        message: "Internal server error",
        error: error.message,
      };
    }
  }

  async destroy(request, reply) {
    try {
      const { id } = request.params;

      const existingContacts = await db.select()
        .from(patient_contacts)
        .where(and(
          eq(patient_contacts.id, id),
          isNull(patient_contacts.deleted_at)
        ))
        .limit(1);

      const existingContact = existingContacts[0];

      if (!existingContact) {
        reply.code(404);
        return { message: "Patient contact not found" };
      }

      // Soft delete
      await db.update(patient_contacts)
        .set({ deleted_at: new Date(), is_active: false, updatedAt: new Date() })
        .where(eq(patient_contacts.id, id));

      reply.code(204);
      return null;
    } catch (error) {
      logger.error("Error deleting patient contact:", error);
      reply.code(500);
      return {
        message: "Internal server error",
        error: error.message,
      };
    }
  }
}

export default new PatientContactsController();
