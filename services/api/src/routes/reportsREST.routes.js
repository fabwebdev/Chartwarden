import ReportsRESTController from "../controllers/ReportsREST.controller.js";
import { PERMISSIONS } from "../config/rbac.js";
import { requireAnyPermission } from "../middleware/rbac.middleware.js";

/**
 * Reports REST API Routes
 * Unified REST API for report generation, retrieval, and management
 *
 * Endpoints:
 * - POST /reports - Generate a new report
 * - GET /reports - List all reports with pagination and filtering
 * - GET /reports/types - Get available report types
 * - GET /reports/:id - Retrieve a specific report by ID
 * - DELETE /reports/:id - Delete a specific report (soft delete)
 * - POST /reports/:id/retry - Retry a failed report
 * - POST /reports/:id/cancel - Cancel a pending/running report
 *
 * Features:
 * - Rate limiting to prevent abuse (via global rate limiter)
 * - RBAC permission checks
 * - HIPAA-compliant access logging
 * - Support for async report generation
 * - Multiple output formats (JSON, CSV, PDF, EXCEL)
 */
export default async function reportsRESTRoutes(fastify, options) {
  // Rate limiting is applied globally via buildGlobalRateLimitConfig in server.js
  // Additional route-specific limits can be added via config object if needed

  // ==================== CORE REST ENDPOINTS ====================

  /**
   * POST /reports
   * Generate a new report
   *
   * Request body:
   * {
   *   report_type: string (required) - Type of report to generate
   *   configuration_id?: number - Use existing configuration
   *   date_range?: { from: string, to: string } - Date range for report data
   *   filters?: object - Additional filters for the report
   *   output_format?: 'JSON' | 'CSV' | 'PDF' | 'EXCEL' - Output format (default: JSON)
   *   async?: boolean - If true, returns job ID immediately (for large reports)
   *   deliver?: boolean - If true, deliver report via configured channels
   * }
   *
   * Response:
   * - 201: Report generated successfully (sync)
   * - 202: Report generation queued (async)
   * - 400: Validation error
   * - 500: Execution failed
   */
  fastify.post("/reports", {
    preHandler: [
      requireAnyPermission(
        PERMISSIONS.GENERATE_REPORTS,
        PERMISSIONS.VIEW_REPORTS
      )
    ],
    schema: {
      description: 'Generate a new report',
      tags: ['Reports'],
      body: {
        type: 'object',
        properties: {
          report_type: { type: 'string', description: 'Type of report to generate' },
          configuration_id: { type: 'integer', description: 'Use existing configuration' },
          date_range: {
            type: 'object',
            properties: {
              from: { type: 'string', format: 'date-time' },
              to: { type: 'string', format: 'date-time' }
            }
          },
          filters: { type: 'object', additionalProperties: true },
          output_format: {
            type: 'string',
            enum: ['JSON', 'CSV', 'PDF', 'EXCEL', 'HTML'],
            default: 'JSON'
          },
          async: { type: 'boolean', default: false },
          deliver: { type: 'boolean', default: false }
        }
      },
      response: {
        201: {
          description: 'Report generated successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'integer' },
            message: { type: 'string' },
            data: { type: 'object' }
          }
        },
        202: {
          description: 'Report generation queued',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'integer' },
            message: { type: 'string' },
            data: {
              type: 'object',
              properties: {
                id: { type: 'integer' },
                status: { type: 'string' },
                poll_url: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, ReportsRESTController.generateReport.bind(ReportsRESTController));

  /**
   * GET /reports
   * List all reports with pagination and filtering
   *
   * Query parameters:
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - status: string - Filter by status
   * - report_type: string - Filter by report type
   * - from_date: string - Filter reports created after this date
   * - to_date: string - Filter reports created before this date
   * - sort_by: string - Sort field (default: started_at)
   * - sort_order: 'asc' | 'desc' (default: desc)
   * - format: string - Filter by output format
   */
  fastify.get("/reports", {
    preHandler: [
      requireAnyPermission(
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.GENERATE_REPORTS
      )
    ],
    schema: {
      description: 'List all reports with pagination and filtering',
      tags: ['Reports'],
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', default: 1, minimum: 1 },
          limit: { type: 'integer', default: 20, minimum: 1, maximum: 100 },
          status: {
            type: 'string',
            enum: ['PENDING', 'RUNNING', 'SUCCESS', 'FAILED', 'CANCELLED']
          },
          report_type: { type: 'string' },
          from_date: { type: 'string', format: 'date-time' },
          to_date: { type: 'string', format: 'date-time' },
          sort_by: { type: 'string', default: 'started_at' },
          sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          format: { type: 'string', enum: ['JSON', 'CSV', 'PDF', 'EXCEL', 'HTML'] }
        }
      },
      response: {
        200: {
          description: 'List of reports with pagination',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'integer' },
            data: {
              type: 'object',
              properties: {
                reports: { type: 'array' },
                pagination: {
                  type: 'object',
                  properties: {
                    page: { type: 'integer' },
                    limit: { type: 'integer' },
                    total: { type: 'integer' },
                    total_pages: { type: 'integer' },
                    has_next: { type: 'boolean' },
                    has_prev: { type: 'boolean' }
                  }
                }
              }
            }
          }
        }
      }
    }
  }, ReportsRESTController.listReports.bind(ReportsRESTController));

  /**
   * GET /reports/types
   * Get available report types that can be generated
   */
  fastify.get("/reports/types", {
    preHandler: [
      requireAnyPermission(
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.GENERATE_REPORTS
      )
    ],
    schema: {
      description: 'Get available report types',
      tags: ['Reports'],
      response: {
        200: {
          description: 'List of available report types',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'integer' },
            data: {
              type: 'object',
              properties: {
                report_types: { type: 'array' },
                by_category: { type: 'object' },
                total: { type: 'integer' }
              }
            }
          }
        }
      }
    }
  }, ReportsRESTController.getReportTypes.bind(ReportsRESTController));

  /**
   * GET /reports/:id
   * Retrieve a specific report by ID
   *
   * Query parameters:
   * - download: boolean - If true, download the report file
   * - include_data: boolean - If true and report is JSON, include data in response
   */
  fastify.get("/reports/:id", {
    preHandler: [
      requireAnyPermission(
        PERMISSIONS.VIEW_REPORTS,
        PERMISSIONS.GENERATE_REPORTS
      )
    ],
    schema: {
      description: 'Retrieve a specific report by ID',
      tags: ['Reports'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Report ID' }
        },
        required: ['id']
      },
      querystring: {
        type: 'object',
        properties: {
          download: { type: 'string', enum: ['true', 'false'] },
          include_data: { type: 'string', enum: ['true', 'false'] }
        }
      },
      response: {
        200: {
          description: 'Report details',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'integer' },
            data: { type: 'object' }
          }
        },
        404: {
          description: 'Report not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'integer' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, ReportsRESTController.getReport.bind(ReportsRESTController));

  /**
   * DELETE /reports/:id
   * Delete a specific report (soft delete for HIPAA compliance)
   */
  fastify.delete("/reports/:id", {
    preHandler: [
      requireAnyPermission(
        PERMISSIONS.DELETE_REPORTS,
        PERMISSIONS.GENERATE_REPORTS
      )
    ],
    schema: {
      description: 'Delete a specific report',
      tags: ['Reports'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Report ID' }
        },
        required: ['id']
      },
      response: {
        200: {
          description: 'Report deleted successfully',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'integer' },
            message: { type: 'string' }
          }
        },
        404: {
          description: 'Report not found',
          type: 'object',
          properties: {
            success: { type: 'boolean' },
            status: { type: 'integer' },
            error: {
              type: 'object',
              properties: {
                code: { type: 'string' },
                message: { type: 'string' }
              }
            }
          }
        }
      }
    }
  }, ReportsRESTController.deleteReport.bind(ReportsRESTController));

  // ==================== ADDITIONAL OPERATIONS ====================

  /**
   * POST /reports/:id/retry
   * Retry a failed report
   */
  fastify.post("/reports/:id/retry", {
    preHandler: [
      requireAnyPermission(
        PERMISSIONS.GENERATE_REPORTS
      )
    ],
    schema: {
      description: 'Retry a failed report',
      tags: ['Reports'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Report ID' }
        },
        required: ['id']
      }
    }
  }, ReportsRESTController.retryReport.bind(ReportsRESTController));

  /**
   * POST /reports/:id/cancel
   * Cancel a pending or running report
   */
  fastify.post("/reports/:id/cancel", {
    preHandler: [
      requireAnyPermission(
        PERMISSIONS.GENERATE_REPORTS,
        PERMISSIONS.DELETE_REPORTS
      )
    ],
    schema: {
      description: 'Cancel a pending or running report',
      tags: ['Reports'],
      params: {
        type: 'object',
        properties: {
          id: { type: 'string', description: 'Report ID' }
        },
        required: ['id']
      }
    }
  }, ReportsRESTController.cancelReport.bind(ReportsRESTController));
}
