import { pgTable, bigint, integer, varchar, decimal, timestamp, text, boolean, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Multi-Scale Pain Assessment Schema
 *
 * Comprehensive pain assessment with support for multiple standardized scales:
 * - NRS (Numeric Rating Scale): 0-10 self-report
 * - VAS (Visual Analog Scale): 0-100mm
 * - Wong-Baker FACES: 0-10 pictorial
 * - FLACC (Face, Legs, Activity, Cry, Consolability): 0-10 behavioral (pediatric/non-verbal)
 * - PAINAD (Pain Assessment in Advanced Dementia): 0-10 behavioral (dementia)
 * - CPOT (Critical Care Pain Observation Tool): 0-8 ICU behavioral
 *
 * HIPAA/21 CFR Part 11 Compliant with signature and amendment tracking
 */
export const multi_scale_pain_assessments = pgTable('multi_scale_pain_assessments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // =========================================
  // PATIENT & CONTEXT ASSOCIATIONS
  // =========================================
  patient_id: bigint('patient_id', { mode: 'number' }).notNull().references(() => patients.id),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // =========================================
  // ASSESSMENT METADATA
  // =========================================
  assessment_timestamp: timestamp('assessment_timestamp').defaultNow().notNull(),
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),
  assessment_context: varchar('assessment_context', { length: 100 }), // ROUTINE, PRE_MEDICATION, POST_MEDICATION, ON_DEMAND, ADMISSION

  // =========================================
  // PAIN SCALE SELECTION
  // =========================================
  pain_scale_type: varchar('pain_scale_type', { length: 50 }).notNull(), // NRS, VAS, WONG_BAKER, FLACC, PAINAD, CPOT

  // =========================================
  // NUMERIC RATING SCALE (NRS) - 0-10
  // Self-reported pain intensity
  // =========================================
  nrs_score: integer('nrs_score'), // 0-10

  // =========================================
  // VISUAL ANALOG SCALE (VAS) - 0-100mm
  // Self-reported pain intensity on visual line
  // =========================================
  vas_score: decimal('vas_score', { precision: 5, scale: 1 }), // 0-100mm

  // =========================================
  // WONG-BAKER FACES - 0-10 (or 0-5 scale)
  // Pictorial self-report scale
  // =========================================
  wong_baker_score: integer('wong_baker_score'), // 0-10
  wong_baker_face_selected: varchar('wong_baker_face_selected', { length: 50 }), // NO_HURT, HURTS_LITTLE_BIT, HURTS_LITTLE_MORE, HURTS_EVEN_MORE, HURTS_WHOLE_LOT, HURTS_WORST

  // =========================================
  // FLACC (Face, Legs, Activity, Cry, Consolability) - 0-10
  // Behavioral pain scale for pediatric/non-verbal patients
  // =========================================
  flacc_face: integer('flacc_face'), // 0-2
  flacc_legs: integer('flacc_legs'), // 0-2
  flacc_activity: integer('flacc_activity'), // 0-2
  flacc_cry: integer('flacc_cry'), // 0-2
  flacc_consolability: integer('flacc_consolability'), // 0-2
  flacc_total_score: integer('flacc_total_score'), // 0-10 (sum of above)

  // =========================================
  // PAINAD (Pain Assessment in Advanced Dementia) - 0-10
  // Behavioral scale for dementia patients
  // =========================================
  painad_breathing: integer('painad_breathing'), // 0-2
  painad_negative_vocalization: integer('painad_negative_vocalization'), // 0-2
  painad_facial_expression: integer('painad_facial_expression'), // 0-2
  painad_body_language: integer('painad_body_language'), // 0-2
  painad_consolability: integer('painad_consolability'), // 0-2
  painad_total_score: integer('painad_total_score'), // 0-10 (sum of above)

  // =========================================
  // CPOT (Critical Care Pain Observation Tool) - 0-8
  // Behavioral scale for ICU/non-verbal patients
  // =========================================
  cpot_facial_expression: integer('cpot_facial_expression'), // 0-2
  cpot_body_movements: integer('cpot_body_movements'), // 0-2
  cpot_muscle_tension: integer('cpot_muscle_tension'), // 0-2
  cpot_ventilator_compliance: integer('cpot_ventilator_compliance'), // 0-2 (or vocalization if not intubated)
  cpot_total_score: integer('cpot_total_score'), // 0-8 (sum of above)

  // =========================================
  // UNIFIED PAIN SCORE (Normalized 0-10)
  // Allows comparison across different scales
  // =========================================
  normalized_pain_score: integer('normalized_pain_score'), // 0-10 normalized from any scale

  // =========================================
  // PAIN CHARACTERISTICS
  // =========================================
  pain_location_primary: varchar('pain_location_primary', { length: 255 }),
  pain_location_secondary: varchar('pain_location_secondary', { length: 255 }),
  pain_location_body_map: text('pain_location_body_map'), // JSON body map coordinates
  pain_quality: varchar('pain_quality', { length: 255 }), // SHARP, DULL, ACHING, BURNING, THROBBING, STABBING, SHOOTING, CRAMPING
  pain_radiation: varchar('pain_radiation', { length: 255 }), // Where pain radiates to
  pain_onset: varchar('pain_onset', { length: 100 }), // SUDDEN, GRADUAL
  pain_pattern: varchar('pain_pattern', { length: 100 }), // CONSTANT, INTERMITTENT, BREAKTHROUGH

  // =========================================
  // PAIN DURATION & TIMING
  // =========================================
  pain_duration_value: integer('pain_duration_value'),
  pain_duration_unit: varchar('pain_duration_unit', { length: 50 }), // MINUTES, HOURS, DAYS, WEEKS, MONTHS
  pain_frequency: varchar('pain_frequency', { length: 100 }), // CONTINUOUS, HOURLY, DAILY, WEEKLY, PRN

  // =========================================
  // AGGRAVATING & RELIEVING FACTORS
  // =========================================
  aggravating_factors: text('aggravating_factors'), // JSON array
  relieving_factors: text('relieving_factors'), // JSON array

  // =========================================
  // FUNCTIONAL IMPACT
  // =========================================
  affects_sleep: boolean('affects_sleep').default(false),
  affects_mobility: boolean('affects_mobility').default(false),
  affects_appetite: boolean('affects_appetite').default(false),
  affects_mood: boolean('affects_mood').default(false),
  affects_adl: boolean('affects_adl').default(false),
  functional_impact_notes: text('functional_impact_notes'),

  // =========================================
  // ACCEPTABLE PAIN LEVEL
  // =========================================
  acceptable_pain_level: integer('acceptable_pain_level'), // Patient's acceptable pain level (0-10)

  // =========================================
  // INTERVENTION TRACKING
  // =========================================
  intervention_given: boolean('intervention_given').default(false),
  intervention_type: varchar('intervention_type', { length: 100 }), // PHARMACOLOGICAL, NON_PHARMACOLOGICAL, BOTH
  intervention_description: text('intervention_description'),
  intervention_medication: varchar('intervention_medication', { length: 255 }),
  intervention_time: timestamp('intervention_time'),

  // Post-intervention reassessment
  post_intervention_score: integer('post_intervention_score'),
  post_intervention_time: timestamp('post_intervention_time'),
  intervention_effective: boolean('intervention_effective'),

  // =========================================
  // CLINICAL FLAGS
  // =========================================
  is_breakthrough_pain: boolean('is_breakthrough_pain').default(false),
  requires_follow_up: boolean('requires_follow_up').default(false),
  follow_up_notes: text('follow_up_notes'),
  notified_provider: boolean('notified_provider').default(false),
  notified_provider_at: timestamp('notified_provider_at'),
  notified_provider_id: bigint('notified_provider_id', { mode: 'number' }),

  // =========================================
  // PATIENT COMMUNICATION
  // =========================================
  patient_able_to_self_report: boolean('patient_able_to_self_report').default(true),
  patient_goal_discussed: boolean('patient_goal_discussed').default(false),
  additional_notes: text('additional_notes'),

  // =========================================
  // SIGNATURE AND COMPLIANCE (21 CFR Part 11)
  // =========================================
  signature_id: bigint('signature_id', { mode: 'number' }),
  signed_at: timestamp('signed_at'),
  signed_by_id: bigint('signed_by_id', { mode: 'number' }),

  // Amendment tracking for signed assessments
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
  // Performance indexes for common queries
  patientIdx: index('idx_multi_scale_pain_patient_id').on(table.patient_id),
  assessmentTimestampIdx: index('idx_multi_scale_pain_timestamp').on(table.assessment_timestamp),
  patientTimestampIdx: index('idx_multi_scale_pain_patient_timestamp').on(table.patient_id, table.assessment_timestamp),
  scaleTypeIdx: index('idx_multi_scale_pain_scale_type').on(table.pain_scale_type),
  encounterIdx: index('idx_multi_scale_pain_encounter').on(table.encounter_id),
}));

// =========================================
// PAIN SCALE TYPES
// =========================================
export const PAIN_SCALE_TYPES = {
  NRS: 'NRS',           // Numeric Rating Scale (0-10)
  VAS: 'VAS',           // Visual Analog Scale (0-100mm)
  WONG_BAKER: 'WONG_BAKER', // Wong-Baker FACES (0-10)
  FLACC: 'FLACC',       // Face, Legs, Activity, Cry, Consolability (0-10)
  PAINAD: 'PAINAD',     // Pain Assessment in Advanced Dementia (0-10)
  CPOT: 'CPOT',         // Critical Care Pain Observation Tool (0-8)
};

// =========================================
// PAIN SCALE RANGES (for validation)
// =========================================
export const PAIN_SCALE_RANGES = {
  NRS: { min: 0, max: 10, description: 'Numeric Rating Scale' },
  VAS: { min: 0, max: 100, description: 'Visual Analog Scale (mm)' },
  WONG_BAKER: { min: 0, max: 10, description: 'Wong-Baker FACES' },
  FLACC: { min: 0, max: 10, subscale_max: 2, description: 'FLACC Behavioral Scale' },
  PAINAD: { min: 0, max: 10, subscale_max: 2, description: 'PAINAD for Dementia' },
  CPOT: { min: 0, max: 8, subscale_max: 2, description: 'Critical Care Pain Observation Tool' },
};

// =========================================
// WONG-BAKER FACES OPTIONS
// =========================================
export const WONG_BAKER_FACES = {
  NO_HURT: { value: 0, label: 'No Hurt' },
  HURTS_LITTLE_BIT: { value: 2, label: 'Hurts Little Bit' },
  HURTS_LITTLE_MORE: { value: 4, label: 'Hurts Little More' },
  HURTS_EVEN_MORE: { value: 6, label: 'Hurts Even More' },
  HURTS_WHOLE_LOT: { value: 8, label: 'Hurts Whole Lot' },
  HURTS_WORST: { value: 10, label: 'Hurts Worst' },
};

// =========================================
// FLACC SCALE DESCRIPTORS
// =========================================
export const FLACC_DESCRIPTORS = {
  face: {
    0: 'No particular expression or smile',
    1: 'Occasional grimace or frown, withdrawn, disinterested',
    2: 'Frequent to constant frown, clenched jaw, quivering chin',
  },
  legs: {
    0: 'Normal position or relaxed',
    1: 'Uneasy, restless, tense',
    2: 'Kicking, or legs drawn up',
  },
  activity: {
    0: 'Lying quietly, normal position, moves easily',
    1: 'Squirming, shifting back and forth, tense',
    2: 'Arched, rigid, or jerking',
  },
  cry: {
    0: 'No cry (awake or asleep)',
    1: 'Moans or whimpers, occasional complaint',
    2: 'Crying steadily, screams or sobs, frequent complaints',
  },
  consolability: {
    0: 'Content, relaxed',
    1: 'Reassured by occasional touching, hugging, or being talked to; distractible',
    2: 'Difficult to console or comfort',
  },
};

// =========================================
// PAINAD SCALE DESCRIPTORS
// =========================================
export const PAINAD_DESCRIPTORS = {
  breathing: {
    0: 'Normal',
    1: 'Occasional labored breathing, short period of hyperventilation',
    2: 'Noisy labored breathing, long period of hyperventilation, Cheyne-Stokes',
  },
  negative_vocalization: {
    0: 'None',
    1: 'Occasional moan or groan, low level speech with negative/disapproving quality',
    2: 'Repeated troubled calling out, loud moaning or groaning, crying',
  },
  facial_expression: {
    0: 'Smiling or inexpressive',
    1: 'Sad, frightened, frown',
    2: 'Facial grimacing',
  },
  body_language: {
    0: 'Relaxed',
    1: 'Tense, distressed pacing, fidgeting',
    2: 'Rigid, fists clenched, knees pulled up, pulling/pushing away, striking out',
  },
  consolability: {
    0: 'No need to console',
    1: 'Distracted or reassured by voice or touch',
    2: 'Unable to console, distract, or reassure',
  },
};

// =========================================
// CPOT SCALE DESCRIPTORS
// =========================================
export const CPOT_DESCRIPTORS = {
  facial_expression: {
    0: 'Relaxed, neutral',
    1: 'Tense (brow lowering, orbit tightening, levator contraction)',
    2: 'Grimacing (all previous facial movements plus eyelid tightly closed)',
  },
  body_movements: {
    0: 'Absence of movements or normal position',
    1: 'Protection (slow, cautious movements, touching pain site, seeking attention)',
    2: 'Restlessness/Agitation (pulling tube, attempting to sit up, thrashing, not following commands)',
  },
  muscle_tension: {
    0: 'Relaxed',
    1: 'Tense, rigid',
    2: 'Very tense or rigid',
  },
  ventilator_compliance: {
    0: 'Tolerating ventilator or movement / Talking in normal tone or no sound',
    1: 'Coughing but tolerating / Sighing, moaning',
    2: 'Fighting ventilator / Crying out, sobbing',
  },
};

// =========================================
// PAIN QUALITIES
// =========================================
export const PAIN_QUALITIES = {
  SHARP: 'SHARP',
  DULL: 'DULL',
  ACHING: 'ACHING',
  BURNING: 'BURNING',
  THROBBING: 'THROBBING',
  STABBING: 'STABBING',
  SHOOTING: 'SHOOTING',
  CRAMPING: 'CRAMPING',
  PRESSURE: 'PRESSURE',
  TINGLING: 'TINGLING',
  NUMBNESS: 'NUMBNESS',
};

// =========================================
// ASSESSMENT CONTEXTS
// =========================================
export const ASSESSMENT_CONTEXTS = {
  ROUTINE: 'ROUTINE',
  PRE_MEDICATION: 'PRE_MEDICATION',
  POST_MEDICATION: 'POST_MEDICATION',
  ON_DEMAND: 'ON_DEMAND',
  ADMISSION: 'ADMISSION',
  DISCHARGE: 'DISCHARGE',
  FOLLOW_UP: 'FOLLOW_UP',
};

// =========================================
// INTERVENTION TYPES
// =========================================
export const INTERVENTION_TYPES = {
  PHARMACOLOGICAL: 'PHARMACOLOGICAL',
  NON_PHARMACOLOGICAL: 'NON_PHARMACOLOGICAL',
  BOTH: 'BOTH',
};

// =========================================
// PAIN INTENSITY LEVELS (for normalized score interpretation)
// =========================================
export const PAIN_INTENSITY_LEVELS = {
  NONE: { min: 0, max: 0, label: 'No Pain' },
  MILD: { min: 1, max: 3, label: 'Mild Pain' },
  MODERATE: { min: 4, max: 6, label: 'Moderate Pain' },
  SEVERE: { min: 7, max: 10, label: 'Severe Pain' },
};

// =========================================
// HELPER: Normalize score to 0-10 scale
// =========================================
export function normalizeToTenScale(score, scaleType) {
  if (score === null || score === undefined) return null;

  const range = PAIN_SCALE_RANGES[scaleType];
  if (!range) return null;

  // CPOT is 0-8, needs normalization
  if (scaleType === 'CPOT') {
    return Math.round((score / 8) * 10);
  }

  // VAS is 0-100, needs normalization
  if (scaleType === 'VAS') {
    return Math.round(score / 10);
  }

  // NRS, WONG_BAKER, FLACC, PAINAD are already 0-10
  return Math.round(score);
}

// =========================================
// HELPER: Get pain intensity level from normalized score
// =========================================
export function getPainIntensityLevel(normalizedScore) {
  if (normalizedScore === null || normalizedScore === undefined) return null;

  if (normalizedScore === 0) return PAIN_INTENSITY_LEVELS.NONE;
  if (normalizedScore <= 3) return PAIN_INTENSITY_LEVELS.MILD;
  if (normalizedScore <= 6) return PAIN_INTENSITY_LEVELS.MODERATE;
  return PAIN_INTENSITY_LEVELS.SEVERE;
}
