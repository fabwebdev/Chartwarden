/**
 * Scheduling API Service
 *
 * Comprehensive API service for scheduling visits, managing calendars,
 * and handling conflicts.
 * All routes are mounted under /api/scheduling and require authentication.
 */

import http from 'hooks/useCookie';

// ==============================|| TYPES ||============================== //

export interface ScheduledVisit {
  id: number;
  patient_id: number;
  staff_id: number;
  patient_name?: string;
  staff_name?: string;
  visit_type: string;
  visit_purpose?: string;
  scheduled_date: string;
  scheduled_start_time: string;
  scheduled_end_time?: string;
  estimated_duration_minutes?: number;
  visit_status: VisitStatus;
  actual_check_in_time?: string;
  actual_check_out_time?: string;
  actual_duration_minutes?: number;
  check_in_location?: { lat: number; lng: number };
  check_out_location?: { lat: number; lng: number };
  patient_confirmed?: boolean;
  patient_confirmed_at?: string;
  cancelled_at?: string;
  cancelled_by_id?: string;
  cancellation_reason?: string;
  rescheduled_to_visit_id?: number;
  billable?: boolean;
  billed?: boolean;
  billing_code?: string;
  visit_notes?: string;
  clinical_documentation_id?: number;
  recurring_visit_id?: number;
  metadata?: Record<string, any>;
  created_by_id?: string;
  updated_by_id?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface RecurringVisit {
  id: number;
  patient_id: number;
  staff_id?: number;
  patient_name?: string;
  staff_name?: string;
  recurrence_pattern: RecurrencePattern;
  frequency: number;
  days_of_week?: string[];
  day_of_month?: number;
  week_of_month?: number;
  preferred_time?: string;
  preferred_duration_minutes?: number;
  visit_type: string;
  visit_purpose?: string;
  start_date: string;
  end_date?: string;
  is_active: boolean;
  pause_start_date?: string;
  pause_end_date?: string;
  auto_schedule?: boolean;
  schedule_days_in_advance?: number;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface SchedulingConflict {
  id: number;
  visit_id_1: number;
  visit_id_2: number;
  staff_id?: number;
  patient_id?: number;
  conflict_type: ConflictType;
  conflict_severity: ConflictSeverity;
  conflict_status: ConflictStatus;
  conflict_date: string;
  conflict_start_time?: string;
  conflict_end_time?: string;
  overlap_minutes?: number;
  conflict_description?: string;
  resolution_type?: string;
  resolution_notes?: string;
  resolved_by_id?: string;
  resolved_at?: string;
  visit_1?: ScheduledVisit;
  visit_2?: ScheduledVisit;
  createdAt?: string;
  updatedAt?: string;
}

export interface AvailableSlot {
  start_time: string;
  end_time: string;
  duration_minutes: number;
}

export interface StaffAvailability {
  available: boolean;
  reason?: string;
  conflicts?: SchedulingConflict[];
}

// ==============================|| ENUMS ||============================== //

export type VisitStatus =
  | 'SCHEDULED'
  | 'CONFIRMED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'MISSED'
  | 'RESCHEDULED';

export type RecurrencePattern =
  | 'DAILY'
  | 'WEEKLY'
  | 'BI_WEEKLY'
  | 'MONTHLY'
  | 'CUSTOM';

export type ConflictType =
  | 'DOUBLE_BOOKING'
  | 'TIME_OVERLAP'
  | 'STAFF_UNAVAILABLE'
  | 'TRAVEL_TIME'
  | 'SKILL_MISMATCH';

export type ConflictSeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';

export type ConflictStatus =
  | 'DETECTED'
  | 'FLAGGED'
  | 'ACKNOWLEDGED'
  | 'RESOLVED'
  | 'IGNORED';

// ==============================|| CONSTANTS ||============================== //

export const VISIT_TYPES = [
  { value: 'RN', label: 'Registered Nurse', color: '#1976d2' },
  { value: 'LPN', label: 'Licensed Practical Nurse', color: '#2e7d32' },
  { value: 'CNA', label: 'Certified Nursing Assistant', color: '#ed6c02' },
  { value: 'SOCIAL_WORKER', label: 'Social Worker', color: '#9c27b0' },
  { value: 'CHAPLAIN', label: 'Chaplain', color: '#0288d1' },
  { value: 'VOLUNTEER', label: 'Volunteer', color: '#757575' },
  { value: 'PHYSICIAN', label: 'Physician', color: '#d32f2f' },
  { value: 'NURSE_PRACTITIONER', label: 'Nurse Practitioner', color: '#f57c00' },
  { value: 'PHYSICAL_THERAPIST', label: 'Physical Therapist', color: '#388e3c' },
  { value: 'OCCUPATIONAL_THERAPIST', label: 'Occupational Therapist', color: '#7b1fa2' },
  { value: 'SPEECH_THERAPIST', label: 'Speech Therapist', color: '#1565c0' },
  { value: 'DIETITIAN', label: 'Dietitian', color: '#c2185b' },
  { value: 'BEREAVEMENT', label: 'Bereavement', color: '#455a64' }
];

export const VISIT_PURPOSES = [
  { value: 'ROUTINE', label: 'Routine Visit' },
  { value: 'ADMISSION', label: 'Admission' },
  { value: 'RECERTIFICATION', label: 'Recertification' },
  { value: 'PRN', label: 'PRN (As Needed)' },
  { value: 'CRISIS', label: 'Crisis' },
  { value: 'RESPITE', label: 'Respite' },
  { value: 'DEATH', label: 'Death Visit' },
  { value: 'DISCHARGE', label: 'Discharge' }
];

export const VISIT_STATUSES = [
  { value: 'SCHEDULED', label: 'Scheduled', color: 'info' },
  { value: 'CONFIRMED', label: 'Confirmed', color: 'primary' },
  { value: 'IN_PROGRESS', label: 'In Progress', color: 'warning' },
  { value: 'COMPLETED', label: 'Completed', color: 'success' },
  { value: 'CANCELLED', label: 'Cancelled', color: 'error' },
  { value: 'MISSED', label: 'Missed', color: 'error' },
  { value: 'RESCHEDULED', label: 'Rescheduled', color: 'secondary' }
];

export const CONFLICT_SEVERITIES = [
  { value: 'CRITICAL', label: 'Critical', color: '#d32f2f' },
  { value: 'HIGH', label: 'High', color: '#f57c00' },
  { value: 'MEDIUM', label: 'Medium', color: '#fbc02d' },
  { value: 'LOW', label: 'Low', color: '#388e3c' }
];

// ==============================|| FILTER INTERFACES ||============================== //

export interface VisitFilters {
  staff_id?: number;
  patient_id?: number;
  date_from?: string;
  date_to?: string;
  visit_type?: string;
  visit_status?: VisitStatus;
  limit?: number;
  offset?: number;
}

export interface ConflictFilters {
  staff_id?: number;
  patient_id?: number;
  conflict_status?: ConflictStatus;
  conflict_severity?: ConflictSeverity;
  date_from?: string;
  date_to?: string;
}

// ==============================|| RESPONSE INTERFACES ||============================== //

export interface VisitListResponse {
  status: number;
  data: ScheduledVisit[];
  count: number;
  total: number;
  pagination?: {
    limit: number;
    offset: number;
    hasMore: boolean;
  };
}

export interface VisitResponse {
  status: number;
  data: ScheduledVisit;
  message?: string;
  conflicts?: SchedulingConflict[];
}

export interface ConflictListResponse {
  status: number;
  data: SchedulingConflict[];
  count: number;
}

// ==============================|| SCHEDULED VISITS API ||============================== //

/**
 * Get all scheduled visits with optional filters
 */
export const getScheduledVisits = async (filters?: VisitFilters): Promise<VisitListResponse> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  const queryString = params.toString();
  const url = queryString ? `/scheduling/visits?${queryString}` : '/scheduling/visits';
  const response = await http.get(url);
  return response.data;
};

/**
 * Get a scheduled visit by ID
 */
export const getScheduledVisitById = async (id: number): Promise<VisitResponse> => {
  const response = await http.get(`/scheduling/visits/${id}`);
  return response.data;
};

/**
 * Create a new scheduled visit
 */
export const createScheduledVisit = async (visitData: Partial<ScheduledVisit>): Promise<VisitResponse> => {
  const response = await http.post('/scheduling/visits', visitData);
  return response.data;
};

/**
 * Create a visit with strict conflict checking (rejects if conflicts exist)
 */
export const createScheduledVisitStrict = async (visitData: Partial<ScheduledVisit>): Promise<VisitResponse> => {
  const response = await http.post('/scheduling/visits/schedule-strict', visitData);
  return response.data;
};

/**
 * Update a scheduled visit
 */
export const updateScheduledVisit = async (id: number, visitData: Partial<ScheduledVisit>): Promise<VisitResponse> => {
  const response = await http.patch(`/scheduling/visits/${id}`, visitData);
  return response.data;
};

/**
 * Check in to a visit (GPS tracking)
 */
export const checkInVisit = async (id: number, location?: { lat: number; lng: number }): Promise<VisitResponse> => {
  const response = await http.post(`/scheduling/visits/${id}/checkin`, { location });
  return response.data;
};

/**
 * Check out from a visit (GPS tracking)
 */
export const checkOutVisit = async (id: number, location?: { lat: number; lng: number }): Promise<VisitResponse> => {
  const response = await http.post(`/scheduling/visits/${id}/checkout`, { location });
  return response.data;
};

/**
 * Cancel a scheduled visit
 */
export const cancelVisit = async (id: number, reason: string): Promise<VisitResponse> => {
  const response = await http.post(`/scheduling/visits/${id}/cancel`, { cancellation_reason: reason });
  return response.data;
};

/**
 * Reschedule a visit
 */
export const rescheduleVisit = async (
  id: number,
  newDate: string,
  newStartTime: string,
  newEndTime?: string
): Promise<VisitResponse> => {
  const response = await http.post(`/scheduling/visits/${id}/reschedule`, {
    scheduled_date: newDate,
    scheduled_start_time: newStartTime,
    scheduled_end_time: newEndTime
  });
  return response.data;
};

/**
 * Confirm a scheduled visit
 */
export const confirmVisit = async (id: number): Promise<VisitResponse> => {
  const response = await http.post(`/scheduling/visits/${id}/confirm`);
  return response.data;
};

// ==============================|| RECURRING VISITS API ||============================== //

/**
 * Get recurring visit templates
 */
export const getRecurringVisits = async (patientId?: number): Promise<{ data: RecurringVisit[] }> => {
  const url = patientId ? `/scheduling/recurring-visits?patient_id=${patientId}` : '/scheduling/recurring-visits';
  const response = await http.get(url);
  return response.data;
};

/**
 * Create a recurring visit template
 */
export const createRecurringVisit = async (visitData: Partial<RecurringVisit>): Promise<{ data: RecurringVisit }> => {
  const response = await http.post('/scheduling/recurring-visits', visitData);
  return response.data;
};

/**
 * Update a recurring visit template
 */
export const updateRecurringVisit = async (id: number, visitData: Partial<RecurringVisit>): Promise<{ data: RecurringVisit }> => {
  const response = await http.patch(`/scheduling/recurring-visits/${id}`, visitData);
  return response.data;
};

/**
 * Deactivate a recurring visit
 */
export const deactivateRecurringVisit = async (id: number): Promise<{ message: string }> => {
  const response = await http.post(`/scheduling/recurring-visits/${id}/deactivate`);
  return response.data;
};

// ==============================|| STAFF AVAILABILITY API ||============================== //

/**
 * Get available time slots for a staff member
 */
export const getAvailableSlots = async (
  staffId: number,
  date: string,
  durationMinutes?: number
): Promise<{ data: AvailableSlot[] }> => {
  let url = `/scheduling/staff/${staffId}/available-slots?date=${date}`;
  if (durationMinutes) {
    url += `&duration_minutes=${durationMinutes}`;
  }
  const response = await http.get(url);
  return response.data;
};

/**
 * Check staff availability for a specific time
 */
export const checkStaffAvailability = async (
  staffId: number,
  date: string,
  startTime: string,
  endTime?: string
): Promise<StaffAvailability> => {
  let url = `/scheduling/staff/${staffId}/check-availability?date=${date}&start_time=${startTime}`;
  if (endTime) {
    url += `&end_time=${endTime}`;
  }
  const response = await http.get(url);
  return response.data;
};

// ==============================|| CONFLICTS API ||============================== //

/**
 * Get scheduling conflicts
 */
export const getConflicts = async (filters?: ConflictFilters): Promise<ConflictListResponse> => {
  const params = new URLSearchParams();
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params.append(key, String(value));
      }
    });
  }
  const queryString = params.toString();
  const url = queryString ? `/scheduling/conflicts?${queryString}` : '/scheduling/conflicts';
  const response = await http.get(url);
  return response.data;
};

/**
 * Detect conflicts for staff on a specific date
 */
export const detectConflicts = async (staffId: number, date: string): Promise<ConflictListResponse> => {
  const response = await http.get(`/scheduling/conflicts/detect?staff_id=${staffId}&date=${date}`);
  return response.data;
};

/**
 * Get count of unresolved conflicts
 */
export const getUnresolvedConflictsCount = async (): Promise<{ count: number }> => {
  const response = await http.get('/scheduling/conflicts/unresolved-count');
  return response.data;
};

/**
 * Resolve a conflict
 */
export const resolveConflict = async (
  id: number,
  resolutionType: string,
  resolutionNotes?: string
): Promise<{ message: string }> => {
  const response = await http.post(`/scheduling/conflicts/${id}/resolve`, {
    resolution_type: resolutionType,
    resolution_notes: resolutionNotes
  });
  return response.data;
};

/**
 * Acknowledge a conflict
 */
export const acknowledgeConflict = async (id: number): Promise<{ message: string }> => {
  const response = await http.post(`/scheduling/conflicts/${id}/acknowledge`);
  return response.data;
};

// ==============================|| HELPER FUNCTIONS ||============================== //

/**
 * Get visit type color
 */
export const getVisitTypeColor = (visitType: string): string => {
  const type = VISIT_TYPES.find((t) => t.value === visitType);
  return type?.color || '#757575';
};

/**
 * Get visit type label
 */
export const getVisitTypeLabel = (visitType: string): string => {
  const type = VISIT_TYPES.find((t) => t.value === visitType);
  return type?.label || visitType;
};

/**
 * Get visit status color
 */
export const getVisitStatusColor = (status: VisitStatus): string => {
  const statusObj = VISIT_STATUSES.find((s) => s.value === status);
  return statusObj?.color || 'default';
};

/**
 * Get visit status label
 */
export const getVisitStatusLabel = (status: VisitStatus): string => {
  const statusObj = VISIT_STATUSES.find((s) => s.value === status);
  return statusObj?.label || status;
};

/**
 * Get conflict severity color
 */
export const getConflictSeverityColor = (severity: ConflictSeverity): string => {
  const sev = CONFLICT_SEVERITIES.find((s) => s.value === severity);
  return sev?.color || '#757575';
};

/**
 * Format time for display (HH:mm)
 */
export const formatTime = (time: string): string => {
  if (!time) return '';
  // Handle both HH:mm:ss and HH:mm formats
  const parts = time.split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0], 10);
    const minutes = parts[1];
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes} ${period}`;
  }
  return time;
};

/**
 * Format date for display
 */
export const formatVisitDate = (dateString: string): string => {
  if (!dateString) return '';
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
};

/**
 * Convert a scheduled visit to a calendar event format
 */
export const visitToCalendarEvent = (visit: ScheduledVisit): CalendarEvent => {
  const startDate = new Date(`${visit.scheduled_date}T${visit.scheduled_start_time}`);
  let endDate: Date;

  if (visit.scheduled_end_time) {
    endDate = new Date(`${visit.scheduled_date}T${visit.scheduled_end_time}`);
  } else if (visit.estimated_duration_minutes) {
    endDate = new Date(startDate.getTime() + visit.estimated_duration_minutes * 60000);
  } else {
    endDate = new Date(startDate.getTime() + 60 * 60000); // Default 1 hour
  }

  return {
    id: visit.id,
    title: `${getVisitTypeLabel(visit.visit_type)} - ${visit.patient_name || `Patient #${visit.patient_id}`}`,
    start: startDate,
    end: endDate,
    color: getVisitTypeColor(visit.visit_type),
    visit: visit,
    hasConflict: false
  };
};

// ==============================|| CALENDAR EVENT TYPE ||============================== //

export interface CalendarEvent {
  id: number;
  title: string;
  start: Date;
  end: Date;
  color: string;
  visit: ScheduledVisit;
  hasConflict: boolean;
  conflictInfo?: SchedulingConflict;
}
