import { pgTable, bigint, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

/**
 * Patient Allergies
 * Tracks patient allergies and adverse reactions
 * Critical for medication safety and drug interaction checking
 */
export const patient_allergies = pgTable('patient_allergies', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Allergy identification
  allergen_name: varchar('allergen_name', { length: 255 }).notNull(),
  allergen_type: varchar('allergen_type', { length: 50 }), // MEDICATION, FOOD, ENVIRONMENTAL, OTHER
  allergen_code: varchar('allergen_code', { length: 50 }), // RxNorm or other standard code

  // Reaction details
  reaction_type: varchar('reaction_type', { length: 100 }), // ANAPHYLAXIS, RASH, HIVES, SWELLING, GI_UPSET, OTHER
  reaction_severity: varchar('reaction_severity', { length: 50 }), // MILD, MODERATE, SEVERE, LIFE_THREATENING
  reaction_description: text('reaction_description'),

  // Status
  status: varchar('status', { length: 50 }).default('ACTIVE'), // ACTIVE, INACTIVE, RESOLVED
  onset_date: varchar('onset_date', { length: 50 }),
  verified_by_id: text('verified_by_id').references(() => users.id),
  verified_date: timestamp('verified_date'),

  // Source of information
  source: varchar('source', { length: 100 }), // PATIENT_REPORTED, MEDICAL_RECORD, FAMILY_REPORTED

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  patientIdx: index('idx_patient_allergies_patient_id').on(table.patient_id),
  allergenNameIdx: index('idx_patient_allergies_allergen_name').on(table.allergen_name),
  statusIdx: index('idx_patient_allergies_status').on(table.status),
  patientStatusIdx: index('idx_patient_allergies_patient_status')
    .on(table.patient_id, table.status),
}));

/**
 * Drug Interactions - Known drug-drug interactions database
 * Used for medication safety checking
 */
export const drug_interactions = pgTable('drug_interactions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Drug pair
  drug1_name: varchar('drug1_name', { length: 255 }).notNull(),
  drug1_code: varchar('drug1_code', { length: 50 }), // RxNorm or NDC
  drug2_name: varchar('drug2_name', { length: 255 }).notNull(),
  drug2_code: varchar('drug2_code', { length: 50 }), // RxNorm or NDC

  // Interaction details
  interaction_severity: varchar('interaction_severity', { length: 50 }).notNull(), // CONTRAINDICATED, SEVERE, MODERATE, MINOR
  interaction_description: text('interaction_description'),
  clinical_effect: text('clinical_effect'),
  management_recommendation: text('management_recommendation'),

  // Source
  source: varchar('source', { length: 100 }), // FDA, MEDSCAPE, EPOCRATES, CUSTOM

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  drug1Idx: index('idx_drug_interactions_drug1').on(table.drug1_name),
  drug2Idx: index('idx_drug_interactions_drug2').on(table.drug2_name),
  severityIdx: index('idx_drug_interactions_severity').on(table.interaction_severity),
}));
