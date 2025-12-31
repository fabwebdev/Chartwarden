import { db } from "../config/db.drizzle.js";
import { audit_logs } from "../db/schemas/auditLog.schema.js";
import { eq, and, gte, lte, desc, sql, count, between } from "drizzle-orm";
import axios from "axios";

import { logger } from '../utils/logger.js';
import { phiRedactionService } from './PHIRedactionService.js';
import { isCriticalAction, isSecurityAlertAction, getRetentionYears } from '../constants/auditActions.js';

/**
 * HIPAA-Compliant Audit Logging Service
 *
 * Features:
 * - Immutable audit logs (database-enforced)
 * - PHI/PII redaction before logging
 * - Batch processing for high-volume scenarios
 * - External logger integration (Splunk, Elasticsearch, CloudWatch)
 * - 6-year retention compliance
 * - Security alert detection
 */
class AuditService {
  constructor() {
    this.externalLoggers = [];
    this.batchQueue = [];
    this.batchSize = parseInt(process.env.AUDIT_BATCH_SIZE || '50', 10);
    this.batchFlushInterval = parseInt(process.env.AUDIT_BATCH_FLUSH_MS || '5000', 10);
    this.batchTimer = null;
    this.isProcessingBatch = false;
    this.stats = {
      totalLogs: 0,
      batchedLogs: 0,
      immediatelogs: 0,
      errors: 0,
      securityAlerts: 0,
    };
    this.initializeExternalLoggers();
    this.startBatchProcessor();
  }

  /**
   * Start the batch processor timer
   */
  startBatchProcessor() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
    }
    this.batchTimer = setInterval(() => this.flushBatch(), this.batchFlushInterval);
    logger.info(`Audit batch processor started (size: ${this.batchSize}, interval: ${this.batchFlushInterval}ms)`);
  }

  /**
   * Stop the batch processor
   */
  async stopBatchProcessor() {
    if (this.batchTimer) {
      clearInterval(this.batchTimer);
      this.batchTimer = null;
    }
    // Flush remaining items
    await this.flushBatch();
    logger.info('Audit batch processor stopped');
  }

  /**
   * Initialize external log storage systems
   */
  initializeExternalLoggers() {
    logger.info('🔍 Initializing external loggers...')
    
    // Splunk configuration
    if (process.env.SPLUNK_URL && process.env.SPLUNK_TOKEN) {
      this.externalLoggers.push({
        type: "splunk",
        url: process.env.SPLUNK_URL,
        token: process.env.SPLUNK_TOKEN,
        source: process.env.SPLUNK_SOURCE || "healthcare-api",
        sourcetype: process.env.SPLUNK_SOURCETYPE || "audit",
      });
    }

    // Elasticsearch configuration
    if (process.env.ELASTICSEARCH_URL && process.env.ELASTICSEARCH_INDEX) {
      const esConfig = {
        type: "elasticsearch",
        url: process.env.ELASTICSEARCH_URL,
        index: process.env.ELASTICSEARCH_INDEX,
        username: process.env.ELASTICSEARCH_USERNAME,
        password: process.env.ELASTICSEARCH_PASSWORD,
        apiKey: process.env.ELASTICSEARCH_API_KEY, // Support for API key authentication
      };
      this.externalLoggers.push(esConfig);
      console.log('✅ Elasticsearch logger configured:', {
        url: esConfig.url,
        index: esConfig.index,
        hasApiKey: !!esConfig.apiKey,
        hasUsername: !!esConfig.username
      });
    } else {
      logger.info('⚠️ Elasticsearch not configured - missing ELASTICSEARCH_URL or ELASTICSEARCH_INDEX')
    }

    // AWS CloudWatch configuration
    if (process.env.AWS_CLOUDWATCH_LOG_GROUP && process.env.AWS_REGION) {
      this.externalLoggers.push({
        type: "cloudwatch",
        logGroup: process.env.AWS_CLOUDWATCH_LOG_GROUP,
        region: process.env.AWS_REGION,
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      });
    }

    // Generic HTTP endpoint (for custom log managers)
    if (process.env.EXTERNAL_LOG_URL) {
      this.externalLoggers.push({
        type: "http",
        url: process.env.EXTERNAL_LOG_URL,
        token: process.env.EXTERNAL_LOG_TOKEN,
        headers: process.env.EXTERNAL_LOG_HEADERS
          ? JSON.parse(process.env.EXTERNAL_LOG_HEADERS)
          : {},
      });
    }
  }

  /**
   * Send audit log to external systems
   * @param {Object} auditData - Audit log data
   */
  async sendToExternalLoggers(auditData) {
    const promises = this.externalLoggers.map(async (logger) => {
      try {
        switch (logger.type) {
          case "splunk":
            await this.sendToSplunk(logger, auditData);
            break;
          case "elasticsearch":
            await this.sendToElasticsearch(logger, auditData);
            break;
          case "cloudwatch":
            await this.sendToCloudWatch(logger, auditData);
            break;
          case "http":
            await this.sendToHttp(logger, auditData);
            break;
        }
      } catch (error) {
        // Don't fail if external logging fails, but log detailed error
        console.error(
          `❌ Failed to send audit log to ${logger.type}:`,
          error.message
        );
        if (error.response) {
          logger.error('Response status:', error.response.status)
          logger.error('Response data:', error.response.data)
        }
        if (error.request) {
          logger.error('Request URL:', error.config?.url)
          console.error('Request config:', {
            method: error.config?.method,
            headers: error.config?.headers ? Object.keys(error.config.headers) : 'none'
          });
        }
      }
    });

    // Execute all external loggers in parallel (don't wait for them)
    Promise.allSettled(promises).catch(() => {
      // Silently handle errors - external logging should not break the application
    });
  }

  /**
   * Send audit log to Splunk
   */
  async sendToSplunk(logger, auditData) {
    const splunkEvent = {
      time: Math.floor(new Date(auditData.createdAt).getTime() / 1000),
      source: logger.source,
      sourcetype: logger.sourcetype,
      event: {
        type: "audit",
        action: auditData.action,
        table_name: auditData.table_name,
        record_id: auditData.record_id,
        user_id: auditData.user_id,
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
        timestamp: auditData.createdAt,
        // Note: old_value and new_value are intentionally excluded (no health data)
      },
    };

    await axios.post(
      `${logger.url}/services/collector/event`,
      JSON.stringify(splunkEvent),
      {
        headers: {
          Authorization: `Splunk ${logger.token}`,
          "Content-Type": "application/json",
        },
        timeout: 5000,
      }
    );
  }

  /**
   * Send audit log to Elasticsearch
   */
  async sendToElasticsearch(logger, auditData) {
    const esDocument = {
      "@timestamp": auditData.createdAt,
      type: "audit",
      action: auditData.action,
      table_name: auditData.table_name,
      record_id: auditData.record_id,
      user_id: auditData.user_id,
      user_name: auditData.user_name,
      user_email: auditData.user_email,
      ip_address: auditData.ip_address,
      user_agent: auditData.user_agent,
      // Note: old_value and new_value are intentionally excluded (no health data)
    };

    // Remove port from URL if present (Elastic Cloud uses different endpoints)
    let baseUrl = logger.url;
    if (baseUrl.includes(':9243')) {
      baseUrl = baseUrl.replace(':9243', '');
    }
    
    const url = `${baseUrl}/${logger.index}/_doc`;
    const config = {
      headers: {
        "Content-Type": "application/json",
      },
      timeout: 15000, // Increased timeout to 15 seconds
    };

    // Use API key if provided (preferred for Elastic Cloud)
    if (logger.apiKey) {
      config.headers["Authorization"] = `ApiKey ${logger.apiKey}`;
    } else if (logger.username && logger.password) {
      // Fallback to username/password
      config.auth = {
        username: logger.username,
        password: logger.password,
      };
    }

    try {
      const response = await axios.post(url, esDocument, config);
      console.log('✅ Audit log sent to Elasticsearch successfully:', {
        index: logger.index,
        documentId: response.data?._id,
        status: response.status
      });
      return response;
    } catch (error) {
      // Log more details for debugging
      console.error('❌ Elasticsearch error details:', {
        url,
        status: error.response?.status,
        statusText: error.response?.statusText,
        message: error.message,
        data: error.response?.data,
        requestConfig: {
          method: 'POST',
          hasAuth: !!config.headers?.Authorization,
          timeout: config.timeout
        }
      });
      throw error;
    }
  }

  /**
   * Send audit log to AWS CloudWatch
   */
  async sendToCloudWatch(logger, auditData) {
    // CloudWatch requires AWS SDK - this is a placeholder
    // In production, you would use @aws-sdk/client-cloudwatch-logs
    const logMessage = JSON.stringify({
      type: "audit",
      action: auditData.action,
      table_name: auditData.table_name,
      record_id: auditData.record_id,
      user_id: auditData.user_id,
      ip_address: auditData.ip_address,
      user_agent: auditData.user_agent,
      timestamp: auditData.createdAt,
    });

    // For now, log to console - in production, implement AWS SDK
    logger.info(`[CloudWatch] ${logger.logGroup}: ${logMessage}`)
  }

  /**
   * Send audit log to generic HTTP endpoint
   */
  async sendToHttp(logger, auditData) {
    const payload = {
      type: "audit",
      action: auditData.action,
      table_name: auditData.table_name,
      record_id: auditData.record_id,
      user_id: auditData.user_id,
      ip_address: auditData.ip_address,
      user_agent: auditData.user_agent,
      timestamp: auditData.createdAt,
    };

    const headers = {
      "Content-Type": "application/json",
      ...logger.headers,
    };

    if (logger.token) {
      headers["Authorization"] = `Bearer ${logger.token}`;
    }

    await axios.post(logger.url, payload, {
      headers,
      timeout: 5000,
    });
  }

  /**
   * Get audit logs with optional filters
   * @param {Object} filters - Filter options
   * @param {number} page - Page number
   * @param {number} limit - Number of records per page
   * @returns {Object} Paginated audit logs
   */
  async getAuditLogs(filters = {}, page = 1, limit = 20) {
    try {
      const offset = (page - 1) * limit;

      // Build conditions
      const conditions = [];

      // Apply filters
      if (filters.userId) {
        conditions.push(eq(audit_logs.user_id, filters.userId));
      }

      if (filters.action) {
        conditions.push(eq(audit_logs.action, filters.action));
      }

      if (filters.tableName) {
        conditions.push(eq(audit_logs.table_name, filters.tableName));
      }

      if (filters.startDate) {
        conditions.push(gte(audit_logs.createdAt, new Date(filters.startDate)));
      }

      if (filters.endDate) {
        conditions.push(lte(audit_logs.createdAt, new Date(filters.endDate)));
      }

      // Build query
      let query = db.select({
        id: audit_logs.id,
        user_id: audit_logs.user_id,
        action: audit_logs.action,
        table_name: audit_logs.table_name,
        record_id: audit_logs.record_id,
        old_value: audit_logs.old_value,
        new_value: audit_logs.new_value,
        ip_address: audit_logs.ip_address,
        user_agent: audit_logs.user_agent,
        createdAt: audit_logs.createdAt,
        updatedAt: audit_logs.updatedAt
      }).from(audit_logs);

      if (conditions.length > 0) {
        query = query.where(and(...conditions));
      }

      // Add ordering and pagination
      const paginatedQuery = query
        .orderBy(desc(audit_logs.createdAt))
        .limit(limit)
        .offset(offset);

      // Execute query
      const rows = await paginatedQuery;

      // Get total count
      const countResult = await db
        .select({ count: db.fn.count() })
        .from(audit_logs)
        .where(and(...conditions));
      const count = countResult[0].count;

      return {
        data: rows,
        total: count,
        page,
        pages: Math.ceil(count / limit),
      };
    } catch (error) {
      throw new Error(`Failed to fetch audit logs: ${error.message}`);
    }
  }

  /**
   * Get audit logs for a specific user
   * @param {number} userId - User ID
   * @param {number} page - Page number
   * @param {number} limit - Number of records per page
   * @returns {Object} Paginated audit logs for user
   */
  async getUserAuditLogs(userId, page = 1, limit = 20) {
    return await this.getAuditLogs({ userId }, page, limit);
  }

  /**
   * Get audit logs for a specific table
   * @param {string} tableName - Table name
   * @param {number} page - Page number
   * @param {number} limit - Number of records per page
   * @returns {Object} Paginated audit logs for table
   */
  async getTableAuditLogs(tableName, page = 1, limit = 20) {
    return await this.getAuditLogs({ tableName }, page, limit);
  }

  /**
   * Get audit logs for a specific action
   * @param {string} action - Action type (CREATE, UPDATE, DELETE, READ)
   * @param {number} page - Page number
   * @param {number} limit - Number of records per page
   * @returns {Object} Paginated audit logs for action
   */
  async getActionAuditLogs(action, page = 1, limit = 20) {
    return await this.getAuditLogs({ action }, page, limit);
  }

  /**
   * Get audit log by ID
   * @param {number} id - Audit log ID
   * @returns {Object} Audit log record
   */
  async getAuditLogById(id) {
    try {
      const result = await db
        .select({
          id: audit_logs.id,
          user_id: audit_logs.user_id,
          action: audit_logs.action,
          table_name: audit_logs.table_name,
          record_id: audit_logs.record_id,
          old_value: audit_logs.old_value,
          new_value: audit_logs.new_value,
          ip_address: audit_logs.ip_address,
          user_agent: audit_logs.user_agent,
          createdAt: audit_logs.createdAt,
          updatedAt: audit_logs.updatedAt
        })
        .from(audit_logs)
        .where(eq(audit_logs.id, id))
        .limit(1);
      return result[0] || null;
    } catch (error) {
      throw new Error(`Failed to fetch audit log: ${error.message}`);
    }
  }

  /**
   * Create a custom audit log entry
   * Logs to database and external systems (if configured)
   * Does NOT log actual health data - only metadata
   *
   * @param {Object} data - Audit log data (should not contain health data)
   * @param {Object} meta - Additional metadata for external loggers
   * @param {Object} options - Options for logging behavior
   * @returns {Object} Created audit log
   */
  async createAuditLog(data, meta = {}, options = {}) {
    const { immediate = false, skipExternal = false } = options;

    try {
      // Redact any PHI/PII from metadata
      const redactedMeta = phiRedactionService.safeRedact(meta);

      // Ensure we never log actual health data
      const sanitizedData = {
        ...data,
        old_value: null, // Never log actual health data
        new_value: null, // Never log actual health data
        // Redact metadata field if present
        metadata: data.metadata ? JSON.stringify(phiRedactionService.safeRedact(
          typeof data.metadata === 'string' ? JSON.parse(data.metadata) : data.metadata
        )) : null,
      };

      // Check for security alerts
      if (isSecurityAlertAction(data.action)) {
        this.stats.securityAlerts++;
        this.handleSecurityAlert(sanitizedData, redactedMeta);
      }

      // Critical actions must be logged immediately
      const mustBeImmediate = immediate || isCriticalAction(data.action);

      if (mustBeImmediate) {
        return await this.createImmediateLog(sanitizedData, redactedMeta, skipExternal);
      }

      // Queue for batch processing
      return this.queueForBatch(sanitizedData, redactedMeta, skipExternal);
    } catch (error) {
      this.stats.errors++;
      logger.error('Failed to create audit log:', { error: error.message, action: data.action });
      throw new Error(`Failed to create audit log: ${error.message}`);
    }
  }

  /**
   * Create audit log immediately (bypass batch queue)
   */
  async createImmediateLog(data, meta, skipExternal = false) {
    this.stats.immediatelogs++;
    this.stats.totalLogs++;

    const result = await db
      .insert(audit_logs)
      .values(data)
      .returning();
    const auditLog = result[0];

    if (!skipExternal) {
      const externalPayload = { ...auditLog, ...meta };
      this.sendToExternalLoggers(externalPayload).catch((err) => {
        logger.error("External logging error:", err.message);
      });
    }

    return auditLog;
  }

  /**
   * Queue audit log for batch processing
   */
  queueForBatch(data, meta, skipExternal) {
    this.batchQueue.push({ data, meta, skipExternal, queuedAt: Date.now() });
    this.stats.batchedLogs++;
    this.stats.totalLogs++;

    // Flush if batch size reached
    if (this.batchQueue.length >= this.batchSize) {
      this.flushBatch().catch(err => {
        logger.error('Batch flush error:', err.message);
      });
    }

    // Return a pending result
    return { id: null, status: 'queued', queueSize: this.batchQueue.length };
  }

  /**
   * Flush the batch queue to database
   */
  async flushBatch() {
    if (this.isProcessingBatch || this.batchQueue.length === 0) {
      return;
    }

    this.isProcessingBatch = true;
    const itemsToProcess = [...this.batchQueue];
    this.batchQueue = [];

    try {
      // Batch insert
      const values = itemsToProcess.map(item => item.data);
      const results = await db
        .insert(audit_logs)
        .values(values)
        .returning();

      // Send to external loggers (async)
      for (let i = 0; i < results.length; i++) {
        if (!itemsToProcess[i].skipExternal) {
          const externalPayload = { ...results[i], ...itemsToProcess[i].meta };
          this.sendToExternalLoggers(externalPayload).catch(() => {});
        }
      }

      logger.debug(`Flushed ${results.length} audit logs`);
    } catch (error) {
      // On error, try to re-queue items
      logger.error('Batch flush failed:', error.message);
      this.stats.errors += itemsToProcess.length;
      // Re-queue failed items (with retry limit)
      itemsToProcess.forEach(item => {
        if (!item.retries || item.retries < 3) {
          item.retries = (item.retries || 0) + 1;
          this.batchQueue.push(item);
        }
      });
    } finally {
      this.isProcessingBatch = false;
    }
  }

  /**
   * Handle security alert actions
   */
  handleSecurityAlert(data, meta) {
    logger.warn('SECURITY ALERT detected in audit log', {
      action: data.action,
      user_id: data.user_id,
      ip_address: data.ip_address,
      resource_type: data.resource_type,
    });

    // Could trigger additional alerting here (email, Slack, PagerDuty, etc.)
  }

  /**
   * Get audit statistics
   */
  getStats() {
    return {
      ...this.stats,
      queueSize: this.batchQueue.length,
      externalLoggers: this.externalLoggers.length,
    };
  }

  /**
   * Get compliance report for a date range
   * @param {Date} startDate - Start of date range
   * @param {Date} endDate - End of date range
   * @returns {Object} Compliance report
   */
  async getComplianceReport(startDate, endDate) {
    try {
      // Total logs in period
      const totalResult = await db
        .select({ count: count() })
        .from(audit_logs)
        .where(between(audit_logs.created_at, startDate, endDate));

      // Logs by action
      const byAction = await db
        .select({
          action: audit_logs.action,
          count: count(),
        })
        .from(audit_logs)
        .where(between(audit_logs.created_at, startDate, endDate))
        .groupBy(audit_logs.action)
        .orderBy(desc(count()));

      // Logs by resource type
      const byResource = await db
        .select({
          resource_type: audit_logs.resource_type,
          count: count(),
        })
        .from(audit_logs)
        .where(between(audit_logs.created_at, startDate, endDate))
        .groupBy(audit_logs.resource_type)
        .orderBy(desc(count()));

      // Logs by status
      const byStatus = await db
        .select({
          status: audit_logs.status,
          count: count(),
        })
        .from(audit_logs)
        .where(between(audit_logs.created_at, startDate, endDate))
        .groupBy(audit_logs.status);

      // Failed operations
      const failedOps = await db
        .select({
          action: audit_logs.action,
          user_id: audit_logs.user_id,
          created_at: audit_logs.created_at,
          ip_address: audit_logs.ip_address,
        })
        .from(audit_logs)
        .where(and(
          between(audit_logs.created_at, startDate, endDate),
          eq(audit_logs.status, 'failure')
        ))
        .limit(100);

      // Unique users
      const uniqueUsers = await db
        .select({ count: sql`COUNT(DISTINCT ${audit_logs.user_id})` })
        .from(audit_logs)
        .where(between(audit_logs.created_at, startDate, endDate));

      return {
        period: { startDate, endDate },
        summary: {
          totalLogs: Number(totalResult[0]?.count || 0),
          uniqueUsers: Number(uniqueUsers[0]?.count || 0),
        },
        byAction: byAction.map(r => ({ action: r.action, count: Number(r.count) })),
        byResource: byResource.map(r => ({ resource_type: r.resource_type, count: Number(r.count) })),
        byStatus: byStatus.map(r => ({ status: r.status, count: Number(r.count) })),
        failedOperations: failedOps,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to generate compliance report: ${error.message}`);
    }
  }

  /**
   * Get user activity report
   * @param {string} userId - User ID
   * @param {Date} startDate - Start of date range
   * @param {Date} endDate - End of date range
   * @returns {Object} User activity report
   */
  async getUserActivityReport(userId, startDate, endDate) {
    try {
      const conditions = [eq(audit_logs.user_id, userId)];
      if (startDate && endDate) {
        conditions.push(between(audit_logs.created_at, startDate, endDate));
      }

      // Total actions
      const totalResult = await db
        .select({ count: count() })
        .from(audit_logs)
        .where(and(...conditions));

      // Actions by type
      const byAction = await db
        .select({
          action: audit_logs.action,
          count: count(),
        })
        .from(audit_logs)
        .where(and(...conditions))
        .groupBy(audit_logs.action)
        .orderBy(desc(count()));

      // Resources accessed
      const resourcesAccessed = await db
        .select({
          resource_type: audit_logs.resource_type,
          count: count(),
        })
        .from(audit_logs)
        .where(and(...conditions))
        .groupBy(audit_logs.resource_type)
        .orderBy(desc(count()));

      // IP addresses used
      const ipAddresses = await db
        .select({
          ip_address: audit_logs.ip_address,
          count: count(),
        })
        .from(audit_logs)
        .where(and(...conditions))
        .groupBy(audit_logs.ip_address);

      // Recent activity
      const recentActivity = await db
        .select()
        .from(audit_logs)
        .where(and(...conditions))
        .orderBy(desc(audit_logs.created_at))
        .limit(50);

      return {
        userId,
        period: { startDate, endDate },
        summary: {
          totalActions: Number(totalResult[0]?.count || 0),
          uniqueIPs: ipAddresses.length,
        },
        byAction: byAction.map(r => ({ action: r.action, count: Number(r.count) })),
        resourcesAccessed: resourcesAccessed.map(r => ({ resource_type: r.resource_type, count: Number(r.count) })),
        ipAddresses: ipAddresses.map(r => ({ ip: r.ip_address, count: Number(r.count) })),
        recentActivity,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to generate user activity report: ${error.message}`);
    }
  }

  /**
   * Get resource access history
   * @param {string} resourceType - Resource type (e.g., 'patients')
   * @param {string} resourceId - Resource ID
   * @returns {Object} Resource access history
   */
  async getResourceAccessHistory(resourceType, resourceId) {
    try {
      const accessLogs = await db
        .select()
        .from(audit_logs)
        .where(and(
          eq(audit_logs.resource_type, resourceType),
          eq(audit_logs.resource_id, resourceId)
        ))
        .orderBy(desc(audit_logs.created_at))
        .limit(500);

      // Unique accessors
      const uniqueUsers = new Set(accessLogs.map(log => log.user_id).filter(Boolean));

      // Access by action type
      const byAction = {};
      accessLogs.forEach(log => {
        byAction[log.action] = (byAction[log.action] || 0) + 1;
      });

      return {
        resourceType,
        resourceId,
        totalAccesses: accessLogs.length,
        uniqueUsers: uniqueUsers.size,
        byAction,
        accessHistory: accessLogs,
        generatedAt: new Date().toISOString(),
      };
    } catch (error) {
      throw new Error(`Failed to get resource access history: ${error.message}`);
    }
  }

  /**
   * Get logs eligible for archival based on retention policy
   * @param {number} retentionYears - Retention period in years (default: 6 for HIPAA)
   * @returns {Object} Archival candidates
   */
  async getArchivalCandidates(retentionYears = 6) {
    const cutoffDate = new Date();
    cutoffDate.setFullYear(cutoffDate.getFullYear() - retentionYears);

    try {
      const candidates = await db
        .select({ count: count() })
        .from(audit_logs)
        .where(lte(audit_logs.created_at, cutoffDate));

      return {
        cutoffDate,
        retentionYears,
        eligibleCount: Number(candidates[0]?.count || 0),
      };
    } catch (error) {
      throw new Error(`Failed to get archival candidates: ${error.message}`);
    }
  }
}

export default new AuditService();
