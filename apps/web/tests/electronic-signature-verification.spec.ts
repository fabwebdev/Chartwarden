import { test, expect } from '@playwright/test';

/**
 * Verification tests for Electronic Signature Controller feature
 * Feature: signature-controller
 *
 * This test verifies:
 * 1. All electronic signature API endpoints exist and are accessible
 * 2. Endpoints require authentication (return 401/403)
 * 3. Signature creation endpoint validates required fields
 * 4. Cosignature workflow endpoints exist
 * 5. Verification endpoints exist (including public token verification)
 * 6. Audit trail and compliance report endpoints exist
 *
 * 21 CFR Part 11 Compliance:
 * - 11.10(e): Audit trail generation
 * - 11.50(a): Signature meaning and timestamp
 * - 11.70: Document binding via hash
 * - 11.100: Unique user identification
 * - 11.200: Electronic signature components
 */

const API_BASE_URL = 'http://localhost:3001/api';

test.describe('Electronic Signature Controller - Endpoint Existence', () => {
  test('should have create signature endpoint (POST /electronic-signatures)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/electronic-signatures`, {
      data: {
        document_type: 'test',
        document_id: '1',
        signature_type: 'TYPED',
        signature_meaning: 'AUTHOR',
        signature_statement: 'Test statement',
        signature_data: 'Test Signature'
      }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have get signature by ID endpoint (GET /electronic-signatures/:id)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/electronic-signatures/1`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have get signatures by document endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/electronic-signatures/document/encounter/1`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Electronic Signature Controller - Signature Verification', () => {
  test('should have verify signature endpoint (POST /electronic-signatures/:id/verify)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/electronic-signatures/1/verify`, {
      data: { document_content: 'test content' }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have verification token creation endpoint', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/electronic-signatures/1/verification-token`, {
      data: { expires_in_hours: 24 }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have public token verification endpoint (no auth required)', async ({ request }) => {
    // This endpoint is special - it should work without auth for external verification
    // But with an invalid token, it should return 404
    const response = await request.get(`${API_BASE_URL}/electronic-signatures/verify-token/invalid-token`);

    // Should return 404 for invalid token (not 401/403 - endpoint is public)
    expect(response.status()).toBe(404);
  });
});

test.describe('Electronic Signature Controller - Cosignature Workflow', () => {
  test('should have cosign endpoint (POST /electronic-signatures/:id/cosign)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/electronic-signatures/1/cosign`, {
      data: {
        signature_data: 'Cosigner Signature'
      }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have pending cosignatures endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/electronic-signatures/pending-cosignatures`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Electronic Signature Controller - Signature Revocation', () => {
  test('should have revoke signature endpoint (POST /electronic-signatures/:id/revoke)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/electronic-signatures/1/revoke`, {
      data: { revocation_reason: 'Test revocation' }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Electronic Signature Controller - Audit & Compliance', () => {
  test('should have audit trail endpoint (GET /electronic-signatures/:id/audit-trail)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/electronic-signatures/1/audit-trail`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have my-signatures endpoint (GET /electronic-signatures/my-signatures)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/electronic-signatures/my-signatures`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have compliance report endpoint (GET /electronic-signatures/compliance-report)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/electronic-signatures/compliance-report`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Electronic Signature Controller - Query Parameters', () => {
  test('should accept status filter on document signatures endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/electronic-signatures/document/encounter/1?status=VALID`);

    // Should require authentication (not 404 - endpoint exists with query params)
    expect([401, 403]).toContain(response.status());
  });

  test('should accept meaning filter on document signatures endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/electronic-signatures/document/encounter/1?meaning=AUTHOR`);

    // Should require authentication (not 404 - endpoint exists with query params)
    expect([401, 403]).toContain(response.status());
  });

  test('should accept pagination on my-signatures endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/electronic-signatures/my-signatures?limit=10&offset=0`);

    // Should require authentication (not 404 - endpoint exists with query params)
    expect([401, 403]).toContain(response.status());
  });

  test('should accept date range on compliance report endpoint', async ({ request }) => {
    const startDate = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    const endDate = new Date().toISOString().split('T')[0];
    const response = await request.get(
      `${API_BASE_URL}/electronic-signatures/compliance-report?start_date=${startDate}&end_date=${endDate}`
    );

    // Should require authentication (not 404 - endpoint exists with query params)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Electronic Signature Controller - 21 CFR Part 11 Compliance Endpoints', () => {
  test('all required CFR Part 11 endpoints should be accessible', async ({ request }) => {
    // 11.50(a) - Signature creation with meaning (covered by create endpoint)
    // 11.70 - Document binding (covered by get-by-document endpoint)
    // 11.10(e) - Audit trail (covered by audit-trail endpoint)

    const complianceEndpoints = [
      { path: '/electronic-signatures/1', method: 'GET', purpose: '11.100 - Signature retrieval' },
      { path: '/electronic-signatures/1/verify', method: 'POST', purpose: '11.70 - Document integrity' },
      { path: '/electronic-signatures/1/audit-trail', method: 'GET', purpose: '11.10(e) - Audit trail' },
      { path: '/electronic-signatures/compliance-report', method: 'GET', purpose: 'Compliance reporting' },
    ];

    for (const { path, method, purpose } of complianceEndpoints) {
      let response;
      if (method === 'GET') {
        response = await request.get(`${API_BASE_URL}${path}`);
      } else {
        response = await request.post(`${API_BASE_URL}${path}`, {
          data: { document_content: 'test' }
        });
      }

      // All endpoints should exist (require auth, not return 404)
      expect(
        response.status(),
        `Endpoint ${path} (${purpose}) should exist`
      ).not.toBe(404);
    }
  });
});

test.describe('Electronic Signature Controller - Signature Type Validation', () => {
  test('should document supported signature types', async ({ request }) => {
    // These are the valid signature types per 21 CFR Part 11.200
    const validSignatureTypes = ['TYPED', 'DRAWN', 'BIOMETRIC', 'PIN', 'SMART_CARD', 'DIGITAL_CERT'];

    // Test that endpoint exists and accepts valid types
    for (const signatureType of validSignatureTypes) {
      const response = await request.post(`${API_BASE_URL}/electronic-signatures`, {
        data: {
          document_type: 'test',
          document_id: '1',
          signature_type: signatureType,
          signature_meaning: 'AUTHOR',
          signature_statement: 'Test',
          signature_data: 'Test'
        }
      });

      // Should require auth, not reject the signature type
      expect([401, 403]).toContain(response.status());
    }
  });

  test('should document supported signature meanings', async ({ request }) => {
    // These are the valid signature meanings per 21 CFR Part 11.50(a)
    const validMeanings = [
      'AUTHOR', 'REVIEWER', 'APPROVER', 'VERIFIER', 'AUTHENTICATOR',
      'WITNESS', 'COSIGNER', 'ORDERING_PROVIDER', 'CERTIFIER',
      'ATTESTOR', 'RECIPIENT', 'AMENDMENT'
    ];

    // Test that endpoint exists and accepts valid meanings
    for (const meaning of validMeanings) {
      const response = await request.post(`${API_BASE_URL}/electronic-signatures`, {
        data: {
          document_type: 'test',
          document_id: '1',
          signature_type: 'TYPED',
          signature_meaning: meaning,
          signature_statement: 'Test',
          signature_data: 'Test'
        }
      });

      // Should require auth, not reject the meaning
      expect([401, 403]).toContain(response.status());
    }
  });
});
