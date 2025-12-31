import ERAController from '../controllers/ERA.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

/**
 * ERA (Electronic Remittance Advice) Routes
 * Phase 3B - ERA Processing & Auto-Posting
 *
 * All routes require authentication and specific permissions
 */
export default async function eraRoutes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  /**
   * 1. Upload 835 ERA file
   * POST /api/era/upload
   * Permission: era:upload
   */
  fastify.post(
    '/upload',
    {
      preHandler: checkPermission('era:upload'),
      schema: {
        description: 'Upload and process 835 ERA file',
        tags: ['ERA'],
        body: {
          type: 'object',
          required: ['fileName', 'fileContent'],
          properties: {
            fileName: { type: 'string', description: 'ERA file name' },
            fileContent: { type: 'string', description: 'Raw 835 EDI content' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    ERAController.uploadERAFile.bind(ERAController)
  );

  /**
   * 2. Process uploaded 835 file
   * POST /api/era/process/:fileId
   * Permission: era:process
   */
  fastify.post(
    '/process/:fileId',
    {
      preHandler: checkPermission('era:process'),
      schema: {
        description: 'Process uploaded 835 ERA file',
        tags: ['ERA'],
        params: {
          type: 'object',
          required: ['fileId'],
          properties: {
            fileId: { type: 'string', description: 'ERA file ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    ERAController.processERAFile.bind(ERAController)
  );

  /**
   * 3. Get ERA payments for file
   * GET /api/era/payments/:fileId
   * Permission: era:view
   */
  fastify.get(
    '/payments/:fileId',
    {
      preHandler: checkPermission('era:view'),
      schema: {
        description: 'Get ERA payments for specific file',
        tags: ['ERA'],
        params: {
          type: 'object',
          required: ['fileId'],
          properties: {
            fileId: { type: 'string', description: 'ERA file ID' }
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
    ERAController.getERAPayments.bind(ERAController)
  );

  /**
   * 4. Auto-post individual payment
   * POST /api/era/auto-post/:paymentId
   * Permission: era:post
   */
  fastify.post(
    '/auto-post/:paymentId',
    {
      preHandler: checkPermission('era:post'),
      schema: {
        description: 'Auto-post individual payment',
        tags: ['ERA'],
        params: {
          type: 'object',
          required: ['paymentId'],
          properties: {
            paymentId: { type: 'number', description: 'ERA payment ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            claimId: { type: 'number', description: 'Claim ID to post to (optional override)' }
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
    ERAController.autoPostPayment.bind(ERAController)
  );

  /**
   * 5. Get posting exceptions
   * GET /api/era/exceptions
   * Permission: era:view
   */
  fastify.get(
    '/exceptions',
    {
      preHandler: checkPermission('era:view'),
      schema: {
        description: 'Get posting exceptions requiring review',
        tags: ['ERA'],
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'ASSIGNED', 'IN_REVIEW', 'RESOLVED', 'CLOSED'],
              default: 'PENDING'
            },
            severity: {
              type: 'string',
              enum: ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
            },
            limit: { type: 'number', default: 50, minimum: 1, maximum: 200 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              overdueCount: { type: 'number' },
              data: { type: 'array' }
            }
          }
        }
      }
    },
    ERAController.getPostingExceptions.bind(ERAController)
  );

  /**
   * 6. Resolve posting exception
   * POST /api/era/resolve-exception/:id
   * Permission: era:resolve
   */
  fastify.post(
    '/resolve-exception/:id',
    {
      preHandler: checkPermission('era:resolve'),
      schema: {
        description: 'Resolve posting exception',
        tags: ['ERA'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'string', description: 'Exception ID' }
          }
        },
        body: {
          type: 'object',
          required: ['resolutionType'],
          properties: {
            resolutionType: {
              type: 'string',
              enum: ['MANUAL_POSTED', 'CLAIM_CORRECTED', 'PAYER_CONTACTED', 'WRITTEN_OFF', 'REFUNDED'],
              description: 'Type of resolution'
            },
            notes: { type: 'string', description: 'Resolution notes' }
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
    ERAController.resolveException.bind(ERAController)
  );

  /**
   * 7. Get reconciliation status
   * GET /api/era/reconciliation
   * Permission: era:view
   */
  fastify.get(
    '/reconciliation',
    {
      preHandler: checkPermission('era:view'),
      schema: {
        description: 'Get daily reconciliation status',
        tags: ['ERA'],
        querystring: {
          type: 'object',
          properties: {
            batchDate: { type: 'string', format: 'date', description: 'Batch date (YYYY-MM-DD)' }
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
    ERAController.getReconciliationStatus.bind(ERAController)
  );

  /**
   * 8. Run reconciliation batch
   * POST /api/era/reconcile-batch
   * Permission: era:reconcile
   */
  fastify.post(
    '/reconcile-batch',
    {
      preHandler: checkPermission('era:reconcile'),
      schema: {
        description: 'Run daily deposit reconciliation',
        tags: ['ERA'],
        body: {
          type: 'object',
          required: ['batchDate'],
          properties: {
            batchDate: { type: 'string', format: 'date', description: 'Batch date (YYYY-MM-DD)' },
            depositAmount: { type: 'number', description: 'Expected deposit amount in cents' },
            bankStatementAmount: { type: 'number', description: 'Actual bank amount in cents' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              data: { type: 'object' }
            }
          }
        }
      }
    },
    ERAController.reconcileBatch.bind(ERAController)
  );

  /**
   * Additional helper endpoints
   */

  /**
   * Get ERA file list
   * GET /api/era/files
   * Permission: era:view
   */
  fastify.get(
    '/files',
    {
      preHandler: checkPermission('era:view'),
      schema: {
        description: 'Get list of ERA files',
        tags: ['ERA'],
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'PROCESSING', 'COMPLETED', 'ERROR', 'PARTIALLY_POSTED']
            },
            limit: { type: 'number', default: 50, minimum: 1, maximum: 200 }
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
    ERAController.getERAFiles.bind(ERAController)
  );

  /**
   * Get ERA file details
   * GET /api/era/file/:fileId
   * Permission: era:view
   */
  fastify.get(
    '/file/:fileId',
    {
      preHandler: checkPermission('era:view'),
      schema: {
        description: 'Get ERA file details',
        tags: ['ERA'],
        params: {
          type: 'object',
          required: ['fileId'],
          properties: {
            fileId: { type: 'string', description: 'ERA file ID' }
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
    ERAController.getERAFileDetails.bind(ERAController)
  );
}
