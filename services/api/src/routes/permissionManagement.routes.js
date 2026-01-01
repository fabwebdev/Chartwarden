/**
 * Permission Management Routes
 *
 * Provides comprehensive REST API endpoints for:
 * - Permission CRUD operations
 * - Role Assignment operations
 * - Permission-Role Association management
 * - User-Role queries
 * - Audit trail retrieval
 *
 * All routes require authentication and appropriate permissions.
 *
 * @module permissionManagement.routes
 */

import {
  // Permission CRUD
  getAllPermissions,
  getPermissionList,
  createPermission,
  getPermissionById,
  updatePermission,
  softDeletePermission,
  hardDeletePermission,

  // Role Assignment
  assignRolesToUser,
  revokeRolesFromUser,
  replaceUserRoles,

  // Permission-Role Association
  getPermissionRoles,

  // User-Role Queries
  getUserRoles,
  getUserPermissions,
  checkUserPermission,
  getRoleUsers,

  // Audit
  getPermissionAuditTrail
} from '../controllers/PermissionManagement.controller.js';

import { requireAdmin, requirePermission } from '../middleware/rbac.middleware.js';
import { PERMISSIONS } from '../config/rbac.js';

/**
 * Middleware to check if user can view their own data
 * Allows users to view their own roles/permissions without admin rights
 */
const requireAdminOrSelf = async (request, reply) => {
  if (!request.user) {
    return reply.code(401).send({
      status: 401,
      message: 'Access denied. Authentication required.'
    });
  }

  const requestedUserId = request.params.userId || request.params.id;
  const isViewingOwnData = request.user.id === requestedUserId;
  const isAdmin = request.user.role === 'admin';

  if (!isViewingOwnData && !isAdmin) {
    return reply.code(403).send({
      status: 403,
      message: 'Access denied. Can only view your own data unless admin.'
    });
  }
};

// Fastify plugin for permission management routes
async function permissionManagementRoutes(fastify, options) {

  // ============================================================================
  // PERMISSION CRUD ENDPOINTS
  // ============================================================================

  /**
   * GET /permissions
   * Get all permissions with pagination, filtering, and sorting
   * Query params: page, per_page, sort_by, sort_order, search, resource, action, is_active, guard_name
   */
  fastify.get('/permissions', {
    preHandler: [requirePermission(PERMISSIONS.MANAGE_PERMISSIONS)],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          per_page: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          sort_by: { type: 'string', enum: ['name', 'resource', 'action', 'created_at', 'updated_at'], default: 'created_at' },
          sort_order: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          search: { type: 'string' },
          resource: { type: 'string' },
          action: { type: 'string' },
          is_active: { type: 'string' },
          guard_name: { type: 'string' }
        }
      }
    }
  }, getAllPermissions);

  /**
   * GET /permissions/list
   * Get permission list for dropdowns (names only)
   */
  fastify.get('/permissions/list', {
    preHandler: [requirePermission(PERMISSIONS.MANAGE_PERMISSIONS)],
  }, getPermissionList);

  /**
   * POST /permissions
   * Create a new permission
   */
  fastify.post('/permissions', {
    preHandler: [requireAdmin],
    schema: {
      body: {
        type: 'object',
        required: ['name', 'resource', 'action'],
        properties: {
          name: { type: 'string', minLength: 1, maxLength: 255 },
          resource: { type: 'string', minLength: 1, maxLength: 100 },
          action: { type: 'string', minLength: 1, maxLength: 50 },
          description: { type: 'string' },
          guard_name: { type: 'string', default: 'web' }
        }
      }
    }
  }, createPermission);

  /**
   * GET /permissions/:id
   * Get permission by ID with associated roles
   */
  fastify.get('/permissions/:id', {
    preHandler: [requirePermission(PERMISSIONS.MANAGE_PERMISSIONS)],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, getPermissionById);

  /**
   * PUT /permissions/:id
   * Update permission by ID (metadata only, not name/resource/action)
   */
  fastify.put('/permissions/:id', {
    preHandler: [requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        properties: {
          description: { type: 'string' },
          is_active: { type: 'boolean' },
          guard_name: { type: 'string' }
        }
      }
    }
  }, updatePermission);

  /**
   * DELETE /permissions/:id
   * Soft delete permission (sets is_active = false)
   * Query params: force (to delete even if assigned to roles)
   */
  fastify.delete('/permissions/:id', {
    preHandler: [requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          force: { type: 'boolean', default: false }
        }
      }
    }
  }, softDeletePermission);

  /**
   * DELETE /permissions/:id/permanent
   * Hard delete permission (permanent removal)
   */
  fastify.delete('/permissions/:id/permanent', {
    preHandler: [requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' }
        }
      }
    }
  }, hardDeletePermission);

  /**
   * GET /permissions/:permissionId/roles
   * Get all roles that have a specific permission
   */
  fastify.get('/permissions/:permissionId/roles', {
    preHandler: [requirePermission(PERMISSIONS.MANAGE_PERMISSIONS)],
    schema: {
      params: {
        type: 'object',
        required: ['permissionId'],
        properties: {
          permissionId: { type: 'string' }
        }
      }
    }
  }, getPermissionRoles);

  // ============================================================================
  // ROLE-RELATED ENDPOINTS
  // NOTE: Role CRUD and role-permission routes are handled by role.routes.js
  // This file provides additional role-user query routes
  // ============================================================================

  /**
   * GET /roles/:roleId/users
   * Get all users with a specific role
   */
  fastify.get('/roles/:roleId/users', {
    preHandler: [requirePermission(PERMISSIONS.MANAGE_ROLES)],
    schema: {
      params: {
        type: 'object',
        required: ['roleId'],
        properties: {
          roleId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          per_page: { type: 'integer', minimum: 1, maximum: 100, default: 50 }
        }
      }
    }
  }, getRoleUsers);

  // ============================================================================
  // USER-ROLE MANAGEMENT ENDPOINTS
  // ============================================================================

  /**
   * GET /users/:userId/roles
   * Get all roles assigned to a user
   * Users can view their own roles; admin can view all
   */
  fastify.get('/users/:userId/roles', {
    preHandler: [requireAdminOrSelf],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      querystring: {
        type: 'object',
        properties: {
          include_inactive: { type: 'boolean', default: false }
        }
      }
    }
  }, getUserRoles);

  /**
   * POST /users/:userId/roles
   * Assign role(s) to a user
   */
  fastify.post('/users/:userId/roles', {
    preHandler: [requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['role_ids'],
        properties: {
          role_ids: { type: 'array', items: { type: 'integer' }, minItems: 1 },
          reason: { type: 'string' }
        }
      }
    }
  }, assignRolesToUser);

  /**
   * PUT /users/:userId/roles
   * Replace all roles for a user (atomic operation)
   */
  fastify.put('/users/:userId/roles', {
    preHandler: [requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['role_ids'],
        properties: {
          role_ids: { type: 'array', items: { type: 'integer' } },
          reason: { type: 'string' }
        }
      }
    }
  }, replaceUserRoles);

  /**
   * DELETE /users/:userId/roles
   * Revoke role(s) from a user
   */
  fastify.delete('/users/:userId/roles', {
    preHandler: [requireAdmin],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      },
      body: {
        type: 'object',
        required: ['role_ids'],
        properties: {
          role_ids: { type: 'array', items: { type: 'integer' }, minItems: 1 },
          reason: { type: 'string' }
        }
      }
    }
  }, revokeRolesFromUser);

  /**
   * GET /users/:userId/permissions
   * Get effective permissions for a user (aggregate across all roles)
   * Users can view their own permissions; admin can view all
   */
  fastify.get('/users/:userId/permissions', {
    preHandler: [requireAdminOrSelf],
    schema: {
      params: {
        type: 'object',
        required: ['userId'],
        properties: {
          userId: { type: 'string' }
        }
      }
    }
  }, getUserPermissions);

  /**
   * GET /users/:userId/permissions/:permissionName/check
   * Check if user has a specific permission
   */
  fastify.get('/users/:userId/permissions/:permissionName/check', {
    preHandler: [requireAdminOrSelf],
    schema: {
      params: {
        type: 'object',
        required: ['userId', 'permissionName'],
        properties: {
          userId: { type: 'string' },
          permissionName: { type: 'string' }
        }
      }
    }
  }, checkUserPermission);

  // ============================================================================
  // AUDIT TRAIL ENDPOINTS
  // ============================================================================

  /**
   * GET /audit/permissions
   * Get audit trail for permission/role operations
   */
  fastify.get('/audit/permissions', {
    preHandler: [requirePermission(PERMISSIONS.VIEW_AUDIT_LOGS)],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          per_page: { type: 'integer', minimum: 1, maximum: 100, default: 50 },
          resource_type: { type: 'string', enum: ['permission', 'role', 'user_role', 'role_permission', ''] },
          resource_id: { type: 'string' },
          action: { type: 'string' },
          user_id: { type: 'string' },
          start_date: { type: 'string', format: 'date-time' },
          end_date: { type: 'string', format: 'date-time' }
        }
      }
    }
  }, getPermissionAuditTrail);
}

export default permissionManagementRoutes;
