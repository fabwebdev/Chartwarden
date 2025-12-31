import { pgTable, primaryKey, bigint, text, timestamp, index } from 'drizzle-orm/pg-core';
import { users } from './user.schema.js';
import { roles } from './role.schema.js';

export const user_has_roles = pgTable('user_has_roles', {
  user_id: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  role_id: bigint('role_id', { mode: 'number' })
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
  assigned_at: timestamp('assigned_at').defaultNow().notNull(),
  assigned_by: text('assigned_by').references(() => users.id, { onDelete: 'set null' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.user_id, table.role_id] }),
  user_id_idx: index('user_has_roles_user_id_idx').on(table.user_id),
  role_id_idx: index('user_has_roles_role_id_idx').on(table.role_id),
}));