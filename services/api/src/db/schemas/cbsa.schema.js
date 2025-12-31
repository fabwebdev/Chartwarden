import { pgTable, bigint, varchar, text, timestamp, boolean, integer, date, decimal, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

/**
 * CBSA (Core Based Statistical Area) Module
 * Phase 2A - Electronic Submission Features
 *
 * Purpose: ZIP code to CBSA mapping for UB-04 Value Codes 61 and G8,
 *          and wage index adjustments for hospice reimbursement calculations
 *
 * Compliance: CMS requires CBSA tracking for:
 *   - Value Code 61: Routine/Continuous Home Care (revenue 0651, 0652)
 *   - Value Code G8: Inpatient Care (revenue 0655, 0656)
 *   - Wage Index Adjustments: Labor portion of hospice per diem rates
 *
 * Tables:
 * - cbsa_codes: ZIP to CBSA mapping (15,000+ records)
 * - cbsa_wage_indexes: Annual wage index values by CBSA
 */

/**
 * CBSA Codes Table
 * Stores ZIP code to CBSA (Core Based Statistical Area) mapping
 * Updated annually from HUD CBSA to ZIP Crosswalk data
 */
export const cbsa_codes = pgTable('cbsa_codes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // ZIP to CBSA mapping
  zip_code: varchar('zip_code', { length: 5 }).notNull(),
  cbsa_code: varchar('cbsa_code', { length: 5 }).notNull(),
  cbsa_title: varchar('cbsa_title', { length: 255 }).notNull(),

  // Geographic details
  state: varchar('state', { length: 2 }).notNull(),
  county: varchar('county', { length: 100 }),
  fips_county_code: varchar('fips_county_code', { length: 5 }),
  metropolitan_division: varchar('metropolitan_division', { length: 5 }),

  // Classification
  cbsa_type: varchar('cbsa_type', { length: 20 }).default('METRO').notNull(), // METRO, MICRO, RURAL
  is_metropolitan: boolean('is_metropolitan').default(true).notNull(),
  population: integer('population'),

  // Effective dates (for annual updates)
  effective_date: date('effective_date').default('2024-01-01').notNull(),
  expiration_date: date('expiration_date'),

  // Metadata
  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
  index('cbsa_codes_zip_code_idx').on(table.zip_code),
  index('cbsa_codes_cbsa_code_idx').on(table.cbsa_code),
  index('cbsa_codes_state_idx').on(table.state),
  uniqueIndex('cbsa_codes_zip_effective_idx').on(table.zip_code, table.effective_date)
]);

/**
 * CBSA Wage Indexes Table
 * Stores annual wage index values for each CBSA
 * Used to calculate labor-adjusted hospice per diem rates
 *
 * CMS updates wage indexes annually (typically October 1 for fiscal year)
 * Source: CMS Hospice Wage Index and Rates updates
 */
export const cbsa_wage_indexes = pgTable('cbsa_wage_indexes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // CBSA identification
  cbsa_code: varchar('cbsa_code', { length: 5 }).notNull(),
  cbsa_title: varchar('cbsa_title', { length: 255 }),

  // Wage index value (e.g., 1.0000 for national average, 1.3456 for high-cost areas)
  wage_index: decimal('wage_index', { precision: 6, scale: 4 }).notNull(),

  // Fiscal year information (CMS fiscal year runs Oct 1 - Sep 30)
  fiscal_year: integer('fiscal_year').notNull(), // e.g., 2024, 2025
  effective_date: date('effective_date').notNull(), // Start date (typically Oct 1)
  expiration_date: date('expiration_date'), // End date (typically Sep 30 next year)

  // Pre-floor and post-floor wage index (CMS applies floor adjustments)
  pre_floor_wage_index: decimal('pre_floor_wage_index', { precision: 6, scale: 4 }),
  pre_reclassification_wage_index: decimal('pre_reclassification_wage_index', { precision: 6, scale: 4 }),

  // Rural floor indicator
  rural_floor_applied: boolean('rural_floor_applied').default(false),
  rural_floor_state: varchar('rural_floor_state', { length: 2 }),

  // Geographic reclassification (MGCRB)
  reclassified: boolean('reclassified').default(false),
  reclassified_from_cbsa: varchar('reclassified_from_cbsa', { length: 5 }),
  reclassified_to_cbsa: varchar('reclassified_to_cbsa', { length: 5 }),

  // Special indicators
  is_rural: boolean('is_rural').default(false),
  is_frontier: boolean('is_frontier').default(false), // Very low population density

  // Source tracking
  source: varchar('source', { length: 100 }).default('CMS_HOSPICE_WAGE_INDEX'),
  source_file: varchar('source_file', { length: 255 }),
  publication_date: date('publication_date'),

  // Metadata
  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
  index('cbsa_wage_indexes_cbsa_code_idx').on(table.cbsa_code),
  index('cbsa_wage_indexes_fiscal_year_idx').on(table.fiscal_year),
  uniqueIndex('cbsa_wage_indexes_cbsa_fiscal_idx').on(table.cbsa_code, table.fiscal_year)
]);

/**
 * Hospice Per Diem Rates Table
 * Stores the national base per diem rates for each level of care
 * These rates are adjusted by wage index for each CBSA
 *
 * Levels of Care:
 * - Routine Home Care (RHC) - Revenue Code 0651
 * - Continuous Home Care (CHC) - Revenue Code 0652
 * - Inpatient Respite Care (IRC) - Revenue Code 0655
 * - General Inpatient Care (GIP) - Revenue Code 0656
 */
export const hospice_per_diem_rates = pgTable('hospice_per_diem_rates', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Fiscal year and effective period
  fiscal_year: integer('fiscal_year').notNull(),
  effective_date: date('effective_date').notNull(),
  expiration_date: date('expiration_date'),

  // Level of care
  level_of_care: varchar('level_of_care', { length: 50 }).notNull(), // RHC, CHC, IRC, GIP
  revenue_code: varchar('revenue_code', { length: 4 }).notNull(), // 0651, 0652, 0655, 0656

  // National base rates (in dollars)
  base_rate: decimal('base_rate', { precision: 10, scale: 2 }).notNull(),

  // Labor and non-labor portions (for wage index adjustment calculation)
  labor_portion: decimal('labor_portion', { precision: 5, scale: 4 }).notNull(), // e.g., 0.6860
  non_labor_portion: decimal('non_labor_portion', { precision: 5, scale: 4 }).notNull(), // e.g., 0.3140

  // Service intensity add-on (SIA) - applies to last 7 days of life for RHC
  sia_rate: decimal('sia_rate', { precision: 10, scale: 2 }),
  sia_labor_portion: decimal('sia_labor_portion', { precision: 5, scale: 4 }),
  sia_non_labor_portion: decimal('sia_non_labor_portion', { precision: 5, scale: 4 }),

  // CHC hourly rate (CHC is paid hourly, minimum 8 hours/day)
  hourly_rate: decimal('hourly_rate', { precision: 10, scale: 2 }),

  // Source tracking
  source: varchar('source', { length: 100 }).default('CMS_HOSPICE_RATES'),
  federal_register_citation: varchar('federal_register_citation', { length: 100 }),

  // Metadata
  notes: text('notes'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => [
  index('hospice_rates_fiscal_year_idx').on(table.fiscal_year),
  index('hospice_rates_level_of_care_idx').on(table.level_of_care),
  uniqueIndex('hospice_rates_fiscal_loc_idx').on(table.fiscal_year, table.level_of_care)
]);
