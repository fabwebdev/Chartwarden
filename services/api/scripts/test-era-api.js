/**
 * ERA API Endpoints Test Script
 * Tests all Phase 3B ERA endpoints via HTTP
 *
 * Prerequisites:
 * - Application server must be running (npm start)
 * - Valid authentication token
 * - Database with ERA tables
 *
 * Usage:
 *   node scripts/test-era-api.js
 */

import axios from 'axios';
import fs from 'fs';
import path from 'path';

// Configuration
const CONFIG = {
  baseURL: process.env.API_BASE_URL || 'http://localhost:3000/api',
  authToken: process.env.AUTH_TOKEN || null, // Set your auth token here
  testMode: true
};

// ANSI colors for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

function success(message) {
  log(`✅ ${message}`, 'green');
}

function error(message) {
  log(`❌ ${message}`, 'red');
}

function info(message) {
  log(`ℹ️  ${message}`, 'cyan');
}

function warning(message) {
  log(`⚠️  ${message}`, 'yellow');
}

function section(message) {
  log(`\n${'='.repeat(80)}`, 'blue');
  log(`  ${message}`, 'bright');
  log('='.repeat(80), 'blue');
}

// Sample 835 EDI file for testing
const SAMPLE_835_FILE = `ISA*00*          *00*          *ZZ*PAYERID        *ZZ*PROVIDERID     *250127*1200*^*00501*000000001*0*P*:~
GS*HP*PAYERID*PROVIDERID*20250127*1200*1*X*005010X221A1~
ST*835*0001*005010X221A1~
BPR*I*37350.00*C*ACH*CTX*01*123456789*DA*987654321*1234567890**01*987654321*20250127~
TRN*1*1234567890*1234567890~
REF*EV*987654321~
DTM*405*20250127~
N1*PR*TEST MEDICARE~
N3*123 MEDICARE BLVD~
N4*BALTIMORE*MD*21244~
REF*2U*12-3456789~
N1*PE*HOSPICE CARE CENTER*XX*1234567890~
N3*456 PROVIDER ST~
N4*CITY*ST*12345~
REF*TJ*98-7654321~
LX*1~
CLP*TEST-API-001*1*12450.00*12450.00*0.00*MC*ICN-API-001*11*1~
NM1*QC*1*APITEST*JOHN****MI*ABC123456A~
NM1*82*1*SMITH*JANE****XX*9876543210~
DTM*232*20250101~
DTM*233*20250131~
REF*1K*CLM-API-TEST-1~
AMT*AU*12450.00~
SVC*HC:Q5001*12450.00*12450.00**31~
DTM*472*20250101~
AMT*B6*12450.00~
LX*2~
CLP*TEST-API-002*1*24900.00*22400.00*2500.00*MC*ICN-API-002*11*1~
NM1*QC*1*APITEST*JOHN****MI*ABC123456A~
NM1*82*1*SMITH*JANE****XX*9876543210~
DTM*232*20250101~
DTM*233*20250131~
REF*1K*CLM-API-TEST-2~
AMT*AU*24900.00~
SVC*HC:Q5001*24900.00*22400.00**31~
DTM*472*20250101~
AMT*B6*22400.00~
CAS*CO*45*2500.00~
LX*3~
CLP*NONEXISTENT-999*1*10000.00*10000.00*0.00*MC*ICN-API-999*11*1~
NM1*QC*1*UNKNOWN*PATIENT****MI*XXX999999X~
NM1*82*1*SMITH*JANE****XX*9876543210~
DTM*232*20250101~
DTM*233*20250131~
AMT*AU*10000.00~
SVC*HC:Q5001*10000.00*10000.00**31~
DTM*472*20250101~
AMT*B6*10000.00~
SE*52*0001~
GE*1*1~
IEA*1*000000001~`;

// Create axios instance with auth
function createApiClient() {
  const client = axios.create({
    baseURL: CONFIG.baseURL,
    timeout: 30000,
    headers: {
      'Content-Type': 'application/json'
    }
  });

  // Add auth token if provided
  if (CONFIG.authToken) {
    client.defaults.headers.common['Authorization'] = `Bearer ${CONFIG.authToken}`;
  }

  // Add response interceptor for better error messages
  client.interceptors.response.use(
    response => response,
    error => {
      if (error.response) {
        error.message = `HTTP ${error.response.status}: ${JSON.stringify(error.response.data)}`;
      }
      return Promise.reject(error);
    }
  );

  return client;
}

const api = createApiClient();

// Test results tracking
const testResults = {
  total: 0,
  passed: 0,
  failed: 0,
  skipped: 0,
  tests: []
};

function recordTest(name, status, details = {}) {
  testResults.total++;
  testResults[status]++;
  testResults.tests.push({ name, status, ...details });
}

/**
 * Test 1: Upload and Process 835 File
 */
async function testUploadERAFile() {
  section('TEST 1: Upload and Process 835 ERA File');

  try {
    info('Uploading 835 file to POST /api/era/upload...');

    const response = await api.post('/era/upload', {
      fileName: 'TEST_API_20250127.835',
      fileContent: SAMPLE_835_FILE
    });

    if (response.status === 200 && response.data.success) {
      success('File uploaded and processed successfully');
      info(`  ERA File ID: ${response.data.data.eraFileId}`);
      info(`  Total Claims: ${response.data.data.summary.totalClaims}`);
      info(`  Auto-Posted: ${response.data.data.summary.autoPosted}`);
      info(`  Exceptions: ${response.data.data.summary.exceptions}`);
      info(`  Total Amount: $${(response.data.data.summary.totalAmount / 100).toFixed(2)}`);

      recordTest('Upload ERA File', 'passed', {
        eraFileId: response.data.data.eraFileId,
        summary: response.data.data.summary
      });

      return response.data.data;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (err) {
    error(`Upload failed: ${err.message}`);
    recordTest('Upload ERA File', 'failed', { error: err.message });
    return null;
  }
}

/**
 * Test 2: Get ERA Files List
 */
async function testGetERAFiles() {
  section('TEST 2: Get ERA Files List');

  try {
    info('Fetching ERA files from GET /api/era/files...');

    const response = await api.get('/era/files', {
      params: {
        status: 'COMPLETED',
        limit: 10
      }
    });

    if (response.status === 200 && response.data.success) {
      success(`Retrieved ${response.data.count} ERA files`);

      if (response.data.data.length > 0) {
        info('\nMost recent files:');
        response.data.data.slice(0, 3).forEach((file, idx) => {
          info(`  ${idx + 1}. ${file.file_name}`);
          info(`     ID: ${file.file_id}`);
          info(`     Status: ${file.status}`);
          info(`     Amount: $${(file.total_amount / 100).toFixed(2)}`);
          info(`     Date: ${new Date(file.received_date).toLocaleString()}`);
        });
      }

      recordTest('Get ERA Files', 'passed', { count: response.data.count });
      return response.data.data;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (err) {
    error(`Get files failed: ${err.message}`);
    recordTest('Get ERA Files', 'failed', { error: err.message });
    return null;
  }
}

/**
 * Test 3: Get ERA File Details
 */
async function testGetERAFileDetails(fileId) {
  section('TEST 3: Get ERA File Details');

  if (!fileId) {
    warning('No file ID provided, skipping test');
    recordTest('Get ERA File Details', 'skipped');
    return null;
  }

  try {
    info(`Fetching file details from GET /api/era/file/${fileId}...`);

    const response = await api.get(`/era/file/${fileId}`);

    if (response.status === 200 && response.data.success) {
      const file = response.data.data;
      success('Retrieved file details');
      info(`  File Name: ${file.file_name}`);
      info(`  Payer: ${file.payer_name}`);
      info(`  Total Claims: ${file.total_claims}`);
      info(`  Auto-Posted: ${file.auto_posted_count}`);
      info(`  Exceptions: ${file.exception_count}`);

      recordTest('Get ERA File Details', 'passed');
      return file;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (err) {
    error(`Get file details failed: ${err.message}`);
    recordTest('Get ERA File Details', 'failed', { error: err.message });
    return null;
  }
}

/**
 * Test 4: Get ERA Payments for File
 */
async function testGetERAPayments(eraFileId) {
  section('TEST 4: Get ERA Payments for File');

  if (!eraFileId) {
    warning('No ERA file ID provided, skipping test');
    recordTest('Get ERA Payments', 'skipped');
    return null;
  }

  try {
    info(`Fetching payments from GET /api/era/payments/${eraFileId}...`);

    const response = await api.get(`/era/payments/${eraFileId}`);

    if (response.status === 200 && response.data.success) {
      success(`Retrieved ${response.data.count} payments`);

      if (response.data.data.length > 0) {
        info('\nPayment details:');
        response.data.data.forEach((payment, idx) => {
          info(`  ${idx + 1}. Account: ${payment.patient_account_number}`);
          info(`     Amount: $${(payment.total_payment_amount / 100).toFixed(2)}`);
          info(`     Status: ${payment.posting_status}`);
          info(`     Exception: ${payment.is_exception ? 'YES' : 'NO'}`);
        });
      }

      recordTest('Get ERA Payments', 'passed', { count: response.data.count });
      return response.data.data;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (err) {
    error(`Get payments failed: ${err.message}`);
    recordTest('Get ERA Payments', 'failed', { error: err.message });
    return null;
  }
}

/**
 * Test 5: Get Posting Exceptions
 */
async function testGetPostingExceptions() {
  section('TEST 5: Get Posting Exceptions');

  try {
    info('Fetching exceptions from GET /api/era/exceptions...');

    const response = await api.get('/era/exceptions', {
      params: {
        status: 'PENDING',
        limit: 20
      }
    });

    if (response.status === 200 && response.data.success) {
      success(`Retrieved ${response.data.count} exceptions`);
      info(`  Overdue: ${response.data.overdueCount}`);

      if (response.data.data.length > 0) {
        info('\nException details:');
        response.data.data.slice(0, 5).forEach((exc, idx) => {
          info(`  ${idx + 1}. Type: ${exc.exception_type}`);
          info(`     Severity: ${exc.exception_severity}`);
          info(`     Account: ${exc.patient_account_number || 'N/A'}`);
          info(`     Amount: $${exc.payment_amount ? (exc.payment_amount / 100).toFixed(2) : 'N/A'}`);
          info(`     Overdue: ${exc.is_overdue ? 'YES ⚠️' : 'NO'}`);
        });
      }

      recordTest('Get Posting Exceptions', 'passed', {
        count: response.data.count,
        overdue: response.data.overdueCount
      });

      return response.data.data;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (err) {
    error(`Get exceptions failed: ${err.message}`);
    recordTest('Get Posting Exceptions', 'failed', { error: err.message });
    return null;
  }
}

/**
 * Test 6: Resolve Posting Exception
 */
async function testResolveException(exceptionId) {
  section('TEST 6: Resolve Posting Exception');

  if (!exceptionId) {
    warning('No exception ID provided, skipping test');
    recordTest('Resolve Exception', 'skipped');
    return null;
  }

  try {
    info(`Resolving exception POST /api/era/resolve-exception/${exceptionId}...`);

    const response = await api.post(`/era/resolve-exception/${exceptionId}`, {
      resolutionType: 'MANUAL_POSTED',
      notes: 'Test resolution - manually posted after verification'
    });

    if (response.status === 200 && response.data.success) {
      success('Exception resolved successfully');

      recordTest('Resolve Exception', 'passed');
      return true;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (err) {
    error(`Resolve exception failed: ${err.message}`);
    recordTest('Resolve Exception', 'failed', { error: err.message });
    return false;
  }
}

/**
 * Test 7: Get Reconciliation Batches
 */
async function testGetReconciliation() {
  section('TEST 7: Get Reconciliation Batches');

  try {
    info('Fetching reconciliation batches from GET /api/era/reconciliation...');

    const response = await api.get('/era/reconciliation');

    if (response.status === 200 && response.data.success) {
      success(`Retrieved ${response.data.count} reconciliation batches`);

      if (response.data.data.length > 0) {
        info('\nRecent batches:');
        response.data.data.slice(0, 3).forEach((batch, idx) => {
          info(`  ${idx + 1}. Date: ${batch.batch_date}`);
          info(`     Status: ${batch.reconciliation_status}`);
          info(`     Variance: $${batch.variance_amount ? (batch.variance_amount / 100).toFixed(2) : '0.00'}`);
          info(`     Reconciled: ${batch.is_reconciled ? 'YES' : 'NO'}`);
        });
      }

      recordTest('Get Reconciliation', 'passed', { count: response.data.count });
      return response.data.data;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (err) {
    error(`Get reconciliation failed: ${err.message}`);
    recordTest('Get Reconciliation', 'failed', { error: err.message });
    return null;
  }
}

/**
 * Test 8: Create Reconciliation Batch
 */
async function testCreateReconciliation() {
  section('TEST 8: Create Reconciliation Batch');

  try {
    const today = new Date().toISOString().split('T')[0];
    info(`Creating reconciliation batch POST /api/era/reconcile-batch...`);

    const response = await api.post('/era/reconcile-batch', {
      batchDate: today,
      depositAmount: 3735000, // $37,350.00 in cents
      bankStatementAmount: 3735000
    });

    if (response.status === 200 && response.data.success) {
      success('Reconciliation batch created');
      info(`  Batch ID: ${response.data.data.batch_id}`);
      info(`  Variance: $${(response.data.data.variance_amount / 100).toFixed(2)}`);
      info(`  Reconciled: ${response.data.data.is_reconciled ? 'YES' : 'NO'}`);

      recordTest('Create Reconciliation Batch', 'passed');
      return response.data.data;
    } else {
      throw new Error('Unexpected response format');
    }
  } catch (err) {
    error(`Create reconciliation failed: ${err.message}`);
    recordTest('Create Reconciliation Batch', 'failed', { error: err.message });
    return null;
  }
}

/**
 * Test 9: Check Health Endpoint
 */
async function testHealthCheck() {
  section('TEST 0: Health Check');

  try {
    info('Checking API health GET /api/health...');

    const response = await api.get('/health');

    if (response.status === 200) {
      success('API is healthy');
      info(`  Status: ${response.data.status}`);
      info(`  Database: ${response.data.database}`);

      recordTest('Health Check', 'passed');
      return true;
    } else {
      throw new Error('Health check failed');
    }
  } catch (err) {
    error(`Health check failed: ${err.message}`);
    recordTest('Health Check', 'failed', { error: err.message });
    return false;
  }
}

/**
 * Main test runner
 */
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'bright');
  log('║         PHASE 3B ERA PROCESSING - API ENDPOINT TESTS                      ║', 'bright');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'bright');

  // Check configuration
  section('CONFIGURATION');
  info(`Base URL: ${CONFIG.baseURL}`);
  info(`Auth Token: ${CONFIG.authToken ? '✅ Provided' : '❌ Not provided'}`);

  if (!CONFIG.authToken) {
    warning('\n⚠️  No auth token provided!');
    warning('Set AUTH_TOKEN environment variable or update CONFIG.authToken in script');
    warning('Some endpoints may fail without authentication\n');
  }

  const startTime = Date.now();

  // Run tests
  const isHealthy = await testHealthCheck();

  if (!isHealthy) {
    error('\n❌ API is not healthy. Please start the server and try again.');
    error('Run: npm start');
    process.exit(1);
  }

  // Test 1: Upload ERA file
  const uploadResult = await testUploadERAFile();
  const eraFileId = uploadResult?.eraFileId;
  const fileId = uploadResult?.eraFileId; // May need to be file_id string

  // Test 2: Get ERA files list
  const files = await testGetERAFiles();
  const actualFileId = files && files.length > 0 ? files[0].file_id : fileId;

  // Test 3: Get file details
  await testGetERAFileDetails(actualFileId);

  // Test 4: Get payments for file
  const payments = await testGetERAPayments(eraFileId);

  // Test 5: Get posting exceptions
  const exceptions = await testGetPostingExceptions();
  const exceptionId = exceptions && exceptions.length > 0 ? exceptions[0].exception_id : null;

  // Test 6: Resolve exception (if exists)
  if (exceptionId) {
    await testResolveException(exceptionId);
  } else {
    warning('No exceptions found to test resolution');
    recordTest('Resolve Exception', 'skipped');
  }

  // Test 7: Get reconciliation batches
  await testGetReconciliation();

  // Test 8: Create reconciliation batch
  await testCreateReconciliation();

  // Final summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  section('TEST RESULTS SUMMARY');

  log(`\nTotal Tests: ${testResults.total}`, 'bright');
  log(`Passed: ${colors.green}${testResults.passed}${colors.reset}`, 'bright');
  if (testResults.failed > 0) {
    log(`Failed: ${colors.red}${testResults.failed}${colors.reset}`, 'bright');
  }
  if (testResults.skipped > 0) {
    log(`Skipped: ${colors.yellow}${testResults.skipped}${colors.reset}`, 'bright');
  }
  log(`Duration: ${duration}s`, 'bright');

  // Detailed results
  log('\nDetailed Results:', 'bright');
  testResults.tests.forEach((test, idx) => {
    const icon = test.status === 'passed' ? '✅' : test.status === 'failed' ? '❌' : '⚠️';
    log(`  ${icon} ${test.name}`, test.status === 'passed' ? 'green' : test.status === 'failed' ? 'red' : 'yellow');
  });

  if (testResults.failed === 0) {
    success('\n🎉 All tests passed! ERA API endpoints are working correctly.');
  } else {
    error('\n❌ Some tests failed. Please review the errors above.');
  }

  process.exit(testResults.failed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
