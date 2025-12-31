// Note: express-validator replaced with Fastify schema validation
import { db } from "../../config/db.drizzle.js";
import { patients } from "../../db/schemas/index.js";
import { eq } from "drizzle-orm";
import { logAudit } from "../../middleware/audit.middleware.js";
import { logger } from '../../utils/logger.js';
import { validateSSN, validateDMEProvider, ValidationError } from '../../utils/validators.js';
import { normalizeBooleanFields } from '../../utils/transformers.js';

// Get all patients
export const index = async (request, reply) => {
    try {
        const patientsList = await db.select({
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            middle_name: patients.middle_name,
            mi: patients.mi,
            preferred_name: patients.preferred_name,
            suffix: patients.suffix,
            date_of_birth: patients.date_of_birth,
            gender: patients.gender,
            oxygen_dependent: patients.oxygen_dependent,
            patient_consents: patients.patient_consents,
            hipaa_received: patients.hipaa_received,
            veterans_status: patients.veterans_status,
            patient_pharmacy_id: patients.patient_pharmacy_id,
            primary_diagnosis_id: patients.primary_diagnosis_id,
            race_ethnicity_id: patients.race_ethnicity_id,
            dme_provider: patients.dme_provider,
            liaison_primary_id: patients.liaison_primary_id,
            liaison_secondary_id: patients.liaison_secondary_id,
            dnr_id: patients.dnr_id,
            emergency_preparedness_level_id: patients.emergency_preparedness_level_id,
            patient_identifier_id: patients.patient_identifier_id,
            createdAt: patients.createdAt,
            updatedAt: patients.updatedAt,
        }).from(patients);

        // Log audit - READ operation on patients table
        await logAudit(request, 'READ', 'patients', null);

        reply.code(200);
            return patientsList;
    } catch (error) {
        logger.error("Error in index:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Create a new patient
export const store = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        let patientData = request.body;

        // Validate and format SSN if provided
        try {
            if (patientData.ssn !== undefined && patientData.ssn !== null) {
                patientData.ssn = validateSSN(patientData.ssn);
            }
        } catch (error) {
            if (error instanceof ValidationError) {
                reply.code(error.statusCode);
                return {
                    message: "Invalid SSN format",
                    error: error.message,
                    received: request.body.ssn
                };
            }
            throw error;
        }

        // Validate DME provider option if provided
        try {
            if (patientData.dme_provider !== undefined && patientData.dme_provider !== null) {
                patientData.dme_provider = validateDMEProvider(patientData.dme_provider);
            }
        } catch (error) {
            if (error instanceof ValidationError) {
                reply.code(error.statusCode);
                return {
                    message: "Invalid DME provider option",
                    error: error.message,
                    received: request.body.dme_provider
                };
            }
            throw error;
        }

        // Convert boolean flags to numbers (0/1) for bigint columns
        patientData = normalizeBooleanFields(patientData, [
            'oxygen_dependent',
            'patient_consents',
            'hipaa_received',
            'veterans_status'
        ]);
        
        // Explicitly set timestamps - Drizzle might not apply defaults correctly
        const now = new Date();
        patientData.createdAt = now;
        patientData.updatedAt = now;
        
        const newPatient = await db.insert(patients).values(patientData).returning();
        const patient = newPatient[0];

        // Log audit - CREATE operation on patients table
        await logAudit(request, 'CREATE', 'patients', patient.id);

        reply.code(201);
            return {
            message: "Patient created successfully.",
            data: patient,
        };
    } catch (error) {
        logger.error("❌ Error in Patient store:", error)
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

// Get patient by ID
export const show = async (request, reply) => {
    try {
        const { id } = request.params;
        const patientResult = await db.select({
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            middle_name: patients.middle_name,
            mi: patients.mi,
            preferred_name: patients.preferred_name,
            suffix: patients.suffix,
            date_of_birth: patients.date_of_birth,
            gender: patients.gender,
            ssn: patients.ssn,
            oxygen_dependent: patients.oxygen_dependent,
            patient_consents: patients.patient_consents,
            hipaa_received: patients.hipaa_received,
            veterans_status: patients.veterans_status,
            patient_pharmacy_id: patients.patient_pharmacy_id,
            primary_diagnosis_id: patients.primary_diagnosis_id,
            race_ethnicity_id: patients.race_ethnicity_id,
            dme_provider: patients.dme_provider,
            liaison_primary_id: patients.liaison_primary_id,
            liaison_secondary_id: patients.liaison_secondary_id,
            dnr_id: patients.dnr_id,
            emergency_preparedness_level_id: patients.emergency_preparedness_level_id,
            patient_identifier_id: patients.patient_identifier_id,
            createdAt: patients.createdAt,
            updatedAt: patients.updatedAt,
        }).from(patients)
            .where(eq(patients.id, parseInt(id)))
            .limit(1);
        const patient = patientResult[0];

        if (!patient) {
            reply.code(404);
            return { error: "Patient not found" };
        }

        // Log audit - READ operation on patients table
        await logAudit(request, 'READ', 'patients', parseInt(id));

        reply.code(200);
            return patient;
    } catch (error) {
        logger.error("Error in show:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Update patient by ID
export const update = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { id } = request.params;
        let patientData = request.body;

        // Validate and format SSN if provided
        try {
            if (patientData.ssn !== undefined && patientData.ssn !== null) {
                patientData.ssn = validateSSN(patientData.ssn);
            }
        } catch (error) {
            if (error instanceof ValidationError) {
                reply.code(error.statusCode);
                return {
                    message: "Invalid SSN format",
                    error: error.message,
                    received: request.body.ssn
                };
            }
            throw error;
        }

        // Validate DME provider option if provided
        try {
            if (patientData.dme_provider !== undefined && patientData.dme_provider !== null) {
                patientData.dme_provider = validateDMEProvider(patientData.dme_provider);
            }
        } catch (error) {
            if (error instanceof ValidationError) {
                reply.code(error.statusCode);
                return {
                    message: "Invalid DME provider option",
                    error: error.message,
                    received: request.body.dme_provider
                };
            }
            throw error;
        }

        // Convert boolean flags to numbers (0/1) for bigint columns
        patientData = normalizeBooleanFields(patientData, [
            'oxygen_dependent',
            'patient_consents',
            'hipaa_received',
            'veterans_status'
        ]);

        // Remove timestamps from update data - they should not be updated manually
        delete patientData.createdAt;
        delete patientData.created_at;
        delete patientData.updatedAt;
        delete patientData.updated_at;
        
        // Update the updated_at timestamp explicitly
        patientData.updatedAt = new Date();

        const existingPatient = await db.select({
            id: patients.id,
        }).from(patients)
            .where(eq(patients.id, parseInt(id)))
            .limit(1);
        const patient = existingPatient[0];

        if (!patient) {
            reply.code(404);
            return { error: "Patient not found" };
        }

        await db.update(patients)
            .set(patientData)
            .where(eq(patients.id, parseInt(id)));

        // Fetch the updated patient to ensure all fields are returned
        const updatedPatient = await db.select({
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            middle_name: patients.middle_name,
            mi: patients.mi,
            preferred_name: patients.preferred_name,
            suffix: patients.suffix,
            date_of_birth: patients.date_of_birth,
            gender: patients.gender,
            ssn: patients.ssn,
            oxygen_dependent: patients.oxygen_dependent,
            patient_consents: patients.patient_consents,
            hipaa_received: patients.hipaa_received,
            veterans_status: patients.veterans_status,
            patient_pharmacy_id: patients.patient_pharmacy_id,
            primary_diagnosis_id: patients.primary_diagnosis_id,
            race_ethnicity_id: patients.race_ethnicity_id,
            dme_provider: patients.dme_provider,
            liaison_primary_id: patients.liaison_primary_id,
            liaison_secondary_id: patients.liaison_secondary_id,
            dnr_id: patients.dnr_id,
            emergency_preparedness_level_id: patients.emergency_preparedness_level_id,
            patient_identifier_id: patients.patient_identifier_id,
            createdAt: patients.createdAt,
            updatedAt: patients.updatedAt,
        }).from(patients)
            .where(eq(patients.id, parseInt(id)))
            .limit(1);
        const result = updatedPatient[0];

        // Log audit - UPDATE operation on patients table
        await logAudit(request, 'UPDATE', 'patients', parseInt(id));

        reply.code(200);
            return {
            message: "Patient updated successfully.",
            data: result,
        };
    } catch (error) {
        logger.error("Error in update:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Delete patient by ID
export const destroy = async (request, reply) => {
    try {
        const { id } = request.params;

        const existingPatient = await db.select({
            id: patients.id,
        }).from(patients)
            .where(eq(patients.id, parseInt(id)))
            .limit(1);
        const patient = existingPatient[0];

        if (!patient) {
            reply.code(404);
            return { error: "Patient not found" };
        }

        await db.delete(patients).where(eq(patients.id, parseInt(id)));

        // Log audit - DELETE operation on patients table
        await logAudit(request, 'DELETE', 'patients', parseInt(id));

        reply.code(200);
            return {
            message: "Patient deleted successfully.",
        };
    } catch (error) {
        logger.error("Error in destroy:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};