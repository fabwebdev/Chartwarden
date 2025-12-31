#!/usr/bin/env node

/**
 * ERA API Test Suite
 * Phase 3B - Tests all ERA processing and payment posting endpoints
 *
 * Usage: node tests/phase3/test-era-api.js
 *
 * Prerequisites:
 * 1. Server must be running: npm start
 * 2. Database must have test claim data
 * 3. Valid authentication token
 */

const BASE_URL = process.env.API_URL || 'http://localhost:3000';
const API_PREFIX = '/api/era';

// Test configuration
const config = {
  baseUrl: BASE_URL,
  apiPrefix: API_PREFIX,
  authToken: process.env.TEST_AUTH_TOKEN || 'your-test-token-here'
};

/**
 * Sample 835 EDI Content (minimal valid structure)
 */
const SAMPLE_835_CONTENT = `ISA*00*          *00*          *ZZ*CLEARINGHOUSE  *ZZ*PROVIDER       *251227*1200*^*00501*000000001*0*P*:~
GS*HP*CLEARINGHOUSE*PROVIDER*20251227*1200*1*X*005010X221A1~
ST*835*0001*005010X221A1~
BPR*I*1500.00*C*ACH*CCP*01*999999999*DA*123456*1234567890**01*999999999*DA*123456*20251227~
TRN*1*12345678901*1234567890~
DTM*405*20251227~
N1*PR*MEDICARE*XV*12345~
N3*PO BOX 12345~
N4*ANYTOWN*CA*12345~
N1*PE*HOSPICE CARE CENTER*XX*1234567890~
REF*TJ*987654321~
LX*1~
CLP*PATIENT001*1*2000.00*1500.00*500.00*12*1234567890123*21*1~
CAS*CO*45*300.00~
CAS*PR*1*200.00~
NM1*QC*1*DOE*JOHN****MI*123456789~
DTM*232*20251201~
DTM*233*20251215~
SVC*HC:G0154*2000.00*1500.00**1~
DTM*472*20251201~
CAS*CO*45*300.00~
CAS*PR*1*200.00~
SE*22*0001~
GE*1*1~
IEA*1*000000001~`;

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
  if (body && body.fileContent) {
    console.log('📤 Request: [835 EDI Content - truncated]');
  } else if (body) {
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
   * Test 1: Upload 835 ERA File
   */
  async testUploadERA() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 1: Upload 835 ERA File');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('POST', '/upload', {
      fileName: 'test_era_20251227.edi',
      fileContent: SAMPLE_835_CONTENT
    });

    if (result.success && result.data.data) {
      console.log('✅ PASS: ERA file uploaded successfully');
      console.log(`   - File ID: ${result.data.data.fileId || 'N/A'}`);
      return result.data.data;
    } else {
      console.log('❌ FAIL: Could not upload ERA file');
      return null;
    }
  },

  /**
   * Test 2: Get ERA Files List
   */
  async testGetERAFiles() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 2: Get ERA Files List');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('GET', '/files?limit=10');

    if (result.success) {
      console.log(`✅ PASS: Retrieved ${result.data.count || 0} ERA files`);
      return result.data;
    } else {
      console.log('❌ FAIL: Could not get ERA files');
      return null;
    }
  },

  /**
   * Test 3: Get ERA File Details
   */
  async testGetFileDetails(fileId) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 3: Get ERA File Details');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!fileId) {
      console.log('⚠️  SKIP: No file ID available');
      return null;
    }

    const result = await request('GET', `/file/${fileId}`);

    if (result.success) {
      console.log('✅ PASS: Retrieved file details');
      if (result.data.data) {
        const file = result.data.data;
        console.log(`   - Status: ${file.status}`);
        console.log(`   - Total Amount: $${(file.total_amount || 0) / 100}`);
        console.log(`   - Total Claims: ${file.total_claims || 0}`);
      }
      return result.data;
    } else {
      console.log('❌ FAIL: Could not get file details');
      return null;
    }
  },

  /**
   * Test 4: Get ERA Payments
   */
  async testGetPayments(fileId) {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 4: Get ERA Payments');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    if (!fileId) {
      console.log('⚠️  SKIP: No file ID available');
      return null;
    }

    const result = await request('GET', `/payments/${fileId}`);

    if (result.success) {
      console.log(`✅ PASS: Retrieved ${result.data.count || 0} payments`);
      return result.data;
    } else {
      console.log('❌ FAIL: Could not get payments');
      return null;
    }
  },

  /**
   * Test 5: Get Posting Exceptions
   */
  async testGetExceptions() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 5: Get Posting Exceptions');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('GET', '/exceptions?status=PENDING&limit=20');

    if (result.success) {
      console.log(`✅ PASS: Found ${result.data.count || 0} exceptions`);
      if (result.data.overdueCount) {
        console.log(`   - Overdue: ${result.data.overdueCount}`);
      }
      return result.data;
    } else {
      console.log('❌ FAIL: Could not get exceptions');
      return null;
    }
  },

  /**
   * Test 6: Get Reconciliation Status
   */
  async testGetReconciliation() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 6: Get Reconciliation Status');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const today = new Date().toISOString().split('T')[0];
    const result = await request('GET', `/reconciliation?batchDate=${today}`);

    if (result.success) {
      console.log(`✅ PASS: Retrieved reconciliation status`);
      return result.data;
    } else {
      console.log('❌ FAIL: Could not get reconciliation status');
      return null;
    }
  },

  /**
   * Test 7: Reconcile Batch
   */
  async testReconcileBatch() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 7: Reconcile Batch');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const today = new Date().toISOString().split('T')[0];
    const result = await request('POST', '/reconcile-batch', {
      batchDate: today,
      depositAmount: 150000, // $1,500.00 in cents
      bankStatementAmount: 150000
    });

    if (result.success) {
      console.log('✅ PASS: Batch reconciled');
      return result.data;
    } else {
      console.log('❌ FAIL: Could not reconcile batch');
      return null;
    }
  },

  /**
   * Test 8: Invalid 835 Format
   */
  async testInvalidFormat() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 8: Invalid 835 Format (Error Handling)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('POST', '/upload', {
      fileName: 'invalid.edi',
      fileContent: 'INVALID CONTENT NOT 835'
    });

    if (!result.success) {
      console.log('✅ PASS: Correctly rejected invalid format');
      return result.error;
    } else {
      console.log('❌ FAIL: Should have rejected invalid format');
      return null;
    }
  },

  /**
   * Test 9: Missing File Content
   */
  async testMissingContent() {
    console.log('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('TEST 9: Missing File Content (Error Handling)');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const result = await request('POST', '/upload', {
      fileName: 'test.edi'
      // Missing fileContent
    });

    if (!result.success) {
      console.log('✅ PASS: Correctly handled missing content');
      return result.error;
    } else {
      console.log('❌ FAIL: Should have returned error for missing content');
      return null;
    }
  }
};

/**
 * Run All Tests
 */
async function runTests() {
  console.log('\n╔══════════════════════════════════════════╗');
  console.log('║    ERA API TEST SUITE - PHASE 3B         ║');
  console.log('╚══════════════════════════════════════════╝');
  console.log(`\n📍 Base URL: ${config.baseUrl}`);
  console.log(`📍 API Path: ${config.apiPrefix}`);

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0
  };

  let uploadedFileId = null;

  // Test 1: Upload ERA
  results.total++;
  const uploadResult = await tests.testUploadERA();
  if (uploadResult && uploadResult.fileId) {
    uploadedFileId = uploadResult.fileId;
    results.passed++;
  } else {
    results.failed++;
  }
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Get ERA Files
  results.total++;
  const filesResult = await tests.testGetERAFiles();
  filesResult ? results.passed++ : results.failed++;
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 3: Get File Details
  results.total++;
  const detailsResult = await tests.testGetFileDetails(uploadedFileId);
  if (detailsResult === null && !uploadedFileId) {
    results.skipped++;
  } else {
    detailsResult ? results.passed++ : results.failed++;
  }
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 4: Get Payments
  results.total++;
  const paymentsResult = await tests.testGetPayments(uploadedFileId);
  if (paymentsResult === null && !uploadedFileId) {
    results.skipped++;
  } else {
    paymentsResult ? results.passed++ : results.failed++;
  }
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 5: Get Exceptions
  results.total++;
  const exceptionsResult = await tests.testGetExceptions();
  exceptionsResult ? results.passed++ : results.failed++;
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 6: Get Reconciliation
  results.total++;
  const reconResult = await tests.testGetReconciliation();
  reconResult ? results.passed++ : results.failed++;
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 7: Reconcile Batch
  results.total++;
  const reconcileResult = await tests.testReconcileBatch();
  reconcileResult ? results.passed++ : results.failed++;
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 8: Invalid Format
  results.total++;
  const invalidResult = await tests.testInvalidFormat();
  invalidResult ? results.passed++ : results.failed++;
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 9: Missing Content
  results.total++;
  const missingResult = await tests.testMissingContent();
  missingResult ? results.passed++ : results.failed++;

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
