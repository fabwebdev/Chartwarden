import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, date, integer, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';
import { notice_of_election } from './billing.schema.js';

// ============================================================================
// CERTIFICATIONS MODULE TABLES
// ============================================================================
// Medicare certification periods and Face-to-Face encounters
// COMPLIANCE: Required for Medicare reimbursement
// ============================================================================

/**
 * Certifications - Medicare certification periods
 * Required for Medicare reimbursement
 * Types: INITIAL_90 (first 90 days), SUBSEQUENT_90, SUBSEQUENT_60
 */
export const certifications = pgTable('certifications', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Certification period details
  certification_period: varchar('certification_period', { length: 50 }).notNull(), // INITIAL_90, SUBSEQUENT_90, SUBSEQUENT_60
  certification_status: varchar('certification_status', { length: 50 }).default('PENDING').notNull(), // PENDING, ACTIVE, COMPLETED, EXPIRED, REVOKED

  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),

  // Clinical documentation (required for Medicare)
  terminal_illness_narrative: text('terminal_illness_narrative').notNull(),
  clinical_progression: text('clinical_progression'),
  decline_indicators: text('decline_indicators'),

  // Physician signature (21 CFR Part 11 compliance)
  physician_signature: jsonb('physician_signature'),

  // Compliance tracking (CMS 2-day certification requirement)
  certification_due_date: date('certification_due_date'), // Start date + 2 days
  certification_completed_date: date('certification_completed_date'),
  certification_timeliness: varchar('certification_timeliness', { length: 50 }), // TIMELY, LATE
  days_late: integer('days_late'),

  // Link to Notice of Election
  noe_id: bigint('noe_id', { mode: 'number' }).references(() => notice_of_election.id),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'), // Soft delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // TICKET #019: Performance indexes for certifications table
  // Single column indexes for foreign keys and frequently queried columns
  patientIdx: index('idx_certifications_patient_id').on(table.patient_id),
  periodIdx: index('idx_certifications_period').on(table.certification_period),
  statusIdx: index('idx_certifications_status').on(table.certification_status),
  startDateIdx: index('idx_certifications_start_date').on(table.start_date),
  endDateIdx: index('idx_certifications_end_date').on(table.end_date),
  dueDateIdx: index('idx_certifications_due_date').on(table.certification_due_date),

  // Composite indexes for common query patterns
  // Most queries filter by patient_id + status
  patientStatusIdx: index('idx_certifications_patient_status')
    .on(table.patient_id, table.certification_status),

  // Compliance queries filter by patient + period type
  patientPeriodIdx: index('idx_certifications_patient_period')
    .on(table.patient_id, table.certification_period),

  // Overdue certification queries filter by status + due_date
  statusDueDateIdx: index('idx_certifications_status_due_date')
    .on(table.certification_status, table.certification_due_date),
}));

/**
 * Face-to-Face Encounters
 * Required within 30 days prior to recertification for Medicare
 * Must be performed by physician, NP, or PA
 */
export const face_to_face_encounters = pgTable('face_to_face_encounters', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  certification_id: bigint('certification_id', { mode: 'number' }).references(() => certifications.id),

  // Encounter details
  encounter_date: date('encounter_date').notNull(),
  performed_by_id: text('performed_by_id').references(() => users.id),
  performed_by_name: varchar('performed_by_name', { length: 255 }),
  performed_by_type: varchar('performed_by_type', { length: 50 }), // PHYSICIAN, NP, PA

  // Visit information
  visit_type: varchar('visit_type', { length: 50 }), // IN_PERSON, TELEHEALTH
  findings: text('findings').notNull(),
  terminal_prognosis_confirmed: boolean('terminal_prognosis_confirmed').default(true),

  // Attestation (can be signed by hospice physician if not performed by attending)
  attestation: jsonb('attestation'),
  attestation_date: date('attestation_date'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Orders - Physician orders for medications, treatments, DME, etc.
 * Required for all patient care interventions
 */
export const orders = pgTable('orders', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Order details
  order_type: varchar('order_type', { length: 50 }).notNull(), // MEDICATION, TREATMENT, DME, LABORATORY, IMAGING, CONSULTATION, etc.
  order_status: varchar('order_status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, COMPLETED, DISCONTINUED, EXPIRED, PENDING
  order_priority: varchar('order_priority', { length: 50 }), // ROUTINE, URGENT, STAT

  order_description: text('order_description').notNull(),
  start_date: date('start_date').notNull(),
  end_date: date('end_date'),

  // Ordering provider
  ordered_by_id: text('ordered_by_id').references(() => users.id),
  physician_signature: jsonb('physician_signature'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Verbal Orders Tracking
 * CMS requires verbal orders to be signed within 48 hours
 * Tracks read-back verification and signature collection
 */
export const verbal_orders_tracking = pgTable('verbal_orders_tracking', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  order_id: bigint('order_id', { mode: 'number' }).references(() => orders.id).notNull(),

  // Order reception details
  received_by_id: text('received_by_id').references(() => users.id),
  received_date: timestamp('received_date').notNull(),
  physician_name: varchar('physician_name', { length: 255 }),

  // Read-back verification (safety requirement)
  read_back_verified: boolean('read_back_verified').default(false),

  // Signature tracking (48-hour requirement)
  written_signature_obtained: boolean('written_signature_obtained').default(false),
  signature_obtained_date: date('signature_obtained_date'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Recertification Schedule
 * Tracks upcoming recertification due dates and Face-to-Face requirements
 * Used for alerts and compliance tracking
 */
export const recertification_schedule = pgTable('recertification_schedule', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Recertification timing
  next_recertification_date: date('next_recertification_date').notNull(),
  certification_period_type: varchar('certification_period_type', { length: 50 }), // INITIAL_90, SUBSEQUENT_90, SUBSEQUENT_60

  // Face-to-Face tracking
  f2f_required: boolean('f2f_required').default(false),
  f2f_due_date: date('f2f_due_date'), // 30 days before recertification
  f2f_completed: boolean('f2f_completed').default(false),

  // Alert tracking
  alert_sent: boolean('alert_sent').default(false),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
