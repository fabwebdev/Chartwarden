/**
 * Denial Management API Service
 *
 * Comprehensive API service for denial tracking, appeal management,
 * analytics, and trend reporting.
 *
 * Features:
 *   - Denial listing with filtering and pagination
 *   - Appeal case management
 *   - Dashboard analytics and KPIs
 *   - Trend analysis and reporting
 *   - Export functionality
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export type DenialStatus =
  | 'IDENTIFIED'
  | 'UNDER_REVIEW'
  | 'APPROVED_FOR_APPEAL'
  | 'DECLINED_FOR_APPEAL'
  | 'APPEALING'
  | 'APPEAL_WON'
  | 'APPEAL_LOST'
  | 'WRITTEN_OFF'
  | 'RESOLVED';

export type AppealLevel =
  | 'REDETERMINATION'
  | 'RECONSIDERATION'
  | 'ALJ_HEARING'
  | 'MAC_REVIEW'
  | 'FEDERAL_COURT';

export type AppealStatus =
  | 'PREPARING'
  | 'SUBMITTED'
  | 'PENDING'
  | 'ADDITIONAL_INFO_REQUESTED'
  | 'UNDER_REVIEW'
  | 'DECISION_RECEIVED'
  | 'WON'
  | 'PARTIALLY_WON'
  | 'LOST'
  | 'WITHDRAWN'
  | 'ESCALATED';

export type PriorityLevel = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export interface Denial {
  id: string;
  denial_id: string;
  claim_id: string;
  claim_number: string;
  patient_id: string;
  patient_name?: string;
  payer_id: string;
  payer_name?: string;
  denial_status: DenialStatus;
  denial_category_id?: string;
  denial_category_name?: string;
  primary_carc_code?: string;
  billed_amount: number;
  billed_amount_formatted?: string;
  denied_amount: number;
  denied_amount_formatted?: string;
  paid_amount: number;
  paid_amount_formatted?: string;
  denial_date: string;
  appeal_deadline?: string;
  days_to_deadline?: number;
  priority_score: number;
  priority_level: PriorityLevel;
  is_preventable: boolean;
  root_cause?: string;
  is_appealable: boolean;
  assigned_to_id?: string;
  assigned_to_name?: string;
  created_at: string;
  updated_at: string;
}

export interface Appeal {
  id: string;
  appeal_id: string;
  denial_id: string;
  claim_number?: string;
  patient_name?: string;
  payer_name?: string;
  appeal_level: AppealLevel;
  appeal_status: AppealStatus;
  submitted_date?: string;
  submission_method?: string;
  tracking_number?: string;
  appealed_amount: number;
  appealed_amount_formatted?: string;
  recovered_amount?: number;
  recovered_amount_formatted?: string;
  original_deadline: string;
  payer_response_deadline?: string;
  decision_date?: string;
  decision_summary?: string;
  created_at: string;
  updated_at: string;
}

export interface DenialReason {
  id: string;
  denial_id: string;
  carc_code: string;
  rarc_codes?: string[];
  adjustment_amount: number;
  procedure_code?: string;
  service_date?: string;
  payer_explanation?: string;
  is_appealable: boolean;
}

export interface DenialStats {
  total_denials: number;
  total_denied_amount: number;
  total_denied_amount_formatted: string;
  denials_by_status: Array<{
    status: DenialStatus;
    count: number;
    amount: number;
    amount_formatted: string;
  }>;
  denials_by_priority: Array<{
    priority: PriorityLevel;
    count: number;
  }>;
  avg_days_to_deadline: number;
  expiring_soon: number;
  preventable_count: number;
  preventable_rate: number;
}

export interface AppealStats {
  total_appeals: number;
  appeals_won: number;
  appeals_lost: number;
  appeals_pending: number;
  total_appealed_amount: number;
  total_appealed_amount_formatted: string;
  total_recovered_amount: number;
  total_recovered_amount_formatted: string;
  appeal_success_rate: number;
  recovery_rate: number;
  avg_appeal_cycle_time: number;
  appeals_by_level: Array<{
    level: AppealLevel;
    count: number;
    won: number;
    success_rate: number;
  }>;
}

export interface DenialTrend {
  period: string;
  total_denials: number;
  total_denied_amount: number;
  denial_rate: number;
  appeal_rate: number;
  appeal_success_rate: number;
  recovery_rate: number;
}

export interface TopDenialReason {
  carc_code: string;
  description: string;
  count: number;
  total_amount: number;
  total_amount_formatted: string;
  percentage: number;
  is_preventable: boolean;
  avg_appeal_success_rate: number;
}

export interface DenialDashboard {
  period: {
    label: string;
    start: string;
    end: string;
  };
  kpis: {
    total_denials: number;
    total_denied_amount: number;
    total_denied_amount_formatted: string;
    denial_rate: number;
    appeal_rate: number;
    appeal_success_rate: number;
    recovery_rate: number;
    avg_days_to_appeal: number;
    preventable_rate: number;
  };
  trends: {
    denial_rate_trend: 'increasing' | 'decreasing' | 'stable';
    denial_rate_change: number;
    recovery_trend: 'increasing' | 'decreasing' | 'stable';
    recovery_change: number;
  };
  top_payers: Array<{
    payer_id: string;
    payer_name: string;
    denial_count: number;
    denial_amount: number;
    denial_rate: number;
  }>;
  top_reasons: TopDenialReason[];
  action_required: {
    pending_review: number;
    expiring_deadlines: number;
    awaiting_decision: number;
  };
  generated_at: string;
}

export interface DenialFilters {
  status?: DenialStatus | DenialStatus[];
  priority?: PriorityLevel | PriorityLevel[];
  payer_id?: string;
  assigned_to?: string;
  date_from?: string;
  date_to?: string;
  is_preventable?: boolean;
  is_appealable?: boolean;
  search?: string;
}

export interface PaginationParams {
  page?: number;
  page_size?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_prev: boolean;
  };
}

// ==============================|| DENIAL ENDPOINTS ||============================== //

/**
 * Get denials requiring action
 * @param filters - Optional filters
 * @param pagination - Pagination params
 */
export const getDenials = async (
  filters?: DenialFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<Denial>> => {
  const params = {
    ...filters,
    ...pagination,
    status: filters?.status ? (Array.isArray(filters.status) ? filters.status.join(',') : filters.status) : undefined,
    priority: filters?.priority ? (Array.isArray(filters.priority) ? filters.priority.join(',') : filters.priority) : undefined
  };
  const response = await http.get('/denials', { params });
  return response.data.data || response.data;
};

/**
 * Get a single denial by ID
 * @param id - Denial ID
 */
export const getDenial = async (id: string): Promise<Denial> => {
  const response = await http.get(`/denials/${id}`);
  return response.data.data || response.data;
};

/**
 * Get denial reasons for a denial
 * @param denialId - Denial ID
 */
export const getDenialReasons = async (denialId: string): Promise<DenialReason[]> => {
  const response = await http.get(`/denials/${denialId}/reasons`);
  return response.data.data || response.data;
};

/**
 * Assign denial to a user
 * @param denialId - Denial ID
 * @param userId - User ID to assign to
 */
export const assignDenial = async (denialId: string, userId: string): Promise<Denial> => {
  const response = await http.post(`/denials/${denialId}/assign`, { user_id: userId });
  return response.data.data || response.data;
};

/**
 * Mark denial for appeal or decline
 * @param denialId - Denial ID
 * @param approve - Whether to approve for appeal
 * @param notes - Optional notes
 */
export const markForAppeal = async (
  denialId: string,
  approve: boolean,
  notes?: string
): Promise<Denial> => {
  const response = await http.post(`/denials/${denialId}/appeal`, {
    approve,
    notes
  });
  return response.data.data || response.data;
};

/**
 * Resolve denial without appeal
 * @param denialId - Denial ID
 * @param resolution - Resolution details
 */
export const resolveDenial = async (
  denialId: string,
  resolution: {
    resolution_type: 'WRITTEN_OFF' | 'CORRECTED' | 'PAYMENT_RECEIVED' | 'OTHER';
    resolution_amount?: number;
    notes?: string;
  }
): Promise<Denial> => {
  const response = await http.post(`/denials/${denialId}/resolve`, resolution);
  return response.data.data || response.data;
};

/**
 * Get denial statistics
 * @param filters - Optional filters
 */
export const getDenialStats = async (filters?: DenialFilters): Promise<DenialStats> => {
  const response = await http.get('/denials/stats', { params: filters });
  return response.data.data || response.data;
};

/**
 * Get top denial reasons
 * @param limit - Number of reasons to return
 * @param dateFrom - Start date
 * @param dateTo - End date
 */
export const getTopDenialReasons = async (
  limit: number = 10,
  dateFrom?: string,
  dateTo?: string
): Promise<TopDenialReason[]> => {
  const response = await http.get('/denials/top-reasons', {
    params: { limit, date_from: dateFrom, date_to: dateTo }
  });
  return response.data.data || response.data;
};

/**
 * Bulk assign denials
 * @param denialIds - Array of denial IDs
 * @param userId - User ID to assign to
 */
export const bulkAssignDenials = async (
  denialIds: string[],
  userId: string
): Promise<{ success: boolean; updated_count: number }> => {
  const response = await http.post('/denials/bulk-assign', {
    denial_ids: denialIds,
    user_id: userId
  });
  return response.data.data || response.data;
};

/**
 * Bulk resolve denials
 * @param denialIds - Array of denial IDs
 * @param resolution - Resolution details
 */
export const bulkResolveDenials = async (
  denialIds: string[],
  resolution: {
    resolution_type: 'WRITTEN_OFF' | 'OTHER';
    notes?: string;
  }
): Promise<{ success: boolean; updated_count: number }> => {
  const response = await http.post('/denials/bulk-resolve', {
    denial_ids: denialIds,
    ...resolution
  });
  return response.data.data || response.data;
};

// ==============================|| APPEAL ENDPOINTS ||============================== //

/**
 * Get appeals
 * @param filters - Optional filters
 * @param pagination - Pagination params
 */
export const getAppeals = async (
  filters?: {
    status?: AppealStatus | AppealStatus[];
    level?: AppealLevel;
    denial_id?: string;
  },
  pagination?: PaginationParams
): Promise<PaginatedResponse<Appeal>> => {
  const params = {
    ...filters,
    ...pagination,
    status: filters?.status ? (Array.isArray(filters.status) ? filters.status.join(',') : filters.status) : undefined
  };
  const response = await http.get('/appeals', { params });
  return response.data.data || response.data;
};

/**
 * Get a single appeal by ID
 * @param id - Appeal ID
 */
export const getAppeal = async (id: string): Promise<Appeal> => {
  const response = await http.get(`/appeals/${id}`);
  return response.data.data || response.data;
};

/**
 * Create an appeal case
 * @param denialId - Denial ID
 * @param appealData - Appeal data
 */
export const createAppeal = async (
  denialId: string,
  appealData: {
    appeal_level?: AppealLevel;
    rationale?: string;
    policy_references?: string[];
  }
): Promise<Appeal> => {
  const response = await http.post('/appeals', {
    denial_id: denialId,
    ...appealData
  });
  return response.data.data || response.data;
};

/**
 * Submit appeal to payer
 * @param appealId - Appeal ID
 * @param submissionData - Submission details
 */
export const submitAppeal = async (
  appealId: string,
  submissionData: {
    submission_method: 'ONLINE_PORTAL' | 'FAX' | 'MAIL' | 'ELECTRONIC';
    tracking_number?: string;
    confirmation_number?: string;
    notes?: string;
  }
): Promise<Appeal> => {
  const response = await http.post(`/appeals/${appealId}/submit`, submissionData);
  return response.data.data || response.data;
};

/**
 * Record appeal decision
 * @param appealId - Appeal ID
 * @param decisionData - Decision details
 */
export const recordAppealDecision = async (
  appealId: string,
  decisionData: {
    decision: 'WON' | 'PARTIALLY_WON' | 'LOST';
    recovered_amount?: number;
    decision_date?: string;
    decision_summary?: string;
    will_escalate?: boolean;
  }
): Promise<Appeal> => {
  const response = await http.post(`/appeals/${appealId}/decision`, decisionData);
  return response.data.data || response.data;
};

/**
 * Escalate appeal to next level
 * @param appealId - Appeal ID
 * @param escalationData - Escalation details
 */
export const escalateAppeal = async (
  appealId: string,
  escalationData?: {
    next_level?: AppealLevel;
    rationale?: string;
  }
): Promise<Appeal> => {
  const response = await http.post(`/appeals/${appealId}/escalate`, escalationData);
  return response.data.data || response.data;
};

/**
 * Get appeal statistics
 */
export const getAppealStats = async (filters?: {
  date_from?: string;
  date_to?: string;
  payer_id?: string;
}): Promise<AppealStats> => {
  const response = await http.get('/appeals/stats', { params: filters });
  return response.data.data || response.data;
};

/**
 * Get appeal timeline/milestones
 * @param appealId - Appeal ID
 */
export const getAppealTimeline = async (appealId: string): Promise<Array<{
  id: string;
  milestone_type: string;
  milestone_date: string;
  due_date?: string;
  is_completed: boolean;
  completed_at?: string;
  notes?: string;
}>> => {
  const response = await http.get(`/appeals/${appealId}/timeline`);
  return response.data.data || response.data;
};

// ==============================|| ANALYTICS ENDPOINTS ||============================== //

/**
 * Get denial trends over time
 * @param period - Time period (daily, weekly, monthly, quarterly)
 * @param dateFrom - Start date
 * @param dateTo - End date
 */
export const getDenialTrends = async (
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' = 'MONTHLY',
  dateFrom?: string,
  dateTo?: string
): Promise<DenialTrend[]> => {
  const response = await http.get('/denials/analytics/trends', {
    params: { period, date_from: dateFrom, date_to: dateTo }
  });
  return response.data.data || response.data;
};

/**
 * Get top denying payers
 * @param limit - Number of payers to return
 * @param dateFrom - Start date
 * @param dateTo - End date
 */
export const getTopDenyingPayers = async (
  limit: number = 10,
  dateFrom?: string,
  dateTo?: string
): Promise<Array<{
  payer_id: string;
  payer_name: string;
  total_denials: number;
  total_denied_amount: number;
  total_denied_amount_formatted: string;
  denial_rate: number;
  appeal_success_rate: number;
}>> => {
  const response = await http.get('/denials/analytics/top-payers', {
    params: { limit, date_from: dateFrom, date_to: dateTo }
  });
  return response.data.data || response.data;
};

/**
 * Get denial management dashboard
 * @param period - Dashboard period
 */
export const getDenialDashboard = async (
  period: string = 'current_month'
): Promise<DenialDashboard> => {
  const response = await http.get('/denials/analytics/dashboard', {
    params: { period }
  });
  return response.data.data || response.data;
};

/**
 * Calculate/refresh analytics metrics
 * @param period - Period to calculate
 * @param forceRecalculate - Force recalculation
 */
export const calculateAnalytics = async (
  period: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY' = 'MONTHLY',
  forceRecalculate: boolean = false
): Promise<{ success: boolean; message: string }> => {
  const response = await http.post('/denials/analytics/calculate', {
    period,
    force_recalculate: forceRecalculate
  });
  return response.data.data || response.data;
};

// ==============================|| EXPORT ENDPOINTS ||============================== //

/**
 * Export denials to CSV
 * @param filters - Optional filters
 */
export const exportDenialsToCSV = async (filters?: DenialFilters): Promise<Blob> => {
  const response = await http.get('/denials/export/csv', {
    params: filters,
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Export appeals to CSV
 * @param filters - Optional filters
 */
export const exportAppealsToCSV = async (filters?: {
  status?: AppealStatus | AppealStatus[];
  date_from?: string;
  date_to?: string;
}): Promise<Blob> => {
  const response = await http.get('/appeals/export/csv', {
    params: filters,
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Export denial report to PDF
 * @param reportType - Type of report
 * @param dateFrom - Start date
 * @param dateTo - End date
 */
export const exportDenialReportToPDF = async (
  reportType: 'summary' | 'detailed' | 'trend',
  dateFrom?: string,
  dateTo?: string
): Promise<Blob> => {
  const response = await http.get('/denials/export/pdf', {
    params: { report_type: reportType, date_from: dateFrom, date_to: dateTo },
    responseType: 'blob'
  });
  return response.data;
};

// ==============================|| UTILITY FUNCTIONS ||============================== //

/**
 * Format currency from cents to dollars
 */
export const formatCurrency = (cents: number): string => {
  const dollars = cents / 100;
  return `$${dollars.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  })}`;
};

/**
 * Get status color for denial status
 */
export const getDenialStatusColor = (status: DenialStatus): string => {
  const colors: Record<DenialStatus, string> = {
    IDENTIFIED: 'warning',
    UNDER_REVIEW: 'info',
    APPROVED_FOR_APPEAL: 'primary',
    DECLINED_FOR_APPEAL: 'default',
    APPEALING: 'info',
    APPEAL_WON: 'success',
    APPEAL_LOST: 'error',
    WRITTEN_OFF: 'default',
    RESOLVED: 'success'
  };
  return colors[status] || 'default';
};

/**
 * Get status color for appeal status
 */
export const getAppealStatusColor = (status: AppealStatus): string => {
  const colors: Record<AppealStatus, string> = {
    PREPARING: 'default',
    SUBMITTED: 'info',
    PENDING: 'warning',
    ADDITIONAL_INFO_REQUESTED: 'warning',
    UNDER_REVIEW: 'info',
    DECISION_RECEIVED: 'primary',
    WON: 'success',
    PARTIALLY_WON: 'success',
    LOST: 'error',
    WITHDRAWN: 'default',
    ESCALATED: 'primary'
  };
  return colors[status] || 'default';
};

/**
 * Get priority color
 */
export const getPriorityColor = (priority: PriorityLevel): string => {
  const colors: Record<PriorityLevel, string> = {
    CRITICAL: 'error',
    HIGH: 'warning',
    MEDIUM: 'info',
    LOW: 'default'
  };
  return colors[priority] || 'default';
};

/**
 * Format status for display
 */
export const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Calculate days remaining to deadline
 */
export const getDaysToDeadline = (deadline: string): number => {
  const deadlineDate = new Date(deadline);
  const today = new Date();
  const diffTime = deadlineDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
};

/**
 * Get urgency level based on days to deadline
 */
export const getUrgencyLevel = (daysToDeadline: number): 'critical' | 'warning' | 'normal' => {
  if (daysToDeadline <= 7) return 'critical';
  if (daysToDeadline <= 14) return 'warning';
  return 'normal';
};
