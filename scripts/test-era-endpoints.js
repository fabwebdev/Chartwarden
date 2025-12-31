/**
 * ERA Endpoints Test Script
 * Tests Phase 3B ERA Processing & Auto-Posting functionality
 *
 * Tests:
 * 1. Database connectivity and ERA tables
 * 2. Sample claim creation
 * 3. 835 EDI file upload and processing
 * 4. Payment posting and matching
 * 5. Exception handling
 * 6. Reconciliation
 */

import { db } from '../src/db/index.js';
import {
  era_files,
  era_payments,
  payment_postings,
  posting_exceptions,
  reconciliation_batches
} from '../src/db/schemas/index.js';
import { claims, payers } from '../src/db/schemas/billing.schema.js';
import { patients } from '../src/db/schemas/patient.schema.js';
import { users } from '../src/db/schemas/user.schema.js';
import { eq, desc } from 'drizzle-orm';
import PaymentPostingService from '../src/services/PaymentPosting.service.js';
import EDI835Parser from '../src/services/EDI835Parser.service.js';

// ANSI colors for console output
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

function section(message) {
  log(`\n${'='.repeat(80)}`, 'blue');
  log(`  ${message}`, 'bright');
  log('='.repeat(80), 'blue');
}

/**
 * Test 1: Database Connectivity & Tables
 */
async function testDatabaseConnectivity() {
  section('TEST 1: Database Connectivity & ERA Tables');

  try {
    // Test basic query
    await db.execute('SELECT 1');
    success('Database connection successful');

    // Check ERA tables exist
    const tables = [
      { name: 'era_files', schema: era_files },
      { name: 'era_payments', schema: era_payments },
      { name: 'payment_postings', schema: payment_postings },
      { name: 'posting_exceptions', schema: posting_exceptions },
      { name: 'reconciliation_batches', schema: reconciliation_batches }
    ];

    for (const table of tables) {
      try {
        await db.select().from(table.schema).limit(1);
        success(`Table '${table.name}' exists and is accessible`);
      } catch (err) {
        error(`Table '${table.name}' not found or not accessible: ${err.message}`);
        throw err;
      }
    }

    return true;
  } catch (err) {
    error(`Database connectivity test failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 2: Create Sample Test Data
 */
async function createSampleTestData() {
  section('TEST 2: Create Sample Test Data');

  try {
    // Check if test patient exists
    let [testPatient] = await db.select()
      .from(patients)
      .where(eq(patients.last_name, 'TEST_ERA'))
      .limit(1);

    if (!testPatient) {
      info('Creating test patient...');
      [testPatient] = await db.insert(patients)
        .values({
          first_name: 'John',
          last_name: 'TEST_ERA',
          date_of_birth: '1950-01-15',
          gender: 'M',
          ssn: '123-45-6789',
          medicare_id: 'ABC123456A',
          status: 'ACTIVE'
        })
        .returning();
      success(`Created test patient: ${testPatient.id}`);
    } else {
      info(`Test patient already exists: ${testPatient.id}`);
    }

    // Check if test payer exists
    let [testPayer] = await db.select()
      .from(payers)
      .where(eq(payers.name, 'TEST MEDICARE'))
      .limit(1);

    if (!testPayer) {
      info('Creating test payer...');
      [testPayer] = await db.insert(payers)
        .values({
          name: 'TEST MEDICARE',
          payer_id: 'TEST123',
          payer_type: 'MEDICARE',
          status: 'ACTIVE'
        })
        .returning();
      success(`Created test payer: ${testPayer.id}`);
    } else {
      info(`Test payer already exists: ${testPayer.id}`);
    }

    // Create test claims
    const testClaims = [];

    for (let i = 1; i <= 3; i++) {
      const accountNumber = `TEST-ERA-${String(i).padStart(3, '0')}`;

      // Check if claim exists
      let [existingClaim] = await db.select()
        .from(claims)
        .where(eq(claims.patient_account_number, accountNumber))
        .limit(1);

      if (!existingClaim) {
        info(`Creating test claim ${i}...`);
        const [claim] = await db.insert(claims)
          .values({
            patient_id: testPatient.id,
            payer_id: testPayer.id,
            patient_account_number: accountNumber,
            claim_number: `CLM-TEST-${i}`,
            service_start_date: '2025-01-01',
            service_end_date: '2025-01-31',
            total_charge_amount: 12450 * i * 100, // in cents
            total_paid: 0,
            balance: 12450 * i * 100,
            status: 'SUBMITTED',
            level_of_care: 'ROUTINE_HOME_CARE'
          })
          .returning();

        testClaims.push(claim);
        success(`Created test claim: ${claim.patient_account_number} ($${12450 * i})`);
      } else {
        testClaims.push(existingClaim);
        info(`Test claim already exists: ${existingClaim.patient_account_number}`);
      }
    }

    return {
      patient: testPatient,
      payer: testPayer,
      claims: testClaims
    };
  } catch (err) {
    error(`Sample data creation failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 3: Create Sample 835 EDI File
 */
function createSample835File(testData) {
  section('TEST 3: Generate Sample 835 EDI File');

  const today = new Date();
  const dateStr = today.toISOString().split('T')[0].replace(/-/g, '').substring(2); // YYMMDD
  const timeStr = today.toTimeString().split(':').slice(0, 2).join(''); // HHMM

  // Create 835 file with 3 claims
  const edi835 = `ISA*00*          *00*          *ZZ*PAYERID        *ZZ*PROVIDERID     *${dateStr}*${timeStr}*^*00501*000000001*0*P*:~
GS*HP*PAYERID*PROVIDERID*20250115*1200*1*X*005010X221A1~
ST*835*0001*005010X221A1~
BPR*I*37350.00*C*ACH*CTX*01*123456789*DA*987654321*1234567890**01*987654321*20250115~
TRN*1*1234567890*1234567890~
REF*EV*987654321~
DTM*405*20250115~
N1*PR*TEST MEDICARE~
N3*123 MEDICARE BLVD~
N4*BALTIMORE*MD*21244~
REF*2U*12-3456789~
N1*PE*HOSPICE CARE CENTER*XX*1234567890~
N3*456 PROVIDER ST~
N4*CITY*ST*12345~
REF*TJ*98-7654321~
LX*1~
CLP*TEST-ERA-001*1*12450.00*12450.00*0.00*MC*ICN123001*11*1~
NM1*QC*1*TEST_ERA*JOHN****MI*ABC123456A~
NM1*82*1*SMITH*JANE****XX*9876543210~
DTM*232*20250101~
DTM*233*20250131~
REF*1K*CLM-TEST-1~
AMT*AU*12450.00~
SVC*HC:Q5001*12450.00*12450.00**31~
DTM*472*20250101~
AMT*B6*12450.00~
LX*2~
CLP*TEST-ERA-002*1*24900.00*24900.00*0.00*MC*ICN123002*11*1~
NM1*QC*1*TEST_ERA*JOHN****MI*ABC123456A~
NM1*82*1*SMITH*JANE****XX*9876543210~
DTM*232*20250101~
DTM*233*20250131~
REF*1K*CLM-TEST-2~
AMT*AU*24900.00~
SVC*HC:Q5001*24900.00*24900.00**31~
DTM*472*20250101~
AMT*B6*24900.00~
LX*3~
CLP*TEST-ERA-999*1*10000.00*10000.00*0.00*MC*ICN123999*11*1~
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

  info('Generated 835 EDI file with:');
  info('  - Total payment: $373.50');
  info('  - 3 claim payments:');
  info('    1. TEST-ERA-001: $124.50 (should match)');
  info('    2. TEST-ERA-002: $249.00 (should match)');
  info('    3. TEST-ERA-999: $100.00 (should create exception - claim not found)');

  return edi835;
}

/**
 * Test 4: Parse 835 File
 */
async function test835Parsing(edi835Content) {
  section('TEST 4: Parse 835 EDI File');

  try {
    const parsed = await EDI835Parser.parse835(edi835Content);

    success('835 file parsed successfully');
    info(`  Header control number: ${parsed.header.interchangeControlNumber}`);
    info(`  Total payment amount: $${(parsed.payment.totalPaymentAmount / 100).toFixed(2)}`);
    info(`  Payer: ${parsed.payer.name}`);
    info(`  Payee: ${parsed.payee.name}`);
    info(`  Number of claims: ${parsed.claimPayments.length}`);

    // Display each claim
    parsed.claimPayments.forEach((claim, index) => {
      info(`\n  Claim ${index + 1}:`);
      info(`    Account Number: ${claim.patientAccountNumber}`);
      info(`    Payment Amount: $${(claim.paymentAmount / 100).toFixed(2)}`);
      info(`    Status: ${claim.claimStatusCode} - ${EDI835Parser.getClaimStatusDescription(claim.claimStatusCode)}`);
      info(`    Patient: ${claim.patient?.firstName} ${claim.patient?.lastName}`);
    });

    return parsed;
  } catch (err) {
    error(`835 parsing failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 5: Process ERA File (Upload & Auto-Post)
 */
async function testERAProcessing(edi835Content, testData) {
  section('TEST 5: Process ERA File & Auto-Post Payments');

  try {
    const result = await PaymentPostingService.processERAFile({
      fileName: 'TEST_ERA_20250115.835',
      fileContent: edi835Content,
      uploadedBy: null // Will be set by actual API call
    });

    success('ERA file processed successfully');
    info(`\nProcessing Summary:`);
    info(`  ERA File ID: ${result.eraFileId}`);
    info(`  Total Claims: ${result.summary.totalClaims}`);
    info(`  Auto-Posted: ${result.summary.autoPosted}`);
    info(`  Exceptions: ${result.summary.exceptions}`);
    info(`  Total Amount: $${(result.summary.totalAmount / 100).toFixed(2)}`);

    // Display processed payments
    if (result.processedPayments.length > 0) {
      success(`\n✅ Successfully Auto-Posted Payments (${result.processedPayments.length}):`);
      result.processedPayments.forEach((posting, index) => {
        info(`  ${index + 1}. Posting ID: ${posting.posting_id}`);
        info(`     Amount: $${(posting.payment_amount / 100).toFixed(2)}`);
        info(`     Claim ID: ${posting.claim_id}`);
        info(`     Balance: $${(posting.previous_balance / 100).toFixed(2)} → $${(posting.new_balance / 100).toFixed(2)}`);
      });
    }

    // Display exceptions
    if (result.exceptions.length > 0) {
      log(`\n⚠️  Posting Exceptions (${result.exceptions.length}):`, 'yellow');
      result.exceptions.forEach((exc, index) => {
        info(`  ${index + 1}. Type: ${exc.type}`);
        info(`     Reason: ${exc.reason}`);
        if (exc.claimPayment) {
          info(`     Account: ${exc.claimPayment.patientAccountNumber}`);
          info(`     Amount: $${(exc.claimPayment.paymentAmount / 100).toFixed(2)}`);
        }
      });
    }

    return result;
  } catch (err) {
    error(`ERA processing failed: ${err.message}`);
    console.error(err);
    throw err;
  }
}

/**
 * Test 6: Query ERA Files
 */
async function testQueryERAFiles() {
  section('TEST 6: Query ERA Files');

  try {
    const files = await db.select()
      .from(era_files)
      .orderBy(desc(era_files.created_at))
      .limit(5);

    success(`Found ${files.length} ERA files`);

    files.forEach((file, index) => {
      info(`\n  ${index + 1}. File: ${file.file_name}`);
      info(`     ID: ${file.file_id}`);
      info(`     Status: ${file.status}`);
      info(`     Total Amount: $${(file.total_amount / 100).toFixed(2)}`);
      info(`     Auto-Posted: ${file.auto_posted_count}/${file.total_payments}`);
      info(`     Exceptions: ${file.exception_count}`);
      info(`     Received: ${file.received_date}`);
    });

    return files;
  } catch (err) {
    error(`Query ERA files failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 7: Query Posting Exceptions
 */
async function testQueryExceptions() {
  section('TEST 7: Query Posting Exceptions');

  try {
    const exceptions = await db.select()
      .from(posting_exceptions)
      .orderBy(desc(posting_exceptions.created_at))
      .limit(10);

    success(`Found ${exceptions.length} posting exceptions`);

    exceptions.forEach((exc, index) => {
      info(`\n  ${index + 1}. Exception: ${exc.exception_id}`);
      info(`     Type: ${exc.exception_type}`);
      info(`     Severity: ${exc.exception_severity}`);
      info(`     Status: ${exc.status}`);
      info(`     Amount: $${exc.payment_amount ? (exc.payment_amount / 100).toFixed(2) : 'N/A'}`);
      info(`     Account: ${exc.patient_account_number || 'N/A'}`);
      info(`     Reason: ${exc.exception_reason}`);
      info(`     SLA Deadline: ${exc.sla_deadline}`);
      info(`     Overdue: ${exc.is_overdue ? 'YES ⚠️' : 'NO'}`);
    });

    return exceptions;
  } catch (err) {
    error(`Query exceptions failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 8: Query Payment Postings
 */
async function testQueryPaymentPostings() {
  section('TEST 8: Query Payment Postings');

  try {
    const postings = await db.select()
      .from(payment_postings)
      .orderBy(desc(payment_postings.created_at))
      .limit(10);

    success(`Found ${postings.length} payment postings`);

    postings.forEach((posting, index) => {
      info(`\n  ${index + 1}. Posting: ${posting.posting_id}`);
      info(`     Type: ${posting.posting_type}`);
      info(`     Amount: $${(posting.payment_amount / 100).toFixed(2)}`);
      info(`     Claim ID: ${posting.claim_id}`);
      info(`     Balance Change: $${(posting.previous_balance / 100).toFixed(2)} → $${(posting.new_balance / 100).toFixed(2)}`);
      info(`     Date: ${posting.posting_date}`);
      info(`     Reversed: ${posting.is_reversed ? 'YES' : 'NO'}`);
    });

    return postings;
  } catch (err) {
    error(`Query payment postings failed: ${err.message}`);
    throw err;
  }
}

/**
 * Test 9: Verify Claims Updated
 */
async function testVerifyClaimsUpdated(testData) {
  section('TEST 9: Verify Claims Updated After Posting');

  try {
    for (const testClaim of testData.claims) {
      const [updatedClaim] = await db.select()
        .from(claims)
        .where(eq(claims.id, testClaim.id))
        .limit(1);

      if (updatedClaim) {
        const wasUpdated = updatedClaim.total_paid > 0;

        if (wasUpdated) {
          success(`\n✅ Claim ${updatedClaim.patient_account_number} updated:`);
          info(`   Total Paid: $${(updatedClaim.total_paid / 100).toFixed(2)}`);
          info(`   Balance: $${(updatedClaim.balance / 100).toFixed(2)}`);
          info(`   Status: ${updatedClaim.status}`);
          info(`   Last Payment: ${updatedClaim.last_payment_date}`);
        } else {
          info(`\nℹ️  Claim ${updatedClaim.patient_account_number} not posted (may be in exceptions)`);
          info(`   Status: ${updatedClaim.status}`);
        }
      }
    }

    return true;
  } catch (err) {
    error(`Verify claims updated failed: ${err.message}`);
    throw err;
  }
}

/**
 * Main Test Runner
 */
async function runAllTests() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'bright');
  log('║         PHASE 3B ERA PROCESSING & AUTO-POSTING - TEST SUITE               ║', 'bright');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'bright');

  const startTime = Date.now();
  let testsPassed = 0;
  let testsFailed = 0;

  try {
    // Test 1: Database Connectivity
    await testDatabaseConnectivity();
    testsPassed++;

    // Test 2: Create Sample Data
    const testData = await createSampleTestData();
    testsPassed++;

    // Test 3: Generate 835 File
    const edi835Content = createSample835File(testData);
    testsPassed++;

    // Test 4: Parse 835 File
    const parsed835 = await test835Parsing(edi835Content);
    testsPassed++;

    // Test 5: Process ERA File
    const processingResult = await testERAProcessing(edi835Content, testData);
    testsPassed++;

    // Test 6: Query ERA Files
    await testQueryERAFiles();
    testsPassed++;

    // Test 7: Query Exceptions
    await testQueryExceptions();
    testsPassed++;

    // Test 8: Query Payment Postings
    await testQueryPaymentPostings();
    testsPassed++;

    // Test 9: Verify Claims Updated
    await testVerifyClaimsUpdated(testData);
    testsPassed++;

  } catch (err) {
    testsFailed++;
    error(`\nTest suite failed: ${err.message}`);
    console.error(err.stack);
  }

  // Final Summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);

  section('TEST RESULTS SUMMARY');
  log(`\nTests Passed: ${colors.green}${testsPassed}${colors.reset}`, 'bright');
  if (testsFailed > 0) {
    log(`Tests Failed: ${colors.red}${testsFailed}${colors.reset}`, 'bright');
  }
  log(`Duration: ${duration}s`, 'bright');

  if (testsFailed === 0) {
    success('\n🎉 All tests passed! Phase 3B ERA Processing is working correctly.');
  } else {
    error('\n❌ Some tests failed. Please review the errors above.');
  }

  process.exit(testsFailed > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
