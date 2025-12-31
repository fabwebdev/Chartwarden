import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * Billing Module - Revenue Cycle Management
 * Module G - HIGH Priority
 *
 * Purpose: Claims, payments, NOE, AR aging
 * Compliance: Revenue cycle critical, CMS billing requirements
 *
 * Tables:
 * - payers: Insurance companies and payer information
 * - notice_of_election: Hospice election notices (CMS requirement)
 * - claims: Hospice claims (UB-04/institutional)
 * - claim_service_lines: Individual service lines on claims
 * - payments: Payment receipts from payers
 * - payment_applications: Application of payments to claims
 * - billing_periods: Patient billing periods by level of care
 * - ar_aging: Accounts receivable aging analysis
 * - contracts: Payer contracts and rate schedules
 */

/**
 * Payers Table
 * Stores insurance companies, Medicare, Medicaid, and commercial payers
 */
export const payers = pgTable('payers', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  payer_name: varchar('payer_name', { length: 255 }).notNull(),
  payer_type: varchar('payer_type', { length: 50 }), // MEDICARE, MEDICAID, COMMERCIAL, MANAGED_CARE, VA, TRICARE
  payer_id: varchar('payer_id', { length: 100 }), // National Payer ID

  // Contact information
  address_line1: varchar('address_line1', { length: 255 }),
  address_line2: varchar('address_line2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }),
  zip_code: varchar('zip_code', { length: 10 }),

  phone: varchar('phone', { length: 50 }),
  fax: varchar('fax', { length: 50 }),
  email: varchar('email', { length: 255 }),
  contact_name: varchar('contact_name', { length: 255 }),

  // Billing configuration
  electronic_billing_enabled: boolean('electronic_billing_enabled').default(false),
  clearinghouse: varchar('clearinghouse', { length: 100 }),

  is_active: boolean('is_active').default(true).notNull(),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Notice of Election (NOE) Table
 * CMS requirement: Must be filed within 5 calendar days of hospice election
 * Tracks hospice election notices for Medicare patients
 */
export const notice_of_election = pgTable('notice_of_election', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // NOE dates (critical for compliance)
  noe_date: date('noe_date').notNull(), // Date hospice filed NOE
  effective_date: date('effective_date').notNull(), // Hospice election effective date

  // NOE status and timeliness
  noe_status: varchar('noe_status', { length: 50 }).default('PENDING').notNull(), // PENDING, SUBMITTED, ACCEPTED, REJECTED, CANCELLED
  noe_timeliness: varchar('noe_timeliness', { length: 50 }), // TIMELY, LATE

  // Benefit period information
  benefit_period: varchar('benefit_period', { length: 50 }), // INITIAL_90, SUBSEQUENT_90, SUBSEQUENT_60, CONTINUING_60

  // Submission tracking
  submission_date: date('submission_date'),
  acceptance_date: date('acceptance_date'),
  rejection_date: date('rejection_date'),
  rejection_reason: text('rejection_reason'),

  // NOE control number from Medicare
  noe_control_number: varchar('noe_control_number', { length: 100 }),

  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Claims Table
 * Hospice claims (UB-04 institutional claims)
 */
export const claims = pgTable('claims', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),

  // Claim identification
  claim_number: varchar('claim_number', { length: 100 }).unique(),
  claim_type: varchar('claim_type', { length: 50 }), // INSTITUTIONAL, PROFESSIONAL, REPLACEMENT, VOID
  claim_status: varchar('claim_status', { length: 50 }).default('DRAFT').notNull(), // DRAFT, READY_TO_SUBMIT, SUBMITTED, ACCEPTED, REJECTED, PAID, DENIED, APPEALED

  // Service period
  service_start_date: date('service_start_date').notNull(),
  service_end_date: date('service_end_date').notNull(),

  // Bill type (hospice = 81x or 82x)
  bill_type: varchar('bill_type', { length: 4 }), // e.g., 0811, 0812, 0813, 0814, 0821, 0822

  // Financial totals (stored in cents to avoid floating point issues)
  total_charges: integer('total_charges'), // Total billed amount in cents
  total_paid: integer('total_paid'), // Total paid amount in cents
  total_adjustments: integer('total_adjustments'), // Total adjustments in cents
  balance: integer('balance'), // Remaining balance in cents

  // Submission tracking
  submission_date: date('submission_date'),
  submission_method: varchar('submission_method', { length: 50 }), // ELECTRONIC, PAPER
  clearinghouse_trace_number: varchar('clearinghouse_trace_number', { length: 100 }),

  // Payment tracking
  paid_date: date('paid_date'),
  check_number: varchar('check_number', { length: 100 }),

  // Denial/rejection tracking
  denial_reason: text('denial_reason'),
  denial_date: date('denial_date'),

  // Additional data
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // UB-04 Form Fields
  // Occurrence codes (FL 31-34)
  occurrence_codes: jsonb('occurrence_codes'),

  // Value codes (FL 39-41)
  value_codes: jsonb('value_codes'),

  // Condition codes (FL 18-28)
  condition_codes: varchar('condition_codes', { length: 2 }).array(),

  // Provider information (FL 76-79)
  attending_physician_npi: varchar('attending_physician_npi', { length: 10 }),
  attending_physician_name: varchar('attending_physician_name', { length: 255 }),
  attending_physician_qualifier: varchar('attending_physician_qualifier', { length: 2 }),
  operating_physician_npi: varchar('operating_physician_npi', { length: 10 }),
  operating_physician_name: varchar('operating_physician_name', { length: 255 }),
  other_physician_npi: varchar('other_physician_npi', { length: 10 }),
  other_physician_name: varchar('other_physician_name', { length: 255 }),

  // Admission details (FL 12-17)
  admission_date: date('admission_date'),
  admission_hour: varchar('admission_hour', { length: 2 }),
  admission_type: varchar('admission_type', { length: 1 }),
  admission_source: varchar('admission_source', { length: 1 }),
  discharge_status: varchar('discharge_status', { length: 2 }),
  discharge_hour: varchar('discharge_hour', { length: 2 }),

  // Statement period (FL 6)
  statement_from_date: date('statement_from_date'),
  statement_to_date: date('statement_to_date'),

  // Principal diagnosis (FL 67)
  principal_diagnosis_code: varchar('principal_diagnosis_code', { length: 10 }),
  principal_diagnosis_qualifier: varchar('principal_diagnosis_qualifier', { length: 2 }),

  // Other diagnosis codes (FL 67A-Q)
  other_diagnosis_codes: jsonb('other_diagnosis_codes'),

  // Patient reason for visit (FL 70a-c)
  patient_reason_diagnosis: jsonb('patient_reason_diagnosis'),

  // External cause of injury (FL 71-72)
  external_cause_injury_codes: varchar('external_cause_injury_codes', { length: 10 }).array(),

  // Remarks (FL 80)
  remarks: text('remarks'),

  // Document control number (FL 64)
  document_control_number: varchar('document_control_number', { length: 23 }),

  // Employer name (FL 65)
  employer_name: varchar('employer_name', { length: 255 }),

  // Treatment authorization codes (FL 63)
  treatment_authorization_codes: varchar('treatment_authorization_codes', { length: 30 }),

  // PHASE 2: Scrubbing status and validation tracking
  scrubbing_status: varchar('scrubbing_status', { length: 50 }), // PENDING, PASSED, FAILED, CORRECTED
  last_scrubbed_at: timestamp('last_scrubbed_at'),
  scrubbing_passed: boolean('scrubbing_passed'),

  // PHASE 2: EDI control numbers for 837I submission
  edi_interchange_control_number: varchar('edi_interchange_control_number', { length: 50 }), // ISA13
  edi_transaction_set_control_number: varchar('edi_transaction_set_control_number', { length: 50 }), // ST02

  // PHASE 2: Submission readiness tracking
  submission_ready: boolean('submission_ready').default(false),
  submission_blocked_reasons: jsonb('submission_blocked_reasons'), // Array of blocking reasons

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Claim Service Lines Table
 * Individual revenue code lines on hospice claims
 */
export const claim_service_lines = pgTable('claim_service_lines', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),

  line_number: integer('line_number').notNull(), // Line sequence on claim

  service_date: date('service_date').notNull(),

  // Revenue codes (hospice uses 0651-0659)
  revenue_code: varchar('revenue_code', { length: 4 }).notNull(), // e.g., 0651, 0652, 0655, 0656, 0657, 0658, 0659

  // Level of care
  level_of_care: varchar('level_of_care', { length: 50 }), // ROUTINE_HOME_CARE, CONTINUOUS_HOME_CARE, INPATIENT_RESPITE, GENERAL_INPATIENT

  // Units and charges
  units: integer('units').notNull(), // Number of units (days for hospice)
  charges: integer('charges').notNull(), // Line charge amount in cents

  // HCPCS code (if applicable)
  hcpcs_code: varchar('hcpcs_code', { length: 10 }),

  // Payment information
  allowed_amount: integer('allowed_amount'), // Payer allowed amount in cents
  paid_amount: integer('paid_amount'), // Payer paid amount in cents
  adjustment_amount: integer('adjustment_amount'), // Adjustment amount in cents

  // PHASE 2: CBSA tracking for Value Code 61 (RHC/CHC - revenue 0651/0652)
  cbsa_code: varchar('cbsa_code', { length: 5 }), // CBSA code from patient ZIP
  service_location_zip: varchar('service_location_zip', { length: 10 }),
  service_location_city: varchar('service_location_city', { length: 100 }),
  service_location_state: varchar('service_location_state', { length: 2 }),

  // PHASE 2: CBSA tracking for Value Code G8 (GIP/IRC - revenue 0655/0656)
  facility_cbsa_code: varchar('facility_cbsa_code', { length: 5 }), // CBSA code from facility ZIP
  facility_npi: varchar('facility_npi', { length: 10 }),
  facility_name: varchar('facility_name', { length: 255 }),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Payments Table
 * Payment receipts from payers (EOBs, ERAs, checks)
 */
export const payments = pgTable('payments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),

  // Payment identification
  payment_date: date('payment_date').notNull(),
  payment_amount: integer('payment_amount').notNull(), // Total payment amount in cents
  payment_method: varchar('payment_method', { length: 50 }), // CHECK, EFT, ACH, WIRE, CARD

  payment_status: varchar('payment_status', { length: 50 }).default('PENDING').notNull(), // PENDING, DEPOSITED, APPLIED, RECONCILED, VOIDED

  // Payment identification
  check_number: varchar('check_number', { length: 100 }),
  reference_number: varchar('reference_number', { length: 100 }), // EFT trace number or ERA number

  // Deposit tracking
  deposit_date: date('deposit_date'),
  deposit_account: varchar('deposit_account', { length: 100 }),

  // Unapplied tracking
  unapplied_amount: integer('unapplied_amount'), // Amount not yet applied to claims, in cents

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Payment Applications Table
 * Application of payments to specific claims (from EOB/ERA)
 */
export const payment_applications = pgTable('payment_applications', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  payment_id: bigint('payment_id', { mode: 'number' }).references(() => payments.id).notNull(),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),

  // Application amounts (in cents)
  applied_amount: integer('applied_amount').notNull(), // Amount applied to this claim
  adjustment_amount: integer('adjustment_amount'), // Contractual adjustments
  write_off_amount: integer('write_off_amount'), // Write-offs

  // Adjustment reason codes
  adjustment_reason_codes: jsonb('adjustment_reason_codes'),

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Billing Periods Table
 * Tracks patient billing periods by level of care
 * Used to ensure all days are billed
 */
export const billing_periods = pgTable('billing_periods', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Period dates
  period_start: date('period_start').notNull(),
  period_end: date('period_end').notNull(),

  // Level of care during period
  level_of_care: varchar('level_of_care', { length: 50 }).notNull(), // ROUTINE_HOME_CARE, CONTINUOUS_HOME_CARE, INPATIENT_RESPITE, GENERAL_INPATIENT

  // Billing status
  billed: boolean('billed').default(false).notNull(),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id),

  // Financial
  expected_revenue: integer('expected_revenue'), // Expected revenue for period in cents

  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * AR Aging Table
 * Accounts Receivable aging analysis
 * Calculated periodically to track outstanding claims
 */
export const ar_aging = pgTable('ar_aging', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),

  // AR balances (in cents)
  balance: integer('balance').notNull(), // Outstanding balance
  days_outstanding: integer('days_outstanding'), // Days since submission or service

  // Aging buckets
  aging_bucket: varchar('aging_bucket', { length: 50 }), // CURRENT_0_30, AGING_31_60, AGING_61_90, AGING_91_120, AGING_OVER_120

  // Calculation metadata
  calculated_date: date('calculated_date').notNull(),
  calculation_basis: varchar('calculation_basis', { length: 50 }), // SUBMISSION_DATE, SERVICE_DATE

  // AR status flags
  follow_up_required: boolean('follow_up_required').default(false),
  follow_up_date: date('follow_up_date'),
  follow_up_notes: text('follow_up_notes'),

  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Contracts Table
 * Payer contracts with rate schedules
 */
export const contracts = pgTable('contracts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id).notNull(),

  contract_name: varchar('contract_name', { length: 255 }),
  contract_number: varchar('contract_number', { length: 100 }),

  // Contract period
  effective_date: date('effective_date').notNull(),
  termination_date: date('termination_date'),

  // Auto-renewal
  auto_renew: boolean('auto_renew').default(false),
  renewal_notice_days: integer('renewal_notice_days'), // Days before termination to notify

  // Rate schedules (per diem rates by level of care)
  rates: jsonb('rates'),

  // Contract terms
  payment_terms: varchar('payment_terms', { length: 100 }), // e.g., "Net 30", "Net 45"
  contract_type: varchar('contract_type', { length: 50 }), // PER_DIEM, FEE_FOR_SERVICE, CAPITATED

  is_active: boolean('is_active').default(true).notNull(),

  notes: text('notes'),

  // Document storage
  contract_document_url: text('contract_document_url'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});
