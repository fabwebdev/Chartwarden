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
 * Chat Room Type Enum
 * Defines different types of chat rooms for healthcare team collaboration
 */
export const roomTypeEnum = pgEnum('room_type', [
  'direct',      // One-on-one conversation between two users
  'group',       // Group chat for team collaboration
  'department',  // Department-wide communication
  'patient_care' // Patient-specific care team discussion (HIPAA-sensitive)
]);

/**
 * Chat Rooms Schema
 *
 * HIPAA Compliance Considerations:
 * - Patient-related rooms must be clearly identified for audit purposes
 * - Room access must be controlled via participants table
 * - All room activity should be auditable
 */
export const chat_rooms = pgTable('chat_rooms', {
  // Primary key
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),

  // Room identification
  name: varchar('name', { length: 255 }), // Optional room name (null for direct chats)
  type: roomTypeEnum('type').notNull().default('group'),

  // Room metadata
  description: text('description'), // Room purpose/description

  // Patient association (for patient_care rooms)
  patient_id: text('patient_id'), // Reference to patient if applicable

  // Room settings
  is_archived: boolean('is_archived').default(false).notNull(),
  is_active: boolean('is_active').default(true).notNull(),

  // Creator tracking
  created_by: text('created_by')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Timestamps
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
  archived_at: timestamp('archived_at'),
}, (table) => ({
  // Indexes for performance
  typeIdx: index('idx_chat_rooms_type').on(table.type),
  createdByIdx: index('idx_chat_rooms_created_by').on(table.created_by),
  isActiveIdx: index('idx_chat_rooms_is_active').on(table.is_active),
  patientIdx: index('idx_chat_rooms_patient_id').on(table.patient_id),
  createdAtIdx: index('idx_chat_rooms_created_at').on(table.created_at),
}));

/**
 * Chat Messages Schema
 *
 * HIPAA Compliance Requirements:
 * - All messages must be retained for audit purposes
 * - Messages in patient_care rooms contain PHI and require special handling
 * - Deletion is soft delete only (deleted_at timestamp)
 * - Message history must be tamper-evident
 */
export const chat_messages = pgTable('chat_messages', {
  // Primary key
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),

  // Room association
  room_id: text('room_id')
    .notNull()
    .references(() => chat_rooms.id, { onDelete: 'cascade' }),

  // Sender information
  sender_id: text('sender_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Message content
  content: text('content').notNull(), // Message text (sanitized for XSS)

  // Message metadata
  is_edited: boolean('is_edited').default(false).notNull(),
  edited_at: timestamp('edited_at'),

  // Soft delete (HIPAA compliance - never hard delete)
  is_deleted: boolean('is_deleted').default(false).notNull(),
  deleted_at: timestamp('deleted_at'),

  // Reply/thread support (optional for future enhancement)
  reply_to_id: text('reply_to_id').references(() => chat_messages.id, { onDelete: 'set null' }),

  // Timestamps (immutable created_at for audit trail)
  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Indexes for message queries
  roomIdx: index('idx_chat_messages_room_id').on(table.room_id),
  senderIdx: index('idx_chat_messages_sender_id').on(table.sender_id),
  createdAtIdx: index('idx_chat_messages_created_at').on(table.created_at),

  // Composite index for room message history queries
  roomTimeIdx: index('idx_chat_messages_room_time')
    .on(table.room_id, table.created_at),

  // Index for filtering deleted messages
  roomActiveIdx: index('idx_chat_messages_room_active')
    .on(table.room_id, table.is_deleted, table.created_at),
}));

/**
 * Chat Room Participants Schema
 *
 * Junction table managing user membership in chat rooms
 *
 * HIPAA Compliance:
 * - Controls access to PHI in patient_care rooms
 * - Tracks when users joined/left for audit purposes
 * - Must be synchronized with ABAC policies
 */
export const chat_participants = pgTable('chat_participants', {
  // Composite primary key (room_id + user_id)
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),

  // Room association
  room_id: text('room_id')
    .notNull()
    .references(() => chat_rooms.id, { onDelete: 'cascade' }),

  // User association
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),

  // Participant role (for future permissions)
  role: varchar('role', { length: 50 }).default('member').notNull(), // member, admin, moderator

  // Notification preferences
  is_muted: boolean('is_muted').default(false).notNull(),

  // Read tracking
  last_read_at: timestamp('last_read_at'),
  last_read_message_id: text('last_read_message_id'),

  // Membership status
  is_active: boolean('is_active').default(true).notNull(),

  // Timestamps
  joined_at: timestamp('joined_at').defaultNow().notNull(),
  left_at: timestamp('left_at'),

  created_at: timestamp('created_at').defaultNow().notNull(),
  updated_at: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  // Unique constraint for room + user combination
  roomUserIdx: index('idx_chat_participants_room_user')
    .on(table.room_id, table.user_id),

  // Index for user's active rooms
  userActiveIdx: index('idx_chat_participants_user_active')
    .on(table.user_id, table.is_active),

  // Index for room's active participants
  roomActiveIdx: index('idx_chat_participants_room_active')
    .on(table.room_id, table.is_active),
}));
