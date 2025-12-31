import { db } from "../../config/db.drizzle.js";
import { patientAddresses } from "../../db/schemas/address.schema.js";
import { eq, and, isNull, desc } from "drizzle-orm";

import { logger } from '../../utils/logger.js';

// Valid address types
const VALID_ADDRESS_TYPES = ['PRIMARY', 'BILLING', 'MAILING', 'FACILITY', 'TEMPORARY'];

// US State codes for validation
const US_STATE_CODES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY',
  'DC', 'PR', 'VI', 'GU', 'AS', 'MP'
];

/**
 * Address Controller
 * Manages patient addresses with multiple types (primary, billing, mailing)
 * COMPLIANCE: Medicare billing requires accurate address for CBSA determination
 */
class AddressController {
  /**
   * Get all addresses for a patient
   * GET /patients/:patientId/addresses
   */
  async getPatientAddresses(request, reply) {
    try {
      const { patientId } = request.params;
      const { type, active_only } = request.query;

      let conditions = [
        eq(patientAddresses.patient_id, parseInt(patientId)),
        isNull(patientAddresses.deleted_at)
      ];

      // Filter by address type if provided
      if (type && VALID_ADDRESS_TYPES.includes(type.toUpperCase())) {
        conditions.push(eq(patientAddresses.address_type, type.toUpperCase()));
      }

      // Filter by active status if requested
      if (active_only === 'true') {
        conditions.push(eq(patientAddresses.is_active, true));
      }

      const results = await db
        .select()
        .from(patientAddresses)
        .where(and(...conditions))
        .orderBy(desc(patientAddresses.is_primary), patientAddresses.address_type);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error("Error fetching patient addresses:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Error fetching addresses",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a specific address by ID
   * GET /patients/:patientId/addresses/:addressId
   */
  async getAddress(request, reply) {
    try {
      const { patientId, addressId } = request.params;

      const results = await db
        .select()
        .from(patientAddresses)
        .where(and(
          eq(patientAddresses.id, parseInt(addressId)),
          eq(patientAddresses.patient_id, parseInt(patientId)),
          isNull(patientAddresses.deleted_at)
        ))
        .limit(1);

      if (!results[0]) {
        reply.code(404);
        return {
          status: 404,
          message: "Address not found"
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: results[0]
      };
    } catch (error) {
      logger.error("Error fetching address:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Error fetching address",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create a new address for a patient
   * POST /patients/:patientId/addresses
   */
  async createAddress(request, reply) {
    try {
      const { patientId } = request.params;
      const data = request.body;

      // Validate required fields
      const validationErrors = this.validateAddressData(data);
      if (validationErrors.length > 0) {
        reply.code(400);
        return {
          status: 400,
          message: "Validation failed",
          errors: validationErrors
        };
      }

      // If this is marked as primary, unset other primary addresses of same type
      if (data.is_primary) {
        await db
          .update(patientAddresses)
          .set({ is_primary: false, updatedAt: new Date() })
          .where(and(
            eq(patientAddresses.patient_id, parseInt(patientId)),
            eq(patientAddresses.address_type, data.address_type?.toUpperCase() || 'PRIMARY'),
            eq(patientAddresses.is_primary, true),
            isNull(patientAddresses.deleted_at)
          ));
      }

      const result = await db
        .insert(patientAddresses)
        .values({
          patient_id: parseInt(patientId),
          address_type: data.address_type?.toUpperCase() || 'PRIMARY',
          address_line_1: data.address_line_1.trim(),
          address_line_2: data.address_line_2?.trim() || null,
          city: data.city.trim(),
          state: data.state.toUpperCase(),
          zip_code: data.zip_code.trim(),
          county: data.county?.trim() || null,
          cbsa_code: data.cbsa_code?.trim() || null,
          latitude: data.latitude || null,
          longitude: data.longitude || null,
          phone_number: data.phone_number?.trim() || null,
          alternate_phone: data.alternate_phone?.trim() || null,
          is_primary: data.is_primary ?? false,
          is_verified: data.is_verified ?? false,
          is_active: data.is_active ?? true,
          effective_from: data.effective_from || null,
          effective_to: data.effective_to || null,
          notes: data.notes?.trim() || null
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Address created successfully",
        data: result[0]
      };
    } catch (error) {
      logger.error("Error creating address:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Error creating address",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update an existing address
   * PUT /patients/:patientId/addresses/:addressId
   */
  async updateAddress(request, reply) {
    try {
      const { patientId, addressId } = request.params;
      const data = request.body;

      // Check if address exists
      const existing = await db
        .select()
        .from(patientAddresses)
        .where(and(
          eq(patientAddresses.id, parseInt(addressId)),
          eq(patientAddresses.patient_id, parseInt(patientId)),
          isNull(patientAddresses.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: "Address not found"
        };
      }

      // Validate data if required fields are being updated
      if (data.address_line_1 || data.city || data.state || data.zip_code) {
        const validationData = {
          address_line_1: data.address_line_1 || existing[0].address_line_1,
          city: data.city || existing[0].city,
          state: data.state || existing[0].state,
          zip_code: data.zip_code || existing[0].zip_code,
          address_type: data.address_type || existing[0].address_type
        };
        const validationErrors = this.validateAddressData(validationData);
        if (validationErrors.length > 0) {
          reply.code(400);
          return {
            status: 400,
            message: "Validation failed",
            errors: validationErrors
          };
        }
      }

      // If setting as primary, unset other primary addresses of same type
      if (data.is_primary === true) {
        const addressType = data.address_type?.toUpperCase() || existing[0].address_type;
        await db
          .update(patientAddresses)
          .set({ is_primary: false, updatedAt: new Date() })
          .where(and(
            eq(patientAddresses.patient_id, parseInt(patientId)),
            eq(patientAddresses.address_type, addressType),
            eq(patientAddresses.is_primary, true),
            isNull(patientAddresses.deleted_at)
          ));
      }

      // Build update object with only provided fields
      const updateData = { updatedAt: new Date() };
      if (data.address_type !== undefined) updateData.address_type = data.address_type.toUpperCase();
      if (data.address_line_1 !== undefined) updateData.address_line_1 = data.address_line_1.trim();
      if (data.address_line_2 !== undefined) updateData.address_line_2 = data.address_line_2?.trim() || null;
      if (data.city !== undefined) updateData.city = data.city.trim();
      if (data.state !== undefined) updateData.state = data.state.toUpperCase();
      if (data.zip_code !== undefined) updateData.zip_code = data.zip_code.trim();
      if (data.county !== undefined) updateData.county = data.county?.trim() || null;
      if (data.cbsa_code !== undefined) updateData.cbsa_code = data.cbsa_code?.trim() || null;
      if (data.latitude !== undefined) updateData.latitude = data.latitude;
      if (data.longitude !== undefined) updateData.longitude = data.longitude;
      if (data.phone_number !== undefined) updateData.phone_number = data.phone_number?.trim() || null;
      if (data.alternate_phone !== undefined) updateData.alternate_phone = data.alternate_phone?.trim() || null;
      if (data.is_primary !== undefined) updateData.is_primary = data.is_primary;
      if (data.is_verified !== undefined) updateData.is_verified = data.is_verified;
      if (data.is_active !== undefined) updateData.is_active = data.is_active;
      if (data.effective_from !== undefined) updateData.effective_from = data.effective_from;
      if (data.effective_to !== undefined) updateData.effective_to = data.effective_to;
      if (data.notes !== undefined) updateData.notes = data.notes?.trim() || null;

      const result = await db
        .update(patientAddresses)
        .set(updateData)
        .where(eq(patientAddresses.id, parseInt(addressId)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: "Address updated successfully",
        data: result[0]
      };
    } catch (error) {
      logger.error("Error updating address:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Error updating address",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete an address (soft delete)
   * DELETE /patients/:patientId/addresses/:addressId
   */
  async deleteAddress(request, reply) {
    try {
      const { patientId, addressId } = request.params;

      // Check if address exists
      const existing = await db
        .select()
        .from(patientAddresses)
        .where(and(
          eq(patientAddresses.id, parseInt(addressId)),
          eq(patientAddresses.patient_id, parseInt(patientId)),
          isNull(patientAddresses.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: "Address not found"
        };
      }

      // Soft delete
      await db
        .update(patientAddresses)
        .set({
          deleted_at: new Date(),
          is_active: false,
          updatedAt: new Date()
        })
        .where(eq(patientAddresses.id, parseInt(addressId)));

      reply.code(200);
      return {
        status: 200,
        message: "Address deleted successfully"
      };
    } catch (error) {
      logger.error("Error deleting address:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Error deleting address",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Set an address as primary for its type
   * POST /patients/:patientId/addresses/:addressId/set-primary
   */
  async setPrimaryAddress(request, reply) {
    try {
      const { patientId, addressId } = request.params;

      // Get the address to find its type
      const existing = await db
        .select()
        .from(patientAddresses)
        .where(and(
          eq(patientAddresses.id, parseInt(addressId)),
          eq(patientAddresses.patient_id, parseInt(patientId)),
          isNull(patientAddresses.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: "Address not found"
        };
      }

      // Unset other primary addresses of the same type
      await db
        .update(patientAddresses)
        .set({ is_primary: false, updatedAt: new Date() })
        .where(and(
          eq(patientAddresses.patient_id, parseInt(patientId)),
          eq(patientAddresses.address_type, existing[0].address_type),
          eq(patientAddresses.is_primary, true),
          isNull(patientAddresses.deleted_at)
        ));

      // Set this address as primary
      const result = await db
        .update(patientAddresses)
        .set({ is_primary: true, updatedAt: new Date() })
        .where(eq(patientAddresses.id, parseInt(addressId)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: "Address set as primary",
        data: result[0]
      };
    } catch (error) {
      logger.error("Error setting primary address:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Error setting primary address",
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Legacy endpoint - Store or update address (backwards compatible)
   * POST /address/store
   */
  async store(request, reply) {
    try {
      const {
        patient_id,
        address_line_1,
        address_line_2,
        state,
        city,
        zip_code,
        phone_number,
        alternate_phone,
        address_type = 'PRIMARY'
      } = request.body;

      // Validate required fields
      if (!patient_id) {
        reply.code(400);
        return {
          message: "Patient ID is required",
        };
      }

      // Check if address already exists for this patient and type
      const existingAddress = await db
        .select()
        .from(patientAddresses)
        .where(and(
          eq(patientAddresses.patient_id, patient_id),
          eq(patientAddresses.address_type, address_type.toUpperCase()),
          isNull(patientAddresses.deleted_at)
        ))
        .limit(1);

      const addressData = {
        patient_id: patient_id,
        address_type: address_type.toUpperCase(),
        address_line_1: address_line_1 || 'Unknown',
        address_line_2: address_line_2 || null,
        state: state?.substring(0, 2)?.toUpperCase() || 'XX',
        city: city || 'Unknown',
        zip_code: zip_code?.substring(0, 10) || '00000',
        phone_number: phone_number || null,
        alternate_phone: alternate_phone || null,
        is_primary: true,
        is_active: true,
        updatedAt: new Date()
      };

      let result;
      if (existingAddress.length > 0) {
        result = await db
          .update(patientAddresses)
          .set(addressData)
          .where(eq(patientAddresses.id, existingAddress[0].id))
          .returning();
        result = result[0];
      } else {
        result = await db
          .insert(patientAddresses)
          .values(addressData)
          .returning();
        result = result[0];
      }

      return {
        message: "Address saved successfully",
        data: result,
      };
    } catch (error) {
      logger.error("Error saving address:", error);
      reply.code(500);
      return {
        message: "Internal server error",
        error: error.message,
      };
    }
  }

  /**
   * Legacy endpoint - Show address for a specific patient
   * GET /address/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const addressRecords = await db
        .select()
        .from(patientAddresses)
        .where(and(
          eq(patientAddresses.patient_id, parseInt(id)),
          eq(patientAddresses.is_primary, true),
          isNull(patientAddresses.deleted_at)
        ))
        .limit(1);

      const addressRecord = addressRecords[0];

      if (!addressRecord) {
        reply.code(404);
        return {
          error: "No address found for this patient",
        };
      }

      return addressRecord;
    } catch (error) {
      logger.error("Error fetching address:", error);
      reply.code(500);
      return {
        message: "Internal server error",
        error: error.message,
      };
    }
  }

  /**
   * Validate address data
   */
  validateAddressData(data) {
    const errors = [];

    // Required field validation
    if (!data.address_line_1 || data.address_line_1.trim().length === 0) {
      errors.push({ field: 'address_line_1', message: 'Address line 1 is required' });
    }
    if (!data.city || data.city.trim().length === 0) {
      errors.push({ field: 'city', message: 'City is required' });
    }
    if (!data.state || data.state.trim().length === 0) {
      errors.push({ field: 'state', message: 'State is required' });
    }
    if (!data.zip_code || data.zip_code.trim().length === 0) {
      errors.push({ field: 'zip_code', message: 'ZIP code is required' });
    }

    // Format validation
    if (data.state && !US_STATE_CODES.includes(data.state.toUpperCase())) {
      errors.push({ field: 'state', message: 'Invalid US state code' });
    }

    if (data.zip_code) {
      const zipPattern = /^\d{5}(-\d{4})?$/;
      if (!zipPattern.test(data.zip_code.trim())) {
        errors.push({ field: 'zip_code', message: 'ZIP code must be in format 12345 or 12345-6789' });
      }
    }

    if (data.address_type && !VALID_ADDRESS_TYPES.includes(data.address_type.toUpperCase())) {
      errors.push({ field: 'address_type', message: `Address type must be one of: ${VALID_ADDRESS_TYPES.join(', ')}` });
    }

    // Phone number validation (if provided)
    if (data.phone_number) {
      const phonePattern = /^[\d\s\-\(\)\+]+$/;
      if (!phonePattern.test(data.phone_number)) {
        errors.push({ field: 'phone_number', message: 'Invalid phone number format' });
      }
    }

    return errors;
  }
}

export default new AddressController();
