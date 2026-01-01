import { pgTable, uuid, varchar, text, boolean, timestamp, integer, index } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

/**
 * ICD-10 Diagnosis Codes Schema
 *
 * Stores the complete ICD-10-CM diagnosis code library for:
 * - Fast autocomplete lookups by code or description
 * - Exact code validation
 * - Category and chapter browsing
 * - Medical necessity documentation
 *
 * ICD-10-CM codes follow the pattern: Letter + 2 digits + optional decimal + 1-4 characters
 * Examples: A00, A00.0, A00.01, E11.9, Z99.89
 */
export const icd10_codes = pgTable('icd10_codes', {
  id: uuid('id').defaultRandom().primaryKey(),

  // Code identifier (e.g., "E11.9")
  code: varchar('code', { length: 10 }).notNull().unique(),

  // Short description for autocomplete display (e.g., "Type 2 diabetes mellitus without complications")
  shortDescription: varchar('short_description', { length: 255 }).notNull(),

  // Full/long description for detailed views
  longDescription: text('long_description'),

  // Category code (first 3 characters, e.g., "E11")
  categoryCode: varchar('category_code', { length: 7 }).notNull(),

  // Category description (e.g., "Type 2 diabetes mellitus")
  categoryDescription: varchar('category_description', { length: 255 }),

  // Chapter information (e.g., "Chapter 4: Endocrine, nutritional and metabolic diseases")
  chapter: varchar('chapter', { length: 10 }),
  chapterDescription: varchar('chapter_description', { length: 255 }),

  // Block/Range (e.g., "E08-E13" for Diabetes mellitus)
  blockCode: varchar('block_code', { length: 15 }),
  blockDescription: varchar('block_description', { length: 255 }),

  // Code specificity (3-7 characters indicating specificity level)
  codeLength: integer('code_length').notNull().default(3),

  // Is this a billable/valid code or a category header?
  isBillable: boolean('is_billable').notNull().default(false),

  // Is this code currently active/valid?
  isActive: boolean('is_active').notNull().default(true),

  // Common/frequently used flag for prioritization
  isCommon: boolean('is_common').notNull().default(false),

  // Hospice-relevant flag for prioritization in hospice EHR
  isHospiceRelevant: boolean('is_hospice_relevant').notNull().default(false),

  // Usage count for popularity-based sorting
  usageCount: integer('usage_count').notNull().default(0),

  // ICD-10 version/year (e.g., "2024")
  version: varchar('version', { length: 10 }),

  // Effective dates for the code
  effectiveDate: timestamp('effective_date'),
  expirationDate: timestamp('expiration_date'),

  // Audit timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Index for autocomplete searches by code
  codeIdx: index('icd10_code_idx').on(table.code),

  // Index for category lookups
  categoryIdx: index('icd10_category_idx').on(table.categoryCode),

  // Index for chapter browsing
  chapterIdx: index('icd10_chapter_idx').on(table.chapter),

  // Index for filtering active billable codes (most common query)
  activeBillableIdx: index('icd10_active_billable_idx').on(table.isActive, table.isBillable),

  // Index for hospice-relevant codes
  hospiceRelevantIdx: index('icd10_hospice_relevant_idx').on(table.isHospiceRelevant),

  // Index for common codes
  commonIdx: index('icd10_common_idx').on(table.isCommon),

  // Composite index for popularity-based sorting
  usageIdx: index('icd10_usage_idx').on(table.usageCount)
}));

// Export for schema references
export default icd10_codes;
