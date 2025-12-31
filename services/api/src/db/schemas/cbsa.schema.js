import { pgTable, bigint, varchar, text, timestamp, boolean, integer, date } from 'drizzle-orm/pg-core';

/**
 * CBSA (Core Based Statistical Area) Module
 * Phase 2A - Electronic Submission Features
 *
 * Purpose: ZIP code to CBSA mapping for UB-04 Value Codes 61 and G8
 * Compliance: CMS requires CBSA tracking for:
 *   - Value Code 61: Routine/Continuous Home Care (revenue 0651, 0652)
 *   - Value Code G8: Inpatient Care (revenue 0655, 0656)
 *
 * Tables:
 * - cbsa_codes: ZIP to CBSA mapping (15,000+ records)
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
  metropolitan_division: varchar('metropolitan_division', { length: 5 }),

  // Classification
  is_metropolitan: boolean('is_metropolitan').default(true).notNull(),
  population: integer('population'),

  // Effective dates (for annual updates)
  effective_date: date('effective_date').default('2024-01-01').notNull(),
  expiration_date: date('expiration_date'),

  // Metadata
  notes: text('notes'),

  // Audit fields
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
});
