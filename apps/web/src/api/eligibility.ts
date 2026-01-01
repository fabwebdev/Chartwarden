/**
 * Eligibility Verification API Client
 *
 * Handles all eligibility-related API calls including verification requests,
 * coverage queries, and history retrieval.
 */

import { http } from 'lib/http';

// ==============================|| TYPES ||============================== //

export interface Payer {
  id: number;
  payer_name: string;
  payer_id_code?: string;
  payer_type?: 'COMMERCIAL' | 'MEDICARE' | 'MEDICAID' | 'OTHER';
  is_active?: boolean;
}

export interface Patient {
  id: number;
  first_name: string;
  last_name: string;
  date_of_birth: string;
  ssn?: string;
  member_id?: string;
}

export interface VerificationRequest {
  patientId: number;
  payerId?: number;
  serviceType?: 'HOSPICE' | 'MEDICAL' | 'HEALTH_BENEFIT_PLAN' | 'SKILLED_NURSING' | 'HOME_HEALTH';
  forceRefresh?: boolean;
  // Additional fields for direct verification
  memberFirstName?: string;
  memberLastName?: string;
  memberDateOfBirth?: string;
  memberId?: string;
  subscriberId?: string;
  serviceDate?: string;
  providerNpi?: string;
  isSubscriber?: boolean;
  subscriberFirstName?: string;
  subscriberLastName?: string;
  subscriberDateOfBirth?: string;
}

export interface VerificationResponse {
  source: 'REAL_TIME' | 'CACHE';
  cached: boolean;
  requestId: string;
  status: 'PENDING' | 'SENT' | 'RECEIVED' | 'ERROR' | 'TIMEOUT' | 'CANCELLED';
  request?: EligibilityRequest;
  response?: EligibilityResponse;
  coverage?: CoverageInfo;
}

export interface EligibilityRequest {
  id: number;
  requestId: string;
  patientId: number;
  payerId?: number;
  serviceType: string;
  status: string;
  createdAt: string;
  sentAt?: string;
  providerNpi?: string;
  clearinghouseName?: string;
  clearinghouseTraceId?: string;
  retryCount: number;
  errorMessage?: string;
}

export interface EligibilityResponse {
  id: number;
  responseId: string;
  isEligible: boolean;
  eligibilityStatus: string;
  coverageEffectiveDate?: string;
  coverageTerminationDate?: string;
  copayAmount?: number;
  deductibleAmount?: number;
  outOfPocketMax?: number;
  authorizationRequired: boolean;
  authorizationNumber?: string;
  limitations?: string;
  validUntil?: string;
  isCurrent: boolean;
}

export interface CoverageInfo {
  id: number;
  patientId: number;
  payerId?: number;
  isActive: boolean;
  eligibilityVerified: boolean;
  lastVerifiedDate?: string;
  effectiveDate?: string;
  terminationDate?: string;
  memberId?: string;
  planName?: string;
  planNumber?: string;
  groupNumber?: string;
  copayAmount?: number;
  deductibleAmount?: number;
  deductibleRemaining?: number;
  outOfPocketMax?: number;
  outOfPocketRemaining?: number;
  authorizationRequired: boolean;
  authorizationNumber?: string;
  authorizationExpiration?: string;
  hospiceCovered: boolean;
  limitations?: string;
  cacheExpiresAt?: string;
  needsReverification: boolean;
  reverificationReason?: string;
  cacheStatus?: {
    expired: boolean;
    daysUntilExpiration: number;
  };
}

export interface BenefitDetail {
  id: number;
  responseId: number;
  patientId: number;
  serviceTypeCode: string;
  coverageLevel?: string;
  timePeriodQualifier?: string;
  monetaryAmount?: number;
  percentageAmount?: number;
  quantity?: number;
  benefitType: 'COPAY' | 'DEDUCTIBLE' | 'COINSURANCE' | 'LIMIT' | 'OUT_OF_POCKET' | 'OTHER';
  authorizationRequired: boolean;
  benefitBeginDate?: string;
  benefitEndDate?: string;
  inNetwork: boolean;
  additionalInfo?: Record<string, unknown>;
}

export interface CoverageSummary {
  coverage: CoverageInfo;
  benefits: BenefitDetail[];
  recentVerifications: EligibilityRequest[];
  recommendations: string[];
}

export interface VerificationHistoryItem {
  id: number;
  requestId: string;
  status: string;
  serviceType: string;
  createdAt: string;
  sentAt?: string;
  receivedAt?: string;
  response?: {
    isEligible: boolean;
    eligibilityStatus: string;
  };
}

export type VerificationStatus = 'PENDING' | 'SENT' | 'RECEIVED' | 'ERROR' | 'TIMEOUT' | 'CANCELLED';

export interface RequestFilters {
  status?: VerificationStatus;
  startDate?: string;
  endDate?: string;
  providerNpi?: string;
  page?: number;
  limit?: number;
}

export interface CoverageFilters {
  patientId?: number;
  memberId?: string;
  payerId?: number;
  isActive?: boolean;
  serviceDate?: string;
  authorizationRequired?: boolean;
  hospiceCovered?: boolean;
  needsReverification?: boolean;
  includeExpired?: boolean;
  page?: number;
  limit?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// ==============================|| API FUNCTIONS ||============================== //

/**
 * Verify patient eligibility
 */
export async function verifyEligibility(request: VerificationRequest): Promise<VerificationResponse> {
  const response = await http.post<{ success: boolean; data: VerificationResponse }>('/eligibility/verify', request);
  if (!response.data.success) {
    throw new Error('Verification failed');
  }
  return response.data.data;
}

/**
 * Batch verify eligibility for multiple patients
 */
export async function batchVerifyEligibility(
  patientIds: number[],
  options?: { serviceType?: string; forceRefresh?: boolean }
): Promise<{
  summary: { total: number; successful: number; failed: number };
  results: Array<{ patientId: number; success: boolean; data?: VerificationResponse; error?: string }>;
}> {
  const response = await http.post<{
    success: boolean;
    summary: { total: number; successful: number; failed: number };
    results: Array<{ patientId: number; success: boolean; data?: VerificationResponse; error?: string }>;
  }>('/eligibility/batch-verify', {
    patientIds,
    ...options
  });
  return response.data;
}

/**
 * Get current coverage for a patient
 */
export async function getCurrentCoverage(patientId: number): Promise<CoverageInfo | null> {
  try {
    const response = await http.get<{ success: boolean; data: CoverageInfo }>(`/eligibility/coverage/${patientId}`);
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Get eligibility verification history for a patient
 */
export async function getEligibilityHistory(patientId: number, limit: number = 10): Promise<VerificationHistoryItem[]> {
  const response = await http.get<{ success: boolean; count: number; data: VerificationHistoryItem[] }>(
    `/eligibility/history/${patientId}`,
    { params: { limit } }
  );
  return response.data.data;
}

/**
 * Get verification status by request ID
 */
export async function getVerificationStatus(requestId: string): Promise<EligibilityRequest & { response?: EligibilityResponse }> {
  const response = await http.get<{ success: boolean; data: EligibilityRequest & { response?: EligibilityResponse } }>(
    `/eligibility/status/${requestId}`
  );
  return response.data.data;
}

/**
 * Get eligibility request details
 */
export async function getRequest(requestId: string): Promise<EligibilityRequest> {
  const response = await http.get<{ success: boolean; data: EligibilityRequest }>(`/eligibility/request/${requestId}`);
  return response.data.data;
}

/**
 * Get benefit details for a response
 */
export async function getBenefitDetails(responseId: number): Promise<BenefitDetail[]> {
  const response = await http.get<{ success: boolean; count: number; data: BenefitDetail[] }>(
    `/eligibility/benefits/${responseId}`
  );
  return response.data.data;
}

/**
 * List verification requests with filtering
 */
export async function listRequests(filters: RequestFilters = {}): Promise<PaginatedResponse<EligibilityRequest>> {
  const response = await http.get<{
    success: boolean;
    data: EligibilityRequest[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>('/eligibility/requests', { params: filters });
  return {
    data: response.data.data,
    pagination: response.data.pagination
  };
}

/**
 * Query coverage information with flexible filters
 */
export async function queryCoverage(filters: CoverageFilters = {}): Promise<PaginatedResponse<CoverageInfo>> {
  const response = await http.get<{
    success: boolean;
    data: CoverageInfo[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }>('/eligibility/coverage/query', { params: filters });
  return {
    data: response.data.data,
    pagination: response.data.pagination
  };
}

/**
 * Get comprehensive coverage summary for a patient
 */
export async function getCoverageSummary(patientId: number): Promise<CoverageSummary | null> {
  try {
    const response = await http.get<{ success: boolean; data: CoverageSummary }>(
      `/eligibility/coverage/${patientId}/summary`
    );
    return response.data.data;
  } catch (error: any) {
    if (error.response?.status === 404) {
      return null;
    }
    throw error;
  }
}

/**
 * Retry a failed verification
 */
export async function retryVerification(requestId: string): Promise<VerificationResponse> {
  const response = await http.post<{ success: boolean; data: VerificationResponse }>(
    `/eligibility/retry/${requestId}`
  );
  return response.data.data;
}

/**
 * Cancel a pending request
 */
export async function cancelRequest(requestId: string, reason?: string): Promise<void> {
  await http.post(`/eligibility/cancel/${requestId}`, { reason });
}

/**
 * Mark a patient for reverification
 */
export async function markForReverification(patientId: number, reason?: string): Promise<void> {
  await http.post('/eligibility/mark-reverification', { patientId, reason });
}

/**
 * Get patients needing reverification
 */
export async function getReverificationList(): Promise<Patient[]> {
  const response = await http.get<{ success: boolean; count: number; data: Patient[] }>(
    '/eligibility/reverification-list'
  );
  return response.data.data;
}

/**
 * Get list of payers
 */
export async function getPayers(): Promise<Payer[]> {
  try {
    const response = await http.get<{ success: boolean; data: Payer[] } | Payer[]>('/payers');
    // Handle both response formats
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to fetch payers:', error);
    return [];
  }
}

/**
 * Search patients
 */
export async function searchPatients(query: string): Promise<Patient[]> {
  try {
    const response = await http.get<{ success: boolean; data: Patient[] } | Patient[]>('/patients', {
      params: { search: query, limit: 20 }
    });
    // Handle both response formats
    if (Array.isArray(response.data)) {
      return response.data;
    }
    return response.data.data || [];
  } catch (error) {
    console.error('Failed to search patients:', error);
    return [];
  }
}

// ==============================|| UTILITY FUNCTIONS ||============================== //

/**
 * Format currency value
 */
export function formatCurrency(value: number | undefined | null): string {
  if (value === undefined || value === null) return '-';
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(value);
}

/**
 * Get status color for display
 */
export function getStatusColor(status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' {
  switch (status) {
    case 'RECEIVED':
      return 'success';
    case 'PENDING':
    case 'SENT':
      return 'info';
    case 'ERROR':
    case 'TIMEOUT':
      return 'error';
    case 'CANCELLED':
      return 'warning';
    default:
      return 'default';
  }
}

/**
 * Get coverage status color
 */
export function getCoverageStatusColor(isActive: boolean, isExpired?: boolean): 'success' | 'error' | 'warning' {
  if (!isActive) return 'error';
  if (isExpired) return 'warning';
  return 'success';
}

/**
 * Format date for display
 */
export function formatDate(dateString: string | undefined | null): string {
  if (!dateString) return '-';
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

/**
 * Format date for API (MM/DD/YYYY)
 */
export function formatDateForApi(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const year = date.getFullYear();
  return `${month}/${day}/${year}`;
}

/**
 * Parse date from MM/DD/YYYY format
 */
export function parseDateFromApi(dateString: string): Date | null {
  const match = dateString.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
  if (!match) return null;
  const [, month, day, year] = match;
  return new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
}

/**
 * Validate date format (MM/DD/YYYY)
 */
export function isValidDateFormat(value: string): boolean {
  return /^\d{2}\/\d{2}\/\d{4}$/.test(value);
}

/**
 * Calculate days until expiration
 */
export function getDaysUntilExpiration(expirationDate: string | undefined | null): number | null {
  if (!expirationDate) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const expDate = new Date(expirationDate);
  expDate.setHours(0, 0, 0, 0);
  const diffTime = expDate.getTime() - today.getTime();
  return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
}

/**
 * Get service type display name
 */
export function getServiceTypeLabel(serviceType: string): string {
  const labels: Record<string, string> = {
    'HOSPICE': 'Hospice Care',
    'MEDICAL': 'Medical Services',
    'HEALTH_BENEFIT_PLAN': 'Health Benefit Plan',
    'SKILLED_NURSING': 'Skilled Nursing',
    'HOME_HEALTH': 'Home Health'
  };
  return labels[serviceType] || serviceType;
}

/**
 * Get benefit type display name
 */
export function getBenefitTypeLabel(benefitType: string): string {
  const labels: Record<string, string> = {
    'COPAY': 'Copay',
    'DEDUCTIBLE': 'Deductible',
    'COINSURANCE': 'Coinsurance',
    'LIMIT': 'Coverage Limit',
    'OUT_OF_POCKET': 'Out of Pocket Maximum',
    'OTHER': 'Other'
  };
  return labels[benefitType] || benefitType;
}
