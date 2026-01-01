import {
  pgTable,
  serial,
  varchar,
  text,
  boolean,
  timestamp,
  jsonb,
  integer,
  index,
} from "drizzle-orm/pg-core";

/**
 * ABAC Policy Schema
 * Stores attribute-based access control policies that can be dynamically evaluated
 */
export const abacPolicies = pgTable(
  "abac_policies",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 255 }).notNull().unique(),
    description: text("description"),

    // Policy targeting
    resourceType: varchar("resource_type", { length: 100 }).notNull(), // e.g., 'patient_record', 'medication', 'encounter'
    action: varchar("action", { length: 50 }).notNull(), // e.g., 'read', 'write', 'delete', 'manage'

    // Policy rules stored as JSON
    // Format: { conditions: [...], effect: 'allow' | 'deny' }
    rules: jsonb("rules").notNull(),

    // Policy effect when conditions are met
    effect: varchar("effect", { length: 10 }).notNull().default("allow"), // 'allow' or 'deny'

    // Priority for conflict resolution (higher = evaluated first)
    priority: integer("priority").notNull().default(0),

    // Policy status
    isActive: boolean("is_active").notNull().default(true),

    // Metadata
    createdBy: integer("created_by"),
    updatedBy: integer("updated_by"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    resourceTypeIdx: index("abac_policies_resource_type_idx").on(table.resourceType),
    actionIdx: index("abac_policies_action_idx").on(table.action),
    isActiveIdx: index("abac_policies_is_active_idx").on(table.isActive),
    priorityIdx: index("abac_policies_priority_idx").on(table.priority),
  })
);

/**
 * ABAC Attribute Definitions Schema
 * Defines the available attributes that can be used in policies
 */
export const abacAttributes = pgTable(
  "abac_attributes",
  {
    id: serial("id").primaryKey(),
    name: varchar("name", { length: 100 }).notNull().unique(),
    category: varchar("category", { length: 50 }).notNull(), // 'user', 'resource', 'environment'
    dataType: varchar("data_type", { length: 50 }).notNull(), // 'string', 'number', 'boolean', 'array', 'date'
    description: text("description"),

    // Provider information for dynamic attribute resolution
    provider: varchar("provider", { length: 100 }), // e.g., 'database', 'request', 'session'
    providerConfig: jsonb("provider_config"), // Configuration for the provider

    // Possible values (for enumerated attributes)
    possibleValues: jsonb("possible_values"),

    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    categoryIdx: index("abac_attributes_category_idx").on(table.category),
    isActiveIdx: index("abac_attributes_is_active_idx").on(table.isActive),
  })
);

/**
 * ABAC Access Decision Log Schema
 * Audit trail for all access decisions made by the ABAC system
 */
export const abacAccessLogs = pgTable(
  "abac_access_logs",
  {
    id: serial("id").primaryKey(),

    // Request context
    userId: integer("user_id"),
    sessionId: varchar("session_id", { length: 255 }),
    ipAddress: varchar("ip_address", { length: 45 }),
    userAgent: text("user_agent"),

    // Resource being accessed
    resourceType: varchar("resource_type", { length: 100 }).notNull(),
    resourceId: varchar("resource_id", { length: 255 }),
    action: varchar("action", { length: 50 }).notNull(),

    // Decision outcome
    decision: varchar("decision", { length: 10 }).notNull(), // 'allow', 'deny'

    // Full context used for evaluation (for debugging/compliance)
    userAttributes: jsonb("user_attributes"),
    resourceAttributes: jsonb("resource_attributes"),
    environmentAttributes: jsonb("environment_attributes"),

    // Policies that were evaluated
    evaluatedPolicies: jsonb("evaluated_policies"),
    matchedPolicyId: integer("matched_policy_id"),
    matchedPolicyName: varchar("matched_policy_name", { length: 255 }),

    // Performance metrics
    evaluationTimeMs: integer("evaluation_time_ms"),

    // Error information if any
    errorMessage: text("error_message"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("abac_access_logs_user_id_idx").on(table.userId),
    resourceTypeIdx: index("abac_access_logs_resource_type_idx").on(table.resourceType),
    decisionIdx: index("abac_access_logs_decision_idx").on(table.decision),
    createdAtIdx: index("abac_access_logs_created_at_idx").on(table.createdAt),
  })
);

/**
 * ABAC Policy Test Cases Schema
 * Stores test cases for policy simulation/validation
 */
export const abacPolicyTestCases = pgTable(
  "abac_policy_test_cases",
  {
    id: serial("id").primaryKey(),
    policyId: integer("policy_id").notNull(),
    name: varchar("name", { length: 255 }).notNull(),
    description: text("description"),

    // Test input
    userAttributes: jsonb("user_attributes").notNull(),
    resourceAttributes: jsonb("resource_attributes").notNull(),
    environmentAttributes: jsonb("environment_attributes"),

    // Expected outcome
    expectedDecision: varchar("expected_decision", { length: 10 }).notNull(), // 'allow', 'deny'

    // Last test result
    lastTestResult: varchar("last_test_result", { length: 10 }), // 'pass', 'fail'
    lastTestedAt: timestamp("last_tested_at"),

    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    policyIdIdx: index("abac_policy_test_cases_policy_id_idx").on(table.policyId),
  })
);

export default {
  abacPolicies,
  abacAttributes,
  abacAccessLogs,
  abacPolicyTestCases,
};
