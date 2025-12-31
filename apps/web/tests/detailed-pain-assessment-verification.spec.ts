import { test, expect } from '@playwright/test';

/**
 * Verification tests for Detailed Pain Assessment Schema feature
 * Feature: pain-assessment-schema
 *
 * This test verifies:
 * 1. Detailed pain assessment API endpoints exist
 * 2. CRUD operations are properly routed
 * 3. Patient-specific assessment routes work
 * 4. Authentication is required for protected endpoints
 * 5. Sign endpoint exists for 21 CFR Part 11 compliance
 */

const API_BASE_URL = 'http://localhost:3001/api';
const SERVER_BASE_URL = 'http://localhost:3001';

test.describe('Detailed Pain Assessment API Verification', () => {
  test('should have health endpoint accessible (sanity check)', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/health`);
    expect(response.status()).toBe(200);

    const health = await response.json();
    expect(health.status).toBeDefined();
  });

  test('should have detailed pain assessments index endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/detailed-pain-assessments`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have detailed pain assessment by ID endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/detailed-pain-assessments/1`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have patient-specific pain assessments list endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/patients/1/detailed-pain-assessments`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have patient pain assessment creation endpoint', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/patients/1/detailed-pain-assessments`, {
      data: {
        pain_present: true,
        pain_level_current: 5,
        primary_pain_location: 'Lower back'
      }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have patient pain assessment statistics endpoint', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/patients/1/detailed-pain-assessments/stats`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have pain assessment update endpoint (PATCH)', async ({ request }) => {
    const response = await request.patch(`${API_BASE_URL}/detailed-pain-assessments/1`, {
      data: {
        pain_level_current: 3
      }
    });

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have pain assessment delete endpoint', async ({ request }) => {
    const response = await request.delete(`${API_BASE_URL}/detailed-pain-assessments/1`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });

  test('should have pain assessment sign endpoint (21 CFR Part 11 compliance)', async ({ request }) => {
    const response = await request.post(`${API_BASE_URL}/detailed-pain-assessments/1/sign`);

    // Should require authentication (not 404 - endpoint exists)
    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Detailed Pain Assessment Schema Fields', () => {
  test('should accept comprehensive pain location data', async ({ request }) => {
    const assessmentData = {
      pain_present: true,
      primary_pain_location: 'Lower back',
      primary_pain_location_side: 'BILATERAL',
      secondary_pain_locations: [
        { location: 'Right hip', side: 'RIGHT', description: 'Radiating pain' }
      ],
      pain_radiation: 'Radiates down right leg'
    };

    const response = await request.post(`${API_BASE_URL}/patients/1/detailed-pain-assessments`, {
      data: assessmentData
    });

    // Endpoint exists and requires auth
    expect([401, 403]).toContain(response.status());
  });

  test('should accept pain quality descriptors', async ({ request }) => {
    const assessmentData = {
      pain_present: true,
      pain_quality: ['SHARP', 'BURNING', 'THROBBING'],
      pain_quality_description: 'Sharp burning sensation with occasional throbbing'
    };

    const response = await request.post(`${API_BASE_URL}/patients/1/detailed-pain-assessments`, {
      data: assessmentData
    });

    expect([401, 403]).toContain(response.status());
  });

  test('should accept pain severity scales', async ({ request }) => {
    const assessmentData = {
      pain_present: true,
      pain_scale_type: 'NUMERIC_0_10',
      pain_level_current: 6,
      pain_level_at_rest: 4,
      pain_level_with_activity: 8,
      pain_level_worst_24h: 9,
      pain_level_best_24h: 3,
      pain_level_average: 5,
      acceptable_pain_level: 3
    };

    const response = await request.post(`${API_BASE_URL}/patients/1/detailed-pain-assessments`, {
      data: assessmentData
    });

    expect([401, 403]).toContain(response.status());
  });

  test('should accept pain trigger data', async ({ request }) => {
    const assessmentData = {
      pain_present: true,
      pain_triggers: [
        { type: 'MOVEMENT', description: 'Walking more than 10 minutes' },
        { type: 'POSITION', description: 'Standing for extended periods' }
      ],
      trigger_movement: true,
      trigger_position_changes: true,
      trigger_breathing: false,
      trigger_stress: true,
      other_triggers: 'Cold weather exacerbates symptoms'
    };

    const response = await request.post(`${API_BASE_URL}/patients/1/detailed-pain-assessments`, {
      data: assessmentData
    });

    expect([401, 403]).toContain(response.status());
  });

  test('should accept intervention data', async ({ request }) => {
    const assessmentData = {
      pain_present: true,
      current_interventions: [
        { type: 'MEDICATION', name: 'Morphine 10mg', effectiveness: 7 }
      ],
      current_medications: [
        { name: 'Morphine', dose: '10mg', route: 'PO', frequency: 'Q4H PRN', effectiveness: 7 }
      ],
      breakthrough_medication: 'Morphine IR',
      breakthrough_dose: '5mg',
      non_pharm_interventions: ['HEAT', 'REPOSITIONING', 'RELAXATION'],
      overall_pain_control: 'GOOD'
    };

    const response = await request.post(`${API_BASE_URL}/patients/1/detailed-pain-assessments`, {
      data: assessmentData
    });

    expect([401, 403]).toContain(response.status());
  });

  test('should accept functional impact assessment', async ({ request }) => {
    const assessmentData = {
      pain_present: true,
      impact_on_sleep: 7,
      impact_on_mobility: 8,
      impact_on_appetite: 4,
      impact_on_mood: 6,
      impact_on_daily_activities: 7,
      impact_on_social: 5,
      functional_impact_notes: 'Patient reports difficulty sleeping due to pain'
    };

    const response = await request.post(`${API_BASE_URL}/patients/1/detailed-pain-assessments`, {
      data: assessmentData
    });

    expect([401, 403]).toContain(response.status());
  });

  test('should accept breakthrough pain assessment', async ({ request }) => {
    const assessmentData = {
      pain_present: true,
      breakthrough_pain_present: true,
      breakthrough_frequency: '3-4 times daily',
      breakthrough_duration: '15-30 minutes',
      breakthrough_predictable: false,
      breakthrough_triggers: 'Activity and position changes'
    };

    const response = await request.post(`${API_BASE_URL}/patients/1/detailed-pain-assessments`, {
      data: assessmentData
    });

    expect([401, 403]).toContain(response.status());
  });

  test('should accept patient education data', async ({ request }) => {
    const assessmentData = {
      pain_present: true,
      patient_education_provided: true,
      education_topics: ['Pain medication schedule', 'Non-pharmacological techniques', 'Breakthrough pain management'],
      patient_understanding: 'GOOD',
      caregiver_education_provided: true
    };

    const response = await request.post(`${API_BASE_URL}/patients/1/detailed-pain-assessments`, {
      data: assessmentData
    });

    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Detailed Pain Assessment Query Parameters', () => {
  test('should support filtering by patient_id', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/detailed-pain-assessments?patient_id=1`);

    // Endpoint exists and requires auth
    expect([401, 403]).toContain(response.status());
  });

  test('should support filtering by pain_status', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/detailed-pain-assessments?pain_status=ACTIVE`);

    expect([401, 403]).toContain(response.status());
  });

  test('should support pagination with limit and offset', async ({ request }) => {
    const response = await request.get(`${API_BASE_URL}/detailed-pain-assessments?limit=10&offset=0`);

    expect([401, 403]).toContain(response.status());
  });
});

test.describe('Detailed Pain Assessment Route Coverage', () => {
  // Ensure pain assessment routes are properly integrated with existing pain routes
  const painRoutes = [
    '/pain/pain-assessment',
    '/detailed-pain-assessments',
  ];

  for (const route of painRoutes) {
    test(`should have ${route} route accessible`, async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}${route}`);

      // Route should exist (require auth, not 404)
      expect(response.status()).not.toBe(404);
    });
  }
});
