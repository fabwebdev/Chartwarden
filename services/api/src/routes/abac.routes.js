import { authenticate } from "../middleware/betterAuth.middleware.js";
import { requireRole } from "../middleware/rbac.middleware.js";
import { ROLES } from "../config/rbac.js";
import {
  getPolicies,
  getPolicy,
  createPolicy,
  updatePolicy,
  deletePolicy,
  getAttributes,
  createAttribute,
  simulatePolicy,
  getTestCases,
  createTestCase,
  runTestCase,
  getAccessLogs,
  getAccessStats,
  clearCache,
  getConflictResolutionStrategies,
} from "../controllers/ABAC.controller.js";

/**
 * ABAC Routes
 * Administrative endpoints for managing Attribute-Based Access Control
 *
 * All routes require authentication and admin role
 */
async function abacRoutes(fastify, options) {
  // ============================================================================
  // Policy Management Routes
  // ============================================================================

  /**
   * GET /policies
   * Get all ABAC policies
   * Query params:
   *   - includeInactive: boolean - Include inactive policies
   */
  fastify.get(
    "/policies",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Get all ABAC policies",
        querystring: {
          type: "object",
          properties: {
            includeInactive: { type: "string", enum: ["true", "false"] },
          },
        },
      },
    },
    getPolicies
  );

  /**
   * GET /policies/:id
   * Get a single ABAC policy by ID
   */
  fastify.get(
    "/policies/:id",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Get a single ABAC policy",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
      },
    },
    getPolicy
  );

  /**
   * POST /policies
   * Create a new ABAC policy
   */
  fastify.post(
    "/policies",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Create a new ABAC policy",
        body: {
          type: "object",
          required: ["name", "resourceType", "action", "rules"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string" },
            resourceType: { type: "string", minLength: 1, maxLength: 100 },
            action: { type: "string", minLength: 1, maxLength: 50 },
            rules: {
              type: "object",
              properties: {
                operator: { type: "string", enum: ["and", "or", "not"] },
                conditions: { type: "array" },
              },
            },
            effect: { type: "string", enum: ["allow", "deny"] },
            priority: { type: "integer", minimum: 0 },
          },
        },
      },
    },
    createPolicy
  );

  /**
   * PATCH /policies/:id
   * Update an existing ABAC policy
   */
  fastify.patch(
    "/policies/:id",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Update an ABAC policy",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
        body: {
          type: "object",
          properties: {
            name: { type: "string", minLength: 1, maxLength: 255 },
            description: { type: "string" },
            resourceType: { type: "string", minLength: 1, maxLength: 100 },
            action: { type: "string", minLength: 1, maxLength: 50 },
            rules: { type: "object" },
            effect: { type: "string", enum: ["allow", "deny"] },
            priority: { type: "integer", minimum: 0 },
            isActive: { type: "boolean" },
          },
        },
      },
    },
    updatePolicy
  );

  /**
   * DELETE /policies/:id
   * Deactivate an ABAC policy
   */
  fastify.delete(
    "/policies/:id",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Deactivate an ABAC policy",
        params: {
          type: "object",
          properties: {
            id: { type: "string" },
          },
          required: ["id"],
        },
      },
    },
    deletePolicy
  );

  // ============================================================================
  // Attribute Management Routes
  // ============================================================================

  /**
   * GET /attributes
   * Get all attribute definitions
   */
  fastify.get(
    "/attributes",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Get all ABAC attribute definitions",
      },
    },
    getAttributes
  );

  /**
   * POST /attributes
   * Create a new attribute definition
   */
  fastify.post(
    "/attributes",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Create a new ABAC attribute definition",
        body: {
          type: "object",
          required: ["name", "category", "dataType"],
          properties: {
            name: { type: "string", minLength: 1, maxLength: 100 },
            category: { type: "string", enum: ["user", "resource", "environment"] },
            dataType: { type: "string", enum: ["string", "number", "boolean", "array", "date"] },
            description: { type: "string" },
            provider: { type: "string", maxLength: 100 },
            providerConfig: { type: "object" },
            possibleValues: { type: "array" },
          },
        },
      },
    },
    createAttribute
  );

  // ============================================================================
  // Policy Testing & Simulation Routes
  // ============================================================================

  /**
   * POST /simulate
   * Simulate a policy evaluation without affecting audit logs
   */
  fastify.post(
    "/simulate",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Simulate a policy evaluation",
        body: {
          type: "object",
          required: ["user", "resource", "action"],
          properties: {
            user: {
              type: "object",
              properties: {
                id: { type: "integer" },
                role: { type: "string" },
                department: { type: "string" },
              },
            },
            resource: {
              type: "object",
              properties: {
                type: { type: "string" },
                id: { type: "string" },
                ownerId: { type: "integer" },
                department: { type: "string" },
              },
            },
            action: { type: "string" },
            environment: { type: "object" },
          },
        },
      },
    },
    simulatePolicy
  );

  /**
   * GET /policies/:policyId/test-cases
   * Get test cases for a policy
   */
  fastify.get(
    "/policies/:policyId/test-cases",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Get test cases for a policy",
        params: {
          type: "object",
          properties: {
            policyId: { type: "string" },
          },
          required: ["policyId"],
        },
      },
    },
    getTestCases
  );

  /**
   * POST /policies/:policyId/test-cases
   * Create a test case for a policy
   */
  fastify.post(
    "/policies/:policyId/test-cases",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Create a test case for a policy",
        params: {
          type: "object",
          properties: {
            policyId: { type: "string" },
          },
          required: ["policyId"],
        },
        body: {
          type: "object",
          required: ["name", "userAttributes", "resourceAttributes", "expectedDecision"],
          properties: {
            name: { type: "string" },
            description: { type: "string" },
            userAttributes: { type: "object" },
            resourceAttributes: { type: "object" },
            environmentAttributes: { type: "object" },
            expectedDecision: { type: "string", enum: ["allow", "deny"] },
          },
        },
      },
    },
    createTestCase
  );

  /**
   * POST /policies/:policyId/test-cases/:testCaseId/run
   * Run a test case
   */
  fastify.post(
    "/policies/:policyId/test-cases/:testCaseId/run",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Run a test case",
        params: {
          type: "object",
          properties: {
            policyId: { type: "string" },
            testCaseId: { type: "string" },
          },
          required: ["policyId", "testCaseId"],
        },
      },
    },
    runTestCase
  );

  // ============================================================================
  // Access Logs Routes
  // ============================================================================

  /**
   * GET /logs
   * Get access decision logs with filtering
   */
  fastify.get(
    "/logs",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Get access decision logs",
        querystring: {
          type: "object",
          properties: {
            userId: { type: "string" },
            resourceType: { type: "string" },
            decision: { type: "string", enum: ["allow", "deny"] },
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
            limit: { type: "integer", minimum: 1, maximum: 1000 },
          },
        },
      },
    },
    getAccessLogs
  );

  /**
   * GET /stats
   * Get access decision statistics
   */
  fastify.get(
    "/stats",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Get access decision statistics",
        querystring: {
          type: "object",
          properties: {
            startDate: { type: "string", format: "date-time" },
            endDate: { type: "string", format: "date-time" },
          },
        },
      },
    },
    getAccessStats
  );

  // ============================================================================
  // Configuration Routes
  // ============================================================================

  /**
   * POST /cache/clear
   * Clear the ABAC cache
   */
  fastify.post(
    "/cache/clear",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Clear the ABAC policy cache",
      },
    },
    clearCache
  );

  /**
   * GET /conflict-resolution-strategies
   * Get available conflict resolution strategies
   */
  fastify.get(
    "/conflict-resolution-strategies",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
      schema: {
        tags: ["ABAC"],
        summary: "Get available conflict resolution strategies",
      },
    },
    getConflictResolutionStrategies
  );
}

export default abacRoutes;
