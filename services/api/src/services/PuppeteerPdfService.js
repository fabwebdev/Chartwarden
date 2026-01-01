import puppeteer from 'puppeteer';
import { logger } from '../utils/logger.js';

/**
 * Puppeteer PDF Report Service
 * Comprehensive PDF report generator using Puppeteer for HTML-to-PDF conversion
 *
 * Features:
 * - HTML template-based rendering with dynamic content injection
 * - Professional styling optimized for PDF output
 * - Page formatting (size, margins, headers, footers, page numbers)
 * - Browser instance pooling for performance optimization
 * - Support for multiple paper sizes and orientations
 * - Image and asset handling in headless environment
 * - Unicode and special character support
 * - Error handling and graceful degradation
 */
class PuppeteerPdfService {
    // Singleton browser instance for performance
    static browser = null;
    static browserLaunchPromise = null;
    static browserRefCount = 0;
    static browserTimeout = null;
    static BROWSER_IDLE_TIMEOUT = 60000; // Close browser after 60s of inactivity

    // Default configuration
    static CONFIG = {
        defaultPaperSize: 'Letter',
        defaultMargins: {
            top: '0.75in',
            right: '0.5in',
            bottom: '0.75in',
            left: '0.5in'
        },
        defaultOrientation: 'portrait',
        defaultScale: 1,
        printBackground: true
    };

    // Paper sizes in inches
    static PAPER_SIZES = {
        Letter: { width: '8.5in', height: '11in' },
        Legal: { width: '8.5in', height: '14in' },
        A4: { width: '8.27in', height: '11.69in' },
        A3: { width: '11.69in', height: '16.54in' },
        Tabloid: { width: '11in', height: '17in' }
    };

    // Chartwarden brand colors
    static COLORS = {
        primary: '#2E7D32',      // Chartwarden green
        primaryDark: '#1B5E20',
        secondary: '#1565C0',
        text: '#212121',
        textLight: '#757575',
        border: '#E0E0E0',
        background: '#FFFFFF',
        headerBg: '#F5F5F5',
        success: '#4CAF50',
        warning: '#FF9800',
        error: '#F44336'
    };

    /**
     * Get or create a browser instance (singleton pattern)
     * Uses lazy initialization and reference counting for optimal resource management
     * @private
     */
    static async getBrowser() {
        // Clear idle timeout if browser is being used
        if (PuppeteerPdfService.browserTimeout) {
            clearTimeout(PuppeteerPdfService.browserTimeout);
            PuppeteerPdfService.browserTimeout = null;
        }

        // If browser is launching, wait for it
        if (PuppeteerPdfService.browserLaunchPromise) {
            await PuppeteerPdfService.browserLaunchPromise;
        }

        // If browser doesn't exist or is closed, create new one
        if (!PuppeteerPdfService.browser || !PuppeteerPdfService.browser.isConnected()) {
            PuppeteerPdfService.browserLaunchPromise = puppeteer.launch({
                headless: true,
                args: [
                    '--no-sandbox',
                    '--disable-setuid-sandbox',
                    '--disable-dev-shm-usage',
                    '--disable-accelerated-2d-canvas',
                    '--disable-gpu',
                    '--font-render-hinting=none'
                ]
            });

            try {
                PuppeteerPdfService.browser = await PuppeteerPdfService.browserLaunchPromise;
                PuppeteerPdfService.browserRefCount = 0;
                logger.info('Puppeteer browser instance created');
            } finally {
                PuppeteerPdfService.browserLaunchPromise = null;
            }
        }

        PuppeteerPdfService.browserRefCount++;
        return PuppeteerPdfService.browser;
    }

    /**
     * Release browser reference and schedule cleanup if idle
     * @private
     */
    static releaseBrowser() {
        PuppeteerPdfService.browserRefCount--;

        if (PuppeteerPdfService.browserRefCount <= 0) {
            PuppeteerPdfService.browserRefCount = 0;

            // Schedule browser cleanup after idle timeout
            PuppeteerPdfService.browserTimeout = setTimeout(async () => {
                if (PuppeteerPdfService.browser && PuppeteerPdfService.browserRefCount === 0) {
                    try {
                        await PuppeteerPdfService.browser.close();
                        PuppeteerPdfService.browser = null;
                        logger.info('Puppeteer browser instance closed due to inactivity');
                    } catch (error) {
                        logger.warn('Error closing idle browser:', error.message);
                    }
                }
            }, PuppeteerPdfService.BROWSER_IDLE_TIMEOUT);
        }
    }

    /**
     * Generate PDF from HTML content
     * @param {string} html - The HTML content to convert to PDF
     * @param {Object} options - PDF generation options
     * @returns {Promise<Buffer>} - PDF as buffer
     */
    async generatePdfFromHtml(html, options = {}) {
        let page = null;

        try {
            const browser = await PuppeteerPdfService.getBrowser();
            page = await browser.newPage();

            // Set viewport for consistent rendering
            await page.setViewport({
                width: 1200,
                height: 800,
                deviceScaleFactor: 2
            });

            // Set content with wait for network idle
            await page.setContent(html, {
                waitUntil: ['networkidle0', 'domcontentloaded']
            });

            // Wait for any web fonts to load
            await page.evaluateHandle('document.fonts.ready');

            // Get paper size
            const paperSize = PuppeteerPdfService.PAPER_SIZES[options.paperSize] ||
                              PuppeteerPdfService.PAPER_SIZES[PuppeteerPdfService.CONFIG.defaultPaperSize];

            // Generate PDF
            const pdfOptions = {
                format: options.format || undefined,
                width: options.width || paperSize.width,
                height: options.height || paperSize.height,
                margin: options.margin || PuppeteerPdfService.CONFIG.defaultMargins,
                printBackground: options.printBackground !== false,
                landscape: options.orientation === 'landscape',
                scale: options.scale || PuppeteerPdfService.CONFIG.defaultScale,
                displayHeaderFooter: options.displayHeaderFooter !== false,
                headerTemplate: options.headerTemplate || this._getDefaultHeaderTemplate(options),
                footerTemplate: options.footerTemplate || this._getDefaultFooterTemplate(options),
                preferCSSPageSize: options.preferCSSPageSize || false
            };

            const buffer = await page.pdf(pdfOptions);
            return buffer;

        } catch (error) {
            logger.error('Error generating PDF from HTML:', error);
            throw new Error(`PDF generation failed: ${error.message}`);
        } finally {
            if (page) {
                await page.close().catch(() => {});
            }
            PuppeteerPdfService.releaseBrowser();
        }
    }

    /**
     * Get default header template
     * @private
     */
    _getDefaultHeaderTemplate(options) {
        const title = options.title || 'Chartwarden Report';
        return `
            <div style="width: 100%; font-size: 9px; padding: 5px 20px; border-bottom: 1px solid ${PuppeteerPdfService.COLORS.border};">
                <span style="float: left; color: ${PuppeteerPdfService.COLORS.textLight};">${title}</span>
                <span style="float: right; color: ${PuppeteerPdfService.COLORS.textLight};"><span class="date"></span></span>
            </div>
        `;
    }

    /**
     * Get default footer template
     * @private
     */
    _getDefaultFooterTemplate(options) {
        return `
            <div style="width: 100%; font-size: 9px; padding: 5px 20px; border-top: 1px solid ${PuppeteerPdfService.COLORS.border};">
                <span style="float: left; color: ${PuppeteerPdfService.COLORS.textLight};">Chartwarden EHR</span>
                <span style="float: right; color: ${PuppeteerPdfService.COLORS.textLight};">Page <span class="pageNumber"></span> of <span class="totalPages"></span></span>
            </div>
        `;
    }

    /**
     * Build base CSS styles for PDF reports
     * @private
     */
    _getBaseStyles() {
        return `
            * {
                box-sizing: border-box;
            }

            @page {
                margin: 0.75in 0.5in;
            }

            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
                font-size: 11px;
                line-height: 1.4;
                color: ${PuppeteerPdfService.COLORS.text};
                margin: 0;
                padding: 0;
                background: ${PuppeteerPdfService.COLORS.background};
            }

            h1, h2, h3, h4, h5, h6 {
                margin: 0 0 10px 0;
                color: ${PuppeteerPdfService.COLORS.primaryDark};
            }

            h1 { font-size: 22px; }
            h2 { font-size: 18px; }
            h3 { font-size: 14px; }
            h4 { font-size: 12px; }

            .report-header {
                background: linear-gradient(135deg, ${PuppeteerPdfService.COLORS.primary} 0%, ${PuppeteerPdfService.COLORS.primaryDark} 100%);
                color: white;
                padding: 20px;
                margin-bottom: 20px;
            }

            .report-header h1 {
                color: white;
                margin: 0 0 5px 0;
            }

            .report-header .subtitle {
                opacity: 0.9;
                font-size: 12px;
            }

            .report-meta {
                display: flex;
                justify-content: space-between;
                margin-top: 10px;
                font-size: 10px;
                opacity: 0.8;
            }

            .section {
                margin-bottom: 20px;
                page-break-inside: avoid;
            }

            .section-title {
                background: ${PuppeteerPdfService.COLORS.headerBg};
                padding: 8px 12px;
                margin-bottom: 10px;
                border-left: 4px solid ${PuppeteerPdfService.COLORS.primary};
                font-weight: bold;
                font-size: 13px;
            }

            table {
                width: 100%;
                border-collapse: collapse;
                margin-bottom: 15px;
                font-size: 10px;
            }

            table th {
                background: ${PuppeteerPdfService.COLORS.primary};
                color: white;
                padding: 8px 10px;
                text-align: left;
                font-weight: 600;
                border: 1px solid ${PuppeteerPdfService.COLORS.primaryDark};
            }

            table td {
                padding: 6px 10px;
                border: 1px solid ${PuppeteerPdfService.COLORS.border};
            }

            table tr:nth-child(even) {
                background: #f9f9f9;
            }

            table tr:hover {
                background: #f5f5f5;
            }

            .data-grid {
                display: grid;
                grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
                gap: 15px;
                margin-bottom: 15px;
            }

            .data-card {
                border: 1px solid ${PuppeteerPdfService.COLORS.border};
                border-radius: 4px;
                padding: 12px;
            }

            .data-card .label {
                font-size: 10px;
                color: ${PuppeteerPdfService.COLORS.textLight};
                margin-bottom: 4px;
            }

            .data-card .value {
                font-size: 14px;
                font-weight: 600;
                color: ${PuppeteerPdfService.COLORS.text};
            }

            .info-row {
                display: flex;
                margin-bottom: 6px;
                border-bottom: 1px dotted ${PuppeteerPdfService.COLORS.border};
                padding-bottom: 4px;
            }

            .info-row .label {
                font-weight: 600;
                width: 140px;
                flex-shrink: 0;
                color: ${PuppeteerPdfService.COLORS.textLight};
            }

            .info-row .value {
                flex: 1;
            }

            .page-break {
                page-break-before: always;
            }

            .no-break {
                page-break-inside: avoid;
            }

            .text-right { text-align: right; }
            .text-center { text-align: center; }
            .text-success { color: ${PuppeteerPdfService.COLORS.success}; }
            .text-warning { color: ${PuppeteerPdfService.COLORS.warning}; }
            .text-error { color: ${PuppeteerPdfService.COLORS.error}; }
            .font-bold { font-weight: bold; }
            .currency { font-family: 'Courier New', monospace; }

            .badge {
                display: inline-block;
                padding: 2px 8px;
                border-radius: 3px;
                font-size: 9px;
                font-weight: 600;
            }

            .badge-success { background: #e8f5e9; color: ${PuppeteerPdfService.COLORS.success}; }
            .badge-warning { background: #fff3e0; color: ${PuppeteerPdfService.COLORS.warning}; }
            .badge-error { background: #ffebee; color: ${PuppeteerPdfService.COLORS.error}; }
            .badge-primary { background: #e3f2fd; color: ${PuppeteerPdfService.COLORS.secondary}; }

            .signature-section {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 2px solid ${PuppeteerPdfService.COLORS.border};
            }

            .signature-line {
                display: flex;
                justify-content: space-between;
                margin-top: 40px;
            }

            .signature-box {
                width: 45%;
            }

            .signature-box .line {
                border-bottom: 1px solid ${PuppeteerPdfService.COLORS.text};
                margin-bottom: 5px;
                height: 30px;
            }

            .signature-box .label {
                font-size: 10px;
                color: ${PuppeteerPdfService.COLORS.textLight};
            }

            .watermark {
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%) rotate(-45deg);
                font-size: 80px;
                color: rgba(0, 0, 0, 0.05);
                pointer-events: none;
                z-index: -1;
            }
        `;
    }

    /**
     * Build HTML document wrapper
     * @private
     */
    _wrapHtml(content, options = {}) {
        const styles = this._getBaseStyles();
        const customStyles = options.customStyles || '';
        const watermark = options.watermark ? `<div class="watermark">${options.watermark}</div>` : '';

        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${options.title || 'Report'}</title>
                <style>${styles}${customStyles}</style>
            </head>
            <body>
                ${watermark}
                ${content}
            </body>
            </html>
        `;
    }

    /**
     * Format date for display
     * @private
     */
    _formatDate(date, includeTime = false) {
        if (!date) return '';
        const d = new Date(date);
        if (isNaN(d.getTime())) return date;

        const dateStr = d.toLocaleDateString('en-US', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit'
        });

        if (includeTime) {
            const timeStr = d.toLocaleTimeString('en-US', {
                hour: '2-digit',
                minute: '2-digit'
            });
            return `${dateStr} ${timeStr}`;
        }

        return dateStr;
    }

    /**
     * Format currency for display
     * @private
     */
    _formatCurrency(amount) {
        if (amount === null || amount === undefined) return '$0.00';
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD'
        }).format(amount);
    }

    /**
     * Escape HTML to prevent XSS
     * @private
     */
    _escapeHtml(text) {
        if (text === null || text === undefined) return '';
        const str = String(text);
        const map = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#039;'
        };
        return str.replace(/[&<>"']/g, char => map[char]);
    }

    /**
     * Generate a Patient Chart PDF
     * @param {Object} patientData - Patient data including demographics, conditions, medications
     * @param {Object} options - PDF options
     * @returns {Promise<Buffer>} - PDF as buffer
     */
    async generatePatientChartPdf(patientData, options = {}) {
        const patient = patientData;
        const fullName = `${this._escapeHtml(patient.firstName || '')} ${this._escapeHtml(patient.lastName || '')}`.trim();

        const content = `
            <div class="report-header">
                <h1>Patient Chart</h1>
                <div class="subtitle">${fullName}</div>
                <div class="report-meta">
                    <span>MRN: ${this._escapeHtml(patient.mrn || 'N/A')}</span>
                    <span>Generated: ${this._formatDate(new Date(), true)}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Demographics</div>
                <div class="data-grid">
                    <div class="data-card">
                        <div class="label">Date of Birth</div>
                        <div class="value">${this._formatDate(patient.dateOfBirth)}</div>
                    </div>
                    <div class="data-card">
                        <div class="label">Gender</div>
                        <div class="value">${this._escapeHtml(patient.gender || 'N/A')}</div>
                    </div>
                    <div class="data-card">
                        <div class="label">Status</div>
                        <div class="value">
                            <span class="badge ${patient.status === 'ACTIVE' ? 'badge-success' : 'badge-warning'}">
                                ${this._escapeHtml(patient.status || 'N/A')}
                            </span>
                        </div>
                    </div>
                    <div class="data-card">
                        <div class="label">Admission Date</div>
                        <div class="value">${this._formatDate(patient.admissionDate)}</div>
                    </div>
                </div>
            </div>

            ${patient.address ? `
            <div class="section">
                <div class="section-title">Address</div>
                <div class="info-row">
                    <div class="label">Street</div>
                    <div class="value">${this._escapeHtml(patient.address.street || '')}</div>
                </div>
                <div class="info-row">
                    <div class="label">City, State ZIP</div>
                    <div class="value">${this._escapeHtml(patient.address.city || '')}, ${this._escapeHtml(patient.address.state || '')} ${this._escapeHtml(patient.address.zipCode || '')}</div>
                </div>
                <div class="info-row">
                    <div class="label">Phone</div>
                    <div class="value">${this._escapeHtml(patient.address.phone || patient.phone || 'N/A')}</div>
                </div>
            </div>
            ` : ''}

            ${patient.diagnoses && patient.diagnoses.length > 0 ? `
            <div class="section">
                <div class="section-title">Diagnoses</div>
                <table>
                    <thead>
                        <tr>
                            <th>ICD-10 Code</th>
                            <th>Description</th>
                            <th>Type</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${patient.diagnoses.map(dx => `
                            <tr>
                                <td>${this._escapeHtml(dx.icd10Code)}</td>
                                <td>${this._escapeHtml(dx.description)}</td>
                                <td>${this._escapeHtml(dx.type || 'Secondary')}</td>
                                <td><span class="badge badge-${dx.status === 'Active' ? 'success' : 'warning'}">${this._escapeHtml(dx.status)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${patient.medications && patient.medications.length > 0 ? `
            <div class="section page-break">
                <div class="section-title">Current Medications</div>
                <table>
                    <thead>
                        <tr>
                            <th>Medication</th>
                            <th>Dosage</th>
                            <th>Route</th>
                            <th>Frequency</th>
                            <th>Start Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${patient.medications.map(med => `
                            <tr>
                                <td>${this._escapeHtml(med.name)}</td>
                                <td>${this._escapeHtml(med.dosage)}</td>
                                <td>${this._escapeHtml(med.route)}</td>
                                <td>${this._escapeHtml(med.frequency)}</td>
                                <td>${this._formatDate(med.startDate)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}

            ${patient.allergies && patient.allergies.length > 0 ? `
            <div class="section">
                <div class="section-title">Allergies</div>
                <table>
                    <thead>
                        <tr>
                            <th>Allergen</th>
                            <th>Reaction</th>
                            <th>Severity</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${patient.allergies.map(allergy => `
                            <tr>
                                <td>${this._escapeHtml(allergy.allergen)}</td>
                                <td>${this._escapeHtml(allergy.reaction)}</td>
                                <td><span class="badge badge-${allergy.severity === 'Severe' ? 'error' : (allergy.severity === 'Moderate' ? 'warning' : 'primary')}">${this._escapeHtml(allergy.severity)}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
        `;

        const html = this._wrapHtml(content, {
            title: `Patient Chart - ${fullName}`,
            ...options
        });

        return await this.generatePdfFromHtml(html, {
            title: `Patient Chart - ${fullName}`,
            ...options
        });
    }

    /**
     * Generate a Census Report PDF
     * @param {Object} censusData - Census data with patients and summary
     * @param {Object} options - PDF options
     * @returns {Promise<Buffer>} - PDF as buffer
     */
    async generateCensusReportPdf(censusData, options = {}) {
        const patients = censusData.patients || [];
        const summary = censusData.summary || [];
        const totalCount = censusData.total_count || patients.length;

        const content = `
            <div class="report-header">
                <h1>Census Report</h1>
                <div class="subtitle">Current Patient Census</div>
                <div class="report-meta">
                    <span>Total Patients: ${totalCount}</span>
                    <span>Generated: ${this._formatDate(new Date(), true)}</span>
                </div>
            </div>

            ${summary.length > 0 ? `
            <div class="section">
                <div class="section-title">Summary by Level of Care</div>
                <div class="data-grid">
                    ${summary.map(s => `
                        <div class="data-card">
                            <div class="label">${this._escapeHtml(s.level_of_care)}</div>
                            <div class="value">${s.total_patients || 0}</div>
                        </div>
                    `).join('')}
                </div>
            </div>
            ` : ''}

            <div class="section">
                <div class="section-title">Patient List</div>
                <table>
                    <thead>
                        <tr>
                            <th>Patient ID</th>
                            <th>Patient Name</th>
                            <th>MRN</th>
                            <th>Admission Date</th>
                            <th>Level of Care</th>
                            <th>Primary Diagnosis</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${patients.length > 0 ? patients.map(p => `
                            <tr>
                                <td>${this._escapeHtml(p.patient_id)}</td>
                                <td>${this._escapeHtml(p.patient_name)}</td>
                                <td>${this._escapeHtml(p.mrn)}</td>
                                <td>${this._formatDate(p.admission_date)}</td>
                                <td>${this._escapeHtml(p.level_of_care)}</td>
                                <td>${this._escapeHtml(p.primary_diagnosis)}</td>
                            </tr>
                        `).join('') : `
                            <tr>
                                <td colspan="6" class="text-center">No patients found</td>
                            </tr>
                        `}
                    </tbody>
                </table>
            </div>
        `;

        const html = this._wrapHtml(content, {
            title: 'Census Report',
            ...options
        });

        return await this.generatePdfFromHtml(html, {
            title: 'Census Report',
            orientation: 'landscape',
            ...options
        });
    }

    /**
     * Generate a Billing Report PDF
     * @param {Object} billingData - Billing data including claims, payments
     * @param {Object} options - PDF options
     * @returns {Promise<Buffer>} - PDF as buffer
     */
    async generateBillingReportPdf(billingData, options = {}) {
        const pendingClaims = billingData.pendingClaims?.claims || [];
        const arAging = billingData.arAging?.by_bucket || [];
        const revenueByPayer = billingData.revenueByPayer?.payers || [];
        const totals = billingData.arAging?.totals || {};

        const content = `
            <div class="report-header">
                <h1>Billing Report</h1>
                <div class="subtitle">Financial Summary</div>
                <div class="report-meta">
                    <span>Date Range: ${this._formatDate(options.fromDate)} - ${this._formatDate(options.toDate)}</span>
                    <span>Generated: ${this._formatDate(new Date(), true)}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">AR Aging Summary</div>
                <div class="data-grid">
                    ${arAging.map(bucket => `
                        <div class="data-card">
                            <div class="label">${this._escapeHtml(bucket.aging_bucket)}</div>
                            <div class="value currency">${this._formatCurrency(bucket.total_balance)}</div>
                            <div class="label" style="margin-top: 4px;">${bucket.claim_count || 0} claims</div>
                        </div>
                    `).join('')}
                </div>
                <div class="data-card" style="background: ${PuppeteerPdfService.COLORS.headerBg}; margin-top: 10px;">
                    <div class="label">Total AR</div>
                    <div class="value currency" style="font-size: 18px;">${this._formatCurrency(totals.total_ar)}</div>
                </div>
            </div>

            ${pendingClaims.length > 0 ? `
            <div class="section page-break">
                <div class="section-title">Pending Claims</div>
                <table>
                    <thead>
                        <tr>
                            <th>Claim ID</th>
                            <th>Patient Name</th>
                            <th>Claim Number</th>
                            <th>Service Period</th>
                            <th>Total Charges</th>
                            <th>Days Pending</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${pendingClaims.slice(0, 50).map(claim => `
                            <tr>
                                <td>${this._escapeHtml(claim.claim_id)}</td>
                                <td>${this._escapeHtml(claim.patient_name)}</td>
                                <td>${this._escapeHtml(claim.claim_number)}</td>
                                <td>${this._formatDate(claim.service_start_date)} - ${this._formatDate(claim.service_end_date)}</td>
                                <td class="text-right currency">${this._formatCurrency(claim.total_charges)}</td>
                                <td class="text-center ${claim.days_pending > 60 ? 'text-error' : claim.days_pending > 30 ? 'text-warning' : ''}">${claim.days_pending || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ${pendingClaims.length > 50 ? `<p class="text-center">Showing 50 of ${pendingClaims.length} claims</p>` : ''}
            </div>
            ` : ''}

            ${revenueByPayer.length > 0 ? `
            <div class="section">
                <div class="section-title">Revenue by Payer</div>
                <table>
                    <thead>
                        <tr>
                            <th>Payer</th>
                            <th class="text-right">Total Charges</th>
                            <th class="text-right">Total Paid</th>
                            <th class="text-center">Claim Count</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${revenueByPayer.map(payer => `
                            <tr>
                                <td>${this._escapeHtml(payer.payer_id || payer.payer_name)}</td>
                                <td class="text-right currency">${this._formatCurrency(payer.total_charges)}</td>
                                <td class="text-right currency">${this._formatCurrency(payer.total_paid)}</td>
                                <td class="text-center">${payer.claim_count || 0}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
            ` : ''}
        `;

        const html = this._wrapHtml(content, {
            title: 'Billing Report',
            ...options
        });

        return await this.generatePdfFromHtml(html, {
            title: 'Billing Report',
            ...options
        });
    }

    /**
     * Generate a Custom Report PDF from provided data and template
     * @param {Object} reportData - Report configuration and data
     * @param {Object} options - PDF options
     * @returns {Promise<Buffer>} - PDF as buffer
     */
    async generateCustomReportPdf(reportData, options = {}) {
        const { title, subtitle, sections = [] } = reportData;

        let sectionsHtml = '';

        for (const section of sections) {
            if (section.type === 'table' && section.data) {
                const columns = section.columns || Object.keys(section.data[0] || {});
                sectionsHtml += `
                    <div class="section ${section.pageBreak ? 'page-break' : ''}">
                        ${section.title ? `<div class="section-title">${this._escapeHtml(section.title)}</div>` : ''}
                        <table>
                            <thead>
                                <tr>
                                    ${columns.map(col => `<th>${this._escapeHtml(col.header || col)}</th>`).join('')}
                                </tr>
                            </thead>
                            <tbody>
                                ${section.data.map(row => `
                                    <tr>
                                        ${columns.map(col => {
                                            const key = col.key || col;
                                            const value = row[key];
                                            const formatted = col.type === 'currency' ? this._formatCurrency(value) :
                                                              col.type === 'date' ? this._formatDate(value) :
                                                              col.type === 'datetime' ? this._formatDate(value, true) :
                                                              this._escapeHtml(value);
                                            return `<td class="${col.type === 'currency' ? 'text-right currency' : ''}">${formatted}</td>`;
                                        }).join('')}
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>
                `;
            } else if (section.type === 'grid' && section.items) {
                sectionsHtml += `
                    <div class="section ${section.pageBreak ? 'page-break' : ''}">
                        ${section.title ? `<div class="section-title">${this._escapeHtml(section.title)}</div>` : ''}
                        <div class="data-grid">
                            ${section.items.map(item => `
                                <div class="data-card">
                                    <div class="label">${this._escapeHtml(item.label)}</div>
                                    <div class="value">${this._escapeHtml(item.value)}</div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            } else if (section.type === 'info' && section.rows) {
                sectionsHtml += `
                    <div class="section ${section.pageBreak ? 'page-break' : ''}">
                        ${section.title ? `<div class="section-title">${this._escapeHtml(section.title)}</div>` : ''}
                        ${section.rows.map(row => `
                            <div class="info-row">
                                <div class="label">${this._escapeHtml(row.label)}</div>
                                <div class="value">${this._escapeHtml(row.value)}</div>
                            </div>
                        `).join('')}
                    </div>
                `;
            } else if (section.type === 'html' && section.content) {
                sectionsHtml += `
                    <div class="section ${section.pageBreak ? 'page-break' : ''}">
                        ${section.title ? `<div class="section-title">${this._escapeHtml(section.title)}</div>` : ''}
                        ${section.content}
                    </div>
                `;
            }
        }

        const content = `
            <div class="report-header">
                <h1>${this._escapeHtml(title || 'Custom Report')}</h1>
                ${subtitle ? `<div class="subtitle">${this._escapeHtml(subtitle)}</div>` : ''}
                <div class="report-meta">
                    <span>Generated: ${this._formatDate(new Date(), true)}</span>
                </div>
            </div>
            ${sectionsHtml}
        `;

        const html = this._wrapHtml(content, {
            title: title || 'Custom Report',
            ...options
        });

        return await this.generatePdfFromHtml(html, {
            title: title || 'Custom Report',
            ...options
        });
    }

    /**
     * Generate Executive Dashboard PDF
     * @param {Object} dashboardData - Executive dashboard data
     * @param {Object} options - PDF options
     * @returns {Promise<Buffer>} - PDF as buffer
     */
    async generateExecutiveDashboardPdf(dashboardData, options = {}) {
        const content = `
            <div class="report-header">
                <h1>Executive Dashboard</h1>
                <div class="subtitle">Key Performance Indicators</div>
                <div class="report-meta">
                    <span>Generated: ${this._formatDate(new Date(), true)}</span>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Patient Census</div>
                <div class="data-grid">
                    <div class="data-card">
                        <div class="label">Current Census</div>
                        <div class="value" style="font-size: 24px; color: ${PuppeteerPdfService.COLORS.primary};">${dashboardData.current_census || 0}</div>
                    </div>
                    <div class="data-card">
                        <div class="label">Recertifications Due (30 days)</div>
                        <div class="value ${(dashboardData.recertifications_due_30_days || 0) > 10 ? 'text-warning' : ''}">${dashboardData.recertifications_due_30_days || 0}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Billing & Revenue</div>
                <div class="data-grid">
                    <div class="data-card">
                        <div class="label">Pending Claims</div>
                        <div class="value">${dashboardData.pending_claims || 0}</div>
                    </div>
                    <div class="data-card">
                        <div class="label">Pending Claims Value</div>
                        <div class="value currency">${this._formatCurrency(dashboardData.pending_claims_value)}</div>
                    </div>
                </div>
            </div>

            <div class="section">
                <div class="section-title">Quality & Compliance</div>
                <div class="data-grid">
                    <div class="data-card">
                        <div class="label">Active Incidents</div>
                        <div class="value ${(dashboardData.active_incidents || 0) > 5 ? 'text-error' : ''}">${dashboardData.active_incidents || 0}</div>
                    </div>
                    <div class="data-card">
                        <div class="label">Active Grievances</div>
                        <div class="value ${(dashboardData.active_grievances || 0) > 3 ? 'text-warning' : ''}">${dashboardData.active_grievances || 0}</div>
                    </div>
                </div>
            </div>
        `;

        const html = this._wrapHtml(content, {
            title: 'Executive Dashboard',
            ...options
        });

        return await this.generatePdfFromHtml(html, {
            title: 'Executive Dashboard',
            ...options
        });
    }

    /**
     * Generate a raw HTML to PDF conversion
     * Useful for completely custom reports
     * @param {string} htmlContent - Raw HTML content
     * @param {Object} options - PDF options
     * @returns {Promise<Buffer>} - PDF as buffer
     */
    async generateFromRawHtml(htmlContent, options = {}) {
        const html = options.wrapHtml !== false
            ? this._wrapHtml(htmlContent, options)
            : htmlContent;

        return await this.generatePdfFromHtml(html, options);
    }

    /**
     * Get available report types with descriptions
     * @returns {Array} - List of available report types
     */
    getAvailableReportTypes() {
        return [
            {
                type: 'patient-chart',
                name: 'Patient Chart',
                description: 'Comprehensive patient chart with demographics, diagnoses, medications, and allergies',
                method: 'generatePatientChartPdf'
            },
            {
                type: 'census',
                name: 'Census Report',
                description: 'Current patient census with summary by level of care',
                method: 'generateCensusReportPdf'
            },
            {
                type: 'billing',
                name: 'Billing Report',
                description: 'AR aging, pending claims, and revenue by payer',
                method: 'generateBillingReportPdf'
            },
            {
                type: 'executive-dashboard',
                name: 'Executive Dashboard',
                description: 'Key performance indicators summary',
                method: 'generateExecutiveDashboardPdf'
            },
            {
                type: 'custom',
                name: 'Custom Report',
                description: 'Custom report from provided sections and data',
                method: 'generateCustomReportPdf'
            },
            {
                type: 'raw-html',
                name: 'Raw HTML',
                description: 'Direct HTML to PDF conversion',
                method: 'generateFromRawHtml'
            }
        ];
    }

    /**
     * Cleanup resources - close browser if open
     */
    static async cleanup() {
        if (PuppeteerPdfService.browserTimeout) {
            clearTimeout(PuppeteerPdfService.browserTimeout);
            PuppeteerPdfService.browserTimeout = null;
        }

        if (PuppeteerPdfService.browser) {
            try {
                await PuppeteerPdfService.browser.close();
                PuppeteerPdfService.browser = null;
                PuppeteerPdfService.browserRefCount = 0;
                logger.info('Puppeteer browser instance cleaned up');
            } catch (error) {
                logger.warn('Error during browser cleanup:', error.message);
            }
        }
    }
}

export default new PuppeteerPdfService();
