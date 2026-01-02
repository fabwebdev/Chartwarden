import {
  pgTable,
  text,
  varchar,
  timestamp,
  boolean,
  index,
  pgEnum
} from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { users } from './user.schema.js';

/**
 * User Presence Status Enum
 * Defines the online/offline status for real-time chat presence tracking
 */
export const presenceStatusEnum = pgEnum('presence_status', [
  'online',      // User is actively connected
  'away',        // User is idle/inactive for extended period
  'busy',        // User is online but marked as busy/do not disturb
  'offline'      // User is disconnected
]);

/**
 * User Presence Schema
 *
 * Tracks real-time online/offline status for team chat functionality.
 * Used for displaying user availability in chat rooms and presence indicators.
 *
 * HIPAA Compliance Considerations:
 * - Presence data should be retained for audit purposes (who was online when)
 * - Status changes should be logged for accountability
 * - Connection tracking helps with session management and security
 */
export const user_presence = pgTable('user_presence', {
  // Primary key
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),

  // User association
  user_id: text('user_id')
    .notNull()
    .unique()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Presence status
  status: presenceStatusEnum('status').notNull().default('offline'),

  // Custom status message (optional)
  status_message: varchar('status_message', { length: 255 }), // "In a meeting", "On break", etc.

  // Connection tracking
  socket_id: varchar('socket_id', { length: 255 }), // Current socket connection ID
  is_connected: boolean('is_connected').default(false).notNull(),

  // Activity tracking
  last_seen_at: timestamp('last_seen_at').defaultNow().notNull(), // Last activity timestamp
  last_active_at: timestamp('last_active_at').defaultNow().notNull(), // Last interaction timestamp

  // Typing indicators (room-specific)
  typing_in_room_id: text('typing_in_room_id'), // Reference to chat room where user is typing

  // Session metadata
  user_agent: text('user_agent'), // Browser/device info for security
  ip_address: varchar('ip_address', { length: 45 }), // IPv4 or IPv6 for audit

  // Timestamps
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Index for finding online users
  userIdIdx: index('idx_user_presence_user_id').on(table.user_id),

  // Index for filtering by status
  statusIdx: index('idx_user_presence_status').on(table.status),

  // Index for finding connected users
  isConnectedIdx: index('idx_user_presence_is_connected').on(table.is_connected),

  // Composite index for active online users
  activeOnlineIdx: index('idx_user_presence_active_online')
    .on(table.is_connected, table.status, table.last_active_at),

  // Index for typing indicators
  typingIdx: index('idx_user_presence_typing').on(table.typing_in_room_id),

  // Index for last seen queries
  lastSeenIdx: index('idx_user_presence_last_seen').on(table.last_seen_at),
}));

/**
 * Presence History Schema
 *
 * Audit trail for presence status changes.
 * Maintains HIPAA-compliant history of when users were online/offline.
 */
export const presence_history = pgTable('presence_history', {
  // Primary key
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),

  // User association
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Status change tracking
  old_status: presenceStatusEnum('old_status').notNull(),
  new_status: presenceStatusEnum('new_status').notNull(),

  // Session information
  socket_id: varchar('socket_id', { length: 255 }),
  user_agent: text('user_agent'),
  ip_address: varchar('ip_address', { length: 45 }),

  // Session duration (for analytics)
  session_started_at: timestamp('session_started_at'),
  session_ended_at: timestamp('session_ended_at'),

  // Timestamp
  created_at: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  // Index for user history queries
  userIdIdx: index('idx_presence_history_user_id').on(table.user_id),

  // Index for time-based queries
  createdAtIdx: index('idx_presence_history_created_at').on(table.created_at),

  // Composite index for user timeline
  userTimeIdx: index('idx_presence_history_user_time')
    .on(table.user_id, table.created_at),
}));
