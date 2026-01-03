import {
  pgTable,
  text,
  varchar,
  boolean,
  timestamp,
  index,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { nanoid } from "nanoid";

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => nanoid()),
  name: varchar("name", { length: 255 }).notNull(),
  firstName: varchar("first_name", { length: 255 }),
  lastName: varchar("last_name", { length: 255 }),
  email: varchar("email", { length: 255 }).notNull().unique(),
  image: varchar("image", { length: 255 }),
  emailVerified: boolean("emailVerified").default(false).notNull(),
  password: varchar("password", { length: 255 }),
  remember_token: varchar("remember_token", { length: 255 }),
  role: varchar("role", { length: 255 }).default("patient"),
  contact: varchar("contact", { length: 255 }),
  // HIPAA compliance fields
  is_active: boolean("is_active").default(true).notNull(),
  last_login_at: timestamp("last_login_at"),
  password_changed_at: timestamp("password_changed_at"),
  failed_login_attempts: varchar("failed_login_attempts", { length: 10 }).default("0"),
  locked_until: timestamp("locked_until"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().notNull(),
  deleted_at: timestamp("deleted_at"),
}, (table) => ({
  email_idx: index("users_email_idx").on(table.email),
  is_active_idx: index("users_is_active_idx").on(table.is_active),
  role_idx: index("users_role_idx").on(table.role),
}));

// Relations will be defined in index.js to avoid circular dependencies