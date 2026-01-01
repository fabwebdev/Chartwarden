import { pgTable, bigint, integer, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * FLACC Scale Schema
 * Face, Legs, Activity, Cry, Consolability - Pain Assessment Tool
 *
 * Designed for:
 * - Pediatric patients (2 months to 7 years)
 * - Non-verbal patients
 * - Cognitively impaired patients
 * - Sedated or intubated patients
 *
 * Each behavioral category is scored 0-2:
 * - 0 = No pain behavior / relaxed
 * - 1 = Mild pain behavior / occasional discomfort
 * - 2 = Significant pain behavior / consistent discomfort
 *
 * Total score range: 0-10
 * - 0 = No pain / relaxed
 * - 1-3 = Mild discomfort
 * - 4-6 = Moderate pain
 * - 7-10 = Severe pain
 */
export const flacc_scales = pgTable('flacc_scales', {
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
  patient_population: varchar('patient_population', { length: 50 }), // PEDIATRIC, NON_VERBAL_ADULT, COGNITIVELY_IMPAIRED, SEDATED, INTUBATED
  patient_age_months: integer('patient_age_months'), // For pediatric - age in months for appropriate scoring context

  // =========================================
  // FLACC BEHAVIORAL SCORING (0-2 each)
  // =========================================

  // Face (0-2)
  // 0 = No particular expression or smile
  // 1 = Occasional grimace or frown, withdrawn, disinterested
  // 2 = Frequent to constant quivering chin, clenched jaw
  face_score: integer('face_score').notNull(),
  face_observation: varchar('face_observation', { length: 255 }), // NO_EXPRESSION, OCCASIONAL_GRIMACE, FREQUENT_GRIMACE
  face_notes: text('face_notes'),

  // Legs (0-2)
  // 0 = Normal position or relaxed
  // 1 = Uneasy, restless, tense
  // 2 = Kicking, or legs drawn up
  legs_score: integer('legs_score').notNull(),
  legs_observation: varchar('legs_observation', { length: 255 }), // RELAXED, RESTLESS, KICKING
  legs_notes: text('legs_notes'),

  // Activity (0-2)
  // 0 = Lying quietly, normal position, moves easily
  // 1 = Squirming, shifting back and forth, tense
  // 2 = Arched, rigid or jerking
  activity_score: integer('activity_score').notNull(),
  activity_observation: varchar('activity_observation', { length: 255 }), // LYING_QUIETLY, SQUIRMING, ARCHED_RIGID
  activity_notes: text('activity_notes'),

  // Cry (0-2)
  // 0 = No cry (awake or asleep)
  // 1 = Moans or whimpers, occasional complaint
  // 2 = Crying steadily, screams or sobs, frequent complaints
  cry_score: integer('cry_score').notNull(),
  cry_observation: varchar('cry_observation', { length: 255 }), // NO_CRY, MOANS_WHIMPERS, CRYING_SCREAMING
  cry_notes: text('cry_notes'),

  // Consolability (0-2)
  // 0 = Content, relaxed
  // 1 = Reassured by occasional touching, hugging or being talked to, distractible
  // 2 = Difficult to console or comfort
  consolability_score: integer('consolability_score').notNull(),
  consolability_observation: varchar('consolability_observation', { length: 255 }), // CONTENT, DISTRACTIBLE, DIFFICULT_TO_CONSOLE
  consolability_notes: text('consolability_notes'),

  // =========================================
  // TOTAL SCORE AND INTERPRETATION
  // =========================================

  // Total FLACC Score (0-10)
  total_score: integer('total_score').notNull(),

  // Pain severity interpretation
  pain_severity: varchar('pain_severity', { length: 50 }), // NO_PAIN, MILD, MODERATE, SEVERE

  // Pain is considered present if score >= 1
  pain_present: boolean('pain_present').default(false),

  // =========================================
  // CLINICAL CONTEXT
  // =========================================

  // Current pain status
  pain_status: varchar('pain_status', { length: 50 }), // ACUTE, CHRONIC, BREAKTHROUGH, POST_PROCEDURAL

  // Location if pain identified
  pain_location: varchar('pain_location', { length: 255 }),
  pain_location_notes: text('pain_location_notes'),

  // Suspected cause
  suspected_cause: varchar('suspected_cause', { length: 255 }),
  suspected_cause_notes: text('suspected_cause_notes'),

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
  medication_route: varchar('medication_route', { length: 50 }), // ORAL, IV, IM, SQ, RECTAL, TOPICAL
  medication_time: timestamp('medication_time'),

  // Non-pharmacological interventions (stored as array)
  non_pharm_interventions: jsonb('non_pharm_interventions'), // Array: REPOSITIONING, COMFORT_HOLD, SWADDLING, DISTRACTION, PACIFIER, MUSIC, MASSAGE, etc.

  // Time to reassess after intervention
  reassessment_time: timestamp('reassessment_time'),
  reassessment_score: integer('reassessment_score'),

  // Intervention effectiveness (0-10 scale or qualitative)
  intervention_effectiveness: varchar('intervention_effectiveness', { length: 50 }), // EFFECTIVE, PARTIALLY_EFFECTIVE, NOT_EFFECTIVE

  // =========================================
  // HOSPICE CARE SPECIFIC FIELDS
  // =========================================

  // Comfort measures focused (hospice-specific)
  comfort_goal_met: boolean('comfort_goal_met'),
  comfort_goal_notes: text('comfort_goal_notes'),

  // Family/caregiver involvement
  caregiver_present: boolean('caregiver_present'),
  caregiver_observations: text('caregiver_observations'),
  caregiver_education_provided: boolean('caregiver_education_provided'),

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
  patientIdx: index('idx_flacc_scales_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_flacc_scales_assessment_date').on(table.assessment_date),
  totalScoreIdx: index('idx_flacc_scales_total_score').on(table.total_score),
  patientDateIdx: index('idx_flacc_scales_patient_date').on(table.patient_id, table.assessment_date),
  patientScoreIdx: index('idx_flacc_scales_patient_score').on(table.patient_id, table.total_score),
  populationIdx: index('idx_flacc_scales_population').on(table.patient_population),
}));

// Export type for use in controllers
export const FLACC_SCORE_DESCRIPTIONS = {
  face: {
    0: 'No particular expression or smile',
    1: 'Occasional grimace or frown, withdrawn, disinterested',
    2: 'Frequent to constant quivering chin, clenched jaw'
  },
  legs: {
    0: 'Normal position or relaxed',
    1: 'Uneasy, restless, tense',
    2: 'Kicking, or legs drawn up'
  },
  activity: {
    0: 'Lying quietly, normal position, moves easily',
    1: 'Squirming, shifting back and forth, tense',
    2: 'Arched, rigid or jerking'
  },
  cry: {
    0: 'No cry (awake or asleep)',
    1: 'Moans or whimpers, occasional complaint',
    2: 'Crying steadily, screams or sobs, frequent complaints'
  },
  consolability: {
    0: 'Content, relaxed',
    1: 'Reassured by occasional touching, hugging or being talked to, distractible',
    2: 'Difficult to console or comfort'
  }
};

export const FLACC_PAIN_SEVERITY = {
  NO_PAIN: { min: 0, max: 0, label: 'No pain / relaxed' },
  MILD: { min: 1, max: 3, label: 'Mild discomfort' },
  MODERATE: { min: 4, max: 6, label: 'Moderate pain' },
  SEVERE: { min: 7, max: 10, label: 'Severe pain' }
};
