/**
 * Test Fixtures for Certification Module
 * Sample data for testing certifications, F2F encounters, and orders
 */

import { jest } from '@jest/globals';

export const mockPatient = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1945-06-15',
  mrn: 'MRN123456'
};

export const mockUser = {
  id: 'user_123',
  firstName: 'Dr. Jane',
  lastName: 'Smith',
  role: 'Physician',
  email: 'jane.smith@hospice.org'
};

// ============================================================================
// CERTIFICATION FIXTURES
// ============================================================================

export const validCertification = {
  patient_id: 1,
  certification_period: 'INITIAL_90',
  certification_status: 'PENDING',
  start_date: '2024-01-01',
  end_date: '2024-03-31',
  terminal_illness_narrative: 'Patient has end-stage heart failure with NYHA Class IV symptoms. Expected prognosis of 6 months or less based on clinical progression and declining functional status.',
  clinical_progression: 'Progressive decline in functional status over past 3 months. Multiple hospitalizations for acute decompensation.',
  decline_indicators: 'Weight loss of 15 lbs, increasing dyspnea at rest, decreased appetite, increased fatigue'
};

export const subsequentCertification = {
  patient_id: 1,
  certification_period: 'SUBSEQUENT_60',
  certification_status: 'PENDING',
  start_date: '2024-04-01',
  end_date: '2024-05-30',
  terminal_illness_narrative: 'Continued end-stage heart failure with persistent NYHA Class IV symptoms despite optimal medical management.',
  clinical_progression: 'Further decline with increased dependency on ADLs, oxygen-dependent, multiple ER visits.',
  decline_indicators: 'Bed-bound majority of day, minimal oral intake, confusion episodes'
};

export const invalidCertification = {
  patient_id: 1,
  certification_period: 'INVALID_PERIOD', // Invalid
  start_date: '2024-01-01',
  end_date: '2024-03-31'
  // Missing required terminal_illness_narrative
};

// ============================================================================
// FACE-TO-FACE ENCOUNTER FIXTURES
// ============================================================================

export const validF2FEncounter = {
  patient_id: 1,
  certification_id: 1,
  encounter_date: '2024-03-01',
  performed_by_id: 'user_123',
  performed_by_name: 'Dr. Jane Smith',
  performed_by_type: 'PHYSICIAN',
  visit_type: 'IN_PERSON',
  findings: 'Patient examined in home. Continues to exhibit signs of end-stage heart failure. Shortness of breath at rest, 2+ pitting edema bilateral lower extremities. Patient is appropriate for continued hospice care. Terminal prognosis confirmed.',
  terminal_prognosis_confirmed: true
};

export const telehealthF2FEncounter = {
  patient_id: 1,
  certification_id: 1,
  encounter_date: '2024-03-01',
  performed_by_id: 'user_456',
  performed_by_name: 'Sarah Johnson NP',
  performed_by_type: 'NP',
  visit_type: 'TELEHEALTH',
  findings: 'Telehealth visit conducted. Patient appears comfortable but continues to show signs of disease progression. Family reports increased sleeping, decreased intake. Hospice care remains appropriate.',
  terminal_prognosis_confirmed: true
};

export const invalidF2FEncounter = {
  patient_id: 1,
  encounter_date: '2024-03-01',
  performed_by_type: 'INVALID_TYPE', // Invalid
  findings: 'Test findings'
};

// ============================================================================
// ORDER FIXTURES
// ============================================================================

export const medicationOrder = {
  patient_id: 1,
  order_type: 'MEDICATION',
  order_status: 'ACTIVE',
  order_priority: 'ROUTINE',
  order_description: 'Morphine Sulfate 15mg PO every 4 hours PRN pain',
  start_date: '2024-01-01',
  ordered_by_id: 'user_123'
};

export const dmeOrder = {
  patient_id: 1,
  order_type: 'DME',
  order_status: 'ACTIVE',
  order_priority: 'STAT',
  order_description: 'Hospital bed with mattress, bedside commode, oxygen concentrator 2L continuous',
  start_date: '2024-01-01',
  ordered_by_id: 'user_123'
};

export const verbalOrder = {
  patient_id: 1,
  order_type: 'MEDICATION',
  order_status: 'PENDING',
  order_priority: 'URGENT',
  order_description: 'Lorazepam 0.5mg SL every 6 hours PRN anxiety',
  start_date: '2024-01-15',
  is_verbal_order: true,
  physician_name: 'Dr. Robert Williams',
  read_back_verified: true
};

export const laboratoryOrder = {
  patient_id: 1,
  order_type: 'LABORATORY',
  order_status: 'ACTIVE',
  order_priority: 'ROUTINE',
  order_description: 'CBC, BMP - to assess anemia and electrolyte balance',
  start_date: '2024-01-01',
  ordered_by_id: 'user_123'
};

// ============================================================================
// RECERTIFICATION SCHEDULE FIXTURES
// ============================================================================

export const recertificationSchedule = {
  patient_id: 1,
  next_recertification_date: '2024-03-31',
  certification_period_type: 'SUBSEQUENT_90',
  f2f_required: true,
  f2f_due_date: '2024-03-01',
  f2f_completed: false,
  alert_sent: false
};

// ============================================================================
// MOCK REQUEST/RESPONSE OBJECTS
// ============================================================================

export const mockRequest = (data = {}, params = {}, user = mockUser) => ({
  body: data,
  params: params,
  query: {},
  user: user,
  ip: '127.0.0.1',
  headers: {
    'user-agent': 'Jest Test Suite'
  }
});

export const mockReply = () => {
  const reply = {
    code: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    statusCode: 200
  };
  return reply;
};

// ============================================================================
// EXPECTED RESPONSES
// ============================================================================

export const expectedCertificationResponse = {
  status: 201,
  message: 'Certification created',
  data: expect.objectContaining({
    id: expect.any(Number),
    patient_id: 1,
    certification_period: 'INITIAL_90',
    certification_status: 'PENDING'
  })
};

export const expectedSignedCertificationResponse = {
  status: 200,
  message: 'Certification signed successfully',
  data: expect.objectContaining({
    certification_status: 'ACTIVE',
    physician_signature: expect.objectContaining({
      signedBy: expect.any(String),
      signedByName: expect.any(String),
      signatureType: 'ELECTRONIC',
      signatureHash: expect.any(String)
    })
  })
};

export const expectedF2FResponse = {
  status: 201,
  message: 'Face-to-Face encounter created',
  data: expect.objectContaining({
    id: expect.any(Number),
    patient_id: 1,
    encounter_date: expect.any(String),
    terminal_prognosis_confirmed: true
  })
};

export const expectedOrderResponse = {
  status: 201,
  message: 'Order created',
  data: expect.objectContaining({
    id: expect.any(Number),
    patient_id: 1,
    order_type: expect.any(String),
    order_status: 'ACTIVE'
  })
};
