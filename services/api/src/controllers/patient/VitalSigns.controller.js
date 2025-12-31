import { db } from '../../config/db.drizzle.js';
import { vital_signs } from '../../db/schemas/index.js';
import { eq } from 'drizzle-orm';

import { logger } from '../../utils/logger.js';
// Helper function to clean data - convert empty strings to null for numeric fields
function cleanVitalSignData(data) {
  const cleaned = { ...data };
  
  // Integer fields - convert empty strings to null
  const integerFields = [
    'degrees_fahrenheit',
    'heart_rate',
    'bp_systolic',
    'bp_diastolic',
    'respiratory_rate',
    'bp_mmhg'
  ];
  
  // Decimal fields - convert empty strings to null
  const decimalFields = [
    'pulse_oximetry_percentage',
    'body_height_inches',
    'body_weight_ibs',
    'body_weight_kg',
    'bmi_kg_m2',
    'bmi_percentage'
  ];
  
  // Clean integer fields
  integerFields.forEach(field => {
    if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {
      cleaned[field] = null;
    } else if (typeof cleaned[field] === 'string') {
      const parsed = parseInt(cleaned[field], 10);
      cleaned[field] = isNaN(parsed) ? null : parsed;
    }
  });
  
  // Clean decimal fields
  decimalFields.forEach(field => {
    if (cleaned[field] === '' || cleaned[field] === null || cleaned[field] === undefined) {
      cleaned[field] = null;
    } else if (typeof cleaned[field] === 'string') {
      const parsed = parseFloat(cleaned[field]);
      cleaned[field] = isNaN(parsed) ? null : parsed;
    }
  });
  
  // Clean string fields - convert empty strings to null
  Object.keys(cleaned).forEach(key => {
    if (typeof cleaned[key] === 'string' && cleaned[key].trim() === '') {
      cleaned[key] = null;
    }
  });
  
  return cleaned;
}

// Get all vital signs
export const index = async (request, reply) => {
  try {
    const vitalSigns = await db.select({
      id: vital_signs.id,
      note_id: vital_signs.note_id,
      degrees_fahrenheit: vital_signs.degrees_fahrenheit,
      temperature_method: vital_signs.temperature_method,
      heart_rate: vital_signs.heart_rate,
      heart_rhythm: vital_signs.heart_rhythm,
      heart_rate_location: vital_signs.heart_rate_location,
      other_heart_rate_location: vital_signs.other_heart_rate_location,
      bp_systolic: vital_signs.bp_systolic,
      bp_diastolic: vital_signs.bp_diastolic,
      bp_position: vital_signs.bp_position,
      bp_location: vital_signs.bp_location,
      other_bp_location: vital_signs.other_bp_location,
      bp_additional_readings: vital_signs.bp_additional_readings,
      respiratory_rate: vital_signs.respiratory_rate,
      respiratory_rhythm: vital_signs.respiratory_rhythm,
      pulse_oximetry_percentage: vital_signs.pulse_oximetry_percentage,
      pulse_ox_location: vital_signs.pulse_ox_location,
      pulse_ox_other_location: vital_signs.pulse_ox_other_location,
      body_height_inches: vital_signs.body_height_inches,
      body_weight_ibs: vital_signs.body_weight_ibs,
      body_weight_kg: vital_signs.body_weight_kg,
      body_weight_period: vital_signs.body_weight_period,
      bmi_kg_m2: vital_signs.bmi_kg_m2,
      bmi_percentage: vital_signs.bmi_percentage,
      bp_mmhg: vital_signs.bp_mmhg,
      createdAt: vital_signs.createdAt,
      updatedAt: vital_signs.updatedAt
    }).from(vital_signs);
    reply.code(200);
    return {
      status: 200,
      data: vitalSigns
    };
  } catch (error) {
    logger.error('Error fetching vital signs:', error)
    reply.code(500);
    return {
      status: 500,
      message: 'Server error while fetching vital signs'
    };
  }
};

// Store new vital signs
export const store = async (request, reply) => {
  try {
    const cleanedData = cleanVitalSignData(request.body);
    const newVitalSign = await db.insert(vital_signs).values(cleanedData).returning();
    const vitalSign = newVitalSign[0];
    reply.code(201);
    return {
      status: 201,
      data: vitalSign
    };
  } catch (error) {
    logger.error('Error creating vital signs:', error)
    reply.code(500);
    return {
      status: 500,
      message: 'Server error while creating vital signs'
    };
  }
};

// Show specific vital signs
export const show = async (request, reply) => {
  try {
    const vitalSignResult = await db.select({
      id: vital_signs.id,
      note_id: vital_signs.note_id,
      degrees_fahrenheit: vital_signs.degrees_fahrenheit,
      temperature_method: vital_signs.temperature_method,
      heart_rate: vital_signs.heart_rate,
      heart_rhythm: vital_signs.heart_rhythm,
      heart_rate_location: vital_signs.heart_rate_location,
      other_heart_rate_location: vital_signs.other_heart_rate_location,
      bp_systolic: vital_signs.bp_systolic,
      bp_diastolic: vital_signs.bp_diastolic,
      bp_position: vital_signs.bp_position,
      bp_location: vital_signs.bp_location,
      other_bp_location: vital_signs.other_bp_location,
      bp_additional_readings: vital_signs.bp_additional_readings,
      respiratory_rate: vital_signs.respiratory_rate,
      respiratory_rhythm: vital_signs.respiratory_rhythm,
      pulse_oximetry_percentage: vital_signs.pulse_oximetry_percentage,
      pulse_ox_location: vital_signs.pulse_ox_location,
      pulse_ox_other_location: vital_signs.pulse_ox_other_location,
      body_height_inches: vital_signs.body_height_inches,
      body_weight_ibs: vital_signs.body_weight_ibs,
      body_weight_kg: vital_signs.body_weight_kg,
      body_weight_period: vital_signs.body_weight_period,
      bmi_kg_m2: vital_signs.bmi_kg_m2,
      bmi_percentage: vital_signs.bmi_percentage,
      bp_mmhg: vital_signs.bp_mmhg,
      createdAt: vital_signs.createdAt,
      updatedAt: vital_signs.updatedAt
    }).from(vital_signs)
      .where(eq(vital_signs.id, parseInt(request.params.id)))
      .limit(1);
    const vitalSign = vitalSignResult[0];

    if (!vitalSign) {
      reply.code(404);
            return {
        status: 404,
        message: 'Vital signs not found'
      };
    }
    reply.code(200);
    return {
      status: 200,
      data: vitalSign
    };
  } catch (error) {
    logger.error('Error fetching vital signs:', error)
    reply.code(500);
    return {
      status: 500,
      message: 'Server error while fetching vital signs'
    };
  }
};

// Update or create vital signs by ID (upsert pattern)
// The ID in URL can be either:
// 1. vital_signs id (if updating existing)
// 2. note_id (if creating/updating for that note)
export const update = async (request, reply) => {
  try {
    const { id } = request.params;
    const vitalSignData = cleanVitalSignData(request.body);
    const idNum = parseInt(id);

    // First, check if vital signs exist with this ID (as vital_signs.id)
    const existingVitalSignResult = await db.select({
      id: vital_signs.id,
      note_id: vital_signs.note_id
    }).from(vital_signs)
      .where(eq(vital_signs.id, idNum))
      .limit(1);
    const existingVitalSign = existingVitalSignResult[0];

    let result;
    if (existingVitalSign) {
      // Update existing vital signs by vital_signs id
      // Ensure note_id is preserved if not provided
      if (!vitalSignData.note_id && existingVitalSign.note_id) {
        vitalSignData.note_id = existingVitalSign.note_id;
      }
      // Update timestamp
      vitalSignData.updatedAt = new Date();
      const updatedVitalSignResult = await db.update(vital_signs)
        .set(vitalSignData)
        .where(eq(vital_signs.id, idNum))
        .returning();
      result = updatedVitalSignResult[0];
      reply.code(200);
      return {
        status: 200,
        message: 'Vital signs updated successfully',
        data: result
      };
    } else {
      // ID doesn't exist as vital_signs id, so treat it as note_id
      // Check if vital signs already exist for this note_id
      const existingByNoteIdResult = await db.select({
        id: vital_signs.id,
        note_id: vital_signs.note_id
      }).from(vital_signs)
        .where(eq(vital_signs.note_id, idNum))
        .limit(1);
      const existingByNoteId = existingByNoteIdResult[0];

      if (existingByNoteId) {
        // Update existing vital signs by note_id
        // Update timestamp
        vitalSignData.updatedAt = new Date();
        const updatedVitalSignResult = await db.update(vital_signs)
          .set(vitalSignData)
          .where(eq(vital_signs.note_id, idNum))
          .returning();
        result = updatedVitalSignResult[0];
        reply.code(200);
        return {
          status: 200,
          message: 'Vital signs updated successfully',
          data: result
        };
      } else {
        // Create new vital signs with note_id from URL
        // Ensure note_id is set (required field)
        vitalSignData.note_id = idNum;
        // Don't set id - let database auto-generate it
        if (vitalSignData.id) {
          delete vitalSignData.id;
        }
        // Set timestamps explicitly (Drizzle may not use defaultNow() properly)
        const now = new Date();
        vitalSignData.createdAt = now;
        vitalSignData.updatedAt = now;
        const newVitalSignResult = await db.insert(vital_signs)
          .values(vitalSignData)
          .returning();
        result = newVitalSignResult[0];
        reply.code(201);
        return {
          status: 201,
          message: 'Vital signs created successfully',
          data: result
        };
      }
    }
  } catch (error) {
    logger.error('Error in update vital signs:', error)
    reply.code(500);
    return {
      status: 500,
      message: 'Server error while updating vital signs'
    };
  }
};