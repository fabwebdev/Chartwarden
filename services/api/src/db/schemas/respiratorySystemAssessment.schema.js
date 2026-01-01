import { pgTable, bigint, integer, varchar, decimal, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Respiratory System Assessment Schema
 * Comprehensive pulmonary assessment for hospice patients
 *
 * Clinical Parameters:
 * - Respiratory rate, rhythm, and pattern
 * - Breath sounds assessment
 * - Oxygen saturation and supplemental oxygen
 * - Lung capacity and effort
 * - Cough and sputum characteristics
 * - Airway management
 *
 * Reference Standards:
 * - American Thoracic Society guidelines
 * - Global Initiative for Chronic Obstructive Lung Disease (GOLD)
 * - National Comprehensive Cancer Network (NCCN) dyspnea guidelines
 */
export const respiratory_system_assessments = pgTable('respiratory_system_assessments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // Assessment metadata
  assessment_date: timestamp('assessment_date').defaultNow().notNull(),
  assessment_type: varchar('assessment_type', { length: 50 }), // INITIAL, FOLLOW_UP, REASSESSMENT, ROUTINE
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),

  // =========================================
  // OVERALL RESPIRATORY STATUS
  // =========================================
  overall_status: varchar('overall_status', { length: 50 }), // NORMAL, ABNORMAL, UNCHANGED, IMPROVED, DECLINED
  respiratory_history: text('respiratory_history'),
  known_conditions: jsonb('known_conditions'), // Array: COPD, ASTHMA, LUNG_CANCER, PNEUMONIA, PULMONARY_FIBROSIS, etc.

  // =========================================
  // RESPIRATORY RATE AND PATTERN
  // =========================================
  respiratory_rate: integer('respiratory_rate'), // breaths per minute
  respiratory_rate_unit: varchar('respiratory_rate_unit', { length: 20 }).default('breaths/min'),
  respiratory_rhythm: varchar('respiratory_rhythm', { length: 50 }), // REGULAR, IRREGULAR
  respiratory_pattern: varchar('respiratory_pattern', { length: 100 }), // EUPNEA, TACHYPNEA, BRADYPNEA, APNEA, CHEYNE_STOKES, KUSSMAUL, BIOTS, AGONAL
  respiratory_depth: varchar('respiratory_depth', { length: 50 }), // NORMAL, SHALLOW, DEEP
  respiratory_rate_notes: text('respiratory_rate_notes'),

  // =========================================
  // RESPIRATORY EFFORT
  // =========================================
  respiratory_effort: varchar('respiratory_effort', { length: 50 }), // UNLABORED, MILDLY_LABORED, MODERATELY_LABORED, SEVERELY_LABORED
  use_of_accessory_muscles: boolean('use_of_accessory_muscles').default(false),
  accessory_muscles_used: jsonb('accessory_muscles_used'), // Array: SCM, INTERCOSTAL, ABDOMINAL, TRAPEZIUS
  nasal_flaring: boolean('nasal_flaring').default(false),
  tracheal_tugging: boolean('tracheal_tugging').default(false),
  intercostal_retractions: boolean('intercostal_retractions').default(false),
  suprasternal_retractions: boolean('suprasternal_retractions').default(false),
  subcostal_retractions: boolean('subcostal_retractions').default(false),
  paradoxical_breathing: boolean('paradoxical_breathing').default(false),
  tripod_positioning: boolean('tripod_positioning').default(false),
  pursed_lip_breathing: boolean('pursed_lip_breathing').default(false),
  effort_notes: text('effort_notes'),

  // =========================================
  // OXYGEN SATURATION
  // =========================================
  spo2_percentage: decimal('spo2_percentage', { precision: 5, scale: 2 }), // %
  spo2_measurement_site: varchar('spo2_measurement_site', { length: 50 }), // FINGER, TOE, EAR, FOREHEAD
  room_air: boolean('room_air').default(true),

  // Supplemental oxygen
  supplemental_oxygen: boolean('supplemental_oxygen').default(false),
  oxygen_flow_rate: decimal('oxygen_flow_rate', { precision: 5, scale: 2 }), // L/min
  oxygen_flow_unit: varchar('oxygen_flow_unit', { length: 20 }).default('L/min'),
  fio2_percentage: decimal('fio2_percentage', { precision: 5, scale: 2 }), // % (for precise delivery)
  oxygen_delivery_device: varchar('oxygen_delivery_device', { length: 100 }), // NASAL_CANNULA, SIMPLE_MASK, VENTURI_MASK, NON_REBREATHER, HIGH_FLOW, BIPAP, CPAP, VENTILATOR
  oxygen_saturation_target_low: decimal('oxygen_saturation_target_low', { precision: 4, scale: 1 }),
  oxygen_saturation_target_high: decimal('oxygen_saturation_target_high', { precision: 4, scale: 1 }),
  oxygen_continuous_prn: varchar('oxygen_continuous_prn', { length: 50 }), // CONTINUOUS, PRN, WITH_ACTIVITY, NOCTURNAL
  oxygen_notes: text('oxygen_notes'),

  // =========================================
  // BREATH SOUNDS - Anterior
  // =========================================
  // Right Lung - Anterior
  breath_sounds_right_upper_anterior: varchar('breath_sounds_right_upper_anterior', { length: 100 }), // CLEAR, DIMINISHED, ABSENT, WHEEZES, RHONCHI, CRACKLES, STRIDOR
  breath_sounds_right_middle_anterior: varchar('breath_sounds_right_middle_anterior', { length: 100 }),
  breath_sounds_right_lower_anterior: varchar('breath_sounds_right_lower_anterior', { length: 100 }),

  // Left Lung - Anterior
  breath_sounds_left_upper_anterior: varchar('breath_sounds_left_upper_anterior', { length: 100 }),
  breath_sounds_left_lower_anterior: varchar('breath_sounds_left_lower_anterior', { length: 100 }),

  // =========================================
  // BREATH SOUNDS - Posterior
  // =========================================
  // Right Lung - Posterior
  breath_sounds_right_upper_posterior: varchar('breath_sounds_right_upper_posterior', { length: 100 }),
  breath_sounds_right_middle_posterior: varchar('breath_sounds_right_middle_posterior', { length: 100 }),
  breath_sounds_right_lower_posterior: varchar('breath_sounds_right_lower_posterior', { length: 100 }),

  // Left Lung - Posterior
  breath_sounds_left_upper_posterior: varchar('breath_sounds_left_upper_posterior', { length: 100 }),
  breath_sounds_left_lower_posterior: varchar('breath_sounds_left_lower_posterior', { length: 100 }),

  // =========================================
  // BREATH SOUNDS - Lateral
  // =========================================
  breath_sounds_right_lateral: varchar('breath_sounds_right_lateral', { length: 100 }),
  breath_sounds_left_lateral: varchar('breath_sounds_left_lateral', { length: 100 }),

  // General breath sounds summary
  breath_sounds_overall: varchar('breath_sounds_overall', { length: 100 }), // CLEAR_BILATERAL, DIMINISHED_BILATERAL, ABNORMAL
  adventitious_sounds: jsonb('adventitious_sounds'), // Array: WHEEZES, RHONCHI, FINE_CRACKLES, COARSE_CRACKLES, STRIDOR, PLEURAL_RUB
  adventitious_sounds_timing: varchar('adventitious_sounds_timing', { length: 50 }), // INSPIRATORY, EXPIRATORY, BOTH
  breath_sounds_notes: text('breath_sounds_notes'),

  // =========================================
  // CHEST ASSESSMENT
  // =========================================
  chest_shape: varchar('chest_shape', { length: 100 }), // NORMAL, BARREL, KYPHOTIC, SCOLIOTIC, PECTUS_EXCAVATUM, PECTUS_CARINATUM
  chest_symmetry: varchar('chest_symmetry', { length: 50 }), // SYMMETRIC, ASYMMETRIC
  chest_expansion: varchar('chest_expansion', { length: 50 }), // NORMAL, DECREASED, UNEQUAL
  chest_expansion_side: varchar('chest_expansion_side', { length: 50 }), // LEFT_DECREASED, RIGHT_DECREASED (if unequal)

  percussion_notes_right: varchar('percussion_notes_right', { length: 100 }), // RESONANT, HYPERRESONANT, DULL, FLAT
  percussion_notes_left: varchar('percussion_notes_left', { length: 100 }),
  tactile_fremitus_right: varchar('tactile_fremitus_right', { length: 50 }), // NORMAL, INCREASED, DECREASED, ABSENT
  tactile_fremitus_left: varchar('tactile_fremitus_left', { length: 50 }),
  chest_assessment_notes: text('chest_assessment_notes'),

  // =========================================
  // COUGH ASSESSMENT
  // =========================================
  cough_present: boolean('cough_present').default(false),
  cough_type: varchar('cough_type', { length: 50 }), // DRY, PRODUCTIVE, HACKING, BARKING, WHOOPING
  cough_frequency: varchar('cough_frequency', { length: 50 }), // OCCASIONAL, FREQUENT, CONSTANT, PAROXYSMAL
  cough_timing: varchar('cough_timing', { length: 100 }), // MORNING, NIGHT, CONTINUOUS, WITH_ACTIVITY, POSTPRANDIAL
  cough_severity: varchar('cough_severity', { length: 50 }), // MILD, MODERATE, SEVERE
  cough_effectiveness: varchar('cough_effectiveness', { length: 50 }), // STRONG, WEAK, INEFFECTIVE
  cough_quality: varchar('cough_quality', { length: 255 }),
  cough_triggers: text('cough_triggers'),
  cough_notes: text('cough_notes'),

  // =========================================
  // SPUTUM ASSESSMENT
  // =========================================
  sputum_present: boolean('sputum_present').default(false),
  sputum_amount: varchar('sputum_amount', { length: 50 }), // SCANT, SMALL, MODERATE, COPIOUS
  sputum_color: varchar('sputum_color', { length: 100 }), // CLEAR, WHITE, YELLOW, GREEN, BROWN, RUST, PINK_FROTHY, BLOOD_TINGED, BLOODY
  sputum_consistency: varchar('sputum_consistency', { length: 50 }), // THIN, THICK, TENACIOUS, PURULENT
  sputum_odor: varchar('sputum_odor', { length: 50 }), // NONE, FOUL, MUSTY
  hemoptysis: boolean('hemoptysis').default(false),
  hemoptysis_amount: varchar('hemoptysis_amount', { length: 100 }), // STREAKED, SMALL, MODERATE, MASSIVE
  sputum_notes: text('sputum_notes'),

  // =========================================
  // DYSPNEA ASSESSMENT
  // =========================================
  dyspnea_present: boolean('dyspnea_present').default(false),
  dyspnea_severity: varchar('dyspnea_severity', { length: 50 }), // NONE, MILD, MODERATE, SEVERE
  dyspnea_scale_used: varchar('dyspnea_scale_used', { length: 100 }), // BORG, MMRC, VAS
  dyspnea_score: integer('dyspnea_score'), // Depending on scale used
  dyspnea_at_rest: boolean('dyspnea_at_rest').default(false),
  dyspnea_with_exertion: boolean('dyspnea_with_exertion').default(false),
  dyspnea_onset: varchar('dyspnea_onset', { length: 100 }), // SUDDEN, GRADUAL, PROGRESSIVE
  dyspnea_duration: varchar('dyspnea_duration', { length: 100 }),
  orthopnea: boolean('orthopnea').default(false),
  orthopnea_pillows: integer('orthopnea_pillows'), // Number of pillows needed
  paroxysmal_nocturnal_dyspnea: boolean('paroxysmal_nocturnal_dyspnea').default(false),
  dyspnea_aggravating_factors: text('dyspnea_aggravating_factors'),
  dyspnea_relieving_factors: text('dyspnea_relieving_factors'),
  dyspnea_notes: text('dyspnea_notes'),

  // Modified Medical Research Council (mMRC) Dyspnea Scale
  mmrc_grade: integer('mmrc_grade'), // 0-4
  mmrc_description: varchar('mmrc_description', { length: 255 }),

  // =========================================
  // AIRWAY MANAGEMENT
  // =========================================
  airway_status: varchar('airway_status', { length: 50 }), // PATENT, PARTIALLY_OBSTRUCTED, OBSTRUCTED
  artificial_airway: boolean('artificial_airway').default(false),
  airway_type: varchar('airway_type', { length: 100 }), // TRACHEOSTOMY, ENDOTRACHEAL, LARYNGECTOMY
  tracheostomy_size: varchar('tracheostomy_size', { length: 50 }),
  tracheostomy_cuff: varchar('tracheostomy_cuff', { length: 50 }), // CUFFED, UNCUFFED, CUFF_INFLATED, CUFF_DEFLATED
  tracheostomy_cuff_pressure: decimal('tracheostomy_cuff_pressure', { precision: 4, scale: 1 }), // cmH2O
  tracheostomy_last_change: timestamp('tracheostomy_last_change'),
  tracheostomy_stoma: varchar('tracheostomy_stoma', { length: 100 }), // CLEAN, RED, DRAINAGE, GRANULATION_TISSUE
  suctioning_required: boolean('suctioning_required').default(false),
  suctioning_frequency: varchar('suctioning_frequency', { length: 100 }),
  secretions_amount: varchar('secretions_amount', { length: 50 }), // SCANT, SMALL, MODERATE, COPIOUS
  secretions_characteristics: varchar('secretions_characteristics', { length: 255 }),
  airway_notes: text('airway_notes'),

  // =========================================
  // VENTILATOR SETTINGS (if applicable)
  // =========================================
  mechanically_ventilated: boolean('mechanically_ventilated').default(false),
  ventilator_mode: varchar('ventilator_mode', { length: 100 }), // AC, SIMV, PSV, CPAP, BIPAP, etc.
  vent_rate: integer('vent_rate'), // breaths/min
  tidal_volume: integer('tidal_volume'), // mL
  fio2_vent: decimal('fio2_vent', { precision: 5, scale: 2 }), // %
  peep: decimal('peep', { precision: 4, scale: 1 }), // cmH2O
  pressure_support: decimal('pressure_support', { precision: 4, scale: 1 }), // cmH2O
  peak_inspiratory_pressure: decimal('peak_inspiratory_pressure', { precision: 4, scale: 1 }), // cmH2O
  minute_ventilation: decimal('minute_ventilation', { precision: 5, scale: 2 }), // L/min
  ventilator_notes: text('ventilator_notes'),

  // =========================================
  // PULMONARY FUNCTION (if available)
  // =========================================
  peak_flow: integer('peak_flow'), // L/min
  peak_flow_personal_best: integer('peak_flow_personal_best'),
  peak_flow_zone: varchar('peak_flow_zone', { length: 20 }), // GREEN, YELLOW, RED
  spirometry_available: boolean('spirometry_available').default(false),
  fev1: decimal('fev1', { precision: 5, scale: 2 }), // L
  fev1_percent_predicted: decimal('fev1_percent_predicted', { precision: 5, scale: 1 }), // %
  fvc: decimal('fvc', { precision: 5, scale: 2 }), // L
  fev1_fvc_ratio: decimal('fev1_fvc_ratio', { precision: 5, scale: 2 }), // %
  pulmonary_function_date: timestamp('pulmonary_function_date'),
  pulmonary_function_notes: text('pulmonary_function_notes'),

  // =========================================
  // ARTERIAL BLOOD GAS (if available)
  // =========================================
  abg_available: boolean('abg_available').default(false),
  abg_ph: decimal('abg_ph', { precision: 4, scale: 2 }),
  abg_pco2: decimal('abg_pco2', { precision: 5, scale: 1 }), // mmHg
  abg_po2: decimal('abg_po2', { precision: 5, scale: 1 }), // mmHg
  abg_hco3: decimal('abg_hco3', { precision: 5, scale: 1 }), // mEq/L
  abg_base_excess: decimal('abg_base_excess', { precision: 4, scale: 1 }), // mEq/L
  abg_sao2: decimal('abg_sao2', { precision: 5, scale: 1 }), // %
  abg_interpretation: varchar('abg_interpretation', { length: 255 }), // NORMAL, RESPIRATORY_ACIDOSIS, RESPIRATORY_ALKALOSIS, METABOLIC_ACIDOSIS, METABOLIC_ALKALOSIS, MIXED
  abg_date: timestamp('abg_date'),
  abg_notes: text('abg_notes'),

  // =========================================
  // HOSPICE-SPECIFIC RESPIRATORY
  // =========================================
  death_rattle_present: boolean('death_rattle_present').default(false),
  death_rattle_severity: varchar('death_rattle_severity', { length: 50 }), // MILD, MODERATE, SEVERE
  terminal_secretions: boolean('terminal_secretions').default(false),
  comfort_measures_only: boolean('comfort_measures_only').default(false),
  dyspnea_management_goals: text('dyspnea_management_goals'),
  fan_therapy: boolean('fan_therapy').default(false),
  positioning_for_comfort: text('positioning_for_comfort'),
  hospice_respiratory_notes: text('hospice_respiratory_notes'),

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
  patientIdx: index('idx_respiratory_system_assessments_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_respiratory_system_assessments_date').on(table.assessment_date),
  patientDateIdx: index('idx_respiratory_system_assessments_patient_date').on(table.patient_id, table.assessment_date),
  overallStatusIdx: index('idx_respiratory_system_assessments_status').on(table.overall_status),
  spo2Idx: index('idx_respiratory_system_assessments_spo2').on(table.spo2_percentage),
  supplementalO2Idx: index('idx_respiratory_system_assessments_o2').on(table.supplemental_oxygen),
}));

// Respiratory patterns
export const RESPIRATORY_PATTERNS = {
  EUPNEA: 'Eupnea - Normal breathing',
  TACHYPNEA: 'Tachypnea - Rapid, shallow breathing (>20/min)',
  BRADYPNEA: 'Bradypnea - Slow breathing (<12/min)',
  APNEA: 'Apnea - Absence of breathing',
  CHEYNE_STOKES: 'Cheyne-Stokes - Crescendo-decrescendo pattern with apnea periods',
  KUSSMAUL: 'Kussmaul - Deep, rapid breathing (metabolic acidosis)',
  BIOTS: 'Biot\'s - Irregular with periods of apnea',
  AGONAL: 'Agonal - Gasping, irregular (pre-terminal)'
};

// Breath sounds
export const RESPIRATORY_BREATH_SOUNDS = {
  CLEAR: 'Clear - Normal vesicular breath sounds',
  DIMINISHED: 'Diminished - Reduced air movement',
  ABSENT: 'Absent - No breath sounds heard',
  BRONCHIAL: 'Bronchial - Loud, high-pitched over airways',
  BRONCHOVESICULAR: 'Bronchovesicular - Between vesicular and bronchial'
};

// Adventitious sounds
export const RESPIRATORY_ADVENTITIOUS_SOUNDS = {
  WHEEZES: 'Wheezes - High-pitched, musical, usually expiratory',
  RHONCHI: 'Rhonchi - Low-pitched, snoring, often clears with cough',
  FINE_CRACKLES: 'Fine Crackles - High-pitched, brief, usually inspiratory',
  COARSE_CRACKLES: 'Coarse Crackles - Low-pitched, bubbling, wet',
  STRIDOR: 'Stridor - High-pitched, inspiratory, indicates obstruction',
  PLEURAL_RUB: 'Pleural Friction Rub - Grating sound during inspiration and expiration'
};

// Oxygen delivery devices
export const RESPIRATORY_O2_DEVICES = {
  NASAL_CANNULA: { flow: '1-6 L/min', fio2: '24-44%' },
  SIMPLE_MASK: { flow: '5-10 L/min', fio2: '35-55%' },
  VENTURI_MASK: { flow: 'Variable', fio2: '24-60% (precise)' },
  NON_REBREATHER: { flow: '10-15 L/min', fio2: '60-100%' },
  HIGH_FLOW_NC: { flow: 'Up to 60 L/min', fio2: '21-100%' },
  CPAP: { description: 'Continuous Positive Airway Pressure' },
  BIPAP: { description: 'Bilevel Positive Airway Pressure' }
};

// mMRC Dyspnea Scale
export const RESPIRATORY_MMRC_SCALE = {
  0: 'Grade 0 - Breathless only with strenuous exercise',
  1: 'Grade 1 - Short of breath when hurrying or walking up a slight hill',
  2: 'Grade 2 - Walks slower than people of the same age or stops for breath',
  3: 'Grade 3 - Stops for breath after walking 100 yards or few minutes',
  4: 'Grade 4 - Too breathless to leave the house or breathless when dressing'
};

// Sputum colors and clinical significance
export const RESPIRATORY_SPUTUM_COLORS = {
  CLEAR: 'Clear - Normal or viral infection',
  WHITE: 'White - Viral infection, COPD, GERD',
  YELLOW: 'Yellow - Bacterial infection, possible inflammation',
  GREEN: 'Green - Bacterial infection, pseudomonas possible',
  BROWN: 'Brown - Old blood, chronic bronchitis, coal dust',
  RUST: 'Rust - Pneumococcal pneumonia, pulmonary embolism',
  PINK_FROTHY: 'Pink Frothy - Pulmonary edema',
  BLOOD_TINGED: 'Blood-tinged - Various causes requiring investigation',
  BLOODY: 'Bloody/Hemoptysis - Requires immediate evaluation'
};

// Normal vital sign ranges for respiratory
export const RESPIRATORY_NORMAL_RANGES = {
  respiratory_rate: { low: 12, high: 20, unit: 'breaths/min' },
  spo2: { low: 95, high: 100, critical_low: 88, unit: '%' },
  peak_flow_percent: { green: 80, yellow: 50, red: 0 }
};

// ABG normal ranges
export const RESPIRATORY_ABG_RANGES = {
  ph: { low: 7.35, high: 7.45 },
  pco2: { low: 35, high: 45, unit: 'mmHg' },
  po2: { low: 80, high: 100, unit: 'mmHg' },
  hco3: { low: 22, high: 26, unit: 'mEq/L' },
  base_excess: { low: -2, high: 2, unit: 'mEq/L' }
};

// Common respiratory conditions
export const RESPIRATORY_CONDITIONS = [
  'COPD',
  'EMPHYSEMA',
  'CHRONIC_BRONCHITIS',
  'ASTHMA',
  'PNEUMONIA',
  'LUNG_CANCER',
  'PULMONARY_FIBROSIS',
  'PULMONARY_EMBOLISM',
  'PLEURAL_EFFUSION',
  'PNEUMOTHORAX',
  'TUBERCULOSIS',
  'BRONCHIECTASIS',
  'INTERSTITIAL_LUNG_DISEASE',
  'SLEEP_APNEA',
  'PULMONARY_HYPERTENSION',
  'ACUTE_RESPIRATORY_DISTRESS_SYNDROME',
  'COVID_19'
];

// Accessory muscles of respiration
export const RESPIRATORY_ACCESSORY_MUSCLES = [
  'STERNOCLEIDOMASTOID',
  'SCALENES',
  'TRAPEZIUS',
  'PECTORALIS_MAJOR',
  'INTERCOSTAL_EXTERNAL',
  'ABDOMINAL'
];
