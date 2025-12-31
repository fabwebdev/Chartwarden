import { pgTable, bigint, varchar, timestamp, text, boolean, index, uniqueIndex } from 'drizzle-orm/pg-core';

export const permissions = pgTable('permissions', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  // Resource-based permissions (e.g., resource='patients', action='read')
  resource: varchar('resource', { length: 100 }).notNull(),
  action: varchar('action', { length: 50 }).notNull(), // create, read, update, delete, manage
  description: text('description'),
  guard_name: varchar('guard_name', { length: 255 }).notNull().default('web'),
  is_active: boolean('is_active').default(true).notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  name_idx: index('permissions_name_idx').on(table.name),
  resource_idx: index('permissions_resource_idx').on(table.resource),
  action_idx: index('permissions_action_idx').on(table.action),
  resource_action_idx: uniqueIndex('permissions_resource_action_idx').on(table.resource, table.action),
}));