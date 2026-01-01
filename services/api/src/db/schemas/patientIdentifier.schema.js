import { pgTable, bigint, varchar, timestamp, boolean, index, text } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * Patient Identifiers - Multiple identifier types per patient
 * Manages various patient identification numbers with type and facility tracking
 *
 * COMPLIANCE: Required for HIPAA, Medicare/Medicaid billing, and cross-facility patient matching
 *
 * Identifier types:
 * - MRN: Medical Record Number (internal, facility-specific)
 * - SSN: Social Security Number (sensitive PII, encrypted storage recommended)
 * - MEDICARE: Medicare Beneficiary Identifier (MBI) for hospice billing
 * - MEDICAID: Medicaid ID for dual-eligible patients
 * - INSURANCE: Commercial insurance member ID
 * - NPI: National Provider Identifier (if patient is also a provider)
 * - OTHER: Custom identifier types
 *
 * Use cases:
 * - Store multiple MRNs when patient transfers between facilities
 * - Track historical identifiers (old MBI numbers after changes)
 * - Support multi-payer scenarios with different member IDs
 * - Enable patient matching across facilities
 */
export const patient_identifiers = pgTable('patient_identifiers', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Identifier classification
  identifier_type: varchar('identifier_type', { length: 50 }).notNull(), // MRN, SSN, MEDICARE, MEDICAID, INSURANCE, NPI, OTHER
  identifier_value: varchar('identifier_value', { length: 255 }).notNull(), // The actual identifier value

  // Facility/Issuer tracking
  facility_id: bigint('facility_id', { mode: 'number' }), // Reference to facility if applicable
  facility_name: varchar('facility_name', { length: 255 }), // Facility or organization name that issued the identifier
  issuing_authority: varchar('issuing_authority', { length: 255 }), // Authority that issued the identifier (e.g., CMS, State Medicaid, etc.)
  issuing_state: varchar('issuing_state', { length: 2 }), // Two-letter state code for state-issued IDs (e.g., Medicaid)

  // Status flags
  is_primary: boolean('is_primary').default(false), // True if this is the primary identifier for its type
  is_active: boolean('is_active').default(true), // Identifier is currently active/valid
  is_verified: boolean('is_verified').default(false), // Identifier has been verified

  // Effective dates (for tracking identifier history)
  effective_from: timestamp('effective_from'), // When the identifier became valid
  effective_to: timestamp('effective_to'), // When the identifier expired/was replaced

  // Verification tracking
  verified_at: timestamp('verified_at'), // When verification occurred
  verified_by_id: text('verified_by_id').references(() => users.id), // Who verified the identifier
  verification_method: varchar('verification_method', { length: 100 }), // How it was verified (e.g., CMS portal, card scan, etc.)
  verification_notes: text('verification_notes'), // Additional verification details

  // Notes and documentation
  notes: text('notes'), // General notes about this identifier

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'), // Soft delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Single column indexes for common lookups
  patientIdx: index('idx_patient_identifiers_patient_id').on(table.patient_id),
  typeIdx: index('idx_patient_identifiers_type').on(table.identifier_type),
  valueIdx: index('idx_patient_identifiers_value').on(table.identifier_value),
  facilityIdx: index('idx_patient_identifiers_facility_id').on(table.facility_id),
  activeIdx: index('idx_patient_identifiers_is_active').on(table.is_active),

  // Composite indexes for common query patterns
  patientTypeIdx: index('idx_patient_identifiers_patient_type')
    .on(table.patient_id, table.identifier_type),
  patientActiveIdx: index('idx_patient_identifiers_patient_active')
    .on(table.patient_id, table.is_active),
  typeValueIdx: index('idx_patient_identifiers_type_value')
    .on(table.identifier_type, table.identifier_value),
  patientTypePrimaryIdx: index('idx_patient_identifiers_patient_type_primary')
    .on(table.patient_id, table.identifier_type, table.is_primary),
}));

// Keep legacy export name for backwards compatibility
export const patientIdentifiers = patient_identifiers;
