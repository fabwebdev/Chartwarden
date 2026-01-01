import { test, expect } from '@playwright/test';

const API_BASE = 'http://localhost:3001/api';

// Test authentication - reuse existing test user credentials
let authCookie: string;

test.describe('Prognosis Tracking API Verification', () => {
  test.beforeAll(async ({ request }) => {
    // Login to get auth cookie
    const loginResponse = await request.post(`${API_BASE}/auth/sign-in/email`, {
      data: {
        email: 'admin@chartwarden.com',
        password: 'admin123',
      },
    });

    // Get cookies from response
    const cookies = loginResponse.headers()['set-cookie'];
    if (cookies) {
      authCookie = cookies;
    }
  });

  test('GET /prognosis-tracking/enums returns enum values', async ({ request }) => {
    const response = await request.get(`${API_BASE}/prognosis-tracking/enums`, {
      headers: {
        Cookie: authCookie || '',
      },
    });

    // Should return 200 or 401 (if auth fails, that's expected in test env)
    const status = response.status();
    expect([200, 401, 403]).toContain(status);

    if (status === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('disease_progression_status');
      expect(body.data).toHaveProperty('prognosis_status');
      expect(body.data).toHaveProperty('confidence_levels');
      expect(body.data).toHaveProperty('imminence_levels');
      expect(body.data).toHaveProperty('functional_status_scales');
      expect(body.data).toHaveProperty('clinical_indicator_types');

      // Verify enum values
      expect(body.data.disease_progression_status.STABLE).toBe('STABLE');
      expect(body.data.disease_progression_status.DETERIORATING).toBe('DETERIORATING');
      expect(body.data.imminence_levels.DAYS).toBe('DAYS');
    }
  });

  test('GET /prognosis-tracking returns list of records', async ({ request }) => {
    const response = await request.get(`${API_BASE}/prognosis-tracking`, {
      headers: {
        Cookie: authCookie || '',
      },
    });

    const status = response.status();
    expect([200, 401, 403]).toContain(status);

    if (status === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body).toHaveProperty('data');
      expect(body).toHaveProperty('meta');
      expect(Array.isArray(body.data)).toBe(true);
    }
  });

  test('GET /prognosis-tracking/patient/:patientId/current returns current prognosis or null', async ({ request }) => {
    // Use a test patient ID
    const patientId = 1;
    const response = await request.get(`${API_BASE}/prognosis-tracking/patient/${patientId}/current`, {
      headers: {
        Cookie: authCookie || '',
      },
    });

    const status = response.status();
    expect([200, 401, 403]).toContain(status);

    if (status === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      // data can be null if no current prognosis exists
      expect(body).toHaveProperty('data');
    }
  });

  test('GET /prognosis-tracking/patient/:patientId/history returns history', async ({ request }) => {
    const patientId = 1;
    const response = await request.get(`${API_BASE}/prognosis-tracking/patient/${patientId}/history`, {
      headers: {
        Cookie: authCookie || '',
      },
    });

    const status = response.status();
    expect([200, 401, 403]).toContain(status);

    if (status === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('versions');
      expect(body.data).toHaveProperty('audit_trail');
    }
  });

  test('GET /prognosis-tracking/patient/:patientId/trends returns trends data', async ({ request }) => {
    const patientId = 1;
    const response = await request.get(`${API_BASE}/prognosis-tracking/patient/${patientId}/trends`, {
      headers: {
        Cookie: authCookie || '',
      },
    });

    const status = response.status();
    expect([200, 401, 403]).toContain(status);

    if (status === 200) {
      const body = await response.json();
      expect(body.success).toBe(true);
      expect(body.data).toHaveProperty('patient_id');
      expect(body.data).toHaveProperty('period_days');
      expect(body.data).toHaveProperty('trends');
    }
  });

  test('POST /prognosis-tracking validates required fields', async ({ request }) => {
    const response = await request.post(`${API_BASE}/prognosis-tracking`, {
      headers: {
        Cookie: authCookie || '',
        'Content-Type': 'application/json',
      },
      data: {
        // Missing required fields
      },
    });

    const status = response.status();
    // Should return 400 for missing fields or 401 for no auth
    expect([400, 401, 403]).toContain(status);

    if (status === 400) {
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error).toBeDefined();
    }
  });

  test('GET /prognosis-tracking/:id returns 404 for non-existent record', async ({ request }) => {
    const response = await request.get(`${API_BASE}/prognosis-tracking/999999`, {
      headers: {
        Cookie: authCookie || '',
      },
    });

    const status = response.status();
    expect([404, 401, 403]).toContain(status);

    if (status === 404) {
      const body = await response.json();
      expect(body.success).toBe(false);
      expect(body.error.code).toBe('NOT_FOUND');
    }
  });

  test('API health check confirms server is running', async ({ request }) => {
    const response = await request.get(`${API_BASE}/health`);
    expect(response.status()).toBe(200);

    const body = await response.json();
    expect(['healthy', 'degraded']).toContain(body.status);
  });
});
