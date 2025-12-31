import { logger } from '../utils/logger.js';

/**
 * EDI 271 Parser Service
 * Phase 3A - Eligibility Verification
 *
 * Purpose: Parse HIPAA 5010 271 EDI eligibility response transactions
 * Format: ANSI X12 005010X279A1 (271 Health Care Eligibility Benefit Response)
 *
 * Features:
 *   - Parse 271 response transactions
 *   - Extract eligibility status and benefit details
 *   - Handle multiple benefit segments
 *   - Support various payer formats
 */
class EDI271Parser {
  constructor() {
    this.version = '005010X279A1';
    this.segmentTerminator = '~';
    this.elementSeparator = '*';
    this.subElementSeparator = ':';
  }

  /**
   * Parse 271 EDI transaction
   * @param {string} ediContent - Raw 271 EDI content
   * @returns {Promise<object>} Parsed eligibility data
   */
  async parse271(ediContent) {
    try {
      // Split into segments
      const segments = this.splitSegments(ediContent);

      // Parse header information
      const header = this.parseHeader(segments);

      // Parse subscriber information
      const subscriber = this.parseSubscriber(segments);

      // Parse eligibility status
      const eligibility = this.parseEligibility(segments);

      // Parse benefit details
      const benefits = this.parseBenefits(segments);

      // Parse additional information
      const additional = this.parseAdditionalInfo(segments);

      return {
        header,
        subscriber,
        eligibility,
        benefits,
        additional,
        rawContent: ediContent
      };
    } catch (error) {
      logger.error('Error parsing 271 transaction:', error)
      throw new Error(`271 parsing failed: ${error.message}`);
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
   * Parse header information (ISA, GS, ST, BHT)
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
      }

      if (parsed.id === 'GS') {
        header.groupControlNumber = parsed.data[5]?.trim();
        header.groupDate = parsed.data[3];
        header.groupTime = parsed.data[4];
      }

      if (parsed.id === 'ST') {
        header.transactionSetControlNumber = parsed.data[1]?.trim();
      }

      if (parsed.id === 'BHT') {
        header.hierarchicalStructureCode = parsed.data[0];
        header.transactionSetPurpose = parsed.data[1];
        header.referenceId = parsed.data[2];
        header.transactionDate = parsed.data[3];
        header.transactionTime = parsed.data[4];
      }
    }

    return header;
  }

  /**
   * Parse subscriber information
   * @private
   */
  parseSubscriber(segments) {
    const subscriber = {};

    let inSubscriberLoop = false;

    for (const segment of segments) {
      const parsed = this.parseSegment(segment);

      // Detect subscriber loop (HL*3)
      if (parsed.id === 'HL' && parsed.data[2] === '22') {
        inSubscriberLoop = true;
      }

      if (!inSubscriberLoop) continue;

      // NM1*IL - Subscriber Name
      if (parsed.id === 'NM1' && parsed.data[0] === 'IL') {
        subscriber.lastName = parsed.data[2];
        subscriber.firstName = parsed.data[3];
        subscriber.middleName = parsed.data[4];
        subscriber.idQualifier = parsed.data[7];
        subscriber.memberId = parsed.data[8];
      }

      // REF - Subscriber Additional Identification
      if (parsed.id === 'REF') {
        const qualifier = parsed.data[0];
        const value = parsed.data[1];

        if (qualifier === '0F') subscriber.subscriberId = value; // Subscriber Number
        if (qualifier === '1L') subscriber.groupNumber = value; // Group Number
        if (qualifier === '18') subscriber.planNumber = value; // Plan Number
      }

      // DMG - Subscriber Demographic Information
      if (parsed.id === 'DMG') {
        subscriber.dateOfBirth = parsed.data[1];
        subscriber.gender = parsed.data[2];
      }

      // N3 - Subscriber Address
      if (parsed.id === 'N3') {
        subscriber.addressLine1 = parsed.data[0];
        subscriber.addressLine2 = parsed.data[1];
      }

      // N4 - Subscriber City, State, ZIP
      if (parsed.id === 'N4') {
        subscriber.city = parsed.data[0];
        subscriber.state = parsed.data[1];
        subscriber.zipCode = parsed.data[2];
      }

      // Break when we hit next HL
      if (parsed.id === 'HL' && parsed.data[2] !== '22') {
        break;
      }
    }

    return subscriber;
  }

  /**
   * Parse eligibility status
   * @private
   */
  parseEligibility(segments) {
    const eligibility = {
      isEligible: false,
      status: 'UNKNOWN',
      coverageDates: {}
    };

    for (const segment of segments) {
      const parsed = this.parseSegment(segment);

      // EB - Eligibility or Benefit Information
      if (parsed.id === 'EB') {
        const eligibilityCode = parsed.data[0]; // EB01
        const coverageLevel = parsed.data[1]; // EB02
        const serviceTypeCode = parsed.data[2]; // EB03

        // Parse eligibility status
        if (eligibilityCode === '1') {
          eligibility.isEligible = true;
          eligibility.status = 'ACTIVE';
        } else if (eligibilityCode === '6') {
          eligibility.isEligible = false;
          eligibility.status = 'INACTIVE';
        } else if (eligibilityCode === '7') {
          eligibility.isEligible = false;
          eligibility.status = 'UNKNOWN';
        }

        // Store first EB segment details
        if (!eligibility.serviceTypeCode) {
          eligibility.serviceTypeCode = serviceTypeCode;
          eligibility.coverageLevel = coverageLevel;
        }
      }

      // DTP - Date - Coverage Period
      if (parsed.id === 'DTP') {
        const dateQualifier = parsed.data[0];
        const dateFormat = parsed.data[1];
        const dateValue = parsed.data[2];

        // DTP*346 - Plan Begin Date
        if (dateQualifier === '346') {
          eligibility.coverageDates.effectiveDate = this.formatDate(dateValue, dateFormat);
        }

        // DTP*347 - Plan End Date
        if (dateQualifier === '347') {
          eligibility.coverageDates.terminationDate = this.formatDate(dateValue, dateFormat);
        }

        // DTP*291 - Plan Date
        if (dateQualifier === '291') {
          eligibility.coverageDates.planDate = this.formatDate(dateValue, dateFormat);
        }
      }

      // NM1*PR - Payer Name
      if (parsed.id === 'NM1' && parsed.data[0] === 'PR') {
        eligibility.payerName = parsed.data[2];
        eligibility.payerId = parsed.data[8];
      }
    }

    return eligibility;
  }

  /**
   * Parse benefit details (EB segments)
   * @private
   */
  parseBenefits(segments) {
    const benefits = [];

    for (const segment of segments) {
      const parsed = this.parseSegment(segment);

      // EB - Eligibility or Benefit Information
      if (parsed.id === 'EB') {
        const benefit = {
          eligibilityCode: parsed.data[0], // EB01
          coverageLevel: parsed.data[1], // EB02
          serviceTypeCode: parsed.data[2], // EB03
          insuranceTypeCode: parsed.data[3], // EB04
          planCoverageDescription: parsed.data[4], // EB05
          timePeriodQualifier: parsed.data[5], // EB06
          monetaryAmount: this.parseMonetaryAmount(parsed.data[6]), // EB07
          percentageAmount: this.parsePercentage(parsed.data[7]), // EB08
          quantityQualifier: parsed.data[8], // EB09
          quantity: this.parseQuantity(parsed.data[9]), // EB10
          authorizationRequired: parsed.data[10] === 'Y', // EB11
          inPlanNetwork: parsed.data[11] === 'Y', // EB12
          compositeMedicalProcedure: parsed.data[12], // EB13
          compositeDiagnosis: parsed.data[13] // EB14
        };

        // Add benefit description
        benefit.description = this.getBenefitDescription(benefit);

        benefits.push(benefit);
      }
    }

    return benefits;
  }

  /**
   * Parse additional information (MSG, III, HSD segments)
   * @private
   */
  parseAdditionalInfo(segments) {
    const additional = {
      messages: [],
      limitations: [],
      restrictions: []
    };

    for (const segment of segments) {
      const parsed = this.parseSegment(segment);

      // MSG - Message Text
      if (parsed.id === 'MSG') {
        additional.messages.push(parsed.data[0]);
      }

      // III - Information (Additional Information)
      if (parsed.id === 'III') {
        additional.limitations.push({
          codeListQualifier: parsed.data[0],
          industryCode: parsed.data[1],
          freeFormMessage: parsed.data[2]
        });
      }

      // HSD - Health Care Services Delivery
      if (parsed.id === 'HSD') {
        additional.restrictions.push({
          quantityQualifier: parsed.data[0],
          quantity: parsed.data[1],
          unitOfMeasurement: parsed.data[2],
          sampleSelectionModulus: parsed.data[3],
          timePeriodQualifier: parsed.data[4],
          numberOfPeriods: parsed.data[5]
        });
      }
    }

    return additional;
  }

  /**
   * Parse monetary amount (convert to cents)
   * @private
   */
  parseMonetaryAmount(value) {
    if (!value) return null;
    const amount = parseFloat(value);
    return isNaN(amount) ? null : Math.round(amount * 100); // Convert to cents
  }

  /**
   * Parse percentage
   * @private
   */
  parsePercentage(value) {
    if (!value) return null;
    const percentage = parseFloat(value);
    return isNaN(percentage) ? null : Math.round(percentage);
  }

  /**
   * Parse quantity
   * @private
   */
  parseQuantity(value) {
    if (!value) return null;
    const quantity = parseFloat(value);
    return isNaN(quantity) ? null : Math.round(quantity);
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

    // RD8 format (date range YYYYMMDD-YYYYMMDD)
    if (format === 'RD8') {
      const dates = dateValue.split('-');
      return {
        start: this.formatDate(dates[0], 'D8'),
        end: this.formatDate(dates[1], 'D8')
      };
    }

    return dateValue;
  }

  /**
   * Get benefit description based on service type code
   * @private
   */
  getBenefitDescription(benefit) {
    const serviceTypes = {
      '1': 'Medical Care',
      '30': 'Health Benefit Plan Coverage',
      '42': 'Hospice',
      '45': 'Skilled Nursing Care',
      '50': 'Home Health Care',
      'AL': 'Vision (Optometry)',
      'MH': 'Mental Health',
      'UC': 'Urgent Care'
    };

    const coverageLevels = {
      'CHD': 'Children Only',
      'DEP': 'Dependents Only',
      'ECH': 'Employee and Children',
      'EMP': 'Employee Only',
      'ESP': 'Employee and Spouse',
      'FAM': 'Family',
      'IND': 'Individual',
      'SPC': 'Spouse and Children',
      'SPO': 'Spouse Only'
    };

    const eligibilityCodes = {
      '1': 'Active Coverage',
      '2': 'Active - Full Risk Capitation',
      '3': 'Active - Services Capitated',
      '4': 'Active - Services Capitated to Primary Care Physician',
      '5': 'Active - Pending Investigation',
      '6': 'Inactive',
      '7': 'Inactive - Pending Eligibility Update',
      '8': 'Inactive - Pending Investigation',
      'C': 'Active - Excluded from this Provider Contract',
      'P': 'Primary Care Provider',
      'S': 'Secondary Payer',
      'T': 'Tertiary Payer',
      'V': 'Inactive - Pending Eligibility Verification'
    };

    const parts = [];

    // Eligibility status
    if (benefit.eligibilityCode) {
      parts.push(eligibilityCodes[benefit.eligibilityCode] || 'Unknown Status');
    }

    // Service type
    if (benefit.serviceTypeCode) {
      parts.push(serviceTypes[benefit.serviceTypeCode] || `Service Type ${benefit.serviceTypeCode}`);
    }

    // Coverage level
    if (benefit.coverageLevel) {
      parts.push(coverageLevels[benefit.coverageLevel] || benefit.coverageLevel);
    }

    // Monetary amounts
    if (benefit.monetaryAmount) {
      parts.push(`$${(benefit.monetaryAmount / 100).toFixed(2)}`);
    }

    // Percentage
    if (benefit.percentageAmount) {
      parts.push(`${benefit.percentageAmount}%`);
    }

    // Quantity
    if (benefit.quantity) {
      parts.push(`${benefit.quantity} units`);
    }

    return parts.join(' - ');
  }

  /**
   * Extract copay amount from benefits
   */
  extractCopay(benefits) {
    const copayBenefit = benefits.find(b =>
      b.serviceTypeCode === '42' && // Hospice
      b.monetaryAmount && b.monetaryAmount > 0
    );
    return copayBenefit?.monetaryAmount || 0;
  }

  /**
   * Extract deductible information
   */
  extractDeductible(benefits) {
    const deductibleBenefit = benefits.find(b =>
      b.insuranceTypeCode === 'C' || // Deductible
      b.planCoverageDescription?.toLowerCase().includes('deductible')
    );

    return {
      amount: deductibleBenefit?.monetaryAmount || 0,
      met: 0, // Would need additional EB segments to determine
      remaining: deductibleBenefit?.monetaryAmount || 0
    };
  }

  /**
   * Extract out-of-pocket maximum
   */
  extractOutOfPocketMax(benefits) {
    const oopBenefit = benefits.find(b =>
      b.insuranceTypeCode === 'G' || // Out of Pocket
      b.planCoverageDescription?.toLowerCase().includes('out of pocket')
    );

    return {
      max: oopBenefit?.monetaryAmount || 0,
      met: 0,
      remaining: oopBenefit?.monetaryAmount || 0
    };
  }

  /**
   * Check if authorization is required
   */
  isAuthorizationRequired(benefits) {
    return benefits.some(b => b.authorizationRequired === true);
  }

  /**
   * Extract service limitations
   */
  extractLimitations(benefits, additional) {
    const limitations = [];

    // From benefit segments
    benefits.forEach(b => {
      if (b.quantity) {
        limitations.push(`Limited to ${b.quantity} ${b.quantityQualifier || 'units'}`);
      }
    });

    // From additional info
    additional.limitations.forEach(l => {
      if (l.freeFormMessage) {
        limitations.push(l.freeFormMessage);
      }
    });

    additional.messages.forEach(m => {
      limitations.push(m);
    });

    return limitations.join('; ');
  }
}

// Export singleton instance
export default new EDI271Parser();
