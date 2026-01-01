import controller from '../controllers/DataExport.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Data Export Routes
 * Provides comprehensive data export functionality with multi-format support
 *
 * Features:
 * - Multi-format export (CSV, JSON, XML, Excel)
 * - Date range filtering
 * - Column selection
 * - Export size estimation
 * - Export history tracking
 * - Rate limiting
 *
 * Endpoints:
 * - GET /api/data-export/formats - Get supported export formats
 * - GET /api/data-export/resource-types - Get exportable resource types
 * - POST /api/data-export/estimate - Estimate export size before download
 * - POST /api/data-export - Execute data export and download
 * - GET /api/data-export/history - Get user's export history
 * - DELETE /api/data-export/history - Clear user's export history
 */
export default async function dataExportRoutes(fastify, options) {

    /**
     * Get supported export formats
     * GET /api/data-export/formats
     *
     * Returns list of supported formats (CSV, JSON, XML, Excel) with metadata
     */
    fastify.get('/data-export/formats', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_REPORTS,
            PERMISSIONS.VIEW_PATIENT,
            PERMISSIONS.VIEW_CLINICAL_NOTES
        )],
        schema: {
            description: 'Get list of supported export formats',
            tags: ['Data Export'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    mimeType: { type: 'string' },
                                    extension: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, controller.getFormats.bind(controller));

    /**
     * Get exportable resource types
     * GET /api/data-export/resource-types
     *
     * Returns list of data types that can be exported with available columns
     */
    fastify.get('/data-export/resource-types', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_REPORTS,
            PERMISSIONS.VIEW_PATIENT,
            PERMISSIONS.VIEW_CLINICAL_NOTES
        )],
        schema: {
            description: 'Get list of exportable resource types with available columns',
            tags: ['Data Export'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    name: { type: 'string' },
                                    description: { type: 'string' },
                                    availableColumns: { type: 'array', items: { type: 'string' } },
                                    defaultColumns: { type: 'array', items: { type: 'string' } },
                                    dateField: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, controller.getResourceTypes.bind(controller));

    /**
     * Estimate export size
     * POST /api/data-export/estimate
     *
     * Body: { resourceType, format, columns?, startDate?, endDate? }
     * Returns estimated size and row count before actually exporting
     */
    fastify.post('/data-export/estimate', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_REPORTS,
            PERMISSIONS.VIEW_PATIENT,
            PERMISSIONS.VIEW_CLINICAL_NOTES
        )],
        schema: {
            description: 'Estimate export size before downloading',
            tags: ['Data Export'],
            body: {
                type: 'object',
                required: ['resourceType', 'format'],
                properties: {
                    resourceType: {
                        type: 'string',
                        description: 'Type of data to export (patients, encounters, medications, vital_signs, claims, staff)'
                    },
                    format: {
                        type: 'string',
                        enum: ['csv', 'json', 'xml', 'excel'],
                        description: 'Export format'
                    },
                    columns: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Specific columns to include (optional)'
                    },
                    startDate: {
                        type: 'string',
                        format: 'date',
                        description: 'Start date for filtering (optional)'
                    },
                    endDate: {
                        type: 'string',
                        format: 'date',
                        description: 'End date for filtering (optional)'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        data: {
                            type: 'object',
                            properties: {
                                rowCount: { type: 'number' },
                                columnCount: { type: 'number' },
                                estimatedSizeBytes: { type: 'number' },
                                estimatedSizeFormatted: { type: 'string' },
                                warning: { type: 'string' }
                            }
                        }
                    }
                }
            }
        }
    }, controller.estimateExportSize.bind(controller));

    /**
     * Execute data export
     * POST /api/data-export
     *
     * Body: { resourceType, format, columns?, startDate?, endDate?, filename?, options? }
     * Returns the exported file as a download
     */
    fastify.post('/data-export', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_REPORTS,
            PERMISSIONS.GENERATE_REPORTS
        )],
        schema: {
            description: 'Export data in specified format',
            tags: ['Data Export'],
            body: {
                type: 'object',
                required: ['resourceType', 'format'],
                properties: {
                    resourceType: {
                        type: 'string',
                        description: 'Type of data to export'
                    },
                    format: {
                        type: 'string',
                        enum: ['csv', 'json', 'xml', 'excel'],
                        description: 'Export format'
                    },
                    columns: {
                        type: 'array',
                        items: { type: 'string' },
                        description: 'Specific columns to include'
                    },
                    startDate: {
                        type: 'string',
                        format: 'date',
                        description: 'Start date for filtering'
                    },
                    endDate: {
                        type: 'string',
                        format: 'date',
                        description: 'End date for filtering'
                    },
                    filename: {
                        type: 'string',
                        description: 'Custom filename (without extension)'
                    },
                    options: {
                        type: 'object',
                        description: 'Format-specific options',
                        properties: {
                            pretty: { type: 'boolean', description: 'Pretty print output (JSON/XML)' },
                            delimiter: { type: 'string', description: 'CSV delimiter character' },
                            includeHeader: { type: 'boolean', description: 'Include header row (CSV)' }
                        }
                    }
                }
            }
        }
    }, controller.exportData.bind(controller));

    /**
     * Get export history
     * GET /api/data-export/history
     *
     * Query: format?, resourceType?, limit?
     * Returns user's export history
     */
    fastify.get('/data-export/history', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_REPORTS,
            PERMISSIONS.VIEW_PATIENT
        )],
        schema: {
            description: 'Get export history for current user',
            tags: ['Data Export'],
            querystring: {
                type: 'object',
                properties: {
                    format: {
                        type: 'string',
                        enum: ['csv', 'json', 'xml', 'excel'],
                        description: 'Filter by format'
                    },
                    resourceType: {
                        type: 'string',
                        description: 'Filter by resource type'
                    },
                    limit: {
                        type: 'integer',
                        minimum: 1,
                        maximum: 100,
                        default: 50,
                        description: 'Maximum number of records to return'
                    }
                }
            },
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        data: {
                            type: 'array',
                            items: {
                                type: 'object',
                                properties: {
                                    id: { type: 'string' },
                                    timestamp: { type: 'string' },
                                    format: { type: 'string' },
                                    filename: { type: 'string' },
                                    rowCount: { type: 'number' },
                                    sizeBytes: { type: 'number' },
                                    sizeFormatted: { type: 'string' },
                                    durationMs: { type: 'number' },
                                    resourceType: { type: 'string' },
                                    status: { type: 'string' }
                                }
                            }
                        }
                    }
                }
            }
        }
    }, controller.getExportHistory.bind(controller));

    /**
     * Clear export history
     * DELETE /api/data-export/history
     *
     * Clears export history for the current user
     */
    fastify.delete('/data-export/history', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_REPORTS,
            PERMISSIONS.VIEW_PATIENT
        )],
        schema: {
            description: 'Clear export history for current user',
            tags: ['Data Export'],
            response: {
                200: {
                    type: 'object',
                    properties: {
                        status: { type: 'string' },
                        message: { type: 'string' }
                    }
                }
            }
        }
    }, controller.clearExportHistory.bind(controller));
}
