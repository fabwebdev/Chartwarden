import { pgTable, bigint, varchar, text, timestamp, boolean, decimal, integer, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Nutrition Status Schema
 * Comprehensive tracking of patient nutritional status including anthropometric
 * measurements, laboratory values, risk assessments, and overall nutritional indicators.
 *
 * Supports:
 * - BMI and weight tracking with history
 * - Malnutrition screening and assessment
 * - Laboratory nutritional markers
 * - Nutritional risk scoring (MNA, MUST, SGA)
 * - Deficiency tracking
 * - Goal setting and progress monitoring
 */
export const nutrition_status = pgTable('nutrition_status', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Patient and encounter associations
  patient_id: bigint('patient_id', { mode: 'number' }).notNull().references(() => patients.id),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // =========================================
  // ASSESSMENT METADATA
  // =========================================
  assessment_date: timestamp('assessment_date').defaultNow().notNull(),
  assessment_type: varchar('assessment_type', { length: 50 }), // INITIAL, ROUTINE, CHANGE_IN_CONDITION, REASSESSMENT
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),

  // =========================================
  // OVERALL NUTRITIONAL STATUS
  // =========================================
  overall_status: varchar('overall_status', { length: 50 }), // WELL_NOURISHED, AT_RISK, MILDLY_MALNOURISHED, MODERATELY_MALNOURISHED, SEVERELY_MALNOURISHED
  nutritional_diagnosis: text('nutritional_diagnosis'),
  etiology: text('etiology'),
  signs_symptoms: text('signs_symptoms'),

  // =========================================
  // ANTHROPOMETRIC MEASUREMENTS
  // =========================================
  // Height
  height_cm: decimal('height_cm', { precision: 6, scale: 2 }),
  height_inches: decimal('height_inches', { precision: 5, scale: 2 }),
  height_source: varchar('height_source', { length: 100 }), // MEASURED, REPORTED, ESTIMATED, KNEE_HEIGHT, ARM_SPAN

  // Current weight
  weight_kg: decimal('weight_kg', { precision: 6, scale: 2 }),
  weight_lbs: decimal('weight_lbs', { precision: 6, scale: 2 }),
  weight_source: varchar('weight_source', { length: 100 }), // SCALE, BED_SCALE, CHAIR_SCALE, ESTIMATED, REPORTED
  weight_date: timestamp('weight_date'),

  // BMI
  bmi: decimal('bmi', { precision: 5, scale: 2 }),
  bmi_category: varchar('bmi_category', { length: 50 }), // UNDERWEIGHT, NORMAL, OVERWEIGHT, OBESE_I, OBESE_II, OBESE_III

  // Ideal body weight
  ideal_body_weight_kg: decimal('ideal_body_weight_kg', { precision: 6, scale: 2 }),
  percent_ideal_body_weight: decimal('percent_ideal_body_weight', { precision: 5, scale: 2 }),

  // Usual body weight
  usual_body_weight_kg: decimal('usual_body_weight_kg', { precision: 6, scale: 2 }),
  percent_usual_body_weight: decimal('percent_usual_body_weight', { precision: 5, scale: 2 }),

  // =========================================
  // WEIGHT CHANGE HISTORY
  // =========================================
  weight_change_1_week_kg: decimal('weight_change_1_week_kg', { precision: 5, scale: 2 }),
  weight_change_1_week_percent: decimal('weight_change_1_week_percent', { precision: 5, scale: 2 }),
  weight_change_1_month_kg: decimal('weight_change_1_month_kg', { precision: 5, scale: 2 }),
  weight_change_1_month_percent: decimal('weight_change_1_month_percent', { precision: 5, scale: 2 }),
  weight_change_3_month_kg: decimal('weight_change_3_month_kg', { precision: 6, scale: 2 }),
  weight_change_3_month_percent: decimal('weight_change_3_month_percent', { precision: 5, scale: 2 }),
  weight_change_6_month_kg: decimal('weight_change_6_month_kg', { precision: 6, scale: 2 }),
  weight_change_6_month_percent: decimal('weight_change_6_month_percent', { precision: 5, scale: 2 }),
  weight_trend: varchar('weight_trend', { length: 50 }), // STABLE, INCREASING, DECREASING, FLUCTUATING
  weight_loss_intentional: boolean('weight_loss_intentional'),
  weight_history_notes: text('weight_history_notes'),

  // =========================================
  // ADDITIONAL ANTHROPOMETRICS
  // =========================================
  waist_circumference_cm: decimal('waist_circumference_cm', { precision: 5, scale: 2 }),
  hip_circumference_cm: decimal('hip_circumference_cm', { precision: 5, scale: 2 }),
  waist_hip_ratio: decimal('waist_hip_ratio', { precision: 4, scale: 2 }),
  mid_arm_circumference_cm: decimal('mid_arm_circumference_cm', { precision: 5, scale: 2 }),
  calf_circumference_cm: decimal('calf_circumference_cm', { precision: 5, scale: 2 }),
  triceps_skinfold_mm: decimal('triceps_skinfold_mm', { precision: 4, scale: 2 }),
  body_fat_percentage: decimal('body_fat_percentage', { precision: 5, scale: 2 }),

  // =========================================
  // MALNUTRITION SCREENING TOOLS
  // =========================================
  // Mini Nutritional Assessment (MNA)
  mna_screening_score: integer('mna_screening_score'),
  mna_assessment_score: integer('mna_assessment_score'),
  mna_total_score: decimal('mna_total_score', { precision: 4, scale: 1 }),
  mna_category: varchar('mna_category', { length: 50 }), // NORMAL, AT_RISK, MALNOURISHED

  // MUST (Malnutrition Universal Screening Tool)
  must_bmi_score: integer('must_bmi_score'),
  must_weight_loss_score: integer('must_weight_loss_score'),
  must_acute_disease_score: integer('must_acute_disease_score'),
  must_total_score: integer('must_total_score'),
  must_risk_category: varchar('must_risk_category', { length: 50 }), // LOW, MEDIUM, HIGH

  // SGA (Subjective Global Assessment)
  sga_rating: varchar('sga_rating', { length: 50 }), // SGA_A, SGA_B, SGA_C
  sga_weight_change: varchar('sga_weight_change', { length: 50 }),
  sga_dietary_intake: varchar('sga_dietary_intake', { length: 50 }),
  sga_gi_symptoms: varchar('sga_gi_symptoms', { length: 50 }),
  sga_functional_capacity: varchar('sga_functional_capacity', { length: 50 }),
  sga_physical_exam: varchar('sga_physical_exam', { length: 50 }),

  // =========================================
  // LABORATORY VALUES
  // =========================================
  albumin_g_dl: decimal('albumin_g_dl', { precision: 4, scale: 2 }),
  albumin_date: timestamp('albumin_date'),
  prealbumin_mg_dl: decimal('prealbumin_mg_dl', { precision: 5, scale: 2 }),
  prealbumin_date: timestamp('prealbumin_date'),
  transferrin_mg_dl: decimal('transferrin_mg_dl', { precision: 5, scale: 1 }),
  total_protein_g_dl: decimal('total_protein_g_dl', { precision: 4, scale: 2 }),
  total_lymphocyte_count: decimal('total_lymphocyte_count', { precision: 6, scale: 1 }),
  hemoglobin_g_dl: decimal('hemoglobin_g_dl', { precision: 4, scale: 1 }),
  hematocrit_percent: decimal('hematocrit_percent', { precision: 4, scale: 1 }),
  cholesterol_mg_dl: integer('cholesterol_mg_dl'),
  triglycerides_mg_dl: integer('triglycerides_mg_dl'),
  blood_glucose_fasting: integer('blood_glucose_fasting'),
  hba1c: decimal('hba1c', { precision: 4, scale: 1 }),
  bun: decimal('bun', { precision: 5, scale: 1 }),
  creatinine: decimal('creatinine', { precision: 4, scale: 2 }),
  sodium: integer('sodium'),
  potassium: decimal('potassium', { precision: 4, scale: 2 }),
  phosphorus: decimal('phosphorus', { precision: 4, scale: 2 }),
  magnesium: decimal('magnesium', { precision: 4, scale: 2 }),
  calcium: decimal('calcium', { precision: 4, scale: 2 }),
  labs_date: timestamp('labs_date'),
  lab_notes: text('lab_notes'),

  // =========================================
  // VITAMIN/MINERAL DEFICIENCIES
  // =========================================
  vitamin_deficiencies_json: text('vitamin_deficiencies_json'), // JSON array of deficiencies
  vitamin_d_level: decimal('vitamin_d_level', { precision: 5, scale: 1 }),
  vitamin_b12_level: decimal('vitamin_b12_level', { precision: 6, scale: 0 }),
  folate_level: decimal('folate_level', { precision: 5, scale: 1 }),
  iron_level: decimal('iron_level', { precision: 5, scale: 0 }),
  ferritin_level: decimal('ferritin_level', { precision: 6, scale: 1 }),
  zinc_level: decimal('zinc_level', { precision: 5, scale: 1 }),
  deficiency_notes: text('deficiency_notes'),

  // =========================================
  // HYDRATION STATUS
  // =========================================
  hydration_status: varchar('hydration_status', { length: 50 }), // WELL_HYDRATED, MILDLY_DEHYDRATED, MODERATELY_DEHYDRATED, SEVERELY_DEHYDRATED
  dehydration_signs: text('dehydration_signs'), // JSON or comma-separated
  skin_turgor: varchar('skin_turgor', { length: 50 }),
  mucous_membranes: varchar('mucous_membranes', { length: 50 }),
  urine_output: varchar('urine_output', { length: 50 }),
  fluid_restriction: boolean('fluid_restriction').default(false),
  fluid_restriction_amount_ml: integer('fluid_restriction_amount_ml'),
  hydration_notes: text('hydration_notes'),

  // =========================================
  // PHYSICAL SIGNS OF MALNUTRITION
  // =========================================
  muscle_wasting: boolean('muscle_wasting').default(false),
  muscle_wasting_location: text('muscle_wasting_location'),
  subcutaneous_fat_loss: boolean('subcutaneous_fat_loss').default(false),
  fat_loss_location: text('fat_loss_location'),
  edema_nutritional: boolean('edema_nutritional').default(false),
  edema_location: text('edema_location'),
  ascites: boolean('ascites').default(false),
  hair_changes: boolean('hair_changes').default(false),
  hair_changes_description: text('hair_changes_description'),
  nail_changes: boolean('nail_changes').default(false),
  nail_changes_description: text('nail_changes_description'),
  skin_changes: boolean('skin_changes').default(false),
  skin_changes_description: text('skin_changes_description'),
  oral_changes: boolean('oral_changes').default(false),
  oral_changes_description: text('oral_changes_description'),
  physical_exam_notes: text('physical_exam_notes'),

  // =========================================
  // FUNCTIONAL STATUS
  // =========================================
  functional_status: varchar('functional_status', { length: 50 }), // INDEPENDENT, MODIFIED_INDEPENDENT, REQUIRES_ASSISTANCE, DEPENDENT
  handgrip_strength_kg: decimal('handgrip_strength_kg', { precision: 5, scale: 2 }),
  handgrip_side: varchar('handgrip_side', { length: 10 }), // LEFT, RIGHT
  activity_level: varchar('activity_level', { length: 50 }), // BEDRIDDEN, BEDFAST, CHAIR_FAST, AMBULATORY
  energy_level: varchar('energy_level', { length: 50 }), // HIGH, NORMAL, LOW, VERY_LOW
  fatigue_level: varchar('fatigue_level', { length: 50 }),
  functional_notes: text('functional_notes'),

  // =========================================
  // NUTRITIONAL REQUIREMENTS
  // =========================================
  estimated_calorie_needs: integer('estimated_calorie_needs'),
  calorie_calculation_method: varchar('calorie_calculation_method', { length: 100 }), // MIFFLIN_ST_JEOR, HARRIS_BENEDICT, PENN_STATE, INDIRECT_CALORIMETRY
  activity_factor: decimal('activity_factor', { precision: 3, scale: 2 }),
  stress_factor: decimal('stress_factor', { precision: 3, scale: 2 }),
  estimated_protein_needs_g: decimal('estimated_protein_needs_g', { precision: 5, scale: 1 }),
  protein_needs_g_per_kg: decimal('protein_needs_g_per_kg', { precision: 3, scale: 2 }),
  estimated_fluid_needs_ml: integer('estimated_fluid_needs_ml'),
  requirements_notes: text('requirements_notes'),

  // =========================================
  // NUTRITION GOALS
  // =========================================
  nutrition_goals: text('nutrition_goals'), // JSON or text
  weight_goal: varchar('weight_goal', { length: 50 }), // MAINTAIN, GAIN, LOSE, COMFORT_CARE
  weight_goal_target_kg: decimal('weight_goal_target_kg', { precision: 6, scale: 2 }),
  intake_goal: varchar('intake_goal', { length: 255 }),
  hydration_goal: varchar('hydration_goal', { length: 255 }),
  goal_timeframe: varchar('goal_timeframe', { length: 100 }),
  goal_progress: varchar('goal_progress', { length: 50 }), // ON_TRACK, PARTIALLY_MET, NOT_MET
  goal_notes: text('goal_notes'),

  // =========================================
  // INTERVENTIONS
  // =========================================
  interventions_json: text('interventions_json'), // JSON array of current interventions
  diet_order: varchar('diet_order', { length: 255 }),
  diet_texture: varchar('diet_texture', { length: 100 }),
  fluid_consistency: varchar('fluid_consistency', { length: 100 }),
  supplements_ordered: text('supplements_ordered'),
  tube_feeding_ordered: boolean('tube_feeding_ordered').default(false),
  tpn_ordered: boolean('tpn_ordered').default(false),
  speech_therapy_referral: boolean('speech_therapy_referral').default(false),
  registered_dietitian_referral: boolean('registered_dietitian_referral').default(false),
  intervention_notes: text('intervention_notes'),

  // =========================================
  // HOSPICE-SPECIFIC CONSIDERATIONS
  // =========================================
  comfort_care_focus: boolean('comfort_care_focus').default(false),
  artificial_nutrition_discussed: boolean('artificial_nutrition_discussed'),
  artificial_nutrition_decision: varchar('artificial_nutrition_decision', { length: 50 }), // CONTINUE, WITHHOLD, WITHDRAW, NOT_DISCUSSED
  patient_family_goals: text('patient_family_goals'),
  quality_of_life_priority: text('quality_of_life_priority'),
  hospice_nutrition_notes: text('hospice_nutrition_notes'),

  // =========================================
  // CLINICAL NOTES AND SUMMARY
  // =========================================
  clinical_notes: text('clinical_notes'),
  assessment_summary: text('assessment_summary'),
  recommendations: text('recommendations'),
  follow_up_plan: text('follow_up_plan'),
  next_assessment_date: timestamp('next_assessment_date'),
  provider_notified: boolean('provider_notified').default(false),
  provider_notified_reason: text('provider_notified_reason'),

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
  patientIdx: index('idx_nutrition_status_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_nutrition_status_assessment_date').on(table.assessment_date),
  patientDateIdx: index('idx_nutrition_status_patient_date').on(table.patient_id, table.assessment_date),
  overallStatusIdx: index('idx_nutrition_status_overall').on(table.overall_status),
  bmiIdx: index('idx_nutrition_status_bmi').on(table.bmi),
  mnaIdx: index('idx_nutrition_status_mna').on(table.mna_category),
  mustIdx: index('idx_nutrition_status_must').on(table.must_risk_category),
}));

// Overall nutritional status categories
export const NUTRITIONAL_STATUS = {
  WELL_NOURISHED: 'WELL_NOURISHED',
  AT_RISK: 'AT_RISK',
  MILDLY_MALNOURISHED: 'MILDLY_MALNOURISHED',
  MODERATELY_MALNOURISHED: 'MODERATELY_MALNOURISHED',
  SEVERELY_MALNOURISHED: 'SEVERELY_MALNOURISHED'
};

// BMI categories
export const BMI_CATEGORIES = {
  SEVERE_UNDERWEIGHT: { label: 'Severe Underweight', min: 0, max: 16 },
  UNDERWEIGHT: { label: 'Underweight', min: 16, max: 18.5 },
  NORMAL: { label: 'Normal', min: 18.5, max: 25 },
  OVERWEIGHT: { label: 'Overweight', min: 25, max: 30 },
  OBESE_CLASS_I: { label: 'Obese Class I', min: 30, max: 35 },
  OBESE_CLASS_II: { label: 'Obese Class II', min: 35, max: 40 },
  OBESE_CLASS_III: { label: 'Obese Class III', min: 40, max: Infinity }
};

// MNA categories
export const MNA_CATEGORIES = {
  NORMAL: { label: 'Normal nutritional status', min: 24, max: 30 },
  AT_RISK: { label: 'At risk of malnutrition', min: 17, max: 23.5 },
  MALNOURISHED: { label: 'Malnourished', min: 0, max: 17 }
};

// MUST risk categories
export const MUST_RISK_CATEGORIES = {
  LOW: { label: 'Low Risk', score: 0 },
  MEDIUM: { label: 'Medium Risk', score: 1 },
  HIGH: { label: 'High Risk', minScore: 2 }
};

// SGA ratings
export const SGA_RATINGS = {
  SGA_A: 'Well nourished',
  SGA_B: 'Moderately malnourished or suspected of being malnourished',
  SGA_C: 'Severely malnourished'
};

// Hydration status
export const HYDRATION_STATUS = {
  WELL_HYDRATED: 'WELL_HYDRATED',
  MILDLY_DEHYDRATED: 'MILDLY_DEHYDRATED',
  MODERATELY_DEHYDRATED: 'MODERATELY_DEHYDRATED',
  SEVERELY_DEHYDRATED: 'SEVERELY_DEHYDRATED'
};

// Weight trends
export const WEIGHT_TRENDS = {
  STABLE: 'STABLE',
  INCREASING: 'INCREASING',
  DECREASING: 'DECREASING',
  FLUCTUATING: 'FLUCTUATING'
};

// Activity levels
export const ACTIVITY_LEVELS = {
  BEDRIDDEN: 'BEDRIDDEN',
  BEDFAST: 'BEDFAST',
  CHAIR_FAST: 'CHAIR_FAST',
  AMBULATORY_WITH_ASSISTANCE: 'AMBULATORY_WITH_ASSISTANCE',
  AMBULATORY: 'AMBULATORY'
};

// Weight goals for hospice
export const WEIGHT_GOALS = {
  MAINTAIN: 'MAINTAIN',
  GAIN: 'GAIN',
  LOSE: 'LOSE',
  COMFORT_CARE: 'COMFORT_CARE'
};

// Calorie calculation methods
export const CALORIE_CALCULATION_METHODS = {
  MIFFLIN_ST_JEOR: 'MIFFLIN_ST_JEOR',
  HARRIS_BENEDICT: 'HARRIS_BENEDICT',
  PENN_STATE: 'PENN_STATE',
  INDIRECT_CALORIMETRY: 'INDIRECT_CALORIMETRY',
  ESTIMATED: 'ESTIMATED'
};

// Normal laboratory ranges for nutritional markers
export const NUTRITIONAL_LAB_RANGES = {
  albumin: { low: 3.4, high: 5.4, unit: 'g/dL', critical_low: 2.0 },
  prealbumin: { low: 15, high: 36, unit: 'mg/dL', critical_low: 10 },
  transferrin: { low: 200, high: 400, unit: 'mg/dL' },
  total_protein: { low: 6.0, high: 8.3, unit: 'g/dL' },
  vitamin_d: { low: 30, high: 100, unit: 'ng/mL', deficient: 20 },
  vitamin_b12: { low: 200, high: 900, unit: 'pg/mL', deficient: 200 },
  folate: { low: 2.7, high: 17, unit: 'ng/mL' },
  ferritin: { low: 12, high: 300, unit: 'ng/mL' }
};
