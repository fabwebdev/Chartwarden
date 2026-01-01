import DataExportService from '../services/DataExportService.js';
import { db } from '../config/db.drizzle.js';
import { patients } from '../db/schemas/patient.schema.js';
import { encounters } from '../db/schemas/encounters.schema.js';
import { medications } from '../db/schemas/medications.schema.js';
import { vital_signs as vitalSigns } from '../db/schemas/vitalSign.schema.js';
import { claims } from '../db/schemas/billing.schema.js';
import { staff_profiles as staff } from '../db/schemas/staffManagement.schema.js';
import { eq, and, gte, lte, desc, sql } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

/**
 * Data Export Controller
 * Handles data export requests with multi-format support
 *
 * Features:
 * - Multi-format export (CSV, JSON, XML, Excel)
 * - Date range filtering
 * - Column selection
 * - Export size estimation
 * - Export history tracking
 * - Rate limiting support
 *
 * Endpoints:
 * - GET /api/data-export/formats - Get supported export formats
 * - POST /api/data-export/estimate - Estimate export size
 * - POST /api/data-export - Execute data export
 * - GET /api/data-export/history - Get export history
 * - DELETE /api/data-export/history - Clear export history
 * - GET /api/data-export/resource-types - Get exportable resource types
 */
class DataExportController {
    // Rate limiting tracking (in-memory, should use Redis in production)
    rateLimitMap = new Map();
    RATE_LIMIT_WINDOW_MS = 60000; // 1 minute
    RATE_LIMIT_MAX_REQUESTS = 10; // Max exports per minute

    // Exportable resource configurations
    resourceConfigs = {
        patients: {
            name: 'Patients',
            description: 'Patient demographic information',
            schema: patients,
            defaultColumns: ['id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'status', 'created_at'],
            availableColumns: [
                'id', 'first_name', 'last_name', 'date_of_birth', 'gender', 'email',
                'phone', 'status', 'mrn', 'ssn_last_four', 'created_at', 'updated_at'
            ],
            dateField: 'created_at',
            permission: 'view:patient'
        },
        encounters: {
            name: 'Encounters',
            description: 'Patient encounter/visit records',
            schema: encounters,
            defaultColumns: ['id', 'patient_id', 'encounter_type', 'encounter_date', 'status', 'created_at'],
            availableColumns: [
                'id', 'patient_id', 'encounter_type', 'encounter_date', 'start_time',
                'end_time', 'location', 'status', 'notes', 'created_at', 'updated_at'
            ],
            dateField: 'encounter_date',
            permission: 'view:clinical_notes'
        },
        medications: {
            name: 'Medications',
            description: 'Medication records and prescriptions',
            schema: medications,
            defaultColumns: ['id', 'patient_id', 'medication_name', 'dosage', 'frequency', 'status', 'start_date'],
            availableColumns: [
                'id', 'patient_id', 'medication_name', 'generic_name', 'dosage', 'dosage_unit',
                'frequency', 'route', 'start_date', 'end_date', 'status', 'prescriber',
                'instructions', 'created_at', 'updated_at'
            ],
            dateField: 'start_date',
            permission: 'view:medications'
        },
        vital_signs: {
            name: 'Vital Signs',
            description: 'Patient vital sign measurements',
            schema: vitalSigns,
            defaultColumns: ['id', 'patient_id', 'measurement_timestamp', 'bp_systolic', 'bp_diastolic', 'heart_rate', 'degrees_fahrenheit'],
            availableColumns: [
                'id', 'patient_id', 'measurement_timestamp', 'bp_systolic', 'bp_diastolic',
                'heart_rate', 'respiratory_rate', 'degrees_fahrenheit', 'pulse_oximetry_percentage', 'body_weight_lbs', 'body_height_inches',
                'pain_score', 'general_notes', 'createdAt', 'updatedAt'
            ],
            dateField: 'measurement_timestamp',
            permission: 'view:vital_signs'
        },
        claims: {
            name: 'Claims',
            description: 'Billing claims data',
            schema: claims,
            defaultColumns: ['id', 'patient_id', 'claim_number', 'claim_status', 'total_charges', 'service_start_date'],
            availableColumns: [
                'id', 'patient_id', 'claim_number', 'claim_type', 'claim_status', 'total_charges',
                'amount_paid', 'amount_due', 'service_start_date', 'service_end_date',
                'submitted_date', 'payer_id', 'created_at', 'updated_at'
            ],
            dateField: 'service_start_date',
            permission: 'view:reports'
        },
        staff: {
            name: 'Staff',
            description: 'Staff member information',
            schema: staff,
            defaultColumns: ['id', 'first_name', 'last_name', 'job_title', 'email', 'employment_status', 'hire_date'],
            availableColumns: [
                'id', 'employee_id', 'first_name', 'last_name', 'job_title', 'email', 'phone', 'employment_status',
                'hire_date', 'department', 'employment_type', 'created_at', 'updated_at'
            ],
            dateField: 'hire_date',
            permission: 'manage:users'
        }
    };

    /**
     * Get supported export formats
     * GET /api/data-export/formats
     */
    async getFormats(request, reply) {
        try {
            const formats = DataExportService.getSupportedFormats();

            return {
                status: 'success',
                data: formats
            };
        } catch (error) {
            logger.error('Error getting export formats:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to get export formats'
            };
        }
    }

    /**
     * Get exportable resource types
     * GET /api/data-export/resource-types
     */
    async getResourceTypes(request, reply) {
        try {
            const resourceTypes = Object.entries(this.resourceConfigs).map(([key, config]) => ({
                id: key,
                name: config.name,
                description: config.description,
                availableColumns: config.availableColumns,
                defaultColumns: config.defaultColumns,
                dateField: config.dateField
            }));

            return {
                status: 'success',
                data: resourceTypes
            };
        } catch (error) {
            logger.error('Error getting resource types:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to get resource types'
            };
        }
    }

    /**
     * Estimate export size
     * POST /api/data-export/estimate
     *
     * Body: {
     *   resourceType: "patients",
     *   format: "csv",
     *   columns: ["id", "first_name", "last_name"], // optional
     *   startDate: "2024-01-01", // optional
     *   endDate: "2024-12-31" // optional
     * }
     */
    async estimateExportSize(request, reply) {
        try {
            const { resourceType, format, columns, startDate, endDate } = request.body;

            // Validate resource type
            if (!this.resourceConfigs[resourceType]) {
                reply.code(400);
                return {
                    status: 'error',
                    message: `Invalid resource type: ${resourceType}. Available types: ${Object.keys(this.resourceConfigs).join(', ')}`
                };
            }

            const config = this.resourceConfigs[resourceType];

            // Build query to count records
            let query = db.select({ count: sql`count(*)` }).from(config.schema);

            // Apply date filters
            const conditions = [];
            if (startDate && config.dateField) {
                conditions.push(gte(config.schema[config.dateField], new Date(startDate)));
            }
            if (endDate && config.dateField) {
                conditions.push(lte(config.schema[config.dateField], new Date(endDate)));
            }

            if (conditions.length > 0) {
                query = query.where(and(...conditions));
            }

            const result = await query;
            const totalCount = parseInt(result[0].count);

            // Get sample data for size estimation
            let sampleQuery = db.select().from(config.schema).limit(100);
            if (conditions.length > 0) {
                sampleQuery = sampleQuery.where(and(...conditions));
            }
            const sampleData = await sampleQuery;

            // Estimate size
            const selectedColumns = columns && columns.length > 0 ? columns : config.defaultColumns;
            const estimation = DataExportService.estimateExportSize(
                sampleData.length > 0 ? sampleData : [{}],
                format,
                selectedColumns
            );

            // Scale up estimation based on actual count
            if (sampleData.length > 0) {
                const scaleFactor = totalCount / sampleData.length;
                estimation.estimatedSizeBytes = Math.ceil(estimation.estimatedSizeBytes * scaleFactor);
                estimation.estimatedSizeFormatted = this._formatBytes(estimation.estimatedSizeBytes);
            }

            estimation.rowCount = totalCount;
            estimation.columnCount = selectedColumns.length;

            // Add warnings
            if (totalCount > 100000) {
                estimation.warning = 'Large dataset: Consider filtering by date range or using pagination for better performance.';
            } else if (estimation.estimatedSizeBytes > 50 * 1024 * 1024) {
                estimation.warning = 'Large export: This may take a while to download.';
            }

            return {
                status: 'success',
                data: estimation
            };
        } catch (error) {
            logger.error('Error estimating export size:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to estimate export size'
            };
        }
    }

    /**
     * Execute data export
     * POST /api/data-export
     *
     * Body: {
     *   resourceType: "patients",
     *   format: "csv" | "json" | "xml" | "excel",
     *   columns: ["id", "first_name", "last_name"], // optional
     *   startDate: "2024-01-01", // optional
     *   endDate: "2024-12-31", // optional
     *   filename: "my-export", // optional custom filename
     *   options: { // optional format-specific options
     *     pretty: true, // for JSON/XML
     *     delimiter: "," // for CSV
     *   }
     * }
     */
    async exportData(request, reply) {
        try {
            const {
                resourceType,
                format,
                columns,
                startDate,
                endDate,
                filename,
                options = {}
            } = request.body;

            // Rate limiting check
            const userId = request.user?.id || 'anonymous';
            if (!this._checkRateLimit(userId)) {
                reply.code(429);
                return {
                    status: 'error',
                    message: 'Rate limit exceeded. Please wait before making another export request.',
                    retryAfter: 60
                };
            }

            // Validate resource type
            if (!this.resourceConfigs[resourceType]) {
                reply.code(400);
                return {
                    status: 'error',
                    message: `Invalid resource type: ${resourceType}. Available types: ${Object.keys(this.resourceConfigs).join(', ')}`
                };
            }

            // Validate format
            const validFormats = ['csv', 'json', 'xml', 'excel'];
            if (!validFormats.includes(format)) {
                reply.code(400);
                return {
                    status: 'error',
                    message: `Invalid format: ${format}. Supported formats: ${validFormats.join(', ')}`
                };
            }

            const config = this.resourceConfigs[resourceType];

            // Build query
            let query = db.select().from(config.schema);

            // Apply date filters
            const conditions = [];
            if (startDate && config.dateField) {
                conditions.push(gte(config.schema[config.dateField], new Date(startDate)));
            }
            if (endDate && config.dateField) {
                conditions.push(lte(config.schema[config.dateField], new Date(endDate)));
            }

            if (conditions.length > 0) {
                query = query.where(and(...conditions));
            }

            // Order by date field descending
            if (config.dateField && config.schema[config.dateField]) {
                query = query.orderBy(desc(config.schema[config.dateField]));
            }

            // Execute query with limit for safety
            const MAX_EXPORT_ROWS = 50000;
            query = query.limit(MAX_EXPORT_ROWS);

            const data = await query;

            // Check for empty result
            if (data.length === 0) {
                reply.code(200);
                return {
                    status: 'success',
                    message: 'No records match the specified criteria',
                    data: {
                        isEmpty: true,
                        rowCount: 0
                    }
                };
            }

            // Prepare export options
            const selectedColumns = columns && columns.length > 0 ? columns : config.defaultColumns;
            const exportOptions = {
                ...options,
                columns: selectedColumns,
                resourceType,
                userId,
                filename: filename || resourceType,
                title: `${config.name} Export`,
                subtitle: this._buildSubtitle(startDate, endDate)
            };

            // Execute export
            const exportResult = await DataExportService.exportData(data, format, exportOptions);

            if (exportResult.isEmpty) {
                return {
                    status: 'success',
                    message: 'No records match the specified criteria',
                    data: {
                        isEmpty: true,
                        rowCount: 0
                    }
                };
            }

            // Set response headers
            reply
                .header('Content-Type', exportResult.mimeType)
                .header('Content-Disposition', `attachment; filename="${exportResult.filename}"`)
                .header('Content-Length', exportResult.buffer.length)
                .header('X-Export-Id', exportResult.exportId)
                .header('X-Export-Row-Count', exportResult.rowCount)
                .header('X-Export-Size', exportResult.sizeFormatted);

            return reply.send(exportResult.buffer);
        } catch (error) {
            logger.error('Error executing data export:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export data'
            };
        }
    }

    /**
     * Get export history
     * GET /api/data-export/history
     *
     * Query: format, resourceType, limit
     */
    async getExportHistory(request, reply) {
        try {
            const { format, resourceType, limit = 50 } = request.query;
            const userId = request.user?.id;

            const history = DataExportService.getExportHistory({
                userId,
                format,
                resourceType,
                limit: parseInt(limit)
            });

            return {
                status: 'success',
                data: history
            };
        } catch (error) {
            logger.error('Error getting export history:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to get export history'
            };
        }
    }

    /**
     * Clear export history
     * DELETE /api/data-export/history
     */
    async clearExportHistory(request, reply) {
        try {
            const userId = request.user?.id;

            // Only clear user's own history unless admin
            DataExportService.clearExportHistory(userId);

            return {
                status: 'success',
                message: 'Export history cleared'
            };
        } catch (error) {
            logger.error('Error clearing export history:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to clear export history'
            };
        }
    }

    /**
     * Check rate limit for user
     * @private
     */
    _checkRateLimit(userId) {
        const now = Date.now();
        const windowStart = now - this.RATE_LIMIT_WINDOW_MS;

        // Get or initialize user's request timestamps
        let userRequests = this.rateLimitMap.get(userId) || [];

        // Filter out old requests
        userRequests = userRequests.filter(timestamp => timestamp > windowStart);

        // Check if limit exceeded
        if (userRequests.length >= this.RATE_LIMIT_MAX_REQUESTS) {
            return false;
        }

        // Record this request
        userRequests.push(now);
        this.rateLimitMap.set(userId, userRequests);

        return true;
    }

    /**
     * Build subtitle for export
     * @private
     */
    _buildSubtitle(startDate, endDate) {
        if (startDate && endDate) {
            return `Date Range: ${startDate} to ${endDate}`;
        } else if (startDate) {
            return `From: ${startDate}`;
        } else if (endDate) {
            return `Until: ${endDate}`;
        }
        return `Exported: ${new Date().toLocaleDateString()}`;
    }

    /**
     * Format bytes to human-readable string
     * @private
     */
    _formatBytes(bytes) {
        if (bytes === 0) return '0 B';
        const sizes = ['B', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(1024));
        return `${(bytes / Math.pow(1024, i)).toFixed(2)} ${sizes[i]}`;
    }
}

export default new DataExportController();
