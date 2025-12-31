import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, index, date } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';

// ============================================================================
// HOPE 2.0 (Hospice Outcomes and Patient Evaluation) Assessment Tables
// ============================================================================
// CMS HOPE 2.0 compliant assessment schema effective October 1, 2025
// Replaces HIS (Hospice Item Set) for quality reporting
// Sections: A (Admin), F (Preferences), I (Diagnoses), J (Health Conditions),
//           M (Skin Conditions), N (Medications), Z (Record Admin)
// Non-compliance can result in 4% Medicare payment reduction
// ============================================================================

/**
 * HOPE Assessments V2 - Main assessment table
 * Types: ADMISSION (within 5 days), HUV1 (days 6-15), HUV2 (days 16-30), DISCHARGE
 */
export const hope_assessments = pgTable('hope_assessments', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Assessment metadata
  assessment_type: varchar('assessment_type', { length: 50 }).notNull(), // ADMISSION, HUV1, HUV2, DISCHARGE
  assessment_status: varchar('assessment_status', { length: 50 }).default('NOT_STARTED').notNull(), // NOT_STARTED, IN_PROGRESS, COMPLETED, SIGNED, SUBMITTED, ACCEPTED, REJECTED, OVERDUE
  assessment_date: timestamp('assessment_date').notNull(),
  due_date: timestamp('due_date'),
  completed_date: timestamp('completed_date'),
  hospice_stay_id: bigint('hospice_stay_id', { mode: 'number' }), // Links to hospice admission episode

  // ============================================================================
  // SECTION A: Administrative Information
  // ============================================================================
  // A0050: Type of Record
  a0050_record_type: varchar('a0050_record_type', { length: 20 }), // 1=Add, 2=Modify, 3=Inactivate
  // A0100: Facility Provider Numbers
  a0100a_npi: varchar('a0100a_npi', { length: 20 }), // National Provider Identifier
  a0100b_cms_certification_number: varchar('a0100b_cms_certification_number', { length: 20 }), // CCN
  // A0200: Type of Assessment
  a0200_assessment_type_code: varchar('a0200_assessment_type_code', { length: 20 }), // 01=Admission, 02=HUV, 09=Discharge
  // A0220: Admission Date
  a0220_admission_date: date('a0220_admission_date'),
  // A0250: Reason for Assessment
  a0250_assessment_reason: varchar('a0250_assessment_reason', { length: 50 }), // 01=Admission, 02=Scheduled, 03=Unscheduled
  // A0270: Discharge Date
  a0270_discharge_date: date('a0270_discharge_date'),
  // A0310: HOPE Assessment Reference Date
  a0310_assessment_reference_date: date('a0310_assessment_reference_date').notNull(),
  // A0410: Unit of Service
  a0410_unit_of_service: varchar('a0410_unit_of_service', { length: 20 }), // 01=Routine Home Care, 02=Continuous Home Care, etc.
  // A1005: Ethnicity
  a1005_ethnicity: varchar('a1005_ethnicity', { length: 50 }), // A=Hispanic, B=Not Hispanic, C=Unknown
  // A1010: Race
  a1010_race: jsonb('a1010_race'), // Array of race codes (A-F)
  // A1110: Language
  a1110a_primary_language: varchar('a1110a_primary_language', { length: 100 }),
  a1110b_language_need_interpreter: boolean('a1110b_language_need_interpreter'),

  // ============================================================================
  // SECTION F: Preferences for Customary Routine and Activities
  // ============================================================================
  // F2100: Life Story/Goals
  f2100_life_story_discussed: boolean('f2100_life_story_discussed'),
  f2100_goals_documented: boolean('f2100_goals_documented'),
  // F2200: Hospitalization Preference
  f2200_hospitalization_preference: varchar('f2200_hospitalization_preference', { length: 50 }), // 0=No preference, 1=Prefer hospital, 2=Prefer home, 9=Unknown
  f2200_preference_documented: boolean('f2200_preference_documented'),
  f2200_preference_date: timestamp('f2200_preference_date'),
  // F2300: Code Status/Advance Directives
  f2300_code_status: varchar('f2300_code_status', { length: 50 }), // DNR, FULL_CODE, LIMITED_CODE
  f2300_advance_directive_exists: boolean('f2300_advance_directive_exists'),
  f2300_polst_exists: boolean('f2300_polst_exists'),
  f2300_healthcare_proxy: boolean('f2300_healthcare_proxy'),
  // F3000: Spiritual/Existential Concerns
  f3000_spiritual_concerns_present: boolean('f3000_spiritual_concerns_present'),
  f3000_spiritual_needs_addressed: boolean('f3000_spiritual_needs_addressed'),
  f3000_chaplain_referral: boolean('f3000_chaplain_referral'),
  f3000_spiritual_assessment: text('f3000_spiritual_assessment'),
  // F3100: Caregiver Assessment
  f3100_caregiver_available: boolean('f3100_caregiver_available'),
  f3100_caregiver_relationship: varchar('f3100_caregiver_relationship', { length: 100 }),
  f3100_caregiver_hours_per_week: integer('f3100_caregiver_hours_per_week'),
  f3100_caregiver_support_adequate: boolean('f3100_caregiver_support_adequate'),
  f3100_caregiver_stress_level: varchar('f3100_caregiver_stress_level', { length: 50 }), // NONE, MILD, MODERATE, SEVERE
  f3100_caregiver_training_needed: boolean('f3100_caregiver_training_needed'),
  f3100_caregiver_assessment_notes: text('f3100_caregiver_assessment_notes'),

  // ============================================================================
  // SECTION I: Active Diagnoses
  // ============================================================================
  // I0010: Principal Diagnosis
  i0010_principal_diagnosis_icd10: varchar('i0010_principal_diagnosis_icd10', { length: 20 }).notNull(),
  i0010_principal_diagnosis_description: text('i0010_principal_diagnosis_description'),
  // I0020: Other Diagnoses
  i0020_other_diagnoses: jsonb('i0020_other_diagnoses'), // Array of {icd10, description, is_related}
  // I0100: Cancer Diagnosis Details
  i0100_cancer_primary_site: varchar('i0100_cancer_primary_site', { length: 100 }),
  i0100_cancer_stage: varchar('i0100_cancer_stage', { length: 50 }),
  i0100_cancer_metastatic: boolean('i0100_cancer_metastatic'),
  i0100_cancer_metastatic_sites: jsonb('i0100_cancer_metastatic_sites'), // Array of metastatic sites
  // I0200: Comorbidities
  i0200_comorbidities: jsonb('i0200_comorbidities'), // Array of comorbid conditions
  // I0300: Prognosis Indicator
  i0300_prognosis_months: integer('i0300_prognosis_months'),

  // ============================================================================
  // SECTION J: Health Conditions
  // ============================================================================
  // J0100: Pain Assessment (0-10 scale)
  j0100_pain_presence: varchar('j0100_pain_presence', { length: 20 }), // 0=No, 1=Yes, 9=Unable
  j0100_pain_frequency: varchar('j0100_pain_frequency', { length: 50 }), // 0=No pain, 1=Less than daily, 2=Daily, 3=Constant
  j0100_pain_severity_current: integer('j0100_pain_severity_current'), // 0-10
  j0100_pain_severity_worst: integer('j0100_pain_severity_worst'), // 0-10
  j0100_pain_interference: integer('j0100_pain_interference'), // 0-10
  j0100_pain_acceptable_level: integer('j0100_pain_acceptable_level'),
  // J0200: Pain Site Information
  j0200_pain_sites: jsonb('j0200_pain_sites'), // Array of {site, type, description}
  // J0300: Pain Management
  j0300_pain_med_effectiveness: varchar('j0300_pain_med_effectiveness', { length: 50 }), // 0=Not effective, 1=Partially, 2=Mostly, 3=Fully
  j0300_nonpharm_interventions: jsonb('j0300_nonpharm_interventions'),
  // J0500: Shortness of Breath (Dyspnea)
  j0500_dyspnea_presence: boolean('j0500_dyspnea_presence'),
  j0500_dyspnea_severity: varchar('j0500_dyspnea_severity', { length: 50 }), // NONE, MILD, MODERATE, SEVERE
  j0500_dyspnea_at_rest: boolean('j0500_dyspnea_at_rest'),
  j0500_dyspnea_with_activity: boolean('j0500_dyspnea_with_activity'),
  j0500_dyspnea_frequency: varchar('j0500_dyspnea_frequency', { length: 50 }),
  // J0600: Nausea/Vomiting
  j0600_nausea_presence: boolean('j0600_nausea_presence'),
  j0600_nausea_severity: varchar('j0600_nausea_severity', { length: 50 }),
  j0600_nausea_frequency: varchar('j0600_nausea_frequency', { length: 50 }),
  j0600_vomiting_presence: boolean('j0600_vomiting_presence'),
  j0600_vomiting_frequency: varchar('j0600_vomiting_frequency', { length: 50 }),
  // J0700: Constipation
  j0700_constipation_presence: boolean('j0700_constipation_presence'),
  j0700_constipation_severity: varchar('j0700_constipation_severity', { length: 50 }),
  j0700_bowel_program: boolean('j0700_bowel_program'),
  j0700_last_bowel_movement: date('j0700_last_bowel_movement'),
  // J0800: Fatigue/Weakness
  j0800_fatigue_presence: boolean('j0800_fatigue_presence'),
  j0800_fatigue_severity: varchar('j0800_fatigue_severity', { length: 50 }),
  j0800_fatigue_interference: integer('j0800_fatigue_interference'), // 0-10
  // J0900: Appetite/Nutrition
  j0900_appetite_status: varchar('j0900_appetite_status', { length: 50 }), // GOOD, FAIR, POOR, NONE
  j0900_weight_change: varchar('j0900_weight_change', { length: 50 }), // STABLE, GAINING, LOSING
  j0900_oral_intake_status: varchar('j0900_oral_intake_status', { length: 50 }),
  j0900_nutritional_concerns: text('j0900_nutritional_concerns'),
  // J1000: Anxiety/Depression
  j1000_phq2_little_interest: integer('j1000_phq2_little_interest'), // 0-3 (PHQ-2 item 1)
  j1000_phq2_feeling_down: integer('j1000_phq2_feeling_down'), // 0-3 (PHQ-2 item 2)
  j1000_phq2_total_score: integer('j1000_phq2_total_score'), // 0-6
  j1000_anxiety_presence: boolean('j1000_anxiety_presence'),
  j1000_anxiety_severity: varchar('j1000_anxiety_severity', { length: 50 }),
  // J1100: Cognitive Status (BIMS)
  j1100_bims_repetition_score: integer('j1100_bims_repetition_score'), // 0-2
  j1100_bims_year_score: integer('j1100_bims_year_score'), // 0-1
  j1100_bims_month_score: integer('j1100_bims_month_score'), // 0-1
  j1100_bims_day_score: integer('j1100_bims_day_score'), // 0-1
  j1100_bims_recall_score: integer('j1100_bims_recall_score'), // 0-6
  j1100_bims_total_score: integer('j1100_bims_total_score'), // 0-15
  j1100_cognitive_status: varchar('j1100_cognitive_status', { length: 50 }), // INTACT, BORDERLINE_INTACT, MODERATELY_IMPAIRED, SEVERELY_IMPAIRED
  // J1200: Behavioral Symptoms
  j1200_wandering: boolean('j1200_wandering'),
  j1200_verbal_behaviors: boolean('j1200_verbal_behaviors'),
  j1200_physical_behaviors: boolean('j1200_physical_behaviors'),
  j1200_socially_inappropriate: boolean('j1200_socially_inappropriate'),
  j1200_resists_care: boolean('j1200_resists_care'),
  // J1300: Functional Status
  j1300_adl_bed_mobility: integer('j1300_adl_bed_mobility'), // 0-4
  j1300_adl_transfer: integer('j1300_adl_transfer'),
  j1300_adl_locomotion: integer('j1300_adl_locomotion'),
  j1300_adl_dressing: integer('j1300_adl_dressing'),
  j1300_adl_eating: integer('j1300_adl_eating'),
  j1300_adl_toileting: integer('j1300_adl_toileting'),
  j1300_adl_personal_hygiene: integer('j1300_adl_personal_hygiene'),
  j1300_adl_bathing: integer('j1300_adl_bathing'),
  j1300_fall_risk: boolean('j1300_fall_risk'),
  j1300_fall_risk_interventions: jsonb('j1300_fall_risk_interventions'),
  // J1400: Vital Signs
  j1400_vital_signs: jsonb('j1400_vital_signs'), // {bp_systolic, bp_diastolic, pulse, resp_rate, temp, o2_sat, weight}
  j1400_oxygen_dependent: boolean('j1400_oxygen_dependent'),
  j1400_oxygen_liters: integer('j1400_oxygen_liters'),
  j1400_oxygen_method: varchar('j1400_oxygen_method', { length: 50 }),

  // ============================================================================
  // SECTION M: Skin Conditions (New in HOPE 2.0)
  // ============================================================================
  // M0100: Skin Integrity
  m0100_skin_intact: boolean('m0100_skin_intact'),
  m0100_skin_at_risk: boolean('m0100_skin_at_risk'),
  m0100_skin_risk_factors: jsonb('m0100_skin_risk_factors'),
  // M0200: Pressure Ulcers/Injuries
  m0200_pressure_ulcer_present: boolean('m0200_pressure_ulcer_present'),
  m0200_pressure_ulcers: jsonb('m0200_pressure_ulcers'), // Array of {stage, location, size, healing_status}
  m0200_new_pressure_ulcer: boolean('m0200_new_pressure_ulcer'),
  m0200_worsened_pressure_ulcer: boolean('m0200_worsened_pressure_ulcer'),
  // M0300: Other Wounds
  m0300_other_wounds_present: boolean('m0300_other_wounds_present'),
  m0300_other_wounds: jsonb('m0300_other_wounds'),
  // M0400: Skin Treatments
  m0400_skin_treatments: jsonb('m0400_skin_treatments'),
  m0400_wound_care_orders: text('m0400_wound_care_orders'),
  // M0500: Braden Scale (Pressure Ulcer Risk)
  m0500_braden_sensory: integer('m0500_braden_sensory'), // 1-4
  m0500_braden_moisture: integer('m0500_braden_moisture'), // 1-4
  m0500_braden_activity: integer('m0500_braden_activity'), // 1-4
  m0500_braden_mobility: integer('m0500_braden_mobility'), // 1-4
  m0500_braden_nutrition: integer('m0500_braden_nutrition'), // 1-4
  m0500_braden_friction: integer('m0500_braden_friction'), // 1-3
  m0500_braden_total_score: integer('m0500_braden_total_score'), // 6-23

  // ============================================================================
  // SECTION N: Medications (Enhanced in HOPE 2.0)
  // ============================================================================
  // N0100: High-Risk Drug Classes
  n0100_opioid_medications: boolean('n0100_opioid_medications'),
  n0100_antipsychotic_medications: boolean('n0100_antipsychotic_medications'),
  n0100_anticoagulant_medications: boolean('n0100_anticoagulant_medications'),
  n0100_insulin_medications: boolean('n0100_insulin_medications'),
  // N0200: Medication Management
  n0200_medication_regimen_review: boolean('n0200_medication_regimen_review'),
  n0200_medication_reconciliation: boolean('n0200_medication_reconciliation'),
  n0200_medication_education: boolean('n0200_medication_education'),
  n0200_polypharmacy: boolean('n0200_polypharmacy'),
  n0200_medication_concerns: text('n0200_medication_concerns'),
  // N0300: Symptom Control Medications
  n0300_symptom_medications: jsonb('n0300_symptom_medications'),
  // N0400: Medication Route
  n0400_route_oral: boolean('n0400_route_oral'),
  n0400_route_sublingual: boolean('n0400_route_sublingual'),
  n0400_route_transdermal: boolean('n0400_route_transdermal'),
  n0400_route_iv: boolean('n0400_route_iv'),
  n0400_route_subcutaneous: boolean('n0400_route_subcutaneous'),
  n0400_route_rectal: boolean('n0400_route_rectal'),
  n0400_route_intramuscular: boolean('n0400_route_intramuscular'),

  // ============================================================================
  // SECTION Z: Record Administration
  // ============================================================================
  // Z0100: Assessor Information
  z0100_assessor_signature_date: date('z0100_assessor_signature_date'),
  z0100_assessor_title: varchar('z0100_assessor_title', { length: 100 }),
  z0100_assessor_credentials: varchar('z0100_assessor_credentials', { length: 100 }),
  // Z0200: Submission Information
  z0200_submitted_to_iqies: boolean('z0200_submitted_to_iqies').default(false),
  z0200_submission_id: varchar('z0200_submission_id', { length: 100 }),
  z0200_submission_date: timestamp('z0200_submission_date'),
  z0200_submission_status: varchar('z0200_submission_status', { length: 50 }),
  z0200_rejection_reason: text('z0200_rejection_reason'),
  // Z0300: Record Status
  z0300_record_status: varchar('z0300_record_status', { length: 50 }).default('ACTIVE'),
  z0300_inactivation_reason: text('z0300_inactivation_reason'),

  // ============================================================================
  // SFV (Symptom Follow-up Visit) Tracking
  // ============================================================================
  sfv_triggered: boolean('sfv_triggered').default(false),
  sfv_trigger_date: timestamp('sfv_trigger_date'),
  sfv_trigger_symptoms: text('sfv_trigger_symptoms'),
  sfv_due_date: timestamp('sfv_due_date'),
  sfv_completed: boolean('sfv_completed').default(false),
  sfv_completed_date: timestamp('sfv_completed_date'),

  // ============================================================================
  // Comprehensive Assessment Notes
  // ============================================================================
  clinical_notes: text('clinical_notes'),
  plan_of_care_updates: text('plan_of_care_updates'),
  interdisciplinary_notes: text('interdisciplinary_notes'),
  family_conference_notes: text('family_conference_notes'),

  // ============================================================================
  // Electronic Signature (21 CFR Part 11 Compliance)
  // ============================================================================
  signature: jsonb('signature'),
  cosignature: jsonb('cosignature'),

  // ============================================================================
  // Audit Fields
  // ============================================================================
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Single column indexes
  patientIdx: index('idx_hope_v2_patient_id').on(table.patient_id),
  assessmentDateIdx: index('idx_hope_v2_assessment_date').on(table.assessment_date),
  assessmentTypeIdx: index('idx_hope_v2_assessment_type').on(table.assessment_type),
  statusIdx: index('idx_hope_v2_status').on(table.assessment_status),
  dueDateIdx: index('idx_hope_v2_due_date').on(table.due_date),
  referenceDateIdx: index('idx_hope_v2_reference_date').on(table.a0310_assessment_reference_date),
  principalDiagnosisIdx: index('idx_hope_v2_principal_diagnosis').on(table.i0010_principal_diagnosis_icd10),

  // Composite indexes for common query patterns
  patientDateIdx: index('idx_hope_v2_patient_date').on(table.patient_id, table.assessment_date),
  patientTypeStatusIdx: index('idx_hope_v2_patient_type_status').on(table.patient_id, table.assessment_type, table.assessment_status),
  statusDueDateIdx: index('idx_hope_v2_status_due_date').on(table.assessment_status, table.due_date),
  sfvTriggeredIdx: index('idx_hope_v2_sfv_triggered').on(table.sfv_triggered, table.sfv_trigger_date),
  submissionIdx: index('idx_hope_v2_submission').on(table.z0200_submitted_to_iqies, table.z0200_submission_status),
}));

/**
 * HOPE Submissions - Tracks submissions to CMS iQIES system
 * iQIES replaces QIES for HOPE 2.0 submissions starting October 1, 2025
 */
export const hope_submissions = pgTable('hope_submissions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  hope_assessment_id: bigint('hope_assessment_id', { mode: 'number' }).references(() => hope_assessments.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Submission details
  submission_date: timestamp('submission_date').notNull(),
  submission_type: varchar('submission_type', { length: 50 }).notNull(), // INITIAL, CORRECTION, INACTIVATION
  submission_status: varchar('submission_status', { length: 50 }).default('PENDING').notNull(),

  // iQIES tracking (new system replacing QIES for HOPE 2.0)
  iqies_submission_id: varchar('iqies_submission_id', { length: 255 }),
  iqies_tracking_number: varchar('iqies_tracking_number', { length: 255 }),
  iqies_response_date: timestamp('iqies_response_date'),
  iqies_response_code: varchar('iqies_response_code', { length: 50 }),
  iqies_response_message: text('iqies_response_message'),

  // Submission payload
  submission_payload: jsonb('submission_payload'),
  response_payload: jsonb('response_payload'),

  // Error tracking
  error_code: varchar('error_code', { length: 50 }),
  error_message: text('error_message'),
  error_details: jsonb('error_details'),
  validation_errors: jsonb('validation_errors'), // Array of validation errors from VUT

  // Retry tracking
  retry_count: integer('retry_count').default(0),
  last_retry_date: timestamp('last_retry_date'),
  next_retry_date: timestamp('next_retry_date'),

  // Audit fields
  submitted_by_id: text('submitted_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  assessmentIdx: index('idx_hope_submissions_assessment_id').on(table.hope_assessment_id),
  patientIdx: index('idx_hope_submissions_patient_id').on(table.patient_id),
  statusIdx: index('idx_hope_submissions_status').on(table.submission_status),
  dateIdx: index('idx_hope_submissions_date').on(table.submission_date),
}));

/**
 * HOPE Compliance Metrics - Tracks compliance with 90% threshold requirement
 * Non-compliance results in 4% Medicare payment reduction
 */
export const hope_compliance_metrics = pgTable('hope_compliance_metrics', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Reporting period
  reporting_period_start: timestamp('reporting_period_start').notNull(),
  reporting_period_end: timestamp('reporting_period_end').notNull(),
  reporting_year: integer('reporting_year').notNull(),
  reporting_quarter: integer('reporting_quarter'), // 1-4

  // Assessment type metrics
  assessment_type: varchar('assessment_type', { length: 50 }).notNull(),

  // Compliance calculations
  total_required: integer('total_required').notNull(),
  total_completed: integer('total_completed').notNull(),
  total_completed_timely: integer('total_completed_timely').notNull(),
  total_overdue: integer('total_overdue').notNull(),
  total_missing: integer('total_missing').notNull(),

  // Compliance rates (percentages 0-100)
  completion_rate: integer('completion_rate'),
  timeliness_rate: integer('timeliness_rate'),
  compliance_rate: integer('compliance_rate'), // Must be >= 90%

  // Penalty tracking
  meets_threshold: boolean('meets_threshold').default(false),
  penalty_applied: boolean('penalty_applied').default(false),
  penalty_percentage: integer('penalty_percentage'), // 4% if non-compliant

  // Status breakdown
  status_breakdown: jsonb('status_breakdown'),

  // Notes
  notes: text('notes'),
  action_plan: text('action_plan'),

  // Audit fields
  calculated_by_id: text('calculated_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  periodIdx: index('idx_hope_compliance_period').on(table.reporting_year, table.reporting_quarter),
  typeIdx: index('idx_hope_compliance_type').on(table.assessment_type),
  thresholdIdx: index('idx_hope_compliance_threshold').on(table.meets_threshold),
}));

/**
 * HOPE Symptom Tracking - Tracks symptoms for SFV triggers
 * SFV (Symptom Follow-up Visit) required within 48hrs of moderate/severe symptoms
 */
export const hope_symptom_tracking = pgTable('hope_symptom_tracking', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  hope_assessment_id: bigint('hope_assessment_id', { mode: 'number' }).references(() => hope_assessments.id),

  // Symptom details
  symptom_code: varchar('symptom_code', { length: 50 }).notNull(), // PAIN, DYSPNEA, NAUSEA, CONSTIPATION, FATIGUE, ANXIETY
  symptom_name: varchar('symptom_name', { length: 100 }).notNull(),
  symptom_severity: varchar('symptom_severity', { length: 50 }).notNull(), // NONE, MILD, MODERATE, SEVERE, VERY_SEVERE
  symptom_frequency: varchar('symptom_frequency', { length: 50 }),
  symptom_date: timestamp('symptom_date').notNull(),
  symptom_score: integer('symptom_score'), // 0-10 scale

  // SFV trigger tracking
  triggers_sfv: boolean('triggers_sfv').default(false),
  sfv_required_by: timestamp('sfv_required_by'),
  sfv_completed: boolean('sfv_completed').default(false),
  sfv_completed_date: timestamp('sfv_completed_date'),
  sfv_assessment_id: bigint('sfv_assessment_id', { mode: 'number' }).references(() => hope_assessments.id),

  // Intervention tracking
  intervention_provided: boolean('intervention_provided').default(false),
  intervention_type: varchar('intervention_type', { length: 100 }),
  intervention_details: text('intervention_details'),
  intervention_effective: boolean('intervention_effective'),

  // Resolution tracking
  resolved: boolean('resolved').default(false),
  resolved_date: timestamp('resolved_date'),
  resolution_notes: text('resolution_notes'),

  // Clinical notes
  assessment_notes: text('assessment_notes'),

  // Audit fields
  reported_by_id: text('reported_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  patientIdx: index('idx_hope_symptom_patient').on(table.patient_id),
  assessmentIdx: index('idx_hope_symptom_assessment').on(table.hope_assessment_id),
  sfvIdx: index('idx_hope_symptom_sfv').on(table.triggers_sfv, table.sfv_required_by),
  codeIdx: index('idx_hope_symptom_code').on(table.symptom_code),
  severityIdx: index('idx_hope_symptom_severity').on(table.symptom_severity),
}));

/**
 * HOPE Section Responses - Stores structured responses for each section
 * Allows flexible storage of section-specific data with validation
 */
export const hope_section_responses = pgTable('hope_section_responses', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  hope_assessment_id: bigint('hope_assessment_id', { mode: 'number' }).references(() => hope_assessments.id).notNull(),

  // Section identification
  section_code: varchar('section_code', { length: 20 }).notNull(), // A, F, I, J, M, N, Z
  section_name: varchar('section_name', { length: 100 }).notNull(),
  section_version: varchar('section_version', { length: 20 }).default('2.0'),

  // Response data
  items: jsonb('items').notNull(), // Array of {item_code, item_label, response, skip_pattern}

  // Section status
  status: varchar('status', { length: 50 }).default('NOT_STARTED'),
  completed_date: timestamp('completed_date'),
  validated: boolean('validated').default(false),
  validation_errors: jsonb('validation_errors'),

  // Audit fields
  completed_by_id: text('completed_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  assessmentIdx: index('idx_hope_section_assessment').on(table.hope_assessment_id),
  codeIdx: index('idx_hope_section_code').on(table.section_code),
  statusIdx: index('idx_hope_section_status').on(table.status),
}));
