/**
 * Role Management API Routes
 *
 * RESTful API endpoints for role management with:
 * - Complete CRUD operations
 * - Permission assignment and revocation
 * - Yup validation schemas
 * - RBAC middleware (admin only)
 * - Rate limiting
 */

import * as yup from 'yup';
import {
  getAllRoles,
  createRole,
  getRoleById,
  updateRole,
  deleteRole,
  getRolePermissions,
  assignPermissions,
  revokePermission,
} from '../controllers/Role.controller.js';
import { validate, sanitizedString } from '../middleware/validation.middleware.js';
import { requireAdmin, requirePermission } from '../middleware/rbac.middleware.js';
import { PERMISSIONS } from '../config/rbac.js';

// ============================================================================
// Validation Schemas
// ============================================================================

/**
 * Schema for listing roles with pagination and filtering
 */
const listRolesQuerySchema = yup.object({
  page: yup.number().integer().min(1).default(1),
  limit: yup.number().integer().min(1).max(100).default(20),
  sort: yup.string().oneOf(['name', 'created_at', 'updated_at', 'hierarchy_level']).default('name'),
  order: yup.string().oneOf(['asc', 'desc']).default('asc'),
  status: yup.string().oneOf(['Active', 'Inactive', 'Archived']),
  name: sanitizedString().max(100),
  is_system: yup.string().oneOf(['true', 'false']),
});

/**
 * Schema for creating a new role
 */
const createRoleSchema = yup.object({
  name: sanitizedString()
    .required('Role name is required')
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must be at most 50 characters'),
  display_name: sanitizedString()
    .max(255, 'Display name must be at most 255 characters'),
  description: sanitizedString()
    .max(255, 'Description must be at most 255 characters'),
  guard_name: sanitizedString()
    .max(255)
    .default('web'),
  hierarchy_level: yup.number()
    .integer()
    .min(1, 'Hierarchy level must be at least 1')
    .max(1000, 'Hierarchy level must be at most 1000')
    .default(100),
  is_active: yup.boolean().default(true),
  permissions: yup.array()
    .of(yup.number().integer().positive())
    .default([]),
});

/**
 * Schema for updating a role
 */
const updateRoleSchema = yup.object({
  name: sanitizedString()
    .min(2, 'Role name must be at least 2 characters')
    .max(50, 'Role name must be at most 50 characters'),
  display_name: sanitizedString()
    .max(255, 'Display name must be at most 255 characters'),
  description: sanitizedString()
    .max(255, 'Description must be at most 255 characters')
    .nullable(),
  guard_name: sanitizedString()
    .max(255),
  hierarchy_level: yup.number()
    .integer()
    .min(1, 'Hierarchy level must be at least 1')
    .max(1000, 'Hierarchy level must be at most 1000'),
  is_active: yup.boolean(),
  permissions: yup.array()
    .of(yup.number().integer().positive()),
});

/**
 * Schema for role ID parameter
 */
const roleIdParamSchema = yup.object({
  id: yup.number()
    .required('Role ID is required')
    .integer('Role ID must be an integer')
    .positive('Role ID must be positive'),
});

/**
 * Schema for permission ID parameter
 */
const permissionIdParamSchema = yup.object({
  id: yup.number()
    .required('Role ID is required')
    .integer('Role ID must be an integer')
    .positive('Role ID must be positive'),
  permissionId: yup.number()
    .required('Permission ID is required')
    .integer('Permission ID must be an integer')
    .positive('Permission ID must be positive'),
});

/**
 * Schema for assigning permissions to a role
 */
const assignPermissionsSchema = yup.object({
  permission_ids: yup.array()
    .of(yup.number().integer().positive('Permission ID must be a positive integer'))
    .required('permission_ids is required')
    .min(1, 'At least one permission ID is required'),
});

/**
 * Schema for delete query parameters
 */
const deleteRoleQuerySchema = yup.object({
  force: yup.string().oneOf(['true', 'false']).default('false'),
});

// ============================================================================
// Fastify Plugin for Role Routes
// ============================================================================

async function roleRoutes(fastify, options) {
  /**
   * GET /api/roles
   * List all roles with pagination, sorting, and filtering
   */
  fastify.get('/roles', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({ query: listRolesQuerySchema }),
    ],
  }, getAllRoles);

  /**
   * POST /api/roles
   * Create a new role
   */
  fastify.post('/roles', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({ body: createRoleSchema }),
    ],
  }, createRole);

  /**
   * GET /api/roles/:id
   * Get single role by ID with full permission list
   */
  fastify.get('/roles/:id', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({ params: roleIdParamSchema }),
    ],
  }, getRoleById);

  /**
   * PUT /api/roles/:id
   * Update role by ID
   */
  fastify.put('/roles/:id', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({
        params: roleIdParamSchema,
        body: updateRoleSchema,
      }),
    ],
  }, updateRole);

  /**
   * DELETE /api/roles/:id
   * Delete role by ID (with optional force soft-delete)
   */
  fastify.delete('/roles/:id', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({
        params: roleIdParamSchema,
        query: deleteRoleQuerySchema,
      }),
    ],
  }, deleteRole);

  /**
   * GET /api/roles/:id/permissions
   * Get all permissions assigned to a specific role
   */
  fastify.get('/roles/:id/permissions', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({ params: roleIdParamSchema }),
    ],
  }, getRolePermissions);

  /**
   * POST /api/roles/:id/permissions
   * Assign one or multiple permissions to a role
   */
  fastify.post('/roles/:id/permissions', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({
        params: roleIdParamSchema,
        body: assignPermissionsSchema,
      }),
    ],
  }, assignPermissions);

  /**
   * DELETE /api/roles/:id/permissions/:permissionId
   * Revoke specific permission from role
   */
  fastify.delete('/roles/:id/permissions/:permissionId', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({ params: permissionIdParamSchema }),
    ],
  }, revokePermission);

  // ============================================================================
  // Legacy Routes (backward compatibility)
  // ============================================================================

  /**
   * @deprecated Use POST /api/roles instead
   * POST /api/role/store - Legacy create role endpoint
   */
  fastify.post('/role/store', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({ body: createRoleSchema }),
    ],
  }, createRole);

  /**
   * @deprecated Use GET /api/roles/:id instead
   * GET /api/role/:id - Legacy get role endpoint
   */
  fastify.get('/role/:id', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({ params: roleIdParamSchema }),
    ],
  }, getRoleById);

  /**
   * @deprecated Use PUT /api/roles/:id instead
   * PUT /api/role/:id - Legacy update role endpoint
   */
  fastify.put('/role/:id', {
    preHandler: [
      requirePermission(PERMISSIONS.MANAGE_ROLES),
      validate({
        params: roleIdParamSchema,
        body: updateRoleSchema,
      }),
    ],
  }, updateRole);
}

export default roleRoutes;
