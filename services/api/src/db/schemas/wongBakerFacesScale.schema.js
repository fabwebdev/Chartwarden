import { pgTable, bigint, integer, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Wong-Baker FACES Pain Rating Scale Schema
 * Visual pain assessment tool using facial expressions
 *
 * Designed for:
 * - Pediatric patients (3+ years)
 * - Adults who prefer visual scales
 * - Patients with language barriers
 * - Patients with mild cognitive impairment who can still self-report
 *
 * Scale uses 6 faces (0, 2, 4, 6, 8, 10):
 * - Face 0 (Score 0): No hurt - Very happy, no pain
 * - Face 1 (Score 2): Hurts little bit - Minor discomfort
 * - Face 2 (Score 4): Hurts little more - Mild pain
 * - Face 3 (Score 6): Hurts even more - Moderate pain
 * - Face 4 (Score 8): Hurts whole lot - Severe pain
 * - Face 5 (Score 10): Hurts worst - Worst pain imaginable
 *
 * Pain severity interpretation (same as NRS):
 * - 0 = No pain
 * - 1-3 = Mild pain
 * - 4-6 = Moderate pain
 * - 7-10 = Severe pain
 *
 * Reference: Wong DL, Baker CM. Pain in children: comparison of assessment scales.
 * Pediatric Nursing, 1988;14(1):9-17.
 */
export const wong_baker_faces_scales = pgTable('wong_baker_faces_scales', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // Assessment metadata
  assessment_date: timestamp('assessment_date').defaultNow().notNull(),
  assessment_type: varchar('assessment_type', { length: 50 }), // INITIAL, FOLLOW_UP, REASSESSMENT, PRE_INTERVENTION, POST_INTERVENTION
  assessment_context: varchar('assessment_context', { length: 100 }), // ROUTINE, PRN, PRE_MEDICATION, POST_MEDICATION, PROCEDURE
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),

  // Patient population context
  patient_population: varchar('patient_population', { length: 50 }), // PEDIATRIC, ADULT, ELDERLY, LANGUAGE_BARRIER, MILD_COGNITIVE_IMPAIRMENT
  patient_age_years: integer('patient_age_years'), // Age in years for context

  // =========================================
  // WONG-BAKER FACES SCORING
  // =========================================

  // Face selection (0-5 representing faces 0,2,4,6,8,10)
  // Face index 0 = Score 0 (No hurt)
  // Face index 1 = Score 2 (Hurts little bit)
  // Face index 2 = Score 4 (Hurts little more)
  // Face index 3 = Score 6 (Hurts even more)
  // Face index 4 = Score 8 (Hurts whole lot)
  // Face index 5 = Score 10 (Hurts worst)
  face_selected: integer('face_selected').notNull(), // 0-5 (face index)

  // Numeric pain score (converted from face: 0, 2, 4, 6, 8, 10)
  pain_score: integer('pain_score').notNull(), // 0, 2, 4, 6, 8, or 10

  // Reference to face image/icon used (for documentation)
  face_image_ref: varchar('face_image_ref', { length: 100 }), // Reference to face image asset

  // Patient's verbal description of chosen face
  patient_description: text('patient_description'),

  // =========================================
  // PAIN INTERPRETATION
  // =========================================

  // Pain severity interpretation based on score
  pain_severity: varchar('pain_severity', { length: 50 }), // NO_PAIN, MILD, MODERATE, SEVERE

  // Pain is considered present if score > 0
  pain_present: boolean('pain_present').default(false),

  // =========================================
  // CLINICAL CONTEXT
  // =========================================

  // Current pain status
  pain_status: varchar('pain_status', { length: 50 }), // ACUTE, CHRONIC, BREAKTHROUGH, POST_PROCEDURAL

  // Location of pain
  pain_location: varchar('pain_location', { length: 255 }),
  pain_location_notes: text('pain_location_notes'),

  // Suspected cause/source
  suspected_cause: varchar('suspected_cause', { length: 255 }),
  suspected_cause_notes: text('suspected_cause_notes'),

  // Duration and timing
  pain_duration: varchar('pain_duration', { length: 100 }), // CONSTANT, INTERMITTENT, BRIEF
  pain_onset: varchar('pain_onset', { length: 255 }), // Gradual, Sudden, etc.

  // =========================================
  // ASSESSMENT APPROPRIATENESS
  // =========================================

  // Was the patient able to understand and use the scale appropriately?
  scale_comprehension: varchar('scale_comprehension', { length: 50 }), // GOOD, FAIR, POOR, UNABLE
  comprehension_notes: text('comprehension_notes'),

  // Did patient need assistance selecting face?
  assistance_needed: boolean('assistance_needed').default(false),
  assistance_type: varchar('assistance_type', { length: 100 }), // VERBAL_INSTRUCTION, PHYSICAL_POINTING, CAREGIVER_HELP

  // Alternative scale recommended if comprehension poor
  alternative_scale_recommended: boolean('alternative_scale_recommended').default(false),
  recommended_alternative: varchar('recommended_alternative', { length: 100 }), // FLACC, PAINAD, NRS, OTHER

  // =========================================
  // INTERVENTION TRACKING
  // =========================================

  // Was intervention provided?
  intervention_provided: boolean('intervention_provided').default(false),

  // Type of intervention
  intervention_type: varchar('intervention_type', { length: 100 }), // PHARMACOLOGICAL, NON_PHARMACOLOGICAL, COMBINATION

  // Pharmacological intervention details
  medication_administered: varchar('medication_administered', { length: 255 }),
  medication_dose: varchar('medication_dose', { length: 100 }),
  medication_route: varchar('medication_route', { length: 50 }), // ORAL, IV, IM, SQ, RECTAL, TOPICAL, SL, TRANSDERMAL
  medication_time: timestamp('medication_time'),

  // Non-pharmacological interventions (stored as array)
  non_pharm_interventions: jsonb('non_pharm_interventions'), // Array: REPOSITIONING, MASSAGE, HEAT, COLD, DISTRACTION, MUSIC, RELAXATION, etc.

  // Time to reassess after intervention
  reassessment_time: timestamp('reassessment_time'),
  reassessment_score: integer('reassessment_score'), // 0, 2, 4, 6, 8, or 10
  reassessment_face: integer('reassessment_face'), // 0-5

  // Intervention effectiveness
  intervention_effectiveness: varchar('intervention_effectiveness', { length: 50 }), // EFFECTIVE, PARTIALLY_EFFECTIVE, NOT_EFFECTIVE

  // =========================================
  // HOSPICE CARE SPECIFIC FIELDS
  // =========================================

  // Comfort measures focused (hospice-specific)
  comfort_goal_met: boolean('comfort_goal_met'),
  comfort_goal_notes: text('comfort_goal_notes'),

  // Acceptable pain level (patient's comfort goal using faces)
  acceptable_pain_face: integer('acceptable_pain_face'), // 0-5
  acceptable_pain_score: integer('acceptable_pain_score'), // 0, 2, 4, 6, 8, or 10

  // Family/caregiver involvement
  caregiver_present: boolean('caregiver_present'),
  caregiver_observations: text('caregiver_observations'),
  caregiver_education_provided: boolean('caregiver_education_provided'),

  // For pediatric patients - was parent/guardian involved?
  parent_involved: boolean('parent_involved'),
  parent_pain_estimate: integer('parent_pain_estimate'), // Parent's estimate of child's pain (0-10)

  // Plan of care updates needed
  care_plan_update_needed: boolean('care_plan_update_needed'),
  care_plan_recommendations: text('care_plan_recommendations'),

  // =========================================
  // CLINICAL NOTES AND SUMMARY
  // =========================================

  clinical_notes: text('clinical_notes'),
  assessment_summary: text('assessment_summary'),
  follow_up_plan: text('follow_up_plan'),

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
  // Performance indexes for common queries
  patientIdx: index('idx_wong_baker_faces_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_wong_baker_faces_assessment_date').on(table.assessment_date),
  painScoreIdx: index('idx_wong_baker_faces_pain_score').on(table.pain_score),
  patientDateIdx: index('idx_wong_baker_faces_patient_date').on(table.patient_id, table.assessment_date),
  patientScoreIdx: index('idx_wong_baker_faces_patient_score').on(table.patient_id, table.pain_score),
  faceSelectedIdx: index('idx_wong_baker_faces_face_selected').on(table.face_selected),
  populationIdx: index('idx_wong_baker_faces_population').on(table.patient_population),
  severityIdx: index('idx_wong_baker_faces_severity').on(table.pain_severity),
}));

// Wong-Baker FACES descriptions and score mappings
export const WONG_BAKER_FACES = {
  0: {
    face_index: 0,
    score: 0,
    label: 'No Hurt',
    description: 'Very happy, no pain at all',
    color: '#00C853', // Green
    emoji: '😊'
  },
  1: {
    face_index: 1,
    score: 2,
    label: 'Hurts Little Bit',
    description: 'Minor discomfort, barely noticeable',
    color: '#AEEA00', // Light green
    emoji: '🙂'
  },
  2: {
    face_index: 2,
    score: 4,
    label: 'Hurts Little More',
    description: 'Mild pain, noticeable but tolerable',
    color: '#FFEB3B', // Yellow
    emoji: '😐'
  },
  3: {
    face_index: 3,
    score: 6,
    label: 'Hurts Even More',
    description: 'Moderate pain, uncomfortable',
    color: '#FF9800', // Orange
    emoji: '🙁'
  },
  4: {
    face_index: 4,
    score: 8,
    label: 'Hurts Whole Lot',
    description: 'Severe pain, very uncomfortable',
    color: '#FF5722', // Deep orange
    emoji: '😢'
  },
  5: {
    face_index: 5,
    score: 10,
    label: 'Hurts Worst',
    description: 'Worst pain imaginable, unbearable',
    color: '#F44336', // Red
    emoji: '😭'
  }
};

// Convert face index (0-5) to pain score (0, 2, 4, 6, 8, 10)
export const faceIndexToScore = (faceIndex) => {
  return faceIndex * 2;
};

// Convert pain score (0, 2, 4, 6, 8, 10) to face index (0-5)
export const scoreToFaceIndex = (score) => {
  return Math.floor(score / 2);
};

// Pain severity interpretation (same as NRS)
export const WONG_BAKER_PAIN_SEVERITY = {
  NO_PAIN: { min: 0, max: 0, label: 'No pain' },
  MILD: { min: 1, max: 3, label: 'Mild pain' },
  MODERATE: { min: 4, max: 6, label: 'Moderate pain' },
  SEVERE: { min: 7, max: 10, label: 'Severe pain' }
};

// Calculate pain severity from score
export const calculatePainSeverity = (score) => {
  if (score === 0) return 'NO_PAIN';
  if (score <= 3) return 'MILD';
  if (score <= 6) return 'MODERATE';
  return 'SEVERE';
};

// Target populations for Wong-Baker FACES
export const WONG_BAKER_TARGET_POPULATIONS = [
  'PEDIATRIC', // Children 3+ years
  'ADULT', // Adults who prefer visual scales
  'ELDERLY', // Elderly patients
  'LANGUAGE_BARRIER', // Patients with language difficulties
  'MILD_COGNITIVE_IMPAIRMENT' // Patients with mild cognitive issues who can still self-report
];

// Scale comprehension levels
export const WONG_BAKER_COMPREHENSION_LEVELS = [
  'GOOD', // Patient understood and used scale appropriately
  'FAIR', // Patient needed some guidance but was able to use scale
  'POOR', // Patient had difficulty understanding, may need alternative scale
  'UNABLE' // Patient unable to use scale, recommend alternative
];

// Non-pharmacological interventions appropriate for Wong-Baker populations
export const WONG_BAKER_NON_PHARM_INTERVENTIONS = [
  'REPOSITIONING',
  'MASSAGE',
  'HEAT',
  'COLD',
  'DISTRACTION',
  'MUSIC',
  'RELAXATION',
  'GUIDED_IMAGERY',
  'COMFORT_MEASURES',
  'SWADDLING', // Pediatric
  'PACIFIER', // Pediatric
  'PARENT_PRESENCE', // Pediatric
  'THERAPEUTIC_PLAY', // Pediatric
  'AROMATHERAPY',
  'ELEVATION',
  'OTHER'
];
