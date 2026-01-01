import DenialCodesController from '../controllers/DenialCodes.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

/**
 * Denial Codes Routes
 * Phase 3C - CARC/RARC Code Library API
 *
 * Provides endpoints for:
 * - CARC (Claim Adjustment Reason Codes) lookup and search
 * - RARC (Remittance Advice Remark Codes) lookup and search
 * - Denial categories management
 * - Payer code mappings
 * - Adjustment analysis and resolution recommendations
 */
export default async function denialCodesRoutes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // CARC CODE ENDPOINTS
  // ============================================

  /**
   * List CARC codes with optional filtering
   * GET /api/denial-codes/carc
   */
  fastify.get(
    '/carc',
    {
      preHandler: checkPermission('denial-codes:view'),
      schema: {
        description: 'List all CARC codes with optional filtering',
        tags: ['Denial Codes'],
        querystring: {
          type: 'object',
          properties: {
            category: {
              type: 'string',
              enum: ['CONTRACTUAL', 'PATIENT_RESPONSIBILITY', 'OTHER_ADJUSTMENT', 'PAYER_INITIATED'],
              description: 'Filter by category'
            },
            groupCode: {
              type: 'string',
              enum: ['CO', 'PR', 'OA', 'PI'],
              description: 'Filter by group code (CO=Contractual, PR=Patient Responsibility, OA=Other, PI=Payer Initiated)'
            },
            isAppealable: { type: 'boolean', description: 'Filter by appealability' },
            isDenial: { type: 'boolean', description: 'Filter by denial type' },
            severity: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'],
              description: 'Filter by severity'
            },
            search: { type: 'string', description: 'Search in code, description, or action' },
            isActive: { type: 'boolean', default: true, description: 'Filter by active status' },
            limit: { type: 'number', default: 100, minimum: 1, maximum: 500 },
            offset: { type: 'number', default: 0 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              total: { type: 'number' },
              codes: { type: 'array' }
            }
          }
        }
      }
    },
    DenialCodesController.listCARCCodes.bind(DenialCodesController)
  );

  /**
   * Get CARC codes grouped by category
   * GET /api/denial-codes/carc/by-category
   */
  fastify.get(
    '/carc/by-category',
    {
      preHandler: checkPermission('denial-codes:view'),
      schema: {
        description: 'Get CARC codes grouped by category',
        tags: ['Denial Codes'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              categories: { type: 'array' },
              byCategory: { type: 'object' }
            }
          }
        }
      }
    },
    DenialCodesController.getCARCCodesByCategory.bind(DenialCodesController)
  );

  /**
   * Get single CARC code with details and recommendations
   * GET /api/denial-codes/carc/:code
   */
  fastify.get(
    '/carc/:code',
    {
      preHandler: checkPermission('denial-codes:view'),
      schema: {
        description: 'Get CARC code details with resolution recommendations',
        tags: ['Denial Codes'],
        params: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', description: 'CARC code (e.g., "1", "45", "197")' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              carcCode: { type: 'object' }
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
    DenialCodesController.getCARCCode.bind(DenialCodesController)
  );

  // ============================================
  // RARC CODE ENDPOINTS
  // ============================================

  /**
   * List RARC codes with optional filtering
   * GET /api/denial-codes/rarc
   */
  fastify.get(
    '/rarc',
    {
      preHandler: checkPermission('denial-codes:view'),
      schema: {
        description: 'List all RARC codes with optional filtering',
        tags: ['Denial Codes'],
        querystring: {
          type: 'object',
          properties: {
            codeType: {
              type: 'string',
              enum: ['ALERT', 'INFORMATIONAL', 'ACTION_REQUIRED'],
              description: 'Filter by code type'
            },
            requiresProviderAction: { type: 'boolean', description: 'Filter by provider action required' },
            search: { type: 'string', description: 'Search in code, description, or action' },
            isActive: { type: 'boolean', default: true, description: 'Filter by active status' },
            limit: { type: 'number', default: 100, minimum: 1, maximum: 500 },
            offset: { type: 'number', default: 0 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              total: { type: 'number' },
              codes: { type: 'array' }
            }
          }
        }
      }
    },
    DenialCodesController.listRARCCodes.bind(DenialCodesController)
  );

  /**
   * Get single RARC code with details
   * GET /api/denial-codes/rarc/:code
   */
  fastify.get(
    '/rarc/:code',
    {
      preHandler: checkPermission('denial-codes:view'),
      schema: {
        description: 'Get RARC code details with related CARC codes',
        tags: ['Denial Codes'],
        params: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', description: 'RARC code (e.g., "N1", "MA01")' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              rarcCode: { type: 'object' }
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
    DenialCodesController.getRARCCode.bind(DenialCodesController)
  );

  // ============================================
  // DENIAL CATEGORY ENDPOINTS
  // ============================================

  /**
   * List denial categories
   * GET /api/denial-codes/categories
   */
  fastify.get(
    '/categories',
    {
      preHandler: checkPermission('denial-codes:view'),
      schema: {
        description: 'List all denial categories',
        tags: ['Denial Codes'],
        querystring: {
          type: 'object',
          properties: {
            isActive: { type: 'boolean', default: true, description: 'Filter by active status' },
            includeStats: { type: 'boolean', default: false, description: 'Include denial statistics' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              categories: { type: 'array' }
            }
          }
        }
      }
    },
    DenialCodesController.listCategories.bind(DenialCodesController)
  );

  /**
   * Get category with associated CARC codes
   * GET /api/denial-codes/categories/:code
   */
  fastify.get(
    '/categories/:code',
    {
      preHandler: checkPermission('denial-codes:view'),
      schema: {
        description: 'Get denial category with associated CARC codes',
        tags: ['Denial Codes'],
        params: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', description: 'Category code (e.g., "AUTH", "CODING")' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              category: { type: 'object' }
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
    DenialCodesController.getCategory.bind(DenialCodesController)
  );

  // ============================================
  // PAYER CODE MAPPING ENDPOINTS
  // ============================================

  /**
   * List payer code mappings
   * GET /api/denial-codes/payer-mappings
   */
  fastify.get(
    '/payer-mappings',
    {
      preHandler: checkPermission('denial-codes:view'),
      schema: {
        description: 'List payer-specific code mappings to standard CARC/RARC',
        tags: ['Denial Codes'],
        querystring: {
          type: 'object',
          properties: {
            payerName: { type: 'string', description: 'Filter by payer name (partial match)' },
            payerIdentifier: { type: 'string', description: 'Filter by payer identifier' },
            mappingConfidence: {
              type: 'string',
              enum: ['HIGH', 'MEDIUM', 'LOW', 'MANUAL_REVIEW'],
              description: 'Filter by mapping confidence'
            },
            isActive: { type: 'boolean', default: true },
            limit: { type: 'number', default: 100, minimum: 1, maximum: 500 },
            offset: { type: 'number', default: 0 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              total: { type: 'number' },
              mappings: { type: 'array' }
            }
          }
        }
      }
    },
    DenialCodesController.listPayerMappings.bind(DenialCodesController)
  );

  /**
   * Translate payer code to standard CARC/RARC
   * GET /api/denial-codes/payer-mappings/translate
   */
  fastify.get(
    '/payer-mappings/translate',
    {
      preHandler: checkPermission('denial-codes:view'),
      schema: {
        description: 'Translate payer-specific code to standard CARC/RARC codes',
        tags: ['Denial Codes'],
        querystring: {
          type: 'object',
          required: ['payerCode'],
          properties: {
            payerCode: { type: 'string', description: 'Payer-specific code to translate' },
            payerIdentifier: { type: 'string', description: 'Payer identifier for more precise matching' },
            payerName: { type: 'string', description: 'Payer name for matching' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              found: { type: 'boolean' },
              mapping: { type: 'object' }
            }
          }
        }
      }
    },
    DenialCodesController.translatePayerCode.bind(DenialCodesController)
  );

  // ============================================
  // ANALYSIS & RECOMMENDATION ENDPOINTS
  // ============================================

  /**
   * Analyze adjustment codes
   * POST /api/denial-codes/analyze
   */
  fastify.post(
    '/analyze',
    {
      preHandler: checkPermission('denial-codes:analyze'),
      schema: {
        description: 'Analyze adjustment codes and provide categorization and recommendations',
        tags: ['Denial Codes'],
        body: {
          type: 'object',
          required: ['adjustmentCodes'],
          properties: {
            adjustmentCodes: {
              type: 'array',
              description: 'Array of adjustment codes to analyze',
              items: {
                type: 'object',
                required: ['reasonCode'],
                properties: {
                  groupCode: { type: 'string', description: 'Group code (CO, PR, OA, PI)' },
                  reasonCode: { type: 'string', description: 'CARC reason code' },
                  amount: { type: 'number', description: 'Adjustment amount in cents' }
                }
              }
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              analysis: {
                type: 'object',
                properties: {
                  totalAdjustments: { type: 'number' },
                  totalAmount: { type: 'number' },
                  byCategory: { type: 'object' },
                  appealable: { type: 'array' },
                  nonAppealable: { type: 'array' },
                  recommendations: { type: 'array' }
                }
              }
            }
          }
        }
      }
    },
    DenialCodesController.analyzeAdjustments.bind(DenialCodesController)
  );

  /**
   * Get resolution recommendations for a CARC code
   * GET /api/denial-codes/recommendations/:code
   */
  fastify.get(
    '/recommendations/:code',
    {
      preHandler: checkPermission('denial-codes:view'),
      schema: {
        description: 'Get detailed resolution recommendations for a CARC code',
        tags: ['Denial Codes'],
        params: {
          type: 'object',
          required: ['code'],
          properties: {
            code: { type: 'string', description: 'CARC code to get recommendations for' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              recommendation: {
                type: 'object',
                properties: {
                  code: { type: 'string' },
                  description: { type: 'string' },
                  isAppealable: { type: 'boolean' },
                  recommendedAction: { type: 'string' },
                  appealTemplate: { type: 'string' },
                  documentationRequired: { type: 'array' },
                  averageSuccessRate: { type: 'number' },
                  resolutionSteps: { type: 'array' },
                  appealTips: { type: 'array' },
                  preventionStrategies: { type: 'array' }
                }
              }
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
    DenialCodesController.getRecommendation.bind(DenialCodesController)
  );

  // ============================================
  // SEEDING ENDPOINTS (Admin only)
  // ============================================

  /**
   * Seed all denial codes
   * POST /api/denial-codes/seed
   */
  fastify.post(
    '/seed',
    {
      preHandler: checkPermission('denial-codes:manage'),
      schema: {
        description: 'Seed all CARC/RARC codes and categories (admin only)',
        tags: ['Denial Codes Admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              results: { type: 'object' }
            }
          }
        }
      }
    },
    DenialCodesController.seedAll.bind(DenialCodesController)
  );

  /**
   * Seed CARC codes only
   * POST /api/denial-codes/seed/carc
   */
  fastify.post(
    '/seed/carc',
    {
      preHandler: checkPermission('denial-codes:manage'),
      schema: {
        description: 'Seed CARC codes (admin only)',
        tags: ['Denial Codes Admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              count: { type: 'number' }
            }
          }
        }
      }
    },
    DenialCodesController.seedCARCCodes.bind(DenialCodesController)
  );

  /**
   * Seed RARC codes only
   * POST /api/denial-codes/seed/rarc
   */
  fastify.post(
    '/seed/rarc',
    {
      preHandler: checkPermission('denial-codes:manage'),
      schema: {
        description: 'Seed RARC codes (admin only)',
        tags: ['Denial Codes Admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              count: { type: 'number' }
            }
          }
        }
      }
    },
    DenialCodesController.seedRARCCodes.bind(DenialCodesController)
  );

  /**
   * Seed denial categories only
   * POST /api/denial-codes/seed/categories
   */
  fastify.post(
    '/seed/categories',
    {
      preHandler: checkPermission('denial-codes:manage'),
      schema: {
        description: 'Seed denial categories (admin only)',
        tags: ['Denial Codes Admin'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              count: { type: 'number' }
            }
          }
        }
      }
    },
    DenialCodesController.seedCategories.bind(DenialCodesController)
  );
}
