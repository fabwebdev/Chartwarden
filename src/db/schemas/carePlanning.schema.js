import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

// ============================================================================
// CARE PLANNING TABLES
// ============================================================================
// Patient-centered care planning - CRITICAL Medicare requirement
// Supports interdisciplinary approach to hospice care
// ============================================================================

/**
 * Care Plans - Main care plan documentation
 * Medicare requirement for all hospice patients
 */
export const care_plans = pgTable('care_plans', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Care plan metadata
  care_plan_status: varchar('care_plan_status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, ACTIVE, REVISED, INACTIVE, ARCHIVED, PENDING_SIGNATURE, SIGNED
  version: integer('version').default(1).notNull(),
  effective_date: date('effective_date').notNull(),
  review_date: date('review_date'),
  next_review_date: date('next_review_date'),

  // Patient/family goals
  patient_goals: text('patient_goals'),
  family_goals: text('family_goals'),
  goals_of_care: text('goals_of_care'),

  // Hospice philosophy of care
  philosophy_of_care: text('philosophy_of_care'),
  approach_to_care: text('approach_to_care'),

  // IDG team members
  team_members: jsonb('team_members'),

  // Advance directives
  advance_directives_on_file: boolean('advance_directives_on_file'),
  advance_directive_types: jsonb('advance_directive_types'),
  code_status: varchar('code_status', { length: 50 }),
  dnr_status: varchar('dnr_status', { length: 50 }),

  // Bereavement plan
  bereavement_plan: text('bereavement_plan'),
  bereavement_risk_level: varchar('bereavement_risk_level', { length: 50 }),

  // Volunteer services
  volunteer_services: text('volunteer_services'),
  volunteer_hours_weekly: integer('volunteer_hours_weekly'),

  // Clinical summary
  clinical_summary: text('clinical_summary'),
  prognosis: text('prognosis'),
  terminal_diagnosis: text('terminal_diagnosis'),
  related_diagnoses: jsonb('related_diagnoses'),

  // Functional status summary
  functional_status_summary: text('functional_status_summary'),
  mobility_status: varchar('mobility_status', { length: 100 }),
  cognitive_status: varchar('cognitive_status', { length: 100 }),

  // Pain and symptom management approach
  pain_management_approach: text('pain_management_approach'),
  symptom_management_approach: text('symptom_management_approach'),

  // Psychosocial and spiritual care
  psychosocial_plan: text('psychosocial_plan'),
  spiritual_plan: text('spiritual_plan'),
  cultural_considerations: text('cultural_considerations'),

  // Safety plan
  safety_plan: text('safety_plan'),
  fall_prevention: text('fall_prevention'),
  infection_control: text('infection_control'),

  // Equipment and supplies
  dme_plan: text('dme_plan'),
  supplies_needed: text('supplies_needed'),

  // Discharge planning
  discharge_planning: text('discharge_planning'),
  discharge_criteria: text('discharge_criteria'),

  // Overall plan summary
  plan_summary: text('plan_summary'),
  special_instructions: text('special_instructions'),

  // Signatures (21 CFR Part 11 compliance)
  physician_signature: jsonb('physician_signature'),

  rn_signature: jsonb('rn_signature'),

  patient_signature: jsonb('patient_signature'),

  // Recertification
  recertification_date: date('recertification_date'),
  recertified_by_id: text('recertified_by_id').references(() => users.id),

  // Revision tracking
  previous_version_id: bigint('previous_version_id', { mode: 'number' }).references(() => care_plans.id),
  revision_reason: text('revision_reason'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Problems - Patient problems/needs identified
 */
export const problems = pgTable('problems', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  care_plan_id: bigint('care_plan_id', { mode: 'number' }).references(() => care_plans.id),

  // Problem details
  problem_category: varchar('problem_category', { length: 50 }).notNull(), // PHYSICAL, PSYCHOLOGICAL, SOCIAL, SPIRITUAL, ENVIRONMENTAL, CAREGIVER
  problem_description: text('problem_description').notNull(),
  problem_status: varchar('problem_status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, RESOLVED, ONGOING, WORSENING, IMPROVING, STABLE
  problem_priority: varchar('problem_priority', { length: 50 }).default('MEDIUM'), // HIGH, MEDIUM, LOW

  // Clinical information
  onset_date: date('onset_date'),
  identified_date: date('identified_date').notNull(),
  resolved_date: date('resolved_date'),
  etiology: text('etiology'),
  signs_symptoms: text('signs_symptoms'),

  // Related information
  related_diagnoses: text('related_diagnoses'),
  contributing_factors: text('contributing_factors'),

  // Discipline responsible
  primary_discipline: varchar('primary_discipline', { length: 50 }),
  identified_by_id: text('identified_by_id').references(() => users.id),

  // Notes
  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Goals - Patient-centered goals
 */
export const goals = pgTable('goals', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  care_plan_id: bigint('care_plan_id', { mode: 'number' }).references(() => care_plans.id),
  problem_id: bigint('problem_id', { mode: 'number' }).references(() => problems.id),

  // Goal details
  goal_description: text('goal_description').notNull(),
  goal_status: varchar('goal_status', { length: 50 }).default('NOT_STARTED').notNull(), // NOT_STARTED, IN_PROGRESS, ACHIEVED, PARTIALLY_ACHIEVED, NOT_ACHIEVED, DISCONTINUED, REVISED
  progress_level: varchar('progress_level', { length: 50 }), // NO_PROGRESS, MINIMAL_PROGRESS, MODERATE_PROGRESS, SIGNIFICANT_PROGRESS, GOAL_ACHIEVED, REGRESSION

  // Timeframe
  target_date: date('target_date'),
  start_date: date('start_date'),
  achieved_date: date('achieved_date'),
  discontinued_date: date('discontinued_date'),

  // Measurement
  measurable_outcome: text('measurable_outcome'),
  outcome_criteria: text('outcome_criteria'),
  evaluation_method: text('evaluation_method'),

  // Progress notes
  progress_notes: text('progress_notes'),
  barriers_to_achievement: text('barriers_to_achievement'),
  modifications_needed: text('modifications_needed'),

  // Responsibility
  primary_discipline: varchar('primary_discipline', { length: 50 }),
  responsible_staff_id: text('responsible_staff_id').references(() => users.id),

  // Patient/family involvement
  patient_agreement: boolean('patient_agreement'),
  family_agreement: boolean('family_agreement'),

  // Revision tracking
  revised: boolean('revised').default(false),
  revision_reason: text('revision_reason'),
  previous_version_id: bigint('previous_version_id', { mode: 'number' }).references(() => goals.id),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Interventions - Actions to address problems and achieve goals
 */
export const interventions = pgTable('interventions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  care_plan_id: bigint('care_plan_id', { mode: 'number' }).references(() => care_plans.id),
  problem_id: bigint('problem_id', { mode: 'number' }).references(() => problems.id),
  goal_id: bigint('goal_id', { mode: 'number' }).references(() => goals.id),

  // Intervention details
  intervention_category: varchar('intervention_category', { length: 50 }).notNull(), // NURSING, PHYSICIAN, SOCIAL_WORK, SPIRITUAL, THERAPY, AIDE, VOLUNTEER, MEDICATION, DME, EDUCATION, COORDINATION
  intervention_description: text('intervention_description').notNull(),
  intervention_status: varchar('intervention_status', { length: 50 }).default('PLANNED').notNull(), // PLANNED, IN_PROGRESS, COMPLETED, DISCONTINUED, ON_HOLD

  // Frequency and duration
  frequency: varchar('frequency', { length: 100 }), // e.g., "3x weekly", "daily", "PRN"
  duration: varchar('duration', { length: 100 }), // e.g., "30 minutes", "ongoing"
  start_date: date('start_date'),
  end_date: date('end_date'),

  // Discipline and responsibility
  discipline: varchar('discipline', { length: 50 }).notNull(),
  responsible_staff_id: text('responsible_staff_id').references(() => users.id),
  requires_order: boolean('requires_order').default(false),
  order_obtained: boolean('order_obtained').default(false),

  // Rationale and expected outcome
  rationale: text('rationale'),
  expected_outcome: text('expected_outcome'),
  patient_response: text('patient_response'),

  // Implementation tracking
  last_performed_date: date('last_performed_date'),
  next_scheduled_date: date('next_scheduled_date'),
  times_performed: integer('times_performed').default(0),

  // Effectiveness evaluation
  effectiveness_rating: varchar('effectiveness_rating', { length: 50 }), // VERY_EFFECTIVE, EFFECTIVE, SOMEWHAT_EFFECTIVE, NOT_EFFECTIVE
  evaluation_notes: text('evaluation_notes'),

  // Patient education related
  education_provided: boolean('education_provided').default(false),
  education_topics: jsonb('education_topics'),
  patient_understanding: varchar('patient_understanding', { length: 50 }),

  // Special instructions
  special_instructions: text('special_instructions'),
  precautions: text('precautions'),

  // Discontinuation
  discontinued_date: date('discontinued_date'),
  discontinuation_reason: text('discontinuation_reason'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Care Plan Revisions - Track changes to care plans
 */
export const care_plan_revisions = pgTable('care_plan_revisions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  care_plan_id: bigint('care_plan_id', { mode: 'number' }).references(() => care_plans.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Revision details
  revision_date: date('revision_date').notNull(),
  revision_number: integer('revision_number').notNull(),
  revision_type: varchar('revision_type', { length: 50 }).notNull(), // MAJOR_REVISION, MINOR_REVISION, RECERTIFICATION, SCHEDULED_REVIEW, UNSCHEDULED_REVIEW
  revision_reason: text('revision_reason').notNull(),

  // What changed
  changes_summary: text('changes_summary'),
  problems_added: jsonb('problems_added'),
  problems_resolved: jsonb('problems_resolved'),
  goals_added: jsonb('goals_added'),
  goals_achieved: jsonb('goals_achieved'),
  interventions_added: jsonb('interventions_added'),
  interventions_discontinued: jsonb('interventions_discontinued'),

  // Clinical status changes
  change_in_condition: text('change_in_condition'),
  change_in_goals_of_care: text('change_in_goals_of_care'),
  new_orders: text('new_orders'),

  // Team input
  idg_review_date: date('idg_review_date'),
  idg_recommendations: text('idg_recommendations'),
  physician_input: text('physician_input'),
  patient_family_input: text('patient_family_input'),

  // Signatures
  revised_by_id: text('revised_by_id').references(() => users.id),
  revised_by_name: varchar('revised_by_name', { length: 255 }),
  signature: jsonb('signature'),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Care Plan Templates - Reusable templates for common diagnoses/conditions
 */
export const care_plan_templates = pgTable('care_plan_templates', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Template metadata
  template_name: varchar('template_name', { length: 255 }).notNull(),
  template_description: text('template_description'),
  diagnosis_category: varchar('diagnosis_category', { length: 100 }),
  icd10_codes: jsonb('icd10_codes'),

  // Template content
  template_content: jsonb('template_content'),

  // Template settings
  is_active: boolean('is_active').default(true),
  use_count: integer('use_count').default(0),
  is_public: boolean('is_public').default(false),

  // Sharing
  created_by_id: text('created_by_id').references(() => users.id),
  shared_with_roles: jsonb('shared_with_roles'),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
