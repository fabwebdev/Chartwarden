import { pgTable, bigint, integer, timestamp, varchar, date, text, boolean, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * Medicare Hospice Benefit Periods Schema
 *
 * Medicare hospice benefit structure:
 * - First certification period: 90 days
 * - Second certification period: 90 days
 * - Subsequent certification periods: Unlimited 60-day periods
 *
 * Level of Care (LOC) types:
 * - RHC (Routine Home Care) - Revenue Code 0651
 * - CHC (Continuous Home Care) - Revenue Code 0652
 * - GIP (General Inpatient Care) - Revenue Code 0655
 * - IRC (Inpatient Respite Care) - Revenue Code 0656
 *
 * Compliance: CMS hospice benefit requirements, 42 CFR 418
 */

export const benefit_periods = pgTable('benefit_periods', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Period identification
  period_number: integer('period_number').notNull(), // Sequence number (1, 2, 3, ...)
  period_type: varchar('period_type', { length: 50 }).notNull(), // INITIAL_90, SUBSEQUENT_90, SUBSEQUENT_60

  // Period dates
  start_date: date('start_date').notNull(),
  end_date: date('end_date').notNull(),

  // Election information
  election_date: date('election_date'), // Date patient elected hospice benefit
  election_statement_signed: boolean('election_statement_signed').default(false),
  election_statement_date: date('election_statement_date'),

  // Certification information
  certification_date: date('certification_date'), // Date of physician certification
  certifying_physician_id: bigint('certifying_physician_id', { mode: 'number' }),
  recertification_required_by: date('recertification_required_by'),
  face_to_face_required: boolean('face_to_face_required').default(false), // Required for 3rd+ benefit period
  face_to_face_completed: boolean('face_to_face_completed').default(false),
  face_to_face_date: date('face_to_face_date'),

  // Revocation/Discharge information
  revocation_date: date('revocation_date'),
  revocation_reason: varchar('revocation_reason', { length: 100 }), // PATIENT_REVOCATION, DISCHARGE_MOVED, DISCHARGE_CURATIVE, DISCHARGE_CAUSE_UNRELATED, DISCHARGE_DEATH, DISCHARGE_TRANSFER
  discharge_date: date('discharge_date'),
  discharge_reason: text('discharge_reason'),

  // Status tracking
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, REVOKED, DISCHARGED, EXPIRED, PENDING

  // Terminal prognosis attestation
  terminal_prognosis_confirmed: boolean('terminal_prognosis_confirmed').default(false),
  prognosis_6_months_or_less: boolean('prognosis_6_months_or_less').default(false),

  // NOE tracking
  noe_filed: boolean('noe_filed').default(false),
  noe_filed_date: date('noe_filed_date'),
  noe_timely: boolean('noe_timely'), // Filed within 5 calendar days

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for common queries
  patientIdx: index('idx_benefit_periods_patient_id').on(table.patient_id),
  statusIdx: index('idx_benefit_periods_status').on(table.status),
  startDateIdx: index('idx_benefit_periods_start_date').on(table.start_date),
  patientStatusIdx: index('idx_benefit_periods_patient_status').on(table.patient_id, table.status),
}));

/**
 * Benefit Period Level of Care Tracking
 * Tracks level of care changes within a benefit period
 * Critical for accurate billing (revenue code selection)
 */
export const benefit_period_loc = pgTable('benefit_period_loc', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  benefit_period_id: bigint('benefit_period_id', { mode: 'number' }).references(() => benefit_periods.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Level of care details
  level_of_care: varchar('level_of_care', { length: 50 }).notNull(), // RHC, CHC, GIP, IRC
  revenue_code: varchar('revenue_code', { length: 4 }).notNull(), // 0651, 0652, 0655, 0656

  // LOC period dates
  effective_date: date('effective_date').notNull(),
  end_date: date('end_date'),

  // CHC specific fields (requires 8+ hours of care)
  chc_start_time: timestamp('chc_start_time'),
  chc_end_time: timestamp('chc_end_time'),
  chc_total_hours: integer('chc_total_hours'), // Total hours for CHC (minimum 8)

  // GIP/IRC specific fields
  facility_id: bigint('facility_id', { mode: 'number' }), // Contracted facility for inpatient
  facility_name: varchar('facility_name', { length: 255 }),
  facility_npi: varchar('facility_npi', { length: 10 }),

  // IRC specific - limited to 5 consecutive days per benefit period
  respite_day_count: integer('respite_day_count'), // Days used in this respite stay

  // Crisis reason for CHC
  crisis_reason: text('crisis_reason'), // Required documentation for CHC

  // Physician order
  physician_order_date: date('physician_order_date'),
  ordering_physician_id: bigint('ordering_physician_id', { mode: 'number' }),

  // Status
  status: varchar('status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, ENDED, CANCELLED

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  benefitPeriodIdx: index('idx_benefit_period_loc_benefit_period').on(table.benefit_period_id),
  patientIdx: index('idx_benefit_period_loc_patient').on(table.patient_id),
  locIdx: index('idx_benefit_period_loc_loc').on(table.level_of_care),
  effectiveDateIdx: index('idx_benefit_period_loc_effective_date').on(table.effective_date),
}));

/**
 * Benefit Period Election History
 * Tracks hospice election, revocation, and re-election history
 * Important for compliance and benefit period calculations
 */
export const benefit_period_elections = pgTable('benefit_period_elections', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  benefit_period_id: bigint('benefit_period_id', { mode: 'number' }).references(() => benefit_periods.id),

  // Election type
  election_type: varchar('election_type', { length: 50 }).notNull(), // INITIAL_ELECTION, RE_ELECTION, REVOCATION, TRANSFER_IN, TRANSFER_OUT

  // Election dates
  election_date: date('election_date').notNull(),
  effective_date: date('effective_date').notNull(),

  // Statement details
  election_statement_signed: boolean('election_statement_signed').default(false),
  election_statement_date: date('election_statement_date'),
  witness_name: varchar('witness_name', { length: 255 }),
  witness_signature_date: date('witness_signature_date'),

  // Designated hospice
  hospice_provider_name: varchar('hospice_provider_name', { length: 255 }),
  hospice_provider_npi: varchar('hospice_provider_npi', { length: 10 }),

  // Attending physician acknowledgment
  attending_physician_id: bigint('attending_physician_id', { mode: 'number' }),
  attending_physician_name: varchar('attending_physician_name', { length: 255 }),
  physician_acknowledgment_date: date('physician_acknowledgment_date'),

  // Revocation specific fields
  revocation_effective_date: date('revocation_effective_date'),
  revocation_reason: varchar('revocation_reason', { length: 100 }),
  remaining_days_in_period: integer('remaining_days_in_period'), // Days forfeited upon revocation

  // Transfer specific fields
  transfer_from_hospice: varchar('transfer_from_hospice', { length: 255 }),
  transfer_to_hospice: varchar('transfer_to_hospice', { length: 255 }),
  transfer_date: date('transfer_date'),

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  patientIdx: index('idx_benefit_period_elections_patient').on(table.patient_id),
  benefitPeriodIdx: index('idx_benefit_period_elections_benefit_period').on(table.benefit_period_id),
  electionTypeIdx: index('idx_benefit_period_elections_type').on(table.election_type),
  electionDateIdx: index('idx_benefit_period_elections_date').on(table.election_date),
}));