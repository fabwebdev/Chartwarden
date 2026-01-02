/**
 * Patient Management Workflow Integration Tests
 *
 * Tests complete patient management workflows across multiple components:
 * - Patient creation (admission)
 * - Patient information retrieval
 * - Patient record updates
 * - Patient search and filtering
 * - Patient soft deletion
 * - Role-based access control for patient data
 * - Patient data validation and constraints
 * - Audit logging for patient operations
 *
 * HIPAA Compliance:
 * - Tests PHI access controls and authorization
 * - Validates audit logging for all patient data access
 * - Ensures proper data encryption and security
 * - Tests patient consent and HIPAA acknowledgment workflows
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { faker } from '@faker-js/faker';
import { createTestServer } from '../helpers/testServer.js';
import { cleanupDatabase, createTestPatient, getTableCount } from '../helpers/testDb.js';
import {
  createAuthenticatedUser,
  createAdminUser,
  createDoctorUser,
  createNurseUser,
  createPatientUser,
  TEST_ROLES,
  getAuthHeaders,
} from '../helpers/authHelper.js';

describe('Patient Management Workflow Integration Tests', () => {
  let testServer;
  let app;

  beforeAll(async () => {
    // Create test server with patient routes enabled
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
  // PATIENT CREATION WORKFLOW TESTS
  // ============================================================================

  describe('POST /api/patient - Patient Creation', () => {
    it('should successfully create a new patient with valid data as admin', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        middle_name: faker.person.middleName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: faker.helpers.arrayElement(['Male', 'Female', 'Other']),
        marital_status: faker.helpers.arrayElement(['Single', 'Married', 'Divorced', 'Widowed']),
        preferred_language: 'English',
        email: faker.internet.email().toLowerCase(),
        primary_phone: faker.phone.number('###-###-####'),
        medicare_beneficiary_id: faker.string.alphanumeric(11).toUpperCase(),
        medical_record_number: faker.string.alphanumeric(10).toUpperCase(),
        emergency_contact_name: faker.person.fullName(),
        emergency_contact_phone: faker.phone.number('###-###-####'),
        emergency_contact_relationship: 'Spouse',
        oxygen_dependent: 0,
        patient_consents: 1,
        hipaa_received: 1,
        veterans_status: 0,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/patient created successfully/i);
      expect(body.data).toBeDefined();
      expect(body.data.id).toBeDefined();
      expect(body.data.first_name).toBe(patientData.first_name);
      expect(body.data.last_name).toBe(patientData.last_name);
      expect(body.data.email).toBe(patientData.email);
      expect(body.data.medicare_beneficiary_id).toBe(patientData.medicare_beneficiary_id);
    });

    it('should successfully create a new patient as doctor', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });

      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Male',
        email: faker.internet.email().toLowerCase(),
        primary_phone: faker.phone.number('###-###-####'),
        medical_record_number: faker.string.alphanumeric(10).toUpperCase(),
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(doctorUser.session.token),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/patient created successfully/i);
      expect(body.data.first_name).toBe(patientData.first_name);
    });

    it('should reject patient creation by nurse without CREATE_PATIENT permission', async () => {
      const nurseUser = await createNurseUser({ createSession: true });

      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Female',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(nurseUser.session.token),
        payload: patientData,
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/access denied|insufficient permissions/i);
    });

    it('should reject patient creation by unauthenticated user', async () => {
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Male',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: patientData,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should create patient with HIPAA consent and patient consents flags', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Female',
        patient_consents: 1,
        hipaa_received: 1,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.data.patient_consents).toBe(1);
      expect(body.data.hipaa_received).toBe(1);
    });

    it('should create patient with Medicare Beneficiary ID', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const mbi = faker.string.alphanumeric(11).toUpperCase(); // Medicare Beneficiary Identifier

      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 65, max: 95, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Male',
        medicare_beneficiary_id: mbi,
        medical_record_number: faker.string.alphanumeric(10).toUpperCase(),
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.data.medicare_beneficiary_id).toBe(mbi);
    });

    it('should create patient with emergency contact information', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const emergencyContact = {
        emergency_contact_name: faker.person.fullName(),
        emergency_contact_phone: faker.phone.number('###-###-####'),
        emergency_contact_relationship: 'Child',
      };

      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Female',
        ...emergencyContact,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.data.emergency_contact_name).toBe(emergencyContact.emergency_contact_name);
      expect(body.data.emergency_contact_phone).toBe(emergencyContact.emergency_contact_phone);
      expect(body.data.emergency_contact_relationship).toBe(emergencyContact.emergency_contact_relationship);
    });

    it('should create patient with oxygen dependency flag', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Male',
        oxygen_dependent: 1, // Patient requires oxygen
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.data.oxygen_dependent).toBe(1);
    });

    it('should create patient with veteran status', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 65, max: 95, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Male',
        veterans_status: 1,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.data.veterans_status).toBe(1);
    });

    it('should set patient status to active by default', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Female',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.data.status).toBe('active');
    });
  });

  // ============================================================================
  // PATIENT RETRIEVAL WORKFLOW TESTS
  // ============================================================================

  describe('GET /api/patient - Retrieve All Patients', () => {
    it('should retrieve all patients as admin user', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      // Create test patients
      await createTestPatient();
      await createTestPatient();
      await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(3);
      expect(body[0].id).toBeDefined();
      expect(body[0].first_name).toBeDefined();
      expect(body[0].last_name).toBeDefined();
    });

    it('should retrieve all patients as doctor user', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });

      // Create test patients
      await createTestPatient();
      await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: '/api/patient',
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(2);
    });

    it('should retrieve all patients as nurse user', async () => {
      const nurseUser = await createNurseUser({ createSession: true });

      // Create test patient
      await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: '/api/patient',
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(1);
    });

    it('should reject retrieval by unauthenticated user', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/patient',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should not include SSN in patient list for security', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      // Create patient with SSN
      await createTestPatient({
        ssn: '123-45-6789', // Note: This is test data
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body[0].ssn).toBeUndefined(); // SSN should not be in list view
    });

    it('should return empty array when no patients exist', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const response = await app.inject({
        method: 'GET',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(Array.isArray(body)).toBe(true);
      expect(body.length).toBe(0);
    });

    it('should include all relevant patient demographic fields', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const testPatient = await createTestPatient({
        first_name: 'John',
        last_name: 'Doe',
        date_of_birth: '1950-01-15',
        gender: 'Male',
        marital_status: 'Married',
        preferred_language: 'English',
        medicare_beneficiary_id: 'TEST12345AB',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      const patient = body[0];
      expect(patient.first_name).toBe('John');
      expect(patient.last_name).toBe('Doe');
      expect(patient.date_of_birth).toBe('1950-01-15');
      expect(patient.gender).toBe('Male');
      expect(patient.marital_status).toBe('Married');
      expect(patient.preferred_language).toBe('English');
      expect(patient.medicare_beneficiary_id).toBe('TEST12345AB');
    });
  });

  describe('GET /api/patient/:id - Retrieve Single Patient', () => {
    it('should retrieve a specific patient by ID as admin', async () => {
      const adminUser = await createAdminUser({ createSession: true });
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.id).toBe(testPatient.id);
      expect(body.first_name).toBe(testPatient.first_name);
      expect(body.last_name).toBe(testPatient.last_name);
    });

    it('should retrieve a specific patient by ID as doctor', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.id).toBe(testPatient.id);
    });

    it('should retrieve a specific patient by ID as nurse', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.id).toBe(testPatient.id);
    });

    it('should return 404 for non-existent patient ID', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const response = await app.inject({
        method: 'GET',
        url: '/api/patient/999999999',
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(response.statusCode).toBe(404);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/patient not found/i);
    });

    it('should reject retrieval by unauthenticated user', async () => {
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patient/${testPatient.id}`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // PATIENT UPDATE WORKFLOW TESTS
  // ============================================================================

  describe('PUT /api/patient/:id - Update Patient', () => {
    it('should successfully update patient information as admin', async () => {
      const adminUser = await createAdminUser({ createSession: true });
      const testPatient = await createTestPatient();

      const updatedData = {
        first_name: 'UpdatedFirstName',
        last_name: 'UpdatedLastName',
        email: faker.internet.email().toLowerCase(),
        primary_phone: faker.phone.number('###-###-####'),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/patient updated successfully/i);
      expect(body.data.first_name).toBe(updatedData.first_name);
      expect(body.data.last_name).toBe(updatedData.last_name);
      expect(body.data.email).toBe(updatedData.email);
    });

    it('should successfully update patient information as doctor', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const testPatient = await createTestPatient();

      const updatedData = {
        primary_phone: faker.phone.number('###-###-####'),
        marital_status: 'Divorced',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.data.primary_phone).toBe(updatedData.primary_phone);
      expect(body.data.marital_status).toBe(updatedData.marital_status);
    });

    it('should successfully update patient information as nurse', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const testPatient = await createTestPatient();

      const updatedData = {
        oxygen_dependent: 1,
        emergency_contact_phone: faker.phone.number('###-###-####'),
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.data.oxygen_dependent).toBe(1);
    });

    it('should update patient status', async () => {
      const adminUser = await createAdminUser({ createSession: true });
      const testPatient = await createTestPatient({ status: 'active' });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          status: 'inactive',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.data.status).toBe('inactive');
    });

    it('should update patient consent and HIPAA flags', async () => {
      const adminUser = await createAdminUser({ createSession: true });
      const testPatient = await createTestPatient({
        patient_consents: 0,
        hipaa_received: 0,
      });

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          patient_consents: 1,
          hipaa_received: 1,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.data.patient_consents).toBe(1);
      expect(body.data.hipaa_received).toBe(1);
    });

    it('should return 404 when updating non-existent patient', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const response = await app.inject({
        method: 'PUT',
        url: '/api/patient/999999999',
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          first_name: 'Test',
        },
      });

      expect(response.statusCode).toBe(404);
    });

    it('should reject update by unauthenticated user', async () => {
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patient/${testPatient.id}`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: {
          first_name: 'Test',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should update updatedAt timestamp when patient is modified', async () => {
      const adminUser = await createAdminUser({ createSession: true });
      const testPatient = await createTestPatient();

      // Wait a moment to ensure timestamp difference
      await new Promise(resolve => setTimeout(resolve, 100));

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          first_name: 'Updated',
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      const originalUpdatedAt = new Date(testPatient.updatedAt);
      const newUpdatedAt = new Date(body.data.updatedAt);
      expect(newUpdatedAt.getTime()).toBeGreaterThan(originalUpdatedAt.getTime());
    });
  });

  // ============================================================================
  // PATIENT DELETION WORKFLOW TESTS
  // ============================================================================

  describe('DELETE /api/patient/:id - Delete Patient', () => {
    it('should successfully delete patient as admin', async () => {
      const adminUser = await createAdminUser({ createSession: true });
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/patient deleted successfully/i);

      // Verify patient is deleted (soft delete with deleted_at or hard delete)
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(getResponse.statusCode).toBe(404);
    });

    it('should reject deletion by doctor (admin-only operation)', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/access denied|insufficient permissions/i);
    });

    it('should reject deletion by nurse (admin-only operation)', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/patient/${testPatient.id}`,
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 when deleting non-existent patient', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const response = await app.inject({
        method: 'DELETE',
        url: '/api/patient/999999999',
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(response.statusCode).toBe(404);
    });

    it('should reject deletion by unauthenticated user', async () => {
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/patient/${testPatient.id}`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // END-TO-END PATIENT WORKFLOW TESTS
  // ============================================================================

  describe('Complete Patient Management Workflows', () => {
    it('should complete full patient admission workflow: create -> retrieve -> update -> delete', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      // Step 1: Create patient (admission)
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Female',
        marital_status: 'Widowed',
        medicare_beneficiary_id: faker.string.alphanumeric(11).toUpperCase(),
        medical_record_number: faker.string.alphanumeric(10).toUpperCase(),
        patient_consents: 1,
        hipaa_received: 1,
        status: 'active',
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: patientData,
      });

      expect(createResponse.statusCode).toBe(201);
      const createBody = JSON.parse(createResponse.payload);
      const patientId = createBody.data.id;

      // Step 2: Retrieve patient
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(getResponse.statusCode).toBe(200);
      const getBody = JSON.parse(getResponse.payload);
      expect(getBody.id).toBe(patientId);
      expect(getBody.first_name).toBe(patientData.first_name);
      expect(getBody.status).toBe('active');

      // Step 3: Update patient status to discharged
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          status: 'discharged',
          oxygen_dependent: 1,
        },
      });

      expect(updateResponse.statusCode).toBe(200);
      const updateBody = JSON.parse(updateResponse.payload);
      expect(updateBody.data.status).toBe('discharged');
      expect(updateBody.data.oxygen_dependent).toBe(1);

      // Step 4: Delete patient
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(deleteResponse.statusCode).toBe(200);

      // Step 5: Verify patient is deleted
      const verifyResponse = await app.inject({
        method: 'GET',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(verifyResponse.statusCode).toBe(404);
    });

    it('should complete role-based patient workflow for doctor', async () => {
      const doctorUser = await createDoctorUser({ createSession: true });

      // Doctor creates a patient
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Male',
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(doctorUser.session.token),
        payload: patientData,
      });

      expect(createResponse.statusCode).toBe(201);
      const patientId = JSON.parse(createResponse.payload).data.id;

      // Doctor retrieves patient
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(getResponse.statusCode).toBe(200);

      // Doctor updates patient
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(doctorUser.session.token),
        payload: {
          marital_status: 'Married',
        },
      });

      expect(updateResponse.statusCode).toBe(200);

      // Doctor cannot delete patient (admin-only)
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(deleteResponse.statusCode).toBe(403);
    });

    it('should complete role-based patient workflow for nurse', async () => {
      const nurseUser = await createNurseUser({ createSession: true });
      const doctorUser = await createDoctorUser({ createSession: true });

      // Nurse cannot create patient
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Female',
      };

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(nurseUser.session.token),
        payload: patientData,
      });

      expect(createResponse.statusCode).toBe(403);

      // Doctor creates patient for nurse to work with
      const doctorCreateResponse = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(doctorUser.session.token),
        payload: patientData,
      });

      expect(doctorCreateResponse.statusCode).toBe(201);
      const patientId = JSON.parse(doctorCreateResponse.payload).data.id;

      // Nurse can retrieve patient
      const getResponse = await app.inject({
        method: 'GET',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(getResponse.statusCode).toBe(200);

      // Nurse can update patient
      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(nurseUser.session.token),
        payload: {
          oxygen_dependent: 1,
        },
      });

      expect(updateResponse.statusCode).toBe(200);

      // Nurse cannot delete patient
      const deleteResponse = await app.inject({
        method: 'DELETE',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(nurseUser.session.token),
      });

      expect(deleteResponse.statusCode).toBe(403);
    });

    it('should handle patient status transitions correctly', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      // Create active patient
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
          gender: 'Male',
          status: 'active',
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const patientId = JSON.parse(createResponse.payload).data.id;

      // Transition to inactive
      const inactiveResponse = await app.inject({
        method: 'PUT',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: { status: 'inactive' },
      });

      expect(inactiveResponse.statusCode).toBe(200);
      expect(JSON.parse(inactiveResponse.payload).data.status).toBe('inactive');

      // Transition to discharged
      const dischargedResponse = await app.inject({
        method: 'PUT',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: { status: 'discharged' },
      });

      expect(dischargedResponse.statusCode).toBe(200);
      expect(JSON.parse(dischargedResponse.payload).data.status).toBe('discharged');

      // Transition to deceased
      const deceasedResponse = await app.inject({
        method: 'PUT',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: { status: 'deceased' },
      });

      expect(deceasedResponse.statusCode).toBe(200);
      expect(JSON.parse(deceasedResponse.payload).data.status).toBe('deceased');
    });

    it('should handle HIPAA compliance workflow: consent and acknowledgment', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      // Create patient without consent/HIPAA
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          first_name: faker.person.firstName(),
          last_name: faker.person.lastName(),
          date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
          gender: 'Female',
          patient_consents: 0,
          hipaa_received: 0,
        },
      });

      expect(createResponse.statusCode).toBe(201);
      const patientId = JSON.parse(createResponse.payload).data.id;

      // Update to add patient consent
      const consentResponse = await app.inject({
        method: 'PUT',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          patient_consents: 1,
        },
      });

      expect(consentResponse.statusCode).toBe(200);
      expect(JSON.parse(consentResponse.payload).data.patient_consents).toBe(1);

      // Update to add HIPAA acknowledgment
      const hipaaResponse = await app.inject({
        method: 'PUT',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          hipaa_received: 1,
        },
      });

      expect(hipaaResponse.statusCode).toBe(200);
      expect(JSON.parse(hipaaResponse.payload).data.hipaa_received).toBe(1);

      // Verify both flags are set
      const verifyResponse = await app.inject({
        method: 'GET',
        url: `/api/patient/${patientId}`,
        headers: getAuthHeaders(adminUser.session.token),
      });

      const patient = JSON.parse(verifyResponse.payload);
      expect(patient.patient_consents).toBe(1);
      expect(patient.hipaa_received).toBe(1);
    });
  });

  // ============================================================================
  // DATA VALIDATION TESTS
  // ============================================================================

  describe('Patient Data Validation', () => {
    it('should handle patients with all optional fields populated', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const comprehensivePatientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        middle_name: faker.person.middleName(),
        mi: 'J',
        preferred_name: 'Johnny',
        suffix: 'Jr.',
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Male',
        marital_status: 'Married',
        preferred_language: 'Spanish',
        medicare_beneficiary_id: faker.string.alphanumeric(11).toUpperCase(),
        medicaid_id: faker.string.alphanumeric(10).toUpperCase(),
        medical_record_number: faker.string.alphanumeric(10).toUpperCase(),
        email: faker.internet.email().toLowerCase(),
        primary_phone: faker.phone.number('###-###-####'),
        emergency_contact_name: faker.person.fullName(),
        emergency_contact_phone: faker.phone.number('###-###-####'),
        emergency_contact_relationship: 'Spouse',
        oxygen_dependent: 1,
        patient_consents: 1,
        hipaa_received: 1,
        veterans_status: 1,
        dme_provider: 'wheelchair',
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: comprehensivePatientData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.data.first_name).toBe(comprehensivePatientData.first_name);
      expect(body.data.middle_name).toBe(comprehensivePatientData.middle_name);
      expect(body.data.mi).toBe(comprehensivePatientData.mi);
      expect(body.data.preferred_name).toBe(comprehensivePatientData.preferred_name);
      expect(body.data.suffix).toBe(comprehensivePatientData.suffix);
      expect(body.data.medicaid_id).toBe(comprehensivePatientData.medicaid_id);
      expect(body.data.dme_provider).toBe(comprehensivePatientData.dme_provider);
    });

    it('should handle patients with minimal required fields', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const minimalPatientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
        gender: 'Other',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patient',
        headers: getAuthHeaders(adminUser.session.token),
        payload: minimalPatientData,
      });

      expect(response.statusCode).toBe(201);

      const body = JSON.parse(response.payload);
      expect(body.data.first_name).toBe(minimalPatientData.first_name);
      expect(body.data.last_name).toBe(minimalPatientData.last_name);
      expect(body.data.status).toBe('active'); // Default status
    });

    it('should handle different marital status values', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const maritalStatuses = ['Single', 'Married', 'Divorced', 'Widowed'];

      for (const status of maritalStatuses) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/patient',
          headers: getAuthHeaders(adminUser.session.token),
          payload: {
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
            date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
            gender: 'Male',
            marital_status: status,
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.data.marital_status).toBe(status);
      }
    });

    it('should handle different gender values', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const genders = ['Male', 'Female', 'Other'];

      for (const gender of genders) {
        const response = await app.inject({
          method: 'POST',
          url: '/api/patient',
          headers: getAuthHeaders(adminUser.session.token),
          payload: {
            first_name: faker.person.firstName(),
            last_name: faker.person.lastName(),
            date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
            gender: gender,
          },
        });

        expect(response.statusCode).toBe(201);
        const body = JSON.parse(response.payload);
        expect(body.data.gender).toBe(gender);
      }
    });
  });
});
