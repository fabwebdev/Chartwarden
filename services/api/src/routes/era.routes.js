import ERAController from '../controllers/ERA.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

/**
 * ERA (Electronic Remittance Advice) Routes
 * Phase 3B - ERA Processing & Auto-Posting
 *
 * All routes require authentication and specific permissions
 *
 * Endpoints:
 * - POST /upload           - Upload ERA file (JSON body, supports 835 EDI & CSV)
 * - POST /upload-file      - Upload ERA file (multipart form-data)
 * - POST /validate         - Validate ERA file without processing
 * - POST /batch-process    - Batch process multiple ERA files
 * - POST /process/:fileId  - Process uploaded ERA file
 * - GET  /payments/:fileId - Get payments for ERA file
 * - POST /auto-post/:paymentId - Post individual payment
 * - GET  /exceptions       - Get posting exceptions
 * - POST /resolve-exception/:id - Resolve exception
 * - GET  /reconciliation   - Get reconciliation status
 * - POST /reconcile-batch  - Run reconciliation
 * - GET  /processing-report/:fileId - Get processing summary report
 * - GET  /files            - List ERA files
 * - GET  /file/:fileId     - Get ERA file details
 * - GET  /payment/:paymentId - Get ERA payment details
 * - GET  /dashboard        - Get dashboard metrics
 * - GET  /reconciliation/summary - Get reconciliation summary
 * - POST /reverse-posting/:postingId - Reverse a posting
 */
export default async function eraRoutes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  /**
   * 1. Upload 835 ERA file (JSON body)
   * POST /api/era/upload
   * Permission: era:upload
   * Supports both 835 EDI and CSV formats
   */
  fastify.post(
    '/upload',
    {
      preHandler: checkPermission('era:upload'),
      schema: {
        description: 'Upload and process ERA file (835 EDI or CSV format)',
        tags: ['ERA'],
        body: {
          type: 'object',
          required: ['fileName', 'fileContent'],
          properties: {
            fileName: { type: 'string', description: 'ERA file name (with extension)' },
            fileContent: { type: 'string', description: 'Raw file content (835 EDI or CSV)' }
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
   * 1b. Upload ERA file via multipart form
   * POST /api/era/upload-file
   * Permission: era:upload
   * Accepts multipart/form-data with file field
   */
  fastify.post(
    '/upload-file',
    {
      preHandler: checkPermission('era:upload'),
      schema: {
        description: 'Upload ERA file via multipart form (835 EDI or CSV)',
        tags: ['ERA'],
        consumes: ['multipart/form-data'],
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
    ERAController.uploadERAFileMultipart.bind(ERAController)
  );

  /**
   * 1c. Validate ERA file without processing
   * POST /api/era/validate
   * Permission: era:upload
   */
  fastify.post(
    '/validate',
    {
      preHandler: checkPermission('era:upload'),
      schema: {
        description: 'Validate ERA file format and structure without processing',
        tags: ['ERA'],
        body: {
          type: 'object',
          required: ['fileName', 'fileContent'],
          properties: {
            fileName: { type: 'string', description: 'ERA file name' },
            fileContent: { type: 'string', description: 'Raw file content' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  valid: { type: 'boolean' },
                  format: { type: 'string' },
                  errors: { type: 'array', items: { type: 'string' } },
                  warnings: { type: 'array', items: { type: 'string' } },
                  summary: { type: 'object' }
                }
              }
            }
          }
        }
      }
    },
    ERAController.validateERAFile.bind(ERAController)
  );

  /**
   * 1d. Batch process multiple ERA files
   * POST /api/era/batch-process
   * Permission: era:process
   */
  fastify.post(
    '/batch-process',
    {
      preHandler: checkPermission('era:process'),
      schema: {
        description: 'Batch process multiple ERA files with transaction support',
        tags: ['ERA'],
        body: {
          type: 'object',
          required: ['files'],
          properties: {
            files: {
              type: 'array',
              items: {
                type: 'object',
                required: ['fileName', 'fileContent'],
                properties: {
                  fileName: { type: 'string' },
                  fileContent: { type: 'string' }
                }
              },
              maxItems: 50
            },
            stopOnError: { type: 'boolean', default: false }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              totalFiles: { type: 'number' },
              processed: { type: 'number' },
              failed: { type: 'number' },
              files: { type: 'array' },
              errors: { type: 'array' },
              summary: { type: 'object' }
            }
          }
        }
      }
    },
    ERAController.batchProcessERAFiles.bind(ERAController)
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

  /**
   * Get ERA payment details
   * GET /api/era/payment/:paymentId
   * Permission: era:view
   */
  fastify.get(
    '/payment/:paymentId',
    {
      preHandler: checkPermission('era:view'),
      schema: {
        description: 'Get ERA payment details',
        tags: ['ERA'],
        params: {
          type: 'object',
          required: ['paymentId'],
          properties: {
            paymentId: { type: 'string', description: 'ERA payment ID' }
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
    ERAController.getERAPaymentDetails.bind(ERAController)
  );

  /**
   * Get processing summary report for ERA file
   * GET /api/era/processing-report/:fileId
   * Permission: era:view
   */
  fastify.get(
    '/processing-report/:fileId',
    {
      preHandler: checkPermission('era:view'),
      schema: {
        description: 'Get comprehensive processing summary report for an ERA file',
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
              data: {
                type: 'object',
                properties: {
                  file: { type: 'object' },
                  totals: { type: 'object' },
                  payments: { type: 'object' },
                  exceptions: { type: 'object' },
                  detailedExceptions: { type: 'array' }
                }
              }
            }
          }
        }
      }
    },
    ERAController.getProcessingReport.bind(ERAController)
  );

  /**
   * Get payment posting dashboard metrics
   * GET /api/era/dashboard
   * Permission: era:view
   */
  fastify.get(
    '/dashboard',
    {
      preHandler: checkPermission('era:view'),
      schema: {
        description: 'Get payment posting dashboard metrics',
        tags: ['ERA'],
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  eraFiles: { type: 'object' },
                  posting: { type: 'object' },
                  exceptions: { type: 'object' }
                }
              }
            }
          }
        }
      }
    },
    ERAController.getDashboardMetrics.bind(ERAController)
  );

  /**
   * Get reconciliation summary
   * GET /api/era/reconciliation/summary
   * Permission: era:view
   */
  fastify.get(
    '/reconciliation/summary',
    {
      preHandler: checkPermission('era:view'),
      schema: {
        description: 'Get reconciliation summary with statistics',
        tags: ['ERA'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date filter' },
            endDate: { type: 'string', format: 'date', description: 'End date filter' },
            status: {
              type: 'string',
              enum: ['PENDING', 'IN_PROGRESS', 'RECONCILED', 'VARIANCE_IDENTIFIED', 'EXCEPTION'],
              description: 'Reconciliation status filter'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'object',
                properties: {
                  summary: { type: 'object' },
                  batches: { type: 'array' }
                }
              }
            }
          }
        }
      }
    },
    ERAController.getReconciliationSummary.bind(ERAController)
  );

  /**
   * Reverse a payment posting
   * POST /api/era/reverse-posting/:postingId
   * Permission: era:post
   */
  fastify.post(
    '/reverse-posting/:postingId',
    {
      preHandler: checkPermission('era:post'),
      schema: {
        description: 'Reverse a payment posting',
        tags: ['ERA'],
        params: {
          type: 'object',
          required: ['postingId'],
          properties: {
            postingId: { type: 'string', description: 'Posting ID to reverse' }
          }
        },
        body: {
          type: 'object',
          required: ['reason'],
          properties: {
            reason: { type: 'string', description: 'Reason for reversal' }
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
    ERAController.reversePosting.bind(ERAController)
  );
}
