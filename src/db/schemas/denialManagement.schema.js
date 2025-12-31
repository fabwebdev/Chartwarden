import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, date, decimal } from 'drizzle-orm/pg-core';
import { claims } from './billing.schema.js';
import { patients } from './patient.schema.js';
import { payers } from './billing.schema.js';
import { users } from './user.schema.js';
import { era_payments } from './era.schema.js';
import { carc_codes, denial_categories } from './denialCodes.schema.js';

/**
 * Denial Management Module
 * Phase 3C - Complete Denial Workflow & Appeal Tracking
 *
 * Purpose: Track denied claims, manage appeal workflow, and analyze denial patterns
 * Compliance: CMS appeal requirements, HIPAA standards
 *
 * Tables:
 * - claim_denials: Track all denied claims
 * - denial_reasons: Link denials to CARC/RARC codes
 * - appeal_cases: Track appeal submissions
 * - appeal_documents: Store appeal supporting documents
 * - appeal_timeline: Track appeal milestones and deadlines
 * - denial_analytics: Pre-calculated denial metrics
 */

/**
 * Claim Denials Table
 * Master table tracking all denied or partially denied claims
 */
export const claim_denials = pgTable('claim_denials', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Claim reference
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),

  // Denial identification
  denial_id: varchar('denial_id', { length: 50 }).unique().notNull(),
  denial_date: date('denial_date').notNull(),

  // ERA reference (if denial came from 835)
  era_payment_id: bigint('era_payment_id', { mode: 'number' }).references(() => era_payments.id),
  check_number: varchar('check_number', { length: 50 }),

  // Denial type
  denial_type: varchar('denial_type', { length: 50 }).notNull(),
  // FULL_DENIAL, PARTIAL_DENIAL, LINE_DENIAL, ADJUSTMENT

  denial_status: varchar('denial_status', { length: 50 }).default('IDENTIFIED').notNull(),
  // IDENTIFIED, UNDER_REVIEW, APPEALING, RESOLVED, WRITTEN_OFF, PATIENT_BILLED

  // Financial impact (in cents)
  billed_amount: bigint('billed_amount', { mode: 'number' }).notNull(),
  denied_amount: bigint('denied_amount', { mode: 'number' }).notNull(),
  allowed_amount: bigint('allowed_amount', { mode: 'number' }),
  paid_amount: bigint('paid_amount', { mode: 'number' }),
  adjustment_amount: bigint('adjustment_amount', { mode: 'number' }),

  // Categorization
  denial_category_id: bigint('denial_category_id', { mode: 'number' }).references(() => denial_categories.id),
  primary_denial_reason: varchar('primary_denial_reason', { length: 10 }), // Primary CARC code

  // Preventability assessment
  is_preventable: boolean('is_preventable'),
  preventable_reason: text('preventable_reason'),
  root_cause: text('root_cause'),

  // Appealability
  is_appealable: boolean('is_appealable').default(true),
  appeal_deadline: date('appeal_deadline'), // Calculated based on payer policy
  days_until_deadline: bigint('days_until_deadline', { mode: 'number' }),

  // Appeal decision
  will_appeal: boolean('will_appeal'),
  appeal_decision_date: date('appeal_decision_date'),
  appeal_decision_by_id: text('appeal_decision_by_id').references(() => users.id),
  appeal_decision_reason: text('appeal_decision_reason'),

  // Assignment
  assigned_to_id: text('assigned_to_id').references(() => users.id),
  assigned_at: timestamp('assigned_at'),
  assigned_by_id: text('assigned_by_id').references(() => users.id),

  // Resolution tracking
  resolved_date: date('resolved_date'),
  resolved_by_id: text('resolved_by_id').references(() => users.id),
  resolution_type: varchar('resolution_type', { length: 50 }),
  // APPEAL_WON, APPEAL_LOST, CORRECTED_RESUBMIT, WRITTEN_OFF, PATIENT_BILLED, PAYER_ERROR_CORRECTED

  resolution_amount: bigint('resolution_amount', { mode: 'number' }), // Amount recovered
  resolution_notes: text('resolution_notes'),

  // Priority scoring
  priority_score: bigint('priority_score', { mode: 'number' }), // 0-100 (amount + appealability + preventability)
  priority_level: varchar('priority_level', { length: 20 }),
  // CRITICAL, HIGH, MEDIUM, LOW

  // Provider education flag
  requires_provider_education: boolean('requires_provider_education').default(false),
  education_completed: boolean('education_completed').default(false),
  education_notes: text('education_notes'),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit fields
  identified_by_id: text('identified_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Denial Reasons Table
 * Links denials to specific CARC/RARC codes (many-to-many)
 */
export const denial_reasons = pgTable('denial_reasons', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  denial_id: bigint('denial_id', { mode: 'number' }).references(() => claim_denials.id).notNull(),

  // Code references
  carc_code_id: bigint('carc_code_id', { mode: 'number' }).references(() => carc_codes.id),
  carc_code: varchar('carc_code', { length: 10 }).notNull(),
  rarc_codes: jsonb('rarc_codes'), // Array of RARC codes

  // Adjustment details
  group_code: varchar('group_code', { length: 2 }).notNull(), // CO, PR, OA, PI
  adjustment_amount: bigint('adjustment_amount', { mode: 'number' }), // In cents
  adjustment_quantity: decimal('adjustment_quantity', { precision: 10, scale: 2 }),

  // Service line reference (if line-level denial)
  service_line_number: bigint('service_line_number', { mode: 'number' }),
  procedure_code: varchar('procedure_code', { length: 20 }),
  service_date: date('service_date'),

  // Payer explanation
  payer_explanation: text('payer_explanation'),

  // Analysis
  is_primary_reason: boolean('is_primary_reason').default(false),
  is_appealable: boolean('is_appealable'),
  recommended_action: text('recommended_action'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull()
});

/**
 * Appeal Cases Table
 * Tracks appeal submissions and outcomes
 */
export const appeal_cases = pgTable('appeal_cases', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Appeal identification
  appeal_id: varchar('appeal_id', { length: 50 }).unique().notNull(),
  denial_id: bigint('denial_id', { mode: 'number' }).references(() => claim_denials.id).notNull(),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),

  // Appeal level
  appeal_level: varchar('appeal_level', { length: 50 }).notNull(),
  // FIRST_LEVEL, RECONSIDERATION, ALJ_HEARING, MAC_REVIEW, FEDERAL_COURT
  appeal_type: varchar('appeal_type', { length: 50 }),
  // REDETERMINATION, RECONSIDERATION, ADMINISTRATIVE_LAW_JUDGE, MEDICARE_APPEALS_COUNCIL

  // Submission details
  submitted_date: date('submitted_date'),
  submitted_by_id: text('submitted_by_id').references(() => users.id),
  submission_method: varchar('submission_method', { length: 50 }),
  // ONLINE_PORTAL, FAX, MAIL, ELECTRONIC

  tracking_number: varchar('tracking_number', { length: 100 }),
  confirmation_number: varchar('confirmation_number', { length: 100 }),

  // Deadlines
  original_deadline: date('original_deadline').notNull(),
  extended_deadline: date('extended_deadline'),
  payer_response_deadline: date('payer_response_deadline'),

  // Status tracking
  appeal_status: varchar('appeal_status', { length: 50 }).default('PREPARING').notNull(),
  // PREPARING, SUBMITTED, PENDING, ADDITIONAL_INFO_REQUESTED, UNDER_REVIEW,
  // DECISION_RECEIVED, WON, PARTIALLY_WON, DENIED, WITHDRAWN

  current_step: varchar('current_step', { length: 100 }),
  status_date: timestamp('status_date').defaultNow().notNull(),

  // Outcome
  decision_date: date('decision_date'),
  decision_type: varchar('decision_type', { length: 50 }),
  // FULLY_FAVORABLE, PARTIALLY_FAVORABLE, UNFAVORABLE, DISMISSED

  decision_reason: text('decision_reason'),
  decision_received_date: date('decision_received_date'),

  // Financial outcome (in cents)
  appealed_amount: bigint('appealed_amount', { mode: 'number' }).notNull(),
  recovered_amount: bigint('recovered_amount', { mode: 'number' }),
  final_denied_amount: bigint('final_denied_amount', { mode: 'number' }),

  // Supporting information
  appeal_basis: text('appeal_basis').notNull(), // Why we're appealing
  medical_necessity_rationale: text('medical_necessity_rationale'),
  policy_reference: text('policy_reference'),

  // Contact information
  appeal_contact_name: varchar('appeal_contact_name', { length: 255 }),
  appeal_contact_phone: varchar('appeal_contact_phone', { length: 20 }),
  appeal_contact_email: varchar('appeal_contact_email', { length: 255 }),

  // Next steps if denied
  next_appeal_level: varchar('next_appeal_level', { length: 50 }),
  will_escalate: boolean('will_escalate'),
  escalation_deadline: date('escalation_deadline'),

  // Communication log
  communication_log: jsonb('communication_log'), // Array of {date, type, summary, contact}

  // Document references
  has_medical_records: boolean('has_medical_records').default(false),
  has_clinical_notes: boolean('has_clinical_notes').default(false),
  has_physician_statement: boolean('has_physician_statement').default(false),
  has_policy_documentation: boolean('has_policy_documentation').default(false),

  // Assignment
  assigned_to_id: text('assigned_to_id').references(() => users.id),
  assigned_at: timestamp('assigned_at'),

  // Quality metrics
  preparation_time_days: bigint('preparation_time_days', { mode: 'number' }),
  decision_time_days: bigint('decision_time_days', { mode: 'number' }),
  total_cycle_time_days: bigint('total_cycle_time_days', { mode: 'number' }),

  // Metadata
  metadata: jsonb('metadata'),
  internal_notes: text('internal_notes'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Appeal Documents Table
 * Store references to appeal supporting documents
 */
export const appeal_documents = pgTable('appeal_documents', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  appeal_id: bigint('appeal_id', { mode: 'number' }).references(() => appeal_cases.id).notNull(),

  // Document details
  document_type: varchar('document_type', { length: 50 }).notNull(),
  // APPEAL_LETTER, MEDICAL_RECORDS, CLINICAL_NOTES, PHYSICIAN_STATEMENT,
  // POLICY_DOCUMENTATION, SUPPORTING_EVIDENCE, PAYER_CORRESPONDENCE,
  // DECISION_LETTER, ADDITIONAL_DOCUMENTATION

  document_name: varchar('document_name', { length: 255 }).notNull(),
  document_description: text('document_description'),

  // File information
  file_path: text('file_path'),
  file_url: text('file_url'),
  file_size: bigint('file_size', { mode: 'number' }), // In bytes
  file_type: varchar('file_type', { length: 50 }), // PDF, DOCX, JPG, etc.
  mime_type: varchar('mime_type', { length: 100 }),

  // Document metadata
  document_date: date('document_date'),
  author: varchar('author', { length: 255 }),
  is_required: boolean('is_required').default(false),
  is_submitted: boolean('is_submitted').default(false),
  submitted_date: timestamp('submitted_date'),

  // Version control
  version: bigint('version', { mode: 'number' }).default(1),
  supersedes_document_id: bigint('supersedes_document_id', { mode: 'number' }),

  // Security
  is_sensitive: boolean('is_sensitive').default(true), // PHI protection
  access_restricted: boolean('access_restricted').default(false),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit fields
  uploaded_by_id: text('uploaded_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Appeal Timeline Table
 * Track important dates and milestones in appeal process
 */
export const appeal_timeline = pgTable('appeal_timeline', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  appeal_id: bigint('appeal_id', { mode: 'number' }).references(() => appeal_cases.id).notNull(),

  // Milestone details
  milestone_type: varchar('milestone_type', { length: 50 }).notNull(),
  // DENIAL_RECEIVED, APPEAL_INITIATED, DOCUMENTS_GATHERED, APPEAL_SUBMITTED,
  // ACKNOWLEDGMENT_RECEIVED, ADDITIONAL_INFO_REQUESTED, INFO_PROVIDED,
  // DECISION_RECEIVED, PAYMENT_RECEIVED, APPEAL_CLOSED

  milestone_date: timestamp('milestone_date').defaultNow().notNull(),
  due_date: date('due_date'),

  // Status
  is_completed: boolean('is_completed').default(true),
  completed_on_time: boolean('completed_on_time'),
  days_overdue: bigint('days_overdue', { mode: 'number' }),

  // Details
  description: text('description').notNull(),
  responsible_party: varchar('responsible_party', { length: 255 }),
  action_taken: text('action_taken'),

  // Notifications
  notification_sent: boolean('notification_sent').default(false),
  notification_date: timestamp('notification_date'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull()
});

/**
 * Denial Analytics Table
 * Pre-calculated metrics for dashboard and reporting
 * Updated via scheduled jobs
 */
export const denial_analytics = pgTable('denial_analytics', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Time period
  period_type: varchar('period_type', { length: 20 }).notNull(), // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  period_start: date('period_start').notNull(),
  period_end: date('period_end').notNull(),

  // Grouping dimensions
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),
  denial_category_id: bigint('denial_category_id', { mode: 'number' }).references(() => denial_categories.id),
  carc_code: varchar('carc_code', { length: 10 }),

  // Volume metrics
  total_denials: bigint('total_denials', { mode: 'number' }).default(0),
  full_denials: bigint('full_denials', { mode: 'number' }).default(0),
  partial_denials: bigint('partial_denials', { mode: 'number' }).default(0),
  preventable_denials: bigint('preventable_denials', { mode: 'number' }).default(0),

  // Financial metrics (in cents)
  total_denied_amount: bigint('total_denied_amount', { mode: 'number' }).default(0),
  total_appealed_amount: bigint('total_appealed_amount', { mode: 'number' }).default(0),
  total_recovered_amount: bigint('total_recovered_amount', { mode: 'number' }).default(0),
  total_written_off_amount: bigint('total_written_off_amount', { mode: 'number' }).default(0),

  // Appeal metrics
  total_appeals: bigint('total_appeals', { mode: 'number' }).default(0),
  appeals_won: bigint('appeals_won', { mode: 'number' }).default(0),
  appeals_lost: bigint('appeals_lost', { mode: 'number' }).default(0),
  appeals_pending: bigint('appeals_pending', { mode: 'number' }).default(0),

  // Calculated rates (stored as 0-10000 for 0.00% - 100.00%)
  denial_rate: bigint('denial_rate', { mode: 'number' }), // Denials / Total claims
  appeal_rate: bigint('appeal_rate', { mode: 'number' }), // Appeals / Denials
  appeal_success_rate: bigint('appeal_success_rate', { mode: 'number' }), // Won / Total appeals
  preventable_rate: bigint('preventable_rate', { mode: 'number' }), // Preventable / Total denials
  recovery_rate: bigint('recovery_rate', { mode: 'number' }), // Recovered / Denied

  // Timing metrics (in days)
  avg_appeal_cycle_time: bigint('avg_appeal_cycle_time', { mode: 'number' }),
  avg_time_to_appeal: bigint('avg_time_to_appeal', { mode: 'number' }),
  avg_decision_time: bigint('avg_decision_time', { mode: 'number' }),

  // Trending
  trend_direction: varchar('trend_direction', { length: 10 }), // UP, DOWN, STABLE
  trend_percentage: bigint('trend_percentage', { mode: 'number' }), // Change from previous period

  // Metadata
  calculation_date: timestamp('calculation_date').defaultNow().notNull(),
  metadata: jsonb('metadata'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Indexes for performance
// These would be created in the migration file
