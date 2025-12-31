import { pgTable, bigint, varchar, timestamp, index } from 'drizzle-orm/pg-core';

export const patients = pgTable('patients', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Name fields
  first_name: varchar('first_name', { length: 255 }),
  last_name: varchar('last_name', { length: 255 }),
  middle_name: varchar('middle_name', { length: 255 }),
  mi: varchar('mi', { length: 255 }), // Middle Initial
  preferred_name: varchar('preferred_name', { length: 255 }),
  suffix: varchar('suffix', { length: 255 }), // Name suffix (Jr., Sr., III, etc.)

  // Basic demographics
  date_of_birth: varchar('date_of_birth', { length: 255 }),
  gender: varchar('gender', { length: 255 }),
  marital_status: varchar('marital_status', { length: 50 }),
  preferred_language: varchar('preferred_language', { length: 100 }),

  // Identifiers (sensitive PII)
  ssn: varchar('ssn', { length: 255 }), // Social Security Number - sensitive PII
  medicare_beneficiary_id: varchar('medicare_beneficiary_id', { length: 50 }), // MBI for hospice billing
  medicaid_id: varchar('medicaid_id', { length: 50 }), // For dual-eligible patients
  medical_record_number: varchar('medical_record_number', { length: 100 }), // Internal identifier

  // Contact information (direct patient contact)
  email: varchar('email', { length: 255 }),
  primary_phone: varchar('primary_phone', { length: 50 }),

  // Emergency contact (quick reference)
  emergency_contact_name: varchar('emergency_contact_name', { length: 255 }),
  emergency_contact_phone: varchar('emergency_contact_phone', { length: 50 }),
  emergency_contact_relationship: varchar('emergency_contact_relationship', { length: 100 }),

  // HIPAA and consent flags (stored as bigint: 0/1)
  oxygen_dependent: bigint('oxygen_dependent', { mode: 'number' }), // Boolean as number (0/1) - Patient requires oxygen therapy
  patient_consents: bigint('patient_consents', { mode: 'number' }), // Boolean as number (0/1) - Patient has given consent
  hipaa_received: bigint('hipaa_received', { mode: 'number' }), // Boolean as number (0/1) - HIPAA documents received
  veterans_status: bigint('veterans_status', { mode: 'number' }), // Boolean as number (0/1) - Veterans status (yes/no)

  // DME (Durable Medical Equipment)
  dme_provider: varchar('dme_provider', { length: 255 }), // DME equipment type: none, wheelchair, oxygen, bed, over bed table, pressure mattress

  // Foreign keys to related tables
  patient_pharmacy_id: bigint('patient_pharmacy_id', { mode: 'number' }),
  primary_diagnosis_id: bigint('primary_diagnosis_id', { mode: 'number' }),
  race_ethnicity_id: bigint('race_ethnicity_id', { mode: 'number' }),
  liaison_primary_id: bigint('liaison_primary_id', { mode: 'number' }),
  liaison_secondary_id: bigint('liaison_secondary_id', { mode: 'number' }),
  dnr_id: bigint('dnr_id', { mode: 'number' }),
  emergency_preparedness_level_id: bigint('emergency_preparedness_level_id', { mode: 'number' }),
  patient_identifier_id: bigint('patient_identifier_id', { mode: 'number' }),

  // Timestamps
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for commonly searched fields
  lastNameIdx: index('idx_patients_last_name').on(table.last_name),
  firstNameIdx: index('idx_patients_first_name').on(table.first_name),
  dobIdx: index('idx_patients_date_of_birth').on(table.date_of_birth),
  mbiIdx: index('idx_patients_medicare_beneficiary_id').on(table.medicare_beneficiary_id),
  mrnIdx: index('idx_patients_medical_record_number').on(table.medical_record_number),
}));