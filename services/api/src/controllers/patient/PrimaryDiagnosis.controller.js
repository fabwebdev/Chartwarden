// Note: express-validator replaced with Fastify schema validation
import { db } from "../../config/db.drizzle.js";
import { primary_diagnosis } from "../../db/schemas/primaryDiagnosis.schema.js";
import { eq, or, sql } from "drizzle-orm";

import { logger } from '../../utils/logger.js';
// Get all primary diagnoses
export const index = async (request, reply) => {
  try {
    logger.info("🔍 PrimaryDiagnosis index called - User:", request.user?.id)
    logger.info("🔍 PrimaryDiagnosis index - Request path:", request.path)

    const diagnoses = await db.select({
      id: primary_diagnosis.id,
      diagnosis_code: primary_diagnosis.diagnosis_code,
      diagnosis_description: primary_diagnosis.diagnosis_description,
      diagnosis_date: primary_diagnosis.diagnosis_date,
      createdAt: primary_diagnosis.createdAt,
      updatedAt: primary_diagnosis.updatedAt
    }).from(primary_diagnosis);
    console.log(
      "✅ PrimaryDiagnosis index - Found",
      diagnoses.length,
      "diagnoses"
    );

    reply.code(200);
    return diagnoses;
  } catch (error) {
    logger.error("❌ Error in PrimaryDiagnosis index:", error)
    logger.error("❌ Error stack:", error.stack)
    console.error("❌ Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });

    // Always return error details to help debug
    reply.code(500);
    return {
      message: "Server error",
      error: error.message,
      code: error.code,
      detail: error.detail,
    };
  }
};

// Create a new primary diagnosis
export const store = async (request, reply) => {
  try {
    // Note: Validation should be done in route schema
    // Validation handled in route schema

    const diagnosisData = request.body;

    // Explicitly set timestamps - Drizzle might not apply defaults correctly
    const now = new Date();
    diagnosisData.createdAt = now;
    diagnosisData.updatedAt = now;

    const diagnosis = await db
      .insert(primary_diagnosis)
      .values(diagnosisData)
      .returning();
    const result = diagnosis[0];

    reply.code(201);
    return {
      message: "Primary diagnosis created successfully.",
      data: result,
    };
  } catch (error) {
    logger.error("❌ Error in PrimaryDiagnosis store:", error)
    logger.error("❌ Error stack:", error.stack)

    // Extract database error details from error.cause if available
    const dbError = error.cause || error;
    console.error("❌ Error details:", {
      message: error.message,
      code: dbError.code,
      detail: dbError.detail,
      hint: dbError.hint,
      severity: dbError.severity,
      table: dbError.table,
      column: dbError.column,
    });

    reply.code(500);
    return {
      message: "Server error",
      error: error.message,
      code: dbError.code,
      detail: dbError.detail,
      hint: dbError.hint,
    };
  }
};

// Search primary diagnoses by code or description
export const search = async (request, reply) => {
  try {
    const { query } = request.query;
    
    if (!query || query.trim() === "") {
      reply.code(400);
      return { 
        error: "Query parameter is required",
        message: "Please provide a 'query' parameter to search for diagnoses"
      };
    }
    
    const searchTerm = `%${query.trim()}%`;
    
    const diagnoses = await db
      .select({
        id: primary_diagnosis.id,
        diagnosis_code: primary_diagnosis.diagnosis_code,
        diagnosis_description: primary_diagnosis.diagnosis_description,
        diagnosis_date: primary_diagnosis.diagnosis_date,
        createdAt: primary_diagnosis.createdAt,
        updatedAt: primary_diagnosis.updatedAt
      })
      .from(primary_diagnosis)
      .where(
        sql`${primary_diagnosis.diagnosis_code}::text ILIKE ${searchTerm} OR ${primary_diagnosis.diagnosis_description}::text ILIKE ${searchTerm}`
      )
      .limit(100); // Limit results to prevent overwhelming response

    reply.code(200);
    return {
      count: diagnoses.length,
      data: diagnoses,
      query: query.trim()
    };
  } catch (error) {
    logger.error("Error in search:", error)
    reply.code(500);
    return { message: "Server error", error: error.message };
  }
};

// Get primary diagnosis by ID
export const show = async (request, reply) => {
  try {
    const { id } = request.params;
    
    // Validate that ID is a valid number
    const idNum = parseInt(id, 10);
    if (isNaN(idNum) || idNum <= 0) {
      reply.code(400);
      return { 
        error: "Invalid ID format. ID must be a positive number.",
        received: id 
      };
    }
    
    const diagnoses = await db
      .select({
        id: primary_diagnosis.id,
        diagnosis_code: primary_diagnosis.diagnosis_code,
        diagnosis_description: primary_diagnosis.diagnosis_description,
        diagnosis_date: primary_diagnosis.diagnosis_date,
        createdAt: primary_diagnosis.createdAt,
        updatedAt: primary_diagnosis.updatedAt
      })
      .from(primary_diagnosis)
      .where(eq(primary_diagnosis.id, idNum))
      .limit(1);
    const diagnosis = diagnoses[0];

    if (!diagnosis) {
      reply.code(404);
      return { error: "Primary diagnosis not found" };
    }

    reply.code(200);
    return diagnosis;
  } catch (error) {
    logger.error("Error in show:", error)
    reply.code(500);
    return { message: "Server error" };
  }
};

// Update primary diagnosis by ID
export const update = async (request, reply) => {
  try {
    // Note: Validation should be done in route schema
    // Validation handled in route schema

    const { id } = request.params;
    
    // Validate that ID is a valid number
    const idNum = parseInt(id, 10);
    if (isNaN(idNum) || idNum <= 0) {
      reply.code(400);
      return { 
        error: "Invalid ID format. ID must be a positive number.",
        received: id 
      };
    }
    
    const diagnosisData = request.body;

    const diagnoses = await db
      .select({
        id: primary_diagnosis.id
      })
      .from(primary_diagnosis)
      .where(eq(primary_diagnosis.id, idNum))
      .limit(1);
    const diagnosis = diagnoses[0];

    if (!diagnosis) {
      reply.code(404);
      return { error: "Primary diagnosis not found" };
    }

    const updatedDiagnosis = await db
      .update(primary_diagnosis)
      .set(diagnosisData)
      .where(eq(primary_diagnosis.id, idNum))
      .returning();
    const result = updatedDiagnosis[0];

    reply.code(200);
    return {
      message: "Primary diagnosis updated successfully.",
      data: result,
    };
  } catch (error) {
    logger.error("Error in update:", error)
    reply.code(500);
    return { message: "Server error" };
  }
};

// Delete primary diagnosis by ID
export const destroy = async (request, reply) => {
  try {
    const { id } = request.params;
    
    // Validate that ID is a valid number
    const idNum = parseInt(id, 10);
    if (isNaN(idNum) || idNum <= 0) {
      reply.code(400);
      return { 
        error: "Invalid ID format. ID must be a positive number.",
        received: id 
      };
    }

    const diagnoses = await db
      .select({
        id: primary_diagnosis.id
      })
      .from(primary_diagnosis)
      .where(eq(primary_diagnosis.id, idNum))
      .limit(1);
    const diagnosis = diagnoses[0];

    if (!diagnosis) {
      reply.code(404);
      return { error: "Primary diagnosis not found" };
    }

    await db.delete(primary_diagnosis).where(eq(primary_diagnosis.id, idNum));

    reply.code(200);
    return {
      message: "Primary diagnosis deleted successfully.",
    };
  } catch (error) {
    logger.error("Error in destroy:", error)
    reply.code(500);
    return { message: "Server error" };
  }
};
