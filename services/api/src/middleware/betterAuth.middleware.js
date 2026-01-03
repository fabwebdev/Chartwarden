import auth from "../config/betterAuth.js";
import { fromNodeHeaders } from "better-auth/node";
import { ROLES } from "../config/rbac.js";
import { db } from "../config/db.drizzle.js";
import { users, user_has_roles, roles } from "../db/schemas/index.js";
import { eq } from "drizzle-orm";

import { debug, info, warn, error } from '../utils/logger.js';
/**
 * Middleware to protect routes with Better Auth session validation
 * Replaces the old JWT authentication middleware
 */
export const authenticate = async (request, reply) => {
  try {
    // Debug: Log cookies received
    const sessionToken = request.cookies?.["better-auth.session_token"];
    debug("Authentication attempt", {
      hasCookie: !!sessionToken,
      cookieCount: Object.keys(request.cookies || {}).length,
    });

    // Get session from Better Auth
    let session;
    try {
      session = await auth.api.getSession({
        headers: fromNodeHeaders(request.headers),
        cookies: request.cookies,
      });
    } catch (err) {
      error("Better Auth getSession error", {
        message: err.message,
        code: err.code,
        detail: err.detail,
        hint: err.hint,
      });

      // If it's a table not found error, provide helpful message
      if (err.message?.includes("does not exist") || err.code === "42P01") {
        warn("Database table error detected. Check if sessions table exists in public schema.");
      }

      return reply.code(500).send({
        status: 500,
        message: "Server error during session validation.",
        error:
          process.env.NODE_ENV === "development" ? err.message : undefined,
      });
    }

    if (!session) {
      // WORKAROUND: Better Auth v1.4.9 has a bug where getSession() returns null
      // even when valid sessions exist. Validate directly from database.
      if (sessionToken) {
        try {
          const { db } = await import("../config/db.drizzle.js");
          const { sessions, users } = await import("../db/schemas/index.js");
          const { eq, and, gt } = await import("drizzle-orm");

          const [dbSession] = await db
            .select()
            .from(sessions)
            .where(
              and(
                eq(sessions.token, sessionToken),
                gt(sessions.expiresAt, new Date()) // Check not expired
              )
            )
            .limit(1);

          if (dbSession) {
            // Session found and valid - manually construct session object
            const [dbUser] = await db
              .select()
              .from(users)
              .where(eq(users.id, dbSession.userId))
              .limit(1);

            if (dbUser) {
              // Manually construct session object matching Better Auth format
              session = {
                session: {
                  id: dbSession.id,
                  userId: dbSession.userId,
                  expiresAt: dbSession.expiresAt,
                  token: dbSession.token,
                  ipAddress: dbSession.ipAddress,
                  userAgent: dbSession.userAgent,
                },
                user: {
                  id: dbUser.id,
                  email: dbUser.email,
                  name: dbUser.name,
                  emailVerified: dbUser.emailVerified,
                  image: dbUser.image,
                  createdAt: dbUser.createdAt,
                  updatedAt: dbUser.updatedAt,
                },
              };

              debug("Session validated via database workaround");
            }
          } else {
            warn("Session token invalid or expired");
          }
        } catch (dbError) {
          error("Error validating session from database", dbError);
        }
      }

      // If still no session after database check, return 401
      if (!session) {
        return reply.code(401).send({
          status: 401,
          message: "Access denied. No valid session found.",
        });
      }
    }

    debug("Session found for authenticated user");

    // Fetch full user record from database to get firstName and lastName
    let fullUser = session.user;
    try {
      const dbUser = await db
        .select()
        .from(users)
        .where(eq(users.id, session.user.id))
        .limit(1);

      if (dbUser.length > 0) {
        // Merge Better Auth user data with database user data (including firstName and lastName)
        // Use database email as-is (it should have original case if stored correctly)
        // Better Auth stores lowercase, but we'll use what's in database
        fullUser = {
          ...session.user,
          email: dbUser[0].email, // Use email from database (may have original case)
          firstName: dbUser[0].firstName || null,
          lastName: dbUser[0].lastName || null,
        };
      }
    } catch (userFetchError) {
      error("Error fetching user details from database", userFetchError);
      // Continue with session.user if database fetch fails
    }

    // Add user info to request object
    request.user = fullUser;
    request.betterAuthSession = session; // Use a different property name to avoid conflicts

    // Load user's role from database
    try {
      // Get user roles from user_has_roles table
      const userRoles = await db
        .select()
        .from(user_has_roles)
        .where(eq(user_has_roles.user_id, session.user.id))
        .limit(1);

      if (userRoles.length > 0) {
        // Get the role name from roles table
        const roleRecords = await db
          .select()
          .from(roles)
          .where(eq(roles.id, userRoles[0].role_id))
          .limit(1);

        if (roleRecords.length > 0) {
          request.user.role = roleRecords[0].name; // Set actual role from database
        } else {
          request.user.role = ROLES.PATIENT; // Default if role not found
        }
      } else {
        request.user.role = ROLES.PATIENT; // Default if no role assigned
      }
    } catch (roleError) {
      error("Error loading user role", roleError);
      request.user.role = ROLES.PATIENT; // Default on error
    }
  } catch (err) {
    error("Authentication error", {
      err,
      method: request.method,
      path: request.url,
    });
    return reply.code(500).send({
      status: 500,
      message: "Server error during authentication.",
      error: err.message,
      details: process.env.NODE_ENV === "development" ? err.stack : undefined,
    });
  }
};

// For compatibility with Laravel's verifyToken
export const verifyToken = authenticate;

// Middleware to get optional session (for routes that can be accessed by both authenticated and unauthenticated users)
export const optionalAuth = async (request, reply) => {
  try {
    // Get session from Better Auth (if exists)
    const session = await auth.api.getSession({
      headers: fromNodeHeaders(request.headers),
      cookies: request.cookies,
    });

    // Add user info to request object if session exists
    if (session) {
      request.user = session.user;
      request.betterAuthSession = session; // Use a different property name to avoid conflicts

      // Load user's role from database
      try {
        // Get user roles from user_has_roles table
        const userRoles = await db
          .select()
          .from(user_has_roles)
          .where(eq(user_has_roles.user_id, session.user.id))
          .limit(1);

        if (userRoles.length > 0) {
          // Get the role name from roles table
          const roleRecords = await db
            .select()
            .from(roles)
            .where(eq(roles.id, userRoles[0].role_id))
            .limit(1);

          if (roleRecords.length > 0) {
            request.user.role = roleRecords[0].name; // Set actual role from database
          } else {
            request.user.role = ROLES.PATIENT; // Default if role not found
          }
        } else {
          request.user.role = ROLES.PATIENT; // Default if no role assigned
        }
      } catch (roleError) {
        error("Error loading user role", roleError);
        request.user.role = ROLES.PATIENT; // Default on error
      }
    }
  } catch (err) {
    error("Optional authentication error", err);
    // Still continue even if there's an error, as this is optional auth
  }
};

export default authenticate;
