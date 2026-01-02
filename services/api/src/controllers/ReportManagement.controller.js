import { db } from "../config/db.drizzle.js";
import {
  report_configurations,
  report_configuration_versions,
  report_schedules,
  generated_reports,
  report_recipients,
  report_favorites,
  report_access_logs
} from "../db/schemas/index.js";
import { eq, and, or, isNull, desc, asc, gte, lte, sql, count, ilike, inArray } from "drizzle-orm";
import ReportExecutionService from "../services/ReportExecutionService.js";
import ReportDeliveryService from "../services/ReportDeliveryService.js";
import fs from "fs/promises";
import path from "path";

/**
 * Report Management Controller
 * Handles CRUD operations for report configurations, schedules, and generated reports
 *
 * HIPAA Compliance:
 * - All access is logged via report_access_logs
 * - Audit fields track who created/modified records
 * - Soft delete support for data retention
 */
class ReportManagementController {
  // ==================== REPORT CONFIGURATIONS ====================

  /**
   * List all report configurations
   * GET /report-management/configurations
   */
  async listConfigurations(request, reply) {
    try {
      const {
        page = 1,
        limit = 20,
        category,
        search,
        owner_id,
        is_public,
        is_active = true,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = request.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const userId = request.user?.id;

      let conditions = [isNull(report_configurations.deleted_at)];

      if (is_active !== undefined) {
        conditions.push(eq(report_configurations.is_active, is_active === 'true' || is_active === true));
      }

      if (category) {
        conditions.push(eq(report_configurations.category, category));
      }

      if (search) {
        conditions.push(
          or(
            ilike(report_configurations.name, `%${search}%`),
            ilike(report_configurations.description, `%${search}%`)
          )
        );
      }

      if (owner_id) {
        conditions.push(eq(report_configurations.owner_id, owner_id));
      }

      // Filter by visibility - user can see: their own, public, or if they have admin role
      if (is_public === 'true') {
        conditions.push(eq(report_configurations.is_public, true));
      } else if (userId && !request.user?.role?.includes('ADMIN')) {
        conditions.push(
          or(
            eq(report_configurations.owner_id, userId),
            eq(report_configurations.is_public, true)
          )
        );
      }

      const orderColumn = report_configurations[sort_by] || report_configurations.created_at;
      const orderDirection = sort_order === 'asc' ? asc : desc;

      const [configurations, totalCount] = await Promise.all([
        db
          .select()
          .from(report_configurations)
          .where(and(...conditions))
          .orderBy(orderDirection(orderColumn))
          .limit(parseInt(limit))
          .offset(offset),
        db
          .select({ count: count() })
          .from(report_configurations)
          .where(and(...conditions))
      ]);

      return {
        status: 200,
        message: "Report configurations retrieved successfully",
        data: {
          configurations,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount[0].count,
            total_pages: Math.ceil(totalCount[0].count / parseInt(limit))
          }
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve report configurations",
        error: error.message
      };
    }
  }

  /**
   * Get a single report configuration
   * GET /report-management/configurations/:id
   */
  async getConfiguration(request, reply) {
    try {
      const { id } = request.params;

      const [configuration] = await db
        .select()
        .from(report_configurations)
        .where(and(
          eq(report_configurations.id, parseInt(id)),
          isNull(report_configurations.deleted_at)
        ));

      if (!configuration) {
        reply.code(404);
        return {
          status: 404,
          message: "Report configuration not found"
        };
      }

      return {
        status: 200,
        message: "Report configuration retrieved successfully",
        data: configuration
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve report configuration",
        error: error.message
      };
    }
  }

  /**
   * Create a new report configuration
   * POST /report-management/configurations
   */
  async createConfiguration(request, reply) {
    try {
      const userId = request.user?.id;
      const data = request.body;

      const [newConfig] = await db
        .insert(report_configurations)
        .values({
          ...data,
          owner_id: data.owner_id || userId,
          created_by_id: userId,
          updated_by_id: userId,
          version: 1
        })
        .returning();

      // Create initial version record
      await db.insert(report_configuration_versions).values({
        configuration_id: newConfig.id,
        version: 1,
        version_label: "Initial version",
        change_description: "Initial creation",
        config_snapshot: newConfig,
        is_current: true,
        created_by_id: userId
      });

      reply.code(201);
      return {
        status: 201,
        message: "Report configuration created successfully",
        data: newConfig
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create report configuration",
        error: error.message
      };
    }
  }

  /**
   * Update a report configuration
   * PUT /report-management/configurations/:id
   */
  async updateConfiguration(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;
      const data = request.body;

      // Get current configuration
      const [existing] = await db
        .select()
        .from(report_configurations)
        .where(and(
          eq(report_configurations.id, parseInt(id)),
          isNull(report_configurations.deleted_at)
        ));

      if (!existing) {
        reply.code(404);
        return {
          status: 404,
          message: "Report configuration not found"
        };
      }

      const newVersion = existing.version + 1;

      // Update configuration
      const [updated] = await db
        .update(report_configurations)
        .set({
          ...data,
          version: newVersion,
          updated_by_id: userId,
          updated_at: new Date()
        })
        .where(eq(report_configurations.id, parseInt(id)))
        .returning();

      // Mark previous version as not current
      await db
        .update(report_configuration_versions)
        .set({ is_current: false })
        .where(eq(report_configuration_versions.configuration_id, parseInt(id)));

      // Create new version record
      await db.insert(report_configuration_versions).values({
        configuration_id: parseInt(id),
        version: newVersion,
        version_label: data.version_label,
        change_description: data.change_description || "Configuration updated",
        config_snapshot: updated,
        is_current: true,
        created_by_id: userId
      });

      return {
        status: 200,
        message: "Report configuration updated successfully",
        data: updated
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update report configuration",
        error: error.message
      };
    }
  }

  /**
   * Delete a report configuration (soft delete)
   * DELETE /report-management/configurations/:id
   */
  async deleteConfiguration(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      const [existing] = await db
        .select()
        .from(report_configurations)
        .where(and(
          eq(report_configurations.id, parseInt(id)),
          isNull(report_configurations.deleted_at)
        ));

      if (!existing) {
        reply.code(404);
        return {
          status: 404,
          message: "Report configuration not found"
        };
      }

      if (existing.is_system) {
        reply.code(403);
        return {
          status: 403,
          message: "System report configurations cannot be deleted"
        };
      }

      await db
        .update(report_configurations)
        .set({
          deleted_at: new Date(),
          updated_by_id: userId,
          updated_at: new Date()
        })
        .where(eq(report_configurations.id, parseInt(id)));

      return {
        status: 200,
        message: "Report configuration deleted successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to delete report configuration",
        error: error.message
      };
    }
  }

  /**
   * Get configuration version history
   * GET /report-management/configurations/:id/versions
   */
  async getConfigurationVersions(request, reply) {
    try {
      const { id } = request.params;

      const versions = await db
        .select()
        .from(report_configuration_versions)
        .where(eq(report_configuration_versions.configuration_id, parseInt(id)))
        .orderBy(desc(report_configuration_versions.version));

      return {
        status: 200,
        message: "Configuration versions retrieved successfully",
        data: versions
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve configuration versions",
        error: error.message
      };
    }
  }

  // ==================== REPORT SCHEDULES ====================

  /**
   * List all schedules
   * GET /report-management/schedules
   */
  async listSchedules(request, reply) {
    try {
      const {
        page = 1,
        limit = 20,
        configuration_id,
        owner_id,
        is_active,
        frequency,
        sort_by = 'created_at',
        sort_order = 'desc'
      } = request.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);
      const userId = request.user?.id;

      let conditions = [isNull(report_schedules.deleted_at)];

      if (configuration_id) {
        conditions.push(eq(report_schedules.configuration_id, parseInt(configuration_id)));
      }

      if (owner_id) {
        conditions.push(eq(report_schedules.owner_id, owner_id));
      } else if (userId && !request.user?.role?.includes('ADMIN')) {
        conditions.push(eq(report_schedules.owner_id, userId));
      }

      if (is_active !== undefined) {
        conditions.push(eq(report_schedules.is_active, is_active === 'true' || is_active === true));
      }

      if (frequency) {
        conditions.push(eq(report_schedules.frequency, frequency));
      }

      const orderColumn = report_schedules[sort_by] || report_schedules.created_at;
      const orderDirection = sort_order === 'asc' ? asc : desc;

      const [schedules, totalCount] = await Promise.all([
        db
          .select()
          .from(report_schedules)
          .where(and(...conditions))
          .orderBy(orderDirection(orderColumn))
          .limit(parseInt(limit))
          .offset(offset),
        db
          .select({ count: count() })
          .from(report_schedules)
          .where(and(...conditions))
      ]);

      return {
        status: 200,
        message: "Report schedules retrieved successfully",
        data: {
          schedules,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount[0].count,
            total_pages: Math.ceil(totalCount[0].count / parseInt(limit))
          }
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve report schedules",
        error: error.message
      };
    }
  }

  /**
   * Get a single schedule
   * GET /report-management/schedules/:id
   */
  async getSchedule(request, reply) {
    try {
      const { id } = request.params;

      const [schedule] = await db
        .select()
        .from(report_schedules)
        .where(and(
          eq(report_schedules.id, parseInt(id)),
          isNull(report_schedules.deleted_at)
        ));

      if (!schedule) {
        reply.code(404);
        return {
          status: 404,
          message: "Report schedule not found"
        };
      }

      // Get recipients
      const recipients = await db
        .select()
        .from(report_recipients)
        .where(eq(report_recipients.schedule_id, parseInt(id)));

      return {
        status: 200,
        message: "Report schedule retrieved successfully",
        data: {
          ...schedule,
          recipient_list: recipients
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve report schedule",
        error: error.message
      };
    }
  }

  /**
   * Create a new schedule
   * POST /report-management/schedules
   */
  async createSchedule(request, reply) {
    try {
      const userId = request.user?.id;
      const { recipient_list, ...data } = request.body;

      // Calculate next execution time
      const nextExecution = this.calculateNextExecution(data);

      const [newSchedule] = await db
        .insert(report_schedules)
        .values({
          ...data,
          owner_id: data.owner_id || userId,
          next_execution_at: nextExecution,
          created_by_id: userId,
          updated_by_id: userId
        })
        .returning();

      // Insert recipients if provided
      if (recipient_list && recipient_list.length > 0) {
        await db.insert(report_recipients).values(
          recipient_list.map(r => ({
            schedule_id: newSchedule.id,
            ...r,
            created_by_id: userId
          }))
        );
      }

      reply.code(201);
      return {
        status: 201,
        message: "Report schedule created successfully",
        data: newSchedule
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create report schedule",
        error: error.message
      };
    }
  }

  /**
   * Update a schedule
   * PUT /report-management/schedules/:id
   */
  async updateSchedule(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;
      const { recipient_list, ...data } = request.body;

      const [existing] = await db
        .select()
        .from(report_schedules)
        .where(and(
          eq(report_schedules.id, parseInt(id)),
          isNull(report_schedules.deleted_at)
        ));

      if (!existing) {
        reply.code(404);
        return {
          status: 404,
          message: "Report schedule not found"
        };
      }

      // Recalculate next execution if schedule parameters changed
      const nextExecution = this.calculateNextExecution({ ...existing, ...data });

      const [updated] = await db
        .update(report_schedules)
        .set({
          ...data,
          next_execution_at: nextExecution,
          updated_by_id: userId,
          updated_at: new Date()
        })
        .where(eq(report_schedules.id, parseInt(id)))
        .returning();

      // Update recipients if provided
      if (recipient_list) {
        // Delete existing recipients
        await db
          .delete(report_recipients)
          .where(eq(report_recipients.schedule_id, parseInt(id)));

        // Insert new recipients
        if (recipient_list.length > 0) {
          await db.insert(report_recipients).values(
            recipient_list.map(r => ({
              schedule_id: parseInt(id),
              ...r,
              created_by_id: userId
            }))
          );
        }
      }

      return {
        status: 200,
        message: "Report schedule updated successfully",
        data: updated
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to update report schedule",
        error: error.message
      };
    }
  }

  /**
   * Delete a schedule (soft delete)
   * DELETE /report-management/schedules/:id
   */
  async deleteSchedule(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      const [existing] = await db
        .select()
        .from(report_schedules)
        .where(and(
          eq(report_schedules.id, parseInt(id)),
          isNull(report_schedules.deleted_at)
        ));

      if (!existing) {
        reply.code(404);
        return {
          status: 404,
          message: "Report schedule not found"
        };
      }

      await db
        .update(report_schedules)
        .set({
          deleted_at: new Date(),
          is_active: false,
          updated_by_id: userId,
          updated_at: new Date()
        })
        .where(eq(report_schedules.id, parseInt(id)));

      return {
        status: 200,
        message: "Report schedule deleted successfully"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to delete report schedule",
        error: error.message
      };
    }
  }

  /**
   * Toggle schedule active status
   * PATCH /report-management/schedules/:id/toggle
   */
  async toggleSchedule(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      const [existing] = await db
        .select()
        .from(report_schedules)
        .where(and(
          eq(report_schedules.id, parseInt(id)),
          isNull(report_schedules.deleted_at)
        ));

      if (!existing) {
        reply.code(404);
        return {
          status: 404,
          message: "Report schedule not found"
        };
      }

      const [updated] = await db
        .update(report_schedules)
        .set({
          is_active: !existing.is_active,
          updated_by_id: userId,
          updated_at: new Date()
        })
        .where(eq(report_schedules.id, parseInt(id)))
        .returning();

      return {
        status: 200,
        message: `Report schedule ${updated.is_active ? 'activated' : 'deactivated'} successfully`,
        data: updated
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to toggle report schedule",
        error: error.message
      };
    }
  }

  // ==================== GENERATED REPORTS ====================

  /**
   * List generated reports
   * GET /report-management/generated
   */
  async listGeneratedReports(request, reply) {
    try {
      const {
        page = 1,
        limit = 20,
        configuration_id,
        schedule_id,
        status,
        execution_type,
        from_date,
        to_date,
        sort_by = 'started_at',
        sort_order = 'desc'
      } = request.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let conditions = [isNull(generated_reports.deleted_at)];

      if (configuration_id) {
        conditions.push(eq(generated_reports.configuration_id, parseInt(configuration_id)));
      }

      if (schedule_id) {
        conditions.push(eq(generated_reports.schedule_id, parseInt(schedule_id)));
      }

      if (status) {
        conditions.push(eq(generated_reports.status, status));
      }

      if (execution_type) {
        conditions.push(eq(generated_reports.execution_type, execution_type));
      }

      if (from_date) {
        conditions.push(gte(generated_reports.started_at, new Date(from_date)));
      }

      if (to_date) {
        conditions.push(lte(generated_reports.started_at, new Date(to_date)));
      }

      const orderColumn = generated_reports[sort_by] || generated_reports.started_at;
      const orderDirection = sort_order === 'asc' ? asc : desc;

      const [reports, totalCount] = await Promise.all([
        db
          .select()
          .from(generated_reports)
          .where(and(...conditions))
          .orderBy(orderDirection(orderColumn))
          .limit(parseInt(limit))
          .offset(offset),
        db
          .select({ count: count() })
          .from(generated_reports)
          .where(and(...conditions))
      ]);

      return {
        status: 200,
        message: "Generated reports retrieved successfully",
        data: {
          reports,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount[0].count,
            total_pages: Math.ceil(totalCount[0].count / parseInt(limit))
          }
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve generated reports",
        error: error.message
      };
    }
  }

  /**
   * Get a single generated report
   * GET /report-management/generated/:id
   */
  async getGeneratedReport(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      const [report] = await db
        .select()
        .from(generated_reports)
        .where(and(
          eq(generated_reports.id, parseInt(id)),
          isNull(generated_reports.deleted_at)
        ));

      if (!report) {
        reply.code(404);
        return {
          status: 404,
          message: "Generated report not found"
        };
      }

      // Log access
      await db.insert(report_access_logs).values({
        generated_report_id: parseInt(id),
        user_id: userId,
        access_type: 'VIEW',
        ip_address: request.ip,
        user_agent: request.headers['user-agent'],
        success: true
      });

      return {
        status: 200,
        message: "Generated report retrieved successfully",
        data: report
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve generated report",
        error: error.message
      };
    }
  }

  /**
   * Execute a report manually
   * POST /report-management/configurations/:id/execute
   */
  async executeReport(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;
      const { parameters, output_format, deliver = false } = request.body;

      // Execute the report using the execution service
      const generatedReport = await ReportExecutionService.executeReport(parseInt(id), {
        parameters,
        outputFormat: output_format,
        triggeredById: userId,
        executionType: 'MANUAL',
        requestIp: request.ip,
        requestUserAgent: request.headers['user-agent']
      });

      // Optionally deliver immediately
      if (deliver && generatedReport && !generatedReport.skipped) {
        await ReportDeliveryService.deliverReport(generatedReport.id);
      }

      reply.code(202);
      return {
        status: 202,
        message: "Report execution completed",
        data: generatedReport
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to execute report",
        error: error.message
      };
    }
  }

  /**
   * Execute a report asynchronously (background job)
   * POST /report-management/configurations/:id/execute-async
   */
  async executeReportAsync(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;
      const { parameters, output_format, deliver = true } = request.body;

      // Get configuration to validate it exists
      const [config] = await db
        .select()
        .from(report_configurations)
        .where(and(
          eq(report_configurations.id, parseInt(id)),
          isNull(report_configurations.deleted_at)
        ));

      if (!config) {
        reply.code(404);
        return {
          status: 404,
          message: "Report configuration not found"
        };
      }

      // Create pending generated report record
      const [pendingReport] = await db
        .insert(generated_reports)
        .values({
          configuration_id: parseInt(id),
          configuration_version: config.version,
          execution_type: 'MANUAL',
          triggered_by_id: userId,
          started_at: new Date(),
          status: 'PENDING',
          parameters_used: parameters || config.default_parameters,
          output_format: output_format || config.default_output_format,
          request_ip: request.ip,
          request_user_agent: request.headers['user-agent'],
          created_by_id: userId
        })
        .returning();

      // Execute in background (non-blocking)
      setImmediate(async () => {
        try {
          const result = await ReportExecutionService.executeReport(parseInt(id), {
            parameters,
            outputFormat: output_format,
            triggeredById: userId,
            executionType: 'MANUAL',
            requestIp: request.ip,
            requestUserAgent: request.headers['user-agent']
          });

          if (deliver && result && !result.skipped) {
            await ReportDeliveryService.deliverReport(result.id);
          }
        } catch (error) {
          request.log.error('Background report execution failed:', error);
        }
      });

      reply.code(202);
      return {
        status: 202,
        message: "Report execution queued",
        data: {
          report_id: pendingReport.id,
          status: 'PENDING',
          poll_url: `/api/report-management/generated/${pendingReport.id}`
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to queue report execution",
        error: error.message
      };
    }
  }

  /**
   * Download a generated report
   * GET /report-management/generated/:id/download
   */
  async downloadReport(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      // Get the generated report
      const [report] = await db
        .select()
        .from(generated_reports)
        .where(and(
          eq(generated_reports.id, parseInt(id)),
          isNull(generated_reports.deleted_at)
        ));

      if (!report) {
        reply.code(404);
        return {
          status: 404,
          message: "Generated report not found"
        };
      }

      if (report.status !== 'SUCCESS') {
        reply.code(400);
        return {
          status: 400,
          message: `Report not ready for download. Status: ${report.status}`
        };
      }

      if (!report.storage_path) {
        reply.code(404);
        return {
          status: 404,
          message: "Report file not found"
        };
      }

      // Log the download access
      await ReportDeliveryService.logAccess(parseInt(id), userId, 'DOWNLOAD', {
        ip: request.ip,
        userAgent: request.headers['user-agent']
      });

      // Read file and stream it
      try {
        const fileContent = await fs.readFile(report.storage_path);

        reply.header('Content-Type', report.mime_type || 'application/octet-stream');
        reply.header('Content-Disposition', `attachment; filename="${report.output_filename}"`);
        reply.header('Content-Length', report.file_size_bytes);
        reply.header('X-Checksum-SHA256', report.file_checksum);

        return reply.send(fileContent);
      } catch (fileError) {
        await ReportDeliveryService.logFailedAccess(
          parseInt(id),
          userId,
          'DOWNLOAD',
          fileError.message,
          { ip: request.ip, userAgent: request.headers['user-agent'] }
        );

        reply.code(404);
        return {
          status: 404,
          message: "Report file not accessible",
          error: fileError.message
        };
      }
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to download report",
        error: error.message
      };
    }
  }

  /**
   * Retry a failed report execution
   * POST /report-management/generated/:id/retry
   */
  async retryReport(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      // Get the failed report
      const [report] = await db
        .select()
        .from(generated_reports)
        .where(and(
          eq(generated_reports.id, parseInt(id)),
          isNull(generated_reports.deleted_at)
        ));

      if (!report) {
        reply.code(404);
        return {
          status: 404,
          message: "Generated report not found"
        };
      }

      if (report.status !== 'FAILED') {
        reply.code(400);
        return {
          status: 400,
          message: `Can only retry failed reports. Current status: ${report.status}`
        };
      }

      // Retry the report
      const result = await ReportExecutionService.retryFailedReport(parseInt(id));

      return {
        status: 200,
        message: "Report retry initiated",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retry report",
        error: error.message
      };
    }
  }

  /**
   * Deliver a generated report to recipients
   * POST /report-management/generated/:id/deliver
   */
  async deliverReport(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      // Get the generated report
      const [report] = await db
        .select()
        .from(generated_reports)
        .where(and(
          eq(generated_reports.id, parseInt(id)),
          isNull(generated_reports.deleted_at)
        ));

      if (!report) {
        reply.code(404);
        return {
          status: 404,
          message: "Generated report not found"
        };
      }

      if (report.status !== 'SUCCESS') {
        reply.code(400);
        return {
          status: 400,
          message: `Cannot deliver report with status: ${report.status}`
        };
      }

      // Deliver the report
      const result = await ReportDeliveryService.deliverReport(
        parseInt(id),
        report.schedule_id
      );

      return {
        status: 200,
        message: "Report delivery initiated",
        data: result
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to deliver report",
        error: error.message
      };
    }
  }

  /**
   * Cancel a running report
   * POST /report-management/generated/:id/cancel
   */
  async cancelReport(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      // Get the report
      const [report] = await db
        .select()
        .from(generated_reports)
        .where(and(
          eq(generated_reports.id, parseInt(id)),
          isNull(generated_reports.deleted_at)
        ));

      if (!report) {
        reply.code(404);
        return {
          status: 404,
          message: "Generated report not found"
        };
      }

      if (report.status !== 'PENDING' && report.status !== 'RUNNING') {
        reply.code(400);
        return {
          status: 400,
          message: `Cannot cancel report with status: ${report.status}`
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
        .where(eq(generated_reports.id, parseInt(id)))
        .returning();

      return {
        status: 200,
        message: "Report cancelled",
        data: updated
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to cancel report",
        error: error.message
      };
    }
  }

  /**
   * Get report execution metrics
   * GET /report-management/metrics
   */
  async getMetrics(request, reply) {
    try {
      const executionMetrics = ReportExecutionService.getMetrics();
      const deliveryMetrics = ReportDeliveryService.getMetrics();

      // Get database statistics
      const [totalConfigs] = await db
        .select({ count: count() })
        .from(report_configurations)
        .where(isNull(report_configurations.deleted_at));

      const [totalSchedules] = await db
        .select({ count: count() })
        .from(report_schedules)
        .where(and(
          eq(report_schedules.is_active, true),
          isNull(report_schedules.deleted_at)
        ));

      const [recentReports] = await db
        .select({ count: count() })
        .from(generated_reports)
        .where(gte(generated_reports.started_at, new Date(Date.now() - 24 * 60 * 60 * 1000)));

      const [failedReports] = await db
        .select({ count: count() })
        .from(generated_reports)
        .where(and(
          eq(generated_reports.status, 'FAILED'),
          gte(generated_reports.started_at, new Date(Date.now() - 24 * 60 * 60 * 1000))
        ));

      return {
        status: 200,
        message: "Metrics retrieved successfully",
        data: {
          execution: executionMetrics,
          delivery: deliveryMetrics,
          database: {
            totalConfigurations: totalConfigs.count,
            activeSchedules: totalSchedules.count,
            reportsLast24h: recentReports.count,
            failedReportsLast24h: failedReports.count
          }
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve metrics",
        error: error.message
      };
    }
  }

  /**
   * Get access logs for a generated report
   * GET /report-management/generated/:id/access-logs
   */
  async getAccessLogs(request, reply) {
    try {
      const { id } = request.params;
      const { page = 1, limit = 50 } = request.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const [logs, totalCount] = await Promise.all([
        db
          .select()
          .from(report_access_logs)
          .where(eq(report_access_logs.generated_report_id, parseInt(id)))
          .orderBy(desc(report_access_logs.created_at))
          .limit(parseInt(limit))
          .offset(offset),
        db
          .select({ count: count() })
          .from(report_access_logs)
          .where(eq(report_access_logs.generated_report_id, parseInt(id)))
      ]);

      return {
        status: 200,
        message: "Access logs retrieved successfully",
        data: {
          logs,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount[0].count,
            total_pages: Math.ceil(totalCount[0].count / parseInt(limit))
          }
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve access logs",
        error: error.message
      };
    }
  }

  /**
   * Get due scheduled reports
   * GET /report-management/schedules/due
   */
  async getDueSchedules(request, reply) {
    try {
      const now = new Date();

      const dueSchedules = await db
        .select()
        .from(report_schedules)
        .where(and(
          eq(report_schedules.is_active, true),
          isNull(report_schedules.deleted_at),
          lte(report_schedules.next_execution_at, now)
        ))
        .orderBy(asc(report_schedules.next_execution_at));

      return {
        status: 200,
        message: "Due schedules retrieved successfully",
        data: {
          schedules: dueSchedules,
          count: dueSchedules.length
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve due schedules",
        error: error.message
      };
    }
  }

  /**
   * Execute all due scheduled reports
   * POST /report-management/schedules/execute-due
   */
  async executeDueSchedules(request, reply) {
    try {
      const now = new Date();
      const results = [];

      const dueSchedules = await db
        .select()
        .from(report_schedules)
        .where(and(
          eq(report_schedules.is_active, true),
          isNull(report_schedules.deleted_at),
          lte(report_schedules.next_execution_at, now)
        ))
        .orderBy(asc(report_schedules.next_execution_at));

      for (const schedule of dueSchedules) {
        try {
          const report = await ReportExecutionService.executeReport(schedule.configuration_id, {
            parameters: schedule.schedule_parameters,
            outputFormat: schedule.output_format,
            executionType: 'SCHEDULED',
            scheduleId: schedule.id
          });

          // Deliver if successful
          if (report && !report.skipped && report.status === 'SUCCESS') {
            await ReportDeliveryService.deliverReport(report.id, schedule.id);
          }

          results.push({
            schedule_id: schedule.id,
            configuration_id: schedule.configuration_id,
            status: 'SUCCESS',
            report_id: report?.id
          });
        } catch (error) {
          results.push({
            schedule_id: schedule.id,
            configuration_id: schedule.configuration_id,
            status: 'FAILED',
            error: error.message
          });
        }
      }

      return {
        status: 200,
        message: "Scheduled reports executed",
        data: {
          processed: results.length,
          successful: results.filter(r => r.status === 'SUCCESS').length,
          failed: results.filter(r => r.status === 'FAILED').length,
          results
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to execute due schedules",
        error: error.message
      };
    }
  }

  /**
   * Get execution history for a configuration
   * GET /report-management/configurations/:id/history
   */
  async getExecutionHistory(request, reply) {
    try {
      const { id } = request.params;
      const { page = 1, limit = 20 } = request.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      const [reports, totalCount] = await Promise.all([
        db
          .select()
          .from(generated_reports)
          .where(and(
            eq(generated_reports.configuration_id, parseInt(id)),
            isNull(generated_reports.deleted_at)
          ))
          .orderBy(desc(generated_reports.started_at))
          .limit(parseInt(limit))
          .offset(offset),
        db
          .select({ count: count() })
          .from(generated_reports)
          .where(and(
            eq(generated_reports.configuration_id, parseInt(id)),
            isNull(generated_reports.deleted_at)
          ))
      ]);

      return {
        status: 200,
        message: "Execution history retrieved successfully",
        data: {
          reports,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount[0].count,
            total_pages: Math.ceil(totalCount[0].count / parseInt(limit))
          }
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve execution history",
        error: error.message
      };
    }
  }

  /**
   * Get failed reports
   * GET /report-management/generated/failed
   */
  async getFailedReports(request, reply) {
    try {
      const { page = 1, limit = 20, from_date, to_date } = request.query;

      const offset = (parseInt(page) - 1) * parseInt(limit);

      let conditions = [
        eq(generated_reports.status, 'FAILED'),
        isNull(generated_reports.deleted_at)
      ];

      if (from_date) {
        conditions.push(gte(generated_reports.started_at, new Date(from_date)));
      }

      if (to_date) {
        conditions.push(lte(generated_reports.started_at, new Date(to_date)));
      }

      const [reports, totalCount] = await Promise.all([
        db
          .select()
          .from(generated_reports)
          .where(and(...conditions))
          .orderBy(desc(generated_reports.started_at))
          .limit(parseInt(limit))
          .offset(offset),
        db
          .select({ count: count() })
          .from(generated_reports)
          .where(and(...conditions))
      ]);

      return {
        status: 200,
        message: "Failed reports retrieved successfully",
        data: {
          reports,
          pagination: {
            page: parseInt(page),
            limit: parseInt(limit),
            total: totalCount[0].count,
            total_pages: Math.ceil(totalCount[0].count / parseInt(limit))
          }
        }
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve failed reports",
        error: error.message
      };
    }
  }

  // ==================== USER FAVORITES ====================

  /**
   * Get user's favorite reports
   * GET /report-management/favorites
   */
  async getFavorites(request, reply) {
    try {
      const userId = request.user?.id;

      const favorites = await db
        .select({
          id: report_favorites.id,
          configuration_id: report_favorites.configuration_id,
          display_order: report_favorites.display_order,
          custom_name: report_favorites.custom_name,
          custom_parameters: report_favorites.custom_parameters,
          created_at: report_favorites.created_at,
          configuration: report_configurations
        })
        .from(report_favorites)
        .innerJoin(
          report_configurations,
          eq(report_favorites.configuration_id, report_configurations.id)
        )
        .where(and(
          eq(report_favorites.user_id, userId),
          isNull(report_configurations.deleted_at)
        ))
        .orderBy(asc(report_favorites.display_order));

      return {
        status: 200,
        message: "Favorites retrieved successfully",
        data: favorites
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to retrieve favorites",
        error: error.message
      };
    }
  }

  /**
   * Add a report to favorites
   * POST /report-management/favorites
   */
  async addFavorite(request, reply) {
    try {
      const userId = request.user?.id;
      const { configuration_id, custom_name, custom_parameters } = request.body;

      // Check if already favorited
      const [existing] = await db
        .select()
        .from(report_favorites)
        .where(and(
          eq(report_favorites.user_id, userId),
          eq(report_favorites.configuration_id, parseInt(configuration_id))
        ));

      if (existing) {
        reply.code(409);
        return {
          status: 409,
          message: "Report already in favorites"
        };
      }

      // Get max display order
      const [maxOrder] = await db
        .select({ max: sql`MAX(${report_favorites.display_order})` })
        .from(report_favorites)
        .where(eq(report_favorites.user_id, userId));

      const [favorite] = await db
        .insert(report_favorites)
        .values({
          user_id: userId,
          configuration_id: parseInt(configuration_id),
          display_order: (maxOrder?.max || 0) + 1,
          custom_name,
          custom_parameters
        })
        .returning();

      reply.code(201);
      return {
        status: 201,
        message: "Report added to favorites",
        data: favorite
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to add favorite",
        error: error.message
      };
    }
  }

  /**
   * Remove a report from favorites
   * DELETE /report-management/favorites/:id
   */
  async removeFavorite(request, reply) {
    try {
      const { id } = request.params;
      const userId = request.user?.id;

      const deleted = await db
        .delete(report_favorites)
        .where(and(
          eq(report_favorites.id, parseInt(id)),
          eq(report_favorites.user_id, userId)
        ))
        .returning();

      if (deleted.length === 0) {
        reply.code(404);
        return {
          status: 404,
          message: "Favorite not found"
        };
      }

      return {
        status: 200,
        message: "Report removed from favorites"
      };
    } catch (error) {
      request.log.error(error);
      reply.code(500);
      return {
        status: 500,
        message: "Failed to remove favorite",
        error: error.message
      };
    }
  }

  // ==================== HELPER METHODS ====================

  /**
   * Calculate the next execution time for a schedule
   */
  calculateNextExecution(schedule) {
    const now = new Date();

    switch (schedule.frequency) {
      case 'ONE_TIME':
        return schedule.scheduled_date;

      case 'DAILY': {
        const next = new Date();
        if (schedule.execution_time) {
          const [hours, minutes] = schedule.execution_time.split(':');
          next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        if (next <= now) {
          next.setDate(next.getDate() + 1);
        }
        return next;
      }

      case 'WEEKLY': {
        const next = new Date();
        const daysOfWeek = schedule.days_of_week || [1]; // Default to Monday
        const currentDay = next.getDay();

        // Find the next scheduled day
        let daysUntilNext = 7;
        for (const day of daysOfWeek) {
          const diff = (day - currentDay + 7) % 7;
          if (diff > 0 && diff < daysUntilNext) {
            daysUntilNext = diff;
          }
        }

        next.setDate(next.getDate() + daysUntilNext);
        if (schedule.execution_time) {
          const [hours, minutes] = schedule.execution_time.split(':');
          next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        return next;
      }

      case 'MONTHLY': {
        const next = new Date();
        if (schedule.day_of_month) {
          next.setDate(schedule.day_of_month);
          if (next <= now) {
            next.setMonth(next.getMonth() + 1);
          }
        }
        if (schedule.execution_time) {
          const [hours, minutes] = schedule.execution_time.split(':');
          next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        return next;
      }

      default:
        return null;
    }
  }
}

export default new ReportManagementController();
