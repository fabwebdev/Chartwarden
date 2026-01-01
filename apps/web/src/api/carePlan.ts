/**
 * Care Plan API Service
 *
 * API service for care plan management including problems, goals, interventions.
 * All routes are mounted under /api and require authentication.
 */

import http from 'hooks/useCookie';

// ==============================|| CARE PLAN TYPES ||============================== //

export interface CarePlan {
  id: number;
  patient_id: number;
  care_plan_status: 'DRAFT' | 'ACTIVE' | 'REVISED' | 'INACTIVE' | 'ARCHIVED' | 'PENDING_SIGNATURE' | 'SIGNED';
  version: number;
  effective_date: string;
  review_date?: string;
  next_review_date?: string;
  patient_goals?: string;
  family_goals?: string;
  goals_of_care?: string;
  philosophy_of_care?: string;
  approach_to_care?: string;
  team_members?: any;
  advance_directives_on_file?: boolean;
  advance_directive_types?: any;
  code_status?: string;
  dnr_status?: string;
  bereavement_plan?: string;
  bereavement_risk_level?: string;
  volunteer_services?: string;
  volunteer_hours_weekly?: number;
  clinical_summary?: string;
  prognosis?: string;
  terminal_diagnosis?: string;
  related_diagnoses?: any;
  functional_status_summary?: string;
  mobility_status?: string;
  cognitive_status?: string;
  pain_management_approach?: string;
  symptom_management_approach?: string;
  psychosocial_plan?: string;
  spiritual_plan?: string;
  cultural_considerations?: string;
  safety_plan?: string;
  fall_prevention?: string;
  infection_control?: string;
  dme_plan?: string;
  supplies_needed?: string;
  discharge_planning?: string;
  discharge_criteria?: string;
  plan_summary?: string;
  special_instructions?: string;
  physician_signature?: any;
  rn_signature?: any;
  patient_signature?: any;
  recertification_date?: string;
  recertified_by_id?: string;
  previous_version_id?: number;
  revision_reason?: string;
  created_by_id?: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
  problems?: Problem[];
  goals?: Goal[];
  interventions?: Intervention[];
  revisions?: CarePlanRevision[];
}

export interface Problem {
  id: number;
  patient_id: number;
  care_plan_id?: number;
  problem_category: 'PHYSICAL' | 'PSYCHOLOGICAL' | 'SOCIAL' | 'SPIRITUAL' | 'ENVIRONMENTAL' | 'CAREGIVER';
  problem_description: string;
  problem_status: 'ACTIVE' | 'RESOLVED' | 'ONGOING' | 'WORSENING' | 'IMPROVING' | 'STABLE';
  problem_priority: 'HIGH' | 'MEDIUM' | 'LOW';
  onset_date?: string;
  identified_date: string;
  resolved_date?: string;
  etiology?: string;
  signs_symptoms?: string;
  related_diagnoses?: string;
  contributing_factors?: string;
  primary_discipline?: string;
  identified_by_id?: string;
  notes?: string;
  created_by_id?: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
  goals?: Goal[];
  interventions?: Intervention[];
}

export interface Goal {
  id: number;
  patient_id: number;
  care_plan_id?: number;
  problem_id?: number;
  goal_description: string;
  goal_status: 'NOT_STARTED' | 'IN_PROGRESS' | 'ACHIEVED' | 'PARTIALLY_ACHIEVED' | 'NOT_ACHIEVED' | 'DISCONTINUED' | 'REVISED';
  progress_level?: 'NO_PROGRESS' | 'MINIMAL_PROGRESS' | 'MODERATE_PROGRESS' | 'SIGNIFICANT_PROGRESS' | 'GOAL_ACHIEVED' | 'REGRESSION';
  target_date?: string;
  start_date?: string;
  achieved_date?: string;
  discontinued_date?: string;
  measurable_outcome?: string;
  outcome_criteria?: string;
  evaluation_method?: string;
  progress_notes?: string;
  barriers_to_achievement?: string;
  modifications_needed?: string;
  primary_discipline?: string;
  responsible_staff_id?: string;
  patient_agreement?: boolean;
  family_agreement?: boolean;
  revised?: boolean;
  revision_reason?: string;
  previous_version_id?: number;
  created_by_id?: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
  interventions?: Intervention[];
  problem?: Problem;
}

export interface Intervention {
  id: number;
  patient_id: number;
  care_plan_id?: number;
  problem_id?: number;
  goal_id?: number;
  intervention_category: 'NURSING' | 'PHYSICIAN' | 'SOCIAL_WORK' | 'SPIRITUAL' | 'THERAPY' | 'AIDE' | 'VOLUNTEER' | 'MEDICATION' | 'DME' | 'EDUCATION' | 'COORDINATION';
  intervention_description: string;
  intervention_status: 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED' | 'DISCONTINUED' | 'ON_HOLD';
  frequency?: string;
  duration?: string;
  start_date?: string;
  end_date?: string;
  discipline: string;
  responsible_staff_id?: string;
  requires_order?: boolean;
  order_obtained?: boolean;
  rationale?: string;
  expected_outcome?: string;
  patient_response?: string;
  last_performed_date?: string;
  next_scheduled_date?: string;
  times_performed?: number;
  effectiveness_rating?: 'VERY_EFFECTIVE' | 'EFFECTIVE' | 'SOMEWHAT_EFFECTIVE' | 'NOT_EFFECTIVE';
  evaluation_notes?: string;
  education_provided?: boolean;
  education_topics?: any;
  patient_understanding?: string;
  special_instructions?: string;
  precautions?: string;
  discontinued_date?: string;
  discontinuation_reason?: string;
  created_by_id?: string;
  updated_by_id?: string;
  createdAt: string;
  updatedAt: string;
  goal?: Goal;
  problem?: Problem;
}

export interface CarePlanRevision {
  id: number;
  care_plan_id: number;
  patient_id: number;
  revision_date: string;
  revision_number: number;
  revision_type: 'MAJOR_REVISION' | 'MINOR_REVISION' | 'RECERTIFICATION' | 'SCHEDULED_REVIEW' | 'UNSCHEDULED_REVIEW';
  revision_reason: string;
  changes_summary?: string;
  problems_added?: any;
  problems_resolved?: any;
  goals_added?: any;
  goals_achieved?: any;
  interventions_added?: any;
  interventions_discontinued?: any;
  change_in_condition?: string;
  change_in_goals_of_care?: string;
  new_orders?: string;
  idg_review_date?: string;
  idg_recommendations?: string;
  physician_input?: string;
  patient_family_input?: string;
  revised_by_id?: string;
  revised_by_name?: string;
  signature?: any;
  createdAt: string;
  updatedAt: string;
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  status?: string;
  start_date?: string;
  end_date?: string;
  provider_id?: string;
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

// ==============================|| CARE PLAN ROUTES ||============================== //

/**
 * Get all care plans (across all patients)
 */
export const getAllCarePlans = async (params?: PaginationParams) => {
  const response = await http.get('/care-plans', { params });
  return response.data;
};

/**
 * Get patient care plans
 */
export const getPatientCarePlans = async (patientId: string | number, params?: PaginationParams) => {
  const response = await http.get(`/patients/${patientId}/care-plans`, { params });
  return response.data;
};

/**
 * Get care plan by ID with related data
 */
export const getCarePlanById = async (id: string | number): Promise<{ status: number; data: CarePlan }> => {
  const response = await http.get(`/care-plans/${id}`);
  return response.data;
};

/**
 * Create care plan
 */
export const createCarePlan = async (patientId: string | number, carePlanData: Partial<CarePlan>) => {
  const response = await http.post(`/patients/${patientId}/care-plans`, carePlanData);
  return response.data;
};

/**
 * Update care plan
 */
export const updateCarePlan = async (id: string | number, carePlanData: Partial<CarePlan>) => {
  const response = await http.patch(`/care-plans/${id}`, carePlanData);
  return response.data;
};

/**
 * Delete (archive) care plan
 */
export const deleteCarePlan = async (id: string | number, force?: boolean) => {
  const response = await http.delete(`/care-plans/${id}`, { params: { force } });
  return response.data;
};

/**
 * Sign care plan
 */
export const signCarePlan = async (id: string | number, signatureType: 'RN' | 'PHYSICIAN') => {
  const response = await http.post(`/care-plans/${id}/sign`, { signature_type: signatureType });
  return response.data;
};

/**
 * Recertify care plan
 */
export const recertifyCarePlan = async (id: string | number, recertificationDate: string, revisionReason?: string) => {
  const response = await http.post(`/care-plans/${id}/recertify`, {
    recertification_date: recertificationDate,
    revision_reason: revisionReason
  });
  return response.data;
};

// ==============================|| PROBLEM ROUTES ||============================== //

/**
 * Get patient problems
 */
export const getPatientProblems = async (patientId: string | number, params?: PaginationParams & { category?: string; care_plan_id?: number; priority?: string }) => {
  const response = await http.get(`/patients/${patientId}/problems`, { params });
  return response.data;
};

/**
 * Get problem by ID
 */
export const getProblemById = async (id: string | number): Promise<{ status: number; data: Problem }> => {
  const response = await http.get(`/problems/${id}`);
  return response.data;
};

/**
 * Create problem
 */
export const createProblem = async (patientId: string | number, problemData: Partial<Problem>) => {
  const response = await http.post(`/patients/${patientId}/problems`, problemData);
  return response.data;
};

/**
 * Update problem
 */
export const updateProblem = async (id: string | number, problemData: Partial<Problem>) => {
  const response = await http.patch(`/problems/${id}`, problemData);
  return response.data;
};

/**
 * Delete problem
 */
export const deleteProblem = async (id: string | number) => {
  const response = await http.delete(`/problems/${id}`);
  return response.data;
};

/**
 * Resolve problem
 */
export const resolveProblem = async (id: string | number, notes?: string) => {
  const response = await http.post(`/problems/${id}/resolve`, { notes });
  return response.data;
};

// ==============================|| GOAL ROUTES ||============================== //

/**
 * Get patient goals
 */
export const getPatientGoals = async (patientId: string | number, params?: PaginationParams & { progress_level?: string; care_plan_id?: number; problem_id?: number; responsible_staff_id?: string }) => {
  const response = await http.get(`/patients/${patientId}/goals`, { params });
  return response.data;
};

/**
 * Get goal by ID
 */
export const getGoalById = async (id: string | number): Promise<{ status: number; data: Goal }> => {
  const response = await http.get(`/goals/${id}`);
  return response.data;
};

/**
 * Create goal
 */
export const createGoal = async (patientId: string | number, goalData: Partial<Goal>) => {
  const response = await http.post(`/patients/${patientId}/goals`, goalData);
  return response.data;
};

/**
 * Update goal
 */
export const updateGoal = async (id: string | number, goalData: Partial<Goal>) => {
  const response = await http.patch(`/goals/${id}`, goalData);
  return response.data;
};

/**
 * Delete goal
 */
export const deleteGoal = async (id: string | number) => {
  const response = await http.delete(`/goals/${id}`);
  return response.data;
};

/**
 * Update goal progress
 */
export const updateGoalProgress = async (id: string | number, progressData: {
  progress_level?: string;
  progress_notes?: string;
  barriers_to_achievement?: string;
  modifications_needed?: string;
}) => {
  const response = await http.post(`/goals/${id}/progress`, progressData);
  return response.data;
};

/**
 * Discontinue goal
 */
export const discontinueGoal = async (id: string | number, discontinuationReason: string, notes?: string) => {
  const response = await http.post(`/goals/${id}/discontinue`, {
    discontinuation_reason: discontinuationReason,
    notes
  });
  return response.data;
};

/**
 * Add milestone to goal
 */
export const addGoalMilestone = async (id: string | number, milestoneData: {
  milestone_description: string;
  milestone_date?: string;
  achieved?: boolean;
  notes?: string;
}) => {
  const response = await http.post(`/goals/${id}/milestones`, milestoneData);
  return response.data;
};

// ==============================|| INTERVENTION ROUTES ||============================== //

/**
 * Get patient interventions
 */
export const getPatientInterventions = async (patientId: string | number, params?: PaginationParams & { category?: string; care_plan_id?: number; goal_id?: number; discipline?: string; responsible_staff_id?: string }) => {
  const response = await http.get(`/patients/${patientId}/interventions`, { params });
  return response.data;
};

/**
 * Get intervention by ID
 */
export const getInterventionById = async (id: string | number): Promise<{ status: number; data: Intervention }> => {
  const response = await http.get(`/interventions/${id}`);
  return response.data;
};

/**
 * Create intervention
 */
export const createIntervention = async (patientId: string | number, interventionData: Partial<Intervention>) => {
  const response = await http.post(`/patients/${patientId}/interventions`, interventionData);
  return response.data;
};

/**
 * Update intervention
 */
export const updateIntervention = async (id: string | number, interventionData: Partial<Intervention>) => {
  const response = await http.patch(`/interventions/${id}`, interventionData);
  return response.data;
};

/**
 * Delete intervention
 */
export const deleteIntervention = async (id: string | number) => {
  const response = await http.delete(`/interventions/${id}`);
  return response.data;
};

/**
 * Record intervention performed
 */
export const recordInterventionPerformed = async (id: string | number, data: {
  effectiveness_rating?: string;
  evaluation_notes?: string;
  patient_response?: string;
  next_scheduled_date?: string;
}) => {
  const response = await http.post(`/interventions/${id}/performed`, data);
  return response.data;
};

/**
 * Discontinue intervention
 */
export const discontinueIntervention = async (id: string | number, discontinuationReason: string) => {
  const response = await http.post(`/interventions/${id}/discontinue`, {
    discontinuation_reason: discontinuationReason
  });
  return response.data;
};

// ==============================|| TEMPLATE ROUTES ||============================== //

/**
 * Get care plan templates
 */
export const getCarePlanTemplates = async (params?: { diagnosis_category?: string; is_public?: boolean }) => {
  const response = await http.get('/care-plan-templates', { params });
  return response.data;
};

/**
 * Create care plan template
 */
export const createCarePlanTemplate = async (templateData: any) => {
  const response = await http.post('/care-plan-templates', templateData);
  return response.data;
};
