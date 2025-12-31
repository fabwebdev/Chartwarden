import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, date, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';
import { orders } from './certifications.schema.js';

// ============================================================================
// MEDICATIONS MODULE TABLES
// ============================================================================
// Medication management, MAR, comfort kits, controlled substances
// COMPLIANCE: Clinical necessity and regulatory tracking
// ============================================================================

/**
 * Medications - Patient medication list
 * Tracks all medications (hospice-related and non-hospice)
 * Links to physician orders
 */
export const medications = pgTable('medications', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Medication identification
  medication_name: varchar('medication_name', { length: 255 }).notNull(),
  generic_name: varchar('generic_name', { length: 255 }),

  // Status and route
  medication_status: varchar('medication_status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, DISCONTINUED, COMPLETED, HELD, ON_HOLD
  medication_route: varchar('medication_route', { length: 50 }), // ORAL, IV, IM, SQ, RECTAL, TOPICAL, etc.

  // Dosing information
  dosage: varchar('dosage', { length: 100 }),
  frequency: varchar('frequency', { length: 100 }), // BID, TID, QID, PRN, etc.
  instructions: text('instructions'),

  // Timing
  start_date: date('start_date').notNull(),
  end_date: date('end_date'),
  discontinued_date: date('discontinued_date'),
  discontinuation_reason: text('discontinuation_reason'),

  // Controlled substance tracking
  controlled_schedule: varchar('controlled_schedule', { length: 50 }), // SCHEDULE_II, SCHEDULE_III, SCHEDULE_IV, SCHEDULE_V
  is_hospice_related: boolean('is_hospice_related').default(true),

  // Ordering information
  prescriber_id: text('prescriber_id').references(() => users.id),
  order_id: bigint('order_id', { mode: 'number' }).references(() => orders.id),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'), // Soft delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // TICKET #019: Performance indexes for medications table
  // Single column indexes for foreign keys and frequently queried columns
  patientIdx: index('idx_medications_patient_id').on(table.patient_id),
  statusIdx: index('idx_medications_status').on(table.medication_status),
  startDateIdx: index('idx_medications_start_date').on(table.start_date),
  prescriberIdx: index('idx_medications_prescriber_id').on(table.prescriber_id),

  // Composite indexes for common query patterns
  // Most queries filter by patient_id + status (e.g., "show active medications for patient")
  patientStatusIdx: index('idx_medications_patient_status')
    .on(table.patient_id, table.medication_status),

  // Queries often filter by patient + date range
  patientDateIdx: index('idx_medications_patient_date')
    .on(table.patient_id, table.start_date),
}));

/**
 * MAR Entries - Medication Administration Record
 * Documents each medication administration (given, refused, held, etc.)
 * Critical for compliance and continuity of care
 */
export const mar_entries = pgTable('mar_entries', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  medication_id: bigint('medication_id', { mode: 'number' }).references(() => medications.id).notNull(),

  // Timing
  scheduled_time: timestamp('scheduled_time').notNull(),
  actual_time: timestamp('actual_time'),

  // Administration details
  mar_status: varchar('mar_status', { length: 50 }).notNull(), // GIVEN, NOT_GIVEN, REFUSED, HELD, LATE, MISSED
  dosage_given: varchar('dosage_given', { length: 100 }),
  route_used: varchar('route_used', { length: 50 }),

  // Person who administered
  administered_by_id: text('administered_by_id').references(() => users.id),
  administered_by_name: varchar('administered_by_name', { length: 255 }),

  // Additional documentation
  reason_not_given: text('reason_not_given'), // Required if NOT_GIVEN, REFUSED, or HELD
  patient_response: text('patient_response'), // Patient's response to medication

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // TICKET #019: Performance indexes for MAR entries
  patientIdx: index('idx_mar_entries_patient_id').on(table.patient_id),
  medicationIdx: index('idx_mar_entries_medication_id').on(table.medication_id),
  scheduledTimeIdx: index('idx_mar_entries_scheduled_time').on(table.scheduled_time),
  statusIdx: index('idx_mar_entries_status').on(table.mar_status),

  // Composite indexes for common queries (patient + time range + status)
  patientTimeIdx: index('idx_mar_entries_patient_time')
    .on(table.patient_id, table.scheduled_time),
  medicationTimeIdx: index('idx_mar_entries_medication_time')
    .on(table.medication_id, table.scheduled_time),
}));

/**
 * Comfort Kits - Emergency medication kits
 * Pre-packaged medications for symptom management
 * Common in hospice for after-hours symptom control
 */
export const comfort_kits = pgTable('comfort_kits', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Kit identification
  kit_number: varchar('kit_number', { length: 50 }),
  issue_date: date('issue_date').notNull(),
  expiration_date: date('expiration_date'),

  // Status
  status: varchar('status', { length: 50 }).default('ACTIVE'), // ACTIVE, EXPIRED, DESTROYED, RETURNED

  // Kit contents (array of medications)
  medications: jsonb('medications'),

  // Location tracking
  location: varchar('location', { length: 255 }), // Where kit is stored (patient home, facility, etc.)

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Comfort Kit Usage Log
 * Tracks medication usage from comfort kits
 * Required for inventory and clinical documentation
 */
export const comfort_kit_usage_log = pgTable('comfort_kit_usage_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  comfort_kit_id: bigint('comfort_kit_id', { mode: 'number' }).references(() => comfort_kits.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Usage details
  medication_used: varchar('medication_used', { length: 255 }),
  quantity_used: varchar('quantity_used', { length: 100 }),

  usage_date: timestamp('usage_date').notNull(),
  usage_reason: text('usage_reason'), // Symptom being treated

  // Who administered
  administered_by_id: text('administered_by_id').references(() => users.id),
  administered_by_name: varchar('administered_by_name', { length: 255 }),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

/**
 * Controlled Substance Log
 * DEA-required tracking for Schedule II-V medications
 * Tracks dispensing, destruction, and returns
 */
export const controlled_substance_log = pgTable('controlled_substance_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  medication_id: bigint('medication_id', { mode: 'number' }).references(() => medications.id),

  // Log entry details
  log_date: timestamp('log_date').notNull(),
  action: varchar('action', { length: 50 }).notNull(), // DISPENSED, DESTROYED, RETURNED, WASTED

  // Medication details
  medication_name: varchar('medication_name', { length: 255 }),
  quantity: varchar('quantity', { length: 100 }),
  lot_number: varchar('lot_number', { length: 100 }),

  // Witness requirement (2-person verification)
  witness_id: text('witness_id').references(() => users.id),
  witness_name: varchar('witness_name', { length: 255 }),

  // Additional documentation
  notes: text('notes'),

  // Audit fields
  logged_by_id: text('logged_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull()
});

/**
 * Medication Reconciliation
 * CMS requirement at admission, transfer, discharge
 * Ensures medication list accuracy and safety
 */
export const medication_reconciliation = pgTable('medication_reconciliation', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Reconciliation details
  reconciliation_date: date('reconciliation_date').notNull(),
  reconciliation_type: varchar('reconciliation_type', { length: 50 }), // ADMISSION, TRANSFER, DISCHARGE, ROUTINE

  // Reconciliation findings
  medications_reviewed: jsonb('medications_reviewed'),

  discrepancies_found: text('discrepancies_found'),
  actions_taken: text('actions_taken'),

  // Who performed reconciliation
  performed_by_id: text('performed_by_id').references(() => users.id),
  performed_by_name: varchar('performed_by_name', { length: 255 }),

  // Signature
  signature: jsonb('signature'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
