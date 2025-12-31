import { logger } from '../utils/logger.js';

/**
 * EDI 835 Parser Service
 * Phase 3B - ERA Processing & Auto-Posting
 *
 * Purpose: Parse HIPAA 5010 835 EDI Electronic Remittance Advice transactions
 * Format: ANSI X12 005010X221A1 (835 Health Care Claim Payment/Advice)
 *
 * Features:
 *   - Parse 835 ERA transactions from payers
 *   - Extract payment details (claim-level, line-level)
 *   - Handle CARC/RARC adjustment codes
 *   - Support multiple payer formats (Medicare, Medicaid, Commercial)
 *   - Extract remittance information for reconciliation
 */
class EDI835Parser {
  constructor() {
    this.version = '005010X221A1';
    this.segmentTerminator = '~';
    this.elementSeparator = '*';
    this.subElementSeparator = ':';
  }

  /**
   * Parse 835 EDI transaction
   * @param {string} ediContent - Raw 835 EDI content
   * @returns {Promise<object>} Parsed ERA data
   */
  async parse835(ediContent) {
    try {
      // Split into segments
      const segments = this.splitSegments(ediContent);

      // Parse header information
      const header = this.parseHeader(segments);

      // Parse payer information
      const payer = this.parsePayer(segments);

      // Parse payee information
      const payee = this.parsePayee(segments);

      // Parse payment information
      const payment = this.parsePaymentInfo(segments);

      // Parse claim payments
      const claimPayments = this.parseClaimPayments(segments);

      return {
        header,
        payer,
        payee,
        payment,
        claimPayments,
        summary: {
          totalClaimCount: claimPayments.length,
          totalPaymentAmount: payment.totalPaymentAmount,
          totalAdjustmentAmount: this.calculateTotalAdjustments(claimPayments)
        },
        rawContent: ediContent
      };
    } catch (error) {
      logger.error('Error parsing 835 transaction:', error)
      throw new Error(`835 parsing failed: ${error.message}`);
    }
  }

  /**
   * Split EDI content into segments
   * @private
   */
  splitSegments(ediContent) {
    return ediContent
      .split(this.segmentTerminator)
      .filter(seg => seg.trim().length > 0)
      .map(seg => seg.trim());
  }

  /**
   * Parse segment into elements
   * @private
   */
  parseSegment(segment) {
    const elements = segment.split(this.elementSeparator);
    const segmentId = elements[0];
    return {
      id: segmentId,
      elements,
      data: elements.slice(1) // Remove segment ID
    };
  }

  /**
   * Parse header information (ISA, GS, ST, BPR, TRN)
   * @private
   */
  parseHeader(segments) {
    const header = {};

    for (const segment of segments) {
      const parsed = this.parseSegment(segment);

      if (parsed.id === 'ISA') {
        header.interchangeControlNumber = parsed.data[12]?.trim();
        header.interchangeDate = parsed.data[8];
        header.interchangeTime = parsed.data[9];
        header.senderId = parsed.data[5]?.trim();
        header.receiverId = parsed.data[7]?.trim();
      }

      if (parsed.id === 'GS') {
        header.groupControlNumber = parsed.data[5]?.trim();
        header.groupDate = parsed.data[3];
        header.groupTime = parsed.data[4];
      }

      if (parsed.id === 'ST') {
        header.transactionSetControlNumber = parsed.data[1]?.trim();
      }

      if (parsed.id === 'BPR') {
        // BPR - Financial Information
        header.transactionHandlingCode = parsed.data[0]; // I=Information, C=Payment, etc.
        header.totalPaymentAmount = this.parseMonetaryAmount(parsed.data[1]);
        header.creditDebitFlag = parsed.data[2]; // C=Credit, D=Debit
        header.paymentMethod = parsed.data[3]; // ACH, CHK, etc.
        header.paymentFormatCode = parsed.data[4];
        header.effectiveDate = this.formatDate(parsed.data[15], 'D8');
      }

      if (parsed.id === 'TRN') {
        // TRN - Trace Number (Check/EFT number)
        header.traceType = parsed.data[0];
        header.checkNumber = parsed.data[1];
        header.originatingCompanyId = parsed.data[2];
        header.referenceId = parsed.data[3];
      }
    }

    return header;
  }

  /**
   * Parse payer information (N1*PR loop)
   * @private
   */
  parsePayer(segments) {
    const payer = {};
    let inPayerLoop = false;

    for (const segment of segments) {
      const parsed = this.parseSegment(segment);

      // N1*PR - Payer Identification
      if (parsed.id === 'N1' && parsed.data[0] === 'PR') {
        inPayerLoop = true;
        payer.name = parsed.data[1];
        payer.idQualifier = parsed.data[2];
        payer.identifier = parsed.data[3]; // Payer ID
      }

      if (!inPayerLoop) continue;

      // N3 - Payer Address
      if (parsed.id === 'N3') {
        payer.addressLine1 = parsed.data[0];
        payer.addressLine2 = parsed.data[1];
      }

      // N4 - Payer City, State, ZIP
      if (parsed.id === 'N4') {
        payer.city = parsed.data[0];
        payer.state = parsed.data[1];
        payer.zipCode = parsed.data[2];
      }

      // REF - Additional Payer Identification
      if (parsed.id === 'REF') {
        const qualifier = parsed.data[0];
        const value = parsed.data[1];

        if (qualifier === '2U') payer.payerTaxId = value;
        if (qualifier === 'PQ') payer.payerClaimNumber = value;
      }

      // PER - Payer Contact Information
      if (parsed.id === 'PER') {
        payer.contactName = parsed.data[1];
        payer.contactPhone = parsed.data[3];
        payer.contactEmail = parsed.data[5];
      }

      // Break when we hit next N1 segment
      if (parsed.id === 'N1' && parsed.data[0] !== 'PR') {
        break;
      }
    }

    return payer;
  }

  /**
   * Parse payee (provider) information (N1*PE loop)
   * @private
   */
  parsePayee(segments) {
    const payee = {};
    let inPayeeLoop = false;

    for (const segment of segments) {
      const parsed = this.parseSegment(segment);

      // N1*PE - Payee Identification
      if (parsed.id === 'N1' && parsed.data[0] === 'PE') {
        inPayeeLoop = true;
        payee.name = parsed.data[1];
        payee.idQualifier = parsed.data[2]; // XX=NPI
        payee.identifier = parsed.data[3]; // NPI or Tax ID
      }

      if (!inPayeeLoop) continue;

      // N3 - Payee Address
      if (parsed.id === 'N3') {
        payee.addressLine1 = parsed.data[0];
        payee.addressLine2 = parsed.data[1];
      }

      // N4 - Payee City, State, ZIP
      if (parsed.id === 'N4') {
        payee.city = parsed.data[0];
        payee.state = parsed.data[1];
        payee.zipCode = parsed.data[2];
      }

      // REF - Additional Payee Identification
      if (parsed.id === 'REF') {
        const qualifier = parsed.data[0];
        const value = parsed.data[1];

        if (qualifier === 'TJ') payee.taxId = value;
        if (qualifier === 'PQ') payee.payeeClaimNumber = value;
      }

      // Break when we hit LX (start of claims)
      if (parsed.id === 'LX') {
        break;
      }
    }

    return payee;
  }

  /**
   * Parse payment summary information
   * @private
   */
  parsePaymentInfo(segments) {
    const payment = {};

    for (const segment of segments) {
      const parsed = this.parseSegment(segment);

      if (parsed.id === 'BPR') {
        payment.totalPaymentAmount = this.parseMonetaryAmount(parsed.data[1]);
        payment.paymentMethod = this.getPaymentMethodDescription(parsed.data[3]);
        payment.effectiveDate = this.formatDate(parsed.data[15], 'D8');
      }

      if (parsed.id === 'TRN') {
        payment.checkNumber = parsed.data[1];
      }

      if (parsed.id === 'DTM' && parsed.data[0] === '405') {
        // Production Date
        payment.productionDate = this.formatDate(parsed.data[1], 'D8');
      }
    }

    return payment;
  }

  /**
   * Parse claim payment details (CLP loop)
   * @private
   */
  parseClaimPayments(segments) {
    const claims = [];
    let currentClaim = null;
    let currentServiceLine = null;

    for (const segment of segments) {
      const parsed = this.parseSegment(segment);

      // CLP - Claim Payment Information
      if (parsed.id === 'CLP') {
        // Save previous claim
        if (currentClaim) {
          claims.push(currentClaim);
        }

        currentClaim = {
          patientAccountNumber: parsed.data[0], // CLP01
          claimStatusCode: parsed.data[1], // CLP02 (1=Processed, 2=Denied, etc.)
          totalChargeAmount: this.parseMonetaryAmount(parsed.data[2]), // CLP03
          paymentAmount: this.parseMonetaryAmount(parsed.data[3]), // CLP04
          patientResponsibilityAmount: this.parseMonetaryAmount(parsed.data[4]), // CLP05
          claimFilingIndicator: parsed.data[5], // CLP06
          payerClaimControlNumber: parsed.data[6], // CLP07
          facilityTypeCode: parsed.data[7], // CLP08
          claimFrequencyCode: parsed.data[9], // CLP10
          serviceLines: [],
          adjustments: [],
          dates: {},
          patient: {},
          rendering: {}
        };
      }

      if (!currentClaim) continue;

      // NM1 - Patient Name
      if (parsed.id === 'NM1' && parsed.data[0] === 'QC') {
        currentClaim.patient.lastName = parsed.data[2];
        currentClaim.patient.firstName = parsed.data[3];
        currentClaim.patient.middleName = parsed.data[4];
        currentClaim.patient.idQualifier = parsed.data[7];
        currentClaim.patient.memberId = parsed.data[8];
      }

      // NM1 - Rendering Provider
      if (parsed.id === 'NM1' && parsed.data[0] === '82') {
        currentClaim.rendering.lastName = parsed.data[2];
        currentClaim.rendering.firstName = parsed.data[3];
        currentClaim.rendering.npi = parsed.data[8];
      }

      // REF - Claim Reference Information
      if (parsed.id === 'REF') {
        const qualifier = parsed.data[0];
        const value = parsed.data[1];

        if (qualifier === '1K') currentClaim.internalClaimId = value; // Provider Claim Number
        if (qualifier === 'D9') currentClaim.patientControlNumber = value;
        if (qualifier === 'EA') currentClaim.medicalRecordNumber = value;
      }

      // DTM - Claim Dates
      if (parsed.id === 'DTM') {
        const dateQualifier = parsed.data[0];
        const dateValue = this.formatDate(parsed.data[1], 'D8');

        if (dateQualifier === '232') currentClaim.dates.statementFrom = dateValue;
        if (dateQualifier === '233') currentClaim.dates.statementTo = dateValue;
        if (dateQualifier === '050') currentClaim.dates.received = dateValue;
      }

      // CAS - Claim Adjustment (at claim level)
      if (parsed.id === 'CAS') {
        const adjustment = this.parseAdjustment(parsed);
        currentClaim.adjustments.push(adjustment);
      }

      // SVC - Service Line Information
      if (parsed.id === 'SVC') {
        currentServiceLine = {
          procedureCode: this.parseProcedureCode(parsed.data[0]), // SVC01 (composite)
          lineChargeAmount: this.parseMonetaryAmount(parsed.data[1]), // SVC02
          linePaymentAmount: this.parseMonetaryAmount(parsed.data[2]), // SVC03
          revenueCode: parsed.data[3], // SVC04
          unitCount: this.parseQuantity(parsed.data[4]), // SVC05
          adjustments: []
        };
        currentClaim.serviceLines.push(currentServiceLine);
      }

      // DTM - Service Line Date
      if (parsed.id === 'DTM' && currentServiceLine) {
        if (parsed.data[0] === '472') {
          currentServiceLine.serviceDate = this.formatDate(parsed.data[1], 'D8');
        }
      }

      // CAS - Service Line Adjustment
      if (parsed.id === 'CAS' && currentServiceLine) {
        const adjustment = this.parseAdjustment(parsed);
        currentServiceLine.adjustments.push(adjustment);
      }

      // AMT - Service Line Amounts
      if (parsed.id === 'AMT' && currentServiceLine) {
        const qualifier = parsed.data[0];
        const amount = this.parseMonetaryAmount(parsed.data[1]);

        if (qualifier === 'B6') currentServiceLine.allowedAmount = amount;
      }
    }

    // Save last claim
    if (currentClaim) {
      claims.push(currentClaim);
    }

    return claims;
  }

  /**
   * Parse adjustment segment (CAS)
   * @private
   */
  parseAdjustment(parsed) {
    const adjustmentGroupCode = parsed.data[0]; // CO, PR, OA, PI
    const adjustments = [];

    // CAS can have up to 6 sets of adjustment codes (CAS02-CAS19)
    for (let i = 1; i < parsed.data.length; i += 3) {
      if (!parsed.data[i]) break;

      adjustments.push({
        reasonCode: parsed.data[i], // CARC code
        amount: this.parseMonetaryAmount(parsed.data[i + 1]),
        quantity: this.parseQuantity(parsed.data[i + 2])
      });
    }

    return {
      groupCode: adjustmentGroupCode,
      groupDescription: this.getAdjustmentGroupDescription(adjustmentGroupCode),
      adjustments
    };
  }

  /**
   * Parse procedure code (composite field)
   * @private
   */
  parseProcedureCode(compositeField) {
    if (!compositeField) return null;

    const parts = compositeField.split(this.subElementSeparator);
    return {
      qualifier: parts[0], // HC=HCPCS, ER=Revenue Code
      code: parts[1],
      modifier1: parts[2],
      modifier2: parts[3],
      modifier3: parts[4],
      modifier4: parts[5]
    };
  }

  /**
   * Parse monetary amount (convert to cents)
   * @private
   */
  parseMonetaryAmount(value) {
    if (!value) return 0;
    const amount = parseFloat(value);
    return isNaN(amount) ? 0 : Math.round(amount * 100); // Convert to cents
  }

  /**
   * Parse quantity
   * @private
   */
  parseQuantity(value) {
    if (!value) return null;
    const quantity = parseFloat(value);
    return isNaN(quantity) ? null : quantity;
  }

  /**
   * Format date from EDI format
   * @private
   */
  formatDate(dateValue, format) {
    if (!dateValue) return null;

    // D8 format (YYYYMMDD)
    if (format === 'D8' && dateValue.length === 8) {
      const year = dateValue.substring(0, 4);
      const month = dateValue.substring(4, 6);
      const day = dateValue.substring(6, 8);
      return `${year}-${month}-${day}`;
    }

    // CCYYMMDD format
    if (dateValue.length === 8) {
      const year = dateValue.substring(0, 4);
      const month = dateValue.substring(4, 6);
      const day = dateValue.substring(6, 8);
      return `${year}-${month}-${day}`;
    }

    return dateValue;
  }

  /**
   * Get payment method description
   * @private
   */
  getPaymentMethodDescription(code) {
    const methods = {
      'ACH': 'Automated Clearing House (EFT)',
      'BOP': 'Financial Institution Option',
      'CHK': 'Check',
      'FWT': 'Federal Reserve Funds/Wire Transfer',
      'NON': 'Non-Payment Data'
    };
    return methods[code] || code;
  }

  /**
   * Get adjustment group description
   * @private
   */
  getAdjustmentGroupDescription(code) {
    const groups = {
      'CO': 'Contractual Obligation',
      'PR': 'Patient Responsibility',
      'OA': 'Other Adjustments',
      'PI': 'Payer Initiated Reductions'
    };
    return groups[code] || 'Unknown';
  }

  /**
   * Calculate total adjustments from all claims
   * @private
   */
  calculateTotalAdjustments(claims) {
    let total = 0;
    claims.forEach(claim => {
      claim.adjustments.forEach(adj => {
        adj.adjustments.forEach(item => {
          total += item.amount || 0;
        });
      });
      claim.serviceLines.forEach(line => {
        line.adjustments.forEach(adj => {
          adj.adjustments.forEach(item => {
            total += item.amount || 0;
          });
        });
      });
    });
    return total;
  }

  /**
   * Get claim status description
   */
  getClaimStatusDescription(code) {
    const statuses = {
      '1': 'Processed as Primary',
      '2': 'Processed as Secondary',
      '3': 'Processed as Tertiary',
      '4': 'Denied',
      '19': 'Processed as Primary, Forwarded to Additional Payer(s)',
      '20': 'Processed as Secondary, Forwarded to Additional Payer(s)',
      '21': 'Processed as Tertiary, Forwarded to Additional Payer(s)',
      '22': 'Reversal of Previous Payment',
      '23': 'Not Our Claim, Forwarded to Additional Payer(s)',
      '25': 'Predetermination Pricing Only - No Payment'
    };
    return statuses[code] || `Unknown Status: ${code}`;
  }

  /**
   * Extract CARC codes from claim
   */
  extractCARCCodes(claim) {
    const carcCodes = [];

    // Claim-level adjustments
    claim.adjustments.forEach(adj => {
      adj.adjustments.forEach(item => {
        carcCodes.push({
          level: 'CLAIM',
          groupCode: adj.groupCode,
          reasonCode: item.reasonCode,
          amount: item.amount,
          quantity: item.quantity
        });
      });
    });

    // Service line adjustments
    claim.serviceLines.forEach((line, index) => {
      line.adjustments.forEach(adj => {
        adj.adjustments.forEach(item => {
          carcCodes.push({
            level: 'SERVICE_LINE',
            lineNumber: index + 1,
            procedureCode: line.procedureCode?.code,
            groupCode: adj.groupCode,
            reasonCode: item.reasonCode,
            amount: item.amount,
            quantity: item.quantity
          });
        });
      });
    });

    return carcCodes;
  }

  /**
   * Determine if claim is fully paid, partially paid, or denied
   */
  getPaymentStatus(claim) {
    const statusCode = claim.claimStatusCode;

    if (statusCode === '4' || statusCode === '23') {
      return 'DENIED';
    }

    if (claim.paymentAmount === 0) {
      return 'DENIED';
    }

    if (claim.paymentAmount < claim.totalChargeAmount) {
      return 'PARTIAL';
    }

    return 'PAID';
  }
}

// Export singleton instance
export default new EDI835Parser();
