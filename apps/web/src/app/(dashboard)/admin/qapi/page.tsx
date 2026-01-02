// PROJECT IMPORTS
import QAPIDashboard from 'views/qapi/QAPIDashboard';

/**
 * ==============================|| QAPI DASHBOARD PAGE ||==============================
 *
 * Quality Assurance and Performance Improvement (QAPI) Dashboard
 *
 * BACKEND API ROUTES (ACTIVE & CONFIRMED):
 * Base path: /api/qapi-metrics
 * Most routes require VIEW_CLINICAL_NOTES or VIEW_PATIENT_DETAILS permission
 *
 * PRODUCT AREAS MANAGEMENT:
 * GET    /api/qapi-metrics/product-areas           - Get all product areas
 * GET    /api/qapi-metrics/product-areas/:id       - Get product area by ID
 * POST   /api/qapi-metrics/product-areas           - Create product area (CREATE_CLINICAL_NOTES)
 * PUT    /api/qapi-metrics/product-areas/:id       - Update product area (UPDATE_CLINICAL_NOTES)
 * DELETE /api/qapi-metrics/product-areas/:id       - Delete product area (DELETE_CLINICAL_NOTES)
 *
 * TAGS MANAGEMENT:
 * GET    /api/qapi-metrics/tags                    - Get all tags
 * POST   /api/qapi-metrics/tags                    - Create tag (CREATE_CLINICAL_NOTES)
 *
 * METRIC DEFINITIONS:
 * GET    /api/qapi-metrics/metric-definitions      - Get all metric definitions
 * GET    /api/qapi-metrics/metric-definitions/:id  - Get metric definition by ID
 * POST   /api/qapi-metrics/metric-definitions      - Create metric definition (CREATE_CLINICAL_NOTES)
 * PUT    /api/qapi-metrics/metric-definitions/:id  - Update metric definition (UPDATE_CLINICAL_NOTES)
 * DELETE /api/qapi-metrics/metric-definitions/:id  - Delete metric definition (DELETE_CLINICAL_NOTES)
 *
 * METRIC THRESHOLDS:
 * GET    /api/qapi-metrics/metrics/:metric_id/thresholds  - Get thresholds for a metric
 * POST   /api/qapi-metrics/metric-thresholds      - Create metric threshold (CREATE_CLINICAL_NOTES)
 * PUT    /api/qapi-metrics/metric-thresholds/:id  - Update metric threshold (UPDATE_CLINICAL_NOTES)
 * DELETE /api/qapi-metrics/metric-thresholds/:id  - Delete metric threshold (DELETE_CLINICAL_NOTES)
 *
 * METRIC VALUES (TIME-SERIES):
 * POST   /api/qapi-metrics/metric-values           - Record metric value (CREATE_CLINICAL_NOTES)
 * GET    /api/qapi-metrics/metric-values           - Get metric values
 * GET    /api/qapi-metrics/metric-aggregations     - Get metric aggregations
 *
 * IMPROVEMENT INITIATIVES:
 * GET    /api/qapi-metrics/initiatives             - Get all initiatives
 * GET    /api/qapi-metrics/initiatives/:id         - Get initiative by ID
 * POST   /api/qapi-metrics/initiatives             - Create initiative (CREATE_CLINICAL_NOTES)
 * PUT    /api/qapi-metrics/initiatives/:id         - Update initiative (UPDATE_CLINICAL_NOTES)
 * POST   /api/qapi-metrics/initiatives/:id/approve - Approve initiative (UPDATE_CLINICAL_NOTES)
 * DELETE /api/qapi-metrics/initiatives/:id         - Delete initiative (DELETE_CLINICAL_NOTES)
 *
 * INITIATIVE METRICS LINKING:
 * POST   /api/qapi-metrics/initiative-metrics      - Link metric to initiative (CREATE_CLINICAL_NOTES)
 * DELETE /api/qapi-metrics/initiative-metrics/:id  - Unlink metric from initiative (DELETE_CLINICAL_NOTES)
 *
 * METRIC SNAPSHOTS:
 * POST   /api/qapi-metrics/metric-snapshots                - Create metric snapshot (CREATE_CLINICAL_NOTES)
 * GET    /api/qapi-metrics/initiatives/:initiative_id/snapshots - Get initiative snapshots
 *
 * INITIATIVE DEPENDENCIES:
 * POST   /api/qapi-metrics/initiative-dependencies - Add initiative dependency (CREATE_CLINICAL_NOTES)
 * DELETE /api/qapi-metrics/initiative-dependencies/:id - Remove initiative dependency (DELETE_CLINICAL_NOTES)
 *
 * WEBHOOKS MANAGEMENT:
 * GET    /api/qapi-metrics/webhooks                - Get all webhooks
 * POST   /api/qapi-metrics/webhooks                - Create webhook (CREATE_CLINICAL_NOTES)
 * PUT    /api/qapi-metrics/webhooks/:id            - Update webhook (UPDATE_CLINICAL_NOTES)
 * DELETE /api/qapi-metrics/webhooks/:id            - Delete webhook (DELETE_CLINICAL_NOTES)
 * GET    /api/qapi-metrics/webhook-events          - Get webhook events
 *
 * CHANGE LOG (AUDIT TRAIL):
 * GET    /api/qapi-metrics/change-log              - Get change log
 *
 * FEATURES:
 * - Real-time or near-real-time metric updates
 * - Configurable dashboard widgets
 * - Export charts and reports to PDF/Excel formats
 * - Color-coded indicators for metrics meeting/not meeting targets
 * - Historical trend analysis with comparison periods
 * - Active and completed initiative tracking
 * - Progress tracking with milestones and completion percentages
 * - Assignment of owners and team members to initiatives
 * - Status workflow management
 * - Document attachments and notes for each initiative
 * - Automated report generation
 * - Customizable report templates
 * - KPI tracking with target vs. actual comparisons
 * - Audit trail of changes and data updates
 *
 * CMS COMPLIANCE:
 * - Meets CMS Conditions of Participation (CoPs) for QAPI requirements
 * - Tracks quality metrics and performance improvement initiatives
 * - Provides documentation and audit trail for regulatory compliance
 *
 * HIPAA COMPLIANCE:
 * - All PHI is handled according to HIPAA regulations
 * - Comprehensive audit logging via change-log endpoint
 * - Role-based access control (RBAC) for all operations
 *
 * All API calls use the http instance from 'hooks/useCookie' which includes:
 * - Base URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'
 * - withCredentials: true (for cookie-based authentication)
 * - Automatic 401 error handling (redirects to login)
 */

const QAPIPage = () => {
  return <QAPIDashboard />;
};

export default QAPIPage;
