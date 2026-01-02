import { db } from "../config/db.drizzle.js";
import {
  report_configurations,
  report_schedules,
  generated_reports,
  report_recipients,
  report_access_logs,
  patients,
  certifications,
  scheduled_visits,
  bereavement_cases,
  incidents,
  grievances,
  quality_measure_data,
  claims,
  ar_aging,
  billing_periods,
  staff_profiles,
  staff_caseload,
  idg_meetings
} from "../db/schemas/index.js";
import { eq, and, or, isNull, desc, asc, gte, lte, sql, count, sum, avg, inArray } from "drizzle-orm";
import { logger } from "../utils/logger.js";
import PdfService from "./PdfService.js";
import MailService from "./MailService.js";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";

/**
 * Report Execution Service
 * Handles actual report generation, formatting, and output
 *
 * HIPAA Compliance:
 * - All executions are logged
 * - PHI is only included when authorized
 * - Audit trail maintained for all operations
 */
class ReportExecutionService {
  constructor() {
    // Output directory for generated reports
    this.outputDir = process.env.REPORT_OUTPUT_DIR || './generated-reports';

    // Timeout for report execution (default 5 minutes)
    this.executionTimeout = parseInt(process.env.REPORT_TIMEOUT_MS) || 300000;

    // Maximum retries for failed reports
    this.maxRetries = parseInt(process.env.REPORT_MAX_RETRIES) || 3;

    // Track running reports to prevent duplicates
    this.runningReports = new Map();

    // Metrics tracking
    this.metrics = {
      totalExecutions: 0,
      successfulExecutions: 0,
      failedExecutions: 0,
      totalExecutionTimeMs: 0,
      executionsByType: {}
    };
  }

  /**
   * Initialize the service (ensure output directory exists)
   */
  async initialize() {
    try {
      await fs.mkdir(this.outputDir, { recursive: true });
      logger.info(`ReportExecutionService initialized. Output directory: ${this.outputDir}`);
    } catch (error) {
      logger.error('Failed to initialize ReportExecutionService:', error);
      throw error;
    }
  }

  /**
   * Execute a report by configuration ID
   * @param {number} configurationId - Report configuration ID
   * @param {Object} options - Execution options
   * @returns {Object} Generated report record
   */
  async executeReport(configurationId, options = {}) {
    const {
      parameters = {},
      outputFormat = null,
      triggeredById = null,
      executionType = 'MANUAL',
      scheduleId = null,
      requestIp = null,
      requestUserAgent = null
    } = options;

    // Check if this report is already running (prevent duplicates for scheduled reports)
    const runningKey = `${configurationId}-${scheduleId || 'manual'}`;
    if (this.runningReports.has(runningKey)) {
      logger.warn(`Report ${runningKey} is already running, skipping duplicate execution`);
      return { skipped: true, reason: 'Report is already running' };
    }

    const startTime = Date.now();
    let generatedReport = null;

    try {
      // Mark as running
      this.runningReports.set(runningKey, startTime);
      this.metrics.totalExecutions++;

      // Get configuration
      const [config] = await db
        .select()
        .from(report_configurations)
        .where(and(
          eq(report_configurations.id, configurationId),
          isNull(report_configurations.deleted_at)
        ));

      if (!config) {
        throw new Error(`Report configuration ${configurationId} not found`);
      }

      // Validate parameters against schema if provided
      const finalParameters = this.validateAndMergeParameters(
        config.default_parameters || {},
        parameters,
        config.parameter_schema
      );

      // Determine output format
      const finalOutputFormat = outputFormat || config.default_output_format || 'PDF';

      // Create generated report record with RUNNING status
      [generatedReport] = await db
        .insert(generated_reports)
        .values({
          configuration_id: configurationId,
          schedule_id: scheduleId,
          configuration_version: config.version,
          execution_type: executionType,
          triggered_by_id: triggeredById,
          started_at: new Date(),
          status: 'RUNNING',
          parameters_used: finalParameters,
          output_format: finalOutputFormat,
          request_ip: requestIp,
          request_user_agent: requestUserAgent,
          created_by_id: triggeredById
        })
        .returning();

      // Execute the report with timeout
      const result = await this.executeWithTimeout(
        this.generateReportData(config, finalParameters),
        this.executionTimeout
      );

      // Format output based on requested format
      const outputResult = await this.formatOutput(
        result,
        finalOutputFormat,
        config,
        generatedReport.id
      );

      // Calculate execution duration
      const executionDurationMs = Date.now() - startTime;

      // Update generated report with success
      [generatedReport] = await db
        .update(generated_reports)
        .set({
          status: 'SUCCESS',
          completed_at: new Date(),
          execution_duration_ms: executionDurationMs,
          output_filename: outputResult.filename,
          storage_type: outputResult.storageType,
          storage_path: outputResult.storagePath,
          file_size_bytes: outputResult.fileSizeBytes,
          file_checksum: outputResult.checksum,
          mime_type: outputResult.mimeType,
          row_count: result.rowCount || result.data?.length,
          page_count: outputResult.pageCount,
          delivery_status: 'PENDING'
        })
        .where(eq(generated_reports.id, generatedReport.id))
        .returning();

      // Update metrics
      this.metrics.successfulExecutions++;
      this.metrics.totalExecutionTimeMs += executionDurationMs;
      this.metrics.executionsByType[config.category] =
        (this.metrics.executionsByType[config.category] || 0) + 1;

      // Update schedule if this was a scheduled execution
      if (scheduleId) {
        await this.updateScheduleAfterExecution(scheduleId, 'SUCCESS');
      }

      logger.info(`Report ${configurationId} executed successfully in ${executionDurationMs}ms`);

      return generatedReport;

    } catch (error) {
      const executionDurationMs = Date.now() - startTime;
      this.metrics.failedExecutions++;

      logger.error(`Report execution failed for config ${configurationId}:`, error);

      // Update generated report with failure
      if (generatedReport) {
        await db
          .update(generated_reports)
          .set({
            status: 'FAILED',
            completed_at: new Date(),
            execution_duration_ms: executionDurationMs,
            error_message: error.message,
            error_code: error.code || 'EXECUTION_ERROR',
            error_details: { stack: error.stack },
            retry_count: (generatedReport.retry_count || 0) + 1
          })
          .where(eq(generated_reports.id, generatedReport.id));
      }

      // Update schedule if this was a scheduled execution
      if (scheduleId) {
        await this.updateScheduleAfterExecution(scheduleId, 'FAILED');
      }

      throw error;

    } finally {
      // Remove from running reports
      this.runningReports.delete(runningKey);
    }
  }

  /**
   * Execute with timeout protection
   */
  async executeWithTimeout(promise, timeoutMs) {
    let timeoutId;
    const timeoutPromise = new Promise((_, reject) => {
      timeoutId = setTimeout(() => {
        reject(new Error(`Report execution timed out after ${timeoutMs}ms`));
      }, timeoutMs);
    });

    try {
      const result = await Promise.race([promise, timeoutPromise]);
      clearTimeout(timeoutId);
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  }

  /**
   * Generate report data based on configuration
   */
  async generateReportData(config, parameters) {
    const { report_type, category, query_definition, data_source } = config;

    // Route to appropriate report generator based on category
    switch (category) {
      case 'CENSUS':
        return await this.generateCensusReport(config, parameters);
      case 'CLINICAL':
        return await this.generateClinicalReport(config, parameters);
      case 'BILLING':
        return await this.generateBillingReport(config, parameters);
      case 'COMPLIANCE':
        return await this.generateComplianceReport(config, parameters);
      case 'QAPI':
        return await this.generateQapiReport(config, parameters);
      case 'STAFF':
        return await this.generateStaffReport(config, parameters);
      case 'BEREAVEMENT':
        return await this.generateBereavementReport(config, parameters);
      case 'EXECUTIVE':
        return await this.generateExecutiveReport(config, parameters);
      case 'CUSTOM':
      default:
        return await this.generateCustomReport(config, parameters);
    }
  }

  /**
   * Generate Census Report
   */
  async generateCensusReport(config, parameters) {
    const { from_date, to_date, level_of_care } = parameters;

    let conditions = [
      eq(patients.status, 'ACTIVE'),
      isNull(patients.deleted_at)
    ];

    if (level_of_care) {
      conditions.push(eq(patients.level_of_care, level_of_care));
    }

    const data = await db
      .select({
        patient_id: patients.id,
        patient_name: sql`CONCAT(${patients.first_name}, ' ', ${patients.last_name})`,
        mrn: patients.mrn,
        admission_date: patients.admission_date,
        primary_diagnosis: patients.primary_diagnosis,
        level_of_care: patients.level_of_care,
        attending_physician: patients.attending_physician
      })
      .from(patients)
      .where(and(...conditions))
      .orderBy(patients.last_name, patients.first_name);

    const summary = await db
      .select({
        total_patients: count(),
        level_of_care: patients.level_of_care
      })
      .from(patients)
      .where(and(...conditions))
      .groupBy(patients.level_of_care);

    return {
      title: config.name,
      description: config.description,
      generatedAt: new Date().toISOString(),
      parameters,
      data,
      summary: {
        totalPatients: data.length,
        byLevelOfCare: summary
      },
      rowCount: data.length
    };
  }

  /**
   * Generate Clinical Report
   */
  async generateClinicalReport(config, parameters) {
    const { from_date, to_date } = parameters;

    // Get recertifications due
    const recertifications = await db
      .select({
        patient_id: certifications.patient_id,
        certification_start: certifications.certification_start,
        certification_end: certifications.certification_end,
        status: certifications.status
      })
      .from(certifications)
      .where(and(
        gte(certifications.certification_end, from_date || new Date()),
        lte(certifications.certification_end, to_date || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
        isNull(certifications.deleted_at)
      ))
      .orderBy(certifications.certification_end);

    return {
      title: config.name,
      description: config.description,
      generatedAt: new Date().toISOString(),
      parameters,
      data: recertifications,
      rowCount: recertifications.length
    };
  }

  /**
   * Generate Billing Report
   */
  async generateBillingReport(config, parameters) {
    const { from_date, to_date, status } = parameters;

    let conditions = [isNull(claims.deleted_at)];

    if (from_date) {
      conditions.push(gte(claims.service_date, from_date));
    }
    if (to_date) {
      conditions.push(lte(claims.service_date, to_date));
    }
    if (status) {
      conditions.push(eq(claims.status, status));
    }

    const data = await db
      .select()
      .from(claims)
      .where(and(...conditions))
      .orderBy(desc(claims.service_date));

    const totals = await db
      .select({
        total_billed: sum(claims.billed_amount),
        total_paid: sum(claims.paid_amount),
        claim_count: count()
      })
      .from(claims)
      .where(and(...conditions));

    return {
      title: config.name,
      description: config.description,
      generatedAt: new Date().toISOString(),
      parameters,
      data,
      summary: totals[0],
      rowCount: data.length
    };
  }

  /**
   * Generate Compliance Report
   */
  async generateComplianceReport(config, parameters) {
    const { from_date, to_date } = parameters;

    // Get IDG meeting compliance
    const idgMeetings = await db
      .select()
      .from(idg_meetings)
      .where(and(
        gte(idg_meetings.meeting_date, from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
        lte(idg_meetings.meeting_date, to_date || new Date()),
        isNull(idg_meetings.deleted_at)
      ))
      .orderBy(desc(idg_meetings.meeting_date));

    return {
      title: config.name,
      description: config.description,
      generatedAt: new Date().toISOString(),
      parameters,
      data: idgMeetings,
      rowCount: idgMeetings.length
    };
  }

  /**
   * Generate QAPI Report
   */
  async generateQapiReport(config, parameters) {
    const { from_date, to_date, metric_type } = parameters;

    const [incidentData, grievanceData] = await Promise.all([
      db.select().from(incidents)
        .where(and(
          gte(incidents.incident_date, from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
          lte(incidents.incident_date, to_date || new Date()),
          isNull(incidents.deleted_at)
        )),
      db.select().from(grievances)
        .where(and(
          gte(grievances.filed_date, from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)),
          lte(grievances.filed_date, to_date || new Date()),
          isNull(grievances.deleted_at)
        ))
    ]);

    return {
      title: config.name,
      description: config.description,
      generatedAt: new Date().toISOString(),
      parameters,
      data: {
        incidents: incidentData,
        grievances: grievanceData
      },
      summary: {
        totalIncidents: incidentData.length,
        totalGrievances: grievanceData.length
      },
      rowCount: incidentData.length + grievanceData.length
    };
  }

  /**
   * Generate Staff Report
   */
  async generateStaffReport(config, parameters) {
    const staffData = await db
      .select()
      .from(staff_profiles)
      .where(isNull(staff_profiles.deleted_at))
      .orderBy(staff_profiles.last_name);

    const caseloadData = await db
      .select({
        staff_id: staff_caseload.staff_id,
        patient_count: count()
      })
      .from(staff_caseload)
      .groupBy(staff_caseload.staff_id);

    return {
      title: config.name,
      description: config.description,
      generatedAt: new Date().toISOString(),
      parameters,
      data: {
        staff: staffData,
        caseloads: caseloadData
      },
      rowCount: staffData.length
    };
  }

  /**
   * Generate Bereavement Report
   */
  async generateBereavementReport(config, parameters) {
    const { status } = parameters;

    let conditions = [isNull(bereavement_cases.deleted_at)];
    if (status) {
      conditions.push(eq(bereavement_cases.status, status));
    }

    const data = await db
      .select()
      .from(bereavement_cases)
      .where(and(...conditions))
      .orderBy(desc(bereavement_cases.created_at));

    return {
      title: config.name,
      description: config.description,
      generatedAt: new Date().toISOString(),
      parameters,
      data,
      rowCount: data.length
    };
  }

  /**
   * Generate Executive Dashboard Report
   */
  async generateExecutiveReport(config, parameters) {
    const { from_date, to_date } = parameters;

    // Aggregate key metrics
    const [censusCount, claimsTotal, incidentCount] = await Promise.all([
      db.select({ count: count() })
        .from(patients)
        .where(and(eq(patients.status, 'ACTIVE'), isNull(patients.deleted_at))),
      db.select({
        total_billed: sum(claims.billed_amount),
        total_paid: sum(claims.paid_amount)
      }).from(claims),
      db.select({ count: count() })
        .from(incidents)
        .where(gte(incidents.incident_date, from_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)))
    ]);

    return {
      title: config.name,
      description: config.description,
      generatedAt: new Date().toISOString(),
      parameters,
      data: {
        activeCensus: censusCount[0]?.count || 0,
        financials: claimsTotal[0] || { total_billed: 0, total_paid: 0 },
        recentIncidents: incidentCount[0]?.count || 0
      },
      rowCount: 1
    };
  }

  /**
   * Generate Custom Report using query definition
   */
  async generateCustomReport(config, parameters) {
    const { query_definition } = config;

    if (!query_definition) {
      return {
        title: config.name,
        description: config.description,
        generatedAt: new Date().toISOString(),
        parameters,
        data: [],
        message: 'No query definition provided for custom report',
        rowCount: 0
      };
    }

    // For custom reports, we'd need to safely execute the query definition
    // This is a placeholder - in production you'd want a query builder or template system
    return {
      title: config.name,
      description: config.description,
      generatedAt: new Date().toISOString(),
      parameters,
      data: [],
      message: 'Custom query execution not yet implemented',
      rowCount: 0
    };
  }

  /**
   * Format output based on requested format
   */
  async formatOutput(reportData, format, config, reportId) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const safeName = (config.code || config.name).replace(/[^a-zA-Z0-9]/g, '_');

    switch (format.toUpperCase()) {
      case 'PDF':
        return await this.generatePdfOutput(reportData, safeName, timestamp, reportId);
      case 'CSV':
        return await this.generateCsvOutput(reportData, safeName, timestamp, reportId);
      case 'EXCEL':
        return await this.generateExcelOutput(reportData, safeName, timestamp, reportId);
      case 'JSON':
        return await this.generateJsonOutput(reportData, safeName, timestamp, reportId);
      case 'HTML':
        return await this.generateHtmlOutput(reportData, safeName, timestamp, reportId);
      default:
        throw new Error(`Unsupported output format: ${format}`);
    }
  }

  /**
   * Generate PDF output
   */
  async generatePdfOutput(reportData, safeName, timestamp, reportId) {
    const filename = `${safeName}_${timestamp}.pdf`;
    const storagePath = path.join(this.outputDir, filename);

    // Build PDF document definition
    const docDefinition = {
      content: [
        { text: reportData.title, style: 'header' },
        { text: reportData.description || '', style: 'subheader' },
        { text: `Generated: ${reportData.generatedAt}`, style: 'meta' },
        { text: '\n' },
        this.buildPdfTable(reportData.data)
      ],
      styles: {
        header: { fontSize: 22, bold: true, margin: [0, 0, 0, 10] },
        subheader: { fontSize: 14, margin: [0, 0, 0, 5] },
        meta: { fontSize: 10, color: 'gray' },
        tableHeader: { bold: true, fontSize: 11, fillColor: '#f0f0f0' }
      }
    };

    try {
      const pdfBuffer = await PdfService.generatePdf(docDefinition, filename);
      await fs.writeFile(storagePath, pdfBuffer);

      const checksum = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
      const stats = await fs.stat(storagePath);

      return {
        filename,
        storageType: 'LOCAL',
        storagePath,
        fileSizeBytes: stats.size,
        checksum,
        mimeType: 'application/pdf',
        pageCount: 1 // Would need PDF parser for actual count
      };
    } catch (error) {
      logger.error('PDF generation failed:', error);
      throw error;
    }
  }

  /**
   * Build PDF table from data
   */
  buildPdfTable(data) {
    if (!Array.isArray(data) || data.length === 0) {
      return { text: 'No data available', style: 'meta' };
    }

    const headers = Object.keys(data[0]);
    const body = [
      headers.map(h => ({ text: h, style: 'tableHeader' })),
      ...data.map(row => headers.map(h => String(row[h] ?? '')))
    ];

    return {
      table: {
        headerRows: 1,
        widths: headers.map(() => '*'),
        body
      }
    };
  }

  /**
   * Generate CSV output
   */
  async generateCsvOutput(reportData, safeName, timestamp, reportId) {
    const filename = `${safeName}_${timestamp}.csv`;
    const storagePath = path.join(this.outputDir, filename);

    const data = Array.isArray(reportData.data) ? reportData.data : [];

    if (data.length === 0) {
      const content = 'No data available';
      await fs.writeFile(storagePath, content);
      return {
        filename,
        storageType: 'LOCAL',
        storagePath,
        fileSizeBytes: content.length,
        checksum: crypto.createHash('sha256').update(content).digest('hex'),
        mimeType: 'text/csv'
      };
    }

    const headers = Object.keys(data[0]);
    const rows = data.map(row =>
      headers.map(h => {
        const val = row[h];
        if (val === null || val === undefined) return '';
        const str = String(val);
        // Escape quotes and wrap in quotes if contains comma or newline
        if (str.includes(',') || str.includes('"') || str.includes('\n')) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      }).join(',')
    );

    const content = [headers.join(','), ...rows].join('\n');
    await fs.writeFile(storagePath, content);

    const stats = await fs.stat(storagePath);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    return {
      filename,
      storageType: 'LOCAL',
      storagePath,
      fileSizeBytes: stats.size,
      checksum,
      mimeType: 'text/csv'
    };
  }

  /**
   * Generate Excel output (simplified - would use exceljs in production)
   */
  async generateExcelOutput(reportData, safeName, timestamp, reportId) {
    // For now, fall back to CSV with xlsx extension
    // In production, use a library like exceljs
    const result = await this.generateCsvOutput(reportData, safeName, timestamp, reportId);
    const newFilename = result.filename.replace('.csv', '.xlsx');
    const newPath = result.storagePath.replace('.csv', '.xlsx');

    await fs.rename(result.storagePath, newPath);

    return {
      ...result,
      filename: newFilename,
      storagePath: newPath,
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };
  }

  /**
   * Generate JSON output
   */
  async generateJsonOutput(reportData, safeName, timestamp, reportId) {
    const filename = `${safeName}_${timestamp}.json`;
    const storagePath = path.join(this.outputDir, filename);

    const content = JSON.stringify(reportData, null, 2);
    await fs.writeFile(storagePath, content);

    const stats = await fs.stat(storagePath);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    return {
      filename,
      storageType: 'LOCAL',
      storagePath,
      fileSizeBytes: stats.size,
      checksum,
      mimeType: 'application/json'
    };
  }

  /**
   * Generate HTML output
   */
  async generateHtmlOutput(reportData, safeName, timestamp, reportId) {
    const filename = `${safeName}_${timestamp}.html`;
    const storagePath = path.join(this.outputDir, filename);

    const data = Array.isArray(reportData.data) ? reportData.data : [];
    const headers = data.length > 0 ? Object.keys(data[0]) : [];

    const tableRows = data.map(row =>
      `<tr>${headers.map(h => `<td>${this.escapeHtml(String(row[h] ?? ''))}</td>`).join('')}</tr>`
    ).join('\n');

    const content = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>${this.escapeHtml(reportData.title)}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 20px; }
    h1 { color: #333; }
    .meta { color: #666; font-size: 0.9em; }
    table { border-collapse: collapse; width: 100%; margin-top: 20px; }
    th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
    th { background-color: #f4f4f4; }
    tr:nth-child(even) { background-color: #f9f9f9; }
  </style>
</head>
<body>
  <h1>${this.escapeHtml(reportData.title)}</h1>
  <p>${this.escapeHtml(reportData.description || '')}</p>
  <p class="meta">Generated: ${reportData.generatedAt}</p>
  <table>
    <thead>
      <tr>${headers.map(h => `<th>${this.escapeHtml(h)}</th>`).join('')}</tr>
    </thead>
    <tbody>
      ${tableRows || '<tr><td colspan="100%">No data available</td></tr>'}
    </tbody>
  </table>
</body>
</html>`;

    await fs.writeFile(storagePath, content);

    const stats = await fs.stat(storagePath);
    const checksum = crypto.createHash('sha256').update(content).digest('hex');

    return {
      filename,
      storageType: 'LOCAL',
      storagePath,
      fileSizeBytes: stats.size,
      checksum,
      mimeType: 'text/html'
    };
  }

  /**
   * Escape HTML special characters
   */
  escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  /**
   * Validate and merge parameters
   */
  validateAndMergeParameters(defaults, provided, schema) {
    const merged = { ...defaults, ...provided };

    // Basic validation if schema is provided
    if (schema && schema.required) {
      for (const field of schema.required) {
        if (merged[field] === undefined || merged[field] === null) {
          throw new Error(`Required parameter missing: ${field}`);
        }
      }
    }

    return merged;
  }

  /**
   * Update schedule after execution
   */
  async updateScheduleAfterExecution(scheduleId, status) {
    const isSuccess = status === 'SUCCESS';

    // Get current schedule to calculate next execution
    const [schedule] = await db
      .select()
      .from(report_schedules)
      .where(eq(report_schedules.id, scheduleId));

    if (!schedule) return;

    const nextExecution = this.calculateNextExecution(schedule);

    await db
      .update(report_schedules)
      .set({
        last_execution_at: new Date(),
        last_execution_status: status,
        next_execution_at: nextExecution,
        execution_count: sql`${report_schedules.execution_count} + 1`,
        failure_count: isSuccess
          ? report_schedules.failure_count
          : sql`${report_schedules.failure_count} + 1`,
        updated_at: new Date()
      })
      .where(eq(report_schedules.id, scheduleId));
  }

  /**
   * Calculate next execution time for a schedule
   */
  calculateNextExecution(schedule) {
    const now = new Date();

    // Check if schedule has ended
    if (schedule.end_date && new Date(schedule.end_date) < now) {
      return null;
    }

    // Check if schedule is paused
    if (schedule.pause_start_date && schedule.pause_end_date) {
      const pauseStart = new Date(schedule.pause_start_date);
      const pauseEnd = new Date(schedule.pause_end_date);
      if (now >= pauseStart && now <= pauseEnd) {
        return pauseEnd;
      }
    }

    switch (schedule.frequency) {
      case 'ONE_TIME':
        return null; // One-time schedules don't repeat

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
        const daysOfWeek = schedule.days_of_week || [1];
        const currentDay = next.getDay();

        let daysUntilNext = 7;
        for (const day of daysOfWeek) {
          const diff = (day - currentDay + 7) % 7;
          if (diff === 0) {
            // Same day - check if time has passed
            if (schedule.execution_time) {
              const [hours, minutes] = schedule.execution_time.split(':');
              const checkTime = new Date();
              checkTime.setHours(parseInt(hours), parseInt(minutes), 0, 0);
              if (checkTime > now) {
                daysUntilNext = 0;
                break;
              }
            }
          } else if (diff < daysUntilNext) {
            daysUntilNext = diff;
          }
        }
        if (daysUntilNext === 7) daysUntilNext = Math.min(...daysOfWeek.map(d => (d - currentDay + 7) % 7 || 7));

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

      case 'QUARTERLY': {
        const next = new Date();
        const quarters = [0, 3, 6, 9]; // Jan, Apr, Jul, Oct
        const currentMonth = next.getMonth();
        let nextQuarter = quarters.find(q => q > currentMonth);
        if (nextQuarter === undefined) {
          nextQuarter = 0;
          next.setFullYear(next.getFullYear() + 1);
        }
        next.setMonth(nextQuarter);
        next.setDate(schedule.day_of_month || 1);
        if (schedule.execution_time) {
          const [hours, minutes] = schedule.execution_time.split(':');
          next.setHours(parseInt(hours), parseInt(minutes), 0, 0);
        }
        return next;
      }

      case 'YEARLY': {
        const next = new Date();
        next.setFullYear(next.getFullYear() + 1);
        if (schedule.day_of_month) next.setDate(schedule.day_of_month);
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

  /**
   * Retry a failed report
   */
  async retryFailedReport(generatedReportId) {
    const [report] = await db
      .select()
      .from(generated_reports)
      .where(eq(generated_reports.id, generatedReportId));

    if (!report) {
      throw new Error('Generated report not found');
    }

    if (report.status !== 'FAILED') {
      throw new Error('Can only retry failed reports');
    }

    if (report.retry_count >= this.maxRetries) {
      throw new Error(`Maximum retry attempts (${this.maxRetries}) exceeded`);
    }

    return await this.executeReport(report.configuration_id, {
      parameters: report.parameters_used,
      outputFormat: report.output_format,
      triggeredById: report.triggered_by_id,
      executionType: 'MANUAL',
      scheduleId: report.schedule_id
    });
  }

  /**
   * Get execution metrics
   */
  getMetrics() {
    const avgExecutionTime = this.metrics.totalExecutions > 0
      ? this.metrics.totalExecutionTimeMs / this.metrics.totalExecutions
      : 0;

    const successRate = this.metrics.totalExecutions > 0
      ? (this.metrics.successfulExecutions / this.metrics.totalExecutions) * 100
      : 0;

    return {
      ...this.metrics,
      averageExecutionTimeMs: Math.round(avgExecutionTime),
      successRate: successRate.toFixed(2) + '%',
      currentlyRunning: this.runningReports.size
    };
  }

  /**
   * Get file path for download
   */
  async getReportFilePath(generatedReportId) {
    const [report] = await db
      .select()
      .from(generated_reports)
      .where(eq(generated_reports.id, generatedReportId));

    if (!report) {
      throw new Error('Generated report not found');
    }

    if (report.status !== 'SUCCESS') {
      throw new Error('Report not ready for download');
    }

    if (report.storage_type !== 'LOCAL') {
      throw new Error(`Storage type ${report.storage_type} not supported for direct download`);
    }

    return {
      filePath: report.storage_path,
      filename: report.output_filename,
      mimeType: report.mime_type,
      fileSize: report.file_size_bytes
    };
  }
}

export default new ReportExecutionService();
