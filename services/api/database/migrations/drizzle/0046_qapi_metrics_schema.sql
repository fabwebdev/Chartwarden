-- QAPI Metrics and Performance Tracking Schema
-- Purpose: Comprehensive quality assurance metrics, threshold alerts,
-- improvement initiatives, and performance tracking for hospice care
--
-- Compliance: CMS Conditions of Participation (CoPs), HIPAA, 21 CFR Part 11
--
-- Migration: 0046_qapi_metrics_schema.sql

-- ==================== PRODUCT AREAS TABLE ====================
-- Hierarchical product area/component structure for filtering and grouping

CREATE TABLE IF NOT EXISTS "qapi_product_areas" (
  "id" BIGSERIAL PRIMARY KEY,

  -- Identification
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(50) NOT NULL,
  "description" TEXT,

  -- Hierarchy
  "parent_id" BIGINT REFERENCES "qapi_product_areas"("id"),
  "level" INTEGER NOT NULL DEFAULT 0,
  "path" TEXT,

  -- Ownership
  "department" VARCHAR(255),
  "team" VARCHAR(255),
  "owner_id" TEXT REFERENCES "user"("id"),

  -- Status
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  "metadata" JSONB,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "updated_by_id" TEXT REFERENCES "user"("id"),
  "deleted_at" TIMESTAMP,
  "deleted_by_id" TEXT REFERENCES "user"("id"),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_qapi_product_areas_code" ON "qapi_product_areas"("code");
CREATE INDEX IF NOT EXISTS "idx_qapi_product_areas_parent" ON "qapi_product_areas"("parent_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_product_areas_active" ON "qapi_product_areas"("is_active");

-- ==================== TAGS TABLE ====================
-- Flexible categorization tags for cross-cutting concerns

CREATE TABLE IF NOT EXISTS "qapi_tags" (
  "id" BIGSERIAL PRIMARY KEY,

  -- Tag details
  "name" VARCHAR(100) NOT NULL,
  "slug" VARCHAR(100) NOT NULL,
  "description" TEXT,
  "color" VARCHAR(7),

  -- Categorization
  "category" VARCHAR(100),

  -- Status
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "updated_by_id" TEXT REFERENCES "user"("id"),
  "deleted_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_qapi_tags_slug" ON "qapi_tags"("slug");
CREATE INDEX IF NOT EXISTS "idx_qapi_tags_category" ON "qapi_tags"("category");

-- ==================== METRIC DEFINITIONS TABLE ====================
-- Flexible metric type definitions with extensible schema to accommodate new KPIs

CREATE TABLE IF NOT EXISTS "qapi_metric_definitions" (
  "id" BIGSERIAL PRIMARY KEY,

  -- Identification
  "name" VARCHAR(255) NOT NULL,
  "code" VARCHAR(100) NOT NULL,
  "description" TEXT,

  -- Classification
  "category" VARCHAR(100) NOT NULL,
  "type" VARCHAR(50) NOT NULL,
  "unit" VARCHAR(50),

  -- Data specifications
  "data_type" VARCHAR(50) NOT NULL DEFAULT 'DECIMAL',
  "precision_digits" INTEGER DEFAULT 2,
  "aggregation_method" VARCHAR(50) DEFAULT 'AVG',

  -- Calculation
  "calculation_formula" TEXT,
  "numerator_definition" TEXT,
  "denominator_definition" TEXT,

  -- Product area
  "product_area_id" BIGINT REFERENCES "qapi_product_areas"("id"),

  -- Collection settings
  "collection_frequency" VARCHAR(50),
  "data_source" VARCHAR(100),
  "source_system" VARCHAR(255),

  -- Extensible attributes
  "custom_attributes" JSONB,

  -- Versioning for evolving metric definitions
  "definition_version" INTEGER NOT NULL DEFAULT 1,
  "effective_date" DATE,
  "deprecation_date" DATE,

  -- Status
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "is_public" BOOLEAN DEFAULT FALSE,
  "is_cms_required" BOOLEAN DEFAULT FALSE,

  -- Metadata
  "documentation_url" TEXT,
  "notes" TEXT,
  "metadata" JSONB,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "updated_by_id" TEXT REFERENCES "user"("id"),
  "deleted_at" TIMESTAMP,
  "deleted_by_id" TEXT REFERENCES "user"("id"),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_qapi_metric_definitions_code" ON "qapi_metric_definitions"("code");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_definitions_category" ON "qapi_metric_definitions"("category");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_definitions_product_area" ON "qapi_metric_definitions"("product_area_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_definitions_active" ON "qapi_metric_definitions"("is_active");

-- ==================== METRIC THRESHOLDS TABLE ====================
-- Threshold definitions for alerting and SLA tracking

CREATE TABLE IF NOT EXISTS "qapi_metric_thresholds" (
  "id" BIGSERIAL PRIMARY KEY,
  "metric_definition_id" BIGINT NOT NULL REFERENCES "qapi_metric_definitions"("id"),

  -- Threshold identification
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,

  -- Threshold levels
  "threshold_type" VARCHAR(50) NOT NULL,
  "comparison_operator" VARCHAR(20) NOT NULL,

  -- Values
  "threshold_value" DECIMAL(18, 4),
  "threshold_value_min" DECIMAL(18, 4),
  "threshold_value_max" DECIMAL(18, 4),

  -- Direction
  "improvement_direction" VARCHAR(20),

  -- Alert configuration
  "alert_enabled" BOOLEAN NOT NULL DEFAULT TRUE,
  "alert_priority" VARCHAR(20) DEFAULT 'MEDIUM',
  "alert_message" TEXT,
  "notification_channels" JSONB,
  "cooldown_minutes" INTEGER DEFAULT 60,

  -- Context applicability
  "applicable_environments" JSONB,
  "applicable_teams" JSONB,

  -- Status
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "effective_date" DATE,
  "expiration_date" DATE,

  -- Metadata
  "metadata" JSONB,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "updated_by_id" TEXT REFERENCES "user"("id"),
  "deleted_at" TIMESTAMP,
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_qapi_metric_thresholds_metric" ON "qapi_metric_thresholds"("metric_definition_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_thresholds_type" ON "qapi_metric_thresholds"("threshold_type");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_thresholds_active" ON "qapi_metric_thresholds"("is_active");

-- ==================== METRIC VALUES TABLE ====================
-- Time-series metric values with context

CREATE TABLE IF NOT EXISTS "qapi_metric_values" (
  "id" BIGSERIAL PRIMARY KEY,
  "metric_definition_id" BIGINT NOT NULL REFERENCES "qapi_metric_definitions"("id"),

  -- Timestamp
  "recorded_at" TIMESTAMP NOT NULL,
  "measurement_period_start" TIMESTAMP,
  "measurement_period_end" TIMESTAMP,

  -- Values
  "value" DECIMAL(18, 4) NOT NULL,
  "numerator" DECIMAL(18, 4),
  "denominator" DECIMAL(18, 4),

  -- Context
  "product_area_id" BIGINT REFERENCES "qapi_product_areas"("id"),
  "environment" VARCHAR(50),
  "release_version" VARCHAR(100),
  "team" VARCHAR(255),

  -- Data quality
  "is_validated" BOOLEAN DEFAULT FALSE,
  "validated_by_id" TEXT REFERENCES "user"("id"),
  "validated_at" TIMESTAMP,

  -- Source tracking
  "data_source" VARCHAR(100),
  "source_reference" VARCHAR(500),

  -- Threshold evaluation cache
  "meets_target" BOOLEAN,
  "threshold_status" VARCHAR(50),

  -- Extended attributes
  "attributes" JSONB,

  -- Metadata
  "notes" TEXT,
  "metadata" JSONB,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "updated_by_id" TEXT REFERENCES "user"("id"),
  "deleted_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_qapi_metric_values_metric_time" ON "qapi_metric_values"("metric_definition_id", "recorded_at");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_values_time" ON "qapi_metric_values"("recorded_at");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_values_area_time" ON "qapi_metric_values"("product_area_id", "recorded_at");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_values_team_time" ON "qapi_metric_values"("team", "recorded_at");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_values_threshold" ON "qapi_metric_values"("threshold_status");

-- ==================== IMPROVEMENT INITIATIVES TABLE ====================
-- Enhanced initiative tracking with lifecycle management

CREATE TABLE IF NOT EXISTS "qapi_improvement_initiatives" (
  "id" BIGSERIAL PRIMARY KEY,

  -- Identification
  "title" VARCHAR(500) NOT NULL,
  "code" VARCHAR(100),
  "description" TEXT,

  -- Classification
  "initiative_type" VARCHAR(100),
  "category" VARCHAR(100),
  "priority" VARCHAR(20) DEFAULT 'MEDIUM',

  -- Objectives
  "objectives" TEXT,
  "success_criteria" TEXT,
  "expected_impact" TEXT,

  -- Lifecycle status
  "status" VARCHAR(50) NOT NULL DEFAULT 'PROPOSED',
  "status_reason" TEXT,

  -- Ownership
  "owner_id" TEXT REFERENCES "user"("id"),
  "team" VARCHAR(255),
  "department" VARCHAR(255),
  "sponsor_id" TEXT REFERENCES "user"("id"),
  "contributors" JSONB,

  -- Product area
  "product_area_id" BIGINT REFERENCES "qapi_product_areas"("id"),

  -- Timeline - Planned
  "planned_start_date" DATE,
  "planned_end_date" DATE,

  -- Timeline - Actual
  "actual_start_date" DATE,
  "actual_end_date" DATE,

  -- Progress tracking
  "progress_percentage" INTEGER DEFAULT 0,
  "milestones" JSONB,

  -- External links
  "documentation_url" TEXT,
  "ticket_references" JSONB,
  "project_management_url" TEXT,

  -- Impact assessment
  "resources_required" TEXT,
  "estimated_cost" DECIMAL(18, 2),
  "actual_cost" DECIMAL(18, 2),
  "roi_expected" DECIMAL(10, 2),
  "roi_actual" DECIMAL(10, 2),

  -- Results
  "outcomes" TEXT,
  "lessons_learned" TEXT,
  "follow_up_actions" TEXT,

  -- Approval
  "approved_by_id" TEXT REFERENCES "user"("id"),
  "approved_at" TIMESTAMP,
  "approval_notes" TEXT,

  -- Metadata
  "attachments" JSONB,
  "notes" TEXT,
  "metadata" JSONB,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "updated_by_id" TEXT REFERENCES "user"("id"),
  "deleted_at" TIMESTAMP,
  "deleted_by_id" TEXT REFERENCES "user"("id"),
  "version" INTEGER NOT NULL DEFAULT 1,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE UNIQUE INDEX IF NOT EXISTS "idx_qapi_initiatives_code" ON "qapi_improvement_initiatives"("code") WHERE "code" IS NOT NULL;
CREATE INDEX IF NOT EXISTS "idx_qapi_initiatives_status" ON "qapi_improvement_initiatives"("status");
CREATE INDEX IF NOT EXISTS "idx_qapi_initiatives_owner" ON "qapi_improvement_initiatives"("owner_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_initiatives_product_area" ON "qapi_improvement_initiatives"("product_area_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_initiatives_priority_status" ON "qapi_improvement_initiatives"("priority", "status");
CREATE INDEX IF NOT EXISTS "idx_qapi_initiatives_dates" ON "qapi_improvement_initiatives"("planned_start_date", "planned_end_date");

-- ==================== INITIATIVE METRICS TABLE ====================
-- Many-to-many relationship between metrics and initiatives

CREATE TABLE IF NOT EXISTS "qapi_initiative_metrics" (
  "id" BIGSERIAL PRIMARY KEY,
  "initiative_id" BIGINT NOT NULL REFERENCES "qapi_improvement_initiatives"("id"),
  "metric_definition_id" BIGINT NOT NULL REFERENCES "qapi_metric_definitions"("id"),

  -- Relationship type
  "relationship_type" VARCHAR(50) NOT NULL,

  -- Impact tracking
  "target_improvement" DECIMAL(10, 4),
  "actual_improvement" DECIMAL(10, 4),

  -- Correlation tracking
  "correlation_strength" DECIMAL(5, 4),
  "correlation_notes" TEXT,

  -- Status
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,

  -- Metadata
  "notes" TEXT,
  "metadata" JSONB,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "updated_by_id" TEXT REFERENCES "user"("id"),
  "deleted_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_qapi_initiative_metrics_initiative" ON "qapi_initiative_metrics"("initiative_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_initiative_metrics_metric" ON "qapi_initiative_metrics"("metric_definition_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_qapi_initiative_metrics_unique" ON "qapi_initiative_metrics"("initiative_id", "metric_definition_id") WHERE "deleted_at" IS NULL;

-- ==================== METRIC SNAPSHOTS TABLE ====================
-- Before/after metric snapshots for initiative impact analysis

CREATE TABLE IF NOT EXISTS "qapi_metric_snapshots" (
  "id" BIGSERIAL PRIMARY KEY,
  "initiative_id" BIGINT NOT NULL REFERENCES "qapi_improvement_initiatives"("id"),
  "metric_definition_id" BIGINT NOT NULL REFERENCES "qapi_metric_definitions"("id"),

  -- Snapshot type
  "snapshot_type" VARCHAR(50) NOT NULL,
  "snapshot_name" VARCHAR(255),

  -- Timestamp
  "snapshot_date" DATE NOT NULL,
  "measurement_period_start" DATE,
  "measurement_period_end" DATE,

  -- Values
  "value" DECIMAL(18, 4) NOT NULL,
  "numerator" DECIMAL(18, 4),
  "denominator" DECIMAL(18, 4),

  -- Comparison to baseline
  "baseline_value" DECIMAL(18, 4),
  "absolute_change" DECIMAL(18, 4),
  "percentage_change" DECIMAL(10, 4),

  -- Statistical context
  "sample_size" INTEGER,
  "standard_deviation" DECIMAL(18, 4),
  "confidence_interval" JSONB,

  -- Notes
  "analysis_notes" TEXT,

  -- Metadata
  "metadata" JSONB,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "updated_by_id" TEXT REFERENCES "user"("id"),
  "deleted_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_qapi_metric_snapshots_initiative" ON "qapi_metric_snapshots"("initiative_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_snapshots_metric" ON "qapi_metric_snapshots"("metric_definition_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_metric_snapshots_date" ON "qapi_metric_snapshots"("snapshot_date");

-- ==================== INITIATIVE DEPENDENCIES TABLE ====================
-- Track initiative dependencies and prerequisites

CREATE TABLE IF NOT EXISTS "qapi_initiative_dependencies" (
  "id" BIGSERIAL PRIMARY KEY,
  "initiative_id" BIGINT NOT NULL REFERENCES "qapi_improvement_initiatives"("id"),
  "depends_on_id" BIGINT NOT NULL REFERENCES "qapi_improvement_initiatives"("id"),

  -- Dependency type
  "dependency_type" VARCHAR(50) NOT NULL,

  -- Dependency details
  "description" TEXT,
  "is_required" BOOLEAN NOT NULL DEFAULT TRUE,

  -- Status
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "is_resolved" BOOLEAN DEFAULT FALSE,
  "resolved_at" TIMESTAMP,

  -- Metadata
  "metadata" JSONB,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "updated_by_id" TEXT REFERENCES "user"("id"),
  "deleted_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_qapi_initiative_deps_initiative" ON "qapi_initiative_dependencies"("initiative_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_initiative_deps_depends_on" ON "qapi_initiative_dependencies"("depends_on_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_qapi_initiative_deps_unique" ON "qapi_initiative_dependencies"("initiative_id", "depends_on_id") WHERE "deleted_at" IS NULL;

-- ==================== ENTITY TAGS TABLE ====================
-- Many-to-many relationship for tagging various QAPI entities

CREATE TABLE IF NOT EXISTS "qapi_entity_tags" (
  "id" BIGSERIAL PRIMARY KEY,
  "tag_id" BIGINT NOT NULL REFERENCES "qapi_tags"("id"),

  -- Entity reference (polymorphic)
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" BIGINT NOT NULL,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_qapi_entity_tags_tag" ON "qapi_entity_tags"("tag_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_entity_tags_entity" ON "qapi_entity_tags"("entity_type", "entity_id");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_qapi_entity_tags_unique" ON "qapi_entity_tags"("tag_id", "entity_type", "entity_id");

-- ==================== METRIC AGGREGATIONS TABLE ====================
-- Pre-computed summary data for dashboard performance

CREATE TABLE IF NOT EXISTS "qapi_metric_aggregations" (
  "id" BIGSERIAL PRIMARY KEY,
  "metric_definition_id" BIGINT NOT NULL REFERENCES "qapi_metric_definitions"("id"),

  -- Time period
  "aggregation_period" VARCHAR(20) NOT NULL,
  "period_start" DATE NOT NULL,
  "period_end" DATE NOT NULL,

  -- Context
  "product_area_id" BIGINT REFERENCES "qapi_product_areas"("id"),
  "team" VARCHAR(255),
  "environment" VARCHAR(50),

  -- Aggregated values
  "value_avg" DECIMAL(18, 4),
  "value_min" DECIMAL(18, 4),
  "value_max" DECIMAL(18, 4),
  "value_sum" DECIMAL(18, 4),
  "value_count" INTEGER,
  "value_stddev" DECIMAL(18, 4),

  -- Trend
  "previous_period_value" DECIMAL(18, 4),
  "period_over_period_change" DECIMAL(10, 4),
  "trend_direction" VARCHAR(20),

  -- Threshold summary
  "target_met_count" INTEGER DEFAULT 0,
  "warning_count" INTEGER DEFAULT 0,
  "critical_count" INTEGER DEFAULT 0,

  -- Refresh tracking
  "last_refreshed_at" TIMESTAMP NOT NULL,

  -- Metadata
  "metadata" JSONB,

  -- Audit fields
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_qapi_aggregations_metric_period" ON "qapi_metric_aggregations"("metric_definition_id", "aggregation_period", "period_start");
CREATE INDEX IF NOT EXISTS "idx_qapi_aggregations_period" ON "qapi_metric_aggregations"("aggregation_period", "period_start");
CREATE INDEX IF NOT EXISTS "idx_qapi_aggregations_area_period" ON "qapi_metric_aggregations"("product_area_id", "aggregation_period", "period_start");
CREATE UNIQUE INDEX IF NOT EXISTS "idx_qapi_aggregations_unique" ON "qapi_metric_aggregations"(
  "metric_definition_id",
  "aggregation_period",
  "period_start",
  COALESCE("product_area_id", 0),
  COALESCE("team", ''),
  COALESCE("environment", '')
);

-- ==================== WEBHOOKS TABLE ====================
-- Webhook configurations for threshold breach notifications

CREATE TABLE IF NOT EXISTS "qapi_webhooks" (
  "id" BIGSERIAL PRIMARY KEY,

  -- Configuration
  "name" VARCHAR(255) NOT NULL,
  "description" TEXT,
  "url" TEXT NOT NULL,
  "http_method" VARCHAR(10) NOT NULL DEFAULT 'POST',

  -- Authentication
  "auth_type" VARCHAR(50),
  "auth_config" JSONB,

  -- Headers
  "custom_headers" JSONB,

  -- Payload configuration
  "payload_template" TEXT,
  "content_type" VARCHAR(100) DEFAULT 'application/json',

  -- Trigger settings
  "trigger_on" JSONB,
  "filter_criteria" JSONB,

  -- Retry configuration
  "max_retries" INTEGER DEFAULT 3,
  "retry_delay_seconds" INTEGER DEFAULT 60,
  "timeout_seconds" INTEGER DEFAULT 30,

  -- Status
  "is_active" BOOLEAN NOT NULL DEFAULT TRUE,
  "last_triggered_at" TIMESTAMP,
  "last_success_at" TIMESTAMP,
  "last_failure_at" TIMESTAMP,
  "consecutive_failures" INTEGER DEFAULT 0,

  -- Metadata
  "notes" TEXT,
  "metadata" JSONB,

  -- Audit fields
  "created_by_id" TEXT REFERENCES "user"("id"),
  "updated_by_id" TEXT REFERENCES "user"("id"),
  "deleted_at" TIMESTAMP,
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW(),
  "updated_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_qapi_webhooks_active" ON "qapi_webhooks"("is_active");

-- ==================== WEBHOOK EVENTS TABLE ====================
-- Log of webhook events for debugging and audit

CREATE TABLE IF NOT EXISTS "qapi_webhook_events" (
  "id" BIGSERIAL PRIMARY KEY,
  "webhook_id" BIGINT NOT NULL REFERENCES "qapi_webhooks"("id"),

  -- Event details
  "event_type" VARCHAR(100) NOT NULL,
  "triggered_at" TIMESTAMP NOT NULL,

  -- Request
  "request_url" TEXT,
  "request_method" VARCHAR(10),
  "request_headers" JSONB,
  "request_body" TEXT,

  -- Response
  "response_status" INTEGER,
  "response_headers" JSONB,
  "response_body" TEXT,
  "response_time_ms" INTEGER,

  -- Status
  "success" BOOLEAN NOT NULL,
  "error_message" TEXT,
  "retry_count" INTEGER DEFAULT 0,

  -- Context
  "trigger_context" JSONB,

  -- Metadata
  "metadata" JSONB,

  -- Timestamp
  "created_at" TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS "idx_qapi_webhook_events_webhook" ON "qapi_webhook_events"("webhook_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_webhook_events_triggered" ON "qapi_webhook_events"("triggered_at");
CREATE INDEX IF NOT EXISTS "idx_qapi_webhook_events_success" ON "qapi_webhook_events"("success");

-- ==================== QAPI CHANGE LOG TABLE ====================
-- Comprehensive audit trail for all QAPI-related changes

CREATE TABLE IF NOT EXISTS "qapi_change_log" (
  "id" BIGSERIAL PRIMARY KEY,

  -- Entity reference
  "entity_type" VARCHAR(100) NOT NULL,
  "entity_id" BIGINT NOT NULL,

  -- Change details
  "action" VARCHAR(50) NOT NULL,
  "changes" JSONB,
  "change_summary" TEXT,

  -- User attribution
  "changed_by_id" TEXT NOT NULL REFERENCES "user"("id"),
  "changed_by_name" VARCHAR(255),
  "changed_by_role" VARCHAR(100),

  -- Context
  "change_reason" TEXT,
  "ip_address" VARCHAR(45),
  "user_agent" TEXT,
  "session_id" VARCHAR(255),

  -- Compliance
  "requires_review" BOOLEAN DEFAULT FALSE,
  "reviewed_by_id" TEXT REFERENCES "user"("id"),
  "reviewed_at" TIMESTAMP,

  -- Timestamp
  "changed_at" TIMESTAMP NOT NULL DEFAULT NOW(),

  -- Metadata
  "metadata" JSONB
);

CREATE INDEX IF NOT EXISTS "idx_qapi_change_log_entity" ON "qapi_change_log"("entity_type", "entity_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_change_log_user" ON "qapi_change_log"("changed_by_id");
CREATE INDEX IF NOT EXISTS "idx_qapi_change_log_time" ON "qapi_change_log"("changed_at");
CREATE INDEX IF NOT EXISTS "idx_qapi_change_log_action" ON "qapi_change_log"("action");

-- ==================== ADD COMMENTS FOR DOCUMENTATION ====================

COMMENT ON TABLE qapi_product_areas IS 'Hierarchical product area/component structure for organizing metrics and initiatives';
COMMENT ON TABLE qapi_tags IS 'Flexible categorization tags for cross-cutting concerns across QAPI entities';
COMMENT ON TABLE qapi_metric_definitions IS 'Extensible metric type definitions supporting various KPIs without structural changes';
COMMENT ON TABLE qapi_metric_thresholds IS 'Threshold definitions for alerting, SLA tracking, and target monitoring';
COMMENT ON TABLE qapi_metric_values IS 'Time-series metric data points with context for trend analysis';
COMMENT ON TABLE qapi_improvement_initiatives IS 'Quality improvement initiatives with full lifecycle and ownership tracking';
COMMENT ON TABLE qapi_initiative_metrics IS 'Links between initiatives and the metrics they target or affect';
COMMENT ON TABLE qapi_metric_snapshots IS 'Point-in-time metric snapshots for before/after initiative impact analysis';
COMMENT ON TABLE qapi_initiative_dependencies IS 'Dependencies between initiatives for proper sequencing';
COMMENT ON TABLE qapi_entity_tags IS 'Polymorphic tag associations for flexible entity categorization';
COMMENT ON TABLE qapi_metric_aggregations IS 'Pre-computed summaries optimized for dashboard queries';
COMMENT ON TABLE qapi_webhooks IS 'Webhook configurations for external system notifications';
COMMENT ON TABLE qapi_webhook_events IS 'Audit log of webhook invocations and responses';
COMMENT ON TABLE qapi_change_log IS 'Comprehensive audit trail for HIPAA/21 CFR Part 11 compliance';
