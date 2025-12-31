#!/usr/bin/env node

/**
 * Eligibility API Test Suite
 * Phase 3A - Tests all eligibility verification endpoints
 *
 * Usage: node tests/phase3/test-eligibility-api.js
 *
 * Prerequisites:
 * 1. Server must be running: npm start
 * 2. Database must have test patient and payer data
 * 3. Valid authentication token
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_PREFIX = '/api/eligibility';

// Test configuration
const config = {
  baseUrl: BASE_URL,
  apiPrefix: API_PREFIX,
  // Replace with actual token from authentication
  authToken: process.env.TEST_AUTH_TOKEN || 'your-test-token-here',
  // Replace with actual test data IDs
  testPatientId: process.env.TEST_PATIENT_ID || 1,
  testPayerId: process.env.TEST_PAYER_ID || 1
};

/**
 * HTTP Request Helper
 */
async function request(method, endpoint, body = null) {
  const url = `${config.baseUrl}${config.apiPrefix}${endpoint}`;

  const options = {
    method,
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.authToken}`
    }
  };

  if (body) {
    options.body = JSON.stringify(body);
  }

  console.log(`\n🔵 ${method} ${endpoint}`);
  if (body) {
    console.log('📤 Request:', JSON.stringify(body, null, 2));
  }

  try {
    const response = await fetch(url, options);
    const data = await response.json();

    if (response.ok) {
      console.log('✅ Status:', response.status);
      console.log('📥 Response:', JSON.stringify(data, null, 2));
      return { success: true, status: response.status, data };
    } else {
      console.log('❌ Status:', response.status);
      console.log('📥 Error:', JSON.stringify(data, null, 2));
      return { success: false, status: response.status, error: data };
    }
  } catch (error) {
    console.log('❌ Request failed:', error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Test Suite
 */
const tests = {
  /**
   * Test 1: Verify Patient Eligibility
   */
  async testVerifyEligibility() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Verify Patient Eligibility');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('POST', '/verify', {
      patientId: config.testPatientId,
      payerId: config.testPayerId,
      serviceType: 'HOSPICE',
      forceRefresh: false
    });

    if (result.success) {
      console.log('✅ PASS: Eligibility verification initiated');
      return result.data;
    } else {
      console.log('❌ FAIL: Could not verify eligibility');
      return null;
    }
  },

  /**
   * Test 2: Verify with Force Refresh
   */
  async testForceRefresh() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Force Refresh Eligibility');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('POST', '/verify', {
      patientId: config.testPatientId,
      payerId: config.testPayerId,
      serviceType: 'HOSPICE',
      forceRefresh: true
    });

    if (result.success) {
      console.log('✅ PASS: Force refresh completed');
      return result.data;
    } else {
      console.log('❌ FAIL: Force refresh failed');
      return null;
    }
  },

  /**
   * Test 3: Batch Verify Eligibility
   */
  async testBatchVerify() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Batch Verify Multiple Patients');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('POST', '/batch-verify', {
      patientIds: [config.testPatientId],
      serviceType: 'HOSPICE',
      forceRefresh: false
    });

    if (result.success && result.data.summary) {
      console.log(`✅ PASS: Batch verified ${result.data.summary.total} patients`);
      console.log(`   - Successful: ${result.data.summary.successful}`);
      console.log(`   - Failed: ${result.data.summary.failed}`);
      return result.data;
    } else {
      console.log('❌ FAIL: Batch verification failed');
      return null;
    }
  },

  /**
   * Test 4: Get Current Coverage
   */
  async testGetCoverage() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: Get Current Coverage');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('GET', `/coverage/${config.testPatientId}`);

    if (result.success) {
      console.log('✅ PASS: Retrieved current coverage');
      if (result.data.data) {
        const coverage = result.data.data;
        console.log(`   - Active: ${coverage.is_active}`);
        console.log(`   - Verified: ${coverage.eligibility_verified}`);
        console.log(`   - Copay: $${(coverage.copay_amount || 0) / 100}`);
        console.log(`   - Deductible: $${(coverage.deductible_amount || 0) / 100}`);
      }
      return result.data;
    } else {
      console.log('❌ FAIL: Could not retrieve coverage');
      return null;
    }
  },

  /**
   * Test 5: Get Eligibility History
   */
  async testGetHistory() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 5: Get Eligibility History');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('GET', `/history/${config.testPatientId}?limit=5`);

    if (result.success) {
      console.log(`✅ PASS: Retrieved ${result.data.count} history records`);
      return result.data;
    } else {
      console.log('❌ FAIL: Could not retrieve history');
      return null;
    }
  },

  /**
   * Test 6: Get Reverification List
   */
  async testGetReverificationList() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 6: Get Reverification List');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('GET', '/reverification-list');

    if (result.success) {
      console.log(`✅ PASS: Found ${result.data.count} patients needing reverification`);
      return result.data;
    } else {
      console.log('❌ FAIL: Could not get reverification list');
      return null;
    }
  },

  /**
   * Test 7: Mark for Reverification
   */
  async testMarkReverification() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 7: Mark Patient for Reverification');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('POST', '/mark-reverification', {
      patientId: config.testPatientId,
      reason: 'Coverage change reported by patient'
    });

    if (result.success) {
      console.log('✅ PASS: Marked patient for reverification');
      return result.data;
    } else {
      console.log('❌ FAIL: Could not mark for reverification');
      return null;
    }
  },

  /**
   * Test 8: Process 271 Response (Simulated)
   */
  async testProcess271() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 8: Process 271 Response');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    // This requires a valid request ID and 271 content
    // Skipping unless you have actual data
    console.log('⚠️  SKIP: Requires valid 271 EDI content');
    return null;
  },

  /**
   * Test 9: Invalid Patient ID
   */
  async testInvalidPatient() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 9: Invalid Patient ID (Error Handling)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('POST', '/verify', {
      patientId: 999999,
      serviceType: 'HOSPICE'
    });

    if (!result.success) {
      console.log('✅ PASS: Correctly handled invalid patient');
      return result.error;
    } else {
      console.log('❌ FAIL: Should have returned error for invalid patient');
      return null;
    }
  }
};

/**
 * Run All Tests
 */
async function runTests() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║  ELIGIBILITY API TEST SUITE - PHASE 3A   ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n📍 Base URL: ${config.baseUrl}`);
  console.log(`📍 API Path: ${config.apiPrefix}`);
  console.log(`👤 Test Patient ID: ${config.testPatientId}`);
  console.log(`🏥 Test Payer ID: ${config.testPayerId}`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  // Run each test
  for (const [name, testFn] of Object.entries(tests)) {
    results.total++;
    try {
      const result = await testFn();
      if (result === null && name.includes('test8')) {
        results.skipped++;
      } else if (result) {
        results.passed++;
      } else {
        results.failed++;
      }
    } catch (error) {
      console.log(`❌ EXCEPTION in ${name}:`, error.message);
      results.failed++;
    }

    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Print summary
  console.log('\n\n╔══════════════════════════════════════════╗');
  console.log('║           TEST SUMMARY                   ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n📊 Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`⚠️  Skipped: ${results.skipped}`);

  const successRate = ((results.passed / (results.total - results.skipped)) * 100).toFixed(1);
  console.log(`\n📈 Success Rate: ${successRate}%`);

  if (results.failed === 0) {
    console.log('\n🎉 ALL TESTS PASSED!\n');
    process.exit(0);
  } else {
    console.log('\n⚠️  SOME TESTS FAILED - Review output above\n');
    process.exit(1);
  }
}

// Check if fetch is available (Node 18+)
if (typeof fetch === 'undefined') {
  console.error('❌ This script requires Node.js 18+ with native fetch support');
  console.error('   Or install node-fetch: npm install node-fetch');
  process.exit(1);
}

// Run tests
runTests().catch(error => {
  console.error('\n❌ Test suite crashed:', error);
  process.exit(1);
});
