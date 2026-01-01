/**
 * Permission Routes (Legacy)
 *
 * NOTE: Most permission routes are now handled by permissionManagement.routes.js
 * This file only provides backwards-compatible routes that don't conflict.
 *
 * @deprecated Use permissionManagement.routes.js for new development
 */
import {
  createPermission,
  permissionValidation
} from '../controllers/Permission.controller.js';
import validate from '../middleware/validation.middleware.js';

// Fastify plugin for permission routes
async function permissionRoutes(fastify, options) {
  // Legacy permission store route (for backward compatibility)
  // Main /permissions routes are handled by permissionManagement.routes.js
  fastify.post('/permissions/store', {
    preHandler: [permissionValidation, validate],
  }, createPermission);
}

export default permissionRoutes;