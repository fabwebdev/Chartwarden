import { db } from '../db/index.js';
import { claims, claim_service_lines } from '../db/schemas/billing.schema.js';
import { claim_validation_results } from '../db/schemas/clearinghouse.schema.js';
import { eq, and, sql } from 'drizzle-orm';
import ClaimValidationRulesService from './ClaimValidationRules.service.js';

import { logger } from '../utils/logger.js';
/**
 * Claim Scrubber Service
 * Phase 2B/3B - Claim Scrubbing System
 *
 * Purpose: Comprehensive pre-submission claim validation with 50+ rules
 * Features:
 *   - Required field validation
 *   - Format validation (NPI, bill type, diagnosis codes)
 *   - Range validation (units, charges, discharge status)
 *   - Cross-field validation (date sequences, value code requirements)
 *   - Service line validation
 *   - Data quality checks
 *   - Auto-fix capability for common errors
 *   - HIPAA 837I compliance validation (NEW)
 *   - Coverage requirement validation (NEW)
 *   - Coding standard validation (NEW)
 */
class ClaimScrubber {
  constructor() {
    this.validatorVersion = '3.0';

    // Required fields configuration
    this.requiredFields = {
      claim: [
        'bill_type',
        'statement_from_date',
        'statement_to_date',
        'admission_date',
        'principal_diagnosis_code',
        'attending_physician_npi',
        'attending_physician_name',
        'patient_id'
      ],
      serviceLine: [
        'revenue_code',
        'service_date',
        'units',
        'charges'
      ]
    };

    // Format validation rules
    this.formatRules = {
      npi: /^\d{10}$/,
      billType: /^8[12][0-9]$/, // Hospice bill types 81x or 82x
      diagnosisCode: /^[A-Z]\d{2}(\.\d{1,4})?$/, // ICD-10
      zipCode: /^\d{5}(-\d{4})?$/,
      date: /^\d{4}-\d{2}-\d{2}$/,
      revenueCode: /^\d{4}$/
    };

    // Range validation rules
    this.rangeRules = {
      units: { min: 0, max: 365 },
      charges: { min: 0, max: 100000000 }, // cents
      admissionHour: { min: 0, max: 23 },
      dischargeStatus: ['01', '02', '20', '30', '40', '41', '42', '43', '50', '51', '61', '62', '63', '64', '65', '66']
    };
  }

  /**
   * Main scrubbing method - Validates claim against all rules
   * @param {number} claimId - Claim ID to scrub
   * @param {object} options - Scrubbing options
   * @param {boolean} options.comprehensiveValidation - Run full HIPAA/coverage/coding validation (default: true)
   * @returns {Promise<object>} Validation results
   */
  async scrubClaim(claimId, options = { comprehensiveValidation: true }) {
    const results = {
      claimId,
      validationDate: new Date(),
      validationType: options.comprehensiveValidation ? 'COMPREHENSIVE' : 'BASIC',
      passed: true,
      errors: [],
      warnings: [],
      corrections: [],
      fieldsValidated: 0,
      fieldsPassed: 0,
      fieldsFailed: 0,
      // New comprehensive validation result categories
      hipaa837Errors: [],
      coverageErrors: [],
      codingErrors: [],
      validationSummary: {}
    };

    try {
      // 1. Load claim with all relationships
      const claim = await this.loadClaimWithDetails(claimId);

      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }

      // 2. Required fields validation (basic)
      const requiredErrors = this.validateRequiredFields(claim);
      results.errors.push(...requiredErrors);

      // 3. Format validation (basic)
      const formatErrors = this.validateFormats(claim);
      results.errors.push(...formatErrors);

      // 4. Range validation (basic)
      const rangeErrors = this.validateRanges(claim);
      results.errors.push(...rangeErrors);

      // 5. Cross-field validation (basic)
      const crossFieldErrors = this.validateCrossFields(claim);
      results.errors.push(...crossFieldErrors);

      // 6. Service line validation (basic)
      for (const line of claim.serviceLines || []) {
        const lineErrors = this.validateServiceLine(line);
        results.errors.push(...lineErrors);
      }

      // 7. Data quality checks (warnings)
      const qualityWarnings = this.checkDataQuality(claim);
      results.warnings.push(...qualityWarnings);

      // 8. Run comprehensive HIPAA 837 / Coverage / Coding validation
      if (options.comprehensiveValidation) {
        try {
          const comprehensiveResults = await ClaimValidationRulesService.validateClaim(claimId);

          // Add comprehensive validation results
          results.hipaa837Errors = comprehensiveResults.hipaa837Errors || [];
          results.coverageErrors = comprehensiveResults.coverageErrors || [];
          results.codingErrors = comprehensiveResults.codingErrors || [];

          // Merge errors (avoid duplicates based on field+code)
          const existingErrorKeys = new Set(results.errors.map(e => `${e.field}:${e.code}`));

          for (const error of [...results.hipaa837Errors, ...results.coverageErrors, ...results.codingErrors]) {
            const key = `${error.field}:${error.code}`;
            if (!existingErrorKeys.has(key)) {
              results.errors.push(error);
              existingErrorKeys.add(key);
            }
          }

          // Merge warnings
          const existingWarningKeys = new Set(results.warnings.map(w => `${w.field}:${w.code}`));
          for (const warning of comprehensiveResults.warnings || []) {
            const key = `${warning.field}:${warning.code}`;
            if (!existingWarningKeys.has(key)) {
              results.warnings.push(warning);
              existingWarningKeys.add(key);
            }
          }

          // Add comprehensive corrections
          results.corrections.push(...(comprehensiveResults.corrections || []));

          // Store validation summary
          results.validationSummary = comprehensiveResults.summary;
        } catch (comprehensiveError) {
          logger.error(`Comprehensive validation error for claim ${claimId}:`, comprehensiveError);
          // Add as warning, don't fail the whole scrub
          results.warnings.push({
            field: 'comprehensive_validation',
            code: 'COMPREHENSIVE_VALIDATION_ERROR',
            severity: 'WARNING',
            message: `Comprehensive validation partially failed: ${comprehensiveError.message}`,
            currentValue: null,
            suggestion: 'Some advanced validation rules may not have been applied'
          });
        }
      }

      // 9. Generate auto-fix suggestions (combine with comprehensive corrections)
      const basicCorrections = this.generateCorrections(results.errors.concat(results.warnings));
      // Merge corrections, avoiding duplicates
      const existingCorrectionKeys = new Set(results.corrections.map(c => `${c.field}:${c.code || c.action}`));
      for (const correction of basicCorrections) {
        const key = `${correction.field}:${correction.code || correction.action || 'fix'}`;
        if (!existingCorrectionKeys.has(key)) {
          results.corrections.push(correction);
          existingCorrectionKeys.add(key);
        }
      }

      // 10. Calculate summary
      results.fieldsValidated = this.countValidatedFields(claim) + (results.validationSummary.totalRulesApplied || 0);
      results.fieldsFailed = results.errors.length;
      results.fieldsPassed = results.fieldsValidated - results.fieldsFailed;
      results.passed = results.errors.length === 0;

      // 11. Save validation results to database
      await this.saveValidationResults(results);

      // 12. Update claim scrubbing status
      await db.update(claims)
        .set({
          scrubbing_status: results.passed ? 'PASSED' : 'FAILED',
          last_scrubbed_at: new Date(),
          scrubbing_passed: results.passed,
          submission_ready: results.passed,
          submission_blocked_reasons: results.passed ? null : results.errors.map(e => e.message)
        })
        .where(eq(claims.id, claimId));

      return results;
    } catch (error) {
      logger.error(`Error scrubbing claim ${claimId}:`, error)
      throw new Error(`Claim scrubbing failed: ${error.message}`);
    }
  }

  /**
   * Validate required fields on claim
   * @param {object} claim - Claim object
   * @returns {Array} Validation errors
   */
  validateRequiredFields(claim) {
    const errors = [];

    for (const field of this.requiredFields.claim) {
      if (!claim[field]) {
        errors.push({
          field,
          code: 'REQUIRED_FIELD_MISSING',
          severity: 'ERROR',
          message: `Required field '${field}' is missing`,
          currentValue: null,
          suggestion: `Provide a value for ${field}`,
          rule: 'REQUIRED'
        });
      }
    }

    return errors;
  }

  /**
   * Validate field formats
   * @param {object} claim - Claim object
   * @returns {Array} Validation errors
   */
  validateFormats(claim) {
    const errors = [];

    // NPI format
    if (claim.attending_physician_npi && !this.formatRules.npi.test(claim.attending_physician_npi)) {
      errors.push({
        field: 'attending_physician_npi',
        code: 'INVALID_FORMAT',
        severity: 'ERROR',
        message: 'NPI must be exactly 10 digits',
        currentValue: claim.attending_physician_npi,
        suggestion: `Pad with leading zeros: ${claim.attending_physician_npi.padStart(10, '0')}`,
        rule: 'FORMAT_NPI'
      });
    }

    // Bill type format
    if (claim.bill_type && !this.formatRules.billType.test(claim.bill_type)) {
      errors.push({
        field: 'bill_type',
        code: 'INVALID_FORMAT',
        severity: 'ERROR',
        message: 'Bill type must be 81x or 82x for hospice',
        currentValue: claim.bill_type,
        suggestion: 'Use 811, 812, 821, etc.',
        rule: 'FORMAT_BILL_TYPE'
      });
    }

    // Diagnosis code format (ICD-10)
    if (claim.principal_diagnosis_code && !this.formatRules.diagnosisCode.test(claim.principal_diagnosis_code)) {
      errors.push({
        field: 'principal_diagnosis_code',
        code: 'INVALID_FORMAT',
        severity: 'ERROR',
        message: 'Diagnosis code must be valid ICD-10 format',
        currentValue: claim.principal_diagnosis_code,
        suggestion: 'Use format: A00 or A00.0',
        rule: 'FORMAT_ICD10'
      });
    }

    return errors;
  }

  /**
   * Validate ranges
   * @param {object} claim - Claim object
   * @returns {Array} Validation errors
   */
  validateRanges(claim) {
    const errors = [];

    // Discharge status
    if (claim.discharge_status && !this.rangeRules.dischargeStatus.includes(claim.discharge_status)) {
      errors.push({
        field: 'discharge_status',
        code: 'INVALID_VALUE',
        severity: 'ERROR',
        message: 'Invalid discharge status code',
        currentValue: claim.discharge_status,
        suggestion: `Must be one of: ${this.rangeRules.dischargeStatus.join(', ')}`,
        rule: 'RANGE_DISCHARGE_STATUS'
      });
    }

    return errors;
  }

  /**
   * Validate cross-field relationships
   * @param {object} claim - Claim object
   * @returns {Array} Validation errors
   */
  validateCrossFields(claim) {
    const errors = [];

    // Date sequence validation - admission date vs statement from date
    if (claim.admission_date && claim.statement_from_date) {
      const admissionDate = new Date(claim.admission_date);
      const statementFrom = new Date(claim.statement_from_date);

      if (admissionDate > statementFrom) {
        errors.push({
          field: 'admission_date',
          code: 'INVALID_DATE_SEQUENCE',
          severity: 'ERROR',
          message: 'Admission date cannot be after statement from date',
          currentValue: claim.admission_date,
          suggestion: `Should be <= ${claim.statement_from_date}`,
          rule: 'CROSS_DATE_SEQUENCE'
        });
      }
    }

    // Statement from/to date sequence
    if (claim.statement_from_date && claim.statement_to_date) {
      const fromDate = new Date(claim.statement_from_date);
      const toDate = new Date(claim.statement_to_date);

      if (fromDate > toDate) {
        errors.push({
          field: 'statement_from_date',
          code: 'INVALID_DATE_SEQUENCE',
          severity: 'ERROR',
          message: 'Statement from date cannot be after statement to date',
          currentValue: claim.statement_from_date,
          suggestion: `Should be <= ${claim.statement_to_date}`,
          rule: 'CROSS_STATEMENT_DATES'
        });
      }
    }

    // Value code requirements
    const valueCodes = claim.value_codes || [];
    const serviceLines = claim.serviceLines || [];

    const hasRhcChc = serviceLines.some(l => l.revenue_code === '0651' || l.revenue_code === '0652');
    const hasGipIrc = serviceLines.some(l => l.revenue_code === '0655' || l.revenue_code === '0656');
    const hasValueCode61 = valueCodes.some(vc => vc.code === '61');
    const hasValueCodeG8 = valueCodes.some(vc => vc.code === 'G8');

    if (hasRhcChc && !hasValueCode61) {
      errors.push({
        field: 'value_codes',
        code: 'MISSING_VALUE_CODE',
        severity: 'ERROR',
        message: 'Value Code 61 (CBSA) required for routine/continuous home care',
        currentValue: null,
        suggestion: 'Run CBSA auto-populate or add Value Code 61 manually',
        rule: 'CROSS_VALUE_CODE_61'
      });
    }

    if (hasGipIrc && !hasValueCodeG8) {
      errors.push({
        field: 'value_codes',
        code: 'MISSING_VALUE_CODE',
        severity: 'ERROR',
        message: 'Value Code G8 (CBSA) required for inpatient care',
        currentValue: null,
        suggestion: 'Run CBSA auto-populate or add Value Code G8 manually',
        rule: 'CROSS_VALUE_CODE_G8'
      });
    }

    return errors;
  }

  /**
   * Validate service line
   * @param {object} line - Service line object
   * @returns {Array} Validation errors
   */
  validateServiceLine(line) {
    const errors = [];

    // Required fields
    for (const field of this.requiredFields.serviceLine) {
      if (!line[field]) {
        errors.push({
          field: `serviceLine.${line.line_number}.${field}`,
          code: 'REQUIRED_FIELD_MISSING',
          severity: 'ERROR',
          message: `Service line ${line.line_number}: Required field '${field}' is missing`,
          currentValue: null,
          suggestion: `Provide a value for ${field}`,
          rule: 'REQUIRED'
        });
      }
    }

    // Revenue code format
    if (line.revenue_code && !this.formatRules.revenueCode.test(line.revenue_code)) {
      errors.push({
        field: `serviceLine.${line.line_number}.revenue_code`,
        code: 'INVALID_FORMAT',
        severity: 'ERROR',
        message: `Service line ${line.line_number}: Revenue code must be 4 digits`,
        currentValue: line.revenue_code,
        suggestion: `Pad to 4 digits: ${line.revenue_code.padStart(4, '0')}`,
        rule: 'FORMAT_REVENUE_CODE'
      });
    }

    // Units range
    if (line.units !== undefined && line.units !== null) {
      if (line.units < this.rangeRules.units.min || line.units > this.rangeRules.units.max) {
        errors.push({
          field: `serviceLine.${line.line_number}.units`,
          code: 'OUT_OF_RANGE',
          severity: 'ERROR',
          message: `Service line ${line.line_number}: Units must be between ${this.rangeRules.units.min} and ${this.rangeRules.units.max}`,
          currentValue: line.units,
          suggestion: 'Verify units value',
          rule: 'RANGE_UNITS'
        });
      }
    }

    // Charges range
    if (line.charges !== undefined && line.charges !== null) {
      if (line.charges < this.rangeRules.charges.min || line.charges > this.rangeRules.charges.max) {
        errors.push({
          field: `serviceLine.${line.line_number}.charges`,
          code: 'OUT_OF_RANGE',
          severity: 'ERROR',
          message: `Service line ${line.line_number}: Charges out of valid range`,
          currentValue: line.charges,
          suggestion: 'Verify charges amount (in cents)',
          rule: 'RANGE_CHARGES'
        });
      }
    }

    // Revenue code specific validation
    if (line.revenue_code === '0652') {
      // Continuous home care requires minimum 8 units
      if (line.units < 8) {
        errors.push({
          field: `serviceLine.${line.line_number}.units`,
          code: 'INVALID_VALUE',
          severity: 'ERROR',
          message: `Service line ${line.line_number}: Continuous home care (0652) requires minimum 8 units`,
          currentValue: line.units,
          suggestion: 'Ensure minimum 8 hours of continuous care',
          rule: 'REVENUE_0652_UNITS'
        });
      }
    }

    if (line.revenue_code === '0655') {
      // Inpatient respite limited to 5 consecutive days
      if (line.units > 5) {
        errors.push({
          field: `serviceLine.${line.line_number}.units`,
          code: 'INVALID_VALUE',
          severity: 'WARNING',
          message: `Service line ${line.line_number}: Inpatient respite (0655) limited to 5 consecutive days`,
          currentValue: line.units,
          suggestion: 'Verify respite care duration',
          rule: 'REVENUE_0655_UNITS'
        });
      }
    }

    return errors;
  }

  /**
   * Check data quality (warnings)
   * @param {object} claim - Claim object
   * @returns {Array} Warning objects
   */
  checkDataQuality(claim) {
    const warnings = [];

    // Trailing whitespace
    const stringFields = ['attending_physician_name'];
    for (const field of stringFields) {
      if (claim[field] && claim[field] !== claim[field].trim()) {
        warnings.push({
          field,
          code: 'TRAILING_WHITESPACE',
          severity: 'WARNING',
          message: `Field '${field}' has leading/trailing whitespace`,
          currentValue: claim[field],
          suggestion: 'Trim whitespace',
          rule: 'QUALITY_WHITESPACE'
        });
      }
    }

    // Uppercase codes
    if (claim.principal_diagnosis_code && claim.principal_diagnosis_code !== claim.principal_diagnosis_code.toUpperCase()) {
      warnings.push({
        field: 'principal_diagnosis_code',
        code: 'MIXED_CASE',
        severity: 'WARNING',
        message: 'Diagnosis code should be uppercase',
        currentValue: claim.principal_diagnosis_code,
        suggestion: claim.principal_diagnosis_code.toUpperCase(),
        rule: 'QUALITY_UPPERCASE'
      });
    }

    return warnings;
  }

  /**
   * Generate auto-fix corrections
   * @param {Array} issues - Array of errors and warnings
   * @returns {Array} Correction objects
   */
  generateCorrections(issues) {
    const corrections = [];

    for (const issue of issues) {
      let autoFixable = false;
      let newValue = null;

      switch (issue.code) {
        case 'INVALID_FORMAT':
          if (issue.field === 'attending_physician_npi') {
            autoFixable = true;
            newValue = issue.currentValue.padStart(10, '0');
          }
          if (issue.field.includes('revenue_code')) {
            autoFixable = true;
            newValue = issue.currentValue.padStart(4, '0');
          }
          break;

        case 'TRAILING_WHITESPACE':
          autoFixable = true;
          newValue = issue.currentValue.trim();
          break;

        case 'MIXED_CASE':
          autoFixable = true;
          newValue = issue.currentValue.toUpperCase();
          break;
      }

      if (autoFixable) {
        corrections.push({
          field: issue.field,
          oldValue: issue.currentValue,
          newValue,
          reason: issue.message,
          autoFixable: true
        });
      }
    }

    return corrections;
  }

  /**
   * Auto-fix claim errors
   * @param {number} claimId - Claim ID
   * @returns {Promise<object>} Auto-fix results
   */
  async autoFix(claimId) {
    try {
      // 1. Scrub claim to get errors
      const scrubbingResults = await this.scrubClaim(claimId);

      // 2. Filter auto-fixable corrections
      const fixableCorrections = scrubbingResults.corrections.filter(c => c.autoFixable);

      if (fixableCorrections.length === 0) {
        return {
          claimId,
          correctionsApplied: [],
          errorsRemaining: scrubbingResults.errors.length
        };
      }

      // 3. Apply corrections
      const claim = await this.loadClaimWithDetails(claimId);

      for (const correction of fixableCorrections) {
        const field = correction.field;

        // Handle service line fields
        if (field.startsWith('serviceLine.')) {
          const parts = field.split('.');
          const lineNumber = parseInt(parts[1]);
          const fieldName = parts[2];

          const line = claim.serviceLines.find(l => l.line_number === lineNumber);
          if (line) {
            await db.update(claim_service_lines)
              .set({ [fieldName]: correction.newValue })
              .where(eq(claim_service_lines.id, line.id));
          }
        } else {
          // Handle claim-level fields
          await db.update(claims)
            .set({ [field]: correction.newValue })
            .where(eq(claims.id, claimId));
        }
      }

      // 4. Re-scrub to verify fixes
      const updatedResults = await this.scrubClaim(claimId);

      // 5. Update claim status
      await db.update(claims)
        .set({
          scrubbing_status: 'CORRECTED',
          last_scrubbed_at: new Date()
        })
        .where(eq(claims.id, claimId));

      return {
        claimId,
        correctionsApplied: fixableCorrections,
        errorsRemaining: updatedResults.errors.length
      };
    } catch (error) {
      logger.error(`Error auto-fixing claim ${claimId}:`, error)
      throw new Error(`Auto-fix failed: ${error.message}`);
    }
  }

  /**
   * Get latest validation results for claim
   * @param {number} claimId - Claim ID
   * @returns {Promise<object|null>} Latest validation results
   */
  async getLatestValidationResults(claimId) {
    try {
      const results = await db
        .select()
        .from(claim_validation_results)
        .where(eq(claim_validation_results.claim_id, claimId))
        .orderBy(sql`${claim_validation_results.validation_date} DESC`)
        .limit(1);

      return results[0] || null;
    } catch (error) {
      logger.error(`Error getting validation results for claim ${claimId}:`, error)
      throw new Error(`Failed to retrieve validation results: ${error.message}`);
    }
  }

  /**
   * Get validation history for claim
   * @param {number} claimId - Claim ID
   * @param {number} limit - Number of records to return
   * @returns {Promise<Array>} Validation history
   */
  async getValidationHistory(claimId, limit = 10) {
    try {
      const results = await db
        .select()
        .from(claim_validation_results)
        .where(eq(claim_validation_results.claim_id, claimId))
        .orderBy(sql`${claim_validation_results.validation_date} DESC`)
        .limit(limit);

      return results;
    } catch (error) {
      logger.error(`Error getting validation history for claim ${claimId}:`, error)
      throw new Error(`Failed to retrieve validation history: ${error.message}`);
    }
  }

  /**
   * Get all claims failing validation
   * @param {object} filters - Filter options
   * @returns {Promise<Array>} Claims failing validation
   */
  async getFailingClaims(filters = {}) {
    try {
      const { payer_id, date_from } = filters;

      let query = db
        .select()
        .from(claims)
        .where(eq(claims.scrubbing_passed, false));

      if (payer_id) {
        query = query.where(eq(claims.payer_id, payer_id));
      }

      if (date_from) {
        query = query.where(sql`${claims.service_start_date} >= ${date_from}`);
      }

      const failingClaims = await query;

      return failingClaims;
    } catch (error) {
      logger.error('Error getting failing claims:', error)
      throw new Error(`Failed to retrieve failing claims: ${error.message}`);
    }
  }

  /**
   * Batch scrub claims
   * @param {Array<number>} claimIds - Array of claim IDs
   * @param {boolean} autoFix - Whether to auto-fix errors
   * @returns {Promise<object>} Batch scrub results
   */
  async batchScrub(claimIds, autoFix = false) {
    const startTime = Date.now();
    let processed = 0;
    let passed = 0;
    let failed = 0;
    let autoFixed = 0;

    try {
      for (const claimId of claimIds) {
        try {
          // Scrub the claim
          const results = await this.scrubClaim(claimId);
          processed++;

          if (results.passed) {
            passed++;
          } else {
            failed++;

            // Auto-fix if requested
            if (autoFix) {
              const fixResults = await this.autoFix(claimId);
              if (fixResults.errorsRemaining === 0) {
                autoFixed++;
              }
            }
          }
        } catch (error) {
          logger.error(`Error scrubbing claim ${claimId}:`, error)
          failed++;
        }
      }

      const duration = Date.now() - startTime;

      return {
        claimsProcessed: processed,
        claimsPassed: passed,
        claimsFailed: failed,
        autoFixedCount: autoFixed,
        processingTimeMs: duration
      };
    } catch (error) {
      logger.error('Error in batch scrub:', error)
      throw new Error(`Batch scrub failed: ${error.message}`);
    }
  }

  /**
   * Save validation results to database
   * @param {object} results - Validation results
   * @private
   */
  async saveValidationResults(results) {
    try {
      await db.insert(claim_validation_results).values({
        claim_id: results.claimId,
        validation_date: results.validationDate,
        validation_type: results.validationType,
        passed: results.passed,
        errors: results.errors,
        warnings: results.warnings,
        fields_validated: results.fieldsValidated,
        fields_passed: results.fieldsPassed,
        fields_failed: results.fieldsFailed,
        data_corrections: results.corrections,
        auto_fixed: false,
        validator_version: this.validatorVersion,
        rules_applied: this.getRuleNames()
      });
    } catch (error) {
      logger.error('Error saving validation results:', error)
      // Don't throw - allow scrubbing to continue even if saving fails
    }
  }

  /**
   * Load claim with all details
   * @param {number} claimId - Claim ID
   * @returns {Promise<object>} Claim with service lines
   * @private
   */
  async loadClaimWithDetails(claimId) {
    try {
      const claimResults = await db
        .select()
        .from(claims)
        .where(eq(claims.id, claimId))
        .limit(1);

      if (!claimResults[0]) {
        return null;
      }

      const claim = claimResults[0];

      // Load service lines
      const serviceLines = await db
        .select()
        .from(claim_service_lines)
        .where(eq(claim_service_lines.claim_id, claimId));

      claim.serviceLines = serviceLines;

      return claim;
    } catch (error) {
      logger.error(`Error loading claim ${claimId} with details:`, error)
      throw new Error(`Failed to load claim details: ${error.message}`);
    }
  }

  /**
   * Get all rule names
   * @returns {Array} Rule names
   * @private
   */
  getRuleNames() {
    return [
      'REQUIRED',
      'FORMAT_NPI',
      'FORMAT_BILL_TYPE',
      'FORMAT_ICD10',
      'FORMAT_REVENUE_CODE',
      'RANGE_UNITS',
      'RANGE_CHARGES',
      'RANGE_DISCHARGE_STATUS',
      'CROSS_DATE_SEQUENCE',
      'CROSS_STATEMENT_DATES',
      'CROSS_VALUE_CODE_61',
      'CROSS_VALUE_CODE_G8',
      'REVENUE_0652_UNITS',
      'REVENUE_0655_UNITS',
      'QUALITY_WHITESPACE',
      'QUALITY_UPPERCASE'
    ];
  }

  /**
   * Count validated fields
   * @param {object} claim - Claim object
   * @returns {number} Field count
   * @private
   */
  countValidatedFields(claim) {
    let count = this.requiredFields.claim.length;
    count += (claim.serviceLines || []).length * this.requiredFields.serviceLine.length;
    return count;
  }

  /**
   * Generate validation report for a single claim
   * @param {number} claimId - Claim ID
   * @param {object} options - Report options
   * @param {string} options.format - Report format: 'detailed', 'summary', 'csv'
   * @returns {Promise<object>} Validation report
   */
  async generateClaimReport(claimId, options = { format: 'detailed' }) {
    try {
      // Get latest validation results
      const validationResults = await this.getLatestValidationResults(claimId);
      const claim = await this.loadClaimWithDetails(claimId);

      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }

      const report = {
        reportDate: new Date(),
        reportType: 'CLAIM_VALIDATION',
        format: options.format,
        claimInfo: {
          claimId: claim.id,
          claimNumber: claim.claim_number,
          patientId: claim.patient_id,
          payerId: claim.payer_id,
          billType: claim.bill_type,
          statementPeriod: {
            from: claim.statement_from_date,
            to: claim.statement_to_date
          },
          totalCharges: claim.total_charges,
          scrubbingStatus: claim.scrubbing_status,
          submissionReady: claim.submission_ready
        }
      };

      if (validationResults) {
        report.validation = {
          lastValidationDate: validationResults.validation_date,
          validationType: validationResults.validation_type,
          validatorVersion: validationResults.validator_version,
          passed: validationResults.passed,
          fieldsValidated: validationResults.fields_validated,
          fieldsPassed: validationResults.fields_passed,
          fieldsFailed: validationResults.fields_failed
        };

        if (options.format === 'detailed') {
          report.errors = this.categorizeIssues(validationResults.errors || []);
          report.warnings = this.categorizeIssues(validationResults.warnings || []);
          report.corrections = validationResults.data_corrections || [];
        } else if (options.format === 'summary') {
          report.errorSummary = this.summarizeIssues(validationResults.errors || []);
          report.warningSummary = this.summarizeIssues(validationResults.warnings || []);
          report.autoFixableCount = (validationResults.data_corrections || []).filter(c => c.autoFixable).length;
        } else if (options.format === 'csv') {
          report.csvData = this.formatAsCSV(claim, validationResults);
        }
      } else {
        report.validation = null;
        report.message = 'No validation results found. Run scrubClaim() first.';
      }

      return report;
    } catch (error) {
      logger.error(`Error generating claim report for ${claimId}:`, error);
      throw new Error(`Report generation failed: ${error.message}`);
    }
  }

  /**
   * Generate batch validation report for multiple claims
   * @param {object} filters - Filter criteria
   * @param {string} filters.status - Filter by scrubbing status (PASSED, FAILED, PENDING)
   * @param {number} filters.payerId - Filter by payer
   * @param {string} filters.dateFrom - Filter by date range start
   * @param {string} filters.dateTo - Filter by date range end
   * @param {object} options - Report options
   * @returns {Promise<object>} Batch validation report
   */
  async generateBatchReport(filters = {}, options = { format: 'summary', limit: 100 }) {
    try {
      const startTime = Date.now();

      // Build query based on filters
      let query = db.select().from(claims);
      const conditions = [];

      if (filters.status) {
        conditions.push(eq(claims.scrubbing_status, filters.status));
      }

      if (filters.payerId) {
        conditions.push(eq(claims.payer_id, filters.payerId));
      }

      if (filters.dateFrom) {
        conditions.push(sql`${claims.statement_from_date} >= ${filters.dateFrom}`);
      }

      if (filters.dateTo) {
        conditions.push(sql`${claims.statement_to_date} <= ${filters.dateTo}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const claimsData = await query.limit(options.limit || 100);

      // Collect statistics
      const stats = {
        totalClaims: claimsData.length,
        passed: 0,
        failed: 0,
        pending: 0,
        notValidated: 0,
        totalCharges: 0,
        autoFixable: 0
      };

      const errorsByCategory = {
        hipaa837: {},
        coverage: {},
        coding: {},
        format: {},
        required: {},
        other: {}
      };

      const claimDetails = [];

      for (const claim of claimsData) {
        stats.totalCharges += claim.total_charges || 0;

        if (claim.scrubbing_status === 'PASSED') {
          stats.passed++;
        } else if (claim.scrubbing_status === 'FAILED') {
          stats.failed++;
        } else if (claim.scrubbing_status === 'PENDING') {
          stats.pending++;
        } else {
          stats.notValidated++;
        }

        // Get validation results for failed claims
        if (claim.scrubbing_status === 'FAILED' || options.includeAllDetails) {
          const validationResults = await this.getLatestValidationResults(claim.id);

          if (validationResults) {
            // Count auto-fixable
            const corrections = validationResults.data_corrections || [];
            if (corrections.some(c => c.autoFixable)) {
              stats.autoFixable++;
            }

            // Categorize errors
            for (const error of validationResults.errors || []) {
              const category = this.getErrorCategory(error.code);
              errorsByCategory[category][error.code] = (errorsByCategory[category][error.code] || 0) + 1;
            }

            if (options.format === 'detailed') {
              claimDetails.push({
                claimId: claim.id,
                claimNumber: claim.claim_number,
                status: claim.scrubbing_status,
                errorsCount: (validationResults.errors || []).length,
                warningsCount: (validationResults.warnings || []).length,
                autoFixable: corrections.filter(c => c.autoFixable).length,
                lastValidated: validationResults.validation_date
              });
            }
          }
        }
      }

      const processingTime = Date.now() - startTime;

      const report = {
        reportDate: new Date(),
        reportType: 'BATCH_VALIDATION',
        format: options.format,
        filters,
        statistics: stats,
        errorsByCategory: this.summarizeCategories(errorsByCategory),
        passRate: stats.totalClaims > 0 ? ((stats.passed / stats.totalClaims) * 100).toFixed(2) + '%' : 'N/A',
        processingTimeMs: processingTime
      };

      if (options.format === 'detailed') {
        report.claimDetails = claimDetails;
      }

      if (options.format === 'csv') {
        report.csvData = this.formatBatchAsCSV(claimsData, stats);
      }

      return report;
    } catch (error) {
      logger.error('Error generating batch report:', error);
      throw new Error(`Batch report generation failed: ${error.message}`);
    }
  }

  /**
   * Generate compliance report for auditing
   * @param {object} options - Report options
   * @returns {Promise<object>} Compliance report
   */
  async generateComplianceReport(options = { dateFrom: null, dateTo: null }) {
    try {
      const startTime = Date.now();

      // Get all validation results within date range
      let query = db.select().from(claim_validation_results);
      const conditions = [];

      if (options.dateFrom) {
        conditions.push(sql`${claim_validation_results.validation_date} >= ${options.dateFrom}`);
      }

      if (options.dateTo) {
        conditions.push(sql`${claim_validation_results.validation_date} <= ${options.dateTo}`);
      }

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      const validations = await query.orderBy(sql`${claim_validation_results.validation_date} DESC`);

      // Calculate compliance metrics
      const metrics = {
        totalValidations: validations.length,
        passedValidations: validations.filter(v => v.passed).length,
        failedValidations: validations.filter(v => !v.passed).length,
        uniqueClaims: new Set(validations.map(v => v.claim_id)).size,
        validatorVersions: [...new Set(validations.map(v => v.validator_version))],
        validationTypes: {}
      };

      // Count by validation type
      for (const v of validations) {
        metrics.validationTypes[v.validation_type] = (metrics.validationTypes[v.validation_type] || 0) + 1;
      }

      // Calculate error frequency
      const errorFrequency = {};
      for (const v of validations) {
        for (const error of v.errors || []) {
          errorFrequency[error.code] = (errorFrequency[error.code] || 0) + 1;
        }
      }

      // Get top 10 most common errors
      const topErrors = Object.entries(errorFrequency)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 10)
        .map(([code, count]) => ({ code, count, percentage: ((count / metrics.totalValidations) * 100).toFixed(2) + '%' }));

      // Calculate daily validation trend
      const dailyTrend = {};
      for (const v of validations) {
        const dateKey = new Date(v.validation_date).toISOString().split('T')[0];
        if (!dailyTrend[dateKey]) {
          dailyTrend[dateKey] = { total: 0, passed: 0, failed: 0 };
        }
        dailyTrend[dateKey].total++;
        if (v.passed) {
          dailyTrend[dateKey].passed++;
        } else {
          dailyTrend[dateKey].failed++;
        }
      }

      const processingTime = Date.now() - startTime;

      return {
        reportDate: new Date(),
        reportType: 'COMPLIANCE_AUDIT',
        dateRange: {
          from: options.dateFrom || 'All time',
          to: options.dateTo || 'Present'
        },
        metrics,
        complianceRate: metrics.totalValidations > 0
          ? ((metrics.passedValidations / metrics.totalValidations) * 100).toFixed(2) + '%'
          : 'N/A',
        topErrors,
        dailyTrend: Object.entries(dailyTrend).map(([date, data]) => ({
          date,
          ...data,
          passRate: ((data.passed / data.total) * 100).toFixed(2) + '%'
        })),
        processingTimeMs: processingTime
      };
    } catch (error) {
      logger.error('Error generating compliance report:', error);
      throw new Error(`Compliance report generation failed: ${error.message}`);
    }
  }

  /**
   * Generate error trend report
   * @param {object} options - Report options
   * @returns {Promise<object>} Error trend report
   */
  async generateErrorTrendReport(options = { days: 30 }) {
    try {
      const dateFrom = new Date();
      dateFrom.setDate(dateFrom.getDate() - options.days);

      const validations = await db
        .select()
        .from(claim_validation_results)
        .where(sql`${claim_validation_results.validation_date} >= ${dateFrom.toISOString()}`)
        .orderBy(sql`${claim_validation_results.validation_date} ASC`);

      // Track error codes by week
      const weeklyErrors = {};
      const errorTotals = {};

      for (const v of validations) {
        const weekKey = this.getWeekKey(new Date(v.validation_date));

        if (!weeklyErrors[weekKey]) {
          weeklyErrors[weekKey] = {};
        }

        for (const error of v.errors || []) {
          weeklyErrors[weekKey][error.code] = (weeklyErrors[weekKey][error.code] || 0) + 1;
          errorTotals[error.code] = (errorTotals[error.code] || 0) + 1;
        }
      }

      // Find trending errors (increasing over time)
      const weeks = Object.keys(weeklyErrors).sort();
      const trendingUp = [];
      const trendingDown = [];

      for (const errorCode of Object.keys(errorTotals)) {
        if (weeks.length >= 2) {
          const firstWeek = weeklyErrors[weeks[0]]?.[errorCode] || 0;
          const lastWeek = weeklyErrors[weeks[weeks.length - 1]]?.[errorCode] || 0;

          if (lastWeek > firstWeek * 1.2) {
            trendingUp.push({ code: errorCode, change: lastWeek - firstWeek, total: errorTotals[errorCode] });
          } else if (lastWeek < firstWeek * 0.8) {
            trendingDown.push({ code: errorCode, change: lastWeek - firstWeek, total: errorTotals[errorCode] });
          }
        }
      }

      return {
        reportDate: new Date(),
        reportType: 'ERROR_TREND',
        dateRange: {
          from: dateFrom.toISOString(),
          to: new Date().toISOString()
        },
        totalValidations: validations.length,
        weeklyBreakdown: Object.entries(weeklyErrors).map(([week, errors]) => ({
          week,
          totalErrors: Object.values(errors).reduce((a, b) => a + b, 0),
          uniqueErrorTypes: Object.keys(errors).length
        })),
        trendingUp: trendingUp.sort((a, b) => b.change - a.change).slice(0, 5),
        trendingDown: trendingDown.sort((a, b) => a.change - b.change).slice(0, 5),
        errorTotals: Object.entries(errorTotals)
          .sort((a, b) => b[1] - a[1])
          .slice(0, 20)
          .map(([code, count]) => ({ code, count }))
      };
    } catch (error) {
      logger.error('Error generating error trend report:', error);
      throw new Error(`Error trend report generation failed: ${error.message}`);
    }
  }

  /**
   * Helper: Categorize issues by type
   * @param {Array} issues - Array of issues
   * @returns {object} Categorized issues
   * @private
   */
  categorizeIssues(issues) {
    const categorized = {
      hipaa837: [],
      coverage: [],
      coding: [],
      format: [],
      required: [],
      range: [],
      crossField: [],
      quality: [],
      other: []
    };

    for (const issue of issues) {
      const category = this.getErrorCategory(issue.code);
      categorized[category].push(issue);
    }

    return categorized;
  }

  /**
   * Helper: Get error category from code
   * @param {string} code - Error code
   * @returns {string} Category name
   * @private
   */
  getErrorCategory(code) {
    if (!code) return 'other';
    if (code.startsWith('HIPAA_')) return 'hipaa837';
    if (code.startsWith('COVERAGE_')) return 'coverage';
    if (code.startsWith('CODING_')) return 'coding';
    if (code.includes('FORMAT') || code === 'INVALID_FORMAT') return 'format';
    if (code.includes('REQUIRED') || code === 'REQUIRED_FIELD_MISSING') return 'required';
    if (code.includes('RANGE') || code === 'OUT_OF_RANGE') return 'range';
    if (code.includes('CROSS') || code.includes('SEQUENCE')) return 'crossField';
    if (code.includes('QUALITY') || code.includes('WHITESPACE') || code.includes('CASE')) return 'quality';
    return 'other';
  }

  /**
   * Helper: Summarize issues
   * @param {Array} issues - Array of issues
   * @returns {object} Issue summary
   * @private
   */
  summarizeIssues(issues) {
    const summary = {
      total: issues.length,
      bySeverity: {},
      byCode: {},
      byField: {}
    };

    for (const issue of issues) {
      // By severity
      summary.bySeverity[issue.severity] = (summary.bySeverity[issue.severity] || 0) + 1;

      // By code
      summary.byCode[issue.code] = (summary.byCode[issue.code] || 0) + 1;

      // By field (top-level only)
      const fieldName = issue.field?.split('.')[0] || 'unknown';
      summary.byField[fieldName] = (summary.byField[fieldName] || 0) + 1;
    }

    return summary;
  }

  /**
   * Helper: Summarize error categories
   * @param {object} categories - Error categories
   * @returns {object} Category summary
   * @private
   */
  summarizeCategories(categories) {
    const summary = {};
    for (const [category, codes] of Object.entries(categories)) {
      const total = Object.values(codes).reduce((a, b) => a + b, 0);
      if (total > 0) {
        summary[category] = {
          total,
          topCodes: Object.entries(codes)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
            .map(([code, count]) => ({ code, count }))
        };
      }
    }
    return summary;
  }

  /**
   * Helper: Format claim validation as CSV
   * @param {object} claim - Claim object
   * @param {object} validation - Validation results
   * @returns {string} CSV data
   * @private
   */
  formatAsCSV(claim, validation) {
    const headers = ['Claim ID', 'Claim Number', 'Bill Type', 'Status', 'Passed', 'Errors', 'Warnings', 'Last Validated'];
    const row = [
      claim.id,
      claim.claim_number || '',
      claim.bill_type || '',
      claim.scrubbing_status || '',
      validation?.passed ? 'Yes' : 'No',
      (validation?.errors || []).length,
      (validation?.warnings || []).length,
      validation?.validation_date || ''
    ];

    let csv = headers.join(',') + '\n';
    csv += row.map(v => `"${v}"`).join(',') + '\n';

    // Add error details
    if (validation?.errors?.length > 0) {
      csv += '\nError Details\n';
      csv += 'Field,Code,Severity,Message\n';
      for (const error of validation.errors) {
        csv += `"${error.field}","${error.code}","${error.severity}","${error.message}"\n`;
      }
    }

    return csv;
  }

  /**
   * Helper: Format batch report as CSV
   * @param {Array} claimsData - Claims data
   * @param {object} stats - Statistics
   * @returns {string} CSV data
   * @private
   */
  formatBatchAsCSV(claimsData, stats) {
    let csv = 'Batch Validation Report\n';
    csv += `Generated: ${new Date().toISOString()}\n\n`;
    csv += 'Summary Statistics\n';
    csv += `Total Claims,${stats.totalClaims}\n`;
    csv += `Passed,${stats.passed}\n`;
    csv += `Failed,${stats.failed}\n`;
    csv += `Pending,${stats.pending}\n`;
    csv += `Not Validated,${stats.notValidated}\n`;
    csv += `Auto-Fixable,${stats.autoFixable}\n\n`;

    csv += 'Claim Details\n';
    csv += 'Claim ID,Claim Number,Bill Type,Status,Total Charges\n';
    for (const claim of claimsData) {
      csv += `${claim.id},"${claim.claim_number || ''}","${claim.bill_type || ''}","${claim.scrubbing_status || ''}",${claim.total_charges || 0}\n`;
    }

    return csv;
  }

  /**
   * Helper: Get week key for date
   * @param {Date} date - Date object
   * @returns {string} Week key (YYYY-WW)
   * @private
   */
  getWeekKey(date) {
    const year = date.getFullYear();
    const oneJan = new Date(year, 0, 1);
    const week = Math.ceil(((date - oneJan) / 86400000 + oneJan.getDay() + 1) / 7);
    return `${year}-W${week.toString().padStart(2, '0')}`;
  }
}

// Export singleton instance
export default new ClaimScrubber();
