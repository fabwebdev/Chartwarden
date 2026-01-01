import PuppeteerPdfService from '../services/PuppeteerPdfService.js';
import ReportsController from './Reports.controller.js';
import AnalyticsService from '../services/Analytics.service.js';
import { logger } from '../utils/logger.js';

/**
 * PDF Report Controller
 * Provides PDF export endpoints for all report types using Puppeteer
 *
 * Features:
 * - HTML template-based PDF generation with Puppeteer
 * - Professional styling and formatting
 * - Multiple report types supported (Census, Billing, Patient Chart, etc.)
 * - Customizable paper size, orientation, and margins
 * - Streaming file downloads
 *
 * Endpoints:
 * - GET /api/pdf-reports/types - Get available report types
 * - GET /api/pdf-reports/patient/:patientId - Export patient chart
 * - GET /api/pdf-reports/census - Export census report
 * - GET /api/pdf-reports/billing - Export billing report
 * - GET /api/pdf-reports/executive-dashboard - Export executive dashboard
 * - POST /api/pdf-reports/custom - Export custom report with provided data
 * - POST /api/pdf-reports/raw - Export raw HTML to PDF
 */
class PdfReportController {

    /**
     * Get available PDF report types
     * GET /api/pdf-reports/types
     *
     * Response: List of available report types with descriptions
     */
    async getReportTypes(request, reply) {
        const reportTypes = PuppeteerPdfService.getAvailableReportTypes();

        const enrichedTypes = reportTypes.map(type => ({
            ...type,
            endpoint: this._getEndpointForType(type.type),
            supportedOptions: {
                paperSize: ['Letter', 'Legal', 'A4', 'A3', 'Tabloid'],
                orientation: ['portrait', 'landscape'],
                printBackground: true,
                displayHeaderFooter: true
            }
        }));

        reply.code(200);
        return {
            status: 'success',
            data: enrichedTypes
        };
    }

    /**
     * Get endpoint path for report type
     * @private
     */
    _getEndpointForType(type) {
        const endpoints = {
            'patient-chart': 'GET /api/pdf-reports/patient/:patientId',
            'census': 'GET /api/pdf-reports/census',
            'billing': 'GET /api/pdf-reports/billing',
            'executive-dashboard': 'GET /api/pdf-reports/executive-dashboard',
            'custom': 'POST /api/pdf-reports/custom',
            'raw-html': 'POST /api/pdf-reports/raw'
        };
        return endpoints[type] || 'Unknown';
    }

    /**
     * Parse PDF options from query parameters
     * @private
     */
    _parsePdfOptions(query) {
        return {
            paperSize: query.paper_size || query.paperSize || 'Letter',
            orientation: query.orientation || 'portrait',
            printBackground: query.print_background !== 'false',
            displayHeaderFooter: query.display_header_footer !== 'false',
            scale: query.scale ? parseFloat(query.scale) : 1,
            margin: query.margin ? JSON.parse(query.margin) : undefined
        };
    }

    /**
     * Export Patient Chart to PDF
     * GET /api/pdf-reports/patient/:patientId
     *
     * Query: paper_size, orientation, print_background
     * Response: PDF file download
     */
    async exportPatientChart(request, reply) {
        try {
            const { patientId } = request.params;

            if (!patientId) {
                reply.code(400);
                return {
                    status: 'error',
                    message: 'Patient ID is required'
                };
            }

            // Get patient data from the API
            const mockRequest = {
                ...request,
                params: { id: patientId }
            };
            const mockReply = {
                code: () => mockReply
            };

            // Import PatientController dynamically to avoid circular dependencies
            const { default: PatientController } = await import('./patient/Patient.controller.js');
            const patientResult = await PatientController.show(mockRequest, mockReply);

            if (!patientResult || patientResult.status === 'error') {
                reply.code(404);
                return {
                    status: 'error',
                    message: patientResult?.message || 'Patient not found'
                };
            }

            const patientData = patientResult.data || patientResult;
            const pdfOptions = this._parsePdfOptions(request.query);

            const buffer = await PuppeteerPdfService.generatePatientChartPdf(patientData, pdfOptions);

            const patientName = `${patientData.firstName || ''}-${patientData.lastName || ''}`.replace(/\s+/g, '-').toLowerCase() || 'patient';
            const filename = `patient-chart-${patientName}-${new Date().toISOString().split('T')[0]}.pdf`;

            reply
                .header('Content-Type', 'application/pdf')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting patient chart PDF:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export patient chart PDF'
            };
        }
    }

    /**
     * Export Census Report to PDF
     * GET /api/pdf-reports/census
     *
     * Query: level_of_care (optional), paper_size, orientation
     * Response: PDF file download
     */
    async exportCensusReport(request, reply) {
        try {
            const mockReply = {
                code: () => mockReply
            };

            const censusResult = await ReportsController.getCurrentCensus(request, mockReply);

            if (censusResult.status !== 200) {
                reply.code(censusResult.status || 500);
                return {
                    status: 'error',
                    message: censusResult.message || 'Failed to retrieve census data'
                };
            }

            const pdfOptions = this._parsePdfOptions(request.query);
            const buffer = await PuppeteerPdfService.generateCensusReportPdf(censusResult.data, {
                ...pdfOptions,
                orientation: pdfOptions.orientation || 'landscape'
            });

            const filename = `census-report-${new Date().toISOString().split('T')[0]}.pdf`;

            reply
                .header('Content-Type', 'application/pdf')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting census report PDF:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export census report PDF'
            };
        }
    }

    /**
     * Export Billing Report to PDF
     * GET /api/pdf-reports/billing
     *
     * Query: from_date, to_date, paper_size, orientation
     * Response: PDF file download
     */
    async exportBillingReport(request, reply) {
        try {
            const mockReply = {
                code: () => mockReply
            };

            // Get all billing-related reports in parallel
            const [pendingClaimsResult, arAgingResult, revenueResult, unbilledResult] = await Promise.all([
                ReportsController.getPendingClaims(request, mockReply),
                ReportsController.getARAgingSummary(request, mockReply),
                ReportsController.getRevenueByPayer(request, mockReply),
                ReportsController.getUnbilledPeriods(request, mockReply)
            ]);

            const billingData = {
                pendingClaims: pendingClaimsResult.status === 200 ? pendingClaimsResult.data : null,
                arAging: arAgingResult.status === 200 ? arAgingResult.data : null,
                revenueByPayer: revenueResult.status === 200 ? revenueResult.data : null,
                unbilledPeriods: unbilledResult.status === 200 ? unbilledResult.data : null
            };

            const { from_date, to_date } = request.query;
            const pdfOptions = this._parsePdfOptions(request.query);

            const buffer = await PuppeteerPdfService.generateBillingReportPdf(billingData, {
                ...pdfOptions,
                fromDate: from_date,
                toDate: to_date
            });

            const filename = `billing-report-${new Date().toISOString().split('T')[0]}.pdf`;

            reply
                .header('Content-Type', 'application/pdf')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting billing report PDF:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export billing report PDF'
            };
        }
    }

    /**
     * Export Executive Dashboard to PDF
     * GET /api/pdf-reports/executive-dashboard
     *
     * Query: paper_size, orientation
     * Response: PDF file download
     */
    async exportExecutiveDashboard(request, reply) {
        try {
            const mockReply = {
                code: () => mockReply
            };

            const dashboardResult = await ReportsController.getExecutiveDashboard(request, mockReply);

            if (dashboardResult.status !== 200) {
                reply.code(dashboardResult.status || 500);
                return {
                    status: 'error',
                    message: dashboardResult.message || 'Failed to retrieve dashboard data'
                };
            }

            const pdfOptions = this._parsePdfOptions(request.query);
            const buffer = await PuppeteerPdfService.generateExecutiveDashboardPdf(dashboardResult.data, pdfOptions);

            const filename = `executive-dashboard-${new Date().toISOString().split('T')[0]}.pdf`;

            reply
                .header('Content-Type', 'application/pdf')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting executive dashboard PDF:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export executive dashboard PDF'
            };
        }
    }

    /**
     * Export Custom Report to PDF
     * POST /api/pdf-reports/custom
     *
     * Body: {
     *   title: "Report Title",
     *   subtitle: "Optional subtitle",
     *   sections: [
     *     { type: "table", title: "Section Title", columns: [...], data: [...] },
     *     { type: "grid", title: "Section Title", items: [{label, value}] },
     *     { type: "info", title: "Section Title", rows: [{label, value}] },
     *     { type: "html", title: "Section Title", content: "<p>HTML content</p>" }
     *   ],
     *   options: { paperSize, orientation, ... }
     * }
     * Response: PDF file download
     */
    async exportCustomReport(request, reply) {
        try {
            const { title, subtitle, sections, options = {}, filename } = request.body;

            if (!title) {
                reply.code(400);
                return {
                    status: 'error',
                    message: 'Report title is required'
                };
            }

            if (!sections || !Array.isArray(sections) || sections.length === 0) {
                reply.code(400);
                return {
                    status: 'error',
                    message: 'Report must have at least one section'
                };
            }

            // Validate sections
            for (const section of sections) {
                if (!section.type) {
                    reply.code(400);
                    return {
                        status: 'error',
                        message: 'Each section must have a type (table, grid, info, or html)'
                    };
                }

                if (section.type === 'table' && (!section.data || !Array.isArray(section.data))) {
                    reply.code(400);
                    return {
                        status: 'error',
                        message: 'Table sections must have a data array'
                    };
                }

                if (section.type === 'grid' && (!section.items || !Array.isArray(section.items))) {
                    reply.code(400);
                    return {
                        status: 'error',
                        message: 'Grid sections must have an items array'
                    };
                }

                if (section.type === 'info' && (!section.rows || !Array.isArray(section.rows))) {
                    reply.code(400);
                    return {
                        status: 'error',
                        message: 'Info sections must have a rows array'
                    };
                }

                if (section.type === 'html' && !section.content) {
                    reply.code(400);
                    return {
                        status: 'error',
                        message: 'HTML sections must have content'
                    };
                }
            }

            const pdfOptions = {
                ...this._parsePdfOptions(request.query),
                ...options
            };

            const buffer = await PuppeteerPdfService.generateCustomReportPdf(
                { title, subtitle, sections },
                pdfOptions
            );

            const outputFilename = filename || `${title.toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().split('T')[0]}.pdf`;

            reply
                .header('Content-Type', 'application/pdf')
                .header('Content-Disposition', `attachment; filename="${outputFilename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting custom report PDF:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export custom report PDF'
            };
        }
    }

    /**
     * Export Raw HTML to PDF
     * POST /api/pdf-reports/raw
     *
     * Body: {
     *   html: "<html>...</html>",
     *   options: { paperSize, orientation, wrapHtml: false, ... },
     *   filename: "output.pdf"
     * }
     * Response: PDF file download
     */
    async exportRawHtml(request, reply) {
        try {
            const { html, options = {}, filename } = request.body;

            if (!html) {
                reply.code(400);
                return {
                    status: 'error',
                    message: 'HTML content is required'
                };
            }

            const pdfOptions = {
                ...this._parsePdfOptions(request.query),
                ...options
            };

            const buffer = await PuppeteerPdfService.generateFromRawHtml(html, pdfOptions);

            const outputFilename = filename || `document-${new Date().toISOString().split('T')[0]}.pdf`;

            reply
                .header('Content-Type', 'application/pdf')
                .header('Content-Disposition', `attachment; filename="${outputFilename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting raw HTML to PDF:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export HTML to PDF'
            };
        }
    }

    /**
     * Export Analytics Report to PDF
     * POST /api/pdf-reports/analytics
     *
     * Body: { report_type: "clean_claim_rate", start_date: "2024-01-01", end_date: "2025-01-15" }
     * Response: PDF file download
     */
    async exportAnalyticsReport(request, reply) {
        try {
            const { report_type, start_date, end_date } = request.body;

            if (!report_type) {
                reply.code(400);
                return {
                    status: 'error',
                    message: 'report_type is required in request body'
                };
            }

            const validReportTypes = [
                'clean_claim_rate',
                'days_to_payment',
                'denial_rate_by_payer',
                'net_collection_rate',
                'ar_aging_trend'
            ];

            if (!validReportTypes.includes(report_type)) {
                reply.code(400);
                return {
                    status: 'error',
                    message: `Invalid report_type. Must be one of: ${validReportTypes.join(', ')}`
                };
            }

            const startDate = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 1));
            const endDate = end_date ? new Date(end_date) : new Date();

            // Get the data based on report type
            let data;
            let reportTitle;
            switch (report_type) {
                case 'clean_claim_rate':
                    data = await AnalyticsService.getCleanClaimRateTimeSeries(startDate, endDate);
                    reportTitle = 'Clean Claim Rate Analysis';
                    break;
                case 'days_to_payment':
                    data = await AnalyticsService.getDaysToPaymentTimeSeries(startDate, endDate);
                    reportTitle = 'Days to Payment Trend';
                    break;
                case 'denial_rate_by_payer':
                    data = await AnalyticsService.getDenialRateByPayer(startDate, endDate);
                    reportTitle = 'Denial Rate by Payer';
                    break;
                case 'net_collection_rate':
                    data = await AnalyticsService.getNetCollectionRateWithTrend(startDate, endDate);
                    reportTitle = 'Net Collection Rate Trend';
                    break;
                case 'ar_aging_trend':
                    data = await AnalyticsService.getARAgingTrend(startDate, endDate);
                    reportTitle = 'AR Aging Trend Analysis';
                    break;
            }

            // Build sections based on data structure
            const sections = [];
            const dataPoints = data.data_points || data.trend_by_month || (Array.isArray(data) ? data : []);

            if (dataPoints.length > 0) {
                const columns = Object.keys(dataPoints[0]).map(key => ({
                    header: key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
                    key: key,
                    type: key.includes('rate') || key.includes('percent') ? 'percent' :
                          key.includes('amount') || key.includes('balance') || key.includes('ar') ? 'currency' :
                          key.includes('date') ? 'date' : 'text'
                }));

                sections.push({
                    type: 'table',
                    title: 'Data',
                    columns: columns,
                    data: dataPoints
                });
            }

            const pdfOptions = this._parsePdfOptions(request.query);

            const buffer = await PuppeteerPdfService.generateCustomReportPdf({
                title: reportTitle,
                subtitle: `${startDate.toISOString().split('T')[0]} to ${endDate.toISOString().split('T')[0]}`,
                sections
            }, pdfOptions);

            const filename = `${report_type}-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.pdf`;

            reply
                .header('Content-Type', 'application/pdf')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting analytics report PDF:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export analytics report PDF'
            };
        }
    }

    /**
     * Stream PDF directly (for inline viewing)
     * GET /api/pdf-reports/view/:type
     *
     * Same as download but with Content-Disposition: inline
     */
    async viewPdf(request, reply) {
        try {
            const { type } = request.params;

            let buffer;
            let filename;
            const pdfOptions = this._parsePdfOptions(request.query);

            switch (type) {
                case 'census':
                    const mockReply = { code: () => mockReply };
                    const censusResult = await ReportsController.getCurrentCensus(request, mockReply);
                    if (censusResult.status !== 200) {
                        reply.code(censusResult.status || 500);
                        return { status: 'error', message: censusResult.message };
                    }
                    buffer = await PuppeteerPdfService.generateCensusReportPdf(censusResult.data, {
                        ...pdfOptions,
                        orientation: 'landscape'
                    });
                    filename = 'census-report.pdf';
                    break;

                case 'executive-dashboard':
                    const mockReply2 = { code: () => mockReply2 };
                    const dashboardResult = await ReportsController.getExecutiveDashboard(request, mockReply2);
                    if (dashboardResult.status !== 200) {
                        reply.code(dashboardResult.status || 500);
                        return { status: 'error', message: dashboardResult.message };
                    }
                    buffer = await PuppeteerPdfService.generateExecutiveDashboardPdf(dashboardResult.data, pdfOptions);
                    filename = 'executive-dashboard.pdf';
                    break;

                default:
                    reply.code(400);
                    return {
                        status: 'error',
                        message: `Unknown report type: ${type}. Supported types: census, executive-dashboard`
                    };
            }

            reply
                .header('Content-Type', 'application/pdf')
                .header('Content-Disposition', `inline; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error viewing PDF:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to generate PDF for viewing'
            };
        }
    }
}

export default new PdfReportController();
