import DenialManagementController from '../controllers/DenialManagement.controller.js';
import { authenticate } from '../middleware/betterAuth.middleware.js';
import { checkPermission } from '../middleware/permission.middleware.js';

/**
 * Denial Management Routes
 * Phase 3C - Denial Tracking and Appeal Management
 *
 * All routes require authentication and specific permissions
 */
export default async function denialManagementRoutes(fastify, options) {
  // Apply authentication middleware to all routes
  fastify.addHook('onRequest', authenticate);

  // ============================================
  // DENIAL ENDPOINTS
  // ============================================

  /**
   * 1. Get denials requiring action
   * GET /api/denials
   * Permission: denials:view
   */
  fastify.get(
    '/',
    {
      preHandler: checkPermission('denials:view'),
      schema: {
        description: 'Get denials requiring action with optional filters',
        tags: ['Denials'],
        querystring: {
          type: 'object',
          properties: {
            priorityLevel: {
              type: 'string',
              enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'],
              description: 'Filter by priority level'
            },
            assignedTo: { type: 'string', description: 'Filter by assigned user ID' },
            limit: { type: 'number', default: 50, minimum: 1, maximum: 100 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              denials: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getDenials.bind(DenialManagementController)
  );

  /**
   * 2. Get denial details
   * GET /api/denials/:id
   * Permission: denials:view
   */
  fastify.get(
    '/:id',
    {
      preHandler: checkPermission('denials:view'),
      schema: {
        description: 'Get denial details with all reasons and adjustments',
        tags: ['Denials'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Denial ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              denial: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.getDenial.bind(DenialManagementController)
  );

  /**
   * 3. Assign denial to user
   * POST /api/denials/:id/assign
   * Permission: denials:assign
   */
  fastify.post(
    '/:id/assign',
    {
      preHandler: checkPermission('denials:assign'),
      schema: {
        description: 'Assign denial to user for review',
        tags: ['Denials'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Denial ID' }
          }
        },
        body: {
          type: 'object',
          required: ['assignedToId'],
          properties: {
            assignedToId: { type: 'string', description: 'User ID to assign denial to' }
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
    DenialManagementController.assignDenial.bind(DenialManagementController)
  );

  /**
   * 4. Mark denial for appeal
   * POST /api/denials/:id/appeal
   * Permission: denials:appeal
   */
  fastify.post(
    '/:id/appeal',
    {
      preHandler: checkPermission('denials:appeal'),
      schema: {
        description: 'Mark denial for appeal or decline appeal',
        tags: ['Denials'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Denial ID' }
          }
        },
        body: {
          type: 'object',
          required: ['willAppeal'],
          properties: {
            willAppeal: { type: 'boolean', description: 'Will this denial be appealed?' },
            reason: { type: 'string', description: 'Reason for appeal decision' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              willAppeal: { type: 'boolean' }
            }
          }
        }
      }
    },
    DenialManagementController.markForAppeal.bind(DenialManagementController)
  );

  /**
   * 5. Resolve denial without appeal
   * POST /api/denials/:id/resolve
   * Permission: denials:resolve
   */
  fastify.post(
    '/:id/resolve',
    {
      preHandler: checkPermission('denials:resolve'),
      schema: {
        description: 'Resolve denial without appeal',
        tags: ['Denials'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Denial ID' }
          }
        },
        body: {
          type: 'object',
          required: ['resolutionType'],
          properties: {
            resolutionType: {
              type: 'string',
              enum: ['WRITE_OFF', 'PATIENT_RESPONSIBILITY', 'CORRECTED_CLAIM', 'CONTRACTUAL_ADJUSTMENT'],
              description: 'Type of resolution'
            },
            resolutionAmount: { type: 'number', description: 'Amount resolved (in cents)' },
            notes: { type: 'string', description: 'Resolution notes' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              resolutionType: { type: 'string' }
            }
          }
        }
      }
    },
    DenialManagementController.resolveDenial.bind(DenialManagementController)
  );

  /**
   * 6. Get denial statistics
   * GET /api/denials/stats
   * Permission: denials:view-stats
   */
  fastify.get(
    '/stats',
    {
      preHandler: checkPermission('denials:view-stats'),
      schema: {
        description: 'Get denial statistics with optional date range',
        tags: ['Denials'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            payerId: { type: 'number', description: 'Filter by payer ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              stats: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.getDenialStats.bind(DenialManagementController)
  );

  /**
   * 7. Get top denial reasons
   * GET /api/denials/top-reasons
   * Permission: denials:view-stats
   */
  fastify.get(
    '/top-reasons',
    {
      preHandler: checkPermission('denials:view-stats'),
      schema: {
        description: 'Get top denial reasons by frequency',
        tags: ['Denials'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 10, minimum: 1, maximum: 50 },
            startDate: { type: 'string', format: 'date' },
            endDate: { type: 'string', format: 'date' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              reasons: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getTopDenialReasons.bind(DenialManagementController)
  );

  // ============================================
  // APPEAL ENDPOINTS
  // ============================================

  /**
   * 8. Create appeal case
   * POST /api/appeals
   * Permission: appeals:create
   */
  fastify.post(
    '/appeals',
    {
      preHandler: checkPermission('appeals:create'),
      schema: {
        description: 'Create new appeal case from denial',
        tags: ['Appeals'],
        body: {
          type: 'object',
          required: ['denialId', 'appealLevel', 'appealBasis'],
          properties: {
            denialId: { type: 'number', description: 'Denial ID to appeal' },
            appealLevel: {
              type: 'string',
              enum: [
                'REDETERMINATION', 'RECONSIDERATION', 'ALJ_HEARING', 'MAC_REVIEW', 'FEDERAL_COURT',
                'FAIR_HEARING', 'STATE_APPEAL', 'INTERNAL_REVIEW', 'EXTERNAL_REVIEW', 'ARBITRATION', 'LITIGATION'
              ],
              description: 'Appeal level'
            },
            appealBasis: { type: 'string', description: 'Basis for appeal' },
            medicalNecessityRationale: { type: 'string', description: 'Medical necessity rationale' },
            policyReference: { type: 'string', description: 'Policy reference' },
            appealContactName: { type: 'string', description: 'Contact name' },
            appealContactPhone: { type: 'string', description: 'Contact phone' },
            appealContactEmail: { type: 'string', description: 'Contact email' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              appeal: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.createAppeal.bind(DenialManagementController)
  );

  /**
   * 9. Submit appeal to payer
   * POST /api/appeals/:id/submit
   * Permission: appeals:submit
   */
  fastify.post(
    '/appeals/:id/submit',
    {
      preHandler: checkPermission('appeals:submit'),
      schema: {
        description: 'Submit appeal to payer',
        tags: ['Appeals'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Appeal ID' }
          }
        },
        body: {
          type: 'object',
          required: ['submissionMethod'],
          properties: {
            submissionMethod: {
              type: 'string',
              enum: ['PORTAL', 'FAX', 'MAIL', 'EMAIL'],
              description: 'Method of submission'
            },
            trackingNumber: { type: 'string', description: 'Tracking number' },
            confirmationNumber: { type: 'string', description: 'Confirmation number' },
            submittedDate: { type: 'string', format: 'date-time', description: 'Submission date' }
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
    DenialManagementController.submitAppeal.bind(DenialManagementController)
  );

  /**
   * 10. Record appeal decision
   * POST /api/appeals/:id/decision
   * Permission: appeals:manage
   */
  fastify.post(
    '/appeals/:id/decision',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Record appeal decision from payer',
        tags: ['Appeals'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Appeal ID' }
          }
        },
        body: {
          type: 'object',
          required: ['decisionType', 'decisionReason'],
          properties: {
            decisionType: {
              type: 'string',
              enum: ['APPROVED', 'PARTIAL_APPROVAL', 'DENIED', 'PENDING_INFO'],
              description: 'Decision type'
            },
            decisionReason: { type: 'string', description: 'Reason for decision' },
            decisionDate: { type: 'string', format: 'date-time', description: 'Decision date' },
            decisionReceivedDate: { type: 'string', format: 'date-time', description: 'Date decision received' },
            recoveredAmount: { type: 'number', description: 'Amount recovered (in cents)' },
            finalDeniedAmount: { type: 'number', description: 'Final denied amount (in cents)' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              nextLevel: { type: 'string' },
              willEscalate: { type: 'boolean' }
            }
          }
        }
      }
    },
    DenialManagementController.recordDecision.bind(DenialManagementController)
  );

  /**
   * 11. Escalate appeal to next level
   * POST /api/appeals/:id/escalate
   * Permission: appeals:escalate
   */
  fastify.post(
    '/appeals/:id/escalate',
    {
      preHandler: checkPermission('appeals:escalate'),
      schema: {
        description: 'Escalate appeal to next level',
        tags: ['Appeals'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Appeal ID' }
          }
        },
        body: {
          type: 'object',
          required: ['escalationReason'],
          properties: {
            escalationReason: { type: 'string', description: 'Reason for escalation' },
            additionalDocumentation: { type: 'string', description: 'Additional documentation notes' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              newAppeal: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.escalateAppeal.bind(DenialManagementController)
  );

  /**
   * 12. Attach document to appeal
   * POST /api/appeals/:id/documents
   * Permission: appeals:manage
   */
  fastify.post(
    '/appeals/:id/documents',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Attach supporting document to appeal',
        tags: ['Appeals'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Appeal ID' }
          }
        },
        body: {
          type: 'object',
          required: ['documentType', 'documentName'],
          properties: {
            documentType: {
              type: 'string',
              enum: ['MEDICAL_RECORDS', 'CLINICAL_NOTES', 'PHYSICIAN_STATEMENT', 'POLICY_DOCUMENTATION', 'OTHER'],
              description: 'Type of document'
            },
            documentName: { type: 'string', description: 'Document name' },
            documentDescription: { type: 'string', description: 'Document description' },
            filePath: { type: 'string', description: 'File path' },
            fileUrl: { type: 'string', description: 'File URL' },
            fileSize: { type: 'number', description: 'File size in bytes' },
            fileType: { type: 'string', description: 'File type' },
            mimeType: { type: 'string', description: 'MIME type' },
            documentDate: { type: 'string', format: 'date', description: 'Document date' },
            author: { type: 'string', description: 'Document author' },
            isRequired: { type: 'boolean', default: false, description: 'Is document required?' },
            isSensitive: { type: 'boolean', default: true, description: 'Is document sensitive/PHI?' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              document: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.attachDocument.bind(DenialManagementController)
  );

  /**
   * 13. Get appeals requiring action
   * GET /api/appeals
   * Permission: appeals:view
   */
  fastify.get(
    '/appeals',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get appeals requiring action with optional filters',
        tags: ['Appeals'],
        querystring: {
          type: 'object',
          properties: {
            assignedTo: { type: 'string', description: 'Filter by assigned user ID' },
            status: {
              type: 'string',
              enum: ['PREPARING', 'SUBMITTED', 'UNDER_REVIEW', 'WON', 'LOST', 'PARTIAL_WIN'],
              description: 'Filter by status'
            },
            daysUntilDeadline: { type: 'number', default: 30, description: 'Days until deadline threshold' },
            limit: { type: 'number', default: 50, minimum: 1, maximum: 100 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              appeals: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getAppeals.bind(DenialManagementController)
  );

  /**
   * 14. Get appeal timeline
   * GET /api/appeals/:id/timeline
   * Permission: appeals:view
   */
  fastify.get(
    '/appeals/:id/timeline',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get appeal timeline milestones',
        tags: ['Appeals'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Appeal ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              timeline: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getAppealTimeline.bind(DenialManagementController)
  );

  /**
   * 15. Get appeal statistics
   * GET /api/appeals/stats
   * Permission: appeals:view-stats
   */
  fastify.get(
    '/appeals/stats',
    {
      preHandler: checkPermission('appeals:view-stats'),
      schema: {
        description: 'Get appeal statistics with optional filters',
        tags: ['Appeals'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            appealLevel: { type: 'string', description: 'Filter by appeal level' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              stats: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.getAppealStats.bind(DenialManagementController)
  );
}
