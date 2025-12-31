import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb } from 'drizzle-orm/pg-core';

/**
 * Denial Codes & Adjustment Reason Codes Module
 * Phase 3C - Denial Management Foundation
 *
 * Purpose: Store and manage CARC/RARC codes for denial tracking and analysis
 * Standards: CMS HIPAA 835 Claim Adjustment Reason Codes (CARC) and
 *            Remittance Advice Remark Codes (RARC)
 *
 * Tables:
 * - carc_codes: Claim Adjustment Reason Codes (CARC)
 * - rarc_codes: Remittance Advice Remark Codes (RARC)
 * - denial_categories: Denial categorization for analytics
 */

/**
 * CARC Codes Table
 * Claim Adjustment Reason Codes - Standard codes explaining claim adjustments
 * Source: Washington Publishing Company (WPC) - Official HIPAA code list maintainer
 */
export const carc_codes = pgTable('carc_codes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // CARC Code
  code: varchar('code', { length: 10 }).unique().notNull(), // e.g., "1", "2", "45", "96"

  // Code details
  description: text('description').notNull(), // Full description
  short_description: varchar('short_description', { length: 255 }), // Abbreviated version

  // Categorization
  category: varchar('category', { length: 50 }).notNull(),
  // Categories: CONTRACTUAL, PATIENT_RESPONSIBILITY, OTHER_ADJUSTMENT, PAYER_INITIATED

  group_code: varchar('group_code', { length: 2 }).notNull(),
  // CO = Contractual Obligation
  // PR = Patient Responsibility
  // OA = Other Adjustments
  // PI = Payer Initiated Reductions

  // Impact classification
  is_denial: boolean('is_denial').default(false).notNull(), // Full denial vs adjustment
  is_appealable: boolean('is_appealable').default(true), // Can be appealed
  severity: varchar('severity', { length: 20 }).default('MEDIUM'),
  // LOW, MEDIUM, HIGH, CRITICAL

  // Recommended actions
  recommended_action: text('recommended_action'), // What to do when this code appears
  appeal_template: text('appeal_template'), // Template for appeal letter
  documentation_required: jsonb('documentation_required'), // Array of required docs

  // Analytics
  common_payer_types: jsonb('common_payer_types'), // Which payers commonly use this
  average_appeal_success_rate: bigint('average_appeal_success_rate', { mode: 'number' }), // 0-100

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  effective_date: timestamp('effective_date'),
  termination_date: timestamp('termination_date'),

  // Reference information
  source: varchar('source', { length: 100 }).default('WPC'), // WPC, CMS, Custom
  source_url: text('source_url'),
  last_updated_from_source: timestamp('last_updated_from_source'),

  // Notes
  internal_notes: text('internal_notes'),
  examples: jsonb('examples'), // Array of real-world examples

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * RARC Codes Table
 * Remittance Advice Remark Codes - Additional information codes
 * Source: Washington Publishing Company (WPC)
 */
export const rarc_codes = pgTable('rarc_codes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // RARC Code
  code: varchar('code', { length: 10 }).unique().notNull(), // e.g., "N1", "N2", "MA01"

  // Code details
  description: text('description').notNull(), // Full description
  short_description: varchar('short_description', { length: 255 }),

  // Categorization
  code_type: varchar('code_type', { length: 50 }), // ALERT, INFORMATIONAL, ACTION_REQUIRED

  // Related information
  related_carc_codes: jsonb('related_carc_codes'), // Array of commonly paired CARC codes

  // Recommended actions
  recommended_action: text('recommended_action'),
  requires_provider_action: boolean('requires_provider_action').default(false),

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  effective_date: timestamp('effective_date'),
  termination_date: timestamp('termination_date'),

  // Reference information
  source: varchar('source', { length: 100 }).default('WPC'),
  source_url: text('source_url'),
  last_updated_from_source: timestamp('last_updated_from_source'),

  // Notes
  internal_notes: text('internal_notes'),
  examples: jsonb('examples'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Denial Categories Table
 * Custom categorization for denial analytics and reporting
 */
export const denial_categories = pgTable('denial_categories', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Category details
  category_code: varchar('category_code', { length: 50 }).unique().notNull(),
  category_name: varchar('category_name', { length: 255 }).notNull(),
  description: text('description'),

  // Hierarchy
  parent_category_id: bigint('parent_category_id', { mode: 'number' }), // Self-reference for subcategories
  level: bigint('level', { mode: 'number' }).default(1), // 1 = top level, 2 = subcategory, etc.

  // Associated CARC codes
  carc_codes: jsonb('carc_codes'), // Array of CARC codes in this category

  // Analytics settings
  is_preventable: boolean('is_preventable').default(true),
  typical_resolution_time_days: bigint('typical_resolution_time_days', { mode: 'number' }),

  // Display settings
  color_code: varchar('color_code', { length: 7 }), // Hex color for charts
  icon: varchar('icon', { length: 50 }),
  sort_order: bigint('sort_order', { mode: 'number' }).default(0),

  // Status
  is_active: boolean('is_active').default(true).notNull(),

  // Notes
  internal_notes: text('internal_notes'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Custom Code Mappings Table
 * Map payer-specific codes to standard CARC/RARC codes
 */
export const payer_code_mappings = pgTable('payer_code_mappings', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Payer information
  payer_name: varchar('payer_name', { length: 255 }).notNull(),
  payer_identifier: varchar('payer_identifier', { length: 50 }),

  // Custom code
  payer_code: varchar('payer_code', { length: 50 }).notNull(),
  payer_code_description: text('payer_code_description'),

  // Standard mapping
  standard_carc_code: varchar('standard_carc_code', { length: 10 }),
  standard_rarc_code: varchar('standard_rarc_code', { length: 10 }),
  mapping_confidence: varchar('mapping_confidence', { length: 20 }).default('HIGH'),
  // HIGH, MEDIUM, LOW, MANUAL_REVIEW

  // Notes
  mapping_notes: text('mapping_notes'),
  verified_by: text('verified_by'),
  verified_at: timestamp('verified_at'),

  // Status
  is_active: boolean('is_active').default(true).notNull(),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});

// Add self-reference for denial_categories parent relationship
// Note: This is a forward reference that will be resolved at runtime
