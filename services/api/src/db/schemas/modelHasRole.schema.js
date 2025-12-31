import { pgTable, primaryKey, bigint, varchar, timestamp, text, index } from 'drizzle-orm/pg-core';
import { roles } from './role.schema.js';
import { users } from './user.schema.js';

export const model_has_roles = pgTable('model_has_roles', {
  role_id: bigint('role_id', { mode: 'number' })
    .notNull()
    .references(() => roles.id, { onDelete: 'cascade' }),
  model_type: varchar('model_type', { length: 255 }).notNull(),
  model_id: bigint('model_id', { mode: 'number' }).notNull(),
  assigned_at: timestamp('assigned_at').defaultNow().notNull(),
  assigned_by: text('assigned_by').references(() => users.id, { onDelete: 'set null' }),
}, (table) => ({
  pk: primaryKey({ columns: [table.role_id, table.model_type, table.model_id] }),
  role_id_idx: index('model_has_roles_role_id_idx').on(table.role_id),
  model_type_idx: index('model_has_roles_model_type_idx').on(table.model_type),
  model_id_idx: index('model_has_roles_model_id_idx').on(table.model_id),
}));