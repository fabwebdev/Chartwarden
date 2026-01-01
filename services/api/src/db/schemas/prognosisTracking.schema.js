import { pgTable, bigint, integer, varchar, decimal, timestamp, text, boolean, jsonb, date, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

// ============================================================================
// COMPREHENSIVE PROGNOSIS TRACKING SCHEMA
// ============================================================================
// Tracks patient prognosis information for hospice care, including:
// - Expected length of stay with date ranges
// - Disease progression status (improving, stable, deteriorating, critical)
// - Clinical indicators (vital signs trends, lab values, functional status)
// - Full version history to track prognosis changes over time
// - Links to patient records and specific diagnoses
// - HIPAA-compliant audit fields
// ============================================================================

/**
 * Prognosis Tracking - Comprehensive prognosis records with temporal tracking
 * Supports versioning/history to track how prognosis changes over time
 */
export const prognosis_tracking = pgTable('prognosis_tracking', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // =========================================
  // VERSION CONTROL
  // =========================================
  version: integer('version').default(1).notNull(),
  is_current: boolean('is_current').default(true).notNull(),
  previous_version_id: bigint('previous_version_id', { mode: 'number' }),
  superseded_at: timestamp('superseded_at'),
  superseded_by_id: text('superseded_by_id').references(() => users.id),
  superseded_reason: text('superseded_reason'),

  // =========================================
  // PROGNOSIS STATUS
  // =========================================
  prognosis_status: varchar('prognosis_status', { length: 50 }).default('ACTIVE').notNull(),
  // ACTIVE, UNDER_REVIEW, PROVISIONAL, FINALIZED, AMENDED, ARCHIVED

  // =========================================
  // EXPECTED LENGTH OF STAY
  // =========================================
  admission_date: date('admission_date'),
  expected_discharge_date: date('expected_discharge_date'),
  expected_length_of_stay_days: integer('expected_length_of_stay_days'),
  length_of_stay_range_min_days: integer('length_of_stay_range_min_days'),
  length_of_stay_range_max_days: integer('length_of_stay_range_max_days'),
  length_of_stay_confidence_level: varchar('length_of_stay_confidence_level', { length: 50 }),
  // HIGH, MODERATE, LOW, UNCERTAIN
  length_of_stay_notes: text('length_of_stay_notes'),

  // Hospice-specific prognosis fields
  prognosis_months: integer('prognosis_months'),
  prognosis_less_than_6_months: boolean('prognosis_less_than_6_months'),
  terminal_diagnosis_confirmed: boolean('terminal_diagnosis_confirmed'),
  terminal_diagnosis_date: date('terminal_diagnosis_date'),

  // =========================================
  // DISEASE PROGRESSION STATUS
  // =========================================
  disease_progression_status: varchar('disease_progression_status', { length: 50 }).notNull(),
  // IMPROVING, STABLE, SLOWLY_DECLINING, RAPIDLY_DECLINING, DETERIORATING, CRITICAL, ACTIVELY_DYING
  disease_progression_trend: varchar('disease_progression_trend', { length: 50 }),
  // UPWARD, STABLE, DOWNWARD, FLUCTUATING, UNKNOWN
  progression_rate: varchar('progression_rate', { length: 50 }),
  // SLOW, MODERATE, RAPID, VERY_RAPID
  progression_since_last_assessment: varchar('progression_since_last_assessment', { length: 50 }),
  // SIGNIFICANTLY_BETTER, SLIGHTLY_BETTER, STABLE, SLIGHTLY_WORSE, SIGNIFICANTLY_WORSE
  disease_progression_notes: text('disease_progression_notes'),

  // =========================================
  // CLINICAL INDICATORS
  // =========================================
  // Vital Signs Trends (summary from vital_signs table)
  vital_signs_trend: varchar('vital_signs_trend', { length: 50 }),
  // STABLE, DETERIORATING, IMPROVING, FLUCTUATING
  vital_signs_summary: jsonb('vital_signs_summary'),
  // {bp_trend, hr_trend, rr_trend, temp_trend, spo2_trend, pain_trend}
  vital_signs_last_assessment_date: timestamp('vital_signs_last_assessment_date'),

  // Lab Values
  lab_values_summary: jsonb('lab_values_summary'),
  // Array of {test_name, value, unit, trend, date, is_abnormal, clinical_significance}
  lab_values_trend: varchar('lab_values_trend', { length: 50 }),
  lab_values_last_date: date('lab_values_last_date'),

  // Functional Status Scores
  functional_status_score: integer('functional_status_score'),
  // 0-100 scale or specific scale value
  functional_status_scale: varchar('functional_status_scale', { length: 50 }),
  // PPS (Palliative Performance Scale), KPS (Karnofsky), ECOG, ADL, IADL
  functional_status_trend: varchar('functional_status_trend', { length: 50 }),
  // IMPROVING, STABLE, DECLINING
  previous_functional_score: integer('previous_functional_score'),
  functional_status_date: date('functional_status_date'),
  functional_status_notes: text('functional_status_notes'),

  // Palliative Performance Scale (PPS) specific fields
  pps_ambulation: varchar('pps_ambulation', { length: 100 }),
  // FULL, REDUCED, MAINLY_SIT_LIE, MAINLY_IN_BED, TOTALLY_BEDBOUND
  pps_activity_evidence_of_disease: varchar('pps_activity_evidence_of_disease', { length: 100 }),
  pps_self_care: varchar('pps_self_care', { length: 100 }),
  // FULL, OCCASIONAL_ASSISTANCE, CONSIDERABLE_ASSISTANCE, MAINLY_ASSISTANCE, TOTAL_CARE
  pps_intake: varchar('pps_intake', { length: 100 }),
  // NORMAL, REDUCED, MINIMAL, MOUTH_CARE_ONLY
  pps_conscious_level: varchar('pps_conscious_level', { length: 100 }),
  // FULL, FULL_OR_CONFUSION, FULL_OR_DROWSY, DROWSY_OR_COMA, COMA

  // =========================================
  // DIAGNOSIS INFORMATION
  // =========================================
  primary_diagnosis_icd10: varchar('primary_diagnosis_icd10', { length: 20 }),
  primary_diagnosis_description: text('primary_diagnosis_description'),
  secondary_diagnoses: jsonb('secondary_diagnoses'),
  // Array of {icd10, description, is_hospice_related, prognosis_impact}
  comorbidities: jsonb('comorbidities'),
  // Array of {condition, severity, impact_on_prognosis}
  diagnosis_related_prognosis_factors: text('diagnosis_related_prognosis_factors'),

  // =========================================
  // SYMPTOM BURDEN
  // =========================================
  symptom_burden_score: integer('symptom_burden_score'),
  // 0-100 composite score
  symptom_burden_level: varchar('symptom_burden_level', { length: 50 }),
  // LOW, MODERATE, HIGH, SEVERE
  primary_symptoms: jsonb('primary_symptoms'),
  // Array of {symptom, severity, frequency, impact_on_prognosis}
  symptom_management_effectiveness: varchar('symptom_management_effectiveness', { length: 50 }),
  // EXCELLENT, GOOD, FAIR, POOR, REFRACTORY

  // =========================================
  // IMMINENCE OF DEATH INDICATORS
  // =========================================
  is_imminently_dying: boolean('is_imminently_dying').default(false),
  imminence_level: varchar('imminence_level', { length: 50 }),
  // MONTHS, WEEKS, DAYS, HOURS
  imminence_indicators: jsonb('imminence_indicators'),
  // Array of signs/symptoms indicating imminent death
  imminence_assessment_date: timestamp('imminence_assessment_date'),
  days_to_death_estimate: integer('days_to_death_estimate'),
  hours_to_death_estimate: integer('hours_to_death_estimate'),

  // =========================================
  // PATIENT/FAMILY AWARENESS
  // =========================================
  patient_awareness_of_prognosis: varchar('patient_awareness_of_prognosis', { length: 50 }),
  // FULLY_AWARE, PARTIALLY_AWARE, UNAWARE, UNCLEAR
  family_awareness_of_prognosis: varchar('family_awareness_of_prognosis', { length: 50 }),
  prognosis_discussion_date: date('prognosis_discussion_date'),
  prognosis_discussed_with: jsonb('prognosis_discussed_with'),
  // Array of {person, relationship, understanding_level, date}
  goals_of_care_aligned: boolean('goals_of_care_aligned'),
  goals_of_care_notes: text('goals_of_care_notes'),

  // =========================================
  // CONFIDENCE AND UNCERTAINTY
  // =========================================
  overall_confidence_level: varchar('overall_confidence_level', { length: 50 }),
  // HIGH, MODERATE, LOW, VERY_LOW
  confidence_percentage: integer('confidence_percentage'),
  // 0-100 percentage
  uncertainty_factors: jsonb('uncertainty_factors'),
  // Array of factors contributing to uncertainty
  prediction_model_used: varchar('prediction_model_used', { length: 100 }),
  // CLINICAL_JUDGMENT, PPI, SURPRISE_QUESTION, COMBINED
  surprise_question_response: varchar('surprise_question_response', { length: 50 }),
  // YES_SURPRISED, NO_NOT_SURPRISED, UNCERTAIN

  // =========================================
  // COMPLICATIONS
  // =========================================
  complications: jsonb('complications'),
  // Array of {complication, date_occurred, severity, impact_on_prognosis, resolved}
  unexpected_events: text('unexpected_events'),
  prognosis_modifying_factors: jsonb('prognosis_modifying_factors'),
  // Array of factors that could modify prognosis

  // =========================================
  // REVIEW AND REASSESSMENT
  // =========================================
  last_review_date: timestamp('last_review_date'),
  next_review_date: timestamp('next_review_date'),
  review_frequency_days: integer('review_frequency_days'),
  review_notes: text('review_notes'),
  requires_idg_review: boolean('requires_idg_review').default(false),
  idg_review_date: date('idg_review_date'),
  idg_review_outcome: text('idg_review_outcome'),

  // =========================================
  // CLINICAL NOTES
  // =========================================
  clinical_summary: text('clinical_summary'),
  prognosis_rationale: text('prognosis_rationale'),
  treatment_response: text('treatment_response'),
  additional_notes: text('additional_notes'),

  // =========================================
  // ELECTRONIC SIGNATURE (21 CFR Part 11)
  // =========================================
  signature: jsonb('signature'),
  signed_at: timestamp('signed_at'),
  signed_by_id: text('signed_by_id').references(() => users.id),
  cosignature: jsonb('cosignature'),
  cosigned_at: timestamp('cosigned_at'),
  cosigned_by_id: text('cosigned_by_id').references(() => users.id),
  requires_physician_signature: boolean('requires_physician_signature').default(true),
  physician_signature_date: date('physician_signature_date'),

  // =========================================
  // AUDIT FIELDS (HIPAA Compliance)
  // =========================================
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Single column indexes
  patientIdx: index('idx_prognosis_tracking_patient_id').on(table.patient_id),
  statusIdx: index('idx_prognosis_tracking_status').on(table.prognosis_status),
  currentIdx: index('idx_prognosis_tracking_is_current').on(table.is_current),
  progressionIdx: index('idx_prognosis_tracking_progression').on(table.disease_progression_status),
  imminentIdx: index('idx_prognosis_tracking_imminent').on(table.is_imminently_dying),

  // Composite indexes for common query patterns
  patientCurrentIdx: index('idx_prognosis_tracking_patient_current').on(table.patient_id, table.is_current),
  patientVersionIdx: index('idx_prognosis_tracking_patient_version').on(table.patient_id, table.version),
  patientCreatedIdx: index('idx_prognosis_tracking_patient_created').on(table.patient_id, table.createdAt),
  progressionTrendIdx: index('idx_prognosis_tracking_progression_trend').on(table.disease_progression_status, table.disease_progression_trend),
  reviewDateIdx: index('idx_prognosis_tracking_review_date').on(table.next_review_date),
}));

/**
 * Prognosis History - Audit trail of all prognosis changes
 * Immutable records for compliance and analysis
 */
export const prognosis_history = pgTable('prognosis_history', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  prognosis_tracking_id: bigint('prognosis_tracking_id', { mode: 'number' }).references(() => prognosis_tracking.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Change tracking
  change_type: varchar('change_type', { length: 50 }).notNull(),
  // CREATE, UPDATE, STATUS_CHANGE, PROGRESSION_CHANGE, REVIEW, SIGNATURE, ARCHIVE
  change_date: timestamp('change_date').defaultNow().notNull(),
  changed_by_id: text('changed_by_id').references(() => users.id),
  changed_by_name: varchar('changed_by_name', { length: 255 }),
  changed_by_role: varchar('changed_by_role', { length: 100 }),

  // Previous and new values
  field_changed: varchar('field_changed', { length: 100 }),
  previous_value: text('previous_value'),
  new_value: text('new_value'),
  change_reason: text('change_reason'),

  // Snapshot of key fields at time of change
  snapshot: jsonb('snapshot'),
  // Complete snapshot of prognosis state at time of change

  // Clinical context
  clinical_context: text('clinical_context'),
  triggering_event: varchar('triggering_event', { length: 255 }),
  // e.g., "Unexpected complication", "IDG review", "Routine reassessment"

  // Audit fields
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  prognosisIdx: index('idx_prognosis_history_prognosis_id').on(table.prognosis_tracking_id),
  patientIdx: index('idx_prognosis_history_patient_id').on(table.patient_id),
  changeDateIdx: index('idx_prognosis_history_change_date').on(table.change_date),
  changeTypeIdx: index('idx_prognosis_history_change_type').on(table.change_type),
  changedByIdx: index('idx_prognosis_history_changed_by').on(table.changed_by_id),
  patientDateIdx: index('idx_prognosis_history_patient_date').on(table.patient_id, table.change_date),
}));

/**
 * Prognosis Clinical Indicators - Detailed clinical indicator tracking
 * Supports trend analysis over time
 */
export const prognosis_clinical_indicators = pgTable('prognosis_clinical_indicators', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  prognosis_tracking_id: bigint('prognosis_tracking_id', { mode: 'number' }).references(() => prognosis_tracking.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Indicator identification
  indicator_type: varchar('indicator_type', { length: 50 }).notNull(),
  // VITAL_SIGN, LAB_VALUE, FUNCTIONAL_SCORE, SYMPTOM, WEIGHT, NUTRITION, COGNITION
  indicator_name: varchar('indicator_name', { length: 100 }).notNull(),
  indicator_code: varchar('indicator_code', { length: 50 }),
  // LOINC, SNOMED, or internal code

  // Measurement
  measurement_date: timestamp('measurement_date').notNull(),
  value_numeric: decimal('value_numeric', { precision: 10, scale: 4 }),
  value_text: varchar('value_text', { length: 255 }),
  value_unit: varchar('value_unit', { length: 50 }),

  // Reference ranges
  normal_range_low: decimal('normal_range_low', { precision: 10, scale: 4 }),
  normal_range_high: decimal('normal_range_high', { precision: 10, scale: 4 }),
  critical_range_low: decimal('critical_range_low', { precision: 10, scale: 4 }),
  critical_range_high: decimal('critical_range_high', { precision: 10, scale: 4 }),
  is_abnormal: boolean('is_abnormal').default(false),
  is_critical: boolean('is_critical').default(false),
  abnormality_direction: varchar('abnormality_direction', { length: 20 }),
  // HIGH, LOW, CRITICAL_HIGH, CRITICAL_LOW

  // Trend analysis
  trend_direction: varchar('trend_direction', { length: 50 }),
  // IMPROVING, STABLE, WORSENING, FLUCTUATING
  trend_rate: varchar('trend_rate', { length: 50 }),
  // SLOW, MODERATE, RAPID
  previous_value: decimal('previous_value', { precision: 10, scale: 4 }),
  change_percentage: decimal('change_percentage', { precision: 6, scale: 2 }),
  days_since_previous: integer('days_since_previous'),

  // Clinical significance
  clinical_significance: varchar('clinical_significance', { length: 50 }),
  // LOW, MODERATE, HIGH, CRITICAL
  prognosis_impact: varchar('prognosis_impact', { length: 50 }),
  // POSITIVE, NEUTRAL, NEGATIVE, UNCERTAIN
  notes: text('notes'),

  // Source
  source_system: varchar('source_system', { length: 100 }),
  source_record_id: varchar('source_record_id', { length: 255 }),
  recorded_by_id: text('recorded_by_id').references(() => users.id),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  prognosisIdx: index('idx_prognosis_indicators_prognosis_id').on(table.prognosis_tracking_id),
  patientIdx: index('idx_prognosis_indicators_patient_id').on(table.patient_id),
  typeIdx: index('idx_prognosis_indicators_type').on(table.indicator_type),
  dateIdx: index('idx_prognosis_indicators_date').on(table.measurement_date),
  abnormalIdx: index('idx_prognosis_indicators_abnormal').on(table.is_abnormal),
  criticalIdx: index('idx_prognosis_indicators_critical').on(table.is_critical),
  patientTypeDateIdx: index('idx_prognosis_indicators_patient_type_date').on(table.patient_id, table.indicator_type, table.measurement_date),
}));

/**
 * Prognosis Outcome Tracking - For retrospective analysis
 * Links prognoses to actual outcomes for quality improvement
 */
export const prognosis_outcomes = pgTable('prognosis_outcomes', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  prognosis_tracking_id: bigint('prognosis_tracking_id', { mode: 'number' }).references(() => prognosis_tracking.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Outcome details
  outcome_type: varchar('outcome_type', { length: 50 }).notNull(),
  // DEATH, DISCHARGE_ALIVE, TRANSFER, REVOCATION, ONGOING
  outcome_date: date('outcome_date'),
  outcome_location: varchar('outcome_location', { length: 100 }),
  // HOME, HOSPITAL, FACILITY, OTHER

  // Prognosis accuracy analysis
  prognosis_date: date('prognosis_date').notNull(),
  predicted_los_days: integer('predicted_los_days'),
  actual_los_days: integer('actual_los_days'),
  los_variance_days: integer('los_variance_days'),
  los_accuracy_category: varchar('los_accuracy_category', { length: 50 }),
  // ACCURATE, UNDERESTIMATED, OVERESTIMATED

  predicted_imminence_level: varchar('predicted_imminence_level', { length: 50 }),
  actual_time_to_outcome_days: integer('actual_time_to_outcome_days'),
  imminence_accuracy_category: varchar('imminence_accuracy_category', { length: 50 }),

  // Quality metrics
  symptom_management_at_end: varchar('symptom_management_at_end', { length: 50 }),
  // EXCELLENT, GOOD, FAIR, POOR
  family_satisfaction: varchar('family_satisfaction', { length: 50 }),
  goals_achieved: boolean('goals_achieved'),
  unexpected_events_occurred: boolean('unexpected_events_occurred'),
  unexpected_events_description: text('unexpected_events_description'),

  // Analysis notes
  analysis_notes: text('analysis_notes'),
  lessons_learned: text('lessons_learned'),
  analyzed_by_id: text('analyzed_by_id').references(() => users.id),
  analysis_date: timestamp('analysis_date'),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  prognosisIdx: index('idx_prognosis_outcomes_prognosis_id').on(table.prognosis_tracking_id),
  patientIdx: index('idx_prognosis_outcomes_patient_id').on(table.patient_id),
  outcomeTypeIdx: index('idx_prognosis_outcomes_type').on(table.outcome_type),
  outcomeDateIdx: index('idx_prognosis_outcomes_date').on(table.outcome_date),
  accuracyIdx: index('idx_prognosis_outcomes_accuracy').on(table.los_accuracy_category),
}));

// ============================================================================
// ENUMS AND CONSTANTS
// ============================================================================

// Disease Progression Status
export const DISEASE_PROGRESSION_STATUS = {
  IMPROVING: 'IMPROVING',
  STABLE: 'STABLE',
  SLOWLY_DECLINING: 'SLOWLY_DECLINING',
  RAPIDLY_DECLINING: 'RAPIDLY_DECLINING',
  DETERIORATING: 'DETERIORATING',
  CRITICAL: 'CRITICAL',
  ACTIVELY_DYING: 'ACTIVELY_DYING',
};

// Progression Trend
export const PROGRESSION_TREND = {
  UPWARD: 'UPWARD',
  STABLE: 'STABLE',
  DOWNWARD: 'DOWNWARD',
  FLUCTUATING: 'FLUCTUATING',
  UNKNOWN: 'UNKNOWN',
};

// Prognosis Status
export const PROGNOSIS_STATUS = {
  ACTIVE: 'ACTIVE',
  UNDER_REVIEW: 'UNDER_REVIEW',
  PROVISIONAL: 'PROVISIONAL',
  FINALIZED: 'FINALIZED',
  AMENDED: 'AMENDED',
  ARCHIVED: 'ARCHIVED',
};

// Confidence Levels
export const CONFIDENCE_LEVELS = {
  HIGH: 'HIGH',
  MODERATE: 'MODERATE',
  LOW: 'LOW',
  VERY_LOW: 'VERY_LOW',
};

// Imminence Levels
export const IMMINENCE_LEVELS = {
  MONTHS: 'MONTHS',
  WEEKS: 'WEEKS',
  DAYS: 'DAYS',
  HOURS: 'HOURS',
};

// Functional Status Scales
export const FUNCTIONAL_STATUS_SCALES = {
  PPS: 'PPS', // Palliative Performance Scale
  KPS: 'KPS', // Karnofsky Performance Status
  ECOG: 'ECOG', // Eastern Cooperative Oncology Group
  ADL: 'ADL', // Activities of Daily Living
  IADL: 'IADL', // Instrumental Activities of Daily Living
};

// Clinical Indicator Types
export const CLINICAL_INDICATOR_TYPES = {
  VITAL_SIGN: 'VITAL_SIGN',
  LAB_VALUE: 'LAB_VALUE',
  FUNCTIONAL_SCORE: 'FUNCTIONAL_SCORE',
  SYMPTOM: 'SYMPTOM',
  WEIGHT: 'WEIGHT',
  NUTRITION: 'NUTRITION',
  COGNITION: 'COGNITION',
};

// PPS Score Mapping (Palliative Performance Scale)
export const PPS_SCORES = {
  100: { ambulation: 'FULL', activity: 'NORMAL', self_care: 'FULL', intake: 'NORMAL', conscious: 'FULL' },
  90: { ambulation: 'FULL', activity: 'NORMAL_WITH_EFFORT', self_care: 'FULL', intake: 'NORMAL', conscious: 'FULL' },
  80: { ambulation: 'FULL', activity: 'WITH_EFFORT', self_care: 'FULL', intake: 'NORMAL_OR_REDUCED', conscious: 'FULL' },
  70: { ambulation: 'REDUCED', activity: 'UNABLE_TO_DO_WORK', self_care: 'FULL', intake: 'NORMAL_OR_REDUCED', conscious: 'FULL' },
  60: { ambulation: 'REDUCED', activity: 'UNABLE_TO_DO_HOBBIES', self_care: 'OCCASIONAL_ASSISTANCE', intake: 'NORMAL_OR_REDUCED', conscious: 'FULL_OR_CONFUSION' },
  50: { ambulation: 'MAINLY_SIT_LIE', activity: 'UNABLE_TO_DO_ANY', self_care: 'CONSIDERABLE_ASSISTANCE', intake: 'NORMAL_OR_REDUCED', conscious: 'FULL_OR_CONFUSION' },
  40: { ambulation: 'MAINLY_IN_BED', activity: 'UNABLE_TO_DO_ANY', self_care: 'MAINLY_ASSISTANCE', intake: 'NORMAL_OR_REDUCED', conscious: 'FULL_OR_DROWSY' },
  30: { ambulation: 'TOTALLY_BEDBOUND', activity: 'UNABLE_TO_DO_ANY', self_care: 'TOTAL_CARE', intake: 'REDUCED', conscious: 'FULL_OR_DROWSY' },
  20: { ambulation: 'TOTALLY_BEDBOUND', activity: 'UNABLE_TO_DO_ANY', self_care: 'TOTAL_CARE', intake: 'MINIMAL', conscious: 'FULL_OR_DROWSY' },
  10: { ambulation: 'TOTALLY_BEDBOUND', activity: 'UNABLE_TO_DO_ANY', self_care: 'TOTAL_CARE', intake: 'MOUTH_CARE', conscious: 'DROWSY_OR_COMA' },
  0: { ambulation: 'DEATH', activity: 'DEATH', self_care: 'DEATH', intake: 'DEATH', conscious: 'DEATH' },
};
