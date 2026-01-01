import { pgTable, bigint, integer, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * Numeric Rating Scale (NRS) Schema
 * Self-reported pain assessment tool using a 0-10 scale
 *
 * Designed for:
 * - Adult patients who can self-report
 * - Cognitively intact patients
 * - Patients who understand numeric concepts
 *
 * Score interpretation:
 * - 0 = No pain
 * - 1-3 = Mild pain
 * - 4-6 = Moderate pain
 * - 7-10 = Severe pain
 *
 * The gold standard for self-reported pain assessment in hospice care
 */
export const numeric_rating_scales = pgTable('numeric_rating_scales', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // Assessment metadata
  assessment_date: timestamp('assessment_date').defaultNow().notNull(),
  assessment_type: varchar('assessment_type', { length: 50 }), // INITIAL, FOLLOW_UP, REASSESSMENT, PRE_INTERVENTION, POST_INTERVENTION
  assessment_context: varchar('assessment_context', { length: 100 }), // ROUTINE, PRN, PRE_MEDICATION, POST_MEDICATION, PROCEDURE
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),

  // =========================================
  // NUMERIC RATING SCALE SCORING (0-10)
  // =========================================

  // Current pain score (0-10)
  // 0 = No pain at all
  // 1-3 = Mild pain (nagging, annoying, interfering little with ADLs)
  // 4-6 = Moderate pain (interferes significantly with ADLs)
  // 7-10 = Severe pain (disabling, unable to perform ADLs)
  pain_score: integer('pain_score').notNull(),

  // Patient-reported descriptor of pain quality
  pain_descriptor: varchar('pain_descriptor', { length: 100 }), // ACHING, SHARP, BURNING, STABBING, THROBBING, CRAMPING, DULL, OTHER

  // Additional pain score context (optional - commonly captured in NRS assessments)
  worst_pain_24h: integer('worst_pain_24h'), // Worst pain in last 24 hours (0-10)
  best_pain_24h: integer('best_pain_24h'), // Best/least pain in last 24 hours (0-10)
  average_pain_24h: integer('average_pain_24h'), // Average pain in last 24 hours (0-10)
  acceptable_pain_level: integer('acceptable_pain_level'), // Patient's acceptable pain level goal (0-10)

  // =========================================
  // PAIN INTERPRETATION
  // =========================================

  // Pain severity interpretation based on score
  pain_severity: varchar('pain_severity', { length: 50 }), // NO_PAIN, MILD, MODERATE, SEVERE

  // Pain is considered present if score >= 1
  pain_present: boolean('pain_present').default(false),

  // Patient-reported pain relief from last intervention (0-100%)
  relief_percentage: integer('relief_percentage'),

  // =========================================
  // CLINICAL CONTEXT
  // =========================================

  // Current pain status
  pain_status: varchar('pain_status', { length: 50 }), // ACUTE, CHRONIC, BREAKTHROUGH, POST_PROCEDURAL

  // Location of pain
  pain_location: varchar('pain_location', { length: 255 }),
  pain_location_notes: text('pain_location_notes'),

  // Radiation of pain
  pain_radiates: boolean('pain_radiates').default(false),
  radiation_location: varchar('radiation_location', { length: 255 }),

  // Suspected cause/source
  suspected_cause: varchar('suspected_cause', { length: 255 }),
  suspected_cause_notes: text('suspected_cause_notes'),

  // Duration and timing
  pain_duration: varchar('pain_duration', { length: 100 }), // CONSTANT, INTERMITTENT, BRIEF
  pain_onset: varchar('pain_onset', { length: 255 }), // Gradual, Sudden, etc.

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
  non_pharm_interventions: jsonb('non_pharm_interventions'), // Array: REPOSITIONING, MASSAGE, HEAT, COLD, RELAXATION, DISTRACTION, MUSIC, etc.

  // Time to reassess after intervention
  reassessment_time: timestamp('reassessment_time'),
  reassessment_score: integer('reassessment_score'),

  // Intervention effectiveness
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
  patientIdx: index('idx_nrs_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_nrs_assessment_date').on(table.assessment_date),
  painScoreIdx: index('idx_nrs_pain_score').on(table.pain_score),
  patientDateIdx: index('idx_nrs_patient_date').on(table.patient_id, table.assessment_date),
  patientScoreIdx: index('idx_nrs_patient_score').on(table.patient_id, table.pain_score),
  severityIdx: index('idx_nrs_severity').on(table.pain_severity),
}));

// Export scoring reference and constants
export const NRS_SCORE_DESCRIPTIONS = {
  0: 'No pain',
  1: 'Minimal pain - barely noticeable',
  2: 'Minor pain - does not interfere with activities',
  3: 'Noticeable pain - can be ignored',
  4: 'Moderate pain - can ignore if engaged in task',
  5: 'Moderately strong pain - cannot be ignored for long',
  6: 'Moderately strong pain - interferes with concentration',
  7: 'Severe pain - interferes with normal daily activities',
  8: 'Intense pain - difficult to do anything',
  9: 'Excruciating pain - cannot do anything',
  10: 'Unbearable pain - worst possible pain'
};

export const NRS_PAIN_SEVERITY = {
  NO_PAIN: { min: 0, max: 0, label: 'No pain' },
  MILD: { min: 1, max: 3, label: 'Mild pain' },
  MODERATE: { min: 4, max: 6, label: 'Moderate pain' },
  SEVERE: { min: 7, max: 10, label: 'Severe pain' }
};

export const NRS_PAIN_DESCRIPTORS = [
  'ACHING',
  'SHARP',
  'BURNING',
  'STABBING',
  'THROBBING',
  'CRAMPING',
  'DULL',
  'SHOOTING',
  'TINGLING',
  'PRESSURE',
  'OTHER'
];

export const NRS_NON_PHARM_INTERVENTIONS = [
  'REPOSITIONING',
  'MASSAGE',
  'HEAT',
  'COLD',
  'RELAXATION',
  'DISTRACTION',
  'MUSIC',
  'GUIDED_IMAGERY',
  'BREATHING_EXERCISES',
  'MEDITATION',
  'TENS',
  'AROMATHERAPY',
  'ELEVATION',
  'COMPRESSION',
  'OTHER'
];
