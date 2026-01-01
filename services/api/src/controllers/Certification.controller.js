import { db } from '../config/db.drizzle.js';
import {
  certifications,
  face_to_face_encounters,
  orders,
  verbal_orders_tracking,
  recertification_schedule,
  patients,
  certification_alerts,
  users
} from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, sql, or, isNull, ne } from 'drizzle-orm';
import crypto from 'crypto';
import { logAudit } from '../middleware/audit.middleware.js';
import { logger } from '../utils/logger.js';

/**
 * Certification Controller
 * Manages Medicare certification periods, Face-to-Face encounters, and physician orders
 * CRITICAL: Required for Medicare reimbursement
 *
 * CMS Requirements:
 * - Initial certification (first 90 days) requires physician attestation within 2 days
 * - Subsequent periods: 2x 90 days, then 60-day periods indefinitely
 * - Face-to-Face encounters required for 3rd benefit period and beyond
 * - F2F must occur within 90 days before or 30 days after start of care
 * - Physician must have valid credentials (PHYSICIAN, NP, or PA)
 */
class CertificationController {
  // ============================================================================
  // VALIDATION HELPERS
  // ============================================================================

  /**
   * Validate Face-to-Face encounter date falls within CMS-required window
   * CMS Requirement: F2F must occur within 90 days before or 30 days after start of care
   * @param {Date} encounterDate - Date of the F2F encounter
   * @param {Date} startOfCareDate - Start of care date (certification start date)
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateF2FDateRange(encounterDate, startOfCareDate) {
    const errors = [];
    const encounter = new Date(encounterDate);
    const startOfCare = new Date(startOfCareDate);

    // Calculate the valid window: 90 days before to 30 days after
    const windowStart = new Date(startOfCare);
    windowStart.setDate(windowStart.getDate() - 90);

    const windowEnd = new Date(startOfCare);
    windowEnd.setDate(windowEnd.getDate() + 30);

    if (encounter < windowStart) {
      const daysBefore = Math.ceil((startOfCare - encounter) / (1000 * 60 * 60 * 24));
      errors.push(`Face-to-Face encounter occurred ${daysBefore} days before start of care. CMS requires F2F within 90 days before or 30 days after start of care.`);
    }

    if (encounter > windowEnd) {
      const daysAfter = Math.ceil((encounter - startOfCare) / (1000 * 60 * 60 * 24));
      errors.push(`Face-to-Face encounter occurred ${daysAfter} days after start of care. CMS requires F2F within 90 days before or 30 days after start of care.`);
    }

    return {
      valid: errors.length === 0,
      errors,
      windowStart: windowStart.toISOString().split('T')[0],
      windowEnd: windowEnd.toISOString().split('T')[0]
    };
  }

  /**
   * Validate physician credentials for F2F encounters
   * CMS requires F2F to be performed by PHYSICIAN, NP, or PA
   * @param {string} performedByType - Type of provider (PHYSICIAN, NP, PA)
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validatePhysicianCredentials(performedByType) {
    const errors = [];
    const validTypes = ['PHYSICIAN', 'NP', 'PA'];

    if (!performedByType) {
      errors.push('Provider type is required for Face-to-Face encounters');
    } else if (!validTypes.includes(performedByType)) {
      errors.push(`Invalid provider type "${performedByType}". CMS requires F2F encounters to be performed by PHYSICIAN, NP, or PA`);
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  /**
   * Check for duplicate certifications
   * @param {number} patientId - Patient ID
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {number|null} excludeId - ID to exclude (for updates)
   * @returns {Promise<Object>} { isDuplicate: boolean, existingCertification: Object|null }
   */
  async checkDuplicateCertification(patientId, startDate, endDate, excludeId = null) {
    const conditions = [
      eq(certifications.patient_id, patientId),
      isNull(certifications.deleted_at),
      // Check for overlapping date ranges
      or(
        and(
          lte(certifications.start_date, startDate),
          gte(certifications.end_date, startDate)
        ),
        and(
          lte(certifications.start_date, endDate),
          gte(certifications.end_date, endDate)
        ),
        and(
          gte(certifications.start_date, startDate),
          lte(certifications.end_date, endDate)
        )
      )
    ];

    if (excludeId) {
      conditions.push(ne(certifications.id, excludeId));
    }

    const existing = await db
      .select()
      .from(certifications)
      .where(and(...conditions))
      .limit(1);

    return {
      isDuplicate: existing.length > 0,
      existingCertification: existing[0] || null
    };
  }

  /**
   * Check for expired or soon-to-expire certifications
   * @param {number} patientId - Patient ID
   * @param {number} daysThreshold - Days before expiration to consider "soon"
   * @returns {Promise<Object>} { expired: Array, expiringSoon: Array }
   */
  async checkCertificationExpiration(patientId, daysThreshold = 14) {
    const today = new Date();
    const thresholdDate = new Date();
    thresholdDate.setDate(today.getDate() + daysThreshold);

    const results = await db
      .select()
      .from(certifications)
      .where(and(
        eq(certifications.patient_id, patientId),
        isNull(certifications.deleted_at),
        or(
          eq(certifications.certification_status, 'ACTIVE'),
          eq(certifications.certification_status, 'PENDING')
        )
      ))
      .orderBy(desc(certifications.end_date));

    const expired = [];
    const expiringSoon = [];

    for (const cert of results) {
      const endDate = new Date(cert.end_date);
      if (endDate < today) {
        expired.push(cert);
      } else if (endDate <= thresholdDate) {
        expiringSoon.push(cert);
      }
    }

    return { expired, expiringSoon };
  }

  /**
   * Validate certification dates
   * @param {string} startDate - Start date
   * @param {string} endDate - End date
   * @param {string} certificationPeriod - Period type
   * @returns {Object} { valid: boolean, errors: string[] }
   */
  validateCertificationDates(startDate, endDate, certificationPeriod) {
    const errors = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(start.getTime())) {
      errors.push('Invalid start date');
    }
    if (isNaN(end.getTime())) {
      errors.push('Invalid end date');
    }

    if (start >= end) {
      errors.push('Start date must be before end date');
    }

    // Calculate expected duration based on period type
    const daysDiff = Math.ceil((end - start) / (1000 * 60 * 60 * 24));
    const expectedDays = certificationPeriod === 'SUBSEQUENT_60' ? 60 : 90;

    // Allow some flexibility (±5 days) for date range validation
    if (Math.abs(daysDiff - expectedDays) > 5) {
      errors.push(`${certificationPeriod} should be approximately ${expectedDays} days, but provided range is ${daysDiff} days`);
    }

    // Check for retroactive certifications (more than 30 days in the past)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    if (start < thirtyDaysAgo) {
      errors.push('Warning: Retroactive certification more than 30 days in the past. Additional documentation may be required.');
    }

    return {
      valid: errors.filter(e => !e.startsWith('Warning:')).length === 0,
      errors,
      warnings: errors.filter(e => e.startsWith('Warning:'))
    };
  }
  // ============================================================================
  // CERTIFICATION CRUD OPERATIONS
  // ============================================================================

  /**
   * Get all certifications for a patient
   * GET /patients/:id/certifications
   */
  async getPatientCertifications(request, reply) {
    try {
      const { id } = request.params;
      const patientId = parseInt(id);

      const results = await db
        .select()
        .from(certifications)
        .where(and(
          eq(certifications.patient_id, patientId),
          isNull(certifications.deleted_at)
        ))
        .orderBy(desc(certifications.start_date));

      // Check for expiration status
      const expirationStatus = await this.checkCertificationExpiration(patientId);

      await logAudit(request, 'READ', 'certifications', null);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        expirationStatus: {
          hasExpired: expirationStatus.expired.length > 0,
          hasExpiringSoon: expirationStatus.expiringSoon.length > 0,
          expiredCount: expirationStatus.expired.length,
          expiringSoonCount: expirationStatus.expiringSoon.length
        }
      };
    } catch (error) {
      logger.error('Error fetching patient certifications:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching certifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create new certification period
   * POST /patients/:id/certifications
   * Enhanced with compliance tracking, validation, and audit logging
   */
  async createCertification(request, reply) {
    try {
      const { id } = request.params;
      const patientId = parseInt(id);
      const data = request.body;

      // Validate required fields
      if (!data.terminal_illness_narrative) {
        reply.code(400);
        return {
          status: 400,
          message: 'Terminal illness narrative is required for certification'
        };
      }

      if (!data.start_date || !data.end_date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Start date and end date are required'
        };
      }

      // Validate certification period
      const validPeriods = ['INITIAL_90', 'SUBSEQUENT_90', 'SUBSEQUENT_60'];
      if (!validPeriods.includes(data.certification_period)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid certification period. Must be INITIAL_90, SUBSEQUENT_90, or SUBSEQUENT_60'
        };
      }

      // Validate certification dates
      const dateValidation = this.validateCertificationDates(data.start_date, data.end_date, data.certification_period);
      if (!dateValidation.valid) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid certification dates',
          errors: dateValidation.errors
        };
      }

      // Check for duplicate/overlapping certifications
      const duplicateCheck = await this.checkDuplicateCertification(patientId, data.start_date, data.end_date);
      if (duplicateCheck.isDuplicate) {
        reply.code(400);
        return {
          status: 400,
          message: 'Duplicate certification detected',
          errors: [`A certification already exists for this patient with overlapping dates (ID: ${duplicateCheck.existingCertification.id})`],
          existingCertification: duplicateCheck.existingCertification
        };
      }

      // Calculate certification due date (2 days from start_date per CMS)
      const startDate = new Date(data.start_date);
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + 2);

      const result = await db
        .insert(certifications)
        .values({
          patient_id: patientId,
          certification_period: data.certification_period,
          certification_status: data.certification_status || 'PENDING',
          start_date: data.start_date,
          end_date: data.end_date,
          certification_due_date: dueDate.toISOString().split('T')[0],
          terminal_illness_narrative: data.terminal_illness_narrative,
          clinical_progression: data.clinical_progression,
          decline_indicators: data.decline_indicators,
          noe_id: data.noe_id || null,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      // Log audit for certification creation
      await logAudit(request, 'CREATE', 'certifications', result[0].id);

      // Create alert for 5 days before benefit period
      const alertDate = new Date(startDate);
      alertDate.setDate(alertDate.getDate() - 5);

      if (alertDate > new Date()) {
        await db.insert(certification_alerts).values({
          certification_id: result[0].id,
          patient_id: patientId,
          alert_type: 'UPCOMING_CERT',
          alert_priority: 'NORMAL',
          scheduled_for: alertDate,
          subject: `Certification Due: ${data.certification_period}`,
          message: `Physician certification required within 2 days of ${data.start_date}`,
          recipients: data.alert_recipients || [],
          created_by_id: request.user?.id
        });
      }

      // Check if F2F required (3rd period onwards per CMS)
      let f2fRequired = false;
      if (data.certification_period.includes('SUBSEQUENT')) {
        // Count previous certifications to determine if this is 3rd+ period
        const previousCerts = await db
          .select({ count: sql`count(*)` })
          .from(certifications)
          .where(and(
            eq(certifications.patient_id, patientId),
            isNull(certifications.deleted_at)
          ));

        const periodCount = parseInt(previousCerts[0]?.count || 0);

        if (periodCount >= 2) {
          f2fRequired = true;
          // F2F required within 30 days before recertification
          const f2fDueDate = new Date(data.start_date);
          f2fDueDate.setDate(f2fDueDate.getDate() - 1);

          const f2fAlertDate = new Date(f2fDueDate);
          f2fAlertDate.setDate(f2fAlertDate.getDate() - 7); // Alert 7 days before

          if (f2fAlertDate > new Date()) {
            await db.insert(certification_alerts).values({
              certification_id: result[0].id,
              patient_id: patientId,
              alert_type: 'F2F_REQUIRED',
              alert_priority: 'HIGH',
              scheduled_for: f2fAlertDate,
              subject: 'Face-to-Face Encounter Required',
              message: `Face-to-Face encounter required within 90 days before or 30 days after ${data.start_date}`,
              recipients: data.alert_recipients || [],
              created_by_id: request.user?.id
            });
          }
        }

        // Create recertification schedule entry
        const nextRecertDate = new Date(data.end_date);
        const f2fDueDate = new Date(data.end_date);
        f2fDueDate.setDate(f2fDueDate.getDate() - 30);

        await db.insert(recertification_schedule).values({
          patient_id: patientId,
          next_recertification_date: nextRecertDate,
          certification_period_type: data.certification_period,
          f2f_required: periodCount >= 2,
          f2f_due_date: periodCount >= 2 ? f2fDueDate : null,
          created_by_id: request.user?.id
        });
      }

      reply.code(201);
      return {
        status: 201,
        message: 'Certification created successfully',
        data: result[0],
        f2fRequired,
        warnings: dateValidation.warnings || []
      };
    } catch (error) {
      logger.error('Error creating certification:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating certification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Complete certification (mark as signed with timeliness tracking)
   * POST /certifications/:id/complete
   */
  async completeCertification(request, reply) {
    try {
      const { id } = request.params;
      const certId = parseInt(id);

      const existing = await db
        .select()
        .from(certifications)
        .where(and(
          eq(certifications.id, certId),
          isNull(certifications.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Certification not found'
        };
      }

      // Check if already completed
      if (existing[0].certification_status === 'COMPLETED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Certification is already completed'
        };
      }

      // Check if certification has been signed first
      if (!existing[0].physician_signature) {
        reply.code(400);
        return {
          status: 400,
          message: 'Certification must be signed by a physician before it can be completed'
        };
      }

      const completedDate = new Date();
      const dueDate = new Date(existing[0].certification_due_date);
      const daysLate = Math.max(0, Math.floor((completedDate - dueDate) / (1000 * 60 * 60 * 24)));
      const timeliness = daysLate === 0 ? 'TIMELY' : 'LATE';

      const result = await db
        .update(certifications)
        .set({
          certification_completed_date: completedDate.toISOString().split('T')[0],
          certification_timeliness: timeliness,
          days_late: daysLate,
          certification_status: 'COMPLETED',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(certifications.id, certId))
        .returning();

      await logAudit(request, 'UPDATE', 'certifications', certId);

      reply.code(200);
      return {
        status: 200,
        message: 'Certification completed successfully',
        data: result[0],
        timeliness: {
          status: timeliness,
          daysLate: daysLate,
          warning: timeliness === 'LATE' ? `Certification was ${daysLate} day(s) late. This may impact CMS compliance.` : null
        }
      };
    } catch (error) {
      logger.error('Error completing certification:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error completing certification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get pending certifications (due soon or overdue)
   * GET /certifications/pending
   */
  async getPendingCertifications(request, reply) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const results = await db
        .select({
          certification: certifications,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(certifications)
        .leftJoin(patients, eq(certifications.patient_id, patients.id))
        .where(and(
          or(
            eq(certifications.certification_status, 'PENDING'),
            eq(certifications.certification_status, 'ACTIVE')
          ),
          lte(certifications.certification_due_date, today),
          isNull(certifications.deleted_at)
        ))
        .orderBy(certifications.certification_due_date);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching pending certifications:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching pending certifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign certification (physician signature)
   * POST /certifications/:id/sign
   * 21 CFR Part 11 compliant electronic signature
   */
  async signCertification(request, reply) {
    try {
      const { id } = request.params;
      const certId = parseInt(id);

      const existing = await db
        .select()
        .from(certifications)
        .where(and(
          eq(certifications.id, certId),
          isNull(certifications.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Certification not found'
        };
      }

      // Check if already signed
      if (existing[0].physician_signature) {
        reply.code(400);
        return {
          status: 400,
          message: 'Certification is already signed. Use amendment to make changes to signed certifications.'
        };
      }

      // Check if certification has expired
      const endDate = new Date(existing[0].end_date);
      if (endDate < new Date()) {
        reply.code(400);
        return {
          status: 400,
          message: 'Cannot sign an expired certification. Please create a new certification period.'
        };
      }

      // Validate terminal illness narrative exists
      if (!existing[0].terminal_illness_narrative) {
        reply.code(400);
        return {
          status: 400,
          message: 'Terminal illness narrative is required before signing'
        };
      }

      // Generate signature hash (SHA-256) - 21 CFR Part 11 compliance
      const dataToSign = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        certification_period: existing[0].certification_period,
        terminal_illness_narrative: existing[0].terminal_illness_narrative,
        timestamp: new Date().toISOString()
      });
      const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      const signature = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim() || 'Unknown',
        signedAt: new Date().toISOString(),
        signatureType: 'ELECTRONIC',
        signatureHash: signatureHash,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers['user-agent'] || 'unknown',
        meaning: 'Physician signature attesting to terminal illness and hospice appropriateness per CMS requirements',
        credentials: request.user?.role || 'Physician',
        version: '21CFR11_v1.0'
      };

      const result = await db
        .update(certifications)
        .set({
          physician_signature: signature,
          certification_status: 'ACTIVE',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(certifications.id, certId))
        .returning();

      await logAudit(request, 'SIGN', 'certifications', certId);

      reply.code(200);
      return {
        status: 200,
        message: 'Certification signed successfully',
        data: result[0],
        signature: {
          signedAt: signature.signedAt,
          signedBy: signature.signedByName,
          hash: signatureHash.substring(0, 16) + '...' // Truncated for display
        }
      };
    } catch (error) {
      logger.error('Error signing certification:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing certification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get certifications due within next 30 days
   * GET /certifications/due
   */
  async getCertificationsDue(request, reply) {
    try {
      const today = new Date();
      const thirtyDaysFromNow = new Date();
      thirtyDaysFromNow.setDate(today.getDate() + 30);

      const results = await db
        .select()
        .from(certifications)
        .where(and(
          gte(certifications.end_date, today.toISOString().split('T')[0]),
          lte(certifications.end_date, thirtyDaysFromNow.toISOString().split('T')[0]),
          isNull(certifications.deleted_at)
        ))
        .orderBy(certifications.end_date);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching due certifications:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching due certifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get overdue certifications
   * GET /certifications/overdue
   * Enhanced with compliance tracking
   */
  async getCertificationsOverdue(request, reply) {
    try {
      const today = new Date().toISOString().split('T')[0];

      const results = await db
        .select({
          certification: certifications,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(certifications)
        .leftJoin(patients, eq(certifications.patient_id, patients.id))
        .where(and(
          eq(certifications.certification_status, 'PENDING'),
          lte(certifications.certification_due_date, today),
          isNull(certifications.deleted_at)
        ))
        .orderBy(certifications.certification_due_date);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length
      };
    } catch (error) {
      logger.error('Error fetching overdue certifications:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching overdue certifications',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get Face-to-Face encounters for a patient
   * GET /patients/:id/f2f
   */
  async getPatientF2F(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(face_to_face_encounters)
        .where(and(
          eq(face_to_face_encounters.patient_id, parseInt(id)),
          isNull(face_to_face_encounters.deleted_at)
        ))
        .orderBy(desc(face_to_face_encounters.encounter_date));

      reply.code(200);
      return {
        status: 200,
        data: results
      };
    } catch (error) {
      logger.error('Error fetching F2F encounters:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching F2F encounters',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create Face-to-Face encounter
   * POST /patients/:id/f2f
   * CMS Requirement: F2F must occur within 90 days before or 30 days after start of care
   */
  async createF2F(request, reply) {
    try {
      const { id } = request.params;
      const patientId = parseInt(id);
      const data = request.body;

      // Validate required fields
      if (!data.encounter_date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Encounter date is required'
        };
      }

      if (!data.findings) {
        reply.code(400);
        return {
          status: 400,
          message: 'Findings documentation is required for Face-to-Face encounters'
        };
      }

      // Validate performed_by_type (physician credentials)
      const credentialsValidation = this.validatePhysicianCredentials(data.performed_by_type);
      if (!credentialsValidation.valid) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid physician credentials',
          errors: credentialsValidation.errors
        };
      }

      // Validate provider name is provided
      if (!data.performed_by_name) {
        reply.code(400);
        return {
          status: 400,
          message: 'Provider name is required for Face-to-Face encounters'
        };
      }

      // If linked to a certification, validate the F2F date range
      let dateValidation = { valid: true, errors: [], warnings: [] };
      if (data.certification_id) {
        const certification = await db
          .select()
          .from(certifications)
          .where(eq(certifications.id, parseInt(data.certification_id)))
          .limit(1);

        if (!certification[0]) {
          reply.code(400);
          return {
            status: 400,
            message: 'Linked certification not found'
          };
        }

        // Validate F2F date is within CMS-required window
        dateValidation = this.validateF2FDateRange(data.encounter_date, certification[0].start_date);
        if (!dateValidation.valid) {
          reply.code(400);
          return {
            status: 400,
            message: 'Face-to-Face encounter date is outside CMS-required window',
            errors: dateValidation.errors,
            validWindow: {
              start: dateValidation.windowStart,
              end: dateValidation.windowEnd
            }
          };
        }
      }

      const result = await db
        .insert(face_to_face_encounters)
        .values({
          patient_id: patientId,
          certification_id: data.certification_id || null,
          encounter_date: data.encounter_date,
          performed_by_id: data.performed_by_id || request.user?.id,
          performed_by_name: data.performed_by_name,
          performed_by_type: data.performed_by_type,
          visit_type: data.visit_type || 'IN_PERSON',
          findings: data.findings,
          terminal_prognosis_confirmed: data.terminal_prognosis_confirmed ?? true,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      await logAudit(request, 'CREATE', 'face_to_face_encounters', result[0].id);

      // Update recertification schedule if linked to certification
      if (data.certification_id) {
        await db
          .update(recertification_schedule)
          .set({
            f2f_completed: true,
            updatedAt: new Date()
          })
          .where(and(
            eq(recertification_schedule.patient_id, patientId),
            eq(recertification_schedule.f2f_required, true),
            eq(recertification_schedule.f2f_completed, false)
          ));

        // Update any pending F2F alerts to sent
        await db
          .update(certification_alerts)
          .set({
            alert_status: 'DISMISSED',
            sent_at: new Date()
          })
          .where(and(
            eq(certification_alerts.patient_id, patientId),
            eq(certification_alerts.alert_type, 'F2F_REQUIRED'),
            eq(certification_alerts.alert_status, 'PENDING')
          ));
      }

      reply.code(201);
      return {
        status: 201,
        message: 'Face-to-Face encounter created successfully',
        data: result[0],
        dateValidation: dateValidation.valid ? null : {
          windowStart: dateValidation.windowStart,
          windowEnd: dateValidation.windowEnd
        }
      };
    } catch (error) {
      logger.error('Error creating F2F encounter:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating F2F encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add attestation to Face-to-Face encounter
   * POST /f2f/:id/attestation
   * Hospice physician attestation per CMS requirements
   */
  async attestF2F(request, reply) {
    try {
      const { id } = request.params;
      const f2fId = parseInt(id);

      const existing = await db
        .select()
        .from(face_to_face_encounters)
        .where(and(
          eq(face_to_face_encounters.id, f2fId),
          isNull(face_to_face_encounters.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Face-to-Face encounter not found'
        };
      }

      // Check if already attested
      if (existing[0].attestation) {
        reply.code(400);
        return {
          status: 400,
          message: 'Face-to-Face encounter has already been attested'
        };
      }

      // Validate terminal prognosis was confirmed
      if (!existing[0].terminal_prognosis_confirmed) {
        reply.code(400);
        return {
          status: 400,
          message: 'Terminal prognosis must be confirmed before attestation'
        };
      }

      // Generate attestation hash - 21 CFR Part 11 compliance
      const dataToAttest = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        encounter_date: existing[0].encounter_date,
        findings: existing[0].findings,
        terminal_prognosis_confirmed: existing[0].terminal_prognosis_confirmed,
        timestamp: new Date().toISOString()
      });
      const attestationHash = crypto.createHash('sha256').update(dataToAttest).digest('hex');

      const attestation = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim() || 'Unknown',
        signedAt: new Date().toISOString(),
        signatureType: 'ATTESTATION',
        signatureHash: attestationHash,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers['user-agent'] || 'unknown',
        meaning: 'Hospice physician attestation confirming Face-to-Face encounter findings and terminal prognosis per CMS requirements',
        credentials: request.user?.role || 'Hospice Physician',
        version: '21CFR11_v1.0'
      };

      const result = await db
        .update(face_to_face_encounters)
        .set({
          attestation: attestation,
          attestation_date: new Date().toISOString().split('T')[0],
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(face_to_face_encounters.id, f2fId))
        .returning();

      await logAudit(request, 'SIGN', 'face_to_face_encounters', f2fId);

      reply.code(200);
      return {
        status: 200,
        message: 'Face-to-Face encounter attested successfully',
        data: result[0],
        attestation: {
          attestedAt: attestation.signedAt,
          attestedBy: attestation.signedByName,
          hash: attestationHash.substring(0, 16) + '...'
        }
      };
    } catch (error) {
      logger.error('Error attesting F2F encounter:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error attesting F2F encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // ORDER MANAGEMENT
  // ============================================================================

  /**
   * Get orders for a patient
   * GET /patients/:id/orders
   */
  async getPatientOrders(request, reply) {
    try {
      const { id } = request.params;
      const patientId = parseInt(id);
      const { status, type, limit = 50, offset = 0 } = request.query;

      const conditions = [
        eq(orders.patient_id, patientId),
        isNull(orders.deleted_at)
      ];

      // Filter by status if provided
      if (status) {
        conditions.push(eq(orders.order_status, status));
      }

      // Filter by type if provided
      if (type) {
        conditions.push(eq(orders.order_type, type));
      }

      const results = await db
        .select()
        .from(orders)
        .where(and(...conditions))
        .orderBy(desc(orders.start_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      await logAudit(request, 'READ', 'orders', null);

      reply.code(200);
      return {
        status: 200,
        data: results,
        count: results.length,
        limit: parseInt(limit),
        offset: parseInt(offset)
      };
    } catch (error) {
      logger.error('Error fetching patient orders:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching orders',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create new order
   * POST /patients/:id/orders
   */
  async createOrder(request, reply) {
    try {
      const { id } = request.params;
      const patientId = parseInt(id);
      const data = request.body;

      // Validate required fields
      if (!data.order_type) {
        reply.code(400);
        return {
          status: 400,
          message: 'Order type is required'
        };
      }

      if (!data.order_description) {
        reply.code(400);
        return {
          status: 400,
          message: 'Order description is required'
        };
      }

      if (!data.start_date) {
        reply.code(400);
        return {
          status: 400,
          message: 'Start date is required'
        };
      }

      // Validate order type
      const validOrderTypes = ['MEDICATION', 'TREATMENT', 'DME', 'LABORATORY', 'IMAGING', 'CONSULTATION', 'OTHER'];
      if (!validOrderTypes.includes(data.order_type)) {
        reply.code(400);
        return {
          status: 400,
          message: `Invalid order type. Must be one of: ${validOrderTypes.join(', ')}`
        };
      }

      const result = await db
        .insert(orders)
        .values({
          patient_id: patientId,
          order_type: data.order_type,
          order_status: data.order_status || 'ACTIVE',
          order_priority: data.order_priority || 'ROUTINE',
          order_description: data.order_description,
          start_date: data.start_date,
          end_date: data.end_date,
          ordered_by_id: data.ordered_by_id || request.user?.id,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      await logAudit(request, 'CREATE', 'orders', result[0].id);

      // Create verbal order tracking if this is a verbal order
      if (data.is_verbal_order) {
        await db.insert(verbal_orders_tracking).values({
          order_id: result[0].id,
          received_by_id: request.user?.id,
          received_date: new Date(),
          physician_name: data.physician_name,
          read_back_verified: data.read_back_verified ?? false,
          created_by_id: request.user?.id
        });
      }

      reply.code(201);
      return {
        status: 201,
        message: 'Order created successfully',
        data: result[0],
        isVerbalOrder: !!data.is_verbal_order
      };
    } catch (error) {
      logger.error('Error creating order:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating order',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Sign order (physician signature)
   * POST /orders/:id/sign
   * 21 CFR Part 11 compliant electronic signature
   */
  async signOrder(request, reply) {
    try {
      const { id } = request.params;
      const orderId = parseInt(id);

      const existing = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.id, orderId),
          isNull(orders.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Order not found'
        };
      }

      // Check if already signed
      if (existing[0].physician_signature) {
        reply.code(400);
        return {
          status: 400,
          message: 'Order is already signed'
        };
      }

      // Generate signature hash - 21 CFR Part 11 compliance
      const dataToSign = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        order_type: existing[0].order_type,
        order_description: existing[0].order_description,
        timestamp: new Date().toISOString()
      });
      const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      const signature = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName || ''} ${request.user?.lastName || ''}`.trim() || 'Unknown',
        signedAt: new Date().toISOString(),
        signatureType: 'ELECTRONIC',
        signatureHash: signatureHash,
        ipAddress: request.ip || 'unknown',
        userAgent: request.headers['user-agent'] || 'unknown',
        meaning: 'Physician signature authorizing this order',
        credentials: request.user?.role || 'Physician',
        version: '21CFR11_v1.0'
      };

      const result = await db
        .update(orders)
        .set({
          physician_signature: signature,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(orders.id, orderId))
        .returning();

      await logAudit(request, 'SIGN', 'orders', orderId);

      // Update verbal order tracking if applicable
      const verbalTracking = await db
        .select()
        .from(verbal_orders_tracking)
        .where(eq(verbal_orders_tracking.order_id, orderId))
        .limit(1);

      if (verbalTracking[0]) {
        await db
          .update(verbal_orders_tracking)
          .set({
            written_signature_obtained: true,
            signature_obtained_date: new Date().toISOString().split('T')[0]
          })
          .where(eq(verbal_orders_tracking.order_id, orderId));
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Order signed successfully',
        data: result[0],
        signature: {
          signedAt: signature.signedAt,
          signedBy: signature.signedByName,
          hash: signatureHash.substring(0, 16) + '...'
        }
      };
    } catch (error) {
      logger.error('Error signing order:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing order',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  // ============================================================================
  // ADDITIONAL CERTIFICATION OPERATIONS
  // ============================================================================

  /**
   * Get single certification by ID
   * GET /certifications/:id
   */
  async getCertificationById(request, reply) {
    try {
      const { id } = request.params;
      const certId = parseInt(id);

      const result = await db
        .select({
          certification: certifications,
          patient: {
            id: patients.id,
            first_name: patients.first_name,
            last_name: patients.last_name,
            medical_record_number: patients.medical_record_number
          }
        })
        .from(certifications)
        .leftJoin(patients, eq(certifications.patient_id, patients.id))
        .where(and(
          eq(certifications.id, certId),
          isNull(certifications.deleted_at)
        ))
        .limit(1);

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Certification not found'
        };
      }

      // Get associated F2F encounters
      const f2fEncounters = await db
        .select()
        .from(face_to_face_encounters)
        .where(and(
          eq(face_to_face_encounters.certification_id, certId),
          isNull(face_to_face_encounters.deleted_at)
        ))
        .orderBy(desc(face_to_face_encounters.encounter_date));

      await logAudit(request, 'READ', 'certifications', certId);

      reply.code(200);
      return {
        status: 200,
        data: {
          ...result[0].certification,
          patient: result[0].patient,
          faceToFaceEncounters: f2fEncounters
        }
      };
    } catch (error) {
      logger.error('Error fetching certification:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching certification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update certification (only allowed for unsigned certifications)
   * PATCH /certifications/:id
   */
  async updateCertification(request, reply) {
    try {
      const { id } = request.params;
      const certId = parseInt(id);
      const data = request.body;

      const existing = await db
        .select()
        .from(certifications)
        .where(and(
          eq(certifications.id, certId),
          isNull(certifications.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Certification not found'
        };
      }

      // Cannot update signed certifications
      if (existing[0].physician_signature) {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update signed certifications. Use amendment process for changes to signed documents.'
        };
      }

      // Cannot update completed certifications
      if (existing[0].certification_status === 'COMPLETED') {
        reply.code(403);
        return {
          status: 403,
          message: 'Cannot update completed certifications'
        };
      }

      // Build update object with only allowed fields
      const updateData = {};
      const allowedFields = [
        'terminal_illness_narrative',
        'clinical_progression',
        'decline_indicators'
      ];

      for (const field of allowedFields) {
        if (data[field] !== undefined) {
          updateData[field] = data[field];
        }
      }

      if (Object.keys(updateData).length === 0) {
        reply.code(400);
        return {
          status: 400,
          message: 'No valid fields to update'
        };
      }

      updateData.updated_by_id = request.user?.id;
      updateData.updatedAt = new Date();

      const result = await db
        .update(certifications)
        .set(updateData)
        .where(eq(certifications.id, certId))
        .returning();

      await logAudit(request, 'UPDATE', 'certifications', certId);

      reply.code(200);
      return {
        status: 200,
        message: 'Certification updated successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating certification:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating certification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Revoke certification
   * POST /certifications/:id/revoke
   */
  async revokeCertification(request, reply) {
    try {
      const { id } = request.params;
      const certId = parseInt(id);
      const { revocation_reason } = request.body;

      if (!revocation_reason) {
        reply.code(400);
        return {
          status: 400,
          message: 'Revocation reason is required'
        };
      }

      const existing = await db
        .select()
        .from(certifications)
        .where(and(
          eq(certifications.id, certId),
          isNull(certifications.deleted_at)
        ))
        .limit(1);

      if (!existing[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Certification not found'
        };
      }

      // Cannot revoke already revoked or expired certifications
      if (existing[0].certification_status === 'REVOKED') {
        reply.code(400);
        return {
          status: 400,
          message: 'Certification is already revoked'
        };
      }

      const result = await db
        .update(certifications)
        .set({
          certification_status: 'REVOKED',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(certifications.id, certId))
        .returning();

      await logAudit(request, 'DELETE', 'certifications', certId);

      reply.code(200);
      return {
        status: 200,
        message: 'Certification revoked successfully',
        data: result[0],
        revocationInfo: {
          revokedAt: new Date().toISOString(),
          revokedBy: request.user?.id,
          reason: revocation_reason
        }
      };
    } catch (error) {
      logger.error('Error revoking certification:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error revoking certification',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Validate F2F encounter for certification
   * POST /certifications/:id/validate-f2f
   * Checks if a valid F2F encounter exists within the required window
   */
  async validateF2FForCertification(request, reply) {
    try {
      const { id } = request.params;
      const certId = parseInt(id);

      const certification = await db
        .select()
        .from(certifications)
        .where(and(
          eq(certifications.id, certId),
          isNull(certifications.deleted_at)
        ))
        .limit(1);

      if (!certification[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Certification not found'
        };
      }

      // Check if F2F is required for this certification
      const previousCerts = await db
        .select({ count: sql`count(*)` })
        .from(certifications)
        .where(and(
          eq(certifications.patient_id, certification[0].patient_id),
          isNull(certifications.deleted_at),
          lte(certifications.start_date, certification[0].start_date)
        ));

      const periodCount = parseInt(previousCerts[0]?.count || 0);
      const f2fRequired = periodCount >= 3; // F2F required from 3rd benefit period onwards

      if (!f2fRequired) {
        reply.code(200);
        return {
          status: 200,
          message: 'Face-to-Face encounter not required for this certification period',
          data: {
            f2fRequired: false,
            periodNumber: periodCount
          }
        };
      }

      // Find F2F encounters within the valid window
      const windowStart = new Date(certification[0].start_date);
      windowStart.setDate(windowStart.getDate() - 90);

      const windowEnd = new Date(certification[0].start_date);
      windowEnd.setDate(windowEnd.getDate() + 30);

      const validF2F = await db
        .select()
        .from(face_to_face_encounters)
        .where(and(
          eq(face_to_face_encounters.patient_id, certification[0].patient_id),
          gte(face_to_face_encounters.encounter_date, windowStart.toISOString().split('T')[0]),
          lte(face_to_face_encounters.encounter_date, windowEnd.toISOString().split('T')[0]),
          isNull(face_to_face_encounters.deleted_at)
        ))
        .orderBy(desc(face_to_face_encounters.encounter_date));

      const isValid = validF2F.length > 0 && validF2F.some(f2f => f2f.attestation);

      reply.code(200);
      return {
        status: 200,
        message: isValid ? 'Valid Face-to-Face encounter found' : 'No valid Face-to-Face encounter found',
        data: {
          f2fRequired: true,
          isValid,
          periodNumber: periodCount,
          validWindow: {
            start: windowStart.toISOString().split('T')[0],
            end: windowEnd.toISOString().split('T')[0]
          },
          encounters: validF2F,
          attestedCount: validF2F.filter(f => f.attestation).length
        }
      };
    } catch (error) {
      logger.error('Error validating F2F for certification:', error);
      reply.code(500);
      return {
        status: 500,
        message: 'Error validating F2F encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new CertificationController();
