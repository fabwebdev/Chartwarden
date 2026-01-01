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

// ==============================|| PATIENT CONTACT ||============================== //

export interface PatientContact {
  id?: number | string;
  patient_id?: number | string;
  contact_type?: 'EMERGENCY' | 'FAMILY' | 'CAREGIVER' | 'HEALTHCARE_PROXY' | 'LEGAL' | 'FUNERAL_HOME' | 'CLERGY' | 'OTHER';
  first_name: string;
  last_name: string;
  middle_name?: string;
  suffix?: string;
  preferred_name?: string;
  relationship: string;
  relationship_detail?: string;
  primary_phone: string;
  primary_phone_type?: 'MOBILE' | 'HOME' | 'WORK';
  secondary_phone?: string;
  secondary_phone_type?: 'MOBILE' | 'HOME' | 'WORK';
  email?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  preferred_contact_method?: 'PHONE' | 'EMAIL' | 'TEXT';
  preferred_contact_time?: string;
  preferred_language?: string;
  priority?: number;
  is_primary?: boolean;
  is_active?: boolean;
  authorized_for_phi?: boolean;
  authorized_for_decisions?: boolean;
  has_key_to_home?: boolean;
  lives_with_patient?: boolean;
  healthcare_proxy_document?: boolean;
  power_of_attorney?: boolean;
  document_date?: string;
  notes?: string;
  special_instructions?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePatientContactRequest {
  contact_type?: 'EMERGENCY' | 'FAMILY' | 'CAREGIVER' | 'HEALTHCARE_PROXY' | 'LEGAL' | 'FUNERAL_HOME' | 'CLERGY' | 'OTHER';
  first_name: string;
  last_name: string;
  relationship: string;
  primary_phone: string;
  middle_name?: string;
  suffix?: string;
  preferred_name?: string;
  relationship_detail?: string;
  primary_phone_type?: 'MOBILE' | 'HOME' | 'WORK';
  secondary_phone?: string;
  secondary_phone_type?: 'MOBILE' | 'HOME' | 'WORK';
  email?: string;
  address_line_1?: string;
  address_line_2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  country?: string;
  preferred_contact_method?: 'PHONE' | 'EMAIL' | 'TEXT';
  preferred_contact_time?: string;
  preferred_language?: string;
  priority?: number;
  is_primary?: boolean;
  authorized_for_phi?: boolean;
  authorized_for_decisions?: boolean;
  has_key_to_home?: boolean;
  lives_with_patient?: boolean;
  healthcare_proxy_document?: boolean;
  power_of_attorney?: boolean;
  document_date?: string;
  notes?: string;
  special_instructions?: string;
}

// ==============================|| PATIENT ADDRESS ||============================== //

export interface PatientAddress {
  id?: number | string;
  patient_id?: number | string;
  address_type?: 'PRIMARY' | 'BILLING' | 'MAILING' | 'FACILITY' | 'TEMPORARY';
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  county?: string;
  cbsa_code?: string;
  latitude?: string;
  longitude?: string;
  phone_number?: string;
  alternate_phone?: string;
  is_primary?: boolean;
  is_verified?: boolean;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePatientAddressRequest {
  address_type?: 'PRIMARY' | 'BILLING' | 'MAILING' | 'FACILITY' | 'TEMPORARY';
  address_line_1: string;
  address_line_2?: string;
  city: string;
  state: string;
  zip_code: string;
  county?: string;
  cbsa_code?: string;
  latitude?: string;
  longitude?: string;
  phone_number?: string;
  alternate_phone?: string;
  is_primary?: boolean;
  is_verified?: boolean;
  is_active?: boolean;
  effective_from?: string;
  effective_to?: string;
  notes?: string;
}

// ==============================|| PATIENT PAYER ||============================== //

export type PayerType = 'MEDICARE' | 'MEDICAID' | 'COMMERCIAL' | 'MANAGED_CARE' | 'TRICARE' | 'CHAMPVA' | 'WORKERS_COMP' | 'AUTO' | 'SELF_PAY' | 'OTHER';
export type EligibilityStatus = 'ACTIVE' | 'INACTIVE' | 'PENDING' | 'UNKNOWN';
export type SubscriberRelationship = 'SELF' | 'SPOUSE' | 'CHILD' | 'OTHER';

export interface PatientPayer {
  id?: number | string;
  patient_id?: number | string;
  payer_type: PayerType;
  payer_order?: number;
  payer_name: string;
  payer_id?: string;
  payer_phone?: string;
  payer_fax?: string;
  payer_email?: string;
  payer_website?: string;
  payer_address_line1?: string;
  payer_address_line2?: string;
  payer_city?: string;
  payer_state?: string;
  payer_zip?: string;
  payer_country?: string;
  policy_number?: string;
  group_number?: string;
  group_name?: string;
  plan_name?: string;
  plan_type?: string;
  subscriber_id?: string;
  subscriber_name?: string;
  subscriber_dob?: string;
  subscriber_relationship?: SubscriberRelationship;
  subscriber_ssn?: string;
  medicare_beneficiary_id?: string;
  medicare_part_a_effective?: string;
  medicare_part_b_effective?: string;
  medicare_hospice_election_date?: string;
  medicare_advantage_plan?: boolean;
  medicare_advantage_plan_name?: string;
  medicaid_id?: string;
  medicaid_state?: string;
  medicaid_plan_name?: string;
  is_dual_eligible?: boolean;
  effective_date?: string;
  termination_date?: string;
  authorization_number?: string;
  authorization_start_date?: string;
  authorization_end_date?: string;
  authorization_units?: number;
  authorization_notes?: string;
  cob_order?: number;
  accepts_assignment?: boolean;
  assignment_of_benefits?: boolean;
  is_verified?: boolean;
  verified_at?: string;
  verification_method?: string;
  verification_response?: string;
  last_eligibility_check?: string;
  eligibility_status?: EligibilityStatus;
  is_active?: boolean;
  is_primary?: boolean;
  notes?: string;
  internal_notes?: string;
  created_at?: string;
  updated_at?: string;
}

export interface CreatePatientPayerRequest {
  payer_type: PayerType;
  payer_name: string;
  payer_order?: number;
  payer_id?: string;
  payer_phone?: string;
  payer_fax?: string;
  payer_email?: string;
  payer_website?: string;
  payer_address_line1?: string;
  payer_address_line2?: string;
  payer_city?: string;
  payer_state?: string;
  payer_zip?: string;
  payer_country?: string;
  policy_number?: string;
  group_number?: string;
  group_name?: string;
  plan_name?: string;
  plan_type?: string;
  subscriber_id?: string;
  subscriber_name?: string;
  subscriber_dob?: string;
  subscriber_relationship?: SubscriberRelationship;
  medicare_beneficiary_id?: string;
  medicare_part_a_effective?: string;
  medicare_part_b_effective?: string;
  medicare_hospice_election_date?: string;
  medicare_advantage_plan?: boolean;
  medicare_advantage_plan_name?: string;
  medicaid_id?: string;
  medicaid_state?: string;
  medicaid_plan_name?: string;
  is_dual_eligible?: boolean;
  effective_date?: string;
  termination_date?: string;
  authorization_number?: string;
  authorization_start_date?: string;
  authorization_end_date?: string;
  authorization_units?: number;
  authorization_notes?: string;
  cob_order?: number;
  accepts_assignment?: boolean;
  assignment_of_benefits?: boolean;
  is_active?: boolean;
  is_primary?: boolean;
  notes?: string;
  internal_notes?: string;
}

