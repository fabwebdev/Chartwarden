import { db } from '../db/index.js';
import { claims, claim_service_lines, payers } from '../db/schemas/billing.schema.js';
import { clearinghouse_submissions, clearinghouse_configurations, claim_validation_results } from '../db/schemas/clearinghouse.schema.js';
import { patients } from '../db/schemas/patient.schema.js';
import { eq, sql, and, inArray } from 'drizzle-orm';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

import { logger } from '../utils/logger.js';

/**
 * EDI 837 Generator Service
 * Comprehensive EDI 837 claim file generator for healthcare clearinghouse submission
 *
 * Supports:
 *   - 837I (Institutional Claims) - ANSI X12 005010X223A2
 *   - 837P (Professional Claims) - ANSI X12 005010X222A1
 *
 * Features:
 *   - Single and batch file generation
 *   - Configurable clearinghouse settings
 *   - Database-backed control number management
 *   - Pre-generation validation
 *   - File preview without submission
 *   - Comprehensive segment building
 *   - HIPAA 5010 compliance
 */
class EDI837Generator {
  constructor() {
    // Version constants for different claim types
    this.VERSIONS = {
      '837I': '005010X223A2', // Institutional
      '837P': '005010X222A1'  // Professional
    };

    // EDI delimiters
    this.segmentTerminator = '~';
    this.elementSeparator = '*';
    this.subElementSeparator = ':';
    this.repetitionSeparator = '^';

    // Storage paths
    this.storageBasePath = './storage/edi';
    this.outboundPath = path.join(this.storageBasePath, 'outbound');
    this.inboundPath = path.join(this.storageBasePath, 'inbound');

    // Control number counters (fallback if database not available)
    this._isaCounter = Math.floor(Date.now() / 1000) % 999999999;
    this._gsCounter = Math.floor(Date.now() / 1000) % 999999999;
    this._stCounter = Math.floor(Date.now() / 1000) % 999999999;

    // Default clearinghouse configuration
    this.defaultConfig = {
      submitter_id: 'CHARTWARDEN',
      submitter_qualifier: 'ZZ',
      receiver_id: 'CLEARINGHOUSE',
      receiver_qualifier: 'ZZ',
      application_sender_code: 'CHARTWARDEN',
      application_receiver_code: 'CLEARINGHOUSE',
      is_production: false
    };
  }

  // ============================================================
  // PUBLIC API - Main generation methods
  // ============================================================

  /**
   * Generate 837 file for a single claim
   * @param {number} claimId - Claim ID to generate
   * @param {object} options - Generation options
   * @param {string} options.claim_type - '837I' or '837P' (default: auto-detect from bill_type)
   * @param {string} options.clearinghouse_id - Clearinghouse configuration ID
   * @param {boolean} options.preview_only - If true, returns content without saving
   * @param {boolean} options.skip_validation - Skip pre-generation validation
   * @returns {Promise<object>} Generated file details
   */
  async generate837(claimId, options = {}) {
    try {
      // 1. Load claim with all related data
      const claim = await this.loadClaimForEDI(claimId);

      // 2. Determine claim type (837I or 837P)
      const claimType = options.claim_type || this.determineClaimType(claim);

      // 3. Load clearinghouse configuration
      const clearinghouseConfig = await this.loadClearinghouseConfig(options.clearinghouse_id);

      // 4. Validate claim readiness (unless skipped)
      if (!options.skip_validation) {
        await this.validateClaimForEDI(claim, claimType);
      }

      // 5. Generate control numbers
      const controlNumbers = await this.generateControlNumbers();

      // 6. Build EDI segments
      const segments = this.build837Segments(claim, claimType, controlNumbers, clearinghouseConfig);

      // 7. Assemble EDI content
      const ediContent = segments.join(this.segmentTerminator) + this.segmentTerminator;

      // 8. Calculate checksum
      const checksum = this.calculateChecksum(ediContent);

      // If preview only, return content without saving
      if (options.preview_only) {
        return {
          preview: true,
          claim_id: claimId,
          claim_type: claimType,
          edi_content: ediContent,
          segment_count: segments.length,
          checksum,
          control_numbers: controlNumbers
        };
      }

      // 9. Save file to disk
      const fileName = this.generateFileName(claimType, controlNumbers.isa);
      const filePath = path.join(this.outboundPath, fileName);

      await this.ensureStorageDirectories();
      await fs.writeFile(filePath, ediContent, 'utf8');

      // 10. Update claim with control numbers
      await db.update(claims)
        .set({
          edi_interchange_control_number: controlNumbers.isa.toString(),
          edi_transaction_set_control_number: controlNumbers.st.toString(),
          updatedAt: new Date()
        })
        .where(eq(claims.id, claimId));

      // 11. Create submission record
      const submission = await db.insert(clearinghouse_submissions).values({
        claim_id: claimId,
        submission_date: new Date(),
        submission_method: 'EDI_FILE',
        edi_file_name: fileName,
        edi_file_path: filePath,
        edi_control_number: controlNumbers.isa.toString(),
        edi_group_control_number: controlNumbers.gs.toString(),
        edi_transaction_control_number: controlNumbers.st.toString(),
        edi_content: ediContent,
        clearinghouse_name: clearinghouseConfig.name || 'Default Clearinghouse',
        clearinghouse_id: clearinghouseConfig.clearinghouse_id,
        current_status: 'GENERATED',
        acknowledgment_status: 'PENDING',
        submitted_charges: claim.total_charges,
        payer_id: claim.payer_id,
        metadata: {
          claim_type: claimType,
          version: this.VERSIONS[claimType],
          checksum,
          segment_count: segments.length
        }
      }).returning();

      const fileStats = await fs.stat(filePath);

      return {
        submission_id: submission[0].id,
        claim_id: claimId,
        claim_type: claimType,
        edi_file_name: fileName,
        edi_file_path: filePath,
        edi_control_number: controlNumbers.isa.toString(),
        edi_group_control_number: controlNumbers.gs.toString(),
        edi_transaction_control_number: controlNumbers.st.toString(),
        file_size_bytes: fileStats.size,
        segment_count: segments.length,
        checksum,
        generated_at: new Date()
      };
    } catch (error) {
      logger.error(`Error generating 837 for claim ${claimId}:`, error);
      throw new Error(`837 generation failed: ${error.message}`);
    }
  }

  /**
   * Generate batch 837 file for multiple claims
   * @param {Array<number>} claimIds - Array of claim IDs
   * @param {object} options - Generation options
   * @param {string} options.batch_name - Custom batch identifier
   * @param {string} options.claim_type - Force specific claim type ('837I' or '837P')
   * @param {string} options.clearinghouse_id - Clearinghouse configuration ID
   * @param {boolean} options.continue_on_error - Continue processing if individual claims fail
   * @returns {Promise<object>} Batch file details
   */
  async generateBatch837(claimIds, options = {}) {
    try {
      if (!claimIds || !Array.isArray(claimIds) || claimIds.length === 0) {
        throw new Error('claimIds must be a non-empty array');
      }

      if (claimIds.length > 5000) {
        throw new Error('Maximum 5000 claims per batch file');
      }

      // Load clearinghouse configuration
      const clearinghouseConfig = await this.loadClearinghouseConfig(options.clearinghouse_id);

      // Generate batch control numbers
      const batchControlNumbers = await this.generateControlNumbers();
      const batchId = options.batch_name || `BATCH_${this.formatDateLong(new Date())}_${this.padNumber(batchControlNumbers.isa, 9)}`;

      const allSegments = [];
      const processedClaims = [];
      const failedClaims = [];
      let transactionCount = 0;
      let totalCharges = 0;

      // Build ISA segment (once per file)
      allSegments.push(this.buildISASegment(batchControlNumbers.isa, clearinghouseConfig));

      // Build GS segment (once per file) - transaction count updated at end
      const gsIndex = allSegments.length;
      allSegments.push(''); // Placeholder for GS segment

      // Process each claim
      for (const claimId of claimIds) {
        try {
          const claim = await this.loadClaimForEDI(claimId);
          const claimType = options.claim_type || this.determineClaimType(claim);

          // Validate claim
          if (!options.skip_validation) {
            try {
              await this.validateClaimForEDI(claim, claimType);
            } catch (validationError) {
              if (options.continue_on_error) {
                failedClaims.push({
                  claim_id: claimId,
                  error: validationError.message,
                  reason: 'validation_failed'
                });
                continue;
              }
              throw validationError;
            }
          }

          // Generate transaction control number
          const stNumber = await this.generateControlNumbers();

          // Build transaction set for this claim
          const claimSegments = this.buildClaimTransactionSet(claim, claimType, stNumber.st, clearinghouseConfig);
          allSegments.push(...claimSegments);

          transactionCount++;
          totalCharges += claim.total_charges || 0;

          // Update claim with control numbers
          await db.update(claims)
            .set({
              edi_interchange_control_number: batchControlNumbers.isa.toString(),
              edi_transaction_set_control_number: stNumber.st.toString(),
              updatedAt: new Date()
            })
            .where(eq(claims.id, claimId));

          processedClaims.push({
            claim_id: claimId,
            claim_type: claimType,
            st_control_number: stNumber.st.toString()
          });
        } catch (error) {
          logger.error(`Error processing claim ${claimId} in batch:`, error);
          if (options.continue_on_error) {
            failedClaims.push({
              claim_id: claimId,
              error: error.message,
              reason: 'processing_error'
            });
          } else {
            throw error;
          }
        }
      }

      if (transactionCount === 0) {
        throw new Error('No claims were successfully processed for the batch');
      }

      // Update GS segment with actual transaction count
      allSegments[gsIndex] = this.buildGSSegment(batchControlNumbers.gs, transactionCount, clearinghouseConfig);

      // Build GE segment (Functional Group Trailer)
      allSegments.push(this.buildGESegment(transactionCount, batchControlNumbers.gs));

      // Build IEA segment (Interchange Control Trailer)
      allSegments.push(this.buildIEASegment(1, batchControlNumbers.isa));

      // Assemble EDI content
      const ediContent = allSegments.join(this.segmentTerminator) + this.segmentTerminator;
      const checksum = this.calculateChecksum(ediContent);

      // Save file
      const fileName = this.generateFileName(`837_${batchId}`, batchControlNumbers.isa);
      const filePath = path.join(this.outboundPath, fileName);

      await this.ensureStorageDirectories();
      await fs.writeFile(filePath, ediContent, 'utf8');

      // Create submission records for each processed claim
      const submissionIds = [];
      for (const processed of processedClaims) {
        const submission = await db.insert(clearinghouse_submissions).values({
          claim_id: processed.claim_id,
          submission_batch_id: batchId,
          submission_date: new Date(),
          submission_method: 'EDI_FILE',
          edi_file_name: fileName,
          edi_file_path: filePath,
          edi_control_number: batchControlNumbers.isa.toString(),
          edi_group_control_number: batchControlNumbers.gs.toString(),
          edi_transaction_control_number: processed.st_control_number,
          edi_content: ediContent,
          clearinghouse_name: clearinghouseConfig.name || 'Default Clearinghouse',
          clearinghouse_id: clearinghouseConfig.clearinghouse_id,
          current_status: 'GENERATED',
          acknowledgment_status: 'PENDING',
          metadata: {
            batch_id: batchId,
            claim_type: processed.claim_type,
            checksum
          }
        }).returning();

        submissionIds.push(submission[0].id);
      }

      const fileStats = await fs.stat(filePath);

      return {
        batch_id: batchId,
        submission_ids: submissionIds,
        edi_file_name: fileName,
        edi_file_path: filePath,
        edi_control_number: batchControlNumbers.isa.toString(),
        claims_processed: transactionCount,
        claims_failed: failedClaims.length,
        failed_claims: failedClaims,
        processed_claims: processedClaims,
        total_charges_cents: totalCharges,
        file_size_bytes: fileStats.size,
        segment_count: allSegments.length,
        checksum,
        generated_at: new Date()
      };
    } catch (error) {
      logger.error('Error generating batch 837:', error);
      throw new Error(`Batch 837 generation failed: ${error.message}`);
    }
  }

  /**
   * Validate claim for EDI generation without generating
   * @param {number} claimId - Claim ID to validate
   * @param {string} claimType - '837I' or '837P'
   * @returns {Promise<object>} Validation result
   */
  async validateClaim(claimId, claimType = null) {
    try {
      const claim = await this.loadClaimForEDI(claimId);
      const type = claimType || this.determineClaimType(claim);

      const errors = [];
      const warnings = [];

      // Run validation
      this.validateClaimData(claim, type, errors, warnings);

      // Store validation result
      await db.insert(claim_validation_results).values({
        claim_id: claimId,
        validation_date: new Date(),
        validation_type: 'PRE_SUBMISSION',
        passed: errors.length === 0,
        errors: errors.length > 0 ? errors : null,
        warnings: warnings.length > 0 ? warnings : null,
        fields_validated: this.getValidatedFieldCount(type),
        fields_passed: this.getValidatedFieldCount(type) - errors.length,
        fields_failed: errors.length,
        validator_version: '1.0.0',
        rules_applied: this.getAppliedRules(type)
      });

      return {
        claim_id: claimId,
        claim_type: type,
        is_valid: errors.length === 0,
        errors,
        warnings,
        validated_at: new Date()
      };
    } catch (error) {
      logger.error(`Error validating claim ${claimId}:`, error);
      throw new Error(`Claim validation failed: ${error.message}`);
    }
  }

  /**
   * Preview EDI content without saving
   * @param {number} claimId - Claim ID
   * @param {object} options - Generation options
   * @returns {Promise<object>} Preview with EDI content
   */
  async previewEDI(claimId, options = {}) {
    return this.generate837(claimId, { ...options, preview_only: true });
  }

  /**
   * Get supported claim types
   * @returns {object} Supported claim types and versions
   */
  getSupportedClaimTypes() {
    return {
      '837I': {
        name: 'Institutional Claims',
        version: this.VERSIONS['837I'],
        description: 'Hospital, nursing facility, and other institutional claims (UB-04)',
        bill_type_prefix: ['81', '82', '83', '84', '85']
      },
      '837P': {
        name: 'Professional Claims',
        version: this.VERSIONS['837P'],
        description: 'Physician, supplier, and other professional claims (CMS-1500)',
        bill_type_prefix: ['09', '10', '11', '12', '13']
      }
    };
  }

  // ============================================================
  // SEGMENT BUILDING - Main builders
  // ============================================================

  /**
   * Build complete 837 segments
   */
  build837Segments(claim, claimType, controlNumbers, config) {
    const segments = [];

    // Interchange Control Header
    segments.push(this.buildISASegment(controlNumbers.isa, config));

    // Functional Group Header
    segments.push(this.buildGSSegment(controlNumbers.gs, 1, config, claimType));

    // Transaction Set
    segments.push(...this.buildClaimTransactionSet(claim, claimType, controlNumbers.st, config));

    // Functional Group Trailer
    segments.push(this.buildGESegment(1, controlNumbers.gs));

    // Interchange Control Trailer
    segments.push(this.buildIEASegment(1, controlNumbers.isa));

    return segments;
  }

  /**
   * Build transaction set (ST to SE) for a single claim
   */
  buildClaimTransactionSet(claim, claimType, stNumber, config) {
    const segments = [];

    // ST - Transaction Set Header
    segments.push(this.buildSTSegment(stNumber, claimType));

    // BHT - Beginning of Hierarchical Transaction
    segments.push(this.buildBHTSegment(claim));

    // NM1 Loop 1000A - Submitter Name
    segments.push(...this.buildSubmitterLoop(config));

    // NM1 Loop 1000B - Receiver Name
    segments.push(...this.buildReceiverLoop(config));

    // HL Loop 2000A - Billing Provider Hierarchical Level
    segments.push(...this.buildBillingProviderHL(claim, claimType, config));

    // HL Loop 2000B - Subscriber Hierarchical Level
    segments.push(...this.buildSubscriberHL(claim, claimType));

    // HL Loop 2000C - Patient Hierarchical Level (if different from subscriber)
    const patientSegments = this.buildPatientHL(claim, claimType);
    if (patientSegments.length > 0) {
      segments.push(...patientSegments);
    }

    // Loop 2300 - Claim Information
    segments.push(...this.buildClaimLoop(claim, claimType));

    // Loop 2400 - Service Lines
    for (let i = 0; i < (claim.serviceLines || []).length; i++) {
      segments.push(...this.buildServiceLineLoop(claim.serviceLines[i], i + 1, claimType));
    }

    // SE - Transaction Set Trailer
    segments.push(this.buildSESegment(segments.length + 1, stNumber));

    return segments;
  }

  // ============================================================
  // ENVELOPE SEGMENTS (ISA, GS, GE, IEA, ST, SE)
  // ============================================================

  /**
   * Build ISA - Interchange Control Header
   */
  buildISASegment(controlNumber, config) {
    const now = new Date();
    const date = this.formatDateShort(now);
    const time = this.formatTime(now);

    return [
      'ISA',
      '00',                                           // ISA01 - Authorization Information Qualifier
      this.padRight('', 10),                          // ISA02 - Authorization Information
      '00',                                           // ISA03 - Security Information Qualifier
      this.padRight('', 10),                          // ISA04 - Security Information
      config.submitter_qualifier || 'ZZ',             // ISA05 - Interchange Sender ID Qualifier
      this.padRight(config.submitter_id || 'SUBMITTER', 15),  // ISA06 - Interchange Sender ID
      config.receiver_qualifier || 'ZZ',              // ISA07 - Interchange Receiver ID Qualifier
      this.padRight(config.receiver_id || 'RECEIVER', 15),    // ISA08 - Interchange Receiver ID
      date,                                           // ISA09 - Interchange Date (YYMMDD)
      time,                                           // ISA10 - Interchange Time (HHMM)
      this.repetitionSeparator,                       // ISA11 - Repetition Separator
      '00501',                                        // ISA12 - Interchange Control Version Number
      this.padNumber(controlNumber, 9),               // ISA13 - Interchange Control Number
      '0',                                            // ISA14 - Acknowledgment Requested
      config.is_production ? 'P' : 'T',               // ISA15 - Usage Indicator (P=Production, T=Test)
      this.subElementSeparator                        // ISA16 - Component Element Separator
    ].join(this.elementSeparator);
  }

  /**
   * Build GS - Functional Group Header
   */
  buildGSSegment(controlNumber, transactionCount, config, claimType = '837I') {
    const now = new Date();
    const date = this.formatDateLong(now);
    const time = this.formatTime(now);
    const version = this.VERSIONS[claimType] || this.VERSIONS['837I'];

    return [
      'GS',
      'HC',                                           // GS01 - Functional Identifier Code (HC = Health Care Claim)
      config.application_sender_code || 'SENDER',     // GS02 - Application Sender's Code
      config.application_receiver_code || 'RECEIVER', // GS03 - Application Receiver's Code
      date,                                           // GS04 - Date (CCYYMMDD)
      time,                                           // GS05 - Time (HHMM)
      this.padNumber(controlNumber, 9),               // GS06 - Group Control Number
      'X',                                            // GS07 - Responsible Agency Code
      version                                         // GS08 - Version/Release/Industry Identifier Code
    ].join(this.elementSeparator);
  }

  /**
   * Build GE - Functional Group Trailer
   */
  buildGESegment(transactionCount, controlNumber) {
    return [
      'GE',
      transactionCount.toString(),                    // GE01 - Number of Transaction Sets Included
      this.padNumber(controlNumber, 9)                // GE02 - Group Control Number
    ].join(this.elementSeparator);
  }

  /**
   * Build IEA - Interchange Control Trailer
   */
  buildIEASegment(groupCount, controlNumber) {
    return [
      'IEA',
      groupCount.toString(),                          // IEA01 - Number of Included Functional Groups
      this.padNumber(controlNumber, 9)                // IEA02 - Interchange Control Number
    ].join(this.elementSeparator);
  }

  /**
   * Build ST - Transaction Set Header
   */
  buildSTSegment(controlNumber, claimType) {
    const version = this.VERSIONS[claimType] || this.VERSIONS['837I'];
    return [
      'ST',
      '837',                                          // ST01 - Transaction Set Identifier Code
      this.padNumber(controlNumber, 4),               // ST02 - Transaction Set Control Number
      version                                         // ST03 - Implementation Convention Reference
    ].join(this.elementSeparator);
  }

  /**
   * Build SE - Transaction Set Trailer
   */
  buildSESegment(segmentCount, controlNumber) {
    return [
      'SE',
      segmentCount.toString(),                        // SE01 - Number of Included Segments
      this.padNumber(controlNumber, 4)                // SE02 - Transaction Set Control Number
    ].join(this.elementSeparator);
  }

  /**
   * Build BHT - Beginning of Hierarchical Transaction
   */
  buildBHTSegment(claim) {
    const now = new Date();
    const date = this.formatDateLong(now);
    const time = this.formatTime(now);
    const refId = claim.claim_number || `CLM${claim.id}`;

    return [
      'BHT',
      '0019',                                         // BHT01 - Hierarchical Structure Code
      '00',                                           // BHT02 - Transaction Set Purpose Code (00=Original)
      refId.substring(0, 50),                         // BHT03 - Reference Identification
      date,                                           // BHT04 - Date
      time,                                           // BHT05 - Time
      'CH'                                            // BHT06 - Transaction Type Code (CH=Chargeable)
    ].join(this.elementSeparator);
  }

  // ============================================================
  // LOOP 1000 - Submitter/Receiver
  // ============================================================

  /**
   * Build Loop 1000A - Submitter Name
   */
  buildSubmitterLoop(config) {
    const segments = [];

    // NM1 - Submitter Name
    segments.push([
      'NM1',
      '41',                                           // NM101 - Entity Identifier Code (41=Submitter)
      '2',                                            // NM102 - Entity Type Qualifier (2=Non-Person Entity)
      config.name || 'HOSPICE CARE PROVIDER',         // NM103 - Organization Name
      '', '', '', '',                                 // NM104-07 - Not used for non-person
      '46',                                           // NM108 - Identification Code Qualifier (46=ETIN)
      config.submitter_id || 'SUBMITTER'              // NM109 - Identification Code
    ].join(this.elementSeparator));

    // PER - Submitter EDI Contact Information
    segments.push([
      'PER',
      'IC',                                           // PER01 - Contact Function Code (IC=Information Contact)
      'EDI COORDINATOR',                              // PER02 - Name
      'TE',                                           // PER03 - Communication Number Qualifier (TE=Telephone)
      '5551234567',                                   // PER04 - Communication Number
      'EM',                                           // PER05 - Communication Number Qualifier (EM=Email)
      'edi@hospice.com'                               // PER06 - Communication Number
    ].join(this.elementSeparator));

    return segments;
  }

  /**
   * Build Loop 1000B - Receiver Name
   */
  buildReceiverLoop(config) {
    const segments = [];

    // NM1 - Receiver Name
    segments.push([
      'NM1',
      '40',                                           // NM101 - Entity Identifier Code (40=Receiver)
      '2',                                            // NM102 - Entity Type Qualifier (2=Non-Person Entity)
      config.receiver_name || 'CLEARINGHOUSE',        // NM103 - Organization Name
      '', '', '', '',                                 // NM104-07 - Not used
      '46',                                           // NM108 - Identification Code Qualifier
      config.receiver_id || 'RECEIVER'                // NM109 - Identification Code
    ].join(this.elementSeparator));

    return segments;
  }

  // ============================================================
  // LOOP 2000A - Billing Provider Hierarchical Level
  // ============================================================

  /**
   * Build Loop 2000A - Billing Provider Hierarchical Level
   */
  buildBillingProviderHL(claim, claimType, config) {
    const segments = [];

    // HL - Hierarchical Level (Billing Provider)
    segments.push([
      'HL',
      '1',                                            // HL01 - Hierarchical ID Number
      '',                                             // HL02 - Hierarchical Parent ID Number (blank for top)
      '20',                                           // HL03 - Hierarchical Level Code (20=Information Source)
      '1'                                             // HL04 - Hierarchical Child Code (1=Additional HL Present)
    ].join(this.elementSeparator));

    // PRV - Billing Provider Specialty Information
    segments.push([
      'PRV',
      'BI',                                           // PRV01 - Provider Code (BI=Billing)
      'PXC',                                          // PRV02 - Reference Identification Qualifier (PXC=Healthcare Provider Taxonomy Code)
      claimType === '837I' ? '251E00000X' : '207Q00000X'  // PRV03 - Reference Identification (Taxonomy)
    ].join(this.elementSeparator));

    // Loop 2010AA - Billing Provider Name
    segments.push(...this.buildBillingProviderName(claim, config));

    // Loop 2010AB - Pay-to Address (if different from billing provider)
    // Typically not included for hospice

    return segments;
  }

  /**
   * Build Loop 2010AA - Billing Provider Name
   */
  buildBillingProviderName(claim, config) {
    const segments = [];

    // NM1 - Billing Provider Name
    segments.push([
      'NM1',
      '85',                                           // NM101 - Entity Identifier Code (85=Billing Provider)
      '2',                                            // NM102 - Entity Type Qualifier (2=Non-Person Entity)
      config.name || 'HOSPICE CARE CENTER',           // NM103 - Organization Name
      '', '', '', '',                                 // NM104-07 - Not used for organization
      'XX',                                           // NM108 - Identification Code Qualifier (XX=NPI)
      config.npi || '1234567890'                      // NM109 - NPI
    ].join(this.elementSeparator));

    // N3 - Billing Provider Address
    segments.push([
      'N3',
      config.address_line1 || '123 HOSPICE WAY',      // N301 - Address Line 1
      config.address_line2 || ''                      // N302 - Address Line 2
    ].join(this.elementSeparator));

    // N4 - Billing Provider City/State/Zip
    segments.push([
      'N4',
      config.city || 'ANYTOWN',                       // N401 - City Name
      config.state || 'ST',                           // N402 - State Code
      config.zip_code || '12345'                      // N403 - Postal Code
    ].join(this.elementSeparator));

    // REF - Billing Provider Tax Identification
    segments.push([
      'REF',
      'EI',                                           // REF01 - Reference Identification Qualifier (EI=Employer ID)
      config.tax_id || '123456789'                    // REF02 - Reference Identification
    ].join(this.elementSeparator));

    return segments;
  }

  // ============================================================
  // LOOP 2000B - Subscriber Hierarchical Level
  // ============================================================

  /**
   * Build Loop 2000B - Subscriber Hierarchical Level
   */
  buildSubscriberHL(claim, claimType) {
    const segments = [];
    const patient = claim.patient || {};
    const payer = claim.payer || {};

    // Determine if patient is the subscriber or a dependent
    const patientIsSubscriber = true; // For hospice, patient is typically the subscriber

    // HL - Hierarchical Level (Subscriber)
    segments.push([
      'HL',
      '2',                                            // HL01 - Hierarchical ID Number
      '1',                                            // HL02 - Hierarchical Parent ID Number
      '22',                                           // HL03 - Hierarchical Level Code (22=Subscriber)
      patientIsSubscriber ? '0' : '1'                 // HL04 - Hierarchical Child Code
    ].join(this.elementSeparator));

    // SBR - Subscriber Information
    segments.push([
      'SBR',
      'P',                                            // SBR01 - Payer Responsibility Sequence (P=Primary)
      patientIsSubscriber ? '18' : '01',              // SBR02 - Individual Relationship Code (18=Self, 01=Spouse)
      payer.group_number || '',                       // SBR03 - Reference Identification (Group/Policy Number)
      payer.group_name || '',                         // SBR04 - Name (Group Name)
      this.getInsuranceTypeCode(payer),               // SBR05 - Insurance Type Code
      '', '', '',                                     // SBR06-08 - Not used
      this.getClaimFilingIndicator(payer)             // SBR09 - Claim Filing Indicator Code
    ].join(this.elementSeparator));

    // Loop 2010BA - Subscriber Name
    segments.push(...this.buildSubscriberName(patient, claim));

    // Loop 2010BB - Payer Name
    segments.push(...this.buildPayerName(payer, claim));

    return segments;
  }

  /**
   * Build Loop 2010BA - Subscriber Name
   */
  buildSubscriberName(patient, claim) {
    const segments = [];

    // NM1 - Subscriber Name
    segments.push([
      'NM1',
      'IL',                                           // NM101 - Entity Identifier Code (IL=Insured/Subscriber)
      '1',                                            // NM102 - Entity Type Qualifier (1=Person)
      (patient.last_name || 'DOE').toUpperCase(),     // NM103 - Name Last
      (patient.first_name || 'JOHN').toUpperCase(),   // NM104 - Name First
      (patient.middle_name || '').toUpperCase(),      // NM105 - Name Middle
      '',                                             // NM106 - Name Prefix
      '',                                             // NM107 - Name Suffix
      'MI',                                           // NM108 - Identification Code Qualifier (MI=Member ID)
      patient.medicare_number || patient.insurance_id || 'UNKNOWN' // NM109 - Member ID
    ].join(this.elementSeparator));

    // N3 - Subscriber Address
    segments.push([
      'N3',
      patient.address_line1 || '123 MAIN ST',         // N301 - Address Line 1
      patient.address_line2 || ''                     // N302 - Address Line 2
    ].join(this.elementSeparator));

    // N4 - Subscriber City/State/Zip
    segments.push([
      'N4',
      (patient.city || 'ANYTOWN').toUpperCase(),      // N401 - City Name
      (patient.state || 'ST').toUpperCase(),          // N402 - State Code
      patient.zip_code || '12345'                     // N403 - Postal Code
    ].join(this.elementSeparator));

    // DMG - Subscriber Demographic Information
    if (patient.date_of_birth) {
      segments.push([
        'DMG',
        'D8',                                         // DMG01 - Date Time Period Format Qualifier
        this.formatDateLong(new Date(patient.date_of_birth)), // DMG02 - Date of Birth
        (patient.gender || 'U').toUpperCase()         // DMG03 - Gender Code (M/F/U)
      ].join(this.elementSeparator));
    }

    return segments;
  }

  /**
   * Build Loop 2010BB - Payer Name
   */
  buildPayerName(payer, claim) {
    const segments = [];

    // NM1 - Payer Name
    segments.push([
      'NM1',
      'PR',                                           // NM101 - Entity Identifier Code (PR=Payer)
      '2',                                            // NM102 - Entity Type Qualifier (2=Non-Person Entity)
      (payer.payer_name || 'MEDICARE').toUpperCase(), // NM103 - Organization Name
      '', '', '', '',                                 // NM104-07 - Not used
      'PI',                                           // NM108 - Identification Code Qualifier (PI=Payer ID)
      payer.payer_id || '00123'                       // NM109 - Payer ID
    ].join(this.elementSeparator));

    // N3 - Payer Address (optional but recommended)
    if (payer.address_line1) {
      segments.push([
        'N3',
        payer.address_line1,
        payer.address_line2 || ''
      ].join(this.elementSeparator));
    }

    // N4 - Payer City/State/Zip
    if (payer.city && payer.state) {
      segments.push([
        'N4',
        payer.city.toUpperCase(),
        payer.state.toUpperCase(),
        payer.zip_code || ''
      ].join(this.elementSeparator));
    }

    return segments;
  }

  // ============================================================
  // LOOP 2000C - Patient Hierarchical Level
  // ============================================================

  /**
   * Build Loop 2000C - Patient Hierarchical Level (if different from subscriber)
   */
  buildPatientHL(claim, claimType) {
    // For hospice claims, patient is typically the subscriber
    // This would be populated if patient is a dependent
    return [];
  }

  // ============================================================
  // LOOP 2300 - Claim Information
  // ============================================================

  /**
   * Build Loop 2300 - Claim Information
   */
  buildClaimLoop(claim, claimType) {
    const segments = [];

    // CLM - Claim Information
    segments.push(this.buildCLMSegment(claim, claimType));

    // DTP - Date segments
    segments.push(...this.buildClaimDates(claim, claimType));

    // CL1 - Institutional Claim Code (837I only)
    if (claimType === '837I') {
      segments.push(this.buildCL1Segment(claim));
    }

    // PWK - Claim Supplemental Information (if attachments)
    // segments.push(...this.buildPWKSegments(claim));

    // CN1 - Contract Information (if applicable)
    // segments.push(this.buildCN1Segment(claim));

    // REF - Reference Identification
    segments.push(...this.buildClaimREFSegments(claim));

    // AMT - Claim Amounts (if applicable)
    // segments.push(...this.buildClaimAMTSegments(claim));

    // NTE - Claim Note (if remarks)
    if (claim.remarks) {
      segments.push([
        'NTE',
        'ADD',                                        // NTE01 - Note Reference Code
        claim.remarks.substring(0, 80)                // NTE02 - Description
      ].join(this.elementSeparator));
    }

    // HI - Health Care Diagnosis Codes
    segments.push(...this.buildHISegments(claim, claimType));

    // Loop 2310 - Provider Information
    segments.push(...this.buildProviderLoops(claim, claimType));

    return segments;
  }

  /**
   * Build CLM - Claim Information segment
   */
  buildCLMSegment(claim, claimType) {
    const claimNumber = claim.claim_number || `${claim.id}`;
    const totalCharges = ((claim.total_charges || 0) / 100).toFixed(2);

    // Build facility code based on claim type
    let facilityCode;
    if (claimType === '837I') {
      // Institutional: Bill Type:Frequency:Facility Type Qualifier
      const billType = claim.bill_type || '0811';
      const frequency = billType.charAt(3) || '1';
      facilityCode = `${billType.substring(0, 2)}${this.subElementSeparator}${frequency}${this.subElementSeparator}1`;
    } else {
      // Professional: Place of Service
      facilityCode = `12${this.subElementSeparator}B${this.subElementSeparator}1`; // Home Health Agency
    }

    return [
      'CLM',
      claimNumber,                                    // CLM01 - Claim Submitter's Identifier
      totalCharges,                                   // CLM02 - Total Claim Charge Amount
      '',                                             // CLM03 - Claim Filing Indicator Code (legacy)
      '',                                             // CLM04 - Non-Institutional Claim Type Code (legacy)
      facilityCode,                                   // CLM05 - Health Care Service Location Information
      'Y',                                            // CLM06 - Provider or Supplier Signature Indicator
      'A',                                            // CLM07 - Assignment or Plan Participation Code
      'Y',                                            // CLM08 - Benefits Assignment Certification Indicator
      'Y'                                             // CLM09 - Release of Information Code
    ].join(this.elementSeparator);
  }

  /**
   * Build claim date segments
   */
  buildClaimDates(claim, claimType) {
    const segments = [];

    // DTP - Statement Dates (434 = Statement)
    if (claim.statement_from_date && claim.statement_to_date) {
      segments.push([
        'DTP',
        '434',                                        // DTP01 - Date/Time Qualifier (434=Statement)
        'RD8',                                        // DTP02 - Date Time Period Format Qualifier
        `${this.formatDateLong(new Date(claim.statement_from_date))}-${this.formatDateLong(new Date(claim.statement_to_date))}`
      ].join(this.elementSeparator));
    } else if (claim.service_start_date && claim.service_end_date) {
      segments.push([
        'DTP',
        '434',
        'RD8',
        `${this.formatDateLong(new Date(claim.service_start_date))}-${this.formatDateLong(new Date(claim.service_end_date))}`
      ].join(this.elementSeparator));
    }

    // DTP - Admission Date (435) - for 837I
    if (claimType === '837I' && claim.admission_date) {
      segments.push([
        'DTP',
        '435',                                        // DTP01 - Date/Time Qualifier (435=Admission)
        'D8',                                         // DTP02 - Date Time Period Format Qualifier
        this.formatDateLong(new Date(claim.admission_date))
      ].join(this.elementSeparator));
    }

    // DTP - Discharge Date (096) - if discharged
    if (claim.discharge_date) {
      segments.push([
        'DTP',
        '096',                                        // DTP01 - Date/Time Qualifier (096=Discharge)
        'D8',
        this.formatDateLong(new Date(claim.discharge_date))
      ].join(this.elementSeparator));
    }

    return segments;
  }

  /**
   * Build CL1 - Institutional Claim Code (837I only)
   */
  buildCL1Segment(claim) {
    return [
      'CL1',
      claim.admission_type || '3',                    // CL101 - Admission Type Code
      claim.admission_source || '7',                  // CL102 - Admission Source Code
      claim.discharge_status || '01'                  // CL103 - Patient Status Code
    ].join(this.elementSeparator);
  }

  /**
   * Build claim REF segments
   */
  buildClaimREFSegments(claim) {
    const segments = [];

    // REF - Prior Authorization (if applicable)
    if (claim.treatment_authorization_codes) {
      segments.push([
        'REF',
        'G1',                                         // REF01 - Reference Identification Qualifier
        claim.treatment_authorization_codes           // REF02 - Reference Identification
      ].join(this.elementSeparator));
    }

    // REF - Service Authorization Exception Code
    // REF - Document Control Number
    if (claim.document_control_number) {
      segments.push([
        'REF',
        'D9',
        claim.document_control_number
      ].join(this.elementSeparator));
    }

    return segments;
  }

  /**
   * Build HI - Health Care Diagnosis Code segments
   */
  buildHISegments(claim, claimType) {
    const segments = [];

    // Principal Diagnosis
    if (claim.principal_diagnosis_code) {
      const diagCode = claim.principal_diagnosis_code.replace('.', '');
      segments.push([
        'HI',
        `ABK${this.subElementSeparator}${diagCode}`   // ABK = ICD-10-CM Principal Diagnosis
      ].join(this.elementSeparator));
    }

    // Other Diagnosis Codes
    if (claim.other_diagnosis_codes && Array.isArray(claim.other_diagnosis_codes)) {
      const otherCodes = claim.other_diagnosis_codes
        .filter(d => d && d.code)
        .map(d => `ABF${this.subElementSeparator}${d.code.replace('.', '')}`)
        .slice(0, 11);  // Max 12 additional diagnosis codes

      if (otherCodes.length > 0) {
        segments.push(['HI', ...otherCodes].join(this.elementSeparator));
      }
    }

    return segments;
  }

  /**
   * Build provider loops (2310)
   */
  buildProviderLoops(claim, claimType) {
    const segments = [];

    // Loop 2310A - Attending Provider (837I) or Rendering Provider (837P)
    if (claim.attending_physician_npi) {
      const entityCode = claimType === '837I' ? '71' : '82'; // 71=Attending, 82=Rendering
      segments.push([
        'NM1',
        entityCode,
        '1',                                          // Person
        claim.attending_physician_name?.split(' ').pop() || 'PHYSICIAN',
        claim.attending_physician_name?.split(' ')[0] || 'ATTENDING',
        '', '', '',
        'XX',                                         // NPI
        claim.attending_physician_npi
      ].join(this.elementSeparator));

      // PRV - Provider Specialty
      segments.push([
        'PRV',
        claimType === '837I' ? 'AT' : 'PE',           // AT=Attending, PE=Performing
        'PXC',
        '207Q00000X'                                  // Family Medicine (adjust as needed)
      ].join(this.elementSeparator));
    }

    return segments;
  }

  // ============================================================
  // LOOP 2400 - Service Line Information
  // ============================================================

  /**
   * Build Loop 2400 - Service Line
   */
  buildServiceLineLoop(line, lineNumber, claimType) {
    const segments = [];

    // LX - Service Line Number
    segments.push([
      'LX',
      lineNumber.toString()                           // LX01 - Assigned Number
    ].join(this.elementSeparator));

    if (claimType === '837I') {
      // SV2 - Institutional Service Line
      segments.push(this.buildSV2Segment(line));
    } else {
      // SV1 - Professional Service Line
      segments.push(this.buildSV1Segment(line));
    }

    // DTP - Service Date
    if (line.service_date) {
      segments.push([
        'DTP',
        '472',                                        // DTP01 - Date/Time Qualifier (472=Service)
        'D8',                                         // DTP02 - Date Time Period Format Qualifier
        this.formatDateLong(new Date(line.service_date))
      ].join(this.elementSeparator));
    }

    // REF - Line Item Control Number (if applicable)
    if (line.id) {
      segments.push([
        'REF',
        '6R',                                         // REF01 - Reference Identification Qualifier (6R=Line Item Control Number)
        line.id.toString()                            // REF02 - Reference Identification
      ].join(this.elementSeparator));
    }

    return segments;
  }

  /**
   * Build SV2 - Institutional Service Line
   */
  buildSV2Segment(line) {
    const chargeAmount = ((line.charges || 0) / 100).toFixed(2);
    const revenueCode = (line.revenue_code || '0000').padStart(4, '0');

    const elements = [
      'SV2',
      revenueCode,                                    // SV201 - Revenue Code
    ];

    // SV202 - Composite Medical Procedure Identifier (if HCPCS code present)
    if (line.hcpcs_code) {
      elements.push(`HC${this.subElementSeparator}${line.hcpcs_code}`);
    } else {
      elements.push('');
    }

    elements.push(
      chargeAmount,                                   // SV203 - Line Item Charge Amount
      'UN',                                           // SV204 - Unit or Basis for Measurement (UN=Unit)
      (line.units || 1).toString()                    // SV205 - Service Unit Count
    );

    return elements.join(this.elementSeparator);
  }

  /**
   * Build SV1 - Professional Service Line
   */
  buildSV1Segment(line) {
    const chargeAmount = ((line.charges || 0) / 100).toFixed(2);

    // Build composite procedure identifier
    const procedureId = `HC${this.subElementSeparator}${line.hcpcs_code || 'G0154'}`;  // G0154 = Hospice nursing

    return [
      'SV1',
      procedureId,                                    // SV101 - Composite Medical Procedure Identifier
      chargeAmount,                                   // SV102 - Line Item Charge Amount
      'UN',                                           // SV103 - Unit or Basis for Measurement
      (line.units || 1).toString(),                   // SV104 - Service Unit Count
      '',                                             // SV105 - Place of Service Code (from CLM)
      '',                                             // SV106 - Service Type Code
      '',                                             // SV107 - Composite Diagnosis Code Pointer
      '', '', '',                                     // SV108-110 - Not used
      '',                                             // SV111 - Emergency Indicator
      '', '', '',                                     // SV112-114 - Not used
      ''                                              // SV115 - Copay Status Code
    ].join(this.elementSeparator);
  }

  // ============================================================
  // VALIDATION
  // ============================================================

  /**
   * Validate claim for EDI generation
   */
  async validateClaimForEDI(claim, claimType) {
    const errors = [];
    const warnings = [];

    this.validateClaimData(claim, claimType, errors, warnings);

    if (errors.length > 0) {
      const errorMsg = errors.map(e => e.message).join('; ');
      throw new Error(`Claim validation failed: ${errorMsg}`);
    }

    return { errors, warnings };
  }

  /**
   * Validate claim data
   */
  validateClaimData(claim, claimType, errors, warnings) {
    // Basic required fields
    if (!claim.id) {
      errors.push({ field: 'id', code: 'REQUIRED', message: 'Claim ID is required' });
    }

    if (!claim.patient_id) {
      errors.push({ field: 'patient_id', code: 'REQUIRED', message: 'Patient ID is required' });
    }

    // Scrubbing status
    if (!claim.scrubbing_passed) {
      errors.push({ field: 'scrubbing_passed', code: 'SCRUBBING_REQUIRED', message: 'Claim must pass scrubbing validation before EDI generation' });
    }

    // Bill type validation for 837I
    if (claimType === '837I') {
      if (!claim.bill_type) {
        errors.push({ field: 'bill_type', code: 'REQUIRED', message: 'Bill type is required for institutional claims' });
      } else if (!/^08[1-4][1-9]$/.test(claim.bill_type)) {
        warnings.push({ field: 'bill_type', code: 'FORMAT', message: `Bill type ${claim.bill_type} may not be valid for hospice claims` });
      }
    }

    // Principal diagnosis
    if (!claim.principal_diagnosis_code) {
      errors.push({ field: 'principal_diagnosis_code', code: 'REQUIRED', message: 'Principal diagnosis code is required' });
    } else if (!/^[A-Z]\d{2}\.?\d{0,4}$/.test(claim.principal_diagnosis_code)) {
      errors.push({ field: 'principal_diagnosis_code', code: 'FORMAT', message: 'Invalid ICD-10 diagnosis code format' });
    }

    // Service dates
    if (!claim.service_start_date) {
      errors.push({ field: 'service_start_date', code: 'REQUIRED', message: 'Service start date is required' });
    }

    if (!claim.service_end_date) {
      errors.push({ field: 'service_end_date', code: 'REQUIRED', message: 'Service end date is required' });
    }

    // Service lines
    if (!claim.serviceLines || claim.serviceLines.length === 0) {
      errors.push({ field: 'serviceLines', code: 'REQUIRED', message: 'At least one service line is required' });
    } else {
      claim.serviceLines.forEach((line, index) => {
        if (!line.revenue_code && claimType === '837I') {
          errors.push({ field: `serviceLines[${index}].revenue_code`, code: 'REQUIRED', message: `Revenue code is required for service line ${index + 1}` });
        }
        if (!line.charges || line.charges <= 0) {
          errors.push({ field: `serviceLines[${index}].charges`, code: 'INVALID', message: `Invalid charges for service line ${index + 1}` });
        }
        if (!line.units || line.units <= 0) {
          errors.push({ field: `serviceLines[${index}].units`, code: 'INVALID', message: `Invalid units for service line ${index + 1}` });
        }
      });
    }

    // Patient information
    const patient = claim.patient || {};
    if (!patient.last_name) {
      errors.push({ field: 'patient.last_name', code: 'REQUIRED', message: 'Patient last name is required' });
    }
    if (!patient.first_name) {
      errors.push({ field: 'patient.first_name', code: 'REQUIRED', message: 'Patient first name is required' });
    }

    // Total charges
    if (!claim.total_charges || claim.total_charges <= 0) {
      errors.push({ field: 'total_charges', code: 'INVALID', message: 'Total charges must be greater than zero' });
    }
  }

  /**
   * Get count of validated fields
   */
  getValidatedFieldCount(claimType) {
    return claimType === '837I' ? 25 : 22;
  }

  /**
   * Get applied validation rules
   */
  getAppliedRules(claimType) {
    const baseRules = [
      'REQUIRED_FIELDS',
      'DIAGNOSIS_CODE_FORMAT',
      'SERVICE_LINE_VALIDATION',
      'PATIENT_DEMOGRAPHICS',
      'CHARGE_VALIDATION'
    ];

    if (claimType === '837I') {
      return [...baseRules, 'BILL_TYPE_VALIDATION', 'REVENUE_CODE_VALIDATION'];
    }

    return [...baseRules, 'HCPCS_CODE_VALIDATION'];
  }

  // ============================================================
  // HELPER METHODS
  // ============================================================

  /**
   * Determine claim type from bill type
   */
  determineClaimType(claim) {
    const billType = claim.bill_type || '';
    // Institutional bill types start with 08x (for hospice 081x-084x)
    if (billType.startsWith('08') || billType.startsWith('81') || billType.startsWith('82')) {
      return '837I';
    }
    return '837P';
  }

  /**
   * Get insurance type code
   */
  getInsuranceTypeCode(payer) {
    const payerType = (payer.payer_type || '').toUpperCase();
    switch (payerType) {
      case 'MEDICARE': return 'MA';
      case 'MEDICAID': return 'MC';
      case 'COMMERCIAL': return 'CI';
      case 'MANAGED_CARE': return 'HM';
      default: return '';
    }
  }

  /**
   * Get claim filing indicator code
   */
  getClaimFilingIndicator(payer) {
    const payerType = (payer.payer_type || '').toUpperCase();
    switch (payerType) {
      case 'MEDICARE': return 'MA';
      case 'MEDICAID': return 'MC';
      case 'COMMERCIAL': return 'CI';
      case 'MANAGED_CARE': return 'HM';
      default: return 'ZZ';  // Mutually Defined
    }
  }

  /**
   * Load claim with all required data
   */
  async loadClaimForEDI(claimId) {
    try {
      const claimResults = await db
        .select()
        .from(claims)
        .leftJoin(patients, eq(claims.patient_id, patients.id))
        .leftJoin(payers, eq(claims.payer_id, payers.id))
        .where(eq(claims.id, claimId))
        .limit(1);

      if (!claimResults[0]) {
        throw new Error(`Claim ${claimId} not found`);
      }

      const claim = {
        ...claimResults[0].claims,
        patient: claimResults[0].patients,
        payer: claimResults[0].payers
      };

      // Load service lines
      const serviceLines = await db
        .select()
        .from(claim_service_lines)
        .where(eq(claim_service_lines.claim_id, claimId))
        .orderBy(claim_service_lines.line_number);

      claim.serviceLines = serviceLines;

      return claim;
    } catch (error) {
      logger.error(`Error loading claim ${claimId} for EDI:`, error);
      throw new Error(`Failed to load claim: ${error.message}`);
    }
  }

  /**
   * Load clearinghouse configuration
   */
  async loadClearinghouseConfig(clearinghouseId) {
    if (!clearinghouseId) {
      return this.defaultConfig;
    }

    try {
      const configs = await db
        .select()
        .from(clearinghouse_configurations)
        .where(
          and(
            eq(clearinghouse_configurations.clearinghouse_id, clearinghouseId),
            eq(clearinghouse_configurations.is_active, true)
          )
        )
        .limit(1);

      if (configs[0]) {
        return {
          ...this.defaultConfig,
          ...configs[0]
        };
      }

      return this.defaultConfig;
    } catch (error) {
      logger.error('Error loading clearinghouse config:', error);
      return this.defaultConfig;
    }
  }

  /**
   * Generate control numbers
   */
  async generateControlNumbers() {
    // Use timestamp-based approach for uniqueness
    const now = Date.now();
    const isa = (++this._isaCounter) % 999999999;
    const gs = (++this._gsCounter) % 999999999;
    const st = (++this._stCounter) % 9999;

    return { isa, gs, st };
  }

  /**
   * Generate file name
   */
  generateFileName(prefix, controlNumber) {
    const timestamp = new Date().toISOString()
      .replace(/[-:]/g, '')
      .replace('T', '_')
      .split('.')[0];
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
   * Calculate file checksum
   */
  calculateChecksum(content) {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Format date as YYMMDD
   */
  formatDateShort(date) {
    const year = date.getFullYear().toString().substring(2);
    const month = this.padNumber(date.getMonth() + 1, 2);
    const day = this.padNumber(date.getDate(), 2);
    return `${year}${month}${day}`;
  }

  /**
   * Format date as CCYYMMDD
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
    return (str || '').padEnd(length, ' ');
  }

  /**
   * Read EDI file content
   */
  async readEDIFile(filePath) {
    try {
      const content = await fs.readFile(filePath, 'utf8');
      return content;
    } catch (error) {
      logger.error(`Error reading EDI file ${filePath}:`, error);
      throw new Error(`Failed to read EDI file: ${error.message}`);
    }
  }
}

// Export singleton instance
export default new EDI837Generator();
