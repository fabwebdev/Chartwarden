import { pgTable, bigint, varchar, timestamp, boolean, text, integer, index } from 'drizzle-orm/pg-core';

export const roles = pgTable('roles', {
  id: bigint('id', { mode: 'number' }).primaryKey().generatedByDefaultAsIdentity(),
  name: varchar('name', { length: 255 }).notNull().unique(),
  display_name: varchar('display_name', { length: 255 }),
  description: text('description'),
  guard_name: varchar('guard_name', { length: 255 }).notNull().default('web'),
  // Role hierarchy: lower number = higher privilege (e.g., admin=1, manager=10, user=100)
  hierarchy_level: integer('hierarchy_level').default(100).notNull(),
  is_active: boolean('is_active').default(true).notNull(),
  is_system: boolean('is_system').default(false).notNull(), // System roles cannot be deleted
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
}, (table) => ({
  name_idx: index('roles_name_idx').on(table.name),
  hierarchy_idx: index('roles_hierarchy_level_idx').on(table.hierarchy_level),
  is_active_idx: index('roles_is_active_idx').on(table.is_active),
}));