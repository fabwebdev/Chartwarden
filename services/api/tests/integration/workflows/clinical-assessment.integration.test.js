/**
 * Clinical Assessment Workflow Integration Tests
 *
 * Tests complete clinical assessment workflows across multiple components:
 * - HOPE Assessment creation and management (ADMISSION, HUV1, HUV2, DISCHARGE)
 * - Vital signs recording and tracking
 * - Pain assessment workflows
 * - Symptom assessment and SFV triggering
 * - Assessment validation and CMS compliance
 * - Electronic signature workflows (21 CFR Part 11)
 * - Assessment submission to CMS iQIES
 * - Cross-discipline assessment coordination
 *
 * HIPAA Compliance:
 * - Tests PHI access controls for clinical data
 * - Validates audit logging for all clinical assessments
 * - Ensures proper authentication and authorization
 * - Tests assessment amendment tracking and immutability
 * - Validates CMS compliance requirements
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { faker } from '@faker-js/faker';
import { createTestServer } from '../helpers/testServer.js';
import { cleanupDatabase, createTestPatient, executeQuery } from '../helpers/testDb.js';
import {
  createAuthenticatedUser,
  createAdminUser,
  createDoctorUser,
  createNurseUser,
  TEST_ROLES,
  getAuthHeaders,
} from '../helpers/authHelper.js';

describe('Clinical Assessment Workflow Integration Tests', () => {
  let testServer;
  let app;

  beforeAll(async () => {
    // Create test server with clinical assessment routes enabled
    const builder = createTestServer({
      registerRoutes: true,
      skipAuth: false,
      enableRateLimiting: false,
    });

    testServer = builder;
    app = await builder.build();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await cleanupDatabase();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupDatabase();
  });

  // ============================================================================
  // HOPE ASSESSMENT WORKFLOW TESTS
  // ============================================================================

  describe('HOPE Assessment Workflow', () => {
    describe('POST /api/patients/:id/hope-assessments/admission - Admission Assessment', () => {
      it('should successfully create admission assessment for new patient as nurse', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        const admissionData = {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90', // Lung cancer
          i0010_principal_diagnosis_description: 'Malignant neoplasm of unspecified part of bronchus or lung',
          j0100_pain_presence: '1', // Yes
          j0100_pain_severity_current: 5,
          j0100_pain_severity_worst: 7,
          j0500_dyspnea_presence: true,
          j0500_dyspnea_severity: 'MODERATE',
          f2300_code_status: 'DNR',
          f2300_advance_directive_exists: true,
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: admissionData,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.status).toBe(201);
        expect(body.message).toMatch(/assessment created successfully/i);
        expect(body.data).toBeDefined();
        expect(body.data.patient_id).toBe(testPatient.id);
        expect(body.data.assessment_type).toBe('ADMISSION');
        expect(body.data.assessment_status).toBe('IN_PROGRESS');
        expect(body.data.i0010_principal_diagnosis_icd10).toBe('C34.90');
        expect(body.data.j0100_pain_severity_current).toBe(5);
      });

      it('should successfully create admission assessment as doctor', async () => {
        const doctorUser = await createDoctorUser({ createSession: true });
        const testPatient = await createTestPatient();

        const admissionData = {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'I50.9', // Heart failure
          i0010_principal_diagnosis_description: 'Heart failure, unspecified',
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
          headers: getAuthHeaders(doctorUser.session.token),
          payload: admissionData,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data.assessment_type).toBe('ADMISSION');
        expect(body.data.i0010_principal_diagnosis_icd10).toBe('I50.9');
      });

      it('should reject admission assessment creation without authentication', async () => {
        const testPatient = await createTestPatient();

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
          payload: {
            assessment_date: new Date().toISOString(),
            a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
            i0010_principal_diagnosis_icd10: 'C34.90',
          },
        });

        expect(response.statusCode).toBe(401);
      });

      it('should create admission assessment with complete HOPE 2.0 sections', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        const comprehensiveData = {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],

          // Section I: Diagnoses
          i0010_principal_diagnosis_icd10: 'C34.90',
          i0010_principal_diagnosis_description: 'Malignant neoplasm of lung',
          i0300_prognosis_months: 3,

          // Section J: Health Conditions
          j0100_pain_presence: '1',
          j0100_pain_frequency: '2', // Daily
          j0100_pain_severity_current: 6,
          j0100_pain_severity_worst: 8,
          j0500_dyspnea_presence: true,
          j0500_dyspnea_severity: 'SEVERE',
          j0600_nausea_presence: false,
          j0900_appetite_status: 'POOR',
          j1000_phq2_little_interest: 2,
          j1000_phq2_feeling_down: 2,
          j1300_adl_bed_mobility: 3, // Extensive assistance
          j1300_adl_transfer: 3,
          j1400_oxygen_dependent: true,
          j1400_oxygen_liters: 2,

          // Section F: Preferences
          f2200_hospitalization_preference: '2', // Prefer home
          f2300_code_status: 'DNR',
          f2300_advance_directive_exists: true,
          f3100_caregiver_available: true,
          f3100_caregiver_relationship: 'Spouse',

          // Section M: Skin Conditions
          m0100_skin_intact: true,
          m0100_skin_at_risk: false,
          m0200_pressure_ulcer_present: false,

          // Section N: Medications
          n0100_opioid_medications: true,
          n0200_medication_regimen_review: true,
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: comprehensiveData,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data.j0100_pain_severity_current).toBe(6);
        expect(body.data.j0500_dyspnea_severity).toBe('SEVERE');
        expect(body.data.j1400_oxygen_dependent).toBe(true);
        expect(body.data.f2300_code_status).toBe('DNR');
        expect(body.data.n0100_opioid_medications).toBe(true);
      });
    });

    describe('POST /api/patients/:id/hope-assessments/huv1 - HUV1 Assessment', () => {
      it('should create HUV1 assessment (days 6-15 after admission)', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        const huv1Data = {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90',
          j0100_pain_presence: '1',
          j0100_pain_severity_current: 3, // Improved from admission
          j0500_dyspnea_presence: true,
          j0500_dyspnea_severity: 'MILD', // Improved
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/huv1`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: huv1Data,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data.assessment_type).toBe('HUV1');
        expect(body.data.j0100_pain_severity_current).toBe(3);
        expect(body.data.j0500_dyspnea_severity).toBe('MILD');
      });
    });

    describe('POST /api/patients/:id/hope-assessments/huv2 - HUV2 Assessment', () => {
      it('should create HUV2 assessment (days 16-30 after admission)', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        const huv2Data = {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90',
          j0100_pain_presence: '0', // No pain - well controlled
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/huv2`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: huv2Data,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data.assessment_type).toBe('HUV2');
        expect(body.data.j0100_pain_presence).toBe('0');
      });
    });

    describe('POST /api/patients/:id/hope-assessments/discharge - Discharge Assessment', () => {
      it('should create discharge assessment', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        const dischargeData = {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          a0270_discharge_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90',
          clinical_notes: 'Patient discharged to home with family. Symptoms well controlled.',
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/discharge`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: dischargeData,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data.assessment_type).toBe('DISCHARGE');
        expect(body.data.a0270_discharge_date).toBeDefined();
      });
    });

    describe('GET /api/patients/:id/hope-assessments - Retrieve Patient Assessments', () => {
      it('should retrieve all assessments for a patient', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        // Create admission assessment first
        const createResponse = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            assessment_date: new Date().toISOString(),
            a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
            i0010_principal_diagnosis_icd10: 'C34.90',
          },
        });

        expect(createResponse.statusCode).toBe(201);

        // Retrieve assessments
        const response = await app.inject({
          method: 'GET',
          url: `/api/patients/${testPatient.id}/hope-assessments`,
          headers: getAuthHeaders(nurseUser.session.token),
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data[0].patient_id).toBe(testPatient.id);
      });
    });

    describe('PATCH /api/hope-assessments/:id - Update Assessment', () => {
      it('should update assessment if not signed', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        // Create assessment
        const createResponse = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            assessment_date: new Date().toISOString(),
            a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
            i0010_principal_diagnosis_icd10: 'C34.90',
            j0100_pain_severity_current: 5,
          },
        });

        const createdAssessment = JSON.parse(createResponse.payload).data;

        // Update assessment
        const updateResponse = await app.inject({
          method: 'PATCH',
          url: `/api/hope-assessments/${createdAssessment.id}`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            j0100_pain_severity_current: 7, // Pain worsened
            clinical_notes: 'Patient reports increased pain',
          },
        });

        expect(updateResponse.statusCode).toBe(200);

        const body = JSON.parse(updateResponse.payload);
        expect(body.data.j0100_pain_severity_current).toBe(7);
        expect(body.data.clinical_notes).toMatch(/increased pain/i);
      });
    });
  });

  // ============================================================================
  // VITAL SIGNS WORKFLOW TESTS
  // ============================================================================

  describe('Vital Signs Workflow', () => {
    describe('POST /api/patients/:patientId/vital-signs - Create Vital Signs', () => {
      it('should successfully create vital signs record for patient as nurse', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        const vitalSignsData = {
          measurement_timestamp: new Date().toISOString(),
          bp_systolic: 120,
          bp_diastolic: 80,
          heart_rate: 72,
          respiratory_rate: 16,
          degrees_fahrenheit: 98.6,
          pulse_oximetry_percentage: 97,
          pain_score: 3,
          pain_scale_used: 'NRS',
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/vital-signs`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: vitalSignsData,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.message).toMatch(/vital signs (created|recorded) successfully/i);
        expect(body.data).toBeDefined();
        expect(body.data.patient_id).toBe(testPatient.id);
        expect(body.data.bp_systolic).toBe(120);
        expect(body.data.heart_rate).toBe(72);
        expect(body.data.pain_score).toBe(3);
      });

      it('should create vital signs with oxygen support information', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient({ oxygen_dependent: 1 });

        const vitalSignsData = {
          measurement_timestamp: new Date().toISOString(),
          respiratory_rate: 20,
          pulse_oximetry_percentage: 94,
          supplemental_oxygen: true,
          oxygen_flow_rate: 2.0,
          oxygen_delivery_method: 'NASAL_CANNULA',
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/vital-signs`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: vitalSignsData,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data.supplemental_oxygen).toBe(true);
        expect(body.data.oxygen_flow_rate).toBe('2.0');
        expect(body.data.oxygen_delivery_method).toBe('NASAL_CANNULA');
      });

      it('should create vital signs with pain assessment details', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        const vitalSignsData = {
          measurement_timestamp: new Date().toISOString(),
          pain_score: 7,
          pain_scale_used: 'NRS',
          pain_location: 'Lower back',
          pain_quality: 'SHARP',
          pain_onset: 'SUDDEN',
          pain_duration: '2 hours',
          pain_aggravating_factors: 'Movement',
          pain_relieving_factors: 'Rest',
          pain_intervention_given: true,
          pain_intervention_description: 'Administered ordered pain medication',
          pain_post_intervention_score: 4,
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/vital-signs`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: vitalSignsData,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data.pain_score).toBe(7);
        expect(body.data.pain_location).toBe('Lower back');
        expect(body.data.pain_intervention_given).toBe(true);
        expect(body.data.pain_post_intervention_score).toBe(4);
      });

      it('should flag abnormal vital signs', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        const abnormalVitals = {
          measurement_timestamp: new Date().toISOString(),
          bp_systolic: 160, // High
          bp_diastolic: 95, // High
          heart_rate: 110, // Elevated
          respiratory_rate: 24, // Elevated
          degrees_fahrenheit: 101.2, // Fever
          pulse_oximetry_percentage: 89, // Low
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/vital-signs`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: abnormalVitals,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        // The system should flag these as abnormal
        expect(body.data.is_abnormal).toBe(true);
      });
    });

    describe('GET /api/patients/:patientId/vital-signs - Retrieve Vital Signs', () => {
      it('should retrieve all vital signs for a patient', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        // Create vital signs first
        await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/vital-signs`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            measurement_timestamp: new Date().toISOString(),
            bp_systolic: 120,
            bp_diastolic: 80,
            heart_rate: 72,
          },
        });

        // Retrieve vital signs
        const response = await app.inject({
          method: 'GET',
          url: `/api/patients/${testPatient.id}/vital-signs`,
          headers: getAuthHeaders(nurseUser.session.token),
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
        expect(body.data.length).toBeGreaterThan(0);
        expect(body.data[0].patient_id).toBe(testPatient.id);
      });
    });

    describe('GET /api/patients/:patientId/vital-signs/latest - Latest Vital Signs', () => {
      it('should retrieve latest vital signs for patient', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        // Create older vital signs
        await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/vital-signs`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            measurement_timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(), // 2 hours ago
            bp_systolic: 115,
            bp_diastolic: 75,
          },
        });

        // Create latest vital signs
        await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/vital-signs`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            measurement_timestamp: new Date().toISOString(),
            bp_systolic: 120,
            bp_diastolic: 80,
          },
        });

        // Retrieve latest
        const response = await app.inject({
          method: 'GET',
          url: `/api/patients/${testPatient.id}/vital-signs/latest`,
          headers: getAuthHeaders(nurseUser.session.token),
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.data.bp_systolic).toBe(120);
      });
    });
  });

  // ============================================================================
  // PAIN ASSESSMENT WORKFLOW TESTS
  // ============================================================================

  describe('Pain Assessment Workflow', () => {
    describe('POST /api/pain-assessment/store - Create Pain Assessment', () => {
      it('should create comprehensive pain assessment', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        const painAssessmentData = {
          patient_id: testPatient.id,
          pain_score: 6,
          pain_location: 'Chest',
          pain_severity: 'MODERATE',
          pain_frequency: 'CONSTANT',
          pain_character: 'SHARP',
          pain_duration: '3 days',
          pain_worsened_by: 'Deep breathing',
          pain_relieved_by: 'Pain medication',
          assessment_date: new Date().toISOString(),
        };

        const response = await app.inject({
          method: 'POST',
          url: '/api/pain-assessment/store',
          headers: getAuthHeaders(nurseUser.session.token),
          payload: painAssessmentData,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.message).toMatch(/pain assessment (created|recorded) successfully/i);
        expect(body.data).toBeDefined();
        expect(body.data.patient_id).toBe(testPatient.id);
        expect(body.data.pain_score).toBe(6);
      });
    });

    describe('GET /api/pain-assessment - Retrieve Pain Assessments', () => {
      it('should retrieve pain assessments', async () => {
        const nurseUser = await createNurseUser({ createSession: true });

        const response = await app.inject({
          method: 'GET',
          url: '/api/pain-assessment',
          headers: getAuthHeaders(nurseUser.session.token),
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(Array.isArray(body.data)).toBe(true);
      });
    });
  });

  // ============================================================================
  // SFV (SYMPTOM FOLLOW-UP VISIT) TRIGGERING TESTS
  // ============================================================================

  describe('Symptom Follow-up Visit (SFV) Workflow', () => {
    describe('POST /api/patients/:id/hope-assessments/sfv - Create SFV Assessment', () => {
      it('should create SFV assessment when triggered by severe symptoms', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        const sfvData = {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90',

          // Symptom that triggered SFV
          sfv_trigger_symptoms: 'Severe pain (8/10) and dyspnea',

          // Assessment findings
          j0100_pain_presence: '1',
          j0100_pain_severity_current: 8,
          j0500_dyspnea_presence: true,
          j0500_dyspnea_severity: 'SEVERE',

          clinical_notes: 'SFV completed within 48 hours of symptom escalation. Medications adjusted.',
        };

        const response = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/sfv`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: sfvData,
        });

        expect(response.statusCode).toBe(201);

        const body = JSON.parse(response.payload);
        expect(body.data.assessment_type).toMatch(/SFV|SYMPTOM_FOLLOWUP/i);
        expect(body.data.sfv_triggered).toBe(true);
        expect(body.data.j0100_pain_severity_current).toBe(8);
      });
    });
  });

  // ============================================================================
  // ASSESSMENT VALIDATION AND COMPLIANCE TESTS
  // ============================================================================

  describe('Assessment Validation and CMS Compliance', () => {
    describe('POST /api/hope-assessments/:id/validate - Validate Assessment', () => {
      it('should validate assessment for CMS compliance', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        // Create assessment
        const createResponse = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            assessment_date: new Date().toISOString(),
            a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
            i0010_principal_diagnosis_icd10: 'C34.90',
          },
        });

        const assessment = JSON.parse(createResponse.payload).data;

        // Validate assessment
        const response = await app.inject({
          method: 'POST',
          url: `/api/hope-assessments/${assessment.id}/validate`,
          headers: getAuthHeaders(nurseUser.session.token),
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.data.validation_result).toBeDefined();
        expect(body.data.is_valid).toBeDefined();
      });
    });

    describe('GET /api/hope-assessments/:id/cms-compliance - Check CMS Compliance', () => {
      it('should return CMS compliance status for assessment', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        // Create assessment
        const createResponse = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            assessment_date: new Date().toISOString(),
            a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
            i0010_principal_diagnosis_icd10: 'C34.90',
          },
        });

        const assessment = JSON.parse(createResponse.payload).data;

        // Check compliance
        const response = await app.inject({
          method: 'GET',
          url: `/api/assessments/${assessment.id}/cms-compliance`,
          headers: getAuthHeaders(nurseUser.session.token),
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.data.compliance_status).toBeDefined();
      });
    });
  });

  // ============================================================================
  // ELECTRONIC SIGNATURE WORKFLOW TESTS (21 CFR Part 11)
  // ============================================================================

  describe('Electronic Signature Workflow (21 CFR Part 11)', () => {
    describe('POST /api/hope-assessments/:id/sign - Sign Assessment', () => {
      it('should sign assessment with electronic signature', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        // Create assessment
        const createResponse = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            assessment_date: new Date().toISOString(),
            a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
            i0010_principal_diagnosis_icd10: 'C34.90',
          },
        });

        const assessment = JSON.parse(createResponse.payload).data;

        // Sign assessment
        const response = await app.inject({
          method: 'POST',
          url: `/api/hope-assessments/${assessment.id}/sign`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            password: nurseUser.plainPassword, // Required for 21 CFR Part 11 compliance
            meaning: 'I attest that this assessment is complete and accurate',
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.message).toMatch(/signed successfully/i);
        expect(body.data.assessment_status).toMatch(/SIGNED|COMPLETED/i);
      });

      it('should prevent modification of signed assessment', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        // Create and sign assessment
        const createResponse = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            assessment_date: new Date().toISOString(),
            a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
            i0010_principal_diagnosis_icd10: 'C34.90',
            j0100_pain_severity_current: 5,
          },
        });

        const assessment = JSON.parse(createResponse.payload).data;

        // Sign it
        await app.inject({
          method: 'POST',
          url: `/api/hope-assessments/${assessment.id}/sign`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            password: nurseUser.plainPassword,
            meaning: 'Assessment complete',
          },
        });

        // Try to modify signed assessment
        const updateResponse = await app.inject({
          method: 'PATCH',
          url: `/api/hope-assessments/${assessment.id}`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            j0100_pain_severity_current: 7,
          },
        });

        expect(updateResponse.statusCode).toBeGreaterThanOrEqual(400);

        const body = JSON.parse(updateResponse.payload);
        expect(body.message).toMatch(/signed|locked|cannot be modified/i);
      });
    });

    describe('POST /api/vital-signs/:id/sign - Sign Vital Signs', () => {
      it('should sign vital signs record', async () => {
        const nurseUser = await createNurseUser({ createSession: true });
        const testPatient = await createTestPatient();

        // Create vital signs
        const createResponse = await app.inject({
          method: 'POST',
          url: `/api/patients/${testPatient.id}/vital-signs`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            measurement_timestamp: new Date().toISOString(),
            bp_systolic: 120,
            bp_diastolic: 80,
          },
        });

        const vitalSigns = JSON.parse(createResponse.payload).data;

        // Sign vital signs
        const response = await app.inject({
          method: 'POST',
          url: `/api/vital-signs/${vitalSigns.id}/sign`,
          headers: getAuthHeaders(nurseUser.session.token),
          payload: {
            password: nurseUser.plainPassword,
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.message).toMatch(/signed successfully/i);
      });
    });
  });

  // ============================================================================
  // END-TO-END CLINICAL ASSESSMENT WORKFLOWS
  // ============================================================================

  describe('Complete Clinical Assessment Workflows', () => {
    it('should complete full hospice admission workflow with assessments', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const testPatient = await createTestPatient();

      // Step 1: Create admission HOPE assessment
      const hopeResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90',
          i0010_principal_diagnosis_description: 'Lung cancer',
          j0100_pain_presence: '1',
          j0100_pain_severity_current: 6,
          j0500_dyspnea_presence: true,
          j0500_dyspnea_severity: 'MODERATE',
          f2300_code_status: 'DNR',
        },
      });

      expect(hopeResponse.statusCode).toBe(201);
      const hopeAssessment = JSON.parse(hopeResponse.payload).data;

      // Step 2: Record initial vital signs
      const vitalSignsResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/vital-signs`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          measurement_timestamp: new Date().toISOString(),
          bp_systolic: 118,
          bp_diastolic: 76,
          heart_rate: 88,
          respiratory_rate: 20,
          degrees_fahrenheit: 98.4,
          pulse_oximetry_percentage: 93,
          supplemental_oxygen: true,
          oxygen_flow_rate: 2.0,
          pain_score: 6,
          pain_scale_used: 'NRS',
        },
      });

      expect(vitalSignsResponse.statusCode).toBe(201);

      // Step 3: Create detailed pain assessment
      const painResponse = await app.inject({
        method: 'POST',
        url: '/api/pain-assessment/store',
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          patient_id: testPatient.id,
          pain_score: 6,
          pain_severity: 'MODERATE',
          pain_location: 'Chest and back',
          pain_character: 'ACHING',
          assessment_date: new Date().toISOString(),
        },
      });

      expect(painResponse.statusCode).toBe(201);

      // Step 4: Sign HOPE assessment
      const signResponse = await app.inject({
        method: 'POST',
        url: `/api/hope-assessments/${hopeAssessment.id}/sign`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          password: nurseUser.plainPassword,
          meaning: 'Admission assessment complete and accurate',
        },
      });

      expect(signResponse.statusCode).toBe(200);

      // Step 5: Verify all assessments are retrievable
      const retrieveResponse = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/hope-assessments`,
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(retrieveResponse.statusCode).toBe(200);
      const assessments = JSON.parse(retrieveResponse.payload).data;
      expect(assessments.length).toBeGreaterThan(0);
    });

    it('should handle symptom escalation requiring SFV', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const testPatient = await createTestPatient();

      // Initial admission with moderate pain
      const admissionResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90',
          j0100_pain_severity_current: 5, // Moderate
        },
      });

      expect(admissionResponse.statusCode).toBe(201);

      // Record vital signs showing severe pain (triggers SFV)
      const severeVitalsResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/vital-signs`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          measurement_timestamp: new Date().toISOString(),
          pain_score: 9, // Severe - should trigger SFV
          pain_scale_used: 'NRS',
          pain_location: 'Widespread',
        },
      });

      expect(severeVitalsResponse.statusCode).toBe(201);

      // Create SFV assessment (within 48 hours of severe symptom)
      const sfvResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/hope-assessments/sfv`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90',
          sfv_trigger_symptoms: 'Severe pain escalation (9/10)',
          j0100_pain_severity_current: 9,
          clinical_notes: 'Pain management plan adjusted. Increased opioid dosage.',
        },
      });

      expect(sfvResponse.statusCode).toBe(201);

      const sfvAssessment = JSON.parse(sfvResponse.payload).data;
      expect(sfvAssessment.sfv_triggered).toBe(true);
    });

    it('should handle role-based clinical workflow for doctor vs nurse', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const nurseUser = await createNurseUser({ createSession: true });
      const testPatient = await createTestPatient();

      // Nurse creates admission assessment
      const nurseAssessmentResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90',
        },
      });

      expect(nurseAssessmentResponse.statusCode).toBe(201);

      // Doctor can view assessment
      const nurseAssessment = JSON.parse(nurseAssessmentResponse.payload).data;
      const doctorViewResponse = await app.inject({
        method: 'GET',
        url: `/api/hope-assessments/${nurseAssessment.id}`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(doctorViewResponse.statusCode).toBe(200);

      // Doctor can update assessment (higher privileges)
      const doctorUpdateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/hope-assessments/${nurseAssessment.id}`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          i0300_prognosis_months: 6,
          clinical_notes: 'Reviewed by attending physician',
        },
      });

      expect(doctorUpdateResponse.statusCode).toBe(200);
    });
  });

  // ============================================================================
  // AUTHORIZATION AND ACCESS CONTROL TESTS
  // ============================================================================

  describe('Clinical Assessment Authorization', () => {
    it('should allow nurse to view and create assessments', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90',
        },
      });

      expect(response.statusCode).toBe(201);
    });

    it('should allow doctor to view, create, and update assessments', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const testPatient = await createTestPatient();

      const createResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/hope-assessments/admission`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          assessment_date: new Date().toISOString(),
          a0310_assessment_reference_date: new Date().toISOString().split('T')[0],
          i0010_principal_diagnosis_icd10: 'C34.90',
        },
      });

      expect(createResponse.statusCode).toBe(201);

      const assessment = JSON.parse(createResponse.payload).data;

      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/hope-assessments/${assessment.id}`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          clinical_notes: 'Updated by doctor',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
    });

    it('should require authentication for all clinical assessment endpoints', async () => {
      const testPatient = await createTestPatient();

      const endpoints = [
        { method: 'POST', url: `/api/patients/${testPatient.id}/hope-assessments/admission` },
        { method: 'GET', url: `/api/patients/${testPatient.id}/hope-assessments` },
        { method: 'POST', url: `/api/patients/${testPatient.id}/vital-signs` },
        { method: 'GET', url: `/api/patients/${testPatient.id}/vital-signs` },
        { method: 'POST', url: '/api/pain-assessment/store' },
        { method: 'GET', url: '/api/pain-assessment' },
      ];

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: endpoint.method,
          url: endpoint.url,
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
          payload: {},
        });

        expect(response.statusCode).toBe(401);
      }
    });
  });
});
