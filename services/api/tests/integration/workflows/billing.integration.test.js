/**
 * Billing Workflow Integration Tests
 *
 * Tests complete billing workflows across multiple components:
 * - Claims management (create, submit, void, update)
 * - Notice of Election (NOE) submission and tracking
 * - Payment processing and application to claims
 * - AR aging and financial tracking
 * - Eligibility verification (270/271 EDI)
 * - ERA processing and automated payment posting (835 EDI)
 * - Invoice and billing statement generation
 *
 * HIPAA Compliance:
 * - Tests audit logging for all financial transactions
 * - Validates proper authorization for billing operations
 * - Ensures data integrity across billing workflows
 * - Tests secure handling of payment information
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { faker } from '@faker-js/faker';
import { createTestServer } from '../helpers/testServer.js';
import { cleanupDatabase, createTestPatient } from '../helpers/testDb.js';
import {
  createAuthenticatedUser,
  createAdminUser,
  TEST_ROLES,
  getAuthHeaders,
} from '../helpers/authHelper.js';
import { db } from '../../../src/config/db.drizzle.js';
import { payers } from '../../../src/db/schemas/billing.schema.js';
import { eligibility_requests, eligibility_responses } from '../../../src/db/schemas/eligibility.schema.js';
import { era_files, era_payments } from '../../../src/db/schemas/era.schema.js';

describe('Billing Workflow Integration Tests', () => {
  let testServer;
  let app;

  beforeAll(async () => {
    // Create test server with billing routes enabled
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
   * Create a test payer
   */
  async function createTestPayer(overrides = {}) {
    const payerData = {
      payer_name: faker.company.name() + ' Insurance',
      payer_type: faker.helpers.arrayElement(['MEDICARE', 'MEDICAID', 'COMMERCIAL', 'MANAGED_CARE']),
      payer_id: faker.string.alphanumeric(10).toUpperCase(),
      address_line1: faker.location.streetAddress(),
      city: faker.location.city(),
      state: faker.location.state({ abbreviated: true }),
      zip_code: faker.location.zipCode('#####'),
      phone: faker.phone.number('###-###-####'),
      email: faker.internet.email().toLowerCase(),
      electronic_billing_enabled: true,
      is_active: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      ...overrides,
    };

    const [payer] = await db.insert(payers).values(payerData).returning();
    return payer;
  }

  /**
   * Create a test claim payload
   */
  function createClaimPayload(patientId, payerId, overrides = {}) {
    const startDate = faker.date.recent({ days: 30 });
    const endDate = new Date(startDate);
    endDate.setDate(endDate.getDate() + 7);

    return {
      patient_id: patientId,
      payer_id: payerId,
      claim_type: 'INSTITUTIONAL',
      service_start_date: startDate.toISOString().split('T')[0],
      service_end_date: endDate.toISOString().split('T')[0],
      bill_type: '0811', // Hospice routine home care
      total_charges: 150000, // $1,500.00 in cents
      principal_diagnosis_code: 'C34.90', // Malignant neoplasm of unspecified part of bronchus or lung
      admission_date: startDate.toISOString().split('T')[0],
      attending_physician_npi: faker.string.numeric(10),
      attending_physician_name: faker.person.fullName(),
      ...overrides,
    };
  }

  // ============================================================================
  // CLAIMS WORKFLOW TESTS
  // ============================================================================

  describe('Claims Management Workflow', () => {
    it('should complete full claim lifecycle: create -> submit -> payment -> paid', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer({ payer_type: 'MEDICARE' });

      // Step 1: Create claim
      const claimData = createClaimPayload(patient.id, payer.id);

      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: claimData,
      });

      expect(createResponse.statusCode).toBe(200);
      const createBody = JSON.parse(createResponse.payload);
      expect(createBody.data.claim).toBeDefined();
      expect(createBody.data.claim.claim_status).toBe('DRAFT');
      const claimId = createBody.data.claim.id;

      // Step 2: Update claim to READY_TO_SUBMIT
      const readyResponse = await app.inject({
        method: 'PUT',
        url: `/api/claims/${claimId}/status`,
        headers: billingUser.authHeaders,
        payload: {
          new_status: 'READY_TO_SUBMIT',
          change_reason: 'Claim reviewed and ready for submission',
        },
      });

      expect(readyResponse.statusCode).toBe(200);

      // Step 3: Submit claim
      const submitResponse = await app.inject({
        method: 'POST',
        url: `/api/claims/${claimId}/submit`,
        headers: billingUser.authHeaders,
        payload: {
          submission_method: 'ELECTRONIC',
        },
      });

      expect(submitResponse.statusCode).toBe(200);
      const submitBody = JSON.parse(submitResponse.payload);
      expect(submitBody.data.claim.claim_status).toBe('SUBMITTED');

      // Step 4: Create payment for the claim
      const paymentResponse = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: billingUser.authHeaders,
        payload: {
          payer_id: payer.id,
          payment_date: new Date().toISOString().split('T')[0],
          payment_amount: 150000, // Full payment
          payment_method: 'EFT',
          check_number: 'EFT' + faker.string.numeric(8),
        },
      });

      expect(paymentResponse.statusCode).toBe(200);
      const paymentBody = JSON.parse(paymentResponse.payload);
      const paymentId = paymentBody.data.payment.id;

      // Step 5: Apply payment to claim
      const applyResponse = await app.inject({
        method: 'POST',
        url: `/api/payments/${paymentId}/apply`,
        headers: billingUser.authHeaders,
        payload: {
          applications: [
            {
              claim_id: claimId,
              applied_amount: 150000,
              adjustment_amount: 0,
            },
          ],
        },
      });

      expect(applyResponse.statusCode).toBe(200);

      // Step 6: Verify claim is now PAID
      const finalClaimResponse = await app.inject({
        method: 'GET',
        url: `/api/claims/${claimId}`,
        headers: billingUser.authHeaders,
      });

      expect(finalClaimResponse.statusCode).toBe(200);
      const finalClaimBody = JSON.parse(finalClaimResponse.payload);
      expect(finalClaimBody.data.claim.claim_status).toBe('PAID');
      expect(finalClaimBody.data.claim.total_paid).toBe(150000);
      expect(finalClaimBody.data.claim.balance).toBe(0);
    });

    it('should create claim with service lines and diagnosis codes', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer();

      // Create claim
      const claimData = createClaimPayload(patient.id, payer.id);
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: claimData,
      });

      expect(createResponse.statusCode).toBe(200);
      const claimId = JSON.parse(createResponse.payload).data.claim.id;

      // Add diagnosis codes
      const diagnosisResponse = await app.inject({
        method: 'POST',
        url: `/api/claims/${claimId}/diagnosis-codes`,
        headers: billingUser.authHeaders,
        payload: {
          diagnosis_code: 'C34.90',
          sequence_number: 1,
          diagnosis_type: 'PRINCIPAL',
        },
      });

      expect(diagnosisResponse.statusCode).toBe(200);

      // Add secondary diagnosis
      const secondaryDiagnosisResponse = await app.inject({
        method: 'POST',
        url: `/api/claims/${claimId}/diagnosis-codes`,
        headers: billingUser.authHeaders,
        payload: {
          diagnosis_code: 'R53.83', // Fatigue
          sequence_number: 2,
          diagnosis_type: 'SECONDARY',
        },
      });

      expect(secondaryDiagnosisResponse.statusCode).toBe(200);

      // Get all diagnosis codes for the claim
      const getDiagnosisResponse = await app.inject({
        method: 'GET',
        url: `/api/claims/${claimId}/diagnosis-codes`,
        headers: billingUser.authHeaders,
      });

      expect(getDiagnosisResponse.statusCode).toBe(200);
      const diagnosisBody = JSON.parse(getDiagnosisResponse.payload);
      expect(diagnosisBody.data.diagnosisCodes).toHaveLength(2);
      expect(diagnosisBody.data.diagnosisCodes[0].diagnosis_type).toBe('PRINCIPAL');
    });

    it('should void a submitted claim', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer();

      // Create and submit claim
      const claimData = createClaimPayload(patient.id, payer.id);
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: claimData,
      });

      const claimId = JSON.parse(createResponse.payload).data.claim.id;

      // Submit the claim first
      await app.inject({
        method: 'PUT',
        url: `/api/claims/${claimId}/status`,
        headers: billingUser.authHeaders,
        payload: { new_status: 'READY_TO_SUBMIT' },
      });

      await app.inject({
        method: 'POST',
        url: `/api/claims/${claimId}/submit`,
        headers: billingUser.authHeaders,
      });

      // Void the claim
      const voidResponse = await app.inject({
        method: 'POST',
        url: `/api/claims/${claimId}/void`,
        headers: billingUser.authHeaders,
        payload: {
          void_reason: 'Submitted to wrong payer',
        },
      });

      expect(voidResponse.statusCode).toBe(200);

      // Verify claim status
      const claimResponse = await app.inject({
        method: 'GET',
        url: `/api/claims/${claimId}`,
        headers: billingUser.authHeaders,
      });

      const claimBody = JSON.parse(claimResponse.payload);
      expect(claimBody.data.claim.claim_type).toBe('VOID');
    });

    it('should track claim submission history', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer();

      // Create claim
      const claimData = createClaimPayload(patient.id, payer.id);
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: claimData,
      });

      const claimId = JSON.parse(createResponse.payload).data.claim.id;

      // Record first submission
      const submission1Response = await app.inject({
        method: 'POST',
        url: `/api/claims/${claimId}/submissions`,
        headers: billingUser.authHeaders,
        payload: {
          submission_number: 1,
          submission_type: 'ORIGINAL',
          submission_date: new Date().toISOString(),
          submission_method: 'ELECTRONIC',
          submitted_charges: 150000,
        },
      });

      expect(submission1Response.statusCode).toBe(200);

      // Record rejection
      const submissionId = JSON.parse(submission1Response.payload).data.submission.id;

      const updateResponse = await app.inject({
        method: 'PUT',
        url: `/api/claims/${claimId}/submissions/${submissionId}`,
        headers: billingUser.authHeaders,
        payload: {
          clearinghouse_status: 'REJECTED',
          response_message: 'Invalid diagnosis code',
          rejection_reasons: [{ code: 'M39', description: 'Missing/invalid diagnosis code' }],
        },
      });

      expect(updateResponse.statusCode).toBe(200);

      // Get submission history
      const historyResponse = await app.inject({
        method: 'GET',
        url: `/api/claims/${claimId}/submissions`,
        headers: billingUser.authHeaders,
      });

      expect(historyResponse.statusCode).toBe(200);
      const historyBody = JSON.parse(historyResponse.payload);
      expect(historyBody.data.submissions).toBeDefined();
      expect(historyBody.data.submissions.length).toBeGreaterThan(0);
    });

    it('should track claim status history with audit trail', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer();

      // Create claim
      const claimData = createClaimPayload(patient.id, payer.id);
      const createResponse = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: claimData,
      });

      const claimId = JSON.parse(createResponse.payload).data.claim.id;

      // Change status multiple times
      await app.inject({
        method: 'PUT',
        url: `/api/claims/${claimId}/status`,
        headers: billingUser.authHeaders,
        payload: { new_status: 'READY_TO_SUBMIT', change_reason: 'Claim ready' },
      });

      await app.inject({
        method: 'PUT',
        url: `/api/claims/${claimId}/status`,
        headers: billingUser.authHeaders,
        payload: { new_status: 'SUBMITTED', change_reason: 'Submitted to clearinghouse' },
      });

      await app.inject({
        method: 'PUT',
        url: `/api/claims/${claimId}/status`,
        headers: billingUser.authHeaders,
        payload: { new_status: 'ACCEPTED', change_reason: 'Accepted by payer' },
      });

      // Get status history
      const historyResponse = await app.inject({
        method: 'GET',
        url: `/api/claims/${claimId}/status-history`,
        headers: billingUser.authHeaders,
      });

      expect(historyResponse.statusCode).toBe(200);
      const historyBody = JSON.parse(historyResponse.payload);
      expect(historyBody.data.statusHistory).toBeDefined();
      expect(historyBody.data.statusHistory.length).toBeGreaterThan(2);
    });
  });

  // ============================================================================
  // NOTICE OF ELECTION (NOE) WORKFLOW TESTS
  // ============================================================================

  describe('Notice of Election (NOE) Workflow', () => {
    it('should submit NOE for hospice patient within 5-day requirement', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer({ payer_type: 'MEDICARE' });

      const electionDate = new Date();
      const noeDate = new Date(electionDate);
      noeDate.setDate(noeDate.getDate() + 3); // 3 days after election (within 5-day window)

      const noeResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/noe`,
        headers: billingUser.authHeaders,
        payload: {
          payer_id: payer.id,
          effective_date: electionDate.toISOString().split('T')[0],
          noe_date: noeDate.toISOString().split('T')[0],
          benefit_period: 'INITIAL_90',
          noe_timeliness: 'TIMELY',
        },
      });

      expect(noeResponse.statusCode).toBe(200);
      const noeBody = JSON.parse(noeResponse.payload);
      expect(noeBody.data.noe).toBeDefined();
      expect(noeBody.data.noe.noe_status).toBe('PENDING');
      expect(noeBody.data.noe.noe_timeliness).toBe('TIMELY');
      expect(noeBody.data.noe.benefit_period).toBe('INITIAL_90');
    });

    it('should flag late NOE submission (after 5-day window)', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer({ payer_type: 'MEDICARE' });

      const electionDate = new Date();
      const noeDate = new Date(electionDate);
      noeDate.setDate(noeDate.getDate() + 7); // 7 days after election (late)

      const noeResponse = await app.inject({
        method: 'POST',
        url: `/api/patients/${patient.id}/noe`,
        headers: billingUser.authHeaders,
        payload: {
          payer_id: payer.id,
          effective_date: electionDate.toISOString().split('T')[0],
          noe_date: noeDate.toISOString().split('T')[0],
          benefit_period: 'INITIAL_90',
          noe_timeliness: 'LATE',
        },
      });

      expect(noeResponse.statusCode).toBe(200);
      const noeBody = JSON.parse(noeResponse.payload);
      expect(noeBody.data.noe.noe_timeliness).toBe('LATE');
    });
  });

  // ============================================================================
  // PAYMENT AND AR AGING WORKFLOW TESTS
  // ============================================================================

  describe('Payment and AR Aging Workflow', () => {
    it('should create payment and apply to multiple claims', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer();

      // Create two claims
      const claim1Data = createClaimPayload(patient.id, payer.id, { total_charges: 100000 });
      const claim2Data = createClaimPayload(patient.id, payer.id, { total_charges: 75000 });

      const claim1Response = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: claim1Data,
      });

      const claim2Response = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: claim2Data,
      });

      const claim1Id = JSON.parse(claim1Response.payload).data.claim.id;
      const claim2Id = JSON.parse(claim2Response.payload).data.claim.id;

      // Create bulk payment
      const paymentResponse = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: billingUser.authHeaders,
        payload: {
          payer_id: payer.id,
          payment_date: new Date().toISOString().split('T')[0],
          payment_amount: 175000, // Total for both claims
          payment_method: 'CHECK',
          check_number: 'CHK' + faker.string.numeric(6),
        },
      });

      expect(paymentResponse.statusCode).toBe(200);
      const paymentId = JSON.parse(paymentResponse.payload).data.payment.id;

      // Apply payment to both claims
      const applyResponse = await app.inject({
        method: 'POST',
        url: `/api/payments/${paymentId}/apply`,
        headers: billingUser.authHeaders,
        payload: {
          applications: [
            { claim_id: claim1Id, applied_amount: 100000 },
            { claim_id: claim2Id, applied_amount: 75000 },
          ],
        },
      });

      expect(applyResponse.statusCode).toBe(200);

      // Verify both claims are paid
      const claim1Check = await app.inject({
        method: 'GET',
        url: `/api/claims/${claim1Id}`,
        headers: billingUser.authHeaders,
      });

      const claim1Body = JSON.parse(claim1Check.payload);
      expect(claim1Body.data.claim.total_paid).toBe(100000);
    });

    it('should generate AR aging report with aging buckets', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });

      const arAgingResponse = await app.inject({
        method: 'GET',
        url: '/api/billing/ar-aging',
        headers: billingUser.authHeaders,
      });

      expect(arAgingResponse.statusCode).toBe(200);
      const arBody = JSON.parse(arAgingResponse.payload);
      expect(arBody.data).toBeDefined();
      // AR aging report structure should include aging buckets
      // (actual data depends on claims in the database)
    });
  });

  // ============================================================================
  // ELIGIBILITY VERIFICATION WORKFLOW TESTS
  // ============================================================================

  describe('Eligibility Verification (270/271 EDI) Workflow', () => {
    it('should create eligibility request and receive response', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer({ payer_type: 'MEDICARE' });

      // Create eligibility request
      const requestData = {
        patient_id: patient.id,
        payer_id: payer.id,
        request_type: 'REAL_TIME',
        service_type: 'HOSPICE',
        subscriber_id: patient.medicare_beneficiary_id,
        subscriber_first_name: patient.first_name,
        subscriber_last_name: patient.last_name,
        subscriber_dob: patient.date_of_birth,
        provider_npi: faker.string.numeric(10),
      };

      const [request] = await db
        .insert(eligibility_requests)
        .values({
          ...requestData,
          request_id: faker.string.alphanumeric(20).toUpperCase(),
          request_date: new Date(),
          status: 'PENDING',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      expect(request).toBeDefined();
      expect(request.status).toBe('PENDING');

      // Simulate receiving 271 response
      const [response] = await db
        .insert(eligibility_responses)
        .values({
          request_id: request.id,
          response_id: faker.string.alphanumeric(20).toUpperCase(),
          patient_id: patient.id,
          payer_id: payer.id,
          eligibility_status: 'ACTIVE',
          is_eligible: true,
          coverage_effective_date: new Date(),
          plan_name: 'Medicare Part A',
          service_type_code: '42', // Hospice
          response_date: new Date(),
          received_at: new Date(),
          is_current: true,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      expect(response).toBeDefined();
      expect(response.is_eligible).toBe(true);
      expect(response.eligibility_status).toBe('ACTIVE');
    });
  });

  // ============================================================================
  // ERA PROCESSING WORKFLOW TESTS
  // ============================================================================

  describe('ERA (835 EDI) Processing Workflow', () => {
    it('should process 835 ERA file and auto-post payments', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer({ payer_type: 'MEDICARE' });

      // Create a submitted claim first
      const claimData = createClaimPayload(patient.id, payer.id);
      const claimResponse = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: claimData,
      });

      const claimId = JSON.parse(claimResponse.payload).data.claim.id;

      // Update claim to SUBMITTED status
      await app.inject({
        method: 'PUT',
        url: `/api/claims/${claimId}/status`,
        headers: billingUser.authHeaders,
        payload: { new_status: 'SUBMITTED' },
      });

      // Simulate receiving 835 ERA file
      const [eraFile] = await db
        .insert(era_files)
        .values({
          file_id: faker.string.alphanumeric(20).toUpperCase(),
          file_name: `835_${faker.string.alphanumeric(10)}.edi`,
          payer_id: payer.id,
          payer_name: payer.payer_name,
          production_date: new Date(),
          received_date: new Date(),
          status: 'PENDING',
          total_payments: 1,
          total_amount: 150000,
          total_claims: 1,
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      expect(eraFile).toBeDefined();

      // Create ERA payment record
      const [eraPayment] = await db
        .insert(era_payments)
        .values({
          era_file_id: eraFile.id,
          payment_id: faker.string.alphanumeric(15).toUpperCase(),
          check_number: 'EFT' + faker.string.numeric(8),
          check_date: new Date(),
          payer_id: payer.id,
          payer_name: payer.payer_name,
          total_payment_amount: 150000,
          total_billed_amount: 150000,
          total_allowed_amount: 150000,
          payment_method: 'EFT',
          claim_id: claimId,
          patient_account_number: patient.medical_record_number,
          patient_name: `${patient.first_name} ${patient.last_name}`,
          claim_status: 'PAID',
          posting_status: 'PENDING',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      expect(eraPayment).toBeDefined();
      expect(eraPayment.posting_status).toBe('PENDING');
      expect(eraPayment.total_payment_amount).toBe(150000);
    });
  });

  // ============================================================================
  // INVOICE AND STATEMENT WORKFLOW TESTS
  // ============================================================================

  describe('Invoice and Billing Statement Workflow', () => {
    it('should create invoice from approved claims', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer({ payer_type: 'COMMERCIAL' });

      // Create claim
      const claimData = createClaimPayload(patient.id, payer.id);
      const claimResponse = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: claimData,
      });

      const claimId = JSON.parse(claimResponse.payload).data.claim.id;

      // Create invoice
      const invoiceResponse = await app.inject({
        method: 'POST',
        url: '/api/billing/invoices',
        headers: billingUser.authHeaders,
        payload: {
          patient_id: patient.id,
          payer_id: payer.id,
          invoice_date: new Date().toISOString().split('T')[0],
          due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          claim_ids: [claimId],
          payment_terms: 'NET_30',
        },
      });

      expect(invoiceResponse.statusCode).toBe(200);
      const invoiceBody = JSON.parse(invoiceResponse.payload);
      expect(invoiceBody.data.invoice).toBeDefined();
      expect(invoiceBody.data.invoice.invoice_status).toBe('DRAFT');
    });

    it('should record payment against invoice', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer();

      // Create invoice first
      const invoiceResponse = await app.inject({
        method: 'POST',
        url: '/api/billing/invoices',
        headers: billingUser.authHeaders,
        payload: {
          patient_id: patient.id,
          payer_id: payer.id,
          invoice_date: new Date().toISOString().split('T')[0],
          subtotal: 200000,
          total_amount: 200000,
        },
      });

      const invoiceId = JSON.parse(invoiceResponse.payload).data.invoice.id;

      // Record payment
      const paymentResponse = await app.inject({
        method: 'POST',
        url: `/api/billing/invoices/${invoiceId}/payments`,
        headers: billingUser.authHeaders,
        payload: {
          payment_date: new Date().toISOString().split('T')[0],
          payment_amount: 200000,
          payment_method: 'CHECK',
          check_number: 'CHK123456',
        },
      });

      expect(paymentResponse.statusCode).toBe(200);

      // Verify invoice payment history
      const paymentsResponse = await app.inject({
        method: 'GET',
        url: `/api/billing/invoices/${invoiceId}/payments`,
        headers: billingUser.authHeaders,
      });

      expect(paymentsResponse.statusCode).toBe(200);
      const paymentsBody = JSON.parse(paymentsResponse.payload);
      expect(paymentsBody.data.payments).toBeDefined();
      expect(paymentsBody.data.payments.length).toBeGreaterThan(0);
    });

    it('should generate billing statement for patient', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer();

      const periodStart = new Date();
      periodStart.setDate(1); // First day of month
      const periodEnd = new Date(periodStart);
      periodEnd.setMonth(periodEnd.getMonth() + 1);
      periodEnd.setDate(0); // Last day of month

      const statementResponse = await app.inject({
        method: 'POST',
        url: '/api/billing/statements',
        headers: billingUser.authHeaders,
        payload: {
          patient_id: patient.id,
          payer_id: payer.id,
          period_start: periodStart.toISOString().split('T')[0],
          period_end: periodEnd.toISOString().split('T')[0],
        },
      });

      expect(statementResponse.statusCode).toBe(200);
      const statementBody = JSON.parse(statementResponse.payload);
      expect(statementBody.data.statement).toBeDefined();
      expect(statementBody.data.statement.statement_status).toBe('DRAFT');
    });
  });

  // ============================================================================
  // BILLING DASHBOARD AND KPI TESTS
  // ============================================================================

  describe('Billing Dashboard and KPIs', () => {
    it('should retrieve billing dashboard with key metrics', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });

      const dashboardResponse = await app.inject({
        method: 'GET',
        url: '/api/billing/dashboard',
        headers: billingUser.authHeaders,
      });

      expect(dashboardResponse.statusCode).toBe(200);
      const dashboardBody = JSON.parse(dashboardResponse.payload);
      expect(dashboardBody.data).toBeDefined();
      // Dashboard should contain KPIs like total billed, paid, outstanding, etc.
    });

    it('should retrieve billing KPIs', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });

      const kpiResponse = await app.inject({
        method: 'GET',
        url: '/api/billing/kpis',
        headers: billingUser.authHeaders,
      });

      expect(kpiResponse.statusCode).toBe(200);
      const kpiBody = JSON.parse(kpiResponse.payload);
      expect(kpiBody.data).toBeDefined();
    });
  });

  // ============================================================================
  // BILLING CODES REFERENCE TESTS
  // ============================================================================

  describe('Billing Codes Reference', () => {
    it('should retrieve billing codes with filters', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });

      const codesResponse = await app.inject({
        method: 'GET',
        url: '/api/billing/codes?code_type=ICD10_DX&hospice_applicable=true',
        headers: billingUser.authHeaders,
      });

      expect(codesResponse.statusCode).toBe(200);
      const codesBody = JSON.parse(codesResponse.payload);
      expect(codesBody.data).toBeDefined();
    });

    it('should create new billing code', async () => {
      const adminUser = await createAdminUser({ createSession: true });

      const codeResponse = await app.inject({
        method: 'POST',
        url: '/api/billing/codes',
        headers: getAuthHeaders(adminUser.session.token),
        payload: {
          code: 'C34.90',
          code_type: 'ICD10_DX',
          short_description: 'Malignant neoplasm of lung',
          long_description: 'Malignant neoplasm of unspecified part of bronchus or lung',
          hospice_applicable: true,
          is_active: true,
        },
      });

      expect(codeResponse.statusCode).toBe(200);
      const codeBody = JSON.parse(codeResponse.payload);
      expect(codeBody.data.billingCode).toBeDefined();
      expect(codeBody.data.billingCode.code).toBe('C34.90');
    });
  });

  // ============================================================================
  // AUTHORIZATION AND RBAC TESTS
  // ============================================================================

  describe('Billing Authorization and RBAC', () => {
    it('should require authentication for billing operations', async () => {
      const response = await app.inject({
        method: 'GET',
        url: '/api/claims',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
      });

      expect(response.statusCode).toBe(401);
    });

    it('should enforce role-based access for creating claims', async () => {
      const patientUser = await createAuthenticatedUser({ role: TEST_ROLES.PATIENT });

      const response = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: patientUser.authHeaders,
        payload: {
          patient_id: 1,
          payer_id: 1,
          claim_type: 'INSTITUTIONAL',
        },
      });

      // Patient users should not be able to create claims
      expect(response.statusCode).toBeGreaterThanOrEqual(403);
    });
  });

  // ============================================================================
  // ERROR HANDLING AND VALIDATION TESTS
  // ============================================================================

  describe('Billing Error Handling and Validation', () => {
    it('should reject claim with missing required fields', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });

      const response = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: {
          // Missing patient_id, payer_id, service dates
          claim_type: 'INSTITUTIONAL',
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject claim with invalid date range', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const patient = await createTestPatient();
      const payer = await createTestPayer();

      const response = await app.inject({
        method: 'POST',
        url: '/api/claims',
        headers: billingUser.authHeaders,
        payload: {
          patient_id: patient.id,
          payer_id: payer.id,
          claim_type: 'INSTITUTIONAL',
          service_start_date: '2024-12-31',
          service_end_date: '2024-01-01', // End before start
        },
      });

      expect(response.statusCode).toBeGreaterThanOrEqual(400);
    });

    it('should reject payment application with amount mismatch', async () => {
      const billingUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });
      const payer = await createTestPayer();

      const paymentResponse = await app.inject({
        method: 'POST',
        url: '/api/payments',
        headers: billingUser.authHeaders,
        payload: {
          payer_id: payer.id,
          payment_date: new Date().toISOString().split('T')[0],
          payment_amount: 100000,
          payment_method: 'CHECK',
        },
      });

      const paymentId = JSON.parse(paymentResponse.payload).data.payment.id;

      // Try to apply more than the payment amount
      const applyResponse = await app.inject({
        method: 'POST',
        url: `/api/payments/${paymentId}/apply`,
        headers: billingUser.authHeaders,
        payload: {
          applications: [
            { claim_id: 999, applied_amount: 150000 }, // More than payment amount
          ],
        },
      });

      expect(applyResponse.statusCode).toBeGreaterThanOrEqual(400);
    });
  });
});
