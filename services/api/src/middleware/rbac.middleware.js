import { ROLES, PERMISSIONS, userHasPermission } from '../config/rbac.js';
import { db } from '../config/db.drizzle.js';
import { user_has_roles, roles, role_has_permissions, permissions } from '../db/schemas/index.js';
import { eq, inArray } from 'drizzle-orm';
import { logger } from '../utils/logger.js';

// Cache for user permissions (with TTL)
const permissionCache = new Map();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Get user permissions from database (with caching)
 * @param {string} userId - The user ID
 * @returns {Promise<string[]>} - Array of permission names
 */
async function getUserPermissionsFromDB(userId) {
  // Check cache first
  const cached = permissionCache.get(userId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.permissions;
  }

  try {
    // Get user's roles
    const userRoles = await db
      .select({ role_id: user_has_roles.role_id })
      .from(user_has_roles)
      .where(eq(user_has_roles.user_id, userId));

    if (userRoles.length === 0) {
      permissionCache.set(userId, { permissions: [], timestamp: Date.now() });
      return [];
    }

    const roleIds = userRoles.map(r => r.role_id);

    // Get permissions for all roles
    const rolePermissions = await db
      .select({ permission_id: role_has_permissions.permission_id })
      .from(role_has_permissions)
      .where(inArray(role_has_permissions.role_id, roleIds));

    if (rolePermissions.length === 0) {
      permissionCache.set(userId, { permissions: [], timestamp: Date.now() });
      return [];
    }

    const permissionIds = [...new Set(rolePermissions.map(rp => rp.permission_id))];

    // Get permission names
    const permissionRecords = await db
      .select({ name: permissions.name })
      .from(permissions)
      .where(inArray(permissions.id, permissionIds));

    const permissionNames = permissionRecords.map(p => p.name);

    // Cache the result
    permissionCache.set(userId, { permissions: permissionNames, timestamp: Date.now() });

    return permissionNames;
  } catch (error) {
    logger.error('Error fetching user permissions from database:', error);
    return [];
  }
}

/**
 * Clear permission cache for a specific user (call when roles/permissions change)
 * @param {string} userId - The user ID
 */
export function clearPermissionCache(userId) {
  if (userId) {
    permissionCache.delete(userId);
  } else {
    permissionCache.clear();
  }
}

/**
 * Middleware to check if user has a specific role
 * @param {...string} allowedRoles - Roles that are allowed to access the route
 */
export const requireRole = (...allowedRoles) => {
  return async (request, reply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.code(401).send({
        status: 401,
        message: 'Access denied. Authentication required.'
      });
    }

    // Check if user has one of the allowed roles
    const userRole = request.user.role || ROLES.PATIENT; // Default to patient if no role specified
    if (!allowedRoles.includes(userRole)) {
      return reply.code(403).send({
        status: 403,
        message: 'Access denied. Insufficient permissions.'
      });
    }
  };
};

/**
 * Middleware to check if user has specific permissions (static config-based)
 * @param {...string} requiredPermissions - Permissions required to access the route
 */
export const requirePermission = (...requiredPermissions) => {
  return async (request, reply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.code(401).send({
        status: 401,
        message: 'Access denied. Authentication required.'
      });
    }

    // Check if user has all required permissions using static config
    const userRole = request.user.role || ROLES.PATIENT; // Default to patient if no role specified
    const hasAllPermissions = requiredPermissions.every(permission =>
      userHasPermission(userRole, permission)
    );

    if (!hasAllPermissions) {
      return reply.code(403).send({
        status: 403,
        message: 'Access denied. Insufficient permissions.'
      });
    }
  };
};

/**
 * Middleware to check if user has specific permissions (dynamic DB-based)
 * This loads permissions from the database for more flexible permission management
 * @param {...string} requiredPermissions - Permissions required to access the route
 */
export const requireDynamicPermission = (...requiredPermissions) => {
  return async (request, reply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.code(401).send({
        status: 401,
        message: 'Access denied. Authentication required.'
      });
    }

    try {
      // Get user's actual permissions from database
      const userPermissions = await getUserPermissionsFromDB(request.user.id);

      // Check if user has all required permissions
      const hasAllPermissions = requiredPermissions.every(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAllPermissions) {
        return reply.code(403).send({
          status: 403,
          message: 'Access denied. Insufficient permissions.'
        });
      }
    } catch (error) {
      logger.error('Error checking dynamic permissions:', error);
      return reply.code(500).send({
        status: 500,
        message: 'Server error during authorization.'
      });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions
 * @param {...string} requiredPermissions - Permissions where having any is sufficient
 */
export const requireAnyPermission = (...requiredPermissions) => {
  return async (request, reply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.code(401).send({
        status: 401,
        message: 'Access denied. Authentication required.'
      });
    }

    // Check if user has any of the required permissions
    const userRole = request.user.role || ROLES.PATIENT; // Default to patient if no role specified
    const hasAnyPermission = requiredPermissions.some(permission =>
      userHasPermission(userRole, permission)
    );

    if (!hasAnyPermission) {
      return reply.code(403).send({
        status: 403,
        message: 'Access denied. Insufficient permissions.'
      });
    }
  };
};

/**
 * Middleware to check if user has any of the specified permissions (dynamic DB-based)
 * @param {...string} requiredPermissions - Permissions where having any is sufficient
 */
export const requireAnyDynamicPermission = (...requiredPermissions) => {
  return async (request, reply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.code(401).send({
        status: 401,
        message: 'Access denied. Authentication required.'
      });
    }

    try {
      // Get user's actual permissions from database
      const userPermissions = await getUserPermissionsFromDB(request.user.id);

      // Check if user has any of the required permissions
      const hasAnyPermission = requiredPermissions.some(permission =>
        userPermissions.includes(permission)
      );

      if (!hasAnyPermission) {
        return reply.code(403).send({
          status: 403,
          message: 'Access denied. Insufficient permissions.'
        });
      }
    } catch (error) {
      logger.error('Error checking dynamic permissions:', error);
      return reply.code(500).send({
        status: 500,
        message: 'Server error during authorization.'
      });
    }
  };
};

/**
 * Middleware to load and attach user permissions to request object
 * Use this when you need to check permissions in controller logic
 */
export const loadUserPermissions = async (request, reply) => {
  if (!request.user) return;

  try {
    request.userPermissions = await getUserPermissionsFromDB(request.user.id);
  } catch (error) {
    logger.error('Error loading user permissions:', error);
    request.userPermissions = [];
  }
};

/**
 * Middleware to check if user is an admin
 */
export const requireAdmin = requireRole(ROLES.ADMIN);

/**
 * Middleware to check if user is a doctor or admin
 */
export const requireMedicalStaff = requireRole(ROLES.ADMIN, ROLES.DOCTOR);

/**
 * Middleware to check if user is healthcare staff (doctor, nurse, or admin)
 */
export const requireHealthcareStaff = requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE);

/**
 * Middleware to require user management permission (admin only)
 */
export const requireUserManagement = requirePermission(PERMISSIONS.MANAGE_USERS);

export default {
  requireRole,
  requirePermission,
  requireDynamicPermission,
  requireAnyPermission,
  requireAnyDynamicPermission,
  loadUserPermissions,
  clearPermissionCache,
  requireAdmin,
  requireMedicalStaff,
  requireHealthcareStaff,
  requireUserManagement
};