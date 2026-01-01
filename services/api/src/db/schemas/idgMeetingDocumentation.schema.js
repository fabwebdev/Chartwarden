import { pgTable, bigint, varchar, text, timestamp, boolean, jsonb, integer, date, time, index } from 'drizzle-orm/pg-core';
import { idg_meetings } from './idgMeetings.schema.js';
import { users } from './user.schema.js';

// ============================================================================
// IDG MEETING DOCUMENTATION TABLES
// ============================================================================
// CMS 14-Day Compliance Enforcement for Meeting Documentation
// Per 42 CFR §418.56, IDG documentation must be completed within 14 calendar days
// ============================================================================

/**
 * IDG Meeting Documentation - Tracks documentation lifecycle with 14-day compliance
 * Enforces CMS requirement for timely completion of meeting minutes and documentation
 */
export const idg_meeting_documentation = pgTable('idg_meeting_documentation', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Link to the meeting
  idg_meeting_id: bigint('idg_meeting_id', { mode: 'number' }).references(() => idg_meetings.id).notNull(),

  // Documentation metadata
  documentation_status: varchar('documentation_status', { length: 50 }).default('DRAFT').notNull(),
  // DRAFT, IN_PROGRESS, PENDING_REVIEW, SUBMITTED, APPROVED, OVERDUE, OVERRIDDEN

  // Meeting date (for deadline calculation - stored for quick access)
  meeting_date: date('meeting_date').notNull(),
  meeting_time: time('meeting_time'),

  // 14-Day Deadline Enforcement
  documentation_deadline: timestamp('documentation_deadline').notNull(), // Meeting date + 14 days at 23:59:59
  deadline_extended: boolean('deadline_extended').default(false),
  extended_deadline: timestamp('extended_deadline'),
  extension_reason: text('extension_reason'),
  extension_approved_by_id: text('extension_approved_by_id').references(() => users.id),
  extension_approved_date: timestamp('extension_approved_date'),

  // Time tracking
  days_remaining: integer('days_remaining'),
  hours_remaining: integer('hours_remaining'),
  is_overdue: boolean('is_overdue').default(false),
  days_overdue: integer('days_overdue').default(0),

  // Documentation content
  documentation_content: text('documentation_content'),
  meeting_summary: text('meeting_summary'),
  key_decisions: text('key_decisions'),
  action_items_summary: text('action_items_summary'),

  // Required fields tracking (for validation before final submission)
  required_fields_complete: boolean('required_fields_complete').default(false),
  incomplete_fields: jsonb('incomplete_fields'), // Array of field names that are incomplete

  // Draft tracking
  last_draft_save: timestamp('last_draft_save'),
  draft_version: integer('draft_version').default(1),
  auto_save_enabled: boolean('auto_save_enabled').default(true),

  // Submission tracking
  submitted_date: timestamp('submitted_date'),
  submitted_by_id: text('submitted_by_id').references(() => users.id),
  submitted_by_name: varchar('submitted_by_name', { length: 255 }),
  submission_ip_address: varchar('submission_ip_address', { length: 45 }),
  submission_user_agent: text('submission_user_agent'),

  // Approval tracking
  approved_date: timestamp('approved_date'),
  approved_by_id: text('approved_by_id').references(() => users.id),
  approved_by_name: varchar('approved_by_name', { length: 255 }),
  approval_notes: text('approval_notes'),

  // Late submission override (42 CFR §418.56 compliance)
  is_late_submission: boolean('is_late_submission').default(false),
  override_required: boolean('override_required').default(false),
  override_granted: boolean('override_granted').default(false),
  override_granted_by_id: text('override_granted_by_id').references(() => users.id),
  override_granted_by_name: varchar('override_granted_by_name', { length: 255 }),
  override_granted_date: timestamp('override_granted_date'),
  override_justification: text('override_justification'), // Minimum 50 characters required
  override_notified_compliance: boolean('override_notified_compliance').default(false),
  override_compliance_notification_date: timestamp('override_compliance_notification_date'),

  // Compliance flagging
  flagged_in_compliance_report: boolean('flagged_in_compliance_report').default(false),
  compliance_flag_reason: text('compliance_flag_reason'),

  // Notification tracking
  notifications_sent: jsonb('notifications_sent'), // Array of {type, date, recipients, channel}
  last_notification_date: timestamp('last_notification_date'),
  escalated_to_supervisor: boolean('escalated_to_supervisor').default(false),
  escalation_date: timestamp('escalation_date'),
  escalation_recipients: jsonb('escalation_recipients'),

  // Document owner
  documentation_owner_id: text('documentation_owner_id').references(() => users.id),
  documentation_owner_name: varchar('documentation_owner_name', { length: 255 }),

  // Attachments
  attachments: jsonb('attachments'),

  // Audit fields
  created_by_id: text('created_by_id').references(() => users.id),
  updated_by_id: text('updated_by_id').references(() => users.id),
  deleted_at: timestamp('deleted_at'),
  deletion_reason: text('deletion_reason'),
  deleted_by_id: text('deleted_by_id').references(() => users.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  // Indexes for common queries
  meetingIdx: index('idx_idg_doc_meeting_id').on(table.idg_meeting_id),
  statusIdx: index('idx_idg_doc_status').on(table.documentation_status),
  deadlineIdx: index('idx_idg_doc_deadline').on(table.documentation_deadline),
  overdueIdx: index('idx_idg_doc_overdue').on(table.is_overdue),
  ownerIdx: index('idx_idg_doc_owner').on(table.documentation_owner_id),
  meetingDateIdx: index('idx_idg_doc_meeting_date').on(table.meeting_date),
  compositeStatusDeadline: index('idx_idg_doc_status_deadline').on(table.documentation_status, table.documentation_deadline),
}));

/**
 * IDG Documentation Audit Trail - Immutable log of all documentation changes
 * Required for CMS compliance reviews and HIPAA audit requirements
 */
export const idg_documentation_audit = pgTable('idg_documentation_audit', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Link to documentation
  documentation_id: bigint('documentation_id', { mode: 'number' }).references(() => idg_meeting_documentation.id).notNull(),
  idg_meeting_id: bigint('idg_meeting_id', { mode: 'number' }).references(() => idg_meetings.id).notNull(),

  // Action details
  action: varchar('action', { length: 50 }).notNull(),
  // CREATE, UPDATE, SAVE_DRAFT, SUBMIT, APPROVE, DELETE, OVERRIDE, ESCALATE, NOTIFICATION_SENT

  action_description: text('action_description'),

  // Status transition
  previous_status: varchar('previous_status', { length: 50 }),
  new_status: varchar('new_status', { length: 50 }),

  // User and session info
  user_id: text('user_id').references(() => users.id),
  user_name: varchar('user_name', { length: 255 }),
  user_role: varchar('user_role', { length: 100 }),
  session_id: varchar('session_id', { length: 255 }),

  // Network info
  ip_address: varchar('ip_address', { length: 45 }),
  user_agent: text('user_agent'),

  // Change tracking
  old_value: jsonb('old_value'),
  new_value: jsonb('new_value'),
  changed_fields: jsonb('changed_fields'), // Array of field names that changed

  // Compliance metadata
  deadline_at_action: timestamp('deadline_at_action'),
  days_remaining_at_action: integer('days_remaining_at_action'),
  was_overdue_at_action: boolean('was_overdue_at_action').default(false),

  // Immutable timestamp (created_at only, no updates allowed)
  createdAt: timestamp('created_at').defaultNow().notNull()
}, (table) => ({
  docIdx: index('idx_idg_audit_doc_id').on(table.documentation_id),
  meetingIdx: index('idx_idg_audit_meeting_id').on(table.idg_meeting_id),
  userIdx: index('idx_idg_audit_user_id').on(table.user_id),
  actionIdx: index('idx_idg_audit_action').on(table.action),
  dateIdx: index('idx_idg_audit_date').on(table.createdAt),
}));

/**
 * IDG Compliance Alerts - Scheduled notifications for deadline reminders
 */
export const idg_compliance_alerts = pgTable('idg_compliance_alerts', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Link to documentation
  documentation_id: bigint('documentation_id', { mode: 'number' }).references(() => idg_meeting_documentation.id).notNull(),
  idg_meeting_id: bigint('idg_meeting_id', { mode: 'number' }).references(() => idg_meetings.id).notNull(),

  // Alert configuration
  alert_type: varchar('alert_type', { length: 50 }).notNull(),
  // 10_DAY_REMINDER, 7_DAY_REMINDER, 3_DAY_REMINDER, 1_DAY_REMINDER, SAME_DAY, OVERDUE, SUPERVISOR_ESCALATION

  days_before_deadline: integer('days_before_deadline'),
  scheduled_for: timestamp('scheduled_for').notNull(),

  // Recipients
  recipients: jsonb('recipients').notNull(), // Array of {user_id, email, name}
  escalation_recipients: jsonb('escalation_recipients'), // For supervisor escalations

  // Status
  status: varchar('status', { length: 50 }).default('PENDING').notNull(),
  // PENDING, SENT, FAILED, CANCELLED

  // Delivery tracking
  sent_at: timestamp('sent_at'),
  sent_via: jsonb('sent_via'), // Array of channels: ['email', 'in_app', 'sms']
  delivery_status: jsonb('delivery_status'), // Per-channel delivery status

  // Error tracking
  error_message: text('error_message'),
  retry_count: integer('retry_count').default(0),
  last_retry_at: timestamp('last_retry_at'),

  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  docIdx: index('idx_idg_alerts_doc_id').on(table.documentation_id),
  scheduledIdx: index('idx_idg_alerts_scheduled').on(table.scheduled_for),
  statusIdx: index('idx_idg_alerts_status').on(table.status),
  typeIdx: index('idx_idg_alerts_type').on(table.alert_type),
}));

/**
 * IDG Monthly Compliance Report - Pre-aggregated compliance metrics
 */
export const idg_compliance_reports = pgTable('idg_compliance_reports', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),

  // Report period
  report_month: integer('report_month').notNull(), // 1-12
  report_year: integer('report_year').notNull(),
  report_start_date: date('report_start_date').notNull(),
  report_end_date: date('report_end_date').notNull(),

  // Meeting metrics
  total_meetings: integer('total_meetings').default(0),
  meetings_with_documentation: integer('meetings_with_documentation').default(0),
  meetings_without_documentation: integer('meetings_without_documentation').default(0),

  // Compliance metrics
  on_time_submissions: integer('on_time_submissions').default(0),
  late_submissions: integer('late_submissions').default(0),
  overridden_submissions: integer('overridden_submissions').default(0),
  pending_submissions: integer('pending_submissions').default(0),

  // Rate calculations (stored as integer percentages, e.g., 85 for 85%)
  on_time_rate: integer('on_time_rate'),
  compliance_rate: integer('compliance_rate'),

  // Time metrics (in hours)
  average_completion_time_hours: integer('average_completion_time_hours'),
  median_completion_time_hours: integer('median_completion_time_hours'),
  min_completion_time_hours: integer('min_completion_time_hours'),
  max_completion_time_hours: integer('max_completion_time_hours'),

  // Override analysis
  override_count: integer('override_count').default(0),
  override_reasons: jsonb('override_reasons'), // Array of {reason, count}

  // Late submission analysis
  late_submission_details: jsonb('late_submission_details'), // Array of {meeting_id, days_late, reason}

  // Trend analysis (compared to previous month)
  trend_direction: varchar('trend_direction', { length: 20 }), // IMPROVING, DECLINING, STABLE
  trend_percentage_change: integer('trend_percentage_change'),

  // Report metadata
  generated_at: timestamp('generated_at').defaultNow().notNull(),
  generated_by_id: text('generated_by_id').references(() => users.id),

  // Audit
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull()
}, (table) => ({
  periodIdx: index('idx_idg_reports_period').on(table.report_year, table.report_month),
}));
