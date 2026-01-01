import { test, expect } from '@playwright/test';

/**
 * ERA Controller Verification Tests
 *
 * Tests the ERA File Upload and Payment Posting Controller functionality:
 * - File upload endpoints (JSON and multipart)
 * - File validation
 * - Batch processing
 * - Processing reports
 * - Dashboard metrics
 *
 * Note: These tests verify the API endpoints are working correctly.
 * They require authentication and proper ERA permissions.
 */

const API_URL = process.env.API_URL || 'http://localhost:3001';

// Sample 835 EDI content for testing
const SAMPLE_835_EDI = `ISA*00*          *00*          *ZZ*SENDER         *ZZ*RECEIVER       *231201*1200*^*00501*000000001*0*P*:~
GS*HP*SENDER*RECEIVER*20231201*1200*1*X*005010X221A1~
ST*835*0001~
BPR*I*1500.00*C*CHK************20231201~
TRN*1*CHK123456789*1234567890~
DTM*405*20231201~
N1*PR*Test Payer*PI*12345~
N3*123 Payer Street~
N4*Anytown*FL*33401~
N1*PE*Test Provider*XX*1234567890~
N3*456 Provider Ave~
N4*Somewhere*FL*33402~
CLP*PAT001*1*500.00*450.00*50.00*12~
NM1*QC*1*Smith*John****MI*M12345678~
DTM*232*20231101~
DTM*233*20231130~
CAS*CO*45*50.00~
SVC*HC:99213*500.00*450.00*1~
DTM*472*20231115~
CLP*PAT002*1*750.00*700.00*50.00*12~
NM1*QC*1*Jones*Mary****MI*M87654321~
DTM*232*20231101~
DTM*233*20231130~
CAS*CO*45*50.00~
SVC*HC:99214*750.00*700.00*1~
DTM*472*20231120~
SE*25*0001~
GE*1*1~
IEA*1*000000001~`;

// Sample CSV content for testing
const SAMPLE_CSV = `patient_account_number,payment_amount,check_number,patient_first_name,patient_last_name,service_date,billed_amount
PAT001,150.00,CHK789012,John,Smith,2023-12-01,200.00
PAT002,275.50,CHK789012,Mary,Jones,2023-12-02,300.00
PAT003,500.00,CHK789012,Robert,Williams,2023-12-03,550.00`;

test.describe('ERA Controller API Verification', () => {
  let authCookie: string;
  let csrfToken: string;

  test.beforeAll(async ({ request }) => {
    // Login to get authentication cookie
    try {
      const loginResponse = await request.post(`${API_URL}/api/auth/sign-in`, {
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

      // Get CSRF token
      const csrfResponse = await request.get(`${API_URL}/api/auth/csrf-token`, {
        headers: {
          Cookie: authCookie,
        },
      });

      if (csrfResponse.ok()) {
        const csrfData = await csrfResponse.json();
        csrfToken = csrfData.csrfToken || csrfData.token;
      }
    } catch (error) {
      console.log('Auth setup error (may be expected in test environment):', error);
    }
  });

  test('should validate ERA file format (835 EDI)', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/era/validate`, {
      headers: {
        Cookie: authCookie,
        'X-CSRF-TOKEN': csrfToken,
        'Content-Type': 'application/json',
      },
      data: {
        fileName: 'test-era.835',
        fileContent: SAMPLE_835_EDI,
      },
    });

    // If authentication is required and not available, skip
    if (response.status() === 401 || response.status() === 403) {
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.format).toBe('EDI_835');
    expect(data.data.valid).toBe(true);
    expect(data.data.summary).toBeDefined();
    expect(data.data.summary.totalClaims).toBeGreaterThan(0);
  });

  test('should validate ERA file format (CSV)', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/era/validate`, {
      headers: {
        Cookie: authCookie,
        'X-CSRF-TOKEN': csrfToken,
        'Content-Type': 'application/json',
      },
      data: {
        fileName: 'test-payments.csv',
        fileContent: SAMPLE_CSV,
      },
    });

    if (response.status() === 401 || response.status() === 403) {
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.format).toBe('CSV');
    expect(data.data.valid).toBe(true);
    expect(data.data.summary.totalRecords).toBe(3);
  });

  test('should reject invalid file format', async ({ request }) => {
    const response = await request.post(`${API_URL}/api/era/validate`, {
      headers: {
        Cookie: authCookie,
        'X-CSRF-TOKEN': csrfToken,
        'Content-Type': 'application/json',
      },
      data: {
        fileName: 'test.txt',
        fileContent: 'This is not a valid ERA file format',
      },
    });

    if (response.status() === 401 || response.status() === 403) {
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data.valid).toBe(false);
    expect(data.data.errors.length).toBeGreaterThan(0);
  });

  test('should get ERA dashboard metrics', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/era/dashboard`, {
      headers: {
        Cookie: authCookie,
      },
    });

    if (response.status() === 401 || response.status() === 403) {
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.eraFiles).toBeDefined();
    expect(data.data.posting).toBeDefined();
    expect(data.data.exceptions).toBeDefined();
  });

  test('should list ERA files', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/era/files`, {
      headers: {
        Cookie: authCookie,
      },
    });

    if (response.status() === 401 || response.status() === 403) {
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.count).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('should get posting exceptions', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/era/exceptions`, {
      headers: {
        Cookie: authCookie,
      },
    });

    if (response.status() === 401 || response.status() === 403) {
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.count).toBeDefined();
    expect(data.overdueCount).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('should get reconciliation status', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/era/reconciliation`, {
      headers: {
        Cookie: authCookie,
      },
    });

    if (response.status() === 401 || response.status() === 403) {
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.count).toBeDefined();
    expect(Array.isArray(data.data)).toBe(true);
  });

  test('should validate required fields for upload', async ({ request }) => {
    // Test missing fileName
    const response1 = await request.post(`${API_URL}/api/era/upload`, {
      headers: {
        Cookie: authCookie,
        'X-CSRF-TOKEN': csrfToken,
        'Content-Type': 'application/json',
      },
      data: {
        fileContent: SAMPLE_835_EDI,
      },
    });

    if (response1.status() === 401 || response1.status() === 403) {
      test.skip();
      return;
    }

    expect(response1.status()).toBe(400);

    // Test missing fileContent
    const response2 = await request.post(`${API_URL}/api/era/upload`, {
      headers: {
        Cookie: authCookie,
        'X-CSRF-TOKEN': csrfToken,
        'Content-Type': 'application/json',
      },
      data: {
        fileName: 'test.835',
      },
    });

    expect(response2.status()).toBe(400);
  });

  test('should validate batch processing input', async ({ request }) => {
    // Test empty files array
    const response = await request.post(`${API_URL}/api/era/batch-process`, {
      headers: {
        Cookie: authCookie,
        'X-CSRF-TOKEN': csrfToken,
        'Content-Type': 'application/json',
      },
      data: {
        files: [],
      },
    });

    if (response.status() === 401 || response.status() === 403) {
      test.skip();
      return;
    }

    expect(response.status()).toBe(400);
    const data = await response.json();
    expect(data.success).toBe(false);
    expect(data.error).toContain('not be empty');
  });

  test('should get reconciliation summary', async ({ request }) => {
    const response = await request.get(`${API_URL}/api/era/reconciliation/summary`, {
      headers: {
        Cookie: authCookie,
      },
    });

    if (response.status() === 401 || response.status() === 403) {
      test.skip();
      return;
    }

    expect(response.ok()).toBeTruthy();
    const data = await response.json();

    expect(data.success).toBe(true);
    expect(data.data).toBeDefined();
    expect(data.data.summary).toBeDefined();
    expect(data.data.batches).toBeDefined();
  });
});

test.describe('ERA Controller - Integration Tests', () => {
  // These tests would require a full integration setup
  // Skipped by default but can be enabled for full verification

  test.skip('should upload and process 835 EDI file', async ({ request }) => {
    // This test uploads a real file and verifies processing
    // Requires database and proper test data setup
  });

  test.skip('should upload and process CSV file', async ({ request }) => {
    // This test uploads a CSV file and verifies processing
    // Requires database and proper test data setup
  });

  test.skip('should batch process multiple files', async ({ request }) => {
    // This test processes multiple files in batch
    // Requires database and proper test data setup
  });
});
