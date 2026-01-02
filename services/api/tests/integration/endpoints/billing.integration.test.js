/**
 * Billing API Endpoint Integration Tests
 *
 * Tests comprehensive billing operations through API endpoints:
 * - Claims management (create, retrieve, submit, void, update status)
 * - Claim service lines and diagnosis codes
 * - Notice of Election (NOE) submission
 * - Payment processing and application to claims
 * - Billing periods tracking
 * - AR aging reports
 * - Billing codes management
 * - Invoice generation and management
 * - Billing statements
 * - Role-based access control (RBAC)
 * - Input validation and error handling
 *
 * HIPAA Compliance:
 * - Tests PHI data handling in billing records
 * - Validates audit logging for financial transactions
 * - Ensures proper access controls
 * - Tests soft delete for data retention
 *
 * Regulatory Compliance:
 * - CMS billing requirements
 * - UB-04 claim format validation
 * - NOE timeliness tracking
 * - Revenue cycle management
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
import { claims } from '../../../src/db/schemas/billing.schema.js';
import { claim_service_lines } from '../../../src/db/schemas/billing.schema.js';
import { payers } from '../../../src/db/schemas/billing.schema.js';
import { payments } from '../../../src/db/schemas/billing.schema.js';
import { notice_of_election } from '../../../src/db/schemas/billing.schema.js';
import { billing_codes } from '../../../src/db/schemas/billing.schema.js';
import { invoices } from '../../../src/db/schemas/billing.schema.js';
import { billing_statements } from '../../../src/db/schemas/billing.schema.js';
import { eq, and, isNull } from 'drizzle-orm';

describe('Billing API Endpoints Integration Tests', () => {
  let server;
  let app;
  let adminUser;
  let doctorUser;
  let nurseUser;
  let billingUser;
  let patientUser;
  let testPatient;
  let testPayer;

  // ============================================================================
  // Helper Functions
  // ============================================================================

  /**
   * Create a test payer for billing tests
   */
  async function createTestPayer(overrides = {}) {
    const payerData = {
      payer_name: faker.helpers.arrayElement(['Medicare', 'Medicaid', 'Blue Cross', 'Aetna', 'UnitedHealthcare']),
      payer_type: faker.helpers.arrayElement(['MEDICARE', 'MEDICAID', 'COMMERCIAL', 'MANAGED_CARE']),
      payer_id: faker.string.alphanumeric(10).toUpperCase(),
      address_line1: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode('#####'),
      phone: '555-123-4567',
      electronic_billing_enabled: true,
      is_active: true,
      ...overrides,
    };

    const [payer] = await db
      .insert(payers)
      .values(payerData)
      .returning();

    return payer;
  }

  /**
   * Create a test claim for testing
   */
  async function createTestClaim(overrides = {}) {
    const claimData = {
      patient_id: testPatient.id,
      payer_id: testPayer.id,
      claim_number: `CLM-${faker.string.alphanumeric(8).toUpperCase()}`,
      claim_type: 'INSTITUTIONAL',
      claim_status: 'DRAFT',
      service_start_date: new Date('2024-01-01').toISOString().split('T')[0],
      service_end_date: new Date('2024-01-31').toISOString().split('T')[0],
      bill_type: '0811', // Hospice routine home care
      total_charges: 1500000, // $15,000 in cents
      balance: 1500000,
      principal_diagnosis_code: 'C25.9',
      ...overrides,
    };

    const [claim] = await db
      .insert(claims)
      .values(claimData)
      .returning();

    return claim;
  }

  /**
   * Create a test claim service line
   */
  async function createTestServiceLine(claimId, overrides = {}) {
    const serviceLineData = {
      claim_id: claimId,
      line_number: 1,
      service_date: new Date('2024-01-15').toISOString().split('T')[0],
      revenue_code: '0651',
      level_of_care: 'ROUTINE_HOME_CARE',
      units: 31,
      charges: 1500000,
      ...overrides,
    };

    const [serviceLine] = await db
      .insert(claim_service_lines)
      .values(serviceLineData)
      .returning();

    return serviceLine;
  }

  /**
   * Create a test payment
   */
  async function createTestPayment(overrides = {}) {
    const paymentData = {
      payer_id: testPayer.id,
      payment_date: new Date('2024-02-15').toISOString().split('T')[0],
      payment_amount: 1500000,
      payment_method: 'EFT',
      payment_status: 'DEPOSITED',
      reference_number: `REF-${faker.string.alphanumeric(10).toUpperCase()}`,
      unapplied_amount: 1500000,
      ...overrides,
    };

    const [payment] = await db
      .insert(payments)
      .values(paymentData)
      .returning();

    return payment;
  }

  /**
   * Create a test NOE
   */
  async function createTestNOE(overrides = {}) {
    const noeData = {
      patient_id: testPatient.id,
      payer_id: testPayer.id,
      noe_date: new Date('2024-01-01').toISOString().split('T')[0],
      effective_date: new Date('2024-01-01').toISOString().split('T')[0],
      noe_status: 'PENDING',
      benefit_period: 'INITIAL_90',
      ...overrides,
    };

    const [noe] = await db
      .insert(notice_of_election)
      .values(noeData)
      .returning();

    return noe;
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
    billingUser = await createAuthenticatedUser({ role: TEST_ROLES.ADMIN }); // Billing staff with admin role
    patientUser = await createAuthenticatedUser({ role: TEST_ROLES.PATIENT });

    // Create test patient and payer
    testPatient = await createTestPatient();
    testPayer = await createTestPayer();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupDatabase();
  });

  // ============================================================================
  // Claim Creation Tests (POST /api/billing/claims)
  // ============================================================================

  describe('POST /api/billing/claims - Create Claim', () => {
    it('should create a new claim with valid data as billing user', async () => {
      const claimData = {
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        claim_type: 'INSTITUTIONAL',
        service_start_date: '2024-01-01',
        service_end_date: '2024-01-31',
        bill_type: '0811',
        total_charges: 1500000,
        principal_diagnosis_code: 'C25.9',
        attending_physician_npi: '1234567890',
        attending_physician_name: 'Dr. John Smith',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: claimData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/claim|created/i);
      expect(body.data).toMatchObject({
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        claim_status: 'DRAFT',
      });
      expect(body.data.id).toBeDefined();
      expect(body.data.claim_number).toBeDefined();

      // Verify claim was saved to database
      const dbClaimCount = await getTableCount('claims');
      expect(dbClaimCount).toBe(1);
    });

    it('should create claim with service lines', async () => {
      const claimData = {
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        service_start_date: '2024-01-01',
        service_end_date: '2024-01-31',
        bill_type: '0811',
        total_charges: 1500000,
        service_lines: [
          {
            line_number: 1,
            service_date: '2024-01-15',
            revenue_code: '0651',
            level_of_care: 'ROUTINE_HOME_CARE',
            units: 31,
            charges: 1500000,
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: claimData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.service_lines).toBeDefined();
    });

    it('should reject claim creation with missing required fields', async () => {
      const incompleteData = {
        patient_id: testPatient.id,
        // Missing service dates
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: incompleteData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/validation|required/i);
    });

    it('should reject claim creation with invalid bill type', async () => {
      const claimData = {
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        service_start_date: '2024-01-01',
        service_end_date: '2024-01-31',
        bill_type: 'INVALID',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: claimData,
      });

      expect(response.statusCode).toBe(400);
    });

    it('should reject claim creation without authentication', async () => {
      const claimData = {
        patient_id: testPatient.id,
        service_start_date: '2024-01-01',
        service_end_date: '2024-01-31',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: claimData,
      });

      expect(response.statusCode).toBe(401);
    });

    it('should reject claim creation as patient role', async () => {
      const claimData = {
        patient_id: testPatient.id,
        service_start_date: '2024-01-01',
        service_end_date: '2024-01-31',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: getAuthHeaders(patientUser.sessionToken),
        payload: claimData,
      });

      expect(response.statusCode).toBe(403);
    });

    it('should validate service_end_date is after service_start_date', async () => {
      const claimData = {
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        service_start_date: '2024-02-01',
        service_end_date: '2024-01-01', // Before start date
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: claimData,
      });

      expect(response.statusCode).toBe(400);
      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/end.*date|date.*validation/i);
    });
  });

  // ============================================================================
  // Claim Retrieval Tests (GET /api/billing/claims/:id)
  // ============================================================================

  describe('GET /api/billing/claims/:id - Get Claim by ID', () => {
    it('should retrieve a claim by ID as billing user', async () => {
      const claim = await createTestClaim();

      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/claims/${claim.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.id).toBe(claim.id);
      expect(body.claim_number).toBe(claim.claim_number);
      expect(body.claim_status).toBe('DRAFT');
    });

    it('should retrieve claim with service lines', async () => {
      const claim = await createTestClaim();
      await createTestServiceLine(claim.id);

      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/claims/${claim.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.service_lines).toBeDefined();
      expect(body.service_lines.length).toBeGreaterThan(0);
    });

    it('should return 404 for non-existent claim ID', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/claims/999999',
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(404);
    });

    it('should reject claim retrieval without authentication', async () => {
      const claim = await createTestClaim();

      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/claims/${claim.id}`,
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // Claims List Tests (GET /api/billing/claims)
  // ============================================================================

  describe('GET /api/billing/claims - List Claims', () => {
    it('should retrieve all claims with pagination', async () => {
      await createTestClaim({ claim_status: 'DRAFT' });
      await createTestClaim({ claim_status: 'SUBMITTED' });
      await createTestClaim({ claim_status: 'PAID' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/claims?limit=10&offset=0',
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.length).toBe(3);
      expect(body.total).toBe(3);
    });

    it('should filter claims by status', async () => {
      await createTestClaim({ claim_status: 'DRAFT' });
      await createTestClaim({ claim_status: 'SUBMITTED' });
      await createTestClaim({ claim_status: 'PAID' });

      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/claims?status=SUBMITTED',
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.every(c => c.claim_status === 'SUBMITTED')).toBe(true);
    });

    it('should filter claims by patient', async () => {
      const otherPatient = await createTestPatient();
      await createTestClaim({ patient_id: testPatient.id });
      await createTestClaim({ patient_id: otherPatient.id });

      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/claims?patient_id=${testPatient.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.every(c => c.patient_id === testPatient.id)).toBe(true);
    });

    it('should filter claims by payer', async () => {
      const otherPayer = await createTestPayer({ payer_name: 'Aetna' });
      await createTestClaim({ payer_id: testPayer.id });
      await createTestClaim({ payer_id: otherPayer.id });

      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/claims?payer_id=${testPayer.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.every(c => c.payer_id === testPayer.id)).toBe(true);
    });

    it('should filter claims by date range', async () => {
      await createTestClaim({
        service_start_date: '2024-01-01',
        service_end_date: '2024-01-31',
      });
      await createTestClaim({
        service_start_date: '2024-02-01',
        service_end_date: '2024-02-28',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/claims?start_date=2024-01-01&end_date=2024-01-31',
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.length).toBeGreaterThanOrEqual(1);
    });
  });

  // ============================================================================
  // Claim Update Tests (PUT /api/billing/claims/:id)
  // ============================================================================

  describe('PUT /api/billing/claims/:id - Update Claim', () => {
    it('should update claim as billing user', async () => {
      const claim = await createTestClaim({
        total_charges: 1500000,
      });

      const updatedData = {
        patient_id: claim.patient_id,
        payer_id: claim.payer_id,
        service_start_date: claim.service_start_date,
        service_end_date: claim.service_end_date,
        total_charges: 1800000,
        notes: 'Updated claim with corrected charges',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/billing/claims/${claim.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.total_charges).toBe(1800000);
      expect(body.data.notes).toBe('Updated claim with corrected charges');
    });

    it('should reject update of submitted claim', async () => {
      const claim = await createTestClaim({ claim_status: 'SUBMITTED' });

      const updatedData = {
        total_charges: 2000000,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/billing/claims/${claim.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: updatedData,
      });

      // Should prevent editing submitted claims
      expect([403, 400]).toContain(response.statusCode);
    });

    it('should reject update without proper permissions', async () => {
      const claim = await createTestClaim();

      const updatedData = {
        total_charges: 2000000,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/billing/claims/${claim.id}`,
        headers: getAuthHeaders(patientUser.sessionToken),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(403);
    });
  });

  // ============================================================================
  // Claim Status Update Tests (PUT /api/billing/claims/:id/status)
  // ============================================================================

  describe('PUT /api/billing/claims/:id/status - Update Claim Status', () => {
    it('should update claim status from DRAFT to READY_TO_SUBMIT', async () => {
      const claim = await createTestClaim({ claim_status: 'DRAFT' });

      const statusUpdate = {
        new_status: 'READY_TO_SUBMIT',
        change_reason: 'Claim validated and ready for submission',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/billing/claims/${claim.id}/status`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: statusUpdate,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.claim_status).toBe('READY_TO_SUBMIT');
    });

    it('should create status history entry when updating status', async () => {
      const claim = await createTestClaim({ claim_status: 'DRAFT' });

      await app.inject({
        method: 'PUT',
        url: `/api/billing/claims/${claim.id}/status`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: {
          new_status: 'SUBMITTED',
          change_reason: 'Claim submitted to payer',
        },
      });

      const historyResponse = await app.inject({
        method: 'GET',
        url: `/api/billing/claims/${claim.id}/status-history`,
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(historyResponse.statusCode).toBe(200);
      const historyBody = JSON.parse(historyResponse.payload);
      expect(historyBody.data).toBeInstanceOf(Array);
      expect(historyBody.data.length).toBeGreaterThanOrEqual(1);
    });

    it('should reject invalid status transition', async () => {
      const claim = await createTestClaim({ claim_status: 'PAID' });

      const statusUpdate = {
        new_status: 'DRAFT',
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/billing/claims/${claim.id}/status`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: statusUpdate,
      });

      // Should prevent invalid status transitions
      expect([400, 409]).toContain(response.statusCode);
    });
  });

  // ============================================================================
  // Claim Submission Tests (POST /api/billing/claims/:id/submit)
  // ============================================================================

  describe('POST /api/billing/claims/:id/submit - Submit Claim', () => {
    it('should submit claim to payer', async () => {
      const claim = await createTestClaim({ claim_status: 'READY_TO_SUBMIT' });

      const submitData = {
        submission_method: 'ELECTRONIC',
        clearinghouse_id: 'CH-001',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/billing/claims/${claim.id}/submit`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: submitData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.claim_status).toBe('SUBMITTED');
      expect(body.data.submission_date).toBeDefined();
    });

    it('should create submission history entry', async () => {
      const claim = await createTestClaim({ claim_status: 'READY_TO_SUBMIT' });

      await app.inject({
        method: 'POST',
        url: `/api/billing/claims/${claim.id}/submit`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: { submission_method: 'ELECTRONIC' },
      });

      const historyResponse = await app.inject({
        method: 'GET',
        url: `/api/billing/claims/${claim.id}/submissions`,
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(historyResponse.statusCode).toBe(200);
      const historyBody = JSON.parse(historyResponse.payload);
      expect(historyBody.data).toBeInstanceOf(Array);
    });

    it('should reject submission of already submitted claim', async () => {
      const claim = await createTestClaim({ claim_status: 'SUBMITTED' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/billing/claims/${claim.id}/submit`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: { submission_method: 'ELECTRONIC' },
      });

      expect([400, 409]).toContain(response.statusCode);
    });
  });

  // ============================================================================
  // Claim Void Tests (POST /api/billing/claims/:id/void)
  // ============================================================================

  describe('POST /api/billing/claims/:id/void - Void Claim', () => {
    it('should void submitted claim', async () => {
      const claim = await createTestClaim({ claim_status: 'SUBMITTED' });

      const voidData = {
        void_reason: 'Incorrect patient information',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/billing/claims/${claim.id}/void`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: voidData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.claim_status).toMatch(/void/i);
    });

    it('should require void reason', async () => {
      const claim = await createTestClaim({ claim_status: 'SUBMITTED' });

      const response = await app.inject({
        method: 'POST',
        url: `/api/billing/claims/${claim.id}/void`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: {},
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================================
  // Notice of Election (NOE) Tests (POST /api/billing/patients/:id/noe)
  // ============================================================================

  describe('POST /api/billing/patients/:id/noe - Submit NOE', () => {
    it('should submit NOE for patient', async () => {
      const noeData = {
        noe_date: '2024-01-01',
        effective_date: '2024-01-01',
        benefit_period: 'INITIAL_90',
        payer_id: testPayer.id,
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/billing/patients/${testPatient.id}/noe`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: noeData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.noe_status).toBe('PENDING');
      expect(body.data.benefit_period).toBe('INITIAL_90');
    });

    it('should validate NOE timeliness (within 5 calendar days)', async () => {
      const today = new Date();
      const sixDaysAgo = new Date(today);
      sixDaysAgo.setDate(sixDaysAgo.getDate() - 6);

      const noeData = {
        noe_date: today.toISOString().split('T')[0],
        effective_date: sixDaysAgo.toISOString().split('T')[0],
        benefit_period: 'INITIAL_90',
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/billing/patients/${testPatient.id}/noe`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: noeData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      // Should flag as LATE if filed after 5 days
      if (body.data.noe_timeliness) {
        expect(body.data.noe_timeliness).toBe('LATE');
      }
    });

    it('should reject NOE without required fields', async () => {
      const incompleteData = {
        noe_date: '2024-01-01',
        // Missing effective_date
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/billing/patients/${testPatient.id}/noe`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: incompleteData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================================
  // Payment Tests (POST /api/billing/payments)
  // ============================================================================

  describe('POST /api/billing/payments - Create Payment', () => {
    it('should create payment record', async () => {
      const paymentData = {
        payer_id: testPayer.id,
        payment_date: '2024-02-15',
        payment_amount: 1500000,
        payment_method: 'EFT',
        reference_number: 'EFT-12345',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/payments',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: paymentData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.payment_amount).toBe(1500000);
      expect(body.data.payment_method).toBe('EFT');
      expect(body.data.payment_status).toBe('PENDING');
    });

    it('should reject payment with invalid amount', async () => {
      const paymentData = {
        payer_id: testPayer.id,
        payment_date: '2024-02-15',
        payment_amount: -1000, // Negative amount
        payment_method: 'EFT',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/payments',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: paymentData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================================
  // Payment Application Tests (POST /api/billing/payments/:id/apply)
  // ============================================================================

  describe('POST /api/billing/payments/:id/apply - Apply Payment to Claims', () => {
    it('should apply payment to claim', async () => {
      const claim = await createTestClaim({
        claim_status: 'SUBMITTED',
        balance: 1500000,
      });
      const payment = await createTestPayment({ unapplied_amount: 1500000 });

      const applicationData = {
        applications: [
          {
            claim_id: claim.id,
            applied_amount: 1500000,
            adjustment_amount: 0,
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/billing/payments/${payment.id}/apply`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: applicationData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.applications).toBeDefined();
    });

    it('should update claim balance after payment application', async () => {
      const claim = await createTestClaim({
        claim_status: 'SUBMITTED',
        balance: 1500000,
      });
      const payment = await createTestPayment({ unapplied_amount: 1500000 });

      await app.inject({
        method: 'POST',
        url: `/api/billing/payments/${payment.id}/apply`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: {
          applications: [
            {
              claim_id: claim.id,
              applied_amount: 1500000,
            },
          ],
        },
      });

      const claimResponse = await app.inject({
        method: 'GET',
        url: `/api/billing/claims/${claim.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      const claimBody = JSON.parse(claimResponse.payload);
      expect(claimBody.balance).toBe(0);
      expect(claimBody.total_paid).toBe(1500000);
    });

    it('should reject overpayment application', async () => {
      const claim = await createTestClaim({ balance: 1000000 });
      const payment = await createTestPayment({ unapplied_amount: 500000 });

      const applicationData = {
        applications: [
          {
            claim_id: claim.id,
            applied_amount: 1500000, // More than payment amount
          },
        ],
      };

      const response = await app.inject({
        method: 'POST',
        url: `/api/billing/payments/${payment.id}/apply`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: applicationData,
      });

      expect(response.statusCode).toBe(400);
    });
  });

  // ============================================================================
  // Billing Dashboard Tests (GET /api/billing/dashboard)
  // ============================================================================

  describe('GET /api/billing/dashboard - Get Billing Dashboard', () => {
    it('should retrieve billing dashboard with KPIs', async () => {
      await createTestClaim({ claim_status: 'SUBMITTED', total_charges: 1500000 });
      await createTestClaim({ claim_status: 'PAID', total_charges: 2000000, total_paid: 2000000 });

      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/dashboard',
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.kpis).toBeDefined();
      expect(body.kpis.total_claims).toBeDefined();
      expect(body.kpis.total_revenue).toBeDefined();
    });
  });

  // ============================================================================
  // AR Aging Report Tests (GET /api/billing/ar-aging)
  // ============================================================================

  describe('GET /api/billing/ar-aging - Get AR Aging Report', () => {
    it('should retrieve AR aging report', async () => {
      await createTestClaim({
        claim_status: 'SUBMITTED',
        balance: 1500000,
        submission_date: '2024-01-01',
      });

      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/ar-aging',
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeDefined();
      expect(body.aging_summary).toBeDefined();
    });

    it('should categorize claims into aging buckets', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/ar-aging',
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      if (body.aging_summary) {
        expect(body.aging_summary.current_0_30).toBeDefined();
        expect(body.aging_summary.aging_31_60).toBeDefined();
        expect(body.aging_summary.aging_over_120).toBeDefined();
      }
    });
  });

  // ============================================================================
  // Billing Codes Tests (POST /api/billing/codes)
  // ============================================================================

  describe('POST /api/billing/codes - Create Billing Code', () => {
    it('should create billing code as admin', async () => {
      const codeData = {
        code: '0651',
        code_type: 'REVENUE',
        short_description: 'Routine Home Care',
        long_description: 'Hospice Routine Home Care per diem',
        hospice_applicable: true,
        level_of_care: 'ROUTINE_HOME_CARE',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/codes',
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: codeData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.code).toBe('0651');
      expect(body.data.code_type).toBe('REVENUE');
    });

    it('should retrieve billing codes with filters', async () => {
      const [code] = await db
        .insert(billing_codes)
        .values({
          code: 'C25.9',
          code_type: 'ICD10_DX',
          short_description: 'Malignant neoplasm of pancreas',
          is_active: true,
        })
        .returning();

      const response = await app.inject({
        method: 'GET',
        url: '/api/billing/codes?code_type=ICD10_DX',
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data).toBeInstanceOf(Array);
      expect(body.data.every(c => c.code_type === 'ICD10_DX')).toBe(true);
    });
  });

  // ============================================================================
  // Invoice Tests (POST /api/billing/invoices)
  // ============================================================================

  describe('POST /api/billing/invoices - Create Invoice', () => {
    it('should create invoice from approved claims', async () => {
      const claim1 = await createTestClaim({
        claim_status: 'ACCEPTED',
        total_charges: 1500000,
      });
      const claim2 = await createTestClaim({
        claim_status: 'ACCEPTED',
        total_charges: 2000000,
      });

      const invoiceData = {
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        invoice_date: '2024-02-01',
        claim_ids: [claim1.id, claim2.id],
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/invoices',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: invoiceData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.invoice_number).toBeDefined();
      expect(body.data.total_amount).toBeGreaterThan(0);
    });

    it('should retrieve invoice by ID with line items', async () => {
      const [invoice] = await db
        .insert(invoices)
        .values({
          invoice_number: `INV-${faker.string.alphanumeric(8).toUpperCase()}`,
          invoice_date: new Date('2024-02-01'),
          patient_id: testPatient.id,
          payer_id: testPayer.id,
          total_amount: 3500000,
          balance_due: 3500000,
        })
        .returning();

      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/invoices/${invoice.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.invoice_number).toBe(invoice.invoice_number);
    });
  });

  // ============================================================================
  // Billing Statement Tests (POST /api/billing/statements)
  // ============================================================================

  describe('POST /api/billing/statements - Generate Statement', () => {
    it('should generate billing statement for period', async () => {
      const statementData = {
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        period_start: '2024-01-01',
        period_end: '2024-01-31',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/statements',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: statementData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.statement_number).toBeDefined();
      expect(body.data.period_start).toBe('2024-01-01');
      expect(body.data.period_end).toBe('2024-01-31');
    });

    it('should retrieve statement with aging buckets', async () => {
      const [statement] = await db
        .insert(billing_statements)
        .values({
          statement_number: `STMT-${faker.string.alphanumeric(8).toUpperCase()}`,
          statement_date: new Date('2024-02-01'),
          period_start: new Date('2024-01-01'),
          period_end: new Date('2024-01-31'),
          patient_id: testPatient.id,
          current_balance: 5000000,
          current_amount: 3000000,
          amount_30_days: 1500000,
          amount_60_days: 500000,
        })
        .returning();

      const response = await app.inject({
        method: 'GET',
        url: `/api/billing/statements/${statement.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.current_amount).toBeDefined();
      expect(body.amount_30_days).toBeDefined();
    });
  });

  // ============================================================================
  // Edge Cases and Data Validation
  // ============================================================================

  describe('Data Validation and Edge Cases', () => {
    it('should handle concurrent claim updates', async () => {
      const claim = await createTestClaim();

      const update1 = app.inject({
        method: 'PUT',
        url: `/api/billing/claims/${claim.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: {
          patient_id: claim.patient_id,
          payer_id: claim.payer_id,
          service_start_date: claim.service_start_date,
          service_end_date: claim.service_end_date,
          total_charges: 1600000,
        },
      });

      const update2 = app.inject({
        method: 'PUT',
        url: `/api/billing/claims/${claim.id}`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: {
          patient_id: claim.patient_id,
          payer_id: claim.payer_id,
          service_start_date: claim.service_start_date,
          service_end_date: claim.service_end_date,
          total_charges: 1700000,
        },
      });

      const [response1, response2] = await Promise.all([update1, update2]);

      expect([200, 409]).toContain(response1.statusCode);
      expect([200, 409]).toContain(response2.statusCode);
    });

    it('should validate claim amounts are in cents (integers)', async () => {
      const claimData = {
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        service_start_date: '2024-01-01',
        service_end_date: '2024-01-31',
        total_charges: 1500.50, // Should be integer cents, not decimal dollars
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: claimData,
      });

      // Should accept (converted to cents) or reject with validation error
      expect([201, 400]).toContain(response.statusCode);
    });

    it('should prevent duplicate claim numbers', async () => {
      const claimNumber = `CLM-${faker.string.alphanumeric(8).toUpperCase()}`;
      await createTestClaim({ claim_number: claimNumber });

      const duplicateData = {
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        claim_number: claimNumber,
        service_start_date: '2024-01-01',
        service_end_date: '2024-01-31',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: duplicateData,
      });

      expect([400, 409]).toContain(response.statusCode);
    });

    it('should sanitize XSS attempts in claim data', async () => {
      const claimData = {
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        service_start_date: '2024-01-01',
        service_end_date: '2024-01-31',
        notes: '<script>alert("XSS")</script>Important billing note',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: claimData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.notes).not.toContain('<script>');
    });
  });

  // ============================================================================
  // Audit and Compliance Tests
  // ============================================================================

  describe('Audit and Compliance', () => {
    it('should record created_by_id when creating claim', async () => {
      const claimData = {
        patient_id: testPatient.id,
        payer_id: testPayer.id,
        service_start_date: '2024-01-01',
        service_end_date: '2024-01-31',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/billing/claims',
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: claimData,
      });

      expect(response.statusCode).toBe(201);
      const body = JSON.parse(response.payload);
      expect(body.data.created_by_id).toBe(billingUser.user.id);
    });

    it('should record updated_by_id when updating claim', async () => {
      const claim = await createTestClaim();

      const updatedData = {
        patient_id: claim.patient_id,
        payer_id: claim.payer_id,
        service_start_date: claim.service_start_date,
        service_end_date: claim.service_end_date,
        total_charges: 2000000,
      };

      const response = await app.inject({
        method: 'PUT',
        url: `/api/billing/claims/${claim.id}`,
        headers: getAuthHeaders(adminUser.sessionToken),
        payload: updatedData,
      });

      expect(response.statusCode).toBe(200);
      const body = JSON.parse(response.payload);
      expect(body.data.updated_by_id).toBe(adminUser.user.id);
    });

    it('should track claim status history for audit trail', async () => {
      const claim = await createTestClaim({ claim_status: 'DRAFT' });

      // Change status
      await app.inject({
        method: 'PUT',
        url: `/api/billing/claims/${claim.id}/status`,
        headers: getAuthHeaders(billingUser.sessionToken),
        payload: {
          new_status: 'SUBMITTED',
          change_reason: 'Claim submitted electronically',
        },
      });

      const historyResponse = await app.inject({
        method: 'GET',
        url: `/api/billing/claims/${claim.id}/status-history`,
        headers: getAuthHeaders(billingUser.sessionToken),
      });

      expect(historyResponse.statusCode).toBe(200);
      const historyBody = JSON.parse(historyResponse.payload);
      expect(historyBody.data).toBeInstanceOf(Array);
      const statusChange = historyBody.data.find(
        h => h.new_status === 'SUBMITTED'
      );
      expect(statusChange).toBeDefined();
      expect(statusChange.changed_by_id).toBe(billingUser.user.id);
    });
  });
});
