import { db } from "../config/db.drizzle.js";
import {
  report_configurations,
  generated_reports,
  report_access_logs
} from "../db/schemas/index.js";
import { eq, and, or, isNull, desc, asc, gte, lte, sql, count, ilike } from "drizzle-orm";
import ReportExecutionService from "../services/ReportExecutionService.js";
import ReportDeliveryService from "../services/ReportDeliveryService.js";
import fs from "fs/promises";

/**
 * Reports REST Controller
 * Provides a unified REST API for report generation, retrieval, and management
 *
 * Endpoints:
 * - POST /api/reports - Generate a new report
 * - GET /api/reports - List all reports with pagination and filtering
 * - GET /api/reports/:id - Retrieve a specific report by ID
 * - DELETE /api/reports/:id - Delete a specific report
 *
 * HIPAA Compliance:
 * - All access is logged via report_access_logs
 * - Audit fields track who created/modified records
 * - Soft delete support for data retention
 */
class ReportsRESTController {
  /**
   * Generate a new report
   * POST /api/reports
   *
   * Request body:
   * {
   *   report_type: string (required) - Type of report to generate
   *   date_range?: { from: string, to: string } - Date range for report data
   *   filters?: object - Additional filters for the report
   *   output_format?: 'JSON' | 'CSV' | 'PDF' | 'EXCEL' - Output format (default: JSON)
   *   async?: boolean - If true, returns job ID immediately (for large reports)
   * }
   */
  async generateReport(request, reply) {
    try {
      const userId = request.user?.id;
      const {
        report_type,
        configuration_id,
        date_range,
        filters,
        output_format = 'JSON',
        async: isAsync = false,
        deliver = false
      } = request.body;

      // Validate required fields
      if (!report_type && !configuration_id) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Either report_type or configuration_id is required"
          }
        };
      }

      // Validate output format
      const validFormats = ['JSON', 'CSV', 'PDF', 'EXCEL', 'HTML'];
      if (!validFormats.includes(output_format.toUpperCase())) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: `Invalid output_format. Must be one of: ${validFormats.join(', ')}`
          }
        };
      }

      // Build parameters from request
      const parameters = {
        report_type,
        date_range,
        filters,
        timezone: request.headers['x-timezone'] || 'America/New_York'
      };

      // If we have a configuration_id, use it directly
      let configId = configuration_id;

      // If only report_type is provided, find or create a matching configuration
      if (!configId && report_type) {
        const [existingConfig] = await db
          .select()
          .from(report_configurations)
          .where(and(
            eq(report_configurations.report_type, report_type),
            eq(report_configurations.is_active, true),
            isNull(report_configurations.deleted_at)
          ))
          .limit(1);

        if (existingConfig) {
          configId = existingConfig.id;
        } else {
          // Create a temporary ad-hoc configuration for this report
          const [newConfig] = await db
            .insert(report_configurations)
            .values({
              name: `Ad-hoc ${report_type} Report`,
              description: `Auto-generated configuration for ${report_type}`,
              report_type: report_type,
              category: 'CUSTOM',
              default_output_format: output_format.toUpperCase(),
              default_parameters: parameters,
              owner_id: userId,
              is_public: false,
              is_system: false,
              created_by_id: userId,
              updated_by_id: userId
            })
            .returning();

          configId = newConfig.id;
        }
      }

      // Create generated report record
      const [reportRecord] = await db
        .insert(generated_reports)
        .values({
          configuration_id: configId,
          execution_type: 'MANUAL',
          triggered_by_id: userId,
          started_at: new Date(),
          status: isAsync ? 'PENDING' : 'RUNNING',
          parameters_used: parameters,
          output_format: output_format.toUpperCase(),
          request_ip: request.ip,
          request_user_agent: request.headers['user-agent'],
          created_by_id: userId
        })
        .returning();

      if (isAsync) {
        // Execute asynchronously - return job ID immediately
        setImmediate(async () => {
          try {
            const result = await ReportExecutionService.executeReport(configId, {
              parameters,
              outputFormat: output_format.toUpperCase(),
              triggeredById: userId,
              executionType: 'MANUAL',
              requestIp: request.ip,
              requestUserAgent: request.headers['user-agent']
            });

            if (deliver && result && !result.skipped) {
              await ReportDeliveryService.deliverReport(result.id);
            }
          } catch (error) {
            request.log.error('Async report execution failed:', error);
          }
        });

        reply.code(202);
        return {
          success: true,
          status: 202,
          message: "Report generation queued",
          data: {
            id: reportRecord.id,
            status: 'PENDING',
            poll_url: `/api/reports/${reportRecord.id}`
          }
        };
      }

      // Execute synchronously
      try {
        const result = await ReportExecutionService.executeReport(configId, {
          parameters,
          outputFormat: output_format.toUpperCase(),
          triggeredById: userId,
          executionType: 'MANUAL',
          requestIp: request.ip,
          requestUserAgent: request.headers['user-agent']
        });

        if (deliver && result && !result.skipped) {
          await ReportDeliveryService.deliverReport(result.id);
        }

        reply.code(201);
        return {
          success: true,
          status: 201,
          message: "Report generated successfully",
          data: result
        };
      } catch (executionError) {
        // Update the report record with failure
        await db
          .update(generated_reports)
          .set({
            status: 'FAILED',
            completed_at: new Date(),
            error_message: executionError.message,
            error_code: 'EXECUTION_FAILED'
          })
          .where(eq(generated_reports.id, reportRecord.id));

        reply.code(500);
        return {
          success: false,
          status: 500,
          error: {
            code: "EXECUTION_FAILED",
            message: executionError.message
          },
          data: {
            id: reportRecord.id,
            status: 'FAILED'
          }
        };
      }
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to generate report"
        }
      };
    }
  }

  /**
   * List all reports with pagination and filtering
   * GET /api/reports
   *
   * Query parameters:
   * - page: number (default: 1)
   * - limit: number (default: 20, max: 100)
   * - status: string - Filter by status (PENDING, RUNNING, SUCCESS, FAILED, CANCELLED)
   * - report_type: string - Filter by report type
   * - from_date: string - Filter reports created after this date
   * - to_date: string - Filter reports created before this date
   * - sort_by: string - Sort field (default: started_at)
   * - sort_order: 'asc' | 'desc' (default: desc)
   * - format: string - Filter by output format
   */
  async listReports(request, reply) {
    try {
      const {
        page = 1,
        limit = 20,
        status,
        report_type,
        from_date,
        to_date,
        sort_by = 'started_at',
        sort_order = 'desc',
        format,
        search
      } = request.query;

      // Validate and constrain pagination
      const pageNum = Math.max(1, parseInt(page) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit) || 20));
      const offset = (pageNum - 1) * limitNum;

      // Build conditions
      let conditions = [isNull(generated_reports.deleted_at)];

      if (status) {
        conditions.push(eq(generated_reports.status, status.toUpperCase()));
      }

      if (format) {
        conditions.push(eq(generated_reports.output_format, format.toUpperCase()));
      }

      if (from_date) {
        conditions.push(gte(generated_reports.started_at, new Date(from_date)));
      }

      if (to_date) {
        conditions.push(lte(generated_reports.started_at, new Date(to_date)));
      }

      // Sort configuration
      const orderColumn = generated_reports[sort_by] || generated_reports.started_at;
      const orderDirection = sort_order === 'asc' ? asc : desc;

      // Execute queries in parallel
      const [reports, totalCount] = await Promise.all([
        db
          .select({
            id: generated_reports.id,
            configuration_id: generated_reports.configuration_id,
            execution_type: generated_reports.execution_type,
            started_at: generated_reports.started_at,
            completed_at: generated_reports.completed_at,
            execution_duration_ms: generated_reports.execution_duration_ms,
            status: generated_reports.status,
            output_format: generated_reports.output_format,
            output_filename: generated_reports.output_filename,
            file_size_bytes: generated_reports.file_size_bytes,
            row_count: generated_reports.row_count,
            page_count: generated_reports.page_count,
            error_message: generated_reports.error_message,
            created_at: generated_reports.created_at
          })
          .from(generated_reports)
          .where(and(...conditions))
          .orderBy(orderDirection(orderColumn))
          .limit(limitNum)
          .offset(offset),
        db
          .select({ count: count() })
          .from(generated_reports)
          .where(and(...conditions))
      ]);

      const totalPages = Math.ceil(totalCount[0].count / limitNum);

      return {
        success: true,
        status: 200,
        data: {
          reports,
          pagination: {
            page: pageNum,
            limit: limitNum,
            total: totalCount[0].count,
            total_pages: totalPages,
            has_next: pageNum < totalPages,
            has_prev: pageNum > 1
          }
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve reports"
        }
      };
    }
  }

  /**
   * Retrieve a specific report by ID
   * GET /api/reports/:id
   *
   * Query parameters:
   * - include_data: boolean - If true and report is JSON, include the report data in response
   */
  async getReport(request, reply) {
    try {
      const { id } = request.params;
      const { include_data, download } = request.query;
      const userId = request.user?.id;

      // Validate ID
      const reportId = parseInt(id);
      if (isNaN(reportId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid report ID format"
          }
        };
      }

      // Fetch the report
      const [report] = await db
        .select()
        .from(generated_reports)
        .where(and(
          eq(generated_reports.id, reportId),
          isNull(generated_reports.deleted_at)
        ));

      if (!report) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: "NOT_FOUND",
            message: "Report not found"
          }
        };
      }

      // Log access for HIPAA compliance
      await db.insert(report_access_logs).values({
        generated_report_id: reportId,
        user_id: userId,
        access_type: download === 'true' ? 'DOWNLOAD' : 'VIEW',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true
      });

      // Handle download request
      if (download === 'true') {
        if (report.status !== 'SUCCESS') {
          reply.code(400);
          return {
            success: false,
            status: 400,
            error: {
              code: "NOT_READY",
              message: `Report not ready for download. Status: ${report.status}`
            }
          };
        }

        if (!report.storage_path) {
          reply.code(404);
          return {
            success: false,
            status: 404,
            error: {
              code: "FILE_NOT_FOUND",
              message: "Report file not found"
            }
          };
        }

        try {
          const fileContent = await fs.readFile(report.storage_path);

          reply.header('Content-Type', report.mime_type || 'application/octet-stream');
          reply.header('Content-Disposition', `attachment; filename="${report.output_filename}"`);
          reply.header('Content-Length', report.file_size_bytes);
          if (report.file_checksum) {
            reply.header('X-Checksum-SHA256', report.file_checksum);
          }

          return reply.send(fileContent);
        } catch (fileError) {
          reply.code(404);
          return {
            success: false,
            status: 404,
            error: {
              code: "FILE_NOT_ACCESSIBLE",
              message: "Report file not accessible"
            }
          };
        }
      }

      // Build response data
      const responseData = {
        id: report.id,
        configuration_id: report.configuration_id,
        execution_type: report.execution_type,
        triggered_by_id: report.triggered_by_id,
        started_at: report.started_at,
        completed_at: report.completed_at,
        execution_duration_ms: report.execution_duration_ms,
        status: report.status,
        parameters_used: report.parameters_used,
        output_format: report.output_format,
        output_filename: report.output_filename,
        file_size_bytes: report.file_size_bytes,
        row_count: report.row_count,
        page_count: report.page_count,
        error_message: report.error_message,
        error_code: report.error_code,
        delivery_status: report.delivery_status,
        delivered_at: report.delivered_at,
        created_at: report.created_at
      };

      // Include download URL if report is ready
      if (report.status === 'SUCCESS' && report.storage_path) {
        responseData.download_url = `/api/reports/${reportId}?download=true`;
      }

      return {
        success: true,
        status: 200,
        data: responseData
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve report"
        }
      };
    }
  }

  /**
   * Delete a specific report
   * DELETE /api/reports/:id
   *
   * Performs soft delete for HIPAA compliance and data retention
   */
  async deleteReport(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      // Validate ID
      const reportId = parseInt(id);
      if (isNaN(reportId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid report ID format"
          }
        };
      }

      // Check if report exists
      const [existing] = await db
        .select()
        .from(generated_reports)
        .where(and(
          eq(generated_reports.id, reportId),
          isNull(generated_reports.deleted_at)
        ));

      if (!existing) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: "NOT_FOUND",
            message: "Report not found"
          }
        };
      }

      // Soft delete the report
      await db
        .update(generated_reports)
        .set({
          deleted_at: new Date()
        })
        .where(eq(generated_reports.id, reportId));

      // Log the deletion for HIPAA compliance
      await db.insert(report_access_logs).values({
        generated_report_id: reportId,
        user_id: userId,
        access_type: 'DELETE',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true
      });

      return {
        success: true,
        status: 200,
        message: "Report deleted successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to delete report"
        }
      };
    }
  }

  /**
   * Get available report types
   * GET /api/reports/types
   *
   * Returns a list of available report types that can be generated
   */
  async getReportTypes(request, reply) {
    try {
      // Get distinct report types from configurations
      const reportTypes = await db
        .selectDistinct({
          report_type: report_configurations.report_type,
          category: report_configurations.category,
          name: report_configurations.name,
          description: report_configurations.description,
          available_formats: report_configurations.available_formats,
          parameter_schema: report_configurations.parameter_schema
        })
        .from(report_configurations)
        .where(and(
          eq(report_configurations.is_active, true),
          isNull(report_configurations.deleted_at)
        ))
        .orderBy(report_configurations.category, report_configurations.name);

      // Group by category
      const groupedTypes = reportTypes.reduce((acc, type) => {
        const category = type.category || 'CUSTOM';
        if (!acc[category]) {
          acc[category] = [];
        }
        acc[category].push(type);
        return acc;
      }, {});

      return {
        success: true,
        status: 200,
        data: {
          report_types: reportTypes,
          by_category: groupedTypes,
          total: reportTypes.length
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retrieve report types"
        }
      };
    }
  }

  /**
   * Retry a failed report
   * POST /api/reports/:id/retry
   */
  async retryReport(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      const reportId = parseInt(id);
      if (isNaN(reportId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid report ID format"
          }
        };
      }

      // Get the failed report
      const [report] = await db
        .select()
        .from(generated_reports)
        .where(and(
          eq(generated_reports.id, reportId),
          isNull(generated_reports.deleted_at)
        ));

      if (!report) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: "NOT_FOUND",
            message: "Report not found"
          }
        };
      }

      if (report.status !== 'FAILED') {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: "INVALID_STATUS",
            message: `Can only retry failed reports. Current status: ${report.status}`
          }
        };
      }

      // Retry the report
      const result = await ReportExecutionService.retryFailedReport(reportId);

      return {
        success: true,
        status: 200,
        message: "Report retry initiated",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to retry report"
        }
      };
    }
  }

  /**
   * Cancel a pending/running report
   * POST /api/reports/:id/cancel
   */
  async cancelReport(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      const reportId = parseInt(id);
      if (isNaN(reportId)) {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: "VALIDATION_ERROR",
            message: "Invalid report ID format"
          }
        };
      }

      // Get the report
      const [report] = await db
        .select()
        .from(generated_reports)
        .where(and(
          eq(generated_reports.id, reportId),
          isNull(generated_reports.deleted_at)
        ));

      if (!report) {
        reply.code(404);
        return {
          success: false,
          status: 404,
          error: {
            code: "NOT_FOUND",
            message: "Report not found"
          }
        };
      }

      if (report.status !== 'PENDING' && report.status !== 'RUNNING') {
        reply.code(400);
        return {
          success: false,
          status: 400,
          error: {
            code: "INVALID_STATUS",
            message: `Cannot cancel report with status: ${report.status}`
          }
        };
      }

      // Update status to cancelled
      const [updated] = await db
        .update(generated_reports)
        .set({
          status: 'CANCELLED',
          completed_at: new Date(),
          error_message: 'Cancelled by user'
        })
        .where(eq(generated_reports.id, reportId))
        .returning();

      return {
        success: true,
        status: 200,
        message: "Report cancelled",
        data: updated
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        success: false,
        status: 500,
        error: {
          code: "INTERNAL_ERROR",
          message: "Failed to cancel report"
        }
      };
    }
  }
}

export default new ReportsRESTController();
