import { db } from "../../config/db.drizzle.js";
import { patient_payers } from "../../db/schemas/patientPayer.schema.js";
import { patients } from "../../db/schemas/patient.schema.js";
import { eq, and, isNull, desc, asc } from "drizzle-orm";
import { logger } from '../../utils/logger.js';

// Valid payer types
const VALID_PAYER_TYPES = [
  'MEDICARE',
  'MEDICAID',
  'COMMERCIAL',
  'MANAGED_CARE',
  'TRICARE',
  'CHAMPVA',
  'WORKERS_COMP',
  'AUTO',
  'SELF_PAY',
  'OTHER'
];

// Valid subscriber relationships
const VALID_RELATIONSHIPS = ['SELF', 'SPOUSE', 'CHILD', 'OTHER'];

// Valid US state codes
const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
];

class PatientPayerController {
  /**
   * Validate payer data
   */
  validatePayerData(data, isUpdate = false) {
    const errors = [];

    // Required fields for create
    if (!isUpdate) {
      if (!data.payer_type) {
        errors.push('payer_type is required');
      }
      if (!data.payer_name) {
        errors.push('payer_name is required');
      }
    }

    // Validate payer_type if provided
    if (data.payer_type && !VALID_PAYER_TYPES.includes(data.payer_type)) {
      errors.push(`payer_type must be one of: ${VALID_PAYER_TYPES.join(', ')}`);
    }

    // Validate payer_order if provided
    if (data.payer_order !== undefined && (data.payer_order < 1 || data.payer_order > 10)) {
      errors.push('payer_order must be between 1 and 10');
    }

    // Validate subscriber_relationship if provided
    if (data.subscriber_relationship && !VALID_RELATIONSHIPS.includes(data.subscriber_relationship)) {
      errors.push(`subscriber_relationship must be one of: ${VALID_RELATIONSHIPS.join(', ')}`);
    }

    // Validate state codes if provided
    if (data.payer_state && !US_STATE_CODES.includes(data.payer_state)) {
      errors.push('payer_state must be a valid US state code');
    }
    if (data.medicaid_state && !US_STATE_CODES.includes(data.medicaid_state)) {
      errors.push('medicaid_state must be a valid US state code');
    }

    // Validate Medicare beneficiary ID format (11 characters, alphanumeric)
    if (data.medicare_beneficiary_id) {
      const mbiRegex = /^[0-9][A-Z][A-Z0-9][0-9][A-Z][A-Z0-9][0-9][A-Z][A-Z][0-9][0-9]$/;
      if (!mbiRegex.test(data.medicare_beneficiary_id)) {
        errors.push('medicare_beneficiary_id must be a valid 11-character MBI format');
      }
    }

    return errors;
  }

  /**
   * Get all payers for a patient
   * GET /patients/:patientId/payers
   */
  async getPatientPayers(request, reply) {
    try {
      const { patientId } = request.params;
      const { type, active_only, primary_only } = request.query;

      // Build query conditions
      let conditions = [
        eq(patient_payers.patient_id, patientId),
        isNull(patient_payers.deleted_at)
      ];

      // Filter by payer type if specified
      if (type) {
        conditions.push(eq(patient_payers.payer_type, type));
      }

      // Filter by active status if specified
      if (active_only === 'true') {
        conditions.push(eq(patient_payers.is_active, true));
      }

      // Filter by primary status if specified
      if (primary_only === 'true') {
        conditions.push(eq(patient_payers.is_primary, true));
      }

      const payers = await db.select()
        .from(patient_payers)
        .where(and(...conditions))
        .orderBy(asc(patient_payers.payer_order), desc(patient_payers.is_primary), desc(patient_payers.createdAt));

      reply.code(200);
      return {
        status: 200,
        data: payers,
        count: payers.length
      };
    } catch (error) {
      logger.error("Error fetching patient payers:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Get a specific payer by ID
   * GET /patients/:patientId/payers/:id
   */
  async getPayer(request, reply) {
    try {
      const { patientId, id } = request.params;

      const payers = await db.select()
        .from(patient_payers)
        .where(and(
          eq(patient_payers.id, id),
          eq(patient_payers.patient_id, patientId),
          isNull(patient_payers.deleted_at)
        ))
        .limit(1);

      const payer = payers[0];

      if (!payer) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient payer not found",
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: payer
      };
    } catch (error) {
      logger.error("Error fetching patient payer:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Get primary payer for a patient
   * GET /patients/:patientId/payers/primary
   */
  async getPrimaryPayer(request, reply) {
    try {
      const { patientId } = request.params;

      const payers = await db.select()
        .from(patient_payers)
        .where(and(
          eq(patient_payers.patient_id, patientId),
          eq(patient_payers.is_primary, true),
          eq(patient_payers.is_active, true),
          isNull(patient_payers.deleted_at)
        ))
        .limit(1);

      const payer = payers[0];

      if (!payer) {
        // Try to get the first active payer by order
        const fallbackPayers = await db.select()
          .from(patient_payers)
          .where(and(
            eq(patient_payers.patient_id, patientId),
            eq(patient_payers.is_active, true),
            isNull(patient_payers.deleted_at)
          ))
          .orderBy(asc(patient_payers.payer_order))
          .limit(1);

        const fallbackPayer = fallbackPayers[0];
        if (!fallbackPayer) {
          reply.code(404);
          return {
            status: 404,
            message: "No active payer found for this patient",
          };
        }

        reply.code(200);
        return {
          status: 200,
          data: fallbackPayer,
          message: "No primary payer set, returning first active payer"
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: payer
      };
    } catch (error) {
      logger.error("Error fetching primary payer:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Create a new payer for a patient
   * POST /patients/:patientId/payers
   */
  async createPayer(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      // Validate data
      const errors = this.validatePayerData(data);
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

      // If this is marked as primary, unset other primary payers
      if (data.is_primary) {
        await db.update(patient_payers)
          .set({ is_primary: false, updatedAt: new Date() })
          .where(and(
            eq(patient_payers.patient_id, patientId),
            eq(patient_payers.is_primary, true),
            isNull(patient_payers.deleted_at)
          ));
      }

      // Prepare payer data
      const payerData = {
        patient_id: patientId,
        payer_type: data.payer_type,
        payer_order: data.payer_order || 1,
        payer_name: data.payer_name,
        payer_id: data.payer_id || null,
        payer_phone: data.payer_phone || null,
        payer_fax: data.payer_fax || null,
        payer_email: data.payer_email || null,
        payer_website: data.payer_website || null,
        payer_address_line1: data.payer_address_line1 || null,
        payer_address_line2: data.payer_address_line2 || null,
        payer_city: data.payer_city || null,
        payer_state: data.payer_state || null,
        payer_zip: data.payer_zip || null,
        payer_country: data.payer_country || 'USA',
        policy_number: data.policy_number || null,
        group_number: data.group_number || null,
        group_name: data.group_name || null,
        plan_name: data.plan_name || null,
        plan_type: data.plan_type || null,
        subscriber_id: data.subscriber_id || null,
        subscriber_name: data.subscriber_name || null,
        subscriber_dob: data.subscriber_dob || null,
        subscriber_relationship: data.subscriber_relationship || null,
        subscriber_ssn: data.subscriber_ssn || null,
        medicare_beneficiary_id: data.medicare_beneficiary_id || null,
        medicare_part_a_effective: data.medicare_part_a_effective || null,
        medicare_part_b_effective: data.medicare_part_b_effective || null,
        medicare_hospice_election_date: data.medicare_hospice_election_date || null,
        medicare_advantage_plan: data.medicare_advantage_plan || false,
        medicare_advantage_plan_name: data.medicare_advantage_plan_name || null,
        medicaid_id: data.medicaid_id || null,
        medicaid_state: data.medicaid_state || null,
        medicaid_plan_name: data.medicaid_plan_name || null,
        is_dual_eligible: data.is_dual_eligible || false,
        effective_date: data.effective_date || null,
        termination_date: data.termination_date || null,
        authorization_number: data.authorization_number || null,
        authorization_start_date: data.authorization_start_date || null,
        authorization_end_date: data.authorization_end_date || null,
        authorization_units: data.authorization_units || null,
        authorization_notes: data.authorization_notes || null,
        cob_order: data.cob_order || null,
        accepts_assignment: data.accepts_assignment !== undefined ? data.accepts_assignment : true,
        assignment_of_benefits: data.assignment_of_benefits !== undefined ? data.assignment_of_benefits : true,
        is_verified: data.is_verified || false,
        eligibility_status: data.eligibility_status || 'UNKNOWN',
        is_active: data.is_active !== undefined ? data.is_active : true,
        is_primary: data.is_primary || false,
        notes: data.notes || null,
        internal_notes: data.internal_notes || null,
        created_by_id: request.user?.id || null,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      const result = await db.insert(patient_payers)
        .values(payerData)
        .returning();

      reply.code(201);
      return {
        status: 201,
        data: result[0],
        message: "Patient payer created successfully"
      };
    } catch (error) {
      logger.error("Error creating patient payer:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Update an existing payer
   * PUT /patients/:patientId/payers/:id
   */
  async updatePayer(request, reply) {
    try {
      const { patientId, id } = request.params;
      const data = request.body;

      // Check if payer exists
      const existingPayers = await db.select()
        .from(patient_payers)
        .where(and(
          eq(patient_payers.id, id),
          eq(patient_payers.patient_id, patientId),
          isNull(patient_payers.deleted_at)
        ))
        .limit(1);

      const existingPayer = existingPayers[0];

      if (!existingPayer) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient payer not found",
        };
      }

      // Validate data
      const errors = this.validatePayerData(data, true);
      if (errors.length > 0) {
        reply.code(400);
        return {
          status: 400,
          message: "Validation failed",
          errors
        };
      }

      // If this is being marked as primary, unset other primary payers
      if (data.is_primary === true && !existingPayer.is_primary) {
        await db.update(patient_payers)
          .set({ is_primary: false, updatedAt: new Date() })
          .where(and(
            eq(patient_payers.patient_id, patientId),
            eq(patient_payers.is_primary, true),
            isNull(patient_payers.deleted_at)
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

      const result = await db.update(patient_payers)
        .set(updateData)
        .where(eq(patient_payers.id, id))
        .returning();

      reply.code(200);
      return {
        status: 200,
        data: result[0],
        message: "Patient payer updated successfully"
      };
    } catch (error) {
      logger.error("Error updating patient payer:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Soft delete a payer
   * DELETE /patients/:patientId/payers/:id
   */
  async deletePayer(request, reply) {
    try {
      const { patientId, id } = request.params;

      // Check if payer exists
      const existingPayers = await db.select()
        .from(patient_payers)
        .where(and(
          eq(patient_payers.id, id),
          eq(patient_payers.patient_id, patientId),
          isNull(patient_payers.deleted_at)
        ))
        .limit(1);

      const existingPayer = existingPayers[0];

      if (!existingPayer) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient payer not found",
        };
      }

      // Soft delete
      await db.update(patient_payers)
        .set({
          deleted_at: new Date(),
          is_active: false,
          is_primary: false,
          updated_by_id: request.user?.id || null,
          updatedAt: new Date()
        })
        .where(eq(patient_payers.id, id));

      reply.code(200);
      return {
        status: 200,
        message: "Patient payer deleted successfully"
      };
    } catch (error) {
      logger.error("Error deleting patient payer:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Set a payer as primary
   * POST /patients/:patientId/payers/:id/set-primary
   */
  async setPrimaryPayer(request, reply) {
    try {
      const { patientId, id } = request.params;

      // Check if payer exists
      const existingPayers = await db.select()
        .from(patient_payers)
        .where(and(
          eq(patient_payers.id, id),
          eq(patient_payers.patient_id, patientId),
          isNull(patient_payers.deleted_at)
        ))
        .limit(1);

      const existingPayer = existingPayers[0];

      if (!existingPayer) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient payer not found",
        };
      }

      // Unset other primary payers
      await db.update(patient_payers)
        .set({ is_primary: false, updatedAt: new Date() })
        .where(and(
          eq(patient_payers.patient_id, patientId),
          eq(patient_payers.is_primary, true),
          isNull(patient_payers.deleted_at)
        ));

      // Set this payer as primary
      const result = await db.update(patient_payers)
        .set({
          is_primary: true,
          payer_order: 1, // Primary should be order 1
          updated_by_id: request.user?.id || null,
          updatedAt: new Date()
        })
        .where(eq(patient_payers.id, id))
        .returning();

      reply.code(200);
      return {
        status: 200,
        data: result[0],
        message: "Payer set as primary successfully"
      };
    } catch (error) {
      logger.error("Error setting primary payer:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Verify payer eligibility
   * POST /patients/:patientId/payers/:id/verify
   */
  async verifyPayer(request, reply) {
    try {
      const { patientId, id } = request.params;
      const { verification_method, verification_response, eligibility_status } = request.body;

      // Check if payer exists
      const existingPayers = await db.select()
        .from(patient_payers)
        .where(and(
          eq(patient_payers.id, id),
          eq(patient_payers.patient_id, patientId),
          isNull(patient_payers.deleted_at)
        ))
        .limit(1);

      const existingPayer = existingPayers[0];

      if (!existingPayer) {
        reply.code(404);
        return {
          status: 404,
          message: "Patient payer not found",
        };
      }

      // Mark as verified
      const result = await db.update(patient_payers)
        .set({
          is_verified: true,
          verified_at: new Date(),
          verified_by_id: request.user?.id || null,
          verification_method: verification_method || null,
          verification_response: verification_response || null,
          last_eligibility_check: new Date(),
          eligibility_status: eligibility_status || 'ACTIVE',
          updated_by_id: request.user?.id || null,
          updatedAt: new Date()
        })
        .where(eq(patient_payers.id, id))
        .returning();

      reply.code(200);
      return {
        status: 200,
        data: result[0],
        message: "Payer verified successfully"
      };
    } catch (error) {
      logger.error("Error verifying payer:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  /**
   * Update payer order (for coordination of benefits)
   * POST /patients/:patientId/payers/reorder
   */
  async reorderPayers(request, reply) {
    try {
      const { patientId } = request.params;
      const { payer_orders } = request.body; // Array of { id, order }

      if (!Array.isArray(payer_orders) || payer_orders.length === 0) {
        reply.code(400);
        return {
          status: 400,
          message: "payer_orders must be a non-empty array"
        };
      }

      // Verify all payers belong to this patient
      for (const item of payer_orders) {
        const existingPayers = await db.select()
          .from(patient_payers)
          .where(and(
            eq(patient_payers.id, item.id),
            eq(patient_payers.patient_id, patientId),
            isNull(patient_payers.deleted_at)
          ))
          .limit(1);

        if (!existingPayers[0]) {
          reply.code(404);
          return {
            status: 404,
            message: `Payer with id ${item.id} not found for this patient`
          };
        }
      }

      // Update orders
      for (const item of payer_orders) {
        await db.update(patient_payers)
          .set({
            payer_order: item.order,
            cob_order: item.order,
            updated_by_id: request.user?.id || null,
            updatedAt: new Date()
          })
          .where(eq(patient_payers.id, item.id));
      }

      // Fetch updated payers
      const payers = await db.select()
        .from(patient_payers)
        .where(and(
          eq(patient_payers.patient_id, patientId),
          isNull(patient_payers.deleted_at)
        ))
        .orderBy(asc(patient_payers.payer_order));

      reply.code(200);
      return {
        status: 200,
        data: payers,
        message: "Payer order updated successfully"
      };
    } catch (error) {
      logger.error("Error reordering payers:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Internal server error",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined,
      };
    }
  }

  // Legacy methods for backwards compatibility
  async index(request, reply) {
    try {
      const payers = await db.select()
        .from(patient_payers)
        .where(isNull(patient_payers.deleted_at))
        .orderBy(asc(patient_payers.payer_order));

      reply.code(200);
      return payers;
    } catch (error) {
      logger.error("Error fetching patient payers:", error);
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

      // Validate required fields
      if (!data.patient_id) {
        reply.code(400);
        return {
          message: "patient_id is required",
        };
      }

      const errors = this.validatePayerData(data);
      if (errors.length > 0) {
        reply.code(400);
        return {
          message: "Validation failed",
          errors
        };
      }

      const result = await db.insert(patient_payers)
        .values({
          ...data,
          createdAt: new Date(),
          updatedAt: new Date()
        })
        .returning();

      reply.code(201);
      return result[0];
    } catch (error) {
      logger.error("Error creating patient payer:", error);
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
      const payers = await db.select()
        .from(patient_payers)
        .where(and(
          eq(patient_payers.id, id),
          isNull(patient_payers.deleted_at)
        ))
        .limit(1);

      const payer = payers[0];

      if (!payer) {
        reply.code(404);
        return { message: "Patient payer not found" };
      }

      reply.code(200);
      return payer;
    } catch (error) {
      logger.error("Error fetching patient payer:", error);
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

      const existingPayers = await db.select()
        .from(patient_payers)
        .where(and(
          eq(patient_payers.id, id),
          isNull(patient_payers.deleted_at)
        ))
        .limit(1);

      const existingPayer = existingPayers[0];

      if (!existingPayer) {
        reply.code(404);
        return { message: "Patient payer not found" };
      }

      const result = await db.update(patient_payers)
        .set({ ...data, updatedAt: new Date() })
        .where(eq(patient_payers.id, id))
        .returning();

      reply.code(200);
      return result[0];
    } catch (error) {
      logger.error("Error updating patient payer:", error);
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

      const existingPayers = await db.select()
        .from(patient_payers)
        .where(and(
          eq(patient_payers.id, id),
          isNull(patient_payers.deleted_at)
        ))
        .limit(1);

      const existingPayer = existingPayers[0];

      if (!existingPayer) {
        reply.code(404);
        return { message: "Patient payer not found" };
      }

      // Soft delete
      await db.update(patient_payers)
        .set({ deleted_at: new Date(), is_active: false, updatedAt: new Date() })
        .where(eq(patient_payers.id, id));

      reply.code(204);
      return null;
    } catch (error) {
      logger.error("Error deleting patient payer:", error);
      reply.code(500);
      return {
        message: "Internal server error",
        error: error.message,
      };
    }
  }
}

export default new PatientPayerController();
