// PROJECT IMPORTS
import UserManagementDashboard from 'views/admin/UserManagementDashboard';

/**
 * ============================== || ADMIN USER MANAGEMENT PAGE || ==============================
 *
 * BACKEND API ROUTES (ACTIVE & CONFIRMED):
 * Base path: /api
 * All routes require authentication (behind authenticate middleware)
 *
 * USER MANAGEMENT ENDPOINTS:
 * GET    /api/users                         - Get all users with pagination/filtering
 * POST   /api/users                         - Create a new user (requires MANAGE_USERS)
 * GET    /api/users/:id                     - Get user by ID
 * PUT    /api/users/:id                     - Update user (requires MANAGE_USERS)
 * DELETE /api/users/:id                     - Delete user (soft/hard delete)
 * POST   /api/users/:id/restore             - Restore soft-deleted user (admin)
 * PATCH  /api/users/:id/status              - Update user status
 * POST   /api/users/:id/lock                - Lock user account
 * POST   /api/users/:id/unlock              - Unlock user account
 * POST   /api/users/:id/reset-login-attempts - Reset failed login attempts
 * POST   /api/users/bulk/status             - Bulk update user status
 *
 * ROLE MANAGEMENT ENDPOINTS:
 * GET    /api/rbac/roles                    - List all roles
 * POST   /api/rbac/roles                    - Create new role
 * GET    /api/rbac/roles/:id                - Get role by ID with permissions
 * PUT    /api/rbac/roles/:id                - Update role
 * DELETE /api/rbac/roles/:id                - Delete role
 * GET    /api/rbac/roles/:id/permissions    - Get permissions for a role
 * POST   /api/rbac/roles/:id/permissions    - Assign permissions to role
 *
 * PERMISSION ENDPOINTS:
 * GET    /api/permissions                   - List all permissions
 * GET    /api/rbac/permissions              - List all permissions (RBAC context)
 */

const AdminUserManagementPage = () => {
  return <UserManagementDashboard />;
};

export default AdminUserManagementPage;
