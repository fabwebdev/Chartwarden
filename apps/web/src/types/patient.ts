/**
 * Patient Type Definitions
 * 
 * TypeScript types for all patient-related data structures.
 * These types correspond to the backend API responses and request payloads.
 */

// ==============================|| MAIN PATIENT TYPES ||============================== //

export interface Patient {
  id?: number | string;
  first_name: string;
  last_name: string;
  mi?: string;
  preferred_name?: string;
  date_of_birth?: string;
  suffix?: string;
  ssn?: string;
  dnr_id?: number | string;
  hipaa_received?: string | boolean;
  race_ethnicity_id?: number | string;
  liaison_primary_id?: number | string;
  emergency_preparedness_level_id?: number | string;
  oxygen_dependent_id?: number | string;
  patient_consents?: string;
  genders?: string;
  dme_provider_id?: number | string;
  patient_pharmacy_id?: number | string;
  primary_diagnosis_id?: number | string;
  liaison_secondary_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| ADMISSION INFORMATION ||============================== //

export interface AdmissionInformation {
  id?: number | string;
  patient_id?: number | string;
  admission_date?: string;
  discharge_date?: string;
  admission_type?: string;
  admitting_physician?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| BENEFIT PERIOD ||============================== //

export interface BenefitPeriod {
  id?: number | string;
  patient_id?: number | string;
  start_date?: string;
  end_date?: string;
  nursing_clinical_notes?: any[];
  created_at?: string;
  updated_at?: string;
}

// ==============================|| ASSESSMENT TYPES ||============================== //

export interface CardiacAssessment {
  id?: number | string;
  patient_id?: number | string;
  assessment_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EndocrineAssessment {
  id?: number | string;
  patient_id?: number | string;
  assessment_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface HematologicalAssessment {
  id?: number | string;
  patient_id?: number | string;
  assessment_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface IntegumentaryAssessment {
  id?: number | string;
  patient_id?: number | string;
  assessment_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| DISCHARGE ||============================== //

export interface Discharge {
  id?: number | string;
  patient_id?: number | string;
  discharge_date?: string;
  discharge_type?: string;
  discharge_location?: string;
  created_at?: string;
  updated_at?: string;
}

export interface DischargeSection {
  id?: number | string;
  name?: string;
  section_type?: string;
}

// ==============================|| DME PROVIDER ||============================== //

export interface DmeProvider {
  id?: number | string;
  name?: string;
  address?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| DNR ||============================== //

export interface DnrRecord {
  id?: number | string;
  patient_id?: number | string;
  dnr_status?: string;
  dnr_date?: string;
  dnr_notes?: string;
  status?: string; // For backward compatibility
  created_at?: string;
  updated_at?: string;
}

export interface CreateDnrRequest {
  dnr_status?: string;
  dnr_date?: string;
  dnr_notes?: string;
}

// ==============================|| EMERGENCY PREPAREDNESS LEVEL ||============================== //

export interface EmergencyPreparednessLevel {
  id?: number | string;
  level?: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| LIAISON ||============================== //

export interface LiaisonPrimary {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  relationship?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateLiaisonPrimaryRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  relationship?: string;
}

export interface LiaisonSecondary {
  id?: number | string;
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  relationship?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreateLiaisonSecondaryRequest {
  first_name?: string;
  last_name?: string;
  phone?: string;
  email?: string;
  relationship?: string;
}

// ==============================|| LIVING ARRANGEMENTS ||============================== //

export interface LivingArrangement {
  id?: number | string;
  patient_id?: number | string;
  arrangement_type?: string;
  address?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| NUTRITION ASSESSMENT ||============================== //

export interface NutritionAssessment {
  id?: number | string;
  patient_id?: number | string;
  assessment_date?: string;
  problem_type_id?: number | string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface NutritionProblemType {
  id?: number | string;
  name?: string;
  description?: string;
}

// ==============================|| PAIN ASSESSMENT ||============================== //

export interface PainAssessment {
  id?: number | string;
  patient_id?: number | string;
  assessment_date?: string;
  pain_level?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainType {
  id?: number | string;
  name?: string;
  description?: string;
}

export interface PainRatedBy {
  id?: number | string;
  pain_assessment_id?: number | string;
  rated_by_type_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainDuration {
  id?: number | string;
  pain_assessment_id?: number | string;
  duration_type_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainFrequency {
  id?: number | string;
  pain_assessment_id?: number | string;
  frequency_type_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainObservation {
  id?: number | string;
  pain_assessment_id?: number | string;
  observation_type_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainWorsenedBy {
  id?: number | string;
  pain_assessment_id?: number | string;
  worsened_type_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainCharacter {
  id?: number | string;
  pain_assessment_id?: number | string;
  character_type_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainRelievedBy {
  id?: number | string;
  pain_assessment_id?: number | string;
  relieved_by_type_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainEffectsOnFunction {
  id?: number | string;
  pain_assessment_id?: number | string;
  effects_type_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainBreakthrough {
  id?: number | string;
  pain_assessment_id?: number | string;
  breakthrough_type_id?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainRatingScale {
  id?: number | string;
  pain_assessment_id?: number | string;
  rating_scale_id?: number | string;
  rating_value?: number | string;
  created_at?: string;
  updated_at?: string;
}

export interface PainVitalSigns {
  id?: number | string;
  pain_assessment_id?: number | string;
  vital_signs_data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface FlaccBehavioralPain {
  id?: number | string;
  pain_assessment_id?: number | string;
  flacc_score?: number | string;
  behavioral_data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface PainScreening {
  id?: number | string;
  pain_assessment_id?: number | string;
  screening_data?: any;
  created_at?: string;
  updated_at?: string;
}

export interface PainActiveProblem {
  id?: number | string;
  pain_assessment_id?: number | string;
  problem_description?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| PATIENT IDENTIFIERS ||============================== //

export interface PatientIdentifier {
  id?: number | string;
  patient_id?: number | string;
  identifier_type?: string;
  identifier_value?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| PATIENT PHARMACY ||============================== //

export interface PatientPharmacy {
  id?: number | string;
  name?: string;
  address?: string;
  phone?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| PAYER INFORMATION ||============================== //

export interface PayerInformation {
  id?: number | string;
  patient_id?: number | string;
  payer_name?: string;
  payer_id?: string;
  policy_number?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| PRIMARY DIAGNOSIS ||============================== //

export interface PrimaryDiagnosis {
  id?: number | string;
  diagnosis_code?: string | null;
  diagnosis_description?: string | null;
  diagnosis_date?: string | null;
  code?: string; // For display purposes (mapped from diagnosis_code)
  description?: string; // For display purposes (mapped from diagnosis_description)
  created_at?: string;
  updated_at?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreatePrimaryDiagnosisRequest {
  diagnosis_code?: string;
  diagnosis_description?: string;
}

// ==============================|| PROGNOSIS ||============================== //

export interface Prognosis {
  id?: number | string;
  patient_id?: number | string;
  prognosis_date?: string;
  prognosis_type?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| RACE ETHNICITY ||============================== //

export interface RaceEthnicity {
  id?: number | string;
  race: string; // Required - at least one of race or ethnicity must be provided
  ethnicity?: string; // Optional
  created_at?: string;
  updated_at?: string;
}

export interface CreateRaceEthnicityRequest {
  // Single values (for backward compatibility)
  race?: string;
  ethnicity?: string;
  // Array values (for multiple selection support)
  races?: string[];
  ethnicities?: string[];
}

export interface RaceEthnicityOptions {
  races: string[]; // Standard US Census race categories
  detailedRaces: string[]; // More specific race options
  ethnicities: string[]; // Hispanic/Latino ethnicity options
  supportsMultiple: boolean; // Indicates multiple selection is supported
}

// ==============================|| SIGNATURE ||============================== //

export interface Signature {
  id?: number | string;
  patient_id?: number | string;
  signature_type?: string;
  signature_data?: string;
  signed_by?: string;
  signed_date?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| SPIRITUAL PREFERENCE ||============================== //

export interface SpiritualPreference {
  id?: number | string;
  patient_id?: number | string;
  preference_type?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| VISIT INFORMATION ||============================== //

export interface VisitInformation {
  id?: number | string;
  patient_id?: number | string;
  visit_date?: string;
  visit_type?: string;
  visit_notes?: string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| VITAL SIGNS ||============================== //

export interface VitalSigns {
  id?: number | string;
  patient_id?: number | string;
  measurement_date?: string;
  blood_pressure_systolic?: number | string;
  blood_pressure_diastolic?: number | string;
  heart_rate?: number | string;
  respiratory_rate?: number | string;
  temperature?: number | string;
  oxygen_saturation?: number | string;
  created_at?: string;
  updated_at?: string;
}

// ==============================|| SELECT OPTIONS ||============================== //

export interface SelectOption {
  id: number | string;
  name?: string;
  label?: string;
  value?: number | string;
}

// ==============================|| API RESPONSE TYPES ||============================== //

export interface PatientListResponse {
  data?: Patient[];
  patients?: Patient[];
  success?: boolean;
  message?: string;
}

export interface PatientResponse {
  data?: Patient;
  success?: boolean;
  message?: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  current_page?: number;
  last_page?: number;
  per_page?: number;
  total?: number;
}

// ==============================|| REQUEST PAYLOAD TYPES ||============================== //

export interface CreatePatientRequest {
  first_name: string;
  last_name: string;
  mi?: string;
  preferred_name?: string;
  date_of_birth?: string;
  suffix?: string;
  ssn?: string;
  dnr_id?: number | string;
  hipaa_received?: string | boolean;
  race_ethnicity_id?: number | string;
  liaison_primary_id?: number | string;
  emergency_preparedness_level_id?: number | string;
  oxygen_dependent_id?: number | string;
  patient_consents?: string;
  genders?: string;
  dme_provider_id?: number | string;
  patient_pharmacy_id?: number | string;
  primary_diagnosis_id?: number | string;
  liaison_secondary_id?: number | string;
}

export interface UpdatePatientRequest extends Partial<CreatePatientRequest> {
  id: number | string;
}

