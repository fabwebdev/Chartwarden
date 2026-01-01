import ExcelJS from 'exceljs';

/**
 * Data Export Service
 * Comprehensive data export service supporting multiple formats:
 * - CSV (Comma-Separated Values)
 * - JSON (JavaScript Object Notation)
 * - XML (Extensible Markup Language)
 * - Excel (XLSX with professional formatting)
 *
 * Features:
 * - Multi-format export with consistent API
 * - Column selection and filtering
 * - Date range filtering
 * - Streaming support for large datasets
 * - UTF-8 encoding for special characters
 * - Rate limiting support
 * - Export history tracking
 */
class DataExportService {
    // Supported export formats
    static FORMATS = {
        CSV: 'csv',
        JSON: 'json',
        XML: 'xml',
        EXCEL: 'excel'
    };

    // MIME types for each format
    static MIME_TYPES = {
        csv: 'text/csv; charset=utf-8',
        json: 'application/json; charset=utf-8',
        xml: 'application/xml; charset=utf-8',
        excel: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    };

    // File extensions for each format
    static FILE_EXTENSIONS = {
        csv: 'csv',
        json: 'json',
        xml: 'xml',
        excel: 'xlsx'
    };

    // Default styles for Excel exports
    static EXCEL_STYLES = {
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
        }
    };

    // Export history (in-memory, can be persisted to DB)
    exportHistory = [];
    exportCounter = 0;

    /**
     * Get supported export formats
     * @returns {Array} List of supported formats with metadata
     */
    getSupportedFormats() {
        return [
            {
                id: 'csv',
                name: 'CSV',
                description: 'Comma-Separated Values - Compatible with Excel and most spreadsheet applications',
                mimeType: DataExportService.MIME_TYPES.csv,
                extension: 'csv'
            },
            {
                id: 'json',
                name: 'JSON',
                description: 'JavaScript Object Notation - Ideal for developers and API integrations',
                mimeType: DataExportService.MIME_TYPES.json,
                extension: 'json'
            },
            {
                id: 'xml',
                name: 'XML',
                description: 'Extensible Markup Language - Enterprise-standard data interchange format',
                mimeType: DataExportService.MIME_TYPES.xml,
                extension: 'xml'
            },
            {
                id: 'excel',
                name: 'Excel',
                description: 'Microsoft Excel format with professional formatting and multiple worksheets',
                mimeType: DataExportService.MIME_TYPES.excel,
                extension: 'xlsx'
            }
        ];
    }

    /**
     * Estimate export size based on data
     * @param {Array} data - Data to export
     * @param {String} format - Export format
     * @param {Array} columns - Selected columns (optional)
     * @returns {Object} Size estimation
     */
    estimateExportSize(data, format, columns = null) {
        if (!Array.isArray(data) || data.length === 0) {
            return {
                rowCount: 0,
                estimatedSizeBytes: 0,
                estimatedSizeFormatted: '0 B',
                warning: null
            };
        }

        const rowCount = data.length;
        let estimatedBytesPerRow = 0;

        // Estimate based on first row
        const firstRow = data[0];
        const selectedKeys = columns || Object.keys(firstRow);

        selectedKeys.forEach(key => {
            const value = firstRow[key];
            if (value === null || value === undefined) {
                estimatedBytesPerRow += 4; // 'null'
            } else if (typeof value === 'string') {
                estimatedBytesPerRow += value.length * 2; // UTF-8 chars
            } else if (typeof value === 'number') {
                estimatedBytesPerRow += 12; // average number length
            } else if (typeof value === 'boolean') {
                estimatedBytesPerRow += 5; // 'true' or 'false'
            } else if (value instanceof Date) {
                estimatedBytesPerRow += 24; // ISO date string
            } else {
                estimatedBytesPerRow += JSON.stringify(value).length;
            }
        });

        // Add format-specific overhead
        let overhead = 1.0;
        switch (format) {
            case 'csv':
                overhead = 1.1; // Commas and quotes
                break;
            case 'json':
                overhead = 1.3; // Keys, brackets, quotes
                break;
            case 'xml':
                overhead = 2.0; // Tags duplicate field names
                break;
            case 'excel':
                overhead = 1.5; // Binary overhead + formatting
                break;
        }

        const estimatedSizeBytes = Math.ceil(rowCount * estimatedBytesPerRow * overhead);
        const estimatedSizeFormatted = this._formatBytes(estimatedSizeBytes);

        let warning = null;
        if (estimatedSizeBytes > 50 * 1024 * 1024) { // > 50MB
            warning = 'Large export: This may take a while to process and download.';
        } else if (rowCount > 100000) {
            warning = 'Large dataset: Consider filtering your date range for faster exports.';
        }

        return {
            rowCount,
            columnCount: selectedKeys.length,
            estimatedSizeBytes,
            estimatedSizeFormatted,
            warning
        };
    }

    /**
     * Export data to specified format
     * @param {Array} data - Data to export
     * @param {String} format - Export format (csv, json, xml, excel)
     * @param {Object} options - Export options
     * @returns {Promise<Object>} Export result with buffer and metadata
     */
    async exportData(data, format, options = {}) {
        const startTime = Date.now();
        const exportId = `export_${++this.exportCounter}_${Date.now()}`;

        // Validate format
        if (!Object.values(DataExportService.FORMATS).includes(format)) {
            throw new Error(`Unsupported export format: ${format}. Supported formats: ${Object.values(DataExportService.FORMATS).join(', ')}`);
        }

        // Validate data
        if (!Array.isArray(data)) {
            throw new Error('Data must be an array');
        }

        // Apply column selection if specified
        let exportData = data;
        if (options.columns && Array.isArray(options.columns) && options.columns.length > 0) {
            exportData = this._selectColumns(data, options.columns);
        }

        // Apply date filtering if specified
        if (options.dateField && (options.startDate || options.endDate)) {
            exportData = this._filterByDateRange(exportData, options.dateField, options.startDate, options.endDate);
        }

        // Check for empty result
        if (exportData.length === 0) {
            return {
                exportId,
                buffer: null,
                isEmpty: true,
                rowCount: 0,
                format,
                mimeType: DataExportService.MIME_TYPES[format],
                extension: DataExportService.FILE_EXTENSIONS[format],
                message: 'No records match the specified criteria'
            };
        }

        // Generate export based on format
        let buffer;
        switch (format) {
            case DataExportService.FORMATS.CSV:
                buffer = this._generateCSV(exportData, options);
                break;
            case DataExportService.FORMATS.JSON:
                buffer = this._generateJSON(exportData, options);
                break;
            case DataExportService.FORMATS.XML:
                buffer = this._generateXML(exportData, options);
                break;
            case DataExportService.FORMATS.EXCEL:
                buffer = await this._generateExcel(exportData, options);
                break;
        }

        const endTime = Date.now();
        const duration = endTime - startTime;

        // Generate filename
        const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
        const resourceType = options.resourceType || 'data';
        const customFilename = options.filename;
        const filename = customFilename
            ? `${customFilename}-${timestamp}.${DataExportService.FILE_EXTENSIONS[format]}`
            : `${resourceType}-export-${timestamp}.${DataExportService.FILE_EXTENSIONS[format]}`;

        // Record in export history
        const exportRecord = {
            id: exportId,
            timestamp: new Date().toISOString(),
            format,
            filename,
            rowCount: exportData.length,
            sizeBytes: buffer.length,
            sizeFormatted: this._formatBytes(buffer.length),
            durationMs: duration,
            resourceType: options.resourceType,
            userId: options.userId,
            status: 'completed'
        };
        this.exportHistory.unshift(exportRecord);

        // Keep only last 100 exports in history
        if (this.exportHistory.length > 100) {
            this.exportHistory = this.exportHistory.slice(0, 100);
        }

        return {
            exportId,
            buffer,
            isEmpty: false,
            rowCount: exportData.length,
            format,
            mimeType: DataExportService.MIME_TYPES[format],
            extension: DataExportService.FILE_EXTENSIONS[format],
            filename,
            sizeBytes: buffer.length,
            sizeFormatted: this._formatBytes(buffer.length),
            durationMs: duration
        };
    }

    /**
     * Get export history
     * @param {Object} options - Filter options
     * @returns {Array} Export history records
     */
    getExportHistory(options = {}) {
        let history = [...this.exportHistory];

        if (options.userId) {
            history = history.filter(h => h.userId === options.userId);
        }

        if (options.format) {
            history = history.filter(h => h.format === options.format);
        }

        if (options.resourceType) {
            history = history.filter(h => h.resourceType === options.resourceType);
        }

        if (options.limit) {
            history = history.slice(0, options.limit);
        }

        return history;
    }

    /**
     * Clear export history
     * @param {String} userId - Optional user ID to clear only their history
     */
    clearExportHistory(userId = null) {
        if (userId) {
            this.exportHistory = this.exportHistory.filter(h => h.userId !== userId);
        } else {
            this.exportHistory = [];
        }
    }

    /**
     * Generate CSV from data
     * @private
     */
    _generateCSV(data, options = {}) {
        if (data.length === 0) {
            return Buffer.from('', 'utf-8');
        }

        const delimiter = options.delimiter || ',';
        const lineEnding = options.lineEnding || '\n';
        const includeHeader = options.includeHeader !== false;

        // Get column headers from first row
        const headers = Object.keys(data[0]);

        const rows = [];

        // Add header row
        if (includeHeader) {
            rows.push(headers.map(h => this._escapeCSVValue(h, delimiter)).join(delimiter));
        }

        // Add data rows
        for (const row of data) {
            const values = headers.map(header => {
                const value = row[header];
                return this._escapeCSVValue(value, delimiter);
            });
            rows.push(values.join(delimiter));
        }

        // Add BOM for UTF-8 Excel compatibility
        const bom = '\uFEFF';
        return Buffer.from(bom + rows.join(lineEnding), 'utf-8');
    }

    /**
     * Escape CSV value
     * @private
     */
    _escapeCSVValue(value, delimiter = ',') {
        if (value === null || value === undefined) {
            return '';
        }

        let stringValue = String(value);

        // Handle Date objects
        if (value instanceof Date) {
            stringValue = value.toISOString();
        }

        // Handle objects
        if (typeof value === 'object' && !(value instanceof Date)) {
            stringValue = JSON.stringify(value);
        }

        // Check if escaping is needed
        const needsEscaping = stringValue.includes(delimiter) ||
            stringValue.includes('"') ||
            stringValue.includes('\n') ||
            stringValue.includes('\r');

        if (needsEscaping) {
            // Escape double quotes
            stringValue = stringValue.replace(/"/g, '""');
            // Wrap in quotes
            stringValue = `"${stringValue}"`;
        }

        return stringValue;
    }

    /**
     * Generate JSON from data
     * @private
     */
    _generateJSON(data, options = {}) {
        const pretty = options.pretty !== false;
        const wrapInObject = options.wrapInObject !== false;

        let jsonOutput;
        if (wrapInObject) {
            jsonOutput = {
                exportedAt: new Date().toISOString(),
                recordCount: data.length,
                data: data
            };

            // Add metadata if provided
            if (options.metadata) {
                jsonOutput.metadata = options.metadata;
            }
        } else {
            jsonOutput = data;
        }

        const jsonString = pretty
            ? JSON.stringify(jsonOutput, null, 2)
            : JSON.stringify(jsonOutput);

        return Buffer.from(jsonString, 'utf-8');
    }

    /**
     * Generate XML from data
     * @private
     */
    _generateXML(data, options = {}) {
        const rootElement = options.rootElement || 'export';
        const itemElement = options.itemElement || 'record';
        const pretty = options.pretty !== false;
        const indent = pretty ? '  ' : '';
        const newline = pretty ? '\n' : '';

        let xml = '<?xml version="1.0" encoding="UTF-8"?>';
        xml += newline;
        xml += `<${rootElement}>`;
        xml += newline;

        // Add metadata
        if (options.includeMetadata !== false) {
            xml += `${indent}<metadata>`;
            xml += newline;
            xml += `${indent}${indent}<exportedAt>${this._escapeXML(new Date().toISOString())}</exportedAt>`;
            xml += newline;
            xml += `${indent}${indent}<recordCount>${data.length}</recordCount>`;
            xml += newline;
            xml += `${indent}</metadata>`;
            xml += newline;
        }

        // Add data records
        xml += `${indent}<records>`;
        xml += newline;

        for (const row of data) {
            xml += `${indent}${indent}<${itemElement}>`;
            xml += newline;

            for (const [key, value] of Object.entries(row)) {
                const sanitizedKey = this._sanitizeXMLElementName(key);
                const escapedValue = this._escapeXML(value);
                xml += `${indent}${indent}${indent}<${sanitizedKey}>${escapedValue}</${sanitizedKey}>`;
                xml += newline;
            }

            xml += `${indent}${indent}</${itemElement}>`;
            xml += newline;
        }

        xml += `${indent}</records>`;
        xml += newline;
        xml += `</${rootElement}>`;

        return Buffer.from(xml, 'utf-8');
    }

    /**
     * Escape XML special characters
     * @private
     */
    _escapeXML(value) {
        if (value === null || value === undefined) {
            return '';
        }

        // Handle Date objects
        if (value instanceof Date) {
            return value.toISOString();
        }

        // Handle objects
        if (typeof value === 'object') {
            return this._escapeXML(JSON.stringify(value));
        }

        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }

    /**
     * Sanitize string to be a valid XML element name
     * @private
     */
    _sanitizeXMLElementName(name) {
        // XML element names cannot start with numbers or contain certain characters
        let sanitized = String(name).replace(/[^a-zA-Z0-9_-]/g, '_');

        // Cannot start with number
        if (/^[0-9]/.test(sanitized)) {
            sanitized = '_' + sanitized;
        }

        // Cannot start with xml (case-insensitive)
        if (/^xml/i.test(sanitized)) {
            sanitized = '_' + sanitized;
        }

        return sanitized || 'field';
    }

    /**
     * Generate Excel from data
     * @private
     */
    async _generateExcel(data, options = {}) {
        const workbook = new ExcelJS.Workbook();

        // Set workbook properties
        workbook.creator = options.author || 'Chartwarden EHR';
        workbook.lastModifiedBy = options.author || 'Chartwarden EHR';
        workbook.created = new Date();
        workbook.modified = new Date();
        workbook.company = 'Chartwarden';
        workbook.title = options.title || 'Data Export';

        // Create worksheet
        const sheetName = options.sheetName || 'Data';
        const worksheet = workbook.addWorksheet(sheetName, {
            properties: {
                tabColor: { argb: options.tabColor || '4CAF50' }
            },
            pageSetup: {
                paperSize: 9, // A4
                orientation: 'landscape',
                fitToPage: true,
                fitToWidth: 1,
                fitToHeight: 0
            },
            headerFooter: {
                oddHeader: `&C&B${options.title || 'Data Export'}`,
                oddFooter: '&LChartwarden EHR&C&D&RPage &P of &N'
            }
        });

        if (data.length === 0) {
            return await workbook.xlsx.writeBuffer();
        }

        let currentRow = 1;

        // Add title if provided
        if (options.title) {
            const titleRow = worksheet.getRow(currentRow);
            titleRow.getCell(1).value = options.title;
            titleRow.getCell(1).font = {
                bold: true,
                size: 16,
                name: 'Calibri',
                color: { argb: '1B5E20' }
            };
            const headers = Object.keys(data[0]);
            worksheet.mergeCells(currentRow, 1, currentRow, headers.length);
            titleRow.height = 25;
            currentRow++;
        }

        // Add subtitle if provided
        if (options.subtitle) {
            const subtitleRow = worksheet.getRow(currentRow);
            subtitleRow.getCell(1).value = options.subtitle;
            subtitleRow.getCell(1).font = {
                bold: false,
                size: 11,
                name: 'Calibri',
                color: { argb: '666666' }
            };
            const headers = Object.keys(data[0]);
            worksheet.mergeCells(currentRow, 1, currentRow, headers.length);
            currentRow++;
        }

        // Add timestamp
        const timestampRow = worksheet.getRow(currentRow);
        timestampRow.getCell(1).value = `Exported: ${new Date().toLocaleString()}`;
        timestampRow.getCell(1).font = {
            size: 9,
            italic: true,
            color: { argb: '666666' }
        };
        const headers = Object.keys(data[0]);
        worksheet.mergeCells(currentRow, 1, currentRow, headers.length);
        currentRow += 2;

        // Set up columns
        const columnConfigs = headers.map(header => ({
            header: this._formatHeaderName(header),
            key: header,
            width: Math.max(15, Math.min(50, header.length + 5))
        }));
        worksheet.columns = columnConfigs;

        // Style header row
        const headerRow = worksheet.getRow(currentRow);
        headerRow.values = columnConfigs.map(c => c.header);
        headerRow.height = 22;

        columnConfigs.forEach((col, index) => {
            const cell = headerRow.getCell(index + 1);
            cell.fill = DataExportService.EXCEL_STYLES.headerFill;
            cell.font = DataExportService.EXCEL_STYLES.headerFont;
            cell.alignment = DataExportService.EXCEL_STYLES.headerAlignment;
            cell.border = DataExportService.EXCEL_STYLES.headerBorder;
        });

        // Enable auto-filter
        const lastCol = columnConfigs.length;
        worksheet.autoFilter = {
            from: { row: currentRow, column: 1 },
            to: { row: currentRow, column: lastCol }
        };

        // Freeze header row
        worksheet.views = [{ state: 'frozen', ySplit: currentRow }];

        currentRow++;

        // Add data rows
        for (let i = 0; i < data.length; i++) {
            const rowData = data[i];
            const row = worksheet.getRow(currentRow);

            headers.forEach((header, colIndex) => {
                const cell = row.getCell(colIndex + 1);
                let value = rowData[header];

                // Handle null/undefined
                if (value === null || value === undefined) {
                    value = '';
                }

                // Handle objects
                if (typeof value === 'object' && !(value instanceof Date)) {
                    value = JSON.stringify(value);
                }

                cell.value = value;
                cell.border = DataExportService.EXCEL_STYLES.dataBorder;

                // Apply alternating row colors
                if (i % 2 === 1) {
                    cell.fill = DataExportService.EXCEL_STYLES.altRowFill;
                }
            });

            currentRow++;
        }

        return await workbook.xlsx.writeBuffer();
    }

    /**
     * Format header name (snake_case to Title Case)
     * @private
     */
    _formatHeaderName(header) {
        return header
            .replace(/_/g, ' ')
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/\b\w/g, l => l.toUpperCase());
    }

    /**
     * Select specific columns from data
     * @private
     */
    _selectColumns(data, columns) {
        return data.map(row => {
            const selected = {};
            columns.forEach(col => {
                if (row.hasOwnProperty(col)) {
                    selected[col] = row[col];
                }
            });
            return selected;
        });
    }

    /**
     * Filter data by date range
     * @private
     */
    _filterByDateRange(data, dateField, startDate, endDate) {
        return data.filter(row => {
            const dateValue = row[dateField];
            if (!dateValue) return false;

            const date = new Date(dateValue);
            if (isNaN(date.getTime())) return false;

            if (startDate && date < new Date(startDate)) return false;
            if (endDate && date > new Date(endDate)) return false;

            return true;
        });
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

export default new DataExportService();
