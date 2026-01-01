/**
 * Medication API Service
 *
 * API service for medication management including orders, MAR, reconciliation, and allergies.
 * All routes are mounted under /api and require authentication.
 */

import http from 'hooks/useCookie';

// ==============================|| MEDICATION TYPES ||============================== //

export type MedicationStatus = 'ACTIVE' | 'DISCONTINUED' | 'PAUSED' | 'HELD' | 'COMPLETED' | 'CANCELLED';
export type MedicationRoute = 'ORAL' | 'IV' | 'IM' | 'SQ' | 'RECTAL' | 'TOPICAL' | 'SUBLINGUAL' | 'INHALATION' | 'TRANSDERMAL' | 'OPHTHALMIC' | 'OTIC' | 'NASAL' | 'OTHER';
export type MedicationFrequency = 'ONCE' | 'DAILY' | 'BID' | 'TID' | 'QID' | 'Q4H' | 'Q6H' | 'Q8H' | 'Q12H' | 'WEEKLY' | 'MONTHLY' | 'PRN' | 'OTHER';
export type ControlledSchedule = 'SCHEDULE_II' | 'SCHEDULE_III' | 'SCHEDULE_IV' | 'SCHEDULE_V';
export type MARStatus = 'GIVEN' | 'NOT_GIVEN' | 'REFUSED' | 'HELD' | 'LATE' | 'MISSED';
export type ReconciliationType = 'ADMISSION' | 'TRANSFER' | 'DISCHARGE' | 'ROUTINE';
export type AllergenType = 'MEDICATION' | 'FOOD' | 'ENVIRONMENTAL' | 'OTHER';
export type ReactionSeverity = 'MILD' | 'MODERATE' | 'SEVERE' | 'LIFE_THREATENING';

export interface Medication {
  id: number;
  patient_id: number;
  medication_name: string;
  generic_name?: string;
  ndc_code?: string;
  medication_status: MedicationStatus;
  medication_route: MedicationRoute;
  dosage: string;
  frequency: MedicationFrequency;
  instructions?: string;
  start_date: string;
  end_date?: string;
  controlled_schedule?: ControlledSchedule;
  is_hospice_related: boolean;
  prescriber_id?: string;
  order_id?: number;
  discontinued_date?: string;
  discontinuation_reason?: string;
  created_by_id?: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
  deleted_at?: string;
}

export interface MAREntry {
  id: number;
  patient_id: number;
  medication_id: number;
  scheduled_time: string;
  actual_time?: string;
  mar_status: MARStatus;
  dosage_given?: string;
  route_used?: string;
  administered_by_id?: string;
  administered_by_name?: string;
  reason_not_given?: string;
  patient_response?: string;
  created_by_id?: string;
  createdAt: string;
  updatedAt: string;
  deleted_at?: string;
  medication?: Medication;
}

export interface MedicationReconciliation {
  id: number;
  patient_id: number;
  reconciliation_date: string;
  reconciliation_type: ReconciliationType;
  medications_reviewed: {
    home_medications?: HomeMedication[];
    current_medications?: { id: number; name: string; dosage: string; frequency: string }[];
  };
  discrepancies_found?: string;
  actions_taken?: string;
  performed_by_id?: string;
  performed_by_name?: string;
  signature?: any;
  created_by_id?: string;
  createdAt: string;
  updatedAt: string;
  deleted_at?: string;
}

export interface HomeMedication {
  medication_name?: string;
  name?: string;
  dosage?: string;
  frequency?: string;
  route?: string;
  prescriber?: string;
}

export interface PatientAllergy {
  id: number;
  patient_id: number;
  allergen_name: string;
  allergen_type: AllergenType;
  allergen_code?: string;
  reaction_type?: string;
  reaction_severity?: ReactionSeverity;
  reaction_description?: string;
  status: 'ACTIVE' | 'INACTIVE';
  onset_date?: string;
  source?: string;
  created_by_id?: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
  deleted_at?: string;
}

export interface DrugInteraction {
  id: number;
  drug1_name: string;
  drug2_name: string;
  interaction_severity: 'CONTRAINDICATED' | 'SEVERE' | 'MODERATE' | 'MINOR';
  interaction_description: string;
  clinical_significance: string;
  management_recommendation?: string;
  conflicting_medication?: string;
  conflicting_medication_id?: number;
}

export interface ComfortKit {
  id: number;
  patient_id: number;
  kit_number: string;
  issue_date: string;
  expiration_date?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DESTROYED' | 'RETURNED';
  medications: ComfortKitMedication[];
  location?: string;
  created_by_id?: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ComfortKitMedication {
  medication: string;
  quantity: string;
  lot_number?: string;
}

export interface ControlledSubstanceLogEntry {
  id: number;
  patient_id: number;
  medication_id?: number;
  log_date: string;
  action: 'DISPENSED' | 'DESTROYED' | 'RETURNED' | 'WASTED';
  medication_name: string;
  quantity?: string;
  lot_number?: string;
  witness_id?: string;
  witness_name?: string;
  notes?: string;
  logged_by_id?: string;
  createdAt: string;
}

export interface MedicationScheduleItem {
  medication_id: number;
  medication_name: string;
  dosage: string;
  route: MedicationRoute;
  frequency: MedicationFrequency;
  scheduled_time: string;
  is_prn: boolean;
  instructions?: string;
  controlled_schedule?: ControlledSchedule;
}

export interface MedicationDiscrepancy {
  type: 'MISSING_FROM_CURRENT' | 'DOSAGE_DIFFERENCE' | 'FREQUENCY_DIFFERENCE' | 'NEW_MEDICATION';
  medication: string;
  description: string;
  home_medication?: HomeMedication;
  current_medication_id?: number;
}

// ==============================|| REQUEST/RESPONSE TYPES ||============================== //

export interface CreateMedicationRequest {
  medication_name: string;
  generic_name?: string;
  ndc_code?: string;
  medication_route: MedicationRoute;
  dosage: string;
  frequency: MedicationFrequency;
  instructions?: string;
  start_date: string;
  end_date?: string;
  controlled_schedule?: ControlledSchedule;
  is_hospice_related?: boolean;
  prescriber_id?: string;
  order_id?: number;
  initial_quantity?: string;
  override_warnings?: boolean;
}

export interface UpdateMedicationRequest {
  medication_name?: string;
  generic_name?: string;
  ndc_code?: string;
  medication_route?: MedicationRoute;
  dosage?: string;
  frequency?: MedicationFrequency;
  instructions?: string;
  end_date?: string;
  is_hospice_related?: boolean;
  prescriber_id?: string;
  override_warnings?: boolean;
}

export interface CreateMAREntryRequest {
  medication_id: number;
  scheduled_time: string;
  actual_time?: string;
  mar_status: MARStatus;
  dosage_given?: string;
  route_used?: string;
  administered_by_id?: string;
  administered_by_name?: string;
  reason_not_given?: string;
  patient_response?: string;
}

export interface UpdateMAREntryRequest {
  actual_time?: string;
  mar_status?: MARStatus;
  dosage_given?: string;
  route_used?: string;
  reason_not_given?: string;
  patient_response?: string;
}

export interface CreateReconciliationRequest {
  reconciliation_date?: string;
  reconciliation_type?: ReconciliationType;
  home_medications?: HomeMedication[];
  medications_reviewed?: any;
  discrepancies_found?: string;
  actions_taken?: string;
  performed_by_id?: string;
  performed_by_name?: string;
}

export interface CreateAllergyRequest {
  allergen_name: string;
  allergen_type?: AllergenType;
  allergen_code?: string;
  reaction_type?: string;
  reaction_severity?: ReactionSeverity;
  reaction_description?: string;
  onset_date?: string;
  source?: string;
}

export interface CreateComfortKitRequest {
  kit_number: string;
  issue_date?: string;
  expiration_date?: string;
  medications: ComfortKitMedication[];
  location?: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: string;
  is_hospice_related?: boolean;
}

export interface MARQueryParams {
  start_date?: string;
  end_date?: string;
  medication_id?: number;
  mar_status?: MARStatus;
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

export interface ApiResponse<T> {
  status: number;
  message?: string;
  data?: T;
  errors?: string[];
  warnings?: {
    drug_interactions?: DrugInteraction[];
    allergy_conflicts?: PatientAllergy[];
    overridden?: boolean;
  };
}

// ==============================|| MEDICATION ROUTES ||============================== //

/**
 * Get all medications for a patient
 */
export const getPatientMedications = async (
  patientId: string | number,
  params?: PaginationParams
): Promise<PaginatedResponse<Medication>> => {
  const response = await http.get(`/patients/${patientId}/medications`, { params });
  return response.data;
};

/**
 * Get a single medication by ID
 */
export const getMedication = async (
  patientId: string | number,
  medicationId: string | number
): Promise<ApiResponse<Medication>> => {
  const response = await http.get(`/patients/${patientId}/medications/${medicationId}`);
  return response.data;
};

/**
 * Create a new medication order
 */
export const createMedication = async (
  patientId: string | number,
  data: CreateMedicationRequest
): Promise<ApiResponse<Medication>> => {
  const response = await http.post(`/patients/${patientId}/medications`, data);
  return response.data;
};

/**
 * Update a medication order
 */
export const updateMedication = async (
  patientId: string | number,
  medicationId: string | number,
  data: UpdateMedicationRequest
): Promise<ApiResponse<Medication>> => {
  const response = await http.put(`/patients/${patientId}/medications/${medicationId}`, data);
  return response.data;
};

/**
 * Cancel a medication order
 */
export const cancelMedication = async (
  patientId: string | number,
  medicationId: string | number,
  reason?: string
): Promise<ApiResponse<Medication>> => {
  const response = await http.delete(`/patients/${patientId}/medications/${medicationId}`, {
    data: { reason }
  });
  return response.data;
};

/**
 * Discontinue a medication
 */
export const discontinueMedication = async (
  patientId: string | number,
  medicationId: string | number,
  reason: string
): Promise<ApiResponse<Medication>> => {
  const response = await http.post(`/patients/${patientId}/medications/${medicationId}/discontinue`, { reason });
  return response.data;
};

/**
 * Hold a medication
 */
export const holdMedication = async (
  patientId: string | number,
  medicationId: string | number,
  reason: string,
  hold_until?: string
): Promise<ApiResponse<Medication>> => {
  const response = await http.post(`/patients/${patientId}/medications/${medicationId}/hold`, { reason, hold_until });
  return response.data;
};

/**
 * Pause a medication
 */
export const pauseMedication = async (
  patientId: string | number,
  medicationId: string | number,
  reason: string,
  pause_until?: string
): Promise<ApiResponse<Medication>> => {
  const response = await http.post(`/patients/${patientId}/medications/${medicationId}/pause`, { reason, pause_until });
  return response.data;
};

/**
 * Resume a paused/held medication
 */
export const resumeMedication = async (
  patientId: string | number,
  medicationId: string | number
): Promise<ApiResponse<Medication>> => {
  const response = await http.post(`/patients/${patientId}/medications/${medicationId}/resume`);
  return response.data;
};

/**
 * Check drug interactions for a medication
 */
export const checkInteractions = async (
  patientId: string | number,
  medication_name: string
): Promise<ApiResponse<{
  medication_name: string;
  has_warnings: boolean;
  drug_interactions: DrugInteraction[];
  allergy_conflicts: PatientAllergy[];
}>> => {
  const response = await http.post(`/patients/${patientId}/medications/check-interactions`, { medication_name });
  return response.data;
};

/**
 * Get medication schedule for a patient
 */
export const getMedicationSchedule = async (
  patientId: string | number,
  date?: string
): Promise<ApiResponse<{
  date: string;
  total_administrations: number;
  schedule: MedicationScheduleItem[];
}>> => {
  const response = await http.get(`/patients/${patientId}/medications/schedule`, { params: { date } });
  return response.data;
};

// ==============================|| MAR ROUTES ||============================== //

/**
 * Get MAR entries for a patient
 */
export const getPatientMAR = async (
  patientId: string | number,
  params?: MARQueryParams
): Promise<{ status: number; data: { mar_entry: MAREntry; medication: Medication }[]; count: number }> => {
  const response = await http.get(`/patients/${patientId}/mar`, { params });
  return response.data;
};

/**
 * Get a single MAR entry
 */
export const getMAREntry = async (
  patientId: string | number,
  marId: string | number
): Promise<ApiResponse<{ mar_entry: MAREntry; medication: Medication }>> => {
  const response = await http.get(`/patients/${patientId}/mar/${marId}`);
  return response.data;
};

/**
 * Create a MAR entry
 */
export const createMAREntry = async (
  patientId: string | number,
  data: CreateMAREntryRequest
): Promise<ApiResponse<MAREntry>> => {
  const response = await http.post(`/patients/${patientId}/mar`, data);
  return response.data;
};

/**
 * Update a MAR entry
 */
export const updateMAREntry = async (
  patientId: string | number,
  marId: string | number,
  data: UpdateMAREntryRequest
): Promise<ApiResponse<MAREntry>> => {
  const response = await http.put(`/patients/${patientId}/mar/${marId}`, data);
  return response.data;
};

// ==============================|| MEDICATION RECONCILIATION ROUTES ||============================== //

/**
 * Get medication reconciliation history
 */
export const getMedicationReconciliationHistory = async (
  patientId: string | number,
  params?: { reconciliation_type?: ReconciliationType; start_date?: string; end_date?: string }
): Promise<{ status: number; data: MedicationReconciliation[]; count: number }> => {
  const response = await http.get(`/patients/${patientId}/medication-reconciliation`, { params });
  return response.data;
};

/**
 * Get a single medication reconciliation
 */
export const getMedicationReconciliation = async (
  patientId: string | number,
  reconciliationId: string | number
): Promise<ApiResponse<MedicationReconciliation>> => {
  const response = await http.get(`/patients/${patientId}/medication-reconciliation/${reconciliationId}`);
  return response.data;
};

/**
 * Create medication reconciliation
 */
export const createMedicationReconciliation = async (
  patientId: string | number,
  data: CreateReconciliationRequest
): Promise<ApiResponse<MedicationReconciliation>> => {
  const response = await http.post(`/patients/${patientId}/medication-reconciliation`, data);
  return response.data;
};

/**
 * Compare medications for reconciliation
 */
export const compareMedications = async (
  patientId: string | number,
  home_medications: HomeMedication[]
): Promise<ApiResponse<{
  home_medications_count: number;
  current_medications_count: number;
  discrepancies_count: number;
  discrepancies: MedicationDiscrepancy[];
  current_medications: { id: number; name: string; dosage: string; frequency: string; route: string }[];
}>> => {
  const response = await http.post(`/patients/${patientId}/medication-reconciliation/compare`, { home_medications });
  return response.data;
};

// ==============================|| ALLERGY ROUTES ||============================== //

/**
 * Get patient allergies
 */
export const getPatientAllergies = async (
  patientId: string | number,
  params?: { status?: string; allergen_type?: AllergenType }
): Promise<{ status: number; data: PatientAllergy[]; count: number }> => {
  const response = await http.get(`/patients/${patientId}/allergies`, { params });
  return response.data;
};

/**
 * Create patient allergy
 */
export const createPatientAllergy = async (
  patientId: string | number,
  data: CreateAllergyRequest
): Promise<ApiResponse<PatientAllergy>> => {
  const response = await http.post(`/patients/${patientId}/allergies`, data);
  return response.data;
};

/**
 * Update patient allergy
 */
export const updatePatientAllergy = async (
  patientId: string | number,
  allergyId: string | number,
  data: Partial<CreateAllergyRequest & { status?: 'ACTIVE' | 'INACTIVE' }>
): Promise<ApiResponse<PatientAllergy>> => {
  const response = await http.put(`/patients/${patientId}/allergies/${allergyId}`, data);
  return response.data;
};

/**
 * Delete patient allergy
 */
export const deletePatientAllergy = async (
  patientId: string | number,
  allergyId: string | number
): Promise<ApiResponse<void>> => {
  const response = await http.delete(`/patients/${patientId}/allergies/${allergyId}`);
  return response.data;
};

// ==============================|| COMFORT KIT ROUTES ||============================== //

/**
 * Get patient comfort kits
 */
export const getPatientComfortKits = async (
  patientId: string | number
): Promise<{ status: number; data: ComfortKit[]; count: number }> => {
  const response = await http.get(`/patients/${patientId}/comfort-kit`);
  return response.data;
};

/**
 * Create comfort kit
 */
export const createComfortKit = async (
  patientId: string | number,
  data: CreateComfortKitRequest
): Promise<ApiResponse<ComfortKit>> => {
  const response = await http.post(`/patients/${patientId}/comfort-kit`, data);
  return response.data;
};

/**
 * Destroy comfort kit
 */
export const destroyComfortKit = async (
  patientId: string | number,
  kit_id: number,
  witness_id?: string,
  witness_name?: string,
  destruction_notes?: string
): Promise<ApiResponse<ComfortKit>> => {
  const response = await http.post(`/patients/${patientId}/comfort-kit/destroy`, {
    kit_id,
    witness_id,
    witness_name,
    destruction_notes
  });
  return response.data;
};

// ==============================|| CONTROLLED SUBSTANCE ROUTES ||============================== //

/**
 * Get controlled substance log
 */
export const getControlledSubstanceLog = async (
  patientId: string | number,
  params?: { action?: string; medication_id?: number; start_date?: string; end_date?: string }
): Promise<{ status: number; data: ControlledSubstanceLogEntry[]; count: number }> => {
  const response = await http.get(`/patients/${patientId}/controlled-substances`, { params });
  return response.data;
};

// ==============================|| CONSTANTS ||============================== //

export const MEDICATION_ROUTES: { value: MedicationRoute; label: string }[] = [
  { value: 'ORAL', label: 'Oral' },
  { value: 'IV', label: 'Intravenous (IV)' },
  { value: 'IM', label: 'Intramuscular (IM)' },
  { value: 'SQ', label: 'Subcutaneous (SQ)' },
  { value: 'RECTAL', label: 'Rectal' },
  { value: 'TOPICAL', label: 'Topical' },
  { value: 'SUBLINGUAL', label: 'Sublingual' },
  { value: 'INHALATION', label: 'Inhalation' },
  { value: 'TRANSDERMAL', label: 'Transdermal' },
  { value: 'OPHTHALMIC', label: 'Ophthalmic' },
  { value: 'OTIC', label: 'Otic' },
  { value: 'NASAL', label: 'Nasal' },
  { value: 'OTHER', label: 'Other' }
];

export const MEDICATION_FREQUENCIES: { value: MedicationFrequency; label: string }[] = [
  { value: 'ONCE', label: 'Once' },
  { value: 'DAILY', label: 'Daily' },
  { value: 'BID', label: 'BID (Twice daily)' },
  { value: 'TID', label: 'TID (Three times daily)' },
  { value: 'QID', label: 'QID (Four times daily)' },
  { value: 'Q4H', label: 'Every 4 hours' },
  { value: 'Q6H', label: 'Every 6 hours' },
  { value: 'Q8H', label: 'Every 8 hours' },
  { value: 'Q12H', label: 'Every 12 hours' },
  { value: 'WEEKLY', label: 'Weekly' },
  { value: 'MONTHLY', label: 'Monthly' },
  { value: 'PRN', label: 'PRN (As needed)' },
  { value: 'OTHER', label: 'Other' }
];

export const CONTROLLED_SCHEDULES: { value: ControlledSchedule; label: string }[] = [
  { value: 'SCHEDULE_II', label: 'Schedule II' },
  { value: 'SCHEDULE_III', label: 'Schedule III' },
  { value: 'SCHEDULE_IV', label: 'Schedule IV' },
  { value: 'SCHEDULE_V', label: 'Schedule V' }
];

export const MAR_STATUSES: { value: MARStatus; label: string; color: string }[] = [
  { value: 'GIVEN', label: 'Given', color: 'success' },
  { value: 'NOT_GIVEN', label: 'Not Given', color: 'error' },
  { value: 'REFUSED', label: 'Refused', color: 'warning' },
  { value: 'HELD', label: 'Held', color: 'info' },
  { value: 'LATE', label: 'Late', color: 'warning' },
  { value: 'MISSED', label: 'Missed', color: 'error' }
];

export const MEDICATION_STATUSES: { value: MedicationStatus; label: string; color: string }[] = [
  { value: 'ACTIVE', label: 'Active', color: 'success' },
  { value: 'DISCONTINUED', label: 'Discontinued', color: 'error' },
  { value: 'PAUSED', label: 'Paused', color: 'warning' },
  { value: 'HELD', label: 'Held', color: 'info' },
  { value: 'COMPLETED', label: 'Completed', color: 'default' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'error' }
];

export const RECONCILIATION_TYPES: { value: ReconciliationType; label: string }[] = [
  { value: 'ADMISSION', label: 'Admission' },
  { value: 'TRANSFER', label: 'Transfer' },
  { value: 'DISCHARGE', label: 'Discharge' },
  { value: 'ROUTINE', label: 'Routine Review' }
];

export const ALLERGEN_TYPES: { value: AllergenType; label: string }[] = [
  { value: 'MEDICATION', label: 'Medication' },
  { value: 'FOOD', label: 'Food' },
  { value: 'ENVIRONMENTAL', label: 'Environmental' },
  { value: 'OTHER', label: 'Other' }
];

export const REACTION_SEVERITIES: { value: ReactionSeverity; label: string; color: string }[] = [
  { value: 'MILD', label: 'Mild', color: 'success' },
  { value: 'MODERATE', label: 'Moderate', color: 'warning' },
  { value: 'SEVERE', label: 'Severe', color: 'error' },
  { value: 'LIFE_THREATENING', label: 'Life-Threatening', color: 'error' }
];
