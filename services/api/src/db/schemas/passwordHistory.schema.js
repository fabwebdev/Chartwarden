/**
 * Password History Schema
 *
 * Stores hashed versions of user's previous passwords to prevent reuse.
 * HIPAA compliance requires password history tracking (minimum 6 passwords).
 *
 * SECURITY:
 * - Only stores hashed passwords, never plain text
 * - Used to enforce password reuse prevention
 * - Automatically cleaned up to maintain only required history
 */

import {
  pgTable,
  text,
  timestamp,
  index,
} from 'drizzle-orm/pg-core';
import { nanoid } from 'nanoid';
import { users } from './user.schema.js';

export const passwordHistory = pgTable('password_history', {
  id: text('id')
    .primaryKey()
    .$defaultFn(() => nanoid()),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index('password_history_user_id_idx').on(table.userId),
  createdAtIdx: index('password_history_created_at_idx').on(table.createdAt),
}));
