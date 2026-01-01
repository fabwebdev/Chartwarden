import DenialCodesService from '../services/DenialCodes.service.js';
import { db } from '../db/index.js';
import { carc_codes, rarc_codes, denial_categories, payer_code_mappings } from '../db/schemas/index.js';
import { eq, and, or, ilike, sql, desc, asc, isNull } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Denial Codes Controller
 * Phase 3C - CARC/RARC Code Library Management
 *
 * Purpose: Provide API endpoints for the denial codes library
 * Features:
 *   - List and search CARC/RARC codes
 *   - Get code details with resolution recommendations
 *   - Manage denial categories
 *   - Handle payer code mappings
 *   - Analyze adjustments and provide appeal guidance
 */
class DenialCodesController {
  // ============================================
  // CARC CODE ENDPOINTS
  // ============================================

  /**
   * List all CARC codes with optional filtering
   * GET /api/denial-codes/carc
   */
  async listCARCCodes(req, res) {
    try {
      const {
        category,
        groupCode,
        isAppealable,
        isDenial,
        severity,
        search,
        isActive = true,
        limit = 100,
        offset = 0
      } = req.query;

      // Build conditions array
      const conditions = [];

      if (isActive !== undefined && isActive !== 'all') {
        conditions.push(eq(carc_codes.is_active, isActive === 'true' || isActive === true));
      }

      if (category) {
        conditions.push(eq(carc_codes.category, category));
      }

      if (groupCode) {
        conditions.push(eq(carc_codes.group_code, groupCode));
      }

      if (isAppealable !== undefined) {
        conditions.push(eq(carc_codes.is_appealable, isAppealable === 'true' || isAppealable === true));
      }

      if (isDenial !== undefined) {
        conditions.push(eq(carc_codes.is_denial, isDenial === 'true' || isDenial === true));
      }

      if (severity) {
        conditions.push(eq(carc_codes.severity, severity));
      }

      if (search) {
        conditions.push(
          or(
            ilike(carc_codes.code, `%${search}%`),
            ilike(carc_codes.description, `%${search}%`),
            ilike(carc_codes.short_description, `%${search}%`),
            ilike(carc_codes.recommended_action, `%${search}%`)
          )
        );
      }

      // Execute query
      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const codes = await db.select({
        id: carc_codes.id,
        code: carc_codes.code,
        description: carc_codes.description,
        shortDescription: carc_codes.short_description,
        category: carc_codes.category,
        groupCode: carc_codes.group_code,
        isDenial: carc_codes.is_denial,
        isAppealable: carc_codes.is_appealable,
        severity: carc_codes.severity,
        recommendedAction: carc_codes.recommended_action,
        appealTemplate: carc_codes.appeal_template,
        documentationRequired: carc_codes.documentation_required,
        averageAppealSuccessRate: carc_codes.average_appeal_success_rate,
        isActive: carc_codes.is_active,
        source: carc_codes.source
      })
        .from(carc_codes)
        .where(whereClause)
        .orderBy(asc(carc_codes.code))
        .limit(Number(limit))
        .offset(Number(offset));

      // Get total count
      const [countResult] = await db.select({
        count: sql`COUNT(*)::int`
      })
        .from(carc_codes)
        .where(whereClause);

      res.json({
        success: true,
        count: codes.length,
        total: countResult?.count || 0,
        codes
      });
    } catch (error) {
      logger.error('Error listing CARC codes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve CARC codes',
        message: error.message
      });
    }
  }

  /**
   * Get single CARC code with full details and resolution recommendations
   * GET /api/denial-codes/carc/:code
   */
  async getCARCCode(req, res) {
    try {
      const { code } = req.params;

      const carcCode = await DenialCodesService.getCARCCode(code);

      if (!carcCode) {
        return res.status(404).json({
          success: false,
          error: 'CARC code not found',
          message: `No CARC code found with code: ${code}`
        });
      }

      // Get resolution recommendation
      const recommendation = await DenialCodesService.getAppealRecommendation(code);

      // Find related denial category
      const relatedCategories = await db.select({
        id: denial_categories.id,
        categoryCode: denial_categories.category_code,
        categoryName: denial_categories.category_name,
        isPreventable: denial_categories.is_preventable,
        typicalResolutionTimeDays: denial_categories.typical_resolution_time_days
      })
        .from(denial_categories)
        .where(
          sql`${denial_categories.carc_codes}::jsonb @> ${JSON.stringify([code])}::jsonb`
        );

      res.json({
        success: true,
        carcCode: {
          ...carcCode,
          recommendation,
          relatedCategories
        }
      });
    } catch (error) {
      logger.error('Error getting CARC code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve CARC code',
        message: error.message
      });
    }
  }

  /**
   * Get CARC codes grouped by category
   * GET /api/denial-codes/carc/by-category
   */
  async getCARCCodesByCategory(req, res) {
    try {
      const codes = await db.select({
        id: carc_codes.id,
        code: carc_codes.code,
        description: carc_codes.description,
        shortDescription: carc_codes.short_description,
        category: carc_codes.category,
        groupCode: carc_codes.group_code,
        isDenial: carc_codes.is_denial,
        isAppealable: carc_codes.is_appealable,
        severity: carc_codes.severity,
        recommendedAction: carc_codes.recommended_action
      })
        .from(carc_codes)
        .where(eq(carc_codes.is_active, true))
        .orderBy(asc(carc_codes.code));

      // Group by category
      const byCategory = codes.reduce((acc, code) => {
        const cat = code.category || 'UNCATEGORIZED';
        if (!acc[cat]) {
          acc[cat] = [];
        }
        acc[cat].push(code);
        return acc;
      }, {});

      res.json({
        success: true,
        categories: Object.keys(byCategory),
        byCategory
      });
    } catch (error) {
      logger.error('Error getting CARC codes by category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve CARC codes by category',
        message: error.message
      });
    }
  }

  // ============================================
  // RARC CODE ENDPOINTS
  // ============================================

  /**
   * List all RARC codes with optional filtering
   * GET /api/denial-codes/rarc
   */
  async listRARCCodes(req, res) {
    try {
      const {
        codeType,
        requiresProviderAction,
        search,
        isActive = true,
        limit = 100,
        offset = 0
      } = req.query;

      const conditions = [];

      if (isActive !== undefined && isActive !== 'all') {
        conditions.push(eq(rarc_codes.is_active, isActive === 'true' || isActive === true));
      }

      if (codeType) {
        conditions.push(eq(rarc_codes.code_type, codeType));
      }

      if (requiresProviderAction !== undefined) {
        conditions.push(eq(rarc_codes.requires_provider_action, requiresProviderAction === 'true' || requiresProviderAction === true));
      }

      if (search) {
        conditions.push(
          or(
            ilike(rarc_codes.code, `%${search}%`),
            ilike(rarc_codes.description, `%${search}%`),
            ilike(rarc_codes.short_description, `%${search}%`),
            ilike(rarc_codes.recommended_action, `%${search}%`)
          )
        );
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const codes = await db.select({
        id: rarc_codes.id,
        code: rarc_codes.code,
        description: rarc_codes.description,
        shortDescription: rarc_codes.short_description,
        codeType: rarc_codes.code_type,
        relatedCarcCodes: rarc_codes.related_carc_codes,
        recommendedAction: rarc_codes.recommended_action,
        requiresProviderAction: rarc_codes.requires_provider_action,
        isActive: rarc_codes.is_active,
        source: rarc_codes.source
      })
        .from(rarc_codes)
        .where(whereClause)
        .orderBy(asc(rarc_codes.code))
        .limit(Number(limit))
        .offset(Number(offset));

      const [countResult] = await db.select({
        count: sql`COUNT(*)::int`
      })
        .from(rarc_codes)
        .where(whereClause);

      res.json({
        success: true,
        count: codes.length,
        total: countResult?.count || 0,
        codes
      });
    } catch (error) {
      logger.error('Error listing RARC codes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve RARC codes',
        message: error.message
      });
    }
  }

  /**
   * Get single RARC code with full details
   * GET /api/denial-codes/rarc/:code
   */
  async getRARCCode(req, res) {
    try {
      const { code } = req.params;

      const rarcCode = await DenialCodesService.getRARCCode(code);

      if (!rarcCode) {
        return res.status(404).json({
          success: false,
          error: 'RARC code not found',
          message: `No RARC code found with code: ${code}`
        });
      }

      // Get related CARC codes if any
      let relatedCARCDetails = [];
      if (rarcCode.related_carc_codes && rarcCode.related_carc_codes.length > 0) {
        for (const carcCode of rarcCode.related_carc_codes) {
          const details = await DenialCodesService.getCARCCode(carcCode);
          if (details) {
            relatedCARCDetails.push({
              code: details.code,
              description: details.short_description || details.description,
              isAppealable: details.is_appealable,
              recommendedAction: details.recommended_action
            });
          }
        }
      }

      res.json({
        success: true,
        rarcCode: {
          ...rarcCode,
          relatedCARCDetails
        }
      });
    } catch (error) {
      logger.error('Error getting RARC code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve RARC code',
        message: error.message
      });
    }
  }

  // ============================================
  // DENIAL CATEGORY ENDPOINTS
  // ============================================

  /**
   * List all denial categories
   * GET /api/denial-codes/categories
   */
  async listCategories(req, res) {
    try {
      const { isActive = true, includeStats = false } = req.query;

      const conditions = [];
      if (isActive !== undefined && isActive !== 'all') {
        conditions.push(eq(denial_categories.is_active, isActive === 'true' || isActive === true));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const categories = await db.select({
        id: denial_categories.id,
        categoryCode: denial_categories.category_code,
        categoryName: denial_categories.category_name,
        description: denial_categories.description,
        parentCategoryId: denial_categories.parent_category_id,
        level: denial_categories.level,
        carcCodes: denial_categories.carc_codes,
        isPreventable: denial_categories.is_preventable,
        typicalResolutionTimeDays: denial_categories.typical_resolution_time_days,
        colorCode: denial_categories.color_code,
        icon: denial_categories.icon,
        sortOrder: denial_categories.sort_order,
        isActive: denial_categories.is_active
      })
        .from(denial_categories)
        .where(whereClause)
        .orderBy(asc(denial_categories.sort_order));

      res.json({
        success: true,
        count: categories.length,
        categories
      });
    } catch (error) {
      logger.error('Error listing denial categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve denial categories',
        message: error.message
      });
    }
  }

  /**
   * Get category with associated CARC codes
   * GET /api/denial-codes/categories/:code
   */
  async getCategory(req, res) {
    try {
      const { code } = req.params;

      const [category] = await db.select()
        .from(denial_categories)
        .where(eq(denial_categories.category_code, code))
        .limit(1);

      if (!category) {
        return res.status(404).json({
          success: false,
          error: 'Category not found',
          message: `No denial category found with code: ${code}`
        });
      }

      // Get associated CARC codes with full details
      let associatedCARCCodes = [];
      if (category.carc_codes && category.carc_codes.length > 0) {
        for (const carcCode of category.carc_codes) {
          const details = await DenialCodesService.getCARCCode(carcCode);
          if (details) {
            associatedCARCCodes.push({
              code: details.code,
              description: details.short_description || details.description,
              isAppealable: details.is_appealable,
              severity: details.severity,
              recommendedAction: details.recommended_action
            });
          }
        }
      }

      res.json({
        success: true,
        category: {
          ...category,
          associatedCARCCodes
        }
      });
    } catch (error) {
      logger.error('Error getting denial category:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve denial category',
        message: error.message
      });
    }
  }

  // ============================================
  // PAYER CODE MAPPING ENDPOINTS
  // ============================================

  /**
   * List payer code mappings
   * GET /api/denial-codes/payer-mappings
   */
  async listPayerMappings(req, res) {
    try {
      const {
        payerName,
        payerIdentifier,
        mappingConfidence,
        isActive = true,
        limit = 100,
        offset = 0
      } = req.query;

      const conditions = [];

      if (isActive !== undefined && isActive !== 'all') {
        conditions.push(eq(payer_code_mappings.is_active, isActive === 'true' || isActive === true));
      }

      if (payerName) {
        conditions.push(ilike(payer_code_mappings.payer_name, `%${payerName}%`));
      }

      if (payerIdentifier) {
        conditions.push(eq(payer_code_mappings.payer_identifier, payerIdentifier));
      }

      if (mappingConfidence) {
        conditions.push(eq(payer_code_mappings.mapping_confidence, mappingConfidence));
      }

      const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

      const mappings = await db.select({
        id: payer_code_mappings.id,
        payerName: payer_code_mappings.payer_name,
        payerIdentifier: payer_code_mappings.payer_identifier,
        payerCode: payer_code_mappings.payer_code,
        payerCodeDescription: payer_code_mappings.payer_code_description,
        standardCarcCode: payer_code_mappings.standard_carc_code,
        standardRarcCode: payer_code_mappings.standard_rarc_code,
        mappingConfidence: payer_code_mappings.mapping_confidence,
        mappingNotes: payer_code_mappings.mapping_notes,
        verifiedBy: payer_code_mappings.verified_by,
        verifiedAt: payer_code_mappings.verified_at,
        isActive: payer_code_mappings.is_active
      })
        .from(payer_code_mappings)
        .where(whereClause)
        .orderBy(asc(payer_code_mappings.payer_name), asc(payer_code_mappings.payer_code))
        .limit(Number(limit))
        .offset(Number(offset));

      const [countResult] = await db.select({
        count: sql`COUNT(*)::int`
      })
        .from(payer_code_mappings)
        .where(whereClause);

      res.json({
        success: true,
        count: mappings.length,
        total: countResult?.count || 0,
        mappings
      });
    } catch (error) {
      logger.error('Error listing payer mappings:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve payer code mappings',
        message: error.message
      });
    }
  }

  /**
   * Translate payer code to standard CARC/RARC
   * GET /api/denial-codes/payer-mappings/translate
   */
  async translatePayerCode(req, res) {
    try {
      const { payerCode, payerIdentifier, payerName } = req.query;

      if (!payerCode) {
        return res.status(400).json({
          success: false,
          error: 'Missing required parameter',
          message: 'payerCode is required'
        });
      }

      const conditions = [
        eq(payer_code_mappings.payer_code, payerCode),
        eq(payer_code_mappings.is_active, true)
      ];

      if (payerIdentifier) {
        conditions.push(eq(payer_code_mappings.payer_identifier, payerIdentifier));
      }

      if (payerName) {
        conditions.push(ilike(payer_code_mappings.payer_name, `%${payerName}%`));
      }

      const [mapping] = await db.select()
        .from(payer_code_mappings)
        .where(and(...conditions))
        .orderBy(desc(payer_code_mappings.mapping_confidence))
        .limit(1);

      if (!mapping) {
        return res.json({
          success: true,
          found: false,
          message: 'No mapping found for this payer code',
          payerCode
        });
      }

      // Get standard code details
      let carcDetails = null;
      let rarcDetails = null;

      if (mapping.standard_carc_code) {
        carcDetails = await DenialCodesService.getCARCCode(mapping.standard_carc_code);
      }

      if (mapping.standard_rarc_code) {
        rarcDetails = await DenialCodesService.getRARCCode(mapping.standard_rarc_code);
      }

      res.json({
        success: true,
        found: true,
        mapping: {
          payerCode: mapping.payer_code,
          payerCodeDescription: mapping.payer_code_description,
          standardCarcCode: mapping.standard_carc_code,
          standardRarcCode: mapping.standard_rarc_code,
          mappingConfidence: mapping.mapping_confidence,
          carcDetails: carcDetails ? {
            code: carcDetails.code,
            description: carcDetails.description,
            isAppealable: carcDetails.is_appealable,
            recommendedAction: carcDetails.recommended_action
          } : null,
          rarcDetails: rarcDetails ? {
            code: rarcDetails.code,
            description: rarcDetails.description,
            requiresProviderAction: rarcDetails.requires_provider_action,
            recommendedAction: rarcDetails.recommended_action
          } : null
        }
      });
    } catch (error) {
      logger.error('Error translating payer code:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to translate payer code',
        message: error.message
      });
    }
  }

  // ============================================
  // ANALYSIS & RECOMMENDATION ENDPOINTS
  // ============================================

  /**
   * Analyze adjustment codes and provide recommendations
   * POST /api/denial-codes/analyze
   */
  async analyzeAdjustments(req, res) {
    try {
      const { adjustmentCodes } = req.body;

      if (!adjustmentCodes || !Array.isArray(adjustmentCodes)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request body',
          message: 'adjustmentCodes must be an array of {groupCode, reasonCode, amount}'
        });
      }

      const analysis = await DenialCodesService.analyzeAdjustments(adjustmentCodes);

      res.json({
        success: true,
        analysis
      });
    } catch (error) {
      logger.error('Error analyzing adjustments:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to analyze adjustments',
        message: error.message
      });
    }
  }

  /**
   * Get appeal recommendation for a CARC code
   * GET /api/denial-codes/recommendations/:code
   */
  async getRecommendation(req, res) {
    try {
      const { code } = req.params;

      const recommendation = await DenialCodesService.getAppealRecommendation(code);

      if (!recommendation) {
        return res.status(404).json({
          success: false,
          error: 'Code not found',
          message: `No CARC code found with code: ${code}`
        });
      }

      // Enhance recommendation with additional context
      const enhancedRecommendation = {
        ...recommendation,
        resolutionSteps: this._getResolutionSteps(recommendation),
        appealTips: this._getAppealTips(recommendation),
        preventionStrategies: this._getPreventionStrategies(recommendation)
      };

      res.json({
        success: true,
        recommendation: enhancedRecommendation
      });
    } catch (error) {
      logger.error('Error getting recommendation:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get recommendation',
        message: error.message
      });
    }
  }

  /**
   * Get resolution steps based on CARC code
   * @private
   */
  _getResolutionSteps(recommendation) {
    const steps = [];

    if (!recommendation.isAppealable) {
      steps.push({
        step: 1,
        action: 'Review denial reason',
        description: 'Verify the denial reason is correct and applicable'
      });
      steps.push({
        step: 2,
        action: 'Determine patient responsibility',
        description: 'If patient responsible, update patient balance and send statement'
      });
      steps.push({
        step: 3,
        action: 'Write off if contractual',
        description: 'Apply contractual adjustment if required by payer contract'
      });
    } else {
      steps.push({
        step: 1,
        action: 'Review denial documentation',
        description: 'Gather all relevant clinical documentation and claim details'
      });
      steps.push({
        step: 2,
        action: 'Verify appeal eligibility',
        description: 'Confirm claim is within appeal timeframe and meets criteria'
      });
      steps.push({
        step: 3,
        action: 'Prepare appeal package',
        description: recommendation.recommendedAction || 'Compile supporting documentation for appeal'
      });
      steps.push({
        step: 4,
        action: 'Submit appeal',
        description: 'Submit appeal via payer-preferred method (portal, fax, mail)'
      });
      steps.push({
        step: 5,
        action: 'Track and follow up',
        description: 'Monitor appeal status and follow up as needed'
      });
    }

    return steps;
  }

  /**
   * Get appeal tips based on code characteristics
   * @private
   */
  _getAppealTips(recommendation) {
    const tips = [];

    if (!recommendation.isAppealable) {
      tips.push('This code is typically not appealable');
      tips.push('Consider reviewing the original claim for errors before writing off');
      return tips;
    }

    if (recommendation.averageSuccessRate && recommendation.averageSuccessRate >= 70) {
      tips.push(`High success rate (${recommendation.averageSuccessRate}%) - Strong appeal candidate`);
    } else if (recommendation.averageSuccessRate && recommendation.averageSuccessRate >= 50) {
      tips.push(`Moderate success rate (${recommendation.averageSuccessRate}%) - Ensure strong documentation`);
    } else if (recommendation.averageSuccessRate) {
      tips.push(`Lower success rate (${recommendation.averageSuccessRate}%) - Requires exceptional documentation`);
    }

    if (recommendation.documentationRequired && recommendation.documentationRequired.length > 0) {
      tips.push(`Required documentation: ${recommendation.documentationRequired.join(', ')}`);
    }

    if (recommendation.appealTemplate) {
      tips.push('Use the provided appeal template as a starting point');
    }

    tips.push('Include all relevant dates of service and claim numbers');
    tips.push('Reference specific policy language supporting your position');
    tips.push('Submit within the payer-specified timeframe');

    return tips;
  }

  /**
   * Get prevention strategies for common denial codes
   * @private
   */
  _getPreventionStrategies(recommendation) {
    const strategies = [];
    const code = recommendation.code;

    // Code-specific prevention strategies
    const preventionMap = {
      '4': ['Verify modifier requirements before claim submission', 'Use modifier validation tools'],
      '5': ['Validate place of service matches procedure type', 'Review POS codes for accuracy'],
      '11': ['Ensure diagnosis codes support medical necessity', 'Review diagnosis-procedure linkage'],
      '16': ['Implement claim scrubbing to catch missing information', 'Use pre-submission checklists'],
      '18': ['Check for duplicate claims before submission', 'Implement duplicate detection'],
      '22': ['Verify primary payer information', 'Bill primary payer first'],
      '27': ['Verify eligibility before providing services', 'Check coverage dates'],
      '29': ['Submit claims within filing limits', 'Set up timely filing alerts'],
      '31': ['Verify patient demographics match payer records', 'Update patient information regularly'],
      '50': ['Document medical necessity thoroughly', 'Include clinical rationale in notes'],
      '96': ['Review plan coverage before services', 'Obtain pre-authorization when required'],
      '97': ['Review bundling edits before submission', 'Use NCCI edit checking tools'],
      '197': ['Obtain prior authorization before services', 'Track authorization expiration dates']
    };

    if (preventionMap[code]) {
      strategies.push(...preventionMap[code]);
    }

    // General prevention strategies
    strategies.push('Implement robust claim scrubbing before submission');
    strategies.push('Verify patient eligibility at time of service');
    strategies.push('Train staff on common denial causes');

    return strategies;
  }

  // ============================================
  // SEEDING ENDPOINTS (Admin only)
  // ============================================

  /**
   * Seed CARC codes
   * POST /api/denial-codes/seed/carc
   */
  async seedCARCCodes(req, res) {
    try {
      const result = await DenialCodesService.seedCARCCodes();
      res.json({
        success: true,
        message: 'CARC codes seeded successfully',
        ...result
      });
    } catch (error) {
      logger.error('Error seeding CARC codes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to seed CARC codes',
        message: error.message
      });
    }
  }

  /**
   * Seed RARC codes
   * POST /api/denial-codes/seed/rarc
   */
  async seedRARCCodes(req, res) {
    try {
      const result = await DenialCodesService.seedRARCCodes();
      res.json({
        success: true,
        message: 'RARC codes seeded successfully',
        ...result
      });
    } catch (error) {
      logger.error('Error seeding RARC codes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to seed RARC codes',
        message: error.message
      });
    }
  }

  /**
   * Seed denial categories
   * POST /api/denial-codes/seed/categories
   */
  async seedCategories(req, res) {
    try {
      const result = await DenialCodesService.seedDenialCategories();
      res.json({
        success: true,
        message: 'Denial categories seeded successfully',
        ...result
      });
    } catch (error) {
      logger.error('Error seeding denial categories:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to seed denial categories',
        message: error.message
      });
    }
  }

  /**
   * Seed all codes
   * POST /api/denial-codes/seed
   */
  async seedAll(req, res) {
    try {
      const results = await DenialCodesService.seedAll();
      res.json({
        success: true,
        message: 'All codes seeded successfully',
        results
      });
    } catch (error) {
      logger.error('Error seeding all codes:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to seed codes',
        message: error.message
      });
    }
  }
}

export default new DenialCodesController();
