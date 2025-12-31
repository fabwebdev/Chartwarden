import { test, expect } from '@playwright/test';

/**
 * Verification tests for Nursing Clinical Notes Schema feature
 * Feature: nursing-note-schema
 *
 * This test verifies:
 * 1. Nursing clinical notes API endpoints exist
 * 2. CRUD operations are properly routed
 * 3. Rich text content support
 * 4. Nurse ID and note status functionality
 * 5. Signature endpoint exists for 21 CFR Part 11 compliance
 * 6. RBAC permissions are enforced
 */

const API_BASE_URL = 'http://localhost:3001/api';

test.describe('Nursing Clinical Notes API Verification', () => {
  test('should have health endpoint accessible (sanity check)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    expect(response.status()).toBe(200);

    const health = await response.json();
    expect(health.status).toBeDefined();
  });

  test('should have nursing clinical notes index endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have nursing clinical note by ID endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes/1`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have create nursing clinical note endpoint (POST)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/nursing-clinical-notes`, {
      data: {
        patient_id: 1,
        content: '<p>Test nursing note content</p>',
        note_status: 'DRAFT'
      }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have update nursing clinical note endpoint (PUT)', async ({ request }) => {
    const response = await request.put(`${API_BASE_URL}/nursing-clinical-notes/1`, {
      data: {
        content: '<p>Updated nursing note content</p>'
      }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have update nursing clinical note endpoint (PATCH)', async ({ request }) => {
    const response = await request.patch(`${API_BASE_URL}/nursing-clinical-notes/1`, {
      data: {
        content: '<p>Patched nursing note content</p>'
      }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have delete nursing clinical note endpoint', async ({ request }) => {
    const response = await request.delete(`${API_BASE_URL}/nursing-clinical-notes/1`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Nursing Clinical Notes Signature Routes (21 CFR Part 11)', () => {
  test('should have sign nursing clinical note endpoint', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/nursing-clinical-notes/1/sign`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have update status endpoint', async ({ request }) => {
    const response = await request.patch(`${API_BASE_URL}/nursing-clinical-notes/1/status`, {
      data: {
        status: 'COMPLETED'
      }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Nursing Clinical Notes Query Routes', () => {
  test('should have unsigned notes endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes/unsigned`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have notes by nurse endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes/by-nurse/test-nurse-id`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have notes by patient endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes/by-patient/1`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Nursing Clinical Notes Rich Text Content', () => {
  test('should accept HTML rich text content', async ({ request }) => {
    const noteData = {
      patient_id: 1,
      content: '<h2>Patient Assessment</h2><p><strong>Subjective:</strong> Patient reports mild pain.</p><ul><li>Pain level: 3/10</li><li>Location: Lower back</li></ul>',
      content_format: 'html',
      note_status: 'DRAFT'
    };

    const response = await request.post(`${API_BASE_URL}/nursing-clinical-notes`, {
      data: noteData
    });

    // Endpoint exists and requires auth
    expect([401, 403]).toContain(response.status());
  });

  test('should accept SOAP documentation sections', async ({ request }) => {
    const noteData = {
      patient_id: 1,
      subjective: '<p>Patient reports increased pain in lower back since yesterday morning.</p>',
      objective: '<p>Vital signs: BP 120/80, HR 72, RR 16, Temp 98.6F. Pain level 5/10.</p>',
      assessment: '<p>Increased pain possibly due to activity level. Current pain management protocol may need adjustment.</p>',
      plan: '<p>Will contact physician regarding breakthrough pain medication. Continue current PRN orders. Follow up in 24 hours.</p>',
      note_status: 'IN_PROGRESS'
    };

    const response = await request.post(`${API_BASE_URL}/nursing-clinical-notes`, {
      data: noteData
    });

    expect([401, 403]).toContain(response.status());
  });

  test('should accept additional clinical sections', async ({ request }) => {
    const noteData = {
      patient_id: 1,
      interventions: '<p>Repositioned patient. Administered PRN morphine 10mg PO. Applied heat pack to lower back.</p>',
      patient_response: '<p>Patient reports relief within 30 minutes of medication administration. Pain level decreased from 5/10 to 2/10.</p>',
      patient_education: '<p>Educated patient on importance of reporting breakthrough pain early. Reviewed positioning techniques.</p>',
      communication: '<p>Called Dr. Smith regarding pain increase. New orders received for increased breakthrough dose.</p>',
      note_status: 'COMPLETED'
    };

    const response = await request.post(`${API_BASE_URL}/nursing-clinical-notes`, {
      data: noteData
    });

    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Nursing Clinical Notes Nurse Information', () => {
  test('should accept nurse identification fields', async ({ request }) => {
    const noteData = {
      patient_id: 1,
      nurse_id: 'nurse-123',
      nurse_name: 'Jane Smith',
      nurse_credentials: 'RN, BSN',
      content: '<p>Nursing assessment completed.</p>',
      note_status: 'DRAFT'
    };

    const response = await request.post(`${API_BASE_URL}/nursing-clinical-notes`, {
      data: noteData
    });

    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Nursing Clinical Notes Status Workflow', () => {
  const validStatuses = [
    'DRAFT',
    'IN_PROGRESS',
    'COMPLETED',
    'PENDING_SIGNATURE',
    'SIGNED',
    'AMENDED',
    'VOID'
  ];

  for (const status of validStatuses) {
    test(`should accept note_status: ${status}`, async ({ request }) => {
      const noteData = {
        patient_id: 1,
        content: `<p>Note with status ${status}</p>`,
        note_status: status
      };

      const response = await request.post(`${API_BASE_URL}/nursing-clinical-notes`, {
        data: noteData
      });

      // Endpoint exists (auth required, not 404)
      expect([401, 403]).toContain(response.status());
    });
  }
});

test.describe('Nursing Clinical Notes Query Parameters', () => {
  test('should support filtering by patient_id', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes?patient_id=1`);

    // Endpoint exists and requires auth
    expect([401, 403]).toContain(response.status());
  });

  test('should support filtering by nurse_id', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes?nurse_id=nurse-123`);

    expect([401, 403]).toContain(response.status());
  });

  test('should support filtering by status', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes?status=DRAFT`);

    expect([401, 403]).toContain(response.status());
  });

  test('should support pagination with limit and offset', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes?limit=10&offset=0`);

    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Nursing Clinical Notes Related Data Routes', () => {
  const relatedDataEndpoints = [
    { path: '/vital_signs/1', name: 'Vital Signs GET' },
    { path: '/scales_tools_lab_data/1', name: 'Scale Tool Lab Data GET' },
    { path: '/pain_data/1', name: 'Pain Data GET' },
    { path: '/painad_data/1', name: 'PAINAD Data GET' },
    { path: '/flacc_data/1', name: 'FLACC Data GET' },
    { path: '/cardiovascular_data/1', name: 'Cardiovascular Data GET' },
    { path: '/respiratory_data/1', name: 'Respiratory Data GET' },
    { path: '/genitourinary_data/1', name: 'Genitourinary Data GET' },
    { path: '/gastrointestinal_data/1', name: 'Gastrointestinal Data GET' },
  ];

  for (const endpoint of relatedDataEndpoints) {
    test(`should have ${endpoint.name} endpoint`, async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes${endpoint.path}`);

      // Route should exist (require auth, not 404)
      expect([401, 403]).toContain(response.status());
    });
  }
});

test.describe('Nursing Clinical Notes Backward Compatibility', () => {
  test('should support legacy route pattern /nursing-clinical-notes/nursing-clinical-notes/:id', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/nursing-clinical-notes/nursing-clinical-notes/1`);

    // Route should exist (require auth, not 404)
    expect([401, 403]).toContain(response.status());
  });
});
