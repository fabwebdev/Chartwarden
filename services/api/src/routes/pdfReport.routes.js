import controller from '../controllers/PdfReport.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * PDF Report Routes
 * Provides PDF export endpoints for all report types using Puppeteer
 *
 * Features:
 * - HTML template-based PDF generation with Puppeteer
 * - Professional styling and formatting
 * - Multiple report types supported (Census, Billing, Patient Chart, etc.)
 * - Customizable paper size, orientation, and margins
 * - Streaming file downloads and inline viewing
 *
 * Query Parameters (common to all endpoints):
 * - paper_size: Letter, Legal, A4, A3, Tabloid (default: Letter)
 * - orientation: portrait, landscape (default: portrait)
 * - print_background: true/false (default: true)
 * - display_header_footer: true/false (default: true)
 * - scale: 0.1-2.0 (default: 1)
 *
 * Endpoints:
 * - GET /api/pdf-reports/types - Get available report types
 * - GET /api/pdf-reports/patient/:patientId - Export patient chart
 * - GET /api/pdf-reports/census - Export census report
 * - GET /api/pdf-reports/billing - Export billing report
 * - GET /api/pdf-reports/executive-dashboard - Export executive dashboard
 * - GET /api/pdf-reports/view/:type - View PDF inline (without download)
 * - POST /api/pdf-reports/analytics - Export analytics report
 * - POST /api/pdf-reports/custom - Export custom report with provided data
 * - POST /api/pdf-reports/raw - Export raw HTML to PDF
 */
export default async function pdfReportRoutes(fastify, options) {

    // ==================== READ ENDPOINTS ====================

    // Get available report types
    fastify.get('/pdf-reports/types', {
        preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
    }, controller.getReportTypes.bind(controller));

    // Export Patient Chart to PDF
    fastify.get('/pdf-reports/patient/:patientId', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_PATIENT_DETAILS,
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.exportPatientChart.bind(controller));

    // Export Census Report to PDF
    fastify.get('/pdf-reports/census', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_PATIENT_DETAILS,
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.exportCensusReport.bind(controller));

    // Export Billing Report to PDF
    fastify.get('/pdf-reports/billing', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.exportBillingReport.bind(controller));

    // Export Executive Dashboard to PDF
    fastify.get('/pdf-reports/executive-dashboard', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.exportExecutiveDashboard.bind(controller));

    // View PDF inline (without download prompt)
    fastify.get('/pdf-reports/view/:type', {
        preHandler: [requireAnyPermission(
            PERMISSIONS.VIEW_CLINICAL_NOTES,
            PERMISSIONS.VIEW_REPORTS
        )]
    }, controller.viewPdf.bind(controller));

    // ==================== WRITE ENDPOINTS ====================

    // Export Analytics Report to PDF
    fastify.post('/pdf-reports/analytics', {
        preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
    }, controller.exportAnalyticsReport.bind(controller));

    // Export Custom Report to PDF
    fastify.post('/pdf-reports/custom', {
        preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
    }, controller.exportCustomReport.bind(controller));

    // Export Raw HTML to PDF
    fastify.post('/pdf-reports/raw', {
        preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
    }, controller.exportRawHtml.bind(controller));
}
