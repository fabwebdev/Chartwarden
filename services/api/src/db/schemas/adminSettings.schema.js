import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';

/**
 * Admin Settings Module
 * System-wide configuration settings for the hospice EHR system
 *
 * Purpose: Store and manage system configuration settings and clearinghouse integration parameters
 * Compliance: HIPAA audit trail, encrypted sensitive credentials
 *
 * Tables:
 * - admin_settings: General system configuration parameters
 * - admin_settings_history: Audit trail of all settings changes
 */

/**
 * Admin Settings Table
 * Stores system-wide configuration settings organized by category
 */
export const admin_settings = pgTable('admin_settings', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Setting identification
  setting_key: varchar('setting_key', { length: 100 }).unique().notNull(),
  name: varchar('name', { length: 255 }).notNull(),
  description: text('description'),

  // Setting value
  setting_value: text('setting_value'),
  default_value: text('default_value'),

  // Setting type for validation
  setting_type: varchar('setting_type', { length: 50 }).notNull(),
  // Types: STRING, INTEGER, BOOLEAN, JSON, ENCRYPTED, URL, EMAIL, SELECT

  // Category for grouping
  category: varchar('category', { length: 50 }).notNull(),
  // Categories: SYSTEM, SECURITY, CLEARINGHOUSE, NOTIFICATIONS, INTEGRATION, APPEARANCE

  // For SELECT type settings - available options
  options: jsonb('options'), // Array of { value: string, label: string }

  // Validation rules
  validation_rules: jsonb('validation_rules'), // { min, max, pattern, required, etc. }

  // Display order within category
  display_order: integer('display_order').default(0),

  // Flags
  is_sensitive: boolean('is_sensitive').default(false), // If true, value should be masked in UI
  requires_restart: boolean('requires_restart').default(false), // If true, changes require app restart
  is_readonly: boolean('is_readonly').default(false), // If true, cannot be edited via UI

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  keyIdx: index('idx_admin_settings_key').on(table.setting_key),
  categoryIdx: index('idx_admin_settings_category').on(table.category),
  typeIdx: index('idx_admin_settings_type').on(table.setting_type),
}));

/**
 * Admin Settings History Table
 * Audit trail of all settings changes - HIPAA compliant
 */
export const admin_settings_history = pgTable('admin_settings_history', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Reference to setting
  setting_id: bigint('setting_id', { mode: 'number' }).references(() => admin_settings.id).notNull(),
  setting_key: varchar('setting_key', { length: 100 }).notNull(),

  // Change details
  previous_value: text('previous_value'),
  new_value: text('new_value'),

  // Change context
  change_reason: text('change_reason'),

  // Session/request context
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),
  session_id: varchar('session_id', { length: 255 }),

  // Audit fields
  changed_by_id: text('changed_by_id').references(() => users.id).notNull(),
  changed_at: timestamp('changed_at').defaultNow().notNull()
}, (table) => ({
  settingIdx: index('idx_admin_settings_history_setting').on(table.setting_id),
  settingKeyIdx: index('idx_admin_settings_history_key').on(table.setting_key),
  changedByIdx: index('idx_admin_settings_history_user').on(table.changed_by_id),
  changedAtIdx: index('idx_admin_settings_history_date').on(table.changed_at),
}));
