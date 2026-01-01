/**
 * HOPE Assessment API Service
 *
 * API service for HOPE 2.0 (Hospice Outcomes and Patient Evaluation) assessments.
 * All routes are mounted under /api and require authentication.
 */

import http from 'hooks/useCookie';

// ==============================|| HOPE ASSESSMENT TYPES ||============================== //

export type HOPEAssessmentType = 'ADMISSION' | 'HUV1' | 'HUV2' | 'DISCHARGE' | 'TRANSFER' | 'RESUMPTION' | 'RECERTIFICATION' | 'SYMPTOM_FOLLOWUP';
export type HOPEAssessmentStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED' | 'SIGNED' | 'SUBMITTED' | 'ACCEPTED' | 'REJECTED' | 'OVERDUE';

export interface HOPEAssessment {
  id: number;
  patient_id: number;
  assessment_type: HOPEAssessmentType;
  assessment_status: HOPEAssessmentStatus;
  assessment_date: string;
  due_date?: string;
  completed_date?: string;
  hospice_stay_id?: number;

  // Section A: Administrative Information
  a0050_record_type?: string;
  a0100a_npi?: string;
  a0100b_cms_certification_number?: string;
  a0200_assessment_type_code?: string;
  a0220_admission_date?: string;
  a0250_assessment_reason?: string;
  a0270_discharge_date?: string;
  a0310_assessment_reference_date: string;
  a0410_unit_of_service?: string;
  a1005_ethnicity?: string;
  a1010_race?: string[];
  a1110a_primary_language?: string;
  a1110b_language_need_interpreter?: boolean;

  // Section F: Preferences for Customary Routine and Activities
  f2100_life_story_discussed?: boolean;
  f2100_goals_documented?: boolean;
  f2200_hospitalization_preference?: string;
  f2200_preference_documented?: boolean;
  f2200_preference_date?: string;
  f2300_code_status?: string;
  f2300_advance_directive_exists?: boolean;
  f2300_polst_exists?: boolean;
  f2300_healthcare_proxy?: boolean;
  f3000_spiritual_concerns_present?: boolean;
  f3000_spiritual_needs_addressed?: boolean;
  f3000_chaplain_referral?: boolean;
  f3000_spiritual_assessment?: string;
  f3100_caregiver_available?: boolean;
  f3100_caregiver_relationship?: string;
  f3100_caregiver_hours_per_week?: number;
  f3100_caregiver_support_adequate?: boolean;
  f3100_caregiver_stress_level?: string;
  f3100_caregiver_training_needed?: boolean;
  f3100_caregiver_assessment_notes?: string;

  // Section I: Active Diagnoses
  i0010_principal_diagnosis_icd10: string;
  i0010_principal_diagnosis_description?: string;
  i0020_other_diagnoses?: Array<{
    icd10: string;
    description: string;
    is_related?: boolean;
  }>;
  i0100_cancer_primary_site?: string;
  i0100_cancer_stage?: string;
  i0100_cancer_metastatic?: boolean;
  i0100_cancer_metastatic_sites?: string[];
  i0200_comorbidities?: string[];
  i0300_prognosis_months?: number;

  // Section J: Health Conditions
  j0100_pain_presence?: string;
  j0100_pain_frequency?: string;
  j0100_pain_severity_current?: number;
  j0100_pain_severity_worst?: number;
  j0100_pain_interference?: number;
  j0100_pain_acceptable_level?: number;
  j0200_pain_sites?: Array<{
    site: string;
    type: string;
    description?: string;
  }>;
  j0300_pain_med_effectiveness?: string;
  j0300_nonpharm_interventions?: string[];
  j0500_dyspnea_presence?: boolean;
  j0500_dyspnea_severity?: string;
  j0500_dyspnea_at_rest?: boolean;
  j0500_dyspnea_with_activity?: boolean;
  j0500_dyspnea_frequency?: string;
  j0600_nausea_presence?: boolean;
  j0600_nausea_severity?: string;
  j0600_nausea_frequency?: string;
  j0600_vomiting_presence?: boolean;
  j0600_vomiting_frequency?: string;
  j0700_constipation_presence?: boolean;
  j0700_constipation_severity?: string;
  j0700_bowel_program?: boolean;
  j0700_last_bowel_movement?: string;
  j0800_fatigue_presence?: boolean;
  j0800_fatigue_severity?: string;
  j0800_fatigue_interference?: number;
  j0900_appetite_status?: string;
  j0900_weight_change?: string;
  j0900_oral_intake_status?: string;
  j0900_nutritional_concerns?: string;
  j1000_phq2_little_interest?: number;
  j1000_phq2_feeling_down?: number;
  j1000_phq2_total_score?: number;
  j1000_anxiety_presence?: boolean;
  j1000_anxiety_severity?: string;
  j1100_bims_repetition_score?: number;
  j1100_bims_year_score?: number;
  j1100_bims_month_score?: number;
  j1100_bims_day_score?: number;
  j1100_bims_recall_score?: number;
  j1100_bims_total_score?: number;
  j1100_cognitive_status?: string;
  j1200_wandering?: boolean;
  j1200_verbal_behaviors?: boolean;
  j1200_physical_behaviors?: boolean;
  j1200_socially_inappropriate?: boolean;
  j1200_resists_care?: boolean;
  j1300_adl_bed_mobility?: number;
  j1300_adl_transfer?: number;
  j1300_adl_locomotion?: number;
  j1300_adl_dressing?: number;
  j1300_adl_eating?: number;
  j1300_adl_toileting?: number;
  j1300_adl_personal_hygiene?: number;
  j1300_adl_bathing?: number;
  j1300_fall_risk?: boolean;
  j1300_fall_risk_interventions?: string[];
  j1400_vital_signs?: {
    bp_systolic?: number;
    bp_diastolic?: number;
    pulse?: number;
    resp_rate?: number;
    temp?: number;
    o2_sat?: number;
    weight?: number;
  };
  j1400_oxygen_dependent?: boolean;
  j1400_oxygen_liters?: number;
  j1400_oxygen_method?: string;

  // Section M: Skin Conditions
  m0100_skin_intact?: boolean;
  m0100_skin_at_risk?: boolean;
  m0100_skin_risk_factors?: string[];
  m0200_pressure_ulcer_present?: boolean;
  m0200_pressure_ulcers?: Array<{
    stage: string;
    location: string;
    size?: string;
    healing_status?: string;
  }>;
  m0200_new_pressure_ulcer?: boolean;
  m0200_worsened_pressure_ulcer?: boolean;
  m0300_other_wounds_present?: boolean;
  m0300_other_wounds?: Array<{
    type: string;
    location: string;
    size?: string;
    treatment?: string;
  }>;
  m0400_skin_treatments?: string[];
  m0400_wound_care_orders?: string;
  m0500_braden_sensory?: number;
  m0500_braden_moisture?: number;
  m0500_braden_activity?: number;
  m0500_braden_mobility?: number;
  m0500_braden_nutrition?: number;
  m0500_braden_friction?: number;
  m0500_braden_total_score?: number;

  // Section N: Medications
  n0100_opioid_medications?: boolean;
  n0100_antipsychotic_medications?: boolean;
  n0100_anticoagulant_medications?: boolean;
  n0100_insulin_medications?: boolean;
  n0200_medication_regimen_review?: boolean;
  n0200_medication_reconciliation?: boolean;
  n0200_medication_education?: boolean;
  n0200_polypharmacy?: boolean;
  n0200_medication_concerns?: string;
  n0300_symptom_medications?: Array<{
    medication: string;
    symptom: string;
    effectiveness?: string;
  }>;
  n0400_route_oral?: boolean;
  n0400_route_sublingual?: boolean;
  n0400_route_transdermal?: boolean;
  n0400_route_iv?: boolean;
  n0400_route_subcutaneous?: boolean;
  n0400_route_rectal?: boolean;
  n0400_route_intramuscular?: boolean;

  // Section Z: Record Administration
  z0100_assessor_signature_date?: string;
  z0100_assessor_title?: string;
  z0100_assessor_credentials?: string;
  z0200_submitted_to_iqies?: boolean;
  z0200_submission_id?: string;
  z0200_submission_date?: string;
  z0200_submission_status?: string;
  z0200_rejection_reason?: string;
  z0300_record_status?: string;
  z0300_inactivation_reason?: string;

  // SFV Tracking
  sfv_triggered?: boolean;
  sfv_trigger_date?: string;
  sfv_trigger_symptoms?: string;
  sfv_due_date?: string;
  sfv_completed?: boolean;
  sfv_completed_date?: string;

  // Notes
  clinical_notes?: string;
  plan_of_care_updates?: string;
  interdisciplinary_notes?: string;
  family_conference_notes?: string;

  // Signature
  signature?: any;
  cosignature?: any;

  // Audit fields
  created_by_id?: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
}

export interface HOPEAssessmentFormData extends Partial<HOPEAssessment> {}

export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: string;
  type?: string;
  start_date?: string;
  end_date?: string;
}

export interface PaginatedResponse<T> {
  status: number;
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ValidationResult {
  valid: boolean;
  errors: Array<{
    field: string;
    message: string;
    section?: string;
  }>;
  warnings: Array<{
    field: string;
    message: string;
    section?: string;
  }>;
}

// ==============================|| HOPE ASSESSMENT ROUTES ||============================== //

/**
 * Get patient HOPE assessments
 */
export const getPatientHOPEAssessments = async (
  patientId: string | number,
  params?: PaginationParams
) => {
  const response = await http.get(`/patients/${patientId}/hope-assessments`, { params });
  return response.data;
};

/**
 * Get HOPE assessment by ID
 */
export const getHOPEAssessmentById = async (
  id: string | number
): Promise<{ status: number; data: HOPEAssessment }> => {
  const response = await http.get(`/hope-assessments/${id}`);
  return response.data;
};

/**
 * Create admission HOPE assessment
 */
export const createAdmissionAssessment = async (
  patientId: string | number,
  assessmentData: HOPEAssessmentFormData
) => {
  const response = await http.post(`/patients/${patientId}/hope-assessments/admission`, assessmentData);
  return response.data;
};

/**
 * Create HUV1 assessment (days 6-15)
 */
export const createHUV1Assessment = async (
  patientId: string | number,
  assessmentData: HOPEAssessmentFormData
) => {
  const response = await http.post(`/patients/${patientId}/hope-assessments/huv1`, assessmentData);
  return response.data;
};

/**
 * Create HUV2 assessment (days 16-30)
 */
export const createHUV2Assessment = async (
  patientId: string | number,
  assessmentData: HOPEAssessmentFormData
) => {
  const response = await http.post(`/patients/${patientId}/hope-assessments/huv2`, assessmentData);
  return response.data;
};

/**
 * Create discharge assessment
 */
export const createDischargeAssessment = async (
  patientId: string | number,
  assessmentData: HOPEAssessmentFormData
) => {
  const response = await http.post(`/patients/${patientId}/hope-assessments/discharge`, assessmentData);
  return response.data;
};

/**
 * Create Symptom Follow-up Visit (SFV) assessment
 */
export const createSFVAssessment = async (
  patientId: string | number,
  assessmentData: HOPEAssessmentFormData
) => {
  const response = await http.post(`/patients/${patientId}/hope-assessments/sfv`, assessmentData);
  return response.data;
};

/**
 * Create generic HOPE assessment
 */
export const createHOPEAssessment = async (
  patientId: string | number,
  assessmentData: HOPEAssessmentFormData
) => {
  const response = await http.post(`/patients/${patientId}/hope-assessments`, assessmentData);
  return response.data;
};

/**
 * Update HOPE assessment
 */
export const updateHOPEAssessment = async (
  id: string | number,
  assessmentData: HOPEAssessmentFormData
) => {
  const response = await http.patch(`/hope-assessments/${id}`, assessmentData);
  return response.data;
};

/**
 * Delete (inactivate) HOPE assessment
 */
export const deleteHOPEAssessment = async (id: string | number, reason?: string) => {
  const response = await http.delete(`/hope-assessments/${id}`, { params: { reason } });
  return response.data;
};

/**
 * Validate HOPE assessment before signing
 */
export const validateHOPEAssessment = async (
  id: string | number
): Promise<{ status: number; data: ValidationResult }> => {
  const response = await http.post(`/hope-assessments/${id}/validate`);
  return response.data;
};

/**
 * Sign HOPE assessment
 */
export const signHOPEAssessment = async (id: string | number) => {
  const response = await http.post(`/hope-assessments/${id}/sign`);
  return response.data;
};

/**
 * Submit HOPE assessment to CMS iQIES
 */
export const submitHOPEAssessment = async (id: string | number) => {
  const response = await http.post(`/hope-assessments/${id}/submit`);
  return response.data;
};

/**
 * Get CMS requirements for assessment type
 */
export const getCMSRequirements = async (
  assessmentType?: HOPEAssessmentType
): Promise<{ status: number; data: any }> => {
  const response = await http.get('/hope-assessments/cms-requirements', {
    params: { type: assessmentType }
  });
  return response.data;
};

/**
 * Get compliance report
 */
export const getComplianceReport = async (params?: {
  start_date?: string;
  end_date?: string;
  year?: number;
  quarter?: number;
}) => {
  const response = await http.get('/hope-assessments/reports/compliance', { params });
  return response.data;
};

/**
 * Get overdue assessments
 */
export const getOverdueAssessments = async () => {
  const response = await http.get('/hope-assessments/overdue');
  return response.data;
};

/**
 * Get upcoming assessments
 */
export const getUpcomingAssessments = async (days?: number) => {
  const response = await http.get('/hope-assessments/upcoming', { params: { days } });
  return response.data;
};
