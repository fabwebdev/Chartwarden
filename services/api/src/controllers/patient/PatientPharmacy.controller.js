// Note: express-validator replaced with Fastify schema validation
import { db } from "../../config/db.drizzle.js";
import { patient_pharmacies } from "../../db/schemas/patientPharmacy.schema.js";
import { eq } from "drizzle-orm";

import { hipaaLogger } from '../../utils/hipaaLogger.js';

// Get all patient pharmacies
export const index = async (request, reply) => {
  try {
    hipaaLogger.request(request, "PatientPharmacy.index");

    const pharmacies = await db.select().from(patient_pharmacies);
    hipaaLogger.info("PatientPharmacy index completed", { count: pharmacies.length });

    reply.code(200);
    return pharmacies;
  } catch (error) {
    hipaaLogger.error("Error in PatientPharmacy index", { error });

    reply.code(500);
    return {
      message: "Server error",
      // HIPAA Compliance: Do not expose database error details to client
      code: "INTERNAL_ERROR",
    };
  }
};

// Create a new patient pharmacy
export const store = async (request, reply) => {
  try {
    hipaaLogger.request(request, "PatientPharmacy.store");

    // Check if request body is empty
    if (!request.body || Object.keys(request.body).length === 0) {
      reply.code(400);
      return {
        message: "Request body is empty",
        code: "VALIDATION_ERROR",
      };
    }

    // Prepare data for insertion - exclude id (auto-generated) and only include valid fields
    const pharmacyData = {
      name: request.body.name || null,
      address: request.body.address || null,
      addressLine2: request.body.addressLine2 || request.body.address_line_2 || null,
      city: request.body.city || null,
      state: request.body.state || null,
      zip_code: request.body.zip_code || request.body.zipCode || null,
      country: request.body.country || 'USA',
      phone: request.body.phone || null,
      fax: request.body.fax || null,
      email: request.body.email || null,
      npi: request.body.npi || null,
      deaNumber: request.body.deaNumber || request.body.dea_number || null,
      pharmacyType: request.body.pharmacyType || request.body.pharmacy_type || null,
      operatingHours: request.body.operatingHours || request.body.operating_hours || null,
      isActive: request.body.isActive !== undefined ? request.body.isActive : true,
      is24Hour: request.body.is24Hour !== undefined ? request.body.is24Hour : false,
      acceptsMedicare: request.body.acceptsMedicare !== undefined ? request.body.acceptsMedicare : true,
      acceptsMedicaid: request.body.acceptsMedicaid !== undefined ? request.body.acceptsMedicaid : true,
      deliversMedications: request.body.deliversMedications !== undefined ? request.body.deliversMedications : false,
      notes: request.body.notes || null,
    };

    // Remove undefined and null values to avoid default insertion
    Object.keys(pharmacyData).forEach((key) => {
      if (pharmacyData[key] === undefined || pharmacyData[key] === null) {
        delete pharmacyData[key];
      }
    });

    // If no data fields remain, return error
    if (Object.keys(pharmacyData).length === 0) {
      reply.code(400);
      return {
        message: "No valid data provided",
        code: "VALIDATION_ERROR",
      };
    }

    // Explicitly set timestamps - Drizzle might not apply defaults correctly
    const now = new Date();
    pharmacyData.createdAt = now;
    pharmacyData.updatedAt = now;

    hipaaLogger.dbOperation("create", "patient_pharmacies");

    const pharmacy = await db
      .insert(patient_pharmacies)
      .values(pharmacyData)
      .returning();
    const result = pharmacy[0];

    hipaaLogger.info("PatientPharmacy created", { pharmacyId: result?.id });

    reply.code(201);
    return {
      message: "Patient pharmacy created successfully.",
      data: result,
    };
  } catch (error) {
    hipaaLogger.error("Error in PatientPharmacy store", { error });

    reply.code(500);
    return {
      message: "Server error",
      // HIPAA Compliance: Do not expose database error details to client
      code: "INTERNAL_ERROR",
    };
  }
};

// Get patient pharmacy by ID
export const show = async (request, reply) => {
  try {
    const { id } = request.params;
    hipaaLogger.request(request, "PatientPharmacy.show");

    const pharmacies = await db
      .select()
      .from(patient_pharmacies)
      .where(eq(patient_pharmacies.id, id))
      .limit(1);
    const pharmacy = pharmacies[0];

    if (!pharmacy) {
      reply.code(404);
      return { error: "Patient pharmacy not found", code: "NOT_FOUND" };
    }

    reply.code(200);
    return pharmacy;
  } catch (error) {
    hipaaLogger.error("Error in PatientPharmacy show", { error });
    reply.code(500);
    return { message: "Server error", code: "INTERNAL_ERROR" };
  }
};

// Update patient pharmacy by ID
export const update = async (request, reply) => {
  try {
    hipaaLogger.request(request, "PatientPharmacy.update");

    const { id } = request.params;
    const pharmacyData = request.body;

    const pharmacies = await db
      .select()
      .from(patient_pharmacies)
      .where(eq(patient_pharmacies.id, id))
      .limit(1);
    const pharmacy = pharmacies[0];

    if (!pharmacy) {
      reply.code(404);
      return { error: "Patient pharmacy not found", code: "NOT_FOUND" };
    }

    hipaaLogger.dbOperation("update", "patient_pharmacies", id);

    const updatedPharmacy = await db
      .update(patient_pharmacies)
      .set(pharmacyData)
      .where(eq(patient_pharmacies.id, id))
      .returning();
    const result = updatedPharmacy[0];

    hipaaLogger.info("PatientPharmacy updated", { pharmacyId: id });

    reply.code(200);
    return {
      message: "Patient pharmacy updated successfully.",
      data: result,
    };
  } catch (error) {
    hipaaLogger.error("Error in PatientPharmacy update", { error });
    reply.code(500);
    return { message: "Server error", code: "INTERNAL_ERROR" };
  }
};

// Delete patient pharmacy by ID
export const destroy = async (request, reply) => {
  try {
    hipaaLogger.request(request, "PatientPharmacy.destroy");

    const { id } = request.params;

    const pharmacies = await db
      .select()
      .from(patient_pharmacies)
      .where(eq(patient_pharmacies.id, id))
      .limit(1);
    const pharmacy = pharmacies[0];

    if (!pharmacy) {
      reply.code(404);
      return { error: "Patient pharmacy not found", code: "NOT_FOUND" };
    }

    hipaaLogger.dbOperation("delete", "patient_pharmacies", id);

    await db.delete(patient_pharmacies).where(eq(patient_pharmacies.id, id));

    hipaaLogger.info("PatientPharmacy deleted", { pharmacyId: id });

    reply.code(200);
    return {
      message: "Patient pharmacy deleted successfully.",
    };
  } catch (error) {
    hipaaLogger.error("Error in PatientPharmacy destroy", { error });
    reply.code(500);
    return { message: "Server error", code: "INTERNAL_ERROR" };
  }
};
