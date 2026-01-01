import { db } from '../config/db.drizzle.js';
import {
  scheduled_visits,
  recurring_visits,
  on_call_schedule,
  on_call_logs,
  visit_compliance,
  scheduling_conflicts,
  patients,
  staff_profiles,
  staff_schedule
} from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, sql, or, isNull, between, ne, inArray } from 'drizzle-orm';

import { logger } from '../utils/logger.js';

// Business rule constants
const MIN_VISIT_DURATION_MINUTES = 15;
const MAX_VISIT_DURATION_MINUTES = 480; // 8 hours
const MIN_ADVANCE_BOOKING_HOURS = 0; // Allow same-day booking
const MAX_ADVANCE_BOOKING_DAYS = 365; // Max 1 year ahead
const DEFAULT_VISIT_DURATION_MINUTES = 60;
/**
 * Scheduling Controller
 * Module J - MEDIUM Priority
 *
 * Purpose: Calendar management, GPS check-in/out, on-call rotations
 * Compliance: Visit frequency requirements, on-call coverage, timeliness tracking
 *
 * Endpoints:
 * - Scheduled visits management (create, update, cancel, reschedule)
 * - GPS check-in/check-out
 * - Recurring visit templates
 * - On-call schedule management
 * - On-call log tracking
 * - Visit compliance monitoring
 */
class SchedulingController {
  // ============================================
  // SCHEDULED VISITS
  // ============================================

  /**
   * Get scheduled visits with filters
   * GET /visits
   */
  async getAllVisits(request, reply) {
    try {
      const {
        limit = 50,
        offset = 0,
        staff_id,
        patient_id,
        visit_status,
        start_date,
        end_date
      } = request.query;

      let query = db
        .select({
          visit: scheduled_visits,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          },
          staff: {
            id: staff_profiles.id,
            first_name: staff_profiles.first_name,
            last_name: staff_profiles.last_name,
            job_title: staff_profiles.job_title
          }
        })
        .from(scheduled_visits)
        .leftJoin(patients, eq(scheduled_visits.patient_id, patients.id))
        .leftJoin(staff_profiles, eq(scheduled_visits.staff_id, staff_profiles.id))
        .where(isNull(scheduled_visits.deleted_at));

      const filters = [];
      if (staff_id) {
        filters.push(eq(scheduled_visits.staff_id, parseInt(staff_id)));
      }
      if (patient_id) {
        filters.push(eq(scheduled_visits.patient_id, parseInt(patient_id)));
      }
      if (visit_status) {
        filters.push(eq(scheduled_visits.visit_status, visit_status));
      }
      if (start_date) {
        filters.push(gte(scheduled_visits.scheduled_date, start_date));
      }
      if (end_date) {
        filters.push(lte(scheduled_visits.scheduled_date, end_date));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query
        .orderBy(scheduled_visits.scheduled_date, scheduled_visits.scheduled_start_time)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching visits:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching visits',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create scheduled visit with conflict detection and staff availability validation
   * POST /visits
   *
   * Features:
   * - Validates required fields and business rules
   * - Checks staff availability against staff_schedule
   * - Detects time conflicts with existing visits
   * - Uses database transaction for atomicity
   * - Records any detected conflicts
   */
  async createVisit(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.patient_id || !data.staff_id || !data.scheduled_date || !data.visit_type) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: patient_id, staff_id, scheduled_date, visit_type'
        };
      }

      // Validate scheduled_start_time is provided
      if (!data.scheduled_start_time) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required field: scheduled_start_time'
        };
      }

      // Business rule validations
      const validationResult = this._validateVisitBusinessRules(data);
      if (!validationResult.valid) {
        reply.code(400);
        return {
          status: 400,
          message: validationResult.message
        };
      }

      // Check if staff exists and is active
      const staffMember = await db
        .select()
        .from(staff_profiles)
        .where(and(
          eq(staff_profiles.id, parseInt(data.staff_id)),
          eq(staff_profiles.employment_status, 'ACTIVE'),
          isNull(staff_profiles.deleted_at)
        ))
        .limit(1);

      if (!staffMember[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Staff member not found or is not active'
        };
      }

      // Check if patient exists
      const patient = await db
        .select()
        .from(patients)
        .where(and(
          eq(patients.id, parseInt(data.patient_id)),
          isNull(patients.deleted_at)
        ))
        .limit(1);

      if (!patient[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Patient not found'
        };
      }

      // Check staff availability
      const availabilityCheck = await this._checkStaffAvailability(
        parseInt(data.staff_id),
        data.scheduled_date,
        data.scheduled_start_time,
        data.scheduled_end_time || this._addMinutesToTime(data.scheduled_start_time, data.estimated_duration_minutes || DEFAULT_VISIT_DURATION_MINUTES)
      );

      if (!availabilityCheck.available) {
        reply.code(409);
        return {
          status: 409,
          message: availabilityCheck.reason,
          data: {
            staff_id: parseInt(data.staff_id),
            staff_name: `${staffMember[0].first_name} ${staffMember[0].last_name}`,
            requested_date: data.scheduled_date,
            requested_time: data.scheduled_start_time,
            unavailability_details: availabilityCheck.details
          }
        };
      }

      // Check for conflicts with existing visits
      const conflicts = await this._checkVisitConflicts(
        parseInt(data.staff_id),
        data.scheduled_date,
        data.scheduled_start_time,
        data.scheduled_end_time || this._addMinutesToTime(data.scheduled_start_time, data.estimated_duration_minutes || DEFAULT_VISIT_DURATION_MINUTES),
        null // No existing visit ID since this is a new visit
      );

      // Use transaction for atomic operation
      const result = await db.transaction(async (tx) => {
        // Insert the visit
        const [newVisit] = await tx
          .insert(scheduled_visits)
          .values({
            ...data,
            estimated_duration_minutes: data.estimated_duration_minutes || DEFAULT_VISIT_DURATION_MINUTES,
            created_by_id: request.user?.id,
            updated_by_id: request.user?.id
          })
          .returning();

        // If there are conflicts, record them but allow the visit (with warning)
        if (conflicts.length > 0) {
          for (const conflict of conflicts) {
            await tx
              .insert(scheduling_conflicts)
              .values({
                visit_id_1: newVisit.id,
                visit_id_2: conflict.conflicting_visit_id,
                staff_id: parseInt(data.staff_id),
                patient_id: parseInt(data.patient_id),
                conflict_type: conflict.type,
                conflict_severity: conflict.severity,
                conflict_status: 'DETECTED',
                conflict_date: data.scheduled_date,
                conflict_start_time: conflict.overlap_start,
                conflict_end_time: conflict.overlap_end,
                overlap_minutes: conflict.overlap_minutes,
                conflict_description: conflict.description,
                detected_by: 'SYSTEM',
                detection_rule: 'CREATE_VISIT_CONFLICT_CHECK',
                created_by_id: request.user?.id,
                updated_by_id: request.user?.id
              });
          }
        }

        return newVisit;
      });

      // Determine response based on conflicts
      if (conflicts.length > 0) {
        reply.code(201);
        return {
          status: 201,
          message: 'Visit scheduled with warnings - conflicts detected',
          data: result,
          warnings: {
            conflict_count: conflicts.length,
            conflicts: conflicts.map(c => ({
              type: c.type,
              severity: c.severity,
              description: c.description,
              conflicting_visit_id: c.conflicting_visit_id,
              overlap_minutes: c.overlap_minutes
            }))
          }
        };
      }

      reply.code(201);
      return {
        status: 201,
        message: 'Visit scheduled successfully',
        data: result
      };
    } catch (error) {
      logger.error('Error creating visit:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating visit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get visit by ID
   * GET /visits/:id
   */
  async getVisitById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select({
          visit: scheduled_visits,
          patient: patients,
          staff: staff_profiles
        })
        .from(scheduled_visits)
        .leftJoin(patients, eq(scheduled_visits.patient_id, patients.id))
        .leftJoin(staff_profiles, eq(scheduled_visits.staff_id, staff_profiles.id))
        .where(and(
          eq(scheduled_visits.id, parseInt(id)),
          isNull(scheduled_visits.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Visit not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching visit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching visit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update visit
   * PATCH /visits/:id
   */
  async updateVisit(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(scheduled_visits)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(scheduled_visits.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Visit not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Visit updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating visit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating visit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Check in to visit (GPS tracking)
   * POST /visits/:id/checkin
   */
  async checkIn(request, reply) {
    try {
      const { id } = request.params;
      const { latitude, longitude, accuracy } = request.body;

      if (!latitude || !longitude) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required GPS coordinates: latitude, longitude'
        };
      }

      const result = await db
        .update(scheduled_visits)
        .set({
          visit_status: 'IN_PROGRESS',
          actual_check_in_time: new Date(),
          check_in_location: {
            latitude,
            longitude,
            accuracy: accuracy || null
          },
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(scheduled_visits.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Visit not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Checked in successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error checking in:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error checking in',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Check out from visit (GPS tracking)
   * POST /visits/:id/checkout
   */
  async checkOut(request, reply) {
    try {
      const { id } = request.params;
      const { latitude, longitude, accuracy } = request.body;

      if (!latitude || !longitude) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required GPS coordinates: latitude, longitude'
        };
      }

      // Get the visit to calculate duration
      const visit = await db
        .select()
        .from(scheduled_visits)
        .where(eq(scheduled_visits.id, parseInt(id)))
        .limit(1);

      if (!visit[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Visit not found'
        };
      }

      // Calculate duration
      let actualDuration = null;
      if (visit[0].actual_check_in_time) {
        const checkInTime = new Date(visit[0].actual_check_in_time);
        const checkOutTime = new Date();
        actualDuration = Math.round((checkOutTime - checkInTime) / 1000 / 60); // minutes
      }

      const result = await db
        .update(scheduled_visits)
        .set({
          visit_status: 'COMPLETED',
          actual_check_out_time: new Date(),
          actual_duration_minutes: actualDuration,
          check_out_location: {
            latitude,
            longitude,
            accuracy: accuracy || null
          },
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(scheduled_visits.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Checked out successfully',
        data: result[0],
        duration_minutes: actualDuration
      };
    } catch (error) {
      logger.error('Error checking out:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error checking out',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Cancel visit
   * POST /visits/:id/cancel
   */
  async cancelVisit(request, reply) {
    try {
      const { id } = request.params;
      const { cancellation_reason } = request.body;

      const result = await db
        .update(scheduled_visits)
        .set({
          visit_status: 'CANCELLED',
          cancelled_at: new Date(),
          cancelled_by_id: request.user?.id,
          cancellation_reason: cancellation_reason,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(scheduled_visits.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Visit not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Visit cancelled successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error cancelling visit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error cancelling visit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Reschedule visit
   * POST /visits/:id/reschedule
   */
  async rescheduleVisit(request, reply) {
    try {
      const { id } = request.params;
      const { new_date, new_time, reason } = request.body;

      if (!new_date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required field: new_date'
        };
      }

      // Get original visit
      const originalVisit = await db
        .select()
        .from(scheduled_visits)
        .where(eq(scheduled_visits.id, parseInt(id)))
        .limit(1);

      if (!originalVisit[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Visit not found'
        };
      }

      // Create new visit with new date/time
      const newVisit = await db
        .insert(scheduled_visits)
        .values({
          patient_id: originalVisit[0].patient_id,
          staff_id: originalVisit[0].staff_id,
          visit_type: originalVisit[0].visit_type,
          visit_purpose: originalVisit[0].visit_purpose,
          scheduled_date: new_date,
          scheduled_start_time: new_time || originalVisit[0].scheduled_start_time,
          scheduled_end_time: originalVisit[0].scheduled_end_time,
          estimated_duration_minutes: originalVisit[0].estimated_duration_minutes,
          visit_status: 'SCHEDULED',
          recurring_visit_id: originalVisit[0].recurring_visit_id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Update original visit
      await db
        .update(scheduled_visits)
        .set({
          visit_status: 'RESCHEDULED',
          rescheduled_to_visit_id: newVisit[0].id,
          cancellation_reason: reason || 'Rescheduled',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(scheduled_visits.id, parseInt(id)));

      reply.code(201);
      return {
        status: 201,
        message: 'Visit rescheduled successfully',
        original_visit_id: parseInt(id),
        new_visit: newVisit[0]
      };
    } catch (error) {
      logger.error('Error rescheduling visit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error rescheduling visit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Confirm visit
   * POST /visits/:id/confirm
   */
  async confirmVisit(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(scheduled_visits)
        .set({
          visit_status: 'CONFIRMED',
          patient_confirmed: true,
          patient_confirmed_at: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(scheduled_visits.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Visit not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Visit confirmed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error confirming visit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error confirming visit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // RECURRING VISITS
  // ============================================

  /**
   * Get recurring visit templates
   * GET /recurring-visits
   */
  async getRecurringVisits(request, reply) {
    try {
      const { patient_id, is_active } = request.query;

      let query = db
        .select({
          recurring: recurring_visits,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name
          },
          staff: {
            id: staff_profiles.id,
            first_name: staff_profiles.first_name,
            last_name: staff_profiles.last_name
          }
        })
        .from(recurring_visits)
        .leftJoin(patients, eq(recurring_visits.patient_id, patients.id))
        .leftJoin(staff_profiles, eq(recurring_visits.staff_id, staff_profiles.id))
        .where(isNull(recurring_visits.deleted_at));

      const filters = [];
      if (patient_id) {
        filters.push(eq(recurring_visits.patient_id, parseInt(patient_id)));
      }
      if (is_active !== undefined) {
        filters.push(eq(recurring_visits.is_active, is_active === 'true'));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(recurring_visits.start_date);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching recurring visits:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching recurring visits',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create recurring visit template
   * POST /recurring-visits
   */
  async createRecurringVisit(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.patient_id || !data.recurrence_pattern || !data.start_date || !data.visit_type) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: patient_id, recurrence_pattern, start_date, visit_type'
        };
      }

      const result = await db
        .insert(recurring_visits)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Recurring visit created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating recurring visit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating recurring visit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update recurring visit template
   * PATCH /recurring-visits/:id
   */
  async updateRecurringVisit(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(recurring_visits)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(recurring_visits.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Recurring visit not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Recurring visit updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating recurring visit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating recurring visit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Deactivate recurring visit
   * POST /recurring-visits/:id/deactivate
   */
  async deactivateRecurringVisit(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(recurring_visits)
        .set({
          is_active: false,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(recurring_visits.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Recurring visit not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Recurring visit deactivated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error deactivating recurring visit:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error deactivating recurring visit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // ON-CALL SCHEDULES
  // ============================================

  /**
   * Get on-call schedules
   * GET /on-call
   */
  async getOnCallSchedules(request, reply) {
    try {
      const { staff_id, start_date, end_date, on_call_type } = request.query;

      let query = db
        .select({
          schedule: on_call_schedule,
          staff: {
            id: staff_profiles.id,
            first_name: staff_profiles.first_name,
            last_name: staff_profiles.last_name,
            job_title: staff_profiles.job_title,
            phone: staff_profiles.phone,
            mobile: staff_profiles.mobile
          }
        })
        .from(on_call_schedule)
        .leftJoin(staff_profiles, eq(on_call_schedule.staff_id, staff_profiles.id))
        .where(isNull(on_call_schedule.deleted_at));

      const filters = [];
      if (staff_id) {
        filters.push(eq(on_call_schedule.staff_id, parseInt(staff_id)));
      }
      if (start_date) {
        filters.push(gte(on_call_schedule.start_datetime, new Date(start_date)));
      }
      if (end_date) {
        filters.push(lte(on_call_schedule.end_datetime, new Date(end_date)));
      }
      if (on_call_type) {
        filters.push(eq(on_call_schedule.on_call_type, on_call_type));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(on_call_schedule.start_datetime);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching on-call schedules:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching on-call schedules',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create on-call schedule
   * POST /on-call
   */
  async createOnCallSchedule(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.staff_id || !data.start_datetime || !data.end_datetime || !data.on_call_type) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: staff_id, start_datetime, end_datetime, on_call_type'
        };
      }

      const result = await db
        .insert(on_call_schedule)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'On-call schedule created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating on-call schedule:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating on-call schedule',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get current on-call staff
   * GET /on-call/current
   */
  async getCurrentOnCall(request, reply) {
    try {
      const now = new Date();

      const results = await db
        .select({
          schedule: on_call_schedule,
          staff: staff_profiles
        })
        .from(on_call_schedule)
        .leftJoin(staff_profiles, eq(on_call_schedule.staff_id, staff_profiles.id))
        .where(and(
          lte(on_call_schedule.start_datetime, now),
          gte(on_call_schedule.end_datetime, now),
          eq(on_call_schedule.schedule_status, 'ACTIVE'),
          isNull(on_call_schedule.deleted_at)
        ))
        .orderBy(on_call_schedule.on_call_type);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        current_datetime: now
      };
    } catch (error) {
      logger.error('Error fetching current on-call:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching current on-call',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // ON-CALL LOGS
  // ============================================

  /**
   * Get on-call logs
   * GET /on-call/logs
   */
  async getOnCallLogs(request, reply) {
    try {
      const { staff_id, patient_id, start_date, end_date, call_priority } = request.query;

      let query = db
        .select({
          log: on_call_logs,
          staff: {
            id: staff_profiles.id,
            first_name: staff_profiles.first_name,
            last_name: staff_profiles.last_name
          },
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name
          }
        })
        .from(on_call_logs)
        .leftJoin(staff_profiles, eq(on_call_logs.staff_id, staff_profiles.id))
        .leftJoin(patients, eq(on_call_logs.patient_id, patients.id))
        .where(isNull(on_call_logs.deleted_at));

      const filters = [];
      if (staff_id) {
        filters.push(eq(on_call_logs.staff_id, parseInt(staff_id)));
      }
      if (patient_id) {
        filters.push(eq(on_call_logs.patient_id, parseInt(patient_id)));
      }
      if (start_date) {
        filters.push(gte(on_call_logs.call_datetime, new Date(start_date)));
      }
      if (end_date) {
        filters.push(lte(on_call_logs.call_datetime, new Date(end_date)));
      }
      if (call_priority) {
        filters.push(eq(on_call_logs.call_priority, call_priority));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(desc(on_call_logs.call_datetime));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching on-call logs:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching on-call logs',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create on-call log entry
   * POST /on-call/logs
   */
  async createOnCallLog(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.on_call_schedule_id || !data.staff_id || !data.call_reason || !data.call_priority) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: on_call_schedule_id, staff_id, call_reason, call_priority'
        };
      }

      const result = await db
        .insert(on_call_logs)
        .values({
          call_datetime: new Date(),
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'On-call log created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating on-call log:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating on-call log',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // VISIT COMPLIANCE
  // ============================================

  /**
   * Get visit compliance reports
   * GET /compliance/visits
   */
  async getVisitCompliance(request, reply) {
    try {
      const { patient_id, is_compliant } = request.query;

      let query = db
        .select({
          compliance: visit_compliance,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(visit_compliance)
        .leftJoin(patients, eq(visit_compliance.patient_id, patients.id));

      const filters = [];
      if (patient_id) {
        filters.push(eq(visit_compliance.patient_id, parseInt(patient_id)));
      }
      if (is_compliant !== undefined) {
        filters.push(eq(visit_compliance.is_compliant, is_compliant === 'true'));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(visit_compliance.period_start_date);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching visit compliance:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching visit compliance',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get non-compliant patients
   * GET /compliance/visits/non-compliant
   */
  async getNonCompliantPatients(request, reply) {
    try {
      const results = await db
        .select({
          compliance: visit_compliance,
          patient: patients
        })
        .from(visit_compliance)
        .leftJoin(patients, eq(visit_compliance.patient_id, patients.id))
        .where(eq(visit_compliance.is_compliant, false))
        .orderBy(visit_compliance.compliance_percentage);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching non-compliant patients:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching non-compliant patients',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get overdue RN visits
   * GET /compliance/visits/rn-overdue
   */
  async getOverdueRNVisits(request, reply) {
    try {
      const results = await db
        .select({
          compliance: visit_compliance,
          patient: patients
        })
        .from(visit_compliance)
        .leftJoin(patients, eq(visit_compliance.patient_id, patients.id))
        .where(eq(visit_compliance.rn_visit_overdue, true))
        .orderBy(desc(visit_compliance.days_since_last_rn_visit));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        message: results.length > 0 ? 'RN visits overdue (>14 days)' : 'All RN visits compliant'
      };
    } catch (error) {
      logger.error('Error fetching overdue RN visits:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching overdue RN visits',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // SCHEDULING CONFLICTS
  // ============================================

  /**
   * Get scheduling conflicts
   * GET /conflicts
   */
  async getConflicts(request, reply) {
    try {
      const {
        limit = 50,
        offset = 0,
        staff_id,
        conflict_status,
        conflict_type,
        conflict_severity,
        start_date,
        end_date
      } = request.query;

      let query = db
        .select({
          conflict: scheduling_conflicts,
          visit1: {
            id: scheduled_visits.id,
            scheduled_date: scheduled_visits.scheduled_date,
            scheduled_start_time: scheduled_visits.scheduled_start_time,
            scheduled_end_time: scheduled_visits.scheduled_end_time,
            visit_type: scheduled_visits.visit_type
          },
          staff: {
            id: staff_profiles.id,
            first_name: staff_profiles.first_name,
            last_name: staff_profiles.last_name,
            job_title: staff_profiles.job_title
          },
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name
          }
        })
        .from(scheduling_conflicts)
        .leftJoin(scheduled_visits, eq(scheduling_conflicts.visit_id_1, scheduled_visits.id))
        .leftJoin(staff_profiles, eq(scheduling_conflicts.staff_id, staff_profiles.id))
        .leftJoin(patients, eq(scheduling_conflicts.patient_id, patients.id))
        .where(isNull(scheduling_conflicts.deleted_at));

      const filters = [];
      if (staff_id) {
        filters.push(eq(scheduling_conflicts.staff_id, parseInt(staff_id)));
      }
      if (conflict_status) {
        filters.push(eq(scheduling_conflicts.conflict_status, conflict_status));
      }
      if (conflict_type) {
        filters.push(eq(scheduling_conflicts.conflict_type, conflict_type));
      }
      if (conflict_severity) {
        filters.push(eq(scheduling_conflicts.conflict_severity, conflict_severity));
      }
      if (start_date) {
        filters.push(gte(scheduling_conflicts.conflict_date, start_date));
      }
      if (end_date) {
        filters.push(lte(scheduling_conflicts.conflict_date, end_date));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query
        .orderBy(desc(scheduling_conflicts.createdAt))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching conflicts:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching conflicts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Detect conflicts for a staff member on a given date
   * GET /conflicts/detect
   */
  async detectConflicts(request, reply) {
    try {
      const { staff_id, date } = request.query;

      if (!staff_id || !date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: staff_id, date'
        };
      }

      // Get all visits for the staff member on this date
      const visits = await db
        .select()
        .from(scheduled_visits)
        .where(and(
          eq(scheduled_visits.staff_id, parseInt(staff_id)),
          eq(scheduled_visits.scheduled_date, date),
          isNull(scheduled_visits.deleted_at),
          or(
            eq(scheduled_visits.visit_status, 'SCHEDULED'),
            eq(scheduled_visits.visit_status, 'CONFIRMED')
          )
        ))
        .orderBy(scheduled_visits.scheduled_start_time);

      const conflicts = [];

      // Check for overlapping visits
      for (let i = 0; i < visits.length; i++) {
        for (let j = i + 1; j < visits.length; j++) {
          const visit1 = visits[i];
          const visit2 = visits[j];

          // Convert times to comparable format
          const start1 = visit1.scheduled_start_time;
          const end1 = visit1.scheduled_end_time || this._addMinutesToTime(start1, visit1.estimated_duration_minutes || 60);
          const start2 = visit2.scheduled_start_time;
          const end2 = visit2.scheduled_end_time || this._addMinutesToTime(start2, visit2.estimated_duration_minutes || 60);

          // Check for time overlap
          if (start1 < end2 && start2 < end1) {
            // Calculate overlap duration
            const overlapStart = start1 > start2 ? start1 : start2;
            const overlapEnd = end1 < end2 ? end1 : end2;
            const overlapMinutes = this._calculateMinutesBetweenTimes(overlapStart, overlapEnd);

            conflicts.push({
              visit_id_1: visit1.id,
              visit_id_2: visit2.id,
              staff_id: parseInt(staff_id),
              patient_id: visit1.patient_id,
              conflict_type: 'TIME_OVERLAP',
              conflict_severity: overlapMinutes > 30 ? 'HIGH' : 'MEDIUM',
              conflict_date: date,
              conflict_start_time: overlapStart,
              conflict_end_time: overlapEnd,
              overlap_minutes: overlapMinutes,
              conflict_description: `Visits ${visit1.id} and ${visit2.id} overlap by ${overlapMinutes} minutes`,
              detected_by: 'SYSTEM',
              detection_rule: 'TIME_OVERLAP_CHECK'
            });
          }
        }
      }

      // Check for same patient double-booking (same patient, same date, different staff)
      const patientIds = [...new Set(visits.map(v => v.patient_id))];
      for (const patientId of patientIds) {
        const otherStaffVisits = await db
          .select()
          .from(scheduled_visits)
          .where(and(
            eq(scheduled_visits.patient_id, patientId),
            eq(scheduled_visits.scheduled_date, date),
            sql`${scheduled_visits.staff_id} != ${parseInt(staff_id)}`,
            isNull(scheduled_visits.deleted_at),
            or(
              eq(scheduled_visits.visit_status, 'SCHEDULED'),
              eq(scheduled_visits.visit_status, 'CONFIRMED')
            )
          ));

        if (otherStaffVisits.length > 0) {
          const patientVisit = visits.find(v => v.patient_id === patientId);
          for (const otherVisit of otherStaffVisits) {
            conflicts.push({
              visit_id_1: patientVisit.id,
              visit_id_2: otherVisit.id,
              staff_id: parseInt(staff_id),
              patient_id: patientId,
              conflict_type: 'DOUBLE_BOOKING',
              conflict_severity: 'MEDIUM',
              conflict_date: date,
              conflict_description: `Patient has multiple visits scheduled on ${date}`,
              detected_by: 'SYSTEM',
              detection_rule: 'PATIENT_DOUBLE_BOOKING_CHECK'
            });
          }
        }
      }

      reply.code(200);
      return {
        status: 200,
        data: conflicts,
        count: conflicts.length,
        message: conflicts.length > 0 ? `Found ${conflicts.length} potential conflict(s)` : 'No conflicts detected'
      };
    } catch (error) {
      logger.error('Error detecting conflicts:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error detecting conflicts',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create/record a scheduling conflict
   * POST /conflicts
   */
  async createConflict(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.visit_id_1 || !data.visit_id_2 || !data.conflict_type || !data.conflict_date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: visit_id_1, visit_id_2, conflict_type, conflict_date'
        };
      }

      const result = await db
        .insert(scheduling_conflicts)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Conflict recorded successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating conflict:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating conflict',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Resolve a scheduling conflict
   * POST /conflicts/:id/resolve
   */
  async resolveConflict(request, reply) {
    try {
      const { id } = request.params;
      const { resolution_type, resolution_notes } = request.body;

      if (!resolution_type) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required field: resolution_type'
        };
      }

      const result = await db
        .update(scheduling_conflicts)
        .set({
          conflict_status: 'RESOLVED',
          resolution_type,
          resolution_notes,
          resolved_by_id: request.user?.id,
          resolved_at: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(scheduling_conflicts.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Conflict not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Conflict resolved successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error resolving conflict:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error resolving conflict',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Acknowledge a scheduling conflict
   * POST /conflicts/:id/acknowledge
   */
  async acknowledgeConflict(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(scheduling_conflicts)
        .set({
          conflict_status: 'ACKNOWLEDGED',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(scheduling_conflicts.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Conflict not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Conflict acknowledged',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error acknowledging conflict:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error acknowledging conflict',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get unresolved conflicts count (for dashboard/alerts)
   * GET /conflicts/unresolved-count
   */
  async getUnresolvedConflictsCount(request, reply) {
    try {
      const { staff_id } = request.query;

      const filters = [
        isNull(scheduling_conflicts.deleted_at),
        or(
          eq(scheduling_conflicts.conflict_status, 'DETECTED'),
          eq(scheduling_conflicts.conflict_status, 'FLAGGED'),
          eq(scheduling_conflicts.conflict_status, 'ACKNOWLEDGED')
        )
      ];

      if (staff_id) {
        filters.push(eq(scheduling_conflicts.staff_id, parseInt(staff_id)));
      }

      const result = await db
        .select({ count: sql`count(*)::int` })
        .from(scheduling_conflicts)
        .where(and(...filters));

      reply.code(200);
      return {
        status: 200,
        data: {
          unresolved_count: result[0]?.count || 0
        }
      };
    } catch (error) {
      logger.error('Error fetching unresolved conflicts count:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching unresolved conflicts count',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // HELPER METHODS
  // ============================================

  /**
   * Add minutes to a time string (HH:MM:SS)
   */
  _addMinutesToTime(timeStr, minutes) {
    const [hours, mins] = timeStr.split(':').map(Number);
    const totalMinutes = hours * 60 + mins + minutes;
    const newHours = Math.floor(totalMinutes / 60) % 24;
    const newMins = totalMinutes % 60;
    return `${String(newHours).padStart(2, '0')}:${String(newMins).padStart(2, '0')}:00`;
  }

  /**
   * Calculate minutes between two time strings
   */
  _calculateMinutesBetweenTimes(time1, time2) {
    const [h1, m1] = time1.split(':').map(Number);
    const [h2, m2] = time2.split(':').map(Number);
    return Math.abs((h2 * 60 + m2) - (h1 * 60 + m1));
  }

  /**
   * Validate visit business rules
   * @param {Object} data - Visit data
   * @returns {Object} - { valid: boolean, message: string }
   */
  _validateVisitBusinessRules(data) {
    // Check duration
    const duration = data.estimated_duration_minutes || DEFAULT_VISIT_DURATION_MINUTES;
    if (duration < MIN_VISIT_DURATION_MINUTES) {
      return {
        valid: false,
        message: `Visit duration must be at least ${MIN_VISIT_DURATION_MINUTES} minutes`
      };
    }
    if (duration > MAX_VISIT_DURATION_MINUTES) {
      return {
        valid: false,
        message: `Visit duration cannot exceed ${MAX_VISIT_DURATION_MINUTES} minutes (${MAX_VISIT_DURATION_MINUTES / 60} hours)`
      };
    }

    // Check scheduled date is not in the past (with tolerance for same-day)
    const scheduledDate = new Date(data.scheduled_date);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    if (scheduledDate < today) {
      return {
        valid: false,
        message: 'Cannot schedule visits in the past'
      };
    }

    // Check advance booking limit
    const maxBookingDate = new Date();
    maxBookingDate.setDate(maxBookingDate.getDate() + MAX_ADVANCE_BOOKING_DAYS);
    if (scheduledDate > maxBookingDate) {
      return {
        valid: false,
        message: `Cannot schedule visits more than ${MAX_ADVANCE_BOOKING_DAYS} days in advance`
      };
    }

    // Validate time format (HH:MM:SS or HH:MM)
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)(:[0-5]\d)?$/;
    if (!timeRegex.test(data.scheduled_start_time)) {
      return {
        valid: false,
        message: 'Invalid start time format. Use HH:MM or HH:MM:SS'
      };
    }

    // Validate visit type
    const validVisitTypes = ['RN', 'LPN', 'CNA', 'SOCIAL_WORKER', 'CHAPLAIN', 'VOLUNTEER', 'PHYSICIAN', 'MSW', 'HOSPICE_AIDE'];
    if (!validVisitTypes.includes(data.visit_type.toUpperCase())) {
      return {
        valid: false,
        message: `Invalid visit type. Valid types: ${validVisitTypes.join(', ')}`
      };
    }

    return { valid: true };
  }

  /**
   * Check staff availability against staff_schedule
   * @param {number} staffId - Staff ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @param {string} startTime - Start time (HH:MM:SS)
   * @param {string} endTime - End time (HH:MM:SS)
   * @returns {Object} - { available: boolean, reason: string, details: Object }
   */
  async _checkStaffAvailability(staffId, date, startTime, endTime) {
    try {
      // Get staff schedule entries for the date
      const schedules = await db
        .select()
        .from(staff_schedule)
        .where(and(
          eq(staff_schedule.staff_id, staffId),
          eq(staff_schedule.shift_date, date),
          isNull(staff_schedule.deleted_at)
        ));

      // Check for time-off on this date
      const timeOffSchedules = schedules.filter(s =>
        s.schedule_type === 'TIME_OFF' &&
        (s.time_off_status === 'APPROVED' || s.time_off_status === 'REQUESTED')
      );

      if (timeOffSchedules.length > 0) {
        const timeOff = timeOffSchedules[0];
        return {
          available: false,
          reason: 'Staff member has approved time-off on this date',
          details: {
            type: 'TIME_OFF',
            time_off_type: timeOff.time_off_type,
            status: timeOff.time_off_status
          }
        };
      }

      // Check for training or meeting on this date that overlaps with requested time
      const unavailableSchedules = schedules.filter(s =>
        s.schedule_type === 'TRAINING' || s.schedule_type === 'MEETING'
      );

      for (const schedule of unavailableSchedules) {
        if (schedule.start_time && schedule.end_time) {
          // Convert timestamps to time strings for comparison
          const schedStartTime = new Date(schedule.start_time);
          const schedEndTime = new Date(schedule.end_time);
          const schedStartStr = `${String(schedStartTime.getHours()).padStart(2, '0')}:${String(schedStartTime.getMinutes()).padStart(2, '0')}:00`;
          const schedEndStr = `${String(schedEndTime.getHours()).padStart(2, '0')}:${String(schedEndTime.getMinutes()).padStart(2, '0')}:00`;

          if (this._timesOverlap(startTime, endTime, schedStartStr, schedEndStr)) {
            return {
              available: false,
              reason: `Staff member has ${schedule.schedule_type.toLowerCase()} scheduled during this time`,
              details: {
                type: schedule.schedule_type,
                start_time: schedStartStr,
                end_time: schedEndStr,
                notes: schedule.notes
              }
            };
          }
        }
      }

      // Check if there's a shift defined for this day
      const shiftSchedules = schedules.filter(s => s.schedule_type === 'SHIFT');

      if (shiftSchedules.length > 0) {
        // Staff has defined working hours - check if visit falls within them
        const shift = shiftSchedules[0];
        if (shift.start_time && shift.end_time) {
          const shiftStartTime = new Date(shift.start_time);
          const shiftEndTime = new Date(shift.end_time);
          const shiftStartStr = `${String(shiftStartTime.getHours()).padStart(2, '0')}:${String(shiftStartTime.getMinutes()).padStart(2, '0')}:00`;
          const shiftEndStr = `${String(shiftEndTime.getHours()).padStart(2, '0')}:${String(shiftEndTime.getMinutes()).padStart(2, '0')}:00`;

          // Visit must be within shift hours
          if (!this._timeWithinRange(startTime, shiftStartStr, shiftEndStr) ||
              !this._timeWithinRange(endTime, shiftStartStr, shiftEndStr)) {
            return {
              available: false,
              reason: 'Requested time is outside staff working hours',
              details: {
                type: 'OUTSIDE_SHIFT',
                shift_start: shiftStartStr,
                shift_end: shiftEndStr,
                requested_start: startTime,
                requested_end: endTime
              }
            };
          }
        }
      }

      // No blockers found - staff is available
      return { available: true };
    } catch (error) {
      logger.error('Error checking staff availability:', error);
      // If we can't check availability, allow the booking but log the error
      return { available: true };
    }
  }

  /**
   * Check for visit conflicts with existing visits for a staff member
   * @param {number} staffId - Staff ID
   * @param {string} date - Date (YYYY-MM-DD)
   * @param {string} startTime - Start time (HH:MM:SS)
   * @param {string} endTime - End time (HH:MM:SS)
   * @param {number|null} excludeVisitId - Visit ID to exclude (for updates)
   * @returns {Array} - Array of conflict objects
   */
  async _checkVisitConflicts(staffId, date, startTime, endTime, excludeVisitId = null) {
    try {
      // Build query for existing visits
      const conditions = [
        eq(scheduled_visits.staff_id, staffId),
        eq(scheduled_visits.scheduled_date, date),
        isNull(scheduled_visits.deleted_at),
        or(
          eq(scheduled_visits.visit_status, 'SCHEDULED'),
          eq(scheduled_visits.visit_status, 'CONFIRMED'),
          eq(scheduled_visits.visit_status, 'IN_PROGRESS')
        )
      ];

      // Exclude specific visit if provided (for updates)
      if (excludeVisitId) {
        conditions.push(ne(scheduled_visits.id, excludeVisitId));
      }

      const existingVisits = await db
        .select({
          id: scheduled_visits.id,
          patient_id: scheduled_visits.patient_id,
          scheduled_start_time: scheduled_visits.scheduled_start_time,
          scheduled_end_time: scheduled_visits.scheduled_end_time,
          estimated_duration_minutes: scheduled_visits.estimated_duration_minutes,
          visit_type: scheduled_visits.visit_type,
          visit_status: scheduled_visits.visit_status
        })
        .from(scheduled_visits)
        .where(and(...conditions))
        .orderBy(scheduled_visits.scheduled_start_time);

      const conflicts = [];

      for (const existingVisit of existingVisits) {
        const existingStart = existingVisit.scheduled_start_time;
        const existingEnd = existingVisit.scheduled_end_time ||
          this._addMinutesToTime(existingStart, existingVisit.estimated_duration_minutes || DEFAULT_VISIT_DURATION_MINUTES);

        if (this._timesOverlap(startTime, endTime, existingStart, existingEnd)) {
          // Calculate overlap details
          const overlapStart = startTime > existingStart ? startTime : existingStart;
          const overlapEnd = endTime < existingEnd ? endTime : existingEnd;
          const overlapMinutes = this._calculateMinutesBetweenTimes(overlapStart, overlapEnd);

          conflicts.push({
            conflicting_visit_id: existingVisit.id,
            type: 'TIME_OVERLAP',
            severity: overlapMinutes > 30 ? 'HIGH' : 'MEDIUM',
            description: `Time overlap with visit #${existingVisit.id} (${existingVisit.visit_type}) by ${overlapMinutes} minutes`,
            overlap_start: overlapStart,
            overlap_end: overlapEnd,
            overlap_minutes: overlapMinutes,
            existing_visit: {
              id: existingVisit.id,
              start_time: existingStart,
              end_time: existingEnd,
              visit_type: existingVisit.visit_type,
              status: existingVisit.visit_status
            }
          });
        }
      }

      return conflicts;
    } catch (error) {
      logger.error('Error checking visit conflicts:', error);
      return [];
    }
  }

  /**
   * Check if two time ranges overlap
   * @param {string} start1 - First range start (HH:MM:SS)
   * @param {string} end1 - First range end (HH:MM:SS)
   * @param {string} start2 - Second range start (HH:MM:SS)
   * @param {string} end2 - Second range end (HH:MM:SS)
   * @returns {boolean}
   */
  _timesOverlap(start1, end1, start2, end2) {
    // Normalize to HH:MM format for comparison
    const normalize = (time) => time.substring(0, 5);
    const s1 = normalize(start1);
    const e1 = normalize(end1);
    const s2 = normalize(start2);
    const e2 = normalize(end2);

    return s1 < e2 && s2 < e1;
  }

  /**
   * Check if a time is within a range
   * @param {string} time - Time to check (HH:MM:SS)
   * @param {string} rangeStart - Range start (HH:MM:SS)
   * @param {string} rangeEnd - Range end (HH:MM:SS)
   * @returns {boolean}
   */
  _timeWithinRange(time, rangeStart, rangeEnd) {
    const normalize = (t) => t.substring(0, 5);
    const t = normalize(time);
    const start = normalize(rangeStart);
    const end = normalize(rangeEnd);

    return t >= start && t <= end;
  }

  // ============================================
  // AVAILABLE TIME SLOTS
  // ============================================

  /**
   * Get available time slots for a staff member on a given date
   * GET /staff/:staff_id/available-slots
   */
  async getAvailableSlots(request, reply) {
    try {
      const { staff_id } = request.params;
      const { date, duration_minutes = 60 } = request.query;

      if (!date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required query parameter: date'
        };
      }

      const staffId = parseInt(staff_id);
      const duration = parseInt(duration_minutes);

      // Check if staff exists
      const staffMember = await db
        .select()
        .from(staff_profiles)
        .where(and(
          eq(staff_profiles.id, staffId),
          eq(staff_profiles.employment_status, 'ACTIVE'),
          isNull(staff_profiles.deleted_at)
        ))
        .limit(1);

      if (!staffMember[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Staff member not found or is not active'
        };
      }

      // Get staff schedule for the date to determine working hours
      const schedules = await db
        .select()
        .from(staff_schedule)
        .where(and(
          eq(staff_schedule.staff_id, staffId),
          eq(staff_schedule.shift_date, date),
          isNull(staff_schedule.deleted_at)
        ));

      // Check for time-off
      const timeOffSchedules = schedules.filter(s =>
        s.schedule_type === 'TIME_OFF' &&
        (s.time_off_status === 'APPROVED' || s.time_off_status === 'REQUESTED')
      );

      if (timeOffSchedules.length > 0) {
        reply.code(200);
        return {
          status: 200,
          data: {
            staff_id: staffId,
            staff_name: `${staffMember[0].first_name} ${staffMember[0].last_name}`,
            date: date,
            available: false,
            reason: 'Staff has time-off on this date',
            slots: []
          }
        };
      }

      // Determine working hours (default 8 AM - 6 PM if no shift defined)
      let workStart = '08:00:00';
      let workEnd = '18:00:00';

      const shiftSchedules = schedules.filter(s => s.schedule_type === 'SHIFT');
      if (shiftSchedules.length > 0 && shiftSchedules[0].start_time && shiftSchedules[0].end_time) {
        const shiftStart = new Date(shiftSchedules[0].start_time);
        const shiftEnd = new Date(shiftSchedules[0].end_time);
        workStart = `${String(shiftStart.getHours()).padStart(2, '0')}:${String(shiftStart.getMinutes()).padStart(2, '0')}:00`;
        workEnd = `${String(shiftEnd.getHours()).padStart(2, '0')}:${String(shiftEnd.getMinutes()).padStart(2, '0')}:00`;
      }

      // Get blocked times (training, meetings)
      const blockedTimes = [];
      const unavailableSchedules = schedules.filter(s =>
        s.schedule_type === 'TRAINING' || s.schedule_type === 'MEETING'
      );

      for (const schedule of unavailableSchedules) {
        if (schedule.start_time && schedule.end_time) {
          const startTime = new Date(schedule.start_time);
          const endTime = new Date(schedule.end_time);
          blockedTimes.push({
            start: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}:00`,
            end: `${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}:00`,
            reason: schedule.schedule_type
          });
        }
      }

      // Get existing visits for the date
      const existingVisits = await db
        .select({
          id: scheduled_visits.id,
          scheduled_start_time: scheduled_visits.scheduled_start_time,
          scheduled_end_time: scheduled_visits.scheduled_end_time,
          estimated_duration_minutes: scheduled_visits.estimated_duration_minutes
        })
        .from(scheduled_visits)
        .where(and(
          eq(scheduled_visits.staff_id, staffId),
          eq(scheduled_visits.scheduled_date, date),
          isNull(scheduled_visits.deleted_at),
          or(
            eq(scheduled_visits.visit_status, 'SCHEDULED'),
            eq(scheduled_visits.visit_status, 'CONFIRMED'),
            eq(scheduled_visits.visit_status, 'IN_PROGRESS')
          )
        ))
        .orderBy(scheduled_visits.scheduled_start_time);

      // Add existing visits to blocked times
      for (const visit of existingVisits) {
        const endTime = visit.scheduled_end_time ||
          this._addMinutesToTime(visit.scheduled_start_time, visit.estimated_duration_minutes || DEFAULT_VISIT_DURATION_MINUTES);
        blockedTimes.push({
          start: visit.scheduled_start_time,
          end: endTime,
          reason: 'EXISTING_VISIT',
          visit_id: visit.id
        });
      }

      // Sort blocked times by start time
      blockedTimes.sort((a, b) => a.start.localeCompare(b.start));

      // Generate available slots
      const slots = this._generateAvailableSlots(workStart, workEnd, blockedTimes, duration);

      reply.code(200);
      return {
        status: 200,
        data: {
          staff_id: staffId,
          staff_name: `${staffMember[0].first_name} ${staffMember[0].last_name}`,
          date: date,
          available: slots.length > 0,
          working_hours: {
            start: workStart,
            end: workEnd
          },
          requested_duration_minutes: duration,
          slots: slots,
          blocked_times: blockedTimes
        }
      };
    } catch (error) {
      logger.error('Error getting available slots:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error getting available slots',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Generate available time slots given working hours and blocked times
   * @param {string} workStart - Working hours start (HH:MM:SS)
   * @param {string} workEnd - Working hours end (HH:MM:SS)
   * @param {Array} blockedTimes - Array of { start, end } blocked time ranges
   * @param {number} slotDuration - Required slot duration in minutes
   * @returns {Array} - Array of available slot objects
   */
  _generateAvailableSlots(workStart, workEnd, blockedTimes, slotDuration) {
    const slots = [];
    let currentTime = workStart;

    // Convert time string to minutes from midnight for easier calculation
    const timeToMinutes = (time) => {
      const [h, m] = time.split(':').map(Number);
      return h * 60 + m;
    };

    // Convert minutes back to time string
    const minutesToTime = (minutes) => {
      const h = Math.floor(minutes / 60) % 24;
      const m = minutes % 60;
      return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`;
    };

    const workStartMins = timeToMinutes(workStart);
    const workEndMins = timeToMinutes(workEnd);
    let currentMins = workStartMins;

    // Merge overlapping blocked times
    const mergedBlocked = this._mergeOverlappingRanges(blockedTimes.map(b => ({
      start: timeToMinutes(b.start),
      end: timeToMinutes(b.end)
    })));

    let blockedIndex = 0;

    // Iterate through the work day in 15-minute increments
    while (currentMins + slotDuration <= workEndMins) {
      const slotEnd = currentMins + slotDuration;

      // Skip past any blocked times that end before current time
      while (blockedIndex < mergedBlocked.length && mergedBlocked[blockedIndex].end <= currentMins) {
        blockedIndex++;
      }

      // Check if current slot overlaps with any blocked time
      let isBlocked = false;
      if (blockedIndex < mergedBlocked.length) {
        const block = mergedBlocked[blockedIndex];
        // Overlap if slot starts before block ends AND slot ends after block starts
        if (currentMins < block.end && slotEnd > block.start) {
          isBlocked = true;
          // Jump to end of this blocked time
          currentMins = block.end;
          continue;
        }
      }

      if (!isBlocked) {
        slots.push({
          start_time: minutesToTime(currentMins),
          end_time: minutesToTime(slotEnd),
          duration_minutes: slotDuration
        });
      }

      // Move to next 15-minute slot
      currentMins += 15;
    }

    return slots;
  }

  /**
   * Merge overlapping time ranges
   * @param {Array} ranges - Array of { start, end } in minutes
   * @returns {Array} - Merged ranges
   */
  _mergeOverlappingRanges(ranges) {
    if (ranges.length === 0) return [];

    // Sort by start time
    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged = [sorted[0]];

    for (let i = 1; i < sorted.length; i++) {
      const last = merged[merged.length - 1];
      const current = sorted[i];

      if (current.start <= last.end) {
        // Overlapping - merge
        last.end = Math.max(last.end, current.end);
      } else {
        merged.push(current);
      }
    }

    return merged;
  }

  // ============================================
  // SCHEDULE A VISIT WITH STRICT CONFLICT CHECK
  // ============================================

  /**
   * Schedule a visit with strict conflict prevention (atomic)
   * POST /visits/schedule-strict
   *
   * This endpoint will REJECT the request if any conflicts are found,
   * unlike the regular createVisit which allows with warnings.
   */
  async scheduleVisitStrict(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.patient_id || !data.staff_id || !data.scheduled_date || !data.visit_type || !data.scheduled_start_time) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: patient_id, staff_id, scheduled_date, visit_type, scheduled_start_time'
        };
      }

      // Business rule validations
      const validationResult = this._validateVisitBusinessRules(data);
      if (!validationResult.valid) {
        reply.code(400);
        return {
          status: 400,
          message: validationResult.message
        };
      }

      // Use transaction with serializable isolation to prevent race conditions
      const result = await db.transaction(async (tx) => {
        // Check if staff exists and is active
        const [staffMember] = await tx
          .select()
          .from(staff_profiles)
          .where(and(
            eq(staff_profiles.id, parseInt(data.staff_id)),
            eq(staff_profiles.employment_status, 'ACTIVE'),
            isNull(staff_profiles.deleted_at)
          ))
          .limit(1);

        if (!staffMember) {
          throw new Error('STAFF_NOT_FOUND');
        }

        // Check if patient exists
        const [patient] = await tx
          .select()
          .from(patients)
          .where(and(
            eq(patients.id, parseInt(data.patient_id)),
            isNull(patients.deleted_at)
          ))
          .limit(1);

        if (!patient) {
          throw new Error('PATIENT_NOT_FOUND');
        }

        // Calculate end time
        const endTime = data.scheduled_end_time ||
          this._addMinutesToTime(data.scheduled_start_time, data.estimated_duration_minutes || DEFAULT_VISIT_DURATION_MINUTES);

        // Check staff availability within transaction
        const schedules = await tx
          .select()
          .from(staff_schedule)
          .where(and(
            eq(staff_schedule.staff_id, parseInt(data.staff_id)),
            eq(staff_schedule.shift_date, data.scheduled_date),
            isNull(staff_schedule.deleted_at)
          ));

        // Check for time-off
        const timeOff = schedules.find(s =>
          s.schedule_type === 'TIME_OFF' &&
          (s.time_off_status === 'APPROVED' || s.time_off_status === 'REQUESTED')
        );

        if (timeOff) {
          throw new Error('STAFF_UNAVAILABLE:Staff has time-off on this date');
        }

        // Check for existing overlapping visits (with FOR UPDATE lock)
        const [existingConflict] = await tx
          .select()
          .from(scheduled_visits)
          .where(and(
            eq(scheduled_visits.staff_id, parseInt(data.staff_id)),
            eq(scheduled_visits.scheduled_date, data.scheduled_date),
            isNull(scheduled_visits.deleted_at),
            or(
              eq(scheduled_visits.visit_status, 'SCHEDULED'),
              eq(scheduled_visits.visit_status, 'CONFIRMED'),
              eq(scheduled_visits.visit_status, 'IN_PROGRESS')
            ),
            // Check time overlap using SQL
            sql`(${scheduled_visits.scheduled_start_time} < ${endTime}::time AND
                 COALESCE(${scheduled_visits.scheduled_end_time},
                   ${scheduled_visits.scheduled_start_time}::time + (${scheduled_visits.estimated_duration_minutes} || ' minutes')::interval
                 )::time > ${data.scheduled_start_time}::time)`
          ))
          .limit(1);

        if (existingConflict) {
          throw new Error(`CONFLICT:Time conflict with existing visit #${existingConflict.id}`);
        }

        // All checks passed - create the visit
        const [newVisit] = await tx
          .insert(scheduled_visits)
          .values({
            ...data,
            estimated_duration_minutes: data.estimated_duration_minutes || DEFAULT_VISIT_DURATION_MINUTES,
            scheduled_end_time: endTime,
            created_by_id: request.user?.id,
            updated_by_id: request.user?.id
          })
          .returning();

        return { visit: newVisit, staff: staffMember };
      });

      reply.code(201);
      return {
        status: 201,
        message: 'Visit scheduled successfully (conflict-free)',
        data: result.visit
      };
    } catch (error) {
      // Handle specific errors
      if (error.message === 'STAFF_NOT_FOUND') {
        reply.code(404);
        return {
          status: 404,
          message: 'Staff member not found or is not active'
        };
      }

      if (error.message === 'PATIENT_NOT_FOUND') {
        reply.code(404);
        return {
          status: 404,
          message: 'Patient not found'
        };
      }

      if (error.message.startsWith('STAFF_UNAVAILABLE:')) {
        reply.code(409);
        return {
          status: 409,
          message: error.message.substring('STAFF_UNAVAILABLE:'.length)
        };
      }

      if (error.message.startsWith('CONFLICT:')) {
        reply.code(409);
        return {
          status: 409,
          message: error.message.substring('CONFLICT:'.length)
        };
      }

      logger.error('Error scheduling visit (strict):', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error scheduling visit',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Check staff availability for a specific time range
   * GET /staff/:staff_id/check-availability
   */
  async checkStaffAvailability(request, reply) {
    try {
      const { staff_id } = request.params;
      const { date, start_time, end_time, duration_minutes = 60 } = request.query;

      if (!date || !start_time) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required query parameters: date, start_time'
        };
      }

      const staffId = parseInt(staff_id);
      const actualEndTime = end_time || this._addMinutesToTime(start_time, parseInt(duration_minutes));

      // Check if staff exists
      const [staffMember] = await db
        .select()
        .from(staff_profiles)
        .where(and(
          eq(staff_profiles.id, staffId),
          isNull(staff_profiles.deleted_at)
        ))
        .limit(1);

      if (!staffMember) {
        reply.code(404);
        return {
          status: 404,
          message: 'Staff member not found'
        };
      }

      // Check availability
      const availabilityCheck = await this._checkStaffAvailability(
        staffId, date, start_time, actualEndTime
      );

      // Check for conflicts
      const conflicts = await this._checkVisitConflicts(
        staffId, date, start_time, actualEndTime, null
      );

      reply.code(200);
      return {
        status: 200,
        data: {
          staff_id: staffId,
          staff_name: `${staffMember.first_name} ${staffMember.last_name}`,
          requested_slot: {
            date: date,
            start_time: start_time,
            end_time: actualEndTime,
            duration_minutes: parseInt(duration_minutes)
          },
          is_available: availabilityCheck.available && conflicts.length === 0,
          schedule_available: availabilityCheck.available,
          schedule_unavailability_reason: availabilityCheck.available ? null : availabilityCheck.reason,
          schedule_unavailability_details: availabilityCheck.available ? null : availabilityCheck.details,
          has_conflicts: conflicts.length > 0,
          conflicts: conflicts.map(c => ({
            type: c.type,
            severity: c.severity,
            description: c.description,
            conflicting_visit_id: c.conflicting_visit_id,
            overlap_minutes: c.overlap_minutes
          }))
        }
      };
    } catch (error) {
      logger.error('Error checking staff availability:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error checking staff availability',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new SchedulingController();
