import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer } from 'drizzle-orm/pg-core';
import { claims } from './billing.schema.js';
import { users } from './user.schema.js';

/**
 * Clearinghouse & Claim Validation Module
 * Phase 2B & 2C - Electronic Submission Features
 *
 * Purpose: Track 837I EDI file submissions, acknowledgments, and claim validation
 * Compliance: CMS electronic submission and pre-submission validation requirements
 *
 * Tables:
 * - clearinghouse_submissions: Track 837I submissions and 277 acknowledgments
 * - claim_validation_results: Comprehensive claim scrubbing audit trail
 */

/**
 * Clearinghouse Submissions Table
 * Tracks 837I EDI file submissions to clearinghouses and acknowledgments
 */
export const clearinghouse_submissions = pgTable('clearinghouse_submissions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  claim_id: bigint('claim_id', { mode: 'number' }).references(() => claims.id).notNull(),

  // Submission details
  submission_batch_id: varchar('submission_batch_id', { length: 100 }),
  submission_date: timestamp('submission_date').notNull(),
  submission_method: varchar('submission_method', { length: 50 }).default('EDI_FILE').notNull(), // EDI_FILE, SFTP, API

  // File information
  edi_file_name: varchar('edi_file_name', { length: 255 }),
  edi_file_path: text('edi_file_path'),
  edi_control_number: varchar('edi_control_number', { length: 50 }), // ISA13 control number
  edi_content: text('edi_content'), // Full 837I content for audit

  // Clearinghouse details
  clearinghouse_name: varchar('clearinghouse_name', { length: 100 }),
  clearinghouse_id: varchar('clearinghouse_id', { length: 50 }),

  // Acknowledgment tracking (277)
  acknowledgment_status: varchar('acknowledgment_status', { length: 50 }), // PENDING, ACCEPTED, REJECTED
  acknowledgment_date: timestamp('acknowledgment_date'),
  acknowledgment_details: jsonb('acknowledgment_details'),

  // Status tracking
  current_status: varchar('current_status', { length: 50 }).default('SUBMITTED').notNull(),
  status_date: timestamp('status_date').defaultNow().notNull(),

  // Error tracking
  errors: jsonb('errors'), // Array of error objects
  warnings: jsonb('warnings'), // Array of warning objects

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

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
});
