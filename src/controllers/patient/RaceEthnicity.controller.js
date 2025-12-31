// Note: express-validator replaced with Fastify schema validation
import { db } from "../../config/db.drizzle.js";
import { race_ethnicity } from "../../db/schemas/raceEthnicity.schema.js";
import { eq } from "drizzle-orm";

import { logger } from '../../utils/logger.js';
// Comprehensive list of Race and Ethnicity options (US Census Bureau standards)
const RACE_OPTIONS = [
  "American Indian or Alaska Native",
  "Asian",
  "Black or African American",
  "Native Hawaiian or Other Pacific Islander",
  "White",
  "Some Other Race",
  "Two or More Races",
  "Prefer Not to Answer",
];

const ETHNICITY_OPTIONS = [
  "Hispanic or Latino",
  "Not Hispanic or Latino",
  "Prefer Not to Answer",
];

// Detailed race categories (for more specific selection)
const DETAILED_RACE_OPTIONS = [
  // American Indian or Alaska Native
  "American Indian",
  "Alaska Native",
  "Aleut",
  "Eskimo",
  "Alaska Native Tribes",
  
  // Asian
  "Asian Indian",
  "Bangladeshi",
  "Bhutanese",
  "Burmese",
  "Cambodian",
  "Chinese",
  "Filipino",
  "Hmong",
  "Indonesian",
  "Japanese",
  "Korean",
  "Laotian",
  "Malaysian",
  "Mongolian",
  "Nepalese",
  "Pakistani",
  "Sri Lankan",
  "Taiwanese",
  "Thai",
  "Vietnamese",
  "Other Asian",
  
  // Black or African American
  "African American",
  "Black",
  "Ethiopian",
  "Haitian",
  "Jamaican",
  "Nigerian",
  "Somali",
  "Other Black or African American",
  
  // Native Hawaiian or Other Pacific Islander
  "Native Hawaiian",
  "Chamorro",
  "Fijian",
  "Guamanian or Chamorro",
  "Marshallese",
  "Micronesian",
  "Palauan",
  "Samoan",
  "Tongan",
  "Other Pacific Islander",
  
  // White
  "White",
  "European",
  "Middle Eastern",
  "North African",
  
  // Other categories
  "Some Other Race",
  "Two or More Races",
  "Multiracial",
  "Prefer Not to Answer",
  "Decline to Answer",
];

// Get comprehensive list of race/ethnicity options
export const getOptions = async (request, reply) => {
  try {
    reply.code(200);
    return {
      races: RACE_OPTIONS,
      detailedRaces: DETAILED_RACE_OPTIONS,
      ethnicities: ETHNICITY_OPTIONS,
      supportsMultiple: true, // Indicates frontend should allow multiple selections
    };
  } catch (error) {
    logger.error("❌ Error in getOptions:", error)
    reply.code(500);
    return {
      message: "Server error",
      error: error.message,
    };
  }
};

// Get all race ethnicities (from database)
export const index = async (request, reply) => {
  try {
    logger.info("🔍 RaceEthnicity index called - User:", request.user?.id)
    logger.info("🔍 RaceEthnicity index - Request path:", request.path)

    const raceEthnicities = await db.select({
      id: race_ethnicity.id,
      race: race_ethnicity.race,
      ethnicity: race_ethnicity.ethnicity,
      createdAt: race_ethnicity.createdAt,
      updatedAt: race_ethnicity.updatedAt
    }).from(race_ethnicity);
    console.log(
      "✅ RaceEthnicity index - Found",
      raceEthnicities.length,
      "entries"
    );

    reply.code(200);
    return raceEthnicities;
  } catch (error) {
    logger.error("❌ Error in RaceEthnicity index:", error)
    logger.error("❌ Error stack:", error.stack)
    console.error("❌ Error details:", {
      message: error.message,
      code: error.code,
      detail: error.detail,
      hint: error.hint,
    });

    reply.code(500);
    return {
      message: "Server error",
      error: error.message,
      code: error.code,
      detail: error.detail,
    };
  }
};

// Create a new race ethnicity
export const store = async (request, reply) => {
  try {
    logger.info("🔍 RaceEthnicity store called - User:", request.user?.id)
    console.log(
      "🔍 RaceEthnicity store - Request body:",
      JSON.stringify(request.body, null, 2)
    );

    // Try to get validation errors (if validation middleware was used)
    try {
      // Note: Validation should be done in route schema
      // Validation handled in route schema
    } catch (validationError) {
      // Validation middleware might not be set up, that's okay
      console.log(
        "⚠️  Validation middleware not detected, skipping validation"
      );
    }

    // Check if request body is empty
    if (!request.body || Object.keys(request.body).length === 0) {
      reply.code(400);
      return {
        message: "Request body is empty",
        error: "No data provided to create race ethnicity",
      };
    }

    // Prepare data for insertion - exclude id (auto-generated) and only include valid fields
    // The schema has 'race' and 'ethnicity' fields
    // Accept various field name formats from frontend
    const raceEthnicityData = {};

    // Handle race field - support both single value and array (multiple selection)
    // Accept multiple possible field names
    const raceValue =
      request.body.race ||
      request.body.name ||
      request.body.raceEthnicity ||
      request.body.value ||
      request.body.races; // Support 'races' array field
    
    if (raceValue !== undefined && raceValue !== null) {
      // Handle array of races (multiple selection)
      if (Array.isArray(raceValue) && raceValue.length > 0) {
        // Join multiple races with comma separator, or store as JSON string
        const validRaces = raceValue
          .filter(r => r !== null && r !== undefined && String(r).trim() !== "")
          .map(r => String(r).trim());
        if (validRaces.length > 0) {
          raceEthnicityData.race = validRaces.join(", "); // Store as comma-separated string
        }
      } else if (String(raceValue).trim() !== "") {
        // Single race value
        raceEthnicityData.race = String(raceValue).trim();
      }
    }

    // Handle ethnicity field - support both single value and array (multiple selection)
    const ethnicityValue = request.body.ethnicity || request.body.ethnicities;
    if (ethnicityValue !== undefined && ethnicityValue !== null) {
      // Handle array of ethnicities (multiple selection)
      if (Array.isArray(ethnicityValue) && ethnicityValue.length > 0) {
        const validEthnicities = ethnicityValue
          .filter(e => e !== null && e !== undefined && String(e).trim() !== "")
          .map(e => String(e).trim());
        if (validEthnicities.length > 0) {
          raceEthnicityData.ethnicity = validEthnicities.join(", "); // Store as comma-separated string
        }
      } else if (String(ethnicityValue).trim() !== "") {
        // Single ethnicity value
        raceEthnicityData.ethnicity = String(ethnicityValue).trim();
      }
    }

    // If no data fields remain, return error with more helpful message
    if (Object.keys(raceEthnicityData).length === 0) {
      console.log(
        "❌ No valid data found in request body. Received:",
        JSON.stringify(request.body, null, 2)
      );
      reply.code(400);
      return {
        message: "No valid data provided",
        error:
          "At least one field (race or ethnicity) must be provided with a non-empty value",
        receivedData: request.body,
        expectedFields: ["race", "ethnicity"],
      };
    }

    // Explicitly set timestamps - Drizzle might not apply defaults correctly when only partial data is provided
    const now = new Date();
    raceEthnicityData.createdAt = now;
    raceEthnicityData.updatedAt = now;

    console.log(
      "🔍 RaceEthnicity store - Prepared data for insert:",
      JSON.stringify(raceEthnicityData, null, 2)
    );

    const raceEthnicity = await db
      .insert(race_ethnicity)
      .values(raceEthnicityData)
      .returning();
    const result = raceEthnicity[0];

    logger.info("✅ RaceEthnicity store - Created entry:", result?.id)

    reply.code(201);
    return {
      message: "Race ethnicity created successfully.",
      data: result,
    };
  } catch (error) {
    logger.error("❌ Error in RaceEthnicity store:", error)
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

// Get race ethnicity by ID
export const show = async (request, reply) => {
  try {
    const { id } = request.params;
    const raceEthnicities = await db
      .select({
        id: race_ethnicity.id,
        race: race_ethnicity.race,
        ethnicity: race_ethnicity.ethnicity,
        createdAt: race_ethnicity.createdAt,
        updatedAt: race_ethnicity.updatedAt
      })
      .from(race_ethnicity)
      .where(eq(race_ethnicity.id, id))
      .limit(1);
    const raceEthnicityRecord = raceEthnicities[0];

    if (!raceEthnicityRecord) {
      reply.code(404);
      return { error: "Race ethnicity not found" };
    }

    reply.code(200);
    return raceEthnicityRecord;
  } catch (error) {
    logger.error("Error in show:", error)
    reply.code(500);
    return { message: "Server error" };
  }
};

// Update race ethnicity by ID
export const update = async (request, reply) => {
  try {
    // Note: Validation should be done in route schema
    // Validation handled in route schema

    const { id } = request.params;
    const raceEthnicityData = request.body;

    const raceEthnicities = await db
      .select({
        id: race_ethnicity.id
      })
      .from(race_ethnicity)
      .where(eq(race_ethnicity.id, id))
      .limit(1);
    const raceEthnicityRecord = raceEthnicities[0];

    if (!raceEthnicityRecord) {
      reply.code(404);
      return { error: "Race ethnicity not found" };
    }

    const updatedRaceEthnicity = await db
      .update(race_ethnicity)
      .set(raceEthnicityData)
      .where(eq(race_ethnicity.id, id))
      .returning();
    const result = updatedRaceEthnicity[0];

    reply.code(200);
    return {
      message: "Race ethnicity updated successfully.",
      data: result,
    };
  } catch (error) {
    logger.error("Error in update:", error)
    reply.code(500);
    return { message: "Server error" };
  }
};

// Delete race ethnicity by ID
export const destroy = async (request, reply) => {
  try {
    const { id } = request.params;

    const raceEthnicities = await db
      .select({
        id: race_ethnicity.id
      })
      .from(race_ethnicity)
      .where(eq(race_ethnicity.id, id))
      .limit(1);
    const raceEthnicityRecord = raceEthnicities[0];

    if (!raceEthnicityRecord) {
      reply.code(404);
      return { error: "Race ethnicity not found" };
    }

    await db.delete(race_ethnicity).where(eq(race_ethnicity.id, id));

    reply.code(200);
    return {
      message: "Race ethnicity deleted successfully.",
    };
  } catch (error) {
    logger.error("Error in destroy:", error)
    reply.code(500);
    return { message: "Server error" };
  }
};
