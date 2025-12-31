/**
 * 835 EDI File Generator
 * Generates sample 835 files for testing ERA processing
 *
 * Usage:
 *   node scripts/generate-835-samples.js [options]
 *
 * Options:
 *   --payer <type>      Payer type: medicare, medicaid, commercial (default: medicare)
 *   --claims <number>   Number of claims (default: 3)
 *   --scenario <type>   Scenario: paid, partial, denied, mixed (default: paid)
 *   --output <file>     Output file name
 */

import fs from 'fs';
import path from 'path';

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  payer: 'medicare',
  claims: 3,
  scenario: 'paid',
  output: null
};

for (let i = 0; i < args.length; i += 2) {
  const key = args[i].replace('--', '');
  const value = args[i + 1];
  if (key in options) {
    options[key] = key === 'claims' ? parseInt(value) : value;
  }
}

// Payer configurations
const PAYERS = {
  medicare: {
    senderId: '00123',
    receiverId: 'HOSPICE001',
    payerName: 'MEDICARE',
    payerAddress: '7500 SECURITY BLVD',
    payerCity: 'BALTIMORE',
    payerState: 'MD',
    payerZip: '21244',
    payerTaxId: '12-3456789',
    claimPrefix: 'MED',
    icnPrefix: '1234567890'
  },
  medicaid: {
    senderId: 'STATEMCAID',
    receiverId: 'HOSPICE001',
    payerName: 'STATE MEDICAID PROGRAM',
    payerAddress: '100 STATE HOUSE PLAZA',
    payerCity: 'CAPITAL CITY',
    payerState: 'ST',
    payerZip: '55555',
    payerTaxId: '55-6677889',
    claimPrefix: 'MCD',
    icnPrefix: 'STATE'
  },
  commercial: {
    senderId: 'BLUECROSS',
    receiverId: 'HOSPICE001',
    payerName: 'BLUE CROSS BLUE SHIELD',
    payerAddress: '225 NORTH MICHIGAN AVE',
    payerCity: 'CHICAGO',
    payerState: 'IL',
    payerZip: '60601',
    payerTaxId: '36-1234567',
    claimPrefix: 'BC',
    icnPrefix: 'BC-CLM'
  }
};

// Hospice care level rates (daily rates in cents)
const CARE_LEVELS = {
  Q5001: { code: 'Q5001', name: 'Routine Home Care', rate: 20081 }, // $200.81/day
  Q5002: { code: 'Q5002', name: 'Continuous Home Care', rate: 100423 }, // $1,004.23/day
  Q5003: { code: 'Q5003', name: 'Inpatient Respite Care', rate: 50006 }, // $500.06/day
  Q5004: { code: 'Q5004', name: 'General Inpatient Care', rate: 179000 }, // $1,790.00/day
  Q5009: { code: 'Q5009', name: 'Hospice Room and Board', rate: 30000 }  // $300.00/day
};

// Sample patient names
const FIRST_NAMES = ['JAMES', 'MARY', 'JOHN', 'PATRICIA', 'ROBERT', 'JENNIFER', 'MICHAEL', 'LINDA', 'WILLIAM', 'ELIZABETH'];
const LAST_NAMES = ['SMITH', 'JOHNSON', 'WILLIAMS', 'BROWN', 'JONES', 'GARCIA', 'MILLER', 'DAVIS', 'RODRIGUEZ', 'MARTINEZ'];

// Adjustment codes
const ADJUSTMENT_CODES = {
  CO45: { group: 'CO', code: '45', desc: 'Charge exceeds fee schedule/maximum allowable' },
  CO97: { group: 'CO', code: '97', desc: 'Benefit included in another service' },
  CO16: { group: 'CO', code: '16', desc: 'Claim lacks information' },
  CO29: { group: 'CO', code: '29', desc: 'Time limit for filing has expired' },
  CO50: { group: 'CO', code: '50', desc: 'Non-covered service' },
  PR1: { group: 'PR', code: '1', desc: 'Deductible amount' },
  PR2: { group: 'PR', code: '2', desc: 'Coinsurance amount' },
  PR3: { group: 'PR', code: '3', desc: 'Copayment amount' }
};

/**
 * Generate ISA segment
 */
function generateISA(payer, controlNumber) {
  const now = new Date();
  const date = now.toISOString().split('T')[0].replace(/-/g, '').substring(2); // YYMMDD
  const time = now.toTimeString().substring(0, 5).replace(':', ''); // HHMM

  return `ISA*00*          *00*          *ZZ*${payer.senderId.padEnd(15)}*ZZ*${payer.receiverId.padEnd(15)}*${date}*${time}*^*00501*${String(controlNumber).padStart(9, '0')}*0*P*:~`;
}

/**
 * Generate GS segment
 */
function generateGS(payer, controlNumber) {
  const date = new Date().toISOString().split('T')[0].replace(/-/g, ''); // YYYYMMDD
  const time = new Date().toTimeString().substring(0, 5).replace(':', ''); // HHMM

  return `GS*HP*${payer.senderId}*${payer.receiverId}*${date}*${time}*${controlNumber}*X*005010X221A1~`;
}

/**
 * Generate claim payment (CLP loop)
 */
function generateClaim(payer, claimNumber, scenario, index) {
  const firstName = FIRST_NAMES[index % FIRST_NAMES.length];
  const lastName = LAST_NAMES[Math.floor(index / FIRST_NAMES.length) % LAST_NAMES.length];
  const memberId = `${payer.claimPrefix}${String(123456789 + index).substring(0, 9)}`;

  // Determine care level (rotate through types)
  const careLevelKeys = Object.keys(CARE_LEVELS);
  const careLevel = CARE_LEVELS[careLevelKeys[index % careLevelKeys.length]];

  // Calculate days (between 1-31)
  const days = Math.floor(Math.random() * 31) + 1;
  const billedAmount = careLevel.rate * days;

  let paidAmount, patientResp, statusCode, adjustments;

  // Determine scenario
  switch (scenario) {
    case 'denied':
      paidAmount = 0;
      patientResp = 0;
      statusCode = '4'; // Denied
      adjustments = [
        { ...ADJUSTMENT_CODES.CO97, amount: billedAmount }
      ];
      break;

    case 'partial':
      const reduction = Math.floor(billedAmount * 0.1); // 10% reduction
      const patientPortion = Math.floor(billedAmount * 0.05); // 5% patient
      paidAmount = billedAmount - reduction - patientPortion;
      patientResp = patientPortion;
      statusCode = '1'; // Processed as primary
      adjustments = [
        { ...ADJUSTMENT_CODES.CO45, amount: reduction },
        { ...ADJUSTMENT_CODES.PR1, amount: patientPortion }
      ];
      break;

    case 'paid':
    default:
      paidAmount = billedAmount;
      patientResp = 0;
      statusCode = '1'; // Processed as primary
      adjustments = [];
      break;
  }

  // Format dates
  const today = new Date();
  const startDate = new Date(today);
  startDate.setDate(1); // First of month
  const endDate = new Date(today);

  const formatDate = (d) => d.toISOString().split('T')[0].replace(/-/g, '');

  const claimId = `${payer.claimPrefix}-${String(claimNumber).padStart(6, '0')}`;
  const icn = `${payer.icnPrefix}-${String(claimNumber).padStart(6, '0')}`;

  let segments = [];

  // LX - Loop header
  segments.push(`LX*${claimNumber}~`);

  // CLP - Claim payment
  segments.push(`CLP*${claimId}*${statusCode}*${(billedAmount / 100).toFixed(2)}*${(paidAmount / 100).toFixed(2)}*${(patientResp / 100).toFixed(2)}*MC*${icn}*11*1~`);

  // NM1 - Patient
  segments.push(`NM1*QC*1*${lastName}*${firstName}****MI*${memberId}~`);

  // NM1 - Subscriber (if commercial)
  if (payer === PAYERS.commercial) {
    segments.push(`NM1*IL*1*${lastName}*${firstName}****MI*${memberId}~`);
  }

  // NM1 - Provider
  segments.push(`NM1*82*1*JOHNSON*ROBERT*D*DR**XX*9876543210~`);

  // DTM - Dates
  segments.push(`DTM*232*${formatDate(startDate)}~`);
  segments.push(`DTM*233*${formatDate(endDate)}~`);

  // REF - Claim reference
  segments.push(`REF*1K*CLAIM-${claimId}~`);

  // AMT - Allowed amount
  segments.push(`AMT*AU*${(paidAmount / 100).toFixed(2)}~`);

  // CAS - Claim level adjustments
  if (adjustments.length > 0) {
    adjustments.forEach(adj => {
      segments.push(`CAS*${adj.group}*${adj.code}*${(adj.amount / 100).toFixed(2)}~`);
    });
  }

  // SVC - Service line
  const lineAmount = billedAmount / days; // Per day
  const linePaid = paidAmount / days;
  segments.push(`SVC*HC:${careLevel.code}*${(lineAmount / 100).toFixed(2)}*${(linePaid / 100).toFixed(2)}**${days}~`);
  segments.push(`DTM*472*${formatDate(startDate)}~`);
  segments.push(`DTM*471*${formatDate(endDate)}~`);

  // Service level adjustments
  if (adjustments.length > 0) {
    adjustments.forEach(adj => {
      const lineAdjustment = adj.amount / days;
      segments.push(`CAS*${adj.group}*${adj.code}*${(lineAdjustment / 100).toFixed(2)}~`);
    });
  }

  segments.push(`AMT*B6*${(paidAmount / 100).toFixed(2)}~`);

  return {
    segments: segments.join('\n'),
    billedAmount,
    paidAmount,
    patientResp
  };
}

/**
 * Generate complete 835 file
 */
function generate835File(payerType, numClaims, scenario) {
  const payer = PAYERS[payerType];
  if (!payer) {
    throw new Error(`Unknown payer type: ${payerType}`);
  }

  const controlNumber = Math.floor(Math.random() * 900000) + 100000;
  let segments = [];
  let totalPaid = 0;
  let segmentCount = 0;

  // ISA
  segments.push(generateISA(payer, controlNumber));
  segmentCount++;

  // GS
  segments.push(generateGS(payer, controlNumber));
  segmentCount++;

  // ST
  segments.push('ST*835*0001*005010X221A1~');
  segmentCount++;

  // BPR - will calculate total and update later
  segments.push('BPR_PLACEHOLDER');
  segmentCount++;

  // TRN
  const trn = `1234567890${String(controlNumber).substring(0, 3)}`;
  segments.push(`TRN*1*${trn}*1234567890~`);
  segmentCount++;

  // REF
  segments.push(`REF*EV*${payer.icnPrefix}-${controlNumber}~`);
  segmentCount++;

  // DTM
  const today = new Date().toISOString().split('T')[0].replace(/-/g, '');
  segments.push(`DTM*405*${today}~`);
  segmentCount++;

  // N1 - Payer
  segments.push(`N1*PR*${payer.payerName}~`);
  segments.push(`N3*${payer.payerAddress}~`);
  segments.push(`N4*${payer.payerCity}*${payer.payerState}*${payer.payerZip}~`);
  if (payer.payerTaxId) {
    segments.push(`REF*2U*${payer.payerTaxId}~`);
  }
  segmentCount += 4;

  // N1 - Payee (Provider)
  segments.push('N1*PE*COMPASSIONATE HOSPICE CARE*XX*1234567890~');
  segments.push('N3*123 HEALING WAY~');
  segments.push('N4*HEALTHCARE CITY*CA*90210~');
  segments.push('REF*TJ*98-7654321~');
  segmentCount += 4;

  // Generate claims
  for (let i = 1; i <= numClaims; i++) {
    const claimScenario = scenario === 'mixed' ?
      (i % 3 === 0 ? 'denied' : i % 2 === 0 ? 'partial' : 'paid') :
      scenario;

    const claim = generateClaim(payer, i, claimScenario, i);
    segments.push(claim.segments);
    totalPaid += claim.paidAmount;
    segmentCount += claim.segments.split('\n').length;
  }

  // Update BPR with actual total
  const bprMethod = totalPaid > 0 ? 'ACH' : 'NON';
  const bprAccountType = totalPaid > 0 ? 'DA' : 'NON';
  const bprAccount = totalPaid > 0 ? '123456789' : '';
  segments[3] = `BPR*I*${(totalPaid / 100).toFixed(2)}*C*${bprMethod}*CTX*01*021000021*${bprAccountType}*${bprAccount}*1234567890**01*987654321*${today}~`;

  // SE - Transaction set trailer
  segments.push(`SE*${segmentCount + 2}*0001~`);
  segmentCount++;

  // GE
  segments.push(`GE*1*${controlNumber}~`);
  segmentCount++;

  // IEA
  segments.push(`IEA*1*${String(controlNumber).padStart(9, '0')}~`);

  return segments.join('\n');
}

/**
 * Main execution
 */
function main() {
  console.log('🏥 835 EDI File Generator\n');
  console.log(`Payer: ${options.payer}`);
  console.log(`Claims: ${options.claims}`);
  console.log(`Scenario: ${options.scenario}`);

  try {
    const content = generate835File(options.payer, options.claims, options.scenario);

    // Determine output file
    let outputFile = options.output;
    if (!outputFile) {
      const timestamp = new Date().toISOString().split('T')[0].replace(/-/g, '');
      outputFile = `test-data/835-samples/generated-${options.payer}-${options.scenario}-${timestamp}.835`;
    }

    // Ensure directory exists
    const dir = path.dirname(outputFile);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    // Write file
    fs.writeFileSync(outputFile, content);

    console.log(`\n✅ Generated file: ${outputFile}`);
    console.log(`📊 File size: ${content.length} bytes`);
    console.log(`📄 Segments: ${content.split('~').length}`);

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}`);
    process.exit(1);
  }
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { generate835File, PAYERS, CARE_LEVELS };
