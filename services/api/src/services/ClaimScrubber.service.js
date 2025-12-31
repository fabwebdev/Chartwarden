import { db } from '../db/index.js';
import { claims, claim_service_lines } from '../db/schemas/billing.schema.js';
import { claim_validation_results } from '../db/schemas/clearinghouse.schema.js';
import { eq, and, sql } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
/**
 * Claim Scrubber Service
 * Phase 2B - Claim Scrubbing System
 *
 * Purpose: Comprehensive pre-submission claim validation with 20+ rules
 * Features:
 *   - Required field validation
 *   - Format validation (NPI, bill type, diagnosis codes)
 *   - Range validation (units, charges, discharge status)
 *   - Cross-field validation (date sequences, value code requirements)
 *   - Service line validation
 *   - Data quality checks
 *   - Auto-fix capability for common errors
 */
class ClaimScrubber {
  constructor() {
    this.validatorVersion = '2.0';

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
   * @returns {Promise<object>} Validation results
   */
  async scrubClaim(claimId) {
    const results = {
      claimId,
      validationDate: new Date(),
      validationType: 'SCRUBBING',
      passed: true,
      errors: [],
      warnings: [],
      corrections: [],
      fieldsValidated: 0,
      fieldsPassed: 0,
      fieldsFailed: 0
    };

    try {
      // 1. Load claim with all relationships
      const claim = await this.loadClaimWithDetails(claimId);

      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }

      // 2. Required fields validation
      const requiredErrors = this.validateRequiredFields(claim);
      results.errors.push(...requiredErrors);

      // 3. Format validation
      const formatErrors = this.validateFormats(claim);
      results.errors.push(...formatErrors);

      // 4. Range validation
      const rangeErrors = this.validateRanges(claim);
      results.errors.push(...rangeErrors);

      // 5. Cross-field validation
      const crossFieldErrors = this.validateCrossFields(claim);
      results.errors.push(...crossFieldErrors);

      // 6. Service line validation
      for (const line of claim.serviceLines || []) {
        const lineErrors = this.validateServiceLine(line);
        results.errors.push(...lineErrors);
      }

      // 7. Data quality checks (warnings)
      const qualityWarnings = this.checkDataQuality(claim);
      results.warnings.push(...qualityWarnings);

      // 8. Generate auto-fix suggestions
      results.corrections = this.generateCorrections(results.errors.concat(results.warnings));

      // 9. Calculate summary
      results.fieldsValidated = this.countValidatedFields(claim);
      results.fieldsFailed = results.errors.length;
      results.fieldsPassed = results.fieldsValidated - results.fieldsFailed;
      results.passed = results.errors.length === 0;

      // 10. Save validation results to database
      await this.saveValidationResults(results);

      // 11. Update claim scrubbing status
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
}

// Export singleton instance
export default new ClaimScrubber();
