import ExcelJS from 'exceljs';

/**
 * Excel Report Service
 * Comprehensive Excel report generator using ExcelJS with:
 * - Professional formatting and styling
 * - Multiple worksheet support
 * - Header row styling with filters
 * - Conditional formatting
 * - Auto-fit columns
 * - Data validation
 * - Formula support
 * - Date/currency formatting
 */
class ExcelService {
    // Default styles for consistent report formatting
    static STYLES = {
        headerFill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: '2E7D32' } // Chartwarden green
        },
        headerFont: {
            bold: true,
            color: { argb: 'FFFFFF' },
            size: 11,
            name: 'Calibri'
        },
        headerAlignment: {
            vertical: 'middle',
            horizontal: 'center',
            wrapText: true
        },
        headerBorder: {
            top: { style: 'thin', color: { argb: '1B5E20' } },
            left: { style: 'thin', color: { argb: '1B5E20' } },
            bottom: { style: 'medium', color: { argb: '1B5E20' } },
            right: { style: 'thin', color: { argb: '1B5E20' } }
        },
        titleFont: {
            bold: true,
            size: 16,
            name: 'Calibri',
            color: { argb: '1B5E20' }
        },
        subtitleFont: {
            bold: false,
            size: 11,
            name: 'Calibri',
            color: { argb: '666666' }
        },
        dataBorder: {
            top: { style: 'thin', color: { argb: 'CCCCCC' } },
            left: { style: 'thin', color: { argb: 'CCCCCC' } },
            bottom: { style: 'thin', color: { argb: 'CCCCCC' } },
            right: { style: 'thin', color: { argb: 'CCCCCC' } }
        },
        altRowFill: {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'F5F5F5' }
        },
        currencyFormat: '"$"#,##0.00',
        percentFormat: '0.00%',
        dateFormat: 'mm/dd/yyyy',
        dateTimeFormat: 'mm/dd/yyyy hh:mm AM/PM'
    };

    /**
     * Generate an Excel workbook with enhanced formatting
     * @param {Array} worksheets - Array of worksheet configurations
     * @param {Object} options - Workbook options (title, author, etc.)
     * @return {Promise<Buffer>} - Excel file as buffer
     */
    async generateExcel(worksheets, options = {}) {
        try {
            const workbook = new ExcelJS.Workbook();

            // Set workbook properties
            workbook.creator = options.author || 'Chartwarden EHR';
            workbook.lastModifiedBy = options.author || 'Chartwarden EHR';
            workbook.created = new Date();
            workbook.modified = new Date();
            workbook.company = 'Chartwarden';
            workbook.title = options.title || 'Report';

            // Add worksheets
            for (const wsConfig of worksheets) {
                await this._addWorksheet(workbook, wsConfig);
            }

            // Generate buffer
            const buffer = await workbook.xlsx.writeBuffer();
            return buffer;
        } catch (error) {
            throw new Error(`Excel generation failed: ${error.message}`);
        }
    }

    /**
     * Add a worksheet with full configuration
     * @private
     */
    async _addWorksheet(workbook, config) {
        const worksheet = workbook.addWorksheet(config.name || 'Sheet1', {
            properties: {
                tabColor: config.tabColor ? { argb: config.tabColor } : undefined
            },
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            },
            headerFooter: {
                oddHeader: config.header || '&C&B' + (config.name || 'Report'),
                oddFooter: '&LChartwarden EHR&C&D&RPage &P of &N'
            }
        });

        let currentRow = 1;

        // Add title if provided
        if (config.title) {
            const titleRow = worksheet.getRow(currentRow);
            titleRow.getCell(1).value = config.title;
            titleRow.getCell(1).font = ExcelService.STYLES.titleFont;
            worksheet.mergeCells(currentRow, 1, currentRow, config.columns?.length || 5);
            titleRow.height = 25;
            currentRow++;
        }

        // Add subtitle/date range if provided
        if (config.subtitle) {
            const subtitleRow = worksheet.getRow(currentRow);
            subtitleRow.getCell(1).value = config.subtitle;
            subtitleRow.getCell(1).font = ExcelService.STYLES.subtitleFont;
            worksheet.mergeCells(currentRow, 1, currentRow, config.columns?.length || 5);
            currentRow++;
        }

        // Add generated timestamp
        if (config.showTimestamp !== false) {
            const timestampRow = worksheet.getRow(currentRow);
            timestampRow.getCell(1).value = `Generated: ${new Date().toLocaleString()}`;
            timestampRow.getCell(1).font = { ...ExcelService.STYLES.subtitleFont, size: 9, italic: true };
            worksheet.mergeCells(currentRow, 1, currentRow, config.columns?.length || 5);
            currentRow += 2; // Add blank row
        }

        // Set up columns
        if (config.columns) {
            worksheet.columns = config.columns.map(col => ({
                header: col.header,
                key: col.key,
                width: col.width || 15,
                style: this._getColumnStyle(col.type)
            }));

            // Style header row
            const headerRow = worksheet.getRow(currentRow);
            headerRow.values = config.columns.map(col => col.header);
            headerRow.height = 22;

            config.columns.forEach((col, index) => {
                const cell = headerRow.getCell(index + 1);
                cell.fill = ExcelService.STYLES.headerFill;
                cell.font = ExcelService.STYLES.headerFont;
                cell.alignment = ExcelService.STYLES.headerAlignment;
                cell.border = ExcelService.STYLES.headerBorder;
            });

            // Enable auto-filter
            if (config.autoFilter !== false) {
                const lastCol = config.columns.length;
                worksheet.autoFilter = {
                    from: { row: currentRow, column: 1 },
                    to: { row: currentRow, column: lastCol }
                };
            }

            // Freeze header row
            if (config.freezeHeader !== false) {
                worksheet.views = [{ state: 'frozen', ySplit: currentRow }];
            }

            currentRow++;
        }

        // Add data rows
        if (config.data && config.data.length > 0) {
            const dataStartRow = currentRow;

            config.data.forEach((rowData, rowIndex) => {
                const row = worksheet.getRow(currentRow);

                if (Array.isArray(rowData)) {
                    row.values = rowData;
                } else {
                    // Object format - use column keys
                    config.columns?.forEach((col, colIndex) => {
                        row.getCell(colIndex + 1).value = rowData[col.key];
                    });
                }

                // Apply alternating row colors
                if (config.alternateRowColors !== false && rowIndex % 2 === 1) {
                    row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                        if (colNumber <= (config.columns?.length || row.cellCount)) {
                            cell.fill = ExcelService.STYLES.altRowFill;
                        }
                    });
                }

                // Apply borders to data cells
                row.eachCell({ includeEmpty: true }, (cell, colNumber) => {
                    if (colNumber <= (config.columns?.length || row.cellCount)) {
                        cell.border = ExcelService.STYLES.dataBorder;

                        // Apply column-specific formatting
                        if (config.columns && config.columns[colNumber - 1]) {
                            const colConfig = config.columns[colNumber - 1];
                            if (colConfig.type === 'currency') {
                                cell.numFmt = ExcelService.STYLES.currencyFormat;
                            } else if (colConfig.type === 'percent') {
                                cell.numFmt = ExcelService.STYLES.percentFormat;
                            } else if (colConfig.type === 'date') {
                                cell.numFmt = ExcelService.STYLES.dateFormat;
                            } else if (colConfig.type === 'datetime') {
                                cell.numFmt = ExcelService.STYLES.dateTimeFormat;
                            }
                        }
                    }
                });

                currentRow++;
            });

            // Apply conditional formatting if specified
            if (config.conditionalFormatting) {
                this._applyConditionalFormatting(worksheet, config.conditionalFormatting, dataStartRow, currentRow - 1, config.columns?.length || 1);
            }
        }

        // Add summary/totals row if provided
        if (config.totals) {
            currentRow++; // blank row
            const totalsRow = worksheet.getRow(currentRow);
            totalsRow.font = { bold: true };

            config.totals.forEach((total, index) => {
                const cell = totalsRow.getCell(index + 1);
                cell.value = total.value;
                if (total.formula) {
                    cell.value = { formula: total.formula };
                }
                cell.border = {
                    top: { style: 'double', color: { argb: '1B5E20' } },
                    bottom: { style: 'double', color: { argb: '1B5E20' } }
                };
            });
        }

        // Add custom styles if provided
        if (config.styles) {
            Object.keys(config.styles).forEach(cellRef => {
                const cell = worksheet.getCell(cellRef);
                Object.assign(cell, config.styles[cellRef]);
            });
        }

        return worksheet;
    }

    /**
     * Get default style for column type
     * @private
     */
    _getColumnStyle(type) {
        switch (type) {
            case 'currency':
                return { numFmt: ExcelService.STYLES.currencyFormat };
            case 'percent':
                return { numFmt: ExcelService.STYLES.percentFormat };
            case 'date':
                return { numFmt: ExcelService.STYLES.dateFormat };
            case 'datetime':
                return { numFmt: ExcelService.STYLES.dateTimeFormat };
            default:
                return {};
        }
    }

    /**
     * Apply conditional formatting rules
     * @private
     */
    _applyConditionalFormatting(worksheet, rules, startRow, endRow, colCount) {
        rules.forEach(rule => {
            const ref = rule.column
                ? `${this._getColumnLetter(rule.column)}${startRow}:${this._getColumnLetter(rule.column)}${endRow}`
                : `A${startRow}:${this._getColumnLetter(colCount)}${endRow}`;

            worksheet.addConditionalFormatting({
                ref,
                rules: [{
                    type: rule.type || 'cellIs',
                    operator: rule.operator || 'greaterThan',
                    formulae: rule.formulae || [rule.value],
                    style: {
                        fill: {
                            type: 'pattern',
                            pattern: 'solid',
                            bgColor: { argb: rule.bgColor || 'FFEB3B' }
                        },
                        font: rule.fontColor ? { color: { argb: rule.fontColor } } : undefined
                    }
                }]
            });
        });
    }

    /**
     * Convert column number to letter
     * @private
     */
    _getColumnLetter(num) {
        let letter = '';
        while (num > 0) {
            const remainder = (num - 1) % 26;
            letter = String.fromCharCode(65 + remainder) + letter;
            num = Math.floor((num - 1) / 26);
        }
        return letter;
    }

    /**
     * Generate a patient data Excel report with enhanced formatting
     * @param {Array} patients - Array of patient data
     * @param {Object} options - Report options
     * @return {Promise<Buffer>} - Excel file as buffer
     */
    async generatePatientReport(patients, options = {}) {
        const worksheets = [
            {
                name: 'Patients',
                title: 'Patient Report',
                subtitle: options.subtitle || 'All Active Patients',
                tabColor: '4CAF50',
                columns: [
                    { header: 'ID', key: 'id', width: 10, type: 'number' },
                    { header: 'First Name', key: 'firstName', width: 20 },
                    { header: 'Last Name', key: 'lastName', width: 20 },
                    { header: 'Date of Birth', key: 'dateOfBirth', width: 15, type: 'date' },
                    { header: 'Gender', key: 'gender', width: 10 },
                    { header: 'Email', key: 'email', width: 30 },
                    { header: 'Status', key: 'status', width: 12 }
                ],
                data: patients.map(patient => ({
                    id: patient.id,
                    firstName: patient.firstName || patient.first_name,
                    lastName: patient.lastName || patient.last_name,
                    dateOfBirth: patient.dateOfBirth || patient.date_of_birth,
                    gender: patient.gender,
                    email: patient.email,
                    status: patient.status || 'ACTIVE'
                }))
            }
        ];

        return await this.generateExcel(worksheets, { title: 'Patient Report' });
    }

    /**
     * Generate a clinical notes Excel report
     * @param {Array} notes - Array of clinical note data
     * @return {Promise<Buffer>} - Excel file as buffer
     */
    async generateClinicalNotesReport(notes, options = {}) {
        const worksheets = [
            {
                name: 'Clinical Notes',
                title: 'Clinical Notes Report',
                subtitle: options.subtitle,
                tabColor: '2196F3',
                columns: [
                    { header: 'ID', key: 'id', width: 10 },
                    { header: 'Patient ID', key: 'patientId', width: 15 },
                    { header: 'Date', key: 'date', width: 15, type: 'date' },
                    { header: 'Note', key: 'note', width: 50 },
                    { header: 'Created At', key: 'createdAt', width: 20, type: 'datetime' }
                ],
                data: notes.map(note => ({
                    id: note.id,
                    patientId: note.patientId || note.patient_id,
                    date: note.date,
                    note: note.note,
                    createdAt: note.createdAt || note.created_at
                }))
            }
        ];

        return await this.generateExcel(worksheets, { title: 'Clinical Notes Report' });
    }

    /**
     * Generate Census Report with multiple sheets
     * @param {Object} censusData - Census data with patients and summary
     * @param {Object} options - Report options
     * @return {Promise<Buffer>} - Excel file as buffer
     */
    async generateCensusReport(censusData, options = {}) {
        const worksheets = [
            {
                name: 'Census',
                title: 'Current Census Report',
                subtitle: `As of: ${new Date().toLocaleDateString()}`,
                tabColor: '4CAF50',
                columns: [
                    { header: 'Patient ID', key: 'patient_id', width: 12 },
                    { header: 'Patient Name', key: 'patient_name', width: 25 },
                    { header: 'MRN', key: 'mrn', width: 15 },
                    { header: 'Admission Date', key: 'admission_date', width: 15, type: 'date' },
                    { header: 'Primary Diagnosis', key: 'primary_diagnosis', width: 30 },
                    { header: 'Level of Care', key: 'level_of_care', width: 15 },
                    { header: 'Attending Physician', key: 'attending_physician', width: 25 }
                ],
                data: censusData.patients || []
            },
            {
                name: 'Summary',
                title: 'Census Summary by Level of Care',
                tabColor: '2196F3',
                columns: [
                    { header: 'Level of Care', key: 'level_of_care', width: 20 },
                    { header: 'Patient Count', key: 'total_patients', width: 15, type: 'number' }
                ],
                data: censusData.summary || [],
                totals: [
                    { value: 'Total' },
                    { value: censusData.total_count || 0 }
                ]
            }
        ];

        return await this.generateExcel(worksheets, { title: 'Census Report' });
    }

    /**
     * Generate AR Aging Report with formatting
     * @param {Object} arData - AR aging data
     * @param {Object} options - Report options
     * @return {Promise<Buffer>} - Excel file as buffer
     */
    async generateARAgingReport(arData, options = {}) {
        const worksheets = [
            {
                name: 'AR Aging',
                title: 'Accounts Receivable Aging Report',
                subtitle: `As of: ${new Date().toLocaleDateString()}`,
                tabColor: 'FF9800',
                columns: [
                    { header: 'Aging Bucket', key: 'aging_bucket', width: 15 },
                    { header: 'Total Balance', key: 'total_balance', width: 18, type: 'currency' },
                    { header: 'Claim Count', key: 'claim_count', width: 12, type: 'number' }
                ],
                data: arData.by_bucket || [],
                conditionalFormatting: [
                    { column: 2, operator: 'greaterThan', value: 50000, bgColor: 'FFCDD2', fontColor: 'C62828' }
                ],
                totals: [
                    { value: 'Total' },
                    { value: arData.totals?.total_ar || 0 },
                    { value: arData.totals?.total_claims || 0 }
                ]
            }
        ];

        return await this.generateExcel(worksheets, { title: 'AR Aging Report' });
    }

    /**
     * Generate Billing Report with multiple sheets
     * @param {Object} billingData - Billing data including claims, payments, etc.
     * @param {Object} options - Report options
     * @return {Promise<Buffer>} - Excel file as buffer
     */
    async generateBillingReport(billingData, options = {}) {
        const worksheets = [];

        // Pending Claims sheet
        if (billingData.pendingClaims) {
            worksheets.push({
                name: 'Pending Claims',
                title: 'Claims Pending Submission',
                tabColor: 'FF5722',
                columns: [
                    { header: 'Claim ID', key: 'claim_id', width: 12 },
                    { header: 'Patient Name', key: 'patient_name', width: 25 },
                    { header: 'Claim Number', key: 'claim_number', width: 18 },
                    { header: 'Claim Type', key: 'claim_type', width: 12 },
                    { header: 'Status', key: 'claim_status', width: 18 },
                    { header: 'Service Start', key: 'service_start_date', width: 14, type: 'date' },
                    { header: 'Service End', key: 'service_end_date', width: 14, type: 'date' },
                    { header: 'Total Charges', key: 'total_charges', width: 15, type: 'currency' },
                    { header: 'Days Pending', key: 'days_pending', width: 12, type: 'number' }
                ],
                data: billingData.pendingClaims.claims || [],
                conditionalFormatting: [
                    { column: 9, operator: 'greaterThan', value: 30, bgColor: 'FFEB3B' },
                    { column: 9, operator: 'greaterThan', value: 60, bgColor: 'FFCDD2', fontColor: 'C62828' }
                ]
            });
        }

        // Revenue by Payer sheet
        if (billingData.revenueByPayer) {
            worksheets.push({
                name: 'Revenue by Payer',
                title: 'Revenue Analysis by Payer',
                subtitle: `${options.fromDate || ''} - ${options.toDate || ''}`,
                tabColor: '4CAF50',
                columns: [
                    { header: 'Payer ID', key: 'payer_id', width: 12 },
                    { header: 'Total Charges', key: 'total_charges', width: 18, type: 'currency' },
                    { header: 'Total Paid', key: 'total_paid', width: 18, type: 'currency' },
                    { header: 'Claim Count', key: 'claim_count', width: 12, type: 'number' }
                ],
                data: billingData.revenueByPayer.payers || []
            });
        }

        // Unbilled Periods sheet
        if (billingData.unbilledPeriods) {
            worksheets.push({
                name: 'Unbilled Periods',
                title: 'Unbilled Service Periods',
                tabColor: 'F44336',
                columns: [
                    { header: 'Patient ID', key: 'patient_id', width: 12 },
                    { header: 'Patient Name', key: 'patient_name', width: 25 },
                    { header: 'Period Start', key: 'period_start', width: 14, type: 'date' },
                    { header: 'Period End', key: 'period_end', width: 14, type: 'date' },
                    { header: 'Level of Care', key: 'level_of_care', width: 15 },
                    { header: 'Days Unbilled', key: 'days_unbilled', width: 14, type: 'number' }
                ],
                data: billingData.unbilledPeriods.periods || [],
                conditionalFormatting: [
                    { column: 6, operator: 'greaterThan', value: 14, bgColor: 'FFEB3B' },
                    { column: 6, operator: 'greaterThan', value: 30, bgColor: 'FFCDD2', fontColor: 'C62828' }
                ]
            });
        }

        return await this.generateExcel(worksheets, { title: 'Billing Report' });
    }

    /**
     * Generate Staff Report with multiple sheets
     * @param {Object} staffData - Staff data including productivity, credentials
     * @param {Object} options - Report options
     * @return {Promise<Buffer>} - Excel file as buffer
     */
    async generateStaffReport(staffData, options = {}) {
        const worksheets = [];

        // Productivity sheet
        if (staffData.productivity) {
            worksheets.push({
                name: 'Productivity',
                title: 'Staff Productivity Report',
                tabColor: '9C27B0',
                columns: [
                    { header: 'Staff ID', key: 'staff_id', width: 12 },
                    { header: 'Staff Name', key: 'staff_name', width: 25 },
                    { header: 'Role', key: 'role', width: 18 },
                    { header: 'Caseload Count', key: 'caseload_count', width: 15, type: 'number' }
                ],
                data: staffData.productivity || []
            });
        }

        // Credential Expirations sheet
        if (staffData.credentials) {
            worksheets.push({
                name: 'Credential Expirations',
                title: 'Staff Credential Expiration Alert',
                subtitle: `Expiring within ${options.daysAhead || 90} days`,
                tabColor: 'FF5722',
                columns: [
                    { header: 'Staff ID', key: 'staff_id', width: 12 },
                    { header: 'Staff Name', key: 'staff_name', width: 25 },
                    { header: 'Credential Type', key: 'credential_type', width: 20 },
                    { header: 'Credential #', key: 'credential_number', width: 18 },
                    { header: 'Expiration Date', key: 'expiration_date', width: 15, type: 'date' },
                    { header: 'Days Until Expiration', key: 'days_until_expiration', width: 18, type: 'number' }
                ],
                data: staffData.credentials.credentials || [],
                conditionalFormatting: [
                    { column: 6, operator: 'lessThan', value: 30, bgColor: 'FFCDD2', fontColor: 'C62828' },
                    { column: 6, operator: 'between', formulae: [30, 60], bgColor: 'FFEB3B' }
                ]
            });
        }

        // Caseload Summary sheet
        if (staffData.caseload) {
            worksheets.push({
                name: 'Caseload Summary',
                title: 'Staff Caseload Distribution',
                tabColor: '2196F3',
                columns: [
                    { header: 'Staff ID', key: 'staff_id', width: 12 },
                    { header: 'Staff Name', key: 'staff_name', width: 25 },
                    { header: 'Role', key: 'role', width: 18 },
                    { header: 'Active Patients', key: 'active_patients', width: 15, type: 'number' }
                ],
                data: staffData.caseload || []
            });
        }

        return await this.generateExcel(worksheets, { title: 'Staff Report' });
    }

    /**
     * Generate QAPI Report with multiple sheets
     * @param {Object} qapiData - QAPI data including incidents, grievances, quality measures
     * @param {Object} options - Report options
     * @return {Promise<Buffer>} - Excel file as buffer
     */
    async generateQAPIReport(qapiData, options = {}) {
        const worksheets = [];

        // Incidents sheet
        if (qapiData.incidents) {
            worksheets.push({
                name: 'Incidents',
                title: 'Incidents Summary Report',
                subtitle: `${options.fromDate || ''} - ${options.toDate || ''}`,
                tabColor: 'F44336',
                columns: [
                    { header: 'Incident Type', key: 'incident_type', width: 20 },
                    { header: 'Total Count', key: 'count', width: 12, type: 'number' },
                    { header: 'High Severity', key: 'high_severity', width: 14, type: 'number' },
                    { header: 'Moderate Severity', key: 'moderate_severity', width: 16, type: 'number' },
                    { header: 'Low Severity', key: 'low_severity', width: 14, type: 'number' }
                ],
                data: qapiData.incidents.by_type || []
            });
        }

        // Grievances sheet
        if (qapiData.grievances) {
            worksheets.push({
                name: 'Grievances',
                title: 'Grievances Summary Report',
                subtitle: `${options.fromDate || ''} - ${options.toDate || ''}`,
                tabColor: 'FF9800',
                columns: [
                    { header: 'Grievance Type', key: 'grievance_type', width: 20 },
                    { header: 'Total Count', key: 'count', width: 12, type: 'number' },
                    { header: 'High Priority', key: 'high_priority', width: 14, type: 'number' }
                ],
                data: qapiData.grievances.by_type || []
            });
        }

        // Quality Measures sheet
        if (qapiData.qualityMeasures) {
            worksheets.push({
                name: 'Quality Measures',
                title: 'Quality Measures Dashboard',
                tabColor: '4CAF50',
                columns: [
                    { header: 'Measure ID', key: 'quality_measure_id', width: 15 },
                    { header: 'Avg Actual', key: 'avg_actual_value', width: 14, type: 'number' },
                    { header: 'Avg Target', key: 'avg_target_value', width: 14, type: 'number' },
                    { header: 'Avg Variance', key: 'avg_variance', width: 14, type: 'number' },
                    { header: 'Measurement Count', key: 'measurement_count', width: 18, type: 'number' }
                ],
                data: qapiData.qualityMeasures.measures || []
            });
        }

        // Chart Audit Scores sheet
        if (qapiData.chartAudits) {
            worksheets.push({
                name: 'Chart Audits',
                title: 'Chart Audit Compliance Scores',
                tabColor: '2196F3',
                columns: [
                    { header: 'Auditor ID', key: 'auditor_id', width: 12 },
                    { header: 'Avg Compliance Score', key: 'avg_compliance_score', width: 20, type: 'percent' },
                    { header: 'Audit Count', key: 'audit_count', width: 14, type: 'number' }
                ],
                data: qapiData.chartAudits.by_auditor || []
            });
        }

        return await this.generateExcel(worksheets, { title: 'QAPI Report' });
    }

    /**
     * Generate Analytics Export Report
     * @param {String} reportType - Type of analytics report
     * @param {Object} data - Analytics data
     * @param {Object} options - Report options
     * @return {Promise<Buffer>} - Excel file as buffer
     */
    async generateAnalyticsReport(reportType, data, options = {}) {
        let worksheets = [];

        switch (reportType) {
            case 'clean_claim_rate':
                worksheets.push({
                    name: 'Clean Claim Rate',
                    title: 'Clean Claim Rate Analysis',
                    subtitle: `${options.startDate || ''} - ${options.endDate || ''}`,
                    tabColor: '4CAF50',
                    columns: [
                        { header: 'Period', key: 'period', width: 15 },
                        { header: 'Total Submitted', key: 'total_submitted', width: 16, type: 'number' },
                        { header: 'Accepted First Pass', key: 'accepted_first_pass', width: 18, type: 'number' },
                        { header: 'Clean Rate (%)', key: 'clean_rate', width: 14, type: 'percent' }
                    ],
                    data: data.data_points || [],
                    conditionalFormatting: [
                        { column: 4, operator: 'greaterThan', value: 0.95, bgColor: 'C8E6C9' },
                        { column: 4, operator: 'lessThan', value: 0.80, bgColor: 'FFCDD2' }
                    ]
                });
                break;

            case 'days_to_payment':
                worksheets.push({
                    name: 'Days to Payment',
                    title: 'Days to Payment Trend',
                    subtitle: `${options.startDate || ''} - ${options.endDate || ''}`,
                    tabColor: '2196F3',
                    columns: [
                        { header: 'Period', key: 'period', width: 15 },
                        { header: 'Avg Days', key: 'avg_days', width: 12, type: 'number' },
                        { header: 'Median Days', key: 'median_days', width: 14, type: 'number' },
                        { header: 'Min Days', key: 'min_days', width: 12, type: 'number' },
                        { header: 'Max Days', key: 'max_days', width: 12, type: 'number' }
                    ],
                    data: data.data_points || []
                });
                break;

            case 'denial_rate_by_payer':
                worksheets.push({
                    name: 'Denial Rate by Payer',
                    title: 'Denial Rate Analysis by Payer',
                    subtitle: `${options.startDate || ''} - ${options.endDate || ''}`,
                    tabColor: 'FF5722',
                    columns: [
                        { header: 'Payer ID', key: 'payer_id', width: 12 },
                        { header: 'Payer Name', key: 'payer_name', width: 25 },
                        { header: 'Total Claims', key: 'total_claims', width: 14, type: 'number' },
                        { header: 'Denied Claims', key: 'denied_claims', width: 14, type: 'number' },
                        { header: 'Denial Rate (%)', key: 'denial_rate', width: 14, type: 'percent' }
                    ],
                    data: data || [],
                    conditionalFormatting: [
                        { column: 5, operator: 'greaterThan', value: 0.10, bgColor: 'FFCDD2', fontColor: 'C62828' }
                    ]
                });
                break;

            case 'net_collection_rate':
                worksheets.push({
                    name: 'Net Collection Rate',
                    title: 'Net Collection Rate Trend',
                    subtitle: `${options.startDate || ''} - ${options.endDate || ''}`,
                    tabColor: '9C27B0',
                    columns: [
                        { header: 'Period', key: 'period', width: 15 },
                        { header: 'Net Collection Rate (%)', key: 'net_collection_rate', width: 22, type: 'percent' }
                    ],
                    data: data.trend_by_month || []
                });
                break;

            case 'ar_aging_trend':
                worksheets.push({
                    name: 'AR Aging Trend',
                    title: 'AR Aging Trend Analysis',
                    subtitle: `${options.startDate || ''} - ${options.endDate || ''}`,
                    tabColor: 'FF9800',
                    columns: [
                        { header: 'Period', key: 'period', width: 15 },
                        { header: '0-30 Days', key: '0-30_days', width: 14, type: 'currency' },
                        { header: '31-60 Days', key: '31-60_days', width: 14, type: 'currency' },
                        { header: '61-90 Days', key: '61-90_days', width: 14, type: 'currency' },
                        { header: '91-120 Days', key: '91-120_days', width: 14, type: 'currency' },
                        { header: 'Over 120 Days', key: 'over_120_days', width: 14, type: 'currency' },
                        { header: 'Total AR', key: 'total_ar', width: 14, type: 'currency' }
                    ],
                    data: (data.data_points || []).map(dp => ({
                        period: dp.period,
                        '0-30_days': dp.buckets?.['0-30_days'] || 0,
                        '31-60_days': dp.buckets?.['31-60_days'] || 0,
                        '61-90_days': dp.buckets?.['61-90_days'] || 0,
                        '91-120_days': dp.buckets?.['91-120_days'] || 0,
                        'over_120_days': dp.buckets?.['over_120_days'] || 0,
                        total_ar: dp.total_ar || 0
                    }))
                });
                break;

            default:
                throw new Error(`Unknown report type: ${reportType}`);
        }

        return await this.generateExcel(worksheets, { title: `Analytics Report - ${reportType}` });
    }

    /**
     * Generate Executive Dashboard Excel Report
     * @param {Object} dashboardData - Executive dashboard data
     * @param {Object} options - Report options
     * @return {Promise<Buffer>} - Excel file as buffer
     */
    async generateExecutiveDashboardReport(dashboardData, options = {}) {
        const worksheets = [
            {
                name: 'Executive Dashboard',
                title: 'Executive Dashboard Summary',
                subtitle: `As of: ${new Date().toLocaleDateString()}`,
                tabColor: '1B5E20',
                showTimestamp: true,
                columns: [
                    { header: 'Metric', key: 'metric', width: 30 },
                    { header: 'Value', key: 'value', width: 20 }
                ],
                data: [
                    { metric: 'Current Census', value: dashboardData.current_census || 0 },
                    { metric: 'Pending Claims', value: dashboardData.pending_claims || 0 },
                    { metric: 'Pending Claims Value', value: dashboardData.pending_claims_value || 0 },
                    { metric: 'Active Incidents', value: dashboardData.active_incidents || 0 },
                    { metric: 'Active Grievances', value: dashboardData.active_grievances || 0 },
                    { metric: 'Recertifications Due (30 days)', value: dashboardData.recertifications_due_30_days || 0 }
                ]
            }
        ];

        return await this.generateExcel(worksheets, { title: 'Executive Dashboard Report' });
    }
}

export default new ExcelService();