import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date, decimal, time } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';
import { staff_profiles } from './staffManagement.schema.js';

/**
 * Scheduling Module
 * Module J - MEDIUM Priority
 *
 * Purpose: Calendar management, GPS check-in/out, on-call rotations
 * Compliance: Visit frequency requirements, on-call coverage, timeliness tracking
 *
 * Tables:
 * - scheduled_visits: Individual scheduled patient visits
 * - recurring_visits: Templates for recurring visit schedules
 * - on_call_schedule: On-call rotation schedules
 * - on_call_logs: On-call activity and response tracking
 * - visit_compliance: Visit frequency compliance tracking
 */

/**
 * Scheduled Visits Table
 * Individual patient visit appointments
 */
export const scheduled_visits = pgTable('scheduled_visits', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),

  // Visit details
  visit_type: varchar('visit_type', { length: 100 }).notNull(), // RN, LPN, CNA, SOCIAL_WORKER, CHAPLAIN, VOLUNTEER, PHYSICIAN
  visit_purpose: varchar('visit_purpose', { length: 255 }), // ROUTINE, ADMISSION, RECERTIFICATION, PRN, CRISIS, RESPITE

  // Scheduling
  scheduled_date: date('scheduled_date').notNull(),
  scheduled_start_time: time('scheduled_start_time').notNull(),
  scheduled_end_time: time('scheduled_end_time'),
  estimated_duration_minutes: integer('estimated_duration_minutes').default(60),

  // Visit status
  visit_status: varchar('visit_status', { length: 50 }).default('SCHEDULED').notNull(), // SCHEDULED, CONFIRMED, IN_PROGRESS, COMPLETED, CANCELLED, MISSED, RESCHEDULED

  // Actual visit times (GPS tracking)
  actual_check_in_time: timestamp('actual_check_in_time'),
  actual_check_out_time: timestamp('actual_check_out_time'),
  actual_duration_minutes: integer('actual_duration_minutes'),

  // GPS location data
  check_in_location: jsonb('check_in_location'),
  check_out_location: jsonb('check_out_location'),

  // Distance from patient address
  check_in_distance_meters: integer('check_in_distance_meters'),
  check_out_distance_meters: integer('check_out_distance_meters'),

  // Confirmation and reminders
  patient_confirmed: boolean('patient_confirmed').default(false),
  patient_confirmed_at: timestamp('patient_confirmed_at'),
  reminder_sent: boolean('reminder_sent').default(false),
  reminder_sent_at: timestamp('reminder_sent_at'),

  // Cancellation/Rescheduling
  cancelled_at: timestamp('cancelled_at'),
  cancelled_by_id: text('cancelled_by_id').references(() => users.id),
  cancellation_reason: text('cancellation_reason'),
  rescheduled_to_visit_id: bigint('rescheduled_to_visit_id', { mode: 'number' }), // Link to new visit if rescheduled

  // Billing integration
  billable: boolean('billable').default(true),
  billed: boolean('billed').default(false),
  billing_code: varchar('billing_code', { length: 50 }),

  // Visit notes/documentation
  visit_notes: text('visit_notes'),
  clinical_documentation_id: bigint('clinical_documentation_id', { mode: 'number' }), // Link to encounter/note

  // Recurring visit relationship
  recurring_visit_id: bigint('recurring_visit_id', { mode: 'number' }).references(() => recurring_visits.id),

  // Additional data
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Recurring Visits Table
 * Templates for recurring patient visit schedules
 */
export const recurring_visits = pgTable('recurring_visits', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id),

  // Recurrence pattern
  recurrence_pattern: varchar('recurrence_pattern', { length: 50 }).notNull(), // DAILY, WEEKLY, BI_WEEKLY, MONTHLY, CUSTOM

  // Frequency details
  frequency: integer('frequency').default(1).notNull(), // Every X days/weeks/months

  // Weekly pattern (for WEEKLY recurrence)
  days_of_week: jsonb('days_of_week'), // ['MONDAY', 'WEDNESDAY', 'FRIDAY']

  // Monthly pattern (for MONTHLY recurrence)
  day_of_month: integer('day_of_month'), // 1-31
  week_of_month: integer('week_of_month'), // 1-5 (for "first Monday", "last Friday", etc.)

  // Time preferences
  preferred_time: time('preferred_time'),
  preferred_duration_minutes: integer('preferred_duration_minutes').default(60),

  // Visit details
  visit_type: varchar('visit_type', { length: 100 }).notNull(),
  visit_purpose: varchar('visit_purpose', { length: 255 }),

  // Recurrence period
  start_date: date('start_date').notNull(),
  end_date: date('end_date'), // NULL = indefinite

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  pause_start_date: date('pause_start_date'), // Temporary pause
  pause_end_date: date('pause_end_date'),

  // Auto-scheduling settings
  auto_schedule: boolean('auto_schedule').default(true), // Automatically create scheduled_visits
  schedule_days_in_advance: integer('schedule_days_in_advance').default(7), // Create visits X days ahead

  // Last generated visit
  last_generated_date: date('last_generated_date'),
  next_generation_date: date('next_generation_date'),

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * On-Call Schedule Table
 * Staff on-call rotation schedules
 */
export const on_call_schedule = pgTable('on_call_schedule', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),

  // On-call period
  start_datetime: timestamp('start_datetime').notNull(),
  end_datetime: timestamp('end_datetime').notNull(),

  // On-call type
  on_call_type: varchar('on_call_type', { length: 50 }).notNull(), // PRIMARY, BACKUP, WEEKEND, HOLIDAY, SPECIALTY

  // Discipline/specialty
  discipline: varchar('discipline', { length: 100 }), // RN, SOCIAL_WORKER, CHAPLAIN, PHYSICIAN
  specialty: varchar('specialty', { length: 100 }), // CLINICAL, ADMINISTRATIVE, BEREAVEMENT

  // Coverage area
  coverage_area: jsonb('coverage_area'),

  // Status
  schedule_status: varchar('schedule_status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, CANCELLED, COMPLETED, SWAPPED

  // Swap/coverage
  swapped_with_staff_id: bigint('swapped_with_staff_id', { mode: 'number' }).references(() => staff_profiles.id),
  swap_reason: text('swap_reason'),
  swap_approved_by_id: text('swap_approved_by_id').references(() => users.id),
  swap_approved_at: timestamp('swap_approved_at'),

  // Contact information
  contact_phone: varchar('contact_phone', { length: 50 }),
  backup_contact_phone: varchar('backup_contact_phone', { length: 50 }),

  // Compensation
  on_call_rate: decimal('on_call_rate', { precision: 10, scale: 2 }), // Hourly rate
  callback_rate: decimal('callback_rate', { precision: 10, scale: 2 }), // Rate when called in

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * On-Call Logs Table
 * Track on-call calls and responses
 */
export const on_call_logs = pgTable('on_call_logs', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  on_call_schedule_id: bigint('on_call_schedule_id', { mode: 'number' }).references(() => on_call_schedule.id).notNull(),
  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),

  // Call details
  call_datetime: timestamp('call_datetime').notNull(),
  caller_name: varchar('caller_name', { length: 255 }),
  caller_phone: varchar('caller_phone', { length: 50 }),
  caller_relationship: varchar('caller_relationship', { length: 100 }), // PATIENT, FAMILY, FACILITY, PHYSICIAN, OTHER_STAFF

  // Patient information (if applicable)
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id),

  // Call reason/type
  call_reason: varchar('call_reason', { length: 100 }).notNull(), // SYMPTOM_MANAGEMENT, DEATH, CRISIS, MEDICATION_QUESTION, ADMISSION, OTHER
  call_priority: varchar('call_priority', { length: 50 }).notNull(), // ROUTINE, URGENT, EMERGENT, CRISIS

  // Call summary
  call_summary: text('call_summary'),
  symptoms_reported: text('symptoms_reported'),

  // Response
  response_type: varchar('response_type', { length: 100 }), // PHONE_ADVICE, SCHEDULED_VISIT, IMMEDIATE_VISIT, REFERRAL, NO_ACTION
  response_time_minutes: integer('response_time_minutes'), // Time to respond/callback

  // Visit dispatched
  visit_dispatched: boolean('visit_dispatched').default(false),
  dispatched_staff_id: bigint('dispatched_staff_id', { mode: 'number' }).references(() => staff_profiles.id),
  dispatched_visit_id: bigint('dispatched_visit_id', { mode: 'number' }).references(() => scheduled_visits.id),

  // Outcome
  outcome: text('outcome'),
  follow_up_required: boolean('follow_up_required').default(false),
  follow_up_notes: text('follow_up_notes'),

  // Call duration
  call_start_time: timestamp('call_start_time'),
  call_end_time: timestamp('call_end_time'),
  call_duration_minutes: integer('call_duration_minutes'),

  // Documentation
  clinical_documentation_id: bigint('clinical_documentation_id', { mode: 'number' }),

  // Billing
  billable: boolean('billable').default(false),
  billing_code: varchar('billing_code', { length: 50 }),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Visit Compliance Table
 * Track visit frequency compliance for Medicare/regulatory requirements
 */
export const visit_compliance = pgTable('visit_compliance', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Compliance period
  period_start_date: date('period_start_date').notNull(),
  period_end_date: date('period_end_date').notNull(),
  period_type: varchar('period_type', { length: 50 }), // WEEKLY, BI_WEEKLY, MONTHLY, CERTIFICATION_PERIOD

  // Required visits by discipline
  required_rn_visits: integer('required_rn_visits').default(0),
  required_lpn_visits: integer('required_lpn_visits').default(0),
  required_cna_visits: integer('required_cna_visits').default(0),
  required_social_worker_visits: integer('required_social_worker_visits').default(0),
  required_chaplain_visits: integer('required_chaplain_visits').default(0),

  // Completed visits by discipline
  completed_rn_visits: integer('completed_rn_visits').default(0),
  completed_lpn_visits: integer('completed_lpn_visits').default(0),
  completed_cna_visits: integer('completed_cna_visits').default(0),
  completed_social_worker_visits: integer('completed_social_worker_visits').default(0),
  completed_chaplain_visits: integer('completed_chaplain_visits').default(0),

  // Compliance status
  is_compliant: boolean('is_compliant').default(true),
  compliance_percentage: decimal('compliance_percentage', { precision: 5, scale: 2 }),

  // Deficiencies
  deficient_disciplines: jsonb('deficient_disciplines'),

  // RN visit frequency requirement (minimum every 14 days)
  days_since_last_rn_visit: integer('days_since_last_rn_visit'),
  last_rn_visit_date: date('last_rn_visit_date'),
  rn_visit_overdue: boolean('rn_visit_overdue').default(false),

  // Alerts
  alert_triggered: boolean('alert_triggered').default(false),
  alert_triggered_date: date('alert_triggered_date'),
  alert_acknowledged: boolean('alert_acknowledged').default(false),
  alert_acknowledged_by_id: text('alert_acknowledged_by_id').references(() => users.id),

  // Corrective actions
  corrective_action_plan: text('corrective_action_plan'),
  corrective_action_date: date('corrective_action_date'),

  // Notes
  notes: text('notes'),

  // Auto-calculated
  calculated_date: timestamp('calculated_date'),
  next_calculation_date: timestamp('next_calculation_date'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
