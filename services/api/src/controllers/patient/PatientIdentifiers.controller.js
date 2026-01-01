import { db } from "../../config/db.drizzle.js";
import { patient_identifiers } from "../../db/schemas/patientIdentifier.schema.js";
import { patients } from "../../db/schemas/patient.schema.js";
import { eq, and, isNull, desc } from "drizzle-orm";
import { logger } from '../../utils/logger.js';

// Valid identifier types
const VALID_IDENTIFIER_TYPES = ['MRN', 'SSN', 'MEDICARE', 'MEDICAID', 'INSURANCE', 'NPI', 'OTHER'];

// Valid US state codes for issuing_state
const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
];

class PatientIdentifiersController {
  /**
   * Validate identifier data
   */
  validateIdentifierData(data) {
    const errors = [];

    if (!data.identifier_type) {
      errors.push('identifier_type is required');
    } else if (!VALID_IDENTIFIER_TYPES.includes(data.identifier_type)) {
      errors.push(`identifier_type must be one of: ${VALID_IDENTIFIER_TYPES.join(', ')}`);
    }

    if (!data.identifier_value) {
      errors.push('identifier_value is required');
    }

    if (data.issuing_state && !US_STATE_CODES.includes(data.issuing_state)) {
      errors.push('issuing_state must be a valid US state code');
    }

    return errors;
  }

  /**
   * Get all identifiers for a patient
   * GET /patients/:patientId/identifiers
   */
  async getPatientIdentifiers(request, reply) {
    try {
      const { patientId } = request.params;
      const { type, active_only } = request.query;

      // Build query conditions
      let conditions = [
        eq(patient_identifiers.patient_id, patientId),
        isNull(patient_identifiers.deleted_at)
      ];

      // Filter by type if specified
      if (type) {
        conditions.push(eq(patient_identifiers.identifier_type, type));
      }

      // Filter by active status if specified
      if (active_only === 'true') {
        conditions.push(eq(patient_identifiers.is_active, true));
      }

      const identifiers = await db.select()
        .from(patient_identifiers)
        .where(and(...conditions))
        .orderBy(desc(patient_identifiers.is_primary), desc(patient_identifiers.createdAt));

      reply.code(200);
      return {
        status: 200,
        data: identifiers,
        count: identifiers.length
      };
    } catch (error) {
      logger.error("Error fetching patient identifiers:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Get a specific identifier by ID
   * GET /patients/:patientId/identifiers/:id
   */
  async getIdentifier(request, reply) {
    try {
      const { patientId, id } = request.params;

      const identifiers = await db.select()
        .from(patient_identifiers)
        .where(and(
          eq(patient_identifiers.id, id),
          eq(patient_identifiers.patient_id, patientId),
          isNull(patient_identifiers.deleted_at)
        ))
        .limit(1);

      const identifier = identifiers[0];

      if (!identifier) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient identifier not found",
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: identifier
      };
    } catch (error) {
      logger.error("Error fetching patient identifier:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Create a new identifier for a patient
   * POST /patients/:patientId/identifiers
   */
  async createIdentifier(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      // Validate data
      const errors = this.validateIdentifierData(data);
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

      // If this is marked as primary, unset other primary identifiers of the same type
      if (data.is_primary) {
        await db.update(patient_identifiers)
          .set({ is_primary: false, updatedAt: new Date() })
          .where(and(
            eq(patient_identifiers.patient_id, patientId),
            eq(patient_identifiers.identifier_type, data.identifier_type),
            eq(patient_identifiers.is_primary, true),
            isNull(patient_identifiers.deleted_at)
          ));
      }

      // Create the identifier
      const identifierData = {
        patient_id: patientId,
        identifier_type: data.identifier_type,
        identifier_value: data.identifier_value,
        facility_id: data.facility_id || null,
        facility_name: data.facility_name || null,
        issuing_authority: data.issuing_authority || null,
        issuing_state: data.issuing_state || null,
        is_primary: data.is_primary || false,
        is_active: data.is_active !== undefined ? data.is_active : true,
        is_verified: data.is_verified || false,
        effective_from: data.effective_from || null,
        effective_to: data.effective_to || null,
        notes: data.notes || null,
        created_by_id: request.user?.id || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(patient_identifiers)
        .values(identifierData)
        .returning();

      reply.code(201);
      return {
        status: 201,
        data: result[0],
        message: "Patient identifier created successfully"
      };
    } catch (error) {
      logger.error("Error creating patient identifier:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Update an existing identifier
   * PUT /patients/:patientId/identifiers/:id
   */
  async updateIdentifier(request, reply) {
    try {
      const { patientId, id } = request.params;
      const data = request.body;

      // Check if identifier exists
      const existingIdentifiers = await db.select()
        .from(patient_identifiers)
        .where(and(
          eq(patient_identifiers.id, id),
          eq(patient_identifiers.patient_id, patientId),
          isNull(patient_identifiers.deleted_at)
        ))
        .limit(1);

      const existingIdentifier = existingIdentifiers[0];

      if (!existingIdentifier) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient identifier not found",
        };
      }

      // Validate data if type or value are being changed
      if (data.identifier_type || data.identifier_value) {
        const validationData = {
          identifier_type: data.identifier_type || existingIdentifier.identifier_type,
          identifier_value: data.identifier_value || existingIdentifier.identifier_value,
          issuing_state: data.issuing_state
        };
        const errors = this.validateIdentifierData(validationData);
        if (errors.length > 0) {
          reply.code(400);
          return {
            status: 400,
            message: "Validation failed",
            errors
          };
        }
      }

      // If this is being marked as primary, unset other primary identifiers of the same type
      const identifierType = data.identifier_type || existingIdentifier.identifier_type;
      if (data.is_primary === true) {
        await db.update(patient_identifiers)
          .set({ is_primary: false, updatedAt: new Date() })
          .where(and(
            eq(patient_identifiers.patient_id, patientId),
            eq(patient_identifiers.identifier_type, identifierType),
            eq(patient_identifiers.is_primary, true),
            isNull(patient_identifiers.deleted_at)
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

      const result = await db.update(patient_identifiers)
        .set(updateData)
        .where(eq(patient_identifiers.id, id))
        .returning();

      reply.code(200);
      return {
        status: 200,
        data: result[0],
        message: "Patient identifier updated successfully"
      };
    } catch (error) {
      logger.error("Error updating patient identifier:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Soft delete an identifier
   * DELETE /patients/:patientId/identifiers/:id
   */
  async deleteIdentifier(request, reply) {
    try {
      const { patientId, id } = request.params;

      // Check if identifier exists
      const existingIdentifiers = await db.select()
        .from(patient_identifiers)
        .where(and(
          eq(patient_identifiers.id, id),
          eq(patient_identifiers.patient_id, patientId),
          isNull(patient_identifiers.deleted_at)
        ))
        .limit(1);

      const existingIdentifier = existingIdentifiers[0];

      if (!existingIdentifier) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient identifier not found",
        };
      }

      // Soft delete
      await db.update(patient_identifiers)
        .set({
          deleted_at: new Date(),
          is_active: false,
          updated_by_id: request.user?.id || null,
          updatedAt: new Date()
        })
        .where(eq(patient_identifiers.id, id));

      reply.code(200);
      return {
        status: 200,
        message: "Patient identifier deleted successfully"
      };
    } catch (error) {
      logger.error("Error deleting patient identifier:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Set an identifier as primary for its type
   * POST /patients/:patientId/identifiers/:id/set-primary
   */
  async setPrimaryIdentifier(request, reply) {
    try {
      const { patientId, id } = request.params;

      // Check if identifier exists
      const existingIdentifiers = await db.select()
        .from(patient_identifiers)
        .where(and(
          eq(patient_identifiers.id, id),
          eq(patient_identifiers.patient_id, patientId),
          isNull(patient_identifiers.deleted_at)
        ))
        .limit(1);

      const existingIdentifier = existingIdentifiers[0];

      if (!existingIdentifier) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient identifier not found",
        };
      }

      // Unset other primary identifiers of the same type
      await db.update(patient_identifiers)
        .set({ is_primary: false, updatedAt: new Date() })
        .where(and(
          eq(patient_identifiers.patient_id, patientId),
          eq(patient_identifiers.identifier_type, existingIdentifier.identifier_type),
          eq(patient_identifiers.is_primary, true),
          isNull(patient_identifiers.deleted_at)
        ));

      // Set this identifier as primary
      const result = await db.update(patient_identifiers)
        .set({
          is_primary: true,
          updated_by_id: request.user?.id || null,
          updatedAt: new Date()
        })
        .where(eq(patient_identifiers.id, id))
        .returning();

      reply.code(200);
      return {
        status: 200,
        data: result[0],
        message: "Identifier set as primary successfully"
      };
    } catch (error) {
      logger.error("Error setting primary identifier:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Verify an identifier
   * POST /patients/:patientId/identifiers/:id/verify
   */
  async verifyIdentifier(request, reply) {
    try {
      const { patientId, id } = request.params;
      const { verification_method, verification_notes } = request.body;

      // Check if identifier exists
      const existingIdentifiers = await db.select()
        .from(patient_identifiers)
        .where(and(
          eq(patient_identifiers.id, id),
          eq(patient_identifiers.patient_id, patientId),
          isNull(patient_identifiers.deleted_at)
        ))
        .limit(1);

      const existingIdentifier = existingIdentifiers[0];

      if (!existingIdentifier) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient identifier not found",
        };
      }

      // Mark as verified
      const result = await db.update(patient_identifiers)
        .set({
          is_verified: true,
          verified_at: new Date(),
          verified_by_id: request.user?.id || null,
          verification_method: verification_method || null,
          verification_notes: verification_notes || null,
          updated_by_id: request.user?.id || null,
          updatedAt: new Date()
        })
        .where(eq(patient_identifiers.id, id))
        .returning();

      reply.code(200);
      return {
        status: 200,
        data: result[0],
        message: "Identifier verified successfully"
      };
    } catch (error) {
      logger.error("Error verifying identifier:", error);
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
      const identifiers = await db.select()
        .from(patient_identifiers)
        .where(isNull(patient_identifiers.deleted_at));

      reply.code(200);
      return identifiers;
    } catch (error) {
      logger.error("Error fetching patient identifiers:", error);
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
      const errors = this.validateIdentifierData(data);
      if (errors.length > 0) {
        reply.code(400);
        return {
          message: "Validation failed",
          errors
        };
      }

      const result = await db.insert(patient_identifiers)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      reply.code(201);
      return result[0];
    } catch (error) {
      logger.error("Error creating patient identifier:", error);
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
      const identifiers = await db.select()
        .from(patient_identifiers)
        .where(and(
          eq(patient_identifiers.id, id),
          isNull(patient_identifiers.deleted_at)
        ))
        .limit(1);

      const identifier = identifiers[0];

      if (!identifier) {
        reply.code(404);
        return { message: "Patient identifier not found" };
      }

      reply.code(200);
      return identifier;
    } catch (error) {
      logger.error("Error fetching patient identifier:", error);
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

      const existingIdentifiers = await db.select()
        .from(patient_identifiers)
        .where(and(
          eq(patient_identifiers.id, id),
          isNull(patient_identifiers.deleted_at)
        ))
        .limit(1);

      const existingIdentifier = existingIdentifiers[0];

      if (!existingIdentifier) {
        reply.code(404);
        return { message: "Patient identifier not found" };
      }

      const result = await db.update(patient_identifiers)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(patient_identifiers.id, id))
        .returning();

      reply.code(200);
      return result[0];
    } catch (error) {
      logger.error("Error updating patient identifier:", error);
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

      const existingIdentifiers = await db.select()
        .from(patient_identifiers)
        .where(and(
          eq(patient_identifiers.id, id),
          isNull(patient_identifiers.deleted_at)
        ))
        .limit(1);

      const existingIdentifier = existingIdentifiers[0];

      if (!existingIdentifier) {
        reply.code(404);
        return { message: "Patient identifier not found" };
      }

      // Soft delete
      await db.update(patient_identifiers)
        .set({ deleted_at: new Date(), is_active: false, updatedAt: new Date() })
        .where(eq(patient_identifiers.id, id));

      reply.code(204);
      return null;
    } catch (error) {
      logger.error("Error deleting patient identifier:", error);
      reply.code(500);
      return {
        message: "Internal server error",
        error: error.message,
      };
    }
  }
}

export default new PatientIdentifiersController();
