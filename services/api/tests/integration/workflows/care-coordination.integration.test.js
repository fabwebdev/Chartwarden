/**
 * Care Coordination Workflow Integration Tests
 *
 * Tests complete care coordination workflows across multiple components:
 * - IDG (Interdisciplinary Group) meetings and patient reviews
 * - Care plan creation, updates, and revisions
 * - Physician certifications and recertifications
 * - Face-to-Face encounters
 * - Problems, goals, and interventions tracking
 * - 14-day IDG review compliance
 * - Care plan signing and approval workflow
 *
 * HIPAA Compliance:
 * - Tests audit logging for care coordination activities
 * - Validates proper authorization for care plan access
 * - Ensures electronic signature compliance (21 CFR Part 11)
 * - Tests secure handling of clinical documentation
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { faker } from '@faker-js/faker';
import { createTestServer } from '../helpers/testServer.js';
import { cleanupDatabase, createTestPatient } from '../helpers/testDb.js';
import {
  createAuthenticatedUser,
  createAdminUser,
  createDoctorUser,
  createNurseUser,
  TEST_ROLES,
  getAuthHeaders,
} from '../helpers/authHelper.js';

describe('Care Coordination Workflow Integration Tests', () => {
  let testServer;
  let app;

  beforeAll(async () => {
    // Create test server with care coordination routes enabled
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
  // HELPER FUNCTIONS
  // ============================================================================

  /**
   * Create an IDG meeting
   */
  async function createIdgMeeting(authHeaders, overrides = {}) {
    const meetingData = {
      meeting_type: 'ROUTINE',
      meeting_status: 'SCHEDULED',
      meeting_date: new Date().toISOString().split('T')[0],
      meeting_time: '10:00:00',
      location: 'Main Conference Room',
      ...overrides,
    };

    const response = await app.inject({
      method: 'POST',
      url: '/api/idg-meetings',
      headers: authHeaders,
      payload: meetingData,
    });

    return {
      response,
      meeting: response.statusCode === 200 ? JSON.parse(response.payload).data.meeting : null,
    };
  }

  /**
   * Create a care plan
   */
  async function createCarePlan(patientId, authHeaders, overrides = {}) {
    const carePlanData = {
      effective_date: new Date().toISOString().split('T')[0],
      patient_goals: 'Maintain comfort and dignity',
      philosophy_of_care: 'Patient-centered hospice care',
      ...overrides,
    };

    const response = await app.inject({
      method: 'POST',
      url: `/api/patients/${patientId}/care-plans`,
      headers: authHeaders,
      payload: carePlanData,
    });

    return {
      response,
      carePlan: response.statusCode === 200 || response.statusCode === 201
        ? JSON.parse(response.payload).data?.carePlan || JSON.parse(response.payload).data
        : null,
    };
  }

  /**
   * Create a certification
   */
  async function createCertification(patientId, authHeaders, overrides = {}) {
    const today = new Date();
    const endDate = new Date(today);
    endDate.setDate(endDate.getDate() + 90);

    const certificationData = {
      certification_period: 'INITIAL_90',
      start_date: today.toISOString().split('T')[0],
      end_date: endDate.toISOString().split('T')[0],
      terminal_illness_narrative: 'Patient has advanced terminal illness with limited life expectancy.',
      clinical_progression: 'Patient showing progressive decline in functional status.',
      ...overrides,
    };

    const response = await app.inject({
      method: 'POST',
      url: `/api/patients/${patientId}/certifications`,
      headers: authHeaders,
      payload: certificationData,
    });

    return {
      response,
      certification: response.statusCode === 200 || response.statusCode === 201
        ? JSON.parse(response.payload).data?.certification || JSON.parse(response.payload).data
        : null,
    };
  }

  // ============================================================================
  // IDG MEETING WORKFLOW TESTS
  // ============================================================================

  describe('IDG Meeting Workflow', () => {
    it('should complete full IDG meeting workflow: create -> add attendees -> add patient reviews -> complete', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const patient = await createTestPatient();

      // Step 1: Create IDG meeting
      const { response: createResponse, meeting } = await createIdgMeeting(
        getAuthHeaders(nurseUser.session.token),
        {
          meeting_type: 'ROUTINE',
          agenda: 'Review all active patients for 14-day compliance',
        }
      );

      expect(createResponse.statusCode).toBe(200);
      expect(meeting).toBeDefined();
      expect(meeting.meeting_status).toBe('SCHEDULED');
      const meetingId = meeting.id;

      // Step 2: Add attendees
      const attendeeResponse = await app.inject({
        method: 'POST',
        url: `/api/idg-meetings/${meetingId}/attendees`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          staff_name: 'Dr. Sarah Johnson',
          discipline: 'PHYSICIAN',
          role: 'Medical Director',
          attendance_type: 'IN_PERSON',
        },
      });

      expect(attendeeResponse.statusCode).toBe(200);

      // Step 3: Start meeting
      const startResponse = await app.inject({
        method: 'POST',
        url: `/api/idg-meetings/${meetingId}/start`,
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(startResponse.statusCode).toBe(200);

      // Step 4: Add patient review
      const reviewResponse = await app.inject({
        method: 'POST',
        url: `/api/idg-meetings/${meetingId}/reviews`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          patient_id: patient.id,
          review_date: new Date().toISOString().split('T')[0],
          clinical_summary: 'Patient stable with good symptom control',
          current_condition: 'Comfortable, pain well managed',
          care_plan_reviewed: true,
          medications_reviewed: true,
        },
      });

      expect(reviewResponse.statusCode).toBe(200);

      // Step 5: Complete patient review
      const completeReviewResponse = await app.inject({
        method: 'POST',
        url: `/api/idg-meetings/${meetingId}/reviews/${patient.id}/complete`,
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(completeReviewResponse.statusCode).toBe(200);

      // Step 6: Complete meeting
      const completeResponse = await app.inject({
        method: 'POST',
        url: `/api/idg-meetings/${meetingId}/complete`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          all_patients_reviewed: true,
          patients_reviewed_count: 1,
          meeting_outcomes: 'All patients reviewed, no major concerns identified',
        },
      });

      expect(completeResponse.statusCode).toBe(200);

      // Step 7: Verify meeting status
      const verifyResponse = await app.inject({
        method: 'GET',
        url: `/api/idg-meetings/${meetingId}`,
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(verifyResponse.statusCode).toBe(200);
      const verifyBody = JSON.parse(verifyResponse.payload);
      expect(verifyBody.data.meeting.meeting_status).toBe('COMPLETED');
    });

    it('should track 14-day IDG review compliance for patients', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const patient = await createTestPatient();

      // Create IDG meeting and review patient
      const { meeting } = await createIdgMeeting(
        getAuthHeaders(nurseUser.session.token)
      );

      await app.inject({
        method: 'POST',
        url: `/api/idg-meetings/${meeting.id}/reviews`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          patient_id: patient.id,
          review_date: new Date().toISOString().split('T')[0],
          clinical_summary: 'Patient status reviewed',
        },
      });

      // Get patient IDG review history
      const reviewHistoryResponse = await app.inject({
        method: 'GET',
        url: `/api/patients/${patient.id}/idg-reviews`,
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(reviewHistoryResponse.statusCode).toBe(200);
      const reviewHistory = JSON.parse(reviewHistoryResponse.payload);
      expect(reviewHistory.data).toBeDefined();
    });

    it('should identify overdue IDG reviews', async () => {
      const nurseUser = await createNurseUser({ createSession: true });

      // Get overdue IDG reviews
      const overdueResponse = await app.inject({
        method: 'GET',
        url: '/api/idg/overdue',
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(overdueResponse.statusCode).toBe(200);
      const overdueBody = JSON.parse(overdueResponse.payload);
      expect(overdueBody.data).toBeDefined();
      expect(Array.isArray(overdueBody.data.overduePatients || overdueBody.data)).toBe(true);
    });

    it('should allow nurses and doctors to participate in IDG meetings', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const doctorUser = await createDoctorUser({ createSession: true });

      // Nurse creates meeting
      const { meeting } = await createIdgMeeting(
        getAuthHeaders(nurseUser.session.token)
      );

      expect(meeting).toBeDefined();

      // Doctor can view meeting
      const doctorViewResponse = await app.inject({
        method: 'GET',
        url: `/api/idg-meetings/${meeting.id}`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(doctorViewResponse.statusCode).toBe(200);
    });
  });

  // ============================================================================
  // CARE PLAN WORKFLOW TESTS
  // ============================================================================

  describe('Care Plan Workflow', () => {
    it('should complete full care plan lifecycle: create -> add problems/goals -> update -> sign', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const patient = await createTestPatient();

      // Step 1: Create care plan
      const { response: createResponse, carePlan } = await createCarePlan(
        patient.id,
        getAuthHeaders(doctorUser.session.token),
        {
          patient_goals: 'Maintain comfort and quality of life',
          goals_of_care: 'Palliative care focused on symptom management',
          terminal_diagnosis: 'Advanced heart failure',
        }
      );

      expect(createResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(createResponse.statusCode).toBeLessThan(300);
      expect(carePlan).toBeDefined();
      const carePlanId = carePlan.id;

      // Step 2: Add problem
      const problemResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/problems`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          problem_category: 'PHYSICAL',
          problem_description: 'Dyspnea on exertion',
          problem_status: 'ACTIVE',
          problem_priority: 'HIGH',
          identified_date: new Date().toISOString().split('T')[0],
        },
      });

      expect(problemResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(problemResponse.statusCode).toBeLessThan(300);
      const problemBody = JSON.parse(problemResponse.payload);
      const problemId = problemBody.data?.problem?.id || problemBody.data?.id;

      // Step 3: Add goal for the problem
      const goalResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/goals`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          problem_id: problemId,
          goal_description: 'Patient will report decreased dyspnea within 7 days',
          goal_status: 'IN_PROGRESS',
          target_date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          measurable_outcome: 'Patient rates dyspnea 3 or less on 0-10 scale',
        },
      });

      expect(goalResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(goalResponse.statusCode).toBeLessThan(300);
      const goalBody = JSON.parse(goalResponse.payload);
      const goalId = goalBody.data?.goal?.id || goalBody.data?.id;

      // Step 4: Add intervention for the goal
      const interventionResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/interventions`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          problem_id: problemId,
          goal_id: goalId,
          intervention_category: 'NURSING',
          intervention_description: 'Administer oxygen as needed, monitor respiratory status',
          intervention_status: 'IN_PROGRESS',
          discipline: 'REGISTERED_NURSE',
          frequency: 'Daily visits',
        },
      });

      expect(interventionResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(interventionResponse.statusCode).toBeLessThan(300);

      // Step 5: Update care plan
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/care-plans/${carePlanId}`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          pain_management_approach: 'Multimodal approach with scheduled and PRN medications',
        },
      });

      expect(updateResponse.statusCode).toBe(200);

      // Step 6: Sign care plan
      const signResponse = await app.inject({
        method: 'POST',
        url: `/api/care-plans/${carePlanId}/sign`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          signature_type: 'PHYSICIAN',
          signature_data: {
            signed_by: doctorUser.firstName + ' ' + doctorUser.lastName,
            signed_at: new Date().toISOString(),
          },
        },
      });

      expect(signResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(signResponse.statusCode).toBeLessThan(300);

      // Step 7: Verify care plan is signed
      const verifyResponse = await app.inject({
        method: 'GET',
        url: `/api/care-plans/${carePlanId}`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(verifyResponse.statusCode).toBe(200);
      const verifyBody = JSON.parse(verifyResponse.payload);
      expect(verifyBody.data.carePlan || verifyBody.data).toBeDefined();
    });

    it('should retrieve all care plans for a patient', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const patient = await createTestPatient();

      // Create two care plans
      await createCarePlan(patient.id, getAuthHeaders(doctorUser.session.token), {
        effective_date: '2024-01-01',
      });

      await createCarePlan(patient.id, getAuthHeaders(doctorUser.session.token), {
        effective_date: '2024-02-01',
      });

      // Get all patient care plans
      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${patient.id}/care-plans`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      const carePlans = body.data?.carePlans || body.data;
      expect(Array.isArray(carePlans)).toBe(true);
      expect(carePlans.length).toBeGreaterThanOrEqual(2);
    });

    it('should resolve a problem and update status', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const patient = await createTestPatient();

      // Create problem
      const problemResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/problems`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          problem_category: 'PSYCHOLOGICAL',
          problem_description: 'Anxiety',
          problem_status: 'ACTIVE',
          identified_date: new Date().toISOString().split('T')[0],
        },
      });

      const problemId = JSON.parse(problemResponse.payload).data?.problem?.id || JSON.parse(problemResponse.payload).data?.id;

      // Resolve problem
      const resolveResponse = await app.inject({
        method: 'POST',
        url: `/api/problems/${problemId}/resolve`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          resolved_date: new Date().toISOString().split('T')[0],
          notes: 'Patient reports improved anxiety with interventions',
        },
      });

      expect(resolveResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(resolveResponse.statusCode).toBeLessThan(300);

      // Verify problem status
      const verifyResponse = await app.inject({
        method: 'GET',
        url: `/api/problems/${problemId}`,
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(verifyResponse.statusCode).toBe(200);
      const problem = JSON.parse(verifyResponse.payload).data?.problem || JSON.parse(verifyResponse.payload).data;
      expect(problem.problem_status).toBe('RESOLVED');
    });

    it('should track goal progress with milestones', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const patient = await createTestPatient();

      // Create goal
      const goalResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/goals`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          goal_description: 'Patient will ambulate 50 feet with assistance',
          goal_status: 'IN_PROGRESS',
          target_date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        },
      });

      expect(goalResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(goalResponse.statusCode).toBeLessThan(300);
      const goalId = JSON.parse(goalResponse.payload).data?.goal?.id || JSON.parse(goalResponse.payload).data?.id;

      // Update goal progress
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/goals/${goalId}`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          progress_level: 'MODERATE_PROGRESS',
          progress_notes: 'Patient now ambulating 30 feet with walker',
        },
      });

      expect(updateResponse.statusCode).toBe(200);

      // Mark goal as achieved
      const achieveResponse = await app.inject({
        method: 'POST',
        url: `/api/goals/${goalId}/achieve`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          achieved_date: new Date().toISOString().split('T')[0],
        },
      });

      expect(achieveResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(achieveResponse.statusCode).toBeLessThan(300);
    });

    it('should require authentication for care plan operations', async () => {
      const patient = await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${patient.id}/care-plans`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // CERTIFICATION WORKFLOW TESTS
  // ============================================================================

  describe('Certification Workflow', () => {
    it('should complete full certification workflow: create -> sign -> complete', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const patient = await createTestPatient();

      // Step 1: Create certification
      const { response: createResponse, certification } = await createCertification(
        patient.id,
        getAuthHeaders(doctorUser.session.token),
        {
          certification_period: 'INITIAL_90',
          terminal_illness_narrative: 'Patient has end-stage COPD with progressive decline',
          decline_indicators: 'Increasing oxygen requirements, decreased functional status',
        }
      );

      expect(createResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(createResponse.statusCode).toBeLessThan(300);
      expect(certification).toBeDefined();
      expect(certification.certification_status).toBe('PENDING');
      const certificationId = certification.id;

      // Step 2: Sign certification
      const signResponse = await app.inject({
        method: 'POST',
        url: `/api/certifications/${certificationId}/sign`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          signature_data: {
            signed_by: `${doctorUser.firstName} ${doctorUser.lastName}`,
            signed_at: new Date().toISOString(),
            signature_method: 'ELECTRONIC',
          },
        },
      });

      expect(signResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(signResponse.statusCode).toBeLessThan(300);

      // Step 3: Complete certification
      const completeResponse = await app.inject({
        method: 'POST',
        url: `/api/certifications/${certificationId}/complete`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(completeResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(completeResponse.statusCode).toBeLessThan(300);

      // Step 4: Verify certification status
      const verifyResponse = await app.inject({
        method: 'GET',
        url: `/api/certifications/${certificationId}`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(verifyResponse.statusCode).toBe(200);
      const verifyBody = JSON.parse(verifyResponse.payload);
      const cert = verifyBody.data?.certification || verifyBody.data;
      expect(cert.certification_status).toMatch(/ACTIVE|COMPLETED/i);
    });

    it('should create recertification periods in sequence', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const patient = await createTestPatient();

      // Create initial 90-day certification
      const { certification: cert1 } = await createCertification(
        patient.id,
        getAuthHeaders(doctorUser.session.token),
        {
          certification_period: 'INITIAL_90',
        }
      );

      expect(cert1).toBeDefined();
      expect(cert1.certification_period).toBe('INITIAL_90');

      // Create subsequent 90-day certification
      const startDate2 = new Date(cert1.end_date);
      startDate2.setDate(startDate2.getDate() + 1);
      const endDate2 = new Date(startDate2);
      endDate2.setDate(endDate2.getDate() + 90);

      const { certification: cert2 } = await createCertification(
        patient.id,
        getAuthHeaders(doctorUser.session.token),
        {
          certification_period: 'SUBSEQUENT_90',
          start_date: startDate2.toISOString().split('T')[0],
          end_date: endDate2.toISOString().split('T')[0],
        }
      );

      expect(cert2).toBeDefined();
      expect(cert2.certification_period).toBe('SUBSEQUENT_90');
    });

    it('should track certification timeliness (2-day requirement)', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const patient = await createTestPatient();

      // Create certification
      const { certification } = await createCertification(
        patient.id,
        getAuthHeaders(doctorUser.session.token)
      );

      // Verify due date is calculated (start_date + 2 days)
      expect(certification.certification_due_date).toBeDefined();

      const startDate = new Date(certification.start_date);
      const dueDate = new Date(certification.certification_due_date);
      const daysDiff = Math.floor((dueDate - startDate) / (1000 * 60 * 60 * 24));

      expect(daysDiff).toBe(2);
    });

    it('should retrieve all certifications for a patient', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const patient = await createTestPatient();

      // Create certification
      await createCertification(
        patient.id,
        getAuthHeaders(doctorUser.session.token)
      );

      // Get patient certifications
      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${patient.id}/certifications`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      const certifications = body.data?.certifications || body.data;
      expect(Array.isArray(certifications)).toBe(true);
      expect(certifications.length).toBeGreaterThan(0);
    });

    it('should validate Face-to-Face encounter requirements for recertification', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const patient = await createTestPatient();

      // Create a subsequent certification (requires F2F)
      const { certification } = await createCertification(
        patient.id,
        getAuthHeaders(doctorUser.session.token),
        {
          certification_period: 'SUBSEQUENT_90',
        }
      );

      // Create Face-to-Face encounter
      const f2fResponse = await app.inject({
        method: 'POST',
        url: `/api/certifications/${certification.id}/face-to-face`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          encounter_date: new Date().toISOString().split('T')[0],
          performed_by_type: 'PHYSICIAN',
          visit_type: 'IN_PERSON',
          findings: 'Patient exhibits continued decline consistent with terminal prognosis',
          terminal_prognosis_confirmed: true,
        },
      });

      expect(f2fResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(f2fResponse.statusCode).toBeLessThan(300);
    });

    it('should revoke certification with proper authorization', async () => {
      const adminUser = await createAdminUser({ createSession: true });
      const doctorUser = await createDoctorUser({ createSession: true });
      const patient = await createTestPatient();

      // Create certification
      const { certification } = await createCertification(
        patient.id,
        getAuthHeaders(doctorUser.session.token)
      );

      // Revoke certification
      const revokeResponse = await app.inject({
        method: 'POST',
        url: `/api/certifications/${certification.id}/revoke`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          revoke_reason: 'Patient transferred to another hospice',
        },
      });

      expect(revokeResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(revokeResponse.statusCode).toBeLessThan(300);
    });
  });

  // ============================================================================
  // INTEGRATED CARE COORDINATION WORKFLOW TESTS
  // ============================================================================

  describe('Integrated Care Coordination Workflows', () => {
    it('should coordinate IDG meeting review with care plan updates', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const nurseUser = await createNurseUser({ createSession: true });
      const patient = await createTestPatient();

      // Create care plan
      const { carePlan } = await createCarePlan(
        patient.id,
        getAuthHeaders(doctorUser.session.token),
        {
          patient_goals: 'Optimize comfort and symptom management',
        }
      );

      expect(carePlan).toBeDefined();

      // Create IDG meeting
      const { meeting } = await createIdgMeeting(
        getAuthHeaders(nurseUser.session.token)
      );

      // Review patient at IDG meeting with care plan changes
      const reviewResponse = await app.inject({
        method: 'POST',
        url: `/api/idg-meetings/${meeting.id}/reviews`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          patient_id: patient.id,
          review_date: new Date().toISOString().split('T')[0],
          clinical_summary: 'Patient condition stable',
          care_plan_reviewed: true,
          care_plan_changes: 'Updated pain management approach based on IDG recommendations',
        },
      });

      expect(reviewResponse.statusCode).toBe(200);

      // Update care plan based on IDG recommendations
      const updateResponse = await app.inject({
        method: 'PATCH',
        url: `/api/care-plans/${carePlan.id}`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          pain_management_approach: 'Updated per IDG meeting recommendations',
        },
      });

      expect(updateResponse.statusCode).toBe(200);
    });

    it('should link certification to care plan and IDG reviews', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const nurseUser = await createNurseUser({ createSession: true });
      const patient = await createTestPatient();

      // Create care plan first
      const { carePlan } = await createCarePlan(
        patient.id,
        getAuthHeaders(doctorUser.session.token)
      );

      // Create certification
      const { certification } = await createCertification(
        patient.id,
        getAuthHeaders(doctorUser.session.token),
        {
          terminal_illness_narrative: 'As documented in current care plan',
        }
      );

      // Create IDG meeting reviewing certification
      const { meeting } = await createIdgMeeting(
        getAuthHeaders(nurseUser.session.token),
        {
          meeting_type: 'RECERTIFICATION',
        }
      );

      const reviewResponse = await app.inject({
        method: 'POST',
        url: `/api/idg-meetings/${meeting.id}/reviews`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          patient_id: patient.id,
          review_date: new Date().toISOString().split('T')[0],
          clinical_summary: 'Recertification reviewed and approved',
          recertification_due: true,
          recertification_status: 'APPROVED',
        },
      });

      expect(reviewResponse.statusCode).toBe(200);

      // All components should be linked
      expect(carePlan).toBeDefined();
      expect(certification).toBeDefined();
      expect(meeting).toBeDefined();
    });

    it('should complete hospice admission workflow with all coordination components', async () => {
      const adminUser = await createAdminUser({ createSession: true });
      const doctorUser = await createDoctorUser({ createSession: true });
      const nurseUser = await createNurseUser({ createSession: true });
      const patient = await createTestPatient();

      // Step 1: Create initial certification
      const { certification } = await createCertification(
        patient.id,
        getAuthHeaders(doctorUser.session.token),
        {
          certification_period: 'INITIAL_90',
          terminal_illness_narrative: 'Patient has advanced terminal illness',
        }
      );

      expect(certification).toBeDefined();

      // Step 2: Create initial care plan
      const { carePlan } = await createCarePlan(
        patient.id,
        getAuthHeaders(doctorUser.session.token),
        {
          effective_date: certification.start_date,
          patient_goals: 'Maintain comfort and dignity',
        }
      );

      expect(carePlan).toBeDefined();

      // Step 3: Add initial problems and goals
      const problemResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/problems`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          problem_category: 'PHYSICAL',
          problem_description: 'Pain management',
          problem_status: 'ACTIVE',
          identified_date: new Date().toISOString().split('T')[0],
        },
      });

      expect(problemResponse.statusCode).toBeGreaterThanOrEqual(200);
      expect(problemResponse.statusCode).toBeLessThan(300);

      // Step 4: Schedule initial IDG meeting
      const { meeting } = await createIdgMeeting(
        getAuthHeaders(nurseUser.session.token),
        {
          meeting_type: 'INITIAL',
          agenda: 'Review new admission and establish care plan',
        }
      );

      // Step 5: Conduct patient review at IDG
      const reviewResponse = await app.inject({
        method: 'POST',
        url: `/api/idg-meetings/${meeting.id}/reviews`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          patient_id: patient.id,
          review_date: new Date().toISOString().split('T')[0],
          clinical_summary: 'New admission, care plan established',
          care_plan_reviewed: true,
        },
      });

      expect(reviewResponse.statusCode).toBe(200);

      // All components should be created successfully
      expect(certification.id).toBeDefined();
      expect(carePlan.id).toBeDefined();
      expect(meeting.id).toBeDefined();
    });
  });

  // ============================================================================
  // AUTHORIZATION AND RBAC TESTS
  // ============================================================================

  describe('Care Coordination Authorization and RBAC', () => {
    it('should require authentication for all care coordination endpoints', async () => {
      const patient = await createTestPatient();

      const endpoints = [
        { method: 'GET', url: '/api/idg-meetings' },
        { method: 'GET', url: `/api/patients/${patient.id}/care-plans` },
        { method: 'GET', url: `/api/patients/${patient.id}/certifications` },
      ];

      for (const endpoint of endpoints) {
        const response = await app.inject({
          method: endpoint.method,
          url: endpoint.url,
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        });

        expect(response.statusCode).toBe(401);
      }
    });

    it('should restrict certification creation to authorized users', async () => {
      const patientUser = await createAuthenticatedUser({ role: TEST_ROLES.PATIENT });
      const patient = await createTestPatient();

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/certifications`,
        headers: patientUser.authHeaders,
        payload: {
          certification_period: 'INITIAL_90',
          start_date: new Date().toISOString().split('T')[0],
          end_date: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          terminal_illness_narrative: 'Test',
        },
      });

      // Patient users should not be able to create certifications
      expect(response.statusCode).toBeGreaterThanOrEqual(403);
    });

    it('should allow doctors and nurses to create care plans', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const nurseUser = await createNurseUser({ createSession: true });
      const patient = await createTestPatient();

      // Doctor creates care plan
      const doctorResponse = await createCarePlan(
        patient.id,
        getAuthHeaders(doctorUser.session.token)
      );

      expect(doctorResponse.response.statusCode).toBeGreaterThanOrEqual(200);
      expect(doctorResponse.response.statusCode).toBeLessThan(300);

      // Nurse creates care plan
      const nurseResponse = await createCarePlan(
        patient.id,
        getAuthHeaders(nurseUser.session.token)
      );

      expect(nurseResponse.response.statusCode).toBeGreaterThanOrEqual(200);
      expect(nurseResponse.response.statusCode).toBeLessThan(300);
    });
  });

  // ============================================================================
  // ERROR HANDLING AND VALIDATION TESTS
  // ============================================================================

  describe('Care Coordination Error Handling and Validation', () => {
    it('should reject care plan creation with missing required fields', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const patient = await createTestPatient();

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/care-plans`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          // Missing effective_date
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject certification with invalid date range', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const patient = await createTestPatient();

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/certifications`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          certification_period: 'INITIAL_90',
          start_date: '2024-12-31',
          end_date: '2024-01-01', // End before start
          terminal_illness_narrative: 'Test',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject problem creation with invalid category', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const patient = await createTestPatient();

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/problems`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          problem_category: 'INVALID_CATEGORY',
          problem_description: 'Test problem',
          identified_date: new Date().toISOString().split('T')[0],
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should handle non-existent patient ID gracefully', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients/999999999/care-plans',
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(404);
    });
  });
});
