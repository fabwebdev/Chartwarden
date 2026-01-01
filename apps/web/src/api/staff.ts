/**
 * Staff API Service
 *
 * Comprehensive API service for all staff-related endpoints.
 * All routes are mounted under /api/staff and require authentication.
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export interface StaffProfile {
  id: number;
  user_id?: string;
  employee_id?: string;
  first_name: string;
  last_name: string;
  middle_name?: string;
  preferred_name?: string;
  job_title?: string;
  department?: string;
  employment_type?: string;
  hire_date?: string;
  termination_date?: string;
  employment_status: string;
  email?: string;
  phone?: string;
  mobile?: string;
  emergency_contact_name?: string;
  emergency_contact_phone?: string;
  emergency_contact_relationship?: string;
  address_line1?: string;
  address_line2?: string;
  city?: string;
  state?: string;
  zip_code?: string;
  specialty?: string;
  years_of_experience?: number;
  is_supervisory?: boolean;
  service_territory?: any;
  max_patient_load?: number;
  notes?: string;
  metadata?: any;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffCredential {
  id: number;
  staff_id: number;
  credential_type: string;
  credential_name: string;
  credential_number?: string;
  issuing_authority?: string;
  issuing_state?: string;
  issue_date?: string;
  expiration_date: string;
  verification_date?: string;
  credential_status: string;
  alert_days_before_expiration?: number;
  renewal_reminder_sent?: boolean;
  document_url?: string;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface StaffCaseload {
  id: number;
  staff_id: number;
  patient_id: number;
  assignment_role: string;
  is_primary: boolean;
  assignment_start_date: string;
  assignment_end_date?: string;
  assignment_status: string;
  scheduled_visits_per_week?: number;
  actual_visits_this_week?: number;
  transfer_reason?: string;
  transferred_to_staff_id?: number;
  transfer_date?: string;
  notes?: string;
}

export interface StaffSchedule {
  id: number;
  staff_id: number;
  schedule_type: string;
  shift_date: string;
  start_time?: string;
  end_time?: string;
  is_on_call?: boolean;
  on_call_type?: string;
  time_off_type?: string;
  time_off_status?: string;
  approved_by_id?: string;
  approval_date?: string;
  work_location?: string;
  notes?: string;
}

export interface StaffTraining {
  id: number;
  staff_id: number;
  training_name: string;
  training_type: string;
  training_category?: string;
  training_provider?: string;
  instructor_name?: string;
  training_date: string;
  completion_date?: string;
  expiration_date?: string;
  training_status: string;
  hours_completed?: number;
  ceu_credits?: number;
  score?: number;
  passing_score?: number;
  passed?: boolean;
  certificate_number?: string;
  certificate_url?: string;
  is_required?: boolean;
  due_date?: string;
  notes?: string;
}

// ==============================|| STAFF PROFILE ENDPOINTS ||============================== //

/**
 * Get all staff profiles
 * @param params - Query parameters for filtering and pagination
 */
export const getAllStaff = async (params?: {
  limit?: number;
  offset?: number;
  status?: string;
  department?: string;
  job_title?: string;
  search?: string;
  employee_id?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }
  const queryString = queryParams.toString();
  const response = await http.get(`/staff${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

/**
 * Get staff profile by ID
 */
export const getStaffById = async (id: number | string) => {
  const response = await http.get(`/staff/${id}`);
  return response.data;
};

/**
 * Create a new staff profile
 */
export const createStaff = async (staffData: Partial<StaffProfile>) => {
  const response = await http.post('/staff', staffData);
  return response.data;
};

/**
 * Update staff profile
 */
export const updateStaff = async (id: number | string, staffData: Partial<StaffProfile>) => {
  const response = await http.patch(`/staff/${id}`, staffData);
  return response.data;
};

/**
 * Delete staff profile (soft delete)
 */
export const deleteStaff = async (id: number | string) => {
  const response = await http.delete(`/staff/${id}`);
  return response.data;
};

// ==============================|| CREDENTIALS ENDPOINTS ||============================== //

/**
 * Get credentials for a staff member
 */
export const getStaffCredentials = async (staffId: number | string) => {
  const response = await http.get(`/staff/${staffId}/credentials`);
  return response.data;
};

/**
 * Add credential to staff member
 */
export const addCredential = async (staffId: number | string, credentialData: Partial<StaffCredential>) => {
  const response = await http.post(`/staff/${staffId}/credentials`, credentialData);
  return response.data;
};

/**
 * Update credential
 */
export const updateCredential = async (credentialId: number | string, credentialData: Partial<StaffCredential>) => {
  const response = await http.put(`/credentials/${credentialId}`, credentialData);
  return response.data;
};

/**
 * Delete credential
 */
export const deleteCredential = async (credentialId: number | string) => {
  const response = await http.delete(`/credentials/${credentialId}`);
  return response.data;
};

/**
 * Get expiring credentials
 */
export const getExpiringCredentials = async (days?: number) => {
  const response = await http.get(`/staff/credentials/expiring${days ? `?days=${days}` : ''}`);
  return response.data;
};

/**
 * Get expired credentials
 */
export const getExpiredCredentials = async () => {
  const response = await http.get('/credentials/expired');
  return response.data;
};

/**
 * Get staff missing required credentials
 */
export const getStaffMissingCredentials = async () => {
  const response = await http.get('/staff/missing-credentials');
  return response.data;
};

/**
 * Get credential history
 */
export const getCredentialHistory = async (credentialId: number | string) => {
  const response = await http.get(`/credentials/${credentialId}/history`);
  return response.data;
};

// ==============================|| CASELOAD ENDPOINTS ||============================== //

/**
 * Get caseload for a staff member
 */
export const getStaffCaseload = async (staffId: number | string, status?: string) => {
  const response = await http.get(`/staff/${staffId}/caseload${status ? `?status=${status}` : ''}`);
  return response.data;
};

/**
 * Assign patient to staff member
 */
export const assignPatient = async (staffId: number | string, assignmentData: Partial<StaffCaseload>) => {
  const response = await http.post(`/staff/${staffId}/caseload`, assignmentData);
  return response.data;
};

// ==============================|| SCHEDULE ENDPOINTS ||============================== //

/**
 * Get schedule for a staff member
 */
export const getStaffSchedule = async (staffId: number | string, params?: {
  start_date?: string;
  end_date?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }
  const queryString = queryParams.toString();
  const response = await http.get(`/staff/${staffId}/schedule${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

/**
 * Create schedule entry
 */
export const createSchedule = async (staffId: number | string, scheduleData: Partial<StaffSchedule>) => {
  const response = await http.post(`/staff/${staffId}/schedule`, scheduleData);
  return response.data;
};

// ==============================|| TRAINING ENDPOINTS ||============================== //

/**
 * Get training records for a staff member
 */
export const getStaffTraining = async (staffId: number | string, params?: {
  status?: string;
  training_type?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }
  const queryString = queryParams.toString();
  const response = await http.get(`/staff/${staffId}/training${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

/**
 * Add training record
 */
export const addTraining = async (staffId: number | string, trainingData: Partial<StaffTraining>) => {
  const response = await http.post(`/staff/${staffId}/training`, trainingData);
  return response.data;
};

// ==============================|| PRODUCTIVITY ENDPOINTS ||============================== //

/**
 * Get productivity metrics for a staff member
 */
export const getStaffProductivity = async (staffId: number | string, params?: {
  period_type?: string;
  start_date?: string;
  end_date?: string;
}) => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }
  const queryString = queryParams.toString();
  const response = await http.get(`/staff/${staffId}/productivity${queryString ? `?${queryString}` : ''}`);
  return response.data;
};

/**
 * Get staff audit log
 */
export const getStaffAuditLog = async (staffId: number | string, params?: {
  start_date?: string;
  end_date?: string;
  limit?: number;
  offset?: number;
}) => {
  const queryParams = new URLSearchParams();
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });
  }
  const queryString = queryParams.toString();
  const response = await http.get(`/staff/${staffId}/audit-log${queryString ? `?${queryString}` : ''}`);
  return response.data;
};
