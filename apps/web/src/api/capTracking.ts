/**
 * Cap Tracking API Service
 *
 * API client for Medicare hospice cap amount tracking and compliance monitoring.
 * Provides access to cap tracking metrics, patient utilization, and alerts.
 *
 * Features:
 *   - Cap utilization metrics and trends
 *   - Patients approaching/exceeding cap
 *   - Compliance status and issues
 *   - Alert configuration management
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export interface CapTrackingRecord {
  id: number;
  patient_id: number;
  cap_year: number;
  cap_year_start_date: string;
  cap_year_end_date: string;
  cap_amount_cents: number;
  total_payments_cents: number;
  remaining_cap_cents: number;
  utilization_percentage: number;
  cap_exceeded: boolean;
  cap_exceeded_date: string | null;
  cap_exceeded_amount_cents: number | null;
  alert_80_triggered: boolean;
  alert_80_date: string | null;
  alert_90_triggered: boolean;
  alert_90_date: string | null;
  alert_95_triggered: boolean;
  alert_95_date: string | null;
  last_calculated_at: string;
  calculation_status: 'CURRENT' | 'PENDING_RECALC' | 'ERROR';
  notes: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface PatientInfo {
  id: number;
  first_name: string;
  last_name: string;
  medical_record_number: string;
}

export interface CapTrackingWithPatient {
  cap: CapTrackingRecord;
  patient: PatientInfo;
}

export interface CapMetrics {
  current_year: number;
  total_patients: number;
  total_cap_utilization: string;
  average_utilization: string;
  total_payments_cents: number;
  total_cap_amount_cents: number;
  patients_exceeded: number;
  patients_at_risk: number;
  patients_healthy: number;
  utilization_distribution: {
    under_50: number;
    '50_to_79': number;
    '80_to_89': number;
    '90_to_99': number;
    '100_plus': number;
  };
  trends: CapTrendDataPoint[];
}

export interface CapTrendDataPoint {
  date: string;
  average_utilization: string;
  total_payments_cents: number;
}

export interface CapUtilizationSummary {
  total_patients: number;
  total_cap_amount: number;
  total_payments: number;
  total_remaining: number;
  patients_exceeded: number;
  total_exceeded_amount: number;
  patients_above_80: number;
  patients_above_90: number;
  patients_above_95: number;
  average_utilization: string;
}

export interface CapUtilizationReport {
  summary: CapUtilizationSummary;
  breakdown: CapTrackingRecord[];
}

export interface ComplianceStatus {
  id: number;
  patient_id: number;
  overall_status: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT' | 'PENDING_REVIEW';
  overall_score: number;
  cap_status: string;
  certification_status: string;
  f2f_status: string;
  idg_status: string;
  documentation_status: string;
  active_issues_count: number;
  resolved_issues_count: number;
  critical_issues_count: number;
  last_compliance_check: string;
  next_scheduled_check: string;
}

export interface ComplianceIssue {
  id: number;
  patient_id: number;
  issue_type: string;
  issue_category: 'CAP' | 'CERTIFICATION' | 'F2F' | 'IDG' | 'DOCUMENTATION';
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
  title: string;
  description: string | null;
  due_date: string | null;
  resolved_at: string | null;
  resolved_by_id: number | null;
  resolution_notes: string | null;
  related_cap_tracking_id: number | null;
  created_at: string;
  updated_at: string;
}

export interface AlertConfig {
  id: number;
  alert_type: string;
  alert_name: string;
  description: string | null;
  is_enabled: boolean;
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  threshold_percentage: number | null;
  threshold_days: number | null;
  notification_channels: string[];
  recipient_roles: string[];
  notification_frequency: 'ONCE' | 'DAILY' | 'WEEKLY';
  cooldown_hours: number;
}

export interface CapTrackingHistoryEntry {
  id: number;
  cap_tracking_id: number;
  cap_year: number;
  snapshot_date: string;
  cap_amount_cents: number;
  total_payments_cents: number;
  remaining_cap_cents: number;
  utilization_percentage: number;
  payments_delta_cents: number;
  utilization_delta: number;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  status: number;
  data: T[];
  count: number;
  pagination?: {
    total: number;
    limit: number;
    offset: number;
    pages: number;
  };
}

export interface ApiResponse<T> {
  status: number;
  message?: string;
  data: T;
}

// ==============================|| CAP YEAR OPTIONS ||============================== //

export const getCapYearOptions = () => {
  const currentYear = new Date().getFullYear();
  const years: { value: number; label: string }[] = [];

  // Cap year runs Oct 1 to Sep 30, so FY 2025 means Oct 2024 - Sep 2025
  for (let year = currentYear + 1; year >= currentYear - 3; year--) {
    years.push({
      value: year,
      label: `FY ${year} (Oct ${year - 1} - Sep ${year})`
    });
  }

  return years;
};

export const getCurrentCapYear = () => {
  const now = new Date();
  // If we're in Oct-Dec, the cap year is next calendar year
  // If we're in Jan-Sep, the cap year is current calendar year
  return now.getMonth() >= 9 ? now.getFullYear() + 1 : now.getFullYear();
};

// ==============================|| CAP TRACKING ENDPOINTS ||============================== //

/**
 * Get all cap tracking records with pagination
 * @param params - Query parameters (cap_year, status, pagination)
 * @requires Permission: VIEW_CLINICAL_NOTES or VIEW_REPORTS
 */
export const getAllCaps = async (
  params?: PaginationParams & { cap_year?: number; status?: 'exceeded' | 'warning' | 'normal' }
): Promise<PaginatedResponse<CapTrackingWithPatient>> => {
  const response = await http.get('/caps', { params });
  return response.data;
};

/**
 * Get cap tracking by ID
 * @param id - Cap tracking record ID
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getCapById = async (id: number): Promise<ApiResponse<CapTrackingWithPatient>> => {
  const response = await http.get(`/caps/${id}`);
  return response.data;
};

/**
 * Get cap utilization metrics and trends
 * @param params - Query parameters (cap_year, months)
 * @requires Permission: VIEW_REPORTS
 */
export const getCapMetrics = async (
  params?: { cap_year?: number; months?: number }
): Promise<ApiResponse<CapMetrics>> => {
  const response = await http.get('/caps/metrics', { params });
  return response.data;
};

/**
 * Get cap tracking history for a specific cap record
 * @param id - Cap tracking record ID
 * @param params - Pagination parameters
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getCapHistory = async (
  id: number,
  params?: PaginationParams
): Promise<PaginatedResponse<CapTrackingHistoryEntry>> => {
  const response = await http.get(`/caps/${id}/history`, { params });
  return response.data;
};

/**
 * Calculate cap for a patient
 * @param patientId - Patient ID
 * @param capYear - Cap year
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const calculateCap = async (
  patientId: number,
  capYear: number
): Promise<ApiResponse<{ cap_tracking: CapTrackingRecord; alerts_triggered: string[] }>> => {
  const response = await http.post('/billing/cap-tracking/calculate', {
    patient_id: patientId,
    cap_year: capYear
  });
  return response.data;
};

/**
 * Get patients approaching cap threshold
 * @param params - Query parameters (threshold, cap_year)
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getPatientsApproachingCap = async (
  params?: { threshold?: number; cap_year?: number }
): Promise<PaginatedResponse<CapTrackingWithPatient>> => {
  const response = await http.get('/billing/cap-tracking/approaching', { params });
  return response.data;
};

/**
 * Get patients who exceeded cap
 * @param params - Query parameters (cap_year)
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getCapExceededPatients = async (
  params?: { cap_year?: number }
): Promise<PaginatedResponse<CapTrackingWithPatient>> => {
  const response = await http.get('/billing/cap-tracking/exceeded', { params });
  return response.data;
};

/**
 * Get cap utilization report
 * @param params - Query parameters (cap_year)
 * @requires Permission: VIEW_REPORTS
 */
export const getCapUtilizationReport = async (
  params?: { cap_year?: number }
): Promise<ApiResponse<CapUtilizationReport>> => {
  const response = await http.get('/billing/cap-tracking/report', { params });
  return response.data;
};

/**
 * Bulk recalculate caps
 * @param params - Recalculation parameters (cap_year, patient_ids)
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const bulkRecalculateCaps = async (
  params?: { cap_year?: number; patient_ids?: number[] }
): Promise<ApiResponse<{ total: number; successful: number; failed: number; errors: { patient_id: number; error: string }[] }>> => {
  const response = await http.post('/caps/recalculate', params);
  return response.data;
};

/**
 * Get patient-specific cap tracking
 * @param patientId - Patient ID
 * @param capYear - Optional cap year filter
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getPatientCap = async (
  patientId: number,
  capYear?: number
): Promise<PaginatedResponse<CapTrackingRecord>> => {
  const response = await http.get(`/patients/${patientId}/cap-tracking`, {
    params: capYear ? { cap_year: capYear } : undefined
  });
  return response.data;
};

// ==============================|| COMPLIANCE ENDPOINTS ||============================== //

/**
 * Get overall compliance status
 * @param params - Query parameters
 * @requires Permission: VIEW_REPORTS
 */
export const getComplianceStatus = async (
  params?: PaginationParams & { status?: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT' | 'PENDING_REVIEW' }
): Promise<PaginatedResponse<ComplianceStatus>> => {
  const response = await http.get('/compliance/status', { params });
  return response.data;
};

/**
 * Get patient compliance status
 * @param patientId - Patient ID
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getPatientCompliance = async (
  patientId: number
): Promise<ApiResponse<ComplianceStatus>> => {
  const response = await http.get(`/patients/${patientId}/compliance`);
  return response.data;
};

/**
 * Get compliance issues
 * @param params - Query parameters
 * @requires Permission: VIEW_CLINICAL_NOTES
 */
export const getComplianceIssues = async (
  params?: PaginationParams & {
    status?: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'DISMISSED';
    category?: 'CAP' | 'CERTIFICATION' | 'F2F' | 'IDG' | 'DOCUMENTATION';
    severity?: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    patient_id?: number;
  }
): Promise<PaginatedResponse<ComplianceIssue>> => {
  const response = await http.get('/compliance/issues', { params });
  return response.data;
};

/**
 * Create compliance issue
 * @param issue - Issue data
 * @requires Permission: CREATE_CLINICAL_NOTES
 */
export const createComplianceIssue = async (
  issue: Omit<ComplianceIssue, 'id' | 'created_at' | 'updated_at' | 'resolved_at' | 'resolved_by_id'>
): Promise<ApiResponse<ComplianceIssue>> => {
  const response = await http.post('/compliance/issues', issue);
  return response.data;
};

/**
 * Update compliance issue
 * @param id - Issue ID
 * @param updates - Update data
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const updateComplianceIssue = async (
  id: number,
  updates: Partial<ComplianceIssue>
): Promise<ApiResponse<ComplianceIssue>> => {
  const response = await http.put(`/compliance/issues/${id}`, updates);
  return response.data;
};

/**
 * Resolve compliance issue
 * @param id - Issue ID
 * @param resolutionNotes - Resolution notes
 * @requires Permission: UPDATE_CLINICAL_NOTES
 */
export const resolveComplianceIssue = async (
  id: number,
  resolutionNotes?: string
): Promise<ApiResponse<ComplianceIssue>> => {
  const response = await http.post(`/compliance/issues/${id}/resolve`, {
    resolution_notes: resolutionNotes
  });
  return response.data;
};

// ==============================|| ALERT CONFIGURATION ||============================== //

/**
 * Get alert configurations
 * @requires Permission: VIEW_REPORTS or MANAGE_SETTINGS
 */
export const getAlertConfigs = async (): Promise<PaginatedResponse<AlertConfig>> => {
  const response = await http.get('/compliance/alerts/config');
  return response.data;
};

/**
 * Create or update alert configuration
 * @param config - Alert configuration
 * @requires Permission: MANAGE_SETTINGS
 */
export const upsertAlertConfig = async (
  config: Omit<AlertConfig, 'id'>
): Promise<ApiResponse<AlertConfig>> => {
  const response = await http.post('/compliance/alerts/config', config);
  return response.data;
};

/**
 * Toggle alert configuration enabled status
 * @param id - Alert config ID
 * @requires Permission: MANAGE_SETTINGS
 */
export const toggleAlertConfig = async (id: number): Promise<ApiResponse<AlertConfig>> => {
  const response = await http.put(`/compliance/alerts/config/${id}/toggle`);
  return response.data;
};

// ==============================|| UTILITY FUNCTIONS ||============================== //

/**
 * Format currency value (cents to dollars)
 */
export const formatCurrency = (cents: number): string => {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Get utilization status based on percentage
 */
export const getUtilizationStatus = (
  percentage: number
): 'healthy' | 'warning' | 'critical' | 'exceeded' => {
  if (percentage >= 100) return 'exceeded';
  if (percentage >= 90) return 'critical';
  if (percentage >= 80) return 'warning';
  return 'healthy';
};

/**
 * Get utilization color based on percentage
 */
export const getUtilizationColor = (percentage: number): string => {
  if (percentage >= 100) return '#d32f2f'; // error red
  if (percentage >= 90) return '#ed6c02'; // warning orange
  if (percentage >= 80) return '#ffa726'; // amber
  return '#2e7d32'; // success green
};

/**
 * Get status color for MUI components
 */
export const getStatusColor = (
  status: 'healthy' | 'warning' | 'critical' | 'exceeded'
): 'success' | 'warning' | 'error' => {
  switch (status) {
    case 'exceeded':
    case 'critical':
      return 'error';
    case 'warning':
      return 'warning';
    default:
      return 'success';
  }
};

/**
 * Get compliance status color
 */
export const getComplianceStatusColor = (
  status: 'COMPLIANT' | 'WARNING' | 'NON_COMPLIANT' | 'PENDING_REVIEW'
): 'success' | 'warning' | 'error' | 'info' => {
  switch (status) {
    case 'COMPLIANT':
      return 'success';
    case 'WARNING':
      return 'warning';
    case 'NON_COMPLIANT':
      return 'error';
    default:
      return 'info';
  }
};

/**
 * Get severity color
 */
export const getSeverityColor = (
  severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
): 'default' | 'primary' | 'warning' | 'error' => {
  switch (severity) {
    case 'CRITICAL':
      return 'error';
    case 'HIGH':
      return 'warning';
    case 'MEDIUM':
      return 'primary';
    default:
      return 'default';
  }
};
