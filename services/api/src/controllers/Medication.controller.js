import { db } from '../config/db.drizzle.js';
import {
  medications,
  mar_entries,
  comfort_kits,
  comfort_kit_usage_log,
  controlled_substance_log,
  medication_reconciliation,
  patients
} from '../db/schemas/index.js';
import { eq, and, desc, sql, or, isNull } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';
/**
 * Medication Controller
 * Manages medication administration, MAR, comfort kits, and controlled substances
 * CRITICAL: Clinical necessity and regulatory compliance
 */
class MedicationController {
  /**
   * Get all medications for a patient
   * GET /patients/:id/medications
   */
  async getPatientMedications(request, reply) {
    try {
      const { id } = request.params;
      const { status, is_hospice_related } = request.query;

      let query = db
        .select()
        .from(medications)
        .where(and(
          eq(medications.patient_id, parseInt(id)),
          isNull(medications.deleted_at)
        ));

      // Filter by status if provided
      if (status) {
        query = query.where(eq(medications.medication_status, status));
      }

      // Filter by hospice-related if provided
      if (is_hospice_related !== undefined) {
        query = query.where(eq(medications.is_hospice_related, is_hospice_related === 'true'));
      }

      const results = await query.orderBy(desc(medications.start_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
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
   * Create new medication
   * POST /patients/:id/medications
   */
  async createMedication(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(medications)
        .values({
          patient_id: parseInt(id),
          medication_name: data.medication_name,
          generic_name: data.generic_name,
          ndc_code: data.ndc_code,
          medication_status: data.medication_status || 'ACTIVE',
          medication_route: data.medication_route,
          dosage: data.dosage,
          frequency: data.frequency,
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
          patient_id: parseInt(id),
          medication_id: result[0].id,
          log_date: new Date(),
          action: 'DISPENSED',
          medication_name: data.medication_name,
          quantity: data.initial_quantity || 'Not specified',
          logged_by_id: request.user?.id
        });
      }

      reply.code(201);
      return {
        status: 201,
        message: 'Medication created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating medication:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating medication',
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

      // Validate reconciliation type
      const validTypes = ['ADMISSION', 'TRANSFER', 'DISCHARGE', 'ROUTINE'];
      if (data.reconciliation_type && !validTypes.includes(data.reconciliation_type)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid reconciliation type'
        };
      }

      const result = await db
        .insert(medication_reconciliation)
        .values({
          patient_id: parseInt(id),
          reconciliation_date: data.reconciliation_date || new Date().toISOString().split('T')[0],
          reconciliation_type: data.reconciliation_type || 'ROUTINE',
          medications_reviewed: data.medications_reviewed,
          discrepancies_found: data.discrepancies_found,
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
      logger.error('Error creating medication reconciliation:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating medication reconciliation',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new MedicationController();
