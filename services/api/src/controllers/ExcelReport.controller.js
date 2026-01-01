import ExcelService from '../services/ExcelService.js';
import ReportsController from './Reports.controller.js';
import AnalyticsService from '../services/Analytics.service.js';
import { logger } from '../utils/logger.js';

/**
 * Excel Report Controller
 * Provides Excel export endpoints for all report types
 *
 * Features:
 * - Multiple worksheet Excel exports
 * - Professional formatting with styles
 * - All report types supported (Census, Billing, Staff, QAPI, Analytics)
 * - Streaming file downloads
 *
 * Endpoints:
 * - GET /api/excel-reports/census - Export census report
 * - GET /api/excel-reports/billing - Export billing report
 * - GET /api/excel-reports/staff - Export staff report
 * - GET /api/excel-reports/qapi - Export QAPI report
 * - GET /api/excel-reports/executive-dashboard - Export executive dashboard
 * - POST /api/excel-reports/analytics - Export analytics report
 * - POST /api/excel-reports/custom - Export custom report with provided data
 */
class ExcelReportController {

    /**
     * Export Census Report to Excel
     * GET /api/excel-reports/census
     *
     * Query: level_of_care (optional filter)
     * Response: Excel file download
     */
    async exportCensusReport(request, reply) {
        try {
            // Get census data using the existing reports controller
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

            const buffer = await ExcelService.generateCensusReport(censusResult.data);

            const filename = `census-report-${new Date().toISOString().split('T')[0]}.xlsx`;

            reply
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting census report:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export census report'
            };
        }
    }

    /**
     * Export AR Aging Report to Excel
     * GET /api/excel-reports/ar-aging
     *
     * Response: Excel file download
     */
    async exportARAgingReport(request, reply) {
        try {
            const mockReply = {
                code: () => mockReply
            };

            const arResult = await ReportsController.getARAgingSummary(request, mockReply);

            if (arResult.status !== 200) {
                reply.code(arResult.status || 500);
                return {
                    status: 'error',
                    message: arResult.message || 'Failed to retrieve AR aging data'
                };
            }

            const buffer = await ExcelService.generateARAgingReport(arResult.data);

            const filename = `ar-aging-report-${new Date().toISOString().split('T')[0]}.xlsx`;

            reply
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting AR aging report:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export AR aging report'
            };
        }
    }

    /**
     * Export Billing Report to Excel (multiple sheets)
     * GET /api/excel-reports/billing
     *
     * Query: from_date, to_date (optional)
     * Response: Excel file download with multiple worksheets
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
            const buffer = await ExcelService.generateBillingReport(billingData, {
                fromDate: from_date,
                toDate: to_date
            });

            const filename = `billing-report-${new Date().toISOString().split('T')[0]}.xlsx`;

            reply
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting billing report:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export billing report'
            };
        }
    }

    /**
     * Export Staff Report to Excel (multiple sheets)
     * GET /api/excel-reports/staff
     *
     * Query: days_ahead (for credential expirations, default 90)
     * Response: Excel file download with multiple worksheets
     */
    async exportStaffReport(request, reply) {
        try {
            const mockReply = {
                code: () => mockReply
            };

            // Get all staff-related reports in parallel
            const [productivityResult, credentialsResult, caseloadResult] = await Promise.all([
                ReportsController.getStaffProductivity(request, mockReply),
                ReportsController.getCredentialExpirations(request, mockReply),
                ReportsController.getCaseloadSummary(request, mockReply)
            ]);

            const staffData = {
                productivity: productivityResult.status === 200 ? productivityResult.data : null,
                credentials: credentialsResult.status === 200 ? credentialsResult.data : null,
                caseload: caseloadResult.status === 200 ? caseloadResult.data : null
            };

            const { days_ahead } = request.query;
            const buffer = await ExcelService.generateStaffReport(staffData, {
                daysAhead: days_ahead || 90
            });

            const filename = `staff-report-${new Date().toISOString().split('T')[0]}.xlsx`;

            reply
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting staff report:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export staff report'
            };
        }
    }

    /**
     * Export QAPI Report to Excel (multiple sheets)
     * GET /api/excel-reports/qapi
     *
     * Query: from_date, to_date (optional)
     * Response: Excel file download with multiple worksheets
     */
    async exportQAPIReport(request, reply) {
        try {
            const mockReply = {
                code: () => mockReply
            };

            // Get all QAPI-related reports in parallel
            const [incidentsResult, grievancesResult, qualityResult, auditsResult] = await Promise.all([
                ReportsController.getIncidentsSummary(request, mockReply),
                ReportsController.getGrievancesSummary(request, mockReply),
                ReportsController.getQualityMeasuresDashboard(request, mockReply),
                ReportsController.getChartAuditScores(request, mockReply)
            ]);

            const qapiData = {
                incidents: incidentsResult.status === 200 ? incidentsResult.data : null,
                grievances: grievancesResult.status === 200 ? grievancesResult.data : null,
                qualityMeasures: qualityResult.status === 200 ? qualityResult.data : null,
                chartAudits: auditsResult.status === 200 ? auditsResult.data : null
            };

            const { from_date, to_date } = request.query;
            const buffer = await ExcelService.generateQAPIReport(qapiData, {
                fromDate: from_date,
                toDate: to_date
            });

            const filename = `qapi-report-${new Date().toISOString().split('T')[0]}.xlsx`;

            reply
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting QAPI report:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export QAPI report'
            };
        }
    }

    /**
     * Export Executive Dashboard to Excel
     * GET /api/excel-reports/executive-dashboard
     *
     * Response: Excel file download
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

            const buffer = await ExcelService.generateExecutiveDashboardReport(dashboardResult.data);

            const filename = `executive-dashboard-${new Date().toISOString().split('T')[0]}.xlsx`;

            reply
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting executive dashboard:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export executive dashboard'
            };
        }
    }

    /**
     * Export Analytics Report to Excel
     * POST /api/excel-reports/analytics
     *
     * Body: { report_type: "clean_claim_rate", start_date: "2024-01-01", end_date: "2025-01-15" }
     * Response: Excel file download
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

            // Get the data based on report type
            const startDate = start_date ? new Date(start_date) : new Date(new Date().setMonth(new Date().getMonth() - 1));
            const endDate = end_date ? new Date(end_date) : new Date();

            let data;
            switch (report_type) {
                case 'clean_claim_rate':
                    data = await AnalyticsService.getCleanClaimRateTimeSeries(startDate, endDate);
                    break;
                case 'days_to_payment':
                    data = await AnalyticsService.getDaysToPaymentTimeSeries(startDate, endDate);
                    break;
                case 'denial_rate_by_payer':
                    data = await AnalyticsService.getDenialRateByPayer(startDate, endDate);
                    break;
                case 'net_collection_rate':
                    data = await AnalyticsService.getNetCollectionRateWithTrend(startDate, endDate);
                    break;
                case 'ar_aging_trend':
                    data = await AnalyticsService.getARAgingTrend(startDate, endDate);
                    break;
            }

            const buffer = await ExcelService.generateAnalyticsReport(report_type, data, {
                startDate: startDate.toISOString().split('T')[0],
                endDate: endDate.toISOString().split('T')[0]
            });

            const filename = `${report_type}-${startDate.toISOString().split('T')[0]}-to-${endDate.toISOString().split('T')[0]}.xlsx`;

            reply
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting analytics report:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export analytics report'
            };
        }
    }

    /**
     * Export Custom Report to Excel
     * POST /api/excel-reports/custom
     *
     * Body: {
     *   worksheets: [{ name, title, columns, data, ... }],
     *   options: { title, author }
     * }
     * Response: Excel file download
     */
    async exportCustomReport(request, reply) {
        try {
            const { worksheets, options = {} } = request.body;

            if (!worksheets || !Array.isArray(worksheets) || worksheets.length === 0) {
                reply.code(400);
                return {
                    status: 'error',
                    message: 'worksheets array is required and must contain at least one worksheet'
                };
            }

            // Validate worksheet configurations
            for (const ws of worksheets) {
                if (!ws.name) {
                    reply.code(400);
                    return {
                        status: 'error',
                        message: 'Each worksheet must have a name'
                    };
                }
                if (!ws.columns || !Array.isArray(ws.columns)) {
                    reply.code(400);
                    return {
                        status: 'error',
                        message: `Worksheet "${ws.name}" must have a columns array`
                    };
                }
            }

            const buffer = await ExcelService.generateExcel(worksheets, options);

            const filename = options.filename || `custom-report-${new Date().toISOString().split('T')[0]}.xlsx`;

            reply
                .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
                .header('Content-Disposition', `attachment; filename="${filename}"`)
                .header('Content-Length', buffer.length);

            return reply.send(buffer);
        } catch (error) {
            logger.error('Error exporting custom report:', error);
            reply.code(500);
            return {
                status: 'error',
                message: error.message || 'Failed to export custom report'
            };
        }
    }

    /**
     * Get available report types
     * GET /api/excel-reports/types
     *
     * Response: List of available report types with descriptions
     */
    async getReportTypes(request, reply) {
        const reportTypes = [
            {
                type: 'census',
                name: 'Census Report',
                description: 'Current patient census with summary by level of care',
                endpoint: 'GET /api/excel-reports/census',
                sheets: ['Census', 'Summary']
            },
            {
                type: 'ar-aging',
                name: 'AR Aging Report',
                description: 'Accounts receivable aging by bucket',
                endpoint: 'GET /api/excel-reports/ar-aging',
                sheets: ['AR Aging']
            },
            {
                type: 'billing',
                name: 'Billing Report',
                description: 'Comprehensive billing report with multiple sheets',
                endpoint: 'GET /api/excel-reports/billing',
                sheets: ['Pending Claims', 'Revenue by Payer', 'Unbilled Periods']
            },
            {
                type: 'staff',
                name: 'Staff Report',
                description: 'Staff productivity, credentials, and caseload',
                endpoint: 'GET /api/excel-reports/staff',
                sheets: ['Productivity', 'Credential Expirations', 'Caseload Summary']
            },
            {
                type: 'qapi',
                name: 'QAPI Report',
                description: 'Quality assurance and performance improvement',
                endpoint: 'GET /api/excel-reports/qapi',
                sheets: ['Incidents', 'Grievances', 'Quality Measures', 'Chart Audits']
            },
            {
                type: 'executive-dashboard',
                name: 'Executive Dashboard',
                description: 'Executive summary with key metrics',
                endpoint: 'GET /api/excel-reports/executive-dashboard',
                sheets: ['Executive Dashboard']
            },
            {
                type: 'analytics',
                name: 'Analytics Report',
                description: 'Analytics data export (clean claim rate, days to payment, etc.)',
                endpoint: 'POST /api/excel-reports/analytics',
                subtypes: [
                    'clean_claim_rate',
                    'days_to_payment',
                    'denial_rate_by_payer',
                    'net_collection_rate',
                    'ar_aging_trend'
                ]
            },
            {
                type: 'custom',
                name: 'Custom Report',
                description: 'Create a custom Excel report with provided worksheet configurations',
                endpoint: 'POST /api/excel-reports/custom'
            }
        ];

        reply.code(200);
        return {
            status: 'success',
            data: reportTypes
        };
    }
}

export default new ExcelReportController();
