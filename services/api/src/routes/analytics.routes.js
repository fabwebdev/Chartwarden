import controller from '../controllers/Analytics.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Analytics Routes
 * Phase 2D - Enhanced Reporting
 *
 * Revenue cycle analytics and KPI dashboards
 * Features:
 *   - Comprehensive KPI dashboard with 6+ metrics
 *   - Clean claim rate tracking and trends
 *   - Days to payment analysis
 *   - Denial rate by payer breakdown
 *   - Net collection rate calculation
 *   - Revenue forecasting (30/60/90 days)
 *   - AR aging trends over time
 *   - CSV/Excel export capabilities
 *
 * Endpoints:
 * - GET /api/analytics/kpi-dashboard - Comprehensive KPI dashboard
 * - GET /api/analytics/clean-claim-rate - Clean claim rate time-series
 * - GET /api/analytics/days-to-payment - Days to payment trend
 * - GET /api/analytics/denial-rate-by-payer - Denial rates by payer
 * - GET /api/analytics/net-collection-rate - Net collection rate
 * - GET /api/analytics/revenue-forecast - Revenue forecast
 * - GET /api/analytics/ar-aging-trend - AR aging time-series
 * - POST /api/analytics/export-report - Export report to CSV/Excel
 */
export default async function analyticsRoutes(fastify, options) {

  // Get comprehensive KPI dashboard
  fastify.get('/analytics/kpi-dashboard', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getKPIDashboard);

  // Get clean claim rate time-series
  fastify.get('/analytics/clean-claim-rate', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getCleanClaimRate);

  // Get days to payment trend
  fastify.get('/analytics/days-to-payment', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getDaysToPayment);

  // Get denial rate by payer
  fastify.get('/analytics/denial-rate-by-payer', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getDenialRateByPayer);

  // Get net collection rate
  fastify.get('/analytics/net-collection-rate', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getNetCollectionRate);

  // Get revenue forecast
  fastify.get('/analytics/revenue-forecast', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getRevenueForecast);

  // Get AR aging trend
  fastify.get('/analytics/ar-aging-trend', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.getARAgingTrend);

  // Export analytics report to CSV/Excel
  fastify.post('/analytics/export-report', {
    preHandler: [requireAnyPermission(PERMISSIONS.VIEW_REPORTS)]
  }, controller.exportReport);
}
