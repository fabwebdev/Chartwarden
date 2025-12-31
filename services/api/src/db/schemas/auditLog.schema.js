import { pgTable, bigint, varchar, text, timestamp, index, pgEnum } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { sessions } from './session.schema.js';

/**
 * Audit Log Status Enum
 * Tracks the outcome of audited operations for HIPAA compliance
 */
export const auditLogStatusEnum = pgEnum('audit_log_status', ['success', 'failure', 'pending']);

/**
 * Immutable Audit Log Schema
 *
 * HIPAA Compliance Requirements:
 * - All access to PHI must be logged
 * - Logs must be tamper-evident (immutable - no updates allowed)
 * - Logs must be retained for minimum 6 years
 * - Must track who, what, when, where, and outcome
 *
 * 21 CFR Part 11 Compliance:
 * - Electronic records must have audit trails
 * - Must capture user ID, timestamp, and action
 * - Must be linked to electronic signatures where applicable
 */
export const audit_logs = pgTable('audit_logs', {
  // Primary key - auto-incrementing for sequential ordering
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // User identification - who performed the action
  user_id: text('user_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),

  // Session tracking - links to user session for traceability
  session_id: text('session_id').references(() => sessions.id, { onDelete: 'set null', onUpdate: 'cascade' }),

  // Request correlation - unique identifier for distributed tracing
  request_id: varchar('request_id', { length: 36 }),

  // Action type - what operation was performed (CREATE, READ, UPDATE, DELETE, LOGIN, LOGOUT, etc.)
  action: varchar('action', { length: 255 }).notNull(),

  // Resource identification - what was accessed/modified
  resource_type: varchar('resource_type', { length: 255 }).notNull(), // renamed from table_name for clarity
  resource_id: text('resource_id'), // changed to text to support various ID formats (UUIDs, nanoids, etc.)

  // Change tracking - before and after states (JSON stringified)
  old_value: text('old_value'), // Previous state of the resource
  new_value: text('new_value'), // New state of the resource

  // Operation status - outcome of the action
  status: auditLogStatusEnum('status').notNull().default('success'),

  // Network context - where the request originated
  ip_address: varchar('ip_address', { length: 45 }), // IPv6 max length is 45 chars
  user_agent: text('user_agent'), // Changed to text - user agents can be long

  // Additional context (JSON) - flexible field for extra metadata
  metadata: text('metadata'),

  // Immutable timestamp - when the action occurred
  // NOTE: No updated_at column - audit logs are immutable and should never be modified
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Performance indexes for audit_logs table (HIPAA-compliant audit queries)

  // Single column indexes for frequently queried columns
  userIdx: index('idx_audit_logs_user_id').on(table.user_id),
  sessionIdx: index('idx_audit_logs_session_id').on(table.session_id),
  requestIdx: index('idx_audit_logs_request_id').on(table.request_id),
  actionIdx: index('idx_audit_logs_action').on(table.action),
  resourceTypeIdx: index('idx_audit_logs_resource_type').on(table.resource_type),
  resourceIdx: index('idx_audit_logs_resource_id').on(table.resource_id),
  statusIdx: index('idx_audit_logs_status').on(table.status),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.created_at),

  // Composite indexes for common audit query patterns

  // User activity queries - "show all actions by user X in time range"
  userTimeIdx: index('idx_audit_logs_user_time')
    .on(table.user_id, table.created_at),

  // Resource history queries - "show all changes to patient #123"
  resourceHistoryIdx: index('idx_audit_logs_resource_history')
    .on(table.resource_type, table.resource_id, table.created_at),

  // Action analysis queries - "show all DELETE actions on patients table"
  actionResourceIdx: index('idx_audit_logs_action_resource')
    .on(table.action, table.resource_type),

  // Time-based audit queries - "show all actions in last 24 hours"
  timeActionIdx: index('idx_audit_logs_time_action')
    .on(table.created_at, table.action),

  // Status-based queries - "show all failed operations"
  statusTimeIdx: index('idx_audit_logs_status_time')
    .on(table.status, table.created_at),

  // Session-based queries - "show all actions in session X"
  sessionTimeIdx: index('idx_audit_logs_session_time')
    .on(table.session_id, table.created_at),
}));