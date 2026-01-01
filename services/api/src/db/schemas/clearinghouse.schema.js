import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, index, date } from 'drizzle-orm/pg-core';
import { claims, payers } from './billing.schema.js';
import { users } from './user.schema.js';

/**
 * Clearinghouse & Claim Validation Module
 * Phase 2B & 2C - Electronic Submission Features
 *
 * Purpose: Track 837I EDI file submissions, acknowledgments, and claim validation
 * Compliance: CMS electronic submission, HIPAA 5010, and pre-submission validation requirements
 *
 * Tables:
 * - clearinghouse_configurations: Clearinghouse setup and connection settings
 * - clearinghouse_transmission_batches: Track batch transmissions to clearinghouses
 * - clearinghouse_submissions: Track 837I submissions and acknowledgments per claim
 * - clearinghouse_response_files: Incoming response files (999, 277, TA1)
 * - clearinghouse_response_details: Parsed response details per claim
 * - claim_validation_results: Comprehensive claim scrubbing audit trail
 */

/**
 * Clearinghouse Configurations Table
 * Stores clearinghouse connection settings and credentials
 * Supports multiple clearinghouses for different payers
 */
export const clearinghouse_configurations = pgTable('clearinghouse_configurations', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Clearinghouse identification
  name: varchar('name', { length: 100 }).notNull(),
  clearinghouse_id: varchar('clearinghouse_id', { length: 50 }).unique().notNull(),
  description: text('description'),

  // Clearinghouse type
  clearinghouse_type: varchar('clearinghouse_type', { length: 50 }).notNull(),
  // Types: AVAILITY, CHANGE_HEALTHCARE, TRIZETTO, WAYSTAR, OPTUM, OFFICE_ALLY, OTHER

  // Connection settings
  connection_type: varchar('connection_type', { length: 30 }).notNull(), // SFTP, API, DIRECT_CONNECT
  host: varchar('host', { length: 255 }),
  port: integer('port'),
  username: varchar('username', { length: 100 }),
  // Note: password/credentials stored in secure vault, reference stored here
  credential_vault_key: varchar('credential_vault_key', { length: 255 }),

  // SFTP-specific settings
  sftp_inbound_path: varchar('sftp_inbound_path', { length: 500 }),
  sftp_outbound_path: varchar('sftp_outbound_path', { length: 500 }),
  sftp_response_path: varchar('sftp_response_path', { length: 500 }),

  // API-specific settings
  api_base_url: varchar('api_base_url', { length: 500 }),
  api_version: varchar('api_version', { length: 20 }),

  // Submitter identification (used in ISA/GS segments)
  submitter_id: varchar('submitter_id', { length: 50 }), // ISA06
  submitter_qualifier: varchar('submitter_qualifier', { length: 2 }), // ISA05
  receiver_id: varchar('receiver_id', { length: 50 }), // ISA08
  receiver_qualifier: varchar('receiver_qualifier', { length: 2 }), // ISA07
  application_sender_code: varchar('application_sender_code', { length: 15 }), // GS02
  application_receiver_code: varchar('application_receiver_code', { length: 15 }), // GS03

  // Supported transaction types
  supported_transactions: jsonb('supported_transactions'), // ['837I', '837P', '270', '276']

  // Default payer (if clearinghouse is payer-specific)
  default_payer_id: bigint('default_payer_id', { mode: 'number' }).references(() => payers.id),

  // Operational settings
  is_production: boolean('is_production').default(false),
  is_active: boolean('is_active').default(true).notNull(),
  auto_fetch_responses: boolean('auto_fetch_responses').default(true),
  response_poll_interval_minutes: integer('response_poll_interval_minutes').default(30),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  clearinghouseIdIdx: index('idx_ch_config_clearinghouse_id').on(table.clearinghouse_id),
  activeIdx: index('idx_ch_config_active').on(table.is_active),
}));

/**
 * Clearinghouse Transmission Batches Table
 * Tracks batch transmissions of 837I files to clearinghouses
 * A batch may contain multiple claims submitted together
 */
export const clearinghouse_transmission_batches = pgTable('clearinghouse_transmission_batches', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Batch identification
  batch_id: varchar('batch_id', { length: 50 }).unique().notNull(),
  batch_date: date('batch_date').notNull(),

  // Clearinghouse reference
  clearinghouse_config_id: bigint('clearinghouse_config_id', { mode: 'number' }).references(() => clearinghouse_configurations.id).notNull(),

  // Transmission details
  transmission_type: varchar('transmission_type', { length: 30 }).notNull(), // SFTP, API, MANUAL
  transmission_date: timestamp('transmission_date').notNull(),
  transmission_direction: varchar('transmission_direction', { length: 20 }).default('OUTBOUND').notNull(), // OUTBOUND, INBOUND

  // EDI file information
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_path: text('file_path'),
  file_size: bigint('file_size', { mode: 'number' }), // In bytes
  file_checksum: varchar('file_checksum', { length: 64 }), // SHA-256 hash

  // EDI envelope control numbers
  interchange_control_number: varchar('interchange_control_number', { length: 50 }), // ISA13
  group_control_number: varchar('group_control_number', { length: 50 }), // GS06
  transaction_count: integer('transaction_count'), // Number of ST segments

  // Batch contents summary
  claim_count: integer('claim_count').default(0),
  total_charges: bigint('total_charges', { mode: 'number' }), // Total charges in cents
  payer_ids: jsonb('payer_ids'), // Array of payer IDs in this batch

  // Transmission status
  transmission_status: varchar('transmission_status', { length: 50 }).default('PENDING').notNull(),
  // Status values: PENDING, TRANSMITTING, TRANSMITTED, FAILED, ACKNOWLEDGED, ACCEPTED, REJECTED, PARTIAL
  status_date: timestamp('status_date').defaultNow().notNull(),

  // Connection details
  remote_host: varchar('remote_host', { length: 255 }),
  remote_path: varchar('remote_path', { length: 500 }),
  connection_id: varchar('connection_id', { length: 100 }), // Session/connection reference

  // Response tracking
  response_received: boolean('response_received').default(false),
  response_received_at: timestamp('response_received_at'),
  response_file_id: bigint('response_file_id', { mode: 'number' }), // FK to clearinghouse_response_files

  // Error tracking
  transmission_errors: jsonb('transmission_errors'), // Connection/transmission errors
  retry_count: integer('retry_count').default(0),
  last_retry_at: timestamp('last_retry_at'),
  max_retries: integer('max_retries').default(3),

  // EDI content (optional, for audit purposes)
  edi_content: text('edi_content'),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit fields
  transmitted_by_id: text('transmitted_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  batchIdIdx: index('idx_ch_batch_batch_id').on(table.batch_id),
  clearinghouseIdx: index('idx_ch_batch_clearinghouse').on(table.clearinghouse_config_id),
  statusIdx: index('idx_ch_batch_status').on(table.transmission_status),
  batchDateIdx: index('idx_ch_batch_date').on(table.batch_date),
  icnIdx: index('idx_ch_batch_icn').on(table.interchange_control_number),
  statusDateIdx: index('idx_ch_batch_status_date').on(table.transmission_status, table.status_date),
}));

/**
 * Clearinghouse Submissions Table
 * Tracks 837I EDI file submissions to clearinghouses and acknowledgments per claim
 */
export const clearinghouse_submissions = pgTable('clearinghouse_submissions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),

  // Batch reference (if part of a batch)
  batch_id: bigint('batch_id', { mode: 'number' }).references(() => clearinghouse_transmission_batches.id),

  // Submission details
  submission_batch_id: varchar('submission_batch_id', { length: 100 }), // Legacy field for external batch IDs
  submission_date: timestamp('submission_date').notNull(),
  submission_method: varchar('submission_method', { length: 50 }).default('EDI_FILE').notNull(), // EDI_FILE, SFTP, API

  // File information
  edi_file_name: varchar('edi_file_name', { length: 255 }),
  edi_file_path: text('edi_file_path'),
  edi_control_number: varchar('edi_control_number', { length: 50 }), // ISA13 control number
  edi_group_control_number: varchar('edi_group_control_number', { length: 50 }), // GS06
  edi_transaction_control_number: varchar('edi_transaction_control_number', { length: 50 }), // ST02
  edi_content: text('edi_content'), // Full 837I content for audit

  // Clearinghouse details
  clearinghouse_name: varchar('clearinghouse_name', { length: 100 }),
  clearinghouse_id: varchar('clearinghouse_id', { length: 50 }),
  clearinghouse_trace_number: varchar('clearinghouse_trace_number', { length: 100 }), // CH-assigned tracking number

  // Payer information
  payer_id: bigint('payer_id', { mode: 'number' }).references(() => payers.id),
  payer_claim_control_number: varchar('payer_claim_control_number', { length: 100 }), // Payer-assigned claim ID

  // TA1 (Interchange Acknowledgment) tracking
  ta1_received: boolean('ta1_received').default(false),
  ta1_received_at: timestamp('ta1_received_at'),
  ta1_status: varchar('ta1_status', { length: 20 }), // A=Accepted, E=Accepted with Errors, R=Rejected
  ta1_error_code: varchar('ta1_error_code', { length: 10 }),
  ta1_details: jsonb('ta1_details'),

  // 999 (Functional Acknowledgment) tracking
  ack_999_received: boolean('ack_999_received').default(false),
  ack_999_received_at: timestamp('ack_999_received_at'),
  ack_999_status: varchar('ack_999_status', { length: 20 }), // A=Accepted, E=Accepted with Errors, R=Rejected
  ack_999_error_codes: jsonb('ack_999_error_codes'), // Array of {code, description}
  ack_999_details: jsonb('ack_999_details'),

  // 277CA (Claim Acknowledgment) tracking
  acknowledgment_status: varchar('acknowledgment_status', { length: 50 }), // PENDING, ACCEPTED, ACCEPTED_WITH_ERRORS, REJECTED
  acknowledgment_date: timestamp('acknowledgment_date'),
  acknowledgment_details: jsonb('acknowledgment_details'),

  // 277 (Claim Status Response) tracking
  claim_status_category_code: varchar('claim_status_category_code', { length: 10 }), // A0-A8, etc.
  claim_status_code: varchar('claim_status_code', { length: 10 }), // Specific status code
  claim_status_entity: varchar('claim_status_entity', { length: 50 }), // PR=Payer, CH=Clearinghouse

  // Overall submission status
  current_status: varchar('current_status', { length: 50 }).default('SUBMITTED').notNull(),
  // Status: PENDING, SUBMITTED, TRANSMITTING, TRANSMITTED, ACKNOWLEDGED, ACCEPTED, REJECTED, ERROR, PAYER_RECEIVED
  status_date: timestamp('status_date').defaultNow().notNull(),

  // Submission amounts (in cents)
  submitted_charges: integer('submitted_charges'),

  // Error tracking
  errors: jsonb('errors'), // Array of error objects {code, message, severity, field}
  warnings: jsonb('warnings'), // Array of warning objects

  // Retry tracking
  retry_count: integer('retry_count').default(0),
  last_retry_at: timestamp('last_retry_at'),
  can_retry: boolean('can_retry').default(true),

  // Metadata
  metadata: jsonb('metadata'),
  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  claimIdx: index('idx_ch_sub_claim').on(table.claim_id),
  batchIdx: index('idx_ch_sub_batch').on(table.batch_id),
  statusIdx: index('idx_ch_sub_status').on(table.current_status),
  submissionDateIdx: index('idx_ch_sub_date').on(table.submission_date),
  icnIdx: index('idx_ch_sub_icn').on(table.edi_control_number),
  payerIdx: index('idx_ch_sub_payer').on(table.payer_id),
  clearinghouseIdx: index('idx_ch_sub_clearinghouse').on(table.clearinghouse_id),
  claimStatusIdx: index('idx_ch_sub_claim_status').on(table.claim_id, table.current_status),
}));

/**
 * Clearinghouse Response Files Table
 * Tracks incoming response files (999, 277, TA1) from clearinghouses
 */
export const clearinghouse_response_files = pgTable('clearinghouse_response_files', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // File identification
  file_id: varchar('file_id', { length: 50 }).unique().notNull(),
  file_name: varchar('file_name', { length: 255 }).notNull(),
  file_path: text('file_path'),
  file_size: bigint('file_size', { mode: 'number' }),
  file_checksum: varchar('file_checksum', { length: 64 }),

  // Response type
  response_type: varchar('response_type', { length: 20 }).notNull(),
  // Types: TA1, 999, 277CA, 277, 835, OTHER

  // Clearinghouse reference
  clearinghouse_config_id: bigint('clearinghouse_config_id', { mode: 'number' }).references(() => clearinghouse_configurations.id),
  clearinghouse_name: varchar('clearinghouse_name', { length: 100 }),

  // Related outbound batch
  original_batch_id: bigint('original_batch_id', { mode: 'number' }).references(() => clearinghouse_transmission_batches.id),
  original_icn: varchar('original_icn', { length: 50 }), // Original ISA13 being acknowledged

  // Response file control numbers
  response_icn: varchar('response_icn', { length: 50 }), // ISA13 of response file
  response_gcn: varchar('response_gcn', { length: 50 }), // GS06 of response file

  // File dates
  file_creation_date: timestamp('file_creation_date'), // Date in ISA09
  received_date: timestamp('received_date').defaultNow().notNull(),

  // Processing status
  processing_status: varchar('processing_status', { length: 50 }).default('PENDING').notNull(),
  // Status: PENDING, PROCESSING, PROCESSED, ERROR, PARTIAL
  processed_at: timestamp('processed_at'),

  // Summary counts
  total_transactions: integer('total_transactions'),
  accepted_count: integer('accepted_count').default(0),
  rejected_count: integer('rejected_count').default(0),
  error_count: integer('error_count').default(0),

  // EDI content
  edi_content: text('edi_content'),

  // Error tracking
  processing_errors: jsonb('processing_errors'),

  // Source information
  source: varchar('source', { length: 50 }), // SFTP, API, EMAIL, MANUAL_UPLOAD
  source_path: varchar('source_path', { length: 500 }),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  processed_by_id: text('processed_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  fileIdIdx: index('idx_ch_resp_file_id').on(table.file_id),
  responseTypeIdx: index('idx_ch_resp_type').on(table.response_type),
  processingStatusIdx: index('idx_ch_resp_status').on(table.processing_status),
  originalBatchIdx: index('idx_ch_resp_original_batch').on(table.original_batch_id),
  originalIcnIdx: index('idx_ch_resp_original_icn').on(table.original_icn),
  receivedDateIdx: index('idx_ch_resp_received').on(table.received_date),
}));

/**
 * Clearinghouse Response Details Table
 * Parsed response details per claim from response files
 * Links responses back to original submissions
 */
export const clearinghouse_response_details = pgTable('clearinghouse_response_details', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Response file reference
  response_file_id: bigint('response_file_id', { mode: 'number' }).references(() => clearinghouse_response_files.id).notNull(),

  // Related submission
  submission_id: bigint('submission_id', { mode: 'number' }).references(() => clearinghouse_submissions.id),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id),

  // Response identification
  response_type: varchar('response_type', { length: 20 }).notNull(), // TA1, 999, 277CA, 277

  // Control number references
  original_icn: varchar('original_icn', { length: 50 }), // ISA13 of original submission
  original_gcn: varchar('original_gcn', { length: 50 }), // GS06 of original submission
  original_tcn: varchar('original_tcn', { length: 50 }), // ST02 of original transaction

  // Response status
  response_status: varchar('response_status', { length: 20 }).notNull(),
  // TA1: A=Accepted, E=Accepted with Errors, R=Rejected
  // 999: A=Accepted, E=Accepted with Errors, R=Rejected
  // 277: Use claim_status_category_code

  // TA1-specific fields
  ta1_acknowledgment_code: varchar('ta1_acknowledgment_code', { length: 5 }),
  ta1_note_code: varchar('ta1_note_code', { length: 5 }),

  // 999-specific fields
  ack_999_code: varchar('ack_999_code', { length: 5 }), // AK9 code
  implementation_convention_ref: varchar('implementation_convention_ref', { length: 50 }),

  // 277-specific fields (Claim Acknowledgment/Status)
  claim_status_category_code: varchar('claim_status_category_code', { length: 10 }),
  claim_status_code: varchar('claim_status_code', { length: 10 }),
  entity_identifier: varchar('entity_identifier', { length: 3 }), // PR=Payer, CH=Clearinghouse
  effective_date: date('effective_date'),

  // Payer reference numbers
  payer_claim_control_number: varchar('payer_claim_control_number', { length: 100 }),
  clearinghouse_trace_number: varchar('clearinghouse_trace_number', { length: 100 }),

  // Error/rejection details
  error_codes: jsonb('error_codes'), // Array of {code, description, location, severity}
  rejection_reasons: jsonb('rejection_reasons'),
  free_form_message: text('free_form_message'),

  // Service line level details (for 277)
  service_line_responses: jsonb('service_line_responses'), // Array of line-level statuses

  // Processing notes
  action_required: boolean('action_required').default(false),
  action_description: text('action_description'),
  resolution_status: varchar('resolution_status', { length: 50 }), // PENDING, IN_PROGRESS, RESOLVED
  resolved_at: timestamp('resolved_at'),
  resolved_by_id: text('resolved_by_id').references(() => users.id),
  resolution_notes: text('resolution_notes'),

  // Raw segment data
  raw_segments: jsonb('raw_segments'), // Original EDI segments for this response

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  responseFileIdx: index('idx_ch_resp_det_file').on(table.response_file_id),
  submissionIdx: index('idx_ch_resp_det_submission').on(table.submission_id),
  claimIdx: index('idx_ch_resp_det_claim').on(table.claim_id),
  responseTypeIdx: index('idx_ch_resp_det_type').on(table.response_type),
  responseStatusIdx: index('idx_ch_resp_det_status').on(table.response_status),
  originalIcnIdx: index('idx_ch_resp_det_orig_icn').on(table.original_icn),
  actionRequiredIdx: index('idx_ch_resp_det_action').on(table.action_required),
}));

/**
 * Clearinghouse Submission Status History Table
 * Audit trail of all status changes for submissions
 */
export const clearinghouse_submission_status_history = pgTable('clearinghouse_submission_status_history', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Submission reference
  submission_id: bigint('submission_id', { mode: 'number' }).references(() => clearinghouse_submissions.id).notNull(),

  // Status change details
  previous_status: varchar('previous_status', { length: 50 }),
  new_status: varchar('new_status', { length: 50 }).notNull(),
  status_date: timestamp('status_date').notNull(),

  // Change source
  change_source: varchar('change_source', { length: 50 }).notNull(),
  // Sources: USER_ACTION, SYSTEM, TA1_RESPONSE, 999_RESPONSE, 277_RESPONSE, TIMEOUT, RETRY

  // Response reference (if status change is from a response)
  response_file_id: bigint('response_file_id', { mode: 'number' }).references(() => clearinghouse_response_files.id),
  response_detail_id: bigint('response_detail_id', { mode: 'number' }).references(() => clearinghouse_response_details.id),

  // Change details
  reason: text('reason'),
  metadata: jsonb('metadata'),

  // Audit fields
  changed_by_id: text('changed_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  submissionIdx: index('idx_ch_status_hist_submission').on(table.submission_id),
  statusDateIdx: index('idx_ch_status_hist_date').on(table.status_date),
  newStatusIdx: index('idx_ch_status_hist_new_status').on(table.new_status),
}));

/**
 * Claim Validation Results Table
 * Stores comprehensive validation results from claim scrubbing
 * Provides audit trail of all validation attempts
 */
export const claim_validation_results = pgTable('claim_validation_results', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),

  // Validation details
  validation_date: timestamp('validation_date').defaultNow().notNull(),
  validation_type: varchar('validation_type', { length: 50 }).notNull(), // PRE_SUBMISSION, SCRUBBING, FINAL

  // Results
  passed: boolean('passed').notNull(),
  errors: jsonb('errors'), // Array of { field, code, message, severity, suggestion }
  warnings: jsonb('warnings'), // Array of warning objects

  // Field-level details
  fields_validated: integer('fields_validated'),
  fields_passed: integer('fields_passed'),
  fields_failed: integer('fields_failed'),

  // Scrubbing actions
  data_corrections: jsonb('data_corrections'), // Array of { field, old_value, new_value, reason }
  auto_fixed: boolean('auto_fixed').default(false),

  // Metadata
  validator_version: varchar('validator_version', { length: 20 }),
  rules_applied: jsonb('rules_applied'), // Array of rule names/codes

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  claimIdx: index('idx_validation_claim').on(table.claim_id),
  validationDateIdx: index('idx_validation_date').on(table.validation_date),
  validationTypeIdx: index('idx_validation_type').on(table.validation_type),
  passedIdx: index('idx_validation_passed').on(table.passed),
}));
