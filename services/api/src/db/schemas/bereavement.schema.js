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
  preferred_contact_times: text('preferred_contact_times'), // Best times to reach (morning, afternoon, evening, etc.)

  // Demographics
  date_of_birth: date('date_of_birth'),
  gender: varchar('gender', { length: 20 }),
  preferred_language: varchar('preferred_language', { length: 50 }),

  // Service preferences
  is_primary_contact: boolean('is_primary_contact').default(false),
  wants_services: boolean('wants_services').default(true),
  service_preferences: text('service_preferences'),

  // Grief assessment (individual tracking per contact)
  grief_assessment_score: integer('grief_assessment_score'), // Standardized grief assessment score (e.g., 0-100)
  grief_assessment_tool: varchar('grief_assessment_tool', { length: 100 }), // Tool used: PG-13, ICG, TRIG, etc.
  grief_assessment_date: date('grief_assessment_date'),
  grief_stage: varchar('grief_stage', { length: 50 }), // DENIAL, ANGER, BARGAINING, DEPRESSION, ACCEPTANCE
  grief_notes: text('grief_notes'),

  // Consent and privacy preferences
  consent_status: varchar('consent_status', { length: 50 }).default('PENDING'), // PENDING, GRANTED, DECLINED, WITHDRAWN
  consent_date: date('consent_date'),
  consent_signature: jsonb('consent_signature'),
  privacy_preferences: jsonb('privacy_preferences'), // JSON object with granular privacy settings
  can_share_info: boolean('can_share_info').default(false), // Can share info with other family members
  can_contact_via_phone: boolean('can_contact_via_phone').default(true),
  can_contact_via_email: boolean('can_contact_via_email').default(true),
  can_contact_via_mail: boolean('can_contact_via_mail').default(true),

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

/**
 * Bereavement Follow-ups Table
 * Tracks scheduled and completed follow-up contacts at specific milestones
 * Standard milestones: 1 week, 1 month, 3 months, 6 months, 1 year
 */
export const bereavement_follow_ups = pgTable('bereavement_follow_ups', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id).notNull(),
  bereavement_contact_id: bigint('bereavement_contact_id', { mode: 'number' }).references(() => bereavement_contacts.id),

  // Follow-up milestone
  milestone_type: varchar('milestone_type', { length: 50 }).notNull(), // 1_WEEK, 1_MONTH, 3_MONTHS, 6_MONTHS, 1_YEAR, CUSTOM
  milestone_description: text('milestone_description'), // Description for custom milestones

  // Scheduling
  scheduled_date: date('scheduled_date').notNull(),
  reminder_sent: boolean('reminder_sent').default(false),
  reminder_sent_date: date('reminder_sent_date'),

  // Contact details
  contact_method: varchar('contact_method', { length: 50 }), // PHONE_CALL, HOME_VISIT, LETTER, EMAIL, SYMPATHY_CARD

  // Completion
  follow_up_status: varchar('follow_up_status', { length: 50 }).default('SCHEDULED'), // SCHEDULED, COMPLETED, MISSED, RESCHEDULED, CANCELLED, DECLINED
  completed_date: date('completed_date'),
  completed_by_id: text('completed_by_id').references(() => users.id),

  // Outcome
  contact_outcome: varchar('contact_outcome', { length: 50 }), // SUCCESSFUL, NO_ANSWER, LEFT_MESSAGE, DECLINED, OTHER
  family_wellbeing_assessment: varchar('family_wellbeing_assessment', { length: 50 }), // COPING_WELL, MILD_DISTRESS, MODERATE_DISTRESS, SEVERE_DISTRESS, CRISIS
  wellbeing_score: integer('wellbeing_score'), // 1-10 scale for tracking over time

  // Issues and referrals
  issues_identified: text('issues_identified'),
  additional_support_needed: boolean('additional_support_needed').default(false),
  support_type_needed: text('support_type_needed'),
  referrals_made: text('referrals_made'),
  external_referrals: jsonb('external_referrals'), // JSON array of external resource referrals

  // Documentation
  follow_up_notes: text('follow_up_notes'),
  family_feedback: text('family_feedback'),

  // Next steps
  follow_up_required: boolean('follow_up_required').default(false),
  next_follow_up_date: date('next_follow_up_date'),
  next_follow_up_notes: text('next_follow_up_notes'),

  // Signature (for compliance)
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
 * Bereavement Resources Table
 * Tracks support resources provided to bereaved families
 */
export const bereavement_resources = pgTable('bereavement_resources', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id).notNull(),
  bereavement_contact_id: bigint('bereavement_contact_id', { mode: 'number' }).references(() => bereavement_contacts.id),

  // Resource details
  resource_type: varchar('resource_type', { length: 100 }).notNull(), // LITERATURE, BROCHURE, SUPPORT_GROUP, REFERRAL, MEMORIAL_SERVICE, SYMPATHY_CARD, COUNSELING_SESSION, BOOK, WEBSITE, HOTLINE
  resource_name: varchar('resource_name', { length: 255 }).notNull(),
  resource_description: text('resource_description'),

  // Resource specifics (depending on type)
  resource_url: text('resource_url'), // For websites, online resources
  resource_phone: varchar('resource_phone', { length: 50 }), // For hotlines, referrals
  resource_address: text('resource_address'), // For physical locations
  resource_contact: varchar('resource_contact', { length: 255 }), // Contact person for referrals

  // Provision details
  date_provided: date('date_provided').notNull(),
  provided_by_id: text('provided_by_id').references(() => users.id),
  delivery_method: varchar('delivery_method', { length: 50 }), // IN_PERSON, MAILED, EMAILED, PHONE

  // Recurring resources
  is_recurring: boolean('is_recurring').default(false),
  recurrence_frequency: varchar('recurrence_frequency', { length: 50 }), // WEEKLY, BIWEEKLY, MONTHLY, AS_NEEDED
  next_occurrence_date: date('next_occurrence_date'),

  // Feedback and utilization
  resource_utilized: boolean('resource_utilized'), // Did the family use the resource?
  utilization_date: date('utilization_date'),
  family_feedback: text('family_feedback'),
  feedback_rating: integer('feedback_rating'), // 1-5 star rating
  was_helpful: boolean('was_helpful'),

  // External referral tracking
  is_external_referral: boolean('is_external_referral').default(false),
  external_organization: varchar('external_organization', { length: 255 }),
  referral_status: varchar('referral_status', { length: 50 }), // PENDING, ACCEPTED, COMPLETED, DECLINED
  referral_outcome: text('referral_outcome'),

  // Notes
  notes: text('notes'),
  follow_up_needed: boolean('follow_up_needed').default(false),
  follow_up_notes: text('follow_up_notes'),

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
 * Memorial Services Table
 * Tracks memorial services and family attendance
 */
export const bereavement_memorial_services = pgTable('bereavement_memorial_services', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Service details
  service_name: varchar('service_name', { length: 255 }).notNull(),
  service_type: varchar('service_type', { length: 100 }), // ANNUAL_MEMORIAL, HOLIDAY_REMEMBRANCE, CANDLE_LIGHTING, BUTTERFLY_RELEASE, TREE_PLANTING, CUSTOM
  service_description: text('service_description'),

  // Date and location
  service_date: date('service_date').notNull(),
  service_time: varchar('service_time', { length: 20 }),
  duration_minutes: integer('duration_minutes'),
  location: text('location'),
  is_virtual: boolean('is_virtual').default(false),
  virtual_link: text('virtual_link'),

  // Organizers
  coordinator_id: text('coordinator_id').references(() => users.id),
  coordinator_name: varchar('coordinator_name', { length: 255 }),

  // Service program
  program_details: text('program_details'),
  speakers: jsonb('speakers'), // Array of speaker info
  music_selections: text('music_selections'),
  readings: text('readings'),

  // Capacity and registration
  max_attendees: integer('max_attendees'),
  registration_required: boolean('registration_required').default(false),
  registration_deadline: date('registration_deadline'),

  // Service status
  service_status: varchar('service_status', { length: 50 }).default('PLANNED'), // PLANNED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED
  actual_attendee_count: integer('actual_attendee_count'),

  // Post-service
  service_notes: text('service_notes'),
  feedback_summary: text('feedback_summary'),

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
 * Memorial Service Attendees Table
 * Tracks attendance at memorial services
 */
export const bereavement_memorial_attendees = pgTable('bereavement_memorial_attendees', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  memorial_service_id: bigint('memorial_service_id', { mode: 'number' }).references(() => bereavement_memorial_services.id).notNull(),
  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id),
  bereavement_contact_id: bigint('bereavement_contact_id', { mode: 'number' }).references(() => bereavement_contacts.id),

  // Attendee info (may not always be linked to bereavement contacts)
  attendee_name: varchar('attendee_name', { length: 255 }),
  attendee_email: varchar('attendee_email', { length: 255 }),
  attendee_phone: varchar('attendee_phone', { length: 50 }),
  relationship_to_deceased: varchar('relationship_to_deceased', { length: 100 }),
  patient_remembered: varchar('patient_remembered', { length: 255 }), // Name of the patient being remembered

  // Registration
  registration_date: date('registration_date'),
  guest_count: integer('guest_count').default(1), // Number of guests attending with this person

  // Special requests
  special_requests: text('special_requests'),
  accessibility_needs: text('accessibility_needs'),
  dietary_restrictions: text('dietary_restrictions'),

  // Attendance
  rsvp_status: varchar('rsvp_status', { length: 50 }).default('PENDING'), // PENDING, CONFIRMED, DECLINED, WAITLIST
  attended: boolean('attended'),
  attendance_notes: text('attendance_notes'),

  // Feedback
  provided_feedback: boolean('provided_feedback').default(false),
  feedback: text('feedback'),
  feedback_date: date('feedback_date'),

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
 * Bereavement Documents Table
 * Tracks document attachments for bereavement cases (death certificates, service agreements, correspondence)
 */
export const bereavement_documents = pgTable('bereavement_documents', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id).notNull(),

  // Document details
  document_type: varchar('document_type', { length: 100 }).notNull(), // DEATH_CERTIFICATE, SERVICE_AGREEMENT, CORRESPONDENCE, CONSENT_FORM, ASSESSMENT_FORM, OTHER
  document_name: varchar('document_name', { length: 255 }).notNull(),
  document_description: text('document_description'),

  // File information
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_path: text('file_path').notNull(), // Storage path or S3 key
  file_size: integer('file_size'), // Size in bytes
  file_type: varchar('file_type', { length: 100 }), // MIME type (application/pdf, image/jpeg, etc.)

  // Document metadata
  document_date: date('document_date'), // Date on the document (e.g., death date on certificate)
  effective_date: date('effective_date'), // When the document becomes effective
  expiration_date: date('expiration_date'), // When the document expires (if applicable)

  // Status and workflow
  document_status: varchar('document_status', { length: 50 }).default('PENDING').notNull(), // PENDING, VERIFIED, APPROVED, REJECTED, ARCHIVED
  verification_date: date('verification_date'),
  verified_by_id: text('verified_by_id').references(() => users.id),
  verification_notes: text('verification_notes'),

  // Related entities
  bereavement_contact_id: bigint('bereavement_contact_id', { mode: 'number' }).references(() => bereavement_contacts.id),

  // Access control
  is_confidential: boolean('is_confidential').default(false),
  access_restrictions: jsonb('access_restrictions'), // JSON object with access rules

  // Version control
  version: integer('version').default(1),
  parent_document_id: bigint('parent_document_id', { mode: 'number' }), // For document revisions

  // Notes
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  uploaded_by_id: text('uploaded_by_id').references(() => users.id),
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Bereavement Audit Log Table
 * Tracks all modifications to bereavement cases for HIPAA compliance
 */
export const bereavement_audit_log = pgTable('bereavement_audit_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  bereavement_case_id: bigint('bereavement_case_id', { mode: 'number' }).references(() => bereavement_cases.id).notNull(),

  // Action details
  action_type: varchar('action_type', { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, VIEW, EXPORT, STATUS_CHANGE, ASSIGNMENT_CHANGE
  entity_type: varchar('entity_type', { length: 100 }).notNull(), // bereavement_cases, bereavement_contacts, bereavement_documents, etc.
  entity_id: bigint('entity_id', { mode: 'number' }),

  // Change tracking
  field_name: varchar('field_name', { length: 255 }), // The field that was changed (for UPDATE actions)
  old_value: text('old_value'), // Previous value (JSON stringified for complex types)
  new_value: text('new_value'), // New value (JSON stringified for complex types)
  changes_summary: jsonb('changes_summary'), // JSON object with all changes in a single update

  // User and session info
  user_id: text('user_id').references(() => users.id).notNull(),
  user_name: varchar('user_name', { length: 255 }),
  user_role: varchar('user_role', { length: 100 }),
  ip_address: varchar('ip_address', { length: 45 }), // IPv6 support
  user_agent: text('user_agent'),
  session_id: varchar('session_id', { length: 255 }),

  // Additional context
  reason: text('reason'), // Reason for the change (optional)
  additional_context: jsonb('additional_context'), // Any additional context

  // Timestamp
  action_timestamp: timestamp('action_timestamp').defaultNow().notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull()
});
