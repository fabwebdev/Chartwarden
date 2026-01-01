import { hasAbacAccess } from "../config/abac.js";
import { abacService } from "../services/ABAC.service.js";

import { logger } from '../utils/logger.js';

/**
 * Middleware to check if user has access based on ABAC policies (legacy support)
 * @param {Object} resource - The resource being accessed
 * @param {Object} options - Additional options for ABAC evaluation
 */
export const requireAbacAccess = (resource, options = {}) => {
  return async (request, reply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.code(401).send({
        status: 401,
        message: "Access denied. Authentication required.",
      });
    }

    // Prepare resource object for ABAC evaluation
    const resourceObj = {
      type: resource.type || "unknown",
      ownerId: resource.ownerId || null,
      department: resource.department || null,
      location: resource.location || null,
      ...resource,
    };

    // Prepare environment object
    const environment = {
      ipAddress: request.ip || request.socket.remoteAddress,
      userAgent: request.headers["user-agent"],
      ...options.environment,
    };

    // Check ABAC access using legacy config-based evaluation
    const hasAccess = hasAbacAccess(request.user, resourceObj, environment);

    if (!hasAccess) {
      return reply.code(403).send({
        status: 403,
        message: "Access denied. Insufficient attributes or policy violation.",
      });
    }
  };
};

/**
 * Enhanced ABAC middleware using the new database-backed policy evaluation engine
 * @param {Object} resourceConfig - Resource configuration for access check
 * @param {string} resourceConfig.type - Resource type (e.g., 'patient_record', 'medication')
 * @param {string} resourceConfig.action - Action being performed (e.g., 'read', 'write', 'delete')
 * @param {Function} resourceConfig.getResourceId - Optional function to extract resource ID from request
 * @param {Function} resourceConfig.getResourceAttributes - Optional function to get additional resource attributes
 * @param {Object} options - Additional options
 * @param {string} options.conflictResolution - Conflict resolution strategy
 * @param {boolean} options.skipAuditLog - Skip audit logging for this request
 */
export const requireAbacPolicy = (resourceConfig, options = {}) => {
  return async (request, reply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Access denied. Authentication required.",
        },
      });
    }

    try {
      const {
        type: resourceType,
        action = "read",
        getResourceId,
        getResourceAttributes,
      } = resourceConfig;

      // Build resource object
      const resource = {
        type: resourceType,
        id: getResourceId ? getResourceId(request) : request.params.id,
      };

      // Add additional resource attributes if provider function exists
      if (getResourceAttributes && typeof getResourceAttributes === "function") {
        const additionalAttrs = await getResourceAttributes(request);
        Object.assign(resource, additionalAttrs);
      }

      // Build environment context
      const environment = {
        ipAddress: request.ip || request.socket?.remoteAddress,
        userAgent: request.headers["user-agent"],
        sessionId: request.session?.id,
        requestMethod: request.method,
        requestPath: request.url,
      };

      // Set conflict resolution if specified
      if (options.conflictResolution) {
        abacService.setConflictResolution(options.conflictResolution);
      }

      // Temporarily disable audit logging if requested
      if (options.skipAuditLog) {
        abacService.setAuditLogging(false);
      }

      // Perform authorization check
      const result = await abacService.authorize(
        request.user,
        resource,
        action,
        environment
      );

      // Re-enable audit logging
      if (options.skipAuditLog) {
        abacService.setAuditLogging(true);
      }

      // Attach decision info to request for downstream use
      request.abacDecision = result;

      if (!result.allow) {
        return reply.code(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied. Policy evaluation resulted in denial.",
            details: {
              resourceType,
              action,
              reason: result.reason,
              matchedPolicy: result.matchedPolicy?.name,
            },
          },
        });
      }
    } catch (error) {
      logger.error("ABAC policy evaluation error:", error);
      return reply.code(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Error during access control evaluation.",
        },
      });
    }
  };
};

/**
 * Dynamic ABAC middleware that evaluates policies based on request context
 * This is useful for routes where resource information is determined at runtime
 * @param {Function} contextBuilder - Function that returns { resource, action } from request
 * @param {Object} options - Additional options
 */
export const requireDynamicAbacPolicy = (contextBuilder, options = {}) => {
  return async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        success: false,
        error: {
          code: "UNAUTHORIZED",
          message: "Access denied. Authentication required.",
        },
      });
    }

    try {
      // Get resource and action from context builder
      const { resource, action } = await contextBuilder(request);

      // Build environment context
      const environment = {
        ipAddress: request.ip || request.socket?.remoteAddress,
        userAgent: request.headers["user-agent"],
        sessionId: request.session?.id,
        requestMethod: request.method,
        requestPath: request.url,
      };

      // Perform authorization
      const result = await abacService.authorize(
        request.user,
        resource,
        action,
        environment
      );

      request.abacDecision = result;

      if (!result.allow) {
        return reply.code(403).send({
          success: false,
          error: {
            code: "FORBIDDEN",
            message: "Access denied by policy.",
            details: {
              reason: result.reason,
              matchedPolicy: result.matchedPolicy?.name,
            },
          },
        });
      }
    } catch (error) {
      logger.error("Dynamic ABAC policy evaluation error:", error);
      return reply.code(500).send({
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "Error during access control evaluation.",
        },
      });
    }
  };
};

/**
 * Middleware to check if user has access to a patient record
 * @param {Function} getPatientId - Function to extract patient ID from request
 */
export const requirePatientRecordAccess = (
  getPatientId = (request) => request.params.id
) => {
  return async (request, reply) => {
    // Check if user is authenticated
    if (!request.user) {
      return reply.code(401).send({
        status: 401,
        message: "Access denied. Authentication required.",
      });
    }

    try {
      // Get patient ID from request
      const patientId = getPatientId(request);

      if (!patientId) {
        return reply.code(400).send({
          status: 400,
          message: "Patient ID is required for access control.",
        });
      }

      // Prepare resource object for patient record
      const resource = {
        type: "patient_record",
        ownerId: parseInt(patientId),
        // In a real implementation, you would fetch the patient's department from the database
        department: "general", // Default department
      };

      // Prepare environment object
      const environment = {
        ipAddress: request.ip || request.socket.remoteAddress,
        userAgent: request.headers["user-agent"],
      };

      // Check ABAC access
      const hasAccess = hasAbacAccess(request.user, resource, environment);

      if (!hasAccess) {
        return reply.code(403).send({
          status: 403,
          message:
            "Access denied. You do not have permission to access this patient record.",
        });
      }
    } catch (error) {
      logger.error("Error in patient record access control:", error)
      return reply.code(500).send({
        status: 500,
        message: "Server error during access control check.",
      });
    }
  };
};

/**
 * Middleware to check if user has access based on both RBAC and ABAC
 * @param {Array} requiredPermissions - Permissions required (RBAC)
 * @param {Object} resource - The resource being accessed (ABAC)
 * @param {Object} options - Additional options
 */
export const requireRbacAndAbac = (
  requiredPermissions,
  resource,
  options = {}
) => {
  return async (request, reply) => {
    try {
      // First check RBAC permissions
      const { userHasAllPermissions } = await import("../config/rbac.js");
      
      // Check if user is authenticated
      if (!request.user) {
        return reply.code(401).send({
          status: 401,
          message: "Access denied. Authentication required.",
        });
      }

      // Check RBAC permissions
      const userRole = request.user.role || "patient"; // Default to patient if no role specified
      const hasAllPermissions = requiredPermissions.every((permission) =>
        userHasAllPermissions(userRole, [permission])
      );

      if (!hasAllPermissions) {
        return reply.code(403).send({
          status: 403,
          message: "Access denied. Insufficient RBAC permissions.",
        });
      }

      // If RBAC passes, check ABAC
      const resourceObj = {
        type: resource.type || "unknown",
        ownerId: resource.ownerId || null,
        department: resource.department || null,
        location: resource.location || null,
        ...resource,
      };

      const environment = {
        ipAddress: request.ip || request.socket.remoteAddress,
        userAgent: request.headers["user-agent"],
        ...options.environment,
      };

      const hasAccess = hasAbacAccess(request.user, resourceObj, environment);

      if (!hasAccess) {
        return reply.code(403).send({
          status: 403,
          message: "Access denied. ABAC policy violation.",
        });
      }
    } catch (error) {
      logger.error("Error importing RBAC module:", error)
      return reply.code(500).send({
        status: 500,
        message: "Server error during access control check.",
      });
    }
  };
};

/**
 * Middleware to check if user has access based on either RBAC or ABAC
 * @param {Array} requiredPermissions - Permissions required (RBAC)
 * @param {Object} resource - The resource being accessed (ABAC)
 * @param {Object} options - Additional options
 */
export const requireRbacOrAbac = (
  requiredPermissions,
  resource,
  options = {}
) => {
  return async (request, reply) => {
    try {
      // Check if user is authenticated
      if (!request.user) {
        return reply.code(401).send({
          status: 401,
          message: "Access denied. Authentication required.",
        });
      }

      // Check RBAC permissions
      const { userHasAllPermissions } = await import("../config/rbac.js");
      const userRole = request.user.role || "patient"; // Default to patient if no role specified
      const hasRbacAccess = requiredPermissions.every((permission) =>
        userHasAllPermissions(userRole, [permission])
      );

      // Check ABAC access
      const resourceObj = {
        type: resource.type || "unknown",
        ownerId: resource.ownerId || null,
        department: resource.department || null,
        location: resource.location || null,
        ...resource,
      };

      const environment = {
        ipAddress: request.ip || request.socket.remoteAddress,
        userAgent: request.headers["user-agent"],
        ...options.environment,
      };

      const hasAbacAccessResult = hasAbacAccess(
        request.user,
        resourceObj,
        environment
      );

      // Allow access if either RBAC or ABAC passes
      if (!hasRbacAccess && !hasAbacAccessResult) {
        return reply.code(403).send({
          status: 403,
          message:
            "Access denied. Neither RBAC permissions nor ABAC policies allow access.",
        });
      }
    } catch (error) {
      logger.error("Error importing RBAC module:", error)
      return reply.code(500).send({
        status: 500,
        message: "Server error during access control check.",
      });
    }
  };
};

export default {
  requireAbacAccess,
  requireAbacPolicy,
  requireDynamicAbacPolicy,
  requirePatientRecordAccess,
  requireRbacAndAbac,
  requireRbacOrAbac,
};
