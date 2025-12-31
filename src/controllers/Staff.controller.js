import { db } from '../config/db.drizzle.js';
import {
  staff_profiles,
  staff_credentials,
  staff_caseload,
  staff_schedule,
  staff_productivity,
  staff_training,
  patients,
  users
} from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, sql, or, isNull, lt } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
/**
 * Staff Controller
 * Module H - MEDIUM Priority
 *
 * Purpose: Employee tracking, credential expiration alerts, caseload management
 * Compliance: State licensing requirements, HIPAA workforce security
 *
 * Endpoints:
 * - Staff profile management
 * - Credential tracking with expiration alerts
 * - Caseload assignment and management
 * - Schedule and time-off management
 * - Productivity tracking and reporting
 * - Training and continuing education
 */
class StaffController {
  // ============================================
  // STAFF PROFILE MANAGEMENT
  // ============================================

  /**
   * Get all staff profiles
   * GET /staff
   */
  async getAllStaff(request, reply) {
    try {
      const {
        limit = 50,
        offset = 0,
        status,
        department,
        job_title
      } = request.query;

      let query = db
        .select()
        .from(staff_profiles)
        .where(isNull(staff_profiles.deleted_at));

      // Apply filters
      const filters = [];
      if (status) {
        filters.push(eq(staff_profiles.employment_status, status));
      }
      if (department) {
        filters.push(eq(staff_profiles.department, department));
      }
      if (job_title) {
        filters.push(eq(staff_profiles.job_title, job_title));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query
        .orderBy(staff_profiles.last_name, staff_profiles.first_name)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching staff:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching staff',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get staff by ID
   * GET /staff/:id
   */
  async getStaffById(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .select()
        .from(staff_profiles)
        .where(and(
          eq(staff_profiles.id, parseInt(id)),
          isNull(staff_profiles.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Staff member not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: result[0]
      };
    } catch (error) {
      logger.error('Error fetching staff member:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching staff member',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create staff profile
   * POST /staff
   */
  async createStaff(request, reply) {
    try {
      const data = request.body;

      // Validate required fields
      if (!data.first_name || !data.last_name) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: first_name, last_name'
        };
      }

      const result = await db
        .insert(staff_profiles)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Staff profile created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating staff profile:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating staff profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update staff profile
   * PATCH /staff/:id
   */
  async updateStaff(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(staff_profiles)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(staff_profiles.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Staff member not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Staff profile updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating staff profile:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating staff profile',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // CREDENTIAL MANAGEMENT
  // ============================================

  /**
   * Get credentials for staff member
   * GET /staff/:id/credentials
   */
  async getStaffCredentials(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(staff_credentials)
        .where(and(
          eq(staff_credentials.staff_id, parseInt(id)),
          isNull(staff_credentials.deleted_at)
        ))
        .orderBy(staff_credentials.expiration_date);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching credentials:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching credentials',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add credential to staff member
   * POST /staff/:id/credentials
   */
  async addCredential(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate required fields
      if (!data.credential_type || !data.credential_name || !data.expiration_date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: credential_type, credential_name, expiration_date'
        };
      }

      const result = await db
        .insert(staff_credentials)
        .values({
          staff_id: parseInt(id),
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Credential added successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding credential:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding credential',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get expiring credentials (within 30 days or custom threshold)
   * GET /staff/credentials/expiring
   */
  async getExpiringCredentials(request, reply) {
    try {
      const { days = 30 } = request.query;
      const thresholdDate = new Date();
      thresholdDate.setDate(thresholdDate.getDate() + parseInt(days));

      const results = await db
        .select({
          credential: staff_credentials,
          staff: staff_profiles
        })
        .from(staff_credentials)
        .leftJoin(staff_profiles, eq(staff_credentials.staff_id, staff_profiles.id))
        .where(and(
          lte(staff_credentials.expiration_date, thresholdDate.toISOString().split('T')[0]),
          gte(staff_credentials.expiration_date, new Date().toISOString().split('T')[0]),
          eq(staff_credentials.credential_status, 'ACTIVE'),
          isNull(staff_credentials.deleted_at)
        ))
        .orderBy(staff_credentials.expiration_date);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        threshold_days: parseInt(days)
      };
    } catch (error) {
      logger.error('Error fetching expiring credentials:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching expiring credentials',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // CASELOAD MANAGEMENT
  // ============================================

  /**
   * Get caseload for staff member
   * GET /staff/:id/caseload
   */
  async getStaffCaseload(request, reply) {
    try {
      const { id } = request.params;
      const { status = 'ACTIVE' } = request.query;

      const results = await db
        .select({
          assignment: staff_caseload,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(staff_caseload)
        .leftJoin(patients, eq(staff_caseload.patient_id, patients.id))
        .where(and(
          eq(staff_caseload.staff_id, parseInt(id)),
          eq(staff_caseload.assignment_status, status),
          isNull(staff_caseload.deleted_at)
        ))
        .orderBy(staff_caseload.is_primary, patients.last_name);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching caseload:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching caseload',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Assign patient to staff member
   * POST /staff/:id/caseload
   */
  async assignPatient(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate required fields
      if (!data.patient_id || !data.assignment_role) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: patient_id, assignment_role'
        };
      }

      const result = await db
        .insert(staff_caseload)
        .values({
          staff_id: parseInt(id),
          patient_id: parseInt(data.patient_id),
          assignment_role: data.assignment_role,
          is_primary: data.is_primary || false,
          assignment_start_date: data.assignment_start_date || new Date().toISOString().split('T')[0],
          assignment_status: 'ACTIVE',
          scheduled_visits_per_week: data.scheduled_visits_per_week,
          notes: data.notes,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Patient assigned successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error assigning patient:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error assigning patient',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // SCHEDULE MANAGEMENT
  // ============================================

  /**
   * Get schedule for staff member
   * GET /staff/:id/schedule
   */
  async getStaffSchedule(request, reply) {
    try {
      const { id } = request.params;
      const { start_date, end_date } = request.query;

      let query = db
        .select()
        .from(staff_schedule)
        .where(and(
          eq(staff_schedule.staff_id, parseInt(id)),
          isNull(staff_schedule.deleted_at)
        ));

      const filters = [];
      if (start_date) {
        filters.push(gte(staff_schedule.shift_date, start_date));
      }
      if (end_date) {
        filters.push(lte(staff_schedule.shift_date, end_date));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(staff_schedule.shift_date, staff_schedule.start_time);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching schedule:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching schedule',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create schedule entry
   * POST /staff/:id/schedule
   */
  async createSchedule(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate required fields
      if (!data.schedule_type || !data.shift_date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: schedule_type, shift_date'
        };
      }

      const result = await db
        .insert(staff_schedule)
        .values({
          staff_id: parseInt(id),
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Schedule entry created successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating schedule:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating schedule',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // PRODUCTIVITY TRACKING
  // ============================================

  /**
   * Get productivity metrics for staff member
   * GET /staff/:id/productivity
   */
  async getStaffProductivity(request, reply) {
    try {
      const { id } = request.params;
      const { period_type, start_date, end_date } = request.query;

      let query = db
        .select()
        .from(staff_productivity)
        .where(eq(staff_productivity.staff_id, parseInt(id)));

      const filters = [];
      if (period_type) {
        filters.push(eq(staff_productivity.period_type, period_type));
      }
      if (start_date) {
        filters.push(gte(staff_productivity.reporting_period_start, start_date));
      }
      if (end_date) {
        filters.push(lte(staff_productivity.reporting_period_end, end_date));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(desc(staff_productivity.reporting_period_start));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching productivity:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching productivity',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Record productivity metrics
   * POST /staff/:id/productivity
   */
  async recordProductivity(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate required fields
      if (!data.reporting_period_start || !data.reporting_period_end) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: reporting_period_start, reporting_period_end'
        };
      }

      const result = await db
        .insert(staff_productivity)
        .values({
          staff_id: parseInt(id),
          ...data,
          created_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Productivity metrics recorded successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error recording productivity:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error recording productivity',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================
  // TRAINING MANAGEMENT
  // ============================================

  /**
   * Get training records for staff member
   * GET /staff/:id/training
   */
  async getStaffTraining(request, reply) {
    try {
      const { id } = request.params;
      const { status, training_type } = request.query;

      let query = db
        .select()
        .from(staff_training)
        .where(and(
          eq(staff_training.staff_id, parseInt(id)),
          isNull(staff_training.deleted_at)
        ));

      const filters = [];
      if (status) {
        filters.push(eq(staff_training.training_status, status));
      }
      if (training_type) {
        filters.push(eq(staff_training.training_type, training_type));
      }

      if (filters.length > 0) {
        query = query.where(and(...filters));
      }

      const results = await query.orderBy(desc(staff_training.training_date));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching training records:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching training records',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add training record
   * POST /staff/:id/training
   */
  async addTraining(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate required fields
      if (!data.training_name || !data.training_type || !data.training_date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: training_name, training_type, training_date'
        };
      }

      const result = await db
        .insert(staff_training)
        .values({
          staff_id: parseInt(id),
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Training record added successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding training record:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding training record',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new StaffController();
