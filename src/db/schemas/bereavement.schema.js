import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * Bereavement Module Schemas
 * Module K - MEDIUM Priority
 *
 * Purpose: 13-month bereavement requirement, grief support services
 * Compliance: CMS requires hospices to provide bereavement services for 13 months after patient death
 *
 * Tables:
 * - bereavement_cases: Main bereavement case tracking (13-month requirement)
 * - bereavement_contacts: Family/friends to receive bereavement services
 * - bereavement_plans: Individualized bereavement care plans
 * - bereavement_encounters: Contacts, calls, visits with bereaved
 * - bereavement_risk_assessments: Complicated grief risk screening
 * - support_groups: Support group offerings
 * - support_group_sessions: Individual group meeting sessions
 * - support_group_participants: Attendance tracking
 */

/**
 * Bereavement Cases Table
 * Tracks 13-month bereavement period for each deceased patient
 */
export const bereavement_cases = pgTable('bereavement_cases', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Dates
  date_of_death: date('date_of_death').notNull(),
  bereavement_start_date: date('bereavement_start_date').notNull(),
  bereavement_end_date: date('bereavement_end_date').notNull(), // 13 months after death

  // Case status
  case_status: varchar('case_status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, COMPLETED, CLOSED_EARLY
  primary_contact_id: bigint('primary_contact_id', { mode: 'number' }), // References bereavement_contacts

  // Service details
  service_level: varchar('service_level', { length: 50 }), // STANDARD, ENHANCED, HIGH_RISK
  assigned_counselor_id: text('assigned_counselor_id').references(() => users.id),

  // Compliance tracking
  services_offered: boolean('services_offered').default(false).notNull(),
  services_declined: boolean('services_declined').default(false),
  decline_reason: text('decline_reason'),
  decline_date: date('decline_date'),

  // Case notes
  initial_assessment_notes: text('initial_assessment_notes'),
  special_considerations: text('special_considerations'),
  cultural_preferences: text('cultural_preferences'),

  // Closure
  closure_date: date('closure_date'),
  closure_reason: varchar('closure_reason', { length: 100 }), // COMPLETED_13_MONTHS, DECLINED_SERVICES, MOVED_AWAY, etc.
  closure_notes: text('closure_notes'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Bereavement Contacts Table
 * Family members and friends receiving bereavement services
 */
export const bereavement_contacts = pgTable('bereavement_contacts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id).notNull(),

  // Contact information
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  relationship_to_deceased: varchar('relationship_to_deceased', { length: 100 }), // SPOUSE, CHILD, PARENT, SIBLING, FRIEND, etc.

  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  preferred_contact_method: varchar('preferred_contact_method', { length: 50 }), // PHONE, EMAIL, MAIL, IN_PERSON

  // Demographics
  date_of_birth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  preferred_language: varchar('preferred_language', { length: 50 }),

  // Service preferences
  is_primary_contact: boolean('is_primary_contact').default(false),
  wants_services: boolean('wants_services').default(true),
  service_preferences: text('service_preferences'),

  // Special needs
  has_special_needs: boolean('has_special_needs').default(false),
  special_needs_notes: text('special_needs_notes'),
  accessibility_requirements: text('accessibility_requirements'),

  // Additional info
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Bereavement Plans Table
 * Individualized care plans for bereavement services
 */
export const bereavement_plans = pgTable('bereavement_plans', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id).notNull(),

  // Plan details
  plan_date: date('plan_date').notNull(),
  plan_status: varchar('plan_status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, REVISED, COMPLETED

  // Assessment
  grief_stage: varchar('grief_stage', { length: 50 }), // DENIAL, ANGER, BARGAINING, DEPRESSION, ACCEPTANCE
  risk_level: varchar('risk_level', { length: 50 }), // LOW, MODERATE, HIGH
  risk_factors: text('risk_factors'),

  // Goals and interventions
  goals: text('goals'),
  planned_interventions: text('planned_interventions'),
  recommended_frequency: varchar('recommended_frequency', { length: 100 }), // WEEKLY, BIWEEKLY, MONTHLY, AS_NEEDED

  // Resources
  materials_provided: text('materials_provided'),
  referrals_made: text('referrals_made'),
  support_groups_recommended: text('support_groups_recommended'),

  // Review
  next_review_date: date('next_review_date'),
  review_notes: text('review_notes'),

  // Signature
  signature: jsonb('signature'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Bereavement Encounters Table
 * Individual contacts with bereaved families (calls, visits, mailings)
 */
export const bereavement_encounters = pgTable('bereavement_encounters', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id).notNull(),
  bereavement_contact_id: bigint('bereavement_contact_id', { mode: 'number' }).references(() => bereavement_contacts.id),

  // Encounter details
  encounter_date: date('encounter_date').notNull(),
  encounter_time: varchar('encounter_time', { length: 20 }),
  encounter_type: varchar('encounter_type', { length: 50 }).notNull(), // PHONE_CALL, HOME_VISIT, OFFICE_VISIT, MAILING, EMAIL, MEMORIAL_SERVICE
  duration_minutes: integer('duration_minutes'),

  // Staff
  counselor_id: text('counselor_id').references(() => users.id),
  counselor_name: varchar('counselor_name', { length: 255 }),

  // Content
  purpose: text('purpose'),
  topics_discussed: text('topics_discussed'),
  grief_assessment: text('grief_assessment'),
  interventions_provided: text('interventions_provided'),

  // Outcomes
  contact_response: varchar('contact_response', { length: 50 }), // RECEPTIVE, NEUTRAL, RESISTANT, NO_RESPONSE
  follow_up_needed: boolean('follow_up_needed').default(false),
  follow_up_date: date('follow_up_date'),
  follow_up_notes: text('follow_up_notes'),

  // Materials
  materials_sent: text('materials_sent'),
  referrals_provided: text('referrals_provided'),

  // Documentation
  encounter_notes: text('encounter_notes'),
  signature: jsonb('signature'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Bereavement Risk Assessments Table
 * Screening for complicated grief and high-risk situations
 */
export const bereavement_risk_assessments = pgTable('bereavement_risk_assessments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id).notNull(),
  bereavement_contact_id: bigint('bereavement_contact_id', { mode: 'number' }).references(() => bereavement_contacts.id),

  // Assessment details
  assessment_date: date('assessment_date').notNull(),
  assessed_by_id: text('assessed_by_id').references(() => users.id),

  // Risk factors (Boolean indicators)
  sudden_death: boolean('sudden_death').default(false),
  traumatic_death: boolean('traumatic_death').default(false),
  suicide: boolean('suicide').default(false),
  child_death: boolean('child_death').default(false),
  multiple_losses: boolean('multiple_losses').default(false),

  // Bereaved characteristics
  history_of_mental_illness: boolean('history_of_mental_illness').default(false),
  history_of_substance_abuse: boolean('history_of_substance_abuse').default(false),
  limited_social_support: boolean('limited_social_support').default(false),
  financial_stress: boolean('financial_stress').default(false),
  caregiver_burden: boolean('caregiver_burden').default(false),

  // Clinical indicators
  prolonged_grief: boolean('prolonged_grief').default(false),
  depression_symptoms: boolean('depression_symptoms').default(false),
  anxiety_symptoms: boolean('anxiety_symptoms').default(false),
  suicidal_ideation: boolean('suicidal_ideation').default(false),
  functional_impairment: boolean('functional_impairment').default(false),

  // Overall assessment
  total_risk_score: integer('total_risk_score'),
  risk_level: varchar('risk_level', { length: 50 }), // LOW, MODERATE, HIGH
  recommended_interventions: text('recommended_interventions'),
  referrals_needed: text('referrals_needed'),

  // Notes
  assessment_notes: text('assessment_notes'),
  follow_up_plan: text('follow_up_plan'),

  // Signature
  signature: jsonb('signature'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Support Groups Table
 * Available bereavement support groups
 */
export const support_groups = pgTable('support_groups', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Group details
  group_name: varchar('group_name', { length: 255 }).notNull(),
  group_type: varchar('group_type', { length: 100 }), // GENERAL_GRIEF, SPOUSE_LOSS, PARENT_LOSS, CHILD_LOSS, SUICIDE_SURVIVORS, etc.
  description: text('description'),

  // Facilitator
  facilitator_id: text('facilitator_id').references(() => users.id),
  facilitator_name: varchar('facilitator_name', { length: 255 }),
  co_facilitator_id: text('co_facilitator_id').references(() => users.id),

  // Schedule
  meeting_frequency: varchar('meeting_frequency', { length: 50 }), // WEEKLY, BIWEEKLY, MONTHLY
  meeting_day: varchar('meeting_day', { length: 20 }), // MONDAY, TUESDAY, etc.
  meeting_time: varchar('meeting_time', { length: 20 }),
  duration_minutes: integer('duration_minutes').default(90),

  // Location
  meeting_location: text('meeting_location'),
  is_virtual: boolean('is_virtual').default(false),
  virtual_meeting_link: text('virtual_meeting_link'),

  // Capacity
  max_participants: integer('max_participants'),
  current_participants: integer('current_participants').default(0),
  is_open_enrollment: boolean('is_open_enrollment').default(true),

  // Session info
  start_date: date('start_date'),
  end_date: date('end_date'),
  number_of_sessions: integer('number_of_sessions'),

  // Status
  group_status: varchar('group_status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, FULL, COMPLETED, CANCELLED

  // Requirements
  prerequisites: text('prerequisites'),
  age_restrictions: varchar('age_restrictions', { length: 100 }),

  // Additional info
  materials_provided: text('materials_provided'),
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Support Group Sessions Table
 * Individual meeting sessions for support groups
 */
export const support_group_sessions = pgTable('support_group_sessions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  support_group_id: bigint('support_group_id', { mode: 'number' }).references(() => support_groups.id).notNull(),

  // Session details
  session_number: integer('session_number'),
  session_date: date('session_date').notNull(),
  session_time: varchar('session_time', { length: 20 }),
  duration_minutes: integer('duration_minutes'),

  // Topic
  session_topic: varchar('session_topic', { length: 255 }),
  session_description: text('session_description'),
  learning_objectives: text('learning_objectives'),

  // Facilitators
  facilitator_id: text('facilitator_id').references(() => users.id),
  co_facilitator_id: text('co_facilitator_id').references(() => users.id),

  // Attendance
  attendee_count: integer('attendee_count').default(0),
  new_attendees: integer('new_attendees').default(0),

  // Content
  activities: text('activities'),
  materials_used: text('materials_used'),
  handouts_provided: text('handouts_provided'),

  // Session notes
  session_notes: text('session_notes'),
  key_discussion_points: text('key_discussion_points'),
  participant_feedback: text('participant_feedback'),

  // Follow-up
  action_items: text('action_items'),
  next_session_prep: text('next_session_prep'),

  // Status
  session_status: varchar('session_status', { length: 50 }).default('SCHEDULED'), // SCHEDULED, COMPLETED, CANCELLED

  // Cancellation
  cancelled: boolean('cancelled').default(false),
  cancellation_reason: text('cancellation_reason'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Support Group Participants Table
 * Tracks individual attendance at support group sessions
 */
export const support_group_participants = pgTable('support_group_participants', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  support_group_id: bigint('support_group_id', { mode: 'number' }).references(() => support_groups.id).notNull(),
  support_group_session_id: bigint('support_group_session_id', { mode: 'number' }).references(() => support_group_sessions.id),
  bereavement_contact_id: bigint('bereavement_contact_id', { mode: 'number' }).references(() => bereavement_contacts.id),

  // Participant info (may not always be linked to bereavement_contacts)
  participant_name: varchar('participant_name', { length: 255 }),
  participant_email: varchar('participant_email', { length: 255 }),
  participant_phone: varchar('participant_phone', { length: 50 }),

  // Registration
  registration_date: date('registration_date'),
  registration_status: varchar('registration_status', { length: 50 }).default('ACTIVE'), // ACTIVE, DROPPED, COMPLETED

  // Attendance
  attended: boolean('attended').default(false),
  attendance_date: date('attendance_date'),
  late_arrival: boolean('late_arrival').default(false),
  early_departure: boolean('early_departure').default(false),

  // Participation
  participation_level: varchar('participation_level', { length: 50 }), // ACTIVE, MODERATE, PASSIVE, OBSERVER
  notes: text('notes'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
