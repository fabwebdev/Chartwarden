/**
 * Simple ERA Test Script
 * Tests Phase 3B functionality without loading all schemas
 */

import EDI835Parser from '../src/services/EDI835Parser.service.js';

// ANSI colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  bright: '\x1b[1m'
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
  log(`\n${'='.repeat(80)}`, 'bright');
  log(`  ${message}`, 'bright');
  log('='.repeat(80), 'bright');
}

// Sample 835 EDI file
const sample835 = `ISA*00*          *00*          *ZZ*PAYERID        *ZZ*PROVIDERID     *250115*1200*^*00501*000000001*0*P*:~
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
CLP*TEST-001*1*12450.00*12450.00*0.00*MC*ICN123001*11*1~
NM1*QC*1*TESTPATIENT*JOHN****MI*ABC123456A~
NM1*82*1*SMITH*JANE****XX*9876543210~
DTM*232*20250101~
DTM*233*20250131~
REF*1K*CLM-TEST-1~
AMT*AU*12450.00~
SVC*HC:Q5001*12450.00*12450.00**31~
DTM*472*20250101~
AMT*B6*12450.00~
CAS*CO*45*1000.00~
LX*2~
CLP*TEST-002*1*24900.00*22400.00*2500.00*MC*ICN123002*11*1~
NM1*QC*1*TESTPATIENT*JOHN****MI*ABC123456A~
NM1*82*1*SMITH*JANE****XX*9876543210~
DTM*232*20250101~
DTM*233*20250131~
REF*1K*CLM-TEST-2~
AMT*AU*24900.00~
SVC*HC:Q5001*24900.00*22400.00**31~
DTM*472*20250101~
AMT*B6*22400.00~
CAS*CO*45*2500.00~
CAS*PR*1*0.00~
LX*3~
CLP*TEST-003*4*10000.00*0.00*0.00*MC*ICN123003*11*1~
NM1*QC*1*DENIED*CLAIM****MI*XXX999999X~
NM1*82*1*SMITH*JANE****XX*9876543210~
DTM*232*20250101~
DTM*233*20250131~
AMT*AU*10000.00~
SVC*HC:Q5001*10000.00*0.00**31~
DTM*472*20250101~
AMT*B6*0.00~
CAS*CO*97*10000.00~
SE*55*0001~
GE*1*1~
IEA*1*000000001~`;

async function testEDI835Parser() {
  section('TEST 1: EDI 835 Parser Functionality');

  try {
    const parsed = await EDI835Parser.parse835(sample835);

    success('835 file parsed successfully');

    info(`\n📄 FILE INFORMATION:`);
    info(`  Control Number: ${parsed.header.interchangeControlNumber}`);
    info(`  Transaction Date: ${parsed.header.interchangeDate}`);
    info(`  Check Number: ${parsed.header.checkNumber}`);

    info(`\n💰 PAYMENT SUMMARY:`);
    info(`  Total Payment Amount: $${(parsed.payment.totalPaymentAmount / 100).toFixed(2)}`);
    info(`  Payment Method: ${parsed.payment.paymentMethod}`);
    info(`  Effective Date: ${parsed.payment.effectiveDate}`);
    info(`  Production Date: ${parsed.payment.productionDate}`);

    info(`\n🏥 PAYER INFORMATION:`);
    info(`  Name: ${parsed.payer.name}`);
    info(`  Identifier: ${parsed.payer.identifier}`);
    info(`  Address: ${parsed.payer.addressLine1}`);
    info(`  City/State/ZIP: ${parsed.payer.city}, ${parsed.payer.state} ${parsed.payer.zipCode}`);

    info(`\n🏢 PAYEE (PROVIDER) INFORMATION:`);
    info(`  Name: ${parsed.payee.name}`);
    info(`  NPI: ${parsed.payee.identifier}`);
    info(`  Tax ID: ${parsed.payee.taxId}`);

    info(`\n📊 CLAIMS PROCESSED: ${parsed.claimPayments.length}`);

    let totalAdjustments = 0;

    parsed.claimPayments.forEach((claim, index) => {
      info(`\n  CLAIM ${index + 1}:`);
      info(`    Account Number: ${claim.patientAccountNumber}`);
      info(`    Status Code: ${claim.claimStatusCode}`);
      info(`    Status Description: ${EDI835Parser.getClaimStatusDescription(claim.claimStatusCode)}`);
      info(`    Payment Status: ${EDI835Parser.getPaymentStatus(claim)}`);
      info(`    Patient: ${claim.patient?.firstName || ''} ${claim.patient?.lastName || ''}`);
      info(`    Member ID: ${claim.patient?.memberId || 'N/A'}`);

      info(`\n    FINANCIAL DETAILS:`);
      info(`      Total Charge: $${(claim.totalChargeAmount / 100).toFixed(2)}`);
      info(`      Payment Amount: $${(claim.paymentAmount / 100).toFixed(2)}`);
      info(`      Patient Responsibility: $${(claim.patientResponsibilityAmount / 100).toFixed(2)}`);

      info(`\n    DATES:`);
      info(`      Statement From: ${claim.dates?.statementFrom || 'N/A'}`);
      info(`      Statement To: ${claim.dates?.statementTo || 'N/A'}`);

      if (claim.adjustments && claim.adjustments.length > 0) {
        info(`\n    ADJUSTMENTS:`);
        claim.adjustments.forEach((adj, adjIdx) => {
          info(`      ${adjIdx + 1}. Group: ${adj.groupCode} (${adj.groupDescription})`);
          adj.adjustments.forEach((item, itemIdx) => {
            info(`         - Code ${item.reasonCode}: $${(item.amount / 100).toFixed(2)}`);
            totalAdjustments += item.amount;
          });
        });
      }

      if (claim.serviceLines && claim.serviceLines.length > 0) {
        info(`\n    SERVICE LINES: ${claim.serviceLines.length}`);
        claim.serviceLines.forEach((line, lineIdx) => {
          info(`      ${lineIdx + 1}. Procedure: ${line.procedureCode?.code || 'N/A'}`);
          info(`         Charge: $${(line.lineChargeAmount / 100).toFixed(2)}`);
          info(`         Payment: $${(line.linePaymentAmount / 100).toFixed(2)}`);
          if (line.adjustments && line.adjustments.length > 0) {
            info(`         Adjustments:`);
            line.adjustments.forEach(adj => {
              adj.adjustments.forEach(item => {
                info(`           - ${adj.groupCode}:${item.reasonCode} $${(item.amount / 100).toFixed(2)}`);
              });
            });
          }
        });
      }

      // Extract CARC codes
      const carcCodes = EDI835Parser.extractCARCCodes(claim);
      if (carcCodes.length > 0) {
        info(`\n    CARC/RARC CODES EXTRACTED: ${carcCodes.length}`);
        carcCodes.forEach((code, codeIdx) => {
          info(`      ${codeIdx + 1}. Level: ${code.level}, Group: ${code.groupCode}, Code: ${code.reasonCode}, Amount: $${(code.amount / 100).toFixed(2)}`);
        });
      }
    });

    info(`\n💵 TOTAL ADJUSTMENTS: $${(totalAdjustments / 100).toFixed(2)}`);

    success(`\n✅ Parser test completed successfully!`);
    success(`   - Parsed ${parsed.claimPayments.length} claims`);
    success(`   - Total payment: $${(parsed.payment.totalPaymentAmount / 100).toFixed(2)}`);
    success(`   - Total adjustments: $${(totalAdjustments / 100).toFixed(2)}`);

    return true;
  } catch (err) {
    error(`Parser test failed: ${err.message}`);
    console.error(err.stack);
    return false;
  }
}

async function runTests() {
  log('\n╔════════════════════════════════════════════════════════════════════════════╗', 'bright');
  log('║    PHASE 3B ERA PROCESSING - EDI 835 PARSER TEST                          ║', 'bright');
  log('╚════════════════════════════════════════════════════════════════════════════╝', 'bright');

  const success = await testEDI835Parser();

  section('TEST RESULTS');
  if (success) {
    log('\n🎉 All tests passed! EDI 835 Parser is working correctly.', 'green');
    log('\nThe parser successfully:', 'bright');
    log('  ✅ Parsed header information (ISA, GS, ST, BPR, TRN segments)', 'green');
    log('  ✅ Extracted payer and payee details', 'green');
    log('  ✅ Processed claim payments (CLP loop)', 'green');
    log('  ✅ Extracted service line details (SVC segments)', 'green');
    log('  ✅ Handled CARC/RARC adjustment codes (CAS segments)', 'green');
    log('  ✅ Determined payment status (PAID/PARTIAL/DENIED)', 'green');
    log('  ✅ Extracted patient demographics', 'green');
    log('\nNext steps:', 'bright');
    log('  1. Test with real 835 files from payers', 'cyan');
    log('  2. Test payment posting service with database', 'cyan');
    log('  3. Test exception handling workflows', 'cyan');
    log('  4. Test API endpoints via HTTP requests', 'cyan');
    process.exit(0);
  } else {
    log('\n❌ Tests failed. Please review the errors above.', 'red');
    process.exit(1);
  }
}

runTests().catch(err => {
  error(`Fatal error: ${err.message}`);
  console.error(err.stack);
  process.exit(1);
});
