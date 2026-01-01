import {
  getAllUsers,
  createUser,
  getUserById,
  updateUser,
  deleteUser,
} from "../controllers/User.controller.js";
import { requireAdmin, requirePermission } from "../middleware/rbac.middleware.js";
import { PERMISSIONS } from "../config/rbac.js";

// Fastify plugin for user routes
async function userRoutes(fastify, options) {
  // User routes - All user management requires admin role or manage:users permission

  // Get all users - requires admin role
  fastify.get("/users", {
    preHandler: [requireAdmin],
  }, getAllUsers);

  // Create user - requires manage:users permission
  fastify.post("/users", {
    preHandler: [requirePermission(PERMISSIONS.MANAGE_USERS)],
  }, createUser);

  // Get user by ID - requires admin role
  fastify.get("/users/:id", {
    preHandler: [requireAdmin],
  }, getUserById);

  // Update user - requires manage:users permission
  fastify.put("/users/:id", {
    preHandler: [requirePermission(PERMISSIONS.MANAGE_USERS)],
  }, updateUser);

  // Delete user - requires admin role and manage:users permission
  fastify.delete("/users/:id", {
    preHandler: [requireAdmin, requirePermission(PERMISSIONS.MANAGE_USERS)],
  }, deleteUser);
}

export default userRoutes;
