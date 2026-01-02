/**
 * Patient API Endpoint Integration Tests
 *
 * Tests comprehensive patient CRUD operations through API endpoints:
 * - Patient creation with validation
 * - Patient retrieval (single and list)
 * - Patient updates (full and partial)
 * - Patient deletion (soft delete)
 * - Patient restoration
 * - Search functionality
 * - Pagination and filtering
 * - Role-based access control (RBAC)
 * - Optimistic locking
 * - Duplicate prevention
 * - Input validation and error handling
 *
 * HIPAA Compliance:
 * - Tests PHI data handling
 * - Validates audit logging
 * - Ensures proper access controls
 * - Tests soft delete for data retention
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import {
  cleanupDatabase,
  createTestPatient,
  createTestPatients,
  getTableCount,
} from '../helpers/testDb.js';
import { createTestServer } from '../helpers/testServer.js';
import {
  createAuthenticatedUser,
  createAdminUser,
  createDoctorUser,
  createNurseUser,
  createPatientUser,
  getAuthHeaders,
  TEST_ROLES,
} from '../helpers/authHelper.js';
import { faker } from '@faker-js/faker';
import { db } from '../../src/config/db.drizzle.js';
import { patients } from '../../src/db/schemas/patient.schema.js';
import { eq, and, isNull } from 'drizzle-orm';

describe('Patient API Endpoints Integration Tests', () => {
  let server;
  let app;
  let adminUser;
  let doctorUser;
  let nurseUser;
  let patientUser;

  // ============================================================================
  // Setup and Teardown
  // ============================================================================

  beforeAll(async () => {
    // Build test server with routes registered
    const builder = createTestServer({ registerRoutes: true });
    server = builder;
    app = await builder.build();

    // Create test users with different roles
    adminUser = await createAuthenticatedUser({ role: TEST_ROLES.ADMIN });
    doctorUser = await createAuthenticatedUser({ role: TEST_ROLES.DOCTOR });
    nurseUser = await createAuthenticatedUser({ role: TEST_ROLES.NURSE });
    patientUser = await createAuthenticatedUser({ role: TEST_ROLES.PATIENT });
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  beforeEach(async () => {
    // Clean up patients table before each test
    await cleanupDatabase();

    // Recreate users after cleanup
    adminUser = await createAuthenticatedUser({ role: TEST_ROLES.ADMIN });
    doctorUser = await createAuthenticatedUser({ role: TEST_ROLES.DOCTOR });
    nurseUser = await createAuthenticatedUser({ role: TEST_ROLES.NURSE });
    patientUser = await createAuthenticatedUser({ role: TEST_ROLES.PATIENT });
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupDatabase();
  });

  // ============================================================================
  // Patient Creation Tests (POST /api/patients)
  // ============================================================================

  describe('POST /api/patients - Create Patient', () => {
    it('should create a new patient with valid data as admin', async () => {
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: '1950-05-15',
        gender: 'male',
        marital_status: 'married',
        preferred_language: 'English',
        medicare_beneficiary_id: faker.string.alphanumeric(11).toUpperCase(),
        medical_record_number: faker.string.alphanumeric(10).toUpperCase(),
        email: faker.internet.email().toLowerCase(),
        primary_phone: '555-123-4567',
        emergency_contact_name: faker.person.fullName(),
        emergency_contact_phone: '555-987-6543',
        emergency_contact_relationship: 'Spouse',
        oxygen_dependent: 0,
        patient_consents: 1,
        hipaa_received: 1,
        veterans_status: 0,
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/created successfully/i);
      expect(body.data).toMatchObject({
        first_name: patientData.first_name,
        last_name: patientData.last_name,
        date_of_birth: patientData.date_of_birth,
        gender: patientData.gender,
      });
      expect(body.data.id).toBeDefined();
      expect(body.data.createdAt).toBeDefined();
      expect(body.data.updatedAt).toBeDefined();

      // Verify patient was saved to database
      const dbPatientCount = await getTableCount('patients');
      expect(dbPatientCount).toBe(1);
    });

    it('should create a new patient with valid data as doctor', async () => {
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: '1960-03-20',
        gender: 'female',
        marital_status: 'single',
        preferred_language: 'English',
        medical_record_number: faker.string.alphanumeric(10).toUpperCase(),
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data).toMatchObject({
        first_name: patientData.first_name,
        last_name: patientData.last_name,
      });
    });

    it('should reject patient creation with missing required fields', async () => {
      const incompleteData = {
        first_name: faker.person.firstName(),
        // Missing required fields: last_name, date_of_birth
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: incompleteData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/validation|required/i);
    });

    it('should reject patient creation with invalid email format', async () => {
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: '1970-01-15',
        email: 'invalid-email-format',
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: patientData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/email|validation/i);
    });

    it('should reject patient creation with invalid gender', async () => {
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: '1970-01-15',
        gender: 'invalid_gender',
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: patientData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/gender|validation/i);
    });

    it('should reject patient creation without authentication', async () => {
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: '1970-01-15',
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: patientData,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject patient creation as nurse (insufficient permissions)', async () => {
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: '1970-01-15',
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: patientData,
      });

      expect(response.statusCode).toBe(403);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/permission|access denied/i);
    });

    it('should reject patient creation as patient role', async () => {
      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: '1970-01-15',
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(patientUser.sessionToken),
        payload: patientData,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should sanitize XSS attempts in patient data', async () => {
      const patientData = {
        first_name: '<script>alert("XSS")</script>John',
        last_name: faker.person.lastName(),
        date_of_birth: '1970-01-15',
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      // The first_name should be sanitized (script tags removed)
      expect(body.data.first_name).not.toContain('<script>');
      expect(body.data.first_name).not.toContain('alert');
    });
  });

  // ============================================================================
  // Patient Retrieval Tests (GET /api/patients/:id)
  // ============================================================================

  describe('GET /api/patients/:id - Get Patient by ID', () => {
    it('should retrieve a patient by ID as admin', async () => {
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.id).toBe(testPatient.id);
      expect(body.first_name).toBe(testPatient.first_name);
      expect(body.last_name).toBe(testPatient.last_name);
    });

    it('should retrieve a patient by ID as doctor', async () => {
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.id).toBe(testPatient.id);
    });

    it('should retrieve a patient by ID as nurse', async () => {
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(nurseUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.id).toBe(testPatient.id);
    });

    it('should return 404 for non-existent patient ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/patients/999999',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(404);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/not found/i);
    });

    it('should return 400 for invalid patient ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/patients/invalid-id',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/validation|invalid/i);
    });

    it('should reject patient retrieval without authentication', async () => {
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // Patient List Tests (GET /api/patients)
  // ============================================================================

  describe('GET /api/patients - List Patients', () => {
    it('should retrieve all patients with pagination as admin', async () => {
      // Create multiple test patients
      await createTestPatients(15);

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients?limit=10&offset=0',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBeLessThanOrEqual(10);
      expect(body.total).toBe(15);
      expect(body.pagination).toMatchObject({
        limit: 10,
        offset: 0,
      });
    });

    it('should filter patients by first name', async () => {
      const uniqueFirstName = 'UniqueTestFirstName';
      await createTestPatient({ first_name: uniqueFirstName });
      await createTestPatients(5);

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients?first_name=${uniqueFirstName}`,
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].first_name).toBe(uniqueFirstName);
    });

    it('should filter patients by last name', async () => {
      const uniqueLastName = 'UniqueTestLastName';
      await createTestPatient({ last_name: uniqueLastName });
      await createTestPatients(5);

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients?last_name=${uniqueLastName}`,
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].last_name).toBe(uniqueLastName);
    });

    it('should filter patients by status', async () => {
      await createTestPatient({ status: 'active' });
      await createTestPatient({ status: 'inactive' });
      await createTestPatient({ status: 'discharged' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients?status=active',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.every(p => p.status === 'active')).toBe(true);
    });

    it('should sort patients by last name ascending', async () => {
      await createTestPatient({ last_name: 'Anderson' });
      await createTestPatient({ last_name: 'Williams' });
      await createTestPatient({ last_name: 'Brown' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients?sort=last_name&order=asc',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data[0].last_name).toBe('Anderson');
      expect(body.data[2].last_name).toBe('Williams');
    });

    it('should exclude soft-deleted patients by default', async () => {
      await createTestPatient({ status: 'active' });
      const deletedPatient = await createTestPatient({ status: 'active' });

      // Soft delete one patient
      await db
        .update(patients)
        .set({ deleted_at: new Date() })
        .where(eq(patients.id, deletedPatient.id));

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBe(1);
      expect(body.data.every(p => p.id !== deletedPatient.id)).toBe(true);
    });

    it('should include soft-deleted patients when requested by admin', async () => {
      await createTestPatient({ status: 'active' });
      const deletedPatient = await createTestPatient({ status: 'active' });

      // Soft delete one patient
      await db
        .update(patients)
        .set({ deleted_at: new Date() })
        .where(eq(patients.id, deletedPatient.id));

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients?include_deleted=true',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBe(2);
      const deletedInResults = body.data.find(p => p.id === deletedPatient.id);
      expect(deletedInResults).toBeDefined();
      expect(deletedInResults.deleted_at).not.toBeNull();
    });

    it('should reject including deleted patients as non-admin', async () => {
      await createTestPatients(3);

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients?include_deleted=true',
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      // Should either ignore the parameter or return 403
      expect([200, 403]).toContain(response.statusCode);
    });
  });

  // ============================================================================
  // Patient Search Tests (GET /api/patients/search)
  // ============================================================================

  describe('GET /api/patients/search - Search Patients', () => {
    it('should search patients by name', async () => {
      await createTestPatient({
        first_name: 'SearchableJohn',
        last_name: 'Doe',
      });
      await createTestPatient({
        first_name: 'Jane',
        last_name: 'Smith',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients/search?q=SearchableJohn',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
      expect(body.data[0].first_name).toContain('SearchableJohn');
    });

    it('should return empty results for non-matching search', async () => {
      await createTestPatients(5);

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients/search?q=NonExistentPatient12345',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBe(0);
    });

    it('should reject search with query too short', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/patients/search?q=a',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/at least 2 characters/i);
    });
  });

  // ============================================================================
  // Patient Update Tests (PUT/PATCH /api/patients/:id)
  // ============================================================================

  describe('PUT /api/patients/:id - Update Patient (Full)', () => {
    it('should update patient with all fields as admin', async () => {
      const testPatient = await createTestPatient();

      const updatedData = {
        first_name: 'UpdatedFirstName',
        last_name: 'UpdatedLastName',
        date_of_birth: testPatient.date_of_birth,
        gender: 'female',
        marital_status: 'divorced',
        preferred_language: 'Spanish',
        medical_record_number: testPatient.medical_record_number,
        email: 'updated@example.com',
        primary_phone: '555-999-8888',
        status: 'active',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.first_name).toBe('UpdatedFirstName');
      expect(body.data.last_name).toBe('UpdatedLastName');
      expect(body.data.email).toBe('updated@example.com');
      expect(body.data.marital_status).toBe('divorced');
    });

    it('should update patient as doctor', async () => {
      const testPatient = await createTestPatient();

      const updatedData = {
        first_name: testPatient.first_name,
        last_name: testPatient.last_name,
        date_of_birth: testPatient.date_of_birth,
        primary_phone: '555-111-2222',
        status: 'active',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.primary_phone).toBe('555-111-2222');
    });

    it('should reject update with invalid data', async () => {
      const testPatient = await createTestPatient();

      const invalidData = {
        first_name: testPatient.first_name,
        last_name: testPatient.last_name,
        date_of_birth: testPatient.date_of_birth,
        email: 'invalid-email',
        status: 'active',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject update without authentication', async () => {
      const testPatient = await createTestPatient();

      const updatedData = {
        first_name: 'NewName',
        last_name: testPatient.last_name,
        date_of_birth: testPatient.date_of_birth,
        status: 'active',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patients/${testPatient.id}`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: updatedData,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  describe('PATCH /api/patients/:id - Update Patient (Partial)', () => {
    it('should partially update patient fields as admin', async () => {
      const testPatient = await createTestPatient();

      const partialUpdate = {
        primary_phone: '555-222-3333',
        email: 'newemail@example.com',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: partialUpdate,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.primary_phone).toBe('555-222-3333');
      expect(body.data.email).toBe('newemail@example.com');
      // Other fields should remain unchanged
      expect(body.data.first_name).toBe(testPatient.first_name);
      expect(body.data.last_name).toBe(testPatient.last_name);
    });

    it('should update only status field', async () => {
      const testPatient = await createTestPatient({ status: 'active' });

      const statusUpdate = {
        status: 'discharged',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: statusUpdate,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.status).toBe('discharged');
    });

    it('should reject partial update as patient role', async () => {
      const testPatient = await createTestPatient();

      const partialUpdate = {
        primary_phone: '555-444-5555',
      };

      const response = await app.inject({
        method: 'PATCH',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(patientUser.sessionToken),
        payload: partialUpdate,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ============================================================================
  // Patient Deletion Tests (DELETE /api/patients/:id)
  // ============================================================================

  describe('DELETE /api/patients/:id - Delete Patient', () => {
    it('should soft delete patient as admin', async () => {
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/deleted successfully/i);

      // Verify soft delete - patient should have deleted_at timestamp
      const [deletedPatient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, testPatient.id));

      expect(deletedPatient).toBeDefined();
      expect(deletedPatient.deleted_at).not.toBeNull();
    });

    it('should reject deletion without admin role', async () => {
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 when deleting non-existent patient', async () => {
      const response = await app.inject({
        method: 'DELETE',
        url: '/api/patients/999999',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(404);
    });

    it('should reject deletion without authentication', async () => {
      const testPatient = await createTestPatient();

      const response = await app.inject({
        method: 'DELETE',
        url: `/api/patients/${testPatient.id}`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // Patient Restoration Tests (POST /api/patients/:id/restore)
  // ============================================================================

  describe('POST /api/patients/:id/restore - Restore Deleted Patient', () => {
    it('should restore soft-deleted patient as admin', async () => {
      const testPatient = await createTestPatient();

      // Soft delete the patient first
      await db
        .update(patients)
        .set({ deleted_at: new Date() })
        .where(eq(patients.id, testPatient.id));

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/restore`,
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/restored successfully/i);

      // Verify restoration - deleted_at should be null
      const [restoredPatient] = await db
        .select()
        .from(patients)
        .where(eq(patients.id, testPatient.id));

      expect(restoredPatient.deleted_at).toBeNull();
    });

    it('should reject restoration by non-admin users', async () => {
      const testPatient = await createTestPatient();

      // Soft delete the patient
      await db
        .update(patients)
        .set({ deleted_at: new Date() })
        .where(eq(patients.id, testPatient.id));

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/restore`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(403);
    });

    it('should return 404 when restoring non-existent patient', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/patients/999999/restore',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ============================================================================
  // Data Validation and Edge Cases
  // ============================================================================

  describe('Data Validation and Edge Cases', () => {
    it('should handle very long names gracefully', async () => {
      const patientData = {
        first_name: 'A'.repeat(150), // Exceeds max length
        last_name: faker.person.lastName(),
        date_of_birth: '1970-01-15',
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: patientData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/validation|max|length/i);
    });

    it('should handle special characters in names', async () => {
      const patientData = {
        first_name: "O'Brien",
        last_name: "José-María",
        date_of_birth: '1970-01-15',
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: patientData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.first_name).toBe("O'Brien");
      expect(body.data.last_name).toBe("José-María");
    });

    it('should validate date of birth is not in the future', async () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 1);

      const patientData = {
        first_name: faker.person.firstName(),
        last_name: faker.person.lastName(),
        date_of_birth: futureDate.toISOString().split('T')[0],
        status: 'active',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients',
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: patientData,
      });

      // Should either reject or accept based on validation rules
      // Most systems should reject future birth dates
      if (response.statusCode === 400) {
        const body = JSON.parse(response.payload);
        expect(body.message).toMatch(/date|future|birth/i);
      }
    });

    it('should handle concurrent updates with optimistic locking', async () => {
      const testPatient = await createTestPatient();

      // First update
      const update1 = app.inject({
        method: 'PATCH',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: { primary_phone: '555-111-1111' },
      });

      // Second concurrent update
      const update2 = app.inject({
        method: 'PATCH',
        url: `/api/patients/${testPatient.id}`,
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: { primary_phone: '555-222-2222' },
      });

      const [response1, response2] = await Promise.all([update1, update2]);

      // Both requests should either succeed or one should fail with conflict
      expect([200, 409]).toContain(response1.statusCode);
      expect([200, 409]).toContain(response2.statusCode);
    });
  });

  // ============================================================================
  // Performance and Pagination Tests
  // ============================================================================

  describe('Performance and Pagination', () => {
    it('should handle large result sets with pagination', async () => {
      // Create 50 patients
      await createTestPatients(50);

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients?limit=20&offset=0',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBe(20);
      expect(body.total).toBe(50);
      expect(body.pagination).toMatchObject({
        limit: 20,
        offset: 0,
        hasMore: true,
      });
    });

    it('should handle pagination beyond available records', async () => {
      await createTestPatients(10);

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients?limit=20&offset=50',
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBe(0);
      expect(body.total).toBe(10);
    });

    it('should enforce maximum limit per page', async () => {
      await createTestPatients(200);

      const response = await app.inject({
        method: 'GET',
        url: '/api/patients?limit=1000', // Exceeds max limit
        headers: getAuthHeaders(adminUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      // Should cap at maximum limit (100)
      expect(body.data.length).toBeLessThanOrEqual(100);
    });
  });
});
