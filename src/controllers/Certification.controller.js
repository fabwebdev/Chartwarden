import { db } from '../config/db.drizzle.js';
import {
  certifications,
  face_to_face_encounters,
  orders,
  verbal_orders_tracking,
  recertification_schedule,
  patients,
  certification_alerts
} from '../db/schemas/index.js';
import { eq, and, gte, lte, desc, sql, or, isNull } from 'drizzle-orm';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';
/**
 * Certification Controller
 * Manages Medicare certification periods, Face-to-Face encounters, and physician orders
 * CRITICAL: Required for Medicare reimbursement
 */
class CertificationController {
  /**
   * Get all certifications for a patient
   * GET /patients/:id/certifications
   */
  async getPatientCertifications(request, reply) {
    try {
      const { id } = request.params;

      const results = await db
        .select()
        .from(certifications)
        .where(and(
          eq(certifications.patient_id, parseInt(id)),
          isNull(certifications.deleted_at)
        ))
        .orderBy(desc(certifications.start_date));

      reply.code(200);
      return {
        status: 200,
        data: results
      };
    } catch (error) {
      logger.error('Error fetching patient certifications:', error)
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
   * Enhanced with compliance tracking
   */
  async createCertification(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate certification period
      const validPeriods = ['INITIAL_90', 'SUBSEQUENT_90', 'SUBSEQUENT_60'];
      if (!validPeriods.includes(data.certification_period)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid certification period. Must be INITIAL_90, SUBSEQUENT_90, or SUBSEQUENT_60'
        };
      }

      // Calculate certification due date (2 days from start_date per CMS)
      const startDate = new Date(data.start_date);
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + 2);

      const result = await db
        .insert(certifications)
        .values({
          patient_id: parseInt(id),
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

      // Create alert for 5 days before benefit period
      const alertDate = new Date(startDate);
      alertDate.setDate(alertDate.getDate() - 5);

      if (alertDate > new Date()) {
        await db.insert(certification_alerts).values({
          certification_id: result[0].id,
          patient_id: parseInt(id),
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
      if (data.certification_period.includes('SUBSEQUENT')) {
        // Count previous certifications to determine if this is 3rd+ period
        const previousCerts = await db
          .select({ count: sql`count(*)` })
          .from(certifications)
          .where(and(
            eq(certifications.patient_id, parseInt(id)),
            isNull(certifications.deleted_at)
          ));

        const periodCount = parseInt(previousCerts[0]?.count || 0);

        if (periodCount >= 2) {
          // F2F required within 30 days before recertification
          const f2fDueDate = new Date(data.start_date);
          f2fDueDate.setDate(f2fDueDate.getDate() - 1);

          const f2fAlertDate = new Date(f2fDueDate);
          f2fAlertDate.setDate(f2fAlertDate.getDate() - 7); // Alert 7 days before

          if (f2fAlertDate > new Date()) {
            await db.insert(certification_alerts).values({
              certification_id: result[0].id,
              patient_id: parseInt(id),
              alert_type: 'F2F_REQUIRED',
              alert_priority: 'HIGH',
              scheduled_for: f2fAlertDate,
              subject: 'Face-to-Face Encounter Required',
              message: `Face-to-Face encounter required within 30 days before ${data.start_date}`,
              recipients: data.alert_recipients || [],
              created_by_id: request.user?.id
            });
          }
        }

        // Create recertification schedule entry
        const periodDays = data.certification_period === 'SUBSEQUENT_90' ? 90 : 60;
        const nextRecertDate = new Date(data.end_date);
        const f2fDueDate = new Date(data.end_date);
        f2fDueDate.setDate(f2fDueDate.getDate() - 30);

        await db.insert(recertification_schedule).values({
          patient_id: parseInt(id),
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
        message: 'Certification created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating certification:', error)
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

      const existing = await db
        .select()
        .from(certifications)
        .where(and(
          eq(certifications.id, parseInt(id)),
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
        .where(eq(certifications.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Certification completed',
        data: result[0],
        warning: timeliness === 'LATE' ? `Certification was ${daysLate} day(s) late` : null
      };
    } catch (error) {
      logger.error('Error completing certification:', error)
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
   */
  async signCertification(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(certifications)
        .where(and(
          eq(certifications.id, parseInt(id)),
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

      // Generate signature hash (SHA-256)
      const dataToSign = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        certification_period: existing[0].certification_period,
        terminal_illness_narrative: existing[0].terminal_illness_narrative
      });
      const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      const signature = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName} ${request.user?.lastName}`,
        signedAt: new Date().toISOString(),
        signatureType: 'ELECTRONIC',
        signatureHash: signatureHash,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        meaning: 'Physician signature attesting to terminal illness and hospice appropriateness',
        credentials: request.user?.role || 'Physician'
      };

      const result = await db
        .update(certifications)
        .set({
          physician_signature: signature,
          certification_status: 'ACTIVE',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(certifications.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Certification signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing certification:', error)
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
   */
  async createF2F(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      // Validate performed_by_type
      const validTypes = ['PHYSICIAN', 'NP', 'PA'];
      if (data.performed_by_type && !validTypes.includes(data.performed_by_type)) {
        reply.code(400);
        return {
          status: 400,
          message: 'Invalid performed_by_type. Must be PHYSICIAN, NP, or PA'
        };
      }

      const result = await db
        .insert(face_to_face_encounters)
        .values({
          patient_id: parseInt(id),
          certification_id: data.certification_id,
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

      // Update recertification schedule if linked to certification
      if (data.certification_id) {
        await db
          .update(recertification_schedule)
          .set({
            f2f_completed: true
          })
          .where(and(
            eq(recertification_schedule.patient_id, parseInt(id)),
            eq(recertification_schedule.f2f_required, true)
          ));
      }

      reply.code(201);
      return {
        status: 201,
        message: 'Face-to-Face encounter created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating F2F encounter:', error)
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
   */
  async attestF2F(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(face_to_face_encounters)
        .where(and(
          eq(face_to_face_encounters.id, parseInt(id)),
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

      // Generate attestation hash
      const dataToAttest = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        encounter_date: existing[0].encounter_date,
        findings: existing[0].findings
      });
      const attestationHash = crypto.createHash('sha256').update(dataToAttest).digest('hex');

      const attestation = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName} ${request.user?.lastName}`,
        signedAt: new Date().toISOString(),
        signatureType: 'ATTESTATION',
        signatureHash: attestationHash,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        meaning: 'Hospice physician attestation of Face-to-Face encounter findings',
        credentials: request.user?.role || 'Hospice Physician'
      };

      const result = await db
        .update(face_to_face_encounters)
        .set({
          attestation: attestation,
          attestation_date: new Date().toISOString().split('T')[0],
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(face_to_face_encounters.id, parseInt(id)))
        .returning();

      reply.code(200);
      return {
        status: 200,
        message: 'Face-to-Face encounter attested successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error attesting F2F encounter:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error attesting F2F encounter',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get orders for a patient
   * GET /patients/:id/orders
   */
  async getPatientOrders(request, reply) {
    try {
      const { id } = request.params;
      const { status, type } = request.query;

      let query = db
        .select()
        .from(orders)
        .where(and(
          eq(orders.patient_id, parseInt(id)),
          isNull(orders.deleted_at)
        ));

      // Filter by status if provided
      if (status) {
        query = query.where(eq(orders.order_status, status));
      }

      // Filter by type if provided
      if (type) {
        query = query.where(eq(orders.order_type, type));
      }

      const results = await query.orderBy(desc(orders.start_date));

      reply.code(200);
      return {
        status: 200,
        data: results
      };
    } catch (error) {
      logger.error('Error fetching patient orders:', error)
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
      const data = request.body;

      const result = await db
        .insert(orders)
        .values({
          patient_id: parseInt(id),
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
        message: 'Order created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating order:', error)
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
   */
  async signOrder(request, reply) {
    try {
      const { id } = request.params;

      const existing = await db
        .select()
        .from(orders)
        .where(and(
          eq(orders.id, parseInt(id)),
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

      // Generate signature hash
      const dataToSign = JSON.stringify({
        id: existing[0].id,
        patient_id: existing[0].patient_id,
        order_type: existing[0].order_type,
        order_description: existing[0].order_description
      });
      const signatureHash = crypto.createHash('sha256').update(dataToSign).digest('hex');

      const signature = {
        signedBy: request.user?.id,
        signedByName: `${request.user?.firstName} ${request.user?.lastName}`,
        signedAt: new Date().toISOString(),
        signatureType: 'ELECTRONIC',
        signatureHash: signatureHash,
        ipAddress: request.ip,
        userAgent: request.headers['user-agent'],
        meaning: 'Physician signature authorizing this order',
        credentials: request.user?.role || 'Physician'
      };

      const result = await db
        .update(orders)
        .set({
          physician_signature: signature,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(orders.id, parseInt(id)))
        .returning();

      // Update verbal order tracking if applicable
      const verbalTracking = await db
        .select()
        .from(verbal_orders_tracking)
        .where(eq(verbal_orders_tracking.order_id, parseInt(id)))
        .limit(1);

      if (verbalTracking[0]) {
        await db
          .update(verbal_orders_tracking)
          .set({
            written_signature_obtained: true,
            signature_obtained_date: new Date().toISOString().split('T')[0]
          })
          .where(eq(verbal_orders_tracking.order_id, parseInt(id)));
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Order signed successfully',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error signing order:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error signing order',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new CertificationController();
