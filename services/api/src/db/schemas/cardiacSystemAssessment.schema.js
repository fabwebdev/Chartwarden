import { pgTable, bigint, integer, varchar, decimal, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Cardiac System Assessment Schema
 * Comprehensive cardiac/cardiovascular assessment for hospice patients
 *
 * Clinical Parameters:
 * - Heart rate, rhythm, and sounds
 * - Blood pressure measurements
 * - Peripheral pulses assessment
 * - Edema evaluation
 * - Murmurs and abnormal sounds
 * - Cardiac symptoms and history
 *
 * Reference Standards:
 * - American Heart Association (AHA) guidelines
 * - Joint National Committee (JNC) blood pressure classifications
 * - New York Heart Association (NYHA) functional classification
 */
export const cardiac_system_assessments = pgTable('cardiac_system_assessments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // Assessment metadata
  assessment_date: timestamp('assessment_date').defaultNow().notNull(),
  assessment_type: varchar('assessment_type', { length: 50 }), // INITIAL, FOLLOW_UP, REASSESSMENT, ROUTINE
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),

  // =========================================
  // OVERALL CARDIAC STATUS
  // =========================================
  overall_status: varchar('overall_status', { length: 50 }), // NORMAL, ABNORMAL, UNCHANGED, IMPROVED, DECLINED
  cardiac_history: text('cardiac_history'),
  known_conditions: jsonb('known_conditions'), // Array: CHF, CAD, ARRHYTHMIA, VALVE_DISEASE, CARDIOMYOPATHY, etc.

  // =========================================
  // HEART RATE AND RHYTHM
  // =========================================
  heart_rate: integer('heart_rate'), // BPM
  heart_rate_location: varchar('heart_rate_location', { length: 50 }), // APICAL, RADIAL, CAROTID
  heart_rhythm: varchar('heart_rhythm', { length: 50 }), // REGULAR, IRREGULAR, REGULARLY_IRREGULAR, IRREGULARLY_IRREGULAR
  rhythm_description: varchar('rhythm_description', { length: 255 }),
  pulse_quality: varchar('pulse_quality', { length: 50 }), // STRONG, WEAK, THREADY, BOUNDING, ABSENT
  pulse_deficit: boolean('pulse_deficit').default(false),
  pulse_deficit_value: integer('pulse_deficit_value'),
  heart_rate_notes: text('heart_rate_notes'),

  // =========================================
  // HEART SOUNDS
  // =========================================
  s1_sound: varchar('s1_sound', { length: 50 }), // NORMAL, LOUD, DIMINISHED, SPLIT
  s2_sound: varchar('s2_sound', { length: 50 }), // NORMAL, LOUD, DIMINISHED, SPLIT, FIXED_SPLIT, PARADOXICAL_SPLIT
  s3_sound: boolean('s3_sound').default(false), // Ventricular gallop (abnormal in adults)
  s4_sound: boolean('s4_sound').default(false), // Atrial gallop
  extra_sounds: varchar('extra_sounds', { length: 255 }), // CLICK, SNAP, RUB, NONE
  heart_sounds_notes: text('heart_sounds_notes'),

  // =========================================
  // MURMURS
  // =========================================
  murmur_present: boolean('murmur_present').default(false),
  murmur_type: varchar('murmur_type', { length: 50 }), // SYSTOLIC, DIASTOLIC, CONTINUOUS
  murmur_grade: varchar('murmur_grade', { length: 20 }), // I, II, III, IV, V, VI (Levine scale)
  murmur_location: varchar('murmur_location', { length: 100 }), // AORTIC, PULMONIC, TRICUSPID, MITRAL, ERBS_POINT
  murmur_radiation: varchar('murmur_radiation', { length: 255 }), // NECK, AXILLA, BACK, NONE
  murmur_quality: varchar('murmur_quality', { length: 100 }), // HARSH, BLOWING, RUMBLING, MUSICAL
  murmur_timing: varchar('murmur_timing', { length: 100 }), // EARLY, MID, LATE, HOLOSYSTOLIC, PANDIASTOLIC
  murmur_notes: text('murmur_notes'),

  // =========================================
  // BLOOD PRESSURE
  // =========================================
  bp_systolic: integer('bp_systolic'), // mmHg
  bp_diastolic: integer('bp_diastolic'), // mmHg
  bp_position: varchar('bp_position', { length: 50 }), // SITTING, STANDING, SUPINE, LEFT_LATERAL
  bp_location: varchar('bp_location', { length: 50 }), // LEFT_ARM, RIGHT_ARM, LEFT_LEG, RIGHT_LEG
  bp_classification: varchar('bp_classification', { length: 50 }), // NORMAL, ELEVATED, HTN_STAGE_1, HTN_STAGE_2, HTN_CRISIS
  orthostatic_bp_checked: boolean('orthostatic_bp_checked').default(false),
  orthostatic_systolic_supine: integer('orthostatic_systolic_supine'),
  orthostatic_systolic_standing: integer('orthostatic_systolic_standing'),
  orthostatic_diastolic_supine: integer('orthostatic_diastolic_supine'),
  orthostatic_diastolic_standing: integer('orthostatic_diastolic_standing'),
  orthostatic_positive: boolean('orthostatic_positive').default(false),
  mean_arterial_pressure: integer('mean_arterial_pressure'), // MAP
  bp_notes: text('bp_notes'),

  // =========================================
  // PERIPHERAL PULSES
  // =========================================
  // Scale: 0=Absent, 1+=Diminished, 2+=Normal, 3+=Bounding, 4+=Aneurysmal
  pulse_carotid_right: varchar('pulse_carotid_right', { length: 10 }),
  pulse_carotid_left: varchar('pulse_carotid_left', { length: 10 }),
  pulse_brachial_right: varchar('pulse_brachial_right', { length: 10 }),
  pulse_brachial_left: varchar('pulse_brachial_left', { length: 10 }),
  pulse_radial_right: varchar('pulse_radial_right', { length: 10 }),
  pulse_radial_left: varchar('pulse_radial_left', { length: 10 }),
  pulse_femoral_right: varchar('pulse_femoral_right', { length: 10 }),
  pulse_femoral_left: varchar('pulse_femoral_left', { length: 10 }),
  pulse_popliteal_right: varchar('pulse_popliteal_right', { length: 10 }),
  pulse_popliteal_left: varchar('pulse_popliteal_left', { length: 10 }),
  pulse_dorsalis_pedis_right: varchar('pulse_dorsalis_pedis_right', { length: 10 }),
  pulse_dorsalis_pedis_left: varchar('pulse_dorsalis_pedis_left', { length: 10 }),
  pulse_posterior_tibial_right: varchar('pulse_posterior_tibial_right', { length: 10 }),
  pulse_posterior_tibial_left: varchar('pulse_posterior_tibial_left', { length: 10 }),
  peripheral_pulses_notes: text('peripheral_pulses_notes'),

  // =========================================
  // EDEMA ASSESSMENT
  // =========================================
  edema_present: boolean('edema_present').default(false),
  edema_type: varchar('edema_type', { length: 50 }), // PITTING, NON_PITTING
  edema_severity: varchar('edema_severity', { length: 20 }), // TRACE, 1+, 2+, 3+, 4+
  edema_location: jsonb('edema_location'), // Array: FEET, ANKLES, LOWER_LEGS, THIGHS, SACRAL, PERIORBITAL, HANDS, GENERALIZED
  edema_bilateral: boolean('edema_bilateral').default(true),
  edema_duration: varchar('edema_duration', { length: 100 }),
  edema_notes: text('edema_notes'),

  // =========================================
  // PERFUSION AND CIRCULATION
  // =========================================
  capillary_refill_seconds: decimal('capillary_refill_seconds', { precision: 3, scale: 1 }),
  capillary_refill_location: varchar('capillary_refill_location', { length: 50 }), // FINGERNAIL, TOENAIL
  skin_color_extremities: varchar('skin_color_extremities', { length: 100 }), // PINK, PALE, CYANOTIC, MOTTLED, DUSKY
  skin_temperature_extremities: varchar('skin_temperature_extremities', { length: 50 }), // WARM, COOL, COLD
  hair_distribution_lower_ext: varchar('hair_distribution_lower_ext', { length: 50 }), // NORMAL, DECREASED, ABSENT
  nail_condition: varchar('nail_condition', { length: 255 }), // NORMAL, CLUBBING, THICKENED, BRITTLE
  perfusion_notes: text('perfusion_notes'),

  // =========================================
  // JUGULAR VENOUS ASSESSMENT
  // =========================================
  jvd_present: boolean('jvd_present').default(false),
  jvd_cm_above_sternal_angle: decimal('jvd_cm_above_sternal_angle', { precision: 4, scale: 1 }),
  hepatojugular_reflux: boolean('hepatojugular_reflux').default(false),
  jvd_notes: text('jvd_notes'),

  // =========================================
  // CARDIAC SYMPTOMS
  // =========================================
  chest_pain_present: boolean('chest_pain_present').default(false),
  chest_pain_type: varchar('chest_pain_type', { length: 100 }), // TYPICAL_ANGINA, ATYPICAL_ANGINA, NON_CARDIAC
  chest_pain_severity: integer('chest_pain_severity'), // 0-10 scale
  chest_pain_location: varchar('chest_pain_location', { length: 255 }),
  chest_pain_radiation: varchar('chest_pain_radiation', { length: 255 }),
  chest_pain_quality: varchar('chest_pain_quality', { length: 100 }), // PRESSURE, SQUEEZING, BURNING, SHARP, STABBING
  chest_pain_duration: varchar('chest_pain_duration', { length: 100 }),
  chest_pain_aggravating: text('chest_pain_aggravating'),
  chest_pain_relieving: text('chest_pain_relieving'),

  dyspnea_present: boolean('dyspnea_present').default(false),
  dyspnea_type: varchar('dyspnea_type', { length: 100 }), // EXERTIONAL, AT_REST, PAROXYSMAL_NOCTURNAL, ORTHOPNEA
  dyspnea_severity: varchar('dyspnea_severity', { length: 50 }), // MILD, MODERATE, SEVERE
  pillows_for_sleep: integer('pillows_for_sleep'), // For orthopnea assessment

  palpitations_present: boolean('palpitations_present').default(false),
  palpitations_description: text('palpitations_description'),
  syncope_history: boolean('syncope_history').default(false),
  presyncope_history: boolean('presyncope_history').default(false),
  fatigue_present: boolean('fatigue_present').default(false),
  fatigue_severity: varchar('fatigue_severity', { length: 50 }), // MILD, MODERATE, SEVERE

  cardiac_symptoms_notes: text('cardiac_symptoms_notes'),

  // =========================================
  // FUNCTIONAL STATUS
  // =========================================
  nyha_class: varchar('nyha_class', { length: 20 }), // I, II, III, IV (New York Heart Association)
  activity_tolerance: varchar('activity_tolerance', { length: 100 }), // UNLIMITED, MODERATE_LIMITATION, MARKED_LIMITATION, BED_BOUND
  exercise_capacity_mets: decimal('exercise_capacity_mets', { precision: 4, scale: 1 }),
  functional_status_notes: text('functional_status_notes'),

  // =========================================
  // CARDIAC DEVICES
  // =========================================
  pacemaker_present: boolean('pacemaker_present').default(false),
  pacemaker_type: varchar('pacemaker_type', { length: 100 }), // SINGLE_CHAMBER, DUAL_CHAMBER, BIVENTRICULAR
  pacemaker_last_check: timestamp('pacemaker_last_check'),
  aicd_present: boolean('aicd_present').default(false), // Automatic Implantable Cardioverter Defibrillator
  aicd_last_check: timestamp('aicd_last_check'),
  device_functioning: boolean('device_functioning').default(true),
  device_notes: text('device_notes'),

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
  patientIdx: index('idx_cardiac_system_assessments_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_cardiac_system_assessments_date').on(table.assessment_date),
  patientDateIdx: index('idx_cardiac_system_assessments_patient_date').on(table.patient_id, table.assessment_date),
  overallStatusIdx: index('idx_cardiac_system_assessments_status').on(table.overall_status),
  nyhaClassIdx: index('idx_cardiac_system_assessments_nyha').on(table.nyha_class),
}));

// Heart rhythm types
export const CARDIAC_HEART_RHYTHMS = {
  REGULAR: 'REGULAR',
  IRREGULAR: 'IRREGULAR',
  REGULARLY_IRREGULAR: 'REGULARLY_IRREGULAR',
  IRREGULARLY_IRREGULAR: 'IRREGULARLY_IRREGULAR'
};

// Pulse quality grades
export const CARDIAC_PULSE_QUALITY = {
  STRONG: 'STRONG',
  WEAK: 'WEAK',
  THREADY: 'THREADY',
  BOUNDING: 'BOUNDING',
  ABSENT: 'ABSENT'
};

// Peripheral pulse scale (0-4+)
export const CARDIAC_PULSE_SCALE = {
  '0': 'Absent',
  '1+': 'Diminished/Weak',
  '2+': 'Normal',
  '3+': 'Bounding',
  '4+': 'Aneurysmal'
};

// Blood pressure classifications (JNC 8)
export const CARDIAC_BP_CLASSIFICATIONS = {
  NORMAL: { systolic: { max: 120 }, diastolic: { max: 80 }, label: 'Normal' },
  ELEVATED: { systolic: { min: 120, max: 129 }, diastolic: { max: 80 }, label: 'Elevated' },
  HTN_STAGE_1: { systolic: { min: 130, max: 139 }, diastolic: { min: 80, max: 89 }, label: 'Hypertension Stage 1' },
  HTN_STAGE_2: { systolic: { min: 140 }, diastolic: { min: 90 }, label: 'Hypertension Stage 2' },
  HTN_CRISIS: { systolic: { min: 180 }, diastolic: { min: 120 }, label: 'Hypertensive Crisis' }
};

// Murmur grading (Levine scale)
export const CARDIAC_MURMUR_GRADES = {
  I: 'Grade I - Very faint, may not be heard in all positions',
  II: 'Grade II - Quiet, but heard immediately upon auscultation',
  III: 'Grade III - Moderately loud',
  IV: 'Grade IV - Loud, with palpable thrill',
  V: 'Grade V - Very loud, thrill easily palpable',
  VI: 'Grade VI - Heard without stethoscope'
};

// Edema grading scale
export const CARDIAC_EDEMA_SCALE = {
  TRACE: 'Trace - Barely perceptible depression',
  '1+': '1+ Mild - 2mm depression, disappears rapidly',
  '2+': '2+ Moderate - 4mm depression, disappears in 10-15 seconds',
  '3+': '3+ Moderately Severe - 6mm depression, disappears in 1-2 minutes',
  '4+': '4+ Severe - 8mm depression, disappears in 2-5 minutes'
};

// NYHA Functional Classification
export const CARDIAC_NYHA_CLASSES = {
  I: 'Class I - No limitation of physical activity',
  II: 'Class II - Slight limitation, comfortable at rest',
  III: 'Class III - Marked limitation, comfortable only at rest',
  IV: 'Class IV - Unable to carry on any physical activity without discomfort'
};

// Common cardiac conditions
export const CARDIAC_CONDITIONS = [
  'CHF',
  'CAD',
  'ARRHYTHMIA',
  'ATRIAL_FIBRILLATION',
  'VALVE_DISEASE',
  'CARDIOMYOPATHY',
  'HYPERTENSION',
  'MYOCARDIAL_INFARCTION',
  'HEART_BLOCK',
  'ENDOCARDITIS',
  'PERICARDITIS',
  'PERIPHERAL_ARTERY_DISEASE'
];

// Edema locations
export const CARDIAC_EDEMA_LOCATIONS = [
  'FEET',
  'ANKLES',
  'LOWER_LEGS',
  'THIGHS',
  'SACRAL',
  'PERIORBITAL',
  'HANDS',
  'ARMS',
  'ABDOMINAL',
  'GENERALIZED'
];

// Normal value ranges
export const CARDIAC_NORMAL_RANGES = {
  heart_rate: { low: 60, high: 100, unit: 'BPM' },
  bp_systolic: { low: 90, high: 120, unit: 'mmHg' },
  bp_diastolic: { low: 60, high: 80, unit: 'mmHg' },
  capillary_refill: { max: 2, unit: 'seconds' },
  jvd_cm: { max: 4, unit: 'cm above sternal angle' }
};
