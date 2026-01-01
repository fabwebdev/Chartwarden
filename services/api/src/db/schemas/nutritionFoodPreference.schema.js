import { pgTable, bigint, varchar, text, timestamp, boolean, integer, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Nutrition Food Preferences Schema
 * Tracks patient food preferences including likes, dislikes, cultural/religious
 * requirements, and meal-related preferences for hospice nutrition care.
 *
 * Supports:
 * - Food likes and dislikes
 * - Cultural and religious dietary requirements
 * - Texture and temperature preferences
 * - Meal timing and portion preferences
 * - Evolving preferences over time
 */
export const nutrition_food_preferences = pgTable('nutrition_food_preferences', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Patient association
  patient_id: bigint('patient_id', { mode: 'number' }).notNull().references(() => patients.id),

  // =========================================
  // PREFERENCE TYPE AND FOOD ITEM
  // =========================================
  preference_type: varchar('preference_type', { length: 50 }).notNull(), // LIKE, DISLIKE, RELIGIOUS, CULTURAL, TEXTURE, TEMPERATURE
  preference_category: varchar('preference_category', { length: 100 }), // FOOD, BEVERAGE, SEASONING, PREPARATION_METHOD

  food_item: varchar('food_item', { length: 255 }),
  food_group: varchar('food_group', { length: 100 }),
  description: text('description'),

  // =========================================
  // PREFERENCE STRENGTH
  // =========================================
  preference_strength: varchar('preference_strength', { length: 50 }), // STRONG, MODERATE, MILD
  priority_level: integer('priority_level').default(1), // 1-5, where 5 is highest priority
  is_mandatory: boolean('is_mandatory').default(false), // True for religious/medical requirements

  // =========================================
  // CULTURAL/RELIGIOUS REQUIREMENTS
  // =========================================
  cultural_background: varchar('cultural_background', { length: 255 }),
  religious_requirement: varchar('religious_requirement', { length: 255 }), // KOSHER, HALAL, VEGETARIAN_HINDU, etc.
  dietary_philosophy: varchar('dietary_philosophy', { length: 100 }), // VEGETARIAN, VEGAN, PESCATARIAN, etc.
  fasting_requirements: text('fasting_requirements'),
  special_occasions: text('special_occasions'), // Holidays, observances that affect diet

  // =========================================
  // TEXTURE PREFERENCES
  // =========================================
  texture_preference: varchar('texture_preference', { length: 100 }), // REGULAR, SOFT, MECHANICAL_SOFT, PUREED, LIQUID
  texture_modifications: text('texture_modifications'),
  dysphagia_diet_level: varchar('dysphagia_diet_level', { length: 100 }), // IDDSI levels if applicable
  chewing_ability: varchar('chewing_ability', { length: 100 }), // NORMAL, IMPAIRED, SEVERELY_IMPAIRED
  swallowing_concerns: text('swallowing_concerns'),

  // =========================================
  // TEMPERATURE PREFERENCES
  // =========================================
  temperature_preference: varchar('temperature_preference', { length: 50 }), // HOT, WARM, ROOM_TEMP, COLD, FROZEN
  specific_temperature_notes: text('specific_temperature_notes'),

  // =========================================
  // SEASONING AND FLAVOR
  // =========================================
  seasoning_preference: varchar('seasoning_preference', { length: 100 }), // BLAND, LIGHTLY_SEASONED, WELL_SEASONED, SPICY
  salt_preference: varchar('salt_preference', { length: 50 }), // NONE, LOW, NORMAL, HIGH
  sugar_preference: varchar('sugar_preference', { length: 50 }), // NONE, LOW, NORMAL, HIGH
  spice_tolerance: varchar('spice_tolerance', { length: 50 }), // NONE, MILD, MEDIUM, HOT
  flavor_preferences: text('flavor_preferences'), // Free text for specific flavor notes

  // =========================================
  // MEAL PREFERENCES
  // =========================================
  preferred_meal_times: text('preferred_meal_times'), // JSON or free text
  snack_preferences: text('snack_preferences'),
  beverage_preferences: text('beverage_preferences'),
  portion_size_preference: varchar('portion_size_preference', { length: 50 }), // SMALL, REGULAR, LARGE
  eating_frequency: varchar('eating_frequency', { length: 100 }), // 3_MEALS, SMALL_FREQUENT, GRAZING

  // =========================================
  // PREPARATION METHOD
  // =========================================
  preferred_cooking_methods: text('preferred_cooking_methods'), // BAKED, FRIED, GRILLED, STEAMED, RAW, etc.
  avoided_cooking_methods: text('avoided_cooking_methods'),
  preparation_notes: text('preparation_notes'),

  // =========================================
  // APPETITE CONTEXT
  // =========================================
  appetite_notes: text('appetite_notes'),
  comfort_foods: text('comfort_foods'),
  aversions_during_illness: text('aversions_during_illness'),
  preferences_when_nauseous: text('preferences_when_nauseous'),

  // =========================================
  // TEMPORAL STATUS
  // =========================================
  is_active: boolean('is_active').default(true),
  effective_date: timestamp('effective_date').defaultNow(),
  last_reviewed_date: timestamp('last_reviewed_date'),
  preference_changed_date: timestamp('preference_changed_date'),
  change_reason: text('change_reason'), // Why preference changed

  // =========================================
  // SOURCE
  // =========================================
  source_of_information: varchar('source_of_information', { length: 100 }), // PATIENT, FAMILY, CAREGIVER, PRIOR_RECORD
  reported_by: varchar('reported_by', { length: 255 }),
  notes: text('notes'),

  // =========================================
  // AUDIT FIELDS
  // =========================================
  created_by_id: bigint('created_by_id', { mode: 'number' }),
  updated_by_id: bigint('updated_by_id', { mode: 'number' }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  patientIdx: index('idx_nutrition_food_preferences_patient_id').on(table.patient_id),
  typeIdx: index('idx_nutrition_food_preferences_type').on(table.preference_type),
  activeIdx: index('idx_nutrition_food_preferences_active').on(table.is_active),
  patientActiveIdx: index('idx_nutrition_food_preferences_patient_active').on(table.patient_id, table.is_active),
  religiousIdx: index('idx_nutrition_food_preferences_religious').on(table.religious_requirement),
}));

// Preference types
export const PREFERENCE_TYPES = {
  LIKE: 'LIKE',
  DISLIKE: 'DISLIKE',
  RELIGIOUS: 'RELIGIOUS',
  CULTURAL: 'CULTURAL',
  TEXTURE: 'TEXTURE',
  TEMPERATURE: 'TEMPERATURE',
  SEASONING: 'SEASONING',
  OTHER: 'OTHER'
};

// Texture preferences based on IDDSI framework
export const TEXTURE_PREFERENCES = {
  REGULAR: 'REGULAR',
  EASY_TO_CHEW: 'EASY_TO_CHEW',
  SOFT_AND_BITE_SIZED: 'SOFT_AND_BITE_SIZED',
  MINCED_AND_MOIST: 'MINCED_AND_MOIST',
  PUREED: 'PUREED',
  LIQUIDIZED: 'LIQUIDIZED'
};

// IDDSI levels for dysphagia diets
export const IDDSI_LEVELS = {
  LEVEL_7_REGULAR: 'LEVEL_7_REGULAR',
  LEVEL_6_SOFT_BITE_SIZED: 'LEVEL_6_SOFT_BITE_SIZED',
  LEVEL_5_MINCED_MOIST: 'LEVEL_5_MINCED_MOIST',
  LEVEL_4_PUREED: 'LEVEL_4_PUREED',
  LEVEL_3_LIQUIDIZED: 'LEVEL_3_LIQUIDIZED',
  LEVEL_2_MILDLY_THICK: 'LEVEL_2_MILDLY_THICK',
  LEVEL_1_SLIGHTLY_THICK: 'LEVEL_1_SLIGHTLY_THICK',
  LEVEL_0_THIN: 'LEVEL_0_THIN'
};

// Religious dietary requirements
export const RELIGIOUS_REQUIREMENTS = {
  KOSHER: 'KOSHER',
  HALAL: 'HALAL',
  HINDU_VEGETARIAN: 'HINDU_VEGETARIAN',
  BUDDHIST: 'BUDDHIST',
  JAIN: 'JAIN',
  SEVENTH_DAY_ADVENTIST: 'SEVENTH_DAY_ADVENTIST',
  RASTAFARIAN: 'RASTAFARIAN',
  CATHOLIC_FASTING: 'CATHOLIC_FASTING',
  ORTHODOX_FASTING: 'ORTHODOX_FASTING',
  OTHER: 'OTHER'
};

// Dietary philosophies
export const DIETARY_PHILOSOPHIES = {
  OMNIVORE: 'OMNIVORE',
  VEGETARIAN: 'VEGETARIAN',
  LACTO_VEGETARIAN: 'LACTO_VEGETARIAN',
  OVO_VEGETARIAN: 'OVO_VEGETARIAN',
  LACTO_OVO_VEGETARIAN: 'LACTO_OVO_VEGETARIAN',
  PESCATARIAN: 'PESCATARIAN',
  VEGAN: 'VEGAN',
  RAW_VEGAN: 'RAW_VEGAN',
  FLEXITARIAN: 'FLEXITARIAN',
  PALEO: 'PALEO',
  KETO: 'KETO',
  MEDITERRANEAN: 'MEDITERRANEAN',
  OTHER: 'OTHER'
};

// Portion sizes
export const PORTION_SIZES = {
  VERY_SMALL: 'VERY_SMALL',
  SMALL: 'SMALL',
  REGULAR: 'REGULAR',
  LARGE: 'LARGE',
  VERY_LARGE: 'VERY_LARGE'
};
