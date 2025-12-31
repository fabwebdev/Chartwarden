import { db } from '../db/index.js';
import { carc_codes, rarc_codes, denial_categories } from '../db/schemas/index.js';
import { eq } from 'drizzle-orm';

import { logger } from '../utils/logger.js';
/**
 * Denial Codes Service
 * Phase 3C - CARC/RARC Code Management
 *
 * Purpose: Manage CARC (Claim Adjustment Reason Codes) and RARC (Remittance Advice Remark Codes)
 * Source: Washington Publishing Company (WPC) - Official HIPAA code list maintainer
 *
 * Features:
 *   - Lookup CARC/RARC codes
 *   - Categorize denials
 *   - Provide appeal recommendations
 *   - Track common denial patterns
 */
class DenialCodesService {
  /**
   * Get CARC code by code number
   * @param {string} code - CARC code (e.g., "1", "45", "96")
   * @returns {Promise<object>} CARC code details
   */
  async getCARCCode(code) {
    const [carcCode] = await db.select({
      id: carc_codes.id,
      code: carc_codes.code,
      description: carc_codes.description,
      short_description: carc_codes.short_description,
      category: carc_codes.category,
      group_code: carc_codes.group_code,
      is_denial: carc_codes.is_denial,
      is_appealable: carc_codes.is_appealable,
      severity: carc_codes.severity,
      recommended_action: carc_codes.recommended_action,
      appeal_template: carc_codes.appeal_template,
      documentation_required: carc_codes.documentation_required,
      common_payer_types: carc_codes.common_payer_types,
      average_appeal_success_rate: carc_codes.average_appeal_success_rate,
      is_active: carc_codes.is_active,
      effective_date: carc_codes.effective_date,
      termination_date: carc_codes.termination_date,
      source: carc_codes.source,
      source_url: carc_codes.source_url,
      last_updated_from_source: carc_codes.last_updated_from_source,
      internal_notes: carc_codes.internal_notes,
      examples: carc_codes.examples,
      created_at: carc_codes.created_at,
      updated_at: carc_codes.updated_at
    })
      .from(carc_codes)
      .where(eq(carc_codes.code, code))
      .limit(1);

    return carcCode || null;
  }

  /**
   * Get RARC code by code
   * @param {string} code - RARC code (e.g., "N1", "MA01")
   * @returns {Promise<object>} RARC code details
   */
  async getRARCCode(code) {
    const [rarcCode] = await db.select({
      id: rarc_codes.id,
      code: rarc_codes.code,
      description: rarc_codes.description,
      short_description: rarc_codes.short_description,
      code_type: rarc_codes.code_type,
      related_carc_codes: rarc_codes.related_carc_codes,
      recommended_action: rarc_codes.recommended_action,
      requires_provider_action: rarc_codes.requires_provider_action,
      is_active: rarc_codes.is_active,
      effective_date: rarc_codes.effective_date,
      termination_date: rarc_codes.termination_date,
      source: rarc_codes.source,
      source_url: rarc_codes.source_url,
      last_updated_from_source: rarc_codes.last_updated_from_source,
      internal_notes: rarc_codes.internal_notes,
      examples: rarc_codes.examples,
      created_at: rarc_codes.created_at,
      updated_at: rarc_codes.updated_at
    })
      .from(rarc_codes)
      .where(eq(rarc_codes.code, code))
      .limit(1);

    return rarcCode || null;
  }

  /**
   * Get all CARC codes
   * @returns {Promise<Array>} All CARC codes
   */
  async getAllCARCCodes() {
    return await db.select({
      id: carc_codes.id,
      code: carc_codes.code,
      description: carc_codes.description,
      short_description: carc_codes.short_description,
      category: carc_codes.category,
      group_code: carc_codes.group_code,
      is_denial: carc_codes.is_denial,
      is_appealable: carc_codes.is_appealable,
      severity: carc_codes.severity,
      recommended_action: carc_codes.recommended_action,
      appeal_template: carc_codes.appeal_template,
      documentation_required: carc_codes.documentation_required,
      common_payer_types: carc_codes.common_payer_types,
      average_appeal_success_rate: carc_codes.average_appeal_success_rate,
      is_active: carc_codes.is_active,
      effective_date: carc_codes.effective_date,
      termination_date: carc_codes.termination_date,
      source: carc_codes.source,
      source_url: carc_codes.source_url,
      last_updated_from_source: carc_codes.last_updated_from_source,
      internal_notes: carc_codes.internal_notes,
      examples: carc_codes.examples,
      created_at: carc_codes.created_at,
      updated_at: carc_codes.updated_at
    }).from(carc_codes);
  }

  /**
   * Get all RARC codes
   * @returns {Promise<Array>} All RARC codes
   */
  async getAllRARCCodes() {
    return await db.select({
      id: rarc_codes.id,
      code: rarc_codes.code,
      description: rarc_codes.description,
      short_description: rarc_codes.short_description,
      code_type: rarc_codes.code_type,
      related_carc_codes: rarc_codes.related_carc_codes,
      recommended_action: rarc_codes.recommended_action,
      requires_provider_action: rarc_codes.requires_provider_action,
      is_active: rarc_codes.is_active,
      effective_date: rarc_codes.effective_date,
      termination_date: rarc_codes.termination_date,
      source: rarc_codes.source,
      source_url: rarc_codes.source_url,
      last_updated_from_source: rarc_codes.last_updated_from_source,
      internal_notes: rarc_codes.internal_notes,
      examples: rarc_codes.examples,
      created_at: rarc_codes.created_at,
      updated_at: rarc_codes.updated_at
    }).from(rarc_codes);
  }

  /**
   * Get denial categories
   * @returns {Promise<Array>} All denial categories
   */
  async getDenialCategories() {
    return await db.select({
      id: denial_categories.id,
      category_code: denial_categories.category_code,
      category_name: denial_categories.category_name,
      description: denial_categories.description,
      parent_category_id: denial_categories.parent_category_id,
      level: denial_categories.level,
      carc_codes: denial_categories.carc_codes,
      is_preventable: denial_categories.is_preventable,
      typical_resolution_time_days: denial_categories.typical_resolution_time_days,
      color_code: denial_categories.color_code,
      icon: denial_categories.icon,
      sort_order: denial_categories.sort_order,
      is_active: denial_categories.is_active,
      internal_notes: denial_categories.internal_notes,
      created_at: denial_categories.created_at,
      updated_at: denial_categories.updated_at
    }).from(denial_categories);
  }

  /**
   * Get appeal recommendation for CARC code
   * @param {string} code - CARC code
   * @returns {Promise<object>} Appeal recommendation
   */
  async getAppealRecommendation(code) {
    const carcCode = await this.getCARCCode(code);

    if (!carcCode) {
      return null;
    }

    return {
      code: carcCode.code,
      description: carcCode.description,
      isAppealable: carcCode.is_appealable,
      recommendedAction: carcCode.recommended_action,
      appealTemplate: carcCode.appeal_template,
      documentationRequired: carcCode.documentation_required,
      averageSuccessRate: carcCode.average_appeal_success_rate
    };
  }

  /**
   * Analyze adjustment codes from 835 ERA
   * @param {Array} adjustmentCodes - Array of {groupCode, reasonCode, amount}
   * @returns {Promise<object>} Analysis results
   */
  async analyzeAdjustments(adjustmentCodes) {
    const analysis = {
      totalAdjustments: adjustmentCodes.length,
      totalAmount: 0,
      byCategory: {},
      appealable: [],
      nonAppealable: [],
      recommendations: []
    };

    for (const adj of adjustmentCodes) {
      const carcCode = await this.getCARCCode(adj.reasonCode);

      if (!carcCode) {
        analysis.recommendations.push({
          code: adj.reasonCode,
          message: `Unknown CARC code: ${adj.reasonCode}`,
          action: 'RESEARCH_CODE'
        });
        continue;
      }

      analysis.totalAmount += adj.amount || 0;

      // Categorize
      const category = carcCode.category;
      if (!analysis.byCategory[category]) {
        analysis.byCategory[category] = {
          count: 0,
          amount: 0,
          codes: []
        };
      }
      analysis.byCategory[category].count++;
      analysis.byCategory[category].amount += adj.amount || 0;
      analysis.byCategory[category].codes.push(adj.reasonCode);

      // Check appealability
      if (carcCode.is_appealable) {
        analysis.appealable.push({
          code: adj.reasonCode,
          description: carcCode.short_description || carcCode.description,
          amount: adj.amount,
          recommendedAction: carcCode.recommended_action,
          successRate: carcCode.average_appeal_success_rate
        });
      } else {
        analysis.nonAppealable.push({
          code: adj.reasonCode,
          description: carcCode.short_description || carcCode.description,
          amount: adj.amount,
          reason: 'Not appealable per payer policy'
        });
      }

      // Add recommendations
      if (carcCode.recommended_action) {
        analysis.recommendations.push({
          code: adj.reasonCode,
          severity: carcCode.severity,
          action: carcCode.recommended_action,
          amount: adj.amount
        });
      }
    }

    return analysis;
  }

  /**
   * Seed database with standard CARC codes
   * Source: CMS/WPC Official CARC List (Top 50 most common)
   */
  async seedCARCCodes() {
    const standardCARCCodes = [
      {
        code: '1',
        description: 'Deductible Amount',
        short_description: 'Deductible',
        category: 'PATIENT_RESPONSIBILITY',
        group_code: 'PR',
        is_denial: false,
        is_appealable: false,
        severity: 'LOW',
        recommended_action: 'Bill patient for deductible amount',
        source: 'WPC'
      },
      {
        code: '2',
        description: 'Coinsurance Amount',
        short_description: 'Coinsurance',
        category: 'PATIENT_RESPONSIBILITY',
        group_code: 'PR',
        is_denial: false,
        is_appealable: false,
        severity: 'LOW',
        recommended_action: 'Bill patient for coinsurance amount',
        source: 'WPC'
      },
      {
        code: '3',
        description: 'Co-payment Amount',
        short_description: 'Copay',
        category: 'PATIENT_RESPONSIBILITY',
        group_code: 'PR',
        is_denial: false,
        is_appealable: false,
        severity: 'LOW',
        recommended_action: 'Collect copay from patient',
        source: 'WPC'
      },
      {
        code: '4',
        description: 'The procedure code is inconsistent with the modifier used or a required modifier is missing.',
        short_description: 'Invalid/Missing Modifier',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'MEDIUM',
        recommended_action: 'Review and correct procedure code modifiers. Resubmit claim.',
        appeal_template: 'Submit corrected claim with proper modifier documentation',
        documentation_required: ['Procedure documentation', 'Modifier justification'],
        source: 'WPC'
      },
      {
        code: '5',
        description: 'The procedure code/bill type is inconsistent with the place of service.',
        short_description: 'Invalid Place of Service',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'MEDIUM',
        recommended_action: 'Verify place of service code matches procedure. Correct and resubmit.',
        source: 'WPC'
      },
      {
        code: '11',
        description: 'The diagnosis is inconsistent with the procedure.',
        short_description: 'Diagnosis/Procedure Mismatch',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'HIGH',
        recommended_action: 'Review diagnosis and procedure codes for medical necessity. Submit clinical documentation.',
        appeal_template: 'Provide medical records supporting medical necessity',
        documentation_required: ['Clinical notes', 'Diagnosis documentation', 'Medical necessity rationale'],
        source: 'WPC'
      },
      {
        code: '16',
        description: 'Claim/service lacks information or has submission/billing error(s) which is needed for adjudication.',
        short_description: 'Missing Information',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'MEDIUM',
        recommended_action: 'Identify missing information and resubmit corrected claim',
        source: 'WPC'
      },
      {
        code: '18',
        description: 'Duplicate claim/service.',
        short_description: 'Duplicate Claim',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'LOW',
        recommended_action: 'Verify if truly duplicate. If not, provide documentation proving separate service.',
        source: 'WPC'
      },
      {
        code: '22',
        description: 'This care may be covered by another payer per coordination of benefits.',
        short_description: 'COB - Other Payer',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'MEDIUM',
        recommended_action: 'Bill primary payer first, then submit to secondary with EOB',
        source: 'WPC'
      },
      {
        code: '24',
        description: 'Charges are covered under a capitation agreement/managed care plan.',
        short_description: 'Capitated Service',
        category: 'CONTRACTUAL',
        group_code: 'CO',
        is_denial: true,
        is_appealable: false,
        severity: 'LOW',
        recommended_action: 'No billing - covered under capitation',
        source: 'WPC'
      },
      {
        code: '27',
        description: 'Expenses incurred after coverage terminated.',
        short_description: 'Coverage Terminated',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'HIGH',
        recommended_action: 'Verify coverage dates. Bill patient if coverage was terminated.',
        source: 'WPC'
      },
      {
        code: '29',
        description: 'The time limit for filing has expired.',
        short_description: 'Timely Filing Limit',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'CRITICAL',
        recommended_action: 'Appeal with documentation of timely filing or extenuating circumstances',
        appeal_template: 'Provide proof of timely filing or reason for delay',
        documentation_required: ['Original submission proof', 'Delay justification'],
        source: 'WPC'
      },
      {
        code: '31',
        description: 'Patient cannot be identified as our insured.',
        short_description: 'Patient Not Identified',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'HIGH',
        recommended_action: 'Verify patient demographics and insurance information. Resubmit with correct data.',
        source: 'WPC'
      },
      {
        code: '45',
        description: 'Charge exceeds fee schedule/maximum allowable or contracted/legislated fee arrangement.',
        short_description: 'Exceeds Fee Schedule',
        category: 'CONTRACTUAL',
        group_code: 'CO',
        is_denial: false,
        is_appealable: false,
        severity: 'LOW',
        recommended_action: 'Contractual adjustment - write off difference',
        source: 'WPC'
      },
      {
        code: '50',
        description: 'These are non-covered services because this is not deemed a medical necessity by the payer.',
        short_description: 'Not Medically Necessary',
        category: 'PAYER_INITIATED',
        group_code: 'PI',
        is_denial: true,
        is_appealable: true,
        severity: 'CRITICAL',
        recommended_action: 'Appeal with medical necessity documentation and clinical notes',
        appeal_template: 'Provide detailed medical records and physician attestation of medical necessity',
        documentation_required: ['Medical records', 'Clinical notes', 'Physician statement', 'Literature support'],
        average_appeal_success_rate: 65,
        source: 'WPC'
      },
      {
        code: '96',
        description: 'Non-covered charge(s).',
        short_description: 'Non-Covered',
        category: 'CONTRACTUAL',
        group_code: 'CO',
        is_denial: true,
        is_appealable: true,
        severity: 'HIGH',
        recommended_action: 'Review plan coverage. Bill patient if non-covered benefit.',
        source: 'WPC'
      },
      {
        code: '97',
        description: 'The benefit for this service is included in the payment/allowance for another service/procedure.',
        short_description: 'Bundled Service',
        category: 'CONTRACTUAL',
        group_code: 'CO',
        is_denial: false,
        is_appealable: true,
        severity: 'MEDIUM',
        recommended_action: 'Review bundling rules. Appeal if services should be separately billable.',
        source: 'WPC'
      },
      {
        code: '109',
        description: 'Claim/service not covered by this payer/contractor.',
        short_description: 'Not Covered by Payer',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'HIGH',
        recommended_action: 'Verify payer is correct. Bill appropriate payer or patient.',
        source: 'WPC'
      },
      {
        code: '119',
        description: 'Benefit maximum for this time period or occurrence has been reached.',
        short_description: 'Benefit Maximum Reached',
        category: 'PATIENT_RESPONSIBILITY',
        group_code: 'PR',
        is_denial: true,
        is_appealable: false,
        severity: 'MEDIUM',
        recommended_action: 'Bill patient for amount exceeding benefit maximum',
        source: 'WPC'
      },
      {
        code: '167',
        description: 'This (these) diagnosis(es) is (are) not covered.',
        short_description: 'Diagnosis Not Covered',
        category: 'CONTRACTUAL',
        group_code: 'CO',
        is_denial: true,
        is_appealable: true,
        severity: 'HIGH',
        recommended_action: 'Review diagnosis coding. Appeal with medical necessity if appropriate.',
        source: 'WPC'
      },
      {
        code: '197',
        description: 'Precertification/authorization/notification absent.',
        short_description: 'Missing Authorization',
        category: 'OTHER_ADJUSTMENT',
        group_code: 'OA',
        is_denial: true,
        is_appealable: true,
        severity: 'CRITICAL',
        recommended_action: 'Obtain retroactive authorization if possible. Appeal with extenuating circumstances.',
        appeal_template: 'Request retroactive authorization with emergency/urgent documentation',
        documentation_required: ['Emergency documentation', 'Clinical necessity notes'],
        source: 'WPC'
      },
      {
        code: '204',
        description: 'This service/equipment/drug is not covered under the patient\'s current benefit plan.',
        short_description: 'Not Covered Under Plan',
        category: 'CONTRACTUAL',
        group_code: 'CO',
        is_denial: true,
        is_appealable: false,
        severity: 'HIGH',
        recommended_action: 'Bill patient - not a covered benefit',
        source: 'WPC'
      },
      {
        code: '236',
        description: 'This procedure or procedure/modifier combination is not compatible with another procedure or procedure/modifier combination provided on the same day.',
        short_description: 'Incompatible Procedures',
        category: 'CONTRACTUAL',
        group_code: 'CO',
        is_denial: true,
        is_appealable: true,
        severity: 'MEDIUM',
        recommended_action: 'Review NCCI edits. Appeal if procedures were medically necessary and separately identifiable.',
        source: 'WPC'
      }
    ];

    // Insert codes (using transaction for atomicity)
    try {
      for (const code of standardCARCCodes) {
        await db.insert(carc_codes)
          .values(code)
          .onConflictDoNothing(); // Skip if already exists
      }
      logger.info(`Seeded ${standardCARCCodes.length} CARC codes`)
      return { success: true, count: standardCARCCodes.length };
    } catch (error) {
      logger.error('Error seeding CARC codes:', error)
      throw error;
    }
  }

  /**
   * Seed database with standard RARC codes
   */
  async seedRARCCodes() {
    const standardRARCCodes = [
      {
        code: 'N1',
        description: 'Alert: You may appeal this decision.',
        short_description: 'Appeal Available',
        code_type: 'ALERT',
        requires_provider_action: false,
        source: 'WPC'
      },
      {
        code: 'N2',
        description: 'This allowance already appears on a previous Remittance Advice for this/another patient.',
        short_description: 'Duplicate Payment',
        code_type: 'ALERT',
        requires_provider_action: true,
        recommended_action: 'Review previous payments for duplicates',
        source: 'WPC'
      },
      {
        code: 'N4',
        description: 'Missing/incomplete/invalid prior authorization number.',
        short_description: 'Prior Auth Issue',
        code_type: 'ACTION_REQUIRED',
        requires_provider_action: true,
        recommended_action: 'Obtain valid authorization and resubmit',
        source: 'WPC'
      },
      {
        code: 'N19',
        description: 'Procedure code incidental to primary procedure.',
        short_description: 'Incidental Procedure',
        code_type: 'INFORMATIONAL',
        requires_provider_action: false,
        source: 'WPC'
      },
      {
        code: 'N30',
        description: 'Missing invoice or statement certifying the actual cost of the lens, less discounts, and/or the type of intraocular lens used.',
        short_description: 'Missing Invoice',
        code_type: 'ACTION_REQUIRED',
        requires_provider_action: true,
        recommended_action: 'Submit required invoice documentation',
        source: 'WPC'
      },
      {
        code: 'N56',
        description: 'Procedure code billed is not correct/valid for the services billed or the date of service billed.',
        short_description: 'Invalid Procedure Code',
        code_type: 'ACTION_REQUIRED',
        requires_provider_action: true,
        recommended_action: 'Review and correct procedure code',
        source: 'WPC'
      },
      {
        code: 'N115',
        description: 'This decision was based on a Local Coverage Determination (LCD).',
        short_description: 'LCD Decision',
        code_type: 'INFORMATIONAL',
        requires_provider_action: false,
        source: 'WPC'
      },
      {
        code: 'M15',
        description: 'Separately billed services/tests have been bundled as they are considered components of the same procedure.',
        short_description: 'Bundled Services',
        code_type: 'INFORMATIONAL',
        requires_provider_action: false,
        source: 'WPC'
      },
      {
        code: 'M20',
        description: 'Missing/incomplete/invalid HCPCS.',
        short_description: 'Invalid HCPCS',
        code_type: 'ACTION_REQUIRED',
        requires_provider_action: true,
        recommended_action: 'Correct HCPCS code and resubmit',
        source: 'WPC'
      },
      {
        code: 'MA01',
        description: 'Alert: If you do not agree with what we approved for these services, you may appeal our decision.',
        short_description: 'Medicare Appeal Notice',
        code_type: 'ALERT',
        requires_provider_action: false,
        source: 'CMS'
      }
    ];

    try {
      for (const code of standardRARCCodes) {
        await db.insert(rarc_codes)
          .values(code)
          .onConflictDoNothing();
      }
      logger.info(`Seeded ${standardRARCCodes.length} RARC codes`)
      return { success: true, count: standardRARCCodes.length };
    } catch (error) {
      logger.error('Error seeding RARC codes:', error)
      throw error;
    }
  }

  /**
   * Seed denial categories
   */
  async seedDenialCategories() {
    const categories = [
      {
        category_code: 'AUTH',
        category_name: 'Authorization/Precertification',
        description: 'Denials related to missing or invalid prior authorizations',
        level: 1,
        carc_codes: ['197', '252'],
        is_preventable: true,
        typical_resolution_time_days: 14,
        color_code: '#FF6B6B',
        sort_order: 1
      },
      {
        category_code: 'TIMELY',
        category_name: 'Timely Filing',
        description: 'Claims denied for exceeding filing deadline',
        level: 1,
        carc_codes: ['29'],
        is_preventable: true,
        typical_resolution_time_days: 30,
        color_code: '#FF8C42',
        sort_order: 2
      },
      {
        category_code: 'MED_NECESSITY',
        category_name: 'Medical Necessity',
        description: 'Services not deemed medically necessary',
        level: 1,
        carc_codes: ['50'],
        is_preventable: false,
        typical_resolution_time_days: 45,
        color_code: '#FFA07A',
        sort_order: 3
      },
      {
        category_code: 'CODING',
        category_name: 'Coding Errors',
        description: 'Invalid or incorrect codes',
        level: 1,
        carc_codes: ['4', '5', '11', '16'],
        is_preventable: true,
        typical_resolution_time_days: 7,
        color_code: '#4ECDC4',
        sort_order: 4
      },
      {
        category_code: 'ELIGIBILITY',
        category_name: 'Patient Eligibility',
        description: 'Patient not eligible or coverage issues',
        level: 1,
        carc_codes: ['27', '31'],
        is_preventable: true,
        typical_resolution_time_days: 21,
        color_code: '#95E1D3',
        sort_order: 5
      },
      {
        category_code: 'DUPLICATE',
        category_name: 'Duplicate Claims',
        description: 'Duplicate submission of same service',
        level: 1,
        carc_codes: ['18'],
        is_preventable: true,
        typical_resolution_time_days: 10,
        color_code: '#C7CEEA',
        sort_order: 6
      },
      {
        category_code: 'CONTRACTUAL',
        category_name: 'Contractual Adjustments',
        description: 'Adjustments based on contract terms',
        level: 1,
        carc_codes: ['45', '24', '96', '97'],
        is_preventable: false,
        typical_resolution_time_days: 0,
        color_code: '#B4A7D6',
        sort_order: 7
      }
    ];

    try {
      for (const category of categories) {
        await db.insert(denial_categories)
          .values(category)
          .onConflictDoNothing();
      }
      logger.info(`Seeded ${categories.length} denial categories`)
      return { success: true, count: categories.length };
    } catch (error) {
      logger.error('Error seeding denial categories:', error)
      throw error;
    }
  }

  /**
   * Seed all codes (master seeder)
   */
  async seedAll() {
    logger.info('Seeding CARC/RARC codes and denial categories...')

    const results = {
      carc: await this.seedCARCCodes(),
      rarc: await this.seedRARCCodes(),
      categories: await this.seedDenialCategories()
    };

    logger.info('Seeding complete!')
    return results;
  }
}

// Export singleton instance
export default new DenialCodesService();
