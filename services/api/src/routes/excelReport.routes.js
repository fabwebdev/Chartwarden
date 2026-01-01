import controller from '../controllers/ExcelReport.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Excel Report Routes
 * Provides Excel export endpoints for all report types
 *
 * Features:
 * - Multiple worksheet Excel exports
 * - Professional formatting with styles
 * - All report types supported (Census, Billing, Staff, QAPI, Analytics)
 * - Streaming file downloads
 *
 * Endpoints:
 * - GET /api/excel-reports/types - Get available report types
 * - GET /api/excel-reports/census - Export census report
 * - GET /api/excel-reports/ar-aging - Export AR aging report
 * - GET /api/excel-reports/billing - Export billing report
 * - GET /api/excel-reports/staff - Export staff report
 * - GET /api/excel-reports/qapi - Export QAPI report
 * - GET /api/excel-reports/executive-dashboard - Export executive dashboard
 * - POST /api/excel-reports/analytics - Export analytics report
 * - POST /api/excel-reports/custom - Export custom report
 */
export default async function excelReportRoutes(fastify, options) {

    // Get available report types
    fastify.get('/excel-reports/types', {
        preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
    }, controller.getReportTypes.bind(controller));

    // Export Census Report
    fastify.get('/excel-reports/census', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_PATIENT_DETAILS,
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.exportCensusReport.bind(controller));

    // Export AR Aging Report
    fastify.get('/excel-reports/ar-aging', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.exportARAgingReport.bind(controller));

    // Export Billing Report (multiple sheets)
    fastify.get('/excel-reports/billing', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.exportBillingReport.bind(controller));

    // Export Staff Report (multiple sheets)
    fastify.get('/excel-reports/staff', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.exportStaffReport.bind(controller));

    // Export QAPI Report (multiple sheets)
    fastify.get('/excel-reports/qapi', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.exportQAPIReport.bind(controller));

    // Export Executive Dashboard
    fastify.get('/excel-reports/executive-dashboard', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.exportExecutiveDashboard.bind(controller));

    // Export Analytics Report
    fastify.post('/excel-reports/analytics', {
        preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
    }, controller.exportAnalyticsReport.bind(controller));

    // Export Custom Report
    fastify.post('/excel-reports/custom', {
        preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
    }, controller.exportCustomReport.bind(controller));
}
