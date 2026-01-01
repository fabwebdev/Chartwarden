import { db } from '../db/index.js';
import { claims, claim_service_lines, billing_codes, notice_of_election, payers } from '../db/schemas/billing.schema.js';
import { patients } from '../db/schemas/patient.schema.js';
import { eq, and, sql, or, gte, lte, isNull } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Claim Validation Rules Service
 * HIPAA 837 Compliance, Coverage Requirements, and Coding Standards
 *
 * Purpose: Comprehensive claim validation for hospice billing compliance
 * Features:
 *   - HIPAA 837I loop/segment validation (2010AA, 2010BB, 2300, 2400, etc.)
 *   - Coverage requirement validations (eligibility, NOE, benefit periods)
 *   - Coding standard validations (ICD-10, revenue codes, HCPCS)
 *   - Hospice-specific compliance rules
 *   - Payer-specific validation rules
 *
 * Compliance Standards:
 *   - ANSI X12 005010X223A2 (837 Institutional)
 *   - CMS hospice billing requirements
 *   - HIPAA transaction and code set requirements
 */
class ClaimValidationRulesService {
  constructor() {
    this.version = '3.0';

    // Hospice revenue codes (0651-0659)
    this.hospiceRevenueCodes = {
      '0651': { name: 'Routine Home Care', levelOfCare: 'RHC', maxUnitsPerDay: 1 },
      '0652': { name: 'Continuous Home Care', levelOfCare: 'CHC', minUnits: 8, maxUnits: 24 },
      '0655': { name: 'Inpatient Respite Care', levelOfCare: 'IRC', maxConsecutiveDays: 5 },
      '0656': { name: 'General Inpatient Care', levelOfCare: 'GIP' },
      '0657': { name: 'Physician Services', levelOfCare: null },
      '0658': { name: 'Hospice Room and Board - Nursing Facility', levelOfCare: null },
      '0659': { name: 'Hospice Services - Other', levelOfCare: null }
    };

    // Valid bill types for hospice
    this.validBillTypes = {
      '0811': 'Hospice (Admit through Discharge - Non-payment/Zero Claim)',
      '0812': 'Hospice (Interim - First Claim)',
      '0813': 'Hospice (Interim - Continuing Claims)',
      '0814': 'Hospice (Interim - Last Claim)',
      '0817': 'Hospice (Replacement)',
      '0821': 'Hospice (Admit through Discharge - Extended Care Facility)',
      '0822': 'Hospice (Interim - First Claim - ECF)',
      '0823': 'Hospice (Interim - Continuing - ECF)',
      '0824': 'Hospice (Interim - Last Claim - ECF)'
    };

    // Valid discharge status codes
    this.validDischargeStatusCodes = [
      '01', // Discharged to home
      '02', // Discharged to short-term general hospital
      '03', // Discharged to SNF
      '04', // Discharged to ICF
      '05', // Discharged to another facility
      '06', // Discharged to home health organization
      '07', // Left against medical advice
      '20', // Expired
      '30', // Still patient
      '40', // Expired at home
      '41', // Expired in medical facility
      '42', // Expired - place unknown
      '43', // Discharged to federal hospital
      '50', // Hospice - home
      '51', // Hospice - medical facility
      '61', // Discharged to hospital-based swing bed
      '62', // Discharged to IRF
      '63', // Discharged to LTCH
      '64', // Discharged to Medicaid certified nursing facility
      '65', // Discharged to psychiatric hospital
      '66', // Discharged to critical access hospital
      '70', // Discharged to another institution
      '81', // Discharged to home with planned readmission
      '82', // Discharged to short-term hospital with planned readmission
      '83', // Discharged to SNF with planned readmission
      '84', // Discharged to facility with planned readmission
      '85', // Discharged to home health with planned readmission
      '86', // Discharged to medical facility (not hospital) with planned readmission
      '87', // Discharged to CAH with planned readmission
      '88', // Discharged to facility with planned readmission
      '89', // Discharged to LTCH with planned readmission
      '90', // Discharged to psych hospital with planned readmission
      '94', // Discharged to nursing facility with planned readmission
      '95'  // Discharged to unknown facility with planned readmission
    ];

    // Condition codes relevant to hospice
    this.hospiceConditionCodes = {
      '07': 'Treatment of Non-Terminal Condition',
      '20': 'Beneficiary Requested Billing',
      'C3': 'Partial Approval',
      'C5': 'Pre-existing Condition',
      'C6': 'Terminated Hospice Election',
      'C7': 'Revoked Hospice Election',
      'D4': 'Change in Level of Care',
      'D5': 'Respite Care',
      'G0': 'Multiple Medical Visit Same Day',
      'H0': 'Hospice Patient - Independent',
      'H1': 'Hospice Patient - Inpatient',
      'H2': 'Hospice Patient - Both Settings'
    };

    // Occurrence codes for hospice
    this.hospiceOccurrenceCodes = {
      '27': 'Date Hospice Certification or Re-Certification',
      '35': 'Date Homebound Status/Certification',
      'A1': 'Birthdate - Insured A',
      'A2': 'Effective Date - Insured A Policy',
      'A3': 'Benefits Exhausted - Insured A',
      'A4': 'Date of Admission',
      'P1': 'Date Election Period Begins',
      'P2': 'Date Election Period Ends'
    };
  }

  /**
   * Run all validation rules on a claim
   * @param {number} claimId - Claim ID
   * @returns {Promise<object>} Comprehensive validation results
   */
  async validateClaim(claimId) {
    const results = {
      claimId,
      validationDate: new Date(),
      validatorVersion: this.version,
      passed: true,
      hipaa837Errors: [],
      coverageErrors: [],
      codingErrors: [],
      warnings: [],
      corrections: [],
      summary: {
        totalRulesApplied: 0,
        rulesPassed: 0,
        rulesFailed: 0,
        criticalErrors: 0,
        warnings: 0
      }
    };

    try {
      // Load claim with all related data
      const claim = await this.loadClaimWithDetails(claimId);

      if (!claim) {
        throw new Error(`Claim ${claimId} not found`);
      }

      // 1. HIPAA 837I Compliance Validation
      const hipaaResults = await this.validateHIPAA837Compliance(claim);
      results.hipaa837Errors.push(...hipaaResults.errors);
      results.warnings.push(...hipaaResults.warnings);

      // 2. Coverage Requirement Validation
      const coverageResults = await this.validateCoverageRequirements(claim);
      results.coverageErrors.push(...coverageResults.errors);
      results.warnings.push(...coverageResults.warnings);

      // 3. Coding Standard Validation
      const codingResults = await this.validateCodingStandards(claim);
      results.codingErrors.push(...codingResults.errors);
      results.warnings.push(...codingResults.warnings);

      // 4. Generate auto-fix suggestions
      results.corrections = this.generateCorrections([
        ...results.hipaa837Errors,
        ...results.coverageErrors,
        ...results.codingErrors,
        ...results.warnings
      ]);

      // Calculate summary
      const allErrors = [
        ...results.hipaa837Errors,
        ...results.coverageErrors,
        ...results.codingErrors
      ];

      results.summary.totalRulesApplied = hipaaResults.rulesApplied + coverageResults.rulesApplied + codingResults.rulesApplied;
      results.summary.rulesFailed = allErrors.length;
      results.summary.rulesPassed = results.summary.totalRulesApplied - results.summary.rulesFailed;
      results.summary.criticalErrors = allErrors.filter(e => e.severity === 'CRITICAL').length;
      results.summary.warnings = results.warnings.length;
      results.passed = allErrors.length === 0;

      return results;
    } catch (error) {
      logger.error(`Error validating claim ${claimId}:`, error);
      throw new Error(`Claim validation failed: ${error.message}`);
    }
  }

  /**
   * HIPAA 837I Compliance Validation
   * Validates claim against ANSI X12 005010X223A2 requirements
   */
  async validateHIPAA837Compliance(claim) {
    const errors = [];
    const warnings = [];
    let rulesApplied = 0;

    // Loop 2010AA - Billing Provider Name
    rulesApplied++;
    if (!claim.attending_physician_npi) {
      errors.push(this.createError(
        'attending_physician_npi',
        'HIPAA_2010AA_NPI_REQUIRED',
        'CRITICAL',
        'Billing Provider NPI is required (Loop 2010AA, NM109)',
        null,
        'Add the 10-digit NPI for the billing provider'
      ));
    } else if (!/^\d{10}$/.test(claim.attending_physician_npi)) {
      errors.push(this.createError(
        'attending_physician_npi',
        'HIPAA_2010AA_NPI_FORMAT',
        'ERROR',
        'NPI must be exactly 10 digits',
        claim.attending_physician_npi,
        'Correct NPI to be exactly 10 digits'
      ));
    } else {
      // Validate NPI checksum (Luhn algorithm)
      rulesApplied++;
      if (!this.validateNPIChecksum(claim.attending_physician_npi)) {
        errors.push(this.createError(
          'attending_physician_npi',
          'HIPAA_2010AA_NPI_CHECKSUM',
          'ERROR',
          'NPI fails Luhn checksum validation',
          claim.attending_physician_npi,
          'Verify the NPI is correct'
        ));
      }
    }

    // Loop 2300 - Claim Information
    // CLM01 - Claim Identifier
    rulesApplied++;
    if (!claim.claim_number && !claim.id) {
      errors.push(this.createError(
        'claim_number',
        'HIPAA_2300_CLM01_REQUIRED',
        'CRITICAL',
        'Claim Identifier is required (Loop 2300, CLM01)',
        null,
        'Generate or assign a unique claim number'
      ));
    }

    // CLM05 - Facility Code (Bill Type)
    rulesApplied++;
    if (!claim.bill_type) {
      errors.push(this.createError(
        'bill_type',
        'HIPAA_2300_CLM05_REQUIRED',
        'CRITICAL',
        'Bill Type is required (Loop 2300, CLM05)',
        null,
        'Select valid bill type (81x or 82x for hospice)'
      ));
    } else if (!this.validBillTypes[claim.bill_type]) {
      errors.push(this.createError(
        'bill_type',
        'HIPAA_2300_CLM05_INVALID',
        'ERROR',
        `Invalid bill type for hospice claims: ${claim.bill_type}`,
        claim.bill_type,
        `Valid bill types: ${Object.keys(this.validBillTypes).join(', ')}`
      ));
    }

    // Statement Period Dates (DTP 434/435)
    rulesApplied++;
    if (!claim.statement_from_date) {
      errors.push(this.createError(
        'statement_from_date',
        'HIPAA_2300_DTP434_REQUIRED',
        'CRITICAL',
        'Statement From Date is required (Loop 2300, DTP 434)',
        null,
        'Enter the start date of the billing period'
      ));
    }

    rulesApplied++;
    if (!claim.statement_to_date) {
      errors.push(this.createError(
        'statement_to_date',
        'HIPAA_2300_DTP435_REQUIRED',
        'CRITICAL',
        'Statement To Date is required (Loop 2300, DTP 435)',
        null,
        'Enter the end date of the billing period'
      ));
    }

    // Date sequence validation
    if (claim.statement_from_date && claim.statement_to_date) {
      rulesApplied++;
      const fromDate = new Date(claim.statement_from_date);
      const toDate = new Date(claim.statement_to_date);

      if (fromDate > toDate) {
        errors.push(this.createError(
          'statement_from_date',
          'HIPAA_2300_DATE_SEQUENCE',
          'ERROR',
          'Statement From Date cannot be after Statement To Date',
          claim.statement_from_date,
          `Correct date sequence: from date should be <= ${claim.statement_to_date}`
        ));
      }

      // Statement period should not exceed 35 days for hospice
      rulesApplied++;
      const daysDiff = Math.ceil((toDate - fromDate) / (1000 * 60 * 60 * 24)) + 1;
      if (daysDiff > 35) {
        warnings.push(this.createError(
          'statement_to_date',
          'HIPAA_2300_PERIOD_LENGTH',
          'WARNING',
          `Statement period is ${daysDiff} days. Typical hospice billing is monthly (max 35 days)`,
          daysDiff,
          'Consider splitting into multiple claims if period exceeds one month'
        ));
      }
    }

    // Loop 2300 - HI Segment (Diagnosis Codes)
    // Principal Diagnosis Required
    rulesApplied++;
    if (!claim.principal_diagnosis_code) {
      errors.push(this.createError(
        'principal_diagnosis_code',
        'HIPAA_2300_HI_PRINCIPAL_REQUIRED',
        'CRITICAL',
        'Principal Diagnosis Code is required (Loop 2300, HI segment)',
        null,
        'Enter a valid ICD-10-CM diagnosis code'
      ));
    }

    // Admission Date for Inpatient Claims
    rulesApplied++;
    if (!claim.admission_date) {
      errors.push(this.createError(
        'admission_date',
        'HIPAA_2300_DTP435_ADMISSION_REQUIRED',
        'ERROR',
        'Admission Date is required for hospice claims',
        null,
        'Enter the date patient was admitted to hospice'
      ));
    }

    // Discharge Status
    rulesApplied++;
    if (claim.discharge_status && !this.validDischargeStatusCodes.includes(claim.discharge_status)) {
      errors.push(this.createError(
        'discharge_status',
        'HIPAA_2300_CL104_INVALID',
        'ERROR',
        `Invalid discharge status code: ${claim.discharge_status}`,
        claim.discharge_status,
        `Valid codes: ${this.validDischargeStatusCodes.slice(0, 10).join(', ')}...`
      ));
    }

    // Loop 2400 - Service Line Validation
    const serviceLines = claim.serviceLines || [];

    rulesApplied++;
    if (serviceLines.length === 0) {
      errors.push(this.createError(
        'serviceLines',
        'HIPAA_2400_REQUIRED',
        'CRITICAL',
        'At least one service line is required (Loop 2400)',
        null,
        'Add service lines with revenue codes and charges'
      ));
    }

    for (const line of serviceLines) {
      // SV201 - Revenue Code Required
      rulesApplied++;
      if (!line.revenue_code) {
        errors.push(this.createError(
          `serviceLine.${line.line_number}.revenue_code`,
          'HIPAA_2400_SV201_REQUIRED',
          'ERROR',
          `Service line ${line.line_number}: Revenue code required`,
          null,
          'Enter a valid 4-digit revenue code'
        ));
      } else if (!/^\d{4}$/.test(line.revenue_code)) {
        errors.push(this.createError(
          `serviceLine.${line.line_number}.revenue_code`,
          'HIPAA_2400_SV201_FORMAT',
          'ERROR',
          `Service line ${line.line_number}: Revenue code must be 4 digits`,
          line.revenue_code,
          'Pad to 4 digits (e.g., 0651)'
        ));
      }

      // SV203 - Charge Amount Required
      rulesApplied++;
      if (line.charges === undefined || line.charges === null) {
        errors.push(this.createError(
          `serviceLine.${line.line_number}.charges`,
          'HIPAA_2400_SV203_REQUIRED',
          'ERROR',
          `Service line ${line.line_number}: Charge amount required`,
          null,
          'Enter the charge amount in cents'
        ));
      } else if (line.charges < 0) {
        errors.push(this.createError(
          `serviceLine.${line.line_number}.charges`,
          'HIPAA_2400_SV203_NEGATIVE',
          'ERROR',
          `Service line ${line.line_number}: Charges cannot be negative`,
          line.charges,
          'Enter a positive charge amount'
        ));
      }

      // SV205 - Units Required
      rulesApplied++;
      if (line.units === undefined || line.units === null) {
        errors.push(this.createError(
          `serviceLine.${line.line_number}.units`,
          'HIPAA_2400_SV205_REQUIRED',
          'ERROR',
          `Service line ${line.line_number}: Units required`,
          null,
          'Enter the number of service units'
        ));
      } else if (line.units <= 0) {
        errors.push(this.createError(
          `serviceLine.${line.line_number}.units`,
          'HIPAA_2400_SV205_ZERO',
          'ERROR',
          `Service line ${line.line_number}: Units must be greater than zero`,
          line.units,
          'Enter a positive unit count'
        ));
      }

      // DTP 472 - Service Date Required
      rulesApplied++;
      if (!line.service_date) {
        errors.push(this.createError(
          `serviceLine.${line.line_number}.service_date`,
          'HIPAA_2400_DTP472_REQUIRED',
          'ERROR',
          `Service line ${line.line_number}: Service date required`,
          null,
          'Enter the date of service'
        ));
      }
    }

    // Total Charges Validation
    rulesApplied++;
    if (claim.total_charges === undefined || claim.total_charges === null) {
      errors.push(this.createError(
        'total_charges',
        'HIPAA_2300_CLM02_REQUIRED',
        'ERROR',
        'Total charges required (Loop 2300, CLM02)',
        null,
        'Calculate total charges from service lines'
      ));
    } else {
      // Verify total matches sum of line charges
      const calculatedTotal = serviceLines.reduce((sum, line) => sum + (line.charges || 0), 0);
      rulesApplied++;
      if (claim.total_charges !== calculatedTotal) {
        errors.push(this.createError(
          'total_charges',
          'HIPAA_2300_CLM02_MISMATCH',
          'ERROR',
          `Total charges (${claim.total_charges}) does not match sum of service lines (${calculatedTotal})`,
          claim.total_charges,
          `Update total charges to ${calculatedTotal}`
        ));
      }
    }

    return { errors, warnings, rulesApplied };
  }

  /**
   * Coverage Requirement Validation
   * Validates Medicare/Medicaid coverage requirements
   */
  async validateCoverageRequirements(claim) {
    const errors = [];
    const warnings = [];
    let rulesApplied = 0;

    // Get patient and payer information
    const patient = claim.patient;
    const payer = claim.payer;

    // Medicare eligibility validation
    if (payer && payer.payer_type === 'MEDICARE') {
      // Check for valid Medicare number
      rulesApplied++;
      if (patient && !patient.medicare_number) {
        errors.push(this.createError(
          'patient.medicare_number',
          'COVERAGE_MEDICARE_ID_REQUIRED',
          'CRITICAL',
          'Medicare Beneficiary Identifier (MBI) is required for Medicare claims',
          null,
          'Enter valid 11-character MBI'
        ));
      } else if (patient && patient.medicare_number) {
        // Validate MBI format (11 characters with specific pattern)
        rulesApplied++;
        const mbiPattern = /^[1-9][AC-HJKMNP-RT-Y][AC-HJKMNP-RT-Y0-9]\d[AC-HJKMNP-RT-Y][AC-HJKMNP-RT-Y0-9]\d[AC-HJKMNP-RT-Y]{2}\d{2}$/;
        if (!mbiPattern.test(patient.medicare_number)) {
          warnings.push(this.createError(
            'patient.medicare_number',
            'COVERAGE_MEDICARE_ID_FORMAT',
            'WARNING',
            'Medicare Beneficiary Identifier format appears invalid',
            patient.medicare_number,
            'Verify MBI follows CMS format requirements'
          ));
        }
      }

      // NOE Requirement Check
      rulesApplied++;
      const noeStatus = await this.checkNOEStatus(claim.patient_id, claim.service_start_date);
      if (!noeStatus.hasValidNOE) {
        if (noeStatus.noeExists && noeStatus.noeStatus === 'REJECTED') {
          errors.push(this.createError(
            'notice_of_election',
            'COVERAGE_NOE_REJECTED',
            'CRITICAL',
            'Notice of Election was rejected. Claim cannot be submitted',
            noeStatus.noeStatus,
            'Resubmit corrected NOE or contact Medicare'
          ));
        } else if (!noeStatus.noeExists) {
          errors.push(this.createError(
            'notice_of_election',
            'COVERAGE_NOE_MISSING',
            'CRITICAL',
            'No Notice of Election found for this patient. NOE required for Medicare hospice claims',
            null,
            'File Notice of Election within 5 days of hospice admission'
          ));
        } else if (noeStatus.noeStatus === 'PENDING') {
          warnings.push(this.createError(
            'notice_of_election',
            'COVERAGE_NOE_PENDING',
            'WARNING',
            'Notice of Election is pending acceptance',
            noeStatus.noeStatus,
            'Wait for NOE acceptance before submitting claims'
          ));
        }
      }

      // NOE Timeliness Check
      if (noeStatus.noeExists && noeStatus.isLate) {
        rulesApplied++;
        warnings.push(this.createError(
          'notice_of_election',
          'COVERAGE_NOE_LATE',
          'WARNING',
          'Notice of Election was filed late (>5 calendar days after election)',
          noeStatus.filedDaysAfter,
          'Late NOE may result in reduced payment for initial billing period'
        ));
      }
    }

    // Benefit Period Validation
    rulesApplied++;
    const benefitPeriod = await this.checkBenefitPeriod(claim.patient_id, claim.service_start_date, claim.service_end_date);
    if (!benefitPeriod.isValid) {
      if (benefitPeriod.reason === 'NO_ACTIVE_ELECTION') {
        errors.push(this.createError(
          'benefit_period',
          'COVERAGE_NO_ACTIVE_ELECTION',
          'ERROR',
          'No active hospice election covers the service period',
          null,
          'Verify hospice election dates or file new election'
        ));
      } else if (benefitPeriod.reason === 'ELECTION_REVOKED') {
        errors.push(this.createError(
          'benefit_period',
          'COVERAGE_ELECTION_REVOKED',
          'ERROR',
          'Hospice election was revoked before service dates',
          benefitPeriod.revokedDate,
          'Services after revocation cannot be billed under hospice'
        ));
      }
    }

    // Certification Requirement Check
    rulesApplied++;
    // Hospice patients must be certified as terminally ill (life expectancy 6 months or less)
    if (claim.admission_date) {
      const admissionDate = new Date(claim.admission_date);
      const serviceFromDate = new Date(claim.statement_from_date);
      const daysSinceAdmission = Math.floor((serviceFromDate - admissionDate) / (1000 * 60 * 60 * 24));

      // Check for recertification requirements
      // Initial: 0-90 days
      // First Subsequent: 91-180 days
      // All following: every 60 days
      rulesApplied++;
      if (daysSinceAdmission > 90) {
        warnings.push(this.createError(
          'certification',
          'COVERAGE_RECERTIFICATION_CHECK',
          'WARNING',
          `Patient has been in hospice ${daysSinceAdmission} days. Verify recertification is current`,
          daysSinceAdmission,
          'Ensure physician recertification is documented'
        ));
      }
    }

    // Face-to-Face Encounter Requirement (after day 180)
    rulesApplied++;
    if (claim.admission_date) {
      const admissionDate = new Date(claim.admission_date);
      const serviceFromDate = new Date(claim.statement_from_date);
      const daysSinceAdmission = Math.floor((serviceFromDate - admissionDate) / (1000 * 60 * 60 * 24));

      if (daysSinceAdmission >= 180) {
        // F2F encounter required for recertification in third benefit period and beyond
        warnings.push(this.createError(
          'face_to_face',
          'COVERAGE_F2F_REQUIRED',
          'WARNING',
          `Face-to-face encounter may be required (day ${daysSinceAdmission} of hospice)`,
          daysSinceAdmission,
          'Verify F2F encounter is documented within 30 days of recertification'
        ));
      }
    }

    // Payer-specific requirements
    if (payer) {
      rulesApplied++;
      // Check if payer is active
      if (!payer.is_active) {
        errors.push(this.createError(
          'payer_id',
          'COVERAGE_PAYER_INACTIVE',
          'ERROR',
          'Selected payer is no longer active',
          payer.payer_name,
          'Select an active payer or update payer status'
        ));
      }

      // Check electronic billing capability
      rulesApplied++;
      if (!payer.electronic_billing_enabled) {
        warnings.push(this.createError(
          'payer_id',
          'COVERAGE_PAYER_NO_EDI',
          'WARNING',
          'Payer does not support electronic billing',
          payer.payer_name,
          'Paper submission may be required'
        ));
      }
    }

    return { errors, warnings, rulesApplied };
  }

  /**
   * Coding Standard Validation
   * Validates ICD-10, revenue codes, and HCPCS codes
   */
  async validateCodingStandards(claim) {
    const errors = [];
    const warnings = [];
    let rulesApplied = 0;

    // Principal Diagnosis Code Validation (ICD-10-CM)
    if (claim.principal_diagnosis_code) {
      // ICD-10-CM format validation
      rulesApplied++;
      const icd10Pattern = /^[A-Z][0-9]{2}(\.[0-9]{1,4})?$/;
      if (!icd10Pattern.test(claim.principal_diagnosis_code)) {
        errors.push(this.createError(
          'principal_diagnosis_code',
          'CODING_ICD10_FORMAT',
          'ERROR',
          'Principal diagnosis code is not valid ICD-10-CM format',
          claim.principal_diagnosis_code,
          'Use format: A00 or A00.0 (letter + 2 digits + optional decimal + 1-4 digits)'
        ));
      }

      // Check if diagnosis is appropriate for hospice
      rulesApplied++;
      const hospiceAppropriate = await this.checkHospiceDiagnosis(claim.principal_diagnosis_code);
      if (!hospiceAppropriate.isValid) {
        if (hospiceAppropriate.reason === 'CODE_NOT_FOUND') {
          warnings.push(this.createError(
            'principal_diagnosis_code',
            'CODING_ICD10_NOT_FOUND',
            'WARNING',
            'Diagnosis code not found in billing codes reference',
            claim.principal_diagnosis_code,
            'Verify code is valid and current'
          ));
        } else if (hospiceAppropriate.reason === 'NOT_HOSPICE_APPROPRIATE') {
          warnings.push(this.createError(
            'principal_diagnosis_code',
            'CODING_ICD10_NOT_HOSPICE',
            'WARNING',
            'Diagnosis code may not be appropriate for hospice terminal prognosis',
            claim.principal_diagnosis_code,
            'Ensure diagnosis supports terminal prognosis'
          ));
        }
      }

      // Ensure uppercase
      rulesApplied++;
      if (claim.principal_diagnosis_code !== claim.principal_diagnosis_code.toUpperCase()) {
        warnings.push(this.createError(
          'principal_diagnosis_code',
          'CODING_ICD10_UPPERCASE',
          'WARNING',
          'Diagnosis code should be uppercase',
          claim.principal_diagnosis_code,
          claim.principal_diagnosis_code.toUpperCase()
        ));
      }
    }

    // Secondary Diagnosis Codes Validation
    const otherDiagnoses = claim.other_diagnosis_codes || [];
    for (let i = 0; i < otherDiagnoses.length; i++) {
      const dx = otherDiagnoses[i];
      rulesApplied++;
      const icd10Pattern = /^[A-Z][0-9]{2}(\.[0-9]{1,4})?$/;
      if (dx.code && !icd10Pattern.test(dx.code)) {
        errors.push(this.createError(
          `other_diagnosis_codes.${i}`,
          'CODING_ICD10_SECONDARY_FORMAT',
          'ERROR',
          `Secondary diagnosis ${i + 1} is not valid ICD-10-CM format`,
          dx.code,
          'Use format: A00 or A00.0'
        ));
      }
    }

    // Service Line Revenue Code Validation
    const serviceLines = claim.serviceLines || [];
    for (const line of serviceLines) {
      if (line.revenue_code) {
        // Check if valid hospice revenue code
        rulesApplied++;
        if (!this.hospiceRevenueCodes[line.revenue_code]) {
          // Check if it's a valid revenue code at all
          const isValidRevenue = /^0[0-9]{3}$/.test(line.revenue_code);
          if (isValidRevenue) {
            warnings.push(this.createError(
              `serviceLine.${line.line_number}.revenue_code`,
              'CODING_REVENUE_NOT_HOSPICE',
              'WARNING',
              `Revenue code ${line.revenue_code} is not a standard hospice revenue code (0651-0659)`,
              line.revenue_code,
              'Verify revenue code is appropriate for services rendered'
            ));
          } else {
            errors.push(this.createError(
              `serviceLine.${line.line_number}.revenue_code`,
              'CODING_REVENUE_INVALID',
              'ERROR',
              `Invalid revenue code format: ${line.revenue_code}`,
              line.revenue_code,
              'Use 4-digit revenue code (e.g., 0651)'
            ));
          }
        } else {
          // Validate units for specific revenue codes
          const revenueConfig = this.hospiceRevenueCodes[line.revenue_code];

          // Continuous Home Care (0652) - minimum 8 units
          if (line.revenue_code === '0652') {
            rulesApplied++;
            if (line.units < revenueConfig.minUnits) {
              errors.push(this.createError(
                `serviceLine.${line.line_number}.units`,
                'CODING_CHC_MIN_UNITS',
                'ERROR',
                `Continuous Home Care requires minimum ${revenueConfig.minUnits} units (hours)`,
                line.units,
                `Increase units to at least ${revenueConfig.minUnits}`
              ));
            }
            if (line.units > revenueConfig.maxUnits) {
              errors.push(this.createError(
                `serviceLine.${line.line_number}.units`,
                'CODING_CHC_MAX_UNITS',
                'ERROR',
                `Continuous Home Care cannot exceed ${revenueConfig.maxUnits} units (hours) per day`,
                line.units,
                `Reduce units to maximum ${revenueConfig.maxUnits}`
              ));
            }
          }

          // Inpatient Respite (0655) - max 5 consecutive days
          if (line.revenue_code === '0655') {
            rulesApplied++;
            if (line.units > revenueConfig.maxConsecutiveDays) {
              warnings.push(this.createError(
                `serviceLine.${line.line_number}.units`,
                'CODING_IRC_MAX_DAYS',
                'WARNING',
                `Inpatient Respite Care typically limited to ${revenueConfig.maxConsecutiveDays} consecutive days`,
                line.units,
                'Verify respite stay duration. May need to convert to GIP if longer'
              ));
            }
          }

          // Routine Home Care (0651) - typically 1 unit per day
          if (line.revenue_code === '0651') {
            rulesApplied++;
            if (line.units > 31) {
              warnings.push(this.createError(
                `serviceLine.${line.line_number}.units`,
                'CODING_RHC_UNITS_HIGH',
                'WARNING',
                'Routine Home Care units exceed 31 (one month)',
                line.units,
                'Verify units are correct for the service period'
              ));
            }
          }
        }

        // HCPCS Code validation (if present)
        if (line.hcpcs_code) {
          rulesApplied++;
          const hcpcsPattern = /^[A-Z][0-9]{4}$/;
          if (!hcpcsPattern.test(line.hcpcs_code)) {
            errors.push(this.createError(
              `serviceLine.${line.line_number}.hcpcs_code`,
              'CODING_HCPCS_FORMAT',
              'ERROR',
              `Invalid HCPCS code format: ${line.hcpcs_code}`,
              line.hcpcs_code,
              'Use format: A0000 (letter + 4 digits)'
            ));
          }
        }
      }

      // Level of Care consistency
      if (line.level_of_care && line.revenue_code) {
        rulesApplied++;
        const expectedLOC = this.hospiceRevenueCodes[line.revenue_code]?.levelOfCare;
        if (expectedLOC && line.level_of_care !== expectedLOC &&
            !this.levelsOfCareMatch(line.level_of_care, expectedLOC)) {
          errors.push(this.createError(
            `serviceLine.${line.line_number}.level_of_care`,
            'CODING_LOC_MISMATCH',
            'ERROR',
            `Level of care (${line.level_of_care}) does not match revenue code (${line.revenue_code})`,
            line.level_of_care,
            `Expected level of care: ${expectedLOC}`
          ));
        }
      }
    }

    // Value Code Validation (for CBSA)
    rulesApplied++;
    const valueCodes = claim.value_codes || [];
    const hasHomeCareLine = serviceLines.some(l =>
      l.revenue_code === '0651' || l.revenue_code === '0652'
    );
    const hasInpatientLine = serviceLines.some(l =>
      l.revenue_code === '0655' || l.revenue_code === '0656'
    );

    // Value Code 61 required for home care
    const hasValueCode61 = valueCodes.some(vc => vc.code === '61');
    if (hasHomeCareLine && !hasValueCode61) {
      errors.push(this.createError(
        'value_codes',
        'CODING_VALUE_CODE_61_REQUIRED',
        'ERROR',
        'Value Code 61 (CBSA code) required for routine/continuous home care',
        null,
        'Add Value Code 61 with patient location CBSA code'
      ));
    }

    // Value Code G8 required for inpatient care
    const hasValueCodeG8 = valueCodes.some(vc => vc.code === 'G8');
    if (hasInpatientLine && !hasValueCodeG8) {
      errors.push(this.createError(
        'value_codes',
        'CODING_VALUE_CODE_G8_REQUIRED',
        'ERROR',
        'Value Code G8 (CBSA code) required for inpatient care',
        null,
        'Add Value Code G8 with facility location CBSA code'
      ));
    }

    // Condition Code Validation
    rulesApplied++;
    const conditionCodes = claim.condition_codes || [];
    for (const cc of conditionCodes) {
      if (cc && !this.hospiceConditionCodes[cc] && !/^[0-9A-Z]{2}$/.test(cc)) {
        warnings.push(this.createError(
          'condition_codes',
          'CODING_CONDITION_CODE_UNKNOWN',
          'WARNING',
          `Condition code ${cc} not recognized for hospice`,
          cc,
          'Verify condition code is valid'
        ));
      }
    }

    return { errors, warnings, rulesApplied };
  }

  /**
   * Helper: Check NOE status for patient
   */
  async checkNOEStatus(patientId, serviceDate) {
    try {
      const noe = await db
        .select()
        .from(notice_of_election)
        .where(
          and(
            eq(notice_of_election.patient_id, patientId),
            isNull(notice_of_election.deleted_at)
          )
        )
        .orderBy(sql`${notice_of_election.effective_date} DESC`)
        .limit(1);

      if (!noe[0]) {
        return { noeExists: false, hasValidNOE: false };
      }

      const noeRecord = noe[0];
      const effectiveDate = new Date(noeRecord.effective_date);
      const noeDate = new Date(noeRecord.noe_date);
      const filedDaysAfter = Math.floor((noeDate - effectiveDate) / (1000 * 60 * 60 * 24));

      return {
        noeExists: true,
        noeStatus: noeRecord.noe_status,
        hasValidNOE: noeRecord.noe_status === 'ACCEPTED',
        isLate: filedDaysAfter > 5,
        filedDaysAfter,
        effectiveDate: noeRecord.effective_date,
        benefitPeriod: noeRecord.benefit_period
      };
    } catch (error) {
      logger.error(`Error checking NOE status for patient ${patientId}:`, error);
      return { noeExists: false, hasValidNOE: false, error: error.message };
    }
  }

  /**
   * Helper: Check benefit period validity
   */
  async checkBenefitPeriod(patientId, serviceStartDate, serviceEndDate) {
    try {
      // Check for active NOE covering the service period
      const noe = await db
        .select()
        .from(notice_of_election)
        .where(
          and(
            eq(notice_of_election.patient_id, patientId),
            lte(notice_of_election.effective_date, serviceStartDate),
            eq(notice_of_election.noe_status, 'ACCEPTED'),
            isNull(notice_of_election.deleted_at)
          )
        )
        .orderBy(sql`${notice_of_election.effective_date} DESC`)
        .limit(1);

      if (!noe[0]) {
        return { isValid: false, reason: 'NO_ACTIVE_ELECTION' };
      }

      // Check for revocation
      const revokedNoe = await db
        .select()
        .from(notice_of_election)
        .where(
          and(
            eq(notice_of_election.patient_id, patientId),
            or(
              eq(notice_of_election.noe_status, 'CANCELLED'),
              eq(notice_of_election.noe_status, 'REJECTED')
            ),
            lte(notice_of_election.effective_date, serviceStartDate)
          )
        )
        .orderBy(sql`${notice_of_election.effective_date} DESC`)
        .limit(1);

      if (revokedNoe[0]) {
        const revokedDate = new Date(revokedNoe[0].effective_date);
        const serviceStart = new Date(serviceStartDate);
        if (revokedDate < serviceStart) {
          return {
            isValid: false,
            reason: 'ELECTION_REVOKED',
            revokedDate: revokedNoe[0].effective_date
          };
        }
      }

      return { isValid: true, benefitPeriod: noe[0].benefit_period };
    } catch (error) {
      logger.error(`Error checking benefit period for patient ${patientId}:`, error);
      return { isValid: false, reason: 'CHECK_ERROR', error: error.message };
    }
  }

  /**
   * Helper: Check if diagnosis is appropriate for hospice
   */
  async checkHospiceDiagnosis(diagnosisCode) {
    try {
      const code = await db
        .select()
        .from(billing_codes)
        .where(
          and(
            eq(billing_codes.code, diagnosisCode),
            eq(billing_codes.code_type, 'ICD10_DX'),
            eq(billing_codes.is_active, true)
          )
        )
        .limit(1);

      if (!code[0]) {
        return { isValid: false, reason: 'CODE_NOT_FOUND' };
      }

      // Check hospice_applicable flag if set
      if (code[0].hospice_applicable === false) {
        return { isValid: false, reason: 'NOT_HOSPICE_APPROPRIATE' };
      }

      return { isValid: true, description: code[0].short_description };
    } catch (error) {
      // If lookup fails, allow the code but log warning
      logger.warn(`Unable to validate diagnosis code ${diagnosisCode}:`, error);
      return { isValid: true, reason: 'LOOKUP_UNAVAILABLE' };
    }
  }

  /**
   * Helper: Validate NPI checksum using Luhn algorithm
   */
  validateNPIChecksum(npi) {
    // Prefix with 80840 for healthcare identifier
    const prefixedNpi = '80840' + npi;
    let sum = 0;
    let alternate = false;

    for (let i = prefixedNpi.length - 1; i >= 0; i--) {
      let digit = parseInt(prefixedNpi.charAt(i), 10);

      if (alternate) {
        digit *= 2;
        if (digit > 9) {
          digit = (digit % 10) + 1;
        }
      }

      sum += digit;
      alternate = !alternate;
    }

    return (sum % 10) === 0;
  }

  /**
   * Helper: Check if levels of care match
   */
  levelsOfCareMatch(loc1, loc2) {
    const locMapping = {
      'ROUTINE_HOME_CARE': 'RHC',
      'RHC': 'ROUTINE_HOME_CARE',
      'CONTINUOUS_HOME_CARE': 'CHC',
      'CHC': 'CONTINUOUS_HOME_CARE',
      'INPATIENT_RESPITE': 'IRC',
      'IRC': 'INPATIENT_RESPITE',
      'GENERAL_INPATIENT': 'GIP',
      'GIP': 'GENERAL_INPATIENT'
    };

    return locMapping[loc1] === loc2 || locMapping[loc2] === loc1;
  }

  /**
   * Create standardized error object
   */
  createError(field, code, severity, message, currentValue, suggestion) {
    return {
      field,
      code,
      severity,
      message,
      currentValue,
      suggestion,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Generate auto-fix corrections
   */
  generateCorrections(issues) {
    const corrections = [];

    for (const issue of issues) {
      let autoFixable = false;
      let newValue = null;
      let action = null;

      switch (issue.code) {
        case 'CODING_ICD10_UPPERCASE':
          autoFixable = true;
          newValue = issue.currentValue?.toUpperCase();
          action = 'UPPERCASE';
          break;

        case 'HIPAA_2400_SV201_FORMAT':
          if (issue.currentValue && /^\d{1,3}$/.test(issue.currentValue)) {
            autoFixable = true;
            newValue = issue.currentValue.padStart(4, '0');
            action = 'PAD_REVENUE_CODE';
          }
          break;

        case 'HIPAA_2010AA_NPI_FORMAT':
          if (issue.currentValue && /^\d{1,9}$/.test(issue.currentValue)) {
            autoFixable = true;
            newValue = issue.currentValue.padStart(10, '0');
            action = 'PAD_NPI';
          }
          break;

        case 'HIPAA_2300_CLM02_MISMATCH':
          // Extract expected value from suggestion
          const match = issue.suggestion?.match(/to (\d+)/);
          if (match) {
            autoFixable = true;
            newValue = parseInt(match[1]);
            action = 'RECALCULATE_TOTAL';
          }
          break;
      }

      if (autoFixable) {
        corrections.push({
          field: issue.field,
          code: issue.code,
          oldValue: issue.currentValue,
          newValue,
          action,
          autoFixable: true
        });
      }
    }

    return corrections;
  }

  /**
   * Load claim with all related data
   */
  async loadClaimWithDetails(claimId) {
    try {
      const claimResults = await db
        .select()
        .from(claims)
        .leftJoin(patients, eq(claims.patient_id, patients.id))
        .leftJoin(payers, eq(claims.payer_id, payers.id))
        .where(eq(claims.id, claimId))
        .limit(1);

      if (!claimResults[0]) {
        return null;
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
        .where(eq(claim_service_lines.claim_id, claimId));

      claim.serviceLines = serviceLines;

      return claim;
    } catch (error) {
      logger.error(`Error loading claim ${claimId} with details:`, error);
      throw new Error(`Failed to load claim details: ${error.message}`);
    }
  }

  /**
   * Get validation rule descriptions
   */
  getRuleDescriptions() {
    return {
      hipaa837: [
        { code: 'HIPAA_2010AA_NPI_REQUIRED', description: 'Billing Provider NPI is required' },
        { code: 'HIPAA_2010AA_NPI_FORMAT', description: 'NPI must be 10 digits' },
        { code: 'HIPAA_2010AA_NPI_CHECKSUM', description: 'NPI must pass Luhn checksum' },
        { code: 'HIPAA_2300_CLM01_REQUIRED', description: 'Claim identifier required' },
        { code: 'HIPAA_2300_CLM05_REQUIRED', description: 'Bill type required' },
        { code: 'HIPAA_2300_CLM05_INVALID', description: 'Valid hospice bill type required' },
        { code: 'HIPAA_2300_DTP434_REQUIRED', description: 'Statement from date required' },
        { code: 'HIPAA_2300_DTP435_REQUIRED', description: 'Statement to date required' },
        { code: 'HIPAA_2300_DATE_SEQUENCE', description: 'Statement dates must be in sequence' },
        { code: 'HIPAA_2300_HI_PRINCIPAL_REQUIRED', description: 'Principal diagnosis required' },
        { code: 'HIPAA_2400_REQUIRED', description: 'Service lines required' },
        { code: 'HIPAA_2400_SV201_REQUIRED', description: 'Revenue code required on service line' },
        { code: 'HIPAA_2400_SV203_REQUIRED', description: 'Charges required on service line' },
        { code: 'HIPAA_2400_SV205_REQUIRED', description: 'Units required on service line' }
      ],
      coverage: [
        { code: 'COVERAGE_MEDICARE_ID_REQUIRED', description: 'Medicare Beneficiary Identifier required' },
        { code: 'COVERAGE_NOE_MISSING', description: 'Notice of Election required' },
        { code: 'COVERAGE_NOE_REJECTED', description: 'NOE must be accepted' },
        { code: 'COVERAGE_NO_ACTIVE_ELECTION', description: 'Active hospice election required' },
        { code: 'COVERAGE_ELECTION_REVOKED', description: 'Election must not be revoked' },
        { code: 'COVERAGE_PAYER_INACTIVE', description: 'Payer must be active' }
      ],
      coding: [
        { code: 'CODING_ICD10_FORMAT', description: 'ICD-10 code format validation' },
        { code: 'CODING_REVENUE_INVALID', description: 'Revenue code format validation' },
        { code: 'CODING_CHC_MIN_UNITS', description: 'Continuous care minimum 8 hours' },
        { code: 'CODING_CHC_MAX_UNITS', description: 'Continuous care maximum 24 hours' },
        { code: 'CODING_IRC_MAX_DAYS', description: 'Respite care maximum 5 days' },
        { code: 'CODING_VALUE_CODE_61_REQUIRED', description: 'CBSA code required for home care' },
        { code: 'CODING_VALUE_CODE_G8_REQUIRED', description: 'CBSA code required for inpatient' },
        { code: 'CODING_LOC_MISMATCH', description: 'Level of care must match revenue code' },
        { code: 'CODING_HCPCS_FORMAT', description: 'HCPCS code format validation' }
      ]
    };
  }
}

// Export singleton instance
export default new ClaimValidationRulesService();
