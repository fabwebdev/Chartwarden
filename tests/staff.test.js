/**
 * Staff Management Module Tests
 * Tests for staff profiles, credentials, caseload, schedule, productivity, and training
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import {
  mockUser,
  mockPatient,
  validStaffProfile,
  invalidStaffProfile,
  partTimeStaff,
  terminatedStaff,
  validRNLicense,
  expiringCredential,
  expiredCredential,
  backgroundCheck,
  invalidCredential,
  primaryNurseAssignment,
  secondaryNurseAssignment,
  socialWorkerAssignment,
  transferredAssignment,
  invalidAssignment,
  regularShift,
  onCallSchedule,
  ptoRequest,
  approvedPTO,
  trainingSchedule,
  invalidSchedule,
  weeklyProductivity,
  monthlyProductivity,
  invalidProductivity,
  annualHIPAATraining,
  scheduledTraining,
  failedTraining,
  cprCertification,
  invalidTraining,
  mockRequest,
  mockReply,
  expectedStaffResponse,
  expectedCredentialResponse,
  expectedAssignmentResponse,
  expectedScheduleResponse,
  expectedProductivityResponse,
  expectedTrainingResponse
} from './fixtures/staff.fixtures.js';

describe('Staff Management Controller', () => {
  let db;
  let controller;
  let testStaffId;

  beforeAll(async () => {
    // Setup: Import controller and initialize test database
    // const { db: database } = await import('../src/config/db.drizzle.js');
    // db = database;
    // controller = (await import('../src/controllers/Staff.controller.js')).default;

    // Create test staff member
    // testStaffId = await createTestStaff(db, validStaffProfile);
  });

  afterAll(async () => {
    // Cleanup: Remove test data
    // await cleanupTestData(db, testStaffId);
  });

  // ============================================================================
  // STAFF PROFILE TESTS
  // ============================================================================

  describe('POST /staff', () => {
    it('should create full-time RN staff profile', async () => {
      const request = mockRequest(validStaffProfile);
      const reply = mockReply();

      // await controller.createStaff(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(expectedStaffResponse);
    });

    it('should create part-time social worker profile', async () => {
      const request = mockRequest(partTimeStaff);
      const reply = mockReply();

      // await controller.createStaff(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should reject profile without required fields', async () => {
      const request = mockRequest(invalidStaffProfile);
      const reply = mockReply();

      // await controller.createStaff(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 400,
          message: expect.stringContaining('Missing required fields')
        })
      );
    });

    it('should create terminated staff profile with termination date', async () => {
      const request = mockRequest(terminatedStaff);
      const reply = mockReply();

      // await controller.createStaff(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });
  });

  describe('GET /staff', () => {
    it('should return all active staff', async () => {
      const request = mockRequest({}, {}, { status: 'ACTIVE' });
      const reply = mockReply();

      // await controller.getAllStaff(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          data: expect.any(Array)
        })
      );
    });

    it('should filter staff by department', async () => {
      const request = mockRequest({}, {}, { department: 'NURSING' });
      const reply = mockReply();

      // await controller.getAllStaff(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });

    it('should filter staff by job title', async () => {
      const request = mockRequest({}, {}, { job_title: 'Registered Nurse' });
      const reply = mockReply();

      // await controller.getAllStaff(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });

    it('should support pagination', async () => {
      const request = mockRequest({}, {}, { limit: 10, offset: 0 });
      const reply = mockReply();

      // await controller.getAllStaff(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });
  });

  describe('GET /staff/:id', () => {
    it('should return staff member by ID', async () => {
      const request = mockRequest({}, { id: testStaffId });
      const reply = mockReply();

      // await controller.getStaffById(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          data: expect.objectContaining({
            id: testStaffId
          })
        })
      );
    });

    it('should return 404 for non-existent staff', async () => {
      const request = mockRequest({}, { id: 99999 });
      const reply = mockReply();

      // await controller.getStaffById(request, reply);

      expect(reply.code).toHaveBeenCalledWith(404);
    });
  });

  describe('PATCH /staff/:id', () => {
    it('should update staff profile', async () => {
      const request = mockRequest(
        { phone: '555-9999', max_patient_load: 20 },
        { id: testStaffId }
      );
      const reply = mockReply();

      // await controller.updateStaff(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          message: 'Staff profile updated successfully'
        })
      );
    });

    it('should update employment status to terminated', async () => {
      const request = mockRequest(
        { employment_status: 'TERMINATED', termination_date: '2024-12-31' },
        { id: testStaffId }
      );
      const reply = mockReply();

      // await controller.updateStaff(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });
  });

  // ============================================================================
  // CREDENTIAL TESTS
  // ============================================================================

  describe('POST /staff/:id/credentials', () => {
    it('should add RN license credential', async () => {
      const request = mockRequest(validRNLicense, { id: testStaffId });
      const reply = mockReply();

      // await controller.addCredential(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(expectedCredentialResponse);
    });

    it('should add CPR certification', async () => {
      const request = mockRequest(expiringCredential, { id: testStaffId });
      const reply = mockReply();

      // await controller.addCredential(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should add background check', async () => {
      const request = mockRequest(backgroundCheck, { id: testStaffId });
      const reply = mockReply();

      // await controller.addCredential(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should reject credential without required fields', async () => {
      const request = mockRequest(invalidCredential, { id: testStaffId });
      const reply = mockReply();

      // await controller.addCredential(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /staff/:id/credentials', () => {
    it('should return all credentials for staff member', async () => {
      const request = mockRequest({}, { id: testStaffId });
      const reply = mockReply();

      // await controller.getStaffCredentials(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          data: expect.any(Array)
        })
      );
    });

    it('should order credentials by expiration date', async () => {
      const request = mockRequest({}, { id: testStaffId });
      const reply = mockReply();

      // await controller.getStaffCredentials(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      // Verify credentials are sorted by expiration_date
    });
  });

  describe('GET /staff/credentials/expiring', () => {
    it('should return credentials expiring within 30 days (default)', async () => {
      const request = mockRequest({}, {}, {});
      const reply = mockReply();

      // await controller.getExpiringCredentials(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          threshold_days: 30
        })
      );
    });

    it('should return credentials expiring within custom threshold', async () => {
      const request = mockRequest({}, {}, { days: 60 });
      const reply = mockReply();

      // await controller.getExpiringCredentials(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          threshold_days: 60
        })
      );
    });

    it('should include staff information with credentials', async () => {
      const request = mockRequest({}, {}, {});
      const reply = mockReply();

      // await controller.getExpiringCredentials(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      // Verify staff profile is joined
    });
  });

  // ============================================================================
  // CASELOAD TESTS
  // ============================================================================

  describe('POST /staff/:id/caseload', () => {
    it('should assign patient as primary nurse', async () => {
      const request = mockRequest(primaryNurseAssignment, { id: testStaffId });
      const reply = mockReply();

      // await controller.assignPatient(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(expectedAssignmentResponse);
    });

    it('should assign patient as secondary nurse', async () => {
      const request = mockRequest(secondaryNurseAssignment, { id: testStaffId });
      const reply = mockReply();

      // await controller.assignPatient(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should assign patient to social worker', async () => {
      const request = mockRequest(socialWorkerAssignment, { id: testStaffId });
      const reply = mockReply();

      // await controller.assignPatient(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should reject assignment without required fields', async () => {
      const request = mockRequest(invalidAssignment, { id: testStaffId });
      const reply = mockReply();

      // await controller.assignPatient(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /staff/:id/caseload', () => {
    it('should return active patient assignments', async () => {
      const request = mockRequest({}, { id: testStaffId }, { status: 'ACTIVE' });
      const reply = mockReply();

      // await controller.getStaffCaseload(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      expect(reply.send).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 200,
          data: expect.any(Array)
        })
      );
    });

    it('should include patient information', async () => {
      const request = mockRequest({}, { id: testStaffId });
      const reply = mockReply();

      // await controller.getStaffCaseload(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      // Verify patient data is joined
    });

    it('should order primary assignments first', async () => {
      const request = mockRequest({}, { id: testStaffId });
      const reply = mockReply();

      // await controller.getStaffCaseload(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      // Verify is_primary ordering
    });
  });

  // ============================================================================
  // SCHEDULE TESTS
  // ============================================================================

  describe('POST /staff/:id/schedule', () => {
    it('should create regular shift schedule', async () => {
      const request = mockRequest(regularShift, { id: testStaffId });
      const reply = mockReply();

      // await controller.createSchedule(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(expectedScheduleResponse);
    });

    it('should create on-call schedule', async () => {
      const request = mockRequest(onCallSchedule, { id: testStaffId });
      const reply = mockReply();

      // await controller.createSchedule(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should create PTO request', async () => {
      const request = mockRequest(ptoRequest, { id: testStaffId });
      const reply = mockReply();

      // await controller.createSchedule(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should create training schedule', async () => {
      const request = mockRequest(trainingSchedule, { id: testStaffId });
      const reply = mockReply();

      // await controller.createSchedule(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should reject schedule without required fields', async () => {
      const request = mockRequest(invalidSchedule, { id: testStaffId });
      const reply = mockReply();

      // await controller.createSchedule(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /staff/:id/schedule', () => {
    it('should return schedule entries', async () => {
      const request = mockRequest({}, { id: testStaffId });
      const reply = mockReply();

      // await controller.getStaffSchedule(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });

    it('should filter by date range', async () => {
      const request = mockRequest(
        {},
        { id: testStaffId },
        { start_date: '2024-12-01', end_date: '2024-12-31' }
      );
      const reply = mockReply();

      // await controller.getStaffSchedule(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });

    it('should order by date and time', async () => {
      const request = mockRequest({}, { id: testStaffId });
      const reply = mockReply();

      // await controller.getStaffSchedule(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      // Verify ordering by shift_date, start_time
    });
  });

  // ============================================================================
  // PRODUCTIVITY TESTS
  // ============================================================================

  describe('POST /staff/:id/productivity', () => {
    it('should record weekly productivity metrics', async () => {
      const request = mockRequest(weeklyProductivity, { id: testStaffId });
      const reply = mockReply();

      // await controller.recordProductivity(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(expectedProductivityResponse);
    });

    it('should record monthly productivity metrics', async () => {
      const request = mockRequest(monthlyProductivity, { id: testStaffId });
      const reply = mockReply();

      // await controller.recordProductivity(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should reject metrics without required fields', async () => {
      const request = mockRequest(invalidProductivity, { id: testStaffId });
      const reply = mockReply();

      // await controller.recordProductivity(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /staff/:id/productivity', () => {
    it('should return productivity metrics', async () => {
      const request = mockRequest({}, { id: testStaffId });
      const reply = mockReply();

      // await controller.getStaffProductivity(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });

    it('should filter by period type', async () => {
      const request = mockRequest({}, { id: testStaffId }, { period_type: 'WEEKLY' });
      const reply = mockReply();

      // await controller.getStaffProductivity(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });

    it('should filter by date range', async () => {
      const request = mockRequest(
        {},
        { id: testStaffId },
        { start_date: '2024-12-01', end_date: '2024-12-31' }
      );
      const reply = mockReply();

      // await controller.getStaffProductivity(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });
  });

  // ============================================================================
  // TRAINING TESTS
  // ============================================================================

  describe('POST /staff/:id/training', () => {
    it('should add completed HIPAA training', async () => {
      const request = mockRequest(annualHIPAATraining, { id: testStaffId });
      const reply = mockReply();

      // await controller.addTraining(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
      expect(reply.send).toHaveBeenCalledWith(expectedTrainingResponse);
    });

    it('should add scheduled training', async () => {
      const request = mockRequest(scheduledTraining, { id: testStaffId });
      const reply = mockReply();

      // await controller.addTraining(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should add CPR certification', async () => {
      const request = mockRequest(cprCertification, { id: testStaffId });
      const reply = mockReply();

      // await controller.addTraining(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should add failed training with retraining flag', async () => {
      const request = mockRequest(failedTraining, { id: testStaffId });
      const reply = mockReply();

      // await controller.addTraining(request, reply);

      expect(reply.code).toHaveBeenCalledWith(201);
    });

    it('should reject training without required fields', async () => {
      const request = mockRequest(invalidTraining, { id: testStaffId });
      const reply = mockReply();

      // await controller.addTraining(request, reply);

      expect(reply.code).toHaveBeenCalledWith(400);
    });
  });

  describe('GET /staff/:id/training', () => {
    it('should return all training records', async () => {
      const request = mockRequest({}, { id: testStaffId });
      const reply = mockReply();

      // await controller.getStaffTraining(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });

    it('should filter by training status', async () => {
      const request = mockRequest({}, { id: testStaffId }, { status: 'COMPLETED' });
      const reply = mockReply();

      // await controller.getStaffTraining(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });

    it('should filter by training type', async () => {
      const request = mockRequest(
        {},
        { id: testStaffId },
        { training_type: 'ANNUAL_COMPLIANCE' }
      );
      const reply = mockReply();

      // await controller.getStaffTraining(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
    });

    it('should order by training date descending', async () => {
      const request = mockRequest({}, { id: testStaffId });
      const reply = mockReply();

      // await controller.getStaffTraining(request, reply);

      expect(reply.code).toHaveBeenCalledWith(200);
      // Verify ordering by training_date DESC
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe('Staff Management Integration', () => {
    it('should create complete staff profile with all related data', async () => {
      // 1. Create staff profile
      // 2. Add credentials (RN license, CPR, background check)
      // 3. Assign patients
      // 4. Create schedule entries
      // 5. Record productivity
      // 6. Add training records
      // Verify all data is linked correctly
    });

    it('should track credential expiration lifecycle', async () => {
      // 1. Add credential with expiration date
      // 2. Query expiring credentials
      // 3. Verify alert threshold
      // 4. Update credential status to EXPIRED
      // 5. Renew credential
    });

    it('should manage caseload transfers', async () => {
      // 1. Assign patient to staff A
      // 2. Transfer patient to staff B
      // 3. Verify assignment_end_date on staff A
      // 4. Verify new assignment for staff B
      // 5. Check transfer_reason recorded
    });
  });
});
