import { db } from "../../config/db.drizzle.js";
import { patients } from "../../db/schemas/patient.schema.js";
import { benefit_periods, benefit_period_loc, benefit_period_elections } from "../../db/schemas/benefitPeriod.schema.js";
import { nursing_clinical_notes } from "../../db/schemas/nursingClinicalNote.schema.js";
import { eq, desc, and, isNull } from "drizzle-orm";
import { logAudit } from "../../middleware/audit.middleware.js";

import { logger } from '../../utils/logger.js';

/**
 * Medicare Hospice Benefit Period Controller
 *
 * Endpoints:
 * 1. POST   /patient/:patientId/benefit-periods/create-next - Create next benefit period
 * 2. GET    /patient/:patientId/benefit-periods             - List all benefit periods
 * 3. GET    /benefit-periods/:id                            - Get benefit period details
 * 4. PUT    /benefit-periods/:id                            - Update benefit period
 * 5. POST   /benefit-periods/:id/loc                        - Add level of care change
 * 6. GET    /benefit-periods/:id/loc                        - Get level of care history
 * 7. POST   /benefit-periods/:id/election                   - Record election/revocation
 * 8. GET    /patient/:patientId/elections                   - Get election history
 * 9. GET    /patient/:patientId/current-benefit-period      - Get current active benefit period
 */

// Helper function to determine period type based on period number
const getPeriodType = (periodNumber) => {
    if (periodNumber === 1) return 'INITIAL_90';
    if (periodNumber === 2) return 'SUBSEQUENT_90';
    return 'SUBSEQUENT_60';
};

// Helper function to determine if face-to-face is required (3rd+ benefit period)
const isFaceToFaceRequired = (periodNumber) => periodNumber >= 3;

// Revenue codes for level of care
const LOC_REVENUE_CODES = {
    'RHC': '0651',  // Routine Home Care
    'CHC': '0652',  // Continuous Home Care
    'GIP': '0655',  // General Inpatient Care
    'IRC': '0656'   // Inpatient Respite Care
};

class BenefitPeriodController {
    // Create next benefit period for a patient (enhanced with Medicare compliance)
    async createNextPeriod(request, reply) {
        try {
            const { patientId } = request.params;
            const {
                election_date,
                election_statement_signed,
                certification_date,
                certifying_physician_id,
                terminal_prognosis_confirmed,
                prognosis_6_months_or_less,
                notes
            } = request.body || {};

            // Find the patient
            const patientRecords = await db.select({ id: patients.id }).from(patients).where(eq(patients.id, patientId)).limit(1);
            const patient = patientRecords[0];

            if (!patient) {
                return reply.code(404).send({
                    success: false,
                    error: "Patient not found",
                });
            }

            // Find the last benefit period for this patient
            const benefitPeriodRecords = await db.select({
                id: benefit_periods.id,
                patient_id: benefit_periods.patient_id,
                start_date: benefit_periods.start_date,
                end_date: benefit_periods.end_date,
                period_number: benefit_periods.period_number,
                period_type: benefit_periods.period_type,
                status: benefit_periods.status,
            }).from(benefit_periods)
                .where(and(
                    eq(benefit_periods.patient_id, patientId),
                    isNull(benefit_periods.deleted_at)
                ))
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
                startDate = election_date ? new Date(election_date) : new Date();
                periodNumber = 1;
            }

            // Determine duration based on period number (Medicare hospice benefit structure)
            // First two periods: 90 days each, subsequent periods: 60 days
            const duration = periodNumber === 1 || periodNumber === 2 ? 90 : 60;
            const periodType = getPeriodType(periodNumber);
            const faceToFaceRequired = isFaceToFaceRequired(periodNumber);

            // Calculate end date
            const endDate = new Date(startDate);
            endDate.setDate(endDate.getDate() + duration - 1);

            // Calculate recertification required by date (typically 2 days before end)
            const recertificationDate = new Date(endDate);
            recertificationDate.setDate(recertificationDate.getDate() - 2);

            // Create the new benefit period with enhanced fields
            const now = new Date();
            const newBenefitPeriod = await db.insert(benefit_periods).values({
                patient_id: parseInt(patientId),
                period_number: periodNumber,
                period_type: periodType,
                start_date: startDate.toISOString().split('T')[0],
                end_date: endDate.toISOString().split('T')[0],
                election_date: election_date || startDate.toISOString().split('T')[0],
                election_statement_signed: election_statement_signed || false,
                election_statement_date: election_statement_signed ? (election_date || startDate.toISOString().split('T')[0]) : null,
                certification_date: certification_date || null,
                certifying_physician_id: certifying_physician_id || null,
                recertification_required_by: recertificationDate.toISOString().split('T')[0],
                face_to_face_required: faceToFaceRequired,
                face_to_face_completed: false,
                status: 'ACTIVE',
                terminal_prognosis_confirmed: terminal_prognosis_confirmed || false,
                prognosis_6_months_or_less: prognosis_6_months_or_less || false,
                noe_filed: false,
                notes: notes || null,
                created_by_id: request.user?.id || null,
                createdAt: now,
                updatedAt: now,
            }).returning();

            // Log audit - CREATE benefit period
            await logAudit(request, 'CREATE', 'benefit_periods', newBenefitPeriod[0]?.id);

            return reply.code(201).send({
                success: true,
                message: "New benefit period created successfully",
                data: {
                    ...newBenefitPeriod[0],
                    duration_days: duration,
                    period_type_description: periodType === 'INITIAL_90'
                        ? 'Initial 90-day certification period'
                        : periodType === 'SUBSEQUENT_90'
                        ? 'Second 90-day certification period'
                        : 'Subsequent 60-day certification period'
                },
            });
        } catch (error) {
            logger.error("Error creating benefit period:", error)
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }

    // List all benefit periods for a patient
    async listBenefitPeriods(request, reply) {
        try {
            const { patientId } = request.params;
            const { status, includeDeleted } = request.query || {};

            let query = db.select().from(benefit_periods)
                .where(eq(benefit_periods.patient_id, parseInt(patientId)));

            if (!includeDeleted) {
                query = db.select().from(benefit_periods)
                    .where(and(
                        eq(benefit_periods.patient_id, parseInt(patientId)),
                        isNull(benefit_periods.deleted_at)
                    ));
            }

            const periods = await query.orderBy(desc(benefit_periods.start_date));

            // Filter by status if provided
            const filteredPeriods = status
                ? periods.filter(p => p.status === status)
                : periods;

            await logAudit(request, 'READ', 'benefit_periods', parseInt(patientId));

            return reply.code(200).send({
                success: true,
                count: filteredPeriods.length,
                data: filteredPeriods
            });
        } catch (error) {
            logger.error("Error listing benefit periods:", error);
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }

    // Get single benefit period with details
    async getBenefitPeriod(request, reply) {
        try {
            const { id } = request.params;

            const periodRecords = await db.select()
                .from(benefit_periods)
                .where(eq(benefit_periods.id, parseInt(id)))
                .limit(1);

            const period = periodRecords[0];

            if (!period) {
                return reply.code(404).send({
                    success: false,
                    error: "Benefit period not found",
                });
            }

            // Get associated level of care records
            const locRecords = await db.select()
                .from(benefit_period_loc)
                .where(eq(benefit_period_loc.benefit_period_id, parseInt(id)))
                .orderBy(desc(benefit_period_loc.effective_date));

            // Get associated election records
            const electionRecords = await db.select()
                .from(benefit_period_elections)
                .where(eq(benefit_period_elections.benefit_period_id, parseInt(id)))
                .orderBy(desc(benefit_period_elections.election_date));

            await logAudit(request, 'READ', 'benefit_periods', parseInt(id));

            return reply.code(200).send({
                success: true,
                data: {
                    ...period,
                    level_of_care_history: locRecords,
                    election_history: electionRecords
                }
            });
        } catch (error) {
            logger.error("Error getting benefit period:", error);
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }

    // Update benefit period
    async updateBenefitPeriod(request, reply) {
        try {
            const { id } = request.params;
            const updateData = request.body;

            const periodRecords = await db.select({ id: benefit_periods.id })
                .from(benefit_periods)
                .where(eq(benefit_periods.id, parseInt(id)))
                .limit(1);

            if (!periodRecords[0]) {
                return reply.code(404).send({
                    success: false,
                    error: "Benefit period not found",
                });
            }

            // Build update object with only provided fields
            const updateFields = {};
            const allowedFields = [
                'election_date', 'election_statement_signed', 'election_statement_date',
                'certification_date', 'certifying_physician_id', 'recertification_required_by',
                'face_to_face_completed', 'face_to_face_date',
                'revocation_date', 'revocation_reason', 'discharge_date', 'discharge_reason',
                'status', 'terminal_prognosis_confirmed', 'prognosis_6_months_or_less',
                'noe_filed', 'noe_filed_date', 'noe_timely', 'notes'
            ];

            for (const field of allowedFields) {
                if (updateData[field] !== undefined) {
                    updateFields[field] = updateData[field];
                }
            }

            updateFields.updatedAt = new Date();
            updateFields.updated_by_id = request.user?.id || null;

            const updatedPeriod = await db.update(benefit_periods)
                .set(updateFields)
                .where(eq(benefit_periods.id, parseInt(id)))
                .returning();

            await logAudit(request, 'UPDATE', 'benefit_periods', parseInt(id));

            return reply.code(200).send({
                success: true,
                message: "Benefit period updated successfully",
                data: updatedPeriod[0]
            });
        } catch (error) {
            logger.error("Error updating benefit period:", error);
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }

    // Add level of care change
    async addLevelOfCare(request, reply) {
        try {
            const { id } = request.params;
            const {
                level_of_care,
                effective_date,
                end_date,
                chc_start_time,
                chc_end_time,
                chc_total_hours,
                facility_id,
                facility_name,
                facility_npi,
                respite_day_count,
                crisis_reason,
                physician_order_date,
                ordering_physician_id,
                notes
            } = request.body;

            // Validate benefit period exists
            const periodRecords = await db.select({
                id: benefit_periods.id,
                patient_id: benefit_periods.patient_id
            })
                .from(benefit_periods)
                .where(eq(benefit_periods.id, parseInt(id)))
                .limit(1);

            if (!periodRecords[0]) {
                return reply.code(404).send({
                    success: false,
                    error: "Benefit period not found",
                });
            }

            // Validate level of care
            if (!['RHC', 'CHC', 'GIP', 'IRC'].includes(level_of_care)) {
                return reply.code(400).send({
                    success: false,
                    error: "Invalid level of care. Must be RHC, CHC, GIP, or IRC",
                });
            }

            // Close any existing active LOC record
            await db.update(benefit_period_loc)
                .set({
                    status: 'ENDED',
                    end_date: effective_date,
                    updatedAt: new Date()
                })
                .where(and(
                    eq(benefit_period_loc.benefit_period_id, parseInt(id)),
                    eq(benefit_period_loc.status, 'ACTIVE')
                ));

            // Create new LOC record
            const now = new Date();
            const newLocRecord = await db.insert(benefit_period_loc).values({
                benefit_period_id: parseInt(id),
                patient_id: periodRecords[0].patient_id,
                level_of_care: level_of_care,
                revenue_code: LOC_REVENUE_CODES[level_of_care],
                effective_date: effective_date,
                end_date: end_date || null,
                chc_start_time: chc_start_time || null,
                chc_end_time: chc_end_time || null,
                chc_total_hours: chc_total_hours || null,
                facility_id: facility_id || null,
                facility_name: facility_name || null,
                facility_npi: facility_npi || null,
                respite_day_count: respite_day_count || null,
                crisis_reason: crisis_reason || null,
                physician_order_date: physician_order_date || null,
                ordering_physician_id: ordering_physician_id || null,
                status: 'ACTIVE',
                notes: notes || null,
                created_by_id: request.user?.id || null,
                createdAt: now,
                updatedAt: now,
            }).returning();

            await logAudit(request, 'CREATE', 'benefit_period_loc', newLocRecord[0]?.id);

            return reply.code(201).send({
                success: true,
                message: "Level of care added successfully",
                data: newLocRecord[0]
            });
        } catch (error) {
            logger.error("Error adding level of care:", error);
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }

    // Get level of care history for a benefit period
    async getLevelOfCareHistory(request, reply) {
        try {
            const { id } = request.params;

            const locRecords = await db.select()
                .from(benefit_period_loc)
                .where(eq(benefit_period_loc.benefit_period_id, parseInt(id)))
                .orderBy(desc(benefit_period_loc.effective_date));

            await logAudit(request, 'READ', 'benefit_period_loc', parseInt(id));

            return reply.code(200).send({
                success: true,
                count: locRecords.length,
                data: locRecords
            });
        } catch (error) {
            logger.error("Error getting level of care history:", error);
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }

    // Record election or revocation
    async recordElection(request, reply) {
        try {
            const { id } = request.params;
            const {
                election_type,
                election_date,
                effective_date,
                election_statement_signed,
                election_statement_date,
                witness_name,
                witness_signature_date,
                hospice_provider_name,
                hospice_provider_npi,
                attending_physician_id,
                attending_physician_name,
                physician_acknowledgment_date,
                revocation_effective_date,
                revocation_reason,
                remaining_days_in_period,
                transfer_from_hospice,
                transfer_to_hospice,
                transfer_date,
                notes
            } = request.body;

            // Validate benefit period exists
            const periodRecords = await db.select({
                id: benefit_periods.id,
                patient_id: benefit_periods.patient_id
            })
                .from(benefit_periods)
                .where(eq(benefit_periods.id, parseInt(id)))
                .limit(1);

            if (!periodRecords[0]) {
                return reply.code(404).send({
                    success: false,
                    error: "Benefit period not found",
                });
            }

            // Validate election type
            const validTypes = ['INITIAL_ELECTION', 'RE_ELECTION', 'REVOCATION', 'TRANSFER_IN', 'TRANSFER_OUT'];
            if (!validTypes.includes(election_type)) {
                return reply.code(400).send({
                    success: false,
                    error: `Invalid election type. Must be one of: ${validTypes.join(', ')}`,
                });
            }

            // Create election record
            const now = new Date();
            const newElection = await db.insert(benefit_period_elections).values({
                patient_id: periodRecords[0].patient_id,
                benefit_period_id: parseInt(id),
                election_type: election_type,
                election_date: election_date,
                effective_date: effective_date,
                election_statement_signed: election_statement_signed || false,
                election_statement_date: election_statement_date || null,
                witness_name: witness_name || null,
                witness_signature_date: witness_signature_date || null,
                hospice_provider_name: hospice_provider_name || null,
                hospice_provider_npi: hospice_provider_npi || null,
                attending_physician_id: attending_physician_id || null,
                attending_physician_name: attending_physician_name || null,
                physician_acknowledgment_date: physician_acknowledgment_date || null,
                revocation_effective_date: revocation_effective_date || null,
                revocation_reason: revocation_reason || null,
                remaining_days_in_period: remaining_days_in_period || null,
                transfer_from_hospice: transfer_from_hospice || null,
                transfer_to_hospice: transfer_to_hospice || null,
                transfer_date: transfer_date || null,
                notes: notes || null,
                created_by_id: request.user?.id || null,
                createdAt: now,
                updatedAt: now,
            }).returning();

            // If revocation, update the benefit period status
            if (election_type === 'REVOCATION') {
                await db.update(benefit_periods)
                    .set({
                        status: 'REVOKED',
                        revocation_date: revocation_effective_date || election_date,
                        revocation_reason: revocation_reason,
                        updatedAt: now,
                        updated_by_id: request.user?.id || null
                    })
                    .where(eq(benefit_periods.id, parseInt(id)));
            }

            await logAudit(request, 'CREATE', 'benefit_period_elections', newElection[0]?.id);

            return reply.code(201).send({
                success: true,
                message: `${election_type.replace('_', ' ').toLowerCase()} recorded successfully`,
                data: newElection[0]
            });
        } catch (error) {
            logger.error("Error recording election:", error);
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }

    // Get election history for a patient
    async getElectionHistory(request, reply) {
        try {
            const { patientId } = request.params;

            const elections = await db.select()
                .from(benefit_period_elections)
                .where(eq(benefit_period_elections.patient_id, parseInt(patientId)))
                .orderBy(desc(benefit_period_elections.election_date));

            await logAudit(request, 'READ', 'benefit_period_elections', parseInt(patientId));

            return reply.code(200).send({
                success: true,
                count: elections.length,
                data: elections
            });
        } catch (error) {
            logger.error("Error getting election history:", error);
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
        }
    }

    // Get current active benefit period for a patient
    async getCurrentBenefitPeriod(request, reply) {
        try {
            const { patientId } = request.params;

            const currentPeriod = await db.select()
                .from(benefit_periods)
                .where(and(
                    eq(benefit_periods.patient_id, parseInt(patientId)),
                    eq(benefit_periods.status, 'ACTIVE'),
                    isNull(benefit_periods.deleted_at)
                ))
                .orderBy(desc(benefit_periods.start_date))
                .limit(1);

            if (!currentPeriod[0]) {
                return reply.code(404).send({
                    success: false,
                    error: "No active benefit period found for this patient",
                });
            }

            // Get current level of care
            const currentLoc = await db.select()
                .from(benefit_period_loc)
                .where(and(
                    eq(benefit_period_loc.benefit_period_id, currentPeriod[0].id),
                    eq(benefit_period_loc.status, 'ACTIVE')
                ))
                .limit(1);

            await logAudit(request, 'READ', 'benefit_periods', currentPeriod[0].id);

            return reply.code(200).send({
                success: true,
                data: {
                    ...currentPeriod[0],
                    current_level_of_care: currentLoc[0] || null
                }
            });
        } catch (error) {
            logger.error("Error getting current benefit period:", error);
            return reply.code(500).send({
                success: false,
                error: error.message,
            });
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
