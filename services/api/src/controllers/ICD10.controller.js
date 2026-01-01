import ICD10Service from '../services/ICD10.service.js';
import { logger } from '../utils/logger.js';

/**
 * ICD-10 Controller
 *
 * Provides API endpoints for ICD-10 diagnosis code lookup with:
 * - Fast autocomplete suggestions (<200ms target)
 * - Exact code lookups
 * - Full-text search
 * - Chapter and category browsing
 * - Cache statistics
 * - Hospice-relevant code filtering
 */
class ICD10Controller {
  // ============================================
  // AUTOCOMPLETE ENDPOINTS
  // ============================================

  /**
   * Autocomplete ICD-10 codes
   * GET /api/icd10/autocomplete
   *
   * Fast autocomplete for diagnosis code selection in forms.
   * Searches by code prefix (e.g., "E11") or description text (e.g., "diabetes").
   * Optimized for sub-200ms response time.
   */
  async autocomplete(req, res) {
    const startTime = Date.now();

    try {
      const {
        q: query,
        limit = 20,
        billableOnly = 'true',
        hospiceRelevant = 'false'
      } = req.query;

      if (!query || query.length < 2) {
        return res.json({
          success: true,
          results: [],
          count: 0,
          responseTimeMs: Date.now() - startTime,
          message: 'Query must be at least 2 characters'
        });
      }

      const results = await ICD10Service.autocomplete(query, {
        limit: Math.min(Number(limit), 50),
        billableOnly: billableOnly === 'true',
        hospiceRelevant: hospiceRelevant === 'true'
      });

      const responseTimeMs = Date.now() - startTime;

      res.json({
        success: true,
        results,
        count: results.length,
        responseTimeMs,
        cached: responseTimeMs < 20 // Likely cache hit if < 20ms
      });
    } catch (error) {
      logger.error('ICD10 autocomplete error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search ICD-10 codes',
        message: error.message,
        responseTimeMs: Date.now() - startTime
      });
    }
  }

  // ============================================
  // LOOKUP ENDPOINTS
  // ============================================

  /**
   * Get ICD-10 code by exact code
   * GET /api/icd10/codes/:code
   */
  async getByCode(req, res) {
    try {
      const { code } = req.params;

      if (!ICD10Service.validateFormat(code)) {
        return res.status(400).json({
          success: false,
          error: 'Invalid ICD-10 code format',
          message: `'${code}' is not a valid ICD-10 code format. Expected format: Letter + 2 digits + optional decimal + 1-4 characters (e.g., E11.9, A00.0)`
        });
      }

      const result = await ICD10Service.getByCode(code);

      if (!result) {
        return res.status(404).json({
          success: false,
          error: 'ICD-10 code not found',
          message: `No ICD-10 code found with code: ${code.toUpperCase()}`
        });
      }

      // Add category info
      const categoryInfo = ICD10Service.getCategory(code);

      res.json({
        success: true,
        code: {
          ...result,
          categoryInfo
        }
      });
    } catch (error) {
      logger.error('ICD10 getByCode error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve ICD-10 code',
        message: error.message
      });
    }
  }

  /**
   * Validate ICD-10 code format
   * POST /api/icd10/validate
   */
  async validateCode(req, res) {
    try {
      const { code, codes } = req.body;

      // Single code validation
      if (code) {
        const isValid = ICD10Service.validateFormat(code);
        const exists = isValid ? await ICD10Service.getByCode(code) : null;

        return res.json({
          success: true,
          code,
          isValidFormat: isValid,
          existsInDatabase: !!exists,
          normalizedCode: isValid ? ICD10Service.normalize(code) : null,
          categoryInfo: isValid ? ICD10Service.getCategory(code) : null
        });
      }

      // Multiple codes validation
      if (codes && Array.isArray(codes)) {
        const results = ICD10Service.validateCodes(codes);

        // Check which valid codes exist in database
        const existenceChecks = await Promise.all(
          results.valid.map(async (c) => ({
            code: c,
            exists: !!(await ICD10Service.getByCode(c))
          }))
        );

        return res.json({
          success: true,
          validCodes: results.valid,
          invalidCodes: results.invalid,
          validCount: results.valid.length,
          invalidCount: results.invalid.length,
          existenceChecks
        });
      }

      return res.status(400).json({
        success: false,
        error: 'Missing required parameter',
        message: 'Provide either "code" or "codes" in request body'
      });
    } catch (error) {
      logger.error('ICD10 validateCode error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to validate ICD-10 code(s)',
        message: error.message
      });
    }
  }

  // ============================================
  // SEARCH ENDPOINTS
  // ============================================

  /**
   * Full-text search for ICD-10 codes
   * GET /api/icd10/search
   */
  async search(req, res) {
    try {
      const {
        q: query,
        limit = 50,
        offset = 0,
        billableOnly = 'false',
        chapter,
        category
      } = req.query;

      if (!query) {
        return res.status(400).json({
          success: false,
          error: 'Missing search query',
          message: 'Provide "q" query parameter'
        });
      }

      const result = await ICD10Service.search(query, {
        limit: Math.min(Number(limit), 200),
        offset: Number(offset),
        billableOnly: billableOnly === 'true',
        chapter,
        category
      });

      res.json({
        success: true,
        results: result.results,
        count: result.results.length,
        total: result.total,
        query,
        filters: { billableOnly: billableOnly === 'true', chapter, category }
      });
    } catch (error) {
      logger.error('ICD10 search error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to search ICD-10 codes',
        message: error.message
      });
    }
  }

  // ============================================
  // CHAPTER & CATEGORY ENDPOINTS
  // ============================================

  /**
   * List all ICD-10 chapters
   * GET /api/icd10/chapters
   */
  async listChapters(req, res) {
    try {
      const chapters = ICD10Service.listChapters();

      res.json({
        success: true,
        chapters,
        count: chapters.length
      });
    } catch (error) {
      logger.error('ICD10 listChapters error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to list chapters',
        message: error.message
      });
    }
  }

  /**
   * Get codes in a specific chapter
   * GET /api/icd10/chapters/:chapter/codes
   */
  async getCodesByChapter(req, res) {
    try {
      const { chapter } = req.params;
      const { limit = 100, offset = 0, billableOnly = 'true' } = req.query;

      const codes = await ICD10Service.getCodesByChapter(chapter, {
        limit: Math.min(Number(limit), 500),
        offset: Number(offset),
        billableOnly: billableOnly === 'true'
      });

      res.json({
        success: true,
        chapter,
        codes,
        count: codes.length
      });
    } catch (error) {
      logger.error('ICD10 getCodesByChapter error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get codes by chapter',
        message: error.message
      });
    }
  }

  /**
   * Get category information for a code
   * GET /api/icd10/category/:code
   */
  async getCategory(req, res) {
    try {
      const { code } = req.params;

      const categoryInfo = ICD10Service.getCategory(code);

      if (!categoryInfo || categoryInfo.chapter === 'Unknown') {
        return res.status(400).json({
          success: false,
          error: 'Invalid code or category not found',
          message: `Could not determine category for: ${code}`
        });
      }

      res.json({
        success: true,
        code,
        normalizedCode: ICD10Service.normalize(code),
        categoryCode: ICD10Service.getCategoryCode(code),
        categoryInfo
      });
    } catch (error) {
      logger.error('ICD10 getCategory error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get category',
        message: error.message
      });
    }
  }

  // ============================================
  // HOSPICE-SPECIFIC ENDPOINTS
  // ============================================

  /**
   * Get hospice-relevant diagnosis codes
   * GET /api/icd10/hospice
   */
  async getHospiceCodes(req, res) {
    try {
      const { limit = 50 } = req.query;

      const codes = await ICD10Service.getHospiceCodes(Math.min(Number(limit), 200));

      res.json({
        success: true,
        codes,
        count: codes.length,
        description: 'Common hospice-relevant diagnosis codes'
      });
    } catch (error) {
      logger.error('ICD10 getHospiceCodes error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get hospice codes',
        message: error.message
      });
    }
  }

  /**
   * Mark codes as hospice-relevant
   * POST /api/icd10/hospice/mark
   */
  async markHospiceRelevant(req, res) {
    try {
      const { codes } = req.body;

      if (!codes || !Array.isArray(codes) || codes.length === 0) {
        return res.status(400).json({
          success: false,
          error: 'Invalid request',
          message: 'Provide "codes" array in request body'
        });
      }

      const updatedCount = await ICD10Service.markHospiceRelevant(codes);

      res.json({
        success: true,
        message: `Marked ${updatedCount} codes as hospice-relevant`,
        updatedCount,
        requestedCount: codes.length
      });
    } catch (error) {
      logger.error('ICD10 markHospiceRelevant error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to mark hospice-relevant codes',
        message: error.message
      });
    }
  }

  // ============================================
  // STATISTICS & CACHE ENDPOINTS
  // ============================================

  /**
   * Get ICD-10 service statistics
   * GET /api/icd10/stats
   */
  async getStats(req, res) {
    try {
      const [totalCount, cacheStats] = await Promise.all([
        ICD10Service.getTotalCount(),
        Promise.resolve(ICD10Service.getCacheStats())
      ]);

      res.json({
        success: true,
        stats: {
          totalCodes: totalCount,
          cache: cacheStats
        }
      });
    } catch (error) {
      logger.error('ICD10 getStats error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to get statistics',
        message: error.message
      });
    }
  }

  /**
   * Clear ICD-10 cache
   * POST /api/icd10/cache/clear
   */
  async clearCache(req, res) {
    try {
      await ICD10Service.clearCache();

      res.json({
        success: true,
        message: 'ICD-10 cache cleared successfully'
      });
    } catch (error) {
      logger.error('ICD10 clearCache error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to clear cache',
        message: error.message
      });
    }
  }

  // ============================================
  // SEEDING ENDPOINTS (Admin only)
  // ============================================

  /**
   * Seed ICD-10 codes
   * POST /api/icd10/seed
   */
  async seedCodes(req, res) {
    try {
      // Generate common hospice-relevant ICD-10 codes for seeding
      const hospiceCodes = this._generateHospiceICD10Codes();

      const result = await ICD10Service.seedCodes(hospiceCodes);

      res.json({
        success: true,
        message: 'ICD-10 codes seeded successfully',
        ...result,
        totalSeeded: result.inserted + result.updated
      });
    } catch (error) {
      logger.error('ICD10 seedCodes error:', error);
      res.status(500).json({
        success: false,
        error: 'Failed to seed ICD-10 codes',
        message: error.message
      });
    }
  }

  /**
   * Generate hospice-relevant ICD-10 codes for seeding
   * @private
   */
  _generateHospiceICD10Codes() {
    // Comprehensive list of hospice-relevant ICD-10 codes
    // This includes common diagnoses in hospice care
    const codes = [
      // Cancer codes (C00-C97)
      { code: 'C18.9', shortDescription: 'Malignant neoplasm of colon, unspecified', longDescription: 'Malignant neoplasm of colon, unspecified site', categoryCode: 'C18', categoryDescription: 'Malignant neoplasm of colon', chapter: '2', chapterDescription: 'Neoplasms', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'C34.90', shortDescription: 'Malignant neoplasm of unspecified part of bronchus or lung', longDescription: 'Malignant neoplasm of unspecified part of unspecified bronchus or lung', categoryCode: 'C34', categoryDescription: 'Malignant neoplasm of bronchus and lung', chapter: '2', chapterDescription: 'Neoplasms', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'C50.919', shortDescription: 'Malignant neoplasm of unspecified site of unspecified female breast', longDescription: 'Malignant neoplasm of unspecified site of unspecified female breast', categoryCode: 'C50', categoryDescription: 'Malignant neoplasm of breast', chapter: '2', chapterDescription: 'Neoplasms', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'C61', shortDescription: 'Malignant neoplasm of prostate', longDescription: 'Malignant neoplasm of prostate', categoryCode: 'C61', categoryDescription: 'Malignant neoplasm of prostate', chapter: '2', chapterDescription: 'Neoplasms', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'C25.9', shortDescription: 'Malignant neoplasm of pancreas, unspecified', longDescription: 'Malignant neoplasm of pancreas, unspecified', categoryCode: 'C25', categoryDescription: 'Malignant neoplasm of pancreas', chapter: '2', chapterDescription: 'Neoplasms', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'C78.7', shortDescription: 'Secondary malignant neoplasm of liver and intrahepatic bile duct', longDescription: 'Secondary malignant neoplasm of liver and intrahepatic bile duct', categoryCode: 'C78', categoryDescription: 'Secondary malignant neoplasm of respiratory and digestive organs', chapter: '2', chapterDescription: 'Neoplasms', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'C80.1', shortDescription: 'Malignant (primary) neoplasm, unspecified', longDescription: 'Malignant (primary) neoplasm, unspecified', categoryCode: 'C80', categoryDescription: 'Malignant neoplasm without specification of site', chapter: '2', chapterDescription: 'Neoplasms', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'C71.9', shortDescription: 'Malignant neoplasm of brain, unspecified', longDescription: 'Malignant neoplasm of brain, unspecified', categoryCode: 'C71', categoryDescription: 'Malignant neoplasm of brain', chapter: '2', chapterDescription: 'Neoplasms', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'C22.0', shortDescription: 'Liver cell carcinoma', longDescription: 'Liver cell carcinoma (hepatocellular carcinoma)', categoryCode: 'C22', categoryDescription: 'Malignant neoplasm of liver and intrahepatic bile ducts', chapter: '2', chapterDescription: 'Neoplasms', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'C16.9', shortDescription: 'Malignant neoplasm of stomach, unspecified', longDescription: 'Malignant neoplasm of stomach, unspecified', categoryCode: 'C16', categoryDescription: 'Malignant neoplasm of stomach', chapter: '2', chapterDescription: 'Neoplasms', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // Heart disease codes (I00-I99)
      { code: 'I50.9', shortDescription: 'Heart failure, unspecified', longDescription: 'Heart failure, unspecified', categoryCode: 'I50', categoryDescription: 'Heart failure', chapter: '9', chapterDescription: 'Diseases of the circulatory system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'I50.22', shortDescription: 'Chronic systolic (congestive) heart failure', longDescription: 'Chronic systolic (congestive) heart failure', categoryCode: 'I50', categoryDescription: 'Heart failure', chapter: '9', chapterDescription: 'Diseases of the circulatory system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'I50.32', shortDescription: 'Chronic diastolic (congestive) heart failure', longDescription: 'Chronic diastolic (congestive) heart failure', categoryCode: 'I50', categoryDescription: 'Heart failure', chapter: '9', chapterDescription: 'Diseases of the circulatory system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'I25.10', shortDescription: 'Atherosclerotic heart disease of native coronary artery without angina pectoris', longDescription: 'Atherosclerotic heart disease of native coronary artery without angina pectoris', categoryCode: 'I25', categoryDescription: 'Chronic ischemic heart disease', chapter: '9', chapterDescription: 'Diseases of the circulatory system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'I42.9', shortDescription: 'Cardiomyopathy, unspecified', longDescription: 'Cardiomyopathy, unspecified', categoryCode: 'I42', categoryDescription: 'Cardiomyopathy', chapter: '9', chapterDescription: 'Diseases of the circulatory system', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // Dementia codes (F00-F09, G30)
      { code: 'F03.90', shortDescription: 'Unspecified dementia without behavioral disturbance', longDescription: 'Unspecified dementia without behavioral disturbance, unspecified severity', categoryCode: 'F03', categoryDescription: 'Unspecified dementia', chapter: '5', chapterDescription: 'Mental, Behavioral and Neurodevelopmental disorders', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'G30.9', shortDescription: 'Alzheimer disease, unspecified', longDescription: 'Alzheimer disease, unspecified', categoryCode: 'G30', categoryDescription: 'Alzheimer disease', chapter: '6', chapterDescription: 'Diseases of the nervous system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'G30.0', shortDescription: 'Alzheimer disease with early onset', longDescription: 'Alzheimer disease with early onset', categoryCode: 'G30', categoryDescription: 'Alzheimer disease', chapter: '6', chapterDescription: 'Diseases of the nervous system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'G30.1', shortDescription: 'Alzheimer disease with late onset', longDescription: 'Alzheimer disease with late onset', categoryCode: 'G30', categoryDescription: 'Alzheimer disease', chapter: '6', chapterDescription: 'Diseases of the nervous system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'F01.50', shortDescription: 'Vascular dementia without behavioral disturbance', longDescription: 'Vascular dementia, unspecified severity, without behavioral disturbance', categoryCode: 'F01', categoryDescription: 'Vascular dementia', chapter: '5', chapterDescription: 'Mental, Behavioral and Neurodevelopmental disorders', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // COPD and respiratory codes (J40-J47)
      { code: 'J44.9', shortDescription: 'Chronic obstructive pulmonary disease, unspecified', longDescription: 'Chronic obstructive pulmonary disease, unspecified', categoryCode: 'J44', categoryDescription: 'Other chronic obstructive pulmonary disease', chapter: '10', chapterDescription: 'Diseases of the respiratory system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'J44.1', shortDescription: 'Chronic obstructive pulmonary disease with acute exacerbation', longDescription: 'Chronic obstructive pulmonary disease with (acute) exacerbation', categoryCode: 'J44', categoryDescription: 'Other chronic obstructive pulmonary disease', chapter: '10', chapterDescription: 'Diseases of the respiratory system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'J84.10', shortDescription: 'Pulmonary fibrosis, unspecified', longDescription: 'Pulmonary fibrosis, unspecified', categoryCode: 'J84', categoryDescription: 'Other interstitial pulmonary diseases', chapter: '10', chapterDescription: 'Diseases of the respiratory system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'J96.10', shortDescription: 'Chronic respiratory failure, unspecified whether with hypoxia or hypercapnia', longDescription: 'Chronic respiratory failure, unspecified whether with hypoxia or hypercapnia', categoryCode: 'J96', categoryDescription: 'Respiratory failure, not elsewhere classified', chapter: '10', chapterDescription: 'Diseases of the respiratory system', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // Kidney disease codes (N17-N19)
      { code: 'N18.6', shortDescription: 'End stage renal disease', longDescription: 'End stage renal disease', categoryCode: 'N18', categoryDescription: 'Chronic kidney disease (CKD)', chapter: '14', chapterDescription: 'Diseases of the genitourinary system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'N18.5', shortDescription: 'Chronic kidney disease, stage 5', longDescription: 'Chronic kidney disease, stage 5', categoryCode: 'N18', categoryDescription: 'Chronic kidney disease (CKD)', chapter: '14', chapterDescription: 'Diseases of the genitourinary system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'N18.4', shortDescription: 'Chronic kidney disease, stage 4 (severe)', longDescription: 'Chronic kidney disease, stage 4 (severe)', categoryCode: 'N18', categoryDescription: 'Chronic kidney disease (CKD)', chapter: '14', chapterDescription: 'Diseases of the genitourinary system', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // Liver disease codes (K70-K77)
      { code: 'K74.60', shortDescription: 'Unspecified cirrhosis of liver', longDescription: 'Unspecified cirrhosis of liver', categoryCode: 'K74', categoryDescription: 'Fibrosis and cirrhosis of liver', chapter: '11', chapterDescription: 'Diseases of the digestive system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'K70.30', shortDescription: 'Alcoholic cirrhosis of liver without ascites', longDescription: 'Alcoholic cirrhosis of liver without ascites', categoryCode: 'K70', categoryDescription: 'Alcoholic liver disease', chapter: '11', chapterDescription: 'Diseases of the digestive system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'K72.90', shortDescription: 'Hepatic failure, unspecified without coma', longDescription: 'Hepatic failure, unspecified without coma', categoryCode: 'K72', categoryDescription: 'Hepatic failure, not elsewhere classified', chapter: '11', chapterDescription: 'Diseases of the digestive system', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // Neurological disease codes
      { code: 'G20', shortDescription: 'Parkinson disease', longDescription: 'Parkinson disease', categoryCode: 'G20', categoryDescription: 'Parkinson disease', chapter: '6', chapterDescription: 'Diseases of the nervous system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'G12.21', shortDescription: 'Amyotrophic lateral sclerosis', longDescription: 'Amyotrophic lateral sclerosis', categoryCode: 'G12', categoryDescription: 'Spinal muscular atrophy and related syndromes', chapter: '6', chapterDescription: 'Diseases of the nervous system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'G35', shortDescription: 'Multiple sclerosis', longDescription: 'Multiple sclerosis', categoryCode: 'G35', categoryDescription: 'Multiple sclerosis', chapter: '6', chapterDescription: 'Diseases of the nervous system', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // HIV/AIDS codes
      { code: 'B20', shortDescription: 'Human immunodeficiency virus [HIV] disease', longDescription: 'Human immunodeficiency virus [HIV] disease', categoryCode: 'B20', categoryDescription: 'Human immunodeficiency virus [HIV] disease', chapter: '1', chapterDescription: 'Certain infectious and parasitic diseases', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // Stroke codes
      { code: 'I63.9', shortDescription: 'Cerebral infarction, unspecified', longDescription: 'Cerebral infarction, unspecified', categoryCode: 'I63', categoryDescription: 'Cerebral infarction', chapter: '9', chapterDescription: 'Diseases of the circulatory system', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'I69.30', shortDescription: 'Unspecified sequelae of cerebral infarction', longDescription: 'Unspecified sequelae of cerebral infarction', categoryCode: 'I69', categoryDescription: 'Sequelae of cerebrovascular disease', chapter: '9', chapterDescription: 'Diseases of the circulatory system', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // Diabetes codes
      { code: 'E11.9', shortDescription: 'Type 2 diabetes mellitus without complications', longDescription: 'Type 2 diabetes mellitus without complications', categoryCode: 'E11', categoryDescription: 'Type 2 diabetes mellitus', chapter: '4', chapterDescription: 'Endocrine, nutritional and metabolic diseases', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'E11.65', shortDescription: 'Type 2 diabetes mellitus with hyperglycemia', longDescription: 'Type 2 diabetes mellitus with hyperglycemia', categoryCode: 'E11', categoryDescription: 'Type 2 diabetes mellitus', chapter: '4', chapterDescription: 'Endocrine, nutritional and metabolic diseases', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'E10.9', shortDescription: 'Type 1 diabetes mellitus without complications', longDescription: 'Type 1 diabetes mellitus without complications', categoryCode: 'E10', categoryDescription: 'Type 1 diabetes mellitus', chapter: '4', chapterDescription: 'Endocrine, nutritional and metabolic diseases', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // Common symptom codes often used in hospice
      { code: 'R53.83', shortDescription: 'Other fatigue', longDescription: 'Other fatigue', categoryCode: 'R53', categoryDescription: 'Malaise and fatigue', chapter: '18', chapterDescription: 'Symptoms, signs and abnormal findings', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'R64', shortDescription: 'Cachexia', longDescription: 'Cachexia', categoryCode: 'R64', categoryDescription: 'Cachexia', chapter: '18', chapterDescription: 'Symptoms, signs and abnormal findings', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'R63.4', shortDescription: 'Abnormal weight loss', longDescription: 'Abnormal weight loss', categoryCode: 'R63', categoryDescription: 'Symptoms and signs concerning food and fluid intake', chapter: '18', chapterDescription: 'Symptoms, signs and abnormal findings', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // Debility/Failure to thrive
      { code: 'R54', shortDescription: 'Age-related physical debility', longDescription: 'Age-related physical debility (frailty, senility)', categoryCode: 'R54', categoryDescription: 'Age-related physical debility', chapter: '18', chapterDescription: 'Symptoms, signs and abnormal findings', isBillable: true, isCommon: true, isHospiceRelevant: true },
      { code: 'R62.7', shortDescription: 'Adult failure to thrive', longDescription: 'Adult failure to thrive', categoryCode: 'R62', categoryDescription: 'Lack of expected normal physiological development', chapter: '18', chapterDescription: 'Symptoms, signs and abnormal findings', isBillable: true, isCommon: true, isHospiceRelevant: true },

      // Additional common general codes
      { code: 'J18.9', shortDescription: 'Pneumonia, unspecified organism', longDescription: 'Pneumonia, unspecified organism', categoryCode: 'J18', categoryDescription: 'Pneumonia, unspecified organism', chapter: '10', chapterDescription: 'Diseases of the respiratory system', isBillable: true, isCommon: true, isHospiceRelevant: false },
      { code: 'N39.0', shortDescription: 'Urinary tract infection, site not specified', longDescription: 'Urinary tract infection, site not specified', categoryCode: 'N39', categoryDescription: 'Other disorders of urinary system', chapter: '14', chapterDescription: 'Diseases of the genitourinary system', isBillable: true, isCommon: true, isHospiceRelevant: false },
      { code: 'I10', shortDescription: 'Essential (primary) hypertension', longDescription: 'Essential (primary) hypertension', categoryCode: 'I10', categoryDescription: 'Essential (primary) hypertension', chapter: '9', chapterDescription: 'Diseases of the circulatory system', isBillable: true, isCommon: true, isHospiceRelevant: false },
      { code: 'E78.5', shortDescription: 'Hyperlipidemia, unspecified', longDescription: 'Hyperlipidemia, unspecified', categoryCode: 'E78', categoryDescription: 'Disorders of lipoprotein metabolism and other lipidemias', chapter: '4', chapterDescription: 'Endocrine, nutritional and metabolic diseases', isBillable: true, isCommon: true, isHospiceRelevant: false },
      { code: 'M54.5', shortDescription: 'Low back pain', longDescription: 'Low back pain', categoryCode: 'M54', categoryDescription: 'Dorsalgia', chapter: '13', chapterDescription: 'Diseases of the musculoskeletal system', isBillable: true, isCommon: true, isHospiceRelevant: false },
      { code: 'K21.0', shortDescription: 'Gastro-esophageal reflux disease with esophagitis', longDescription: 'Gastro-esophageal reflux disease with esophagitis', categoryCode: 'K21', categoryDescription: 'Gastro-esophageal reflux disease', chapter: '11', chapterDescription: 'Diseases of the digestive system', isBillable: true, isCommon: true, isHospiceRelevant: false },
      { code: 'F32.9', shortDescription: 'Major depressive disorder, single episode, unspecified', longDescription: 'Major depressive disorder, single episode, unspecified', categoryCode: 'F32', categoryDescription: 'Major depressive disorder, single episode', chapter: '5', chapterDescription: 'Mental, Behavioral and Neurodevelopmental disorders', isBillable: true, isCommon: true, isHospiceRelevant: false },
      { code: 'F41.1', shortDescription: 'Generalized anxiety disorder', longDescription: 'Generalized anxiety disorder', categoryCode: 'F41', categoryDescription: 'Other anxiety disorders', chapter: '5', chapterDescription: 'Mental, Behavioral and Neurodevelopmental disorders', isBillable: true, isCommon: true, isHospiceRelevant: false },
    ];

    // Set default values
    return codes.map(code => ({
      ...code,
      codeLength: code.code.replace('.', '').length,
      isActive: true,
      usageCount: 0,
      version: '2024'
    }));
  }
}

export default new ICD10Controller();
