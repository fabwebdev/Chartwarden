import dotenv from "dotenv";
import { eq, and } from "drizzle-orm";

import auth from "../config/betterAuth.js";
import { db } from "../config/db.drizzle.js";
import { users, roles, user_has_roles } from "../db/schemas/index.js";

import { logger } from './logger.js';
dotenv.config();

function sanitize(value) {
  if (!value || typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export default async function createAdminUser(
  email,
  password,
  name,
  firstName,
  lastName
) {
  const normalizedEmail = sanitize(email);
  const normalizedPassword = password?.trim();

  if (!normalizedEmail) {
    throw new Error("Email is required");
  }

  if (!normalizedPassword) {
    throw new Error("Password is required");
  }

  // Validate password length before calling Better Auth
  // Better Auth requires minimum 12 characters (HIPAA requirement)
  if (normalizedPassword.length < 12) {
    throw new Error(
      `Password must be at least 12 characters long (HIPAA requirement). Current length: ${normalizedPassword.length}`
    );
  }

  const displayName =
    sanitize(name) ||
    [sanitize(firstName), sanitize(lastName)].filter(Boolean).join(" ") ||
    "Admin User";

  const existingUsers = await db
    .select()
    .from(users)
    .where(eq(users.email, normalizedEmail))
    .limit(1);

  if (existingUsers.length > 0) {
    throw new Error("User with this email already exists. Use a unique email.");
  }

  let signupResponse;
  try {
    signupResponse = await auth.api.signUpEmail({
      body: {
        email: normalizedEmail,
        password: normalizedPassword,
        name: displayName,
      },
      headers: {},
      cookies: {},
    });
  } catch (authError) {
    // Handle Better Auth validation errors
    logger.error("Better Auth signup error:", authError);
    
    // Check for password validation errors
    if (authError.message?.includes("too short") || authError.message?.includes("Password is too short")) {
      throw new Error(
        "Password must be at least 12 characters long (HIPAA requirement)"
      );
    }
    
    // Re-throw other errors with context
    throw new Error(
      `Failed to create user via Better Auth: ${authError.message || "Unknown error"}`
    );
  }

  const userId = signupResponse?.user?.id;

  if (!userId) {
    throw new Error("Failed to create user via Better Auth: No user ID returned");
  }

  await db
    .update(users)
    .set({
      name: displayName,
      firstName: sanitize(firstName),
      lastName: sanitize(lastName),
      // Don't overwrite password - Better Auth already hashed it correctly during signUpEmail
      role: "admin",
      emailVerified: true,
      updatedAt: new Date(),
    })
    .where(eq(users.id, userId));

  const adminRole = await db
    .select()
    .from(roles)
    .where(eq(roles.name, "admin"))
    .limit(1);

  if (adminRole.length === 0) {
    throw new Error("Admin role not found in the database");
  }

  const roleId = adminRole[0].id;

  const existingAssignment = await db
    .select()
    .from(user_has_roles)
    .where(
      and(
        eq(user_has_roles.user_id, userId),
        eq(user_has_roles.role_id, roleId)
      )
    )
    .limit(1);

  if (existingAssignment.length === 0) {
    await db.insert(user_has_roles).values({
      user_id: userId,
      role_id: roleId,
    });
  }

  return {
    id: userId,
    email: normalizedEmail,
    name: displayName,
    role: "admin",
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const [, , cliEmail, cliPassword, cliName] = process.argv;

  createAdminUser(cliEmail, cliPassword, cliName)
    .then((result) => {
      logger.info("Admin user created:", result)
      process.exit(0);
    })
    .catch((error) => {
      logger.error("Failed to create admin user:", error)
      process.exit(1);
    });
}
