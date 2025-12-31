import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

// ============================================================================
// HOPE ASSESSMENTS TABLES
// ============================================================================
// Hospice Outcomes & Patient Evaluation (HOPE) - CMS requirement
// Non-compliance can result in 4% Medicare payment reduction
// ============================================================================

/**
 * HOPE Assessments - Main assessment table
 * Types: ADMISSION (within 5 days), HUV1 (days 6-15), HUV2 (days 16-30), DISCHARGE, SFV (symptom follow-up)
 */
export const hope_assessments = pgTable('hope_assessments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Assessment metadata
  assessment_type: varchar('assessment_type', { length: 50 }).notNull(), // ADMISSION, HUV1, HUV2, DISCHARGE, SYMPTOM_FOLLOWUP
  assessment_status: varchar('assessment_status', { length: 50 }).default('NOT_STARTED').notNull(), // NOT_STARTED, IN_PROGRESS, COMPLETED, SIGNED, SUBMITTED, ACCEPTED, REJECTED, OVERDUE
  assessment_date: timestamp('assessment_date').notNull(),
  due_date: timestamp('due_date'), // Calculated based on type
  completed_date: timestamp('completed_date'),

  // Patient demographics (required for HOPE)
  patient_age: integer('patient_age'),
  patient_gender: varchar('patient_gender', { length: 20 }),
  patient_race: varchar('patient_race', { length: 100 }),
  patient_ethnicity: varchar('patient_ethnicity', { length: 100 }),
  primary_diagnosis: text('primary_diagnosis'),

  // Caregiver availability assessment
  caregiver_available: boolean('caregiver_available'),
  caregiver_relationship: varchar('caregiver_relationship', { length: 100 }),
  caregiver_assessment: text('caregiver_assessment'),
  caregiver_hours_per_week: integer('caregiver_hours_per_week'),

  // Functional status (0-6 scale: 0=Independent, 6=Total dependence)
  functional_self_care: jsonb('functional_self_care'),

  functional_mobility: jsonb('functional_mobility'),

  // Cognitive status (BIMS - Brief Interview for Mental Status)
  cognitive_status: varchar('cognitive_status', { length: 50 }), // INTACT, BORDERLINE_INTACT, MODERATELY_IMPAIRED, SEVERELY_IMPAIRED
  bims_score: integer('bims_score'), // 0-15 scale
  bims_details: jsonb('bims_details'),

  // Mood (PHQ-2)
  phq2_little_interest: integer('phq2_little_interest'), // 0-3 scale
  phq2_feeling_down: integer('phq2_feeling_down'), // 0-3 scale
  phq2_total_score: integer('phq2_total_score'), // 0-6

  // Pain assessment
  pain_present: boolean('pain_present'),
  pain_severity: varchar('pain_severity', { length: 50 }), // NONE, MILD, MODERATE, SEVERE, VERY_SEVERE
  pain_frequency: varchar('pain_frequency', { length: 50 }), // NEVER, RARELY, OCCASIONALLY, FREQUENTLY, ALMOST_CONSTANTLY
  pain_interference: integer('pain_interference'), // 0-10 scale

  // Symptom assessment (ESAS - Edmonton Symptom Assessment System style)
  symptoms: jsonb('symptoms'),

  // SFV trigger tracking (for moderate/severe symptoms requiring follow-up within 48hrs)
  sfv_triggered: boolean('sfv_triggered').default(false),
  sfv_trigger_date: timestamp('sfv_trigger_date'),
  sfv_trigger_symptoms: text('sfv_trigger_symptoms'), // CSV of symptoms that triggered SFV

  // Comprehensive assessment sections
  spiritual_assessment: text('spiritual_assessment'),
  cultural_assessment: text('cultural_assessment'),
  social_assessment: text('social_assessment'),
  safety_assessment: text('safety_assessment'),
  environment_assessment: text('environment_assessment'),

  // Goals of care
  goals_of_care: text('goals_of_care'),
  advance_directives_status: varchar('advance_directives_status', { length: 100 }),
  code_status: varchar('code_status', { length: 50 }),

  // Clinical notes
  clinical_notes: text('clinical_notes'),
  recommendations: text('recommendations'),

  // Signature (21 CFR Part 11 compliance)
  signature: jsonb('signature'),

  // Submission tracking
  submitted_to_iqies: boolean('submitted_to_iqies').default(false),
  submission_id: varchar('submission_id', { length: 100 }),
  submission_date: timestamp('submission_date'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // TICKET #019: Performance indexes for HOPE assessments table
  // Single column indexes for foreign keys and frequently queried columns
  patientIdx: index('idx_hope_assessments_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_hope_assessments_assessment_date').on(table.assessment_date),
  assessmentTypeIdx: index('idx_hope_assessments_type').on(table.assessment_type),
  statusIdx: index('idx_hope_assessments_status').on(table.assessment_status),
  dueDateIdx: index('idx_hope_assessments_due_date').on(table.due_date),

  // Composite indexes for common query patterns
  // Most queries filter by patient_id + assessment_date
  patientDateIdx: index('idx_hope_assessments_patient_date')
    .on(table.patient_id, table.assessment_date),

  // Compliance queries filter by patient + type + status
  patientTypeStatusIdx: index('idx_hope_assessments_patient_type_status')
    .on(table.patient_id, table.assessment_type, table.assessment_status),

  // Overdue assessment queries filter by status + due_date
  statusDueDateIdx: index('idx_hope_assessments_status_due_date')
    .on(table.assessment_status, table.due_date),

  // SFV trigger queries
  sfvTriggeredIdx: index('idx_hope_assessments_sfv_triggered')
    .on(table.sfv_triggered, table.sfv_trigger_date),
}));

/**
 * HOPE Submissions - Tracks submissions to iQIES (CMS system)
 */
export const hope_submissions = pgTable('hope_submissions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  hope_assessment_id: bigint('hope_assessment_id', { mode: 'number' }).references(() => hope_assessments.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Submission details
  submission_date: timestamp('submission_date').notNull(),
  submission_type: varchar('submission_type', { length: 50 }).notNull(), // INITIAL, CORRECTION, DELETION
  submission_status: varchar('submission_status', { length: 50 }).default('PENDING').notNull(), // PENDING, SUBMITTED, ACCEPTED, REJECTED

  // iQIES tracking
  iqies_submission_id: varchar('iqies_submission_id', { length: 255 }),
  iqies_tracking_number: varchar('iqies_tracking_number', { length: 255 }),
  iqies_response_date: timestamp('iqies_response_date'),
  iqies_response_code: varchar('iqies_response_code', { length: 50 }),
  iqies_response_message: text('iqies_response_message'),

  // Submission payload
  submission_payload: jsonb('submission_payload'), // Full HOPE data submitted
  response_payload: jsonb('response_payload'), // iQIES response

  // Error tracking
  error_code: varchar('error_code', { length: 50 }),
  error_message: text('error_message'),
  error_details: jsonb('error_details'),

  // Retry tracking
  retry_count: integer('retry_count').default(0),
  last_retry_date: timestamp('last_retry_date'),
  next_retry_date: timestamp('next_retry_date'),

  // Audit fields
  submitted_by_id: text('submitted_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * HOPE Compliance Metrics - Tracks compliance with 90% threshold requirement
 */
export const hope_compliance_metrics = pgTable('hope_compliance_metrics', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Reporting period
  reporting_period_start: timestamp('reporting_period_start').notNull(),
  reporting_period_end: timestamp('reporting_period_end').notNull(),
  reporting_year: integer('reporting_year').notNull(),
  reporting_quarter: integer('reporting_quarter'), // 1-4

  // Assessment type metrics
  assessment_type: varchar('assessment_type', { length: 50 }).notNull(), // ADMISSION, HUV1, HUV2, DISCHARGE, SYMPTOM_FOLLOWUP

  // Compliance calculations
  total_required: integer('total_required').notNull(),
  total_completed: integer('total_completed').notNull(),
  total_completed_timely: integer('total_completed_timely').notNull(),
  total_overdue: integer('total_overdue').notNull(),
  total_missing: integer('total_missing').notNull(),

  // Compliance rates
  completion_rate: integer('completion_rate'), // Percentage (0-100)
  timeliness_rate: integer('timeliness_rate'), // Percentage (0-100)
  compliance_rate: integer('compliance_rate'), // Percentage (0-100) - must be >= 90%

  // Penalty tracking
  meets_threshold: boolean('meets_threshold').default(false), // True if >= 90%
  penalty_applied: boolean('penalty_applied').default(false),
  penalty_amount: integer('penalty_amount'), // 4% reduction if non-compliant

  // Breakdown by status
  status_breakdown: jsonb('status_breakdown'),

  // Notes
  notes: text('notes'),
  action_plan: text('action_plan'),

  // Audit fields
  calculated_by_id: text('calculated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * HOPE Symptom Tracking - Tracks symptoms for SFV triggers
 * SFV (Symptom Follow-up Visit) required within 48hrs of moderate/severe symptoms
 */
export const hope_symptom_tracking = pgTable('hope_symptom_tracking', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  hope_assessment_id: bigint('hope_assessment_id', { mode: 'number' }).references(() => hope_assessments.id),

  // Symptom details
  symptom_name: varchar('symptom_name', { length: 100 }).notNull(), // dyspnea, nausea, pain, etc.
  symptom_severity: varchar('symptom_severity', { length: 50 }).notNull(), // NONE, MILD, MODERATE, SEVERE, VERY_SEVERE
  symptom_frequency: varchar('symptom_frequency', { length: 50 }), // NEVER, RARELY, OCCASIONALLY, FREQUENTLY, ALMOST_CONSTANTLY
  symptom_date: timestamp('symptom_date').notNull(),

  // SFV trigger tracking
  triggers_sfv: boolean('triggers_sfv').default(false), // True if moderate or severe
  sfv_required_by: timestamp('sfv_required_by'), // 48 hours from symptom_date
  sfv_completed: boolean('sfv_completed').default(false),
  sfv_completed_date: timestamp('sfv_completed_date'),
  sfv_assessment_id: bigint('sfv_assessment_id', { mode: 'number' }).references(() => hope_assessments.id),

  // Symptom resolution
  resolved: boolean('resolved').default(false),
  resolved_date: timestamp('resolved_date'),
  resolution_notes: text('resolution_notes'),

  // Clinical notes
  assessment_notes: text('assessment_notes'),
  interventions: text('interventions'),

  // Audit fields
  reported_by_id: text('reported_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
