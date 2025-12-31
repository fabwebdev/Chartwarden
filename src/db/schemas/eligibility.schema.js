import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, date } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { payers } from './billing.schema.js';
import { users } from './user.schema.js';

/**
 * Eligibility Verification Module
 * Phase 3A - Real-time Insurance Eligibility Verification
 *
 * Purpose: 270/271 EDI transaction processing for insurance verification
 * Compliance: HIPAA 5010 270/271 standards
 *
 * Tables:
 * - eligibility_requests: Track 270 eligibility inquiry requests
 * - eligibility_responses: Store 271 eligibility response data
 * - patient_coverage: Current coverage snapshot for quick access
 * - benefit_details: Detailed benefit information extracted from 271
 */

/**
 * Eligibility Requests Table
 * Tracks all 270 EDI eligibility inquiry transactions
 */
export const eligibility_requests = pgTable('eligibility_requests', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Request identification
  request_id: varchar('request_id', { length: 50 }).unique().notNull(), // Unique tracking ID
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),

  // Request details
  request_type: varchar('request_type', { length: 50 }).default('REAL_TIME').notNull(), // REAL_TIME, BATCH
  service_type: varchar('service_type', { length: 50 }).default('HOSPICE').notNull(), // HOSPICE, MEDICAL, etc.
  request_date: timestamp('request_date').defaultNow().notNull(),

  // 270 transaction data
  edi_270_content: text('edi_270_content'), // Full 270 EDI content
  control_number: varchar('control_number', { length: 50 }), // ISA13 control number

  // Subscriber information (from 270)
  subscriber_id: varchar('subscriber_id', { length: 50 }), // Member ID
  subscriber_first_name: varchar('subscriber_first_name', { length: 100 }),
  subscriber_last_name: varchar('subscriber_last_name', { length: 100 }),
  subscriber_dob: date('subscriber_dob'),

  // Provider information (requester)
  provider_npi: varchar('provider_npi', { length: 10 }),
  provider_tax_id: varchar('provider_tax_id', { length: 20 }),
  provider_name: varchar('provider_name', { length: 255 }),

  // Request status
  status: varchar('status', { length: 50 }).default('PENDING').notNull(), // PENDING, SENT, RECEIVED, ERROR, TIMEOUT
  sent_at: timestamp('sent_at'),

  // Submission details
  submission_method: varchar('submission_method', { length: 50 }), // API, SFTP, HTTPS
  clearinghouse_name: varchar('clearinghouse_name', { length: 100 }),
  clearinghouse_trace_id: varchar('clearinghouse_trace_id', { length: 100 }),

  // Error tracking
  error_message: text('error_message'),
  retry_count: bigint('retry_count', { mode: 'number' }).default(0),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Eligibility Responses Table
 * Stores 271 EDI eligibility response data
 */
export const eligibility_responses = pgTable('eligibility_responses', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Response identification
  request_id: bigint('request_id', { mode: 'number' }).references(() => eligibility_requests.id).notNull(),
  response_id: varchar('response_id', { length: 50 }).unique().notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),

  // Response details
  response_date: timestamp('response_date').defaultNow().notNull(),
  received_at: timestamp('received_at').defaultNow().notNull(),

  // 271 transaction data
  edi_271_content: text('edi_271_content'), // Full 271 EDI content
  control_number: varchar('control_number', { length: 50 }), // ISA13 control number

  // Eligibility status (from 271)
  eligibility_status: varchar('eligibility_status', { length: 50 }), // ACTIVE, INACTIVE, UNKNOWN
  is_eligible: boolean('is_eligible'),

  // Coverage period
  coverage_effective_date: date('coverage_effective_date'),
  coverage_termination_date: date('coverage_termination_date'),

  // Plan information
  plan_name: varchar('plan_name', { length: 255 }),
  plan_number: varchar('plan_number', { length: 100 }),
  group_number: varchar('group_number', { length: 100 }),

  // Subscriber information (from 271)
  subscriber_id: varchar('subscriber_id', { length: 50 }),
  subscriber_name: varchar('subscriber_name', { length: 255 }),
  relationship_to_subscriber: varchar('relationship_to_subscriber', { length: 50 }), // SELF, SPOUSE, CHILD, OTHER

  // Coverage details
  service_type_code: varchar('service_type_code', { length: 10 }), // 42 = Hospice
  coverage_level: varchar('coverage_level', { length: 50 }), // INDIVIDUAL, FAMILY

  // Financial information
  copay_amount: bigint('copay_amount', { mode: 'number' }), // In cents
  deductible_amount: bigint('deductible_amount', { mode: 'number' }), // In cents
  deductible_met: bigint('deductible_met', { mode: 'number' }), // In cents
  out_of_pocket_max: bigint('out_of_pocket_max', { mode: 'number' }), // In cents
  out_of_pocket_met: bigint('out_of_pocket_met', { mode: 'number' }), // In cents
  coinsurance_percentage: bigint('coinsurance_percentage', { mode: 'number' }), // 0-100

  // Benefit limitations
  limitations: text('limitations'),
  authorization_required: boolean('authorization_required'),
  authorization_number: varchar('authorization_number', { length: 100 }),

  // Additional coverage info
  additional_payer_info: jsonb('additional_payer_info'), // Secondary payers, COB

  // Rejection/Error details
  rejection_reason: text('rejection_reason'),
  follow_up_action: text('follow_up_action'),

  // Validity tracking
  valid_until: timestamp('valid_until'), // Cache expiration (typically 30 days)
  is_current: boolean('is_current').default(true), // Latest response for this patient

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Patient Coverage Table
 * Current active coverage snapshot for quick access
 * Updated from latest eligibility response
 */
export const patient_coverage = pgTable('patient_coverage', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull().unique(),
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),

  // Coverage status
  is_active: boolean('is_active').default(false).notNull(),
  eligibility_verified: boolean('eligibility_verified').default(false),
  last_verified_date: timestamp('last_verified_date'),

  // Coverage dates
  effective_date: date('effective_date'),
  termination_date: date('termination_date'),

  // Plan details
  plan_name: varchar('plan_name', { length: 255 }),
  plan_number: varchar('plan_number', { length: 100 }),
  group_number: varchar('group_number', { length: 100 }),
  member_id: varchar('member_id', { length: 50 }),

  // Financial summary
  copay_amount: bigint('copay_amount', { mode: 'number' }), // In cents
  deductible_amount: bigint('deductible_amount', { mode: 'number' }),
  deductible_remaining: bigint('deductible_remaining', { mode: 'number' }),
  out_of_pocket_max: bigint('out_of_pocket_max', { mode: 'number' }),
  out_of_pocket_remaining: bigint('out_of_pocket_remaining', { mode: 'number' }),

  // Authorization requirements
  authorization_required: boolean('authorization_required').default(false),
  authorization_number: varchar('authorization_number', { length: 100 }),
  authorization_expiration: date('authorization_expiration'),

  // Service limitations
  hospice_covered: boolean('hospice_covered').default(true),
  limitations: text('limitations'),

  // Link to source
  latest_response_id: bigint('latest_response_id', { mode: 'number' }).references(() => eligibility_responses.id),

  // Cache control
  cache_expires_at: timestamp('cache_expires_at'), // 30 days from last verification

  // Alerts
  needs_reverification: boolean('needs_reverification').default(false),
  reverification_reason: text('reverification_reason'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Benefit Details Table
 * Detailed benefit information extracted from 271 responses
 * One or more benefit records per eligibility response
 */
export const benefit_details = pgTable('benefit_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  response_id: bigint('response_id', { mode: 'number' }).references(() => eligibility_responses.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Benefit identification
  service_type_code: varchar('service_type_code', { length: 10 }), // EB01 (30=Health Benefit Plan, 42=Hospice)
  coverage_level: varchar('coverage_level', { length: 50 }), // EB02 (IND, FAM, etc.)
  time_period_qualifier: varchar('time_period_qualifier', { length: 10 }), // EB06 (23=Calendar Year, 24=Year to Date)

  // Benefit amounts
  monetary_amount: bigint('monetary_amount', { mode: 'number' }), // EB03 in cents
  percentage_amount: bigint('percentage_amount', { mode: 'number' }), // EB04 (0-100)
  quantity: bigint('quantity', { mode: 'number' }), // EB05 (visit count, day count)

  // In-network vs out-of-network
  in_network: boolean('in_network'),

  // Benefit description
  benefit_type: varchar('benefit_type', { length: 100 }), // COPAY, DEDUCTIBLE, COINSURANCE, LIMIT, etc.
  description: text('description'),

  // Date ranges
  benefit_begin_date: date('benefit_begin_date'),
  benefit_end_date: date('benefit_end_date'),

  // Authorization
  authorization_required: boolean('authorization_required'),

  // Additional info
  additional_info: jsonb('additional_info'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull()
});
