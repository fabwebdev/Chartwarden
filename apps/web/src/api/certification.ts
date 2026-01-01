/**
 * Certification API Service
 *
 * API service for certification management, Face-to-Face encounters, and orders.
 * All routes require authentication.
 *
 * CMS Requirements:
 * - Initial certification within 2 days of start of care
 * - Face-to-Face encounters required for 3rd benefit period and beyond
 * - F2F must occur within 90 days before or 30 days after start of care
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export interface Certification {
  id: number;
  patient_id: number;
  certification_period: 'INITIAL_90' | 'SUBSEQUENT_90' | 'SUBSEQUENT_60';
  certification_status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'EXPIRED' | 'REVOKED';
  start_date: string;
  end_date: string;
  certification_due_date: string;
  certification_completed_date?: string;
  certification_timeliness?: 'TIMELY' | 'LATE';
  days_late?: number;
  terminal_illness_narrative: string;
  clinical_progression?: string;
  decline_indicators?: string;
  physician_signature?: {
    signedBy: number;
    signedByName: string;
    signedAt: string;
    signatureType: string;
    signatureHash: string;
  };
  noe_id?: number;
  created_by_id?: number;
  updated_by_id?: number;
  createdAt?: string;
  updatedAt?: string;
  deleted_at?: string;
  patient?: {
    id: number;
    first_name: string;
    last_name: string;
    medical_record_number: string;
  };
  faceToFaceEncounters?: F2FEncounter[];
}

export interface F2FEncounter {
  id: number;
  patient_id: number;
  certification_id?: number;
  encounter_date: string;
  performed_by_id?: number;
  performed_by_name: string;
  performed_by_type: 'PHYSICIAN' | 'NP' | 'PA';
  visit_type: 'IN_PERSON' | 'TELEHEALTH';
  findings: string;
  terminal_prognosis_confirmed: boolean;
  attestation?: {
    signedBy: number;
    signedByName: string;
    signedAt: string;
    signatureType: string;
    signatureHash: string;
  };
  attestation_date?: string;
  created_by_id?: number;
  updated_by_id?: number;
  createdAt?: string;
  updatedAt?: string;
  deleted_at?: string;
}

export interface Order {
  id: number;
  patient_id: number;
  order_type: 'MEDICATION' | 'TREATMENT' | 'DME' | 'LABORATORY' | 'IMAGING' | 'CONSULTATION' | 'OTHER';
  order_status: 'ACTIVE' | 'COMPLETED' | 'DISCONTINUED' | 'HOLD';
  order_priority: 'ROUTINE' | 'URGENT' | 'STAT';
  order_description: string;
  start_date: string;
  end_date?: string;
  ordered_by_id?: number;
  physician_signature?: {
    signedBy: number;
    signedByName: string;
    signedAt: string;
    signatureType: string;
    signatureHash: string;
  };
  created_by_id?: number;
  updated_by_id?: number;
}

export interface CertificationListParams {
  status?: string;
  patient_id?: string | number;
  period?: string;
  start_date_from?: string;
  start_date_to?: string;
  limit?: number;
  offset?: number;
  sort_by?: 'start_date' | 'end_date' | 'certification_due_date';
  sort_order?: 'asc' | 'desc';
}

export interface CreateCertificationData {
  certification_period: 'INITIAL_90' | 'SUBSEQUENT_90' | 'SUBSEQUENT_60';
  start_date: string;
  end_date: string;
  terminal_illness_narrative: string;
  clinical_progression?: string;
  decline_indicators?: string;
  certification_status?: string;
  noe_id?: number;
  alert_recipients?: string[];
}

export interface CreateF2FData {
  encounter_date: string;
  performed_by_name: string;
  performed_by_type: 'PHYSICIAN' | 'NP' | 'PA';
  visit_type?: 'IN_PERSON' | 'TELEHEALTH';
  findings: string;
  terminal_prognosis_confirmed?: boolean;
  certification_id?: number;
  performed_by_id?: number;
}

export interface CreateOrderData {
  order_type: 'MEDICATION' | 'TREATMENT' | 'DME' | 'LABORATORY' | 'IMAGING' | 'CONSULTATION' | 'OTHER';
  order_description: string;
  start_date: string;
  end_date?: string;
  order_status?: string;
  order_priority?: 'ROUTINE' | 'URGENT' | 'STAT';
  is_verbal_order?: boolean;
  physician_name?: string;
  read_back_verified?: boolean;
  ordered_by_id?: number;
}

// ==============================|| CERTIFICATION ROUTES ||============================== //

/**
 * List all certifications with filtering and pagination
 */
export const listCertifications = async (params?: CertificationListParams) => {
  const response = await http.get('/certifications', { params });
  return response.data;
};

/**
 * Get patient certifications
 */
export const getPatientCertifications = async (patientId: string | number) => {
  const response = await http.get(`/patients/${patientId}/certifications`);
  return response.data;
};

/**
 * Create certification for a patient
 */
export const createCertification = async (patientId: string | number, data: CreateCertificationData) => {
  const response = await http.post(`/patients/${patientId}/certifications`, data);
  return response.data;
};

/**
 * Get single certification by ID
 */
export const getCertificationById = async (id: string | number) => {
  const response = await http.get(`/certifications/${id}`);
  return response.data;
};

/**
 * Update certification (only unsigned)
 */
export const updateCertification = async (id: string | number, data: Partial<CreateCertificationData>) => {
  const response = await http.patch(`/certifications/${id}`, data);
  return response.data;
};

/**
 * Sign certification (21 CFR Part 11 compliant)
 */
export const signCertification = async (id: string | number) => {
  const response = await http.post(`/certifications/${id}/sign`);
  return response.data;
};

/**
 * Complete certification with timeliness tracking
 */
export const completeCertification = async (id: string | number) => {
  const response = await http.post(`/certifications/${id}/complete`);
  return response.data;
};

/**
 * Revoke certification
 */
export const revokeCertification = async (id: string | number, revocation_reason: string) => {
  const response = await http.post(`/certifications/${id}/revoke`, { revocation_reason });
  return response.data;
};

/**
 * Delete certification (soft delete)
 */
export const deleteCertification = async (id: string | number, reason?: string) => {
  const response = await http.delete(`/certifications/${id}`, { data: { reason } });
  return response.data;
};

/**
 * Validate F2F requirements for certification
 */
export const validateF2FForCertification = async (id: string | number) => {
  const response = await http.post(`/certifications/${id}/validate-f2f`);
  return response.data;
};

/**
 * Get pending certifications (overdue)
 */
export const getPendingCertifications = async () => {
  const response = await http.get('/certifications/pending');
  return response.data;
};

/**
 * Get certifications due within 30 days
 */
export const getCertificationsDue = async () => {
  const response = await http.get('/certifications/due');
  return response.data;
};

/**
 * Get overdue certifications
 */
export const getOverdueCertifications = async () => {
  const response = await http.get('/certifications/overdue');
  return response.data;
};

// ==============================|| FACE-TO-FACE ROUTES ||============================== //

/**
 * Get patient F2F encounters
 */
export const getPatientF2F = async (patientId: string | number) => {
  const response = await http.get(`/patients/${patientId}/f2f`);
  return response.data;
};

/**
 * Create F2F encounter
 */
export const createF2F = async (patientId: string | number, data: CreateF2FData) => {
  const response = await http.post(`/patients/${patientId}/f2f`, data);
  return response.data;
};

/**
 * Attest F2F encounter (Hospice physician attestation)
 */
export const attestF2F = async (f2fId: string | number) => {
  const response = await http.post(`/f2f/${f2fId}/attestation`);
  return response.data;
};

// ==============================|| ORDER ROUTES ||============================== //

/**
 * Get patient orders
 */
export const getPatientOrders = async (patientId: string | number, params?: { status?: string; type?: string; limit?: number; offset?: number }) => {
  const response = await http.get(`/patients/${patientId}/orders`, { params });
  return response.data;
};

/**
 * Create order
 */
export const createOrder = async (patientId: string | number, data: CreateOrderData) => {
  const response = await http.post(`/patients/${patientId}/orders`, data);
  return response.data;
};

/**
 * Sign order (21 CFR Part 11 compliant)
 */
export const signOrder = async (orderId: string | number) => {
  const response = await http.post(`/orders/${orderId}/sign`);
  return response.data;
};

// ==============================|| HELPER FUNCTIONS ||============================== //

/**
 * Calculate days until deadline
 */
export const getDaysUntilDeadline = (date: string): number => {
  const deadline = new Date(date);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  deadline.setHours(0, 0, 0, 0);
  return Math.ceil((deadline.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
};

/**
 * Get compliance status based on deadline
 */
export const getComplianceStatus = (daysRemaining: number, hasCompleted: boolean): 'compliant' | 'warning' | 'overdue' | 'not_required' => {
  if (hasCompleted) return 'compliant';
  if (daysRemaining < 0) return 'overdue';
  if (daysRemaining <= 14) return 'warning';
  return 'not_required';
};

/**
 * Format certification period for display
 */
export const formatCertificationPeriod = (period: string): string => {
  const periodMap: Record<string, string> = {
    'INITIAL_90': 'Initial (90 days)',
    'SUBSEQUENT_90': 'Subsequent (90 days)',
    'SUBSEQUENT_60': 'Subsequent (60 days)'
  };
  return periodMap[period] || period;
};

/**
 * Get status color for MUI components
 */
export const getStatusColor = (status: string): 'success' | 'warning' | 'error' | 'info' | 'default' => {
  const colorMap: Record<string, 'success' | 'warning' | 'error' | 'info' | 'default'> = {
    'ACTIVE': 'success',
    'COMPLETED': 'success',
    'PENDING': 'warning',
    'EXPIRED': 'error',
    'REVOKED': 'error',
    'compliant': 'success',
    'warning': 'warning',
    'overdue': 'error',
    'not_required': 'default'
  };
  return colorMap[status] || 'default';
};
