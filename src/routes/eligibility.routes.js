import EligibilityController from '../controllers/Eligibility.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

/**
 * Eligibility Routes
 * Phase 3A - Real-time Insurance Eligibility Verification
 *
 * All routes require authentication and specific permissions
 */
export default async function eligibilityRoutes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  /**
   * 1. Verify patient eligibility
   * POST /api/eligibility/verify
   * Permission: eligibility:verify
   */
  fastify.post(
    '/verify',
    {
      preHandler: checkPermission('eligibility:verify'),
      schema: {
        description: 'Verify patient insurance eligibility',
        tags: ['Eligibility'],
        body: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'number', description: 'Patient ID' },
            payerId: { type: 'number', description: 'Payer ID (optional)' },
            serviceType: {
              type: 'string',
              enum: ['HOSPICE', 'MEDICAL', 'HEALTH_BENEFIT_PLAN', 'SKILLED_NURSING', 'HOME_HEALTH'],
              default: 'HOSPICE'
            },
            forceRefresh: { type: 'boolean', default: false, description: 'Force refresh even if cached' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    EligibilityController.verifyEligibility.bind(EligibilityController)
  );

  /**
   * 2. Batch verify eligibility for multiple patients
   * POST /api/eligibility/batch-verify
   * Permission: eligibility:batch-verify
   */
  fastify.post(
    '/batch-verify',
    {
      preHandler: checkPermission('eligibility:batch-verify'),
      schema: {
        description: 'Batch verify eligibility for multiple patients',
        tags: ['Eligibility'],
        body: {
          type: 'object',
          required: ['patientIds'],
          properties: {
            patientIds: {
              type: 'array',
              items: { type: 'number' },
              maxItems: 100,
              description: 'Array of patient IDs (max 100)'
            },
            serviceType: {
              type: 'string',
              enum: ['HOSPICE', 'MEDICAL', 'HEALTH_BENEFIT_PLAN', 'SKILLED_NURSING', 'HOME_HEALTH'],
              default: 'HOSPICE'
            },
            forceRefresh: { type: 'boolean', default: false }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              summary: {
                type: 'object',
                properties: {
                  total: { type: 'number' },
                  successful: { type: 'number' },
                  failed: { type: 'number' }
                }
              },
              results: { type: 'array' }
            }
          }
        }
      }
    },
    EligibilityController.batchVerifyEligibility.bind(EligibilityController)
  );

  /**
   * 3. Get current coverage for patient
   * GET /api/eligibility/coverage/:patientId
   * Permission: eligibility:view
   */
  fastify.get(
    '/coverage/:patientId',
    {
      preHandler: checkPermission('eligibility:view'),
      schema: {
        description: 'Get current coverage information for patient',
        tags: ['Eligibility'],
        params: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'number', description: 'Patient ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    EligibilityController.getCurrentCoverage.bind(EligibilityController)
  );

  /**
   * 4. Get eligibility history for patient
   * GET /api/eligibility/history/:patientId
   * Permission: eligibility:view
   */
  fastify.get(
    '/history/:patientId',
    {
      preHandler: checkPermission('eligibility:view'),
      schema: {
        description: 'Get eligibility verification history for patient',
        tags: ['Eligibility'],
        params: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'number', description: 'Patient ID' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10, minimum: 1, maximum: 100 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    EligibilityController.getEligibilityHistory.bind(EligibilityController)
  );

  /**
   * 5. Process 271 EDI response
   * POST /api/eligibility/process-271
   * Permission: eligibility:process
   */
  fastify.post(
    '/process-271',
    {
      preHandler: checkPermission('eligibility:process'),
      schema: {
        description: 'Process incoming 271 EDI eligibility response',
        tags: ['Eligibility'],
        body: {
          type: 'object',
          required: ['requestId', 'edi271Content'],
          properties: {
            requestId: { type: 'string', description: 'Original request ID' },
            edi271Content: { type: 'string', description: 'Raw 271 EDI content' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    EligibilityController.process271Response.bind(EligibilityController)
  );

  /**
   * 6. Get reverification list
   * GET /api/eligibility/reverification-list
   * Permission: eligibility:view
   */
  fastify.get(
    '/reverification-list',
    {
      preHandler: checkPermission('eligibility:view'),
      schema: {
        description: 'Get list of patients needing eligibility reverification',
        tags: ['Eligibility'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    EligibilityController.getReverificationList.bind(EligibilityController)
  );

  /**
   * Additional helper endpoints
   */

  /**
   * Get eligibility request details
   * GET /api/eligibility/request/:requestId
   * Permission: eligibility:view
   */
  fastify.get(
    '/request/:requestId',
    {
      preHandler: checkPermission('eligibility:view'),
      schema: {
        description: 'Get eligibility request details',
        tags: ['Eligibility'],
        params: {
          type: 'object',
          required: ['requestId'],
          properties: {
            requestId: { type: 'string', description: 'Request ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    EligibilityController.getRequest.bind(EligibilityController)
  );

  /**
   * Get benefit details for response
   * GET /api/eligibility/benefits/:responseId
   * Permission: eligibility:view
   */
  fastify.get(
    '/benefits/:responseId',
    {
      preHandler: checkPermission('eligibility:view'),
      schema: {
        description: 'Get detailed benefit information for eligibility response',
        tags: ['Eligibility'],
        params: {
          type: 'object',
          required: ['responseId'],
          properties: {
            responseId: { type: 'number', description: 'Response ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    EligibilityController.getBenefitDetails.bind(EligibilityController)
  );

  /**
   * Mark patient for reverification
   * POST /api/eligibility/mark-reverification
   * Permission: eligibility:manage
   */
  fastify.post(
    '/mark-reverification',
    {
      preHandler: checkPermission('eligibility:manage'),
      schema: {
        description: 'Mark patient for eligibility reverification',
        tags: ['Eligibility'],
        body: {
          type: 'object',
          required: ['patientId'],
          properties: {
            patientId: { type: 'number', description: 'Patient ID' },
            reason: { type: 'string', description: 'Reason for reverification' }
          }
        },
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
    EligibilityController.markForReverification.bind(EligibilityController)
  );
}
