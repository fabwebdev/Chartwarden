import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date, numeric, uniqueIndex, index } from 'drizzle-orm/pg-core';
import { patients } from './patient.schema.js';
import { users } from './user.schema.js';
import { cap_tracking } from './capTracking.schema.js';

/**
 * Compliance Status Table
 * Tracks overall compliance status for each patient
 * Aggregates multiple compliance requirements (cap, certifications, F2F, etc.)
 */
export const compliance_status = pgTable('compliance_status', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Overall compliance status
  overall_status: varchar('overall_status', { length: 50 }).default('COMPLIANT').notNull(), // COMPLIANT, WARNING, NON_COMPLIANT, PENDING_REVIEW
  overall_score: numeric('overall_score', { precision: 5, scale: 2 }).default('100'), // 0-100 compliance score

  // Individual compliance areas
  cap_compliance_status: varchar('cap_compliance_status', { length: 50 }).default('COMPLIANT'), // COMPLIANT, WARNING, EXCEEDED
  certification_compliance_status: varchar('certification_compliance_status', { length: 50 }).default('COMPLIANT'), // COMPLIANT, PENDING, OVERDUE
  f2f_compliance_status: varchar('f2f_compliance_status', { length: 50 }).default('COMPLIANT'), // COMPLIANT, PENDING, OVERDUE
  idg_compliance_status: varchar('idg_compliance_status', { length: 50 }).default('COMPLIANT'), // COMPLIANT, PENDING, OVERDUE
  documentation_compliance_status: varchar('documentation_compliance_status', { length: 50 }).default('COMPLIANT'), // COMPLIANT, INCOMPLETE, MISSING

  // Compliance issues tracking
  active_issues_count: integer('active_issues_count').default(0).notNull(),
  resolved_issues_count: integer('resolved_issues_count').default(0).notNull(),
  critical_issues_count: integer('critical_issues_count').default(0).notNull(),

  // Last compliance check
  last_compliance_check: timestamp('last_compliance_check'),
  next_scheduled_check: timestamp('next_scheduled_check'),

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
  uniquePatient: uniqueIndex('unique_compliance_patient').on(table.patient_id),
  statusIndex: index('compliance_status_idx').on(table.overall_status)
}));

/**
 * Compliance Issues Table
 * Tracks individual compliance issues and their resolution
 */
export const compliance_issues = pgTable('compliance_issues', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),
  compliance_status_id: bigint('compliance_status_id', { mode: 'number' }).references(() => compliance_status.id),

  // Issue details
  issue_type: varchar('issue_type', { length: 50 }).notNull(), // CAP_EXCEEDED, CAP_WARNING, CERT_OVERDUE, F2F_OVERDUE, IDG_OVERDUE, DOC_MISSING
  issue_category: varchar('issue_category', { length: 50 }).notNull(), // CAP, CERTIFICATION, F2F, IDG, DOCUMENTATION
  severity: varchar('severity', { length: 20 }).default('MEDIUM').notNull(), // LOW, MEDIUM, HIGH, CRITICAL

  // Issue description
  title: varchar('title', { length: 255 }).notNull(),
  description: text('description'),

  // Issue status
  status: varchar('status', { length: 50 }).default('OPEN').notNull(), // OPEN, IN_PROGRESS, RESOLVED, DISMISSED

  // Resolution tracking
  due_date: date('due_date'),
  resolved_at: timestamp('resolved_at'),
  resolved_by_id: text('resolved_by_id').references(() => users.id),
  resolution_notes: text('resolution_notes'),

  // Related records
  related_cap_tracking_id: bigint('related_cap_tracking_id', { mode: 'number' }).references(() => cap_tracking.id),
  related_record_type: varchar('related_record_type', { length: 50 }),
  related_record_id: bigint('related_record_id', { mode: 'number' }),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  patientIndex: index('compliance_issues_patient_idx').on(table.patient_id),
  statusIndex: index('compliance_issues_status_idx').on(table.status),
  typeIndex: index('compliance_issues_type_idx').on(table.issue_type)
}));

/**
 * Compliance Alerts Configuration Table
 * Stores alert configuration for compliance monitoring
 */
export const compliance_alert_config = pgTable('compliance_alert_config', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Alert configuration
  alert_type: varchar('alert_type', { length: 50 }).notNull().unique(), // CAP_80, CAP_90, CAP_95, CAP_EXCEEDED, CERT_5_DAYS, F2F_OVERDUE, etc.
  alert_name: varchar('alert_name', { length: 100 }).notNull(),
  description: text('description'),

  // Alert settings
  is_enabled: boolean('is_enabled').default(true).notNull(),
  severity: varchar('severity', { length: 20 }).default('MEDIUM').notNull(), // LOW, MEDIUM, HIGH, CRITICAL

  // Threshold settings (for cap tracking)
  threshold_percentage: numeric('threshold_percentage', { precision: 5, scale: 2 }),
  threshold_days: integer('threshold_days'),

  // Notification settings
  notification_channels: jsonb('notification_channels').default('["email", "in_app"]'), // Array of: email, sms, in_app, webhook
  recipient_roles: jsonb('recipient_roles').default('["admin", "nurse"]'), // Array of roles to notify

  // Frequency settings
  notification_frequency: varchar('notification_frequency', { length: 20 }).default('ONCE'), // ONCE, DAILY, WEEKLY
  cooldown_hours: integer('cooldown_hours').default(24), // Hours before re-alerting

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
});

/**
 * Compliance Notifications Table
 * Logs all compliance alerts and notifications sent
 */
export const compliance_notifications = pgTable('compliance_notifications', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Related records
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id),
  compliance_issue_id: bigint('compliance_issue_id', { mode: 'number' }).references(() => compliance_issues.id),
  alert_config_id: bigint('alert_config_id', { mode: 'number' }).references(() => compliance_alert_config.id),

  // Notification details
  notification_type: varchar('notification_type', { length: 50 }).notNull(), // CAP_WARNING, CAP_EXCEEDED, CERT_REMINDER, etc.
  channel: varchar('channel', { length: 20 }).notNull(), // email, sms, in_app, webhook

  // Recipient info
  recipient_id: text('recipient_id').references(() => users.id),
  recipient_email: varchar('recipient_email', { length: 255 }),
  recipient_phone: varchar('recipient_phone', { length: 20 }),

  // Content
  subject: varchar('subject', { length: 255 }),
  message: text('message'),

  // Status
  status: varchar('status', { length: 20 }).default('PENDING').notNull(), // PENDING, SENT, FAILED, DELIVERED, READ
  sent_at: timestamp('sent_at'),
  delivered_at: timestamp('delivered_at'),
  read_at: timestamp('read_at'),

  // Error tracking
  error_message: text('error_message'),
  retry_count: integer('retry_count').default(0),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  patientIndex: index('compliance_notifications_patient_idx').on(table.patient_id),
  statusIndex: index('compliance_notifications_status_idx').on(table.status),
  typeIndex: index('compliance_notifications_type_idx').on(table.notification_type)
}));

/**
 * Cap Tracking History Table
 * Stores historical cap tracking data for trend analysis
 */
export const cap_tracking_history = pgTable('cap_tracking_history', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  cap_tracking_id: bigint('cap_tracking_id', { mode: 'number' }).references(() => cap_tracking.id).notNull(),
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id).notNull(),

  // Snapshot data
  cap_year: integer('cap_year').notNull(),
  snapshot_date: date('snapshot_date').notNull(),

  // Cap amounts at time of snapshot
  cap_amount_cents: integer('cap_amount_cents').notNull(),
  total_payments_cents: integer('total_payments_cents').notNull(),
  remaining_cap_cents: integer('remaining_cap_cents').notNull(),
  utilization_percentage: numeric('utilization_percentage', { precision: 5, scale: 2 }).notNull(),

  // Status at snapshot
  cap_exceeded: boolean('cap_exceeded').default(false).notNull(),

  // Change from previous snapshot
  payments_delta_cents: integer('payments_delta_cents').default(0),
  utilization_delta: numeric('utilization_delta', { precision: 5, scale: 2 }).default('0'),

  // Metadata
  metadata: jsonb('metadata'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  capTrackingIndex: index('cap_history_tracking_idx').on(table.cap_tracking_id),
  patientYearIndex: index('cap_history_patient_year_idx').on(table.patient_id, table.cap_year),
  snapshotDateIndex: index('cap_history_snapshot_date_idx').on(table.snapshot_date)
}));

/**
 * Compliance Audit Log Table
 * HIPAA-compliant audit logging for all compliance-related operations
 */
export const compliance_audit_log = pgTable('compliance_audit_log', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Actor info
  user_id: text('user_id').references(() => users.id).notNull(),
  user_email: varchar('user_email', { length: 255 }),
  user_role: varchar('user_role', { length: 50 }),
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),

  // Action details
  action: varchar('action', { length: 50 }).notNull(), // CREATE, READ, UPDATE, DELETE, CALCULATE, EXPORT
  resource_type: varchar('resource_type', { length: 50 }).notNull(), // CAP_TRACKING, COMPLIANCE_STATUS, COMPLIANCE_ISSUE, ALERT_CONFIG
  resource_id: bigint('resource_id', { mode: 'number' }),

  // Patient context (for HIPAA)
  patient_id: bigint('patient_id', { mode: 'number' }).references(() => patients.id),

  // Change details
  old_values: jsonb('old_values'),
  new_values: jsonb('new_values'),

  // Request details
  request_method: varchar('request_method', { length: 10 }),
  request_path: varchar('request_path', { length: 500 }),
  request_params: jsonb('request_params'),

  // Result
  result: varchar('result', { length: 20 }).default('SUCCESS'), // SUCCESS, FAILURE, PARTIAL
  error_message: text('error_message'),

  // Timestamp
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  userIndex: index('compliance_audit_user_idx').on(table.user_id),
  patientIndex: index('compliance_audit_patient_idx').on(table.patient_id),
  actionIndex: index('compliance_audit_action_idx').on(table.action),
  resourceIndex: index('compliance_audit_resource_idx').on(table.resource_type, table.resource_id),
  dateIndex: index('compliance_audit_date_idx').on(table.createdAt)
}));
