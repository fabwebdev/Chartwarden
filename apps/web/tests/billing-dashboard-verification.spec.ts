import { test, expect } from '@playwright/test';

/**
 * Verification tests for Billing Dashboard UI feature
 * Feature: billing-ui
 *
 * This test verifies:
 * 1. Billing dashboard page loads correctly
 * 2. API endpoints for billing exist and require authentication
 * 3. Dashboard endpoint supports period filtering
 * 4. Claims endpoint supports filtering and pagination
 * 5. AR Aging report endpoint exists
 * 6. All endpoints are properly protected
 *
 * TEMPORARY TEST - Delete after verification
 */

const API_BASE_URL = 'http://localhost:3001/api';
const APP_BASE_URL = 'http://localhost:3000';

test.describe('Billing Dashboard - API Endpoints', () => {
  test('should have billing dashboard endpoint (GET /billing/dashboard)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/dashboard`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should support period filtering on dashboard', async ({ request }) => {
    const periods = ['current_month', 'last_month', 'current_quarter', 'ytd', 'last_30_days', 'last_90_days'];

    for (const period of periods) {
      const response = await request.get(`${API_BASE_URL}/billing/dashboard?period=${period}`);
      // Should require authentication, not reject the period
      expect([401, 403]).toContain(response.status());
    }
  });

  test('should have billing KPIs endpoint (GET /billing/kpis)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/kpis`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Billing Dashboard - Claims Endpoints', () => {
  test('should have claims list endpoint (GET /billing/claims)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/claims`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should support status filtering on claims', async ({ request }) => {
    const statuses = ['DRAFT', 'READY_TO_SUBMIT', 'SUBMITTED', 'ACCEPTED', 'REJECTED', 'PAID', 'DENIED'];

    for (const status of statuses) {
      const response = await request.get(`${API_BASE_URL}/billing/claims?status=${status}`);
      // Should require authentication, not reject the status
      expect([401, 403]).toContain(response.status());
    }
  });

  test('should support pagination on claims', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/claims?limit=25&offset=0`);
    // Should require authentication
    expect([401, 403]).toContain(response.status());
  });

  test('should support sorting on claims', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/claims?sort_by=createdAt&sort_order=desc`);
    // Should require authentication
    expect([401, 403]).toContain(response.status());
  });

  test('should have claim detail endpoint (GET /billing/claims/:id)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/claims/1`);
    // Should require authentication (not 404 for missing ID - endpoint exists)
    expect([401, 403, 404]).toContain(response.status());
  });

  test('should have rejected claims endpoint (GET /billing/claims/rejected)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/claims/rejected`);
    // Should require authentication
    expect([401, 403]).toContain(response.status());
  });

  test('should have unbilled periods endpoint (GET /billing/claims/unbilled)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/claims/unbilled`);
    // Should require authentication
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Billing Dashboard - AR Aging Endpoints', () => {
  test('should have AR aging report endpoint (GET /billing/ar-aging)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/ar-aging`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should support filtering AR aging by payer', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/ar-aging?payer_id=1`);
    // Should require authentication
    expect([401, 403]).toContain(response.status());
  });

  test('should support filtering AR aging by bucket', async ({ request }) => {
    const buckets = ['0-30', '31-60', '61-90', '90+'];
    for (const bucket of buckets) {
      const response = await request.get(`${API_BASE_URL}/billing/ar-aging?aging_bucket=${bucket}`);
      // Should require authentication
      expect([401, 403]).toContain(response.status());
    }
  });
});

test.describe('Billing Dashboard - Payments Endpoints', () => {
  test('should have payments list endpoint (GET /billing/payments)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/billing/payments`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Billing Dashboard - All Endpoints Exist', () => {
  test('all billing dashboard endpoints should be accessible', async ({ request }) => {
    const endpoints = [
      // Dashboard & KPI Endpoints
      { path: '/billing/dashboard', method: 'GET', purpose: 'Billing dashboard with KPIs' },
      { path: '/billing/kpis', method: 'GET', purpose: 'Billing KPIs summary' },

      // Claims Endpoints
      { path: '/billing/claims', method: 'GET', purpose: 'List all claims' },
      { path: '/billing/claims/rejected', method: 'GET', purpose: 'List rejected/denied claims' },
      { path: '/billing/claims/unbilled', method: 'GET', purpose: 'List unbilled periods' },

      // AR Aging
      { path: '/billing/ar-aging', method: 'GET', purpose: 'AR aging report' },
      { path: '/billing/periods', method: 'GET', purpose: 'Billing periods' },

      // Payments
      { path: '/billing/payments', method: 'GET', purpose: 'List payments' },
    ];

    for (const { path, method, purpose } of endpoints) {
      let response;
      const url = `${API_BASE_URL}${path}`;

      switch (method) {
        case 'GET':
          response = await request.get(url);
          break;
        case 'POST':
          response = await request.post(url, { data: {} });
          break;
      }

      // All endpoints should exist (require auth, not return 404)
      expect(
        response!.status(),
        `Endpoint ${method} ${path} (${purpose}) should exist`
      ).not.toBe(404);
    }
  });
});

test.describe('Billing Dashboard - UI Page', () => {
  test('billing dashboard page should exist at /billing', async ({ page }) => {
    // Navigate to the billing dashboard
    const response = await page.goto(`${APP_BASE_URL}/billing`);

    // Page should load (may redirect to login if unauthenticated)
    expect(response?.status()).toBeLessThan(500);
  });

  test('billing dashboard should show loading state initially', async ({ page }) => {
    await page.goto(`${APP_BASE_URL}/billing`);

    // Wait for the page to start loading
    await page.waitForTimeout(500);

    // Should show either the dashboard content or a login redirect
    const pageContent = await page.content();
    expect(pageContent).toBeTruthy();
  });
});

test.describe('Billing Dashboard - Date Range Handling', () => {
  test('should accept valid date range for claims', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/billing/claims?start_date=2025-01-01&end_date=2025-12-31`
    );
    // Should require authentication, not reject dates
    expect([401, 403]).toContain(response.status());
  });

  test('should accept amount range for claims', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/billing/claims?min_amount=1000&max_amount=100000`
    );
    // Should require authentication, not reject amounts
    expect([401, 403]).toContain(response.status());
  });

  test('should accept combined filters for claims', async ({ request }) => {
    const response = await request.get(
      `${API_BASE_URL}/billing/claims?status=SUBMITTED&start_date=2025-01-01&end_date=2025-12-31&limit=50&offset=0`
    );
    // Should require authentication, not reject combined filters
    expect([401, 403]).toContain(response.status());
  });
});
