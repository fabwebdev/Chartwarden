import { pgTable, bigint, varchar, text, timestamp, boolean, decimal, integer, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Nutrition Intake Record Schema
 * Comprehensive tracking of patient nutritional intake including meals, portions,
 * macronutrients, micronutrients, and hydration for hospice care.
 *
 * Supports:
 * - Individual meal/snack logging
 * - Bulk intake recording for shift summaries
 * - Macronutrient and calorie tracking
 * - Fluid intake monitoring
 * - Appetite and tolerance assessment
 * - Feeding assistance documentation
 */
export const nutrition_intake_records = pgTable('nutrition_intake_records', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Patient association
  patient_id: bigint('patient_id', { mode: 'number' }).notNull().references(() => patients.id),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // =========================================
  // MEAL/INTAKE IDENTIFICATION
  // =========================================
  intake_datetime: timestamp('intake_datetime').defaultNow().notNull(),
  meal_type: varchar('meal_type', { length: 50 }).notNull(), // BREAKFAST, LUNCH, DINNER, SNACK, SUPPLEMENT, TUBE_FEEDING, IV_NUTRITION
  intake_category: varchar('intake_category', { length: 50 }), // ORAL, ENTERAL, PARENTERAL

  // =========================================
  // FOOD/BEVERAGE DETAILS
  // =========================================
  food_description: text('food_description'),
  beverage_description: text('beverage_description'),
  food_items_json: text('food_items_json'), // JSON array of detailed food items

  // =========================================
  // PORTION CONSUMPTION
  // =========================================
  portion_offered: varchar('portion_offered', { length: 50 }), // FULL, HALF, QUARTER, SMALL
  portion_consumed_percent: integer('portion_consumed_percent'), // 0-100%
  portion_consumed_description: varchar('portion_consumed_description', { length: 100 }), // ALL, MOST, HALF, LITTLE, NONE, REFUSED
  solid_food_consumed_percent: integer('solid_food_consumed_percent'),
  liquid_consumed_percent: integer('liquid_consumed_percent'),

  // =========================================
  // CALORIC AND MACRONUTRIENT INTAKE
  // =========================================
  calories_estimated: decimal('calories_estimated', { precision: 7, scale: 2 }),
  calories_unit: varchar('calories_unit', { length: 10 }).default('kcal'),

  protein_grams: decimal('protein_grams', { precision: 6, scale: 2 }),
  carbohydrates_grams: decimal('carbohydrates_grams', { precision: 6, scale: 2 }),
  fat_grams: decimal('fat_grams', { precision: 6, scale: 2 }),
  fiber_grams: decimal('fiber_grams', { precision: 5, scale: 2 }),
  sugar_grams: decimal('sugar_grams', { precision: 6, scale: 2 }),
  saturated_fat_grams: decimal('saturated_fat_grams', { precision: 5, scale: 2 }),
  sodium_mg: decimal('sodium_mg', { precision: 7, scale: 2 }),
  cholesterol_mg: decimal('cholesterol_mg', { precision: 6, scale: 2 }),

  // =========================================
  // FLUID INTAKE
  // =========================================
  fluid_intake_ml: decimal('fluid_intake_ml', { precision: 7, scale: 2 }),
  fluid_intake_oz: decimal('fluid_intake_oz', { precision: 6, scale: 2 }),
  fluid_type: varchar('fluid_type', { length: 255 }), // WATER, JUICE, MILK, COFFEE, TEA, THICKENED, etc.
  fluid_consistency: varchar('fluid_consistency', { length: 100 }), // THIN, NECTAR_THICK, HONEY_THICK, PUDDING_THICK
  ice_chips: boolean('ice_chips').default(false),
  ice_chips_amount: varchar('ice_chips_amount', { length: 50 }),

  // =========================================
  // APPETITE ASSESSMENT
  // =========================================
  appetite_level: varchar('appetite_level', { length: 50 }), // EXCELLENT, GOOD, FAIR, POOR, NONE
  appetite_compared_to_normal: varchar('appetite_compared_to_normal', { length: 50 }), // INCREASED, NORMAL, DECREASED, SEVERELY_DECREASED
  hunger_reported: boolean('hunger_reported'),
  hunger_cues_observed: text('hunger_cues_observed'),

  // =========================================
  // TOLERANCE AND SYMPTOMS
  // =========================================
  tolerated_well: boolean('tolerated_well').default(true),
  nausea_present: boolean('nausea_present').default(false),
  nausea_severity: varchar('nausea_severity', { length: 50 }),
  vomiting: boolean('vomiting').default(false),
  vomiting_amount: varchar('vomiting_amount', { length: 100 }),
  abdominal_discomfort: boolean('abdominal_discomfort').default(false),
  bloating: boolean('bloating').default(false),
  reflux: boolean('reflux').default(false),
  dysphagia_symptoms: boolean('dysphagia_symptoms').default(false),
  choking_episode: boolean('choking_episode').default(false),
  aspiration_concern: boolean('aspiration_concern').default(false),
  taste_changes: varchar('taste_changes', { length: 255 }),
  mouth_sores: boolean('mouth_sores').default(false),
  dry_mouth: boolean('dry_mouth').default(false),
  early_satiety: boolean('early_satiety').default(false),
  tolerance_notes: text('tolerance_notes'),

  // =========================================
  // EATING ENVIRONMENT AND CONTEXT
  // =========================================
  eating_location: varchar('eating_location', { length: 100 }), // BED, CHAIR, DINING_ROOM, etc.
  eating_position: varchar('eating_position', { length: 100 }), // UPRIGHT, SEMI_RECLINED, etc.
  feeding_method: varchar('feeding_method', { length: 100 }), // SELF, ASSISTED, TOTAL_ASSISTANCE, TUBE, IV
  assistance_level: varchar('assistance_level', { length: 50 }), // INDEPENDENT, SETUP, SUPERVISION, LIMITED, EXTENSIVE, TOTAL
  adaptive_equipment_used: text('adaptive_equipment_used'),

  // =========================================
  // TUBE FEEDING DETAILS (if applicable)
  // =========================================
  tube_feeding_formula: varchar('tube_feeding_formula', { length: 255 }),
  tube_feeding_rate: decimal('tube_feeding_rate', { precision: 6, scale: 2 }), // mL/hr
  tube_feeding_method: varchar('tube_feeding_method', { length: 50 }), // CONTINUOUS, BOLUS, CYCLIC
  tube_type: varchar('tube_type', { length: 100 }), // NG, NJ, PEG, PEJ, G-TUBE, J-TUBE
  tube_feeding_residual: decimal('tube_feeding_residual', { precision: 6, scale: 2 }), // mL
  residual_action_taken: varchar('residual_action_taken', { length: 255 }),
  tube_feeding_notes: text('tube_feeding_notes'),

  // =========================================
  // PARENTERAL NUTRITION (if applicable)
  // =========================================
  tpn_formula: varchar('tpn_formula', { length: 255 }),
  tpn_rate: decimal('tpn_rate', { precision: 6, scale: 2 }), // mL/hr
  tpn_additives: text('tpn_additives'),
  lipid_infusion: boolean('lipid_infusion').default(false),
  lipid_rate: decimal('lipid_rate', { precision: 6, scale: 2 }),
  parenteral_notes: text('parenteral_notes'),

  // =========================================
  // ORAL SUPPLEMENTS
  // =========================================
  supplement_taken: boolean('supplement_taken').default(false),
  supplement_name: varchar('supplement_name', { length: 255 }),
  supplement_amount: varchar('supplement_amount', { length: 100 }),
  supplement_calories: decimal('supplement_calories', { precision: 6, scale: 2 }),
  supplement_protein: decimal('supplement_protein', { precision: 5, scale: 2 }),
  supplement_notes: text('supplement_notes'),

  // =========================================
  // MEAL REFUSAL
  // =========================================
  meal_refused: boolean('meal_refused').default(false),
  refusal_reason: varchar('refusal_reason', { length: 255 }), // NOT_HUNGRY, NAUSEA, PAIN, FATIGUE, DEPRESSION, DISLIKE, OTHER
  refusal_details: text('refusal_details'),
  intervention_attempted: boolean('intervention_attempted').default(false),
  intervention_description: text('intervention_description'),
  intervention_outcome: varchar('intervention_outcome', { length: 100 }),

  // =========================================
  // TIMING
  // =========================================
  meal_duration_minutes: integer('meal_duration_minutes'),
  time_offered: timestamp('time_offered'),
  time_completed: timestamp('time_completed'),

  // =========================================
  // DOCUMENTATION
  // =========================================
  documented_by_id: bigint('documented_by_id', { mode: 'number' }),
  is_shift_summary: boolean('is_shift_summary').default(false), // True if aggregate for shift
  shift_period: varchar('shift_period', { length: 50 }), // DAY, EVENING, NIGHT
  notes: text('notes'),

  // =========================================
  // SIGNATURE AND COMPLIANCE
  // =========================================
  signature_id: bigint('signature_id', { mode: 'number' }),
  signed_at: timestamp('signed_at'),
  signed_by_id: bigint('signed_by_id', { mode: 'number' }),

  // Amendment tracking
  amended: boolean('amended').default(false),
  amendment_reason: text('amendment_reason'),
  amended_at: timestamp('amended_at'),
  amended_by_id: bigint('amended_by_id', { mode: 'number' }),

  // =========================================
  // AUDIT FIELDS
  // =========================================
  created_by_id: bigint('created_by_id', { mode: 'number' }),
  updated_by_id: bigint('updated_by_id', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  patientIdx: index('idx_nutrition_intake_records_patient_id').on(table.patient_id),
  intakeDatetimeIdx: index('idx_nutrition_intake_records_datetime').on(table.intake_datetime),
  mealTypeIdx: index('idx_nutrition_intake_records_meal_type').on(table.meal_type),
  patientDateIdx: index('idx_nutrition_intake_records_patient_date').on(table.patient_id, table.intake_datetime),
  encounterIdx: index('idx_nutrition_intake_records_encounter').on(table.encounter_id),
  refusedIdx: index('idx_nutrition_intake_records_refused').on(table.meal_refused),
}));

// Meal types
export const MEAL_TYPES = {
  BREAKFAST: 'BREAKFAST',
  AM_SNACK: 'AM_SNACK',
  LUNCH: 'LUNCH',
  PM_SNACK: 'PM_SNACK',
  DINNER: 'DINNER',
  HS_SNACK: 'HS_SNACK',
  SUPPLEMENT: 'SUPPLEMENT',
  TUBE_FEEDING: 'TUBE_FEEDING',
  IV_NUTRITION: 'IV_NUTRITION',
  OTHER: 'OTHER'
};

// Intake categories
export const INTAKE_CATEGORIES = {
  ORAL: 'ORAL',
  ENTERAL: 'ENTERAL',
  PARENTERAL: 'PARENTERAL',
  COMBINATION: 'COMBINATION'
};

// Portion consumed descriptions
export const PORTION_CONSUMED = {
  ALL: 'ALL',
  MOST: 'MOST',
  THREE_QUARTERS: 'THREE_QUARTERS',
  HALF: 'HALF',
  QUARTER: 'QUARTER',
  LITTLE: 'LITTLE',
  NONE: 'NONE',
  REFUSED: 'REFUSED'
};

// Appetite levels
export const APPETITE_LEVELS = {
  EXCELLENT: 'EXCELLENT',
  GOOD: 'GOOD',
  FAIR: 'FAIR',
  POOR: 'POOR',
  NONE: 'NONE'
};

// Assistance levels (based on MDS/FIM)
export const ASSISTANCE_LEVELS = {
  INDEPENDENT: 'INDEPENDENT',
  SETUP_ONLY: 'SETUP_ONLY',
  SUPERVISION: 'SUPERVISION',
  LIMITED_ASSISTANCE: 'LIMITED_ASSISTANCE',
  EXTENSIVE_ASSISTANCE: 'EXTENSIVE_ASSISTANCE',
  TOTAL_DEPENDENCE: 'TOTAL_DEPENDENCE'
};

// Fluid consistencies (IDDSI)
export const FLUID_CONSISTENCIES = {
  THIN: 'THIN',
  SLIGHTLY_THICK: 'SLIGHTLY_THICK',
  MILDLY_THICK: 'MILDLY_THICK',
  MODERATELY_THICK: 'MODERATELY_THICK',
  EXTREMELY_THICK: 'EXTREMELY_THICK'
};

// Tube types
export const TUBE_TYPES = {
  NASOGASTRIC: 'NASOGASTRIC',
  NASOJEJUNAL: 'NASOJEJUNAL',
  PEG: 'PEG',
  PEJ: 'PEJ',
  G_TUBE: 'G_TUBE',
  J_TUBE: 'J_TUBE',
  GASTROJEJUNOSTOMY: 'GASTROJEJUNOSTOMY'
};

// Refusal reasons
export const REFUSAL_REASONS = {
  NOT_HUNGRY: 'NOT_HUNGRY',
  NAUSEA: 'NAUSEA',
  PAIN: 'PAIN',
  FATIGUE: 'FATIGUE',
  DEPRESSION: 'DEPRESSION',
  DISLIKE_FOOD: 'DISLIKE_FOOD',
  DIFFICULTY_SWALLOWING: 'DIFFICULTY_SWALLOWING',
  MOUTH_PROBLEMS: 'MOUTH_PROBLEMS',
  TOO_FULL: 'TOO_FULL',
  SLEEPING: 'SLEEPING',
  END_OF_LIFE_CHOICE: 'END_OF_LIFE_CHOICE',
  OTHER: 'OTHER'
};
