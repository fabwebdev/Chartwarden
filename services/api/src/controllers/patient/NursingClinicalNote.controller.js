// Note: express-validator replaced with Fastify schema validation
import { db } from "../../config/db.drizzle.js";
import {
  nursing_clinical_notes,
  vital_signs,
  pain_data,
  painad_data,
  flacc_data,
  scale_tool_lab_data,
  cardiovascular_data,
  respiratory_data,
  genitourinary_data,
  gastrointestinal_data
} from "../../db/schemas/index.js";
import { eq, and, desc, isNull } from "drizzle-orm";
import crypto from 'crypto';

import { logger } from '../../utils/logger.js';

// Define all selectable fields for the nursing clinical note
const nursingNoteSelectFields = {
  id: nursing_clinical_notes.id,
  patient_id: nursing_clinical_notes.patient_id,
  benefit_period_id: nursing_clinical_notes.benefit_period_id,
  note_date: nursing_clinical_notes.note_date,
  note_timestamp: nursing_clinical_notes.note_timestamp,
  time_in: nursing_clinical_notes.time_in,
  time_out: nursing_clinical_notes.time_out,
  patient_name: nursing_clinical_notes.patient_name,
  patient_number: nursing_clinical_notes.patient_number,
  dob: nursing_clinical_notes.dob,
  location_name: nursing_clinical_notes.location_name,
  location_number: nursing_clinical_notes.location_number,
  benefit_period: nursing_clinical_notes.benefit_period,
  prn_visit: nursing_clinical_notes.prn_visit,
  patient_identifiers: nursing_clinical_notes.patient_identifiers,
  // Nurse information
  nurse_id: nursing_clinical_notes.nurse_id,
  nurse_name: nursing_clinical_notes.nurse_name,
  nurse_credentials: nursing_clinical_notes.nurse_credentials,
  // Note status
  note_status: nursing_clinical_notes.note_status,
  // Rich text content
  content: nursing_clinical_notes.content,
  content_format: nursing_clinical_notes.content_format,
  // SOAP sections
  subjective: nursing_clinical_notes.subjective,
  objective: nursing_clinical_notes.objective,
  assessment: nursing_clinical_notes.assessment,
  plan: nursing_clinical_notes.plan,
  // Additional clinical sections
  interventions: nursing_clinical_notes.interventions,
  patient_response: nursing_clinical_notes.patient_response,
  patient_education: nursing_clinical_notes.patient_education,
  communication: nursing_clinical_notes.communication,
  // Signature tracking
  signed_at: nursing_clinical_notes.signed_at,
  signed_by_id: nursing_clinical_notes.signed_by_id,
  signature_hash: nursing_clinical_notes.signature_hash,
  cosigned_at: nursing_clinical_notes.cosigned_at,
  cosigned_by_id: nursing_clinical_notes.cosigned_by_id,
  // Amendment tracking
  amended: nursing_clinical_notes.amended,
  amendment_reason: nursing_clinical_notes.amendment_reason,
  amended_at: nursing_clinical_notes.amended_at,
  amended_by_id: nursing_clinical_notes.amended_by_id,
  // Audit fields
  created_by_id: nursing_clinical_notes.created_by_id,
  updated_by_id: nursing_clinical_notes.updated_by_id,
  deleted_at: nursing_clinical_notes.deleted_at,
  createdAt: nursing_clinical_notes.createdAt,
  updatedAt: nursing_clinical_notes.updatedAt
};
// Helper function to add timestamps to data for insert operations
function addTimestamps(data) {
  const now = new Date();
  return {
    ...data,
    createdAt: now,
    updatedAt: now
  };
}

// Helper function to add updatedAt timestamp for update operations
function addUpdatedAt(data) {
  return {
    ...data,
    updatedAt: new Date()
  };
}

// List all nursing clinical notes with filters
export const index = async (request, reply) => {
    try {
        const { patient_id, nurse_id, status, limit = 50, offset = 0 } = request.query;

        let query = db.select(nursingNoteSelectFields)
            .from(nursing_clinical_notes)
            .where(isNull(nursing_clinical_notes.deleted_at));

        if (patient_id) {
            query = query.where(eq(nursing_clinical_notes.patient_id, parseInt(patient_id)));
        }
        if (nurse_id) {
            query = query.where(eq(nursing_clinical_notes.nurse_id, nurse_id));
        }
        if (status) {
            query = query.where(eq(nursing_clinical_notes.note_status, status));
        }

        const results = await query
            .orderBy(desc(nursing_clinical_notes.note_timestamp))
            .limit(parseInt(limit))
            .offset(parseInt(offset));

        reply.code(200);
        return {
            status: 200,
            data: results,
            count: results.length
        };
    } catch (error) {
        logger.error("Error in index:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Show nursing clinical note by ID
export const show = async (request, reply) => {
    try {
        const { id } = request.params;
        const noteResult = await db.select(nursingNoteSelectFields)
            .from(nursing_clinical_notes)
            .where(and(
                eq(nursing_clinical_notes.id, parseInt(id)),
                isNull(nursing_clinical_notes.deleted_at)
            ))
            .limit(1);
        const note = noteResult[0];

        if (!note) {
            reply.code(404);
            return { message: "Nursing clinical note not found" };
        }

        reply.code(200);
        return {
            status: 200,
            data: note
        };
    } catch (error) {
        logger.error("Error in show:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Update nursing clinical note
export const update = async (request, reply) => {
    try {
        const { id } = request.params;
        const updatedData = request.body;

        const noteResult = await db.select(nursingNoteSelectFields)
            .from(nursing_clinical_notes)
            .where(and(
                eq(nursing_clinical_notes.id, parseInt(id)),
                isNull(nursing_clinical_notes.deleted_at)
            ))
            .limit(1);
        const note = noteResult[0];

        if (!note) {
            reply.code(404);
            return { message: "Nursing clinical note not found" };
        }

        // Don't allow updates to signed notes (must use amendments)
        if (note.note_status === 'SIGNED') {
            reply.code(403);
            return {
                status: 403,
                message: 'Cannot update signed notes. Use amendments instead.'
            };
        }

        const updatedNoteResult = await db.update(nursing_clinical_notes)
            .set({
                ...updatedData,
                updated_by_id: request.user?.id,
                updatedAt: new Date()
            })
            .where(eq(nursing_clinical_notes.id, parseInt(id)))
            .returning();
        const updatedNote = updatedNoteResult[0];

        reply.code(200);
        return {
            status: 200,
            message: "Nursing clinical note updated successfully",
            data: updatedNote,
        };
    } catch (error) {
        logger.error("Error in update:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Store (create or update) nursing clinical note
export const store = async (request, reply) => {
    try {
        const { id } = request.params;
        const noteData = request.body;

        // Check if note exists
        const existingNoteResult = await db.select(nursingNoteSelectFields)
            .from(nursing_clinical_notes)
            .where(eq(nursing_clinical_notes.id, parseInt(id)))
            .limit(1);
        const existingNote = existingNoteResult[0];

        let result;
        if (existingNote) {
            // Don't allow updates to signed notes
            if (existingNote.note_status === 'SIGNED') {
                reply.code(403);
                return {
                    status: 403,
                    message: 'Cannot update signed notes. Use amendments instead.'
                };
            }

            // Update existing note
            const updatedNoteResult = await db.update(nursing_clinical_notes)
                .set({
                    ...noteData,
                    updated_by_id: request.user?.id,
                    updatedAt: new Date()
                })
                .where(eq(nursing_clinical_notes.id, parseInt(id)))
                .returning();
            result = updatedNoteResult[0];
            reply.code(200);
            return {
                status: 200,
                message: "Nursing clinical note updated successfully",
                data: result,
            };
        } else {
            // Create new note with the provided ID
            const newNoteResult = await db.insert(nursing_clinical_notes)
                .values({
                    ...noteData,
                    id: parseInt(id),
                    nurse_id: noteData.nurse_id || request.user?.id,
                    nurse_name: noteData.nurse_name || `${request.user?.firstName} ${request.user?.lastName}`,
                    note_status: noteData.note_status || 'DRAFT',
                    note_timestamp: new Date(),
                    created_by_id: request.user?.id,
                    updated_by_id: request.user?.id
                })
                .returning();
            result = newNoteResult[0];
            reply.code(201);
            return {
                status: 201,
                message: "Nursing clinical note created successfully",
                data: result,
            };
        }
    } catch (error) {
        logger.error("Error in store:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Create new nursing clinical note
export const create = async (request, reply) => {
    try {
        const noteData = request.body;

        const newNoteResult = await db.insert(nursing_clinical_notes)
            .values({
                ...noteData,
                nurse_id: noteData.nurse_id || request.user?.id,
                nurse_name: noteData.nurse_name || `${request.user?.firstName} ${request.user?.lastName}`,
                note_status: noteData.note_status || 'DRAFT',
                note_timestamp: new Date(),
                created_by_id: request.user?.id,
                updated_by_id: request.user?.id
            })
            .returning();
        const result = newNoteResult[0];

        reply.code(201);
        return {
            status: 201,
            message: "Nursing clinical note created successfully",
            data: result,
        };
    } catch (error) {
        logger.error("Error in create:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Delete nursing clinical note (soft delete)
export const destroy = async (request, reply) => {
    try {
        const { id } = request.params;

        const noteResult = await db.select(nursingNoteSelectFields)
            .from(nursing_clinical_notes)
            .where(and(
                eq(nursing_clinical_notes.id, parseInt(id)),
                isNull(nursing_clinical_notes.deleted_at)
            ))
            .limit(1);
        const note = noteResult[0];

        if (!note) {
            reply.code(404);
            return { message: "Nursing clinical note not found" };
        }

        // Only allow deletion of unsigned notes
        if (note.note_status === 'SIGNED') {
            reply.code(403);
            return {
                status: 403,
                message: 'Cannot delete signed notes'
            };
        }

        // Soft delete
        await db.update(nursing_clinical_notes)
            .set({
                deleted_at: new Date(),
                updated_by_id: request.user?.id
            })
            .where(eq(nursing_clinical_notes.id, parseInt(id)));

        reply.code(200);
        return {
            status: 200,
            message: 'Nursing clinical note deleted'
        };
    } catch (error) {
        logger.error("Error in destroy:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Sign nursing clinical note (21 CFR Part 11 compliance)
export const sign = async (request, reply) => {
    try {
        const { id } = request.params;

        const noteResult = await db.select(nursingNoteSelectFields)
            .from(nursing_clinical_notes)
            .where(and(
                eq(nursing_clinical_notes.id, parseInt(id)),
                isNull(nursing_clinical_notes.deleted_at)
            ))
            .limit(1);
        const note = noteResult[0];

        if (!note) {
            reply.code(404);
            return { message: "Nursing clinical note not found" };
        }

        if (note.note_status === 'SIGNED') {
            reply.code(400);
            return {
                status: 400,
                message: 'Note already signed'
            };
        }

        // Generate signature hash
        const dataToSign = JSON.stringify({
            id: note.id,
            patient_id: note.patient_id,
            content: note.content,
            subjective: note.subjective,
            objective: note.objective,
            assessment: note.assessment,
            plan: note.plan
        });
        const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

        const result = await db.update(nursing_clinical_notes)
            .set({
                signed_at: new Date(),
                signed_by_id: request.user?.id,
                signature_hash: signatureHash,
                note_status: 'SIGNED',
                updated_by_id: request.user?.id,
                updatedAt: new Date()
            })
            .where(eq(nursing_clinical_notes.id, parseInt(id)))
            .returning();

        reply.code(200);
        return {
            status: 200,
            message: 'Nursing clinical note signed successfully',
            data: result[0]
        };
    } catch (error) {
        logger.error("Error in sign:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Update note status
export const updateStatus = async (request, reply) => {
    try {
        const { id } = request.params;
        const { status: newStatus } = request.body;

        const validStatuses = ['DRAFT', 'IN_PROGRESS', 'COMPLETED', 'PENDING_SIGNATURE', 'SIGNED', 'AMENDED', 'VOID'];
        if (!validStatuses.includes(newStatus)) {
            reply.code(400);
            return {
                status: 400,
                message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`
            };
        }

        const noteResult = await db.select(nursingNoteSelectFields)
            .from(nursing_clinical_notes)
            .where(and(
                eq(nursing_clinical_notes.id, parseInt(id)),
                isNull(nursing_clinical_notes.deleted_at)
            ))
            .limit(1);
        const note = noteResult[0];

        if (!note) {
            reply.code(404);
            return { message: "Nursing clinical note not found" };
        }

        // Don't allow status changes on signed notes except to AMENDED
        if (note.note_status === 'SIGNED' && newStatus !== 'AMENDED') {
            reply.code(403);
            return {
                status: 403,
                message: 'Cannot change status of signed notes except to AMENDED'
            };
        }

        const result = await db.update(nursing_clinical_notes)
            .set({
                note_status: newStatus,
                updated_by_id: request.user?.id,
                updatedAt: new Date()
            })
            .where(eq(nursing_clinical_notes.id, parseInt(id)))
            .returning();

        reply.code(200);
        return {
            status: 200,
            message: 'Note status updated successfully',
            data: result[0]
        };
    } catch (error) {
        logger.error("Error in updateStatus:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Get notes by nurse
export const getNotesByNurse = async (request, reply) => {
    try {
        const { nurse_id } = request.params;
        const { status, limit = 50, offset = 0 } = request.query;

        let query = db.select(nursingNoteSelectFields)
            .from(nursing_clinical_notes)
            .where(and(
                eq(nursing_clinical_notes.nurse_id, nurse_id),
                isNull(nursing_clinical_notes.deleted_at)
            ));

        if (status) {
            query = query.where(eq(nursing_clinical_notes.note_status, status));
        }

        const results = await query
            .orderBy(desc(nursing_clinical_notes.note_timestamp))
            .limit(parseInt(limit))
            .offset(parseInt(offset));

        reply.code(200);
        return {
            status: 200,
            data: results,
            count: results.length
        };
    } catch (error) {
        logger.error("Error in getNotesByNurse:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Get notes by patient
export const getNotesByPatient = async (request, reply) => {
    try {
        const { patient_id } = request.params;
        const { status, limit = 50, offset = 0 } = request.query;

        let query = db.select(nursingNoteSelectFields)
            .from(nursing_clinical_notes)
            .where(and(
                eq(nursing_clinical_notes.patient_id, parseInt(patient_id)),
                isNull(nursing_clinical_notes.deleted_at)
            ));

        if (status) {
            query = query.where(eq(nursing_clinical_notes.note_status, status));
        }

        const results = await query
            .orderBy(desc(nursing_clinical_notes.note_timestamp))
            .limit(parseInt(limit))
            .offset(parseInt(offset));

        reply.code(200);
        return {
            status: 200,
            data: results,
            count: results.length
        };
    } catch (error) {
        logger.error("Error in getNotesByPatient:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Get unsigned notes
export const getUnsignedNotes = async (request, reply) => {
    try {
        const { nurse_id } = request.query;

        let query = db.select(nursingNoteSelectFields)
            .from(nursing_clinical_notes)
            .where(and(
                isNull(nursing_clinical_notes.deleted_at),
                eq(nursing_clinical_notes.note_status, 'PENDING_SIGNATURE')
            ));

        if (nurse_id) {
            query = query.where(eq(nursing_clinical_notes.nurse_id, nurse_id));
        }

        const results = await query.orderBy(desc(nursing_clinical_notes.note_timestamp));

        reply.code(200);
        return {
            status: 200,
            data: results,
            count: results.length
        };
    } catch (error) {
        logger.error("Error in getUnsignedNotes:", error);
        reply.code(500);
        return { message: "Server error" };
    }
};

// Generate PDF for nursing clinical note
export const generatePdf = async (request, reply) => {
    try {
        const { noteId } = request.params;
        
        // In a real implementation, we would generate a PDF using a library like pdfmake or puppeteer
        // For now, we'll return a simple success response
        
        reply.code(200);
            return {
            message: `PDF generation would be implemented here for note ID: ${noteId}`,
            note: 'In a real implementation, this would generate a PDF using a library like pdfmake or puppeteer'
        };
    } catch (error) {
        logger.error("Error in generatePdf:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Start note for benefit period
export const startNote = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { periodId } = request.params;
        const noteData = request.body;

        // Add benefit_period_id to the note data
        noteData.benefit_period_id = periodId;

        const noteResult = await db.insert(nursing_clinical_notes)
            .values(noteData)
            .returning();
        const note = noteResult[0];

        reply.code(201);
            return {
            message: "Nursing clinical note started successfully",
            data: note,
        };
    } catch (error) {
        logger.error("Error in startNote:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Auto save vital signs
export const autoSaveVitalSigns = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { noteId } = request.params;
        const validatedData = request.body;

        // Add note_id to the data
        validatedData.note_id = noteId;

        // Check if vital signs already exist for this note
        const existingVitalSigns = await db.select().from(vital_signs)
            .where(eq(vital_signs.note_id, parseInt(noteId)))
            .limit(1);
            
        let vitalSign;
        if (existingVitalSigns.length > 0) {
            // Update existing record
            const updatedVitalSigns = await db.update(vital_signs)
                .set(addUpdatedAt(validatedData))
                .where(eq(vital_signs.note_id, parseInt(noteId)))
                .returning();
            vitalSign = updatedVitalSigns[0];
        } else {
            // Create new record
            const newVitalSigns = await db.insert(vital_signs)
                .values(addTimestamps(validatedData))
                .returning();
            vitalSign = newVitalSigns[0];
        }

        reply.code(200);
            return vitalSign;
    } catch (error) {
        logger.error("Error in autoSaveVitalSigns:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Get vital signs
export const getVitalSigns = async (request, reply) => {
    try {
        const { noteId } = request.params;
        const vitalSignsResult = await db.select().from(vital_signs)
            .where(eq(vital_signs.note_id, parseInt(noteId)))
            .limit(1);
        const vitalSigns = vitalSignsResult[0];

        if (vitalSigns) {
            reply.code(200);
            return vitalSigns;
        } else {
            reply.code(404);
            return {
                message: "No vital signs found for the given note ID.",
            };
        }
    } catch (error) {
        logger.error("Error in getVitalSigns:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Index scale tool lab data
export const indexScaleToolLabData = async (request, reply) => {
    try {
        const { noteId } = request.params;
        const dataResult = await db.select().from(scale_tool_lab_data)
            .where(eq(scale_tool_lab_data.note_id, parseInt(noteId)))
            .limit(1);
        const data = dataResult[0];
        reply.code(200);
            return data;
    } catch (error) {
        logger.error("Error in indexScaleToolLabData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Auto save scale tool lab data
export const autoSaveScaleToolLabData = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { noteId } = request.params;
        const validatedData = request.body;

        validatedData.note_id = noteId;

        // Check if scale tool lab data already exists for this note
        const existingData = await db.select().from(scale_tool_lab_data)
            .where(eq(scale_tool_lab_data.note_id, parseInt(noteId)))
            .limit(1);
            
        let scaleToolLabData;
        if (existingData.length > 0) {
            // Update existing record
            const updatedData = await db.update(scale_tool_lab_data)
                .set(addUpdatedAt(validatedData))
                .where(eq(scale_tool_lab_data.note_id, parseInt(noteId)))
                .returning();
            scaleToolLabData = updatedData[0];
        } else {
            // Create new record
            const newData = await db.insert(scale_tool_lab_data)
                .values(addTimestamps(validatedData))
                .returning();
            scaleToolLabData = newData[0];
        }

        reply.code(200);
            return scaleToolLabData;
    } catch (error) {
        logger.error("Error in autoSaveScaleToolLabData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Index pain data
export const indexPainData = async (request, reply) => {
    try {
        const { noteId } = request.params;
        const dataResult = await db.select().from(pain_data)
            .where(eq(pain_data.note_id, parseInt(noteId)))
            .limit(1);
        const data = dataResult[0];
        reply.code(200);
            return data;
    } catch (error) {
        logger.error("Error in indexPainData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Auto save pain data
export const autoSavePainData = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { noteId } = request.params;
        const validatedData = request.body;

        validatedData.note_id = noteId;

        // Check if pain data already exists for this note
        const existingData = await db.select().from(pain_data)
            .where(eq(pain_data.note_id, parseInt(noteId)))
            .limit(1);
            
        let painData;
        if (existingData.length > 0) {
            // Update existing record
            const updatedData = await db.update(pain_data)
                .set(addUpdatedAt(validatedData))
                .where(eq(pain_data.note_id, parseInt(noteId)))
                .returning();
            painData = updatedData[0];
        } else {
            // Create new record
            const newData = await db.insert(pain_data)
                .values(addTimestamps(validatedData))
                .returning();
            painData = newData[0];
        }

        reply.code(200);
            return painData;
    } catch (error) {
        logger.error("Error in autoSavePainData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Index painad data
export const indexPainadData = async (request, reply) => {
    try {
        const { noteId } = request.params;
        const painadDataResult = await db.select().from(painad_data)
            .where(eq(painad_data.note_id, parseInt(noteId)))
            .limit(1);
        const painadData = painadDataResult[0];
        reply.code(200);
            return painadData;
    } catch (error) {
        logger.error("Error in indexPainadData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Auto save painad data
export const autoSavePainadData = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { noteId } = request.params;
        const validatedData = request.body;

        validatedData.note_id = noteId;

        // Check if painad data already exists for this note
        const existingData = await db.select().from(painad_data)
            .where(eq(painad_data.note_id, parseInt(noteId)))
            .limit(1);
            
        let painadData;
        if (existingData.length > 0) {
            // Update existing record
            const updatedData = await db.update(painad_data)
                .set(addUpdatedAt(validatedData))
                .where(eq(painad_data.note_id, parseInt(noteId)))
                .returning();
            painadData = updatedData[0];
        } else {
            // Create new record
            const newData = await db.insert(painad_data)
                .values(addTimestamps(validatedData))
                .returning();
            painadData = newData[0];
        }

        reply.code(200);
            return painadData;
    } catch (error) {
        logger.error("Error in autoSavePainadData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Index flacc data
export const indexFlaccData = async (request, reply) => {
    try {
        const { noteId } = request.params;
        const flaccDataResult = await db.select().from(flacc_data)
            .where(eq(flacc_data.note_id, parseInt(noteId)))
            .limit(1);
        const flaccData = flaccDataResult[0];
        reply.code(200);
            return flaccData;
    } catch (error) {
        logger.error("Error in indexFlaccData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Auto save flacc data
export const autoSaveFlaccData = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { noteId } = request.params;
        const validatedData = request.body;

        validatedData.note_id = noteId;

        // Check if flacc data already exists for this note
        const existingData = await db.select().from(flacc_data)
            .where(eq(flacc_data.note_id, parseInt(noteId)))
            .limit(1);
            
        let flaccData;
        if (existingData.length > 0) {
            // Update existing record
            const updatedData = await db.update(flacc_data)
                .set(addUpdatedAt(validatedData))
                .where(eq(flacc_data.note_id, parseInt(noteId)))
                .returning();
            flaccData = updatedData[0];
        } else {
            // Create new record
            const newData = await db.insert(flacc_data)
                .values(addTimestamps(validatedData))
                .returning();
            flaccData = newData[0];
        }

        reply.code(200);
            return flaccData;
    } catch (error) {
        logger.error("Error in autoSaveFlaccData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Index cardiovascular data
export const indexCardiovascularData = async (request, reply) => {
    try {
        const { noteId } = request.params;
        const dataResult = await db.select().from(cardiovascular_data)
            .where(eq(cardiovascular_data.note_id, parseInt(noteId)))
            .limit(1);
        const data = dataResult[0];
        reply.code(200);
            return data;
    } catch (error) {
        logger.error("Error in indexCardiovascularData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Auto save cardiovascular data
export const autoSaveCardiovascularData = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { noteId } = request.params;
        const validatedData = request.body;

        validatedData.note_id = noteId;

        // Check if cardiovascular data already exists for this note
        const existingData = await db.select().from(cardiovascular_data)
            .where(eq(cardiovascular_data.note_id, parseInt(noteId)))
            .limit(1);
            
        let cardiovascularData;
        if (existingData.length > 0) {
            // Update existing record
            const updatedData = await db.update(cardiovascular_data)
                .set(addUpdatedAt(validatedData))
                .where(eq(cardiovascular_data.note_id, parseInt(noteId)))
                .returning();
            cardiovascularData = updatedData[0];
        } else {
            // Create new record
            const newData = await db.insert(cardiovascular_data)
                .values(addTimestamps(validatedData))
                .returning();
            cardiovascularData = newData[0];
        }

        reply.code(200);
            return cardiovascularData;
    } catch (error) {
        logger.error("Error in autoSaveCardiovascularData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Index respiratory data
export const indexRespiratoryData = async (request, reply) => {
    try {
        const { noteId } = request.params;
        const dataResult = await db.select().from(respiratory_data)
            .where(eq(respiratory_data.note_id, parseInt(noteId)))
            .limit(1);
        const data = dataResult[0];
        reply.code(200);
            return data;
    } catch (error) {
        logger.error("Error in indexRespiratoryData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Auto save respiratory data
export const autoSaveRespiratoryData = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { noteId } = request.params;
        const validatedData = request.body;

        validatedData.note_id = noteId;

        // Check if respiratory data already exists for this note
        const existingData = await db.select().from(respiratory_data)
            .where(eq(respiratory_data.note_id, parseInt(noteId)))
            .limit(1);
            
        let respiratoryData;
        if (existingData.length > 0) {
            // Update existing record
            const updatedData = await db.update(respiratory_data)
                .set(addUpdatedAt(validatedData))
                .where(eq(respiratory_data.note_id, parseInt(noteId)))
                .returning();
            respiratoryData = updatedData[0];
        } else {
            // Create new record
            const newData = await db.insert(respiratory_data)
                .values(addTimestamps(validatedData))
                .returning();
            respiratoryData = newData[0];
        }

        reply.code(200);
            return respiratoryData;
    } catch (error) {
        logger.error("Error in autoSaveRespiratoryData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Index genitourinary data
export const indexGenitourinaryData = async (request, reply) => {
    try {
        const { noteId } = request.params;
        const dataResult = await db.select().from(genitourinary_data)
            .where(eq(genitourinary_data.note_id, parseInt(noteId)))
            .limit(1);
        const data = dataResult[0];
        reply.code(200);
            return data;
    } catch (error) {
        logger.error("Error in indexGenitourinaryData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Auto save genitourinary data
export const autoSaveGenitourinaryData = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { noteId } = request.params;
        const validatedData = request.body;

        validatedData.note_id = noteId;

        // Check if genitourinary data already exists for this note
        const existingData = await db.select().from(genitourinary_data)
            .where(eq(genitourinary_data.note_id, parseInt(noteId)))
            .limit(1);
            
        let genitourinaryData;
        if (existingData.length > 0) {
            // Update existing record
            const updatedData = await db.update(genitourinary_data)
                .set(addUpdatedAt(validatedData))
                .where(eq(genitourinary_data.note_id, parseInt(noteId)))
                .returning();
            genitourinaryData = updatedData[0];
        } else {
            // Create new record
            const newData = await db.insert(genitourinary_data)
                .values(addTimestamps(validatedData))
                .returning();
            genitourinaryData = newData[0];
        }

        reply.code(200);
            return genitourinaryData;
    } catch (error) {
        logger.error("Error in autoSaveGenitourinaryData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Index gastrointestinal data
export const indexGastrointestinalData = async (request, reply) => {
    try {
        const { noteId } = request.params;
        const dataResult = await db.select().from(gastrointestinal_data)
            .where(eq(gastrointestinal_data.note_id, parseInt(noteId)))
            .limit(1);
        const data = dataResult[0];
        reply.code(200);
            return data;
    } catch (error) {
        logger.error("Error in indexGastrointestinalData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};

// Auto save gastrointestinal data
export const autoSaveGastrointestinalData = async (request, reply) => {
    try {
        // Note: Validation should be done in route schema
        // Validation handled in route schema

        const { noteId } = request.params;
        const validatedData = request.body;

        validatedData.note_id = noteId;

        // Check if gastrointestinal data already exists for this note
        const existingData = await db.select().from(gastrointestinal_data)
            .where(eq(gastrointestinal_data.note_id, parseInt(noteId)))
            .limit(1);
            
        let gastrointestinalData;
        if (existingData.length > 0) {
            // Update existing record
            const updatedData = await db.update(gastrointestinal_data)
                .set(addUpdatedAt(validatedData))
                .where(eq(gastrointestinal_data.note_id, parseInt(noteId)))
                .returning();
            gastrointestinalData = updatedData[0];
        } else {
            // Create new record
            const newData = await db.insert(gastrointestinal_data)
                .values(addTimestamps(validatedData))
                .returning();
            gastrointestinalData = newData[0];
        }

        reply.code(200);
            return gastrointestinalData;
    } catch (error) {
        logger.error("Error in autoSaveGastrointestinalData:", error)
        reply.code(500);
            return { message: "Server error" };
    }
};