import { pgTable, bigint, varchar, text, timestamp, boolean, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Nutrition Dietary Restrictions Schema
 * Comprehensive tracking of patient dietary restrictions including allergies,
 * intolerances, and medical restrictions for hospice care.
 *
 * Supports:
 * - Food allergies (IgE-mediated reactions)
 * - Food intolerances (non-allergic adverse reactions)
 * - Medical diet restrictions (diabetes, renal, cardiac, etc.)
 * - Cultural/religious dietary requirements
 * - Temporary vs. permanent restrictions
 * - Severity levels and reaction history
 */
export const nutrition_dietary_restrictions = pgTable('nutrition_dietary_restrictions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Patient association
  patient_id: bigint('patient_id', { mode: 'number' }).notNull().references(() => patients.id),

  // =========================================
  // RESTRICTION IDENTIFICATION
  // =========================================
  restriction_type: varchar('restriction_type', { length: 50 }).notNull(), // ALLERGY, INTOLERANCE, MEDICAL, RELIGIOUS, CULTURAL, PREFERENCE, OTHER
  restriction_category: varchar('restriction_category', { length: 100 }), // FOOD, ADDITIVE, PRESERVATIVE, DYE, MEDICATION_INTERACTION

  // Food/substance details
  food_item: varchar('food_item', { length: 255 }).notNull(), // Specific food or substance
  food_group: varchar('food_group', { length: 100 }), // DAIRY, GLUTEN, NUTS, SHELLFISH, SOY, EGG, FISH, etc.
  allergen_code: varchar('allergen_code', { length: 50 }), // Standard allergen codes if applicable

  // =========================================
  // SEVERITY AND REACTION DETAILS
  // =========================================
  severity: varchar('severity', { length: 50 }), // MILD, MODERATE, SEVERE, LIFE_THREATENING
  reaction_type: varchar('reaction_type', { length: 255 }), // ANAPHYLAXIS, HIVES, GI_DISTRESS, RESPIRATORY, etc.
  reaction_description: text('reaction_description'),
  onset_time: varchar('onset_time', { length: 100 }), // IMMEDIATE, DELAYED, VARIABLE
  last_reaction_date: timestamp('last_reaction_date'),

  // =========================================
  // TEMPORAL STATUS
  // =========================================
  is_permanent: boolean('is_permanent').default(true),
  is_active: boolean('is_active').default(true),
  effective_date: timestamp('effective_date').defaultNow(),
  expiration_date: timestamp('expiration_date'), // For temporary restrictions
  review_date: timestamp('review_date'), // When to reassess

  // =========================================
  // MEDICAL CONTEXT
  // =========================================
  diagnosed_by: varchar('diagnosed_by', { length: 255 }), // Provider who confirmed
  diagnosis_date: timestamp('diagnosis_date'),
  verification_method: varchar('verification_method', { length: 100 }), // SKIN_TEST, BLOOD_TEST, ELIMINATION_DIET, PATIENT_REPORT, FAMILY_REPORT
  medical_condition_related: varchar('medical_condition_related', { length: 255 }), // Related diagnosis (e.g., Celiac, PKU)
  icd10_code: varchar('icd10_code', { length: 20 }), // Associated ICD-10 code

  // =========================================
  // MANAGEMENT
  // =========================================
  avoidance_instructions: text('avoidance_instructions'),
  cross_contamination_risk: boolean('cross_contamination_risk').default(false),
  safe_alternatives: text('safe_alternatives'),
  emergency_treatment: text('emergency_treatment'), // E.g., EpiPen instructions
  epipen_available: boolean('epipen_available').default(false),
  epipen_location: varchar('epipen_location', { length: 255 }),

  // =========================================
  // NOTIFICATION FLAGS
  // =========================================
  notify_on_admission: boolean('notify_on_admission').default(true),
  notify_dietary: boolean('notify_dietary').default(true),
  notify_pharmacy: boolean('notify_pharmacy').default(false),
  display_on_chart: boolean('display_on_chart').default(true),

  // =========================================
  // DOCUMENTATION
  // =========================================
  source_of_information: varchar('source_of_information', { length: 100 }), // PATIENT, FAMILY, MEDICAL_RECORD, PROVIDER
  verified: boolean('verified').default(false),
  verified_by_id: bigint('verified_by_id', { mode: 'number' }),
  verified_date: timestamp('verified_date'),
  notes: text('notes'),

  // =========================================
  // AUDIT FIELDS
  // =========================================
  created_by_id: bigint('created_by_id', { mode: 'number' }),
  updated_by_id: bigint('updated_by_id', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  patientIdx: index('idx_nutrition_dietary_restrictions_patient_id').on(table.patient_id),
  typeIdx: index('idx_nutrition_dietary_restrictions_type').on(table.restriction_type),
  foodGroupIdx: index('idx_nutrition_dietary_restrictions_food_group').on(table.food_group),
  activeIdx: index('idx_nutrition_dietary_restrictions_active').on(table.is_active),
  severityIdx: index('idx_nutrition_dietary_restrictions_severity').on(table.severity),
  patientActiveIdx: index('idx_nutrition_dietary_restrictions_patient_active').on(table.patient_id, table.is_active),
}));

// Restriction types
export const RESTRICTION_TYPES = {
  ALLERGY: 'ALLERGY',
  INTOLERANCE: 'INTOLERANCE',
  MEDICAL: 'MEDICAL',
  RELIGIOUS: 'RELIGIOUS',
  CULTURAL: 'CULTURAL',
  PREFERENCE: 'PREFERENCE',
  OTHER: 'OTHER'
};

// Food groups for common allergens
export const FOOD_GROUPS = {
  DAIRY: 'DAIRY',
  GLUTEN: 'GLUTEN',
  WHEAT: 'WHEAT',
  TREE_NUTS: 'TREE_NUTS',
  PEANUTS: 'PEANUTS',
  SHELLFISH: 'SHELLFISH',
  FISH: 'FISH',
  SOY: 'SOY',
  EGG: 'EGG',
  SESAME: 'SESAME',
  SULFITES: 'SULFITES',
  CORN: 'CORN',
  NIGHTSHADES: 'NIGHTSHADES',
  CITRUS: 'CITRUS',
  LEGUMES: 'LEGUMES',
  RED_MEAT: 'RED_MEAT',
  POULTRY: 'POULTRY',
  PORK: 'PORK',
  ALCOHOL: 'ALCOHOL',
  CAFFEINE: 'CAFFEINE',
  OTHER: 'OTHER'
};

// Severity levels
export const RESTRICTION_SEVERITY = {
  MILD: 'MILD',
  MODERATE: 'MODERATE',
  SEVERE: 'SEVERE',
  LIFE_THREATENING: 'LIFE_THREATENING'
};

// Reaction types
export const REACTION_TYPES = {
  ANAPHYLAXIS: 'ANAPHYLAXIS',
  HIVES: 'HIVES',
  ANGIOEDEMA: 'ANGIOEDEMA',
  GI_DISTRESS: 'GI_DISTRESS',
  RESPIRATORY: 'RESPIRATORY',
  SKIN_RASH: 'SKIN_RASH',
  ORAL_ALLERGY: 'ORAL_ALLERGY',
  MIGRAINE: 'MIGRAINE',
  BLOATING: 'BLOATING',
  DIARRHEA: 'DIARRHEA',
  NAUSEA: 'NAUSEA',
  VOMITING: 'VOMITING',
  OTHER: 'OTHER'
};
