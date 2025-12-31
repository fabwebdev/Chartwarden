import { pgTable, primaryKey, bigint, timestamp, text, index } from "drizzle-orm/pg-core";
import { roles } from './role.schema.js';
import { permissions } from './permission.schema.js';
import { users } from './user.schema.js';

export const role_has_permissions = pgTable(
  "role_has_permissions",
  {
    permission_id: bigint("permission_id", { mode: "number" })
      .notNull()
      .references(() => permissions.id, { onDelete: 'cascade' }),
    role_id: bigint("role_id", { mode: "number" })
      .notNull()
      .references(() => roles.id, { onDelete: 'cascade' }),
    assigned_at: timestamp('assigned_at').defaultNow().notNull(),
    assigned_by: text('assigned_by').references(() => users.id, { onDelete: 'set null' }),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.permission_id, table.role_id] }),
    permission_id_idx: index('role_has_permissions_permission_id_idx').on(table.permission_id),
    role_id_idx: index('role_has_permissions_role_id_idx').on(table.role_id),
  })
);
