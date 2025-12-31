import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date, numeric, uniqueIndex } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';
import { certifications } from './certifications.schema.js';

/**
 * Cap Tracking Table
 * Tracks Medicare hospice cap amount per beneficiary per cap year
 * CMS Requirement: Cap year runs Oct 1 - Sep 30
 * FY 2025 Cap: $34,465.34 per beneficiary
 */
export const cap_tracking = pgTable('cap_tracking', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Cap year (Oct 1 - Sep 30)
  cap_year: integer('cap_year').notNull(), // e.g., 2025 for cap year 2024-2025
  cap_year_start_date: date('cap_year_start_date').notNull(), // Oct 1
  cap_year_end_date: date('cap_year_end_date').notNull(), // Sep 30

  // Cap amount (in cents for precision)
  cap_amount_cents: integer('cap_amount_cents').notNull(), // $34,465.34 = 3446534 cents
  total_payments_cents: integer('total_payments_cents').default(0).notNull(), // Total payments applied in cap year
  remaining_cap_cents: integer('remaining_cap_cents').notNull(), // Remaining cap amount

  // Cap utilization percentage (for easier querying)
  utilization_percentage: numeric('utilization_percentage', { precision: 5, scale: 2 }).default('0'), // e.g., 85.50 for 85.5%

  // Cap exceeded tracking
  cap_exceeded: boolean('cap_exceeded').default(false).notNull(),
  cap_exceeded_date: date('cap_exceeded_date'),
  cap_exceeded_amount_cents: integer('cap_exceeded_amount_cents'), // Amount over cap

  // Alert thresholds tracking
  alert_80_triggered: boolean('alert_80_triggered').default(false),
  alert_80_date: timestamp('alert_80_date'),
  alert_90_triggered: boolean('alert_90_triggered').default(false),
  alert_90_date: timestamp('alert_90_date'),
  alert_95_triggered: boolean('alert_95_triggered').default(false),
  alert_95_date: timestamp('alert_95_date'),

  // Calculation tracking
  last_calculated_at: timestamp('last_calculated_at'),
  calculation_status: varchar('calculation_status', { length: 50 }).default('CURRENT'), // CURRENT, PENDING_RECALC, ERROR

  // Notes and metadata
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Unique constraint: one record per patient per cap year
  uniquePatientYear: uniqueIndex('unique_patient_cap_year').on(table.patient_id, table.cap_year)
}));

/**
 * Certification Alerts Table
 * Tracks alerts sent for upcoming certifications and face-to-face requirements
 * Requirement: Alert 5 days before benefit period start
 */
export const certification_alerts = pgTable('certification_alerts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  certification_id: bigint('certification_id', { mode: 'number' }).references(() => certifications.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Alert details
  alert_type: varchar('alert_type', { length: 50 }).notNull(), // UPCOMING_CERT, OVERDUE_CERT, F2F_REQUIRED, F2F_OVERDUE
  alert_priority: varchar('alert_priority', { length: 50 }).default('NORMAL'), // NORMAL, HIGH, CRITICAL

  // Timing
  scheduled_for: timestamp('scheduled_for').notNull(),
  sent_at: timestamp('sent_at'),
  alert_status: varchar('alert_status', { length: 50 }).default('PENDING'), // PENDING, SENT, FAILED, DISMISSED

  // Recipients
  recipients: jsonb('recipients'), // Array of user IDs or email addresses

  // Alert content
  subject: varchar('subject', { length: 255 }),
  message: text('message'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
