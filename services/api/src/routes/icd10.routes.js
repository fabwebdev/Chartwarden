import ICD10Controller from '../controllers/ICD10.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

/**
 * ICD-10 Diagnosis Code Routes
 *
 * Provides endpoints for:
 * - Fast autocomplete lookups (<200ms target)
 * - Exact code lookups with validation
 * - Full-text search with filters
 * - Chapter and category navigation
 * - Hospice-relevant code filtering
 * - Cache management and statistics
 */
export default async function icd10Routes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // AUTOCOMPLETE ENDPOINTS (Optimized for speed)
  // ============================================

  /**
   * Autocomplete ICD-10 codes
   * GET /api/icd10/autocomplete
   *
   * Fast autocomplete for diagnosis code selection in forms.
   * Optimized for sub-200ms response time.
   */
  fastify.get(
    '/autocomplete',
    {
      preHandler: checkPermission('icd10:view'),
      schema: {
        description: 'Fast autocomplete for ICD-10 codes by code prefix or description text',
        tags: ['ICD-10 Codes'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', minLength: 2, description: 'Search query (code prefix or description text)' },
            limit: { type: 'number', default: 20, minimum: 1, maximum: 50, description: 'Max results to return' },
            billableOnly: { type: 'string', default: 'true', enum: ['true', 'false'], description: 'Only return billable codes' },
            hospiceRelevant: { type: 'string', default: 'false', enum: ['true', 'false'], description: 'Prioritize hospice-relevant codes' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              results: { type: 'array' },
              count: { type: 'number' },
              responseTimeMs: { type: 'number' },
              cached: { type: 'boolean' }
            }
          }
        }
      }
    },
    ICD10Controller.autocomplete.bind(ICD10Controller)
  );

  // ============================================
  // LOOKUP ENDPOINTS
  // ============================================

  /**
   * Get ICD-10 code by exact code
   * GET /api/icd10/codes/:code
   */
  fastify.get(
    '/codes/:code',
    {
      preHandler: checkPermission('icd10:view'),
      schema: {
        description: 'Get ICD-10 code details by exact code',
        tags: ['ICD-10 Codes'],
        params: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', description: 'ICD-10 code (e.g., "E11.9", "C34.90")' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              code: { type: 'object' }
            }
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' }
            }
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    ICD10Controller.getByCode.bind(ICD10Controller)
  );

  /**
   * Validate ICD-10 code(s)
   * POST /api/icd10/validate
   */
  fastify.post(
    '/validate',
    {
      preHandler: checkPermission('icd10:view'),
      schema: {
        description: 'Validate ICD-10 code format and existence',
        tags: ['ICD-10 Codes'],
        body: {
          type: 'object',
          properties: {
            code: { type: 'string', description: 'Single ICD-10 code to validate' },
            codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of ICD-10 codes to validate'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              code: { type: 'string' },
              isValidFormat: { type: 'boolean' },
              existsInDatabase: { type: 'boolean' },
              normalizedCode: { type: 'string' },
              categoryInfo: { type: 'object' },
              validCodes: { type: 'array' },
              invalidCodes: { type: 'array' }
            }
          }
        }
      }
    },
    ICD10Controller.validateCode.bind(ICD10Controller)
  );

  // ============================================
  // SEARCH ENDPOINTS
  // ============================================

  /**
   * Full-text search for ICD-10 codes
   * GET /api/icd10/search
   */
  fastify.get(
    '/search',
    {
      preHandler: checkPermission('icd10:view'),
      schema: {
        description: 'Full-text search for ICD-10 codes with filters',
        tags: ['ICD-10 Codes'],
        querystring: {
          type: 'object',
          required: ['q'],
          properties: {
            q: { type: 'string', description: 'Search query' },
            limit: { type: 'number', default: 50, minimum: 1, maximum: 200 },
            offset: { type: 'number', default: 0 },
            billableOnly: { type: 'string', default: 'false', enum: ['true', 'false'] },
            chapter: { type: 'string', description: 'Filter by chapter number' },
            category: { type: 'string', description: 'Filter by category code prefix' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              results: { type: 'array' },
              count: { type: 'number' },
              total: { type: 'number' },
              query: { type: 'string' },
              filters: { type: 'object' }
            }
          }
        }
      }
    },
    ICD10Controller.search.bind(ICD10Controller)
  );

  // ============================================
  // CHAPTER & CATEGORY ENDPOINTS
  // ============================================

  /**
   * List all ICD-10 chapters
   * GET /api/icd10/chapters
   */
  fastify.get(
    '/chapters',
    {
      preHandler: checkPermission('icd10:view'),
      schema: {
        description: 'List all ICD-10-CM chapters',
        tags: ['ICD-10 Codes'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              chapters: { type: 'array' },
              count: { type: 'number' }
            }
          }
        }
      }
    },
    ICD10Controller.listChapters.bind(ICD10Controller)
  );

  /**
   * Get codes in a specific chapter
   * GET /api/icd10/chapters/:chapter/codes
   */
  fastify.get(
    '/chapters/:chapter/codes',
    {
      preHandler: checkPermission('icd10:view'),
      schema: {
        description: 'Get ICD-10 codes in a specific chapter',
        tags: ['ICD-10 Codes'],
        params: {
          type: 'object',
          required: ['chapter'],
          properties: {
            chapter: { type: 'string', description: 'Chapter number (e.g., "4", "9")' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 100, minimum: 1, maximum: 500 },
            offset: { type: 'number', default: 0 },
            billableOnly: { type: 'string', default: 'true', enum: ['true', 'false'] }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              chapter: { type: 'string' },
              codes: { type: 'array' },
              count: { type: 'number' }
            }
          }
        }
      }
    },
    ICD10Controller.getCodesByChapter.bind(ICD10Controller)
  );

  /**
   * Get category information for a code
   * GET /api/icd10/category/:code
   */
  fastify.get(
    '/category/:code',
    {
      preHandler: checkPermission('icd10:view'),
      schema: {
        description: 'Get ICD-10 category and chapter information for a code',
        tags: ['ICD-10 Codes'],
        params: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', description: 'ICD-10 code' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              code: { type: 'string' },
              normalizedCode: { type: 'string' },
              categoryCode: { type: 'string' },
              categoryInfo: { type: 'object' }
            }
          }
        }
      }
    },
    ICD10Controller.getCategory.bind(ICD10Controller)
  );

  // ============================================
  // HOSPICE-SPECIFIC ENDPOINTS
  // ============================================

  /**
   * Get hospice-relevant diagnosis codes
   * GET /api/icd10/hospice
   */
  fastify.get(
    '/hospice',
    {
      preHandler: checkPermission('icd10:view'),
      schema: {
        description: 'Get commonly used hospice-relevant diagnosis codes',
        tags: ['ICD-10 Codes'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50, minimum: 1, maximum: 200 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              codes: { type: 'array' },
              count: { type: 'number' },
              description: { type: 'string' }
            }
          }
        }
      }
    },
    ICD10Controller.getHospiceCodes.bind(ICD10Controller)
  );

  /**
   * Mark codes as hospice-relevant
   * POST /api/icd10/hospice/mark
   */
  fastify.post(
    '/hospice/mark',
    {
      preHandler: checkPermission('icd10:manage'),
      schema: {
        description: 'Mark ICD-10 codes as hospice-relevant (admin)',
        tags: ['ICD-10 Codes Admin'],
        body: {
          type: 'object',
          required: ['codes'],
          properties: {
            codes: {
              type: 'array',
              items: { type: 'string' },
              description: 'Array of ICD-10 codes to mark as hospice-relevant'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              updatedCount: { type: 'number' },
              requestedCount: { type: 'number' }
            }
          }
        }
      }
    },
    ICD10Controller.markHospiceRelevant.bind(ICD10Controller)
  );

  // ============================================
  // STATISTICS & CACHE ENDPOINTS
  // ============================================

  /**
   * Get ICD-10 service statistics
   * GET /api/icd10/stats
   */
  fastify.get(
    '/stats',
    {
      preHandler: checkPermission('icd10:view'),
      schema: {
        description: 'Get ICD-10 service statistics including cache metrics',
        tags: ['ICD-10 Codes'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              stats: {
                type: 'object',
                properties: {
                  totalCodes: { type: 'number' },
                  cache: { type: 'object' }
                }
              }
            }
          }
        }
      }
    },
    ICD10Controller.getStats.bind(ICD10Controller)
  );

  /**
   * Clear ICD-10 cache
   * POST /api/icd10/cache/clear
   */
  fastify.post(
    '/cache/clear',
    {
      preHandler: checkPermission('icd10:manage'),
      schema: {
        description: 'Clear ICD-10 cache (admin)',
        tags: ['ICD-10 Codes Admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          }
        }
      }
    },
    ICD10Controller.clearCache.bind(ICD10Controller)
  );

  // ============================================
  // SEEDING ENDPOINTS (Admin only)
  // ============================================

  /**
   * Seed ICD-10 codes
   * POST /api/icd10/seed
   */
  fastify.post(
    '/seed',
    {
      preHandler: checkPermission('icd10:manage'),
      schema: {
        description: 'Seed ICD-10 codes with hospice-relevant codes (admin)',
        tags: ['ICD-10 Codes Admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              inserted: { type: 'number' },
              updated: { type: 'number' },
              errors: { type: 'number' },
              totalSeeded: { type: 'number' }
            }
          }
        }
      }
    },
    ICD10Controller.seedCodes.bind(ICD10Controller)
  );
}
