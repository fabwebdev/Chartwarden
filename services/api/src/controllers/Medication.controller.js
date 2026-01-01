import { db } from '../config/db.drizzle.js';
import {
  medications,
  mar_entries,
  comfort_kits,
  comfort_kit_usage_log,
  controlled_substance_log,
  medication_reconciliation,
  patients,
  patient_allergies,
  drug_interactions
} from '../db/schemas/index.js';
import { eq, and, desc, asc, sql, or, isNull, ilike, gte, lte, count } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';
import AuditService from '../services/AuditService.js';

// Valid medication administration routes
const VALID_ROUTES = ['ORAL', 'IV', 'IM', 'SQ', 'RECTAL', 'TOPICAL', 'SUBLINGUAL', 'INHALATION', 'TRANSDERMAL', 'OPHTHALMIC', 'OTIC', 'NASAL', 'OTHER'];

// Valid medication frequencies
const VALID_FREQUENCIES = ['ONCE', 'DAILY', 'BID', 'TID', 'QID', 'Q4H', 'Q6H', 'Q8H', 'Q12H', 'WEEKLY', 'MONTHLY', 'PRN', 'OTHER'];

// Valid controlled substance schedules
const VALID_SCHEDULES = ['SCHEDULE_II', 'SCHEDULE_III', 'SCHEDULE_IV', 'SCHEDULE_V'];
/**
 * Medication Controller
 * Manages medication administration, MAR, comfort kits, and controlled substances
 * CRITICAL: Clinical necessity and regulatory compliance
 */
class MedicationController {
  /**
   * Check for drug-drug interactions between a medication and patient's current medications
   * @param {number} patientId - Patient ID
   * @param {string} medicationName - Name of the medication to check
   * @returns {Promise<Array>} List of interactions found
   */
  async checkDrugInteractions(patientId, medicationName) {
    try {
      // Get patient's current active medications
      const currentMeds = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.patient_id, patientId),
          eq(medications.medication_status, 'ACTIVE'),
          isNull(medications.deleted_at)
        ));

      if (currentMeds.length === 0) {
        return [];
      }

      const interactions = [];
      const medNameLower = medicationName.toLowerCase();

      // Check interactions database for each current medication
      for (const med of currentMeds) {
        const foundInteractions = await db
          .select()
          .from(drug_interactions)
          .where(or(
            and(
              ilike(drug_interactions.drug1_name, `%${medNameLower}%`),
              ilike(drug_interactions.drug2_name, `%${med.medication_name}%`)
            ),
            and(
              ilike(drug_interactions.drug1_name, `%${med.medication_name}%`),
              ilike(drug_interactions.drug2_name, `%${medNameLower}%`)
            )
          ));

        if (foundInteractions.length > 0) {
          interactions.push(...foundInteractions.map(i => ({
            ...i,
            conflicting_medication: med.medication_name,
            conflicting_medication_id: med.id
          })));
        }
      }

      return interactions;
    } catch (error) {
      logger.error('Error checking drug interactions:', error);
      return [];
    }
  }

  /**
   * Check for allergies that may conflict with a medication
   * @param {number} patientId - Patient ID
   * @param {string} medicationName - Name of the medication to check
   * @returns {Promise<Array>} List of allergy warnings
   */
  async checkAllergyConflicts(patientId, medicationName) {
    try {
      const allergies = await db
        .select()
        .from(patient_allergies)
        .where(and(
          eq(patient_allergies.patient_id, patientId),
          eq(patient_allergies.status, 'ACTIVE'),
          eq(patient_allergies.allergen_type, 'MEDICATION'),
          isNull(patient_allergies.deleted_at)
        ));

      const medNameLower = medicationName.toLowerCase();
      const conflicts = allergies.filter(allergy => {
        const allergenLower = allergy.allergen_name.toLowerCase();
        return medNameLower.includes(allergenLower) || allergenLower.includes(medNameLower);
      });

      return conflicts;
    } catch (error) {
      logger.error('Error checking allergy conflicts:', error);
      return [];
    }
  }

  /**
   * Validate medication order data
   * @param {Object} data - Medication order data
   * @returns {Object} Validation result with isValid and errors
   */
  validateMedicationOrder(data) {
    const errors = [];

    // Required fields
    if (!data.medication_name || data.medication_name.trim() === '') {
      errors.push('Medication name is required');
    }
    if (!data.dosage || data.dosage.trim() === '') {
      errors.push('Dosage is required');
    }
    if (!data.medication_route || data.medication_route.trim() === '') {
      errors.push('Route is required');
    }
    if (!data.frequency || data.frequency.trim() === '') {
      errors.push('Frequency is required');
    }
    if (!data.start_date) {
      errors.push('Start date is required');
    }

    // Validate route if provided
    if (data.medication_route && !VALID_ROUTES.includes(data.medication_route.toUpperCase())) {
      errors.push(`Invalid medication route. Valid routes: ${VALID_ROUTES.join(', ')}`);
    }

    // Validate frequency if provided
    if (data.frequency && !VALID_FREQUENCIES.includes(data.frequency.toUpperCase())) {
      errors.push(`Invalid frequency. Valid frequencies: ${VALID_FREQUENCIES.join(', ')}`);
    }

    // Validate controlled schedule if provided
    if (data.controlled_schedule && !VALID_SCHEDULES.includes(data.controlled_schedule)) {
      errors.push(`Invalid controlled schedule. Valid schedules: ${VALID_SCHEDULES.join(', ')}`);
    }

    // Validate date range
    if (data.start_date && data.end_date) {
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);
      if (endDate < startDate) {
        errors.push('End date cannot be before start date');
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }

  /**
   * Get all medications for a patient with pagination
   * GET /patients/:id/medications
   * Query params: status, is_hospice_related, page, limit
   */
  async getPatientMedications(request, reply) {
    try {
      const { id } = request.params;
      const { status, is_hospice_related, page = '1', limit = '20' } = request.query;
      const patientId = parseInt(id);
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Build base conditions
      const conditions = [
        eq(medications.patient_id, patientId),
        isNull(medications.deleted_at)
      ];

      // Filter by status if provided
      if (status) {
        conditions.push(eq(medications.medication_status, status));
      }

      // Filter by hospice-related if provided
      if (is_hospice_related !== undefined) {
        conditions.push(eq(medications.is_hospice_related, is_hospice_related === 'true'));
      }

      // Get total count for pagination
      const totalCountResult = await db
        .select({ value: count() })
        .from(medications)
        .where(and(...conditions));
      const total = Number(totalCountResult[0]?.value || 0);

      // Get paginated results
      const results = await db
        .select()
        .from(medications)
        .where(and(...conditions))
        .orderBy(desc(medications.start_date))
        .limit(limitNum)
        .offset(offset);

      reply.code(200);
      return {
        status: 200,
        data: results,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      };
    } catch (error) {
      logger.error('Error fetching patient medications:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching medications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single medication by ID
   * GET /patients/:id/medications/:medId
   */
  async getMedication(request, reply) {
    try {
      const { id, medId } = request.params;

      const result = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.id, parseInt(medId)),
          eq(medications.patient_id, parseInt(id)),
          isNull(medications.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Medication not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching medication:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching medication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create new medication order with validation and safety checks
   * POST /patients/:id/medications
   */
  async createMedication(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const patientId = parseInt(id);

      // Validate required fields
      const validation = this.validateMedicationOrder(data);
      if (!validation.isValid) {
        reply.code(400);
        return {
          status: 400,
          message: 'Validation failed',
          errors: validation.errors
        };
      }

      // Check for patient allergies (warnings, not blocking)
      const allergyConflicts = await this.checkAllergyConflicts(patientId, data.medication_name);

      // Check for drug interactions (warnings, not blocking unless override=false)
      const drugInteractions = await this.checkDrugInteractions(patientId, data.medication_name);

      // If there are severe/contraindicated interactions and no override, block
      const severeInteractions = drugInteractions.filter(i =>
        ['CONTRAINDICATED', 'SEVERE'].includes(i.interaction_severity)
      );

      if (severeInteractions.length > 0 && !data.override_warnings) {
        reply.code(409);
        return {
          status: 409,
          message: 'Severe drug interactions detected. Set override_warnings=true to proceed.',
          warnings: {
            drug_interactions: severeInteractions,
            allergy_conflicts: allergyConflicts
          }
        };
      }

      // If there are allergy conflicts and no override, block
      if (allergyConflicts.length > 0 && !data.override_warnings) {
        reply.code(409);
        return {
          status: 409,
          message: 'Allergy conflicts detected. Set override_warnings=true to proceed.',
          warnings: {
            allergy_conflicts: allergyConflicts,
            drug_interactions: drugInteractions
          }
        };
      }

      const result = await db
        .insert(medications)
        .values({
          patient_id: patientId,
          medication_name: data.medication_name,
          generic_name: data.generic_name,
          ndc_code: data.ndc_code,
          medication_status: data.medication_status || 'ACTIVE',
          medication_route: data.medication_route?.toUpperCase(),
          dosage: data.dosage,
          frequency: data.frequency?.toUpperCase(),
          instructions: data.instructions,
          start_date: data.start_date,
          end_date: data.end_date,
          controlled_schedule: data.controlled_schedule,
          is_hospice_related: data.is_hospice_related ?? true,
          prescriber_id: data.prescriber_id,
          order_id: data.order_id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // If this is a controlled substance, create initial log entry
      if (data.controlled_schedule) {
        await db.insert(controlled_substance_log).values({
          patient_id: patientId,
          medication_id: result[0].id,
          log_date: new Date(),
          action: 'DISPENSED',
          medication_name: data.medication_name,
          quantity: data.initial_quantity || 'Not specified',
          logged_by_id: request.user?.id
        });
      }

      // Create audit log for medication creation
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'CREATE',
          resource_type: 'medications',
          resource_id: String(result[0].id),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            patient_id: patientId,
            medication_name: result[0].medication_name,
            dosage: result[0].dosage,
            frequency: result[0].frequency,
            is_controlled: !!data.controlled_schedule,
            has_warnings_overridden: drugInteractions.length > 0 || allergyConflicts.length > 0
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for medication creation:', auditError);
        // Don't fail the request if audit logging fails
      }

      // Build response with any warnings
      const response = {
        status: 201,
        message: 'Medication created',
        data: result[0]
      };

      // Include warnings if any were overridden
      if (drugInteractions.length > 0 || allergyConflicts.length > 0) {
        response.warnings = {
          drug_interactions: drugInteractions,
          allergy_conflicts: allergyConflicts,
          overridden: true
        };
      }

      reply.code(201);
      return response;
    } catch (error) {
      logger.error('Error creating medication:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating medication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update existing medication order with drug interaction checking
   * PUT /patients/:id/medications/:medId
   */
  async updateMedication(request, reply) {
    try {
      const { id, medId } = request.params;
      const data = request.body;
      const patientId = parseInt(id);
      const medicationId = parseInt(medId);

      // Check if medication exists
      const existing = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.id, medicationId),
          eq(medications.patient_id, patientId),
          isNull(medications.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Medication not found'
        };
      }

      // Cannot update discontinued medications
      if (existing[0].medication_status === 'DISCONTINUED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Cannot update discontinued medication. Create a new order instead.'
        };
      }

      // Validate route if being updated
      if (data.medication_route && !VALID_ROUTES.includes(data.medication_route.toUpperCase())) {
        reply.code(400);
        return {
          status: 400,
          message: `Invalid medication route. Valid routes: ${VALID_ROUTES.join(', ')}`
        };
      }

      // Validate frequency if being updated
      if (data.frequency && !VALID_FREQUENCIES.includes(data.frequency.toUpperCase())) {
        reply.code(400);
        return {
          status: 400,
          message: `Invalid frequency. Valid frequencies: ${VALID_FREQUENCIES.join(', ')}`
        };
      }

      // If medication_name is being changed, check for drug interactions
      let drugInteractions = [];
      let allergyConflicts = [];
      if (data.medication_name && data.medication_name !== existing[0].medication_name) {
        // Check for drug interactions and allergy conflicts with the new medication name
        [drugInteractions, allergyConflicts] = await Promise.all([
          this.checkDrugInteractions(patientId, data.medication_name),
          this.checkAllergyConflicts(patientId, data.medication_name)
        ]);

        // Filter out interactions with the current medication being updated
        drugInteractions = drugInteractions.filter(i => i.conflicting_medication_id !== medicationId);

        // Filter severe interactions
        const severeInteractions = drugInteractions.filter(i =>
          ['CONTRAINDICATED', 'SEVERE'].includes(i.interaction_severity)
        );

        // Block if severe interactions found and no override
        if (severeInteractions.length > 0 && !data.override_warnings) {
          reply.code(409);
          return {
            status: 409,
            message: 'Severe drug interactions detected. Set override_warnings=true to proceed.',
            warnings: {
              drug_interactions: severeInteractions,
              allergy_conflicts: allergyConflicts
            }
          };
        }

        // Block if allergy conflicts found and no override
        if (allergyConflicts.length > 0 && !data.override_warnings) {
          reply.code(409);
          return {
            status: 409,
            message: 'Allergy conflicts detected. Set override_warnings=true to proceed.',
            warnings: {
              allergy_conflicts: allergyConflicts,
              drug_interactions: drugInteractions
            }
          };
        }
      }

      // Build update object with only provided fields
      const updateData = {
        updatedAt: new Date(),
        updated_by_id: request.user?.id
      };

      if (data.medication_name !== undefined) updateData.medication_name = data.medication_name;
      if (data.generic_name !== undefined) updateData.generic_name = data.generic_name;
      if (data.ndc_code !== undefined) updateData.ndc_code = data.ndc_code;
      if (data.medication_route !== undefined) updateData.medication_route = data.medication_route.toUpperCase();
      if (data.dosage !== undefined) updateData.dosage = data.dosage;
      if (data.frequency !== undefined) updateData.frequency = data.frequency.toUpperCase();
      if (data.instructions !== undefined) updateData.instructions = data.instructions;
      if (data.end_date !== undefined) updateData.end_date = data.end_date;
      if (data.is_hospice_related !== undefined) updateData.is_hospice_related = data.is_hospice_related;
      if (data.prescriber_id !== undefined) updateData.prescriber_id = data.prescriber_id;

      const result = await db
        .update(medications)
        .set(updateData)
        .where(eq(medications.id, medicationId))
        .returning();

      // Create audit log for medication update
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'UPDATE',
          resource_type: 'medications',
          resource_id: String(medicationId),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            patient_id: patientId,
            medication_name: result[0].medication_name,
            changes: Object.keys(updateData).filter(k => k !== 'updatedAt' && k !== 'updated_by_id')
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for medication update:', auditError);
        // Don't fail the request if audit logging fails
      }

      // Build response
      const response = {
        status: 200,
        message: 'Medication updated',
        data: result[0]
      };

      // Include warnings if any were overridden
      if (drugInteractions.length > 0 || allergyConflicts.length > 0) {
        response.warnings = {
          drug_interactions: drugInteractions,
          allergy_conflicts: allergyConflicts,
          overridden: true
        };
      }

      reply.code(200);
      return response;
    } catch (error) {
      logger.error('Error updating medication:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating medication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Cancel medication order (soft delete)
   * DELETE /patients/:id/medications/:medId
   */
  async cancelMedication(request, reply) {
    try {
      const { id, medId } = request.params;
      const { reason } = request.body || {};
      const patientId = parseInt(id);
      const medicationId = parseInt(medId);

      // Check if medication exists
      const existing = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.id, medicationId),
          eq(medications.patient_id, patientId),
          isNull(medications.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Medication not found'
        };
      }

      // Soft delete the medication
      const result = await db
        .update(medications)
        .set({
          deleted_at: new Date(),
          medication_status: 'CANCELLED',
          discontinuation_reason: reason || 'Order cancelled',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(medications.id, medicationId))
        .returning();

      // Log controlled substance cancellation if applicable
      if (existing[0].controlled_schedule) {
        await db.insert(controlled_substance_log).values({
          patient_id: patientId,
          medication_id: medicationId,
          log_date: new Date(),
          action: 'RETURNED',
          medication_name: existing[0].medication_name,
          notes: `Order cancelled: ${reason || 'No reason provided'}`,
          logged_by_id: request.user?.id
        });
      }

      // Create audit log for medication cancellation
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'DELETE',
          resource_type: 'medications',
          resource_id: String(medicationId),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            patient_id: patientId,
            medication_name: existing[0].medication_name,
            cancellation_reason: reason || 'Order cancelled',
            is_controlled: !!existing[0].controlled_schedule
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for medication cancellation:', auditError);
        // Don't fail the request if audit logging fails
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Medication order cancelled',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error cancelling medication:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error cancelling medication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Check drug interactions for a medication
   * POST /patients/:id/medications/check-interactions
   */
  async checkInteractions(request, reply) {
    try {
      const { id } = request.params;
      const { medication_name } = request.body;
      const patientId = parseInt(id);

      if (!medication_name) {
        reply.code(400);
        return {
          status: 400,
          message: 'medication_name is required'
        };
      }

      const [drugInteractions, allergyConflicts] = await Promise.all([
        this.checkDrugInteractions(patientId, medication_name),
        this.checkAllergyConflicts(patientId, medication_name)
      ]);

      reply.code(200);
      return {
        status: 200,
        data: {
          medication_name,
          has_warnings: drugInteractions.length > 0 || allergyConflicts.length > 0,
          drug_interactions: drugInteractions,
          allergy_conflicts: allergyConflicts
        }
      };
    } catch (error) {
      logger.error('Error checking interactions:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error checking interactions',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Discontinue medication
   * POST /patients/:id/medications/:medId/discontinue
   */
  async discontinueMedication(request, reply) {
    try {
      const { id, medId } = request.params;
      const { reason } = request.body;

      const existing = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.id, parseInt(medId)),
          eq(medications.patient_id, parseInt(id)),
          isNull(medications.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Medication not found'
        };
      }

      const result = await db
        .update(medications)
        .set({
          medication_status: 'DISCONTINUED',
          discontinued_date: new Date().toISOString().split('T')[0],
          discontinuation_reason: reason,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(medications.id, parseInt(medId)))
        .returning();

      // If controlled substance, log the discontinuation
      if (existing[0].controlled_schedule) {
        await db.insert(controlled_substance_log).values({
          patient_id: parseInt(id),
          medication_id: parseInt(medId),
          log_date: new Date(),
          action: 'RETURNED',
          medication_name: existing[0].medication_name,
          notes: `Discontinued: ${reason}`,
          logged_by_id: request.user?.id
        });
      }

      // Create audit log for medication discontinuation
      try {
        await AuditService.createAuditLog({
          user_id: request.user?.id,
          action: 'UPDATE',
          resource_type: 'medications',
          resource_id: String(medId),
          ip_address: request.ip,
          user_agent: request.headers?.['user-agent'],
          metadata: JSON.stringify({
            patient_id: parseInt(id),
            medication_name: existing[0].medication_name,
            action_type: 'DISCONTINUE',
            discontinuation_reason: reason,
            is_controlled: !!existing[0].controlled_schedule
          })
        });
      } catch (auditError) {
        logger.error('Failed to create audit log for medication discontinuation:', auditError);
        // Don't fail the request if audit logging fails
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Medication discontinued',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error discontinuing medication:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error discontinuing medication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Hold medication
   * POST /patients/:id/medications/:medId/hold
   */
  async holdMedication(request, reply) {
    try {
      const { id, medId } = request.params;
      const { reason, hold_until } = request.body;

      const existing = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.id, parseInt(medId)),
          eq(medications.patient_id, parseInt(id)),
          isNull(medications.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Medication not found'
        };
      }

      const result = await db
        .update(medications)
        .set({
          medication_status: 'HELD',
          end_date: hold_until, // Temporary hold until this date
          instructions: `${existing[0].instructions || ''}\nHeld: ${reason}`.trim(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(medications.id, parseInt(medId)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Medication held',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error holding medication:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error holding medication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Pause medication
   * POST /patients/:id/medications/:medId/pause
   */
  async pauseMedication(request, reply) {
    try {
      const { id, medId } = request.params;
      const { reason, pause_until } = request.body;

      const existing = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.id, parseInt(medId)),
          eq(medications.patient_id, parseInt(id)),
          isNull(medications.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Medication not found'
        };
      }

      const result = await db
        .update(medications)
        .set({
          medication_status: 'PAUSED',
          end_date: pause_until,
          instructions: `${existing[0].instructions || ''}\nPaused: ${reason}`.trim(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(medications.id, parseInt(medId)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Medication paused',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error pausing medication:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error pausing medication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Resume medication
   * POST /patients/:id/medications/:medId/resume
   */
  async resumeMedication(request, reply) {
    try {
      const { id, medId } = request.params;

      const existing = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.id, parseInt(medId)),
          eq(medications.patient_id, parseInt(id)),
          isNull(medications.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Medication not found'
        };
      }

      if (!['PAUSED', 'HELD'].includes(existing[0].medication_status)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Medication is not paused or held'
        };
      }

      const result = await db
        .update(medications)
        .set({
          medication_status: 'ACTIVE',
          end_date: null,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(medications.id, parseInt(medId)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Medication resumed',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error resuming medication:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error resuming medication',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get MAR entries for a patient
   * GET /patients/:id/mar
   */
  async getPatientMAR(request, reply) {
    try {
      const { id } = request.params;
      const { start_date, end_date, medication_id } = request.query;

      let query = db
        .select({
          mar_entry: mar_entries,
          medication: medications
        })
        .from(mar_entries)
        .leftJoin(medications, eq(mar_entries.medication_id, medications.id))
        .where(and(
          eq(mar_entries.patient_id, parseInt(id)),
          isNull(mar_entries.deleted_at)
        ));

      // Filter by date range if provided
      if (start_date && end_date) {
        query = query.where(and(
          sql`${mar_entries.scheduled_time} >= ${start_date}`,
          sql`${mar_entries.scheduled_time} <= ${end_date}`
        ));
      }

      // Filter by medication if provided
      if (medication_id) {
        query = query.where(eq(mar_entries.medication_id, parseInt(medication_id)));
      }

      const results = await query.orderBy(desc(mar_entries.scheduled_time));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching MAR entries:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching MAR entries',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create MAR entry (record medication administration)
   * POST /patients/:id/mar
   */
  async createMAREntry(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate MAR status
      const validStatuses = ['GIVEN', 'NOT_GIVEN', 'REFUSED', 'HELD', 'LATE', 'MISSED'];
      if (!validStatuses.includes(data.mar_status)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid MAR status'
        };
      }

      // Require reason if not given
      if (['NOT_GIVEN', 'REFUSED', 'HELD'].includes(data.mar_status) && !data.reason_not_given) {
        reply.code(400);
        return {
          status: 400,
          message: 'Reason required when medication is not given, refused, or held'
        };
      }

      const result = await db
        .insert(mar_entries)
        .values({
          patient_id: parseInt(id),
          medication_id: data.medication_id,
          scheduled_time: data.scheduled_time,
          actual_time: data.actual_time || new Date(),
          mar_status: data.mar_status,
          dosage_given: data.dosage_given,
          route_used: data.route_used,
          administered_by_id: data.administered_by_id || request.user?.id,
          administered_by_name: data.administered_by_name || `${request.user?.firstName} ${request.user?.lastName}`,
          reason_not_given: data.reason_not_given,
          patient_response: data.patient_response,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'MAR entry created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating MAR entry:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating MAR entry',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single MAR entry by ID
   * GET /patients/:id/mar/:marId
   */
  async getMAREntry(request, reply) {
    try {
      const { id, marId } = request.params;

      const result = await db
        .select({
          mar_entry: mar_entries,
          medication: medications
        })
        .from(mar_entries)
        .leftJoin(medications, eq(mar_entries.medication_id, medications.id))
        .where(and(
          eq(mar_entries.id, parseInt(marId)),
          eq(mar_entries.patient_id, parseInt(id)),
          isNull(mar_entries.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'MAR entry not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching MAR entry:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching MAR entry',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update a MAR entry
   * PUT /patients/:id/mar/:marId
   */
  async updateMAREntry(request, reply) {
    try {
      const { id, marId } = request.params;
      const data = request.body;

      // Check if entry exists
      const existing = await db
        .select()
        .from(mar_entries)
        .where(and(
          eq(mar_entries.id, parseInt(marId)),
          eq(mar_entries.patient_id, parseInt(id)),
          isNull(mar_entries.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'MAR entry not found'
        };
      }

      // Validate MAR status if provided
      if (data.mar_status) {
        const validStatuses = ['GIVEN', 'NOT_GIVEN', 'REFUSED', 'HELD', 'LATE', 'MISSED'];
        if (!validStatuses.includes(data.mar_status)) {
          reply.code(400);
          return {
            status: 400,
            message: 'Invalid MAR status'
          };
        }

        // Require reason if changing to not given status
        if (['NOT_GIVEN', 'REFUSED', 'HELD'].includes(data.mar_status) && !data.reason_not_given && !existing[0].reason_not_given) {
          reply.code(400);
          return {
            status: 400,
            message: 'Reason required when medication is not given, refused, or held'
          };
        }
      }

      const updateData = {
        updatedAt: new Date()
      };

      // Only update provided fields
      if (data.actual_time !== undefined) updateData.actual_time = data.actual_time;
      if (data.mar_status !== undefined) updateData.mar_status = data.mar_status;
      if (data.dosage_given !== undefined) updateData.dosage_given = data.dosage_given;
      if (data.route_used !== undefined) updateData.route_used = data.route_used;
      if (data.reason_not_given !== undefined) updateData.reason_not_given = data.reason_not_given;
      if (data.patient_response !== undefined) updateData.patient_response = data.patient_response;

      const result = await db
        .update(mar_entries)
        .set(updateData)
        .where(eq(mar_entries.id, parseInt(marId)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'MAR entry updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating MAR entry:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating MAR entry',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get comfort kit for a patient
   * GET /patients/:id/comfort-kit
   */
  async getPatientComfortKit(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(comfort_kits)
        .where(and(
          eq(comfort_kits.patient_id, parseInt(id)),
          isNull(comfort_kits.deleted_at)
        ))
        .orderBy(desc(comfort_kits.issue_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching comfort kit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching comfort kit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create comfort kit for a patient
   * POST /patients/:id/comfort-kit
   */
  async createComfortKit(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(comfort_kits)
        .values({
          patient_id: parseInt(id),
          kit_number: data.kit_number,
          issue_date: data.issue_date || new Date().toISOString().split('T')[0],
          expiration_date: data.expiration_date,
          status: 'ACTIVE',
          medications: data.medications,
          location: data.location,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Comfort kit created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating comfort kit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating comfort kit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Destroy comfort kit (controlled substance disposal)
   * POST /patients/:id/comfort-kit/destroy
   */
  async destroyComfortKit(request, reply) {
    try {
      const { id } = request.params;
      const { kit_id, witness_id, witness_name, destruction_notes } = request.body;

      if (!kit_id) {
        reply.code(400);
        return {
          status: 400,
          message: 'kit_id is required'
        };
      }

      const existing = await db
        .select()
        .from(comfort_kits)
        .where(and(
          eq(comfort_kits.id, parseInt(kit_id)),
          eq(comfort_kits.patient_id, parseInt(id)),
          isNull(comfort_kits.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Comfort kit not found'
        };
      }

      // Update kit status
      const result = await db
        .update(comfort_kits)
        .set({
          status: 'DESTROYED',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(comfort_kits.id, parseInt(kit_id)))
        .returning();

      // Log controlled substance destruction for each medication in kit
      if (existing[0].medications && Array.isArray(existing[0].medications)) {
        for (const med of existing[0].medications) {
          await db.insert(controlled_substance_log).values({
            patient_id: parseInt(id),
            log_date: new Date(),
            action: 'DESTROYED',
            medication_name: med.medication,
            quantity: med.quantity,
            lot_number: med.lot_number,
            witness_id: witness_id,
            witness_name: witness_name,
            notes: destruction_notes || 'Comfort kit destroyed',
            logged_by_id: request.user?.id
          });
        }
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Comfort kit destroyed and logged',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error destroying comfort kit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error destroying comfort kit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create medication reconciliation
   * POST /patients/:id/medication-reconciliation
   */
  async createMedicationReconciliation(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const patientId = parseInt(id);

      // Validate reconciliation type
      const validTypes = ['ADMISSION', 'TRANSFER', 'DISCHARGE', 'ROUTINE'];
      if (data.reconciliation_type && !validTypes.includes(data.reconciliation_type)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid reconciliation type'
        };
      }

      // Get current active medications for comparison
      const currentMedications = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.patient_id, patientId),
          eq(medications.medication_status, 'ACTIVE'),
          isNull(medications.deleted_at)
        ));

      // Auto-detect discrepancies if home_medications are provided
      let discrepancies = data.discrepancies_found || '';
      if (data.home_medications && Array.isArray(data.home_medications)) {
        const autoDiscrepancies = this.detectMedicationDiscrepancies(
          data.home_medications,
          currentMedications
        );
        if (autoDiscrepancies.length > 0) {
          discrepancies = autoDiscrepancies.map(d =>
            `${d.type}: ${d.medication} - ${d.description}`
          ).join('\n');
        }
      }

      const result = await db
        .insert(medication_reconciliation)
        .values({
          patient_id: patientId,
          reconciliation_date: data.reconciliation_date || new Date().toISOString().split('T')[0],
          reconciliation_type: data.reconciliation_type || 'ROUTINE',
          medications_reviewed: data.medications_reviewed || {
            home_medications: data.home_medications || [],
            current_medications: currentMedications.map(m => ({
              id: m.id,
              name: m.medication_name,
              dosage: m.dosage,
              frequency: m.frequency
            }))
          },
          discrepancies_found: discrepancies,
          actions_taken: data.actions_taken,
          performed_by_id: data.performed_by_id || request.user?.id,
          performed_by_name: data.performed_by_name || `${request.user?.firstName} ${request.user?.lastName}`,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Medication reconciliation created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating medication reconciliation:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating medication reconciliation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get medication reconciliation history for a patient
   * GET /patients/:id/medication-reconciliation
   */
  async getMedicationReconciliationHistory(request, reply) {
    try {
      const { id } = request.params;
      const { reconciliation_type, start_date, end_date } = request.query;
      const patientId = parseInt(id);

      let query = db
        .select()
        .from(medication_reconciliation)
        .where(and(
          eq(medication_reconciliation.patient_id, patientId),
          isNull(medication_reconciliation.deleted_at)
        ));

      // Filter by type if provided
      if (reconciliation_type) {
        query = query.where(eq(medication_reconciliation.reconciliation_type, reconciliation_type));
      }

      // Filter by date range if provided
      if (start_date) {
        query = query.where(gte(medication_reconciliation.reconciliation_date, start_date));
      }
      if (end_date) {
        query = query.where(lte(medication_reconciliation.reconciliation_date, end_date));
      }

      const results = await query.orderBy(desc(medication_reconciliation.reconciliation_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching medication reconciliation history:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching medication reconciliation history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get a single medication reconciliation by ID
   * GET /patients/:id/medication-reconciliation/:reconId
   */
  async getMedicationReconciliation(request, reply) {
    try {
      const { id, reconId } = request.params;

      const result = await db
        .select()
        .from(medication_reconciliation)
        .where(and(
          eq(medication_reconciliation.id, parseInt(reconId)),
          eq(medication_reconciliation.patient_id, parseInt(id)),
          isNull(medication_reconciliation.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Medication reconciliation not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching medication reconciliation:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching medication reconciliation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Compare home medications with current orders and generate reconciliation report
   * POST /patients/:id/medication-reconciliation/compare
   */
  async compareMedications(request, reply) {
    try {
      const { id } = request.params;
      const { home_medications } = request.body;
      const patientId = parseInt(id);

      if (!home_medications || !Array.isArray(home_medications)) {
        reply.code(400);
        return {
          status: 400,
          message: 'home_medications array is required'
        };
      }

      // Get current active medications
      const currentMedications = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.patient_id, patientId),
          eq(medications.medication_status, 'ACTIVE'),
          isNull(medications.deleted_at)
        ));

      const discrepancies = this.detectMedicationDiscrepancies(home_medications, currentMedications);

      reply.code(200);
      return {
        status: 200,
        data: {
          home_medications_count: home_medications.length,
          current_medications_count: currentMedications.length,
          discrepancies_count: discrepancies.length,
          discrepancies,
          current_medications: currentMedications.map(m => ({
            id: m.id,
            name: m.medication_name,
            dosage: m.dosage,
            frequency: m.frequency,
            route: m.medication_route
          }))
        }
      };
    } catch (error) {
      logger.error('Error comparing medications:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error comparing medications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Detect discrepancies between home medications and current orders
   * @param {Array} homeMeds - Array of home medication objects
   * @param {Array} currentMeds - Array of current medication records
   * @returns {Array} List of discrepancies found
   */
  detectMedicationDiscrepancies(homeMeds, currentMeds) {
    const discrepancies = [];
    const currentMedNames = currentMeds.map(m => m.medication_name.toLowerCase());
    const homeMedNames = homeMeds.map(m => (m.medication_name || m.name || '').toLowerCase());

    // Check for home medications not in current orders
    for (const homeMed of homeMeds) {
      const medName = (homeMed.medication_name || homeMed.name || '').toLowerCase();
      if (!medName) continue;

      const matchingCurrent = currentMeds.find(c =>
        c.medication_name.toLowerCase().includes(medName) ||
        medName.includes(c.medication_name.toLowerCase())
      );

      if (!matchingCurrent) {
        discrepancies.push({
          type: 'MISSING_FROM_CURRENT',
          medication: homeMed.medication_name || homeMed.name,
          description: 'Home medication not found in current orders',
          home_medication: homeMed
        });
      } else {
        // Check for dosage differences
        const homeDosage = (homeMed.dosage || '').toLowerCase();
        const currentDosage = (matchingCurrent.dosage || '').toLowerCase();
        if (homeDosage && currentDosage && homeDosage !== currentDosage) {
          discrepancies.push({
            type: 'DOSAGE_DIFFERENCE',
            medication: homeMed.medication_name || homeMed.name,
            description: `Dosage difference: Home=${homeMed.dosage}, Current=${matchingCurrent.dosage}`,
            home_medication: homeMed,
            current_medication_id: matchingCurrent.id
          });
        }

        // Check for frequency differences
        const homeFreq = (homeMed.frequency || '').toLowerCase();
        const currentFreq = (matchingCurrent.frequency || '').toLowerCase();
        if (homeFreq && currentFreq && homeFreq !== currentFreq) {
          discrepancies.push({
            type: 'FREQUENCY_DIFFERENCE',
            medication: homeMed.medication_name || homeMed.name,
            description: `Frequency difference: Home=${homeMed.frequency}, Current=${matchingCurrent.frequency}`,
            home_medication: homeMed,
            current_medication_id: matchingCurrent.id
          });
        }
      }
    }

    // Check for current medications not in home list
    for (const currentMed of currentMeds) {
      const medName = currentMed.medication_name.toLowerCase();
      const matchingHome = homeMeds.find(h => {
        const homeName = (h.medication_name || h.name || '').toLowerCase();
        return medName.includes(homeName) || homeName.includes(medName);
      });

      if (!matchingHome) {
        discrepancies.push({
          type: 'NEW_MEDICATION',
          medication: currentMed.medication_name,
          description: 'Current order not found in home medication list',
          current_medication_id: currentMed.id
        });
      }
    }

    return discrepancies;
  }

  /**
   * Generate medication administration schedule for a patient
   * GET /patients/:id/medications/schedule
   */
  async getMedicationSchedule(request, reply) {
    try {
      const { id } = request.params;
      const { date } = request.query;
      const patientId = parseInt(id);
      const scheduleDate = date ? new Date(date) : new Date();

      // Get active scheduled medications (not PRN)
      const activeMeds = await db
        .select()
        .from(medications)
        .where(and(
          eq(medications.patient_id, patientId),
          eq(medications.medication_status, 'ACTIVE'),
          isNull(medications.deleted_at)
        ));

      const schedule = [];

      for (const med of activeMeds) {
        const times = this.generateAdministrationTimes(med.frequency, scheduleDate);
        for (const time of times) {
          schedule.push({
            medication_id: med.id,
            medication_name: med.medication_name,
            dosage: med.dosage,
            route: med.medication_route,
            frequency: med.frequency,
            scheduled_time: time,
            is_prn: med.frequency === 'PRN',
            instructions: med.instructions,
            controlled_schedule: med.controlled_schedule
          });
        }
      }

      // Sort by scheduled time
      schedule.sort((a, b) => new Date(a.scheduled_time) - new Date(b.scheduled_time));

      reply.code(200);
      return {
        status: 200,
        data: {
          date: scheduleDate.toISOString().split('T')[0],
          total_administrations: schedule.length,
          schedule
        }
      };
    } catch (error) {
      logger.error('Error generating medication schedule:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error generating medication schedule',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Generate administration times based on frequency
   * @param {string} frequency - Medication frequency
   * @param {Date} date - Date for schedule
   * @returns {Array} Array of ISO datetime strings
   */
  generateAdministrationTimes(frequency, date) {
    const times = [];
    const dateStr = date.toISOString().split('T')[0];

    const frequencyMap = {
      'ONCE': ['08:00'],
      'DAILY': ['08:00'],
      'BID': ['08:00', '20:00'],
      'TID': ['08:00', '14:00', '20:00'],
      'QID': ['06:00', '12:00', '18:00', '22:00'],
      'Q4H': ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00'],
      'Q6H': ['06:00', '12:00', '18:00', '00:00'],
      'Q8H': ['06:00', '14:00', '22:00'],
      'Q12H': ['08:00', '20:00'],
      'PRN': [], // PRN medications don't have scheduled times
      'WEEKLY': ['08:00'], // Only on the scheduled day
      'MONTHLY': ['08:00'] // Only on the scheduled day
    };

    const hoursForFreq = frequencyMap[frequency?.toUpperCase()] || [];

    for (const time of hoursForFreq) {
      times.push(`${dateStr}T${time}:00.000Z`);
    }

    return times;
  }

  /**
   * Get patient allergies
   * GET /patients/:id/allergies
   */
  async getPatientAllergies(request, reply) {
    try {
      const { id } = request.params;
      const { status, allergen_type } = request.query;
      const patientId = parseInt(id);

      let query = db
        .select()
        .from(patient_allergies)
        .where(and(
          eq(patient_allergies.patient_id, patientId),
          isNull(patient_allergies.deleted_at)
        ));

      if (status) {
        query = query.where(eq(patient_allergies.status, status));
      }

      if (allergen_type) {
        query = query.where(eq(patient_allergies.allergen_type, allergen_type));
      }

      const results = await query.orderBy(desc(patient_allergies.createdAt));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching patient allergies:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching patient allergies',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create patient allergy
   * POST /patients/:id/allergies
   */
  async createPatientAllergy(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;
      const patientId = parseInt(id);

      if (!data.allergen_name) {
        reply.code(400);
        return {
          status: 400,
          message: 'allergen_name is required'
        };
      }

      const validTypes = ['MEDICATION', 'FOOD', 'ENVIRONMENTAL', 'OTHER'];
      if (data.allergen_type && !validTypes.includes(data.allergen_type)) {
        reply.code(400);
        return {
          status: 400,
          message: `Invalid allergen type. Valid types: ${validTypes.join(', ')}`
        };
      }

      const validSeverities = ['MILD', 'MODERATE', 'SEVERE', 'LIFE_THREATENING'];
      if (data.reaction_severity && !validSeverities.includes(data.reaction_severity)) {
        reply.code(400);
        return {
          status: 400,
          message: `Invalid reaction severity. Valid severities: ${validSeverities.join(', ')}`
        };
      }

      const result = await db
        .insert(patient_allergies)
        .values({
          patient_id: patientId,
          allergen_name: data.allergen_name,
          allergen_type: data.allergen_type || 'OTHER',
          allergen_code: data.allergen_code,
          reaction_type: data.reaction_type,
          reaction_severity: data.reaction_severity,
          reaction_description: data.reaction_description,
          status: 'ACTIVE',
          onset_date: data.onset_date,
          source: data.source || 'PATIENT_REPORTED',
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Patient allergy created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating patient allergy:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating patient allergy',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update patient allergy
   * PUT /patients/:id/allergies/:allergyId
   */
  async updatePatientAllergy(request, reply) {
    try {
      const { id, allergyId } = request.params;
      const data = request.body;

      const existing = await db
        .select()
        .from(patient_allergies)
        .where(and(
          eq(patient_allergies.id, parseInt(allergyId)),
          eq(patient_allergies.patient_id, parseInt(id)),
          isNull(patient_allergies.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Patient allergy not found'
        };
      }

      const updateData = {
        updatedAt: new Date(),
        updated_by_id: request.user?.id
      };

      if (data.allergen_name !== undefined) updateData.allergen_name = data.allergen_name;
      if (data.allergen_type !== undefined) updateData.allergen_type = data.allergen_type;
      if (data.allergen_code !== undefined) updateData.allergen_code = data.allergen_code;
      if (data.reaction_type !== undefined) updateData.reaction_type = data.reaction_type;
      if (data.reaction_severity !== undefined) updateData.reaction_severity = data.reaction_severity;
      if (data.reaction_description !== undefined) updateData.reaction_description = data.reaction_description;
      if (data.status !== undefined) updateData.status = data.status;
      if (data.onset_date !== undefined) updateData.onset_date = data.onset_date;
      if (data.source !== undefined) updateData.source = data.source;

      const result = await db
        .update(patient_allergies)
        .set(updateData)
        .where(eq(patient_allergies.id, parseInt(allergyId)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Patient allergy updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating patient allergy:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating patient allergy',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Delete patient allergy (soft delete)
   * DELETE /patients/:id/allergies/:allergyId
   */
  async deletePatientAllergy(request, reply) {
    try {
      const { id, allergyId } = request.params;

      const existing = await db
        .select()
        .from(patient_allergies)
        .where(and(
          eq(patient_allergies.id, parseInt(allergyId)),
          eq(patient_allergies.patient_id, parseInt(id)),
          isNull(patient_allergies.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Patient allergy not found'
        };
      }

      await db
        .update(patient_allergies)
        .set({
          deleted_at: new Date(),
          status: 'INACTIVE',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(patient_allergies.id, parseInt(allergyId)));

      reply.code(200);
      return {
        status: 200,
        message: 'Patient allergy deleted'
      };
    } catch (error) {
      logger.error('Error deleting patient allergy:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting patient allergy',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get controlled substance log for a patient
   * GET /patients/:id/controlled-substances
   */
  async getControlledSubstanceLog(request, reply) {
    try {
      const { id } = request.params;
      const { action, medication_id, start_date, end_date } = request.query;
      const patientId = parseInt(id);

      let query = db
        .select()
        .from(controlled_substance_log)
        .where(and(
          eq(controlled_substance_log.patient_id, patientId),
          isNull(controlled_substance_log.deleted_at)
        ));

      if (action) {
        query = query.where(eq(controlled_substance_log.action, action));
      }

      if (medication_id) {
        query = query.where(eq(controlled_substance_log.medication_id, parseInt(medication_id)));
      }

      if (start_date) {
        query = query.where(gte(controlled_substance_log.log_date, new Date(start_date)));
      }

      if (end_date) {
        query = query.where(lte(controlled_substance_log.log_date, new Date(end_date)));
      }

      const results = await query.orderBy(desc(controlled_substance_log.log_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching controlled substance log:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching controlled substance log',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new MedicationController();
