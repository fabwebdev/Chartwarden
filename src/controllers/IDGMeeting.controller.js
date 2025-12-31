import { db } from '../config/db.drizzle.js';
import { idg_meetings, idg_attendees, idg_patient_reviews, idg_compliance_tracking, patients } from '../db/schemas/index.js';
import { eq, and, desc, lte, gte, sql } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
/**
 * IDG Meeting Controller
 * Manages Interdisciplinary Group team meetings
 * High Priority: 14-day review compliance requirement
 */
class IDGMeetingController {
  /**
   * Get all IDG meetings
   * GET /idg-meetings
   */
  async index(request, reply) {
    try {
      const { limit = 50, offset = 0 } = request.query;

      const meetings = await db
        .select({
          id: idg_meetings.id,
          meeting_type: idg_meetings.meeting_type,
          meeting_status: idg_meetings.meeting_status,
          meeting_date: idg_meetings.meeting_date,
          meeting_time: idg_meetings.meeting_time,
          meeting_duration_minutes: idg_meetings.meeting_duration_minutes,
          location: idg_meetings.location,
          virtual_meeting: idg_meetings.virtual_meeting,
          meeting_link: idg_meetings.meeting_link,
          facilitator_id: idg_meetings.facilitator_id,
          facilitator_name: idg_meetings.facilitator_name,
          agenda: idg_meetings.agenda,
          topics: idg_meetings.topics,
          general_discussion: idg_meetings.general_discussion,
          quality_issues: idg_meetings.quality_issues,
          operational_issues: idg_meetings.operational_issues,
          staff_concerns: idg_meetings.staff_concerns,
          action_items: idg_meetings.action_items,
          follow_up_items: idg_meetings.follow_up_items,
          patient_census: idg_meetings.patient_census,
          new_admissions_count: idg_meetings.new_admissions_count,
          discharges_count: idg_meetings.discharges_count,
          deaths_count: idg_meetings.deaths_count,
          meeting_outcomes: idg_meetings.meeting_outcomes,
          decisions_made: idg_meetings.decisions_made,
          next_meeting_date: idg_meetings.next_meeting_date,
          next_meeting_agenda: idg_meetings.next_meeting_agenda,
          all_patients_reviewed: idg_meetings.all_patients_reviewed,
          patients_reviewed_count: idg_meetings.patients_reviewed_count,
          patients_missed_count: idg_meetings.patients_missed_count,
          meeting_notes: idg_meetings.meeting_notes,
          minutes_prepared_by_id: idg_meetings.minutes_prepared_by_id,
          minutes_approved: idg_meetings.minutes_approved,
          minutes_approved_by_id: idg_meetings.minutes_approved_by_id,
          minutes_approved_date: idg_meetings.minutes_approved_date,
          attachments: idg_meetings.attachments,
          created_by_id: idg_meetings.created_by_id,
          updated_by_id: idg_meetings.updated_by_id,
          createdAt: idg_meetings.createdAt,
          updatedAt: idg_meetings.updatedAt
        })
        .from(idg_meetings)
        .orderBy(desc(idg_meetings.meeting_date))
        .limit(parseInt(limit))
        .offset(parseInt(offset));

      reply.code(200);
      return {
        status: 200,
        data: meetings,
        count: meetings.length
      };
    } catch (error) {
      logger.error('Error fetching IDG meetings:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching meetings',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Create new IDG meeting
   * POST /idg-meetings
   */
  async store(request, reply) {
    try {
      const data = request.body;

      const result = await db
        .insert(idg_meetings)
        .values({
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'IDG meeting created',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error creating IDG meeting:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error creating meeting',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get IDG meeting by ID
   * GET /idg-meetings/:id
   */
  async show(request, reply) {
    try {
      const { id } = request.params;

      const meeting = await db
        .select({
          id: idg_meetings.id,
          meeting_type: idg_meetings.meeting_type,
          meeting_status: idg_meetings.meeting_status,
          meeting_date: idg_meetings.meeting_date,
          meeting_time: idg_meetings.meeting_time,
          meeting_duration_minutes: idg_meetings.meeting_duration_minutes,
          location: idg_meetings.location,
          virtual_meeting: idg_meetings.virtual_meeting,
          meeting_link: idg_meetings.meeting_link,
          facilitator_id: idg_meetings.facilitator_id,
          facilitator_name: idg_meetings.facilitator_name,
          agenda: idg_meetings.agenda,
          topics: idg_meetings.topics,
          general_discussion: idg_meetings.general_discussion,
          quality_issues: idg_meetings.quality_issues,
          operational_issues: idg_meetings.operational_issues,
          staff_concerns: idg_meetings.staff_concerns,
          action_items: idg_meetings.action_items,
          follow_up_items: idg_meetings.follow_up_items,
          patient_census: idg_meetings.patient_census,
          new_admissions_count: idg_meetings.new_admissions_count,
          discharges_count: idg_meetings.discharges_count,
          deaths_count: idg_meetings.deaths_count,
          meeting_outcomes: idg_meetings.meeting_outcomes,
          decisions_made: idg_meetings.decisions_made,
          next_meeting_date: idg_meetings.next_meeting_date,
          next_meeting_agenda: idg_meetings.next_meeting_agenda,
          all_patients_reviewed: idg_meetings.all_patients_reviewed,
          patients_reviewed_count: idg_meetings.patients_reviewed_count,
          patients_missed_count: idg_meetings.patients_missed_count,
          meeting_notes: idg_meetings.meeting_notes,
          minutes_prepared_by_id: idg_meetings.minutes_prepared_by_id,
          minutes_approved: idg_meetings.minutes_approved,
          minutes_approved_by_id: idg_meetings.minutes_approved_by_id,
          minutes_approved_date: idg_meetings.minutes_approved_date,
          attachments: idg_meetings.attachments,
          created_by_id: idg_meetings.created_by_id,
          updated_by_id: idg_meetings.updated_by_id,
          createdAt: idg_meetings.createdAt,
          updatedAt: idg_meetings.updatedAt
        })
        .from(idg_meetings)
        .where(eq(idg_meetings.id, parseInt(id)))
        .limit(1);

      if (!meeting[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Meeting not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        data: meeting[0]
      };
    } catch (error) {
      logger.error('Error fetching IDG meeting:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching meeting',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Update IDG meeting
   * PATCH /idg-meetings/:id
   */
  async update(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .update(idg_meetings)
        .set({
          ...data,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(idg_meetings.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Meeting not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Meeting updated',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error updating IDG meeting:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error updating meeting',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Start IDG meeting
   * POST /idg-meetings/:id/start
   */
  async start(request, reply) {
    try {
      const { id } = request.params;

      const result = await db
        .update(idg_meetings)
        .set({
          meeting_status: 'IN_PROGRESS',
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(idg_meetings.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Meeting not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Meeting started',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error starting IDG meeting:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error starting meeting',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Complete IDG meeting
   * POST /idg-meetings/:id/complete
   */
  async complete(request, reply) {
    try {
      const { id } = request.params;
      const { meeting_outcomes, decisions_made } = request.body;

      const result = await db
        .update(idg_meetings)
        .set({
          meeting_status: 'COMPLETED',
          meeting_outcomes,
          decisions_made,
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(eq(idg_meetings.id, parseInt(id)))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Meeting not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Meeting completed',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error completing IDG meeting:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error completing meeting',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get meeting attendees
   * GET /idg-meetings/:id/attendees
   */
  async getAttendees(request, reply) {
    try {
      const { id } = request.params;

      const attendees = await db
        .select({
          id: idg_attendees.id,
          idg_meeting_id: idg_attendees.idg_meeting_id,
          staff_id: idg_attendees.staff_id,
          staff_name: idg_attendees.staff_name,
          discipline: idg_attendees.discipline,
          role: idg_attendees.role,
          attended: idg_attendees.attended,
          attendance_type: idg_attendees.attendance_type,
          arrival_time: idg_attendees.arrival_time,
          departure_time: idg_attendees.departure_time,
          absent_reason: idg_attendees.absent_reason,
          proxy_attendee: idg_attendees.proxy_attendee,
          presented_cases: idg_attendees.presented_cases,
          case_count: idg_attendees.case_count,
          notes: idg_attendees.notes,
          createdAt: idg_attendees.createdAt,
          updatedAt: idg_attendees.updatedAt
        })
        .from(idg_attendees)
        .where(eq(idg_attendees.idg_meeting_id, parseInt(id)));

      reply.code(200);
      return {
        status: 200,
        data: attendees
      };
    } catch (error) {
      logger.error('Error fetching attendees:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching attendees',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add attendee to meeting
   * POST /idg-meetings/:id/attendees
   */
  async addAttendee(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(idg_attendees)
        .values({
          idg_meeting_id: parseInt(id),
          ...data
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Attendee added',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding attendee:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding attendee',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get patient reviews for meeting
   * GET /idg-meetings/:id/reviews
   */
  async getReviews(request, reply) {
    try {
      const { id } = request.params;

      const reviews = await db
        .select({
          id: idg_patient_reviews.id,
          idg_meeting_id: idg_patient_reviews.idg_meeting_id,
          patient_id: idg_patient_reviews.patient_id,
          review_status: idg_patient_reviews.review_status,
          review_date: idg_patient_reviews.review_date,
          review_order: idg_patient_reviews.review_order,
          review_duration_minutes: idg_patient_reviews.review_duration_minutes,
          presented_by_id: idg_patient_reviews.presented_by_id,
          presented_by_name: idg_patient_reviews.presented_by_name,
          presenter_discipline: idg_patient_reviews.presenter_discipline,
          days_since_admission: idg_patient_reviews.days_since_admission,
          days_since_last_visit: idg_patient_reviews.days_since_last_visit,
          days_since_last_review: idg_patient_reviews.days_since_last_review,
          current_level_of_care: idg_patient_reviews.current_level_of_care,
          clinical_summary: idg_patient_reviews.clinical_summary,
          current_condition: idg_patient_reviews.current_condition,
          recent_changes: idg_patient_reviews.recent_changes,
          symptoms: idg_patient_reviews.symptoms,
          pain_management: idg_patient_reviews.pain_management,
          functional_status: idg_patient_reviews.functional_status,
          adl_status: idg_patient_reviews.adl_status,
          cognitive_status: idg_patient_reviews.cognitive_status,
          mobility_status: idg_patient_reviews.mobility_status,
          psychosocial_issues: idg_patient_reviews.psychosocial_issues,
          spiritual_issues: idg_patient_reviews.spiritual_issues,
          family_dynamics: idg_patient_reviews.family_dynamics,
          caregiver_status: idg_patient_reviews.caregiver_status,
          caregiver_burden: idg_patient_reviews.caregiver_burden,
          care_plan_reviewed: idg_patient_reviews.care_plan_reviewed,
          care_plan_changes: idg_patient_reviews.care_plan_changes,
          goals_reviewed: idg_patient_reviews.goals_reviewed,
          goals_updated: idg_patient_reviews.goals_updated,
          medications_reviewed: idg_patient_reviews.medications_reviewed,
          medication_changes: idg_patient_reviews.medication_changes,
          medication_issues: idg_patient_reviews.medication_issues,
          current_services: idg_patient_reviews.current_services,
          service_frequency: idg_patient_reviews.service_frequency,
          service_changes_needed: idg_patient_reviews.service_changes_needed,
          dme_needs: idg_patient_reviews.dme_needs,
          supply_needs: idg_patient_reviews.supply_needs,
          nursing_update: idg_patient_reviews.nursing_update,
          social_work_update: idg_patient_reviews.social_work_update,
          chaplain_update: idg_patient_reviews.chaplain_update,
          aide_update: idg_patient_reviews.aide_update,
          therapy_update: idg_patient_reviews.therapy_update,
          volunteer_update: idg_patient_reviews.volunteer_update,
          physician_update: idg_patient_reviews.physician_update,
          safety_concerns: idg_patient_reviews.safety_concerns,
          compliance_issues: idg_patient_reviews.compliance_issues,
          barriers_to_care: idg_patient_reviews.barriers_to_care,
          family_concerns: idg_patient_reviews.family_concerns,
          prognosis_update: idg_patient_reviews.prognosis_update,
          decline_indicators: idg_patient_reviews.decline_indicators,
          imminent_death_indicators: idg_patient_reviews.imminent_death_indicators,
          bereavement_planning: idg_patient_reviews.bereavement_planning,
          discharge_planning: idg_patient_reviews.discharge_planning,
          recertification_due: idg_patient_reviews.recertification_due,
          recertification_date: idg_patient_reviews.recertification_date,
          recertification_status: idg_patient_reviews.recertification_status,
          f2f_status: idg_patient_reviews.f2f_status,
          hope_assessment_status: idg_patient_reviews.hope_assessment_status,
          hope_assessment_due: idg_patient_reviews.hope_assessment_due,
          documentation_issues: idg_patient_reviews.documentation_issues,
          team_recommendations: idg_patient_reviews.team_recommendations,
          action_items: idg_patient_reviews.action_items,
          follow_up_needed: idg_patient_reviews.follow_up_needed,
          follow_up_items: idg_patient_reviews.follow_up_items,
          next_review_date: idg_patient_reviews.next_review_date,
          level_of_care_change: idg_patient_reviews.level_of_care_change,
          new_level_of_care: idg_patient_reviews.new_level_of_care,
          continue_care: idg_patient_reviews.continue_care,
          discharge_recommended: idg_patient_reviews.discharge_recommended,
          discharge_reason: idg_patient_reviews.discharge_reason,
          physician_orders_needed: idg_patient_reviews.physician_orders_needed,
          orders_description: idg_patient_reviews.orders_description,
          orders_obtained: idg_patient_reviews.orders_obtained,
          additional_notes: idg_patient_reviews.additional_notes,
          special_considerations: idg_patient_reviews.special_considerations,
          review_completed: idg_patient_reviews.review_completed,
          completed_date: idg_patient_reviews.completed_date,
          created_by_id: idg_patient_reviews.created_by_id,
          updated_by_id: idg_patient_reviews.updated_by_id,
          createdAt: idg_patient_reviews.createdAt,
          updatedAt: idg_patient_reviews.updatedAt
        })
        .from(idg_patient_reviews)
        .where(eq(idg_patient_reviews.idg_meeting_id, parseInt(id)))
        .orderBy(idg_patient_reviews.review_order);

      reply.code(200);
      return {
        status: 200,
        data: reviews
      };
    } catch (error) {
      logger.error('Error fetching patient reviews:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching reviews',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Add patient review to meeting
   * POST /idg-meetings/:id/reviews
   */
  async addReview(request, reply) {
    try {
      const { id } = request.params;
      const data = request.body;

      const result = await db
        .insert(idg_patient_reviews)
        .values({
          idg_meeting_id: parseInt(id),
          review_date: new Date(),
          presented_by_id: request.user?.id,
          presented_by_name: `${request.user?.firstName} ${request.user?.lastName}`,
          ...data,
          created_by_id: request.user?.id,
          updated_by_id: request.user?.id
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: 'Patient review added',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error adding patient review:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error adding review',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Complete patient review
   * POST /idg-meetings/:id/reviews/:patientId/complete
   */
  async completeReview(request, reply) {
    try {
      const { id, patientId } = request.params;

      const result = await db
        .update(idg_patient_reviews)
        .set({
          review_status: 'COMPLETED',
          review_completed: true,
          completed_date: new Date(),
          updated_by_id: request.user?.id,
          updatedAt: new Date()
        })
        .where(and(
          eq(idg_patient_reviews.idg_meeting_id, parseInt(id)),
          eq(idg_patient_reviews.patient_id, parseInt(patientId))
        ))
        .returning();

      if (!result[0]) {
        reply.code(404);
        return {
          status: 404,
          message: 'Patient review not found'
        };
      }

      reply.code(200);
      return {
        status: 200,
        message: 'Patient review completed',
        data: result[0]
      };
    } catch (error) {
      logger.error('Error completing patient review:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error completing review',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get overdue IDG reviews (14-day rule)
   * GET /idg/overdue
   */
  async getOverdue(request, reply) {
    try {
      const overdueDate = new Date();
      overdueDate.setDate(overdueDate.getDate() - 14);

      const overdue = await db
        .select({
          id: idg_compliance_tracking.id,
          patient_id: idg_compliance_tracking.patient_id,
          last_review_date: idg_compliance_tracking.last_review_date,
          last_review_meeting_id: idg_compliance_tracking.last_review_meeting_id,
          days_since_last_review: idg_compliance_tracking.days_since_last_review,
          next_review_due_date: idg_compliance_tracking.next_review_due_date,
          days_until_next_review: idg_compliance_tracking.days_until_next_review,
          is_compliant: idg_compliance_tracking.is_compliant,
          is_overdue: idg_compliance_tracking.is_overdue,
          days_overdue: idg_compliance_tracking.days_overdue,
          alert_sent: idg_compliance_tracking.alert_sent,
          alert_sent_date: idg_compliance_tracking.alert_sent_date,
          alert_recipients: idg_compliance_tracking.alert_recipients,
          total_reviews: idg_compliance_tracking.total_reviews,
          missed_reviews: idg_compliance_tracking.missed_reviews,
          compliance_rate: idg_compliance_tracking.compliance_rate,
          patient_status: idg_compliance_tracking.patient_status,
          admission_date: idg_compliance_tracking.admission_date,
          days_in_hospice: idg_compliance_tracking.days_in_hospice,
          compliance_notes: idg_compliance_tracking.compliance_notes,
          exception_reason: idg_compliance_tracking.exception_reason,
          last_calculated_date: idg_compliance_tracking.last_calculated_date,
          createdAt: idg_compliance_tracking.createdAt,
          updatedAt: idg_compliance_tracking.updatedAt
        })
        .from(idg_compliance_tracking)
        .where(eq(idg_compliance_tracking.is_overdue, true))
        .orderBy(desc(idg_compliance_tracking.days_overdue));

      reply.code(200);
      return {
        status: 200,
        data: overdue,
        count: overdue.length
      };
    } catch (error) {
      logger.error('Error fetching overdue reviews:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching overdue reviews',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }

  /**
   * Get IDG meeting schedule
   * GET /idg/schedule
   */
  async getSchedule(request, reply) {
    try {
      const { start_date, end_date } = request.query;

      let query = db.select({
        id: idg_meetings.id,
        meeting_type: idg_meetings.meeting_type,
        meeting_status: idg_meetings.meeting_status,
        meeting_date: idg_meetings.meeting_date,
        meeting_time: idg_meetings.meeting_time,
        meeting_duration_minutes: idg_meetings.meeting_duration_minutes,
        location: idg_meetings.location,
        virtual_meeting: idg_meetings.virtual_meeting,
        meeting_link: idg_meetings.meeting_link,
        facilitator_id: idg_meetings.facilitator_id,
        facilitator_name: idg_meetings.facilitator_name,
        agenda: idg_meetings.agenda,
        topics: idg_meetings.topics,
        general_discussion: idg_meetings.general_discussion,
        quality_issues: idg_meetings.quality_issues,
        operational_issues: idg_meetings.operational_issues,
        staff_concerns: idg_meetings.staff_concerns,
        action_items: idg_meetings.action_items,
        follow_up_items: idg_meetings.follow_up_items,
        patient_census: idg_meetings.patient_census,
        new_admissions_count: idg_meetings.new_admissions_count,
        discharges_count: idg_meetings.discharges_count,
        deaths_count: idg_meetings.deaths_count,
        meeting_outcomes: idg_meetings.meeting_outcomes,
        decisions_made: idg_meetings.decisions_made,
        next_meeting_date: idg_meetings.next_meeting_date,
        next_meeting_agenda: idg_meetings.next_meeting_agenda,
        all_patients_reviewed: idg_meetings.all_patients_reviewed,
        patients_reviewed_count: idg_meetings.patients_reviewed_count,
        patients_missed_count: idg_meetings.patients_missed_count,
        meeting_notes: idg_meetings.meeting_notes,
        minutes_prepared_by_id: idg_meetings.minutes_prepared_by_id,
        minutes_approved: idg_meetings.minutes_approved,
        minutes_approved_by_id: idg_meetings.minutes_approved_by_id,
        minutes_approved_date: idg_meetings.minutes_approved_date,
        attachments: idg_meetings.attachments,
        created_by_id: idg_meetings.created_by_id,
        updated_by_id: idg_meetings.updated_by_id,
        createdAt: idg_meetings.createdAt,
        updatedAt: idg_meetings.updatedAt
      }).from(idg_meetings);

      if (start_date && end_date) {
        query = query.where(and(
          gte(idg_meetings.meeting_date, new Date(start_date)),
          lte(idg_meetings.meeting_date, new Date(end_date))
        ));
      }

      const schedule = await query.orderBy(idg_meetings.meeting_date);

      reply.code(200);
      return {
        status: 200,
        data: schedule
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
   * Get patient IDG review history
   * GET /patients/:id/idg-reviews
   */
  async getPatientReviews(request, reply) {
    try {
      const { id } = request.params;

      const reviews = await db
        .select({
          id: idg_patient_reviews.id,
          idg_meeting_id: idg_patient_reviews.idg_meeting_id,
          patient_id: idg_patient_reviews.patient_id,
          review_status: idg_patient_reviews.review_status,
          review_date: idg_patient_reviews.review_date,
          review_order: idg_patient_reviews.review_order,
          review_duration_minutes: idg_patient_reviews.review_duration_minutes,
          presented_by_id: idg_patient_reviews.presented_by_id,
          presented_by_name: idg_patient_reviews.presented_by_name,
          presenter_discipline: idg_patient_reviews.presenter_discipline,
          days_since_admission: idg_patient_reviews.days_since_admission,
          days_since_last_visit: idg_patient_reviews.days_since_last_visit,
          days_since_last_review: idg_patient_reviews.days_since_last_review,
          current_level_of_care: idg_patient_reviews.current_level_of_care,
          clinical_summary: idg_patient_reviews.clinical_summary,
          current_condition: idg_patient_reviews.current_condition,
          recent_changes: idg_patient_reviews.recent_changes,
          symptoms: idg_patient_reviews.symptoms,
          pain_management: idg_patient_reviews.pain_management,
          functional_status: idg_patient_reviews.functional_status,
          adl_status: idg_patient_reviews.adl_status,
          cognitive_status: idg_patient_reviews.cognitive_status,
          mobility_status: idg_patient_reviews.mobility_status,
          psychosocial_issues: idg_patient_reviews.psychosocial_issues,
          spiritual_issues: idg_patient_reviews.spiritual_issues,
          family_dynamics: idg_patient_reviews.family_dynamics,
          caregiver_status: idg_patient_reviews.caregiver_status,
          caregiver_burden: idg_patient_reviews.caregiver_burden,
          care_plan_reviewed: idg_patient_reviews.care_plan_reviewed,
          care_plan_changes: idg_patient_reviews.care_plan_changes,
          goals_reviewed: idg_patient_reviews.goals_reviewed,
          goals_updated: idg_patient_reviews.goals_updated,
          medications_reviewed: idg_patient_reviews.medications_reviewed,
          medication_changes: idg_patient_reviews.medication_changes,
          medication_issues: idg_patient_reviews.medication_issues,
          current_services: idg_patient_reviews.current_services,
          service_frequency: idg_patient_reviews.service_frequency,
          service_changes_needed: idg_patient_reviews.service_changes_needed,
          dme_needs: idg_patient_reviews.dme_needs,
          supply_needs: idg_patient_reviews.supply_needs,
          nursing_update: idg_patient_reviews.nursing_update,
          social_work_update: idg_patient_reviews.social_work_update,
          chaplain_update: idg_patient_reviews.chaplain_update,
          aide_update: idg_patient_reviews.aide_update,
          therapy_update: idg_patient_reviews.therapy_update,
          volunteer_update: idg_patient_reviews.volunteer_update,
          physician_update: idg_patient_reviews.physician_update,
          safety_concerns: idg_patient_reviews.safety_concerns,
          compliance_issues: idg_patient_reviews.compliance_issues,
          barriers_to_care: idg_patient_reviews.barriers_to_care,
          family_concerns: idg_patient_reviews.family_concerns,
          prognosis_update: idg_patient_reviews.prognosis_update,
          decline_indicators: idg_patient_reviews.decline_indicators,
          imminent_death_indicators: idg_patient_reviews.imminent_death_indicators,
          bereavement_planning: idg_patient_reviews.bereavement_planning,
          discharge_planning: idg_patient_reviews.discharge_planning,
          recertification_due: idg_patient_reviews.recertification_due,
          recertification_date: idg_patient_reviews.recertification_date,
          recertification_status: idg_patient_reviews.recertification_status,
          f2f_status: idg_patient_reviews.f2f_status,
          hope_assessment_status: idg_patient_reviews.hope_assessment_status,
          hope_assessment_due: idg_patient_reviews.hope_assessment_due,
          documentation_issues: idg_patient_reviews.documentation_issues,
          team_recommendations: idg_patient_reviews.team_recommendations,
          action_items: idg_patient_reviews.action_items,
          follow_up_needed: idg_patient_reviews.follow_up_needed,
          follow_up_items: idg_patient_reviews.follow_up_items,
          next_review_date: idg_patient_reviews.next_review_date,
          level_of_care_change: idg_patient_reviews.level_of_care_change,
          new_level_of_care: idg_patient_reviews.new_level_of_care,
          continue_care: idg_patient_reviews.continue_care,
          discharge_recommended: idg_patient_reviews.discharge_recommended,
          discharge_reason: idg_patient_reviews.discharge_reason,
          physician_orders_needed: idg_patient_reviews.physician_orders_needed,
          orders_description: idg_patient_reviews.orders_description,
          orders_obtained: idg_patient_reviews.orders_obtained,
          additional_notes: idg_patient_reviews.additional_notes,
          special_considerations: idg_patient_reviews.special_considerations,
          review_completed: idg_patient_reviews.review_completed,
          completed_date: idg_patient_reviews.completed_date,
          created_by_id: idg_patient_reviews.created_by_id,
          updated_by_id: idg_patient_reviews.updated_by_id,
          createdAt: idg_patient_reviews.createdAt,
          updatedAt: idg_patient_reviews.updatedAt
        })
        .from(idg_patient_reviews)
        .where(eq(idg_patient_reviews.patient_id, parseInt(id)))
        .orderBy(desc(idg_patient_reviews.review_date));

      reply.code(200);
      return {
        status: 200,
        data: reviews
      };
    } catch (error) {
      logger.error('Error fetching patient IDG reviews:', error)
      reply.code(500);
      return {
        status: 500,
        message: 'Error fetching reviews',
        error: process.env.NODE_ENV === 'development' ? error.message : undefined
      };
    }
  }
}

export default new IDGMeetingController();
