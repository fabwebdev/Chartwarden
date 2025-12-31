import { db } from "../../config/db.drizzle.js";
import { patients } from "../../db/schemas/patient.schema.js";
import { benefit_periods } from "../../db/schemas/benefitPeriod.schema.js";
import { nursing_clinical_notes } from "../../db/schemas/nursingClinicalNote.schema.js";
import { eq, desc } from "drizzle-orm";
import { logAudit } from "../../middleware/audit.middleware.js";

import { logger } from '../../utils/logger.js';
class BenefitPeriodController {
    // Create next benefit period for a patient
    async createNextPeriod(request, reply) {
        try {
            const { patientId } = request.params;

            // Find the patient
            const patientRecords = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId)).limit(1);
            const patient = patientRecords[0];
            
            if (!patient) {
                reply.code(404);
            return {
                    message: "Patient not found",
                };
            }

            // Find the last benefit period for this patient
            const benefitPeriodRecords = await db.select({
                id: benefit_periods.id,
                patient_id: benefit_periods.patient_id,
                start_date: benefit_periods.start_date,
                end_date: benefit_periods.end_date,
                period_number: benefit_periods.period_number,
                createdAt: benefit_periods.createdAt,
                updatedAt: benefit_periods.updatedAt,
            }).from(benefit_periods)
                .where(eq(benefit_periods.patient_id, patientId))
                .orderBy(desc(benefit_periods.end_date))
                .limit(1);
            const lastBenefitPeriod = benefitPeriodRecords[0];

            let startDate, periodNumber;

            if (lastBenefitPeriod) {
                // Calculate start date as one day after the last period's end date
                const lastEndDate = new Date(lastBenefitPeriod.end_date);
                startDate = new Date(lastEndDate);
                startDate.setDate(startDate.getDate() + 1);
                periodNumber = lastBenefitPeriod.period_number + 1;
            } else {
                // No previous benefit periods, starting the first one
                startDate = new Date();
                periodNumber = 1;
            }

            // Determine duration based on period number
            const duration = periodNumber === 1 || periodNumber === 2 ? 90 : 60;

            // Calculate end date
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + duration - 1);

            // Create the new benefit period
            const now = new Date();
            const newBenefitPeriod = await db.insert(benefit_periods).values({
                patient_id: patientId,
                start_date: startDate,
                end_date: endDate,
                period_number: periodNumber,
                createdAt: now,
                updatedAt: now,
            }).returning();

            // Log audit - CREATE benefit period
            await logAudit(request, 'CREATE', 'benefit_periods', newBenefitPeriod[0]?.id);

            reply.code(201);
            return {
                message: "New benefit period created successfully",
                benefit_period: newBenefitPeriod[0],
            };
        } catch (error) {
            logger.error("Error creating benefit period:", error)
            reply.code(500);
            return {
                message: "Internal server error",
                error: error.message,
            };
        }
    }

    // Add nursing clinical note to a benefit period
    async addNursingClinicalNote(request, reply) {
        try {
            const { benefitPeriodId } = request.params;
            const { note_date, note } = request.body;

            // Find the benefit period
            const benefitPeriodRecords = await db.select({ id: benefit_periods.id }).from(benefit_periods).where(eq(benefit_periods.id, benefitPeriodId)).limit(1);
            const benefitPeriod = benefitPeriodRecords[0];
            
            if (!benefitPeriod) {
                reply.code(404);
            return {
                    message: "Benefit period not found",
                };
            }

            // Create the nursing clinical note
            const now = new Date();
            const nursingClinicalNote = await db.insert(nursing_clinical_notes).values({
                benefit_period_id: benefitPeriodId,
                note_date: note_date,
                note: note,
                createdAt: now,
                updatedAt: now,
            }).returning();

            // Log audit - CREATE nursing clinical note
            await logAudit(request, 'CREATE', 'nursing_clinical_notes', nursingClinicalNote[0]?.id);

            reply.code(201);
            return {
                message: "Nursing clinical note added successfully",
                nursing_clinical_note: nursingClinicalNote[0],
            };
        } catch (error) {
            logger.error("Error adding nursing clinical note:", error)
            reply.code(500);
            return {
                message: "Internal server error",
                error: error.message,
            };
        }
    }

    // Get patient chart with benefit periods and nursing clinical notes
    async getPatientChart(request, reply) {
        try {
            const { id } = request.params;

            // Find the patient
            const patientRecords = await db.select({
                id: patients.id,
                first_name: patients.first_name,
                last_name: patients.last_name,
                date_of_birth: patients.date_of_birth,
                gender: patients.gender,
                ssn: patients.ssn,
                address: patients.address,
                city: patients.city,
                state: patients.state,
                zip: patients.zip,
                phone: patients.phone,
                email: patients.email,
                emergency_contact: patients.emergency_contact,
                emergency_phone: patients.emergency_phone,
                createdAt: patients.createdAt,
                updatedAt: patients.updatedAt,
            }).from(patients).where(eq(patients.id, id)).limit(1);
            const patient = patientRecords[0];

            if (!patient) {
                reply.code(404);
            return {
                    message: "Patient not found",
                };
            }

            // Find benefit periods for the patient
            const benefitPeriods = await db.select({
                id: benefit_periods.id,
                patient_id: benefit_periods.patient_id,
                start_date: benefit_periods.start_date,
                end_date: benefit_periods.end_date,
                period_number: benefit_periods.period_number,
                createdAt: benefit_periods.createdAt,
                updatedAt: benefit_periods.updatedAt,
            }).from(benefit_periods).where(eq(benefit_periods.patient_id, id));

            // For each benefit period, get associated nursing clinical notes
            const patientWithRelations = {
                ...patient,
                benefitPeriods: await Promise.all(benefitPeriods.map(async (period) => {
                    const notes = await db.select({
                        id: nursing_clinical_notes.id,
                        benefit_period_id: nursing_clinical_notes.benefit_period_id,
                        note_date: nursing_clinical_notes.note_date,
                        time_in: nursing_clinical_notes.time_in,
                        time_out: nursing_clinical_notes.time_out,
                        patient_name: nursing_clinical_notes.patient_name,
                        patient_number: nursing_clinical_notes.patient_number,
                        location_name: nursing_clinical_notes.location_name,
                        benefit_period: nursing_clinical_notes.benefit_period,
                        dob: nursing_clinical_notes.dob,
                        location_number: nursing_clinical_notes.location_number,
                        prn_visit: nursing_clinical_notes.prn_visit,
                        patient_identifiers: nursing_clinical_notes.patient_identifiers,
                        createdAt: nursing_clinical_notes.createdAt,
                        updatedAt: nursing_clinical_notes.updatedAt,
                    }).from(nursing_clinical_notes).where(eq(nursing_clinical_notes.benefit_period_id, period.id));
                    return {
                        ...period,
                        nursingClinicalNotes: notes
                    };
                }))
            };

            // Log audit - READ benefit periods (patient chart)
            await logAudit(request, 'READ', 'benefit_periods', parseInt(id));

            return patientWithRelations;
        } catch (error) {
            logger.error("Error fetching patient chart:", error)
            reply.code(500);
            return {
                message: "Internal server error",
                error: error.message,
            };
        }
    }
}

export default new BenefitPeriodController();
