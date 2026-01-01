/**
 * Bereavement API Service
 *
 * API service for bereavement case management, contact tracking, follow-ups, and resources.
 * All routes require authentication.
 *
 * CMS Requirements:
 * - 13-month bereavement services after patient death
 * - Standard follow-up milestones (1 week, 1 month, 3 months, 6 months, 1 year)
 * - HIPAA-compliant audit logging
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export interface BereavementCase {
  id: number;
  patient_id: number;
  date_of_death: string;
  bereavement_start_date: string;
  bereavement_end_date: string;
  case_status: 'ACTIVE' | 'COMPLETED' | 'CLOSED_EARLY';
  primary_contact_id?: number;
  service_level?: 'STANDARD' | 'ENHANCED' | 'HIGH_RISK';
  assigned_counselor_id?: string;
  services_offered: boolean;
  services_declined?: boolean;
  decline_reason?: string;
  decline_date?: string;
  initial_assessment_notes?: string;
  special_considerations?: string;
  cultural_preferences?: string;
  closure_date?: string;
  closure_reason?: string;
  closure_notes?: string;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  createdAt?: string;
  updatedAt?: string;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    medical_record_number: string;
  };
}

export interface BereavementContact {
  id: number;
  bereavement_case_id: number;
  first_name: string;
  last_name: string;
  relationship_to_deceased?: string;
  phone?: string;
  email?: string;
  address?: string;
  preferred_contact_method?: 'PHONE' | 'EMAIL' | 'MAIL' | 'IN_PERSON';
  preferred_contact_times?: string;
  date_of_birth?: string;
  gender?: string;
  preferred_language?: string;
  is_primary_contact?: boolean;
  wants_services?: boolean;
  service_preferences?: string;
  grief_assessment_score?: number;
  grief_assessment_tool?: string;
  grief_assessment_date?: string;
  grief_stage?: 'DENIAL' | 'ANGER' | 'BARGAINING' | 'DEPRESSION' | 'ACCEPTANCE';
  grief_notes?: string;
  consent_status?: 'PENDING' | 'GRANTED' | 'DECLINED' | 'WITHDRAWN';
  consent_date?: string;
  can_share_info?: boolean;
  can_contact_via_phone?: boolean;
  can_contact_via_email?: boolean;
  can_contact_via_mail?: boolean;
  has_special_needs?: boolean;
  special_needs_notes?: string;
  accessibility_requirements?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BereavementFollowUp {
  id: number;
  bereavement_case_id: number;
  bereavement_contact_id?: number;
  milestone_type: '1_WEEK' | '1_MONTH' | '3_MONTHS' | '6_MONTHS' | '1_YEAR' | 'CUSTOM';
  milestone_description?: string;
  scheduled_date: string;
  reminder_sent?: boolean;
  reminder_sent_date?: string;
  contact_method?: 'PHONE_CALL' | 'HOME_VISIT' | 'LETTER' | 'EMAIL' | 'SYMPATHY_CARD';
  follow_up_status: 'SCHEDULED' | 'COMPLETED' | 'MISSED' | 'RESCHEDULED' | 'CANCELLED' | 'DECLINED';
  completed_date?: string;
  completed_by_id?: string;
  contact_outcome?: 'SUCCESSFUL' | 'NO_ANSWER' | 'LEFT_MESSAGE' | 'DECLINED' | 'OTHER';
  family_wellbeing_assessment?: 'COPING_WELL' | 'MILD_DISTRESS' | 'MODERATE_DISTRESS' | 'SEVERE_DISTRESS' | 'CRISIS';
  wellbeing_score?: number;
  issues_identified?: string;
  additional_support_needed?: boolean;
  support_type_needed?: string;
  referrals_made?: string;
  follow_up_notes?: string;
  family_feedback?: string;
  follow_up_required?: boolean;
  next_follow_up_date?: string;
  next_follow_up_notes?: string;
  createdAt?: string;
  updatedAt?: string;
  contact?: BereavementContact;
}

export interface BereavementEncounter {
  id: number;
  bereavement_case_id: number;
  bereavement_contact_id?: number;
  encounter_date: string;
  encounter_time?: string;
  encounter_type: 'PHONE_CALL' | 'HOME_VISIT' | 'OFFICE_VISIT' | 'MAILING' | 'EMAIL' | 'MEMORIAL_SERVICE';
  duration_minutes?: number;
  counselor_id?: string;
  counselor_name?: string;
  purpose?: string;
  topics_discussed?: string;
  grief_assessment?: string;
  interventions_provided?: string;
  contact_response?: 'RECEPTIVE' | 'NEUTRAL' | 'RESISTANT' | 'NO_RESPONSE';
  follow_up_needed?: boolean;
  follow_up_date?: string;
  follow_up_notes?: string;
  materials_sent?: string;
  referrals_provided?: string;
  encounter_notes?: string;
  createdAt?: string;
  updatedAt?: string;
  contact?: BereavementContact;
}

export interface BereavementResource {
  id: number;
  bereavement_case_id: number;
  bereavement_contact_id?: number;
  resource_type: string;
  resource_name: string;
  resource_description?: string;
  resource_url?: string;
  resource_phone?: string;
  resource_address?: string;
  resource_contact?: string;
  date_provided: string;
  provided_by_id?: string;
  delivery_method?: 'IN_PERSON' | 'MAILED' | 'EMAILED' | 'PHONE';
  is_recurring?: boolean;
  recurrence_frequency?: string;
  next_occurrence_date?: string;
  resource_utilized?: boolean;
  utilization_date?: string;
  family_feedback?: string;
  feedback_rating?: number;
  was_helpful?: boolean;
  is_external_referral?: boolean;
  external_organization?: string;
  referral_status?: 'PENDING' | 'ACCEPTED' | 'COMPLETED' | 'DECLINED';
  referral_outcome?: string;
  notes?: string;
  follow_up_needed?: boolean;
  createdAt?: string;
  updatedAt?: string;
  contact?: BereavementContact;
}

export interface BereavementRiskAssessment {
  id: number;
  bereavement_case_id: number;
  bereavement_contact_id?: number;
  assessment_date: string;
  assessed_by_id?: string;
  sudden_death?: boolean;
  traumatic_death?: boolean;
  suicide?: boolean;
  child_death?: boolean;
  multiple_losses?: boolean;
  history_of_mental_illness?: boolean;
  history_of_substance_abuse?: boolean;
  limited_social_support?: boolean;
  financial_stress?: boolean;
  caregiver_burden?: boolean;
  prolonged_grief?: boolean;
  depression_symptoms?: boolean;
  anxiety_symptoms?: boolean;
  suicidal_ideation?: boolean;
  functional_impairment?: boolean;
  total_risk_score?: number;
  risk_level?: 'LOW' | 'MODERATE' | 'HIGH';
  recommended_interventions?: string;
  referrals_needed?: string;
  assessment_notes?: string;
  follow_up_plan?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BereavementPlan {
  id: number;
  bereavement_case_id: number;
  plan_date: string;
  plan_status: 'ACTIVE' | 'REVISED' | 'COMPLETED';
  grief_stage?: string;
  risk_level?: 'LOW' | 'MODERATE' | 'HIGH';
  risk_factors?: string;
  goals?: string;
  planned_interventions?: string;
  recommended_frequency?: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY' | 'AS_NEEDED';
  materials_provided?: string;
  referrals_made?: string;
  support_groups_recommended?: string;
  next_review_date?: string;
  review_notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BereavementAuditLog {
  id: number;
  bereavement_case_id: number;
  action_type: string;
  entity_type: string;
  entity_id?: number;
  field_name?: string;
  old_value?: string;
  new_value?: string;
  changes_summary?: Record<string, any>;
  user_id: string;
  user_name?: string;
  user_role?: string;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  reason?: string;
  action_timestamp: string;
  createdAt: string;
}

export interface CaseSummary {
  case: BereavementCase;
  patient: any;
  assigned_counselor: any;
  statistics: {
    total_contacts: number;
    total_encounters: number;
    total_documents: number;
    follow_ups: Record<string, number>;
  };
  latest_risk_assessment: BereavementRiskAssessment | null;
  bereavement_progress: {
    start_date: string;
    end_date: string;
    days_remaining: number;
  };
}

export interface BereavementListParams {
  limit?: number;
  offset?: number;
  case_status?: string;
  service_level?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  assigned_counselor_id?: string;
  sort_by?: 'date_of_death' | 'createdAt' | 'case_status';
  sort_order?: 'asc' | 'desc';
}

export interface CreateBereavementCaseData {
  patient_id: number;
  date_of_death: string;
  service_level?: 'STANDARD' | 'ENHANCED' | 'HIGH_RISK';
  initial_assessment_notes?: string;
  special_considerations?: string;
  cultural_preferences?: string;
}

export interface CreateContactData {
  first_name: string;
  last_name: string;
  relationship_to_deceased?: string;
  phone?: string;
  email?: string;
  address?: string;
  preferred_contact_method?: 'PHONE' | 'EMAIL' | 'MAIL' | 'IN_PERSON';
  preferred_contact_times?: string;
  is_primary_contact?: boolean;
  wants_services?: boolean;
  preferred_language?: string;
  has_special_needs?: boolean;
  special_needs_notes?: string;
}

export interface CreateFollowUpData {
  milestone_type: '1_WEEK' | '1_MONTH' | '3_MONTHS' | '6_MONTHS' | '1_YEAR' | 'CUSTOM';
  scheduled_date: string;
  bereavement_contact_id?: number;
  contact_method?: 'PHONE_CALL' | 'HOME_VISIT' | 'LETTER' | 'EMAIL' | 'SYMPATHY_CARD';
  milestone_description?: string;
}

export interface CreateEncounterData {
  encounter_date: string;
  encounter_type: 'PHONE_CALL' | 'HOME_VISIT' | 'OFFICE_VISIT' | 'MAILING' | 'EMAIL' | 'MEMORIAL_SERVICE';
  bereavement_contact_id?: number;
  encounter_time?: string;
  duration_minutes?: number;
  purpose?: string;
  topics_discussed?: string;
  interventions_provided?: string;
  encounter_notes?: string;
}

export interface CreateResourceData {
  resource_type: string;
  resource_name: string;
  date_provided: string;
  bereavement_contact_id?: number;
  resource_description?: string;
  resource_url?: string;
  delivery_method?: 'IN_PERSON' | 'MAILED' | 'EMAILED' | 'PHONE';
  notes?: string;
}

// ==============================|| BEREAVEMENT CASES ROUTES ||============================== //

/**
 * List all bereavement cases with filtering and pagination
 */
export const listBereavementCases = async (params?: BereavementListParams) => {
  const response = await http.get('/bereavement/cases', { params });
  return response.data;
};

/**
 * Get patient bereavement case
 */
export const getPatientBereavementCase = async (patientId: string | number) => {
  const response = await http.get('/bereavement/cases', {
    params: { patient_id: patientId }
  });
  return response.data;
};

/**
 * Create bereavement case
 */
export const createBereavementCase = async (data: CreateBereavementCaseData) => {
  const response = await http.post('/bereavement/cases', data);
  return response.data;
};

/**
 * Get bereavement case by ID
 */
export const getBereavementCaseById = async (id: string | number) => {
  const response = await http.get(`/bereavement/cases/${id}`);
  return response.data;
};

/**
 * Update bereavement case
 */
export const updateBereavementCase = async (id: string | number, data: Partial<BereavementCase>) => {
  const response = await http.patch(`/bereavement/cases/${id}`, data);
  return response.data;
};

/**
 * Delete bereavement case (soft delete)
 */
export const deleteBereavementCase = async (id: string | number, reason?: string) => {
  const response = await http.delete(`/bereavement/cases/${id}`, { data: { reason } });
  return response.data;
};

/**
 * Assign staff to bereavement case
 */
export const assignStaffToCase = async (id: string | number, assigned_counselor_id: string) => {
  const response = await http.post(`/bereavement/cases/${id}/assign`, { assigned_counselor_id });
  return response.data;
};

/**
 * Get case summary/report
 */
export const getCaseSummary = async (id: string | number): Promise<CaseSummary> => {
  const response = await http.get(`/bereavement/cases/${id}/summary`);
  return response.data.data;
};

/**
 * Get case audit log
 */
export const getCaseAuditLog = async (id: string | number, params?: { limit?: number; offset?: number }) => {
  const response = await http.get(`/bereavement/cases/${id}/audit-log`, { params });
  return response.data;
};

// ==============================|| CONTACTS ROUTES ||============================== //

/**
 * Get contacts for a bereavement case
 */
export const getCaseContacts = async (caseId: string | number): Promise<BereavementContact[]> => {
  const response = await http.get(`/bereavement/cases/${caseId}/contacts`);
  return response.data.data || [];
};

/**
 * Add contact to bereavement case
 */
export const addContact = async (caseId: string | number, data: CreateContactData) => {
  const response = await http.post(`/bereavement/cases/${caseId}/contacts`, data);
  return response.data;
};

/**
 * Update contact
 */
export const updateContact = async (contactId: string | number, data: Partial<BereavementContact>) => {
  const response = await http.patch(`/bereavement/contacts/${contactId}`, data);
  return response.data;
};

/**
 * Update contact grief assessment
 */
export const updateContactGriefAssessment = async (
  contactId: string | number,
  data: {
    grief_assessment_score?: number;
    grief_assessment_tool?: string;
    grief_stage?: string;
    grief_notes?: string;
  }
) => {
  const response = await http.patch(`/bereavement/contacts/${contactId}/grief-assessment`, data);
  return response.data;
};

/**
 * Update contact consent
 */
export const updateContactConsent = async (
  contactId: string | number,
  data: {
    consent_status: string;
    can_share_info?: boolean;
    can_contact_via_phone?: boolean;
    can_contact_via_email?: boolean;
    can_contact_via_mail?: boolean;
  }
) => {
  const response = await http.patch(`/bereavement/contacts/${contactId}/consent`, data);
  return response.data;
};

// ==============================|| FOLLOW-UPS ROUTES ||============================== //

/**
 * Get follow-ups for a bereavement case
 */
export const getCaseFollowUps = async (
  caseId: string | number,
  params?: { status?: string; milestone_type?: string }
): Promise<BereavementFollowUp[]> => {
  const response = await http.get(`/bereavement/cases/${caseId}/follow-ups`, { params });
  return response.data.data || [];
};

/**
 * Create follow-up
 */
export const createFollowUp = async (caseId: string | number, data: CreateFollowUpData) => {
  const response = await http.post(`/bereavement/cases/${caseId}/follow-ups`, data);
  return response.data;
};

/**
 * Update follow-up
 */
export const updateFollowUp = async (followUpId: string | number, data: Partial<BereavementFollowUp>) => {
  const response = await http.patch(`/bereavement/follow-ups/${followUpId}`, data);
  return response.data;
};

/**
 * Generate standard follow-ups (1 week, 1 month, 3 months, 6 months, 1 year)
 */
export const generateStandardFollowUps = async (caseId: string | number, contact_id?: number) => {
  const response = await http.post(`/bereavement/cases/${caseId}/follow-ups/generate`, { contact_id });
  return response.data;
};

// ==============================|| ENCOUNTERS ROUTES ||============================== //

/**
 * Get encounters for a bereavement case
 */
export const getCaseEncounters = async (caseId: string | number): Promise<BereavementEncounter[]> => {
  const response = await http.get(`/bereavement/cases/${caseId}/encounters`);
  return response.data.data || [];
};

/**
 * Create encounter
 */
export const createEncounter = async (caseId: string | number, data: CreateEncounterData) => {
  const response = await http.post(`/bereavement/cases/${caseId}/encounters`, data);
  return response.data;
};

// ==============================|| RESOURCES ROUTES ||============================== //

/**
 * Get resources for a bereavement case
 */
export const getCaseResources = async (
  caseId: string | number,
  params?: { resource_type?: string }
): Promise<BereavementResource[]> => {
  const response = await http.get(`/bereavement/cases/${caseId}/resources`, { params });
  return response.data.data || [];
};

/**
 * Add resource
 */
export const addResource = async (caseId: string | number, data: CreateResourceData) => {
  const response = await http.post(`/bereavement/cases/${caseId}/resources`, data);
  return response.data;
};

/**
 * Update resource
 */
export const updateResource = async (resourceId: string | number, data: Partial<BereavementResource>) => {
  const response = await http.patch(`/bereavement/resources/${resourceId}`, data);
  return response.data;
};

// ==============================|| RISK ASSESSMENTS ROUTES ||============================== //

/**
 * Get risk assessments for a case
 */
export const getCaseRiskAssessments = async (caseId: string | number): Promise<BereavementRiskAssessment[]> => {
  const response = await http.get(`/bereavement/cases/${caseId}/risk-assessments`);
  return response.data.data || [];
};

/**
 * Create risk assessment
 */
export const createRiskAssessment = async (
  caseId: string | number,
  data: Partial<BereavementRiskAssessment>
) => {
  const response = await http.post(`/bereavement/cases/${caseId}/risk-assessments`, data);
  return response.data;
};

// ==============================|| PLANS ROUTES ||============================== //

/**
 * Get plans for a bereavement case
 */
export const getCasePlans = async (caseId: string | number): Promise<BereavementPlan[]> => {
  const response = await http.get(`/bereavement/cases/${caseId}/plans`);
  return response.data.data || [];
};

/**
 * Create plan
 */
export const createPlan = async (caseId: string | number, data: Partial<BereavementPlan>) => {
  const response = await http.post(`/bereavement/cases/${caseId}/plans`, data);
  return response.data;
};

// ==============================|| HELPER FUNCTIONS ||============================== //

/**
 * Calculate days remaining in bereavement period
 */
export const getDaysRemaining = (endDate: string): number => {
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  return Math.max(0, Math.ceil((end.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)));
};

/**
 * Calculate days until follow-up
 */
export const getDaysUntilFollowUp = (scheduledDate: string): number => {
  const scheduled = new Date(scheduledDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  scheduled.setHours(0, 0, 0, 0);
  return Math.ceil((scheduled.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Get follow-up status based on date
 */
export const getFollowUpStatus = (
  scheduledDate: string,
  status: string
): 'overdue' | 'due_soon' | 'upcoming' | 'completed' => {
  if (status === 'COMPLETED') return 'completed';

  const daysUntil = getDaysUntilFollowUp(scheduledDate);

  if (daysUntil < 0) return 'overdue';
  if (daysUntil <= 3) return 'due_soon';
  return 'upcoming';
};

/**
 * Format milestone type for display
 */
export const formatMilestoneType = (type: string): string => {
  const milestoneMap: Record<string, string> = {
    '1_WEEK': '1 Week',
    '1_MONTH': '1 Month',
    '3_MONTHS': '3 Months',
    '6_MONTHS': '6 Months',
    '1_YEAR': '1 Year',
    'CUSTOM': 'Custom'
  };
  return milestoneMap[type] || type;
};

/**
 * Format contact method for display
 */
export const formatContactMethod = (method: string): string => {
  const methodMap: Record<string, string> = {
    'PHONE_CALL': 'Phone Call',
    'HOME_VISIT': 'Home Visit',
    'OFFICE_VISIT': 'Office Visit',
    'LETTER': 'Letter',
    'EMAIL': 'Email',
    'MAILING': 'Mailing',
    'SYMPATHY_CARD': 'Sympathy Card',
    'MEMORIAL_SERVICE': 'Memorial Service',
    'IN_PERSON': 'In Person',
    'PHONE': 'Phone',
    'MAIL': 'Mail'
  };
  return methodMap[method] || method;
};

/**
 * Format relationship for display
 */
export const formatRelationship = (relationship: string): string => {
  const relationshipMap: Record<string, string> = {
    'SPOUSE': 'Spouse',
    'CHILD': 'Child',
    'PARENT': 'Parent',
    'SIBLING': 'Sibling',
    'FRIEND': 'Friend',
    'OTHER': 'Other'
  };
  return relationshipMap[relationship] || relationship;
};

/**
 * Get status color for MUI components
 */
export const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  const colorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    'ACTIVE': 'success',
    'COMPLETED': 'info',
    'CLOSED_EARLY': 'warning',
    'SCHEDULED': 'info',
    'MISSED': 'error',
    'CANCELLED': 'default',
    'DECLINED': 'warning',
    'RESCHEDULED': 'warning',
    'LOW': 'success',
    'MODERATE': 'warning',
    'HIGH': 'error',
    'COPING_WELL': 'success',
    'MILD_DISTRESS': 'warning',
    'MODERATE_DISTRESS': 'warning',
    'SEVERE_DISTRESS': 'error',
    'CRISIS': 'error',
    'GRANTED': 'success',
    'PENDING': 'warning',
    'WITHDRAWN': 'error'
  };
  return colorMap[status] || 'default';
};

/**
 * Format grief stage for display
 */
export const formatGriefStage = (stage: string): string => {
  const stageMap: Record<string, string> = {
    'DENIAL': 'Denial',
    'ANGER': 'Anger',
    'BARGAINING': 'Bargaining',
    'DEPRESSION': 'Depression',
    'ACCEPTANCE': 'Acceptance'
  };
  return stageMap[stage] || stage;
};

/**
 * Format case status for display
 */
export const formatCaseStatus = (status: string): string => {
  const statusMap: Record<string, string> = {
    'ACTIVE': 'Active',
    'COMPLETED': 'Completed',
    'CLOSED_EARLY': 'Closed Early'
  };
  return statusMap[status] || status;
};

/**
 * Format service level for display
 */
export const formatServiceLevel = (level: string): string => {
  const levelMap: Record<string, string> = {
    'STANDARD': 'Standard',
    'ENHANCED': 'Enhanced',
    'HIGH_RISK': 'High Risk'
  };
  return levelMap[level] || level;
};
