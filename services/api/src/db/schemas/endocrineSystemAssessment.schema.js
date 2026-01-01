import { pgTable, bigint, integer, varchar, decimal, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Endocrine System Assessment Schema
 * Comprehensive endocrine system assessment for hospice patients
 *
 * Clinical Parameters:
 * - Thyroid function and examination
 * - Glucose metabolism and diabetes management
 * - Adrenal function
 * - Hormone levels and symptoms
 * - Metabolic indicators
 * - Gland examination findings
 *
 * Reference Standards:
 * - American Diabetes Association (ADA) guidelines
 * - American Thyroid Association guidelines
 * - Endocrine Society clinical practice guidelines
 */
export const endocrine_system_assessments = pgTable('endocrine_system_assessments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // Assessment metadata
  assessment_date: timestamp('assessment_date').defaultNow().notNull(),
  assessment_type: varchar('assessment_type', { length: 50 }), // INITIAL, FOLLOW_UP, REASSESSMENT, ROUTINE
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),

  // =========================================
  // OVERALL ENDOCRINE STATUS
  // =========================================
  overall_status: varchar('overall_status', { length: 50 }), // NORMAL, ABNORMAL, UNCHANGED, IMPROVED, DECLINED
  endocrine_history: text('endocrine_history'),
  known_conditions: jsonb('known_conditions'), // Array: DIABETES_TYPE_1, DIABETES_TYPE_2, HYPOTHYROID, HYPERTHYROID, ADDISONS, CUSHINGS, etc.

  // =========================================
  // THYROID ASSESSMENT
  // =========================================
  thyroid_palpable: boolean('thyroid_palpable').default(false),
  thyroid_size: varchar('thyroid_size', { length: 50 }), // NORMAL, ENLARGED, ATROPHIC
  thyroid_symmetry: varchar('thyroid_symmetry', { length: 50 }), // SYMMETRIC, ASYMMETRIC
  thyroid_consistency: varchar('thyroid_consistency', { length: 50 }), // SOFT, FIRM, HARD, NODULAR
  thyroid_tenderness: boolean('thyroid_tenderness').default(false),
  thyroid_nodules: boolean('thyroid_nodules').default(false),
  thyroid_nodule_description: text('thyroid_nodule_description'),
  thyroid_bruit: boolean('thyroid_bruit').default(false),
  thyroid_movement_swallowing: varchar('thyroid_movement_swallowing', { length: 50 }), // NORMAL, RESTRICTED, FIXED

  // Thyroid symptoms - Hypothyroid
  fatigue_present: boolean('fatigue_present').default(false),
  cold_intolerance: boolean('cold_intolerance').default(false),
  weight_gain: boolean('weight_gain').default(false),
  constipation: boolean('constipation').default(false),
  dry_skin: boolean('dry_skin').default(false),
  hair_loss: boolean('hair_loss').default(false),
  bradycardia: boolean('bradycardia').default(false),
  delayed_reflexes: boolean('delayed_reflexes').default(false),
  facial_puffiness: boolean('facial_puffiness').default(false),
  voice_hoarseness: boolean('voice_hoarseness').default(false),
  hypothyroid_symptoms_notes: text('hypothyroid_symptoms_notes'),

  // Thyroid symptoms - Hyperthyroid
  heat_intolerance: boolean('heat_intolerance').default(false),
  weight_loss: boolean('weight_loss').default(false),
  diarrhea: boolean('diarrhea').default(false),
  sweating_excessive: boolean('sweating_excessive').default(false),
  tremor_present: boolean('tremor_present').default(false),
  tachycardia: boolean('tachycardia').default(false),
  hyperreflexia: boolean('hyperreflexia').default(false),
  anxiety_nervousness: boolean('anxiety_nervousness').default(false),
  exophthalmos: boolean('exophthalmos').default(false),
  lid_lag: boolean('lid_lag').default(false),
  hyperthyroid_symptoms_notes: text('hyperthyroid_symptoms_notes'),

  thyroid_status: varchar('thyroid_status', { length: 50 }), // EUTHYROID, HYPOTHYROID, HYPERTHYROID, SUBCLINICAL_HYPO, SUBCLINICAL_HYPER
  thyroid_notes: text('thyroid_notes'),

  // =========================================
  // GLUCOSE METABOLISM / DIABETES
  // =========================================
  diabetes_type: varchar('diabetes_type', { length: 50 }), // TYPE_1, TYPE_2, GESTATIONAL, PREDIABETES, NONE
  diabetes_duration_years: integer('diabetes_duration_years'),

  // Current glucose status
  blood_glucose_fasting: integer('blood_glucose_fasting'), // mg/dL
  blood_glucose_random: integer('blood_glucose_random'), // mg/dL
  blood_glucose_time: timestamp('blood_glucose_time'),
  glucose_monitoring_frequency: varchar('glucose_monitoring_frequency', { length: 100 }), // DAILY, BID, TID, QID, WEEKLY, PRN
  glucose_monitoring_method: varchar('glucose_monitoring_method', { length: 100 }), // FINGERSTICK, CGM

  // HbA1c if available
  hba1c_value: decimal('hba1c_value', { precision: 4, scale: 1 }), // Percentage
  hba1c_date: timestamp('hba1c_date'),

  // Hypoglycemia assessment
  hypoglycemia_episodes: boolean('hypoglycemia_episodes').default(false),
  hypoglycemia_frequency: varchar('hypoglycemia_frequency', { length: 100 }), // RARE, OCCASIONAL, FREQUENT
  hypoglycemia_awareness: varchar('hypoglycemia_awareness', { length: 50 }), // AWARE, IMPAIRED, UNAWARE
  hypoglycemia_symptoms: jsonb('hypoglycemia_symptoms'), // Array: SHAKINESS, SWEATING, CONFUSION, DIZZINESS, WEAKNESS

  // Hyperglycemia symptoms
  polyuria: boolean('polyuria').default(false),
  polydipsia: boolean('polydipsia').default(false),
  polyphagia: boolean('polyphagia').default(false),
  blurred_vision: boolean('blurred_vision').default(false),
  slow_wound_healing: boolean('slow_wound_healing').default(false),

  // Diabetes complications
  diabetic_neuropathy: boolean('diabetic_neuropathy').default(false),
  neuropathy_type: varchar('neuropathy_type', { length: 100 }), // PERIPHERAL, AUTONOMIC, BOTH
  neuropathy_symptoms: text('neuropathy_symptoms'),
  diabetic_retinopathy: boolean('diabetic_retinopathy').default(false),
  diabetic_nephropathy: boolean('diabetic_nephropathy').default(false),
  diabetic_foot_exam: varchar('diabetic_foot_exam', { length: 50 }), // NORMAL, ABNORMAL, NOT_DONE
  foot_sensation: varchar('foot_sensation', { length: 50 }), // INTACT, DIMINISHED, ABSENT
  monofilament_test: varchar('monofilament_test', { length: 50 }), // NORMAL, ABNORMAL, NOT_DONE

  diabetes_management: varchar('diabetes_management', { length: 100 }), // DIET, ORAL_MEDS, INSULIN, COMBINATION
  insulin_regimen: text('insulin_regimen'),
  diabetes_notes: text('diabetes_notes'),

  // =========================================
  // ADRENAL FUNCTION
  // =========================================
  adrenal_status: varchar('adrenal_status', { length: 50 }), // NORMAL, INSUFFICIENCY, EXCESS

  // Adrenal insufficiency symptoms
  fatigue_adrenal: boolean('fatigue_adrenal').default(false),
  muscle_weakness: boolean('muscle_weakness').default(false),
  orthostatic_hypotension: boolean('orthostatic_hypotension').default(false),
  salt_craving: boolean('salt_craving').default(false),
  hyperpigmentation: boolean('hyperpigmentation').default(false),
  nausea_vomiting: boolean('nausea_vomiting').default(false),
  abdominal_pain: boolean('abdominal_pain').default(false),

  // Cushing's syndrome symptoms
  moon_facies: boolean('moon_facies').default(false),
  buffalo_hump: boolean('buffalo_hump').default(false),
  central_obesity: boolean('central_obesity').default(false),
  striae: boolean('striae').default(false),
  striae_color: varchar('striae_color', { length: 50 }), // PINK, PURPLE, SILVERY
  easy_bruising: boolean('easy_bruising').default(false),
  proximal_muscle_weakness: boolean('proximal_muscle_weakness').default(false),
  hirsutism: boolean('hirsutism').default(false),

  steroid_use_current: boolean('steroid_use_current').default(false),
  steroid_type: varchar('steroid_type', { length: 100 }),
  steroid_dose: varchar('steroid_dose', { length: 100 }),
  steroid_duration: varchar('steroid_duration', { length: 100 }),
  adrenal_notes: text('adrenal_notes'),

  // =========================================
  // PITUITARY FUNCTION
  // =========================================
  pituitary_status: varchar('pituitary_status', { length: 50 }), // NORMAL, HYPOPITUITARISM, HYPERPITUITARISM

  growth_hormone_status: varchar('growth_hormone_status', { length: 50 }), // NORMAL, DEFICIENT, EXCESS
  acromegaly_features: boolean('acromegaly_features').default(false),

  prolactin_status: varchar('prolactin_status', { length: 50 }), // NORMAL, ELEVATED
  galactorrhea: boolean('galactorrhea').default(false),
  menstrual_irregularities: boolean('menstrual_irregularities').default(false),

  pituitary_notes: text('pituitary_notes'),

  // =========================================
  // PARATHYROID / CALCIUM METABOLISM
  // =========================================
  calcium_status: varchar('calcium_status', { length: 50 }), // NORMAL, HYPERCALCEMIA, HYPOCALCEMIA
  serum_calcium: decimal('serum_calcium', { precision: 4, scale: 1 }), // mg/dL
  ionized_calcium: decimal('ionized_calcium', { precision: 4, scale: 2 }), // mmol/L

  // Hypercalcemia symptoms
  bone_pain: boolean('bone_pain').default(false),
  kidney_stones_history: boolean('kidney_stones_history').default(false),
  abdominal_complaints: boolean('abdominal_complaints').default(false),
  confusion_lethargy: boolean('confusion_lethargy').default(false),

  // Hypocalcemia symptoms
  muscle_cramps: boolean('muscle_cramps').default(false),
  paresthesias: boolean('paresthesias').default(false),
  tetany: boolean('tetany').default(false),
  chvostek_sign: boolean('chvostek_sign').default(false),
  trousseau_sign: boolean('trousseau_sign').default(false),

  parathyroid_notes: text('parathyroid_notes'),

  // =========================================
  // METABOLIC INDICATORS
  // =========================================
  body_weight_kg: decimal('body_weight_kg', { precision: 6, scale: 2 }),
  body_weight_lbs: decimal('body_weight_lbs', { precision: 6, scale: 2 }),
  weight_change_percent: decimal('weight_change_percent', { precision: 5, scale: 2 }),
  weight_change_period_weeks: integer('weight_change_period_weeks'),
  weight_trend: varchar('weight_trend', { length: 50 }), // STABLE, INCREASING, DECREASING

  bmi: decimal('bmi', { precision: 5, scale: 2 }),
  waist_circumference_cm: decimal('waist_circumference_cm', { precision: 5, scale: 1 }),
  waist_circumference_in: decimal('waist_circumference_in', { precision: 5, scale: 1 }),

  appetite_status: varchar('appetite_status', { length: 50 }), // NORMAL, INCREASED, DECREASED, ABSENT
  energy_level: varchar('energy_level', { length: 50 }), // NORMAL, LOW, HIGH
  sleep_disturbance: boolean('sleep_disturbance').default(false),
  sleep_disturbance_type: varchar('sleep_disturbance_type', { length: 100 }), // INSOMNIA, HYPERSOMNIA, FRAGMENTED

  metabolic_notes: text('metabolic_notes'),

  // =========================================
  // LABORATORY VALUES (if available)
  // =========================================
  tsh_value: decimal('tsh_value', { precision: 6, scale: 3 }), // mIU/L
  free_t4: decimal('free_t4', { precision: 4, scale: 2 }), // ng/dL
  free_t3: decimal('free_t3', { precision: 4, scale: 2 }), // pg/mL
  cortisol_am: decimal('cortisol_am', { precision: 5, scale: 1 }), // mcg/dL
  cortisol_pm: decimal('cortisol_pm', { precision: 5, scale: 1 }), // mcg/dL
  acth: decimal('acth', { precision: 5, scale: 1 }), // pg/mL
  pth: decimal('pth', { precision: 5, scale: 1 }), // pg/mL
  vitamin_d: decimal('vitamin_d', { precision: 5, scale: 1 }), // ng/mL
  labs_date: timestamp('labs_date'),
  labs_notes: text('labs_notes'),

  // =========================================
  // CLINICAL NOTES AND SUMMARY
  // =========================================
  clinical_notes: text('clinical_notes'),
  assessment_summary: text('assessment_summary'),
  follow_up_plan: text('follow_up_plan'),
  provider_notified: boolean('provider_notified').default(false),
  provider_notified_reason: text('provider_notified_reason'),

  // =========================================
  // SIGNATURE AND COMPLIANCE (21 CFR Part 11)
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
  // Performance indexes
  patientIdx: index('idx_endocrine_system_assessments_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_endocrine_system_assessments_date').on(table.assessment_date),
  patientDateIdx: index('idx_endocrine_system_assessments_patient_date').on(table.patient_id, table.assessment_date),
  overallStatusIdx: index('idx_endocrine_system_assessments_status').on(table.overall_status),
  diabetesTypeIdx: index('idx_endocrine_system_assessments_diabetes').on(table.diabetes_type),
  thyroidStatusIdx: index('idx_endocrine_system_assessments_thyroid').on(table.thyroid_status),
}));

// Thyroid status classifications
export const ENDOCRINE_THYROID_STATUS = {
  EUTHYROID: 'EUTHYROID',
  HYPOTHYROID: 'HYPOTHYROID',
  HYPERTHYROID: 'HYPERTHYROID',
  SUBCLINICAL_HYPO: 'SUBCLINICAL_HYPO',
  SUBCLINICAL_HYPER: 'SUBCLINICAL_HYPER'
};

// Diabetes types
export const ENDOCRINE_DIABETES_TYPES = {
  TYPE_1: 'TYPE_1',
  TYPE_2: 'TYPE_2',
  GESTATIONAL: 'GESTATIONAL',
  PREDIABETES: 'PREDIABETES',
  NONE: 'NONE'
};

// Hypoglycemia symptoms
export const ENDOCRINE_HYPOGLYCEMIA_SYMPTOMS = [
  'SHAKINESS',
  'SWEATING',
  'CONFUSION',
  'DIZZINESS',
  'WEAKNESS',
  'HUNGER',
  'IRRITABILITY',
  'HEADACHE',
  'PALPITATIONS',
  'BLURRED_VISION',
  'DIFFICULTY_SPEAKING',
  'SEIZURES',
  'LOSS_OF_CONSCIOUSNESS'
];

// Common endocrine conditions
export const ENDOCRINE_CONDITIONS = [
  'DIABETES_TYPE_1',
  'DIABETES_TYPE_2',
  'PREDIABETES',
  'HYPOTHYROIDISM',
  'HYPERTHYROIDISM',
  'HASHIMOTOS',
  'GRAVES_DISEASE',
  'THYROID_NODULES',
  'THYROID_CANCER',
  'ADDISONS_DISEASE',
  'CUSHINGS_SYNDROME',
  'PHEOCHROMOCYTOMA',
  'HYPERPARATHYROIDISM',
  'HYPOPARATHYROIDISM',
  'HYPOPITUITARISM',
  'ACROMEGALY',
  'PROLACTINOMA',
  'METABOLIC_SYNDROME',
  'POLYCYSTIC_OVARY_SYNDROME'
];

// HbA1c target ranges
export const ENDOCRINE_HBA1C_TARGETS = {
  STRICT: { max: 6.5, label: 'Strict control (<6.5%)' },
  STANDARD: { min: 6.5, max: 7.0, label: 'Standard control (6.5-7.0%)' },
  MODERATE: { min: 7.0, max: 8.0, label: 'Moderate control (7.0-8.0%)' },
  HOSPICE_COMFORT: { min: 8.0, max: 10.0, label: 'Comfort-focused (8.0-10.0%)' }
};

// Blood glucose ranges
export const ENDOCRINE_GLUCOSE_RANGES = {
  fasting: { low: 70, normal_low: 70, normal_high: 100, high: 126, unit: 'mg/dL' },
  random: { low: 70, normal_low: 70, normal_high: 140, high: 200, unit: 'mg/dL' },
  hypoglycemia: { severe: 54, moderate: 70, unit: 'mg/dL' }
};

// Thyroid hormone normal ranges
export const ENDOCRINE_THYROID_RANGES = {
  tsh: { low: 0.4, high: 4.0, unit: 'mIU/L' },
  free_t4: { low: 0.8, high: 1.8, unit: 'ng/dL' },
  free_t3: { low: 2.3, high: 4.2, unit: 'pg/mL' }
};

// Adrenal hormone ranges
export const ENDOCRINE_ADRENAL_RANGES = {
  cortisol_am: { low: 6, high: 23, unit: 'mcg/dL' },
  cortisol_pm: { low: 3, high: 16, unit: 'mcg/dL' }
};

// Calcium normal ranges
export const ENDOCRINE_CALCIUM_RANGES = {
  serum_calcium: { low: 8.5, high: 10.5, unit: 'mg/dL' },
  ionized_calcium: { low: 1.15, high: 1.35, unit: 'mmol/L' }
};
