/**
 * Permission Management and Role Assignment Controller
 *
 * Provides comprehensive permission and role management operations including:
 * - Permission CRUD with soft delete and audit trail
 * - Role Assignment operations with effective date tracking
 * - Permission-Role Association management
 * - User-Role queries and permission checks
 * - Authorization and privilege escalation prevention
 * - Full audit logging for compliance
 *
 * @module PermissionManagement.controller
 */

import { db } from "../config/db.drizzle.js";
import {
  permissions,
  roles,
  users,
  audit_logs
} from "../db/schemas/index.js";
import { role_has_permissions, user_has_roles } from "../db/schemas/index.js";
import { eq, and, or, like, inArray, desc, asc, sql, isNull, isNotNull } from "drizzle-orm";
import { logger } from '../utils/logger.js';
import { clearPermissionCache } from '../middleware/rbac.middleware.js';

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Create an audit log entry for permission/role operations
 * @param {Object} params - Audit log parameters
 * @param {string} params.userId - The user performing the action
 * @param {string} params.action - The action performed (CREATE, UPDATE, DELETE, etc.)
 * @param {string} params.resourceType - Type of resource (permission, role, user_role, role_permission)
 * @param {string|number} params.resourceId - ID of the affected resource
 * @param {Object} params.oldValue - Previous state (for updates/deletes)
 * @param {Object} params.newValue - New state (for creates/updates)
 * @param {Object} params.metadata - Additional context
 * @param {string} params.ipAddress - Client IP address
 * @param {string} params.userAgent - Client user agent
 */
async function createAuditLog({
  userId,
  action,
  resourceType,
  resourceId,
  oldValue = null,
  newValue = null,
  metadata = null,
  ipAddress = null,
  userAgent = null
}) {
  try {
    await db.insert(audit_logs).values({
      user_id: userId,
      action,
      resource_type: resourceType,
      resource_id: resourceId?.toString(),
      old_value: oldValue ? JSON.stringify(oldValue) : null,
      new_value: newValue ? JSON.stringify(newValue) : null,
      metadata: metadata ? JSON.stringify(metadata) : null,
      ip_address: ipAddress,
      user_agent: userAgent,
      status: 'success'
    });
  } catch (error) {
    logger.error('Error creating audit log:', error);
    // Don't throw - audit logging should not break the main operation
  }
}

/**
 * Extract request context for audit logging
 * @param {Object} request - Fastify request object
 * @returns {Object} Context object with userId, ipAddress, userAgent
 */
function getRequestContext(request) {
  return {
    userId: request.user?.id || null,
    ipAddress: request.ip || request.headers['x-forwarded-for'] || null,
    userAgent: request.headers['user-agent'] || null
  };
}

/**
 * Build pagination metadata
 * @param {number} total - Total number of items
 * @param {number} page - Current page (1-based)
 * @param {number} perPage - Items per page
 * @returns {Object} Pagination metadata
 */
function buildPaginationMeta(total, page, perPage) {
  const totalPages = Math.ceil(total / perPage);
  return {
    total,
    page,
    per_page: perPage,
    total_pages: totalPages,
    has_more: page < totalPages,
    has_previous: page > 1
  };
}

/**
 * Get user's highest role hierarchy level (for privilege escalation prevention)
 * @param {string} userId - User ID
 * @returns {Promise<number>} Hierarchy level (lower = higher privilege)
 */
async function getUserHighestPrivilegeLevel(userId) {
  const userRolesData = await db
    .select({ hierarchy_level: roles.hierarchy_level })
    .from(user_has_roles)
    .innerJoin(roles, eq(user_has_roles.role_id, roles.id))
    .where(and(
      eq(user_has_roles.user_id, userId),
      eq(roles.is_active, true)
    ));

  if (userRolesData.length === 0) {
    return 1000; // No roles = lowest privilege
  }

  return Math.min(...userRolesData.map(r => r.hierarchy_level));
}

// ============================================================================
// PERMISSION CRUD OPERATIONS
// ============================================================================

/**
 * Get all permissions with pagination, filtering, and sorting
 * @route GET /permissions
 */
export const getAllPermissions = async (request, reply) => {
  try {
    const {
      page = 1,
      per_page = 50,
      sort_by = 'created_at',
      sort_order = 'desc',
      search = '',
      resource = '',
      action = '',
      is_active = null,
      guard_name = ''
    } = request.query;

    const pageNum = Math.max(1, parseInt(page));
    const perPage = Math.min(100, Math.max(1, parseInt(per_page)));
    const offset = (pageNum - 1) * perPage;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(or(
        like(permissions.name, `%${search}%`),
        like(permissions.description, `%${search}%`)
      ));
    }

    if (resource) {
      conditions.push(eq(permissions.resource, resource));
    }

    if (action) {
      conditions.push(eq(permissions.action, action));
    }

    if (is_active !== null && is_active !== '') {
      conditions.push(eq(permissions.is_active, is_active === 'true' || is_active === true));
    }

    if (guard_name) {
      conditions.push(eq(permissions.guard_name, guard_name));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(permissions)
      .where(whereClause);
    const total = parseInt(countResult[0].count);

    // Determine sort column and direction
    const sortColumn = {
      'name': permissions.name,
      'resource': permissions.resource,
      'action': permissions.action,
      'created_at': permissions.createdAt,
      'updated_at': permissions.updatedAt
    }[sort_by] || permissions.createdAt;

    const sortDirection = sort_order === 'asc' ? asc : desc;

    // Get paginated permissions
    const permissionsList = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
        guard_name: permissions.guard_name,
        is_active: permissions.is_active,
        created_at: permissions.createdAt,
        updated_at: permissions.updatedAt,
      })
      .from(permissions)
      .where(whereClause)
      .orderBy(sortDirection(sortColumn))
      .limit(perPage)
      .offset(offset);

    return {
      status: 200,
      data: permissionsList,
      meta: buildPaginationMeta(total, pageNum, perPage)
    };
  } catch (error) {
    logger.error("Error fetching permissions:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching permissions",
    };
  }
};

/**
 * Get permission list (names only) for dropdowns
 * @route GET /permissions/list
 */
export const getPermissionList = async (request, reply) => {
  try {
    const { is_active = true } = request.query;

    const conditions = [];
    if (is_active !== null && is_active !== '') {
      conditions.push(eq(permissions.is_active, is_active === 'true' || is_active === true));
    }

    const permissionsList = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action,
      })
      .from(permissions)
      .where(conditions.length > 0 ? and(...conditions) : undefined)
      .orderBy(asc(permissions.name));

    return {
      status: 200,
      data: permissionsList,
    };
  } catch (error) {
    logger.error("Error fetching permission list:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching permission list",
    };
  }
};

/**
 * Create a new permission
 * @route POST /permissions
 */
export const createPermission = async (request, reply) => {
  try {
    const { name, resource, action, description, guard_name } = request.body;
    const context = getRequestContext(request);

    // Validation
    const errors = [];
    if (!name) errors.push({ field: "name", message: "Permission name is required" });
    if (!resource) errors.push({ field: "resource", message: "Resource is required" });
    if (!action) errors.push({ field: "action", message: "Action is required" });

    if (errors.length > 0) {
      reply.code(400);
      return {
        status: 400,
        message: "Validation failed",
        errors,
      };
    }

    // Validate action type
    const validActions = ['create', 'read', 'update', 'delete', 'manage', 'view', 'verify', 'process'];
    if (!validActions.includes(action.toLowerCase())) {
      reply.code(400);
      return {
        status: 400,
        message: "Validation failed",
        errors: [{ field: "action", message: `Action must be one of: ${validActions.join(', ')}` }],
      };
    }

    // Check for duplicate name
    const existingByName = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(eq(permissions.name, name))
      .limit(1);

    if (existingByName.length > 0) {
      reply.code(409);
      return {
        status: 409,
        message: "Conflict: Permission with this name already exists",
        errors: [{ field: "name", message: "Permission name must be unique" }],
      };
    }

    // Check for duplicate resource+action combination
    const existingByResourceAction = await db
      .select({ id: permissions.id })
      .from(permissions)
      .where(and(
        eq(permissions.resource, resource),
        eq(permissions.action, action.toLowerCase())
      ))
      .limit(1);

    if (existingByResourceAction.length > 0) {
      reply.code(409);
      return {
        status: 409,
        message: "Conflict: Permission for this resource and action already exists",
        errors: [{ field: "resource", message: "This resource+action combination already exists" }],
      };
    }

    // Create permission
    const now = new Date();
    const [newPermission] = await db
      .insert(permissions)
      .values({
        name,
        resource,
        action: action.toLowerCase(),
        description: description || null,
        guard_name: guard_name || "web",
        is_active: true,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'CREATE',
      resourceType: 'permission',
      resourceId: newPermission.id,
      newValue: newPermission,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    reply.code(201);
    reply.header('Location', `/api/permissions/${newPermission.id}`);
    return {
      status: 201,
      message: "Permission created successfully",
      data: newPermission,
    };
  } catch (error) {
    logger.error("Error creating permission:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while creating permission",
    };
  }
};

/**
 * Get permission by ID with associated roles
 * @route GET /permissions/:id
 */
export const getPermissionById = async (request, reply) => {
  try {
    const { id } = request.params;
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      reply.code(400);
      return {
        status: 400,
        message: "Invalid permission ID",
        errors: [{ field: "id", message: "Permission ID must be a number" }],
      };
    }

    // Get permission
    const [permission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, permissionId))
      .limit(1);

    if (!permission) {
      reply.code(404);
      return {
        status: 404,
        message: "Permission not found",
      };
    }

    // Get associated roles using JOIN
    const associatedRoles = await db
      .select({
        id: roles.id,
        name: roles.name,
        display_name: roles.display_name,
        hierarchy_level: roles.hierarchy_level,
        is_active: roles.is_active,
        assigned_at: role_has_permissions.assigned_at,
        assigned_by: role_has_permissions.assigned_by
      })
      .from(role_has_permissions)
      .innerJoin(roles, eq(role_has_permissions.role_id, roles.id))
      .where(eq(role_has_permissions.permission_id, permissionId));

    return {
      status: 200,
      data: {
        ...permission,
        roles: associatedRoles,
      },
    };
  } catch (error) {
    logger.error("Error fetching permission:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching permission",
    };
  }
};

/**
 * Update permission by ID
 * Note: Permission key/name cannot be changed to maintain referential integrity
 * @route PUT /permissions/:id
 */
export const updatePermission = async (request, reply) => {
  try {
    const { id } = request.params;
    const { description, is_active, guard_name } = request.body;
    const context = getRequestContext(request);
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      reply.code(400);
      return {
        status: 400,
        message: "Invalid permission ID",
        errors: [{ field: "id", message: "Permission ID must be a number" }],
      };
    }

    // Get existing permission
    const [existingPermission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, permissionId))
      .limit(1);

    if (!existingPermission) {
      reply.code(404);
      return {
        status: 404,
        message: "Permission not found",
      };
    }

    // Build update data (excluding name/resource/action which are immutable)
    const updateData = {
      updatedAt: new Date(),
    };

    if (description !== undefined) updateData.description = description;
    if (is_active !== undefined) updateData.is_active = is_active;
    if (guard_name !== undefined) updateData.guard_name = guard_name;

    // Check if there are any actual changes
    if (Object.keys(updateData).length === 1) {
      reply.code(400);
      return {
        status: 400,
        message: "No valid fields provided to update",
        errors: [{ field: "body", message: "Provide description, is_active, or guard_name to update" }],
      };
    }

    // Update permission
    const [updatedPermission] = await db
      .update(permissions)
      .set(updateData)
      .where(eq(permissions.id, permissionId))
      .returning();

    // Clear permission cache for all users (permission change affects everyone)
    clearPermissionCache();

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'UPDATE',
      resourceType: 'permission',
      resourceId: permissionId,
      oldValue: existingPermission,
      newValue: updatedPermission,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return {
      status: 200,
      message: "Permission updated successfully",
      data: updatedPermission,
    };
  } catch (error) {
    logger.error("Error updating permission:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while updating permission",
    };
  }
};

/**
 * Soft delete permission by ID
 * Sets is_active to false instead of hard delete for audit trail
 * @route DELETE /permissions/:id
 */
export const softDeletePermission = async (request, reply) => {
  try {
    const { id } = request.params;
    const { force = false } = request.query;
    const context = getRequestContext(request);
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      reply.code(400);
      return {
        status: 400,
        message: "Invalid permission ID",
        errors: [{ field: "id", message: "Permission ID must be a number" }],
      };
    }

    // Get existing permission
    const [existingPermission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, permissionId))
      .limit(1);

    if (!existingPermission) {
      reply.code(404);
      return {
        status: 404,
        message: "Permission not found",
      };
    }

    // Check if permission is assigned to any active roles
    const activeRoleAssignments = await db
      .select({ role_id: role_has_permissions.role_id, role_name: roles.name })
      .from(role_has_permissions)
      .innerJoin(roles, eq(role_has_permissions.role_id, roles.id))
      .where(and(
        eq(role_has_permissions.permission_id, permissionId),
        eq(roles.is_active, true)
      ));

    if (activeRoleAssignments.length > 0 && !force) {
      reply.code(409);
      return {
        status: 409,
        message: "Cannot delete permission that is assigned to active roles",
        errors: [{
          field: "roles",
          message: `Permission is assigned to roles: ${activeRoleAssignments.map(r => r.role_name).join(', ')}. Use force=true to proceed.`
        }],
        affected_roles: activeRoleAssignments.map(r => ({ id: r.role_id, name: r.role_name }))
      };
    }

    // If force delete, remove role associations
    if (force && activeRoleAssignments.length > 0) {
      await db
        .delete(role_has_permissions)
        .where(eq(role_has_permissions.permission_id, permissionId));
    }

    // Soft delete by setting is_active to false
    const [deletedPermission] = await db
      .update(permissions)
      .set({
        is_active: false,
        updatedAt: new Date()
      })
      .where(eq(permissions.id, permissionId))
      .returning();

    // Clear permission cache for all users
    clearPermissionCache();

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'DELETE',
      resourceType: 'permission',
      resourceId: permissionId,
      oldValue: existingPermission,
      newValue: { ...deletedPermission, deleted: true },
      metadata: { soft_delete: true, force_delete: force },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    reply.code(200);
    return {
      status: 200,
      message: "Permission deleted successfully",
    };
  } catch (error) {
    logger.error("Error deleting permission:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while deleting permission",
    };
  }
};

/**
 * Hard delete permission by ID (permanently removes from database)
 * Only allowed if permission is not assigned to any roles
 * @route DELETE /permissions/:id/permanent
 */
export const hardDeletePermission = async (request, reply) => {
  try {
    const { id } = request.params;
    const context = getRequestContext(request);
    const permissionId = parseInt(id);

    if (isNaN(permissionId)) {
      reply.code(400);
      return {
        status: 400,
        message: "Invalid permission ID",
        errors: [{ field: "id", message: "Permission ID must be a number" }],
      };
    }

    // Get existing permission
    const [existingPermission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, permissionId))
      .limit(1);

    if (!existingPermission) {
      reply.code(404);
      return {
        status: 404,
        message: "Permission not found",
      };
    }

    // Check for any role assignments
    const roleAssignments = await db
      .select({ role_id: role_has_permissions.role_id })
      .from(role_has_permissions)
      .where(eq(role_has_permissions.permission_id, permissionId));

    if (roleAssignments.length > 0) {
      reply.code(409);
      return {
        status: 409,
        message: "Cannot permanently delete permission with role associations",
        errors: [{
          field: "roles",
          message: "Remove all role associations before permanent deletion"
        }],
      };
    }

    // Hard delete
    await db
      .delete(permissions)
      .where(eq(permissions.id, permissionId));

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'PERMANENT_DELETE',
      resourceType: 'permission',
      resourceId: permissionId,
      oldValue: existingPermission,
      metadata: { permanent: true },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    reply.code(204);
    return;
  } catch (error) {
    logger.error("Error permanently deleting permission:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while deleting permission",
    };
  }
};

// ============================================================================
// ROLE ASSIGNMENT OPERATIONS
// ============================================================================

/**
 * Assign role(s) to a user
 * @route POST /users/:userId/roles
 */
export const assignRolesToUser = async (request, reply) => {
  try {
    const { userId } = request.params;
    const { role_ids, reason } = request.body;
    const context = getRequestContext(request);

    // Validation
    if (!role_ids || !Array.isArray(role_ids) || role_ids.length === 0) {
      reply.code(400);
      return {
        status: 400,
        message: "Validation failed",
        errors: [{ field: "role_ids", message: "role_ids array is required and must not be empty" }],
      };
    }

    // Verify user exists
    const [user] = await db
      .select({ id: users.id, name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    // Verify all roles exist and are active
    const rolesList = await db
      .select({
        id: roles.id,
        name: roles.name,
        hierarchy_level: roles.hierarchy_level,
        is_active: roles.is_active
      })
      .from(roles)
      .where(inArray(roles.id, role_ids));

    const validRoleIds = rolesList.filter(r => r.is_active).map(r => r.id);
    const invalidRoleIds = role_ids.filter(id => !validRoleIds.includes(parseInt(id)));

    if (invalidRoleIds.length > 0) {
      reply.code(400);
      return {
        status: 400,
        message: "Some roles are invalid or inactive",
        errors: [{
          field: "role_ids",
          message: `Invalid or inactive role IDs: ${invalidRoleIds.join(', ')}`
        }],
      };
    }

    // Privilege escalation check - assigning user must have higher privilege than roles being assigned
    const assignerPrivilegeLevel = await getUserHighestPrivilegeLevel(context.userId);
    const rolesToAssign = rolesList.filter(r => r.is_active);
    const privilegeViolations = rolesToAssign.filter(r => r.hierarchy_level < assignerPrivilegeLevel);

    if (privilegeViolations.length > 0) {
      reply.code(403);
      return {
        status: 403,
        message: "Privilege escalation denied",
        errors: [{
          field: "role_ids",
          message: `Cannot assign roles with higher privilege than your own: ${privilegeViolations.map(r => r.name).join(', ')}`
        }],
      };
    }

    // Get existing role assignments to avoid duplicates
    const existingAssignments = await db
      .select({ role_id: user_has_roles.role_id })
      .from(user_has_roles)
      .where(eq(user_has_roles.user_id, userId));

    const existingRoleIds = existingAssignments.map(a => a.role_id);
    const newRoleIds = validRoleIds.filter(id => !existingRoleIds.includes(id));

    // If all roles are already assigned (idempotent)
    if (newRoleIds.length === 0) {
      return {
        status: 200,
        message: "All roles are already assigned to this user",
        data: { assigned: 0, skipped: validRoleIds.length }
      };
    }

    // Insert new role assignments
    const now = new Date();
    const assignmentValues = newRoleIds.map(roleId => ({
      user_id: userId,
      role_id: roleId,
      assigned_at: now,
      assigned_by: context.userId
    }));

    await db.insert(user_has_roles).values(assignmentValues);

    // Clear permission cache for this user
    clearPermissionCache(userId);

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'ASSIGN_ROLES',
      resourceType: 'user_role',
      resourceId: userId,
      newValue: { assigned_roles: newRoleIds, reason },
      metadata: { target_user: userId, reason },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    reply.code(201);
    return {
      status: 201,
      message: "Roles assigned successfully",
      data: {
        user_id: userId,
        assigned: newRoleIds.length,
        skipped: validRoleIds.length - newRoleIds.length,
        assigned_roles: rolesToAssign.filter(r => newRoleIds.includes(r.id)).map(r => ({ id: r.id, name: r.name }))
      }
    };
  } catch (error) {
    logger.error("Error assigning roles to user:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while assigning roles",
    };
  }
};

/**
 * Revoke role(s) from a user
 * @route DELETE /users/:userId/roles
 */
export const revokeRolesFromUser = async (request, reply) => {
  try {
    const { userId } = request.params;
    const { role_ids, reason } = request.body;
    const context = getRequestContext(request);

    // Validation
    if (!role_ids || !Array.isArray(role_ids) || role_ids.length === 0) {
      reply.code(400);
      return {
        status: 400,
        message: "Validation failed",
        errors: [{ field: "role_ids", message: "role_ids array is required and must not be empty" }],
      };
    }

    // Verify user exists
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    // Get existing assignments to revoke
    const existingAssignments = await db
      .select({
        role_id: user_has_roles.role_id,
        role_name: roles.name
      })
      .from(user_has_roles)
      .innerJoin(roles, eq(user_has_roles.role_id, roles.id))
      .where(and(
        eq(user_has_roles.user_id, userId),
        inArray(user_has_roles.role_id, role_ids)
      ));

    if (existingAssignments.length === 0) {
      return {
        status: 200,
        message: "No matching role assignments found to revoke",
        data: { revoked: 0 }
      };
    }

    // Delete role assignments
    await db
      .delete(user_has_roles)
      .where(and(
        eq(user_has_roles.user_id, userId),
        inArray(user_has_roles.role_id, role_ids)
      ));

    // Clear permission cache for this user
    clearPermissionCache(userId);

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'REVOKE_ROLES',
      resourceType: 'user_role',
      resourceId: userId,
      oldValue: { revoked_roles: existingAssignments },
      metadata: { target_user: userId, reason: reason || 'No reason provided' },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return {
      status: 200,
      message: "Roles revoked successfully",
      data: {
        user_id: userId,
        revoked: existingAssignments.length,
        revoked_roles: existingAssignments.map(a => ({ id: a.role_id, name: a.role_name }))
      }
    };
  } catch (error) {
    logger.error("Error revoking roles from user:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while revoking roles",
    };
  }
};

/**
 * Replace all roles for a user (atomic operation)
 * @route PUT /users/:userId/roles
 */
export const replaceUserRoles = async (request, reply) => {
  try {
    const { userId } = request.params;
    const { role_ids, reason } = request.body;
    const context = getRequestContext(request);

    // Validation - allow empty array to remove all roles
    if (!role_ids || !Array.isArray(role_ids)) {
      reply.code(400);
      return {
        status: 400,
        message: "Validation failed",
        errors: [{ field: "role_ids", message: "role_ids array is required" }],
      };
    }

    // Verify user exists
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    // Get current assignments for audit
    const currentAssignments = await db
      .select({
        role_id: user_has_roles.role_id,
        role_name: roles.name
      })
      .from(user_has_roles)
      .innerJoin(roles, eq(user_has_roles.role_id, roles.id))
      .where(eq(user_has_roles.user_id, userId));

    // Verify all new roles exist and are active
    let validRoleIds = [];
    if (role_ids.length > 0) {
      const rolesList = await db
        .select({
          id: roles.id,
          name: roles.name,
          hierarchy_level: roles.hierarchy_level,
          is_active: roles.is_active
        })
        .from(roles)
        .where(inArray(roles.id, role_ids));

      validRoleIds = rolesList.filter(r => r.is_active).map(r => r.id);
      const invalidRoleIds = role_ids.filter(id => !validRoleIds.includes(parseInt(id)));

      if (invalidRoleIds.length > 0) {
        reply.code(400);
        return {
          status: 400,
          message: "Some roles are invalid or inactive",
          errors: [{
            field: "role_ids",
            message: `Invalid or inactive role IDs: ${invalidRoleIds.join(', ')}`
          }],
        };
      }

      // Privilege escalation check
      const assignerPrivilegeLevel = await getUserHighestPrivilegeLevel(context.userId);
      const rolesToAssign = rolesList.filter(r => r.is_active);
      const privilegeViolations = rolesToAssign.filter(r => r.hierarchy_level < assignerPrivilegeLevel);

      if (privilegeViolations.length > 0) {
        reply.code(403);
        return {
          status: 403,
          message: "Privilege escalation denied",
          errors: [{
            field: "role_ids",
            message: `Cannot assign roles with higher privilege than your own: ${privilegeViolations.map(r => r.name).join(', ')}`
          }],
        };
      }
    }

    // Delete all current assignments
    await db
      .delete(user_has_roles)
      .where(eq(user_has_roles.user_id, userId));

    // Insert new role assignments if any
    if (validRoleIds.length > 0) {
      const now = new Date();
      const assignmentValues = validRoleIds.map(roleId => ({
        user_id: userId,
        role_id: roleId,
        assigned_at: now,
        assigned_by: context.userId
      }));

      await db.insert(user_has_roles).values(assignmentValues);
    }

    // Clear permission cache for this user
    clearPermissionCache(userId);

    // Get new assignments for response
    const newAssignments = await db
      .select({
        role_id: user_has_roles.role_id,
        role_name: roles.name,
        assigned_at: user_has_roles.assigned_at
      })
      .from(user_has_roles)
      .innerJoin(roles, eq(user_has_roles.role_id, roles.id))
      .where(eq(user_has_roles.user_id, userId));

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'REPLACE_ROLES',
      resourceType: 'user_role',
      resourceId: userId,
      oldValue: { previous_roles: currentAssignments },
      newValue: { new_roles: newAssignments },
      metadata: { target_user: userId, reason: reason || 'Role replacement' },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return {
      status: 200,
      message: "User roles replaced successfully",
      data: {
        user_id: userId,
        previous_count: currentAssignments.length,
        new_count: newAssignments.length,
        roles: newAssignments.map(a => ({ id: a.role_id, name: a.role_name, assigned_at: a.assigned_at }))
      }
    };
  } catch (error) {
    logger.error("Error replacing user roles:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while replacing roles",
    };
  }
};

// ============================================================================
// PERMISSION-ROLE ASSOCIATION
// ============================================================================

/**
 * Assign permissions to a role
 * @route POST /roles/:roleId/permissions
 */
export const assignPermissionsToRole = async (request, reply) => {
  try {
    const { roleId } = request.params;
    const { permission_ids } = request.body;
    const context = getRequestContext(request);
    const roleIdNum = parseInt(roleId);

    // Validation
    if (!permission_ids || !Array.isArray(permission_ids) || permission_ids.length === 0) {
      reply.code(400);
      return {
        status: 400,
        message: "Validation failed",
        errors: [{ field: "permission_ids", message: "permission_ids array is required and must not be empty" }],
      };
    }

    // Verify role exists
    const [role] = await db
      .select({ id: roles.id, name: roles.name, is_system: roles.is_system })
      .from(roles)
      .where(eq(roles.id, roleIdNum))
      .limit(1);

    if (!role) {
      reply.code(404);
      return {
        status: 404,
        message: "Role not found",
      };
    }

    // Verify all permissions exist and are active
    const permissionsList = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        is_active: permissions.is_active
      })
      .from(permissions)
      .where(inArray(permissions.id, permission_ids));

    const validPermissionIds = permissionsList.filter(p => p.is_active).map(p => p.id);
    const invalidPermissionIds = permission_ids.filter(id => !validPermissionIds.includes(parseInt(id)));

    if (invalidPermissionIds.length > 0) {
      reply.code(400);
      return {
        status: 400,
        message: "Some permissions are invalid or inactive",
        errors: [{
          field: "permission_ids",
          message: `Invalid or inactive permission IDs: ${invalidPermissionIds.join(', ')}`
        }],
      };
    }

    // Get existing permission assignments to avoid duplicates
    const existingAssignments = await db
      .select({ permission_id: role_has_permissions.permission_id })
      .from(role_has_permissions)
      .where(eq(role_has_permissions.role_id, roleIdNum));

    const existingPermissionIds = existingAssignments.map(a => a.permission_id);
    const newPermissionIds = validPermissionIds.filter(id => !existingPermissionIds.includes(id));

    // If all permissions are already assigned (idempotent)
    if (newPermissionIds.length === 0) {
      return {
        status: 200,
        message: "All permissions are already assigned to this role",
        data: { assigned: 0, skipped: validPermissionIds.length }
      };
    }

    // Insert new permission assignments
    const now = new Date();
    const assignmentValues = newPermissionIds.map(permissionId => ({
      role_id: roleIdNum,
      permission_id: permissionId,
      assigned_at: now,
      assigned_by: context.userId
    }));

    await db.insert(role_has_permissions).values(assignmentValues);

    // Clear permission cache for all users with this role
    clearPermissionCache();

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'ASSIGN_PERMISSIONS',
      resourceType: 'role_permission',
      resourceId: roleIdNum,
      newValue: { assigned_permissions: newPermissionIds },
      metadata: { role_name: role.name },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    reply.code(201);
    return {
      status: 201,
      message: "Permissions assigned to role successfully",
      data: {
        role_id: roleIdNum,
        role_name: role.name,
        assigned: newPermissionIds.length,
        skipped: validPermissionIds.length - newPermissionIds.length,
        assigned_permissions: permissionsList.filter(p => newPermissionIds.includes(p.id)).map(p => ({ id: p.id, name: p.name }))
      }
    };
  } catch (error) {
    logger.error("Error assigning permissions to role:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while assigning permissions",
    };
  }
};

/**
 * Remove permissions from a role
 * @route DELETE /roles/:roleId/permissions
 */
export const removePermissionsFromRole = async (request, reply) => {
  try {
    const { roleId } = request.params;
    const { permission_ids } = request.body;
    const context = getRequestContext(request);
    const roleIdNum = parseInt(roleId);

    // Validation
    if (!permission_ids || !Array.isArray(permission_ids) || permission_ids.length === 0) {
      reply.code(400);
      return {
        status: 400,
        message: "Validation failed",
        errors: [{ field: "permission_ids", message: "permission_ids array is required and must not be empty" }],
      };
    }

    // Verify role exists
    const [role] = await db
      .select({ id: roles.id, name: roles.name })
      .from(roles)
      .where(eq(roles.id, roleIdNum))
      .limit(1);

    if (!role) {
      reply.code(404);
      return {
        status: 404,
        message: "Role not found",
      };
    }

    // Get existing assignments to remove
    const existingAssignments = await db
      .select({
        permission_id: role_has_permissions.permission_id,
        permission_name: permissions.name
      })
      .from(role_has_permissions)
      .innerJoin(permissions, eq(role_has_permissions.permission_id, permissions.id))
      .where(and(
        eq(role_has_permissions.role_id, roleIdNum),
        inArray(role_has_permissions.permission_id, permission_ids)
      ));

    if (existingAssignments.length === 0) {
      return {
        status: 200,
        message: "No matching permission assignments found to remove",
        data: { removed: 0 }
      };
    }

    // Delete permission assignments
    await db
      .delete(role_has_permissions)
      .where(and(
        eq(role_has_permissions.role_id, roleIdNum),
        inArray(role_has_permissions.permission_id, permission_ids)
      ));

    // Clear permission cache for all users
    clearPermissionCache();

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'REMOVE_PERMISSIONS',
      resourceType: 'role_permission',
      resourceId: roleIdNum,
      oldValue: { removed_permissions: existingAssignments },
      metadata: { role_name: role.name },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return {
      status: 200,
      message: "Permissions removed from role successfully",
      data: {
        role_id: roleIdNum,
        role_name: role.name,
        removed: existingAssignments.length,
        removed_permissions: existingAssignments.map(a => ({ id: a.permission_id, name: a.permission_name }))
      }
    };
  } catch (error) {
    logger.error("Error removing permissions from role:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while removing permissions",
    };
  }
};

/**
 * Get complete permission set for a role (including inherited from hierarchy)
 * @route GET /roles/:roleId/permissions
 */
export const getRolePermissions = async (request, reply) => {
  try {
    const { roleId } = request.params;
    const roleIdNum = parseInt(roleId);

    // Verify role exists
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleIdNum))
      .limit(1);

    if (!role) {
      reply.code(404);
      return {
        status: 404,
        message: "Role not found",
      };
    }

    // Get permissions assigned to this role using JOIN
    const rolePermissions = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
        is_active: permissions.is_active,
        assigned_at: role_has_permissions.assigned_at,
        assigned_by: role_has_permissions.assigned_by
      })
      .from(role_has_permissions)
      .innerJoin(permissions, eq(role_has_permissions.permission_id, permissions.id))
      .where(eq(role_has_permissions.role_id, roleIdNum))
      .orderBy(asc(permissions.resource), asc(permissions.action));

    return {
      status: 200,
      data: {
        role: {
          id: role.id,
          name: role.name,
          display_name: role.display_name,
          hierarchy_level: role.hierarchy_level
        },
        permissions: rolePermissions,
        total: rolePermissions.length
      }
    };
  } catch (error) {
    logger.error("Error fetching role permissions:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching role permissions",
    };
  }
};

/**
 * Get all roles that have a specific permission
 * @route GET /permissions/:permissionId/roles
 */
export const getPermissionRoles = async (request, reply) => {
  try {
    const { permissionId } = request.params;
    const permissionIdNum = parseInt(permissionId);

    // Verify permission exists
    const [permission] = await db
      .select()
      .from(permissions)
      .where(eq(permissions.id, permissionIdNum))
      .limit(1);

    if (!permission) {
      reply.code(404);
      return {
        status: 404,
        message: "Permission not found",
      };
    }

    // Get roles that have this permission
    const permissionRoles = await db
      .select({
        id: roles.id,
        name: roles.name,
        display_name: roles.display_name,
        hierarchy_level: roles.hierarchy_level,
        is_active: roles.is_active,
        assigned_at: role_has_permissions.assigned_at,
        assigned_by: role_has_permissions.assigned_by
      })
      .from(role_has_permissions)
      .innerJoin(roles, eq(role_has_permissions.role_id, roles.id))
      .where(eq(role_has_permissions.permission_id, permissionIdNum))
      .orderBy(asc(roles.hierarchy_level), asc(roles.name));

    return {
      status: 200,
      data: {
        permission: {
          id: permission.id,
          name: permission.name,
          resource: permission.resource,
          action: permission.action
        },
        roles: permissionRoles,
        total: permissionRoles.length
      }
    };
  } catch (error) {
    logger.error("Error fetching permission roles:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching permission roles",
    };
  }
};

// ============================================================================
// USER-ROLE QUERIES
// ============================================================================

/**
 * Get all roles assigned to a user
 * @route GET /users/:userId/roles
 */
export const getUserRoles = async (request, reply) => {
  try {
    const { userId } = request.params;
    const { include_inactive = false } = request.query;

    // Verify user exists
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    // Build query conditions
    const conditions = [eq(user_has_roles.user_id, userId)];
    if (!include_inactive) {
      conditions.push(eq(roles.is_active, true));
    }

    // Get roles assigned to user
    const userRoles = await db
      .select({
        id: roles.id,
        name: roles.name,
        display_name: roles.display_name,
        description: roles.description,
        hierarchy_level: roles.hierarchy_level,
        is_active: roles.is_active,
        is_system: roles.is_system,
        assigned_at: user_has_roles.assigned_at,
        assigned_by: user_has_roles.assigned_by
      })
      .from(user_has_roles)
      .innerJoin(roles, eq(user_has_roles.role_id, roles.id))
      .where(and(...conditions))
      .orderBy(asc(roles.hierarchy_level), asc(roles.name));

    return {
      status: 200,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        roles: userRoles,
        total: userRoles.length
      }
    };
  } catch (error) {
    logger.error("Error fetching user roles:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching user roles",
    };
  }
};

/**
 * Get effective permissions for a user (aggregate across all roles)
 * @route GET /users/:userId/permissions
 */
export const getUserPermissions = async (request, reply) => {
  try {
    const { userId } = request.params;

    // Verify user exists
    const [user] = await db
      .select({ id: users.id, name: users.name, email: users.email })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    // Get all permissions through user's active roles
    const userPermissions = await db
      .selectDistinct({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description
      })
      .from(user_has_roles)
      .innerJoin(roles, and(
        eq(user_has_roles.role_id, roles.id),
        eq(roles.is_active, true)
      ))
      .innerJoin(role_has_permissions, eq(roles.id, role_has_permissions.role_id))
      .innerJoin(permissions, and(
        eq(role_has_permissions.permission_id, permissions.id),
        eq(permissions.is_active, true)
      ))
      .where(eq(user_has_roles.user_id, userId))
      .orderBy(asc(permissions.resource), asc(permissions.action));

    // Group permissions by resource for easier consumption
    const groupedByResource = userPermissions.reduce((acc, perm) => {
      if (!acc[perm.resource]) {
        acc[perm.resource] = [];
      }
      acc[perm.resource].push({
        id: perm.id,
        name: perm.name,
        action: perm.action,
        description: perm.description
      });
      return acc;
    }, {});

    return {
      status: 200,
      data: {
        user: {
          id: user.id,
          name: user.name,
          email: user.email
        },
        permissions: userPermissions,
        grouped_by_resource: groupedByResource,
        total: userPermissions.length
      }
    };
  } catch (error) {
    logger.error("Error fetching user permissions:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching user permissions",
    };
  }
};

/**
 * Check if user has a specific permission
 * @route GET /users/:userId/permissions/:permissionName/check
 */
export const checkUserPermission = async (request, reply) => {
  try {
    const { userId, permissionName } = request.params;

    // Verify user exists
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    // Check if user has the permission through any active role
    const hasPermission = await db
      .select({ id: permissions.id })
      .from(user_has_roles)
      .innerJoin(roles, and(
        eq(user_has_roles.role_id, roles.id),
        eq(roles.is_active, true)
      ))
      .innerJoin(role_has_permissions, eq(roles.id, role_has_permissions.role_id))
      .innerJoin(permissions, and(
        eq(role_has_permissions.permission_id, permissions.id),
        eq(permissions.is_active, true),
        eq(permissions.name, permissionName)
      ))
      .where(eq(user_has_roles.user_id, userId))
      .limit(1);

    return {
      status: 200,
      data: {
        user_id: userId,
        permission: permissionName,
        has_permission: hasPermission.length > 0
      }
    };
  } catch (error) {
    logger.error("Error checking user permission:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while checking permission",
    };
  }
};

/**
 * Get all users with a specific role
 * @route GET /roles/:roleId/users
 */
export const getRoleUsers = async (request, reply) => {
  try {
    const { roleId } = request.params;
    const { page = 1, per_page = 50 } = request.query;
    const roleIdNum = parseInt(roleId);

    const pageNum = Math.max(1, parseInt(page));
    const perPage = Math.min(100, Math.max(1, parseInt(per_page)));
    const offset = (pageNum - 1) * perPage;

    // Verify role exists
    const [role] = await db
      .select({ id: roles.id, name: roles.name, display_name: roles.display_name })
      .from(roles)
      .where(eq(roles.id, roleIdNum))
      .limit(1);

    if (!role) {
      reply.code(404);
      return {
        status: 404,
        message: "Role not found",
      };
    }

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(user_has_roles)
      .where(eq(user_has_roles.role_id, roleIdNum));
    const total = parseInt(countResult[0].count);

    // Get users with this role
    const roleUsers = await db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        is_active: users.is_active,
        assigned_at: user_has_roles.assigned_at,
        assigned_by: user_has_roles.assigned_by
      })
      .from(user_has_roles)
      .innerJoin(users, eq(user_has_roles.user_id, users.id))
      .where(eq(user_has_roles.role_id, roleIdNum))
      .orderBy(asc(users.name))
      .limit(perPage)
      .offset(offset);

    return {
      status: 200,
      data: {
        role: {
          id: role.id,
          name: role.name,
          display_name: role.display_name
        },
        users: roleUsers
      },
      meta: buildPaginationMeta(total, pageNum, perPage)
    };
  } catch (error) {
    logger.error("Error fetching role users:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching role users",
    };
  }
};

// ============================================================================
// ROLE CRUD OPERATIONS (Enhanced)
// ============================================================================

/**
 * Get all roles with pagination, filtering, and sorting
 * @route GET /roles
 */
export const getAllRoles = async (request, reply) => {
  try {
    const {
      page = 1,
      per_page = 50,
      sort_by = 'hierarchy_level',
      sort_order = 'asc',
      search = '',
      is_active = null,
      include_permissions = false
    } = request.query;

    const pageNum = Math.max(1, parseInt(page));
    const perPage = Math.min(100, Math.max(1, parseInt(per_page)));
    const offset = (pageNum - 1) * perPage;

    // Build where conditions
    const conditions = [];

    if (search) {
      conditions.push(or(
        like(roles.name, `%${search}%`),
        like(roles.display_name, `%${search}%`),
        like(roles.description, `%${search}%`)
      ));
    }

    if (is_active !== null && is_active !== '') {
      conditions.push(eq(roles.is_active, is_active === 'true' || is_active === true));
    }

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(roles)
      .where(whereClause);
    const total = parseInt(countResult[0].count);

    // Determine sort column and direction
    const sortColumn = {
      'name': roles.name,
      'display_name': roles.display_name,
      'hierarchy_level': roles.hierarchy_level,
      'created_at': roles.createdAt,
      'updated_at': roles.updatedAt
    }[sort_by] || roles.hierarchy_level;

    const sortDirection = sort_order === 'desc' ? desc : asc;

    // Get paginated roles
    const rolesList = await db
      .select()
      .from(roles)
      .where(whereClause)
      .orderBy(sortDirection(sortColumn))
      .limit(perPage)
      .offset(offset);

    // Optionally include permissions for each role
    let rolesWithPermissions = rolesList;
    if (include_permissions === 'true' || include_permissions === true) {
      rolesWithPermissions = await Promise.all(rolesList.map(async (role) => {
        const rolePerms = await db
          .select({
            id: permissions.id,
            name: permissions.name,
            resource: permissions.resource,
            action: permissions.action
          })
          .from(role_has_permissions)
          .innerJoin(permissions, eq(role_has_permissions.permission_id, permissions.id))
          .where(eq(role_has_permissions.role_id, role.id));

        return {
          ...role,
          permissions: rolePerms
        };
      }));
    }

    return {
      status: 200,
      data: rolesWithPermissions,
      meta: buildPaginationMeta(total, pageNum, perPage)
    };
  } catch (error) {
    logger.error("Error fetching roles:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching roles",
    };
  }
};

/**
 * Create a new role
 * @route POST /roles
 */
export const createRole = async (request, reply) => {
  try {
    const { name, display_name, description, guard_name, hierarchy_level, permission_ids } = request.body;
    const context = getRequestContext(request);

    // Validation
    const errors = [];
    if (!name) errors.push({ field: "name", message: "Role name is required" });

    if (errors.length > 0) {
      reply.code(400);
      return {
        status: 400,
        message: "Validation failed",
        errors,
      };
    }

    // Check for duplicate name
    const existingRole = await db
      .select({ id: roles.id })
      .from(roles)
      .where(eq(roles.name, name))
      .limit(1);

    if (existingRole.length > 0) {
      reply.code(409);
      return {
        status: 409,
        message: "Conflict: Role with this name already exists",
        errors: [{ field: "name", message: "Role name must be unique" }],
      };
    }

    // Privilege escalation check for hierarchy level
    const assignerPrivilegeLevel = await getUserHighestPrivilegeLevel(context.userId);
    const requestedHierarchy = hierarchy_level || 100;

    if (requestedHierarchy < assignerPrivilegeLevel) {
      reply.code(403);
      return {
        status: 403,
        message: "Privilege escalation denied",
        errors: [{
          field: "hierarchy_level",
          message: `Cannot create role with hierarchy level ${requestedHierarchy}. Your highest level is ${assignerPrivilegeLevel}.`
        }],
      };
    }

    // Create role
    const now = new Date();
    const [newRole] = await db
      .insert(roles)
      .values({
        name,
        display_name: display_name || name,
        description: description || null,
        guard_name: guard_name || "web",
        hierarchy_level: requestedHierarchy,
        is_active: true,
        is_system: false,
        createdAt: now,
        updatedAt: now,
      })
      .returning();

    // Assign permissions if provided
    if (permission_ids && Array.isArray(permission_ids) && permission_ids.length > 0) {
      const validPermissionIds = permission_ids.filter(id =>
        typeof id === 'number' || (typeof id === 'string' && !isNaN(id))
      ).map(id => parseInt(id));

      if (validPermissionIds.length > 0) {
        const assignmentValues = validPermissionIds.map(permissionId => ({
          role_id: newRole.id,
          permission_id: permissionId,
          assigned_at: now,
          assigned_by: context.userId
        }));

        await db.insert(role_has_permissions).values(assignmentValues);
      }
    }

    // Get role with permissions for response
    const rolePerms = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action
      })
      .from(role_has_permissions)
      .innerJoin(permissions, eq(role_has_permissions.permission_id, permissions.id))
      .where(eq(role_has_permissions.role_id, newRole.id));

    const roleWithPermissions = {
      ...newRole,
      permissions: rolePerms
    };

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'CREATE',
      resourceType: 'role',
      resourceId: newRole.id,
      newValue: roleWithPermissions,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    reply.code(201);
    reply.header('Location', `/api/roles/${newRole.id}`);
    return {
      status: 201,
      message: "Role created successfully",
      data: roleWithPermissions,
    };
  } catch (error) {
    logger.error("Error creating role:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while creating role",
    };
  }
};

/**
 * Get role by ID with permissions
 * @route GET /roles/:id
 */
export const getRoleById = async (request, reply) => {
  try {
    const { id } = request.params;
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      reply.code(400);
      return {
        status: 400,
        message: "Invalid role ID",
        errors: [{ field: "id", message: "Role ID must be a number" }],
      };
    }

    // Get role
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!role) {
      reply.code(404);
      return {
        status: 404,
        message: "Role not found",
      };
    }

    // Get permissions
    const rolePerms = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action,
        description: permissions.description,
        assigned_at: role_has_permissions.assigned_at
      })
      .from(role_has_permissions)
      .innerJoin(permissions, eq(role_has_permissions.permission_id, permissions.id))
      .where(eq(role_has_permissions.role_id, roleId))
      .orderBy(asc(permissions.resource), asc(permissions.action));

    // Get user count
    const userCountResult = await db
      .select({ count: sql`count(*)` })
      .from(user_has_roles)
      .where(eq(user_has_roles.role_id, roleId));
    const userCount = parseInt(userCountResult[0].count);

    return {
      status: 200,
      data: {
        ...role,
        permissions: rolePerms,
        user_count: userCount
      },
    };
  } catch (error) {
    logger.error("Error fetching role:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching role",
    };
  }
};

/**
 * Update role by ID
 * @route PUT /roles/:id
 */
export const updateRole = async (request, reply) => {
  try {
    const { id } = request.params;
    const { display_name, description, hierarchy_level, is_active, permission_ids } = request.body;
    const context = getRequestContext(request);
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      reply.code(400);
      return {
        status: 400,
        message: "Invalid role ID",
        errors: [{ field: "id", message: "Role ID must be a number" }],
      };
    }

    // Get existing role
    const [existingRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!existingRole) {
      reply.code(404);
      return {
        status: 404,
        message: "Role not found",
      };
    }

    // Prevent modification of system roles (except certain fields)
    if (existingRole.is_system) {
      reply.code(403);
      return {
        status: 403,
        message: "Cannot modify system role",
        errors: [{ field: "is_system", message: "System roles are protected and cannot be modified" }],
      };
    }

    // Privilege escalation check for hierarchy level
    if (hierarchy_level !== undefined) {
      const assignerPrivilegeLevel = await getUserHighestPrivilegeLevel(context.userId);
      if (hierarchy_level < assignerPrivilegeLevel) {
        reply.code(403);
        return {
          status: 403,
          message: "Privilege escalation denied",
          errors: [{
            field: "hierarchy_level",
            message: `Cannot set hierarchy level to ${hierarchy_level}. Your highest level is ${assignerPrivilegeLevel}.`
          }],
        };
      }
    }

    // Build update data
    const updateData = {
      updatedAt: new Date(),
    };

    if (display_name !== undefined) updateData.display_name = display_name;
    if (description !== undefined) updateData.description = description;
    if (hierarchy_level !== undefined) updateData.hierarchy_level = hierarchy_level;
    if (is_active !== undefined) updateData.is_active = is_active;

    // Update role
    const [updatedRole] = await db
      .update(roles)
      .set(updateData)
      .where(eq(roles.id, roleId))
      .returning();

    // Update permissions if provided
    if (permission_ids !== undefined && Array.isArray(permission_ids)) {
      // Remove existing permissions
      await db
        .delete(role_has_permissions)
        .where(eq(role_has_permissions.role_id, roleId));

      // Add new permissions
      if (permission_ids.length > 0) {
        const validPermissionIds = permission_ids.filter(id =>
          typeof id === 'number' || (typeof id === 'string' && !isNaN(id))
        ).map(id => parseInt(id));

        if (validPermissionIds.length > 0) {
          const assignmentValues = validPermissionIds.map(permissionId => ({
            role_id: roleId,
            permission_id: permissionId,
            assigned_at: new Date(),
            assigned_by: context.userId
          }));

          await db.insert(role_has_permissions).values(assignmentValues);
        }
      }
    }

    // Clear permission cache
    clearPermissionCache();

    // Get role with updated permissions
    const rolePerms = await db
      .select({
        id: permissions.id,
        name: permissions.name,
        resource: permissions.resource,
        action: permissions.action
      })
      .from(role_has_permissions)
      .innerJoin(permissions, eq(role_has_permissions.permission_id, permissions.id))
      .where(eq(role_has_permissions.role_id, roleId));

    const roleWithPermissions = {
      ...updatedRole,
      permissions: rolePerms
    };

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'UPDATE',
      resourceType: 'role',
      resourceId: roleId,
      oldValue: existingRole,
      newValue: roleWithPermissions,
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    return {
      status: 200,
      message: "Role updated successfully",
      data: roleWithPermissions,
    };
  } catch (error) {
    logger.error("Error updating role:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while updating role",
    };
  }
};

/**
 * Delete role by ID (with cascade cleanup)
 * @route DELETE /roles/:id
 */
export const deleteRole = async (request, reply) => {
  try {
    const { id } = request.params;
    const { force = false } = request.query;
    const context = getRequestContext(request);
    const roleId = parseInt(id);

    if (isNaN(roleId)) {
      reply.code(400);
      return {
        status: 400,
        message: "Invalid role ID",
        errors: [{ field: "id", message: "Role ID must be a number" }],
      };
    }

    // Get existing role
    const [existingRole] = await db
      .select()
      .from(roles)
      .where(eq(roles.id, roleId))
      .limit(1);

    if (!existingRole) {
      reply.code(404);
      return {
        status: 404,
        message: "Role not found",
      };
    }

    // Prevent deletion of system roles
    if (existingRole.is_system) {
      reply.code(403);
      return {
        status: 403,
        message: "Cannot delete system role",
        errors: [{ field: "is_system", message: "System roles are protected and cannot be deleted" }],
      };
    }

    // Check for user assignments
    const userAssignments = await db
      .select({ user_id: user_has_roles.user_id, user_name: users.name })
      .from(user_has_roles)
      .innerJoin(users, eq(user_has_roles.user_id, users.id))
      .where(eq(user_has_roles.role_id, roleId));

    if (userAssignments.length > 0 && !force) {
      reply.code(409);
      return {
        status: 409,
        message: "Cannot delete role that is assigned to users",
        errors: [{
          field: "users",
          message: `Role is assigned to ${userAssignments.length} user(s). Use force=true to proceed.`
        }],
        affected_users: userAssignments.slice(0, 10).map(u => ({ id: u.user_id, name: u.user_name }))
      };
    }

    // Delete role-permission associations
    await db
      .delete(role_has_permissions)
      .where(eq(role_has_permissions.role_id, roleId));

    // Delete user-role associations
    await db
      .delete(user_has_roles)
      .where(eq(user_has_roles.role_id, roleId));

    // Delete role
    await db
      .delete(roles)
      .where(eq(roles.id, roleId));

    // Clear permission cache for all users
    clearPermissionCache();

    // Audit log
    await createAuditLog({
      userId: context.userId,
      action: 'DELETE',
      resourceType: 'role',
      resourceId: roleId,
      oldValue: existingRole,
      metadata: { force_delete: force, affected_users: userAssignments.length },
      ipAddress: context.ipAddress,
      userAgent: context.userAgent
    });

    reply.code(200);
    return {
      status: 200,
      message: "Role deleted successfully",
      data: {
        removed_user_assignments: userAssignments.length,
        removed_permission_assignments: true
      }
    };
  } catch (error) {
    logger.error("Error deleting role:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while deleting role",
    };
  }
};

// ============================================================================
// AUDIT TRAIL RETRIEVAL
// ============================================================================

/**
 * Get audit trail for permissions/roles
 * @route GET /audit/permissions
 */
export const getPermissionAuditTrail = async (request, reply) => {
  try {
    const {
      page = 1,
      per_page = 50,
      resource_type = '',
      resource_id = '',
      action = '',
      user_id = '',
      start_date = '',
      end_date = ''
    } = request.query;

    const pageNum = Math.max(1, parseInt(page));
    const perPage = Math.min(100, Math.max(1, parseInt(per_page)));
    const offset = (pageNum - 1) * perPage;

    // Build where conditions
    const conditions = [];

    // Filter to permission-related resources only
    conditions.push(or(
      eq(audit_logs.resource_type, 'permission'),
      eq(audit_logs.resource_type, 'role'),
      eq(audit_logs.resource_type, 'user_role'),
      eq(audit_logs.resource_type, 'role_permission')
    ));

    if (resource_type) {
      conditions.push(eq(audit_logs.resource_type, resource_type));
    }

    if (resource_id) {
      conditions.push(eq(audit_logs.resource_id, resource_id));
    }

    if (action) {
      conditions.push(eq(audit_logs.action, action));
    }

    if (user_id) {
      conditions.push(eq(audit_logs.user_id, user_id));
    }

    if (start_date) {
      conditions.push(sql`${audit_logs.created_at} >= ${new Date(start_date)}`);
    }

    if (end_date) {
      conditions.push(sql`${audit_logs.created_at} <= ${new Date(end_date)}`);
    }

    const whereClause = and(...conditions);

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)` })
      .from(audit_logs)
      .where(whereClause);
    const total = parseInt(countResult[0].count);

    // Get paginated audit logs
    const auditLogs = await db
      .select({
        id: audit_logs.id,
        user_id: audit_logs.user_id,
        action: audit_logs.action,
        resource_type: audit_logs.resource_type,
        resource_id: audit_logs.resource_id,
        old_value: audit_logs.old_value,
        new_value: audit_logs.new_value,
        status: audit_logs.status,
        ip_address: audit_logs.ip_address,
        created_at: audit_logs.created_at
      })
      .from(audit_logs)
      .where(whereClause)
      .orderBy(desc(audit_logs.created_at))
      .limit(perPage)
      .offset(offset);

    // Parse JSON values
    const parsedLogs = auditLogs.map(log => ({
      ...log,
      old_value: log.old_value ? JSON.parse(log.old_value) : null,
      new_value: log.new_value ? JSON.parse(log.new_value) : null
    }));

    return {
      status: 200,
      data: parsedLogs,
      meta: buildPaginationMeta(total, pageNum, perPage)
    };
  } catch (error) {
    logger.error("Error fetching permission audit trail:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching audit trail",
    };
  }
};

export default {
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
  assignPermissionsToRole,
  removePermissionsFromRole,
  getRolePermissions,
  getPermissionRoles,

  // User-Role Queries
  getUserRoles,
  getUserPermissions,
  checkUserPermission,
  getRoleUsers,

  // Role CRUD
  getAllRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,

  // Audit
  getPermissionAuditTrail
};
