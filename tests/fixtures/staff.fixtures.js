/**
 * Staff Management Test Fixtures
 * Mock data for testing staff profiles, credentials, caseload, schedule, productivity, and training
 */

// ============================================================================
// MOCK DATA
// ============================================================================

export const mockUser = {
  id: 'user_123',
  firstName: 'John',
  lastName: 'Smith',
  role: 'ADMIN'
};

export const mockPatient = {
  id: 1,
  first_name: 'Jane',
  last_name: 'Doe',
  medical_record_number: 'MRN001'
};

// ============================================================================
// STAFF PROFILE FIXTURES
// ============================================================================

export const validStaffProfile = {
  employee_id: 'EMP001',
  first_name: 'Sarah',
  last_name: 'Johnson',
  middle_name: 'Marie',
  job_title: 'Registered Nurse',
  department: 'NURSING',
  employment_type: 'FULL_TIME',
  hire_date: '2023-01-15',
  employment_status: 'ACTIVE',
  email: 'sarah.johnson@hospice.org',
  phone: '555-0100',
  mobile: '555-0101',
  emergency_contact_name: 'Michael Johnson',
  emergency_contact_phone: '555-0102',
  emergency_contact_relationship: 'Spouse',
  address_line1: '123 Main St',
  city: 'Springfield',
  state: 'IL',
  zip_code: '62701',
  specialty: 'Wound Care',
  years_of_experience: 8,
  is_supervisory: false,
  max_patient_load: 15,
  service_territory: {
    zip_codes: ['62701', '62702', '62703'],
    counties: ['Sangamon']
  }
};

export const invalidStaffProfile = {
  // Missing required first_name and last_name
  employee_id: 'EMP999',
  email: 'invalid@hospice.org'
};

export const partTimeStaff = {
  employee_id: 'EMP002',
  first_name: 'Michael',
  last_name: 'Chen',
  job_title: 'Social Worker',
  department: 'SOCIAL_WORK',
  employment_type: 'PART_TIME',
  hire_date: '2023-06-01',
  employment_status: 'ACTIVE',
  email: 'michael.chen@hospice.org',
  max_patient_load: 10
};

export const terminatedStaff = {
  employee_id: 'EMP003',
  first_name: 'Robert',
  last_name: 'Martinez',
  job_title: 'CNA',
  department: 'NURSING',
  employment_type: 'FULL_TIME',
  hire_date: '2022-03-01',
  termination_date: '2023-12-31',
  employment_status: 'TERMINATED'
};

// ============================================================================
// CREDENTIAL FIXTURES
// ============================================================================

export const validRNLicense = {
  credential_type: 'RN_LICENSE',
  credential_name: 'Registered Nurse License',
  credential_number: 'RN123456',
  issuing_authority: 'Illinois Board of Nursing',
  issuing_state: 'IL',
  issue_date: '2020-01-01',
  expiration_date: '2026-01-01',
  credential_status: 'ACTIVE',
  alert_days_before_expiration: 60
};

export const expiringCredential = {
  credential_type: 'CPR',
  credential_name: 'CPR Certification',
  credential_number: 'CPR789',
  issuing_authority: 'American Heart Association',
  issue_date: '2023-01-01',
  expiration_date: new Date(Date.now() + 20 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 20 days from now
  credential_status: 'ACTIVE',
  alert_days_before_expiration: 30
};

export const expiredCredential = {
  credential_type: 'TB_TEST',
  credential_name: 'TB Test',
  issue_date: '2023-01-01',
  expiration_date: '2023-12-31',
  credential_status: 'EXPIRED'
};

export const backgroundCheck = {
  credential_type: 'BACKGROUND_CHECK',
  credential_name: 'Criminal Background Check',
  verification_date: '2023-01-15',
  expiration_date: '2025-01-15',
  credential_status: 'ACTIVE'
};

export const invalidCredential = {
  // Missing required fields: credential_type, credential_name, expiration_date
  credential_number: 'INVALID'
};

// ============================================================================
// CASELOAD FIXTURES
// ============================================================================

export const primaryNurseAssignment = {
  patient_id: 1,
  assignment_role: 'PRIMARY_NURSE',
  is_primary: true,
  assignment_start_date: '2024-01-01',
  assignment_status: 'ACTIVE',
  scheduled_visits_per_week: 3
};

export const secondaryNurseAssignment = {
  patient_id: 2,
  assignment_role: 'SECONDARY_NURSE',
  is_primary: false,
  assignment_start_date: '2024-01-15',
  assignment_status: 'ACTIVE',
  scheduled_visits_per_week: 1
};

export const socialWorkerAssignment = {
  patient_id: 1,
  assignment_role: 'SOCIAL_WORKER',
  is_primary: false,
  assignment_start_date: '2024-01-01',
  assignment_status: 'ACTIVE',
  scheduled_visits_per_week: 1
};

export const transferredAssignment = {
  patient_id: 3,
  assignment_role: 'PRIMARY_NURSE',
  is_primary: true,
  assignment_start_date: '2023-06-01',
  assignment_end_date: '2024-01-01',
  assignment_status: 'TRANSFERRED',
  transfer_reason: 'Territory reassignment',
  transferred_to_staff_id: 2,
  transfer_date: '2024-01-01'
};

export const invalidAssignment = {
  // Missing required fields: patient_id, assignment_role
  assignment_status: 'ACTIVE'
};

// ============================================================================
// SCHEDULE FIXTURES
// ============================================================================

export const regularShift = {
  schedule_type: 'SHIFT',
  shift_date: '2024-12-28',
  start_time: '2024-12-28T08:00:00',
  end_time: '2024-12-28T16:00:00',
  work_location: 'Field',
  is_on_call: false
};

export const onCallSchedule = {
  schedule_type: 'ON_CALL',
  shift_date: '2024-12-29',
  start_time: '2024-12-29T17:00:00',
  end_time: '2024-12-30T08:00:00',
  is_on_call: true,
  on_call_type: 'PRIMARY',
  work_location: 'Remote'
};

export const ptoRequest = {
  schedule_type: 'TIME_OFF',
  shift_date: '2025-01-15',
  time_off_type: 'PTO',
  time_off_status: 'REQUESTED'
};

export const approvedPTO = {
  schedule_type: 'TIME_OFF',
  shift_date: '2025-02-01',
  time_off_type: 'PTO',
  time_off_status: 'APPROVED',
  approval_date: '2024-12-20'
};

export const trainingSchedule = {
  schedule_type: 'TRAINING',
  shift_date: '2024-12-30',
  start_time: '2024-12-30T09:00:00',
  end_time: '2024-12-30T12:00:00',
  work_location: 'Office',
  notes: 'Annual HIPAA training'
};

export const invalidSchedule = {
  // Missing required fields: schedule_type, shift_date
  work_location: 'Office'
};

// ============================================================================
// PRODUCTIVITY FIXTURES
// ============================================================================

export const weeklyProductivity = {
  reporting_period_start: '2024-12-23',
  reporting_period_end: '2024-12-27',
  period_type: 'WEEKLY',
  total_visits_scheduled: 15,
  total_visits_completed: 14,
  total_visits_missed: 1,
  total_visit_time_minutes: 840,
  average_visit_duration_minutes: 60,
  total_patients_assigned: 12,
  new_admissions: 2,
  discharges: 1,
  notes_completed_on_time: 13,
  notes_completed_late: 1,
  average_documentation_time_hours: 1.5,
  patient_satisfaction_score: 4.8,
  quality_score: 95.5,
  compliance_incidents: 0,
  safety_incidents: 0
};

export const monthlyProductivity = {
  reporting_period_start: '2024-12-01',
  reporting_period_end: '2024-12-31',
  period_type: 'MONTHLY',
  total_visits_scheduled: 60,
  total_visits_completed: 58,
  total_visits_missed: 2,
  total_visit_time_minutes: 3480,
  total_patients_assigned: 15,
  new_admissions: 5,
  discharges: 3,
  notes_completed_on_time: 56,
  notes_completed_late: 2,
  patient_satisfaction_score: 4.7,
  quality_score: 93.2
};

export const invalidProductivity = {
  // Missing required fields: reporting_period_start, reporting_period_end
  total_visits_completed: 10
};

// ============================================================================
// TRAINING FIXTURES
// ============================================================================

export const annualHIPAATraining = {
  training_name: 'HIPAA Privacy and Security Annual Training',
  training_type: 'ANNUAL_COMPLIANCE',
  training_category: 'HIPAA',
  training_provider: 'Internal Training Department',
  training_date: '2024-01-15',
  completion_date: '2024-01-15',
  expiration_date: '2025-01-15',
  training_status: 'COMPLETED',
  hours_completed: 2.0,
  score: 95.0,
  passing_score: 80.0,
  passed: true,
  certificate_number: 'HIPAA2024-001',
  is_required: true
};

export const scheduledTraining = {
  training_name: 'Wound Care Certification Course',
  training_type: 'CONTINUING_EDUCATION',
  training_category: 'CLINICAL_SKILLS',
  training_provider: 'National Wound Care Association',
  training_date: '2025-02-01',
  training_status: 'SCHEDULED',
  hours_completed: 0,
  ceu_credits: 10.0,
  is_required: false,
  due_date: '2025-02-01'
};

export const failedTraining = {
  training_name: 'Medication Administration Test',
  training_type: 'SKILLS_COMPETENCY',
  training_category: 'CLINICAL_SKILLS',
  training_date: '2024-03-15',
  completion_date: '2024-03-15',
  training_status: 'FAILED',
  hours_completed: 1.0,
  score: 65.0,
  passing_score: 80.0,
  passed: false,
  is_required: true
};

export const cprCertification = {
  training_name: 'CPR/BLS Certification',
  training_type: 'SKILLS_COMPETENCY',
  training_category: 'SAFETY',
  training_provider: 'American Heart Association',
  training_date: '2024-01-10',
  completion_date: '2024-01-10',
  expiration_date: '2026-01-10',
  training_status: 'COMPLETED',
  hours_completed: 4.0,
  score: 100.0,
  passing_score: 80.0,
  passed: true,
  certificate_number: 'CPR2024-789',
  is_required: true
};

export const invalidTraining = {
  // Missing required fields: training_name, training_type, training_date
  training_status: 'SCHEDULED'
};

// ============================================================================
// MOCK REQUEST/REPLY HELPERS
// ============================================================================

export const mockRequest = (body = {}, params = {}, query = {}, user = mockUser) => ({
  body,
  params,
  query,
  user,
  ip: '127.0.0.1',
  headers: { 'user-agent': 'Jest Test Suite' }
});

export const mockReply = () => {
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis()
  };
  return reply;
};

// ============================================================================
// EXPECTED RESPONSES
// ============================================================================

export const expectedStaffResponse = {
  status: 201,
  message: 'Staff profile created successfully',
  data: expect.objectContaining({
    id: expect.any(Number),
    first_name: expect.any(String),
    last_name: expect.any(String),
    employment_status: 'ACTIVE'
  })
};

export const expectedCredentialResponse = {
  status: 201,
  message: 'Credential added successfully',
  data: expect.objectContaining({
    id: expect.any(Number),
    credential_type: expect.any(String),
    expiration_date: expect.any(String)
  })
};

export const expectedAssignmentResponse = {
  status: 201,
  message: 'Patient assigned successfully',
  data: expect.objectContaining({
    id: expect.any(Number),
    assignment_role: expect.any(String),
    assignment_status: 'ACTIVE'
  })
};

export const expectedScheduleResponse = {
  status: 201,
  message: 'Schedule entry created successfully',
  data: expect.objectContaining({
    id: expect.any(Number),
    schedule_type: expect.any(String),
    shift_date: expect.any(String)
  })
};

export const expectedProductivityResponse = {
  status: 201,
  message: 'Productivity metrics recorded successfully',
  data: expect.objectContaining({
    id: expect.any(Number),
    period_type: expect.any(String)
  })
};

export const expectedTrainingResponse = {
  status: 201,
  message: 'Training record added successfully',
  data: expect.objectContaining({
    id: expect.any(Number),
    training_name: expect.any(String),
    training_status: expect.any(String)
  })
};
