import controller from '../controllers/SystemSettings.controller.js';
import { PERMISSIONS } from '../config/rbac.js';
import { requireAdmin, requireAnyPermission } from '../middleware/rbac.middleware.js';

/**
 * Admin Settings Routes
 * Admin-only endpoints for system configuration management
 *
 * Features:
 *   - System configuration settings (timezone, date format, session timeout)
 *   - Clearinghouse integration settings
 *   - Settings history/audit trail
 *   - Connection testing
 *   - Bulk updates
 *
 * Endpoints:
 * - GET /api/admin/settings - List all settings by category
 * - GET /api/admin/settings/history - Get settings change history
 * - GET /api/admin/settings/:key - Get setting by key
 * - PUT /api/admin/settings/:key - Update setting
 * - POST /api/admin/settings/bulk - Bulk update settings
 * - POST /api/admin/settings/reset/:key - Reset setting to default
 * - POST /api/admin/settings/clearinghouse/test - Test clearinghouse connection
 * - POST /api/admin/settings/initialize - Initialize default settings
 *
 * All endpoints require admin role or MANAGE_USERS permission
 */
export default async function adminSettingsRoutes(fastify, options) {

  // List all settings by category
  fastify.get('/admin/settings', {
    preHandler: [requireAdmin]
  }, controller.listSettings.bind(controller));

  // Get settings change history
  fastify.get('/admin/settings/history', {
    preHandler: [requireAdmin]
  }, controller.getSettingsHistory.bind(controller));

  // Get setting by key
  fastify.get('/admin/settings/:key', {
    preHandler: [requireAdmin]
  }, controller.getSetting.bind(controller));

  // Update setting
  fastify.put('/admin/settings/:key', {
    preHandler: [requireAdmin]
  }, controller.updateSetting.bind(controller));

  // Bulk update settings
  fastify.post('/admin/settings/bulk', {
    preHandler: [requireAdmin]
  }, controller.bulkUpdateSettings.bind(controller));

  // Reset setting to default
  fastify.post('/admin/settings/reset/:key', {
    preHandler: [requireAdmin]
  }, controller.resetSetting.bind(controller));

  // Test clearinghouse connection
  fastify.post('/admin/settings/clearinghouse/test', {
    preHandler: [requireAdmin]
  }, controller.testClearinghouseConnection.bind(controller));

  // Initialize default settings
  fastify.post('/admin/settings/initialize', {
    preHandler: [requireAdmin]
  }, controller.initializeSettings.bind(controller));
}
