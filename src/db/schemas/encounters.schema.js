import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, decimal, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

// ============================================================================
// ENCOUNTERS TABLES
// ============================================================================
// Clinical encounter documentation - CRITICAL for billing
// Supports SOAP notes, vital signs, assessments, and interventions
// ============================================================================

/**
 * Encounters - Main clinical encounter/visit documentation
 * Required for billing and regulatory compliance
 */
export const encounters = pgTable('encounters', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Encounter metadata
  encounter_type: varchar('encounter_type', { length: 50 }).notNull(), // ADMISSION_VISIT, ROUTINE_VISIT, PRN_VISIT, etc.
  encounter_status: varchar('encounter_status', { length: 50 }).default('SCHEDULED').notNull(), // SCHEDULED, IN_PROGRESS, COMPLETED, UNSIGNED, SIGNED, COSIGNED, AMENDED, CANCELLED
  encounter_date: timestamp('encounter_date').notNull(),
  encounter_duration_minutes: integer('encounter_duration_minutes'),

  // Visit information
  visit_location: varchar('visit_location', { length: 100 }), // PATIENT_HOME, ASSISTED_LIVING_FACILITY, NURSING_HOME, etc.
  visit_address: text('visit_address'),
  discipline: varchar('discipline', { length: 50 }).notNull(), // REGISTERED_NURSE, SOCIAL_WORKER, CHAPLAIN, etc.

  // Staff information
  staff_id: text('staff_id').references(() => users.id),
  staff_name: varchar('staff_name', { length: 255 }),
  staff_credentials: varchar('staff_credentials', { length: 100 }),
  cosigner_id: text('cosigner_id').references(() => users.id),
  cosigner_name: varchar('cosigner_name', { length: 255 }),

  // GPS check-in/out (for visit verification)
  gps_check_in: jsonb('gps_check_in'),
  gps_check_out: jsonb('gps_check_out'),

  // SOAP Documentation
  subjective: text('subjective'), // Patient's report, symptoms, complaints
  objective: text('objective'), // Clinical findings, observations
  assessment: text('assessment'), // Clinical assessment, diagnoses
  plan: text('plan'), // Treatment plan, interventions

  // Vital signs (embedded for convenience, can also reference vital_signs table)
  vital_signs: jsonb('vital_signs'),

  // Pain assessment
  pain_assessment: jsonb('pain_assessment'),

  // Symptom assessment
  symptoms: jsonb('symptoms'),

  // Interventions performed
  interventions: text('interventions'),
  medications_administered: jsonb('medications_administered'),

  // Patient education
  patient_education: text('patient_education'),
  education_topics: jsonb('education_topics'),
  patient_understanding: varchar('patient_understanding', { length: 50 }), // GOOD, FAIR, POOR

  // Caregiver assessment
  caregiver_present: boolean('caregiver_present'),
  caregiver_name: varchar('caregiver_name', { length: 255 }),
  caregiver_assessment: text('caregiver_assessment'),
  caregiver_education: text('caregiver_education'),
  caregiver_coping: varchar('caregiver_coping', { length: 50 }), // COPING_WELL, STRUGGLING, etc.

  // Psychosocial/spiritual assessment
  emotional_status: text('emotional_status'),
  spiritual_concerns: text('spiritual_concerns'),
  social_concerns: text('social_concerns'),

  // Safety assessment
  safety_concerns: text('safety_concerns'),
  fall_risk: varchar('fall_risk', { length: 50 }), // LOW, MODERATE, HIGH
  skin_integrity: text('skin_integrity'),

  // Environment assessment
  environment_assessment: text('environment_assessment'),
  home_safety_issues: text('home_safety_issues'),

  // Communication
  communication_with_physician: text('communication_with_physician'),
  communication_with_team: text('communication_with_team'),
  orders_received: text('orders_received'),

  // Clinical notes
  clinical_notes: text('clinical_notes'),
  follow_up_needed: text('follow_up_needed'),
  recommendations: text('recommendations'),

  // Attachments
  attachments: jsonb('attachments'),

  // Signature (21 CFR Part 11 compliance)
  signature: jsonb('signature'),

  // Cosignature (for students, new staff, etc.)
  cosignature: jsonb('cosignature'),

  // Amendment tracking
  amended: boolean('amended').default(false),
  amendment_count: integer('amendment_count').default(0),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'), // Soft delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // TICKET #019: Performance indexes for encounters table
  // Single column indexes for foreign keys and frequently queried columns
  patientIdx: index('idx_encounters_patient_id').on(table.patient_id),
  encounterDateIdx: index('idx_encounters_encounter_date').on(table.encounter_date),
  staffIdx: index('idx_encounters_staff_id').on(table.staff_id),
  statusIdx: index('idx_encounters_status').on(table.encounter_status),
  disciplineIdx: index('idx_encounters_discipline').on(table.discipline),

  // Composite indexes for common query patterns
  // Most queries filter by patient_id + encounter_date (e.g., "show encounters for patient in date range")
  patientDateIdx: index('idx_encounters_patient_date')
    .on(table.patient_id, table.encounter_date),

  // Queries often filter by patient + status
  patientStatusIdx: index('idx_encounters_patient_status')
    .on(table.patient_id, table.encounter_status),

  // Billing queries filter by staff + date
  staffDateIdx: index('idx_encounters_staff_date')
    .on(table.staff_id, table.encounter_date),
}));

/**
 * Encounter Addendums - Additional information added after signing
 * Addendums add new information without changing original content
 */
export const encounter_addendums = pgTable('encounter_addendums', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  encounter_id: bigint('encounter_id', { mode: 'number' }).references(() => encounters.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Addendum details
  addendum_date: timestamp('addendum_date').notNull(),
  addendum_reason: varchar('addendum_reason', { length: 255 }),
  addendum_content: text('addendum_content').notNull(),

  // Added by
  added_by_id: text('added_by_id').references(() => users.id),
  added_by_name: varchar('added_by_name', { length: 255 }),

  // Signature
  signature: jsonb('signature'),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Encounter Amendments - Corrections to original content
 * Amendments modify existing information, maintaining audit trail
 */
export const encounter_amendments = pgTable('encounter_amendments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  encounter_id: bigint('encounter_id', { mode: 'number' }).references(() => encounters.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Amendment details
  amendment_date: timestamp('amendment_date').notNull(),
  amendment_reason: varchar('amendment_reason', { length: 255 }).notNull(),
  field_amended: varchar('field_amended', { length: 100 }).notNull(), // Which field was changed
  original_value: text('original_value'), // Original content
  amended_value: text('amended_value'), // New content
  amendment_notes: text('amendment_notes'),

  // Amended by
  amended_by_id: text('amended_by_id').references(() => users.id),
  amended_by_name: varchar('amended_by_name', { length: 255 }),

  // Signature
  signature: jsonb('signature'),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Encounter Templates - Reusable templates for common encounter types
 * Helps standardize documentation and improve efficiency
 */
export const encounter_templates = pgTable('encounter_templates', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Template metadata
  template_name: varchar('template_name', { length: 255 }).notNull(),
  template_description: text('template_description'),
  encounter_type: varchar('encounter_type', { length: 50 }), // ROUTINE_VISIT, ADMISSION_VISIT, etc.
  discipline: varchar('discipline', { length: 50 }), // REGISTERED_NURSE, SOCIAL_WORKER, etc.

  // Template content
  template_content: jsonb('template_content'),

  // Template settings
  is_active: boolean('is_active').default(true),
  is_default: boolean('is_default').default(false),
  use_count: integer('use_count').default(0),

  // Sharing settings
  is_public: boolean('is_public').default(false), // Available to all staff
  created_by_id: text('created_by_id').references(() => users.id),
  shared_with_disciplines: jsonb('shared_with_disciplines'),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
