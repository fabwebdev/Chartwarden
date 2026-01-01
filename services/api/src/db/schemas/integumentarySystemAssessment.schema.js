import { pgTable, bigint, integer, varchar, decimal, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Integumentary System Assessment Schema
 * Comprehensive skin, hair, and nail assessment for hospice patients
 *
 * Clinical Parameters:
 * - Skin color, texture, turgor, and temperature
 * - Wound assessment and staging
 * - Pressure injury evaluation (Braden Scale)
 * - Lesion documentation
 * - Hair and nail assessment
 * - Moisture and edema evaluation
 *
 * Reference Standards:
 * - National Pressure Injury Advisory Panel (NPIAP) staging
 * - Braden Scale for Predicting Pressure Sore Risk
 * - Wound, Ostomy and Continence Nurses Society guidelines
 */
export const integumentary_system_assessments = pgTable('integumentary_system_assessments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // Assessment metadata
  assessment_date: timestamp('assessment_date').defaultNow().notNull(),
  assessment_type: varchar('assessment_type', { length: 50 }), // INITIAL, FOLLOW_UP, REASSESSMENT, ROUTINE
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),

  // =========================================
  // OVERALL SKIN STATUS
  // =========================================
  overall_status: varchar('overall_status', { length: 50 }), // NORMAL, ABNORMAL, UNCHANGED, IMPROVED, DECLINED
  skin_history: text('skin_history'),
  known_conditions: jsonb('known_conditions'), // Array: DIABETES, PVD, PSORIASIS, ECZEMA, SKIN_CANCER, etc.

  // =========================================
  // GENERAL SKIN ASSESSMENT
  // =========================================
  // Skin color
  skin_color: varchar('skin_color', { length: 100 }), // NORMAL, PALE, FLUSHED, CYANOTIC, JAUNDICED, MOTTLED, ASHEN
  skin_color_distribution: varchar('skin_color_distribution', { length: 100 }), // UNIFORM, PATCHY, LOCALIZED
  abnormal_color_location: text('abnormal_color_location'),

  // Skin texture
  skin_texture: varchar('skin_texture', { length: 100 }), // SMOOTH, ROUGH, SCALY, PAPERY, LEATHERY, VELVETY
  texture_abnormalities: text('texture_abnormalities'),

  // Skin temperature
  skin_temperature: varchar('skin_temperature', { length: 50 }), // WARM, COOL, COLD, HOT
  temperature_distribution: varchar('temperature_distribution', { length: 100 }), // UNIFORM, LOCALIZED_COOL, LOCALIZED_WARM
  temperature_abnormal_location: text('temperature_abnormal_location'),

  // Skin turgor (dehydration assessment)
  skin_turgor: varchar('skin_turgor', { length: 50 }), // NORMAL, DECREASED, TENTING
  turgor_recoil_seconds: decimal('turgor_recoil_seconds', { precision: 4, scale: 1 }),
  turgor_test_location: varchar('turgor_test_location', { length: 100 }), // STERNUM, FOREARM, ABDOMEN

  // Moisture
  skin_moisture: varchar('skin_moisture', { length: 50 }), // NORMAL, DRY, MOIST, DIAPHORETIC, CLAMMY
  moisture_distribution: varchar('moisture_distribution', { length: 100 }), // GENERALIZED, LOCALIZED
  moisture_location: text('moisture_location'),
  xerosis_present: boolean('xerosis_present').default(false), // Dry skin
  xerosis_severity: varchar('xerosis_severity', { length: 50 }), // MILD, MODERATE, SEVERE

  // Integrity
  skin_intact: boolean('skin_intact').default(true),
  integrity_notes: text('integrity_notes'),

  skin_general_notes: text('skin_general_notes'),

  // =========================================
  // BRADEN SCALE (Pressure Injury Risk)
  // =========================================
  braden_sensory_perception: integer('braden_sensory_perception'), // 1-4
  braden_moisture: integer('braden_moisture'), // 1-4
  braden_activity: integer('braden_activity'), // 1-4
  braden_mobility: integer('braden_mobility'), // 1-4
  braden_nutrition: integer('braden_nutrition'), // 1-4
  braden_friction_shear: integer('braden_friction_shear'), // 1-3
  braden_total_score: integer('braden_total_score'), // 6-23, lower = higher risk
  braden_risk_level: varchar('braden_risk_level', { length: 50 }), // VERY_HIGH, HIGH, MODERATE, MILD, NO_RISK
  braden_notes: text('braden_notes'),

  // =========================================
  // PRESSURE INJURY ASSESSMENT
  // =========================================
  pressure_injury_present: boolean('pressure_injury_present').default(false),
  pressure_injury_count: integer('pressure_injury_count'),
  pressure_injuries: jsonb('pressure_injuries'), // Array of injury objects with location, stage, measurements, etc.
  /*
   * Each injury object should contain:
   * - location: string
   * - stage: STAGE_1, STAGE_2, STAGE_3, STAGE_4, UNSTAGEABLE, DTPI
   * - length_cm: number
   * - width_cm: number
   * - depth_cm: number
   * - wound_bed: GRANULATION, SLOUGH, ESCHAR, MIXED
   * - exudate_type: SEROUS, SANGUINEOUS, SEROSANGUINEOUS, PURULENT
   * - exudate_amount: NONE, SCANT, SMALL, MODERATE, LARGE
   * - periwound_skin: INTACT, MACERATED, ERYTHEMATOUS, INDURATED
   * - odor: NONE, MILD, MODERATE, STRONG
   * - tunneling: boolean
   * - undermining: boolean
   * - healing_status: HEALING, STABLE, DETERIORATING
   */

  // Common pressure injury locations tracked separately
  pi_sacrum: boolean('pi_sacrum').default(false),
  pi_sacrum_stage: varchar('pi_sacrum_stage', { length: 50 }),
  pi_coccyx: boolean('pi_coccyx').default(false),
  pi_coccyx_stage: varchar('pi_coccyx_stage', { length: 50 }),
  pi_heel_right: boolean('pi_heel_right').default(false),
  pi_heel_right_stage: varchar('pi_heel_right_stage', { length: 50 }),
  pi_heel_left: boolean('pi_heel_left').default(false),
  pi_heel_left_stage: varchar('pi_heel_left_stage', { length: 50 }),
  pi_ischial_right: boolean('pi_ischial_right').default(false),
  pi_ischial_right_stage: varchar('pi_ischial_right_stage', { length: 50 }),
  pi_ischial_left: boolean('pi_ischial_left').default(false),
  pi_ischial_left_stage: varchar('pi_ischial_left_stage', { length: 50 }),
  pi_trochanter_right: boolean('pi_trochanter_right').default(false),
  pi_trochanter_right_stage: varchar('pi_trochanter_right_stage', { length: 50 }),
  pi_trochanter_left: boolean('pi_trochanter_left').default(false),
  pi_trochanter_left_stage: varchar('pi_trochanter_left_stage', { length: 50 }),
  pi_other_locations: text('pi_other_locations'),

  pressure_injury_notes: text('pressure_injury_notes'),

  // =========================================
  // OTHER WOUNDS
  // =========================================
  other_wounds_present: boolean('other_wounds_present').default(false),
  other_wounds: jsonb('other_wounds'), // Array of wound objects
  /*
   * Each wound object should contain:
   * - type: SURGICAL, TRAUMATIC, ARTERIAL, VENOUS, DIABETIC, SKIN_TEAR, LACERATION
   * - location: string
   * - length_cm: number
   * - width_cm: number
   * - depth_cm: number
   * - wound_bed_percent_granulation: number
   * - wound_bed_percent_slough: number
   * - wound_bed_percent_eschar: number
   * - wound_edges: ATTACHED, UNATTACHED, ROLLED, EPIBOLE
   * - exudate_type, exudate_amount, periwound_skin, odor (same as above)
   * - dressing_type: string
   * - treatment_frequency: string
   */

  // Skin tears (common in elderly/hospice)
  skin_tears_present: boolean('skin_tears_present').default(false),
  skin_tear_count: integer('skin_tear_count'),
  skin_tear_locations: jsonb('skin_tear_locations'),
  skin_tear_type: varchar('skin_tear_type', { length: 100 }), // TYPE_1, TYPE_2, TYPE_3 (ISTAP classification)

  surgical_wounds_present: boolean('surgical_wounds_present').default(false),
  surgical_wound_healing: varchar('surgical_wound_healing', { length: 50 }), // PRIMARY, SECONDARY, DEHISCED

  other_wounds_notes: text('other_wounds_notes'),

  // =========================================
  // LESIONS AND SKIN CHANGES
  // =========================================
  lesions_present: boolean('lesions_present').default(false),
  lesion_count: integer('lesion_count'),
  lesions: jsonb('lesions'), // Array of lesion objects
  /*
   * Each lesion object should contain:
   * - type: MACULE, PAPULE, NODULE, PLAQUE, VESICLE, BULLA, PUSTULE, ULCER, PETECHIAE, ECCHYMOSIS
   * - color: string
   * - size_mm: number
   * - shape: ROUND, OVAL, IRREGULAR, LINEAR
   * - border: DISTINCT, INDISTINCT, RAISED, FLAT
   * - location: string
   * - distribution: LOCALIZED, SCATTERED, CONFLUENT, GENERALIZED
   * - duration: string
   * - pruritic: boolean
   * - painful: boolean
   * - bleeding: boolean
   */

  rash_present: boolean('rash_present').default(false),
  rash_type: varchar('rash_type', { length: 100 }), // MACULAR, PAPULAR, MACULOPAPULAR, VESICULAR, URTICARIAL
  rash_distribution: varchar('rash_distribution', { length: 255 }),
  rash_characteristics: text('rash_characteristics'),

  bruising_present: boolean('bruising_present').default(false),
  bruising_locations: jsonb('bruising_locations'),
  bruising_unexplained: boolean('bruising_unexplained').default(false),

  petechiae_present: boolean('petechiae_present').default(false),
  petechiae_locations: text('petechiae_locations'),

  skin_cancerous_lesions: boolean('skin_cancerous_lesions').default(false),
  cancerous_lesion_details: text('cancerous_lesion_details'),

  lesions_notes: text('lesions_notes'),

  // =========================================
  // EDEMA ASSESSMENT (Skin Component)
  // =========================================
  edema_present: boolean('edema_present').default(false),
  edema_type: varchar('edema_type', { length: 50 }), // PITTING, NON_PITTING
  edema_severity: varchar('edema_severity', { length: 20 }), // TRACE, 1+, 2+, 3+, 4+
  edema_locations: jsonb('edema_locations'), // Array: FEET, ANKLES, LOWER_LEGS, HANDS, FACE, SACRAL, GENERALIZED
  edema_bilateral: boolean('edema_bilateral').default(true),
  weeping_edema: boolean('weeping_edema').default(false),
  edema_notes: text('edema_notes'),

  // =========================================
  // HAIR ASSESSMENT
  // =========================================
  hair_distribution: varchar('hair_distribution', { length: 100 }), // NORMAL, THINNING, ALOPECIA, HIRSUTISM
  hair_texture: varchar('hair_texture', { length: 100 }), // NORMAL, DRY, BRITTLE, OILY, COARSE, FINE
  hair_loss_pattern: varchar('hair_loss_pattern', { length: 100 }), // DIFFUSE, PATCHY, FRONTAL, VERTEX
  hair_loss_present: boolean('hair_loss_present').default(false),
  hair_loss_cause: varchar('hair_loss_cause', { length: 255 }), // CHEMOTHERAPY, RADIATION, NUTRITIONAL, HORMONAL, AGING
  scalp_condition: varchar('scalp_condition', { length: 255 }), // NORMAL, DRY, FLAKY, OILY, LESIONS
  hair_notes: text('hair_notes'),

  // Lower extremity hair (circulation indicator)
  leg_hair_present: boolean('leg_hair_present').default(true),
  leg_hair_distribution: varchar('leg_hair_distribution', { length: 100 }), // NORMAL, DECREASED, ABSENT

  // =========================================
  // NAIL ASSESSMENT
  // =========================================
  // Fingernails
  fingernails_condition: varchar('fingernails_condition', { length: 100 }), // NORMAL, BRITTLE, THICKENED, DISCOLORED, RIDGED
  fingernails_color: varchar('fingernails_color', { length: 100 }), // PINK, PALE, CYANOTIC, YELLOW, WHITE_SPOTS
  fingernails_shape: varchar('fingernails_shape', { length: 100 }), // NORMAL, CLUBBING, KOILONYCHIA, BEAUS_LINES
  fingernails_capillary_refill: decimal('fingernails_capillary_refill', { precision: 3, scale: 1 }), // seconds
  onychomycosis_fingers: boolean('onychomycosis_fingers').default(false),
  paronychia_fingers: boolean('paronychia_fingers').default(false),

  // Toenails
  toenails_condition: varchar('toenails_condition', { length: 100 }), // NORMAL, BRITTLE, THICKENED, DISCOLORED, INGROWN
  toenails_color: varchar('toenails_color', { length: 100 }),
  onychomycosis_toes: boolean('onychomycosis_toes').default(false),
  ingrown_toenails: boolean('ingrown_toenails').default(false),
  ingrown_toenail_location: varchar('ingrown_toenail_location', { length: 255 }),

  nails_notes: text('nails_notes'),

  // =========================================
  // DIABETIC FOOT ASSESSMENT (if applicable)
  // =========================================
  diabetic_foot_exam_done: boolean('diabetic_foot_exam_done').default(false),
  monofilament_test_right: varchar('monofilament_test_right', { length: 50 }), // NORMAL, ABNORMAL
  monofilament_test_left: varchar('monofilament_test_left', { length: 50 }),
  monofilament_sites_tested: integer('monofilament_sites_tested'), // Usually 10 sites
  monofilament_sites_felt: integer('monofilament_sites_felt'),
  tuning_fork_test_right: varchar('tuning_fork_test_right', { length: 50 }), // NORMAL, DIMINISHED, ABSENT
  tuning_fork_test_left: varchar('tuning_fork_test_left', { length: 50 }),
  ankle_reflexes_right: varchar('ankle_reflexes_right', { length: 50 }), // NORMAL, DIMINISHED, ABSENT
  ankle_reflexes_left: varchar('ankle_reflexes_left', { length: 50 }),
  calluses_present: boolean('calluses_present').default(false),
  callus_locations: text('callus_locations'),
  foot_deformities: jsonb('foot_deformities'), // BUNION, HAMMERTOE, CHARCOT, CLAW_TOES
  diabetic_foot_risk: varchar('diabetic_foot_risk', { length: 50 }), // LOW, MODERATE, HIGH
  diabetic_foot_notes: text('diabetic_foot_notes'),

  // =========================================
  // INFECTION SIGNS
  // =========================================
  infection_signs_present: boolean('infection_signs_present').default(false),
  infection_signs: jsonb('infection_signs'), // Array: ERYTHEMA, WARMTH, SWELLING, PURULENT_DRAINAGE, FEVER, PAIN
  infection_location: text('infection_location'),
  cellulitis_present: boolean('cellulitis_present').default(false),
  cellulitis_location: text('cellulitis_location'),
  abscess_present: boolean('abscess_present').default(false),
  abscess_location: text('abscess_location'),
  infection_notes: text('infection_notes'),

  // =========================================
  // CLINICAL NOTES AND SUMMARY
  // =========================================
  clinical_notes: text('clinical_notes'),
  assessment_summary: text('assessment_summary'),
  follow_up_plan: text('follow_up_plan'),
  wound_care_orders: text('wound_care_orders'),
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
  patientIdx: index('idx_integumentary_system_assessments_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_integumentary_system_assessments_date').on(table.assessment_date),
  patientDateIdx: index('idx_integumentary_system_assessments_patient_date').on(table.patient_id, table.assessment_date),
  overallStatusIdx: index('idx_integumentary_system_assessments_status').on(table.overall_status),
  pressureInjuryIdx: index('idx_integumentary_system_assessments_pi').on(table.pressure_injury_present),
  bradenScoreIdx: index('idx_integumentary_system_assessments_braden').on(table.braden_total_score),
}));

// Pressure injury stages (NPIAP)
export const INTEGUMENTARY_PRESSURE_INJURY_STAGES = {
  STAGE_1: 'Stage 1 - Non-blanchable erythema of intact skin',
  STAGE_2: 'Stage 2 - Partial-thickness skin loss with exposed dermis',
  STAGE_3: 'Stage 3 - Full-thickness skin loss',
  STAGE_4: 'Stage 4 - Full-thickness skin and tissue loss',
  UNSTAGEABLE: 'Unstageable - Obscured full-thickness skin and tissue loss',
  DTPI: 'Deep Tissue Pressure Injury - Persistent non-blanchable deep red, maroon, or purple discoloration'
};

// Braden Scale scoring
export const INTEGUMENTARY_BRADEN_SCALE = {
  sensory_perception: {
    1: 'Completely Limited',
    2: 'Very Limited',
    3: 'Slightly Limited',
    4: 'No Impairment'
  },
  moisture: {
    1: 'Constantly Moist',
    2: 'Often Moist',
    3: 'Occasionally Moist',
    4: 'Rarely Moist'
  },
  activity: {
    1: 'Bedfast',
    2: 'Chairfast',
    3: 'Walks Occasionally',
    4: 'Walks Frequently'
  },
  mobility: {
    1: 'Completely Immobile',
    2: 'Very Limited',
    3: 'Slightly Limited',
    4: 'No Limitations'
  },
  nutrition: {
    1: 'Very Poor',
    2: 'Probably Inadequate',
    3: 'Adequate',
    4: 'Excellent'
  },
  friction_shear: {
    1: 'Problem',
    2: 'Potential Problem',
    3: 'No Apparent Problem'
  }
};

// Braden risk levels
export const INTEGUMENTARY_BRADEN_RISK_LEVELS = {
  VERY_HIGH: { min: 6, max: 9, label: 'Very High Risk' },
  HIGH: { min: 10, max: 12, label: 'High Risk' },
  MODERATE: { min: 13, max: 14, label: 'Moderate Risk' },
  MILD: { min: 15, max: 18, label: 'Mild Risk' },
  NO_RISK: { min: 19, max: 23, label: 'No Risk' }
};

// Skin colors
export const INTEGUMENTARY_SKIN_COLORS = {
  NORMAL: 'NORMAL',
  PALE: 'PALE',
  FLUSHED: 'FLUSHED',
  CYANOTIC: 'CYANOTIC',
  JAUNDICED: 'JAUNDICED',
  MOTTLED: 'MOTTLED',
  ASHEN: 'ASHEN',
  ERYTHEMATOUS: 'ERYTHEMATOUS'
};

// Wound bed types
export const INTEGUMENTARY_WOUND_BED = {
  GRANULATION: 'Granulation (red, beefy)',
  SLOUGH: 'Slough (yellow/tan, moist)',
  ESCHAR: 'Eschar (black/brown, dry)',
  EPITHELIALIZING: 'Epithelializing (pink)',
  MIXED: 'Mixed tissue types'
};

// Exudate types
export const INTEGUMENTARY_EXUDATE_TYPES = {
  SEROUS: 'Serous (clear, thin)',
  SANGUINEOUS: 'Sanguineous (bloody)',
  SEROSANGUINEOUS: 'Serosanguineous (pink)',
  PURULENT: 'Purulent (thick, yellow/green)'
};

// Exudate amounts
export const INTEGUMENTARY_EXUDATE_AMOUNTS = {
  NONE: 'None',
  SCANT: 'Scant (wound bed moist)',
  SMALL: 'Small (wound bed wet)',
  MODERATE: 'Moderate (dressing saturated)',
  LARGE: 'Large (dressing overwhelmed)'
};

// Edema scale
export const INTEGUMENTARY_EDEMA_SCALE = {
  TRACE: 'Trace - Barely detectable',
  '1+': '1+ Mild - 2mm pit, rebounds immediately',
  '2+': '2+ Moderate - 4mm pit, rebounds in 15 seconds',
  '3+': '3+ Moderately Severe - 6mm pit, rebounds in 60 seconds',
  '4+': '4+ Severe - 8mm pit, rebounds in 2-5 minutes'
};

// Lesion types
export const INTEGUMENTARY_LESION_TYPES = [
  'MACULE',
  'PAPULE',
  'NODULE',
  'PLAQUE',
  'VESICLE',
  'BULLA',
  'PUSTULE',
  'ULCER',
  'PETECHIAE',
  'ECCHYMOSIS',
  'WHEAL',
  'CYST',
  'SCALE',
  'CRUST',
  'EROSION',
  'FISSURE'
];

// Skin conditions
export const INTEGUMENTARY_CONDITIONS = [
  'PRESSURE_INJURY',
  'VENOUS_ULCER',
  'ARTERIAL_ULCER',
  'DIABETIC_ULCER',
  'SKIN_TEAR',
  'CELLULITIS',
  'DERMATITIS',
  'PSORIASIS',
  'ECZEMA',
  'SHINGLES',
  'SKIN_CANCER',
  'FUNGAL_INFECTION',
  'SCABIES',
  'LYMPHEDEMA'
];

// Pressure injury locations
export const INTEGUMENTARY_PI_LOCATIONS = [
  'SACRUM',
  'COCCYX',
  'HEEL_RIGHT',
  'HEEL_LEFT',
  'ISCHIAL_RIGHT',
  'ISCHIAL_LEFT',
  'TROCHANTER_RIGHT',
  'TROCHANTER_LEFT',
  'ELBOW_RIGHT',
  'ELBOW_LEFT',
  'OCCIPUT',
  'SCAPULA_RIGHT',
  'SCAPULA_LEFT',
  'SPINOUS_PROCESS',
  'MALLEOLUS_RIGHT',
  'MALLEOLUS_LEFT',
  'EAR_RIGHT',
  'EAR_LEFT'
];
