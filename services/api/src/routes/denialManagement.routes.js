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

  // ============================================
  // ANALYTICS & TREND ENDPOINTS
  // ============================================

  /**
   * 16. Get denial trends over time
   * GET /api/denials/analytics/trends
   * Permission: denials:view-stats
   */
  fastify.get(
    '/analytics/trends',
    {
      preHandler: checkPermission('denials:view-stats'),
      schema: {
        description: 'Get denial trends over time for trend analysis',
        tags: ['Denial Analytics'],
        querystring: {
          type: 'object',
          properties: {
            periodType: {
              type: 'string',
              enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
              default: 'MONTHLY',
              description: 'Time period granularity'
            },
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
              count: { type: 'number' },
              trends: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getDenialTrends.bind(DenialManagementController)
  );

  /**
   * 17. Get top denying payers
   * GET /api/denials/analytics/top-payers
   * Permission: denials:view-stats
   */
  fastify.get(
    '/analytics/top-payers',
    {
      preHandler: checkPermission('denials:view-stats'),
      schema: {
        description: 'Get top denying payers by denial count and amount',
        tags: ['Denial Analytics'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            limit: { type: 'number', default: 10, minimum: 1, maximum: 50, description: 'Number of payers to return' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              payers: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getTopDenyingPayers.bind(DenialManagementController)
  );

  /**
   * 18. Get dashboard metrics
   * GET /api/denials/analytics/dashboard
   * Permission: denials:view-stats
   */
  fastify.get(
    '/analytics/dashboard',
    {
      preHandler: checkPermission('denials:view-stats'),
      schema: {
        description: 'Get pre-calculated denial metrics for dashboard',
        tags: ['Denial Analytics'],
        querystring: {
          type: 'object',
          properties: {
            periodType: {
              type: 'string',
              enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
              default: 'MONTHLY',
              description: 'Time period granularity'
            },
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            payerId: { type: 'number', description: 'Filter by payer ID' },
            denialCategoryId: { type: 'number', description: 'Filter by denial category ID' },
            limit: { type: 'number', default: 12, minimum: 1, maximum: 100, description: 'Number of periods to return' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              analytics: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getDashboardMetrics.bind(DenialManagementController)
  );

  /**
   * 19. Calculate analytics for a period (Admin/Job endpoint)
   * POST /api/denials/analytics/calculate
   * Permission: denials:manage-analytics
   */
  fastify.post(
    '/analytics/calculate',
    {
      preHandler: checkPermission('denials:manage-analytics'),
      schema: {
        description: 'Calculate and store denial analytics for a time period',
        tags: ['Denial Analytics'],
        body: {
          type: 'object',
          required: ['periodType', 'startDate', 'endDate'],
          properties: {
            periodType: {
              type: 'string',
              enum: ['DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY'],
              description: 'Time period type'
            },
            startDate: { type: 'string', format: 'date', description: 'Start date (YYYY-MM-DD)' },
            endDate: { type: 'string', format: 'date', description: 'End date (YYYY-MM-DD)' },
            payerId: { type: 'number', description: 'Optional payer ID for dimensional breakdown' },
            denialCategoryId: { type: 'number', description: 'Optional category ID for dimensional breakdown' },
            carcCode: { type: 'string', description: 'Optional CARC code for dimensional breakdown' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              analytics: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.calculateAnalytics.bind(DenialManagementController)
  );

  // ============================================
  // LETTER TEMPLATE ENDPOINTS
  // ============================================

  /**
   * 20. Get letter templates
   * GET /api/denials/letter-templates
   * Permission: appeals:view
   */
  fastify.get(
    '/letter-templates',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get all appeal letter templates with optional filters',
        tags: ['Appeal Letter Templates'],
        querystring: {
          type: 'object',
          properties: {
            appealLevel: { type: 'string', description: 'Filter by appeal level' },
            payerType: {
              type: 'string',
              enum: ['MEDICARE', 'MEDICAID', 'COMMERCIAL'],
              description: 'Filter by payer type'
            },
            denialCategory: { type: 'string', description: 'Filter by denial category' },
            isActive: { type: 'boolean', default: true, description: 'Filter by active status' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              templates: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getLetterTemplates.bind(DenialManagementController)
  );

  /**
   * 21. Get specific letter template
   * GET /api/denials/letter-templates/:id
   * Permission: appeals:view
   */
  fastify.get(
    '/letter-templates/:id',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get a specific letter template',
        tags: ['Appeal Letter Templates'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Template ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              template: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.getLetterTemplate.bind(DenialManagementController)
  );

  /**
   * 22. Create letter template
   * POST /api/denials/letter-templates
   * Permission: appeals:manage
   */
  fastify.post(
    '/letter-templates',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Create a new appeal letter template',
        tags: ['Appeal Letter Templates'],
        body: {
          type: 'object',
          required: ['templateName', 'letterBody'],
          properties: {
            templateName: { type: 'string', description: 'Template name' },
            templateDescription: { type: 'string', description: 'Template description' },
            appealLevel: { type: 'string', description: 'Appeal level this template is for' },
            payerType: {
              type: 'string',
              enum: ['MEDICARE', 'MEDICAID', 'COMMERCIAL'],
              description: 'Payer type'
            },
            denialCategory: { type: 'string', description: 'Denial category' },
            letterSubject: { type: 'string', description: 'Letter subject line' },
            letterBody: { type: 'string', description: 'Letter body with {{placeholders}}' },
            closingStatement: { type: 'string', description: 'Closing statement' },
            placeholders: { type: 'array', description: 'Array of placeholder definitions' },
            requiredDocuments: { type: 'array', description: 'Array of required document types' },
            regulatoryReference: { type: 'string', description: 'Regulatory reference' },
            effectiveDate: { type: 'string', format: 'date', description: 'Effective date' },
            expirationDate: { type: 'string', format: 'date', description: 'Expiration date' },
            tags: { type: 'array', description: 'Tags for searching' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              template: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.createLetterTemplate.bind(DenialManagementController)
  );

  /**
   * 23. Update letter template
   * PUT /api/denials/letter-templates/:id
   * Permission: appeals:manage
   */
  fastify.put(
    '/letter-templates/:id',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Update a letter template',
        tags: ['Appeal Letter Templates'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Template ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            templateName: { type: 'string' },
            templateDescription: { type: 'string' },
            appealLevel: { type: 'string' },
            payerType: { type: 'string' },
            denialCategory: { type: 'string' },
            letterSubject: { type: 'string' },
            letterBody: { type: 'string' },
            closingStatement: { type: 'string' },
            placeholders: { type: 'array' },
            requiredDocuments: { type: 'array' },
            isActive: { type: 'boolean' },
            tags: { type: 'array' }
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
    DenialManagementController.updateLetterTemplate.bind(DenialManagementController)
  );

  /**
   * 24. Generate appeal letter from template
   * POST /api/denials/appeals/:id/letters/generate
   * Permission: appeals:manage
   */
  fastify.post(
    '/appeals/:id/letters/generate',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Generate an appeal letter from template',
        tags: ['Appeal Letters'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Appeal ID' }
          }
        },
        body: {
          type: 'object',
          required: ['templateId'],
          properties: {
            templateId: { type: 'number', description: 'Letter template ID' },
            placeholderValues: { type: 'object', description: 'Custom placeholder values' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              letter: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.generateAppealLetter.bind(DenialManagementController)
  );

  /**
   * 25. Get letters for an appeal
   * GET /api/denials/appeals/:id/letters
   * Permission: appeals:view
   */
  fastify.get(
    '/appeals/:id/letters',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get all letters for an appeal',
        tags: ['Appeal Letters'],
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
              letters: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getAppealLetters.bind(DenialManagementController)
  );

  /**
   * 26. Get specific letter
   * GET /api/denials/letters/:id
   * Permission: appeals:view
   */
  fastify.get(
    '/letters/:id',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get a specific letter',
        tags: ['Appeal Letters'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Letter ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              letter: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.getAppealLetter.bind(DenialManagementController)
  );

  /**
   * 27. Update letter
   * PUT /api/denials/letters/:id
   * Permission: appeals:manage
   */
  fastify.put(
    '/letters/:id',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Update letter content',
        tags: ['Appeal Letters'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Letter ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            letterSubject: { type: 'string' },
            letterBody: { type: 'string' },
            closingStatement: { type: 'string' },
            notes: { type: 'string' }
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
    DenialManagementController.updateAppealLetter.bind(DenialManagementController)
  );

  /**
   * 28. Finalize letter
   * POST /api/denials/letters/:id/finalize
   * Permission: appeals:manage
   */
  fastify.post(
    '/letters/:id/finalize',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Finalize a letter (mark as ready to send)',
        tags: ['Appeal Letters'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Letter ID' }
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
    DenialManagementController.finalizeLetter.bind(DenialManagementController)
  );

  /**
   * 29. Mark letter as sent
   * POST /api/denials/letters/:id/send
   * Permission: appeals:submit
   */
  fastify.post(
    '/letters/:id/send',
    {
      preHandler: checkPermission('appeals:submit'),
      schema: {
        description: 'Mark letter as sent',
        tags: ['Appeal Letters'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Letter ID' }
          }
        },
        body: {
          type: 'object',
          required: ['sentMethod'],
          properties: {
            sentMethod: {
              type: 'string',
              enum: ['PORTAL', 'FAX', 'MAIL', 'EMAIL'],
              description: 'Method used to send'
            },
            sentTo: { type: 'string', description: 'Recipient' },
            trackingNumber: { type: 'string', description: 'Tracking number' }
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
    DenialManagementController.markLetterSent.bind(DenialManagementController)
  );

  // ============================================
  // WORKFLOW TEMPLATE ENDPOINTS
  // ============================================

  /**
   * 30. Get workflow templates
   * GET /api/denials/workflow-templates
   * Permission: appeals:view
   */
  fastify.get(
    '/workflow-templates',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get all workflow templates',
        tags: ['Appeal Workflows'],
        querystring: {
          type: 'object',
          properties: {
            appealLevel: { type: 'string', description: 'Filter by appeal level' },
            payerType: {
              type: 'string',
              enum: ['MEDICARE', 'MEDICAID', 'COMMERCIAL'],
              description: 'Filter by payer type'
            },
            isActive: { type: 'boolean', default: true, description: 'Filter by active status' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              templates: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getWorkflowTemplates.bind(DenialManagementController)
  );

  /**
   * 31. Get specific workflow template
   * GET /api/denials/workflow-templates/:id
   * Permission: appeals:view
   */
  fastify.get(
    '/workflow-templates/:id',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get a specific workflow template',
        tags: ['Appeal Workflows'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Template ID' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              template: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.getWorkflowTemplate.bind(DenialManagementController)
  );

  /**
   * 32. Create workflow template
   * POST /api/denials/workflow-templates
   * Permission: appeals:manage
   */
  fastify.post(
    '/workflow-templates',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Create a new workflow template',
        tags: ['Appeal Workflows'],
        body: {
          type: 'object',
          required: ['workflowName', 'steps'],
          properties: {
            workflowName: { type: 'string', description: 'Workflow name' },
            workflowDescription: { type: 'string', description: 'Workflow description' },
            appealLevel: { type: 'string', description: 'Appeal level' },
            payerType: {
              type: 'string',
              enum: ['MEDICARE', 'MEDICAID', 'COMMERCIAL']
            },
            denialCategory: { type: 'string', description: 'Denial category' },
            steps: { type: 'array', description: 'Array of workflow step definitions' },
            estimatedDurationDays: { type: 'number', description: 'Estimated total duration' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              template: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.createWorkflowTemplate.bind(DenialManagementController)
  );

  /**
   * 33. Create default workflow templates
   * POST /api/denials/workflow-templates/defaults
   * Permission: appeals:manage
   */
  fastify.post(
    '/workflow-templates/defaults',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Create default workflow templates (Medicare, Commercial)',
        tags: ['Appeal Workflows'],
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              count: { type: 'number' },
              templates: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.createDefaultWorkflowTemplates.bind(DenialManagementController)
  );

  /**
   * 34. Initialize workflow for appeal
   * POST /api/denials/appeals/:id/workflow/initialize
   * Permission: appeals:manage
   */
  fastify.post(
    '/appeals/:id/workflow/initialize',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Initialize a workflow for an appeal',
        tags: ['Appeal Workflows'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Appeal ID' }
          }
        },
        body: {
          type: 'object',
          required: ['workflowTemplateId'],
          properties: {
            workflowTemplateId: { type: 'number', description: 'Workflow template ID' }
          }
        },
        response: {
          201: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              workflow: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.initializeWorkflow.bind(DenialManagementController)
  );

  /**
   * 35. Get workflow for appeal
   * GET /api/denials/appeals/:id/workflow
   * Permission: appeals:view
   */
  fastify.get(
    '/appeals/:id/workflow',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get workflow instance for an appeal',
        tags: ['Appeal Workflows'],
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
              workflow: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.getWorkflowInstance.bind(DenialManagementController)
  );

  /**
   * 36. Advance workflow step
   * POST /api/denials/workflows/:id/advance
   * Permission: appeals:manage
   */
  fastify.post(
    '/workflows/:id/advance',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Complete current step and advance to next',
        tags: ['Appeal Workflows'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Workflow instance ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            notes: { type: 'string', description: 'Completion notes' },
            actionsCompleted: { type: 'array', description: 'List of completed actions' },
            documentsAttached: { type: 'array', description: 'List of attached documents' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              isComplete: { type: 'boolean' },
              nextStep: { type: 'object' }
            }
          }
        }
      }
    },
    DenialManagementController.advanceWorkflowStep.bind(DenialManagementController)
  );

  /**
   * 37. Pause workflow
   * POST /api/denials/workflows/:id/pause
   * Permission: appeals:manage
   */
  fastify.post(
    '/workflows/:id/pause',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Pause a workflow',
        tags: ['Appeal Workflows'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Workflow instance ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Reason for pausing' }
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
    DenialManagementController.pauseWorkflow.bind(DenialManagementController)
  );

  /**
   * 38. Resume workflow
   * POST /api/denials/workflows/:id/resume
   * Permission: appeals:manage
   */
  fastify.post(
    '/workflows/:id/resume',
    {
      preHandler: checkPermission('appeals:manage'),
      schema: {
        description: 'Resume a paused workflow',
        tags: ['Appeal Workflows'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Workflow instance ID' }
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
    DenialManagementController.resumeWorkflow.bind(DenialManagementController)
  );

  // ============================================
  // STATUS TRACKING ENDPOINTS
  // ============================================

  /**
   * 39. Get appeal status history
   * GET /api/denials/appeals/:id/status-history
   * Permission: appeals:view
   */
  fastify.get(
    '/appeals/:id/status-history',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get status change history for an appeal',
        tags: ['Appeal Status'],
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
              history: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getAppealStatusHistory.bind(DenialManagementController)
  );

  /**
   * 40. Get comprehensive appeal details
   * GET /api/denials/appeals/:id/details
   * Permission: appeals:view
   */
  fastify.get(
    '/appeals/:id/details',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get comprehensive appeal details including timeline, documents, letters, workflow, and status history',
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
              appeal: { type: 'object' },
              timeline: { type: 'array' },
              documents: { type: 'array' },
              letters: { type: 'array' },
              workflow: { type: 'object' },
              statusHistory: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getAppealDetails.bind(DenialManagementController)
  );

  // ============================================
  // DATA EXPORT ENDPOINTS
  // ============================================

  /**
   * 41. Export denials to CSV
   * GET /api/denials/export/csv
   * Permission: denials:export
   */
  fastify.get(
    '/export/csv',
    {
      preHandler: checkPermission('denials:export'),
      schema: {
        description: 'Export denials to CSV format',
        tags: ['Denial Export'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date for export range' },
            endDate: { type: 'string', format: 'date', description: 'End date for export range' },
            payerId: { type: 'number', description: 'Filter by payer ID' },
            status: { type: 'string', description: 'Filter by denial status' },
            priorityLevel: { type: 'string', enum: ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'] }
          }
        },
        response: {
          200: {
            type: 'string',
            description: 'CSV file content'
          }
        }
      }
    },
    DenialManagementController.exportDenialsToCSV.bind(DenialManagementController)
  );

  /**
   * 42. Export appeals to CSV
   * GET /api/denials/appeals/export/csv
   * Permission: appeals:export
   */
  fastify.get(
    '/appeals/export/csv',
    {
      preHandler: checkPermission('appeals:export'),
      schema: {
        description: 'Export appeals to CSV format',
        tags: ['Appeal Export'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date for export range' },
            endDate: { type: 'string', format: 'date', description: 'End date for export range' },
            status: { type: 'string', description: 'Filter by appeal status' },
            appealLevel: { type: 'string', description: 'Filter by appeal level' }
          }
        },
        response: {
          200: {
            type: 'string',
            description: 'CSV file content'
          }
        }
      }
    },
    DenialManagementController.exportAppealsToCSV.bind(DenialManagementController)
  );

  /**
   * 43. Export denials to PDF
   * GET /api/denials/export/pdf
   * Permission: denials:export
   */
  fastify.get(
    '/export/pdf',
    {
      preHandler: checkPermission('denials:export'),
      schema: {
        description: 'Export denial report to PDF format',
        tags: ['Denial Export'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date for report' },
            endDate: { type: 'string', format: 'date', description: 'End date for report' },
            payerId: { type: 'number', description: 'Filter by payer ID' },
            reportType: { type: 'string', enum: ['summary', 'detailed'], default: 'summary' }
          }
        },
        response: {
          200: {
            type: 'string',
            format: 'binary',
            description: 'PDF file content'
          }
        }
      }
    },
    DenialManagementController.exportDenialsToPDF.bind(DenialManagementController)
  );

  /**
   * 44. Export appeals to PDF
   * GET /api/denials/appeals/export/pdf
   * Permission: appeals:export
   */
  fastify.get(
    '/appeals/export/pdf',
    {
      preHandler: checkPermission('appeals:export'),
      schema: {
        description: 'Export appeals report to PDF format',
        tags: ['Appeal Export'],
        querystring: {
          type: 'object',
          properties: {
            startDate: { type: 'string', format: 'date', description: 'Start date for report' },
            endDate: { type: 'string', format: 'date', description: 'End date for report' },
            reportType: { type: 'string', enum: ['summary', 'detailed'], default: 'summary' }
          }
        },
        response: {
          200: {
            type: 'string',
            format: 'binary',
            description: 'PDF file content'
          }
        }
      }
    },
    DenialManagementController.exportAppealsToPDF.bind(DenialManagementController)
  );

  // ============================================
  // DUPLICATE HANDLING ENDPOINTS
  // ============================================

  /**
   * 45. Find duplicate denials
   * GET /api/denials/duplicates
   * Permission: denials:view
   */
  fastify.get(
    '/duplicates',
    {
      preHandler: checkPermission('denials:view'),
      schema: {
        description: 'Find potential duplicate denials',
        tags: ['Denial Duplicates'],
        querystring: {
          type: 'object',
          properties: {
            claimId: { type: 'number', description: 'Filter by claim ID' },
            patientId: { type: 'number', description: 'Filter by patient ID' },
            dateRange: { type: 'number', default: 30, description: 'Number of days to look back' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              duplicates: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.findDuplicateDenials.bind(DenialManagementController)
  );

  /**
   * 46. Mark denial as duplicate
   * POST /api/denials/:id/mark-duplicate
   * Permission: denials:resolve
   */
  fastify.post(
    '/:id/mark-duplicate',
    {
      preHandler: checkPermission('denials:resolve'),
      schema: {
        description: 'Mark a denial as a duplicate of another',
        tags: ['Denial Duplicates'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Denial ID to mark as duplicate' }
          }
        },
        body: {
          type: 'object',
          required: ['originalDenialId'],
          properties: {
            originalDenialId: { type: 'number', description: 'ID of the original denial' },
            reason: { type: 'string', description: 'Reason for marking as duplicate' }
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
    DenialManagementController.markAsDuplicate.bind(DenialManagementController)
  );

  // ============================================
  // EXPIRED DEADLINE ENDPOINTS
  // ============================================

  /**
   * 47. Get denials with expired deadlines
   * GET /api/denials/expired-deadlines
   * Permission: denials:view
   */
  fastify.get(
    '/expired-deadlines',
    {
      preHandler: checkPermission('denials:view'),
      schema: {
        description: 'Get denials with expired appeal deadlines',
        tags: ['Denial Deadlines'],
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 50, minimum: 1, maximum: 200 },
            includeResolved: { type: 'boolean', default: false }
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
    DenialManagementController.getExpiredDeadlines.bind(DenialManagementController)
  );

  /**
   * 48. Request deadline extension
   * POST /api/denials/:id/extend-deadline
   * Permission: denials:appeal
   */
  fastify.post(
    '/:id/extend-deadline',
    {
      preHandler: checkPermission('denials:appeal'),
      schema: {
        description: 'Request deadline extension for a denial',
        tags: ['Denial Deadlines'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Denial ID' }
          }
        },
        body: {
          type: 'object',
          required: ['newDeadline', 'extensionReason'],
          properties: {
            newDeadline: { type: 'string', format: 'date', description: 'Requested new deadline' },
            extensionReason: { type: 'string', description: 'Reason for extension request' },
            supportingDocumentation: { type: 'string', description: 'Reference to supporting documents' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              originalDeadline: { type: 'string' },
              requestedDeadline: { type: 'string' },
              extensionStatus: { type: 'string' }
            }
          }
        }
      }
    },
    DenialManagementController.requestDeadlineExtension.bind(DenialManagementController)
  );

  // ============================================
  // BULK OPERATIONS ENDPOINTS
  // ============================================

  /**
   * 49. Bulk assign denials
   * POST /api/denials/bulk-assign
   * Permission: denials:assign
   */
  fastify.post(
    '/bulk-assign',
    {
      preHandler: checkPermission('denials:assign'),
      schema: {
        description: 'Bulk assign denials to a user',
        tags: ['Denial Bulk Operations'],
        body: {
          type: 'object',
          required: ['denialIds', 'assignedToId'],
          properties: {
            denialIds: { type: 'array', items: { type: 'number' }, minItems: 1, description: 'Array of denial IDs to assign' },
            assignedToId: { type: 'string', description: 'User ID to assign denials to' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              assigned: { type: 'number' },
              failed: { type: 'number' },
              errors: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.bulkAssignDenials.bind(DenialManagementController)
  );

  /**
   * 50. Bulk resolve denials
   * POST /api/denials/bulk-resolve
   * Permission: denials:resolve
   */
  fastify.post(
    '/bulk-resolve',
    {
      preHandler: checkPermission('denials:resolve'),
      schema: {
        description: 'Bulk resolve denials without appeal',
        tags: ['Denial Bulk Operations'],
        body: {
          type: 'object',
          required: ['denialIds', 'resolutionType'],
          properties: {
            denialIds: { type: 'array', items: { type: 'number' }, minItems: 1, description: 'Array of denial IDs to resolve' },
            resolutionType: {
              type: 'string',
              enum: ['WRITE_OFF', 'PATIENT_RESPONSIBILITY', 'CORRECTED_CLAIM', 'CONTRACTUAL_ADJUSTMENT'],
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
              message: { type: 'string' },
              resolved: { type: 'number' },
              failed: { type: 'number' },
              errors: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.bulkResolveDenials.bind(DenialManagementController)
  );

  // ============================================
  // PARTIAL APPROVAL ENDPOINTS
  // ============================================

  /**
   * 51. Record partial approval
   * POST /api/denials/appeals/:id/partial-approval
   * Permission: appeals:decision
   */
  fastify.post(
    '/appeals/:id/partial-approval',
    {
      preHandler: checkPermission('appeals:decision'),
      schema: {
        description: 'Record a partial approval decision for an appeal',
        tags: ['Appeal Decisions'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Appeal ID' }
          }
        },
        body: {
          type: 'object',
          required: ['approvedAmount', 'deniedAmount'],
          properties: {
            approvedAmount: { type: 'number', description: 'Amount approved in cents' },
            deniedAmount: { type: 'number', description: 'Amount still denied in cents' },
            approvedItems: { type: 'array', items: { type: 'string' }, description: 'List of approved items' },
            deniedItems: { type: 'array', items: { type: 'string' }, description: 'List of denied items' },
            decisionReason: { type: 'string', description: 'Reason for partial approval' },
            willAppealRemainder: { type: 'boolean', default: false, description: 'Whether to appeal the remaining denied amount' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' },
              approvedAmount: { type: 'number' },
              deniedAmount: { type: 'number' },
              willAppealRemainder: { type: 'boolean' },
              nextSteps: { type: 'string' }
            }
          }
        }
      }
    },
    DenialManagementController.recordPartialApproval.bind(DenialManagementController)
  );

  // ============================================
  // MULTI-CLAIM APPEAL ENDPOINTS
  // ============================================

  /**
   * 52. Create multi-claim appeal
   * POST /api/denials/appeals/multi-claim
   * Permission: appeals:create
   */
  fastify.post(
    '/appeals/multi-claim',
    {
      preHandler: checkPermission('appeals:create'),
      schema: {
        description: 'Create an appeal spanning multiple claims',
        tags: ['Multi-Claim Appeals'],
        body: {
          type: 'object',
          required: ['denialIds', 'appealLevel', 'appealBasis'],
          properties: {
            denialIds: { type: 'array', items: { type: 'number' }, minItems: 1, description: 'Array of denial IDs to include in appeal' },
            appealLevel: { type: 'string', description: 'Appeal level (e.g., REDETERMINATION, INTERNAL_REVIEW)' },
            appealBasis: { type: 'string', description: 'Basis for the appeal' },
            medicalNecessityRationale: { type: 'string', description: 'Medical necessity rationale' },
            policyReference: { type: 'string', description: 'Policy reference for appeal' }
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
    DenialManagementController.createMultiClaimAppeal.bind(DenialManagementController)
  );

  /**
   * 53. Get related claims for multi-claim appeal
   * GET /api/denials/appeals/:id/related-claims
   * Permission: appeals:view
   */
  fastify.get(
    '/appeals/:id/related-claims',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get all claims related to a multi-claim appeal',
        tags: ['Multi-Claim Appeals'],
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
              claims: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getRelatedClaims.bind(DenialManagementController)
  );

  // ============================================
  // AUDIT LOGGING ENDPOINTS
  // ============================================

  /**
   * 54. Get denial audit log
   * GET /api/denials/:id/audit-log
   * Permission: denials:view
   */
  fastify.get(
    '/:id/audit-log',
    {
      preHandler: checkPermission('denials:view'),
      schema: {
        description: 'Get audit log for a denial',
        tags: ['Denial Audit'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Denial ID' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 100, minimum: 1, maximum: 500 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              auditLog: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getDenialAuditLog.bind(DenialManagementController)
  );

  /**
   * 55. Get appeal audit log
   * GET /api/denials/appeals/:id/audit-log
   * Permission: appeals:view
   */
  fastify.get(
    '/appeals/:id/audit-log',
    {
      preHandler: checkPermission('appeals:view'),
      schema: {
        description: 'Get audit log for an appeal',
        tags: ['Appeal Audit'],
        params: {
          type: 'object',
          required: ['id'],
          properties: {
            id: { type: 'number', description: 'Appeal ID' }
          }
        },
        querystring: {
          type: 'object',
          properties: {
            limit: { type: 'number', default: 100, minimum: 1, maximum: 500 }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              count: { type: 'number' },
              auditLog: { type: 'array' }
            }
          }
        }
      }
    },
    DenialManagementController.getAppealAuditLog.bind(DenialManagementController)
  );
}
