/**
 * Encounter API Service
 *
 * Comprehensive API service for all encounter-related endpoints.
 * All routes are mounted under /api/encounters and require authentication.
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export interface EncounterFilters {
  patient_id?: number | string;
  discipline?: string;
  status?: string;
  staff_id?: string;
  date_from?: string;
  date_to?: string;
  limit?: number;
  offset?: number;
  sort?: 'encounter_date' | 'createdAt';
  order?: 'asc' | 'desc';
}

export interface Encounter {
  id: number;
  patient_id: number;
  encounter_type: string;
  encounter_status: string;
  encounter_date: string;
  encounter_duration_minutes?: number;
  visit_location?: string;
  visit_address?: string;
  discipline: string;
  staff_id?: string;
  staff_name?: string;
  staff_credentials?: string;
  cosigner_id?: string;
  cosigner_name?: string;
  gps_check_in?: any;
  gps_check_out?: any;
  subjective?: string;
  objective?: string;
  assessment?: string;
  plan?: string;
  vital_signs?: any;
  pain_assessment?: any;
  symptoms?: any;
  interventions?: any;
  medications_administered?: any;
  patient_education?: string;
  education_topics?: any;
  patient_understanding?: string;
  caregiver_present?: boolean;
  caregiver_name?: string;
  caregiver_assessment?: string;
  caregiver_education?: string;
  caregiver_coping?: string;
  emotional_status?: string;
  spiritual_concerns?: string;
  social_concerns?: string;
  safety_concerns?: string;
  fall_risk?: string;
  skin_integrity?: string;
  environment_assessment?: string;
  home_safety_issues?: string;
  communication_with_physician?: string;
  communication_with_team?: string;
  orders_received?: string;
  clinical_notes?: string;
  follow_up_needed?: boolean;
  recommendations?: string;
  attachments?: any;
  signature?: any;
  cosignature?: any;
  amended?: boolean;
  amendment_count?: number;
  created_by_id?: string;
  updated_by_id?: string;
  deleted_at?: string;
  createdAt?: string;
  updatedAt?: string;
  addendums?: EncounterAddendum[];
  amendments?: EncounterAmendment[];
}

export interface EncounterAddendum {
  id: number;
  encounter_id: number;
  patient_id: number;
  addendum_date: string;
  addendum_reason?: string;
  addendum_content: string;
  added_by_id?: string;
  added_by_name?: string;
  signature?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface EncounterAmendment {
  id: number;
  encounter_id: number;
  patient_id: number;
  amendment_date: string;
  amendment_reason?: string;
  field_amended: string;
  original_value?: string;
  amended_value?: string;
  amendment_notes?: string;
  amended_by_id?: string;
  amended_by_name?: string;
  signature?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface EncounterListResponse {
  status: number;
  data: Encounter[];
  count: number;
  total: number;
  pagination: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface EncounterResponse {
  status: number;
  data: Encounter;
  message?: string;
}

// ==============================|| ENCOUNTER TYPES & DISCIPLINES ||============================== //

export const ENCOUNTER_TYPES = [
  { value: 'ADMISSION_VISIT', label: 'Admission Visit' },
  { value: 'ROUTINE_VISIT', label: 'Routine Visit' },
  { value: 'PRN_VISIT', label: 'PRN Visit' },
  { value: 'RECERTIFICATION_VISIT', label: 'Recertification Visit' },
  { value: 'DISCHARGE_VISIT', label: 'Discharge Visit' },
  { value: 'DEATH_VISIT', label: 'Death Visit' },
  { value: 'BEREAVEMENT_VISIT', label: 'Bereavement Visit' },
  { value: 'ON_CALL_VISIT', label: 'On-Call Visit' },
  { value: 'SUPERVISORY_VISIT', label: 'Supervisory Visit' },
  { value: 'CONTINUOUS_CARE', label: 'Continuous Care' },
  { value: 'INPATIENT_RESPITE', label: 'Inpatient Respite' },
  { value: 'GIP_VISIT', label: 'GIP Visit' }
];

export const DISCIPLINES = [
  { value: 'REGISTERED_NURSE', label: 'Registered Nurse' },
  { value: 'LICENSED_PRACTICAL_NURSE', label: 'Licensed Practical Nurse' },
  { value: 'CERTIFIED_NURSING_ASSISTANT', label: 'Certified Nursing Assistant' },
  { value: 'SOCIAL_WORKER', label: 'Social Worker' },
  { value: 'CHAPLAIN', label: 'Chaplain' },
  { value: 'VOLUNTEER', label: 'Volunteer' },
  { value: 'PHYSICIAN', label: 'Physician' },
  { value: 'NURSE_PRACTITIONER', label: 'Nurse Practitioner' },
  { value: 'PHYSICAL_THERAPIST', label: 'Physical Therapist' },
  { value: 'OCCUPATIONAL_THERAPIST', label: 'Occupational Therapist' },
  { value: 'SPEECH_THERAPIST', label: 'Speech Therapist' },
  { value: 'DIETITIAN', label: 'Dietitian' },
  { value: 'PHARMACIST', label: 'Pharmacist' },
  { value: 'BEREAVEMENT_COUNSELOR', label: 'Bereavement Counselor' },
  { value: 'MUSIC_THERAPIST', label: 'Music Therapist' }
];

export const ENCOUNTER_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'SIGNED', label: 'Signed' },
  { value: 'COSIGNED', label: 'Co-signed' },
  { value: 'AMENDED', label: 'Amended' },
  { value: 'CANCELLED', label: 'Cancelled' }
];

// ==============================|| MAIN ENCOUNTER ROUTES ||============================== //

/**
 * Get all encounters with optional filters and pagination
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getEncounters = async (filters?: EncounterFilters): Promise<EncounterListResponse> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  const queryString = params.toString();
  const url = queryString ? `/encounters?${queryString}` : '/encounters';
  const response = await http.get(url);
  return response.data;
};

/**
 * Get encounter by ID with addendums and amendments
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getEncounterById = async (id: string | number): Promise<EncounterResponse> => {
  const response = await http.get(`/encounters/${id}`);
  return response.data;
};

/**
 * Create a new encounter
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const createEncounter = async (encounterData: Partial<Encounter>): Promise<EncounterResponse> => {
  const response = await http.post('/encounters', encounterData);
  return response.data;
};

/**
 * Update an existing encounter (must be unsigned)
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const updateEncounter = async (id: string | number, encounterData: Partial<Encounter>): Promise<EncounterResponse> => {
  const response = await http.patch(`/encounters/${id}`, encounterData);
  return response.data;
};

/**
 * Delete an encounter (soft delete, must be unsigned)
 * @requires Permission: DELETE_CLINICAL_NOTES
 */
export const deleteEncounter = async (id: string | number): Promise<{ status: number; message: string }> => {
  const response = await http.delete(`/encounters/${id}`);
  return response.data;
};

// ==============================|| SIGNATURE ROUTES ||============================== //

/**
 * Sign an encounter (21 CFR Part 11 compliant)
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const signEncounter = async (id: string | number): Promise<EncounterResponse> => {
  const response = await http.post(`/encounters/${id}/sign`);
  return response.data;
};

/**
 * Cosign an encounter (requires prior signature)
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const cosignEncounter = async (id: string | number): Promise<EncounterResponse> => {
  const response = await http.post(`/encounters/${id}/cosign`);
  return response.data;
};

// ==============================|| ADDENDUM & AMENDMENT ROUTES ||============================== //

/**
 * Add an addendum to a signed encounter
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const addEncounterAddendum = async (
  id: string | number,
  addendumData: { addendum_content: string; addendum_reason?: string }
): Promise<{ status: number; message: string; data: EncounterAddendum }> => {
  const response = await http.post(`/encounters/${id}/addendum`, addendumData);
  return response.data;
};

/**
 * Add an amendment to a signed encounter
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const addEncounterAmendment = async (
  id: string | number,
  amendmentData: {
    field_amended: string;
    original_value: string;
    amended_value: string;
    amendment_reason: string;
    amendment_notes?: string;
  }
): Promise<{ status: number; message: string; data: EncounterAmendment }> => {
  const response = await http.post(`/encounters/${id}/amendments`, amendmentData);
  return response.data;
};

// ==============================|| QUERY ROUTES ||============================== //

/**
 * Get unsigned encounters (COMPLETED or UNSIGNED status)
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getUnsignedEncounters = async (filters?: {
  discipline?: string;
  staff_id?: string;
}): Promise<EncounterListResponse> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  const queryString = params.toString();
  const url = queryString ? `/encounters/unsigned?${queryString}` : '/encounters/unsigned';
  const response = await http.get(url);
  return response.data;
};

/**
 * Get encounters by discipline
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getEncountersByDiscipline = async (discipline: string): Promise<EncounterListResponse> => {
  const response = await http.get(`/encounters/by-discipline?discipline=${discipline}`);
  return response.data;
};

/**
 * Get patient's encounters
 * @requires Permission: VIEW_PATIENT or VIEW_CLINICAL_NOTES
 */
export const getPatientEncounters = async (patientId: string | number): Promise<EncounterListResponse> => {
  const response = await http.get(`/patients/${patientId}/encounters`);
  return response.data;
};

// ==============================|| HELPER FUNCTIONS ||============================== //

/**
 * Get human-readable label for encounter type
 */
export const getEncounterTypeLabel = (type: string): string => {
  const found = ENCOUNTER_TYPES.find((t) => t.value === type);
  return found ? found.label : type;
};

/**
 * Get human-readable label for discipline
 */
export const getDisciplineLabel = (discipline: string): string => {
  const found = DISCIPLINES.find((d) => d.value === discipline);
  return found ? found.label : discipline;
};

/**
 * Get human-readable label for status
 */
export const getStatusLabel = (status: string): string => {
  const found = ENCOUNTER_STATUSES.find((s) => s.value === status);
  return found ? found.label : status;
};

/**
 * Format encounter date for display
 */
export const formatEncounterDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};
