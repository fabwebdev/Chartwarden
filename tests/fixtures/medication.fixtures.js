/**
 * Test Fixtures for Medication Module
 * Sample data for testing medications, MAR, comfort kits, and reconciliation
 */

export const mockPatient = {
  id: 1,
  firstName: 'John',
  lastName: 'Doe',
  dateOfBirth: '1945-06-15',
  mrn: 'MRN123456'
};

export const mockUser = {
  id: 'user_123',
  firstName: 'Nurse',
  lastName: 'Johnson',
  role: 'RN',
  email: 'nurse.johnson@hospice.org'
};

// ============================================================================
// MEDICATION FIXTURES
// ============================================================================

export const validMedication = {
  patient_id: 1,
  medication_name: 'Morphine Sulfate',
  generic_name: 'morphine',
  medication_status: 'ACTIVE',
  medication_route: 'ORAL',
  dosage: '15mg',
  frequency: 'Every 4 hours PRN',
  instructions: 'Take for moderate to severe pain. May cause drowsiness.',
  start_date: '2024-01-01',
  controlled_schedule: 'SCHEDULE_II',
  is_hospice_related: true,
  prescriber_id: 'user_123',
  initial_quantity: '120 tablets'
};

export const nonControlledMedication = {
  patient_id: 1,
  medication_name: 'Acetaminophen',
  generic_name: 'acetaminophen',
  medication_status: 'ACTIVE',
  medication_route: 'ORAL',
  dosage: '500mg',
  frequency: 'Every 6 hours PRN',
  instructions: 'Take for mild pain or fever. Do not exceed 4000mg per day.',
  start_date: '2024-01-01',
  is_hospice_related: true
};

export const ivMedication = {
  patient_id: 1,
  medication_name: 'Furosemide',
  generic_name: 'furosemide',
  medication_status: 'ACTIVE',
  medication_route: 'IV',
  dosage: '40mg',
  frequency: 'Daily',
  instructions: 'IV push over 2 minutes. Monitor for hypotension.',
  start_date: '2024-01-01',
  is_hospice_related: false
};

export const invalidMedication = {
  patient_id: 1,
  medication_status: 'ACTIVE'
  // Missing required medication_name and start_date
};

// ============================================================================
// MAR ENTRY FIXTURES
// ============================================================================

export const marEntryGiven = {
  patient_id: 1,
  medication_id: 1,
  scheduled_time: '2024-01-15T10:00:00Z',
  actual_time: '2024-01-15T10:05:00Z',
  mar_status: 'GIVEN',
  dosage_given: '15mg',
  route_used: 'ORAL',
  administered_by_id: 'user_123',
  administered_by_name: 'Nurse Johnson',
  patient_response: 'Patient tolerated medication well. Pain reduced from 8/10 to 4/10 after 30 minutes.'
};

export const marEntryRefused = {
  patient_id: 1,
  medication_id: 1,
  scheduled_time: '2024-01-15T14:00:00Z',
  actual_time: '2024-01-15T14:00:00Z',
  mar_status: 'REFUSED',
  administered_by_id: 'user_123',
  administered_by_name: 'Nurse Johnson',
  reason_not_given: 'Patient stated pain level only 2/10, declined medication at this time.'
};

export const marEntryHeld = {
  patient_id: 1,
  medication_id: 1,
  scheduled_time: '2024-01-15T18:00:00Z',
  actual_time: '2024-01-15T18:00:00Z',
  mar_status: 'HELD',
  administered_by_id: 'user_123',
  administered_by_name: 'Nurse Johnson',
  reason_not_given: 'Patient sleeping comfortably, vital signs stable. Will reassess in 2 hours.'
};

export const marEntryNotGiven = {
  patient_id: 1,
  medication_id: 2,
  scheduled_time: '2024-01-15T12:00:00Z',
  actual_time: '2024-01-15T12:00:00Z',
  mar_status: 'NOT_GIVEN',
  administered_by_id: 'user_123',
  administered_by_name: 'Nurse Johnson',
  reason_not_given: 'Medication not available at patient home. Pharmacy delivery expected tomorrow.'
};

export const invalidMarEntry = {
  patient_id: 1,
  medication_id: 1,
  scheduled_time: '2024-01-15T10:00:00Z',
  mar_status: 'REFUSED'
  // Missing required reason_not_given for REFUSED status
};

// ============================================================================
// COMFORT KIT FIXTURES
// ============================================================================

export const validComfortKit = {
  patient_id: 1,
  kit_number: 'CK-2024-001',
  issue_date: '2024-01-01',
  expiration_date: '2024-07-01',
  status: 'ACTIVE',
  medications: [
    {
      medication: 'Morphine Sulfate Concentrate 20mg/mL',
      quantity: '30mL bottle',
      lot_number: 'LOT123456',
      ndc: '00054-3589-49'
    },
    {
      medication: 'Lorazepam 2mg/mL',
      quantity: '10mL bottle',
      lot_number: 'LOT789012',
      ndc: '00054-3587-49'
    },
    {
      medication: 'Haloperidol 5mg/mL',
      quantity: '10mL bottle',
      lot_number: 'LOT345678',
      ndc: '00054-8132-49'
    },
    {
      medication: 'Atropine 1% drops',
      quantity: '15mL bottle',
      lot_number: 'LOT901234',
      ndc: '17478-0711-12'
    }
  ],
  location: 'Patient home - refrigerator'
};

export const comfortKitUsage = {
  comfort_kit_id: 1,
  patient_id: 1,
  medication_used: 'Morphine Sulfate Concentrate 20mg/mL',
  quantity_used: '0.5mL (10mg)',
  usage_date: '2024-01-15T22:30:00Z',
  usage_reason: 'Acute pain episode 9/10, respiratory distress noted',
  administered_by_id: 'user_456',
  administered_by_name: 'On-call Nurse Davis'
};

export const comfortKitDestruction = {
  kit_id: 1,
  witness_id: 'user_789',
  witness_name: 'Pharmacist Brown',
  destruction_notes: 'Patient deceased. All remaining medications destroyed per policy. Two-person verification completed.'
};

// ============================================================================
// CONTROLLED SUBSTANCE LOG FIXTURES
// ============================================================================

export const controlledSubstanceDispensed = {
  patient_id: 1,
  medication_id: 1,
  log_date: '2024-01-01T09:00:00Z',
  action: 'DISPENSED',
  medication_name: 'Morphine Sulfate 15mg tablets',
  quantity: '120 tablets',
  lot_number: 'LOT555666',
  logged_by_id: 'user_123'
};

export const controlledSubstanceDestroyed = {
  patient_id: 1,
  medication_id: 1,
  log_date: '2024-02-15T14:00:00Z',
  action: 'DESTROYED',
  medication_name: 'Morphine Sulfate 15mg tablets',
  quantity: '45 tablets remaining',
  lot_number: 'LOT555666',
  witness_id: 'user_789',
  witness_name: 'Pharmacist Brown',
  notes: 'Patient expired. Unused medication destroyed per DEA guidelines.',
  logged_by_id: 'user_123'
};

export const controlledSubstanceReturned = {
  patient_id: 1,
  medication_id: 1,
  log_date: '2024-01-20T11:00:00Z',
  action: 'RETURNED',
  medication_name: 'Morphine Sulfate 15mg tablets',
  quantity: '60 tablets',
  lot_number: 'LOT555666',
  witness_id: 'user_789',
  witness_name: 'Pharmacist Brown',
  notes: 'Medication order changed. Excess returned to pharmacy.',
  logged_by_id: 'user_123'
};

// ============================================================================
// MEDICATION RECONCILIATION FIXTURES
// ============================================================================

export const admissionReconciliation = {
  patient_id: 1,
  reconciliation_date: '2024-01-01',
  reconciliation_type: 'ADMISSION',
  medications_reviewed: [
    {
      medication: 'Metoprolol 25mg BID',
      action: 'CONTINUED',
      reason: 'Patient taking at home, continue for heart failure management'
    },
    {
      medication: 'Warfarin 5mg daily',
      action: 'DISCONTINUED',
      reason: 'No longer appropriate for hospice care, goals of care discussion with family'
    },
    {
      medication: 'Morphine Sulfate 15mg q4h PRN',
      action: 'ADDED',
      reason: 'New hospice medication for pain management'
    },
    {
      medication: 'Furosemide 40mg daily',
      action: 'MODIFIED',
      reason: 'Dose reduced from 80mg to 40mg for comfort care'
    }
  ],
  discrepancies_found: 'Patient had been taking OTC ibuprofen not documented in previous records. Family provided medication list.',
  actions_taken: 'Updated medication list in chart. Educated family on appropriate pain management with prescribed opioids. Discontinued ibuprofen due to GI risk.',
  performed_by_id: 'user_123',
  performed_by_name: 'Nurse Johnson RN'
};

export const dischargeReconciliation = {
  patient_id: 1,
  reconciliation_date: '2024-02-15',
  reconciliation_type: 'DISCHARGE',
  medications_reviewed: [
    {
      medication: 'Morphine Sulfate 15mg q4h PRN',
      action: 'DISCONTINUED',
      reason: 'Patient revoked hospice election'
    },
    {
      medication: 'Metoprolol 25mg BID',
      action: 'CONTINUED',
      reason: 'Transferred back to primary care physician'
    }
  ],
  discrepancies_found: 'None',
  actions_taken: 'Medication list provided to patient and primary care physician. All hospice medications discontinued.',
  performed_by_id: 'user_123',
  performed_by_name: 'Nurse Johnson RN'
};

export const routineReconciliation = {
  patient_id: 1,
  reconciliation_date: '2024-01-15',
  reconciliation_type: 'ROUTINE',
  medications_reviewed: [
    {
      medication: 'Morphine Sulfate 15mg q4h PRN',
      action: 'CONTINUED',
      reason: 'Effective pain management, no changes needed'
    },
    {
      medication: 'Lorazepam 0.5mg BID PRN',
      action: 'MODIFIED',
      reason: 'Increased to TID due to increased anxiety'
    }
  ],
  discrepancies_found: 'Family reported patient taking acetaminophen 500mg PRN at home, not documented.',
  actions_taken: 'Added acetaminophen to medication list. Educated family to report all medication use.',
  performed_by_id: 'user_123',
  performed_by_name: 'Nurse Johnson RN'
};

// ============================================================================
// MOCK REQUEST/RESPONSE OBJECTS
// ============================================================================

export const mockRequest = (data = {}, params = {}, query = {}, user = mockUser) => ({
  body: data,
  params: params,
  query: query,
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

export const expectedMedicationResponse = {
  status: 201,
  message: 'Medication created',
  data: expect.objectContaining({
    id: expect.any(Number),
    patient_id: 1,
    medication_name: expect.any(String),
    medication_status: 'ACTIVE'
  })
};

export const expectedMARResponse = {
  status: 201,
  message: 'MAR entry created',
  data: expect.objectContaining({
    id: expect.any(Number),
    patient_id: 1,
    medication_id: expect.any(Number),
    mar_status: expect.any(String)
  })
};

export const expectedComfortKitResponse = {
  status: 201,
  message: 'Comfort kit created',
  data: expect.objectContaining({
    id: expect.any(Number),
    patient_id: 1,
    kit_number: expect.any(String),
    status: 'ACTIVE'
  })
};

export const expectedReconciliationResponse = {
  status: 201,
  message: 'Medication reconciliation created',
  data: expect.objectContaining({
    id: expect.any(Number),
    patient_id: 1,
    reconciliation_type: expect.any(String)
  })
};

export const expectedDiscontinuedMedicationResponse = {
  status: 200,
  message: 'Medication discontinued',
  data: expect.objectContaining({
    medication_status: 'DISCONTINUED',
    discontinued_date: expect.any(String),
    discontinuation_reason: expect.any(String)
  })
};
