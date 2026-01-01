import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date, decimal, index, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

/**
 * QAPI Metrics and Performance Tracking Schema
 *
 * Purpose: Comprehensive quality assurance metrics, threshold alerts,
 * improvement initiatives, and performance tracking for hospice care
 *
 * Compliance: CMS Conditions of Participation (CoPs), HIPAA, 21 CFR Part 11
 *
 * Tables:
 * - qapi_metric_definitions: Flexible metric type definitions with extensible schema
 * - qapi_metric_values: Time-series metric values with context
 * - qapi_metric_thresholds: Threshold definitions for alerting and SLA tracking
 * - qapi_improvement_initiatives: Enhanced initiative tracking with lifecycle management
 * - qapi_initiative_metrics: Many-to-many relationship between metrics and initiatives
 * - qapi_metric_snapshots: Before/after metric snapshots for initiative impact analysis
 * - qapi_initiative_dependencies: Initiative dependencies tracking
 * - qapi_product_areas: Product area/component hierarchy for filtering and grouping
 * - qapi_tags: Tags for flexible cross-cutting categorization
 * - qapi_entity_tags: Many-to-many relationship for tagging entities
 * - qapi_metric_aggregations: Materialized summary data for dashboard performance
 * - qapi_webhooks: Webhook configurations for threshold breach notifications
 * - qapi_webhook_events: Webhook event log
 * - qapi_change_log: Comprehensive audit trail for all QAPI changes
 */

/**
 * Product Areas Table
 * Hierarchical product area/component structure for filtering and grouping
 */
export const qapi_product_areas = pgTable('qapi_product_areas', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Identification
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 50 }).notNull(),
  description: text('description'),

  // Hierarchy
  parent_id: bigint('parent_id', { mode: 'number' }),
  level: integer('level').default(0).notNull(), // 0 = root, 1 = child, etc.
  path: text('path'), // Materialized path for efficient tree queries (e.g., "/1/5/12")

  // Ownership
  department: varchar('department', { length: 255 }),
  team: varchar('team', { length: 255 }),
  owner_id: text('owner_id').references(() => users.id),

  // Status
  is_active: boolean('is_active').default(true).notNull(),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  deleted_by_id: text('deleted_by_id').references(() => users.id),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  codeIdx: uniqueIndex('idx_qapi_product_areas_code').on(table.code),
  parentIdx: index('idx_qapi_product_areas_parent').on(table.parent_id),
  activeIdx: index('idx_qapi_product_areas_active').on(table.is_active)
}));

/**
 * Tags Table
 * Flexible categorization tags for cross-cutting concerns
 */
export const qapi_tags = pgTable('qapi_tags', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Tag details
  name: varchar('name', { length: 100 }).notNull(),
  slug: varchar('slug', { length: 100 }).notNull(),
  description: text('description'),
  color: varchar('color', { length: 7 }), // Hex color code

  // Categorization
  category: varchar('category', { length: 100 }), // QUALITY, SAFETY, COMPLIANCE, OPERATIONAL, etc.

  // Status
  is_active: boolean('is_active').default(true).notNull(),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  slugIdx: uniqueIndex('idx_qapi_tags_slug').on(table.slug),
  categoryIdx: index('idx_qapi_tags_category').on(table.category)
}));

/**
 * Metric Definitions Table
 * Flexible metric type definitions with extensible schema to accommodate new KPIs
 */
export const qapi_metric_definitions = pgTable('qapi_metric_definitions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Identification
  name: varchar('name', { length: 255 }).notNull(),
  code: varchar('code', { length: 100 }).notNull(),
  description: text('description'),

  // Classification
  category: varchar('category', { length: 100 }).notNull(), // DEFECT_RATE, TEST_COVERAGE, MTTR, CUSTOMER_ISSUES, etc.
  type: varchar('type', { length: 50 }).notNull(), // PERCENTAGE, COUNT, DURATION, RATIO, SCORE
  unit: varchar('unit', { length: 50 }), // %, hours, count, etc.

  // Data specifications
  data_type: varchar('data_type', { length: 50 }).default('DECIMAL').notNull(), // DECIMAL, INTEGER, BOOLEAN
  precision_digits: integer('precision_digits').default(2), // Decimal precision
  aggregation_method: varchar('aggregation_method', { length: 50 }).default('AVG'), // AVG, SUM, MIN, MAX, LATEST, COUNT

  // Calculation
  calculation_formula: text('calculation_formula'), // Formula for calculated/derived metrics
  numerator_definition: text('numerator_definition'),
  denominator_definition: text('denominator_definition'),

  // Product area
  product_area_id: bigint('product_area_id', { mode: 'number' }).references(() => qapi_product_areas.id),

  // Collection settings
  collection_frequency: varchar('collection_frequency', { length: 50 }), // REAL_TIME, HOURLY, DAILY, WEEKLY, MONTHLY
  data_source: varchar('data_source', { length: 100 }), // MANUAL, API, CI_CD, MONITORING, TEST_FRAMEWORK
  source_system: varchar('source_system', { length: 255 }), // External system identifier

  // Extensible attributes
  custom_attributes: jsonb('custom_attributes'), // Flexible schema for metric-specific attributes

  // Versioning for evolving metric definitions
  definition_version: integer('definition_version').default(1).notNull(),
  effective_date: date('effective_date'),
  deprecation_date: date('deprecation_date'),

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  is_public: boolean('is_public').default(false), // For public reporting
  is_cms_required: boolean('is_cms_required').default(false),

  // Metadata
  documentation_url: text('documentation_url'),
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  deleted_by_id: text('deleted_by_id').references(() => users.id),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  codeIdx: uniqueIndex('idx_qapi_metric_definitions_code').on(table.code),
  categoryIdx: index('idx_qapi_metric_definitions_category').on(table.category),
  productAreaIdx: index('idx_qapi_metric_definitions_product_area').on(table.product_area_id),
  activeIdx: index('idx_qapi_metric_definitions_active').on(table.is_active)
}));

/**
 * Metric Thresholds Table
 * Threshold definitions for alerting and SLA tracking
 */
export const qapi_metric_thresholds = pgTable('qapi_metric_thresholds', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  metric_definition_id: bigint('metric_definition_id', { mode: 'number' }).references(() => qapi_metric_definitions.id).notNull(),

  // Threshold identification
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Threshold levels
  threshold_type: varchar('threshold_type', { length: 50 }).notNull(), // WARNING, CRITICAL, SLA, TARGET, BASELINE
  comparison_operator: varchar('comparison_operator', { length: 20 }).notNull(), // GT, GTE, LT, LTE, EQ, NEQ, BETWEEN

  // Values
  threshold_value: decimal('threshold_value', { precision: 18, scale: 4 }),
  threshold_value_min: decimal('threshold_value_min', { precision: 18, scale: 4 }), // For BETWEEN operator
  threshold_value_max: decimal('threshold_value_max', { precision: 18, scale: 4 }), // For BETWEEN operator

  // Direction (for understanding improvement)
  improvement_direction: varchar('improvement_direction', { length: 20 }), // HIGHER_IS_BETTER, LOWER_IS_BETTER

  // Alert configuration
  alert_enabled: boolean('alert_enabled').default(true).notNull(),
  alert_priority: varchar('alert_priority', { length: 20 }).default('MEDIUM'), // LOW, MEDIUM, HIGH, CRITICAL
  alert_message: text('alert_message'),
  notification_channels: jsonb('notification_channels'), // ["EMAIL", "SLACK", "WEBHOOK"]
  cooldown_minutes: integer('cooldown_minutes').default(60), // Prevent alert storms

  // Context applicability
  applicable_environments: jsonb('applicable_environments'), // ["PRODUCTION", "STAGING"]
  applicable_teams: jsonb('applicable_teams'),

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  effective_date: date('effective_date'),
  expiration_date: date('expiration_date'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  metricIdx: index('idx_qapi_metric_thresholds_metric').on(table.metric_definition_id),
  typeIdx: index('idx_qapi_metric_thresholds_type').on(table.threshold_type),
  activeIdx: index('idx_qapi_metric_thresholds_active').on(table.is_active)
}));

/**
 * Metric Values Table
 * Time-series metric values with context (product area, environment, release version, team)
 */
export const qapi_metric_values = pgTable('qapi_metric_values', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  metric_definition_id: bigint('metric_definition_id', { mode: 'number' }).references(() => qapi_metric_definitions.id).notNull(),

  // Timestamp (granular for trend analysis)
  recorded_at: timestamp('recorded_at').notNull(),
  measurement_period_start: timestamp('measurement_period_start'),
  measurement_period_end: timestamp('measurement_period_end'),

  // Values
  value: decimal('value', { precision: 18, scale: 4 }).notNull(),
  numerator: decimal('numerator', { precision: 18, scale: 4 }),
  denominator: decimal('denominator', { precision: 18, scale: 4 }),

  // Context
  product_area_id: bigint('product_area_id', { mode: 'number' }).references(() => qapi_product_areas.id),
  environment: varchar('environment', { length: 50 }), // PRODUCTION, STAGING, DEVELOPMENT
  release_version: varchar('release_version', { length: 100 }),
  team: varchar('team', { length: 255 }),

  // Data quality
  is_validated: boolean('is_validated').default(false),
  validated_by_id: text('validated_by_id').references(() => users.id),
  validated_at: timestamp('validated_at'),

  // Source tracking
  data_source: varchar('data_source', { length: 100 }), // MANUAL, API, AUTOMATION
  source_reference: varchar('source_reference', { length: 500 }), // External reference ID

  // Threshold evaluation cache
  meets_target: boolean('meets_target'),
  threshold_status: varchar('threshold_status', { length: 50 }), // OK, WARNING, CRITICAL, SLA_BREACH

  // Extended attributes
  attributes: jsonb('attributes'),

  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  metricTimeIdx: index('idx_qapi_metric_values_metric_time').on(table.metric_definition_id, table.recorded_at),
  timeIdx: index('idx_qapi_metric_values_time').on(table.recorded_at),
  productAreaTimeIdx: index('idx_qapi_metric_values_area_time').on(table.product_area_id, table.recorded_at),
  teamTimeIdx: index('idx_qapi_metric_values_team_time').on(table.team, table.recorded_at),
  thresholdStatusIdx: index('idx_qapi_metric_values_threshold').on(table.threshold_status)
}));

/**
 * Improvement Initiatives Table
 * Enhanced initiative tracking with lifecycle management, ownership, and documentation links
 */
export const qapi_improvement_initiatives = pgTable('qapi_improvement_initiatives', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Identification
  title: varchar('title', { length: 500 }).notNull(),
  code: varchar('code', { length: 100 }),
  description: text('description'),

  // Classification
  initiative_type: varchar('initiative_type', { length: 100 }), // QUALITY_IMPROVEMENT, DEFECT_REDUCTION, PROCESS_OPTIMIZATION, etc.
  category: varchar('category', { length: 100 }), // CLINICAL, OPERATIONAL, TECHNICAL, COMPLIANCE
  priority: varchar('priority', { length: 20 }).default('MEDIUM'), // LOW, MEDIUM, HIGH, CRITICAL

  // Objectives
  objectives: text('objectives'),
  success_criteria: text('success_criteria'),
  expected_impact: text('expected_impact'),

  // Lifecycle status
  status: varchar('status', { length: 50 }).default('PROPOSED').notNull(), // PROPOSED, APPROVED, IN_PROGRESS, COMPLETED, CANCELLED, ON_HOLD
  status_reason: text('status_reason'),

  // Ownership
  owner_id: text('owner_id').references(() => users.id),
  team: varchar('team', { length: 255 }),
  department: varchar('department', { length: 255 }),
  sponsor_id: text('sponsor_id').references(() => users.id),
  contributors: jsonb('contributors'), // Array of user IDs or names

  // Product area
  product_area_id: bigint('product_area_id', { mode: 'number' }).references(() => qapi_product_areas.id),

  // Timeline - Planned
  planned_start_date: date('planned_start_date'),
  planned_end_date: date('planned_end_date'),

  // Timeline - Actual
  actual_start_date: date('actual_start_date'),
  actual_end_date: date('actual_end_date'),

  // Progress tracking
  progress_percentage: integer('progress_percentage').default(0),
  milestones: jsonb('milestones'), // Array of milestone objects with status

  // External links
  documentation_url: text('documentation_url'),
  ticket_references: jsonb('ticket_references'), // Links to JIRA, GitHub issues, etc.
  project_management_url: text('project_management_url'),

  // Impact assessment
  resources_required: text('resources_required'),
  estimated_cost: decimal('estimated_cost', { precision: 18, scale: 2 }),
  actual_cost: decimal('actual_cost', { precision: 18, scale: 2 }),
  roi_expected: decimal('roi_expected', { precision: 10, scale: 2 }),
  roi_actual: decimal('roi_actual', { precision: 10, scale: 2 }),

  // Results
  outcomes: text('outcomes'),
  lessons_learned: text('lessons_learned'),
  follow_up_actions: text('follow_up_actions'),

  // Approval
  approved_by_id: text('approved_by_id').references(() => users.id),
  approved_at: timestamp('approved_at'),
  approval_notes: text('approval_notes'),

  // Metadata
  attachments: jsonb('attachments'),
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  deleted_by_id: text('deleted_by_id').references(() => users.id),
  version: integer('version').default(1).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  codeIdx: uniqueIndex('idx_qapi_initiatives_code').on(table.code),
  statusIdx: index('idx_qapi_initiatives_status').on(table.status),
  ownerIdx: index('idx_qapi_initiatives_owner').on(table.owner_id),
  productAreaIdx: index('idx_qapi_initiatives_product_area').on(table.product_area_id),
  priorityStatusIdx: index('idx_qapi_initiatives_priority_status').on(table.priority, table.status),
  dateRangeIdx: index('idx_qapi_initiatives_dates').on(table.planned_start_date, table.planned_end_date)
}));

/**
 * Initiative Metrics Table
 * Many-to-many relationship between metrics and initiatives
 */
export const qapi_initiative_metrics = pgTable('qapi_initiative_metrics', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  initiative_id: bigint('initiative_id', { mode: 'number' }).references(() => qapi_improvement_initiatives.id).notNull(),
  metric_definition_id: bigint('metric_definition_id', { mode: 'number' }).references(() => qapi_metric_definitions.id).notNull(),

  // Relationship type
  relationship_type: varchar('relationship_type', { length: 50 }).notNull(), // PRIMARY_TARGET, SECONDARY_TARGET, MONITORING, AFFECTED

  // Impact tracking
  target_improvement: decimal('target_improvement', { precision: 10, scale: 4 }), // Expected improvement percentage
  actual_improvement: decimal('actual_improvement', { precision: 10, scale: 4 }),

  // Correlation tracking
  correlation_strength: decimal('correlation_strength', { precision: 5, scale: 4 }), // -1 to 1
  correlation_notes: text('correlation_notes'),

  // Status
  is_active: boolean('is_active').default(true).notNull(),

  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  initiativeIdx: index('idx_qapi_initiative_metrics_initiative').on(table.initiative_id),
  metricIdx: index('idx_qapi_initiative_metrics_metric').on(table.metric_definition_id),
  uniqueRelationshipIdx: uniqueIndex('idx_qapi_initiative_metrics_unique').on(table.initiative_id, table.metric_definition_id)
}));

/**
 * Metric Snapshots Table
 * Before/after metric snapshots to quantify initiative impact
 */
export const qapi_metric_snapshots = pgTable('qapi_metric_snapshots', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  initiative_id: bigint('initiative_id', { mode: 'number' }).references(() => qapi_improvement_initiatives.id).notNull(),
  metric_definition_id: bigint('metric_definition_id', { mode: 'number' }).references(() => qapi_metric_definitions.id).notNull(),

  // Snapshot type
  snapshot_type: varchar('snapshot_type', { length: 50 }).notNull(), // BASELINE, MIDPOINT, FINAL, CUSTOM
  snapshot_name: varchar('snapshot_name', { length: 255 }),

  // Timestamp
  snapshot_date: date('snapshot_date').notNull(),
  measurement_period_start: date('measurement_period_start'),
  measurement_period_end: date('measurement_period_end'),

  // Values
  value: decimal('value', { precision: 18, scale: 4 }).notNull(),
  numerator: decimal('numerator', { precision: 18, scale: 4 }),
  denominator: decimal('denominator', { precision: 18, scale: 4 }),

  // Comparison to baseline
  baseline_value: decimal('baseline_value', { precision: 18, scale: 4 }),
  absolute_change: decimal('absolute_change', { precision: 18, scale: 4 }),
  percentage_change: decimal('percentage_change', { precision: 10, scale: 4 }),

  // Statistical context
  sample_size: integer('sample_size'),
  standard_deviation: decimal('standard_deviation', { precision: 18, scale: 4 }),
  confidence_interval: jsonb('confidence_interval'), // { lower: x, upper: y, level: 0.95 }

  // Notes
  analysis_notes: text('analysis_notes'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  initiativeIdx: index('idx_qapi_metric_snapshots_initiative').on(table.initiative_id),
  metricIdx: index('idx_qapi_metric_snapshots_metric').on(table.metric_definition_id),
  dateIdx: index('idx_qapi_metric_snapshots_date').on(table.snapshot_date)
}));

/**
 * Initiative Dependencies Table
 * Track initiative dependencies and prerequisites
 */
export const qapi_initiative_dependencies = pgTable('qapi_initiative_dependencies', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  initiative_id: bigint('initiative_id', { mode: 'number' }).references(() => qapi_improvement_initiatives.id).notNull(),
  depends_on_id: bigint('depends_on_id', { mode: 'number' }).references(() => qapi_improvement_initiatives.id).notNull(),

  // Dependency type
  dependency_type: varchar('dependency_type', { length: 50 }).notNull(), // BLOCKS, REQUIRES, RELATED, INFORMS

  // Dependency details
  description: text('description'),
  is_required: boolean('is_required').default(true).notNull(),

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  is_resolved: boolean('is_resolved').default(false),
  resolved_at: timestamp('resolved_at'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  initiativeIdx: index('idx_qapi_initiative_deps_initiative').on(table.initiative_id),
  dependsOnIdx: index('idx_qapi_initiative_deps_depends_on').on(table.depends_on_id),
  uniqueDependencyIdx: uniqueIndex('idx_qapi_initiative_deps_unique').on(table.initiative_id, table.depends_on_id)
}));

/**
 * Entity Tags Table
 * Many-to-many relationship for tagging various QAPI entities
 */
export const qapi_entity_tags = pgTable('qapi_entity_tags', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  tag_id: bigint('tag_id', { mode: 'number' }).references(() => qapi_tags.id).notNull(),

  // Entity reference (polymorphic)
  entity_type: varchar('entity_type', { length: 100 }).notNull(), // METRIC, INITIATIVE, INCIDENT, GRIEVANCE, etc.
  entity_id: bigint('entity_id', { mode: 'number' }).notNull(),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  tagIdx: index('idx_qapi_entity_tags_tag').on(table.tag_id),
  entityIdx: index('idx_qapi_entity_tags_entity').on(table.entity_type, table.entity_id),
  uniqueTagIdx: uniqueIndex('idx_qapi_entity_tags_unique').on(table.tag_id, table.entity_type, table.entity_id)
}));

/**
 * Metric Aggregations Table
 * Pre-computed summary data for dashboard performance (daily, weekly, monthly)
 */
export const qapi_metric_aggregations = pgTable('qapi_metric_aggregations', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  metric_definition_id: bigint('metric_definition_id', { mode: 'number' }).references(() => qapi_metric_definitions.id).notNull(),

  // Time period
  aggregation_period: varchar('aggregation_period', { length: 20 }).notNull(), // DAILY, WEEKLY, MONTHLY, QUARTERLY, YEARLY
  period_start: date('period_start').notNull(),
  period_end: date('period_end').notNull(),

  // Context
  product_area_id: bigint('product_area_id', { mode: 'number' }).references(() => qapi_product_areas.id),
  team: varchar('team', { length: 255 }),
  environment: varchar('environment', { length: 50 }),

  // Aggregated values
  value_avg: decimal('value_avg', { precision: 18, scale: 4 }),
  value_min: decimal('value_min', { precision: 18, scale: 4 }),
  value_max: decimal('value_max', { precision: 18, scale: 4 }),
  value_sum: decimal('value_sum', { precision: 18, scale: 4 }),
  value_count: integer('value_count'),
  value_stddev: decimal('value_stddev', { precision: 18, scale: 4 }),

  // Trend
  previous_period_value: decimal('previous_period_value', { precision: 18, scale: 4 }),
  period_over_period_change: decimal('period_over_period_change', { precision: 10, scale: 4 }),
  trend_direction: varchar('trend_direction', { length: 20 }), // IMPROVING, DECLINING, STABLE

  // Threshold summary
  target_met_count: integer('target_met_count').default(0),
  warning_count: integer('warning_count').default(0),
  critical_count: integer('critical_count').default(0),

  // Refresh tracking
  last_refreshed_at: timestamp('last_refreshed_at').notNull(),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  metricPeriodIdx: index('idx_qapi_aggregations_metric_period').on(table.metric_definition_id, table.aggregation_period, table.period_start),
  periodIdx: index('idx_qapi_aggregations_period').on(table.aggregation_period, table.period_start),
  productAreaPeriodIdx: index('idx_qapi_aggregations_area_period').on(table.product_area_id, table.aggregation_period, table.period_start),
  uniqueAggIdx: uniqueIndex('idx_qapi_aggregations_unique').on(
    table.metric_definition_id,
    table.aggregation_period,
    table.period_start,
    table.product_area_id,
    table.team,
    table.environment
  )
}));

/**
 * Webhooks Table
 * Webhook configurations for threshold breach notifications
 */
export const qapi_webhooks = pgTable('qapi_webhooks', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Configuration
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  url: text('url').notNull(),
  http_method: varchar('http_method', { length: 10 }).default('POST').notNull(),

  // Authentication
  auth_type: varchar('auth_type', { length: 50 }), // NONE, BASIC, BEARER, API_KEY
  auth_config: jsonb('auth_config'), // Encrypted auth configuration

  // Headers
  custom_headers: jsonb('custom_headers'),

  // Payload configuration
  payload_template: text('payload_template'), // Handlebars template for custom payloads
  content_type: varchar('content_type', { length: 100 }).default('application/json'),

  // Trigger settings
  trigger_on: jsonb('trigger_on'), // ["THRESHOLD_BREACH", "INITIATIVE_STATUS_CHANGE", etc.]
  filter_criteria: jsonb('filter_criteria'), // Specific metrics, thresholds, or initiatives

  // Retry configuration
  max_retries: integer('max_retries').default(3),
  retry_delay_seconds: integer('retry_delay_seconds').default(60),
  timeout_seconds: integer('timeout_seconds').default(30),

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  last_triggered_at: timestamp('last_triggered_at'),
  last_success_at: timestamp('last_success_at'),
  last_failure_at: timestamp('last_failure_at'),
  consecutive_failures: integer('consecutive_failures').default(0),

  // Metadata
  notes: text('notes'),
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  activeIdx: index('idx_qapi_webhooks_active').on(table.is_active)
}));

/**
 * Webhook Events Table
 * Log of webhook events for debugging and audit
 */
export const qapi_webhook_events = pgTable('qapi_webhook_events', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  webhook_id: bigint('webhook_id', { mode: 'number' }).references(() => qapi_webhooks.id).notNull(),

  // Event details
  event_type: varchar('event_type', { length: 100 }).notNull(),
  triggered_at: timestamp('triggered_at').notNull(),

  // Request
  request_url: text('request_url'),
  request_method: varchar('request_method', { length: 10 }),
  request_headers: jsonb('request_headers'),
  request_body: text('request_body'),

  // Response
  response_status: integer('response_status'),
  response_headers: jsonb('response_headers'),
  response_body: text('response_body'),
  response_time_ms: integer('response_time_ms'),

  // Status
  success: boolean('success').notNull(),
  error_message: text('error_message'),
  retry_count: integer('retry_count').default(0),

  // Context
  trigger_context: jsonb('trigger_context'), // What triggered this event

  // Metadata
  metadata: jsonb('metadata'),

  // Timestamp
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  webhookIdx: index('idx_qapi_webhook_events_webhook').on(table.webhook_id),
  triggeredIdx: index('idx_qapi_webhook_events_triggered').on(table.triggered_at),
  successIdx: index('idx_qapi_webhook_events_success').on(table.success)
}));

/**
 * QAPI Change Log Table
 * Comprehensive audit trail for all QAPI-related changes
 */
export const qapi_change_log = pgTable('qapi_change_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Entity reference
  entity_type: varchar('entity_type', { length: 100 }).notNull(), // METRIC_DEFINITION, METRIC_VALUE, INITIATIVE, THRESHOLD, etc.
  entity_id: bigint('entity_id', { mode: 'number' }).notNull(),

  // Change details
  action: varchar('action', { length: 50 }).notNull(), // CREATE, UPDATE, DELETE, RESTORE, STATUS_CHANGE
  changes: jsonb('changes'), // { field: { old: x, new: y } }
  change_summary: text('change_summary'),

  // User attribution
  changed_by_id: text('changed_by_id').references(() => users.id).notNull(),
  changed_by_name: varchar('changed_by_name', { length: 255 }),
  changed_by_role: varchar('changed_by_role', { length: 100 }),

  // Context
  change_reason: text('change_reason'),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  session_id: varchar('session_id', { length: 255 }),

  // Compliance
  requires_review: boolean('requires_review').default(false),
  reviewed_by_id: text('reviewed_by_id').references(() => users.id),
  reviewed_at: timestamp('reviewed_at'),

  // Timestamp (with timezone for audit compliance)
  changed_at: timestamp('changed_at').defaultNow().notNull(),

  // Metadata
  metadata: jsonb('metadata')
}, (table) => ({
  entityIdx: index('idx_qapi_change_log_entity').on(table.entity_type, table.entity_id),
  userIdx: index('idx_qapi_change_log_user').on(table.changed_by_id),
  timeIdx: index('idx_qapi_change_log_time').on(table.changed_at),
  actionIdx: index('idx_qapi_change_log_action').on(table.action)
}));
