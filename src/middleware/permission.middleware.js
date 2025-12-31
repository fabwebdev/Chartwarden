import { requirePermission } from './rbac.middleware.js';

/**
 * Middleware factory to check if user has a specific permission
 * This is a convenience wrapper around requirePermission for single permission checks
 * @param {string} permission - The permission to check
 * @returns {Function} Fastify preHandler middleware function
 */
export const checkPermission = (permission) => {
  return requirePermission(permission);
};

export default {
  checkPermission
};

