import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date, decimal } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * Staff Management Module
 * Module H - MEDIUM Priority
 *
 * Purpose: Employee tracking, credential expiration alerts, caseload management
 * Compliance: State licensing requirements, HIPAA workforce security
 *
 * Tables:
 * - staff_profiles: Employee demographics and contact info
 * - staff_credentials: Licenses, certifications, background checks
 * - staff_caseload: Patient assignments and territory management
 * - staff_schedule: Work schedules, shifts, time-off
 * - staff_productivity: Performance metrics and visit tracking
 * - staff_training: Continuing education and compliance training
 */

/**
 * Staff Profiles Table
 * Core employee information and demographics
 */
export const staff_profiles = pgTable('staff_profiles', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  user_id: text('user_id').references(() => users.id).unique(), // Link to authentication user

  // Personal information
  employee_id: varchar('employee_id', { length: 50 }).unique(),
  first_name: varchar('first_name', { length: 255 }).notNull(),
  last_name: varchar('last_name', { length: 255 }).notNull(),
  middle_name: varchar('middle_name', { length: 255 }),
  preferred_name: varchar('preferred_name', { length: 255 }),

  // Employment details
  job_title: varchar('job_title', { length: 255 }), // RN, LPN, CNA, Social Worker, Chaplain, etc.
  department: varchar('department', { length: 100 }), // NURSING, SOCIAL_WORK, CHAPLAINCY, ADMIN, etc.
  employment_type: varchar('employment_type', { length: 50 }), // FULL_TIME, PART_TIME, PRN, CONTRACT
  hire_date: date('hire_date'),
  termination_date: date('termination_date'),
  employment_status: varchar('employment_status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, INACTIVE, TERMINATED, ON_LEAVE

  // Contact information
  email: varchar('email', { length: 255 }),
  phone: varchar('phone', { length: 50 }),
  mobile: varchar('mobile', { length: 50 }),
  emergency_contact_name: varchar('emergency_contact_name', { length: 255 }),
  emergency_contact_phone: varchar('emergency_contact_phone', { length: 50 }),
  emergency_contact_relationship: varchar('emergency_contact_relationship', { length: 100 }),

  // Address
  address_line1: varchar('address_line1', { length: 255 }),
  address_line2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zip_code: varchar('zip_code', { length: 10 }),

  // Professional details
  specialty: varchar('specialty', { length: 255 }), // e.g., Wound Care, Pediatric, etc.
  years_of_experience: integer('years_of_experience'),
  is_supervisory: boolean('is_supervisory').default(false),

  // Availability
  service_territory: jsonb('service_territory'),
  max_patient_load: integer('max_patient_load'), // Maximum assigned patients

  // Additional data
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
 * Staff Credentials Table
 * Licenses, certifications, background checks with expiration tracking
 */
export const staff_credentials = pgTable('staff_credentials', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),

  // Credential information
  credential_type: varchar('credential_type', { length: 100 }).notNull(), // RN_LICENSE, LPN_LICENSE, CNA_CERTIFICATION, CPR, BACKGROUND_CHECK, TB_TEST, etc.
  credential_name: varchar('credential_name', { length: 255 }).notNull(),
  credential_number: varchar('credential_number', { length: 100 }),

  // Issuing authority
  issuing_authority: varchar('issuing_authority', { length: 255 }), // State Board of Nursing, AHA, etc.
  issuing_state: varchar('issuing_state', { length: 2 }),

  // Dates
  issue_date: date('issue_date'),
  expiration_date: date('expiration_date').notNull(),
  verification_date: date('verification_date'), // When we last verified it

  // Status
  credential_status: varchar('credential_status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, EXPIRED, REVOKED, PENDING_RENEWAL

  // Alerts (for compliance tracking)
  alert_days_before_expiration: integer('alert_days_before_expiration').default(30), // Days before expiration to send alert
  renewal_reminder_sent: boolean('renewal_reminder_sent').default(false),

  // Document storage
  document_url: text('document_url'), // Link to scanned credential document

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Staff Caseload Table
 * Patient assignments and territory management
 */
export const staff_caseload = pgTable('staff_caseload', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Assignment details
  assignment_role: varchar('assignment_role', { length: 100 }).notNull(), // PRIMARY_NURSE, SECONDARY_NURSE, SOCIAL_WORKER, CHAPLAIN, AIDE
  is_primary: boolean('is_primary').default(false), // Is this the primary caregiver for this patient?

  // Assignment period
  assignment_start_date: date('assignment_start_date').notNull(),
  assignment_end_date: date('assignment_end_date'),
  assignment_status: varchar('assignment_status', { length: 50 }).default('ACTIVE').notNull(), // ACTIVE, INACTIVE, TRANSFERRED

  // Visit frequency (for nurses and aides)
  scheduled_visits_per_week: integer('scheduled_visits_per_week'),
  actual_visits_this_week: integer('actual_visits_this_week').default(0),

  // Transfer information
  transfer_reason: text('transfer_reason'),
  transferred_to_staff_id: bigint('transferred_to_staff_id', { mode: 'number' }).references(() => staff_profiles.id),
  transfer_date: date('transfer_date'),

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Staff Schedule Table
 * Work schedules, shifts, on-call rotations, time-off
 */
export const staff_schedule = pgTable('staff_schedule', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),

  // Schedule type
  schedule_type: varchar('schedule_type', { length: 50 }).notNull(), // SHIFT, ON_CALL, TIME_OFF, TRAINING, MEETING

  // Shift details
  shift_date: date('shift_date').notNull(),
  start_time: timestamp('start_time'),
  end_time: timestamp('end_time'),

  // On-call details
  is_on_call: boolean('is_on_call').default(false),
  on_call_type: varchar('on_call_type', { length: 50 }), // PRIMARY, BACKUP, WEEKEND

  // Time-off details
  time_off_type: varchar('time_off_type', { length: 50 }), // PTO, SICK, UNPAID, BEREAVEMENT, FMLA
  time_off_status: varchar('time_off_status', { length: 50 }), // REQUESTED, APPROVED, DENIED, CANCELLED
  approved_by_id: text('approved_by_id').references(() => users.id),
  approval_date: date('approval_date'),

  // Location
  work_location: varchar('work_location', { length: 255 }), // Office, Field, Remote

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Staff Productivity Table
 * Performance metrics and visit tracking
 */
export const staff_productivity = pgTable('staff_productivity', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),

  // Reporting period
  reporting_period_start: date('reporting_period_start').notNull(),
  reporting_period_end: date('reporting_period_end').notNull(),
  period_type: varchar('period_type', { length: 50 }), // DAILY, WEEKLY, MONTHLY, QUARTERLY

  // Visit metrics
  total_visits_scheduled: integer('total_visits_scheduled').default(0),
  total_visits_completed: integer('total_visits_completed').default(0),
  total_visits_missed: integer('total_visits_missed').default(0),
  total_visit_time_minutes: integer('total_visit_time_minutes').default(0),
  average_visit_duration_minutes: integer('average_visit_duration_minutes'),

  // Patient metrics
  total_patients_assigned: integer('total_patients_assigned').default(0),
  new_admissions: integer('new_admissions').default(0),
  discharges: integer('discharges').default(0),

  // Documentation metrics
  notes_completed_on_time: integer('notes_completed_on_time').default(0),
  notes_completed_late: integer('notes_completed_late').default(0),
  average_documentation_time_hours: decimal('average_documentation_time_hours', { precision: 5, scale: 2 }),

  // Performance scores
  patient_satisfaction_score: decimal('patient_satisfaction_score', { precision: 3, scale: 2 }), // Out of 5.00
  quality_score: decimal('quality_score', { precision: 5, scale: 2 }), // Percentage

  // Compliance
  compliance_incidents: integer('compliance_incidents').default(0),
  safety_incidents: integer('safety_incidents').default(0),

  // Additional metrics
  metrics_data: jsonb('metrics_data'),

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Staff Training Table
 * Continuing education and compliance training
 */
export const staff_training = pgTable('staff_training', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  staff_id: bigint('staff_id', { mode: 'number' }).references(() => staff_profiles.id).notNull(),

  // Training information
  training_name: varchar('training_name', { length: 255 }).notNull(),
  training_type: varchar('training_type', { length: 100 }).notNull(), // ORIENTATION, ANNUAL_COMPLIANCE, CONTINUING_EDUCATION, SKILLS_COMPETENCY, SAFETY
  training_category: varchar('training_category', { length: 100 }), // HIPAA, INFECTION_CONTROL, OSHA, CLINICAL_SKILLS, etc.

  // Provider information
  training_provider: varchar('training_provider', { length: 255 }),
  instructor_name: varchar('instructor_name', { length: 255 }),

  // Dates
  training_date: date('training_date').notNull(),
  completion_date: date('completion_date'),
  expiration_date: date('expiration_date'), // For trainings that expire (e.g., CPR)

  // Status
  training_status: varchar('training_status', { length: 50 }).default('SCHEDULED').notNull(), // SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, FAILED

  // Credits and scores
  hours_completed: decimal('hours_completed', { precision: 5, scale: 2 }),
  ceu_credits: decimal('ceu_credits', { precision: 5, scale: 2 }), // Continuing Education Units
  score: decimal('score', { precision: 5, scale: 2 }), // Test score if applicable
  passing_score: decimal('passing_score', { precision: 5, scale: 2 }),
  passed: boolean('passed'),

  // Certificate
  certificate_number: varchar('certificate_number', { length: 100 }),
  certificate_url: text('certificate_url'), // Link to certificate document

  // Compliance tracking
  is_required: boolean('is_required').default(false), // Is this a required/compliance training?
  due_date: date('due_date'), // When training must be completed by

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
