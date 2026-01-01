import controller from '../controllers/CapTracking.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission, requirePermission } from '../middleware/rbac.middleware.js';
import { validateBody, validateQuery, fields, sanitizedString } from '../middleware/validation.middleware.js';
import * as yup from 'yup';

/**
 * Cap Tracking and Compliance Monitoring Routes
 * Medicare hospice cap amount tracking and CMS compliance
 * CRITICAL: CMS compliance requirement
 *
 * Endpoints:
 * - Cap Tracking CRUD: /caps, /caps/:id
 * - Cap Calculations: /billing/cap-tracking/calculate, /caps/recalculate
 * - Cap Metrics: /caps/metrics, /caps/:id/history
 * - Patient Cap: /patients/:id/cap-tracking
 * - Cap Alerts: /billing/cap-tracking/approaching, /billing/cap-tracking/exceeded
 * - Cap Reports: /billing/cap-tracking/report
 * - Compliance Status: /compliance/status, /patients/:id/compliance
 * - Compliance Reports: /compliance/reports
 * - Compliance Issues: /compliance/issues
 * - Alert Config: /compliance/alerts/config
 * - Notifications: /compliance/notifications
 */
export default async function capTrackingRoutes(fastify, options) {

  // ============================================================================
  // VALIDATION SCHEMAS
  // ============================================================================

  const calculateCapSchema = yup.object({
    patient_id: yup.number().integer().positive().required('Patient ID is required'),
    cap_year: yup.number().integer().min(2000).max(2100).required('Cap year is required')
  });

  const updateCapSchema = yup.object({
    notes: fields.text(),
    calculation_status: fields.oneOf(['CURRENT', 'PENDING_RECALC', 'ERROR']),
    metadata: yup.mixed()
  });

  const bulkRecalculateSchema = yup.object({
    cap_year: yup.number().integer().min(2000).max(2100),
    patient_ids: yup.array().of(yup.number().integer().positive())
  });

  const complianceIssueSchema = yup.object({
    patient_id: yup.number().integer().positive().required('Patient ID is required'),
    issue_type: sanitizedString().required('Issue type is required').max(50),
    issue_category: fields.oneOf(['CAP', 'CERTIFICATION', 'F2F', 'IDG', 'DOCUMENTATION']).required('Issue category is required'),
    severity: fields.oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    title: sanitizedString().required('Title is required').max(255),
    description: fields.text(),
    due_date: fields.date(),
    related_cap_tracking_id: yup.number().integer().positive(),
    related_record_type: sanitizedString().max(50),
    related_record_id: yup.number().integer().positive(),
    metadata: yup.mixed()
  });

  const updateIssueSchema = yup.object({
    status: fields.oneOf(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']),
    severity: fields.oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    title: sanitizedString().max(255),
    description: fields.text(),
    due_date: fields.date(),
    resolution_notes: fields.text(),
    metadata: yup.mixed()
  });

  const resolveIssueSchema = yup.object({
    resolution_notes: fields.text()
  });

  const alertConfigSchema = yup.object({
    alert_type: sanitizedString().required('Alert type is required').max(50),
    alert_name: sanitizedString().required('Alert name is required').max(100),
    description: fields.text(),
    is_enabled: yup.boolean().default(true),
    severity: fields.oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    threshold_percentage: yup.number().min(0).max(100),
    threshold_days: yup.number().integer().min(0),
    notification_channels: yup.array().of(yup.string().oneOf(['email', 'sms', 'in_app', 'webhook'])),
    recipient_roles: yup.array().of(yup.string()),
    notification_frequency: fields.oneOf(['ONCE', 'DAILY', 'WEEKLY']).default('ONCE'),
    cooldown_hours: yup.number().integer().min(0).default(24),
    metadata: yup.mixed()
  });

  const paginationSchema = yup.object({
    limit: yup.number().integer().min(1).max(100).default(50),
    offset: yup.number().integer().min(0).default(0),
    sort: sanitizedString(),
    order: fields.oneOf(['asc', 'desc']).default('desc')
  });

  const capListSchema = paginationSchema.shape({
    cap_year: yup.number().integer().min(2000).max(2100),
    status: fields.oneOf(['exceeded', 'warning', 'normal'])
  });

  const complianceStatusSchema = paginationSchema.shape({
    status: fields.oneOf(['COMPLIANT', 'WARNING', 'NON_COMPLIANT', 'PENDING_REVIEW'])
  });

  const issueListSchema = paginationSchema.shape({
    status: fields.oneOf(['OPEN', 'IN_PROGRESS', 'RESOLVED', 'DISMISSED']),
    category: fields.oneOf(['CAP', 'CERTIFICATION', 'F2F', 'IDG', 'DOCUMENTATION']),
    severity: fields.oneOf(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']),
    patient_id: yup.number().integer().positive()
  });

  const notificationListSchema = paginationSchema.shape({
    patient_id: yup.number().integer().positive(),
    status: fields.oneOf(['PENDING', 'SENT', 'FAILED', 'DELIVERED', 'READ']),
    type: sanitizedString().max(50)
  });

  const metricsSchema = yup.object({
    cap_year: yup.number().integer().min(2000).max(2100),
    months: yup.number().integer().min(1).max(36).default(12)
  });

  const reportSchema = yup.object({
    report_type: fields.oneOf(['summary', 'detailed', 'trends']).default('summary'),
    start_date: fields.date(),
    end_date: fields.date()
  });

  // ============================================================================
  // CAP TRACKING CORE ENDPOINTS
  // ============================================================================

  // GET /caps - List all cap tracking records with pagination
  fastify.get('/caps', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES, PERMISSIONS.VIEW_REPORTS)]
  }, controller.getAllCaps);

  // GET /caps/metrics - Get cap utilization metrics and trends
  fastify.get('/caps/metrics', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getCapMetrics);

  // POST /caps/recalculate - Bulk recalculate caps
  fastify.post('/caps/recalculate', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES),
      validateBody(bulkRecalculateSchema)
    ]
  }, controller.bulkRecalculate);

  // GET /caps/:id - Get cap tracking by ID
  fastify.get('/caps/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCapById);

  // PUT /caps/:id - Update cap tracking record
  fastify.put('/caps/:id', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES),
      validateBody(updateCapSchema)
    ]
  }, controller.updateCap);

  // DELETE /caps/:id - Delete cap tracking record (soft delete)
  fastify.delete('/caps/:id', {
    preHandler: [requireAnyPermission(PERMISSIONS.DELETE_CLINICAL_NOTES)]
  }, controller.deleteCap);

  // GET /caps/:id/history - Get cap tracking history
  fastify.get('/caps/:id/history', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCapHistory);

  // ============================================================================
  // BILLING CAP TRACKING ENDPOINTS (Legacy paths preserved)
  // ============================================================================

  // POST /billing/cap-tracking/calculate - Calculate cap for patient
  fastify.post('/billing/cap-tracking/calculate', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES),
      validateBody(calculateCapSchema)
    ]
  }, controller.calculateCap);

  // GET /billing/cap-tracking/approaching - Get patients approaching cap
  fastify.get('/billing/cap-tracking/approaching', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientsApproachingCap);

  // GET /billing/cap-tracking/exceeded - Get patients who exceeded cap
  fastify.get('/billing/cap-tracking/exceeded', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getCapExceededPatients);

  // GET /billing/cap-tracking/report - Get cap utilization report
  fastify.get('/billing/cap-tracking/report', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getCapUtilizationReport);

  // ============================================================================
  // PATIENT CAP TRACKING ENDPOINTS
  // ============================================================================

  // GET /patients/:id/cap-tracking - Get patient cap tracking
  fastify.get('/patients/:id/cap-tracking', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientCap);

  // GET /patients/:id/compliance - Get patient compliance status
  fastify.get('/patients/:id/compliance', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getPatientCompliance);

  // ============================================================================
  // COMPLIANCE STATUS ENDPOINTS
  // ============================================================================

  // GET /compliance/status - Get overall compliance status
  fastify.get('/compliance/status', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getComplianceStatus);

  // GET /compliance/reports - Get compliance reports
  fastify.get('/compliance/reports', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getComplianceReports);

  // ============================================================================
  // COMPLIANCE ISSUES ENDPOINTS
  // ============================================================================

  // GET /compliance/issues - List all compliance issues
  fastify.get('/compliance/issues', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_CLINICAL_NOTES)]
  }, controller.getComplianceIssues);

  // POST /compliance/issues - Create a compliance issue
  fastify.post('/compliance/issues', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.CREATE_CLINICAL_NOTES),
      validateBody(complianceIssueSchema)
    ]
  }, controller.createComplianceIssue);

  // PUT /compliance/issues/:id - Update a compliance issue
  fastify.put('/compliance/issues/:id', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES),
      validateBody(updateIssueSchema)
    ]
  }, controller.updateComplianceIssue);

  // POST /compliance/issues/:id/resolve - Resolve a compliance issue
  fastify.post('/compliance/issues/:id/resolve', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.UPDATE_CLINICAL_NOTES),
      validateBody(resolveIssueSchema)
    ]
  }, controller.resolveComplianceIssue);

  // ============================================================================
  // ALERT CONFIGURATION ENDPOINTS
  // ============================================================================

  // GET /compliance/alerts/config - Get alert configurations
  fastify.get('/compliance/alerts/config', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS, PERMISSIONS.MANAGE_SETTINGS)]
  }, controller.getAlertConfigs);

  // POST /compliance/alerts/config - Create/update alert configuration
  fastify.post('/compliance/alerts/config', {
    preHandler: [
      requireAnyPermission(PERMISSIONS.MANAGE_SETTINGS),
      validateBody(alertConfigSchema)
    ]
  }, controller.upsertAlertConfig);

  // PUT /compliance/alerts/config/:id/toggle - Toggle alert enabled status
  fastify.put('/compliance/alerts/config/:id/toggle', {
    preHandler: [requireAnyPermission(PERMISSIONS.MANAGE_SETTINGS)]
  }, controller.toggleAlertConfig);

  // ============================================================================
  // NOTIFICATION ENDPOINTS
  // ============================================================================

  // GET /compliance/notifications - Get notification history
  fastify.get('/compliance/notifications', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getNotifications);
}
