# Excel Report Service Documentation

## Overview

The Excel Report Service provides comprehensive Excel export functionality for all Chartwarden EHR report types. Built with ExcelJS, it generates professionally formatted, multi-sheet workbooks with advanced styling, conditional formatting, and HIPAA-compliant data export.

## Features

### Professional Formatting
- **Chartwarden Branding**: Custom green color scheme (#2E7D32)
- **Header Styling**: Bold white text on green background with filters
- **Alternating Row Colors**: Enhanced readability with subtle gray rows
- **Professional Borders**: Thin borders on data cells, bold on headers
- **Custom Fonts**: Calibri with appropriate sizing

### Advanced Capabilities
- ✅ Multiple worksheets with custom tab colors
- ✅ Frozen header panes for easy scrolling
- ✅ Auto-filters on header rows
- ✅ Column type formatting (currency, date, datetime, percent)
- ✅ Conditional formatting rules (color-coded thresholds)
- ✅ Totals rows with formulas
- ✅ Title and subtitle rows
- ✅ Automatic timestamp generation
- ✅ Page setup for printing (A4 landscape)
- ✅ Custom headers and footers

### Data Types Supported
- **Currency**: Formatted as `$#,##0.00`
- **Percentage**: Formatted as `0.00%`
- **Date**: Formatted as `mm/dd/yyyy`
- **DateTime**: Formatted as `mm/dd/yyyy hh:mm AM/PM`
- **Number**: Standard numeric formatting
- **Text**: Default string formatting

## API Endpoints

### 1. Get Available Report Types
```http
GET /api/excel-reports/types
```
Returns a list of all available report types with descriptions.

**Response:**
```json
{
  "status": "success",
  "data": [
    {
      "type": "census",
      "name": "Census Report",
      "description": "Current patient census with summary by level of care",
      "endpoint": "GET /api/excel-reports/census",
      "sheets": ["Census", "Summary"]
    },
    ...
  ]
}
```

### 2. Census Report
```http
GET /api/excel-reports/census?level_of_care=ROUTINE
```
Exports current census with patient details and summary by level of care.

**Worksheets:**
- Census: Patient list with admission dates, diagnoses, LOC, physicians
- Summary: Count by level of care with totals

### 3. AR Aging Report
```http
GET /api/excel-reports/ar-aging
```
Exports accounts receivable aging by bucket with conditional formatting.

**Features:**
- Aging buckets: 0-30, 31-60, 61-90, 91-120, 120+ days
- Conditional formatting: Red highlighting for balances > $50,000
- Totals row with sum formulas

### 4. Billing Report
```http
GET /api/excel-reports/billing?from_date=2024-01-01&to_date=2024-12-31
```
Comprehensive billing report with multiple worksheets.

**Worksheets:**
1. **Pending Claims**: Claims pending submission with aging alerts
   - Yellow highlight: > 30 days pending
   - Red highlight: > 60 days pending
2. **Revenue by Payer**: Total charges, paid amounts, claim counts
3. **Unbilled Periods**: Service periods not yet billed
   - Yellow highlight: > 14 days unbilled
   - Red highlight: > 30 days unbilled

### 5. Staff Report
```http
GET /api/excel-reports/staff?days_ahead=90
```
Staff productivity, credentials, and caseload analysis.

**Worksheets:**
1. **Productivity**: Caseload counts by staff member
2. **Credential Expirations**: Licenses/certifications expiring soon
   - Red highlight: < 30 days until expiration
   - Yellow highlight: 30-60 days until expiration
3. **Caseload Summary**: Active patient distribution

### 6. QAPI Report
```http
GET /api/excel-reports/qapi?from_date=2024-01-01&to_date=2024-12-31
```
Quality Assurance & Performance Improvement metrics.

**Worksheets:**
1. **Incidents**: Summary by type and severity
2. **Grievances**: Summary by type and priority
3. **Quality Measures**: Dashboard with targets and variances
4. **Chart Audits**: Compliance scores by auditor

### 7. Executive Dashboard
```http
GET /api/excel-reports/executive-dashboard
```
Executive summary with key metrics.

**Metrics:**
- Current census
- Pending claims (count and value)
- Active incidents and grievances
- Upcoming recertifications

### 8. Analytics Report
```http
POST /api/excel-reports/analytics
Content-Type: application/json

{
  "report_type": "clean_claim_rate",
  "start_date": "2024-01-01",
  "end_date": "2024-12-31"
}
```

**Available Report Types:**
- `clean_claim_rate`: First-pass acceptance rate
- `days_to_payment`: Payment turnaround time
- `denial_rate_by_payer`: Denial analysis by payer
- `net_collection_rate`: Collection efficiency
- `ar_aging_trend`: AR aging over time

### 9. Custom Report
```http
POST /api/excel-reports/custom
Content-Type: application/json

{
  "worksheets": [
    {
      "name": "My Report",
      "title": "Custom Report Title",
      "subtitle": "Report Period: Q1 2024",
      "tabColor": "4CAF50",
      "columns": [
        { "header": "ID", "key": "id", "width": 10, "type": "number" },
        { "header": "Amount", "key": "amount", "width": 15, "type": "currency" }
      ],
      "data": [
        { "id": 1, "amount": 100.50 },
        { "id": 2, "amount": 250.75 }
      ],
      "conditionalFormatting": [
        {
          "column": 2,
          "operator": "greaterThan",
          "value": 200,
          "bgColor": "C8E6C9"
        }
      ],
      "totals": [
        { "value": "Total" },
        { "value": 351.25 }
      ]
    }
  ],
  "options": {
    "title": "Custom Report",
    "author": "John Doe",
    "filename": "custom-report.xlsx"
  }
}
```

## Usage Examples

### Node.js / Backend

```javascript
import ExcelService from './services/ExcelService.js';

// Generate a basic report
const worksheets = [{
  name: 'Sales Data',
  title: 'Q1 Sales Report',
  columns: [
    { header: 'Product', key: 'product', width: 25 },
    { header: 'Revenue', key: 'revenue', width: 15, type: 'currency' },
    { header: 'Growth', key: 'growth', width: 12, type: 'percent' }
  ],
  data: [
    { product: 'Product A', revenue: 50000, growth: 0.15 },
    { product: 'Product B', revenue: 75000, growth: 0.22 }
  ]
}];

const buffer = await ExcelService.generateExcel(worksheets, {
  title: 'Sales Report'
});

// Send as download
reply
  .header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
  .header('Content-Disposition', 'attachment; filename="sales-report.xlsx"')
  .send(buffer);
```

### Frontend / API Call

```javascript
// Fetch census report
async function downloadCensusReport() {
  const response = await fetch('/api/excel-reports/census', {
    method: 'GET',
    headers: {
      'Authorization': 'Bearer ' + token
    }
  });

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'census-report.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}

// Generate analytics report
async function downloadAnalytics() {
  const response = await fetch('/api/excel-reports/analytics', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      report_type: 'clean_claim_rate',
      start_date: '2024-01-01',
      end_date: '2024-12-31'
    })
  });

  if (response.ok) {
    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'analytics-report.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }
}
```

## Worksheet Configuration

### Basic Configuration
```javascript
{
  name: 'Sheet Name',              // Required: Worksheet name
  title: 'Report Title',           // Optional: Large title at top
  subtitle: 'Period: Q1 2024',     // Optional: Subtitle below title
  tabColor: '4CAF50',              // Optional: Hex color for tab
  showTimestamp: true,             // Optional: Show generation time (default: true)
  autoFilter: true,                // Optional: Enable auto-filters (default: true)
  freezeHeader: true,              // Optional: Freeze header row (default: true)
  alternateRowColors: true,        // Optional: Alternate row colors (default: true)
  columns: [...],                  // Required: Column definitions
  data: [...],                     // Required: Data rows
  conditionalFormatting: [...],    // Optional: Conditional formatting rules
  totals: [...],                   // Optional: Totals row
  styles: {}                       // Optional: Custom cell styles
}
```

### Column Configuration
```javascript
{
  header: 'Column Name',      // Column header text
  key: 'dataKey',             // Key in data object
  width: 20,                  // Column width in characters
  type: 'currency'            // Optional: currency, percent, date, datetime, number
}
```

### Conditional Formatting
```javascript
{
  column: 2,                      // Column number (1-based)
  operator: 'greaterThan',        // cellIs operator
  value: 100,                     // Threshold value
  bgColor: 'FFEB3B',              // Background color (ARGB hex)
  fontColor: 'C62828'             // Font color (ARGB hex)
}
```

## Security & Permissions

All endpoints require authentication and appropriate permissions:

- **VIEW_REPORTS**: Required for report type list and custom reports
- **VIEW_PATIENT_DETAILS**: Required for census and patient-related reports
- **VIEW_CLINICAL_NOTES**: Required for billing, staff, QAPI reports

Permissions are enforced via RBAC middleware.

## Error Handling

### Common Error Responses

**401 Unauthorized**
```json
{
  "status": "error",
  "message": "Authentication required"
}
```

**403 Forbidden**
```json
{
  "status": "error",
  "message": "Insufficient permissions"
}
```

**400 Bad Request**
```json
{
  "status": "error",
  "message": "worksheets array is required and must contain at least one worksheet"
}
```

**500 Internal Server Error**
```json
{
  "status": "error",
  "message": "Excel generation failed: [error details]"
}
```

## Performance Considerations

### Memory Optimization
- Excel files are generated in-memory as buffers
- Large datasets (>10,000 rows) may require streaming
- Consider pagination for very large exports

### Best Practices
1. **Limit data size**: Request specific date ranges
2. **Use filters**: Apply filters to reduce dataset size
3. **Batch exports**: For bulk operations, generate reports asynchronously
4. **Cache results**: Cache frequently requested reports

## File Size Examples

Based on test data:
- Basic report (3 rows, 5 columns): ~7.7 KB
- Census report (2 sheets, 10 rows): ~8.5 KB
- Billing report (3 sheets, 15 rows): ~10 KB
- QAPI report (4 sheets, 20 rows): ~10.4 KB

Estimated: ~500-700 bytes per row depending on column count and data complexity.

## Troubleshooting

### Issue: "Operation not permitted" error
**Solution**: Ensure ExcelJS is installed: `npm install exceljs`

### Issue: Empty or corrupted Excel file
**Solution**: Verify data structure matches column definitions

### Issue: Conditional formatting not appearing
**Solution**: Check column numbers are 1-based, not 0-based

### Issue: Dates showing as numbers
**Solution**: Ensure column type is set to 'date' or 'datetime'

## Related Files

- **Service**: `services/api/src/services/ExcelService.js`
- **Controller**: `services/api/src/controllers/ExcelReport.controller.js`
- **Routes**: `services/api/src/routes/excelReport.routes.js`
- **Route Registration**: `services/api/src/routes/api.routes.js`

## Dependencies

- **ExcelJS**: v4.4.0 - Core Excel generation library
- **Fastify**: Web framework for routes and responses
- **Better Auth**: Authentication middleware
- **RBAC**: Role-based access control

## Version History

- **v1.0.0** (2025-01-02): Initial implementation
  - 9 report endpoints
  - Professional formatting with Chartwarden branding
  - Multi-sheet support
  - Conditional formatting
  - All major report types (Census, Billing, Staff, QAPI, Analytics)
