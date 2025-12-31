import { db } from '../db/index.js';
import { claims, claim_service_lines } from '../db/schemas/billing.schema.js';
import { clearinghouse_submissions } from '../db/schemas/clearinghouse.schema.js';
import { patients } from '../db/schemas/patient.schema.js';
import { eq, sql } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';

import { logger } from '../utils/logger.js';
/**
 * EDI Generator Service
 * Phase 2C - 837I EDI Generation
 *
 * Purpose: Generate HIPAA-compliant 837I EDI files for institutional claims
 * Format: ANSI X12 005010X223A2 (837 Institutional)
 *
 * Features:
 *   - Complete 837I file generation for hospice claims
 *   - Control number management (ISA13, GS06, ST02)
 *   - Single and batch file generation
 *   - File storage and retrieval
 *   - Submission tracking
 */
class EDIGenerator {
  constructor() {
    this.version = '005010X223A2';
    this.segmentTerminator = '~';
    this.elementSeparator = '*';
    this.subElementSeparator = ':';

    // Control number tracking (in production, use database sequence)
    this.isaControlNumber = 1;
    this.gsControlNumber = 1;
    this.stControlNumber = 1;

    // Storage paths
    this.storageBasePath = './storage/edi';
    this.outboundPath = path.join(this.storageBasePath, 'outbound');
    this.inboundPath = path.join(this.storageBasePath, 'inbound');
  }

  /**
   * Generate 837I file for single claim
   * @param {number} claimId - Claim ID
   * @param {object} options - Generation options
   * @returns {Promise<object>} Generated file details
   */
  async generate837I(claimId, options = {}) {
    try {
      // 1. Load claim with all details
      const claim = await this.loadClaimForEDI(claimId);

      // 2. Validate claim is ready for submission
      this.validateClaimReadiness(claim);

      // 3. Generate control numbers
      const controlNumbers = this.generateControlNumbers();

      // 4. Build 837I segments
      const segments = this.build837ISegments(claim, controlNumbers);

      // 5. Assemble EDI file content
      const ediContent = segments.join(this.segmentTerminator) + this.segmentTerminator;

      // 6. Generate file name and path
      const fileName = this.generateFileName('837I', controlNumbers.isa);
      const filePath = path.join(this.outboundPath, fileName);

      // 7. Ensure storage directory exists
      await this.ensureStorageDirectories();

      // 8. Write file to disk
      await fs.writeFile(filePath, ediContent, 'utf8');

      // 9. Update claim with EDI control numbers
      await db.update(claims)
        .set({
          edi_interchange_control_number: controlNumbers.isa,
          edi_transaction_set_control_number: controlNumbers.st
        })
        .where(eq(claims.id, claimId));

      // 10. Create clearinghouse submission record
      const submission = await db.insert(clearinghouse_submissions).values({
        claim_id: claimId,
        submission_date: new Date(),
        submission_method: 'EDI_FILE',
        edi_file_name: fileName,
        edi_file_path: filePath,
        edi_control_number: controlNumbers.isa,
        edi_content: ediContent,
        clearinghouse_name: options.clearinghouse_name || 'Default Clearinghouse',
        current_status: 'GENERATED',
        acknowledgment_status: 'PENDING'
      }).returning();

      const fileStats = await fs.stat(filePath);

      return {
        submission_id: submission[0].id,
        claim_id: claimId,
        edi_file_name: fileName,
        edi_file_path: filePath,
        edi_control_number: controlNumbers.isa,
        file_size_bytes: fileStats.size,
        segment_count: segments.length,
        generated_at: new Date()
      };
    } catch (error) {
      logger.error(`Error generating 837I for claim ${claimId}:`, error)
      throw new Error(`837I generation failed: ${error.message}`);
    }
  }

  /**
   * Generate batch 837I file for multiple claims
   * @param {Array<number>} claimIds - Array of claim IDs
   * @param {string} batchName - Batch identifier
   * @returns {Promise<object>} Batch file details
   */
  async generateBatch837I(claimIds, batchName = null) {
    try {
      const batchId = batchName || `BATCH_${this.formatDate(new Date())}_${this.padNumber(this.gsControlNumber, 3)}`;
      const controlNumbers = this.generateControlNumbers();
      const allSegments = [];
      const submissionIds = [];

      // 1. ISA - Interchange Control Header (once per file)
      allSegments.push(this.buildISASegment(controlNumbers.isa));

      // 2. GS - Functional Group Header (once per file)
      allSegments.push(this.buildGSSegment(controlNumbers.gs, claimIds.length));

      // 3. Process each claim
      let transactionCount = 0;
      for (const claimId of claimIds) {
        try {
          const claim = await this.loadClaimForEDI(claimId);
          this.validateClaimReadiness(claim);

          const stNumber = this.padNumber(this.stControlNumber++, 9);

          // Build claim transaction set
          const claimSegments = this.buildClaimTransactionSet(claim, stNumber);
          allSegments.push(...claimSegments);

          transactionCount++;

          // Update claim with control numbers
          await db.update(claims)
            .set({
              edi_interchange_control_number: controlNumbers.isa,
              edi_transaction_set_control_number: stNumber
            })
            .where(eq(claims.id, claimId));

          // Create submission record
          const submission = await db.insert(clearinghouse_submissions).values({
            claim_id: claimId,
            submission_batch_id: batchId,
            submission_date: new Date(),
            submission_method: 'EDI_FILE',
            edi_control_number: controlNumbers.isa,
            current_status: 'GENERATED',
            acknowledgment_status: 'PENDING'
          }).returning();

          submissionIds.push(submission[0].id);
        } catch (error) {
          logger.error(`Error processing claim ${claimId} in batch:`, error)
          // Continue with other claims
        }
      }

      // 4. GE - Functional Group Trailer
      allSegments.push(this.buildGESegment(transactionCount, controlNumbers.gs));

      // 5. IEA - Interchange Control Trailer
      allSegments.push(this.buildIEASegment(controlNumbers.isa));

      // 6. Assemble file content
      const ediContent = allSegments.join(this.segmentTerminator) + this.segmentTerminator;

      // 7. Generate file name and write
      const fileName = this.generateFileName(`837I_${batchId}`, controlNumbers.isa);
      const filePath = path.join(this.outboundPath, fileName);

      await this.ensureStorageDirectories();
      await fs.writeFile(filePath, ediContent, 'utf8');

      // 8. Update all submissions with file info
      for (const submissionId of submissionIds) {
        await db.update(clearinghouse_submissions)
          .set({
            edi_file_name: fileName,
            edi_file_path: filePath,
            edi_content: ediContent
          })
          .where(eq(clearinghouse_submissions.id, submissionId));
      }

      const fileStats = await fs.stat(filePath);

      return {
        batch_id: batchId,
        submission_ids: submissionIds,
        edi_file_name: fileName,
        edi_file_path: filePath,
        claims_count: transactionCount,
        file_size_bytes: fileStats.size,
        generated_at: new Date()
      };
    } catch (error) {
      logger.error('Error generating batch 837I:', error)
      throw new Error(`Batch 837I generation failed: ${error.message}`);
    }
  }

  /**
   * Build complete 837I segments for single claim
   * @param {object} claim - Claim object
   * @param {object} controlNumbers - Control numbers
   * @returns {Array} EDI segments
   */
  build837ISegments(claim, controlNumbers) {
    const segments = [];

    // Interchange Control Header
    segments.push(this.buildISASegment(controlNumbers.isa));

    // Functional Group Header
    segments.push(this.buildGSSegment(controlNumbers.gs, 1));

    // Transaction Set
    segments.push(...this.buildClaimTransactionSet(claim, controlNumbers.st));

    // Functional Group Trailer
    segments.push(this.buildGESegment(1, controlNumbers.gs));

    // Interchange Control Trailer
    segments.push(this.buildIEASegment(controlNumbers.isa));

    return segments;
  }

  /**
   * Build claim transaction set (ST to SE)
   * @param {object} claim - Claim object
   * @param {string} stNumber - Transaction control number
   * @returns {Array} Transaction segments
   */
  buildClaimTransactionSet(claim, stNumber) {
    const segments = [];

    // ST - Transaction Set Header
    segments.push(this.buildSTSegment(stNumber));

    // BHT - Beginning of Hierarchical Transaction
    segments.push(this.buildBHTSegment());

    // Submitter Level (2000A)
    segments.push(...this.buildSubmitterLevel());

    // Receiver Level (2000B)
    segments.push(...this.buildReceiverLevel());

    // Billing Provider Level (2000A)
    segments.push(...this.buildBillingProviderLevel(claim));

    // Subscriber Level (2000B)
    segments.push(...this.buildSubscriberLevel(claim));

    // Patient Level (2000C) - if different from subscriber
    segments.push(...this.buildPatientLevel(claim));

    // Claim Information (2300)
    segments.push(...this.buildClaimInformation(claim));

    // Service Lines (2400)
    for (const line of claim.serviceLines || []) {
      segments.push(...this.buildServiceLine(line));
    }

    // SE - Transaction Set Trailer
    segments.push(this.buildSESegment(segments.length + 1, stNumber));

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
      this.padRight('SUBMITTER123', 15), // Interchange Sender ID
      'ZZ', // Interchange ID Qualifier (Receiver)
      this.padRight('RECEIVER123', 15), // Interchange Receiver ID
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
  buildGSSegment(controlNumber, transactionCount) {
    const now = new Date();
    const date = this.formatDate(now);
    const time = this.formatTime(now);

    return [
      'GS',
      'HC', // Functional Identifier Code (HC = Health Care Claim)
      'SUBMITTER123', // Application Sender's Code
      'RECEIVER123', // Application Receiver's Code
      date, // Date (YYYYMMDD for GS)
      time, // Time (HHMM)
      this.padNumber(controlNumber, 9), // Group Control Number
      'X', // Responsible Agency Code
      '005010X223A2' // Version/Release/Industry Identifier Code
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
   * Build ST segment - Transaction Set Header
   */
  buildSTSegment(controlNumber) {
    return [
      'ST',
      '837', // Transaction Set Identifier Code
      this.padNumber(controlNumber, 9), // Transaction Set Control Number
      '005010X223A2' // Implementation Convention Reference
    ].join(this.elementSeparator);
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
   * Build BHT segment - Beginning of Hierarchical Transaction
   */
  buildBHTSegment() {
    const now = new Date();
    const date = this.formatDate(now);
    const time = this.formatTime(now);

    return [
      'BHT',
      '0019', // Hierarchical Structure Code (0019 = Information Source, Subscriber, Dependent)
      '00', // Transaction Set Purpose Code (00 = Original)
      'BATCH' + date, // Reference Identification
      date, // Date
      time, // Time
      'CH' // Transaction Type Code (CH = Chargeable)
    ].join(this.elementSeparator);
  }

  /**
   * Build submitter level segments
   */
  buildSubmitterLevel() {
    const segments = [];

    // NM1 - Submitter Name
    segments.push([
      'NM1',
      '41', // Entity Identifier Code (41 = Submitter)
      '2', // Entity Type Qualifier (2 = Non-Person Entity)
      'HOSPICE PROVIDER', // Name
      '', '', '', '', // Not used for non-person
      '46', // Identification Code Qualifier (46 = Electronic Transmitter Identification Number)
      'SUBMITTER123' // Identification Code
    ].join(this.elementSeparator));

    // PER - Submitter Contact Information
    segments.push([
      'PER',
      'IC', // Contact Function Code (IC = Information Contact)
      'BILLING DEPT',
      'TE', // Communication Number Qualifier (TE = Telephone)
      '5551234567'
    ].join(this.elementSeparator));

    return segments;
  }

  /**
   * Build receiver level segments
   */
  buildReceiverLevel() {
    const segments = [];

    // NM1 - Receiver Name
    segments.push([
      'NM1',
      '40', // Entity Identifier Code (40 = Receiver)
      '2', // Entity Type Qualifier (2 = Non-Person Entity)
      'INSURANCE COMPANY',
      '', '', '', '', // Not used
      '46', // Identification Code Qualifier
      'RECEIVER123' // Identification Code
    ].join(this.elementSeparator));

    return segments;
  }

  /**
   * Build billing provider level segments
   */
  buildBillingProviderLevel(claim) {
    const segments = [];

    // HL - Billing Provider Hierarchical Level
    segments.push([
      'HL',
      '1', // Hierarchical ID Number
      '', // Hierarchical Parent ID Number (blank for top level)
      '20', // Hierarchical Level Code (20 = Information Source)
      '1' // Hierarchical Child Code (1 = Additional Subordinate HL Present)
    ].join(this.elementSeparator));

    // PRV - Provider Information
    segments.push([
      'PRV',
      'BI', // Provider Code (BI = Billing)
      'PXC', // Reference Identification Qualifier
      '251E00000X' // Provider Taxonomy Code (Hospice)
    ].join(this.elementSeparator));

    // NM1 - Billing Provider Name
    segments.push([
      'NM1',
      '85', // Entity Identifier Code (85 = Billing Provider)
      '2', // Entity Type Qualifier (2 = Non-Person Entity)
      'HOSPICE CARE CENTER',
      '', '', '', '', // Not used
      'XX', // Identification Code Qualifier (XX = NPI)
      '1234567890' // NPI (placeholder - should come from config)
    ].join(this.elementSeparator));

    return segments;
  }

  /**
   * Build subscriber level segments
   */
  buildSubscriberLevel(claim) {
    const segments = [];

    // HL - Subscriber Hierarchical Level
    segments.push([
      'HL',
      '2', // Hierarchical ID Number
      '1', // Hierarchical Parent ID Number
      '22', // Hierarchical Level Code (22 = Subscriber)
      '0' // Hierarchical Child Code (0 = No Subordinate HL)
    ].join(this.elementSeparator));

    // SBR - Subscriber Information
    segments.push([
      'SBR',
      'P', // Payer Responsibility Sequence (P = Primary)
      '18', // Individual Relationship Code (18 = Self)
      '', // Group or Policy Number
      '', // Group Name
      '', // Insurance Type Code
      '', '', '', // Not used
      'MC' // Claim Filing Indicator Code (MC = Medicare)
    ].join(this.elementSeparator));

    // NM1 - Subscriber Name
    const patient = claim.patient || {};
    segments.push([
      'NM1',
      'IL', // Entity Identifier Code (IL = Insured/Subscriber)
      '1', // Entity Type Qualifier (1 = Person)
      patient.last_name || 'DOE',
      patient.first_name || 'JOHN',
      patient.middle_name || '',
      '', '', // Not used
      'MI', // Identification Code Qualifier (MI = Member Identification Number)
      patient.medicare_number || 'MEDICARE123'
    ].join(this.elementSeparator));

    return segments;
  }

  /**
   * Build patient level segments (if different from subscriber)
   */
  buildPatientLevel(claim) {
    const segments = [];
    // For hospice, patient is typically the subscriber
    // This section would be populated if patient is different
    return segments;
  }

  /**
   * Build claim information segments (2300)
   */
  buildClaimInformation(claim) {
    const segments = [];

    // CLM - Claim Information
    segments.push([
      'CLM',
      claim.claim_number || claim.id.toString(), // Claim Identifier
      (claim.total_charges / 100).toFixed(2), // Total Claim Charge Amount (convert from cents)
      '', '', // Not used
      this.buildFacilityCode(claim), // Facility Code Value
      '1', // Facility Code Qualifier (1 = Claim Frequency Code)
      'Y', // Provider Accept Assignment Code
      'Y', // Benefits Assignment Certification Indicator
      'Y', // Release of Information Code
      '', // Patient Signature Source Code
      '', // Related Causes Information
      '', // Special Program Code
      '', '', '', '', '', '', '', // Not used
      'A' // Delay Reason Code
    ].join(this.elementSeparator));

    // DTP - Date - Admission
    if (claim.admission_date) {
      segments.push([
        'DTP',
        '435', // Date/Time Qualifier (435 = Admission)
        'D8', // Date Time Period Format Qualifier
        this.formatDate(new Date(claim.admission_date))
      ].join(this.elementSeparator));
    }

    // HI - Health Care Diagnosis Code
    if (claim.principal_diagnosis_code) {
      segments.push([
        'HI',
        `ABK${this.subElementSeparator}${claim.principal_diagnosis_code}` // Principal Diagnosis
      ].join(this.elementSeparator));
    }

    return segments;
  }

  /**
   * Build service line segments (2400)
   */
  buildServiceLine(line) {
    const segments = [];

    // LX - Service Line Number
    segments.push([
      'LX',
      line.line_number.toString()
    ].join(this.elementSeparator));

    // SV2 - Institutional Service Line
    segments.push([
      'SV2',
      line.revenue_code || '0000', // Revenue Code
      'HC' + this.subElementSeparator + (line.hcpcs_code || ''), // Service Identification
      (line.charges / 100).toFixed(2), // Line Item Charge Amount
      'UN', // Unit or Basis for Measurement Code
      line.units.toString() // Service Unit Count
    ].join(this.elementSeparator));

    // DTP - Date - Service
    if (line.service_date) {
      segments.push([
        'DTP',
        '472', // Date/Time Qualifier (472 = Service)
        'D8', // Date Time Period Format Qualifier
        this.formatDate(new Date(line.service_date))
      ].join(this.elementSeparator));
    }

    return segments;
  }

  /**
   * Build facility code value
   */
  buildFacilityCode(claim) {
    const billType = claim.bill_type || '0811';
    const admissionType = claim.admission_type || '1';
    const admissionSource = claim.admission_source || '1';
    const dischargeStatus = claim.discharge_status || '01';

    return `${billType}${this.subElementSeparator}${admissionType}${this.subElementSeparator}${admissionSource}${this.subElementSeparator}${dischargeStatus}`;
  }

  /**
   * Validate claim readiness for EDI generation
   */
  validateClaimReadiness(claim) {
    if (!claim.scrubbing_passed) {
      throw new Error('Claim has not passed scrubbing validation');
    }

    if (!claim.bill_type) {
      throw new Error('Bill type is required');
    }

    if (!claim.principal_diagnosis_code) {
      throw new Error('Principal diagnosis code is required');
    }

    if (!claim.serviceLines || claim.serviceLines.length === 0) {
      throw new Error('Claim must have at least one service line');
    }
  }

  /**
   * Load claim with all required data for EDI generation
   */
  async loadClaimForEDI(claimId) {
    try {
      const claimResults = await db
        .select()
        .from(claims)
        .leftJoin(patients, eq(claims.patient_id, patients.id))
        .where(eq(claims.id, claimId))
        .limit(1);

      if (!claimResults[0]) {
        throw new Error(`Claim ${claimId} not found`);
      }

      const claim = { ...claimResults[0].claims, patient: claimResults[0].patients };

      // Load service lines
      const serviceLines = await db
        .select()
        .from(claim_service_lines)
        .where(eq(claim_service_lines.claim_id, claimId));

      claim.serviceLines = serviceLines;

      return claim;
    } catch (error) {
      logger.error(`Error loading claim ${claimId} for EDI:`, error)
      throw new Error(`Failed to load claim: ${error.message}`);
    }
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
   * Generate file name
   */
  generateFileName(prefix, controlNumber) {
    const timestamp = new Date().toISOString().replace(/[-:]/g, '').split('.')[0];
    return `${prefix}_${timestamp}_${this.padNumber(controlNumber, 9)}.txt`;
  }

  /**
   * Ensure storage directories exist
   */
  async ensureStorageDirectories() {
    await fs.mkdir(this.outboundPath, { recursive: true });
    await fs.mkdir(this.inboundPath, { recursive: true });
  }

  /**
   * Format date as YYMMDD or YYYYMMDD
   */
  formatDate(date, longFormat = false) {
    const year = date.getFullYear();
    const month = this.padNumber(date.getMonth() + 1, 2);
    const day = this.padNumber(date.getDate(), 2);

    if (longFormat) {
      return `${year}${month}${day}`;
    }
    return `${year.toString().substring(2)}${month}${day}`;
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

  /**
   * Read EDI file content
   */
  async readEDIFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      logger.error(`Error reading EDI file ${filePath}:`, error)
      throw new Error(`Failed to read EDI file: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new EDIGenerator();
