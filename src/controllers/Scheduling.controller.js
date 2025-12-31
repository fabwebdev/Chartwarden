import { db } from '../config/db.drizzle.js';
import {
  scheduled_visits,
  recurring_visits,
  on_call_schedule,
  on_call_logs,
  visit_compliance,
  patients,
  staff_profiles
} from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, sql, or, isNull, between } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
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
   * Create scheduled visit
   * POST /visits
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

      const result = await db
        .insert(scheduled_visits)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Visit scheduled successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating visit:', error)
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
}

export default new SchedulingController();
