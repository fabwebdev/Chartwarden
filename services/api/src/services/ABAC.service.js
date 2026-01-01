import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index.js";
import {
  abacPolicies,
  abacAttributes,
  abacAccessLogs,
  abacPolicyTestCases,
} from "../db/schemas/abacPolicy.schema.js";
import { logger } from "../utils/logger.js";

/**
 * ABAC (Attribute-Based Access Control) Service
 *
 * A comprehensive authorization service that evaluates access decisions
 * based on user attributes, resource attributes, and environmental context.
 *
 * Key features:
 * - Dynamic policy evaluation with configurable rules
 * - Multiple conflict resolution strategies
 * - In-memory caching for performance
 * - Full audit logging for compliance
 * - Policy testing/simulation capabilities
 */

// Cache configuration
const CACHE_TTL_MS = 60000; // 1 minute cache TTL
const policyCache = new Map();
const attributeCache = new Map();
let policyCacheTimestamp = 0;
let attributeCacheTimestamp = 0;

// Conflict resolution strategies
export const CONFLICT_RESOLUTION = {
  DENY_OVERRIDE: "deny-override", // Any deny = deny (most restrictive)
  PERMIT_OVERRIDE: "permit-override", // Any permit = permit (most permissive)
  FIRST_APPLICABLE: "first-applicable", // First matching policy wins
  HIGHEST_PRIORITY: "highest-priority", // Highest priority policy wins
};

// Default operators for condition evaluation
const OPERATORS = {
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b,
  gt: (a, b) => a > b,
  gte: (a, b) => a >= b,
  lt: (a, b) => a < b,
  lte: (a, b) => a <= b,
  in: (a, b) => Array.isArray(b) && b.includes(a),
  notIn: (a, b) => Array.isArray(b) && !b.includes(a),
  contains: (a, b) => String(a).includes(String(b)),
  startsWith: (a, b) => String(a).startsWith(String(b)),
  endsWith: (a, b) => String(a).endsWith(String(b)),
  regex: (a, b) => new RegExp(b).test(String(a)),
  exists: (a) => a !== null && a !== undefined,
  notExists: (a) => a === null || a === undefined,
  between: (a, [min, max]) => a >= min && a <= max,
  arrayContains: (a, b) => Array.isArray(a) && a.includes(b),
  arrayContainsAny: (a, b) => Array.isArray(a) && Array.isArray(b) && b.some((v) => a.includes(v)),
  arrayContainsAll: (a, b) => Array.isArray(a) && Array.isArray(b) && b.every((v) => a.includes(v)),
};

// Built-in environment attribute providers
const ENVIRONMENT_PROVIDERS = {
  currentHour: () => new Date().getHours(),
  currentMinute: () => new Date().getMinutes(),
  currentDayOfWeek: () => new Date().getDay(), // 0 = Sunday
  currentDate: () => new Date().toISOString().split("T")[0],
  currentTime: () => new Date().toISOString(),
  isWeekend: () => [0, 6].includes(new Date().getDay()),
  isBusinessHours: () => {
    const hour = new Date().getHours();
    const day = new Date().getDay();
    return day >= 1 && day <= 5 && hour >= 9 && hour < 17;
  },
};

/**
 * Get value from nested object path
 * @param {Object} obj - Object to get value from
 * @param {string} path - Dot-notation path (e.g., 'user.department')
 * @returns {*} The value at the path or undefined
 */
function getValueByPath(obj, path) {
  if (!path || !obj) return undefined;

  const parts = path.split(".");
  let current = obj;

  for (const part of parts) {
    if (current === null || current === undefined) return undefined;
    current = current[part];
  }

  return current;
}

/**
 * Load policies from database with caching
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} Array of active policies
 */
async function loadPolicies(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && policyCache.size > 0 && now - policyCacheTimestamp < CACHE_TTL_MS) {
    return Array.from(policyCache.values());
  }

  try {
    const policies = await db
      .select()
      .from(abacPolicies)
      .where(eq(abacPolicies.isActive, true))
      .orderBy(desc(abacPolicies.priority));

    policyCache.clear();
    for (const policy of policies) {
      policyCache.set(policy.id, policy);
    }
    policyCacheTimestamp = now;

    return policies;
  } catch (error) {
    logger.error("Failed to load ABAC policies:", error);
    // Return cached policies if available, empty array otherwise
    return Array.from(policyCache.values());
  }
}

/**
 * Load attribute definitions from database with caching
 * @param {boolean} forceRefresh - Force cache refresh
 * @returns {Promise<Array>} Array of active attribute definitions
 */
async function loadAttributes(forceRefresh = false) {
  const now = Date.now();

  if (!forceRefresh && attributeCache.size > 0 && now - attributeCacheTimestamp < CACHE_TTL_MS) {
    return Array.from(attributeCache.values());
  }

  try {
    const attributes = await db
      .select()
      .from(abacAttributes)
      .where(eq(abacAttributes.isActive, true));

    attributeCache.clear();
    for (const attr of attributes) {
      attributeCache.set(attr.name, attr);
    }
    attributeCacheTimestamp = now;

    return attributes;
  } catch (error) {
    logger.error("Failed to load ABAC attributes:", error);
    return Array.from(attributeCache.values());
  }
}

/**
 * Evaluate a single condition against the context
 * @param {Object} condition - Condition to evaluate
 * @param {Object} context - Full evaluation context
 * @returns {boolean} Whether the condition is satisfied
 */
function evaluateCondition(condition, context) {
  const { attribute, operator, value } = condition;

  if (!attribute || !operator) {
    logger.warn("Invalid condition - missing attribute or operator:", condition);
    return false;
  }

  // Get the attribute value from context
  let attrValue = getValueByPath(context, attribute);

  // Handle special environment providers
  if (attribute.startsWith("environment.") && attrValue === undefined) {
    const envAttr = attribute.replace("environment.", "");
    if (ENVIRONMENT_PROVIDERS[envAttr]) {
      attrValue = ENVIRONMENT_PROVIDERS[envAttr]();
    }
  }

  // Get the operator function
  const operatorFn = OPERATORS[operator];
  if (!operatorFn) {
    logger.warn("Unknown operator:", operator);
    return false;
  }

  try {
    return operatorFn(attrValue, value);
  } catch (error) {
    logger.error("Error evaluating condition:", { condition, error: error.message });
    return false;
  }
}

/**
 * Evaluate a group of conditions with logical operators
 * @param {Object} conditionGroup - Group of conditions with logical operator
 * @param {Object} context - Full evaluation context
 * @returns {boolean} Whether the condition group is satisfied
 */
function evaluateConditionGroup(conditionGroup, context) {
  const { operator = "and", conditions = [] } = conditionGroup;

  if (conditions.length === 0) {
    return true; // Empty conditions = always true
  }

  const results = conditions.map((cond) => {
    // Handle nested groups
    if (cond.conditions) {
      return evaluateConditionGroup(cond, context);
    }
    return evaluateCondition(cond, context);
  });

  switch (operator.toLowerCase()) {
    case "and":
      return results.every((r) => r === true);
    case "or":
      return results.some((r) => r === true);
    case "not":
      return !results[0];
    default:
      return results.every((r) => r === true);
  }
}

/**
 * Evaluate a single policy against the context
 * @param {Object} policy - Policy to evaluate
 * @param {Object} context - Full evaluation context
 * @returns {Object} Evaluation result { matches: boolean, effect: string }
 */
function evaluatePolicy(policy, context) {
  const { resourceType, action, rules, effect } = policy;

  // Check if policy applies to this resource type and action
  if (resourceType !== "*" && resourceType !== context.resource.type) {
    return { matches: false, effect: null };
  }

  if (action !== "*" && action !== context.action) {
    return { matches: false, effect: null };
  }

  // Evaluate the rules
  let rulesObj = rules;
  if (typeof rules === "string") {
    try {
      rulesObj = JSON.parse(rules);
    } catch (e) {
      logger.error("Invalid policy rules JSON:", policy.id);
      return { matches: false, effect: null };
    }
  }

  const conditionsMatch = evaluateConditionGroup(rulesObj, context);

  return {
    matches: conditionsMatch,
    effect: conditionsMatch ? effect : null,
  };
}

/**
 * Resolve conflicts between multiple policy decisions
 * @param {Array} decisions - Array of { policy, matches, effect }
 * @param {string} strategy - Conflict resolution strategy
 * @returns {Object} Final decision { allow: boolean, matchedPolicy: Object }
 */
function resolveConflicts(decisions, strategy = CONFLICT_RESOLUTION.DENY_OVERRIDE) {
  const matchingDecisions = decisions.filter((d) => d.matches);

  if (matchingDecisions.length === 0) {
    return { allow: false, matchedPolicy: null, reason: "no_matching_policy" };
  }

  switch (strategy) {
    case CONFLICT_RESOLUTION.DENY_OVERRIDE:
      // Any deny = deny
      const denyDecision = matchingDecisions.find((d) => d.effect === "deny");
      if (denyDecision) {
        return { allow: false, matchedPolicy: denyDecision.policy, reason: "deny_override" };
      }
      const allowDecision = matchingDecisions.find((d) => d.effect === "allow");
      return {
        allow: !!allowDecision,
        matchedPolicy: allowDecision?.policy || null,
        reason: allowDecision ? "permit" : "no_permit",
      };

    case CONFLICT_RESOLUTION.PERMIT_OVERRIDE:
      // Any permit = permit
      const permitDecision = matchingDecisions.find((d) => d.effect === "allow");
      if (permitDecision) {
        return { allow: true, matchedPolicy: permitDecision.policy, reason: "permit_override" };
      }
      const denyDec = matchingDecisions.find((d) => d.effect === "deny");
      return {
        allow: false,
        matchedPolicy: denyDec?.policy || null,
        reason: "deny",
      };

    case CONFLICT_RESOLUTION.FIRST_APPLICABLE:
      // First matching policy wins (policies are already sorted by priority)
      const firstMatch = matchingDecisions[0];
      return {
        allow: firstMatch.effect === "allow",
        matchedPolicy: firstMatch.policy,
        reason: "first_applicable",
      };

    case CONFLICT_RESOLUTION.HIGHEST_PRIORITY:
      // Highest priority wins (policies are sorted by priority desc)
      const highestPriority = matchingDecisions[0];
      return {
        allow: highestPriority.effect === "allow",
        matchedPolicy: highestPriority.policy,
        reason: "highest_priority",
      };

    default:
      return { allow: false, matchedPolicy: null, reason: "unknown_strategy" };
  }
}

/**
 * Build evaluation context from user, resource, and environment
 * @param {Object} user - User attributes
 * @param {Object} resource - Resource attributes
 * @param {Object} environment - Environment attributes
 * @param {string} action - Action being performed
 * @returns {Object} Full evaluation context
 */
function buildContext(user, resource, environment, action) {
  return {
    user: {
      id: user?.id,
      role: user?.role,
      department: user?.department,
      location: user?.location,
      clearanceLevel: user?.clearanceLevel,
      ...user?.attributes,
      ...user,
    },
    resource: {
      type: resource?.type,
      id: resource?.id,
      ownerId: resource?.ownerId,
      department: resource?.department,
      classification: resource?.classification,
      ...resource?.attributes,
      ...resource,
    },
    environment: {
      ipAddress: environment?.ipAddress,
      userAgent: environment?.userAgent,
      sessionId: environment?.sessionId,
      currentHour: ENVIRONMENT_PROVIDERS.currentHour(),
      currentDayOfWeek: ENVIRONMENT_PROVIDERS.currentDayOfWeek(),
      isBusinessHours: ENVIRONMENT_PROVIDERS.isBusinessHours(),
      isWeekend: ENVIRONMENT_PROVIDERS.isWeekend(),
      ...environment,
    },
    action,
  };
}

/**
 * Log access decision to database
 * @param {Object} params - Log parameters
 */
async function logAccessDecision(params) {
  const {
    userId,
    sessionId,
    ipAddress,
    userAgent,
    resourceType,
    resourceId,
    action,
    decision,
    userAttributes,
    resourceAttributes,
    environmentAttributes,
    evaluatedPolicies,
    matchedPolicy,
    evaluationTimeMs,
    errorMessage,
  } = params;

  try {
    await db.insert(abacAccessLogs).values({
      userId,
      sessionId,
      ipAddress,
      userAgent,
      resourceType,
      resourceId,
      action,
      decision,
      userAttributes,
      resourceAttributes,
      environmentAttributes,
      evaluatedPolicies,
      matchedPolicyId: matchedPolicy?.id,
      matchedPolicyName: matchedPolicy?.name,
      evaluationTimeMs,
      errorMessage,
    });
  } catch (error) {
    logger.error("Failed to log ABAC access decision:", error);
  }
}

// ============================================================================
// ABAC Service Class
// ============================================================================

class ABACService {
  constructor() {
    this.conflictResolution = CONFLICT_RESOLUTION.DENY_OVERRIDE;
    this.enableAuditLog = true;
  }

  /**
   * Set conflict resolution strategy
   * @param {string} strategy - One of CONFLICT_RESOLUTION values
   */
  setConflictResolution(strategy) {
    if (Object.values(CONFLICT_RESOLUTION).includes(strategy)) {
      this.conflictResolution = strategy;
    }
  }

  /**
   * Enable or disable audit logging
   * @param {boolean} enabled
   */
  setAuditLogging(enabled) {
    this.enableAuditLog = enabled;
  }

  /**
   * Clear all caches (useful after policy updates)
   */
  clearCache() {
    policyCache.clear();
    attributeCache.clear();
    policyCacheTimestamp = 0;
    attributeCacheTimestamp = 0;
  }

  /**
   * Main authorization decision method
   * @param {Object} user - User making the request
   * @param {Object} resource - Resource being accessed
   * @param {string} action - Action being performed (read, write, delete, etc.)
   * @param {Object} environment - Environmental context (IP, time, etc.)
   * @returns {Promise<Object>} Authorization decision
   */
  async authorize(user, resource, action, environment = {}) {
    const startTime = Date.now();
    let decision = "deny";
    let matchedPolicy = null;
    let evaluatedPolicies = [];
    let errorMessage = null;

    try {
      // Build full context
      const context = buildContext(user, resource, environment, action);

      // Load policies
      const policies = await loadPolicies();

      // Evaluate all applicable policies
      const decisions = [];
      for (const policy of policies) {
        const result = evaluatePolicy(policy, context);
        decisions.push({
          policy,
          matches: result.matches,
          effect: result.effect,
        });

        if (result.matches) {
          evaluatedPolicies.push({
            id: policy.id,
            name: policy.name,
            effect: result.effect,
            priority: policy.priority,
          });
        }
      }

      // Resolve conflicts
      const resolution = resolveConflicts(decisions, this.conflictResolution);
      decision = resolution.allow ? "allow" : "deny";
      matchedPolicy = resolution.matchedPolicy;

      const evaluationTimeMs = Date.now() - startTime;

      // Log the decision
      if (this.enableAuditLog) {
        await logAccessDecision({
          userId: user?.id,
          sessionId: environment?.sessionId,
          ipAddress: environment?.ipAddress,
          userAgent: environment?.userAgent,
          resourceType: resource?.type,
          resourceId: resource?.id?.toString(),
          action,
          decision,
          userAttributes: context.user,
          resourceAttributes: context.resource,
          environmentAttributes: context.environment,
          evaluatedPolicies,
          matchedPolicy,
          evaluationTimeMs,
        });
      }

      return {
        allow: decision === "allow",
        decision,
        matchedPolicy: matchedPolicy
          ? { id: matchedPolicy.id, name: matchedPolicy.name }
          : null,
        evaluatedPolicies,
        evaluationTimeMs,
        reason: resolution.reason,
      };
    } catch (error) {
      errorMessage = error.message;
      logger.error("ABAC authorization error:", error);

      // Log error
      if (this.enableAuditLog) {
        await logAccessDecision({
          userId: user?.id,
          resourceType: resource?.type,
          resourceId: resource?.id?.toString(),
          action,
          decision: "deny",
          errorMessage,
          evaluationTimeMs: Date.now() - startTime,
        });
      }

      // Fail closed - deny on error
      return {
        allow: false,
        decision: "deny",
        error: errorMessage,
        reason: "evaluation_error",
      };
    }
  }

  /**
   * Check if user can perform action on resource (simple boolean response)
   * @param {Object} user - User making the request
   * @param {Object} resource - Resource being accessed
   * @param {string} action - Action being performed
   * @param {Object} environment - Environmental context
   * @returns {Promise<boolean>}
   */
  async can(user, resource, action, environment = {}) {
    const result = await this.authorize(user, resource, action, environment);
    return result.allow;
  }

  // ===========================================================================
  // Policy Management
  // ===========================================================================

  /**
   * Create a new ABAC policy
   * @param {Object} policyData - Policy data
   * @returns {Promise<Object>} Created policy
   */
  async createPolicy(policyData) {
    const { name, description, resourceType, action, rules, effect, priority, createdBy } = policyData;

    const [policy] = await db
      .insert(abacPolicies)
      .values({
        name,
        description,
        resourceType,
        action,
        rules: typeof rules === "string" ? rules : JSON.stringify(rules),
        effect: effect || "allow",
        priority: priority || 0,
        createdBy,
        isActive: true,
      })
      .returning();

    this.clearCache();
    return policy;
  }

  /**
   * Update an existing policy
   * @param {number} policyId - Policy ID
   * @param {Object} updates - Fields to update
   * @returns {Promise<Object>} Updated policy
   */
  async updatePolicy(policyId, updates) {
    const { rules, ...rest } = updates;

    const updateData = { ...rest, updatedAt: new Date() };
    if (rules !== undefined) {
      updateData.rules = typeof rules === "string" ? rules : JSON.stringify(rules);
    }

    const [policy] = await db
      .update(abacPolicies)
      .set(updateData)
      .where(eq(abacPolicies.id, policyId))
      .returning();

    this.clearCache();
    return policy;
  }

  /**
   * Delete a policy (soft delete by deactivating)
   * @param {number} policyId - Policy ID
   * @returns {Promise<Object>} Deactivated policy
   */
  async deletePolicy(policyId) {
    const [policy] = await db
      .update(abacPolicies)
      .set({ isActive: false, updatedAt: new Date() })
      .where(eq(abacPolicies.id, policyId))
      .returning();

    this.clearCache();
    return policy;
  }

  /**
   * Get all policies
   * @param {boolean} includeInactive - Include inactive policies
   * @returns {Promise<Array>} Array of policies
   */
  async getPolicies(includeInactive = false) {
    let query = db.select().from(abacPolicies);

    if (!includeInactive) {
      query = query.where(eq(abacPolicies.isActive, true));
    }

    return query.orderBy(desc(abacPolicies.priority));
  }

  /**
   * Get a single policy by ID
   * @param {number} policyId - Policy ID
   * @returns {Promise<Object>} Policy
   */
  async getPolicy(policyId) {
    const [policy] = await db
      .select()
      .from(abacPolicies)
      .where(eq(abacPolicies.id, policyId));

    return policy;
  }

  // ===========================================================================
  // Attribute Management
  // ===========================================================================

  /**
   * Create a new attribute definition
   * @param {Object} attrData - Attribute data
   * @returns {Promise<Object>} Created attribute
   */
  async createAttribute(attrData) {
    const [attr] = await db.insert(abacAttributes).values(attrData).returning();
    this.clearCache();
    return attr;
  }

  /**
   * Get all attribute definitions
   * @returns {Promise<Array>} Array of attributes
   */
  async getAttributes() {
    return loadAttributes(true);
  }

  // ===========================================================================
  // Policy Testing & Simulation
  // ===========================================================================

  /**
   * Simulate a policy evaluation without logging
   * @param {Object} testCase - Test case with user, resource, environment, action
   * @returns {Promise<Object>} Simulation result
   */
  async simulate(testCase) {
    const { user, resource, action, environment } = testCase;

    // Temporarily disable logging
    const wasLogging = this.enableAuditLog;
    this.enableAuditLog = false;

    try {
      const result = await this.authorize(user, resource, action, environment);
      return {
        ...result,
        testCase,
        simulatedAt: new Date().toISOString(),
      };
    } finally {
      this.enableAuditLog = wasLogging;
    }
  }

  /**
   * Run a test case against a specific policy
   * @param {number} policyId - Policy ID
   * @param {Object} testCase - Test case data
   * @returns {Promise<Object>} Test result
   */
  async runPolicyTest(policyId, testCase) {
    const policy = await this.getPolicy(policyId);
    if (!policy) {
      throw new Error("Policy not found");
    }

    const context = buildContext(
      testCase.userAttributes,
      testCase.resourceAttributes,
      testCase.environmentAttributes,
      testCase.action || "read"
    );

    const result = evaluatePolicy(policy, context);
    const actualDecision = result.matches ? result.effect : "deny";
    const pass = actualDecision === testCase.expectedDecision;

    // Update test case result
    await db
      .update(abacPolicyTestCases)
      .set({
        lastTestResult: pass ? "pass" : "fail",
        lastTestedAt: new Date(),
      })
      .where(eq(abacPolicyTestCases.id, testCase.id));

    return {
      pass,
      expected: testCase.expectedDecision,
      actual: actualDecision,
      policyMatched: result.matches,
      policyEffect: result.effect,
    };
  }

  /**
   * Create a test case for a policy
   * @param {Object} testCaseData - Test case data
   * @returns {Promise<Object>} Created test case
   */
  async createTestCase(testCaseData) {
    const [testCase] = await db
      .insert(abacPolicyTestCases)
      .values(testCaseData)
      .returning();
    return testCase;
  }

  /**
   * Get test cases for a policy
   * @param {number} policyId - Policy ID
   * @returns {Promise<Array>} Array of test cases
   */
  async getTestCases(policyId) {
    return db
      .select()
      .from(abacPolicyTestCases)
      .where(eq(abacPolicyTestCases.policyId, policyId));
  }

  // ===========================================================================
  // Access Logs
  // ===========================================================================

  /**
   * Get access logs with filtering
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Array of access logs
   */
  async getAccessLogs(filters = {}) {
    const { userId, resourceType, decision, startDate, endDate, limit = 100 } = filters;

    let query = db.select().from(abacAccessLogs);

    const conditions = [];
    if (userId) conditions.push(eq(abacAccessLogs.userId, userId));
    if (resourceType) conditions.push(eq(abacAccessLogs.resourceType, resourceType));
    if (decision) conditions.push(eq(abacAccessLogs.decision, decision));
    if (startDate) conditions.push(sql`${abacAccessLogs.createdAt} >= ${startDate}`);
    if (endDate) conditions.push(sql`${abacAccessLogs.createdAt} <= ${endDate}`);

    if (conditions.length > 0) {
      query = query.where(and(...conditions));
    }

    return query.orderBy(desc(abacAccessLogs.createdAt)).limit(limit);
  }

  /**
   * Get access decision statistics
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} Statistics
   */
  async getAccessStats(filters = {}) {
    const { startDate, endDate } = filters;

    const conditions = [];
    if (startDate) conditions.push(sql`${abacAccessLogs.createdAt} >= ${startDate}`);
    if (endDate) conditions.push(sql`${abacAccessLogs.createdAt} <= ${endDate}`);

    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    const stats = await db
      .select({
        decision: abacAccessLogs.decision,
        count: sql`count(*)`.as("count"),
        avgEvaluationTime: sql`avg(${abacAccessLogs.evaluationTimeMs})`.as("avg_time"),
      })
      .from(abacAccessLogs)
      .where(whereClause)
      .groupBy(abacAccessLogs.decision);

    return stats;
  }
}

// Export singleton instance
export const abacService = new ABACService();

// Export class for testing
export { ABACService };

// Note: CONFLICT_RESOLUTION is already exported at declaration with 'export const'

export default abacService;
