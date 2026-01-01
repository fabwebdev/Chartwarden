import { pgTable, bigint, integer, varchar, decimal, timestamp, text, boolean, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Vital Signs Schema
 * Comprehensive vital signs tracking for hospice patients
 *
 * Tracks standard vital signs:
 * - Blood Pressure (BP): Systolic/Diastolic in mmHg
 * - Heart Rate (HR): Beats per minute (BPM)
 * - Respiratory Rate (RR): Breaths per minute
 * - Temperature (Temp): In Fahrenheit or Celsius
 * - Oxygen Saturation (SpO2): Percentage
 * - Pain: Score 0-10 using various assessment scales
 *
 * Each measurement includes timestamp, value, and unit information
 */
export const vital_signs = pgTable('vital_signs', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Patient and note associations
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id),
  note_id: bigint('note_id', { mode: 'number' }),
  encounter_id: bigint('encounter_id', { mode: 'number' }),

  // Measurement timestamp - when vitals were actually taken
  measurement_timestamp: timestamp('measurement_timestamp').defaultNow().notNull(),
  measured_by_id: bigint('measured_by_id', { mode: 'number' }),

  // =========================================
  // TEMPERATURE
  // =========================================
  degrees_fahrenheit: decimal('degrees_fahrenheit', { precision: 5, scale: 2 }),
  degrees_celsius: decimal('degrees_celsius', { precision: 5, scale: 2 }),
  temperature_unit: varchar('temperature_unit', { length: 10 }).default('F'), // F or C
  temperature_method: varchar('temperature_method', { length: 255 }), // ORAL, AXILLARY, RECTAL, TEMPORAL, TYMPANIC, OTHER
  temperature_notes: text('temperature_notes'),

  // =========================================
  // HEART RATE (HR)
  // =========================================
  heart_rate: integer('heart_rate'), // BPM
  heart_rate_unit: varchar('heart_rate_unit', { length: 10 }).default('BPM'),
  heart_rhythm: varchar('heart_rhythm', { length: 255 }), // REGULAR, IRREGULAR, REGULARLY_IRREGULAR, IRREGULARLY_IRREGULAR
  heart_rate_location: varchar('heart_rate_location', { length: 255 }), // RADIAL, APICAL, CAROTID, BRACHIAL, FEMORAL, PEDAL
  other_heart_rate_location: varchar('other_heart_rate_location', { length: 255 }),
  heart_rate_notes: text('heart_rate_notes'),

  // =========================================
  // BLOOD PRESSURE (BP)
  // =========================================
  bp_systolic: integer('bp_systolic'), // mmHg
  bp_diastolic: integer('bp_diastolic'), // mmHg
  bp_unit: varchar('bp_unit', { length: 10 }).default('mmHg'),
  bp_position: varchar('bp_position', { length: 255 }), // SITTING, STANDING, SUPINE, LEFT_LATERAL
  bp_location: varchar('bp_location', { length: 255 }), // LEFT_ARM, RIGHT_ARM, LEFT_LEG, RIGHT_LEG
  other_bp_location: varchar('other_bp_location', { length: 255 }),
  bp_cuff_size: varchar('bp_cuff_size', { length: 50 }), // SMALL, REGULAR, LARGE, EXTRA_LARGE, THIGH
  bp_additional_readings: varchar('bp_additional_readings', { length: 255 }),
  bp_notes: text('bp_notes'),
  bp_mmhg: integer('bp_mmhg'), // Mean Arterial Pressure (MAP) if calculated

  // =========================================
  // RESPIRATORY RATE (RR)
  // =========================================
  respiratory_rate: integer('respiratory_rate'), // Breaths per minute
  respiratory_rate_unit: varchar('respiratory_rate_unit', { length: 20 }).default('breaths/min'),
  respiratory_rhythm: varchar('respiratory_rhythm', { length: 255 }), // REGULAR, IRREGULAR, CHEYNE_STOKES, KUSSMAUL, BIOTS
  respiratory_pattern: varchar('respiratory_pattern', { length: 255 }), // NORMAL, SHALLOW, DEEP, LABORED, APNEIC
  respiratory_notes: text('respiratory_notes'),

  // =========================================
  // OXYGEN SATURATION (SpO2)
  // =========================================
  pulse_oximetry_percentage: decimal('pulse_oximetry_percentage', { precision: 5, scale: 2 }),
  pulse_ox_unit: varchar('pulse_ox_unit', { length: 10 }).default('%'),
  pulse_ox_location: varchar('pulse_ox_location', { length: 255 }), // FINGER, TOE, EAR, FOREHEAD
  pulse_ox_other_location: varchar('pulse_ox_other_location', { length: 255 }),
  supplemental_oxygen: boolean('supplemental_oxygen').default(false),
  oxygen_flow_rate: decimal('oxygen_flow_rate', { precision: 4, scale: 1 }), // L/min
  oxygen_delivery_method: varchar('oxygen_delivery_method', { length: 100 }), // NASAL_CANNULA, MASK, VENTI_MASK, NON_REBREATHER, HIGH_FLOW
  pulse_ox_notes: text('pulse_ox_notes'),

  // =========================================
  // PAIN ASSESSMENT
  // =========================================
  pain_score: integer('pain_score'), // 0-10 scale
  pain_score_unit: varchar('pain_score_unit', { length: 20 }).default('0-10 scale'),
  pain_scale_used: varchar('pain_scale_used', { length: 100 }), // NRS, VAS, FACES, FLACC, PAINAD, CPOT, WONG_BAKER
  pain_location: varchar('pain_location', { length: 255 }),
  pain_location_other: text('pain_location_other'),
  pain_quality: varchar('pain_quality', { length: 255 }), // SHARP, DULL, ACHING, BURNING, THROBBING, STABBING
  pain_radiation: varchar('pain_radiation', { length: 255 }),
  pain_onset: varchar('pain_onset', { length: 100 }), // SUDDEN, GRADUAL, CONSTANT, INTERMITTENT
  pain_duration: varchar('pain_duration', { length: 100 }),
  pain_aggravating_factors: text('pain_aggravating_factors'),
  pain_relieving_factors: text('pain_relieving_factors'),
  pain_intervention_given: boolean('pain_intervention_given').default(false),
  pain_intervention_description: text('pain_intervention_description'),
  pain_post_intervention_score: integer('pain_post_intervention_score'),
  pain_notes: text('pain_notes'),

  // =========================================
  // BODY MEASUREMENTS
  // =========================================
  body_height_inches: decimal('body_height_inches', { precision: 5, scale: 2 }),
  body_height_cm: decimal('body_height_cm', { precision: 6, scale: 2 }),
  height_unit: varchar('height_unit', { length: 10 }).default('in'),
  body_weight_lbs: decimal('body_weight_lbs', { precision: 6, scale: 2 }),
  body_weight_kg: decimal('body_weight_kg', { precision: 6, scale: 2 }),
  weight_unit: varchar('weight_unit', { length: 10 }).default('lbs'),
  body_weight_period: varchar('body_weight_period', { length: 255 }), // STABLE, INCREASING, DECREASING
  weight_change_percentage: decimal('weight_change_percentage', { precision: 5, scale: 2 }),
  weight_change_period_days: integer('weight_change_period_days'),
  bmi_kg_m2: decimal('bmi_kg_m2', { precision: 5, scale: 2 }),
  bmi_percentage: decimal('bmi_percentage', { precision: 5, scale: 2 }),

  // Legacy field for backwards compatibility
  body_weight_ibs: decimal('body_weight_ibs', { precision: 5, scale: 2 }),

  // =========================================
  // GENERAL NOTES AND OBSERVATIONS
  // =========================================
  general_notes: text('general_notes'),
  patient_position_during_assessment: varchar('patient_position_during_assessment', { length: 100 }),
  patient_activity_prior: varchar('patient_activity_prior', { length: 255 }), // REST, AMBULATING, EATING, SLEEPING

  // =========================================
  // CLINICAL FLAGS
  // =========================================
  is_abnormal: boolean('is_abnormal').default(false),
  abnormal_values: text('abnormal_values'), // JSON array of which values are abnormal
  requires_follow_up: boolean('requires_follow_up').default(false),
  follow_up_notes: text('follow_up_notes'),
  notified_provider: boolean('notified_provider').default(false),
  notified_provider_at: timestamp('notified_provider_at'),
  notified_provider_id: bigint('notified_provider_id', { mode: 'number' }),

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

  // =========================================
  // SOFT DELETE FIELDS
  // =========================================
  deleted_at: timestamp('deleted_at'),
  deleted_by_id: bigint('deleted_by_id', { mode: 'number' }),

  // =========================================
  // OPTIMISTIC LOCKING
  // =========================================
  version: integer('version').default(1).notNull(),
}, (table) => ({
  // Performance indexes for common queries
  patientIdx: index('idx_vital_signs_patient_id').on(table.patient_id),
  measurementTimestampIdx: index('idx_vital_signs_measurement_timestamp').on(table.measurement_timestamp),
  noteIdx: index('idx_vital_signs_note_id').on(table.note_id),
  patientTimestampIdx: index('idx_vital_signs_patient_timestamp').on(table.patient_id, table.measurement_timestamp),
  abnormalIdx: index('idx_vital_signs_abnormal').on(table.is_abnormal),
  deletedAtIdx: index('idx_vital_signs_deleted_at').on(table.deleted_at),
}));

// Temperature methods
export const TEMPERATURE_METHODS = {
  ORAL: 'ORAL',
  AXILLARY: 'AXILLARY',
  RECTAL: 'RECTAL',
  TEMPORAL: 'TEMPORAL',
  TYMPANIC: 'TYMPANIC',
  OTHER: 'OTHER'
};

// Heart rhythm types
export const HEART_RHYTHMS = {
  REGULAR: 'REGULAR',
  IRREGULAR: 'IRREGULAR',
  REGULARLY_IRREGULAR: 'REGULARLY_IRREGULAR',
  IRREGULARLY_IRREGULAR: 'IRREGULARLY_IRREGULAR'
};

// Heart rate locations
export const HEART_RATE_LOCATIONS = {
  RADIAL: 'RADIAL',
  APICAL: 'APICAL',
  CAROTID: 'CAROTID',
  BRACHIAL: 'BRACHIAL',
  FEMORAL: 'FEMORAL',
  PEDAL: 'PEDAL'
};

// Blood pressure positions
export const BP_POSITIONS = {
  SITTING: 'SITTING',
  STANDING: 'STANDING',
  SUPINE: 'SUPINE',
  LEFT_LATERAL: 'LEFT_LATERAL'
};

// Blood pressure locations
export const BP_LOCATIONS = {
  LEFT_ARM: 'LEFT_ARM',
  RIGHT_ARM: 'RIGHT_ARM',
  LEFT_LEG: 'LEFT_LEG',
  RIGHT_LEG: 'RIGHT_LEG'
};

// Respiratory rhythms
export const RESPIRATORY_RHYTHMS = {
  REGULAR: 'REGULAR',
  IRREGULAR: 'IRREGULAR',
  CHEYNE_STOKES: 'CHEYNE_STOKES',
  KUSSMAUL: 'KUSSMAUL',
  BIOTS: 'BIOTS'
};

// Respiratory patterns
export const RESPIRATORY_PATTERNS = {
  NORMAL: 'NORMAL',
  SHALLOW: 'SHALLOW',
  DEEP: 'DEEP',
  LABORED: 'LABORED',
  APNEIC: 'APNEIC'
};

// Oxygen delivery methods
export const OXYGEN_DELIVERY_METHODS = {
  NASAL_CANNULA: 'NASAL_CANNULA',
  MASK: 'MASK',
  VENTI_MASK: 'VENTI_MASK',
  NON_REBREATHER: 'NON_REBREATHER',
  HIGH_FLOW: 'HIGH_FLOW'
};

// Pain scales
export const PAIN_SCALES = {
  NRS: 'NRS', // Numeric Rating Scale
  VAS: 'VAS', // Visual Analog Scale
  FACES: 'FACES', // Wong-Baker FACES Pain Rating Scale
  FLACC: 'FLACC', // Face, Legs, Activity, Cry, Consolability
  PAINAD: 'PAINAD', // Pain Assessment in Advanced Dementia
  CPOT: 'CPOT', // Critical-Care Pain Observation Tool
  WONG_BAKER: 'WONG_BAKER'
};

// Pain qualities
export const PAIN_QUALITIES = {
  SHARP: 'SHARP',
  DULL: 'DULL',
  ACHING: 'ACHING',
  BURNING: 'BURNING',
  THROBBING: 'THROBBING',
  STABBING: 'STABBING'
};

// Normal vital sign ranges for adults (hospice context)
export const VITAL_SIGN_RANGES = {
  temperature_fahrenheit: { low: 97.8, high: 99.1, critical_low: 95.0, critical_high: 104.0 },
  heart_rate: { low: 60, high: 100, critical_low: 40, critical_high: 150 },
  bp_systolic: { low: 90, high: 140, critical_low: 70, critical_high: 180 },
  bp_diastolic: { low: 60, high: 90, critical_low: 40, critical_high: 110 },
  respiratory_rate: { low: 12, high: 20, critical_low: 8, critical_high: 30 },
  spo2: { low: 95, high: 100, critical_low: 88, critical_high: 100 },
  pain_score: { low: 0, high: 3, critical_low: 0, critical_high: 7 }
};

/**
 * Clinical validation rules per the feature specification
 * These are the absolute valid ranges - values outside are rejected
 */
export const VITAL_SIGN_VALID_RANGES = {
  temperature_fahrenheit: { min: 95.0, max: 106.0 },
  temperature_celsius: { min: 35.0, max: 41.1 },
  bp_systolic: { min: 70, max: 200 },
  bp_diastolic: { min: 40, max: 130 },
  heart_rate: { min: 40, max: 200 },
  respiratory_rate: { min: 8, max: 40 },
  oxygen_saturation: { min: 70, max: 100 }
};

/**
 * Clinical alert thresholds
 * Values outside these ranges trigger clinical flags
 */
export const VITAL_SIGN_ALERT_THRESHOLDS = {
  temperature_fahrenheit: { low_alert: 96.8, high_alert: 100.4 },
  temperature_celsius: { low_alert: 36.0, high_alert: 38.0 },
  bp_systolic: { low_warn: 90, high_warn: 140 },
  bp_diastolic: { low_warn: 60, high_warn: 90 },
  heart_rate: { low_normal: 60, high_normal: 100 },
  respiratory_rate: { low_normal: 12, high_normal: 20 },
  oxygen_saturation: { critical: 90, warning: 95 }
};

/**
 * Vital signs validation error codes
 */
export const VITAL_SIGN_ERROR_CODES = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  TEMPERATURE_OUT_OF_RANGE: 'TEMPERATURE_OUT_OF_RANGE',
  BP_OUT_OF_RANGE: 'BP_OUT_OF_RANGE',
  BP_SYSTOLIC_DIASTOLIC_INVALID: 'BP_SYSTOLIC_DIASTOLIC_INVALID',
  HEART_RATE_OUT_OF_RANGE: 'HEART_RATE_OUT_OF_RANGE',
  RESPIRATORY_RATE_OUT_OF_RANGE: 'RESPIRATORY_RATE_OUT_OF_RANGE',
  OXYGEN_SATURATION_OUT_OF_RANGE: 'OXYGEN_SATURATION_OUT_OF_RANGE',
  RECORDED_TIMESTAMP_FUTURE: 'RECORDED_TIMESTAMP_FUTURE',
  RECORDED_TIMESTAMP_BEFORE_BIRTH: 'RECORDED_TIMESTAMP_BEFORE_BIRTH',
  DUPLICATE_MEASUREMENT: 'DUPLICATE_MEASUREMENT',
  CONCURRENT_MODIFICATION: 'CONCURRENT_MODIFICATION',
  RECORD_DELETED: 'RECORD_DELETED',
  RECORD_NOT_FOUND: 'RECORD_NOT_FOUND',
  AT_LEAST_ONE_MEASUREMENT_REQUIRED: 'AT_LEAST_ONE_MEASUREMENT_REQUIRED'
};