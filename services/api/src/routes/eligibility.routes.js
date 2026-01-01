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

  /**
   * List verification requests with filtering
   * GET /api/eligibility/requests
   * Permission: eligibility:view
   */
  fastify.get(
    '/requests',
    {
      preHandler: checkPermission('eligibility:view'),
      schema: {
        description: 'List eligibility verification requests with filtering and pagination',
        tags: ['Eligibility'],
        querystring: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'SENT', 'RECEIVED', 'ERROR', 'TIMEOUT', 'CANCELLED'],
              description: 'Filter by request status'
            },
            startDate: {
              type: 'string',
              format: 'date',
              description: 'Filter by start date (YYYY-MM-DD)'
            },
            endDate: {
              type: 'string',
              format: 'date',
              description: 'Filter by end date (YYYY-MM-DD)'
            },
            providerNpi: {
              type: 'string',
              description: 'Filter by provider NPI'
            },
            page: {
              type: 'number',
              default: 1,
              minimum: 1,
              description: 'Page number'
            },
            limit: {
              type: 'number',
              default: 20,
              minimum: 1,
              maximum: 100,
              description: 'Items per page (max 100)'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: { type: 'array' },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' }
                }
              }
            }
          }
        }
      }
    },
    EligibilityController.listRequests.bind(EligibilityController)
  );

  /**
   * Get verification status by request ID
   * GET /api/eligibility/status/:requestId
   * Permission: eligibility:view
   */
  fastify.get(
    '/status/:requestId',
    {
      preHandler: checkPermission('eligibility:view'),
      schema: {
        description: 'Get verification status by request ID with detailed tracking information',
        tags: ['Eligibility'],
        params: {
          type: 'object',
          required: ['requestId'],
          properties: {
            requestId: { type: 'string', description: 'Unique request tracking ID' }
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
                  requestId: { type: 'string' },
                  status: { type: 'string' },
                  patientId: { type: 'number' },
                  payerId: { type: 'number' },
                  serviceType: { type: 'string' },
                  requestDate: { type: 'string' },
                  sentAt: { type: 'string' },
                  createdAt: { type: 'string' },
                  updatedAt: { type: 'string' },
                  errorMessage: { type: 'string' },
                  retryCount: { type: 'number' },
                  clearinghouseTraceId: { type: 'string' },
                  clearinghouseName: { type: 'string' },
                  response: { type: 'object' }
                }
              }
            }
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    },
    EligibilityController.getVerificationStatus.bind(EligibilityController)
  );

  /**
   * Update eligibility request
   * PATCH /api/eligibility/request/:requestId
   * Permission: eligibility:manage
   */
  fastify.patch(
    '/request/:requestId',
    {
      preHandler: checkPermission('eligibility:manage'),
      schema: {
        description: 'Update eligibility request status or metadata',
        tags: ['Eligibility'],
        params: {
          type: 'object',
          required: ['requestId'],
          properties: {
            requestId: { type: 'string', description: 'Unique request tracking ID' }
          }
        },
        body: {
          type: 'object',
          properties: {
            status: {
              type: 'string',
              enum: ['PENDING', 'SENT', 'RECEIVED', 'ERROR', 'TIMEOUT', 'CANCELLED'],
              description: 'New status'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata to merge with existing'
            },
            errorMessage: {
              type: 'string',
              description: 'Error message (used when status is ERROR or TIMEOUT)'
            }
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
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    },
    EligibilityController.updateRequest.bind(EligibilityController)
  );

  /**
   * 10. Query coverage information with flexible filters
   * GET /api/eligibility/coverage/query
   * Permission: eligibility:view
   *
   * Allows querying coverage by various criteria:
   * - Patient ID
   * - Member ID (insurance member number)
   * - Date of service
   * - Active status
   * - Authorization requirements
   */
  fastify.get(
    '/coverage/query',
    {
      preHandler: checkPermission('eligibility:view'),
      schema: {
        description: 'Query coverage information with flexible filters. Returns coverage details for verified patients.',
        tags: ['Eligibility', 'Coverage'],
        querystring: {
          type: 'object',
          properties: {
            patientId: {
              type: 'number',
              description: 'Filter by patient ID'
            },
            memberId: {
              type: 'string',
              description: 'Filter by insurance member ID/number'
            },
            payerId: {
              type: 'number',
              description: 'Filter by payer/insurance company ID'
            },
            isActive: {
              type: 'boolean',
              description: 'Filter by active coverage status'
            },
            serviceDate: {
              type: 'string',
              format: 'date',
              description: 'Check coverage for specific service date (YYYY-MM-DD)'
            },
            authorizationRequired: {
              type: 'boolean',
              description: 'Filter by authorization requirement'
            },
            hospiceCovered: {
              type: 'boolean',
              description: 'Filter by hospice coverage'
            },
            needsReverification: {
              type: 'boolean',
              description: 'Filter by reverification status'
            },
            includeExpired: {
              type: 'boolean',
              default: false,
              description: 'Include expired coverage records'
            },
            page: {
              type: 'number',
              default: 1,
              minimum: 1,
              description: 'Page number for pagination'
            },
            limit: {
              type: 'number',
              default: 20,
              minimum: 1,
              maximum: 100,
              description: 'Items per page (max 100)'
            }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              data: {
                type: 'array',
                items: {
                  type: 'object',
                  properties: {
                    id: { type: 'number' },
                    patientId: { type: 'number' },
                    payerId: { type: 'number' },
                    isActive: { type: 'boolean' },
                    eligibilityVerified: { type: 'boolean' },
                    lastVerifiedDate: { type: 'string' },
                    effectiveDate: { type: 'string' },
                    terminationDate: { type: 'string' },
                    planName: { type: 'string' },
                    memberId: { type: 'string' },
                    copayAmount: { type: 'number' },
                    deductibleAmount: { type: 'number' },
                    deductibleRemaining: { type: 'number' },
                    outOfPocketMax: { type: 'number' },
                    outOfPocketRemaining: { type: 'number' },
                    authorizationRequired: { type: 'boolean' },
                    hospiceCovered: { type: 'boolean' },
                    limitations: { type: 'string' },
                    cacheExpiresAt: { type: 'string' },
                    needsReverification: { type: 'boolean' },
                    cacheStatus: {
                      type: 'object',
                      properties: {
                        expired: { type: 'boolean' },
                        daysUntilExpiration: { type: 'number' }
                      }
                    }
                  }
                }
              },
              pagination: {
                type: 'object',
                properties: {
                  page: { type: 'number' },
                  limit: { type: 'number' },
                  total: { type: 'number' },
                  totalPages: { type: 'number' }
                }
              }
            }
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    },
    EligibilityController.queryCoverage.bind(EligibilityController)
  );

  /**
   * 11. Get coverage summary for a patient with benefit details
   * GET /api/eligibility/coverage/:patientId/summary
   * Permission: eligibility:view
   *
   * Returns comprehensive coverage summary including:
   * - Current coverage status
   * - All benefit details
   * - Recent verification history
   * - Authorization information
   */
  fastify.get(
    '/coverage/:patientId/summary',
    {
      preHandler: checkPermission('eligibility:view'),
      schema: {
        description: 'Get comprehensive coverage summary with benefits for a patient',
        tags: ['Eligibility', 'Coverage'],
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
              data: {
                type: 'object',
                properties: {
                  coverage: { type: 'object' },
                  benefits: { type: 'array' },
                  recentVerifications: { type: 'array' },
                  recommendations: { type: 'array' }
                }
              }
            }
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    },
    EligibilityController.getCoverageSummary.bind(EligibilityController)
  );

  /**
   * 12. Retry failed eligibility verification
   * POST /api/eligibility/retry/:requestId
   * Permission: eligibility:verify
   *
   * Retries a failed or timed out eligibility verification request
   */
  fastify.post(
    '/retry/:requestId',
    {
      preHandler: checkPermission('eligibility:verify'),
      schema: {
        description: 'Retry a failed or timed out eligibility verification request',
        tags: ['Eligibility'],
        params: {
          type: 'object',
          required: ['requestId'],
          properties: {
            requestId: { type: 'string', description: 'Original request ID to retry' }
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
                  originalRequestId: { type: 'string' },
                  newRequestId: { type: 'string' },
                  status: { type: 'string' },
                  retryCount: { type: 'number' }
                }
              }
            }
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    },
    EligibilityController.retryVerification.bind(EligibilityController)
  );

  /**
   * 13. Cancel pending eligibility request
   * POST /api/eligibility/cancel/:requestId
   * Permission: eligibility:manage
   *
   * Cancels a pending eligibility verification request
   */
  fastify.post(
    '/cancel/:requestId',
    {
      preHandler: checkPermission('eligibility:manage'),
      schema: {
        description: 'Cancel a pending eligibility verification request',
        tags: ['Eligibility'],
        params: {
          type: 'object',
          required: ['requestId'],
          properties: {
            requestId: { type: 'string', description: 'Request ID to cancel' }
          }
        },
        body: {
          type: 'object',
          properties: {
            reason: { type: 'string', description: 'Reason for cancellation' }
          }
        },
        response: {
          200: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              message: { type: 'string' }
            }
          },
          400: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          },
          404: {
            type: 'object',
            properties: {
              success: { type: 'boolean' },
              error: { type: 'string' }
            }
          }
        }
      }
    },
    EligibilityController.cancelRequest.bind(EligibilityController)
  );
}
