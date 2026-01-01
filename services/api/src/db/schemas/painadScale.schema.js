import { pgTable, bigint, integer, varchar, text, timestamp, boolean, jsonb, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';

/**
 * PAINAD Scale Schema
 * Pain Assessment in Advanced Dementia - Behavioral Pain Assessment Tool
 *
 * Designed for:
 * - Patients with advanced dementia who cannot self-report pain
 * - Non-verbal or cognitively impaired patients
 * - Hospice patients with cognitive decline
 *
 * Five behavioral categories, each scored 0-2:
 * 1. Breathing (independent of vocalization)
 * 2. Negative Vocalization
 * 3. Facial Expression
 * 4. Body Language
 * 5. Consolability
 *
 * Total score range: 0-10
 * - 0 = No pain
 * - 1-3 = Mild pain
 * - 4-6 = Moderate pain
 * - 7-10 = Severe pain
 *
 * Reference: Warden V, Hurley AC, Volicer L. (2003) Development and psychometric
 * evaluation of the Pain Assessment in Advanced Dementia (PAINAD) scale.
 * Journal of the American Medical Directors Association, 4(1), 9-15.
 */
export const painad_scales = pgTable('painad_scales', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  encounter_id: bigint('encounter_id', { mode: 'number' }),
  note_id: bigint('note_id', { mode: 'number' }),

  // Assessment metadata
  assessment_date: timestamp('assessment_date').defaultNow().notNull(),
  assessment_type: varchar('assessment_type', { length: 50 }), // INITIAL, FOLLOW_UP, REASSESSMENT, PRE_INTERVENTION, POST_INTERVENTION
  assessment_context: varchar('assessment_context', { length: 100 }), // ROUTINE, PRN, PRE_MEDICATION, POST_MEDICATION, DURING_CARE
  assessed_by_id: bigint('assessed_by_id', { mode: 'number' }),

  // Patient context for dementia assessment
  dementia_stage: varchar('dementia_stage', { length: 50 }), // MILD, MODERATE, SEVERE, END_STAGE
  dementia_type: varchar('dementia_type', { length: 100 }), // ALZHEIMERS, VASCULAR, LEWY_BODY, FRONTOTEMPORAL, MIXED, OTHER
  baseline_cognitive_status: varchar('baseline_cognitive_status', { length: 255 }),
  verbal_ability: varchar('verbal_ability', { length: 50 }), // VERBAL, LIMITED_VERBAL, NON_VERBAL

  // =========================================
  // PAINAD BEHAVIORAL SCORING (0-2 each)
  // =========================================

  // 1. Breathing (independent of vocalization) (0-2)
  // 0 = Normal
  // 1 = Occasional labored breathing, short period of hyperventilation
  // 2 = Noisy labored breathing, long period of hyperventilation, Cheyne-Stokes respirations
  breathing_score: integer('breathing_score').notNull(),
  breathing_observation: varchar('breathing_observation', { length: 255 }), // NORMAL, OCCASIONAL_LABORED, NOISY_LABORED
  breathing_notes: text('breathing_notes'),

  // 2. Negative Vocalization (0-2)
  // 0 = None
  // 1 = Occasional moan or groan, low-level speech with a negative or disapproving quality
  // 2 = Repeated troubled calling out, loud moaning or groaning, crying
  negative_vocalization_score: integer('negative_vocalization_score').notNull(),
  negative_vocalization_observation: varchar('negative_vocalization_observation', { length: 255 }), // NONE, OCCASIONAL_MOAN, REPEATED_CALLING
  negative_vocalization_notes: text('negative_vocalization_notes'),

  // 3. Facial Expression (0-2)
  // 0 = Smiling or inexpressive
  // 1 = Sad, frightened, frown
  // 2 = Facial grimacing
  facial_expression_score: integer('facial_expression_score').notNull(),
  facial_expression_observation: varchar('facial_expression_observation', { length: 255 }), // SMILING_INEXPRESSIVE, SAD_FRIGHTENED, GRIMACING
  facial_expression_notes: text('facial_expression_notes'),

  // 4. Body Language (0-2)
  // 0 = Relaxed
  // 1 = Tense, distressed pacing, fidgeting
  // 2 = Rigid, fists clenched, knees pulled up, pulling or pushing away, striking out
  body_language_score: integer('body_language_score').notNull(),
  body_language_observation: varchar('body_language_observation', { length: 255 }), // RELAXED, TENSE_FIDGETING, RIGID_STRIKING
  body_language_notes: text('body_language_notes'),

  // 5. Consolability (0-2)
  // 0 = No need to console
  // 1 = Distracted or reassured by voice or touch
  // 2 = Unable to console, distract, or reassure
  consolability_score: integer('consolability_score').notNull(),
  consolability_observation: varchar('consolability_observation', { length: 255 }), // NO_NEED, DISTRACTIBLE, UNABLE_TO_CONSOLE
  consolability_notes: text('consolability_notes'),

  // =========================================
  // TOTAL SCORE AND INTERPRETATION
  // =========================================

  // Total PAINAD Score (0-10)
  total_score: integer('total_score').notNull(),

  // Pain severity interpretation
  pain_severity: varchar('pain_severity', { length: 50 }), // NO_PAIN, MILD, MODERATE, SEVERE

  // Pain is considered present if score >= 1
  pain_present: boolean('pain_present').default(false),

  // =========================================
  // CLINICAL CONTEXT
  // =========================================

  // Current pain status
  pain_status: varchar('pain_status', { length: 50 }), // ACUTE, CHRONIC, BREAKTHROUGH, END_OF_LIFE

  // Location if pain identified (may be inferred from behaviors)
  suspected_pain_location: varchar('suspected_pain_location', { length: 255 }),
  suspected_pain_location_notes: text('suspected_pain_location_notes'),

  // Suspected cause (common in dementia patients)
  suspected_cause: varchar('suspected_cause', { length: 255 }), // ARTHRITIS, POSITIONING, CONSTIPATION, UTI, ORAL_PAIN, SKIN_BREAKDOWN, UNKNOWN
  suspected_cause_notes: text('suspected_cause_notes'),

  // Triggering activity (when pain behaviors observed)
  triggering_activity: varchar('triggering_activity', { length: 255 }), // AT_REST, DURING_TURNING, DURING_TRANSFERS, DURING_ADL, DURING_DRESSING
  triggering_activity_notes: text('triggering_activity_notes'),

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
  medication_route: varchar('medication_route', { length: 50 }), // ORAL, SL, TOPICAL, TRANSDERMAL, SQ, IM, IV, RECTAL
  medication_time: timestamp('medication_time'),

  // Non-pharmacological interventions (stored as array)
  non_pharm_interventions: jsonb('non_pharm_interventions'), // Array: REPOSITIONING, MASSAGE, HEAT, COLD, MUSIC, PRESENCE, DISTRACTION, AROMATHERAPY, etc.

  // Time to reassess after intervention
  reassessment_time: timestamp('reassessment_time'),
  reassessment_score: integer('reassessment_score'),

  // Intervention effectiveness
  intervention_effectiveness: varchar('intervention_effectiveness', { length: 50 }), // EFFECTIVE, PARTIALLY_EFFECTIVE, NOT_EFFECTIVE

  // =========================================
  // HOSPICE/DEMENTIA CARE SPECIFIC FIELDS
  // =========================================

  // Comfort-focused care (hospice-specific)
  comfort_goal_met: boolean('comfort_goal_met'),
  comfort_goal_notes: text('comfort_goal_notes'),

  // Behavioral baseline comparison
  behavior_change_from_baseline: varchar('behavior_change_from_baseline', { length: 50 }), // NO_CHANGE, MILD_CHANGE, SIGNIFICANT_CHANGE
  baseline_behavior_notes: text('baseline_behavior_notes'),

  // Family/caregiver involvement
  caregiver_present: boolean('caregiver_present'),
  caregiver_observations: text('caregiver_observations'),
  caregiver_education_provided: boolean('caregiver_education_provided'),
  caregiver_able_to_assess: boolean('caregiver_able_to_assess'),

  // Plan of care updates needed
  care_plan_update_needed: boolean('care_plan_update_needed'),
  care_plan_recommendations: text('care_plan_recommendations'),

  // Communication with family about pain management
  family_communication_notes: text('family_communication_notes'),

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
  patientIdx: index('idx_painad_scales_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_painad_scales_assessment_date').on(table.assessment_date),
  totalScoreIdx: index('idx_painad_scales_total_score').on(table.total_score),
  patientDateIdx: index('idx_painad_scales_patient_date').on(table.patient_id, table.assessment_date),
  patientScoreIdx: index('idx_painad_scales_patient_score').on(table.patient_id, table.total_score),
  dementiaStageIdx: index('idx_painad_scales_dementia_stage').on(table.dementia_stage),
  painSeverityIdx: index('idx_painad_scales_pain_severity').on(table.pain_severity),
}));

// Export score descriptions for use in controllers and frontend
export const PAINAD_SCORE_DESCRIPTIONS = {
  breathing: {
    0: 'Normal',
    1: 'Occasional labored breathing, short period of hyperventilation',
    2: 'Noisy labored breathing, long period of hyperventilation, Cheyne-Stokes respirations'
  },
  negative_vocalization: {
    0: 'None',
    1: 'Occasional moan or groan, low-level speech with a negative or disapproving quality',
    2: 'Repeated troubled calling out, loud moaning or groaning, crying'
  },
  facial_expression: {
    0: 'Smiling or inexpressive',
    1: 'Sad, frightened, frown',
    2: 'Facial grimacing'
  },
  body_language: {
    0: 'Relaxed',
    1: 'Tense, distressed pacing, fidgeting',
    2: 'Rigid, fists clenched, knees pulled up, pulling or pushing away, striking out'
  },
  consolability: {
    0: 'No need to console',
    1: 'Distracted or reassured by voice or touch',
    2: 'Unable to console, distract, or reassure'
  }
};

export const PAINAD_PAIN_SEVERITY = {
  NO_PAIN: { min: 0, max: 0, label: 'No pain' },
  MILD: { min: 1, max: 3, label: 'Mild pain' },
  MODERATE: { min: 4, max: 6, label: 'Moderate pain' },
  SEVERE: { min: 7, max: 10, label: 'Severe pain' }
};

export const PAINAD_DEMENTIA_STAGES = {
  MILD: 'Mild cognitive impairment - patient may still self-report some symptoms',
  MODERATE: 'Moderate dementia - limited verbal communication, relies on behavioral cues',
  SEVERE: 'Severe dementia - non-verbal, fully dependent on behavioral assessment',
  END_STAGE: 'End-stage dementia - minimal responsiveness, comfort-focused care'
};

export const PAINAD_COMMON_CAUSES = [
  'ARTHRITIS',
  'POSITIONING',
  'CONSTIPATION',
  'UTI',
  'ORAL_PAIN',
  'SKIN_BREAKDOWN',
  'CONTRACTURES',
  'FRACTURE',
  'NEUROPATHY',
  'UNKNOWN'
];

export const PAINAD_NON_PHARM_INTERVENTIONS = [
  'REPOSITIONING',
  'MASSAGE',
  'HEAT',
  'COLD',
  'MUSIC_THERAPY',
  'AROMATHERAPY',
  'PRESENCE',
  'DISTRACTION',
  'GENTLE_TOUCH',
  'VERBAL_REASSURANCE',
  'ENVIRONMENTAL_MODIFICATION',
  'RANGE_OF_MOTION',
  'SPLINTING',
  'OTHER'
];
