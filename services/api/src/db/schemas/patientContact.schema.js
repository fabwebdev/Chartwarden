import { pgTable, bigint, varchar, timestamp, boolean, index, text } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * Patient Contacts - Emergency and related contacts for patients
 * Manages emergency contacts, family members, caregivers, and other important contacts
 *
 * COMPLIANCE: Required for HIPAA emergency notifications and care coordination
 *
 * Contact types:
 * - EMERGENCY: Primary emergency contact (required for hospice patients)
 * - FAMILY: Family members who may be involved in care decisions
 * - CAREGIVER: Non-family caregivers (aides, neighbors, friends)
 * - HEALTHCARE_PROXY: Person with healthcare power of attorney
 * - LEGAL: Legal guardian or conservator
 * - FUNERAL_HOME: Funeral home contact (for end-of-life planning)
 * - CLERGY: Religious/spiritual contact
 * - OTHER: Other important contacts
 *
 * Use cases:
 * - Store multiple emergency contacts with priority ordering
 * - Track relationships for family care meetings
 * - Document healthcare proxies for decision-making
 * - Maintain funeral home contacts for end-of-life coordination
 */
export const patient_contacts = pgTable('patient_contacts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Contact classification
  contact_type: varchar('contact_type', { length: 50 }).default('EMERGENCY').notNull(), // EMERGENCY, FAMILY, CAREGIVER, HEALTHCARE_PROXY, LEGAL, FUNERAL_HOME, CLERGY, OTHER

  // Name information
  first_name: varchar('first_name', { length: 100 }).notNull(),
  last_name: varchar('last_name', { length: 100 }).notNull(),
  middle_name: varchar('middle_name', { length: 100 }),
  suffix: varchar('suffix', { length: 20 }), // Jr., Sr., III, etc.
  preferred_name: varchar('preferred_name', { length: 100 }), // Nickname or preferred name

  // Relationship to patient
  relationship: varchar('relationship', { length: 100 }).notNull(), // Spouse, Son, Daughter, Parent, Sibling, Friend, Neighbor, etc.
  relationship_detail: varchar('relationship_detail', { length: 255 }), // Additional relationship details (e.g., "Eldest daughter", "Lives nearby")

  // Phone numbers
  primary_phone: varchar('primary_phone', { length: 20 }).notNull(), // Primary contact number
  primary_phone_type: varchar('primary_phone_type', { length: 20 }).default('MOBILE'), // MOBILE, HOME, WORK
  secondary_phone: varchar('secondary_phone', { length: 20 }), // Alternate number
  secondary_phone_type: varchar('secondary_phone_type', { length: 20 }), // MOBILE, HOME, WORK

  // Email
  email: varchar('email', { length: 255 }),

  // Address information
  address_line_1: varchar('address_line_1', { length: 255 }),
  address_line_2: varchar('address_line_2', { length: 255 }),
  city: varchar('city', { length: 100 }),
  state: varchar('state', { length: 2 }), // Two-letter state code
  zip_code: varchar('zip_code', { length: 10 }), // Format: 12345 or 12345-6789
  country: varchar('country', { length: 100 }).default('USA'),

  // Contact preferences
  preferred_contact_method: varchar('preferred_contact_method', { length: 20 }).default('PHONE'), // PHONE, EMAIL, TEXT
  preferred_contact_time: varchar('preferred_contact_time', { length: 50 }), // e.g., "Weekday mornings", "After 5pm"
  preferred_language: varchar('preferred_language', { length: 50 }), // Language preference for communication

  // Priority and status
  priority: bigint('priority', { mode: 'number' }).default(1), // Order of contact (1 = first to call)
  is_primary: boolean('is_primary').default(false), // True if this is the primary contact for its type
  is_active: boolean('is_active').default(true), // Contact is currently active

  // Authorization flags
  authorized_for_phi: boolean('authorized_for_phi').default(false), // Authorized to receive Protected Health Information
  authorized_for_decisions: boolean('authorized_for_decisions').default(false), // Can make care decisions
  has_key_to_home: boolean('has_key_to_home').default(false), // Has key to patient's residence
  lives_with_patient: boolean('lives_with_patient').default(false), // Lives at same address as patient

  // Legal/compliance fields
  healthcare_proxy_document: boolean('healthcare_proxy_document').default(false), // Healthcare proxy document on file
  power_of_attorney: boolean('power_of_attorney').default(false), // POA document on file
  document_date: timestamp('document_date'), // Date of legal document

  // Notes
  notes: text('notes'), // General notes about this contact
  special_instructions: text('special_instructions'), // Special contact instructions

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'), // Soft delete
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Single column indexes for common lookups
  patientIdx: index('idx_patient_contacts_patient_id').on(table.patient_id),
  typeIdx: index('idx_patient_contacts_type').on(table.contact_type),
  lastNameIdx: index('idx_patient_contacts_last_name').on(table.last_name),
  activeIdx: index('idx_patient_contacts_is_active').on(table.is_active),
  priorityIdx: index('idx_patient_contacts_priority').on(table.priority),

  // Composite indexes for common query patterns
  patientTypeIdx: index('idx_patient_contacts_patient_type')
    .on(table.patient_id, table.contact_type),
  patientActiveIdx: index('idx_patient_contacts_patient_active')
    .on(table.patient_id, table.is_active),
  patientPriorityIdx: index('idx_patient_contacts_patient_priority')
    .on(table.patient_id, table.priority),
  patientTypePrimaryIdx: index('idx_patient_contacts_patient_type_primary')
    .on(table.patient_id, table.contact_type, table.is_primary),
}));

// Keep legacy export name for backwards compatibility
export const patientContacts = patient_contacts;
