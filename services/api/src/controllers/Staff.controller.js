import { db } from '../config/db.drizzle.js';
import {
  staff_profiles,
  staff_credentials,
  staff_caseload,
  staff_schedule,
  staff_productivity,
  staff_training,
  credential_history,
  credential_documents,
  required_credentials,
  patients,
  users,
  audit_logs
} from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, sql, or, isNull, lt, like, ilike } from 'drizzle-orm';

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
   * Supports: search (name, employee_id), status, department, job_title, pagination
   */
  async getAllStaff(request, reply) {
    try {
      const {
        limit = 50,
        offset = 0,
        status,
        department,
        job_title,
        search,
        employee_id
      } = request.query;

      // Build filter conditions
      const filters = [isNull(staff_profiles.deleted_at)];

      if (status) {
        filters.push(eq(staff_profiles.employment_status, status));
      }
      if (department) {
        filters.push(eq(staff_profiles.department, department));
      }
      if (job_title) {
        filters.push(eq(staff_profiles.job_title, job_title));
      }
      if (employee_id) {
        filters.push(eq(staff_profiles.employee_id, employee_id));
      }

      // Search by name (first_name, last_name, or preferred_name)
      if (search) {
        const searchPattern = `%${search}%`;
        filters.push(
          or(
            ilike(staff_profiles.first_name, searchPattern),
            ilike(staff_profiles.last_name, searchPattern),
            ilike(staff_profiles.preferred_name, searchPattern),
            ilike(staff_profiles.employee_id, searchPattern),
            ilike(staff_profiles.email, searchPattern)
          )
        );
      }

      const results = await db
        .select()
        .from(staff_profiles)
        .where(and(...filters))
        .orderBy(staff_profiles.last_name, staff_profiles.first_name)
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Get total count for pagination
      const countResult = await db
        .select({ count: sql`count(*)::int` })
        .from(staff_profiles)
        .where(and(...filters));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        total: countResult[0]?.count || 0,
        limit: parseInt(limit),
        offset: parseInt(offset)
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

  /**
   * Soft delete staff profile
   * DELETE /staff/:id
   */
  async deleteStaff(request, reply) {
    try {
      const { id } = request.params;

      // Verify staff exists
      const existing = await db
        .select()
        .from(staff_profiles)
        .where(and(
          eq(staff_profiles.id, parseInt(id)),
          isNull(staff_profiles.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Staff member not found'
        };
      }

      // Soft delete
      const result = await db
        .update(staff_profiles)
        .set({
          deleted_at: new Date(),
          employment_status: 'TERMINATED',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(staff_profiles.id, parseInt(id)))
        .returning();

      // Log the deletion in audit_logs
      await db.insert(audit_logs).values({
        user_id: request.user?.id,
        action: 'DELETE',
        resource_type: 'staff_profiles',
        resource_id: String(id),
        old_value: JSON.stringify(existing[0]),
        new_value: JSON.stringify({ deleted_at: result[0]?.deleted_at }),
        status: 'success',
        ip_address: request.ip,
        user_agent: request.headers['user-agent']
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Staff profile deleted successfully'
      };
    } catch (error) {
      logger.error('Error deleting staff profile:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error deleting staff profile',
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

      // Validate issue_date is before expiration_date if provided
      if (data.issue_date && data.expiration_date) {
        const issueDate = new Date(data.issue_date);
        const expirationDate = new Date(data.expiration_date);
        if (issueDate >= expirationDate) {
          reply.code(400);
          return {
            status: 400,
            message: 'Issue date must be before expiration date'
          };
        }
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

      // Log credential creation in history
      await db.insert(credential_history).values({
        credential_id: result[0].id,
        staff_id: parseInt(id),
        change_type: 'CREATED',
        new_values: result[0],
        change_summary: `Credential ${data.credential_type} created`,
        changed_by_id: request.user?.id
      });

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
   * Update credential
   * PUT /credentials/:id
   */
  async updateCredential(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Get existing credential
      const existing = await db
        .select()
        .from(staff_credentials)
        .where(and(
          eq(staff_credentials.id, parseInt(id)),
          isNull(staff_credentials.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Credential not found'
        };
      }

      // Validate issue_date is before expiration_date if provided
      const issueDate = data.issue_date || existing[0].issue_date;
      const expirationDate = data.expiration_date || existing[0].expiration_date;
      if (issueDate && expirationDate) {
        if (new Date(issueDate) >= new Date(expirationDate)) {
          reply.code(400);
          return {
            status: 400,
            message: 'Issue date must be before expiration date'
          };
        }
      }

      // Determine change type based on what's being updated
      let changeType = 'UPDATED';
      if (data.credential_status === 'REVOKED') {
        changeType = 'REVOKED';
      } else if (data.expiration_date && data.expiration_date !== existing[0].expiration_date) {
        changeType = 'RENEWED';
      } else if (data.verification_date) {
        changeType = 'VERIFIED';
      }

      const result = await db
        .update(staff_credentials)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(staff_credentials.id, parseInt(id)))
        .returning();

      // Log credential change in history
      await db.insert(credential_history).values({
        credential_id: parseInt(id),
        staff_id: existing[0].staff_id,
        change_type: changeType,
        previous_values: existing[0],
        new_values: result[0],
        change_summary: `Credential ${changeType.toLowerCase()}: ${existing[0].credential_type}`,
        changed_by_id: request.user?.id
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Credential updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating credential:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating credential',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Revoke/delete credential
   * DELETE /credentials/:id
   */
  async deleteCredential(request, reply) {
    try {
      const { id } = request.params;

      // Get existing credential
      const existing = await db
        .select()
        .from(staff_credentials)
        .where(and(
          eq(staff_credentials.id, parseInt(id)),
          isNull(staff_credentials.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Credential not found'
        };
      }

      // Soft delete and mark as revoked
      const result = await db
        .update(staff_credentials)
        .set({
          deleted_at: new Date(),
          credential_status: 'REVOKED',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(staff_credentials.id, parseInt(id)))
        .returning();

      // Log credential revocation in history
      await db.insert(credential_history).values({
        credential_id: parseInt(id),
        staff_id: existing[0].staff_id,
        change_type: 'REVOKED',
        previous_values: existing[0],
        new_values: { deleted_at: result[0]?.deleted_at, credential_status: 'REVOKED' },
        change_summary: `Credential revoked: ${existing[0].credential_type}`,
        changed_by_id: request.user?.id
      });

      reply.code(200);
      return {
        status: 200,
        message: 'Credential revoked successfully'
      };
    } catch (error) {
      logger.error('Error revoking credential:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error revoking credential',
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

  /**
   * Get expired credentials
   * GET /credentials/expired
   */
  async getExpiredCredentials(request, reply) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const results = await db
        .select({
          credential: staff_credentials,
          staff: {
            id: staff_profiles.id,
            first_name: staff_profiles.first_name,
            last_name: staff_profiles.last_name,
            employee_id: staff_profiles.employee_id,
            department: staff_profiles.department
          }
        })
        .from(staff_credentials)
        .leftJoin(staff_profiles, eq(staff_credentials.staff_id, staff_profiles.id))
        .where(and(
          lt(staff_credentials.expiration_date, today),
          isNull(staff_credentials.deleted_at),
          isNull(staff_profiles.deleted_at)
        ))
        .orderBy(staff_credentials.expiration_date);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching expired credentials:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching expired credentials',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get staff missing required credentials
   * GET /staff/missing-credentials
   */
  async getStaffMissingCredentials(request, reply) {
    try {
      // Get all active staff
      const activeStaff = await db
        .select()
        .from(staff_profiles)
        .where(and(
          eq(staff_profiles.employment_status, 'ACTIVE'),
          isNull(staff_profiles.deleted_at)
        ));

      // Get all required credentials configurations
      const requiredCreds = await db
        .select()
        .from(required_credentials)
        .where(and(
          eq(required_credentials.is_mandatory, true),
          isNull(required_credentials.deleted_at)
        ));

      // Get all active credentials for all staff
      const allCredentials = await db
        .select()
        .from(staff_credentials)
        .where(and(
          eq(staff_credentials.credential_status, 'ACTIVE'),
          isNull(staff_credentials.deleted_at)
        ));

      // Build a map of staff credentials
      const staffCredentialsMap = new Map();
      allCredentials.forEach(cred => {
        if (!staffCredentialsMap.has(cred.staff_id)) {
          staffCredentialsMap.set(cred.staff_id, []);
        }
        staffCredentialsMap.get(cred.staff_id).push(cred.credential_type);
      });

      // Find staff missing required credentials
      const staffMissingCredentials = [];

      for (const staff of activeStaff) {
        const staffCreds = staffCredentialsMap.get(staff.id) || [];

        // Find required credentials for this staff's department and job title
        const applicableReqs = requiredCreds.filter(req =>
          (!req.department || req.department === staff.department) &&
          (!req.job_title || req.job_title === staff.job_title)
        );

        const missingCreds = applicableReqs
          .filter(req => !staffCreds.includes(req.credential_type))
          .map(req => ({
            credential_type: req.credential_type,
            credential_name: req.credential_name,
            grace_period_days: req.grace_period_days
          }));

        if (missingCreds.length > 0) {
          staffMissingCredentials.push({
            staff: {
              id: staff.id,
              first_name: staff.first_name,
              last_name: staff.last_name,
              employee_id: staff.employee_id,
              department: staff.department,
              job_title: staff.job_title,
              hire_date: staff.hire_date
            },
            missing_credentials: missingCreds
          });
        }
      }

      reply.code(200);
      return {
        status: 200,
        data: staffMissingCredentials,
        count: staffMissingCredentials.length
      };
    } catch (error) {
      logger.error('Error fetching staff with missing credentials:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching staff with missing credentials',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Upload credential document
   * POST /credentials/:id/documents
   */
  async uploadCredentialDocument(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Verify credential exists
      const credential = await db
        .select()
        .from(staff_credentials)
        .where(and(
          eq(staff_credentials.id, parseInt(id)),
          isNull(staff_credentials.deleted_at)
        ))
        .limit(1);

      if (!credential[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Credential not found'
        };
      }

      // Validate required fields
      if (!data.file_name || !data.file_path) {
        reply.code(400);
        return {
          status: 400,
          message: 'Missing required fields: file_name, file_path'
        };
      }

      // Validate file type (allowed: PDF, JPEG, PNG)
      const allowedTypes = ['PDF', 'JPEG', 'JPG', 'PNG'];
      const fileType = data.file_type?.toUpperCase();
      if (fileType && !allowedTypes.includes(fileType)) {
        reply.code(400);
        return {
          status: 400,
          message: `Invalid file type. Allowed types: ${allowedTypes.join(', ')}`
        };
      }

      // Validate file size (max 10MB)
      const maxSize = 10 * 1024 * 1024; // 10MB in bytes
      if (data.file_size && data.file_size > maxSize) {
        reply.code(400);
        return {
          status: 400,
          message: 'File size exceeds maximum allowed (10MB)'
        };
      }

      const result = await db
        .insert(credential_documents)
        .values({
          credential_id: parseInt(id),
          file_name: data.file_name,
          file_path: data.file_path,
          file_type: data.file_type,
          file_size: data.file_size,
          mime_type: data.mime_type,
          document_type: data.document_type,
          description: data.description,
          uploaded_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Document uploaded successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error uploading credential document:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error uploading credential document',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get credential history
   * GET /credentials/:id/history
   */
  async getCredentialHistory(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select({
          history: credential_history,
          changed_by: {
            id: users.id,
            name: users.name,
            email: users.email
          }
        })
        .from(credential_history)
        .leftJoin(users, eq(credential_history.changed_by_id, users.id))
        .where(eq(credential_history.credential_id, parseInt(id)))
        .orderBy(desc(credential_history.changed_at));

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching credential history:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching credential history',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get staff audit log
   * GET /staff/:id/audit-log
   */
  async getStaffAuditLog(request, reply) {
    try {
      const { id } = request.params;
      const { start_date, end_date, limit = 100, offset = 0 } = request.query;

      // Build filter conditions
      const filters = [
        or(
          and(
            eq(audit_logs.resource_type, 'staff_profiles'),
            eq(audit_logs.resource_id, String(id))
          ),
          and(
            eq(audit_logs.resource_type, 'staff_credentials'),
            sql`${audit_logs.metadata}->>'staff_id' = ${String(id)}`
          )
        )
      ];

      if (start_date) {
        filters.push(gte(audit_logs.created_at, new Date(start_date)));
      }
      if (end_date) {
        filters.push(lte(audit_logs.created_at, new Date(end_date)));
      }

      const results = await db
        .select({
          log: audit_logs,
          user: {
            id: users.id,
            name: users.name,
            email: users.email
          }
        })
        .from(audit_logs)
        .leftJoin(users, eq(audit_logs.user_id, users.id))
        .where(and(...filters))
        .orderBy(desc(audit_logs.created_at))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      // Also get credential history for this staff member
      const credentialHistoryResults = await db
        .select({
          history: credential_history,
          changed_by: {
            id: users.id,
            name: users.name,
            email: users.email
          }
        })
        .from(credential_history)
        .leftJoin(users, eq(credential_history.changed_by_id, users.id))
        .where(eq(credential_history.staff_id, parseInt(id)))
        .orderBy(desc(credential_history.changed_at))
        .limit(parseInt(limit));

      reply.code(200);
      return {
        status: 200,
        data: {
          audit_logs: results,
          credential_history: credentialHistoryResults
        },
        audit_logs_count: results.length,
        credential_history_count: credentialHistoryResults.length
      };
    } catch (error) {
      logger.error('Error fetching staff audit log:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching staff audit log',
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
