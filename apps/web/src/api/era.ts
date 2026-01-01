/**
 * ERA (Electronic Remittance Advice) API Service
 *
 * Comprehensive API service for ERA file upload, processing, payment posting,
 * exception management, and reconciliation.
 *
 * Features:
 *   - ERA file upload (835 EDI and CSV formats)
 *   - File processing and validation
 *   - Payment posting (auto and manual)
 *   - Exception queue management
 *   - Daily deposit reconciliation
 *   - Dashboard metrics and reporting
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export type ERAFileStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'ERROR' | 'PARTIALLY_POSTED';
export type ERASource = 'SFTP' | 'API' | 'MANUAL_UPLOAD' | 'EMAIL';
export type ERAPostingStatus = 'PENDING' | 'AUTO_POSTED' | 'MANUAL_POSTED' | 'EXCEPTION' | 'DENIED';
export type ExceptionType =
  | 'CLAIM_NOT_FOUND'
  | 'AMOUNT_MISMATCH'
  | 'DUPLICATE_PAYMENT'
  | 'PARTIAL_PAYMENT'
  | 'PATIENT_MISMATCH'
  | 'INVALID_CLAIM_STATUS'
  | 'MISSING_REQUIRED_DATA';
export type ExceptionSeverity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
export type ExceptionStatus = 'PENDING' | 'ASSIGNED' | 'IN_REVIEW' | 'RESOLVED' | 'CLOSED';
export type ReconciliationStatus = 'PENDING' | 'IN_PROGRESS' | 'RECONCILED' | 'VARIANCE' | 'CLOSED';

export interface ERAFile {
  id: number;
  fileId: string;
  fileName: string;
  fileSize?: number;
  status: ERAFileStatus;
  controlNumber?: string;
  payerId?: string;
  payerName?: string;
  payerIdentifier?: string;
  productionDate?: string;
  receivedDate: string;
  processedAt?: string;
  totalPayments: number;
  totalAmount: number;
  totalClaims: number;
  autoPostedCount: number;
  exceptionCount: number;
  source?: ERASource;
  sourcePath?: string;
  uploadedById?: string;
  uploadedByName?: string;
  errorMessage?: string;
  errorDetails?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

export interface ERAPayment {
  id: number;
  paymentId: string;
  eraFileId: number;
  claimId?: number;
  checkNumber?: string;
  checkDate?: string;
  payerClaimControlNumber?: string;
  patientControlNumber?: string;
  patientName?: string;
  claimStatus?: string;
  totalPaymentAmount: number;
  totalBilledAmount?: number;
  totalAllowedAmount?: number;
  totalAdjustmentAmount?: number;
  contractualAdjustment?: number;
  patientResponsibility?: number;
  postingStatus: ERAPostingStatus;
  postedAt?: string;
  postedById?: string;
  isException: boolean;
  exceptionReason?: string;
  adjustmentCodes?: AdjustmentCode[];
  remarkCodes?: string[];
  claimPaymentInfo?: Record<string, unknown>;
  servicePaymentInfo?: ServicePaymentInfo[];
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AdjustmentCode {
  groupCode: 'CO' | 'CR' | 'OA' | 'PI' | 'PR';
  code: string;
  amount: number;
  description?: string;
}

export interface ServicePaymentInfo {
  procedureCode?: string;
  serviceDate?: string;
  billedAmount?: number;
  allowedAmount?: number;
  paidAmount?: number;
  adjustments?: AdjustmentCode[];
}

export interface PaymentPosting {
  id: number;
  postingId: string;
  eraPaymentId: number;
  claimId: number;
  postingType: 'AUTO' | 'MANUAL' | 'ADJUSTMENT';
  paymentAmount: number;
  allowedAmount?: number;
  billedAmount?: number;
  adjustmentAmount?: number;
  contractualAdjustment?: number;
  patientResponsibility?: number;
  writeOffAmount?: number;
  previousBalance?: number;
  newBalance?: number;
  isReversed: boolean;
  reversedAt?: string;
  reversedById?: string;
  reversalReason?: string;
  notes?: string;
  postedAt: string;
  postedById: string;
  postedByName?: string;
  createdAt: string;
}

export interface PostingException {
  id: number;
  exceptionId: string;
  eraPaymentId: number;
  eraFileId: number;
  claimId?: number;
  exceptionType: ExceptionType;
  severity: ExceptionSeverity;
  status: ExceptionStatus;
  expectedAmount?: number;
  actualAmount?: number;
  variance?: number;
  matchConfidence?: number;
  matchedCandidates?: MatchCandidate[];
  description?: string;
  resolution?: string;
  resolvedAt?: string;
  resolvedById?: string;
  resolvedByName?: string;
  assignedToId?: string;
  assignedToName?: string;
  slaDeadline?: string;
  isOverdue?: boolean;
  followUpRequired?: boolean;
  followUpDate?: string;
  followUpNotes?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  // Joined data
  paymentInfo?: Partial<ERAPayment>;
  claimInfo?: {
    claimNumber?: string;
    patientName?: string;
    billedAmount?: number;
    balance?: number;
  };
}

export interface MatchCandidate {
  claimId: number;
  claimNumber?: string;
  patientName?: string;
  billedAmount?: number;
  balance?: number;
  confidence: number;
}

export interface ReconciliationBatch {
  id: number;
  batchId: string;
  batchDate: string;
  depositDate?: string;
  depositAmount?: number;
  bankStatementAmount?: number;
  eraFileCount: number;
  totalEraPayments: number;
  totalPostedPayments: number;
  varianceAmount?: number;
  isReconciled: boolean;
  reconciliationStatus: ReconciliationStatus;
  unmatchedDeposits?: UnmatchedItem[];
  unmatchedEras?: UnmatchedItem[];
  bankAccountNumber?: string;
  bankRoutingNumber?: string;
  bankStatementReference?: string;
  reconciledAt?: string;
  reconciledById?: string;
  reconciledByName?: string;
  approvedAt?: string;
  approvedById?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnmatchedItem {
  id: string;
  amount: number;
  date?: string;
  reference?: string;
  description?: string;
}

export interface ERADashboard {
  period: {
    label: string;
    start: string;
    end: string;
  };
  kpis: {
    totalFiles: number;
    totalPayments: number;
    totalPaymentAmount: number;
    totalPaymentAmountFormatted: string;
    autoPostRate: number;
    exceptionRate: number;
    avgProcessingTime: number;
    pendingExceptions: number;
    overdueExceptions: number;
  };
  recentFiles: ERAFile[];
  exceptionsByType: Array<{
    type: ExceptionType;
    count: number;
    amount: number;
  }>;
  reconciliationStatus: {
    pendingBatches: number;
    totalVariance: number;
    reconciled: number;
    withVariance: number;
  };
}

export interface ProcessingReport {
  fileId: string;
  fileName: string;
  status: ERAFileStatus;
  summary: {
    totalPayments: number;
    totalAmount: number;
    autoPosted: number;
    autoPostedAmount: number;
    exceptions: number;
    exceptionsAmount: number;
    denied: number;
    deniedAmount: number;
  };
  payments: Array<{
    paymentId: string;
    patientName?: string;
    amount: number;
    status: ERAPostingStatus;
    claimNumber?: string;
    exceptionReason?: string;
  }>;
  exceptions: Array<{
    exceptionId: string;
    type: ExceptionType;
    severity: ExceptionSeverity;
    amount: number;
    description?: string;
  }>;
  processedAt: string;
  processingDuration?: number;
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

// ==============================|| FILE UPLOAD ENDPOINTS ||============================== //

/**
 * Upload an ERA file (835 EDI or CSV)
 * @param file - The file to upload
 * @param options - Upload options
 */
export const uploadERAFile = async (
  file: File,
  options?: {
    validateOnly?: boolean;
    autoProcess?: boolean;
  }
): Promise<{
  fileId: string;
  fileName: string;
  status: ERAFileStatus;
  validation?: {
    isValid: boolean;
    errors?: string[];
    warnings?: string[];
  };
  message: string;
}> => {
  const formData = new FormData();
  formData.append('file', file);
  if (options?.validateOnly) {
    formData.append('validateOnly', 'true');
  }
  if (options?.autoProcess) {
    formData.append('autoProcess', 'true');
  }

  const response = await http.post('/era/upload-file', formData, {
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  });
  return response.data.data || response.data;
};

/**
 * Upload ERA content directly (for copy-paste or programmatic upload)
 * @param content - The 835 EDI or CSV content
 * @param fileName - The file name
 * @param format - The content format
 */
export const uploadERAContent = async (
  content: string,
  fileName: string,
  format: '835' | 'csv' = '835'
): Promise<{
  fileId: string;
  fileName: string;
  status: ERAFileStatus;
  message: string;
}> => {
  const response = await http.post('/era/upload', {
    content,
    fileName,
    format
  });
  return response.data.data || response.data;
};

/**
 * Validate an ERA file without processing
 * @param content - The file content
 * @param format - The content format
 */
export const validateERAFile = async (
  content: string,
  format: '835' | 'csv' = '835'
): Promise<{
  isValid: boolean;
  format: string;
  errors: string[];
  warnings: string[];
  preview?: {
    payerName?: string;
    totalPayments?: number;
    totalAmount?: number;
    controlNumber?: string;
  };
}> => {
  const response = await http.post('/era/validate', { content, format });
  return response.data.data || response.data;
};

// ==============================|| FILE PROCESSING ENDPOINTS ||============================== //

/**
 * Process an uploaded ERA file
 * @param fileId - The file ID to process
 */
export const processERAFile = async (
  fileId: string
): Promise<{
  fileId: string;
  status: ERAFileStatus;
  totalPayments: number;
  autoPosted: number;
  exceptions: number;
  message: string;
}> => {
  const response = await http.post(`/era/process/${fileId}`);
  return response.data.data || response.data;
};

/**
 * Batch process multiple ERA files
 * @param fileIds - Array of file IDs to process
 * @param options - Processing options
 */
export const batchProcessERAFiles = async (
  fileIds: string[],
  options?: {
    stopOnError?: boolean;
  }
): Promise<{
  processed: number;
  failed: number;
  results: Array<{
    fileId: string;
    status: 'success' | 'error';
    message?: string;
  }>;
}> => {
  const response = await http.post('/era/batch-process', {
    fileIds,
    ...options
  });
  return response.data.data || response.data;
};

// ==============================|| FILE LISTING ENDPOINTS ||============================== //

/**
 * Get list of ERA files
 * @param filters - Optional filters
 * @param pagination - Pagination params
 */
export const getERAFiles = async (
  filters?: {
    status?: ERAFileStatus | ERAFileStatus[];
    source?: ERASource;
    date_from?: string;
    date_to?: string;
    search?: string;
  },
  pagination?: PaginationParams
): Promise<PaginatedResponse<ERAFile>> => {
  const params = {
    ...filters,
    ...pagination,
    status: filters?.status
      ? Array.isArray(filters.status)
        ? filters.status.join(',')
        : filters.status
      : undefined
  };
  const response = await http.get('/era/files', { params });
  return response.data.data || response.data;
};

/**
 * Get ERA file details
 * @param fileId - The file ID
 */
export const getERAFileDetails = async (fileId: string): Promise<ERAFile> => {
  const response = await http.get(`/era/file/${fileId}`);
  return response.data.data || response.data;
};

/**
 * Get payments for an ERA file
 * @param fileId - The file ID
 * @param filters - Optional filters
 */
export const getERAPayments = async (
  fileId: string,
  filters?: {
    status?: ERAPostingStatus;
    isException?: boolean;
  }
): Promise<ERAPayment[]> => {
  const response = await http.get(`/era/payments/${fileId}`, { params: filters });
  return response.data.data || response.data;
};

/**
 * Get payment details
 * @param paymentId - The payment ID
 */
export const getERAPaymentDetails = async (paymentId: string): Promise<ERAPayment> => {
  const response = await http.get(`/era/payment/${paymentId}`);
  return response.data.data || response.data;
};

// ==============================|| PAYMENT POSTING ENDPOINTS ||============================== //

/**
 * Auto-post a payment (or manually trigger posting)
 * @param paymentId - The payment ID
 * @param options - Posting options
 */
export const postPayment = async (
  paymentId: string,
  options?: {
    claimId?: number;
    notes?: string;
    forcePost?: boolean;
  }
): Promise<{
  success: boolean;
  postingId?: string;
  message: string;
}> => {
  const response = await http.post(`/era/auto-post/${paymentId}`, options);
  return response.data.data || response.data;
};

/**
 * Reverse a payment posting
 * @param postingId - The posting ID
 * @param reason - Reason for reversal
 */
export const reversePosting = async (
  postingId: string,
  reason: string
): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await http.post(`/era/reverse-posting/${postingId}`, { reason });
  return response.data.data || response.data;
};

// ==============================|| EXCEPTION ENDPOINTS ||============================== //

/**
 * Get posting exceptions
 * @param filters - Optional filters
 * @param pagination - Pagination params
 */
export const getPostingExceptions = async (
  filters?: {
    status?: ExceptionStatus | ExceptionStatus[];
    severity?: ExceptionSeverity | ExceptionSeverity[];
    type?: ExceptionType;
    isOverdue?: boolean;
    assignedTo?: string;
    eraFileId?: number;
  },
  pagination?: PaginationParams
): Promise<PaginatedResponse<PostingException>> => {
  const params = {
    ...filters,
    ...pagination,
    status: filters?.status
      ? Array.isArray(filters.status)
        ? filters.status.join(',')
        : filters.status
      : undefined,
    severity: filters?.severity
      ? Array.isArray(filters.severity)
        ? filters.severity.join(',')
        : filters.severity
      : undefined
  };
  const response = await http.get('/era/exceptions', { params });
  return response.data.data || response.data;
};

/**
 * Resolve an exception
 * @param exceptionId - The exception ID
 * @param resolution - Resolution details
 */
export const resolveException = async (
  exceptionId: string,
  resolution: {
    resolutionType: 'MANUAL_POSTED' | 'CLAIM_CORRECTED' | 'PAYER_CONTACTED' | 'WRITTEN_OFF' | 'REFUNDED';
    claimId?: number;
    notes?: string;
    amount?: number;
  }
): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await http.post(`/era/resolve-exception/${exceptionId}`, resolution);
  return response.data.data || response.data;
};

/**
 * Assign exception to a user
 * @param exceptionId - The exception ID
 * @param userId - User ID to assign to
 */
export const assignException = async (
  exceptionId: string,
  userId: string
): Promise<{
  success: boolean;
  message: string;
}> => {
  const response = await http.post(`/era/exceptions/${exceptionId}/assign`, { userId });
  return response.data.data || response.data;
};

// ==============================|| RECONCILIATION ENDPOINTS ||============================== //

/**
 * Get reconciliation status
 * @param batchDate - Optional batch date filter
 */
export const getReconciliationStatus = async (
  batchDate?: string
): Promise<ReconciliationBatch[]> => {
  const response = await http.get('/era/reconciliation', {
    params: batchDate ? { batchDate } : undefined
  });
  return response.data.data || response.data;
};

/**
 * Run reconciliation for a batch
 * @param batchDate - The batch date to reconcile
 * @param bankStatementData - Bank statement data for matching
 */
export const reconcileBatch = async (
  batchDate: string,
  bankStatementData?: {
    depositAmount: number;
    bankStatementAmount?: number;
    bankAccountNumber?: string;
    bankStatementReference?: string;
  }
): Promise<{
  batchId: string;
  isReconciled: boolean;
  varianceAmount?: number;
  message: string;
}> => {
  const response = await http.post('/era/reconcile-batch', {
    batchDate,
    ...bankStatementData
  });
  return response.data.data || response.data;
};

/**
 * Get reconciliation summary
 * @param filters - Optional filters
 */
export const getReconciliationSummary = async (
  filters?: {
    date_from?: string;
    date_to?: string;
    status?: ReconciliationStatus;
  }
): Promise<{
  totalBatches: number;
  reconciledCount: number;
  varianceCount: number;
  totalDeposits: number;
  totalPayments: number;
  totalVariance: number;
  batches: ReconciliationBatch[];
}> => {
  const response = await http.get('/era/reconciliation/summary', { params: filters });
  return response.data.data || response.data;
};

// ==============================|| DASHBOARD & REPORTING ENDPOINTS ||============================== //

/**
 * Get ERA dashboard metrics
 * @param period - Dashboard period
 */
export const getERADashboard = async (
  period: string = 'current_month'
): Promise<ERADashboard> => {
  const response = await http.get('/era/dashboard', { params: { period } });
  return response.data.data || response.data;
};

/**
 * Get processing report for a file
 * @param fileId - The file ID
 */
export const getProcessingReport = async (fileId: string): Promise<ProcessingReport> => {
  const response = await http.get(`/era/processing-report/${fileId}`);
  return response.data.data || response.data;
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
 * Get status color for ERA file status
 */
export const getFileStatusColor = (status: ERAFileStatus): string => {
  const colors: Record<ERAFileStatus, string> = {
    PENDING: 'warning',
    PROCESSING: 'info',
    COMPLETED: 'success',
    ERROR: 'error',
    PARTIALLY_POSTED: 'warning'
  };
  return colors[status] || 'default';
};

/**
 * Get status color for posting status
 */
export const getPostingStatusColor = (status: ERAPostingStatus): string => {
  const colors: Record<ERAPostingStatus, string> = {
    PENDING: 'warning',
    AUTO_POSTED: 'success',
    MANUAL_POSTED: 'success',
    EXCEPTION: 'error',
    DENIED: 'error'
  };
  return colors[status] || 'default';
};

/**
 * Get severity color
 */
export const getSeverityColor = (severity: ExceptionSeverity): string => {
  const colors: Record<ExceptionSeverity, string> = {
    CRITICAL: 'error',
    HIGH: 'warning',
    MEDIUM: 'info',
    LOW: 'default'
  };
  return colors[severity] || 'default';
};

/**
 * Get exception status color
 */
export const getExceptionStatusColor = (status: ExceptionStatus): string => {
  const colors: Record<ExceptionStatus, string> = {
    PENDING: 'warning',
    ASSIGNED: 'info',
    IN_REVIEW: 'info',
    RESOLVED: 'success',
    CLOSED: 'default'
  };
  return colors[status] || 'default';
};

/**
 * Get reconciliation status color
 */
export const getReconciliationStatusColor = (status: ReconciliationStatus): string => {
  const colors: Record<ReconciliationStatus, string> = {
    PENDING: 'warning',
    IN_PROGRESS: 'info',
    RECONCILED: 'success',
    VARIANCE: 'error',
    CLOSED: 'default'
  };
  return colors[status] || 'default';
};

/**
 * Format status for display
 */
export const formatStatus = (status: string): string => {
  return status.replace(/_/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
};

/**
 * Format file size
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

/**
 * Get exception type description
 */
export const getExceptionTypeDescription = (type: ExceptionType): string => {
  const descriptions: Record<ExceptionType, string> = {
    CLAIM_NOT_FOUND: 'No matching claim found in the system',
    AMOUNT_MISMATCH: 'Payment amount does not match expected amount',
    DUPLICATE_PAYMENT: 'This payment appears to be a duplicate',
    PARTIAL_PAYMENT: 'Only partial payment was received',
    PATIENT_MISMATCH: 'Patient information does not match claim',
    INVALID_CLAIM_STATUS: 'Claim is in an invalid status for payment',
    MISSING_REQUIRED_DATA: 'Required information is missing from the remittance'
  };
  return descriptions[type] || type;
};
