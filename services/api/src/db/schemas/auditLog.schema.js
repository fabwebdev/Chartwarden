import { pgTable, bigint, varchar, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

export const audit_logs = pgTable('audit_logs', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  user_id: text('user_id').references(() => users.id, { onDelete: 'set null', onUpdate: 'cascade' }),
  action: varchar('action', { length: 255 }).notNull(),
  table_name: varchar('table_name', { length: 255 }).notNull(),
  record_id: bigint('record_id', { mode: 'number' }),
  old_value: text('old_value'),
  new_value: text('new_value'),
  ip_address: varchar('ip_address', { length: 255 }),
  user_agent: varchar('user_agent', { length: 255 }),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // TICKET #019: Performance indexes for audit_logs table
  // Single column indexes for frequently queried columns
  userIdx: index('idx_audit_logs_user_id').on(table.user_id),
  actionIdx: index('idx_audit_logs_action').on(table.action),
  tableNameIdx: index('idx_audit_logs_table_name').on(table.table_name),
  recordIdx: index('idx_audit_logs_record_id').on(table.record_id),
  createdAtIdx: index('idx_audit_logs_created_at').on(table.createdAt),

  // Composite indexes for common audit query patterns
  // Most audit queries filter by user_id + timestamp
  userTimeIdx: index('idx_audit_logs_user_time')
    .on(table.user_id, table.createdAt),

  // Queries filter by table_name + record_id (e.g., "show all changes to patient #123")
  tableRecordIdx: index('idx_audit_logs_table_record')
    .on(table.table_name, table.record_id),

  // Queries filter by action + table_name (e.g., "show all DELETE actions on medications table")
  actionTableIdx: index('idx_audit_logs_action_table')
    .on(table.action, table.table_name),

  // Time-based audit queries (e.g., "show all actions in last 24 hours")
  timeActionIdx: index('idx_audit_logs_time_action')
    .on(table.createdAt, table.action),
}));