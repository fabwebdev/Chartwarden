import { pgTable, bigint, varchar, text, boolean, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { patients } from './patient.schema.js';

// ============================================================================
// NURSING CLINICAL NOTES TABLE
// ============================================================================
// Clinical documentation for nursing visits
// Supports rich text content, timestamps, nurse tracking, and note status
// ============================================================================

/**
 * Nursing Clinical Notes - Main nursing documentation table
 * Stores clinical observations, assessments, and care provided during nursing visits
 */
export const nursing_clinical_notes = pgTable('nursing_clinical_notes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Patient and benefit period references
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id),
  benefit_period_id: bigint('benefit_period_id', { mode: 'number' }),

  // Note timing
  note_date: varchar('note_date', { length: 255 }),
  note_timestamp: timestamp('note_timestamp').defaultNow(), // Precise timestamp for when note was created
  time_in: varchar('time_in', { length: 255 }),
  time_out: varchar('time_out', { length: 255 }),

  // Patient information (denormalized for quick access)
  patient_name: varchar('patient_name', { length: 255 }),
  patient_number: varchar('patient_number', { length: 255 }),
  dob: varchar('dob', { length: 255 }),

  // Location information
  location_name: varchar('location_name', { length: 255 }),
  location_number: varchar('location_number', { length: 255 }),

  // Benefit period text
  benefit_period: text('benefit_period'),

  // Visit type
  prn_visit: boolean('prn_visit').default(false),

  // Patient identifiers JSON
  patient_identifiers: text('patient_identifiers'),

  // ============================================================================
  // NEW FIELDS - Rich text content, nurse ID, and note status
  // ============================================================================

  // Nurse who created/authored the note
  nurse_id: text('nurse_id').references(() => users.id),
  nurse_name: varchar('nurse_name', { length: 255 }),
  nurse_credentials: varchar('nurse_credentials', { length: 100 }), // RN, LPN, etc.

  // Note status workflow
  note_status: varchar('note_status', { length: 50 }).default('DRAFT').notNull(),
  // Possible statuses: DRAFT, IN_PROGRESS, COMPLETED, PENDING_SIGNATURE, SIGNED, AMENDED, VOID

  // Rich text clinical content (HTML/JSON for rich text editor)
  content: text('content'), // Main rich text note content
  content_format: varchar('content_format', { length: 20 }).default('html'), // html, json, markdown

  // SOAP documentation sections (rich text)
  subjective: text('subjective'), // Patient's report, symptoms, complaints
  objective: text('objective'), // Clinical findings, observations, measurements
  assessment: text('assessment'), // Clinical assessment, evaluation
  plan: text('plan'), // Care plan, interventions, follow-up

  // Additional clinical sections (rich text)
  interventions: text('interventions'), // Nursing interventions performed
  patient_response: text('patient_response'), // Patient response to interventions
  patient_education: text('patient_education'), // Education provided
  communication: text('communication'), // Communication with team/family

  // Signature tracking (21 CFR Part 11 compliance)
  signed_at: timestamp('signed_at'),
  signed_by_id: text('signed_by_id').references(() => users.id),
  signature_hash: varchar('signature_hash', { length: 64 }), // SHA-256 hash

  // Cosignature (for supervision)
  cosigned_at: timestamp('cosigned_at'),
  cosigned_by_id: text('cosigned_by_id').references(() => users.id),

  // Amendment tracking
  amended: boolean('amended').default(false),
  amendment_reason: text('amendment_reason'),
  amended_at: timestamp('amended_at'),
  amended_by_id: text('amended_by_id').references(() => users.id),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'), // Soft delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Performance indexes
  patientIdx: index('idx_nursing_notes_patient_id').on(table.patient_id),
  nurseIdx: index('idx_nursing_notes_nurse_id').on(table.nurse_id),
  statusIdx: index('idx_nursing_notes_status').on(table.note_status),
  noteDateIdx: index('idx_nursing_notes_date').on(table.note_date),
  timestampIdx: index('idx_nursing_notes_timestamp').on(table.note_timestamp),
  benefitPeriodIdx: index('idx_nursing_notes_benefit_period').on(table.benefit_period_id),

  // Composite indexes for common queries
  patientStatusIdx: index('idx_nursing_notes_patient_status').on(table.patient_id, table.note_status),
  nurseStatusIdx: index('idx_nursing_notes_nurse_status').on(table.nurse_id, table.note_status),
}));