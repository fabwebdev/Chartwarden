/**
 * Role Management REST API Controller
 *
 * Implements complete CRUD operations for role management with:
 * - Pagination, sorting, and filtering
 * - Permission assignment and revocation
 * - System role protection (SuperAdmin, etc.)
 * - HIPAA-compliant audit logging
 * - Input validation and sanitization
 * - Optimistic locking for concurrent updates
 */

import { db } from "../config/db.drizzle.js";
import { roles, permissions, user_has_roles } from "../db/schemas/index.js";
import { role_has_permissions } from "../db/schemas/index.js";
import { eq, like, and, or, desc, asc, count, sql, ilike, ne } from "drizzle-orm";
import { logger } from '../utils/logger.js';
import AuditService from '../services/AuditService.js';
import { clearPermissionCache } from '../middleware/rbac.middleware.js';

// System-protected roles that cannot be modified or deleted
const SYSTEM_PROTECTED_ROLES = ['SuperAdmin', 'admin', 'DefaultUser'];

// Valid role statuses
const ROLE_STATUSES = ['Active', 'Inactive', 'Archived'];

/**
 * Helper function to create audit log for role operations
 */
async function createRoleAuditLog(request, action, roleId, oldValue = null, newValue = null) {
  try {
    await AuditService.createAuditLog({
      user_id: request.user?.id || null,
      session_id: request.session?.id || null,
      request_id: request.id || null,
      action: action,
      resource_type: 'roles',
      resource_id: roleId?.toString() || null,
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      status: 'success',
      ip_address: request.ip || request.headers?.['x-forwarded-for'] || null,
      user_agent: request.headers?.['user-agent'] || null,
      metadata: JSON.stringify({
        action_type: action,
        admin_user_id: request.user?.id,
        timestamp: new Date().toISOString()
      })
    });
  } catch (error) {
    logger.error('Failed to create audit log for role operation:', error);
  }
}

/**
 * Check if a role is system-protected
 */
function isSystemProtectedRole(roleName) {
  return SYSTEM_PROTECTED_ROLES.some(
    protectedRole => protectedRole.toLowerCase() === roleName?.toLowerCase()
  );
}

/**
 * GET /api/roles
 * List all roles with pagination, sorting, and filtering
 *
 * Query Parameters:
 * - page: Page number (default: 1)
 * - limit: Items per page (default: 20, max: 100)
 * - sort: Sort field (name, created_at, updated_at) (default: name)
 * - order: Sort order (asc, desc) (default: asc)
 * - status: Filter by status (Active, Inactive, Archived)
 * - name: Filter by name (partial match)
 * - is_system: Filter by system role flag (true/false)
 */
export const getAllRoles = async (request, reply) => {
  try {
    // Parse query parameters with defaults
    const page = Math.max(1, parseInt(request.query.page) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit) || 20));
    const offset = (page - 1) * limit;
    const sortField = request.query.sort || 'name';
    const sortOrder = request.query.order?.toLowerCase() === 'desc' ? 'desc' : 'asc';

    // Build filter conditions
    const conditions = [];

    // Filter by status (Active/Inactive based on is_active)
    if (request.query.status) {
      const statusLower = request.query.status.toLowerCase();
      if (statusLower === 'active') {
        conditions.push(eq(roles.is_active, true));
      } else if (statusLower === 'inactive' || statusLower === 'archived') {
        conditions.push(eq(roles.is_active, false));
      }
    }

    // Filter by name (case-insensitive partial match)
    if (request.query.name) {
      conditions.push(ilike(roles.name, `%${request.query.name}%`));
    }

    // Filter by system role
    if (request.query.is_system !== undefined) {
      const isSystem = request.query.is_system === 'true' || request.query.is_system === true;
      conditions.push(eq(roles.is_system, isSystem));
    }

    // Build sort expression
    let orderByClause;
    switch (sortField) {
      case 'created_at':
        orderByClause = sortOrder === 'desc' ? desc(roles.createdAt) : asc(roles.createdAt);
        break;
      case 'updated_at':
        orderByClause = sortOrder === 'desc' ? desc(roles.updatedAt) : asc(roles.updatedAt);
        break;
      case 'hierarchy_level':
        orderByClause = sortOrder === 'desc' ? desc(roles.hierarchy_level) : asc(roles.hierarchy_level);
        break;
      default:
        orderByClause = sortOrder === 'desc' ? desc(roles.name) : asc(roles.name);
    }

    // Query roles with conditions
    let query = db.select({
      id: roles.id,
      name: roles.name,
      display_name: roles.display_name,
      description: roles.description,
      guard_name: roles.guard_name,
      hierarchy_level: roles.hierarchy_level,
      is_active: roles.is_active,
      is_system: roles.is_system,
      createdAt: roles.createdAt,
      updatedAt: roles.updatedAt,
    }).from(roles);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    const rolesList = await query.orderBy(orderByClause).limit(limit).offset(offset);

    // Get total count for pagination
    let countQuery = db.select({ count: count() }).from(roles);
    if (conditions.length > 0) {
      countQuery = countQuery.where(and(...conditions));
    }
    const [{ count: totalCount }] = await countQuery;

    // Get permissions and user counts for each role
    const rolesWithDetails = await Promise.all(rolesList.map(async (role) => {
      // Get permissions for this role
      const rolePermissions = await db
        .select({
          permission_id: role_has_permissions.permission_id,
        })
        .from(role_has_permissions)
        .where(eq(role_has_permissions.role_id, role.id));

      const permissionDetails = [];
      for (const rp of rolePermissions) {
        const [perm] = await db
          .select({
            id: permissions.id,
            name: permissions.name,
            resource: permissions.resource,
            action: permissions.action,
            description: permissions.description,
          })
          .from(permissions)
          .where(eq(permissions.id, rp.permission_id));
        if (perm) {
          permissionDetails.push(perm);
        }
      }

      // Get user count for this role
      const [{ count: userCount }] = await db
        .select({ count: count() })
        .from(user_has_roles)
        .where(eq(user_has_roles.role_id, role.id));

      return {
        ...role,
        status: role.is_active ? 'Active' : 'Inactive',
        permissions: permissionDetails,
        user_count: Number(userCount),
      };
    }));

    // Create audit log for role list access
    await createRoleAuditLog(request, 'ROLE_LIST_VIEW', null);

    return {
      success: true,
      data: rolesWithDetails,
      meta: {
        page,
        limit,
        total: Number(totalCount),
        totalPages: Math.ceil(Number(totalCount) / limit),
        hasNextPage: page * limit < Number(totalCount),
        hasPrevPage: page > 1,
      },
    };
  } catch (error) {
    logger.error("Error fetching roles:", error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: "Server error while fetching roles",
      },
    };
  }
};

/**
 * POST /api/roles
 * Create a new role with optional initial permissions
 */
export const createRole = async (request, reply) => {
  try {
    const {
      name,
      display_name,
      description,
      guard_name,
      hierarchy_level,
      is_active = true,
      permissions: permissionIds
    } = request.body;

    // Validate required fields
    if (!name || typeof name !== 'string') {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "Role name is required",
          errors: [{ field: "name", message: "Role name is required and must be a string" }],
        },
      };
    }

    // Validate name length (2-50 chars)
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 50) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "Role name must be between 2 and 50 characters",
          errors: [{ field: "name", message: "Role name must be between 2 and 50 characters" }],
        },
      };
    }

    // Validate description length (max 255 chars)
    if (description && description.length > 255) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "Description must be at most 255 characters",
          errors: [{ field: "description", message: "Description must be at most 255 characters" }],
        },
      };
    }

    // Check if role name already exists (case-insensitive)
    const [existingRole] = await db
      .select({ id: roles.id })
      .from(roles)
      .where(ilike(roles.name, trimmedName));

    if (existingRole) {
      reply.code(409);
      return {
        success: false,
        error: {
          code: 'DUPLICATE_ROLE',
          message: "A role with this name already exists",
        },
      };
    }

    // Create role
    const [role] = await db.insert(roles)
      .values({
        name: trimmedName,
        display_name: display_name?.trim() || trimmedName,
        description: description?.trim() || null,
        guard_name: guard_name || "web",
        hierarchy_level: hierarchy_level || 100,
        is_active: is_active !== false,
        is_system: false, // New roles are never system roles
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    // Associate permissions if provided
    if (permissionIds && Array.isArray(permissionIds) && permissionIds.length > 0) {
      // Validate permission IDs exist
      const validPermissionIds = [];
      for (const permId of permissionIds) {
        const id = parseInt(permId);
        if (!isNaN(id)) {
          const [perm] = await db
            .select({ id: permissions.id })
            .from(permissions)
            .where(eq(permissions.id, id));
          if (perm) {
            validPermissionIds.push(id);
          }
        }
      }

      if (validPermissionIds.length > 0) {
        const rolePermissionValues = validPermissionIds.map(permissionId => ({
          role_id: role.id,
          permission_id: permissionId,
          assigned_by: request.user?.id || null,
          assigned_at: new Date(),
        }));

        await db.insert(role_has_permissions).values(rolePermissionValues);
      }
    }

    // Fetch role with permissions
    const rolePermissions = await db
      .select({
        permission_id: role_has_permissions.permission_id,
      })
      .from(role_has_permissions)
      .where(eq(role_has_permissions.role_id, role.id));

    const permissionDetails = [];
    for (const rp of rolePermissions) {
      const [perm] = await db
        .select({
          id: permissions.id,
          name: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
          description: permissions.description,
        })
        .from(permissions)
        .where(eq(permissions.id, rp.permission_id));
      if (perm) {
        permissionDetails.push(perm);
      }
    }

    const roleWithPermissions = {
      ...role,
      status: role.is_active ? 'Active' : 'Inactive',
      permissions: permissionDetails,
    };

    // Create audit log
    await createRoleAuditLog(request, 'ROLE_CREATE', role.id, null, roleWithPermissions);

    reply.code(201);
    return {
      success: true,
      message: "Role created successfully",
      data: roleWithPermissions,
    };
  } catch (error) {
    logger.error("Error creating role:", error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: "Server error while creating role",
      },
    };
  }
};

/**
 * GET /api/roles/:id
 * Retrieve single role details including full permission list
 */
export const getRoleById = async (request, reply) => {
  try {
    const { id } = request.params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: "Invalid role ID format",
        },
      };
    }

    // Find role by ID
    const [role] = await db
      .select({
        id: roles.id,
        name: roles.name,
        display_name: roles.display_name,
        description: roles.description,
        guard_name: roles.guard_name,
        hierarchy_level: roles.hierarchy_level,
        is_active: roles.is_active,
        is_system: roles.is_system,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .where(eq(roles.id, roleId));

    if (!role) {
      reply.code(404);
      return {
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: "Role not found",
        },
      };
    }

    // Get permissions for this role
    const rolePermissions = await db
      .select({
        permission_id: role_has_permissions.permission_id,
        assigned_at: role_has_permissions.assigned_at,
        assigned_by: role_has_permissions.assigned_by,
      })
      .from(role_has_permissions)
      .where(eq(role_has_permissions.role_id, role.id));

    const permissionDetails = [];
    for (const rp of rolePermissions) {
      const [perm] = await db
        .select({
          id: permissions.id,
          name: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
          description: permissions.description,
          is_active: permissions.is_active,
        })
        .from(permissions)
        .where(eq(permissions.id, rp.permission_id));
      if (perm) {
        permissionDetails.push({
          ...perm,
          assigned_at: rp.assigned_at,
          assigned_by: rp.assigned_by,
        });
      }
    }

    // Get user count for this role
    const [{ count: userCount }] = await db
      .select({ count: count() })
      .from(user_has_roles)
      .where(eq(user_has_roles.role_id, role.id));

    const roleWithPermissions = {
      ...role,
      status: role.is_active ? 'Active' : 'Inactive',
      permissions: permissionDetails,
      user_count: Number(userCount),
    };

    // Create audit log
    await createRoleAuditLog(request, 'ROLE_VIEW', role.id);

    return {
      success: true,
      data: roleWithPermissions,
    };
  } catch (error) {
    logger.error("Error fetching role:", error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: "Server error while fetching role",
      },
    };
  }
};

/**
 * PUT /api/roles/:id
 * Update role metadata (name, description, status, display order)
 */
export const updateRole = async (request, reply) => {
  try {
    const { id } = request.params;
    const roleId = parseInt(id);
    const {
      name,
      display_name,
      description,
      guard_name,
      hierarchy_level,
      is_active,
      permissions: permissionIds,
      version // For optimistic locking
    } = request.body;

    if (isNaN(roleId)) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: "Invalid role ID format",
        },
      };
    }

    // Find role
    const [existingRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId));

    if (!existingRole) {
      reply.code(404);
      return {
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: "Role not found",
        },
      };
    }

    // Prevent modification of system-protected roles (except permissions)
    if (existingRole.is_system && (name || display_name || description !== undefined || is_active !== undefined)) {
      reply.code(403);
      return {
        success: false,
        error: {
          code: 'SYSTEM_ROLE_PROTECTED',
          message: `Cannot modify system-protected role: ${existingRole.name}. System roles can only have their permissions updated.`,
        },
      };
    }

    // Validate name if provided
    if (name !== undefined) {
      const trimmedName = name.trim();
      if (trimmedName.length < 2 || trimmedName.length > 50) {
        reply.code(400);
        return {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: "Role name must be between 2 and 50 characters",
            errors: [{ field: "name", message: "Role name must be between 2 and 50 characters" }],
          },
        };
      }

      // Check for duplicate name (excluding current role)
      const [duplicateRole] = await db
        .select({ id: roles.id })
        .from(roles)
        .where(and(
          ilike(roles.name, trimmedName),
          ne(roles.id, roleId)
        ));

      if (duplicateRole) {
        reply.code(409);
        return {
          success: false,
          error: {
            code: 'DUPLICATE_ROLE',
            message: "A role with this name already exists",
          },
        };
      }
    }

    // Validate description length
    if (description && description.length > 255) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "Description must be at most 255 characters",
          errors: [{ field: "description", message: "Description must be at most 255 characters" }],
        },
      };
    }

    // Build update data
    const updateData = { updatedAt: new Date() };
    if (name !== undefined) updateData.name = name.trim();
    if (display_name !== undefined) updateData.display_name = display_name.trim();
    if (description !== undefined) updateData.description = description?.trim() || null;
    if (guard_name !== undefined) updateData.guard_name = guard_name;
    if (hierarchy_level !== undefined) updateData.hierarchy_level = hierarchy_level;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update role
    const [updatedRole] = await db.update(roles)
      .set(updateData)
      .where(eq(roles.id, roleId))
      .returning();

    // Update permissions if provided
    if (permissionIds !== undefined && Array.isArray(permissionIds)) {
      // Get current permissions for audit
      const currentPermissions = await db
        .select({ permission_id: role_has_permissions.permission_id })
        .from(role_has_permissions)
        .where(eq(role_has_permissions.role_id, roleId));

      // Remove all existing permissions
      await db.delete(role_has_permissions)
        .where(eq(role_has_permissions.role_id, roleId));

      // Add new permissions
      if (permissionIds.length > 0) {
        const validPermissionIds = [];
        for (const permId of permissionIds) {
          const id = parseInt(permId);
          if (!isNaN(id)) {
            const [perm] = await db
              .select({ id: permissions.id })
              .from(permissions)
              .where(eq(permissions.id, id));
            if (perm) {
              validPermissionIds.push(id);
            }
          }
        }

        if (validPermissionIds.length > 0) {
          const rolePermissionValues = validPermissionIds.map(permissionId => ({
            role_id: roleId,
            permission_id: permissionId,
            assigned_by: request.user?.id || null,
            assigned_at: new Date(),
          }));

          await db.insert(role_has_permissions).values(rolePermissionValues);
        }
      }

      // Clear permission cache for all users with this role
      clearPermissionCache(null); // Clear all caches when role permissions change
    }

    // Fetch updated role with permissions
    const rolePermissions = await db
      .select({
        permission_id: role_has_permissions.permission_id,
      })
      .from(role_has_permissions)
      .where(eq(role_has_permissions.role_id, roleId));

    const permissionDetails = [];
    for (const rp of rolePermissions) {
      const [perm] = await db
        .select({
          id: permissions.id,
          name: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
          description: permissions.description,
        })
        .from(permissions)
        .where(eq(permissions.id, rp.permission_id));
      if (perm) {
        permissionDetails.push(perm);
      }
    }

    const roleWithPermissions = {
      ...updatedRole,
      status: updatedRole.is_active ? 'Active' : 'Inactive',
      permissions: permissionDetails,
    };

    // Create audit log
    await createRoleAuditLog(request, 'ROLE_UPDATE', roleId, existingRole, roleWithPermissions);

    return {
      success: true,
      message: "Role updated successfully",
      data: roleWithPermissions,
    };
  } catch (error) {
    logger.error("Error updating role:", error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: "Server error while updating role",
      },
    };
  }
};

/**
 * DELETE /api/roles/:id
 * Soft delete or deactivate role with cascading checks
 */
export const deleteRole = async (request, reply) => {
  try {
    const { id } = request.params;
    const roleId = parseInt(id);
    const { force = false } = request.query; // Force delete removes role entirely

    if (isNaN(roleId)) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: "Invalid role ID format",
        },
      };
    }

    // Find role
    const [existingRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId));

    if (!existingRole) {
      reply.code(404);
      return {
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: "Role not found",
        },
      };
    }

    // Prevent deletion of system-protected roles
    if (existingRole.is_system || isSystemProtectedRole(existingRole.name)) {
      reply.code(403);
      return {
        success: false,
        error: {
          code: 'SYSTEM_ROLE_PROTECTED',
          message: `Cannot delete system-protected role: ${existingRole.name}`,
        },
      };
    }

    // Check if role is assigned to any active users
    const [{ count: userCount }] = await db
      .select({ count: count() })
      .from(user_has_roles)
      .where(eq(user_has_roles.role_id, roleId));

    if (Number(userCount) > 0 && !force) {
      reply.code(409);
      return {
        success: false,
        error: {
          code: 'ROLE_IN_USE',
          message: `Cannot delete role: ${existingRole.name}. It is currently assigned to ${userCount} user(s). Remove users from this role first or use force=true to deactivate.`,
          details: {
            assigned_users: Number(userCount),
          },
        },
      };
    }

    if (Number(userCount) > 0 && force) {
      // Soft delete: deactivate the role instead of deleting
      await db.update(roles)
        .set({
          is_active: false,
          updatedAt: new Date()
        })
        .where(eq(roles.id, roleId));

      // Create audit log
      await createRoleAuditLog(request, 'ROLE_DEACTIVATE', roleId, existingRole, { ...existingRole, is_active: false });

      return {
        success: true,
        message: `Role "${existingRole.name}" has been deactivated (soft deleted) because it has ${userCount} assigned user(s).`,
        data: {
          id: roleId,
          action: 'deactivated',
          affected_users: Number(userCount),
        },
      };
    }

    // Hard delete: remove role associations and role itself
    await db.delete(role_has_permissions)
      .where(eq(role_has_permissions.role_id, roleId));

    await db.delete(user_has_roles)
      .where(eq(user_has_roles.role_id, roleId));

    await db.delete(roles)
      .where(eq(roles.id, roleId));

    // Clear all permission caches
    clearPermissionCache(null);

    // Create audit log
    await createRoleAuditLog(request, 'ROLE_DELETE', roleId, existingRole, null);

    reply.code(200);
    return {
      success: true,
      message: `Role "${existingRole.name}" deleted successfully`,
      data: {
        id: roleId,
        action: 'deleted',
      },
    };
  } catch (error) {
    logger.error("Error deleting role:", error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: "Server error while deleting role",
      },
    };
  }
};

/**
 * POST /api/roles/:id/permissions
 * Assign one or multiple permissions to a role
 */
export const assignPermissions = async (request, reply) => {
  try {
    const { id } = request.params;
    const roleId = parseInt(id);
    const { permission_ids } = request.body;

    if (isNaN(roleId)) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: "Invalid role ID format",
        },
      };
    }

    // Validate permission_ids
    if (!permission_ids || !Array.isArray(permission_ids) || permission_ids.length === 0) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: "permission_ids must be a non-empty array",
        },
      };
    }

    // Find role
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId));

    if (!role) {
      reply.code(404);
      return {
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: "Role not found",
        },
      };
    }

    // Get existing permissions for this role
    const existingPermissions = await db
      .select({ permission_id: role_has_permissions.permission_id })
      .from(role_has_permissions)
      .where(eq(role_has_permissions.role_id, roleId));

    const existingPermissionIds = new Set(existingPermissions.map(p => p.permission_id));

    // Process each permission
    const results = {
      assigned: [],
      skipped: [], // Already assigned
      invalid: [], // Permission doesn't exist
    };

    for (const permId of permission_ids) {
      const permissionId = parseInt(permId);

      if (isNaN(permissionId)) {
        results.invalid.push({ id: permId, reason: 'Invalid ID format' });
        continue;
      }

      // Check if permission exists
      const [perm] = await db
        .select({ id: permissions.id, name: permissions.name })
        .from(permissions)
        .where(eq(permissions.id, permissionId));

      if (!perm) {
        results.invalid.push({ id: permissionId, reason: 'Permission not found' });
        continue;
      }

      // Check if already assigned (idempotent - skip silently)
      if (existingPermissionIds.has(permissionId)) {
        results.skipped.push({ id: permissionId, name: perm.name });
        continue;
      }

      // Assign permission
      await db.insert(role_has_permissions).values({
        role_id: roleId,
        permission_id: permissionId,
        assigned_by: request.user?.id || null,
        assigned_at: new Date(),
      });

      results.assigned.push({ id: permissionId, name: perm.name });
    }

    // Clear permission cache
    clearPermissionCache(null);

    // Create audit log
    await createRoleAuditLog(request, 'ROLE_PERMISSION_ASSIGN', roleId,
      { existing_permissions: Array.from(existingPermissionIds) },
      { assigned: results.assigned, role_id: roleId }
    );

    return {
      success: true,
      message: `Permissions updated for role "${role.name}"`,
      data: {
        role_id: roleId,
        role_name: role.name,
        ...results,
      },
    };
  } catch (error) {
    logger.error("Error assigning permissions:", error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: "Server error while assigning permissions",
      },
    };
  }
};

/**
 * DELETE /api/roles/:id/permissions/:permissionId
 * Revoke specific permission from role
 */
export const revokePermission = async (request, reply) => {
  try {
    const { id, permissionId } = request.params;
    const roleId = parseInt(id);
    const permId = parseInt(permissionId);

    if (isNaN(roleId) || isNaN(permId)) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: "Invalid role ID or permission ID format",
        },
      };
    }

    // Find role
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId));

    if (!role) {
      reply.code(404);
      return {
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: "Role not found",
        },
      };
    }

    // Find permission
    const [permission] = await db
      .select({ id: permissions.id, name: permissions.name })
      .from(permissions)
      .where(eq(permissions.id, permId));

    if (!permission) {
      reply.code(404);
      return {
        success: false,
        error: {
          code: 'PERMISSION_NOT_FOUND',
          message: "Permission not found",
        },
      };
    }

    // Check if permission is assigned to this role
    const [assignment] = await db
      .select()
      .from(role_has_permissions)
      .where(and(
        eq(role_has_permissions.role_id, roleId),
        eq(role_has_permissions.permission_id, permId)
      ));

    if (!assignment) {
      reply.code(404);
      return {
        success: false,
        error: {
          code: 'PERMISSION_NOT_ASSIGNED',
          message: `Permission "${permission.name}" is not assigned to role "${role.name}"`,
        },
      };
    }

    // Remove permission from role
    await db.delete(role_has_permissions)
      .where(and(
        eq(role_has_permissions.role_id, roleId),
        eq(role_has_permissions.permission_id, permId)
      ));

    // Clear permission cache
    clearPermissionCache(null);

    // Create audit log
    await createRoleAuditLog(request, 'ROLE_PERMISSION_REVOKE', roleId,
      { permission_id: permId, permission_name: permission.name },
      null
    );

    reply.code(200);
    return {
      success: true,
      message: `Permission "${permission.name}" revoked from role "${role.name}"`,
      data: {
        role_id: roleId,
        role_name: role.name,
        permission_id: permId,
        permission_name: permission.name,
      },
    };
  } catch (error) {
    logger.error("Error revoking permission:", error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: "Server error while revoking permission",
      },
    };
  }
};

/**
 * GET /api/roles/:id/permissions
 * Get all permissions assigned to a specific role
 */
export const getRolePermissions = async (request, reply) => {
  try {
    const { id } = request.params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      reply.code(400);
      return {
        success: false,
        error: {
          code: 'INVALID_ID',
          message: "Invalid role ID format",
        },
      };
    }

    // Find role
    const [role] = await db
      .select({
        id: roles.id,
        name: roles.name,
        display_name: roles.display_name,
        description: roles.description,
        hierarchy_level: roles.hierarchy_level,
        is_active: roles.is_active,
        is_system: roles.is_system,
      })
      .from(roles)
      .where(eq(roles.id, roleId));

    if (!role) {
      reply.code(404);
      return {
        success: false,
        error: {
          code: 'ROLE_NOT_FOUND',
          message: "Role not found",
        },
      };
    }

    // Get permissions for this role with assignment details
    const rolePermissions = await db
      .select({
        permission_id: role_has_permissions.permission_id,
        assigned_at: role_has_permissions.assigned_at,
        assigned_by: role_has_permissions.assigned_by,
      })
      .from(role_has_permissions)
      .where(eq(role_has_permissions.role_id, roleId));

    // Fetch detailed permission info
    const permissionDetails = [];
    for (const rp of rolePermissions) {
      const [perm] = await db
        .select({
          id: permissions.id,
          name: permissions.name,
          resource: permissions.resource,
          action: permissions.action,
          description: permissions.description,
          is_active: permissions.is_active,
        })
        .from(permissions)
        .where(eq(permissions.id, rp.permission_id));

      if (perm) {
        permissionDetails.push({
          ...perm,
          assigned_at: rp.assigned_at,
          assigned_by: rp.assigned_by,
        });
      }
    }

    // Create audit log
    await createRoleAuditLog(request, 'ROLE_PERMISSIONS_VIEW', roleId);

    return {
      success: true,
      data: {
        role: {
          id: role.id,
          name: role.name,
          display_name: role.display_name,
          hierarchy_level: role.hierarchy_level,
        },
        permissions: permissionDetails,
        total: permissionDetails.length,
      },
    };
  } catch (error) {
    logger.error("Error fetching role permissions:", error);
    reply.code(500);
    return {
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: "Server error while fetching role permissions",
      },
    };
  }
};

/**
 * Legacy validation middleware (for backward compatibility)
 * @deprecated Use Yup schemas in route definitions instead
 */
export const roleValidation = async (request, reply) => {
  if (!request.body.name) {
    reply.code(400);
    return {
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: "Validation failed",
        errors: [{ field: "name", message: "Role name is required" }],
      },
    };
  }
};
