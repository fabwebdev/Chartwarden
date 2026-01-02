import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, index, pgEnum, uniqueIndex } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

/**
 * Report Management Module
 *
 * Purpose: Store report configurations, scheduling information, and generated report outputs
 *
 * Features:
 * - Report Configurations with versioning
 * - Flexible scheduling (one-time, daily, weekly, monthly, cron)
 * - Multiple recipients per schedule
 * - Generated report tracking with status and error handling
 * - External storage support for large report outputs
 *
 * HIPAA Compliance:
 * - Audit fields for tracking who created/modified records
 * - Soft delete support
 * - Access control through ownership and permissions
 */

/**
 * Report Output Format Enum
 */
export const reportOutputFormatEnum = pgEnum('report_output_format', [
  'PDF',
  'EXCEL',
  'CSV',
  'JSON',
  'HTML'
]);

/**
 * Report Schedule Frequency Enum
 */
export const reportScheduleFrequencyEnum = pgEnum('report_schedule_frequency', [
  'ONE_TIME',
  'DAILY',
  'WEEKLY',
  'BI_WEEKLY',
  'MONTHLY',
  'QUARTERLY',
  'YEARLY',
  'CRON'
]);

/**
 * Report Execution Status Enum
 */
export const reportExecutionStatusEnum = pgEnum('report_execution_status', [
  'PENDING',
  'RUNNING',
  'SUCCESS',
  'FAILED',
  'CANCELLED',
  'PARTIAL'
]);

/**
 * Report Category Enum
 */
export const reportCategoryEnum = pgEnum('report_category', [
  'CENSUS',
  'CLINICAL',
  'BILLING',
  'COMPLIANCE',
  'QAPI',
  'STAFF',
  'BEREAVEMENT',
  'EXECUTIVE',
  'CUSTOM'
]);

/**
 * Report Configurations Table
 * Store report definitions including name, description, query/logic, parameters, output format preferences
 */
export const report_configurations = pgTable('report_configurations', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Report identification
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),
  code: varchar('code', { length: 100 }).unique(), // Unique code for programmatic access

  // Categorization
  category: reportCategoryEnum('category').default('CUSTOM').notNull(),
  tags: jsonb('tags'), // ['billing', 'monthly', 'financial']

  // Report logic/query definition
  report_type: varchar('report_type', { length: 100 }).notNull(), // QUERY, AGGREGATION, TEMPLATE, CUSTOM
  query_definition: jsonb('query_definition'), // SQL query or query builder config
  data_source: varchar('data_source', { length: 100 }), // Which data source/tables to use

  // Parameters schema - defines what parameters this report accepts
  parameter_schema: jsonb('parameter_schema'), // JSON Schema for validating parameters
  default_parameters: jsonb('default_parameters'), // Default parameter values

  // Output configuration
  default_output_format: reportOutputFormatEnum('default_output_format').default('PDF').notNull(),
  available_formats: jsonb('available_formats'), // ['PDF', 'EXCEL', 'CSV']
  template_id: varchar('template_id', { length: 100 }), // Reference to report template

  // Layout and formatting options
  layout_options: jsonb('layout_options'), // Page orientation, margins, headers, footers
  column_definitions: jsonb('column_definitions'), // Column widths, alignments, formats

  // Permissions and access control
  owner_id: text('owner_id').references(() => users.id).notNull(),
  is_public: boolean('is_public').default(false).notNull(), // Visible to all users
  is_system: boolean('is_system').default(false).notNull(), // System-generated, cannot be deleted
  allowed_roles: jsonb('allowed_roles'), // ['ADMIN', 'MANAGER', 'BILLING_SPECIALIST']

  // Versioning
  version: integer('version').default(1).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  published_at: timestamp('published_at'),

  // Soft delete and audit fields
  deleted_at: timestamp('deleted_at'),
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Performance indexes
  ownerIdx: index('idx_report_configs_owner').on(table.owner_id),
  categoryIdx: index('idx_report_configs_category').on(table.category),
  codeIdx: uniqueIndex('idx_report_configs_code').on(table.code),
  isActiveIdx: index('idx_report_configs_active').on(table.is_active),
  isPublicIdx: index('idx_report_configs_public').on(table.is_public, table.is_active),
  createdAtIdx: index('idx_report_configs_created').on(table.created_at),

  // Composite indexes for common queries
  ownerActiveIdx: index('idx_report_configs_owner_active').on(table.owner_id, table.is_active),
  categoryActiveIdx: index('idx_report_configs_category_active').on(table.category, table.is_active)
}));

/**
 * Report Configuration Versions Table
 * Track changes to report configurations over time
 */
export const report_configuration_versions = pgTable('report_configuration_versions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Link to parent configuration
  configuration_id: bigint('configuration_id', { mode: 'number' })
    .references(() => report_configurations.id, { onDelete: 'cascade' })
    .notNull(),

  // Version information
  version: integer('version').notNull(),
  version_label: varchar('version_label', { length: 100 }), // e.g., "v1.0.0", "Q1 2024 Update"
  change_description: text('change_description'), // What changed in this version

  // Snapshot of configuration at this version
  config_snapshot: jsonb('config_snapshot').notNull(), // Full configuration snapshot

  // Version metadata
  is_current: boolean('is_current').default(false).notNull(),
  published_at: timestamp('published_at'),
  deprecated_at: timestamp('deprecated_at'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  configIdIdx: index('idx_report_config_versions_config').on(table.configuration_id),
  versionIdx: index('idx_report_config_versions_version').on(table.configuration_id, table.version),
  currentIdx: index('idx_report_config_versions_current').on(table.configuration_id, table.is_current)
}));

/**
 * Report Schedules Table
 * Store scheduling information including frequency, execution time, timezone, and recipients
 */
export const report_schedules = pgTable('report_schedules', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Link to report configuration
  configuration_id: bigint('configuration_id', { mode: 'number' })
    .references(() => report_configurations.id, { onDelete: 'cascade' })
    .notNull(),

  // Schedule identification
  name: varchar('name', { length: 255 }), // Optional schedule name
  description: text('description'),

  // Frequency settings
  frequency: reportScheduleFrequencyEnum('frequency').default('ONE_TIME').notNull(),
  cron_expression: varchar('cron_expression', { length: 100 }), // For CRON frequency type

  // Execution time settings
  execution_time: varchar('execution_time', { length: 10 }), // HH:MM format (24-hour)
  timezone: varchar('timezone', { length: 50 }).default('America/New_York').notNull(),

  // Day-based scheduling (for weekly/monthly)
  days_of_week: jsonb('days_of_week'), // [0, 1, 5] for Sunday, Monday, Friday
  day_of_month: integer('day_of_month'), // 1-31 for monthly schedules
  week_of_month: integer('week_of_month'), // 1-5 for "first Monday", "last Friday"
  months_of_year: jsonb('months_of_year'), // [1, 4, 7, 10] for quarterly

  // One-time execution
  scheduled_date: timestamp('scheduled_date'), // For ONE_TIME schedules

  // Schedule period
  start_date: timestamp('start_date').notNull(),
  end_date: timestamp('end_date'), // NULL = indefinite

  // Status
  is_active: boolean('is_active').default(true).notNull(),
  pause_start_date: timestamp('pause_start_date'),
  pause_end_date: timestamp('pause_end_date'),

  // Parameters to use for scheduled runs
  schedule_parameters: jsonb('schedule_parameters'), // Override default parameters
  output_format: reportOutputFormatEnum('output_format'), // Override default format

  // Recipients
  recipients: jsonb('recipients'), // Array of recipient objects
  /* Example:
  [
    { type: 'user', id: 'user_id_123', email: 'user@example.com' },
    { type: 'email', email: 'external@example.com' },
    { type: 'role', role: 'ADMIN' },
    { type: 'webhook', url: 'https://...' }
  ]
  */

  // Delivery options
  email_subject: varchar('email_subject', { length: 255 }),
  email_body: text('email_body'),
  include_inline: boolean('include_inline').default(false), // Include report in email body
  attachment_name_template: varchar('attachment_name_template', { length: 255 }), // e.g., "Census_Report_{date}"

  // Retry settings
  max_retries: integer('max_retries').default(3),
  retry_delay_minutes: integer('retry_delay_minutes').default(15),

  // Execution tracking
  last_execution_at: timestamp('last_execution_at'),
  last_execution_status: reportExecutionStatusEnum('last_execution_status'),
  next_execution_at: timestamp('next_execution_at'),
  execution_count: integer('execution_count').default(0),
  failure_count: integer('failure_count').default(0),

  // Ownership
  owner_id: text('owner_id').references(() => users.id).notNull(),

  // Soft delete and audit fields
  deleted_at: timestamp('deleted_at'),
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Performance indexes
  configIdIdx: index('idx_report_schedules_config').on(table.configuration_id),
  ownerIdx: index('idx_report_schedules_owner').on(table.owner_id),
  isActiveIdx: index('idx_report_schedules_active').on(table.is_active),
  nextExecIdx: index('idx_report_schedules_next_exec').on(table.next_execution_at),
  frequencyIdx: index('idx_report_schedules_frequency').on(table.frequency),

  // Composite indexes for scheduler queries
  activeNextExecIdx: index('idx_report_schedules_active_next')
    .on(table.is_active, table.next_execution_at),
  configActiveIdx: index('idx_report_schedules_config_active')
    .on(table.configuration_id, table.is_active)
}));

/**
 * Generated Reports Table
 * Store metadata about executed reports including execution timestamp, status, output location
 */
export const generated_reports = pgTable('generated_reports', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Link to configuration and schedule (optional)
  configuration_id: bigint('configuration_id', { mode: 'number' })
    .references(() => report_configurations.id, { onDelete: 'set null' }),
  schedule_id: bigint('schedule_id', { mode: 'number' })
    .references(() => report_schedules.id, { onDelete: 'set null' }),
  configuration_version: integer('configuration_version'), // Which version was used

  // Execution trigger
  execution_type: varchar('execution_type', { length: 50 }).notNull(), // SCHEDULED, MANUAL, API
  triggered_by_id: text('triggered_by_id').references(() => users.id), // User who triggered (for manual)

  // Execution timing
  started_at: timestamp('started_at').notNull(),
  completed_at: timestamp('completed_at'),
  execution_duration_ms: integer('execution_duration_ms'), // Duration in milliseconds

  // Status
  status: reportExecutionStatusEnum('status').default('PENDING').notNull(),

  // Parameters used for this execution
  parameters_used: jsonb('parameters_used'), // Actual parameters used

  // Output
  output_format: reportOutputFormatEnum('output_format').notNull(),
  output_filename: varchar('output_filename', { length: 500 }),

  // Storage location (supports external storage)
  storage_type: varchar('storage_type', { length: 50 }).default('LOCAL').notNull(), // LOCAL, S3, AZURE, GCS
  storage_path: varchar('storage_path', { length: 1000 }), // File path or URL
  storage_bucket: varchar('storage_bucket', { length: 255 }), // For cloud storage

  // File metadata
  file_size_bytes: bigint('file_size_bytes', { mode: 'number' }),
  file_checksum: varchar('file_checksum', { length: 64 }), // SHA-256 hash
  mime_type: varchar('mime_type', { length: 100 }),

  // Report statistics
  row_count: integer('row_count'), // Number of rows in report
  page_count: integer('page_count'), // Number of pages (for PDF)

  // Error handling
  error_message: text('error_message'),
  error_code: varchar('error_code', { length: 50 }),
  error_details: jsonb('error_details'), // Stack trace, context
  retry_count: integer('retry_count').default(0),

  // Delivery tracking
  delivery_status: varchar('delivery_status', { length: 50 }).default('PENDING'), // PENDING, DELIVERED, FAILED, NOT_REQUIRED
  delivery_attempts: jsonb('delivery_attempts'), // Array of delivery attempt records
  delivered_at: timestamp('delivered_at'),
  delivered_to: jsonb('delivered_to'), // List of recipients who received it

  // Expiration and cleanup
  expires_at: timestamp('expires_at'), // When the file should be deleted
  is_archived: boolean('is_archived').default(false),
  archived_at: timestamp('archived_at'),

  // Request context (for manual runs)
  request_ip: varchar('request_ip', { length: 45 }),
  request_user_agent: text('request_user_agent'),

  // Soft delete and audit fields
  deleted_at: timestamp('deleted_at'),
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  // Performance indexes
  configIdIdx: index('idx_generated_reports_config').on(table.configuration_id),
  scheduleIdIdx: index('idx_generated_reports_schedule').on(table.schedule_id),
  statusIdx: index('idx_generated_reports_status').on(table.status),
  startedAtIdx: index('idx_generated_reports_started').on(table.started_at),
  triggeredByIdx: index('idx_generated_reports_triggered_by').on(table.triggered_by_id),
  executionTypeIdx: index('idx_generated_reports_exec_type').on(table.execution_type),
  expiresAtIdx: index('idx_generated_reports_expires').on(table.expires_at),

  // Composite indexes for common queries
  configStatusIdx: index('idx_generated_reports_config_status')
    .on(table.configuration_id, table.status),
  scheduleStatusIdx: index('idx_generated_reports_schedule_status')
    .on(table.schedule_id, table.status),
  statusStartedIdx: index('idx_generated_reports_status_started')
    .on(table.status, table.started_at),
  configTimeRangeIdx: index('idx_generated_reports_config_time')
    .on(table.configuration_id, table.started_at),

  // Index for finding failed reports
  failedReportsIdx: index('idx_generated_reports_failed')
    .on(table.status, table.retry_count)
}));

/**
 * Report Recipients Table
 * Normalized recipient list for schedules (alternative to JSONB recipients)
 * Useful for querying all reports sent to a specific user/email
 */
export const report_recipients = pgTable('report_recipients', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Link to schedule
  schedule_id: bigint('schedule_id', { mode: 'number' })
    .references(() => report_schedules.id, { onDelete: 'cascade' })
    .notNull(),

  // Recipient type and identifier
  recipient_type: varchar('recipient_type', { length: 50 }).notNull(), // USER, EMAIL, ROLE, WEBHOOK
  user_id: text('user_id').references(() => users.id), // If type is USER
  email: varchar('email', { length: 255 }), // If type is EMAIL or fallback for USER
  role: varchar('role', { length: 100 }), // If type is ROLE
  webhook_url: text('webhook_url'), // If type is WEBHOOK

  // Delivery preferences
  include_attachment: boolean('include_attachment').default(true),
  include_inline: boolean('include_inline').default(false),
  custom_subject: varchar('custom_subject', { length: 255 }),
  custom_body: text('custom_body'),

  // Status
  is_active: boolean('is_active').default(true).notNull(),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  scheduleIdx: index('idx_report_recipients_schedule').on(table.schedule_id),
  userIdx: index('idx_report_recipients_user').on(table.user_id),
  emailIdx: index('idx_report_recipients_email').on(table.email),
  typeIdx: index('idx_report_recipients_type').on(table.recipient_type),
  activeIdx: index('idx_report_recipients_active').on(table.schedule_id, table.is_active)
}));

/**
 * Report Favorites Table
 * Track user's favorite reports for quick access
 */
export const report_favorites = pgTable('report_favorites', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  user_id: text('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull(),
  configuration_id: bigint('configuration_id', { mode: 'number' })
    .references(() => report_configurations.id, { onDelete: 'cascade' })
    .notNull(),

  // Display order for user's favorites list
  display_order: integer('display_order').default(0),

  // Custom settings for this favorite
  custom_parameters: jsonb('custom_parameters'), // User's preferred parameters
  custom_name: varchar('custom_name', { length: 255 }), // User's custom name for the report

  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIdx: index('idx_report_favorites_user').on(table.user_id),
  configIdx: index('idx_report_favorites_config').on(table.configuration_id),
  userConfigIdx: uniqueIndex('idx_report_favorites_user_config').on(table.user_id, table.configuration_id)
}));

/**
 * Report Access Log Table
 * Track who accessed/downloaded generated reports (HIPAA compliance)
 */
export const report_access_logs = pgTable('report_access_logs', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // What was accessed
  generated_report_id: bigint('generated_report_id', { mode: 'number' })
    .references(() => generated_reports.id, { onDelete: 'set null' }),

  // Who accessed
  user_id: text('user_id').references(() => users.id),

  // Access details
  access_type: varchar('access_type', { length: 50 }).notNull(), // VIEW, DOWNLOAD, PRINT, SHARE, DELETE
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),

  // Result
  success: boolean('success').default(true).notNull(),
  error_message: text('error_message'),

  // Immutable timestamp
  created_at: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  reportIdx: index('idx_report_access_logs_report').on(table.generated_report_id),
  userIdx: index('idx_report_access_logs_user').on(table.user_id),
  createdIdx: index('idx_report_access_logs_created').on(table.created_at),
  userTimeIdx: index('idx_report_access_logs_user_time').on(table.user_id, table.created_at),
  reportTimeIdx: index('idx_report_access_logs_report_time').on(table.generated_report_id, table.created_at)
}));
