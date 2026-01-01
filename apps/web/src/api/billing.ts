/**
 * Billing API Service
 *
 * Comprehensive API service for claims management, payments, invoices,
 * and billing analytics.
 *
 * Features:
 *   - Claims listing with filtering and pagination
 *   - Claim detail retrieval
 *   - Payment tracking
 *   - Billing analytics and KPIs
 *   - AR aging reports
 *   - Export functionality
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export type ClaimStatus =
  | 'DRAFT'
  | 'READY_TO_SUBMIT'
  | 'SUBMITTED'
  | 'ACCEPTED'
  | 'REJECTED'
  | 'PAID'
  | 'DENIED'
  | 'APPEALED'
  | 'VOID';

export type PaymentMethod = 'CHECK' | 'EFT' | 'ACH' | 'WIRE' | 'CARD';

export type PayerType = 'MEDICARE' | 'MEDICAID' | 'COMMERCIAL' | 'SELF_PAY' | 'OTHER';

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  medical_record_number?: string;
}

export interface Payer {
  id: number;
  payer_name: string;
  payer_type: PayerType;
}

export interface Claim {
  id: number;
  claim_number: string;
  patient_id: number;
  patient?: Patient;
  payer_id?: number;
  payer?: Payer;
  claim_type: 'INSTITUTIONAL' | 'PROFESSIONAL';
  claim_status: ClaimStatus;
  service_start_date: string;
  service_end_date: string;
  bill_type?: string;
  total_charges: number;
  total_paid: number;
  total_adjustments: number;
  balance: number;
  submission_date?: string;
  payment_date?: string;
  principal_diagnosis_code?: string;
  attending_physician_name?: string;
  notes?: string;
  created_at: string;
  updated_at: string;
  created_by_id?: string;
}

export interface ClaimServiceLine {
  id: number;
  claim_id: number;
  line_number: number;
  service_date: string;
  revenue_code: string;
  level_of_care?: string;
  units: number;
  charges: number;
  hcpcs_code?: string;
  description?: string;
}

export interface ClaimStatusHistory {
  id: number;
  claim_id: number;
  old_status?: ClaimStatus;
  new_status: ClaimStatus;
  changed_by_id?: string;
  changed_by_name?: string;
  change_reason?: string;
  notes?: string;
  created_at: string;
}

export interface ClaimSubmissionHistory {
  id: number;
  claim_id: number;
  submission_method?: string;
  edi_control_number?: string;
  payer_response_code?: string;
  payer_response_message?: string;
  submitted_at: string;
  response_received_at?: string;
  was_accepted: boolean;
}

export interface Payment {
  id: number;
  payment_number: string;
  payer_id?: number;
  payer_name?: string;
  payment_method: PaymentMethod;
  payment_date: string;
  total_amount: number;
  check_number?: string;
  eft_number?: string;
  era_reference?: string;
  notes?: string;
  created_at: string;
}

export interface PaymentApplication {
  id: number;
  payment_id: number;
  claim_id: number;
  applied_amount: number;
  adjustment_amount: number;
  adjustment_reason?: string;
  applied_at: string;
}

export interface ClaimDetail extends Claim {
  service_lines: ClaimServiceLine[];
  payments_applied: Array<{
    application: PaymentApplication;
    payment: Payment;
  }>;
  status_history?: ClaimStatusHistory[];
  submission_history?: ClaimSubmissionHistory[];
}

export interface ARAgingBucket {
  bucket: string;
  claim_count: number;
  total_amount: number;
  total_amount_formatted: string;
  percentage: number;
}

export interface ARAgingReport {
  as_of_date: string;
  total_ar: number;
  total_ar_formatted: string;
  buckets: ARAgingBucket[];
  by_payer: Array<{
    payer_id: number;
    payer_name: string;
    current: number;
    days_31_60: number;
    days_61_90: number;
    over_90: number;
    total: number;
    total_formatted: string;
  }>;
}

export interface BillingDashboardKPIs {
  total_claims: number;
  total_revenue: number;
  total_revenue_formatted: string;
  total_payments: number;
  total_payments_formatted: string;
  total_outstanding: number;
  total_outstanding_formatted: string;
  collection_rate: number;
  clean_claim_rate: number;
  denial_rate: number;
  avg_days_to_payment: number;
  claims_by_status: Array<{
    status: ClaimStatus;
    count: number;
    amount: number;
    amount_formatted: string;
  }>;
}

export interface BillingDashboard {
  period: {
    label: string;
    start: string;
    end: string;
  };
  kpis: BillingDashboardKPIs;
  trends: {
    revenue_trend: 'increasing' | 'decreasing' | 'stable';
    revenue_change: number;
    collection_trend: 'increasing' | 'decreasing' | 'stable';
    collection_change: number;
  };
  ar_aging: ARAgingBucket[];
  top_payers: Array<{
    payer_id: number;
    payer_name: string;
    claim_count: number;
    total_billed: number;
    total_paid: number;
    collection_rate: number;
  }>;
  recent_activity: Array<{
    type: 'claim' | 'payment';
    description: string;
    amount: number;
    amount_formatted: string;
    date: string;
  }>;
  action_required: {
    ready_to_submit: number;
    rejected_claims: number;
    denied_claims: number;
    unbilled_periods: number;
  };
  generated_at: string;
}

export interface ClaimFilters {
  status?: ClaimStatus | ClaimStatus[];
  patient_id?: number;
  payer_id?: number;
  start_date?: string;
  end_date?: string;
  min_amount?: number;
  max_amount?: number;
  created_by?: string;
  search?: string;
}

export interface PaginationParams {
  limit?: number;
  offset?: number;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  count: number;
  total: number;
  pagination: {
    limit: number;
    offset: number;
    total: number;
    pages: number;
    currentPage: number;
  };
}

// ==============================|| CLAIMS ENDPOINTS ||============================== //

/**
 * Get all claims with filters and pagination
 */
export const getClaims = async (
  filters?: ClaimFilters,
  pagination?: PaginationParams
): Promise<PaginatedResponse<{ claim: Claim; patient: Patient; payer: Payer }>> => {
  const params: Record<string, string | number | undefined> = {
    ...pagination,
    status: filters?.status
      ? Array.isArray(filters.status)
        ? filters.status.join(',')
        : filters.status
      : undefined,
    patient_id: filters?.patient_id,
    payer_id: filters?.payer_id,
    start_date: filters?.start_date,
    end_date: filters?.end_date,
    min_amount: filters?.min_amount,
    max_amount: filters?.max_amount,
    created_by: filters?.created_by
  };

  // Remove undefined values
  Object.keys(params).forEach(key => {
    if (params[key] === undefined) {
      delete params[key];
    }
  });

  const response = await http.get('/billing/claims', { params });
  return response.data.data || response.data;
};

/**
 * Get claim by ID with full details
 */
export const getClaimById = async (id: number): Promise<ClaimDetail> => {
  const response = await http.get(`/billing/claims/${id}`);
  return response.data.data || response.data;
};

/**
 * Get claim status history
 */
export const getClaimStatusHistory = async (claimId: number): Promise<ClaimStatusHistory[]> => {
  const response = await http.get(`/billing/claims/${claimId}/status-history`);
  return response.data.data || response.data;
};

/**
 * Get claim submission history
 */
export const getClaimSubmissionHistory = async (claimId: number): Promise<ClaimSubmissionHistory[]> => {
  const response = await http.get(`/billing/claims/${claimId}/submissions`);
  return response.data.data || response.data;
};

/**
 * Update claim status
 */
export const updateClaimStatus = async (
  claimId: number,
  status: ClaimStatus,
  notes?: string
): Promise<Claim> => {
  const response = await http.patch(`/billing/claims/${claimId}/status`, { status, notes });
  return response.data.data || response.data;
};

/**
 * Submit claim for processing
 */
export const submitClaim = async (claimId: number): Promise<Claim> => {
  const response = await http.post(`/billing/claims/${claimId}/submit`);
  return response.data.data || response.data;
};

/**
 * Void a claim
 */
export const voidClaim = async (claimId: number, reason: string): Promise<Claim> => {
  const response = await http.post(`/billing/claims/${claimId}/void`, { reason });
  return response.data.data || response.data;
};

/**
 * Get rejected claims
 */
export const getRejectedClaims = async (
  pagination?: PaginationParams
): Promise<PaginatedResponse<{ claim: Claim; patient: Patient; payer: Payer }>> => {
  const response = await http.get('/billing/claims/rejected', { params: pagination });
  return response.data.data || response.data;
};

/**
 * Get unbilled periods
 */
export const getUnbilledPeriods = async (): Promise<Array<{
  patient_id: number;
  patient_name: string;
  payer_id: number;
  payer_name: string;
  level_of_care: string;
  start_date: string;
  end_date: string;
  estimated_charges: number;
}>> => {
  const response = await http.get('/billing/claims/unbilled');
  return response.data.data || response.data;
};

// ==============================|| PAYMENTS ENDPOINTS ||============================== //

/**
 * Get all payments
 */
export const getPayments = async (
  filters?: {
    payer_id?: number;
    start_date?: string;
    end_date?: string;
  },
  pagination?: PaginationParams
): Promise<PaginatedResponse<Payment>> => {
  const response = await http.get('/billing/payments', {
    params: { ...filters, ...pagination }
  });
  return response.data.data || response.data;
};

/**
 * Get payment by ID with applications
 */
export const getPaymentById = async (id: number): Promise<{
  payment: Payment;
  applications: PaymentApplication[];
}> => {
  const response = await http.get(`/billing/payments/${id}`);
  return response.data.data || response.data;
};

// ==============================|| AR AGING ENDPOINTS ||============================== //

/**
 * Get AR aging report
 */
export const getARAgingReport = async (): Promise<ARAgingReport> => {
  const response = await http.get('/billing/ar-aging');
  return response.data.data || response.data;
};

// ==============================|| ANALYTICS ENDPOINTS ||============================== //

/**
 * Get billing dashboard
 */
export const getBillingDashboard = async (
  period: string = 'current_month'
): Promise<BillingDashboard> => {
  const response = await http.get('/billing/dashboard', {
    params: { period }
  });
  return response.data.data || response.data;
};

/**
 * Get billing KPIs
 */
export const getBillingKPIs = async (
  period?: string
): Promise<BillingDashboardKPIs> => {
  const response = await http.get('/billing/kpis', {
    params: { period }
  });
  return response.data.data || response.data;
};

// ==============================|| EXPORT ENDPOINTS ||============================== //

/**
 * Export claims to CSV
 */
export const exportClaimsToCSV = async (filters?: ClaimFilters): Promise<Blob> => {
  const response = await http.get('/billing/claims/export/csv', {
    params: filters,
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
 * Get status color for claim status
 */
export const getClaimStatusColor = (status: ClaimStatus): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const colors: Record<ClaimStatus, 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning'> = {
    DRAFT: 'default',
    READY_TO_SUBMIT: 'warning',
    SUBMITTED: 'info',
    ACCEPTED: 'primary',
    REJECTED: 'error',
    PAID: 'success',
    DENIED: 'error',
    APPEALED: 'warning',
    VOID: 'default'
  };
  return colors[status] || 'default';
};

/**
 * Get status display label
 */
export const getClaimStatusLabel = (status: ClaimStatus): string => {
  const labels: Record<ClaimStatus, string> = {
    DRAFT: 'Draft',
    READY_TO_SUBMIT: 'Ready to Submit',
    SUBMITTED: 'Submitted',
    ACCEPTED: 'Accepted',
    REJECTED: 'Rejected',
    PAID: 'Paid',
    DENIED: 'Denied',
    APPEALED: 'Appealed',
    VOID: 'Void'
  };
  return labels[status] || status;
};

/**
 * Format status for display
 */
export const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Get patient full name
 */
export const getPatientName = (patient?: Patient): string => {
  if (!patient) return '-';
  return `${patient.first_name} ${patient.last_name}`.trim() || '-';
};

/**
 * Calculate days since date
 */
export const getDaysSince = (dateString: string): number => {
  const date = new Date(dateString);
  const today = new Date();
  const diffTime = today.getTime() - date.getTime();
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
};
