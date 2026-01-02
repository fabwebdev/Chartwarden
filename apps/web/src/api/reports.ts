/**
 * Reports API Service
 *
 * Comprehensive API service for all report-related endpoints.
 * All routes are mounted under /api/reports and require authentication.
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export interface ReportFilters {
  category?: string;
  status?: string;
  format?: string;
  date_from?: string;
  date_to?: string;
  search?: string;
  limit?: number;
  offset?: number;
  sort?: string;
  order?: 'asc' | 'desc';
  favorites_only?: boolean;
}

export interface GeneratedReport {
  id: number;
  configuration_id?: number;
  schedule_id?: number;
  report_type: string;
  report_category: string;
  report_name: string;
  output_format: string;
  execution_status: string;
  execution_started_at?: string;
  execution_completed_at?: string;
  execution_duration_ms?: number;
  output_file_path?: string;
  output_filename?: string;
  file_size_bytes?: number;
  mime_type?: string;
  file_checksum?: string;
  row_count?: number;
  filter_criteria?: any;
  metadata?: any;
  error_message?: string;
  error_stack?: string;
  retry_count?: number;
  generated_by_user_id?: string;
  generated_by_user_name?: string;
  cancelled_by_user_id?: string;
  cancelled_at?: string;
  expires_at?: string;
  is_favorite?: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportConfiguration {
  id: number;
  report_type: string;
  report_category: string;
  report_name: string;
  report_description?: string;
  default_output_format: string;
  filter_schema?: any;
  configuration_metadata?: any;
  version_number?: number;
  is_active?: boolean;
  created_by_user_id?: string;
  updated_by_user_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface ReportTypeInfo {
  type: string;
  category: string;
  name: string;
  description: string;
  supportedFormats: string[];
  estimatedDuration?: string;
  requiresFilters?: string[];
}

export interface GenerateReportRequest {
  report_type: string;
  output_format: string;
  filters?: Record<string, any>;
  async?: boolean;
}

export interface ReportListResponse {
  success: boolean;
  status: number;
  data: GeneratedReport[];
  count: number;
  total: number;
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface ReportResponse {
  success: boolean;
  status: number;
  data: GeneratedReport;
  message?: string;
}

export interface ReportTypesResponse {
  success: boolean;
  status: number;
  data: {
    categories: Record<string, ReportTypeInfo[]>;
  };
}

// ==============================|| REPORT CATEGORIES & FORMATS ||============================== //

export const REPORT_CATEGORIES = [
  { value: 'CENSUS', label: 'Census Reports' },
  { value: 'CLINICAL', label: 'Clinical Reports' },
  { value: 'BILLING', label: 'Billing Reports' },
  { value: 'COMPLIANCE', label: 'Compliance Reports' },
  { value: 'QAPI', label: 'QAPI Reports' },
  { value: 'STAFF', label: 'Staff Reports' },
  { value: 'BEREAVEMENT', label: 'Bereavement Reports' },
  { value: 'EXECUTIVE', label: 'Executive Reports' },
  { value: 'CUSTOM', label: 'Custom Reports' }
];

export const REPORT_FORMATS = [
  { value: 'PDF', label: 'PDF', icon: 'PictureAsPdf', color: 'error' },
  { value: 'EXCEL', label: 'Excel', icon: 'GridOn', color: 'success' },
  { value: 'CSV', label: 'CSV', icon: 'TableChart', color: 'primary' },
  { value: 'JSON', label: 'JSON', icon: 'Code', color: 'info' }
];

export const EXECUTION_STATUSES = [
  { value: 'PENDING', label: 'Pending', color: 'warning' },
  { value: 'RUNNING', label: 'Running', color: 'info' },
  { value: 'SUCCESS', label: 'Success', color: 'success' },
  { value: 'FAILED', label: 'Failed', color: 'error' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'default' },
  { value: 'PARTIAL', label: 'Partial', color: 'warning' }
];

export const PREDEFINED_DATE_RANGES = [
  { value: 'today', label: 'Today' },
  { value: 'yesterday', label: 'Yesterday' },
  { value: 'last_7_days', label: 'Last 7 Days' },
  { value: 'last_30_days', label: 'Last 30 Days' },
  { value: 'this_month', label: 'This Month' },
  { value: 'last_month', label: 'Last Month' },
  { value: 'this_quarter', label: 'This Quarter' },
  { value: 'last_quarter', label: 'Last Quarter' },
  { value: 'this_year', label: 'This Year' },
  { value: 'last_year', label: 'Last Year' },
  { value: 'custom', label: 'Custom Range' }
];

// ==============================|| MAIN REPORT ROUTES ||============================== //

/**
 * Get all available report types with metadata
 * @requires Permission: VIEW_REPORTS
 */
export const getReportTypes = async (): Promise<ReportTypesResponse> => {
  const response = await http.get('/reports/types');
  return response.data;
};

/**
 * Get all generated reports with optional filters and pagination
 * @requires Permission: VIEW_REPORTS
 */
export const getReports = async (filters?: ReportFilters): Promise<ReportListResponse> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  const queryString = params.toString();
  const url = queryString ? `/reports?${queryString}` : '/reports';
  const response = await http.get(url);
  return response.data;
};

/**
 * Get report by ID
 * @requires Permission: VIEW_REPORTS
 */
export const getReportById = async (id: string | number): Promise<ReportResponse> => {
  const response = await http.get(`/reports/${id}`);
  return response.data;
};

/**
 * Generate a new report (sync or async)
 * @requires Permission: GENERATE_REPORTS
 */
export const generateReport = async (reportData: GenerateReportRequest): Promise<ReportResponse> => {
  const response = await http.post('/reports/generate', reportData);
  return response.data;
};

/**
 * Download a generated report
 * @requires Permission: VIEW_REPORTS
 */
export const downloadReport = async (id: string | number): Promise<Blob> => {
  const response = await http.get(`/reports/${id}?download=true`, {
    responseType: 'blob'
  });
  return response.data;
};

/**
 * Delete a generated report (soft delete)
 * @requires Permission: DELETE_REPORTS
 */
export const deleteReport = async (id: string | number): Promise<{ success: boolean; message: string }> => {
  const response = await http.delete(`/reports/${id}`);
  return response.data;
};

/**
 * Retry a failed report
 * @requires Permission: GENERATE_REPORTS
 */
export const retryReport = async (id: string | number): Promise<ReportResponse> => {
  const response = await http.post(`/reports/${id}/retry`);
  return response.data;
};

/**
 * Cancel a pending or running report
 * @requires Permission: GENERATE_REPORTS
 */
export const cancelReport = async (id: string | number): Promise<ReportResponse> => {
  const response = await http.post(`/reports/${id}/cancel`);
  return response.data;
};

/**
 * Toggle favorite status for a report
 * @requires Permission: VIEW_REPORTS
 */
export const toggleReportFavorite = async (
  reportId: number,
  isFavorite: boolean
): Promise<{ success: boolean; message: string }> => {
  const response = await http.post(`/reports/${reportId}/favorite`, { is_favorite: isFavorite });
  return response.data;
};

// ==============================|| HELPER FUNCTIONS ||============================== //

/**
 * Get human-readable label for report category
 */
export const getCategoryLabel = (category: string): string => {
  const found = REPORT_CATEGORIES.find((c) => c.value === category);
  return found ? found.label : category;
};

/**
 * Get human-readable label for report format
 */
export const getFormatLabel = (format: string): string => {
  const found = REPORT_FORMATS.find((f) => f.value === format);
  return found ? found.label : format;
};

/**
 * Get color for report format
 */
export const getFormatColor = (format: string): string => {
  const found = REPORT_FORMATS.find((f) => f.value === format);
  return found ? found.color : 'default';
};

/**
 * Get human-readable label for execution status
 */
export const getStatusLabel = (status: string): string => {
  const found = EXECUTION_STATUSES.find((s) => s.value === status);
  return found ? found.label : status;
};

/**
 * Get color for execution status
 */
export const getStatusColor = (status: string): 'default' | 'primary' | 'secondary' | 'error' | 'info' | 'success' | 'warning' => {
  const found = EXECUTION_STATUSES.find((s) => s.value === status);
  return (found?.color || 'default') as any;
};

/**
 * Format file size for display
 */
export const formatFileSize = (bytes?: number): string => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

/**
 * Format duration for display
 */
export const formatDuration = (ms?: number): string => {
  if (!ms || ms === 0) return '0s';
  const seconds = Math.floor(ms / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);

  if (hours > 0) {
    return `${hours}h ${minutes % 60}m`;
  } else if (minutes > 0) {
    return `${minutes}m ${seconds % 60}s`;
  } else {
    return `${seconds}s`;
  }
};

/**
 * Format date for display
 */
export const formatReportDate = (dateString?: string): string => {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

/**
 * Trigger browser download for blob
 */
export const triggerDownload = (blob: Blob, filename: string): void => {
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  link.parentNode?.removeChild(link);
  window.URL.revokeObjectURL(url);
};

/**
 * Calculate date range from predefined period
 */
export const calculateDateRange = (period: string): { from: Date; to: Date } => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  let from = new Date(today);
  let to = new Date(today);

  switch (period) {
    case 'today':
      to.setHours(23, 59, 59, 999);
      break;
    case 'yesterday':
      from.setDate(today.getDate() - 1);
      to = new Date(from);
      to.setHours(23, 59, 59, 999);
      break;
    case 'last_7_days':
      from.setDate(today.getDate() - 7);
      to.setHours(23, 59, 59, 999);
      break;
    case 'last_30_days':
      from.setDate(today.getDate() - 30);
      to.setHours(23, 59, 59, 999);
      break;
    case 'this_month':
      from = new Date(now.getFullYear(), now.getMonth(), 1);
      to = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;
    case 'last_month':
      from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      to = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      break;
    case 'this_quarter':
      const currentQuarter = Math.floor(now.getMonth() / 3);
      from = new Date(now.getFullYear(), currentQuarter * 3, 1);
      to = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
      break;
    case 'last_quarter':
      const lastQuarter = Math.floor(now.getMonth() / 3) - 1;
      const yearOffset = lastQuarter < 0 ? -1 : 0;
      const quarter = lastQuarter < 0 ? 3 : lastQuarter;
      from = new Date(now.getFullYear() + yearOffset, quarter * 3, 1);
      to = new Date(now.getFullYear() + yearOffset, (quarter + 1) * 3, 0, 23, 59, 59, 999);
      break;
    case 'this_year':
      from = new Date(now.getFullYear(), 0, 1);
      to = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;
    case 'last_year':
      from = new Date(now.getFullYear() - 1, 0, 1);
      to = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      break;
    default:
      // Return today as default
      to.setHours(23, 59, 59, 999);
  }

  return { from, to };
};
