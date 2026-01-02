import {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
  restoreUser,
  changePassword,
  resetPassword,
  requestPasswordReset,
  completePasswordReset,
  updateUserStatus,
  lockUserAccount,
  unlockUserAccount,
  resetFailedLoginAttempts,
  bulkUpdateUserStatus,
  getPasswordRequirements,
} from "../controllers/User.controller.js";
import { requireAdmin, requirePermission } from "../middleware/rbac.middleware.js";
import { PERMISSIONS } from "../config/rbac.js";

// Fastify plugin for user routes
async function userRoutes(fastify, options) {
  // ==========================================
  // PUBLIC ROUTES (no auth required)
  // ==========================================

  // Get password requirements - public endpoint for registration forms
  fastify.get("/users/password-requirements", getPasswordRequirements);

  // Request password reset (generates token, sends email)
  fastify.post("/users/password/request-reset", requestPasswordReset);

  // Complete password reset (using token)
  fastify.post("/users/password/reset", completePasswordReset);

  // ==========================================
  // USER CRUD ROUTES
  // ==========================================

  // Get all users with pagination and filtering - requires admin role
  fastify.get("/users", {
    preHandler: [requireAdmin],
    schema: {
      querystring: {
        type: 'object',
        properties: {
          page: { type: 'integer', minimum: 1, default: 1 },
          limit: { type: 'integer', minimum: 1, maximum: 100, default: 20 },
          search: { type: 'string' },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'locked'] },
          role: { type: 'string' },
          sortBy: { type: 'string', default: 'createdAt' },
          sortOrder: { type: 'string', enum: ['asc', 'desc'], default: 'desc' },
          includeDeleted: { type: 'string', enum: ['true', 'false'], default: 'false' },
        },
      },
    },
  }, getAllUsers);

  // Create user - requires manage:users permission
  fastify.post("/users", {
    preHandler: [requirePermission(PERMISSIONS.MANAGE_USERS)],
    schema: {
      body: {
        type: 'object',
        required: ['email', 'password'],
        properties: {
          name: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 12 },
          role: { type: ['string', 'object', 'number'] },
          contact: { type: 'string' },
        },
      },
    },
  }, createUser);

  // Get user by ID - users can view their own profile, otherwise requires admin role
  fastify.get("/users/:id", {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, getUserById);

  // Update user - users can update their own profile (excluding roles), otherwise requires manage:users permission
  fastify.put("/users/:id", {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          name: { type: 'string' },
          firstName: { type: 'string' },
          lastName: { type: 'string' },
          email: { type: 'string', format: 'email' },
          password: { type: 'string', minLength: 12 },
          role: { type: ['string', 'object', 'number'] },
          contact: { type: 'string' },
          image: { type: 'string' },
        },
      },
    },
  }, updateUser);

  // Delete user (soft delete by default, hard delete with ?hard=true) - requires admin role and manage:users permission
  fastify.delete("/users/:id", {
    preHandler: [requireAdmin, requirePermission(PERMISSIONS.MANAGE_USERS)],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      querystring: {
        type: 'object',
        properties: {
          hard: { type: 'string', enum: ['true', 'false'], default: 'false' },
        },
      },
    },
  }, deleteUser);

  // Restore soft-deleted user - requires admin role
  fastify.post("/users/:id/restore", {
    preHandler: [requireAdmin, requirePermission(PERMISSIONS.MANAGE_USERS)],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, restoreUser);

  // ==========================================
  // PASSWORD MANAGEMENT ROUTES
  // ==========================================

  // Change password (user changes their own password)
  // Auth is handled in the controller - users can only change their own password unless admin
  fastify.post("/users/:id/password/change", {
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['currentPassword', 'newPassword'],
        properties: {
          currentPassword: { type: 'string' },
          newPassword: { type: 'string', minLength: 12 },
        },
      },
    },
  }, changePassword);

  // Reset password (admin action - sets new password without knowing current)
  fastify.post("/users/:id/password/reset", {
    preHandler: [requireAdmin, requirePermission(PERMISSIONS.MANAGE_USERS)],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          newPassword: { type: 'string', minLength: 12 },
          generateRandom: { type: 'boolean', default: false },
        },
      },
    },
  }, resetPassword);

  // ==========================================
  // STATUS MANAGEMENT ROUTES
  // ==========================================

  // Update user status (activate, suspend, lock, etc.)
  fastify.patch("/users/:id/status", {
    preHandler: [requireAdmin, requirePermission(PERMISSIONS.MANAGE_USERS)],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        required: ['status'],
        properties: {
          status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'locked'] },
          reason: { type: 'string' },
        },
      },
    },
  }, updateUserStatus);

  // Lock user account
  fastify.post("/users/:id/lock", {
    preHandler: [requireAdmin, requirePermission(PERMISSIONS.MANAGE_USERS)],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
      body: {
        type: 'object',
        properties: {
          duration: { type: 'integer', minimum: 1, maximum: 8760, default: 24 }, // Max 1 year in hours
          reason: { type: 'string' },
        },
      },
    },
  }, lockUserAccount);

  // Unlock user account
  fastify.post("/users/:id/unlock", {
    preHandler: [requireAdmin, requirePermission(PERMISSIONS.MANAGE_USERS)],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, unlockUserAccount);

  // Reset failed login attempts
  fastify.post("/users/:id/reset-login-attempts", {
    preHandler: [requireAdmin, requirePermission(PERMISSIONS.MANAGE_USERS)],
    schema: {
      params: {
        type: 'object',
        required: ['id'],
        properties: {
          id: { type: 'string' },
        },
      },
    },
  }, resetFailedLoginAttempts);

  // Bulk update user status
  fastify.post("/users/bulk/status", {
    preHandler: [requireAdmin, requirePermission(PERMISSIONS.MANAGE_USERS)],
    schema: {
      body: {
        type: 'object',
        required: ['userIds', 'status'],
        properties: {
          userIds: { type: 'array', items: { type: 'string' }, minItems: 1 },
          status: { type: 'string', enum: ['active', 'inactive', 'suspended', 'locked'] },
          reason: { type: 'string' },
        },
      },
    },
  }, bulkUpdateUserStatus);
}

export default userRoutes;
