-- ABAC System Tables Migration
-- Comprehensive Attribute-Based Access Control implementation

-- ABAC Policies Table
-- Stores access control policies that can be dynamically evaluated
CREATE TABLE IF NOT EXISTS "abac_policies" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(255) NOT NULL UNIQUE,
  "description" TEXT,
  "resource_type" VARCHAR(100) NOT NULL,
  "action" VARCHAR(50) NOT NULL,
  "rules" JSONB NOT NULL,
  "effect" VARCHAR(10) NOT NULL DEFAULT 'allow',
  "priority" INTEGER NOT NULL DEFAULT 0,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_by" INTEGER,
  "updated_by" INTEGER,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for policies table
CREATE INDEX IF NOT EXISTS "abac_policies_resource_type_idx" ON "abac_policies" ("resource_type");
CREATE INDEX IF NOT EXISTS "abac_policies_action_idx" ON "abac_policies" ("action");
CREATE INDEX IF NOT EXISTS "abac_policies_is_active_idx" ON "abac_policies" ("is_active");
CREATE INDEX IF NOT EXISTS "abac_policies_priority_idx" ON "abac_policies" ("priority");

-- ABAC Attributes Table
-- Defines available attributes for policy evaluation
CREATE TABLE IF NOT EXISTS "abac_attributes" (
  "id" SERIAL PRIMARY KEY,
  "name" VARCHAR(100) NOT NULL UNIQUE,
  "category" VARCHAR(50) NOT NULL,
  "data_type" VARCHAR(50) NOT NULL,
  "description" TEXT,
  "provider" VARCHAR(100),
  "provider_config" JSONB,
  "possible_values" JSONB,
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for attributes table
CREATE INDEX IF NOT EXISTS "abac_attributes_category_idx" ON "abac_attributes" ("category");
CREATE INDEX IF NOT EXISTS "abac_attributes_is_active_idx" ON "abac_attributes" ("is_active");

-- ABAC Access Logs Table
-- Audit trail for all access decisions
CREATE TABLE IF NOT EXISTS "abac_access_logs" (
  "id" SERIAL PRIMARY KEY,
  "user_id" INTEGER,
  "session_id" VARCHAR(255),
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "resource_type" VARCHAR(100) NOT NULL,
  "resource_id" VARCHAR(255),
  "action" VARCHAR(50) NOT NULL,
  "decision" VARCHAR(10) NOT NULL,
  "user_attributes" JSONB,
  "resource_attributes" JSONB,
  "environment_attributes" JSONB,
  "evaluated_policies" JSONB,
  "matched_policy_id" INTEGER,
  "matched_policy_name" VARCHAR(255),
  "evaluation_time_ms" INTEGER,
  "error_message" TEXT,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Indexes for access logs table
CREATE INDEX IF NOT EXISTS "abac_access_logs_user_id_idx" ON "abac_access_logs" ("user_id");
CREATE INDEX IF NOT EXISTS "abac_access_logs_resource_type_idx" ON "abac_access_logs" ("resource_type");
CREATE INDEX IF NOT EXISTS "abac_access_logs_decision_idx" ON "abac_access_logs" ("decision");
CREATE INDEX IF NOT EXISTS "abac_access_logs_created_at_idx" ON "abac_access_logs" ("created_at");

-- ABAC Policy Test Cases Table
-- Test cases for policy simulation/validation
CREATE TABLE IF NOT EXISTS "abac_policy_test_cases" (
  "id" SERIAL PRIMARY KEY,
  "policy_id" INTEGER NOT NULL,
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "user_attributes" JSONB NOT NULL,
  "resource_attributes" JSONB NOT NULL,
  "environment_attributes" JSONB,
  "expected_decision" VARCHAR(10) NOT NULL,
  "last_test_result" VARCHAR(10),
  "last_tested_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Index for test cases table
CREATE INDEX IF NOT EXISTS "abac_policy_test_cases_policy_id_idx" ON "abac_policy_test_cases" ("policy_id");

-- Insert default ABAC policies
INSERT INTO "abac_policies" ("name", "description", "resource_type", "action", "rules", "effect", "priority") VALUES
  (
    'admin_full_access',
    'Administrators have full access to all resources',
    '*',
    '*',
    '{"operator": "and", "conditions": [{"attribute": "user.role", "operator": "eq", "value": "admin"}]}',
    'allow',
    1000
  ),
  (
    'doctor_patient_read',
    'Doctors can read patient records',
    'patient_record',
    'read',
    '{"operator": "and", "conditions": [{"attribute": "user.role", "operator": "in", "value": ["doctor", "physician"]}]}',
    'allow',
    100
  ),
  (
    'nurse_patient_read',
    'Nurses can read patient records in their department',
    'patient_record',
    'read',
    '{"operator": "and", "conditions": [{"attribute": "user.role", "operator": "eq", "value": "nurse"}, {"attribute": "user.department", "operator": "eq", "value": "resource.department"}]}',
    'allow',
    90
  ),
  (
    'patient_own_record',
    'Patients can only access their own records',
    'patient_record',
    'read',
    '{"operator": "and", "conditions": [{"attribute": "user.role", "operator": "eq", "value": "patient"}, {"attribute": "user.id", "operator": "eq", "value": "resource.ownerId"}]}',
    'allow',
    80
  ),
  (
    'business_hours_medication',
    'Medication orders only allowed during business hours',
    'medication',
    'write',
    '{"operator": "and", "conditions": [{"attribute": "user.role", "operator": "in", "value": ["doctor", "nurse", "admin"]}, {"attribute": "environment.isBusinessHours", "operator": "eq", "value": true}]}',
    'allow',
    70
  ),
  (
    'deny_external_network',
    'Deny access from external networks for sensitive resources',
    'financial_record',
    '*',
    '{"operator": "and", "conditions": [{"attribute": "environment.ipAddress", "operator": "notIn", "value": ["192.168.", "10.", "172.16."]}]}',
    'deny',
    500
  )
ON CONFLICT (name) DO NOTHING;

-- Insert default ABAC attribute definitions
INSERT INTO "abac_attributes" ("name", "category", "data_type", "description", "possible_values") VALUES
  ('user.id', 'user', 'number', 'Unique identifier of the user', NULL),
  ('user.role', 'user', 'string', 'Primary role of the user', '["admin", "doctor", "nurse", "staff", "patient"]'),
  ('user.department', 'user', 'string', 'Department the user belongs to', '["cardiology", "oncology", "hospice", "general", "emergency"]'),
  ('user.clearanceLevel', 'user', 'number', 'Security clearance level (1-5)', '[1, 2, 3, 4, 5]'),
  ('user.location', 'user', 'string', 'Physical location of the user', NULL),
  ('resource.type', 'resource', 'string', 'Type of the resource being accessed', '["patient_record", "medication", "encounter", "billing", "financial_record"]'),
  ('resource.id', 'resource', 'string', 'Unique identifier of the resource', NULL),
  ('resource.ownerId', 'resource', 'number', 'ID of the resource owner', NULL),
  ('resource.department', 'resource', 'string', 'Department the resource belongs to', NULL),
  ('resource.classification', 'resource', 'string', 'Security classification of the resource', '["public", "internal", "confidential", "restricted"]'),
  ('environment.ipAddress', 'environment', 'string', 'IP address of the request', NULL),
  ('environment.isBusinessHours', 'environment', 'boolean', 'Whether the request is during business hours', NULL),
  ('environment.isWeekend', 'environment', 'boolean', 'Whether the request is on a weekend', NULL),
  ('environment.currentHour', 'environment', 'number', 'Current hour of the day (0-23)', NULL),
  ('environment.currentDayOfWeek', 'environment', 'number', 'Current day of week (0=Sunday, 6=Saturday)', NULL)
ON CONFLICT (name) DO NOTHING;
