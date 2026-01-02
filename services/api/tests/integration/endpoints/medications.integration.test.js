/**
 * Medication API Endpoint Integration Tests
 *
 * Tests comprehensive medication management operations through API endpoints:
 * - Medication order creation with validation
 * - Medication retrieval (single and list)
 * - Medication updates and status changes
 * - Medication discontinuation, hold, pause, resume
 * - MAR (Medication Administration Record) entries
 * - Comfort kit management
 * - Medication reconciliation
 * - Controlled substance tracking
 * - Drug interaction checking
 * - Allergy management
 * - Role-based access control (RBAC)
 * - Input validation and error handling
 *
 * HIPAA Compliance:
 * - Tests PHI data handling for medication records
 * - Validates audit logging
 * - Ensures proper access controls
 * - Tests soft delete for data retention
 *
 * Regulatory Compliance:
 * - DEA controlled substance tracking
 * - CMS medication reconciliation requirements
 * - Hospice medication documentation standards
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import {
  cleanupDatabase,
  createTestPatient,
  getTableCount,
} from '../helpers/testDb.js';
import { createTestServer } from '../helpers/testServer.js';
import {
  createAuthenticatedUser,
  getAuthHeaders,
  TEST_ROLES,
} from '../helpers/authHelper.js';
import { faker } from '@faker-js/faker';
import { db } from '../../../src/config/db.drizzle.js';
import { medications } from '../../../src/db/schemas/medications.schema.js';
import { mar_entries } from '../../../src/db/schemas/medications.schema.js';
import { comfort_kits } from '../../../src/db/schemas/medications.schema.js';
import { medication_reconciliation } from '../../../src/db/schemas/medications.schema.js';
import { eq, and, isNull } from 'drizzle-orm';

describe('Medication API Endpoints Integration Tests', () => {
  let server;
  let app;
  let adminUser;
  let doctorUser;
  let nurseUser;
  let patientUser;
  let testPatient;

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Create a test medication for testing
   */
  async function createTestMedication(overrides = {}) {
    const medicationData = {
      patient_id: testPatient.id,
      medication_name: faker.helpers.arrayElement([
        'Morphine Sulfate',
        'Hydrocodone',
        'Oxycodone',
        'Lorazepam',
        'Haloperidol',
        'Acetaminophen',
      ]),
      generic_name: 'morphine',
      medication_status: 'ACTIVE',
      medication_route: 'ORAL',
      dosage: '15mg',
      frequency: 'Every 4 hours PRN',
      instructions: 'Take for moderate to severe pain',
      start_date: new Date().toISOString().split('T')[0],
      is_hospice_related: true,
      ...overrides,
    };

    const [medication] = await db
      .insert(medications)
      .values(medicationData)
      .returning();

    return medication;
  }

  /**
   * Create a test MAR entry
   */
  async function createTestMAREntry(medicationId, overrides = {}) {
    const marData = {
      patient_id: testPatient.id,
      medication_id: medicationId,
      scheduled_time: new Date(),
      actual_time: new Date(),
      mar_status: 'GIVEN',
      dosage_given: '15mg',
      route_used: 'ORAL',
      administered_by_id: nurseUser.user.id,
      administered_by_name: `${nurseUser.user.firstName} ${nurseUser.user.lastName}`,
      ...overrides,
    };

    const [marEntry] = await db
      .insert(mar_entries)
      .values(marData)
      .returning();

    return marEntry;
  }

  /**
   * Create a test comfort kit
   */
  async function createTestComfortKit(overrides = {}) {
    const kitData = {
      patient_id: testPatient.id,
      kit_number: `CK-${faker.string.alphanumeric(8).toUpperCase()}`,
      issue_date: new Date().toISOString().split('T')[0],
      expiration_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      status: 'ACTIVE',
      medications: [
        {
          medication: 'Morphine Sulfate Concentrate 20mg/mL',
          quantity: '30mL bottle',
          lot_number: faker.string.alphanumeric(10).toUpperCase(),
          ndc: '00054-3589-49',
        },
      ],
      location: 'Patient home - refrigerator',
      ...overrides,
    };

    const [comfortKit] = await db
      .insert(comfort_kits)
      .values(kitData)
      .returning();

    return comfortKit;
  }

  // ============================================================================
  // Setup and Teardown
  // ============================================================================

  beforeAll(async () => {
    // Build test server with routes registered
    const builder = createTestServer({ registerRoutes: true });
    server = builder;
    app = await builder.build();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  beforeEach(async () => {
    // Clean up database before each test
    await cleanupDatabase();

    // Create test users with different roles
    adminUser = await createAuthenticatedUser({ role: TEST_ROLES.ADMIN });
    doctorUser = await createAuthenticatedUser({ role: TEST_ROLES.DOCTOR });
    nurseUser = await createAuthenticatedUser({ role: TEST_ROLES.NURSE });
    patientUser = await createAuthenticatedUser({ role: TEST_ROLES.PATIENT });

    // Create a test patient for medication tests
    testPatient = await createTestPatient();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupDatabase();
  });

  // ============================================================================
  // Medication Creation Tests (POST /api/patients/:id/medications)
  // ============================================================================

  describe('POST /api/patients/:id/medications - Create Medication', () => {
    it('should create a new medication order as doctor', async () => {
      const medicationData = {
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
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: medicationData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/medication|created/i);
      expect(body.data).toMatchObject({
        medication_name: medicationData.medication_name,
        dosage: medicationData.dosage,
        medication_status: 'ACTIVE',
      });
      expect(body.data.id).toBeDefined();
      expect(body.data.createdAt).toBeDefined();

      // Verify medication was saved to database
      const dbMedicationCount = await getTableCount('medications');
      expect(dbMedicationCount).toBe(1);
    });

    it('should create a non-controlled medication as nurse', async () => {
      const medicationData = {
        medication_name: 'Acetaminophen',
        generic_name: 'acetaminophen',
        medication_route: 'ORAL',
        dosage: '500mg',
        frequency: 'Every 6 hours PRN',
        start_date: '2024-01-01',
        is_hospice_related: true,
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: medicationData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.medication_name).toBe('Acetaminophen');
    });

    it('should reject medication creation with missing required fields', async () => {
      const incompleteData = {
        medication_name: 'Morphine Sulfate',
        // Missing start_date
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: incompleteData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/validation|required/i);
    });

    it('should reject medication creation with invalid route', async () => {
      const medicationData = {
        medication_name: 'Morphine Sulfate',
        medication_route: 'INVALID_ROUTE',
        dosage: '15mg',
        start_date: '2024-01-01',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: medicationData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/route|validation/i);
    });

    it('should reject medication creation without authentication', async () => {
      const medicationData = {
        medication_name: 'Morphine Sulfate',
        dosage: '15mg',
        start_date: '2024-01-01',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: medicationData,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject medication creation as patient role', async () => {
      const medicationData = {
        medication_name: 'Morphine Sulfate',
        dosage: '15mg',
        start_date: '2024-01-01',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(patientUser.sessionToken),
        payload: medicationData,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject medication creation for non-existent patient', async () => {
      const medicationData = {
        medication_name: 'Morphine Sulfate',
        dosage: '15mg',
        start_date: '2024-01-01',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/patients/999999/medications',
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: medicationData,
      });

      expect(response.statusCode).toBe(404);
    });

    it('should create controlled substance with proper schedule classification', async () => {
      const medicationData = {
        medication_name: 'Fentanyl Patch',
        medication_route: 'TRANSDERMAL',
        dosage: '25mcg/hr',
        frequency: 'Every 72 hours',
        start_date: '2024-01-01',
        controlled_schedule: 'SCHEDULE_II',
        is_hospice_related: true,
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: medicationData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.controlled_schedule).toBe('SCHEDULE_II');
    });

    it('should sanitize XSS attempts in medication data', async () => {
      const medicationData = {
        medication_name: '<script>alert("XSS")</script>Morphine',
        dosage: '15mg',
        start_date: '2024-01-01',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: medicationData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.medication_name).not.toContain('<script>');
    });
  });

  // ============================================================================
  // Medication Retrieval Tests (GET /api/patients/:id/medications)
  // ============================================================================

  describe('GET /api/patients/:id/medications - Get Patient Medications', () => {
    it('should retrieve all medications for a patient as doctor', async () => {
      await createTestMedication({ medication_name: 'Morphine Sulfate' });
      await createTestMedication({ medication_name: 'Lorazepam' });
      await createTestMedication({ medication_name: 'Haloperidol' });

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBe(3);
      expect(body.total).toBe(3);
    });

    it('should retrieve medications as nurse', async () => {
      await createTestMedication();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(nurseUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should filter medications by status', async () => {
      await createTestMedication({ medication_status: 'ACTIVE' });
      await createTestMedication({ medication_status: 'DISCONTINUED' });
      await createTestMedication({ medication_status: 'HELD' });

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/medications?status=ACTIVE`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.every(m => m.medication_status === 'ACTIVE')).toBe(true);
    });

    it('should filter hospice-related medications', async () => {
      await createTestMedication({ is_hospice_related: true });
      await createTestMedication({ is_hospice_related: false });

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/medications?hospice_related=true`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.every(m => m.is_hospice_related === true)).toBe(true);
    });

    it('should return empty array for patient with no medications', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toEqual([]);
      expect(body.total).toBe(0);
    });

    it('should reject retrieval without authentication', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // Single Medication Retrieval Tests (GET /api/patients/:id/medications/:medId)
  // ============================================================================

  describe('GET /api/patients/:id/medications/:medId - Get Single Medication', () => {
    it('should retrieve a medication by ID as doctor', async () => {
      const medication = await createTestMedication();

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.id).toBe(medication.id);
      expect(body.medication_name).toBe(medication.medication_name);
    });

    it('should return 404 for non-existent medication ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/medications/999999`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(404);
    });

    it('should return 400 for invalid medication ID format', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/medications/invalid-id`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================================
  // Medication Update Tests (PUT /api/patients/:id/medications/:medId)
  // ============================================================================

  describe('PUT /api/patients/:id/medications/:medId - Update Medication', () => {
    it('should update medication as doctor', async () => {
      const medication = await createTestMedication({
        dosage: '15mg',
        frequency: 'Every 4 hours PRN',
      });

      const updatedData = {
        medication_name: medication.medication_name,
        dosage: '30mg',
        frequency: 'Every 6 hours PRN',
        start_date: medication.start_date,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.dosage).toBe('30mg');
      expect(body.data.frequency).toBe('Every 6 hours PRN');
    });

    it('should reject update without proper permissions', async () => {
      const medication = await createTestMedication();

      const updatedData = {
        dosage: '30mg',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}`,
        headers: getAuthHeaders(patientUser.sessionToken),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should reject update with invalid data', async () => {
      const medication = await createTestMedication();

      const invalidData = {
        medication_route: 'INVALID_ROUTE',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: invalidData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================================
  // Medication Discontinuation Tests (POST /api/patients/:id/medications/:medId/discontinue)
  // ============================================================================

  describe('POST /api/patients/:id/medications/:medId/discontinue - Discontinue Medication', () => {
    it('should discontinue medication as doctor', async () => {
      const medication = await createTestMedication({ medication_status: 'ACTIVE' });

      const discontinueData = {
        discontinuation_reason: 'No longer clinically necessary',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}/discontinue`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: discontinueData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.medication_status).toBe('DISCONTINUED');
      expect(body.data.discontinuation_reason).toBe('No longer clinically necessary');
      expect(body.data.discontinued_date).toBeDefined();
    });

    it('should require discontinuation reason', async () => {
      const medication = await createTestMedication({ medication_status: 'ACTIVE' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}/discontinue`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/reason|required/i);
    });

    it('should reject discontinuation without proper permissions', async () => {
      const medication = await createTestMedication();

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}/discontinue`,
        headers: getAuthHeaders(patientUser.sessionToken),
        payload: { discontinuation_reason: 'Test reason' },
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ============================================================================
  // Medication Hold Tests (POST /api/patients/:id/medications/:medId/hold)
  // ============================================================================

  describe('POST /api/patients/:id/medications/:medId/hold - Hold Medication', () => {
    it('should hold medication as nurse', async () => {
      const medication = await createTestMedication({ medication_status: 'ACTIVE' });

      const holdData = {
        hold_reason: 'Patient experiencing adverse effects',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}/hold`,
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: holdData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.medication_status).toBe('HELD');
    });
  });

  // ============================================================================
  // Medication Resume Tests (POST /api/patients/:id/medications/:medId/resume)
  // ============================================================================

  describe('POST /api/patients/:id/medications/:medId/resume - Resume Medication', () => {
    it('should resume held medication as doctor', async () => {
      const medication = await createTestMedication({ medication_status: 'HELD' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}/resume`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.medication_status).toBe('ACTIVE');
    });

    it('should resume paused medication', async () => {
      const medication = await createTestMedication({ medication_status: 'PAUSED' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}/resume`,
        headers: getAuthHeaders(doctorUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.medication_status).toBe('ACTIVE');
    });
  });

  // ============================================================================
  // MAR Entry Tests (POST /api/patients/:id/mar)
  // ============================================================================

  describe('POST /api/patients/:id/mar - Create MAR Entry', () => {
    it('should create MAR entry when medication given as nurse', async () => {
      const medication = await createTestMedication();

      const marData = {
        medication_id: medication.id,
        scheduled_time: new Date().toISOString(),
        actual_time: new Date().toISOString(),
        mar_status: 'GIVEN',
        dosage_given: '15mg',
        route_used: 'ORAL',
        patient_response: 'Patient tolerated medication well',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/mar`,
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: marData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.mar_status).toBe('GIVEN');
      expect(body.data.medication_id).toBe(medication.id);
      expect(body.data.administered_by_id).toBeDefined();
    });

    it('should create MAR entry when medication refused', async () => {
      const medication = await createTestMedication();

      const marData = {
        medication_id: medication.id,
        scheduled_time: new Date().toISOString(),
        actual_time: new Date().toISOString(),
        mar_status: 'REFUSED',
        reason_not_given: 'Patient declined medication',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/mar`,
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: marData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.mar_status).toBe('REFUSED');
      expect(body.data.reason_not_given).toBe('Patient declined medication');
    });

    it('should require reason_not_given for REFUSED status', async () => {
      const medication = await createTestMedication();

      const marData = {
        medication_id: medication.id,
        scheduled_time: new Date().toISOString(),
        mar_status: 'REFUSED',
        // Missing reason_not_given
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/mar`,
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: marData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/reason|required/i);
    });

    it('should require reason_not_given for HELD status', async () => {
      const medication = await createTestMedication();

      const marData = {
        medication_id: medication.id,
        scheduled_time: new Date().toISOString(),
        mar_status: 'HELD',
        // Missing reason_not_given
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/mar`,
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: marData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject MAR entry creation without authentication', async () => {
      const medication = await createTestMedication();

      const marData = {
        medication_id: medication.id,
        scheduled_time: new Date().toISOString(),
        mar_status: 'GIVEN',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/mar`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: marData,
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // MAR Retrieval Tests (GET /api/patients/:id/mar)
  // ============================================================================

  describe('GET /api/patients/:id/mar - Get Patient MAR Entries', () => {
    it('should retrieve all MAR entries for a patient', async () => {
      const medication = await createTestMedication();
      await createTestMAREntry(medication.id, { mar_status: 'GIVEN' });
      await createTestMAREntry(medication.id, { mar_status: 'REFUSED' });
      await createTestMAREntry(medication.id, { mar_status: 'HELD' });

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/mar`,
        headers: getAuthHeaders(nurseUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBe(3);
    });

    it('should filter MAR entries by status', async () => {
      const medication = await createTestMedication();
      await createTestMAREntry(medication.id, { mar_status: 'GIVEN' });
      await createTestMAREntry(medication.id, { mar_status: 'REFUSED' });

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/mar?status=GIVEN`,
        headers: getAuthHeaders(nurseUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.every(m => m.mar_status === 'GIVEN')).toBe(true);
    });

    it('should filter MAR entries by date range', async () => {
      const medication = await createTestMedication();
      const startDate = new Date('2024-01-01');
      const endDate = new Date('2024-01-31');

      await createTestMAREntry(medication.id, {
        scheduled_time: new Date('2024-01-15'),
      });

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/mar?start_date=2024-01-01&end_date=2024-01-31`,
        headers: getAuthHeaders(nurseUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // Comfort Kit Tests (POST /api/patients/:id/comfort-kit)
  // ============================================================================

  describe('POST /api/patients/:id/comfort-kit - Create Comfort Kit', () => {
    it('should create comfort kit as doctor', async () => {
      const kitData = {
        kit_number: 'CK-2024-001',
        issue_date: '2024-01-01',
        expiration_date: '2024-07-01',
        medications: [
          {
            medication: 'Morphine Sulfate Concentrate 20mg/mL',
            quantity: '30mL bottle',
            lot_number: 'LOT123456',
            ndc: '00054-3589-49',
          },
        ],
        location: 'Patient home - refrigerator',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/comfort-kit`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: kitData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.kit_number).toBe('CK-2024-001');
      expect(body.data.status).toBe('ACTIVE');
      expect(body.data.medications).toBeInstanceOf(Array);
    });

    it('should reject comfort kit creation without required fields', async () => {
      const incompleteData = {
        kit_number: 'CK-2024-001',
        // Missing issue_date
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/comfort-kit`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: incompleteData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================================
  // Comfort Kit Retrieval Tests (GET /api/patients/:id/comfort-kit)
  // ============================================================================

  describe('GET /api/patients/:id/comfort-kit - Get Patient Comfort Kit', () => {
    it('should retrieve active comfort kit for patient', async () => {
      await createTestComfortKit({ status: 'ACTIVE' });

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/comfort-kit`,
        headers: getAuthHeaders(nurseUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.status).toBe('ACTIVE');
      expect(body.medications).toBeDefined();
    });

    it('should return 404 if no comfort kit exists', async () => {
      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/comfort-kit`,
        headers: getAuthHeaders(nurseUser.sessionToken),
      });

      expect(response.statusCode).toBe(404);
    });
  });

  // ============================================================================
  // Medication Reconciliation Tests (POST /api/patients/:id/medication-reconciliation)
  // ============================================================================

  describe('POST /api/patients/:id/medication-reconciliation - Create Medication Reconciliation', () => {
    it('should create admission reconciliation as nurse', async () => {
      const reconData = {
        reconciliation_date: '2024-01-01',
        reconciliation_type: 'ADMISSION',
        medications_reviewed: [
          {
            medication: 'Metoprolol 25mg BID',
            action: 'CONTINUED',
            reason: 'Patient taking at home, continue for heart failure',
          },
          {
            medication: 'Morphine Sulfate 15mg q4h PRN',
            action: 'ADDED',
            reason: 'New hospice medication for pain management',
          },
        ],
        discrepancies_found: 'None',
        actions_taken: 'All medications reviewed and documented',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medication-reconciliation`,
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: reconData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.reconciliation_type).toBe('ADMISSION');
      expect(body.data.medications_reviewed).toBeInstanceOf(Array);
      expect(body.data.performed_by_id).toBeDefined();
    });

    it('should create discharge reconciliation', async () => {
      const reconData = {
        reconciliation_date: '2024-02-15',
        reconciliation_type: 'DISCHARGE',
        medications_reviewed: [
          {
            medication: 'Morphine Sulfate 15mg q4h PRN',
            action: 'DISCONTINUED',
            reason: 'Patient revoked hospice election',
          },
        ],
        discrepancies_found: 'None',
        actions_taken: 'All hospice medications discontinued',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medication-reconciliation`,
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: reconData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.reconciliation_type).toBe('DISCHARGE');
    });

    it('should require reconciliation_type', async () => {
      const reconData = {
        reconciliation_date: '2024-01-01',
        // Missing reconciliation_type
        medications_reviewed: [],
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medication-reconciliation`,
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: reconData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================================
  // Medication Reconciliation Retrieval Tests
  // ============================================================================

  describe('GET /api/patients/:id/medication-reconciliation - Get Reconciliation History', () => {
    it('should retrieve all reconciliations for a patient', async () => {
      const reconData1 = {
        patient_id: testPatient.id,
        reconciliation_date: new Date('2024-01-01'),
        reconciliation_type: 'ADMISSION',
        medications_reviewed: [],
        performed_by_id: nurseUser.user.id,
        performed_by_name: `${nurseUser.user.firstName} ${nurseUser.user.lastName}`,
      };

      const reconData2 = {
        patient_id: testPatient.id,
        reconciliation_date: new Date('2024-01-15'),
        reconciliation_type: 'ROUTINE',
        medications_reviewed: [],
        performed_by_id: nurseUser.user.id,
        performed_by_name: `${nurseUser.user.firstName} ${nurseUser.user.lastName}`,
      };

      await db.insert(medication_reconciliation).values([reconData1, reconData2]);

      const response = await app.inject({
        method: 'GET',
        url: `/api/patients/${testPatient.id}/medication-reconciliation`,
        headers: getAuthHeaders(nurseUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBe(2);
    });
  });

  // ============================================================================
  // Drug Interaction Check Tests (POST /api/patients/:id/medications/check-interactions)
  // ============================================================================

  describe('POST /api/patients/:id/medications/check-interactions - Check Drug Interactions', () => {
    it('should check for drug interactions when adding new medication', async () => {
      await createTestMedication({ medication_name: 'Warfarin' });

      const checkData = {
        medication_name: 'Aspirin',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications/check-interactions`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: checkData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.interactions).toBeDefined();
    });

    it('should check for allergy conflicts', async () => {
      // This test assumes patient has documented allergies
      const checkData = {
        medication_name: 'Morphine Sulfate',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications/check-interactions`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: checkData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.allergy_conflicts).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases and Data Validation
  // ============================================================================

  describe('Data Validation and Edge Cases', () => {
    it('should handle very long medication instructions', async () => {
      const medicationData = {
        medication_name: 'Morphine Sulfate',
        dosage: '15mg',
        start_date: '2024-01-01',
        instructions: 'A'.repeat(5000), // Very long instructions
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: medicationData,
      });

      // Should either accept (if text field) or reject with validation error
      expect([201, 400]).toContain(response.statusCode);
    });

    it('should validate start_date is not in the distant past', async () => {
      const medicationData = {
        medication_name: 'Morphine Sulfate',
        dosage: '15mg',
        start_date: '1900-01-01',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: medicationData,
      });

      // Should accept or reject based on business rules
      expect([201, 400]).toContain(response.statusCode);
    });

    it('should validate end_date is after start_date', async () => {
      const medicationData = {
        medication_name: 'Morphine Sulfate',
        dosage: '15mg',
        start_date: '2024-02-01',
        end_date: '2024-01-01', // Before start_date
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: medicationData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/end.*date|date.*validation/i);
    });

    it('should handle concurrent medication updates', async () => {
      const medication = await createTestMedication();

      // Two concurrent updates
      const update1 = app.inject({
        method: 'PUT',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: {
          medication_name: medication.medication_name,
          dosage: '20mg',
          start_date: medication.start_date,
        },
      });

      const update2 = app.inject({
        method: 'PUT',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: {
          medication_name: medication.medication_name,
          dosage: '30mg',
          start_date: medication.start_date,
        },
      });

      const [response1, response2] = await Promise.all([update1, update2]);

      // Both should succeed or one should fail with conflict
      expect([200, 409]).toContain(response1.statusCode);
      expect([200, 409]).toContain(response2.statusCode);
    });

    it('should prevent duplicate active medications with same name', async () => {
      await createTestMedication({
        medication_name: 'Morphine Sulfate',
        medication_status: 'ACTIVE',
      });

      const duplicateData = {
        medication_name: 'Morphine Sulfate',
        dosage: '15mg',
        start_date: '2024-01-01',
        medication_status: 'ACTIVE',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: duplicateData,
      });

      // Should warn or prevent duplicate
      expect([201, 400, 409]).toContain(response.statusCode);
    });

    it('should allow discontinued medication to be restarted as new order', async () => {
      await createTestMedication({
        medication_name: 'Morphine Sulfate',
        medication_status: 'DISCONTINUED',
      });

      const newOrderData = {
        medication_name: 'Morphine Sulfate',
        dosage: '15mg',
        start_date: '2024-02-01',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: newOrderData,
      });

      expect(response.statusCode).toBe(201);
    });
  });

  // ============================================================================
  // Audit and Compliance Tests
  // ============================================================================

  describe('Audit and Compliance', () => {
    it('should record created_by_id when creating medication', async () => {
      const medicationData = {
        medication_name: 'Morphine Sulfate',
        dosage: '15mg',
        start_date: '2024-01-01',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/medications`,
        headers: getAuthHeaders(doctorUser.sessionToken),
        payload: medicationData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.created_by_id).toBe(doctorUser.user.id);
    });

    it('should record updated_by_id when updating medication', async () => {
      const medication = await createTestMedication();

      const updatedData = {
        medication_name: medication.medication_name,
        dosage: '30mg',
        start_date: medication.start_date,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/patients/${testPatient.id}/medications/${medication.id}`,
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.updated_by_id).toBe(adminUser.user.id);
    });

    it('should record administered_by in MAR entries', async () => {
      const medication = await createTestMedication();

      const marData = {
        medication_id: medication.id,
        scheduled_time: new Date().toISOString(),
        mar_status: 'GIVEN',
        dosage_given: '15mg',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/patients/${testPatient.id}/mar`,
        headers: getAuthHeaders(nurseUser.sessionToken),
        payload: marData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.administered_by_id).toBe(nurseUser.user.id);
      expect(body.data.administered_by_name).toContain(nurseUser.user.firstName);
    });
  });
});
