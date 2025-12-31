import { nanoid } from 'nanoid';

import { logger } from '../utils/logger.js';
/**
 * EDI 270 Generator Service
 * Phase 3A - Eligibility Verification
 *
 * Purpose: Generate HIPAA 5010 270 EDI eligibility inquiry transactions
 * Format: ANSI X12 005010X279A1 (270 Health Care Eligibility Benefit Inquiry)
 *
 * Features:
 *   - Generate 270 transactions for real-time and batch inquiries
 *   - Support multiple service types (hospice, medical, etc.)
 *   - Control number management
 *   - Clearinghouse format compatibility
 */
class EDI270Generator {
  constructor() {
    this.version = '005010X279A1';
    this.segmentTerminator = '~';
    this.elementSeparator = '*';
    this.subElementSeparator = ':';

    // Control number tracking
    this.isaControlNumber = 1;
    this.gsControlNumber = 1;
    this.stControlNumber = 1;

    // Submitter/receiver configuration (would come from config in production)
    this.submitterId = 'SUBMITTER123';
    this.submitterName = 'HOSPICE CARE CENTER';
    this.submitterNPI = '1234567890';
    this.receiverId = 'CLEARINGHOUSE';
  }

  /**
   * Generate 270 EDI transaction for eligibility inquiry
   * @param {object} request - Eligibility request data
   * @returns {Promise<object>} Generated 270 content and metadata
   */
  async generate270(request) {
    try {
      const {
        patient,
        payer,
        provider,
        serviceType = 'HOSPICE',
        requestType = 'REAL_TIME'
      } = request;

      // Generate control numbers
      const controlNumbers = this.generateControlNumbers();

      // Build 270 segments
      const segments = this.build270Segments(
        patient,
        payer,
        provider,
        serviceType,
        controlNumbers
      );

      // Assemble EDI content
      const ediContent = segments.join(this.segmentTerminator) + this.segmentTerminator;

      return {
        ediContent,
        controlNumbers,
        requestId: nanoid(),
        generatedAt: new Date()
      };
    } catch (error) {
      logger.error('Error generating 270 transaction:', error)
      throw new Error(`270 generation failed: ${error.message}`);
    }
  }

  /**
   * Build complete 270 segments
   * @private
   */
  build270Segments(patient, payer, provider, serviceType, controlNumbers) {
    const segments = [];

    // ISA - Interchange Control Header
    segments.push(this.buildISASegment(controlNumbers.isa));

    // GS - Functional Group Header
    segments.push(this.buildGSSegment(controlNumbers.gs));

    // ST - Transaction Set Header
    segments.push(this.buildSTSegment(controlNumbers.st));

    // BHT - Beginning of Hierarchical Transaction
    segments.push(this.buildBHTSegment());

    // 2000A - Information Source Level (Payer)
    segments.push(...this.buildInformationSourceLevel(payer));

    // 2000B - Information Receiver Level (Provider)
    segments.push(...this.buildInformationReceiverLevel(provider));

    // 2000C - Subscriber Level
    segments.push(...this.buildSubscriberLevel(patient, serviceType));

    // 2000D - Dependent Level (if patient is not subscriber)
    if (patient.relationshipToSubscriber && patient.relationshipToSubscriber !== 'SELF') {
      segments.push(...this.buildDependentLevel(patient));
    }

    // SE - Transaction Set Trailer
    segments.push(this.buildSESegment(segments.length + 1, controlNumbers.st));

    // GE - Functional Group Trailer
    segments.push(this.buildGESegment(1, controlNumbers.gs));

    // IEA - Interchange Control Trailer
    segments.push(this.buildIEASegment(controlNumbers.isa));

    return segments;
  }

  /**
   * Build ISA segment - Interchange Control Header
   */
  buildISASegment(controlNumber) {
    const now = new Date();
    const date = this.formatDate(now);
    const time = this.formatTime(now);

    return [
      'ISA',
      '00', // Authorization Information Qualifier
      '          ', // Authorization Information (10 spaces)
      '00', // Security Information Qualifier
      '          ', // Security Information (10 spaces)
      'ZZ', // Interchange ID Qualifier (Submitter)
      this.padRight(this.submitterId, 15),
      'ZZ', // Interchange ID Qualifier (Receiver)
      this.padRight(this.receiverId, 15),
      date, // Interchange Date (YYMMDD)
      time, // Interchange Time (HHMM)
      '^', // Repetition Separator
      '00501', // Interchange Control Version Number
      this.padNumber(controlNumber, 9), // Interchange Control Number
      '0', // Acknowledgment Requested
      'P', // Usage Indicator (P=Production, T=Test)
      this.subElementSeparator // Component Element Separator
    ].join(this.elementSeparator);
  }

  /**
   * Build GS segment - Functional Group Header
   */
  buildGSSegment(controlNumber) {
    const now = new Date();
    const date = this.formatDateLong(now);
    const time = this.formatTime(now);

    return [
      'GS',
      'HS', // Functional Identifier Code (HS = Health Care Eligibility)
      this.submitterId, // Application Sender's Code
      this.receiverId, // Application Receiver's Code
      date, // Date (YYYYMMDD)
      time, // Time (HHMM)
      this.padNumber(controlNumber, 9), // Group Control Number
      'X', // Responsible Agency Code
      '005010X279A1' // Version/Release/Industry Identifier Code
    ].join(this.elementSeparator);
  }

  /**
   * Build ST segment - Transaction Set Header
   */
  buildSTSegment(controlNumber) {
    return [
      'ST',
      '270', // Transaction Set Identifier Code
      this.padNumber(controlNumber, 9), // Transaction Set Control Number
      '005010X279A1' // Implementation Convention Reference
    ].join(this.elementSeparator);
  }

  /**
   * Build BHT segment - Beginning of Hierarchical Transaction
   */
  buildBHTSegment() {
    const now = new Date();
    const date = this.formatDateLong(now);
    const time = this.formatTime(now);

    return [
      'BHT',
      '0022', // Hierarchical Structure Code (0022 = Information Source, Information Receiver, Subscriber, Dependent)
      '01', // Transaction Set Purpose Code (01 = Cancellation)
      nanoid(10), // Reference Identification
      date, // Date
      time // Time
    ].join(this.elementSeparator);
  }

  /**
   * Build Information Source Level (2000A) - Payer
   */
  buildInformationSourceLevel(payer) {
    const segments = [];

    // HL - Hierarchical Level (Information Source)
    segments.push([
      'HL',
      '1', // Hierarchical ID Number
      '', // Hierarchical Parent ID Number (blank for top level)
      '20', // Hierarchical Level Code (20 = Information Source)
      '1' // Hierarchical Child Code (1 = Additional Subordinate HL Present)
    ].join(this.elementSeparator));

    // NM1 - Information Source Name (Payer)
    segments.push([
      'NM1',
      'PR', // Entity Identifier Code (PR = Payer)
      '2', // Entity Type Qualifier (2 = Non-Person Entity)
      payer?.payer_name || 'MEDICARE',
      '', '', '', '', // Not used for non-person
      'PI', // Identification Code Qualifier (PI = Payor Identification)
      payer?.payer_id || '00000' // Identification Code
    ].join(this.elementSeparator));

    return segments;
  }

  /**
   * Build Information Receiver Level (2000B) - Provider
   */
  buildInformationReceiverLevel(provider) {
    const segments = [];

    // HL - Hierarchical Level (Information Receiver)
    segments.push([
      'HL',
      '2', // Hierarchical ID Number
      '1', // Hierarchical Parent ID Number
      '21', // Hierarchical Level Code (21 = Information Receiver)
      '1' // Hierarchical Child Code (1 = Additional Subordinate HL Present)
    ].join(this.elementSeparator));

    // NM1 - Information Receiver Name (Provider)
    segments.push([
      'NM1',
      '1P', // Entity Identifier Code (1P = Provider)
      '2', // Entity Type Qualifier (2 = Non-Person Entity)
      provider?.name || this.submitterName,
      '', '', '', '', // Not used
      'XX', // Identification Code Qualifier (XX = NPI)
      provider?.npi || this.submitterNPI // NPI
    ].join(this.elementSeparator));

    return segments;
  }

  /**
   * Build Subscriber Level (2000C)
   */
  buildSubscriberLevel(patient, serviceType) {
    const segments = [];

    // HL - Hierarchical Level (Subscriber)
    segments.push([
      'HL',
      '3', // Hierarchical ID Number
      '2', // Hierarchical Parent ID Number
      '22', // Hierarchical Level Code (22 = Subscriber)
      '0' // Hierarchical Child Code (0 = No Subordinate HL)
    ].join(this.elementSeparator));

    // TRN - Trace Number
    segments.push([
      'TRN',
      '1', // Trace Type Code (1 = Current Transaction Trace Numbers)
      nanoid(20), // Reference Identification
      this.submitterId // Originating Company Identifier
    ].join(this.elementSeparator));

    // NM1 - Subscriber Name
    segments.push([
      'NM1',
      'IL', // Entity Identifier Code (IL = Insured or Subscriber)
      '1', // Entity Type Qualifier (1 = Person)
      patient.last_name || patient.lastName || 'DOE',
      patient.first_name || patient.firstName || 'JOHN',
      patient.middle_name || patient.middleName || '',
      '', '', // Not used
      'MI', // Identification Code Qualifier (MI = Member Identification Number)
      patient.medicare_number || patient.medicareNumber || 'UNKNOWN' // Member ID
    ].join(this.elementSeparator));

    // DMG - Subscriber Demographic Information
    if (patient.date_of_birth || patient.dateOfBirth) {
      const dob = this.formatDateLong(new Date(patient.date_of_birth || patient.dateOfBirth));
      segments.push([
        'DMG',
        'D8', // Date Time Period Format Qualifier
        dob, // Date of Birth
        patient.gender || 'U' // Gender Code (M/F/U)
      ].join(this.elementSeparator));
    }

    // DTP - Date - Service Date (optional - for specific service inquiry)
    segments.push([
      'DTP',
      '472', // Date/Time Qualifier (472 = Service)
      'D8', // Date Time Period Format Qualifier
      this.formatDateLong(new Date())
    ].join(this.elementSeparator));

    // EQ - Eligibility or Benefit Inquiry
    segments.push([
      'EQ',
      this.getServiceTypeCode(serviceType) // Service Type Code (42 = Hospice)
    ].join(this.elementSeparator));

    return segments;
  }

  /**
   * Build Dependent Level (2000D) - if patient is not subscriber
   */
  buildDependentLevel(patient) {
    const segments = [];

    // HL - Hierarchical Level (Dependent)
    segments.push([
      'HL',
      '4', // Hierarchical ID Number
      '3', // Hierarchical Parent ID Number (subscriber)
      '23', // Hierarchical Level Code (23 = Dependent)
      '0' // Hierarchical Child Code (0 = No Subordinate HL)
    ].join(this.elementSeparator));

    // TRN - Trace Number
    segments.push([
      'TRN',
      '1', // Trace Type Code
      nanoid(20), // Reference Identification
      this.submitterId
    ].join(this.elementSeparator));

    // NM1 - Dependent Name
    segments.push([
      'NM1',
      '03', // Entity Identifier Code (03 = Dependent)
      '1', // Entity Type Qualifier (1 = Person)
      patient.last_name || 'DOE',
      patient.first_name || 'JOHN',
      patient.middle_name || '',
      '', '', '', '' // Not used
    ].join(this.elementSeparator));

    return segments;
  }

  /**
   * Build SE segment - Transaction Set Trailer
   */
  buildSESegment(segmentCount, controlNumber) {
    return [
      'SE',
      segmentCount.toString(), // Number of Included Segments
      this.padNumber(controlNumber, 9) // Transaction Set Control Number
    ].join(this.elementSeparator);
  }

  /**
   * Build GE segment - Functional Group Trailer
   */
  buildGESegment(transactionCount, controlNumber) {
    return [
      'GE',
      transactionCount.toString(), // Number of Transaction Sets
      this.padNumber(controlNumber, 9) // Group Control Number
    ].join(this.elementSeparator);
  }

  /**
   * Build IEA segment - Interchange Control Trailer
   */
  buildIEASegment(controlNumber) {
    return [
      'IEA',
      '1', // Number of Functional Groups
      this.padNumber(controlNumber, 9) // Interchange Control Number
    ].join(this.elementSeparator);
  }

  /**
   * Generate control numbers
   */
  generateControlNumbers() {
    return {
      isa: this.isaControlNumber++,
      gs: this.gsControlNumber++,
      st: this.stControlNumber++
    };
  }

  /**
   * Get service type code for EQ segment
   */
  getServiceTypeCode(serviceType) {
    const codes = {
      'HOSPICE': '42',
      'MEDICAL': '30',
      'HEALTH_BENEFIT_PLAN': '30',
      'SKILLED_NURSING': '45',
      'HOME_HEALTH': '50'
    };
    return codes[serviceType] || '30';
  }

  /**
   * Format date as YYMMDD
   */
  formatDate(date) {
    const year = date.getFullYear().toString().substring(2);
    const month = this.padNumber(date.getMonth() + 1, 2);
    const day = this.padNumber(date.getDate(), 2);
    return `${year}${month}${day}`;
  }

  /**
   * Format date as YYYYMMDD
   */
  formatDateLong(date) {
    const year = date.getFullYear();
    const month = this.padNumber(date.getMonth() + 1, 2);
    const day = this.padNumber(date.getDate(), 2);
    return `${year}${month}${day}`;
  }

  /**
   * Format time as HHMM
   */
  formatTime(date) {
    const hours = this.padNumber(date.getHours(), 2);
    const minutes = this.padNumber(date.getMinutes(), 2);
    return `${hours}${minutes}`;
  }

  /**
   * Pad number with leading zeros
   */
  padNumber(num, length) {
    return num.toString().padStart(length, '0');
  }

  /**
   * Pad string with trailing spaces
   */
  padRight(str, length) {
    return str.padEnd(length, ' ');
  }
}

// Export singleton instance
export default new EDI270Generator();
