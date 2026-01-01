// PROJECT IMPORTS
import AdminSettingsPage from 'views/admin-settings-view/AdminSettingsPage';

/**
 * ==============================|| ADMIN SETTINGS PAGE ||==============================
 *
 * BACKEND API ROUTES (ACTIVE & CONFIRMED):
 * Base path: /api/admin
 * All routes require authentication and admin role
 *
 * GET    /api/admin/settings              - Get all settings by category
 * GET    /api/admin/settings/history      - Get settings change history
 * GET    /api/admin/settings/:key         - Get setting by key
 * PUT    /api/admin/settings/:key         - Update setting
 * POST   /api/admin/settings/bulk         - Bulk update settings
 * POST   /api/admin/settings/reset/:key   - Reset setting to default
 * POST   /api/admin/settings/clearinghouse/test - Test clearinghouse connection
 * POST   /api/admin/settings/initialize   - Initialize default settings
 *
 * ADMIN SETTINGS API ENDPOINTS:
 *
 * 1. GET /api/admin/settings
 *    - Backend Route: GET /api/admin/settings
 *    - Frontend Call: http.get('/admin/settings')
 *    - Description: Get all settings grouped by category
 *    - Query: category (optional) - filter by category
 *    - Response: { success, data: { categories: { SYSTEM: [...], SECURITY: [...], ... } } }
 *    - Authentication: Required (Admin only)
 *
 * 2. PUT /api/admin/settings/:key
 *    - Backend Route: PUT /api/admin/settings/:key
 *    - Frontend Call: http.put(`/admin/settings/${key}`, { value, reason })
 *    - Params: key (setting key like 'system.timezone')
 *    - Description: Update a single setting
 *    - Body: { value: string, reason?: string }
 *    - Response: { success, message, data: setting, requires_restart: boolean }
 *    - Authentication: Required (Admin only)
 *
 * 3. POST /api/admin/settings/bulk
 *    - Backend Route: POST /api/admin/settings/bulk
 *    - Frontend Call: http.post('/admin/settings/bulk', { settings, reason })
 *    - Description: Bulk update multiple settings at once
 *    - Body: { settings: [{ key, value }], reason?: string }
 *    - Response: { success, updated_count, updated_keys, errors }
 *    - Authentication: Required (Admin only)
 *
 * 4. POST /api/admin/settings/clearinghouse/test
 *    - Backend Route: POST /api/admin/settings/clearinghouse/test
 *    - Frontend Call: http.post('/admin/settings/clearinghouse/test', { api_endpoint, username, password })
 *    - Description: Test clearinghouse API connection
 *    - Body: { api_endpoint: string, username?: string, password?: string, connection_timeout?: number }
 *    - Response: { success, message, connection_details: { status, response_time_ms, reachable } }
 *    - Authentication: Required (Admin only)
 *
 * 5. POST /api/admin/settings/initialize
 *    - Backend Route: POST /api/admin/settings/initialize
 *    - Frontend Call: http.post('/admin/settings/initialize')
 *    - Description: Initialize default settings (first-time setup)
 *    - Response: { success, message, created_count }
 *    - Authentication: Required (Admin only)
 *
 * 6. GET /api/admin/settings/history
 *    - Backend Route: GET /api/admin/settings/history
 *    - Frontend Call: http.get('/admin/settings/history')
 *    - Description: Get settings change audit history
 *    - Query: key (optional), limit, offset
 *    - Response: { success, count, data: history[] }
 *    - Authentication: Required (Admin only)
 *
 * All API calls use the http instance from 'hooks/useCookie' which includes:
 * - Base URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3000/api'
 * - withCredentials: true (for cookie-based authentication)
 * - Automatic 401 error handling (redirects to login)
 */

const AdminSettings = () => {
  return <AdminSettingsPage />;
};

export default AdminSettings;
