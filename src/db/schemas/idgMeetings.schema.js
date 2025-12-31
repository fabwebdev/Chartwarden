import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date, time } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

// ============================================================================
// IDG (INTERDISCIPLINARY GROUP) MEETINGS TABLES
// ============================================================================
// IDG team meetings - HIGH priority (14-day compliance rule)
// All patients must be reviewed by IDG at least every 14 days
// ============================================================================

/**
 * IDG Meetings - Interdisciplinary group team meetings
 * Medicare requires regular IDG meetings for all hospice patients
 */
export const idg_meetings = pgTable('idg_meetings', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Meeting metadata
  meeting_type: varchar('meeting_type', { length: 50 }).notNull(), // INITIAL, ROUTINE, RECERTIFICATION, EMERGENCY, SPECIAL
  meeting_status: varchar('meeting_status', { length: 50 }).default('SCHEDULED').notNull(), // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, RESCHEDULED
  meeting_date: date('meeting_date').notNull(),
  meeting_time: time('meeting_time'),
  meeting_duration_minutes: integer('meeting_duration_minutes'),

  // Meeting location
  location: varchar('location', { length: 255 }),
  virtual_meeting: boolean('virtual_meeting').default(false),
  meeting_link: varchar('meeting_link', { length: 500 }),

  // Meeting facilitator
  facilitator_id: text('facilitator_id').references(() => users.id),
  facilitator_name: varchar('facilitator_name', { length: 255 }),

  // Agenda
  agenda: text('agenda'),
  topics: jsonb('topics'),

  // General discussion
  general_discussion: text('general_discussion'),
  quality_issues: text('quality_issues'),
  operational_issues: text('operational_issues'),
  staff_concerns: text('staff_concerns'),

  // Action items
  action_items: jsonb('action_items'),

  // Follow-up from previous meeting
  follow_up_items: text('follow_up_items'),

  // Patient census at time of meeting
  patient_census: integer('patient_census'),
  new_admissions_count: integer('new_admissions_count'),
  discharges_count: integer('discharges_count'),
  deaths_count: integer('deaths_count'),

  // Meeting outcomes
  meeting_outcomes: text('meeting_outcomes'),
  decisions_made: text('decisions_made'),

  // Next meeting
  next_meeting_date: date('next_meeting_date'),
  next_meeting_agenda: text('next_meeting_agenda'),

  // Compliance tracking
  all_patients_reviewed: boolean('all_patients_reviewed').default(false),
  patients_reviewed_count: integer('patients_reviewed_count'),
  patients_missed_count: integer('patients_missed_count'),

  // Documentation
  meeting_notes: text('meeting_notes'),
  minutes_prepared_by_id: text('minutes_prepared_by_id').references(() => users.id),
  minutes_approved: boolean('minutes_approved').default(false),
  minutes_approved_by_id: text('minutes_approved_by_id').references(() => users.id),
  minutes_approved_date: date('minutes_approved_date'),

  // Attachments
  attachments: jsonb('attachments'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * IDG Attendees - Track who attended each meeting
 */
export const idg_attendees = pgTable('idg_attendees', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  idg_meeting_id: bigint('idg_meeting_id', { mode: 'number' }).references(() => idg_meetings.id).notNull(),

  // Attendee information
  staff_id: text('staff_id').references(() => users.id),
  staff_name: varchar('staff_name', { length: 255 }).notNull(),
  discipline: varchar('discipline', { length: 50 }).notNull(), // PHYSICIAN, REGISTERED_NURSE, SOCIAL_WORKER, CHAPLAIN, etc.
  role: varchar('role', { length: 100 }), // Medical Director, Team Leader, etc.

  // Attendance details
  attended: boolean('attended').default(true),
  attendance_type: varchar('attendance_type', { length: 50 }), // IN_PERSON, VIRTUAL, PHONE
  arrival_time: time('arrival_time'),
  departure_time: time('departure_time'),

  // Absence tracking
  absent_reason: varchar('absent_reason', { length: 255 }),
  proxy_attendee: varchar('proxy_attendee', { length: 255 }),

  // Contribution
  presented_cases: boolean('presented_cases').default(false),
  case_count: integer('case_count'),
  notes: text('notes'),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * IDG Patient Reviews - Individual patient discussions during IDG meetings
 * CRITICAL: All patients must be reviewed at least every 14 days
 */
export const idg_patient_reviews = pgTable('idg_patient_reviews', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  idg_meeting_id: bigint('idg_meeting_id', { mode: 'number' }).references(() => idg_meetings.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Review metadata
  review_status: varchar('review_status', { length: 50 }).default('PENDING').notNull(), // PENDING, IN_PROGRESS, COMPLETED, SKIPPED, DEFERRED
  review_date: date('review_date').notNull(),
  review_order: integer('review_order'), // Order in which patients were reviewed
  review_duration_minutes: integer('review_duration_minutes'),

  // Presented by
  presented_by_id: text('presented_by_id').references(() => users.id),
  presented_by_name: varchar('presented_by_name', { length: 255 }),
  presenter_discipline: varchar('presenter_discipline', { length: 50 }),

  // Patient status at time of review
  days_since_admission: integer('days_since_admission'),
  days_since_last_visit: integer('days_since_last_visit'),
  days_since_last_review: integer('days_since_last_review'),
  current_level_of_care: varchar('current_level_of_care', { length: 50 }),

  // Clinical update
  clinical_summary: text('clinical_summary'),
  current_condition: text('current_condition'),
  recent_changes: text('recent_changes'),
  symptoms: text('symptoms'),
  pain_management: text('pain_management'),

  // Functional status
  functional_status: text('functional_status'),
  adl_status: text('adl_status'),
  cognitive_status: varchar('cognitive_status', { length: 50 }),
  mobility_status: varchar('mobility_status', { length: 50 }),

  // Psychosocial/spiritual
  psychosocial_issues: text('psychosocial_issues'),
  spiritual_issues: text('spiritual_issues'),
  family_dynamics: text('family_dynamics'),
  caregiver_status: text('caregiver_status'),
  caregiver_burden: varchar('caregiver_burden', { length: 50 }),

  // Care plan review
  care_plan_reviewed: boolean('care_plan_reviewed').default(false),
  care_plan_changes: text('care_plan_changes'),
  goals_reviewed: boolean('goals_reviewed').default(false),
  goals_updated: text('goals_updated'),

  // Medication review
  medications_reviewed: boolean('medications_reviewed').default(false),
  medication_changes: text('medication_changes'),
  medication_issues: text('medication_issues'),

  // Service coordination
  current_services: text('current_services'),
  service_frequency: text('service_frequency'),
  service_changes_needed: text('service_changes_needed'),
  dme_needs: text('dme_needs'),
  supply_needs: text('supply_needs'),

  // Disciplines reporting
  nursing_update: text('nursing_update'),
  social_work_update: text('social_work_update'),
  chaplain_update: text('chaplain_update'),
  aide_update: text('aide_update'),
  therapy_update: text('therapy_update'),
  volunteer_update: text('volunteer_update'),
  physician_update: text('physician_update'),

  // Issues and concerns
  safety_concerns: text('safety_concerns'),
  compliance_issues: text('compliance_issues'),
  barriers_to_care: text('barriers_to_care'),
  family_concerns: text('family_concerns'),

  // Prognosis and planning
  prognosis_update: text('prognosis_update'),
  decline_indicators: text('decline_indicators'),
  imminent_death_indicators: text('imminent_death_indicators'),
  bereavement_planning: text('bereavement_planning'),
  discharge_planning: text('discharge_planning'),

  // Recertification
  recertification_due: boolean('recertification_due').default(false),
  recertification_date: date('recertification_date'),
  recertification_status: varchar('recertification_status', { length: 50 }),
  f2f_status: varchar('f2f_status', { length: 50 }),

  // Quality measures
  hope_assessment_status: varchar('hope_assessment_status', { length: 50 }),
  hope_assessment_due: boolean('hope_assessment_due').default(false),
  documentation_issues: text('documentation_issues'),

  // Team recommendations
  team_recommendations: text('team_recommendations'),
  action_items: jsonb('action_items'),

  // Follow-up needed
  follow_up_needed: boolean('follow_up_needed').default(false),
  follow_up_items: text('follow_up_items'),
  next_review_date: date('next_review_date'),

  // IDG decisions
  level_of_care_change: boolean('level_of_care_change').default(false),
  new_level_of_care: varchar('new_level_of_care', { length: 50 }),
  continue_care: boolean('continue_care').default(true),
  discharge_recommended: boolean('discharge_recommended').default(false),
  discharge_reason: varchar('discharge_reason', { length: 255 }),

  // Orders needed
  physician_orders_needed: boolean('physician_orders_needed').default(false),
  orders_description: text('orders_description'),
  orders_obtained: boolean('orders_obtained').default(false),

  // Additional notes
  additional_notes: text('additional_notes'),
  special_considerations: text('special_considerations'),

  // Completion
  review_completed: boolean('review_completed').default(false),
  completed_date: timestamp('completed_date'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * IDG Compliance Tracking - Track 14-day review compliance
 * Medicare requirement: All patients must be reviewed by IDG every 14 days
 */
export const idg_compliance_tracking = pgTable('idg_compliance_tracking', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Current status
  last_review_date: date('last_review_date'),
  last_review_meeting_id: bigint('last_review_meeting_id', { mode: 'number' }).references(() => idg_meetings.id),
  days_since_last_review: integer('days_since_last_review'),

  // Next review due
  next_review_due_date: date('next_review_due_date'),
  days_until_next_review: integer('days_until_next_review'),

  // Compliance status
  is_compliant: boolean('is_compliant').default(true),
  is_overdue: boolean('is_overdue').default(false),
  days_overdue: integer('days_overdue'),

  // Alert tracking
  alert_sent: boolean('alert_sent').default(false),
  alert_sent_date: date('alert_sent_date'),
  alert_recipients: jsonb('alert_recipients'),

  // Review history count
  total_reviews: integer('total_reviews').default(0),
  missed_reviews: integer('missed_reviews').default(0),
  compliance_rate: integer('compliance_rate'), // Percentage

  // Patient status
  patient_status: varchar('patient_status', { length: 50 }),
  admission_date: date('admission_date'),
  days_in_hospice: integer('days_in_hospice'),

  // Notes
  compliance_notes: text('compliance_notes'),
  exception_reason: text('exception_reason'),

  // Audit fields
  last_calculated_date: date('last_calculated_date'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
