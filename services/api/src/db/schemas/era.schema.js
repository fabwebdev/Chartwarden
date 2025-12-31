import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, date, decimal } from 'drizzle-orm/pg-core';
import { claims } from './billing.schema.js';
import { payers } from './billing.schema.js';
import { users } from './user.schema.js';

/**
 * ERA (Electronic Remittance Advice) Processing Module
 * Phase 3B - Automated Payment Posting
 *
 * Purpose: 835 EDI transaction processing for payment reconciliation
 * Compliance: HIPAA 5010 835 standards
 *
 * Tables:
 * - era_files: Track received 835 EDI files
 * - era_payments: Payment details extracted from 835s
 * - payment_postings: Automated posting records
 * - posting_exceptions: Unmatched/partial payments requiring review
 * - reconciliation_batches: Daily deposit reconciliation
 */

/**
 * ERA Files Table
 * Tracks all received 835 EDI files
 */
export const era_files = pgTable('era_files', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // File identification
  file_id: varchar('file_id', { length: 50 }).unique().notNull(), // Unique file tracking ID
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_size: bigint('file_size', { mode: 'number' }), // File size in bytes

  // 835 transaction data
  edi_835_content: text('edi_835_content'), // Full 835 EDI content
  control_number: varchar('control_number', { length: 50 }), // ISA13 control number

  // Payer information
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),
  payer_name: varchar('payer_name', { length: 255 }),
  payer_identifier: varchar('payer_identifier', { length: 50 }), // Payer ID from 835

  // File metadata
  production_date: date('production_date'), // Date 835 was created by payer
  received_date: timestamp('received_date').defaultNow().notNull(),

  // Processing status
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  // PENDING, PROCESSING, COMPLETED, ERROR, PARTIALLY_POSTED
  processed_at: timestamp('processed_at'),

  // File summary
  total_payments: bigint('total_payments', { mode: 'number' }).default(0), // Count of payments in file
  total_amount: bigint('total_amount', { mode: 'number' }).default(0), // Total payment amount in cents
  total_claims: bigint('total_claims', { mode: 'number' }).default(0), // Count of claims

  // Posting summary
  auto_posted_count: bigint('auto_posted_count', { mode: 'number' }).default(0),
  exception_count: bigint('exception_count', { mode: 'number' }).default(0),

  // Source information
  source: varchar('source', { length: 50 }), // SFTP, API, MANUAL_UPLOAD, EMAIL
  source_path: varchar('source_path', { length: 500 }), // Original file path

  // Error tracking
  error_message: text('error_message'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  uploaded_by_id: text('uploaded_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * ERA Payments Table
 * Payment details extracted from 835 transactions
 */
export const era_payments = pgTable('era_payments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // ERA file reference
  era_file_id: bigint('era_file_id', { mode: 'number' }).references(() => era_files.id).notNull(),

  // Payment identification
  payment_id: varchar('payment_id', { length: 50 }).unique().notNull(), // Internal tracking ID
  check_number: varchar('check_number', { length: 50 }), // Check/EFT number (TRN02)
  check_date: date('check_date'), // Payment date

  // Payer information
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),
  payer_name: varchar('payer_name', { length: 255 }),
  payer_identifier: varchar('payer_identifier', { length: 50 }),

  // Payee (provider) information
  payee_name: varchar('payee_name', { length: 255 }),
  payee_npi: varchar('payee_npi', { length: 10 }),
  payee_tax_id: varchar('payee_tax_id', { length: 20 }),

  // Payment amounts (in cents)
  total_payment_amount: bigint('total_payment_amount', { mode: 'number' }).notNull(),
  total_billed_amount: bigint('total_billed_amount', { mode: 'number' }),
  total_allowed_amount: bigint('total_allowed_amount', { mode: 'number' }),
  total_adjustment_amount: bigint('total_adjustment_amount', { mode: 'number' }),

  // Payment method
  payment_method: varchar('payment_method', { length: 50 }), // CHECK, EFT, VIRTUAL_CARD
  payment_format: varchar('payment_format', { length: 50 }), // CCD, CCD+, CTX

  // Claim reference
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id),
  patient_account_number: varchar('patient_account_number', { length: 50 }),
  patient_name: varchar('patient_name', { length: 255 }),

  // Claim-level information
  claim_statement_period_start: date('claim_statement_period_start'),
  claim_statement_period_end: date('claim_statement_period_end'),
  claim_status: varchar('claim_status', { length: 50 }), // PAID, DENIED, PARTIAL, ADJUSTED

  // Service line details
  service_line_count: bigint('service_line_count', { mode: 'number' }),

  // CARC/RARC codes (adjustment reasons)
  adjustment_codes: jsonb('adjustment_codes'), // Array of {group, code, amount, quantity}
  remark_codes: jsonb('remark_codes'), // Array of RARC codes

  // Posting status
  posting_status: varchar('posting_status', { length: 50 }).default('PENDING').notNull(),
  // PENDING, AUTO_POSTED, MANUAL_POSTED, EXCEPTION, DENIED
  posted_at: timestamp('posted_at'),
  posted_by_id: text('posted_by_id').references(() => users.id),

  // Exception handling
  is_exception: boolean('is_exception').default(false),
  exception_reason: text('exception_reason'),
  exception_resolved_at: timestamp('exception_resolved_at'),

  // Raw segment data
  claim_payment_info: jsonb('claim_payment_info'), // CLP segment data
  service_payment_info: jsonb('service_payment_info'), // SVC segment data

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Payment Postings Table
 * Audit trail of automated and manual payment postings
 */
export const payment_postings = pgTable('payment_postings', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Payment reference
  era_payment_id: bigint('era_payment_id', { mode: 'number' }).references(() => era_payments.id).notNull(),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),

  // Posting identification
  posting_id: varchar('posting_id', { length: 50 }).unique().notNull(),
  posting_date: timestamp('posting_date').defaultNow().notNull(),

  // Posting type
  posting_type: varchar('posting_type', { length: 50 }).notNull(), // AUTO, MANUAL, ADJUSTMENT
  posting_level: varchar('posting_level', { length: 50 }), // CLAIM, SERVICE_LINE

  // Amounts posted (in cents)
  payment_amount: bigint('payment_amount', { mode: 'number' }).notNull(),
  allowed_amount: bigint('allowed_amount', { mode: 'number' }),
  billed_amount: bigint('billed_amount', { mode: 'number' }),
  adjustment_amount: bigint('adjustment_amount', { mode: 'number' }),
  contractual_adjustment: bigint('contractual_adjustment', { mode: 'number' }),
  patient_responsibility: bigint('patient_responsibility', { mode: 'number' }),
  write_off_amount: bigint('write_off_amount', { mode: 'number' }),

  // Adjustment details
  adjustment_reason_codes: jsonb('adjustment_reason_codes'), // CARC codes applied
  adjustment_details: jsonb('adjustment_details'),

  // Claim balance updates
  previous_balance: bigint('previous_balance', { mode: 'number' }),
  new_balance: bigint('new_balance', { mode: 'number' }),

  // Service line reference (if line-level posting)
  service_line_number: bigint('service_line_number', { mode: 'number' }),
  procedure_code: varchar('procedure_code', { length: 20 }),
  service_date: date('service_date'),

  // Posting validation
  is_validated: boolean('is_validated').default(true),
  validation_notes: text('validation_notes'),

  // Reversal tracking
  is_reversed: boolean('is_reversed').default(false),
  reversed_at: timestamp('reversed_at'),
  reversed_by_id: text('reversed_by_id').references(() => users.id),
  reversal_reason: text('reversal_reason'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  posted_by_id: text('posted_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Posting Exceptions Table
 * Tracks payments that couldn't be auto-posted
 */
export const posting_exceptions = pgTable('posting_exceptions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Payment reference
  era_payment_id: bigint('era_payment_id', { mode: 'number' }).references(() => era_payments.id).notNull(),
  era_file_id: bigint('era_file_id', { mode: 'number' }).references(() => era_files.id).notNull(),

  // Exception identification
  exception_id: varchar('exception_id', { length: 50 }).unique().notNull(),
  exception_type: varchar('exception_type', { length: 50 }).notNull(),
  // CLAIM_NOT_FOUND, AMOUNT_MISMATCH, DUPLICATE_PAYMENT, PARTIAL_PAYMENT,
  // PATIENT_MISMATCH, INVALID_CLAIM_STATUS, MISSING_REQUIRED_DATA

  // Exception details
  exception_reason: text('exception_reason').notNull(),
  exception_severity: varchar('exception_severity', { length: 20 }).default('MEDIUM'),
  // LOW, MEDIUM, HIGH, CRITICAL

  // Payment information
  check_number: varchar('check_number', { length: 50 }),
  payment_amount: bigint('payment_amount', { mode: 'number' }),
  patient_account_number: varchar('patient_account_number', { length: 50 }),

  // Attempted match information
  attempted_claim_id: bigint('attempted_claim_id', { mode: 'number' }).references(() => claims.id),
  match_confidence_score: decimal('match_confidence_score', { precision: 5, scale: 2 }), // 0.00-100.00

  // Resolution status
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  // PENDING, ASSIGNED, IN_REVIEW, RESOLVED, CLOSED
  assigned_to_id: text('assigned_to_id').references(() => users.id),
  assigned_at: timestamp('assigned_at'),

  // Resolution details
  resolution_type: varchar('resolution_type', { length: 50 }),
  // MANUAL_POSTED, CLAIM_CORRECTED, PAYER_CONTACTED, WRITTEN_OFF, REFUNDED
  resolution_notes: text('resolution_notes'),
  resolved_at: timestamp('resolved_at'),
  resolved_by_id: text('resolved_by_id').references(() => users.id),

  // Follow-up tracking
  follow_up_required: boolean('follow_up_required').default(false),
  follow_up_date: date('follow_up_date'),
  follow_up_notes: text('follow_up_notes'),

  // SLA tracking
  created_at: timestamp('created_at').defaultNow().notNull(),
  sla_deadline: timestamp('sla_deadline'), // Auto-calculated based on severity
  is_overdue: boolean('is_overdue').default(false),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Reconciliation Batches Table
 * Daily deposit reconciliation tracking
 */
export const reconciliation_batches = pgTable('reconciliation_batches', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Batch identification
  batch_id: varchar('batch_id', { length: 50 }).unique().notNull(),
  batch_date: date('batch_date').notNull(), // Business day for reconciliation

  // Deposit information
  deposit_date: date('deposit_date'),
  deposit_amount: bigint('deposit_amount', { mode: 'number' }), // Expected deposit amount (in cents)
  bank_statement_amount: bigint('bank_statement_amount', { mode: 'number' }), // Actual bank amount

  // ERA totals
  era_file_count: bigint('era_file_count', { mode: 'number' }).default(0),
  total_era_payments: bigint('total_era_payments', { mode: 'number' }).default(0), // Sum of all ERA payments
  total_posted_payments: bigint('total_posted_payments', { mode: 'number' }).default(0),

  // Reconciliation results
  variance_amount: bigint('variance_amount', { mode: 'number' }), // Difference between expected and actual
  is_reconciled: boolean('is_reconciled').default(false),
  reconciliation_status: varchar('reconciliation_status', { length: 50 }).default('PENDING'),
  // PENDING, IN_PROGRESS, RECONCILED, VARIANCE_IDENTIFIED, EXCEPTION

  // Variance breakdown
  unmatched_deposits: jsonb('unmatched_deposits'), // Bank deposits without ERAs
  unmatched_eras: jsonb('unmatched_eras'), // ERAs without bank deposits

  // Bank statement details
  bank_account_number: varchar('bank_account_number', { length: 50 }),
  bank_routing_number: varchar('bank_routing_number', { length: 20 }),
  bank_statement_reference: varchar('bank_statement_reference', { length: 100 }),

  // Reconciliation notes
  reconciliation_notes: text('reconciliation_notes'),
  variance_explanation: text('variance_explanation'),

  // Approval tracking
  approved_by_id: text('approved_by_id').references(() => users.id),
  approved_at: timestamp('approved_at'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  reconciled_by_id: text('reconciled_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});
