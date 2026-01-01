import { abacService, CONFLICT_RESOLUTION } from "../services/ABAC.service.js";
import { logger } from "../utils/logger.js";

/**
 * ABAC Controller
 * Provides administrative endpoints for managing ABAC policies, attributes, and access logs
 */

// ============================================================================
// Policy Management
// ============================================================================

/**
 * Get all ABAC policies
 */
export async function getPolicies(request, reply) {
  try {
    const includeInactive = request.query.includeInactive === "true";
    const policies = await abacService.getPolicies(includeInactive);

    return reply.send({
      success: true,
      data: policies,
      meta: {
        total: policies.length,
        includeInactive,
      },
    });
  } catch (error) {
    logger.error("Error fetching ABAC policies:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch policies",
      },
    });
  }
}

/**
 * Get a single ABAC policy by ID
 */
export async function getPolicy(request, reply) {
  try {
    const { id } = request.params;
    const policy = await abacService.getPolicy(parseInt(id));

    if (!policy) {
      return reply.code(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Policy not found",
        },
      });
    }

    return reply.send({
      success: true,
      data: policy,
    });
  } catch (error) {
    logger.error("Error fetching ABAC policy:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch policy",
      },
    });
  }
}

/**
 * Create a new ABAC policy
 */
export async function createPolicy(request, reply) {
  try {
    const { name, description, resourceType, action, rules, effect, priority } = request.body;

    // Validate required fields
    if (!name || !resourceType || !action || !rules) {
      return reply.code(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields: name, resourceType, action, rules",
        },
      });
    }

    // Validate effect
    if (effect && !["allow", "deny"].includes(effect)) {
      return reply.code(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Effect must be 'allow' or 'deny'",
        },
      });
    }

    const policy = await abacService.createPolicy({
      name,
      description,
      resourceType,
      action,
      rules,
      effect: effect || "allow",
      priority: priority || 0,
      createdBy: request.user?.id,
    });

    return reply.code(201).send({
      success: true,
      data: policy,
      message: "Policy created successfully",
    });
  } catch (error) {
    logger.error("Error creating ABAC policy:", error);

    // Handle unique constraint violation
    if (error.code === "23505") {
      return reply.code(409).send({
        success: false,
        error: {
          code: "CONFLICT",
          message: "A policy with this name already exists",
        },
      });
    }

    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create policy",
      },
    });
  }
}

/**
 * Update an existing ABAC policy
 */
export async function updatePolicy(request, reply) {
  try {
    const { id } = request.params;
    const updates = request.body;

    // Validate effect if provided
    if (updates.effect && !["allow", "deny"].includes(updates.effect)) {
      return reply.code(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Effect must be 'allow' or 'deny'",
        },
      });
    }

    const policy = await abacService.updatePolicy(parseInt(id), {
      ...updates,
      updatedBy: request.user?.id,
    });

    if (!policy) {
      return reply.code(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Policy not found",
        },
      });
    }

    return reply.send({
      success: true,
      data: policy,
      message: "Policy updated successfully",
    });
  } catch (error) {
    logger.error("Error updating ABAC policy:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to update policy",
      },
    });
  }
}

/**
 * Delete (deactivate) an ABAC policy
 */
export async function deletePolicy(request, reply) {
  try {
    const { id } = request.params;
    const policy = await abacService.deletePolicy(parseInt(id));

    if (!policy) {
      return reply.code(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Policy not found",
        },
      });
    }

    return reply.send({
      success: true,
      message: "Policy deactivated successfully",
    });
  } catch (error) {
    logger.error("Error deleting ABAC policy:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to delete policy",
      },
    });
  }
}

// ============================================================================
// Attribute Management
// ============================================================================

/**
 * Get all attribute definitions
 */
export async function getAttributes(request, reply) {
  try {
    const attributes = await abacService.getAttributes();

    return reply.send({
      success: true,
      data: attributes,
      meta: {
        total: attributes.length,
      },
    });
  } catch (error) {
    logger.error("Error fetching ABAC attributes:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch attributes",
      },
    });
  }
}

/**
 * Create a new attribute definition
 */
export async function createAttribute(request, reply) {
  try {
    const { name, category, dataType, description, provider, providerConfig, possibleValues } = request.body;

    // Validate required fields
    if (!name || !category || !dataType) {
      return reply.code(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields: name, category, dataType",
        },
      });
    }

    // Validate category
    if (!["user", "resource", "environment"].includes(category)) {
      return reply.code(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Category must be 'user', 'resource', or 'environment'",
        },
      });
    }

    const attribute = await abacService.createAttribute({
      name,
      category,
      dataType,
      description,
      provider,
      providerConfig,
      possibleValues,
    });

    return reply.code(201).send({
      success: true,
      data: attribute,
      message: "Attribute created successfully",
    });
  } catch (error) {
    logger.error("Error creating ABAC attribute:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create attribute",
      },
    });
  }
}

// ============================================================================
// Policy Testing & Simulation
// ============================================================================

/**
 * Simulate a policy evaluation
 */
export async function simulatePolicy(request, reply) {
  try {
    const { user, resource, action, environment } = request.body;

    if (!user || !resource || !action) {
      return reply.code(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields: user, resource, action",
        },
      });
    }

    const result = await abacService.simulate({
      user,
      resource,
      action,
      environment: environment || {},
    });

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Error simulating ABAC policy:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to simulate policy",
      },
    });
  }
}

/**
 * Get test cases for a policy
 */
export async function getTestCases(request, reply) {
  try {
    const { policyId } = request.params;
    const testCases = await abacService.getTestCases(parseInt(policyId));

    return reply.send({
      success: true,
      data: testCases,
    });
  } catch (error) {
    logger.error("Error fetching test cases:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch test cases",
      },
    });
  }
}

/**
 * Create a test case for a policy
 */
export async function createTestCase(request, reply) {
  try {
    const { policyId } = request.params;
    const { name, description, userAttributes, resourceAttributes, environmentAttributes, expectedDecision } = request.body;

    if (!name || !userAttributes || !resourceAttributes || !expectedDecision) {
      return reply.code(400).send({
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Missing required fields: name, userAttributes, resourceAttributes, expectedDecision",
        },
      });
    }

    const testCase = await abacService.createTestCase({
      policyId: parseInt(policyId),
      name,
      description,
      userAttributes,
      resourceAttributes,
      environmentAttributes: environmentAttributes || {},
      expectedDecision,
    });

    return reply.code(201).send({
      success: true,
      data: testCase,
    });
  } catch (error) {
    logger.error("Error creating test case:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to create test case",
      },
    });
  }
}

/**
 * Run a test case
 */
export async function runTestCase(request, reply) {
  try {
    const { policyId, testCaseId } = request.params;

    const testCases = await abacService.getTestCases(parseInt(policyId));
    const testCase = testCases.find((tc) => tc.id === parseInt(testCaseId));

    if (!testCase) {
      return reply.code(404).send({
        success: false,
        error: {
          code: "NOT_FOUND",
          message: "Test case not found",
        },
      });
    }

    const result = await abacService.runPolicyTest(parseInt(policyId), testCase);

    return reply.send({
      success: true,
      data: result,
    });
  } catch (error) {
    logger.error("Error running test case:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to run test case",
      },
    });
  }
}

// ============================================================================
// Access Logs
// ============================================================================

/**
 * Get access logs with filtering
 */
export async function getAccessLogs(request, reply) {
  try {
    const { userId, resourceType, decision, startDate, endDate, limit } = request.query;

    const logs = await abacService.getAccessLogs({
      userId: userId ? parseInt(userId) : undefined,
      resourceType,
      decision,
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
      limit: limit ? parseInt(limit) : 100,
    });

    return reply.send({
      success: true,
      data: logs,
      meta: {
        total: logs.length,
      },
    });
  } catch (error) {
    logger.error("Error fetching access logs:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch access logs",
      },
    });
  }
}

/**
 * Get access decision statistics
 */
export async function getAccessStats(request, reply) {
  try {
    const { startDate, endDate } = request.query;

    const stats = await abacService.getAccessStats({
      startDate: startDate ? new Date(startDate) : undefined,
      endDate: endDate ? new Date(endDate) : undefined,
    });

    return reply.send({
      success: true,
      data: stats,
    });
  } catch (error) {
    logger.error("Error fetching access stats:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to fetch access stats",
      },
    });
  }
}

// ============================================================================
// Cache Management
// ============================================================================

/**
 * Clear the ABAC cache
 */
export async function clearCache(request, reply) {
  try {
    abacService.clearCache();

    return reply.send({
      success: true,
      message: "Cache cleared successfully",
    });
  } catch (error) {
    logger.error("Error clearing cache:", error);
    return reply.code(500).send({
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to clear cache",
      },
    });
  }
}

/**
 * Get available conflict resolution strategies
 */
export async function getConflictResolutionStrategies(request, reply) {
  return reply.send({
    success: true,
    data: Object.entries(CONFLICT_RESOLUTION).map(([key, value]) => ({
      key,
      value,
      description: getStrategyDescription(value),
    })),
  });
}

function getStrategyDescription(strategy) {
  switch (strategy) {
    case CONFLICT_RESOLUTION.DENY_OVERRIDE:
      return "Any deny decision takes precedence over allow (most restrictive)";
    case CONFLICT_RESOLUTION.PERMIT_OVERRIDE:
      return "Any permit decision takes precedence over deny (most permissive)";
    case CONFLICT_RESOLUTION.FIRST_APPLICABLE:
      return "First matching policy wins (order-dependent)";
    case CONFLICT_RESOLUTION.HIGHEST_PRIORITY:
      return "Highest priority policy wins (priority-based)";
    default:
      return "Unknown strategy";
  }
}

export default {
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
};
