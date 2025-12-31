import { pgTable, bigint, varchar, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Patient Addresses - Multiple address types per patient
 * Supports primary, billing, and mailing addresses
 * COMPLIANCE: Required for Medicare billing and CBSA determination
 *
 * Address types:
 * - PRIMARY: Patient's primary residence (used for CBSA determination)
 * - BILLING: Address for billing/invoices (may be family member)
 * - MAILING: Address for correspondence (may differ from primary)
 * - FACILITY: Care facility address (nursing home, ALF, etc.)
 * - TEMPORARY: Temporary address (respite, vacation, etc.)
 */
export const patientAddresses = pgTable('patient_addresses', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Address type
  address_type: varchar('address_type', { length: 50 }).default('PRIMARY').notNull(), // PRIMARY, BILLING, MAILING, FACILITY, TEMPORARY

  // Address components
  address_line_1: varchar('address_line_1', { length: 255 }).notNull(),
  address_line_2: varchar('address_line_2', { length: 255 }),
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 2 }).notNull(), // Two-letter state code (e.g., CA, TX, NY)
  zip_code: varchar('zip_code', { length: 10 }).notNull(), // Format: 12345 or 12345-6789
  county: varchar('county', { length: 100 }), // County name for CBSA lookup

  // Geographic data for CBSA determination
  cbsa_code: varchar('cbsa_code', { length: 10 }), // Core Based Statistical Area code (affects Medicare reimbursement)
  latitude: varchar('latitude', { length: 20 }),
  longitude: varchar('longitude', { length: 20 }),

  // Contact information at this address
  phone_number: varchar('phone_number', { length: 20 }), // Format: (XXX) XXX-XXXX or +1XXXXXXXXXX
  alternate_phone: varchar('alternate_phone', { length: 20 }),

  // Status flags
  is_primary: boolean('is_primary').default(false), // True if this is the primary address for its type
  is_verified: boolean('is_verified').default(false), // Address has been verified (USPS, etc.)
  is_active: boolean('is_active').default(true), // Address is currently active

  // Effective dates (for tracking address history)
  effective_from: timestamp('effective_from'),
  effective_to: timestamp('effective_to'),

  // Notes
  notes: varchar('notes', { length: 500 }),

  // Audit fields
  deleted_at: timestamp('deleted_at'), // Soft delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for common query patterns
  patientIdx: index('idx_patient_addresses_patient_id').on(table.patient_id),
  typeIdx: index('idx_patient_addresses_type').on(table.address_type),
  zipCodeIdx: index('idx_patient_addresses_zip_code').on(table.zip_code),
  stateIdx: index('idx_patient_addresses_state').on(table.state),
  cbsaIdx: index('idx_patient_addresses_cbsa_code').on(table.cbsa_code),

  // Composite indexes
  patientTypeIdx: index('idx_patient_addresses_patient_type')
    .on(table.patient_id, table.address_type),
  patientActiveIdx: index('idx_patient_addresses_patient_active')
    .on(table.patient_id, table.is_active),
}));

// Keep the old table name as an alias for backwards compatibility during migration
export const address = patientAddresses;