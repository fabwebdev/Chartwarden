// =============================================================================
// API Types
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: ApiError;
  message?: string;
  timestamp: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface PaginatedRequest {
  page?: number;
  pageSize?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

export interface SignInRequest {
  email: string;
  password: string;
}

export interface SignUpRequest {
  email: string;
  password: string;
  name: string;
  role?: string;
}

export interface AuthResponse {
  user: { id: string; email: string; name: string; role: string; };
  session: { id: string; expiresAt: string; };
}

// =============================================================================
// MAR API Types
// =============================================================================

export interface CreateMAREntryRequest {
  medication_id: number;
  scheduled_time: string;
  actual_time?: string;
  mar_status: 'GIVEN' | 'NOT_GIVEN' | 'REFUSED' | 'HELD' | 'LATE' | 'MISSED';
  dosage_given?: string;
  route_used?: string;
  administered_by_id?: string;
  administered_by_name?: string;
  reason_not_given?: string;
  patient_response?: string;
}

export interface UpdateMAREntryRequest {
  actual_time?: string;
  mar_status?: 'GIVEN' | 'NOT_GIVEN' | 'REFUSED' | 'HELD' | 'LATE' | 'MISSED';
  dosage_given?: string;
  route_used?: string;
  reason_not_given?: string;
  patient_response?: string;
}

export interface MARQueryParams {
  start_date?: string;
  end_date?: string;
  medication_id?: number;
  mar_status?: string;
}
