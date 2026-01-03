// Auth routes are now handled by Better Auth
// This file is kept for backward compatibility and custom auth routes
// All standard /api/auth/* routes are handled by Better Auth via server.js

import crypto from "crypto";
import auth from "../config/betterAuth.js";
import { fromNodeHeaders } from "better-auth/node";
import {
  authenticate,
  optionalAuth,
} from "../middleware/betterAuth.middleware.js";
import {
  requireRole,
  requirePermission,
} from "../middleware/rbac.middleware.js";
import { ROLES, PERMISSIONS } from "../config/rbac.js";
import { defineUserAbilities, serializeAbilities, ACTIONS, SUBJECTS } from "../config/casl.js";
import { db } from "../config/db.drizzle.js";
import { users, roles, user_has_roles, sessions } from "../db/schemas/index.js";
import { eq, and, gt, desc } from "drizzle-orm";
import { validatePassword, PASSWORD_REQUIREMENTS } from "../utils/passwordSecurity.js";
import { passwordHashingService } from "../services/PasswordHashing.service.js";

import { logger } from '../utils/logger.js';
// Rate limit key generator (IP + email combination for better security)
function authRateLimitKey(request) {
  const ip = request.ip || request.headers['x-forwarded-for'] || 'unknown';
  const email = request.body?.email || request.body?.username || '';
  if (email) {
    return `${ip}:${email.toLowerCase()}`;
  }
  return ip;
}

// Fastify plugin for auth routes
async function authRoutes(fastify, options) {
  // Sign up route with rate limiting
  // CSRF protection disabled for auth endpoints (cookie-based auth is sufficient)
  fastify.post("/sign-up", {
    config: {
      csrfProtection: false,
      rateLimit: {
        max: 3, // 3 signup attempts
        timeWindow: '1 hour', // per hour
        keyGenerator: authRateLimitKey,
        errorResponseBuilder: function(request, context) {
          return {
            status: 429,
            error: 'Too Many Signup Attempts',
            message: 'Too many signup attempts. Please try again in 1 hour.',
            retryAfter: context.after
          };
        }
      }
    }
  }, async (request, reply) => {
    try {
      // SECURITY: TICKET #006 - Validate password strength before signup
      const { password, email, firstName, lastName } = request.body;

      if (password) {
        // Validate password with comprehensive security checks
        const passwordValidation = await validatePassword(password, {
          userInputs: [email, firstName, lastName].filter(Boolean)
        });

        if (!passwordValidation.valid) {
          return reply.code(422).send({
            status: 422,
            message: 'Password does not meet security requirements',
            errors: passwordValidation.errors.map(error => ({
              type: 'field',
              msg: error,
              path: 'password',
              location: 'body'
            })),
            suggestions: passwordValidation.suggestions,
            strength: {
              score: passwordValidation.strength?.score,
              crackTime: passwordValidation.strength?.crackTime
            }
          });
        }

        // Log warnings (if any)
        if (passwordValidation.warnings.length > 0) {
          logger.warn('Password validation warnings:', passwordValidation.warnings)
        }
      }

      let response;
      try {
        response = await auth.api.signUpEmail({
          body: request.body,
          headers: fromNodeHeaders(request.headers),
          cookies: request.cookies,
        });
      } catch (authError) {
        // Handle Better Auth validation errors
        logger.error("Better Auth signup error:", authError);
        
        // Check for password validation errors
        if (authError.message?.includes("too short") || authError.message?.includes("Password is too short")) {
          return reply.code(422).send({
            status: 422,
            message: "Password validation failed",
            errors: [
              {
                type: "field",
                msg: "Password must be at least 12 characters long (HIPAA requirement)",
                path: "password",
                location: "body",
              },
            ],
          });
        }
        
        // Handle other Better Auth errors
        return reply.code(400).send({
          status: 400,
          message: "Failed to create user account",
          error: authError.message || "Unknown error during signup",
        });
      }

      // Set session cookie manually since Better Auth API methods don't set cookies
      // The token returned by Better Auth should be set as the session cookie
      if (response && response.token) {
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'test',
          sameSite: process.env.NODE_ENV === 'test' ? 'lax' : 'none',
          path: '/',
          maxAge: 60 * 60 * 8, // 8 hours to match Better Auth session config
        };

        // Set the Better Auth session cookie
        reply.setCookie('better-auth.session_token', response.token, cookieOptions);
      }

      // Instead of returning the token in the response body,
      // we'll rely on the cookies being set by Better Auth
      if (response && response.user) {
        const { token, headers, ...userData } = response;

        // Update user with firstName and lastName (required fields)
        try {
          const { firstName, lastName } = request.body;

          // Validate firstName and lastName are provided
          if (!firstName || !lastName) {
            return reply.code(400).send({
              status: 400,
              message: "Validation failed",
              errors: [
                ...(!firstName
                  ? [
                      {
                        type: "field",
                        msg: "First name is required",
                        path: "firstName",
                        location: "body",
                      },
                    ]
                  : []),
                ...(!lastName
                  ? [
                      {
                        type: "field",
                        msg: "Last name is required",
                        path: "lastName",
                        location: "body",
                      },
                    ]
                  : []),
              ],
            });
          }

          // Update user with firstName and lastName
          const updateData = {
            firstName: firstName.trim(),
            lastName: lastName.trim(),
          };

          await db
            .update(users)
            .set(updateData)
            .where(eq(users.id, response.user.id));

          console.log(
            `Updated user ${response.user.id} with firstName/lastName`
          );
        } catch (nameUpdateError) {
          logger.error("Error updating firstName/lastName:", nameUpdateError)
          return reply.code(500).send({
            status: 500,
            message: "Error saving user details",
          });
        }

        // Assign default role to the user
        try {
          // Get the "patient" role from the database
          const patientRole = await db
            .select()
            .from(roles)
            .where(eq(roles.name, "patient"))
            .limit(1);

          if (patientRole.length > 0) {
            // Insert the user-role association
            await db.insert(user_has_roles).values({
              user_id: response.user.id,
              role_id: parseInt(patientRole[0].id), // Convert to integer
            });

            console.log(
              `Assigned default 'patient' role to user ${response.user.id}`
            );
          } else {
            console.warn(
              "Patient role not found in database. Skipping role assignment."
            );
          }
        } catch (roleError) {
          logger.error("Error assigning default role:", roleError)
          // Don't fail the signup if role assignment fails, just log it
        }

        // Fetch updated user with firstName and lastName
        const updatedUser = await db
          .select()
          .from(users)
          .where(eq(users.id, response.user.id))
          .limit(1);

        const userResponse =
          updatedUser.length > 0 ? updatedUser[0] : userData.user;
        const { password, ...userWithoutPassword } = userResponse;

        return reply.send({
          status: 200,
          message: "User registered successfully",
          data: {
            user: userWithoutPassword,
          },
        });
      } else {
        // Handle case where response structure is different
        return reply.send({
          status: 200,
          message: "User registered successfully",
          data: {
            user: response,
          },
        });
      }
    } catch (error) {
      logger.error("Sign up error:", error)
      return reply.code(500).send({
        status: 500,
        message: "Server error during sign up",
      });
    }
  });

  // Sign in route with rate limiting (prevent brute-force)
  fastify.post("/sign-in", {
    config: {
      csrfProtection: false, // Cookie-based auth is sufficient
      rateLimit: {
        max: 5, // 5 login attempts
        timeWindow: '15 minutes', // per 15 minutes
        keyGenerator: authRateLimitKey,
        errorResponseBuilder: function(request, context) {
          return {
            status: 429,
            error: 'Too Many Login Attempts',
            message: 'Too many login attempts. Please try again in 15 minutes.',
            retryAfter: context.after,
            lockoutDuration: '15 minutes'
          };
        }
      }
    }
  }, async (request, reply) => {
    try {
      // Authenticate with Better Auth
      const response = await auth.api.signInEmail({
        body: request.body,
        headers: fromNodeHeaders(request.headers),
        cookies: request.cookies,
      });

      if (!response || !response.user) {
        return reply.code(401).send({
          status: 401,
          message: "Invalid email or password",
          code: "INVALID_EMAIL_OR_PASSWORD",
        });
      }

      // Set session cookie manually since Better Auth API methods don't set cookies
      // The token returned by Better Auth should be set as the session cookie
      if (response && response.token) {
        const cookieOptions = {
          httpOnly: true,
          secure: process.env.NODE_ENV !== 'test',
          sameSite: process.env.NODE_ENV === 'test' ? 'lax' : 'none',
          path: '/',
          maxAge: 60 * 60 * 8, // 8 hours to match Better Auth session config
        };

        // Set the Better Auth session cookie
        reply.setCookie('better-auth.session_token', response.token, cookieOptions);
      }

      // Check if Better Auth created a session automatically
      // With autoSignIn: true, it should create a session
      let session = null;
      try {
        session = await auth.api.getSession({
          headers: fromNodeHeaders(request.headers),
          cookies: request.cookies,
        });

        if (session) {
          logger.info("✅ Better Auth created session automatically")
        } else {
          logger.info("⚠️ Better Auth didn't create session, checking DB...")

          // Check if session exists in DB but Better Auth can't read it
          const dbSessions = await db
            .select()
            .from(sessions)
            .where(
              and(
                eq(sessions.userId, response.user.id),
                gt(sessions.expiresAt, new Date())
              )
            )
            .orderBy(desc(sessions.createdAt))
            .limit(1);

          if (dbSessions.length > 0) {
            console.log(
              "📦 Session exists in DB but Better Auth can't read it"
            );
            console.log(
              "   Token format might be wrong. Token preview:",
              dbSessions[0].token.substring(0, 20)
            );
          } else {
            logger.info("❌ No session found in DB either")
          }
        }
      } catch (sessionError) {
        logger.error("Error checking session:", sessionError)
      }

      // Get user's full details from database (including firstName, lastName, and role)
      let userRole = ROLES.PATIENT;

      // Preserve original email case from request body
      const originalEmail = request.body?.email || response.user.email;

      let fullUser = {
        ...response.user,
        email: originalEmail, // Always use original email case from request
      };

      try {
        // Fetch complete user record from database to get firstName and lastName
        const dbUser = await db
          .select()
          .from(users)
          .where(eq(users.id, response.user.id))
          .limit(1);

        if (dbUser.length > 0) {
          // Update email in database to preserve original case (if different)
          if (dbUser[0].email.toLowerCase() !== originalEmail.toLowerCase()) {
            // Email case is different, update it in database
            await db
              .update(users)
              .set({ email: originalEmail })
              .where(eq(users.id, response.user.id));
            console.log(
              `📧 Updated email case in database: ${dbUser[0].email} → ${originalEmail}`
            );
          }

          fullUser = {
            ...response.user,
            email: originalEmail, // Keep original email case from request, not from database
            firstName: dbUser[0].firstName || null,
            lastName: dbUser[0].lastName || null,
          };
        }

        // Get user's role from database
        const userRoles = await db
          .select()
          .from(user_has_roles)
          .where(eq(user_has_roles.user_id, response.user.id))
          .limit(1);

        if (userRoles.length > 0) {
          const roleRecords = await db
            .select()
            .from(roles)
            .where(eq(roles.id, userRoles[0].role_id))
            .limit(1);

          if (roleRecords.length > 0) {
            userRole = roleRecords[0].name;
          }
        }
      } catch (error) {
        logger.error("Error loading user details during sign-in:", error)
        // Continue with response.user if database fetch fails
      }

      // Remove password from response if present
      const { password, ...userWithoutPassword } = fullUser;

      return reply.send({
        status: 200,
        message: "User logged in successfully",
        data: {
          user: {
            ...userWithoutPassword,
            role: userRole,
          },
        },
      });
    } catch (error) {
      logger.error("Sign in error:", error)

      // Handle Better Auth specific errors
      if (error.statusCode === 401 || error.status === "UNAUTHORIZED") {
        return reply.code(401).send({
          status: 401,
          message: error.body?.message || "Invalid email or password",
          code: error.body?.code || "INVALID_EMAIL_OR_PASSWORD",
        });
      }

      return reply.code(500).send({
        status: 500,
        message: "Server error during sign in",
      });
    }
  });

  // Sign out route
  fastify.post("/sign-out", {
    config: {
      csrfProtection: false // Cookie-based auth is sufficient
    }
  }, async (request, reply) => {
    try {
      // Get the session token from cookies
      const sessionToken = request.cookies['better-auth.session_token'];

      // Delete session from database if token exists
      if (sessionToken) {
        try {
          await db
            .delete(sessions)
            .where(eq(sessions.token, sessionToken));
        } catch (dbError) {
          logger.warn("Error deleting session from database:", dbError.message);
        }
      }

      // Clear the session cookie
      reply.clearCookie('better-auth.session_token', {
        path: '/',
        httpOnly: true,
        secure: process.env.NODE_ENV !== 'test',
        sameSite: process.env.NODE_ENV === 'test' ? 'lax' : 'none',
      });

      return reply.send({
        status: 200,
        message: "User logged out successfully",
      });
    } catch (error) {
      logger.error("Sign out error:", error)
      return reply.code(500).send({
        status: 500,
        message: "Server error during sign out",
      });
    }
  });

  // Test RBAC - Admin only route
  fastify.get(
    "/admin-only",
    {
      preHandler: [authenticate, requireRole(ROLES.ADMIN)],
    },
    async (request, reply) => {
      return {
        status: 200,
        message: "Welcome, Admin!",
        data: {
          user: request.user,
          role: request.user.role,
        },
      };
    }
  );

  // Test RBAC - Healthcare staff only route
  fastify.get(
    "/medical-staff",
    {
      preHandler: [
        authenticate,
        requireRole(ROLES.ADMIN, ROLES.DOCTOR, ROLES.NURSE),
      ],
    },
    async (request, reply) => {
      return {
        status: 200,
        message: "Welcome, Medical Staff!",
        data: {
          user: request.user,
          role: request.user.role,
        },
      };
    }
  );

  // Test RBAC - Permission based route
  fastify.get(
    "/view-patients",
    {
      preHandler: [authenticate, requirePermission(PERMISSIONS.VIEW_PATIENT)],
    },
    async (request, reply) => {
      return {
        status: 200,
        message: "You have permission to view patients!",
        data: {
          user: request.user,
          role: request.user.role,
        },
      };
    }
  );

  // Get current user profile with role and permissions
  fastify.get(
    "/me",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const { ROLE_PERMISSIONS } = await import("../config/rbac.js");
        const userRole = request.user.role || ROLES.PATIENT;
        const permissions = ROLE_PERMISSIONS[userRole] || [];

        // Ensure we're using the email from request.user (which comes from database via middleware)
        // The middleware already fetches from database and preserves email case
        const userData = {
          ...request.user,
          role: userRole,
          permissions: permissions,
        };

        logger.info("📧 /api/auth/me - Returning user email:", userData.email)
        logger.info("📧 /api/auth/me - User ID:", userData.id)

        return {
          status: 200,
          message: "User profile retrieved successfully",
          data: {
            user: userData,
          },
        };
      } catch (error) {
        logger.error("Error fetching user profile:", error)
        reply.code(500);
        return {
          status: 500,
          message: "Server error while fetching user profile",
        };
      }
    }
  );

  // Get user's CASL abilities for frontend isomorphic authorization
  fastify.get(
    "/abilities",
    {
      preHandler: [authenticate],
    },
    async (request, reply) => {
      try {
        const user = request.user;

        // Build user abilities
        const ability = defineUserAbilities(user);

        // Serialize for frontend consumption
        const serialized = serializeAbilities(ability, user);

        return {
          status: 200,
          message: "User abilities retrieved successfully",
          data: {
            abilities: serialized,
            // Include static definitions for frontend reference
            actions: ACTIONS,
            subjects: SUBJECTS,
          },
        };
      } catch (error) {
        logger.error("Error fetching user abilities:", error);
        reply.code(500);
        return {
          status: 500,
          message: "Server error while fetching user abilities",
        };
      }
    }
  );

  // Special endpoint to create admin users
  // SECURITY FIX: Require ADMIN_SECRET environment variable for admin creation
  // This prevents unauthorized admin creation in production
  fastify.post("/create-admin", {
    config: {
      csrfProtection: false, // Admin creation via secret key
      rateLimit: {
        max: 3, // 3 admin creation attempts
        timeWindow: '1 hour', // per hour
        keyGenerator: (request) => request.ip,
        errorResponseBuilder: function(request, context) {
          return {
            status: 429,
            error: 'Too Many Admin Creation Attempts',
            message: 'Too many admin creation attempts. Please try again later.',
            retryAfter: context.after
          };
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { email, password, name, firstName, lastName, adminSecret } = request.body;

      // SECURITY: Require ADMIN_SECRET for admin creation
      const requiredSecret = process.env.ADMIN_SECRET;

      // In production, ADMIN_SECRET must be set
      if (process.env.NODE_ENV === 'production' && !requiredSecret) {
        logger.error("ADMIN_SECRET not configured in production - admin creation disabled");
        return reply.code(503).send({
          status: 503,
          message: "Admin creation is not configured. Please contact system administrator.",
        });
      }

      // Validate admin secret if configured
      if (requiredSecret) {
        if (!adminSecret) {
          logger.warn("Admin creation attempt without secret", { ip: request.ip });
          return reply.code(403).send({
            status: 403,
            message: "Admin secret is required for admin creation.",
          });
        }

        // Use timing-safe comparison to prevent timing attacks
        const secretBuffer = Buffer.from(requiredSecret);
        const providedBuffer = Buffer.from(adminSecret);

        if (secretBuffer.length !== providedBuffer.length ||
            !crypto.timingSafeEqual(secretBuffer, providedBuffer)) {
          logger.warn("Invalid admin secret provided", { ip: request.ip });
          return reply.code(403).send({
            status: 403,
            message: "Invalid admin secret.",
          });
        }
      } else {
        // Development mode warning
        logger.warn(
          "SECURITY WARNING: Admin creation endpoint running without ADMIN_SECRET protection. Set ADMIN_SECRET environment variable."
        );
      }

      // Use Better Auth to create the admin user
      const signUpResponse = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name: name || `${firstName || ''} ${lastName || ''}`.trim(),
        },
        headers: fromNodeHeaders(request.headers),
      });

      if (!signUpResponse || !signUpResponse.user) {
        throw new Error('Failed to create user via Better Auth');
      }

      const userId = signUpResponse.user.id;

      // Update user with firstName and lastName
      await db
        .update(users)
        .set({
          firstName: firstName || null,
          lastName: lastName || null,
          emailVerified: true,
          is_active: true,
        })
        .where(eq(users.id, userId));

      // Assign admin role
      const [adminRole] = await db
        .select()
        .from(roles)
        .where(eq(roles.name, ROLES.ADMIN))
        .limit(1);

      if (!adminRole) {
        // Create admin role if it doesn't exist
        const [newRole] = await db
          .insert(roles)
          .values({
            name: ROLES.ADMIN,
            description: 'System Administrator',
          })
          .returning();

        await db.insert(user_has_roles).values({
          user_id: userId,
          role_id: newRole.id,
        });
      } else {
        await db.insert(user_has_roles).values({
          user_id: userId,
          role_id: adminRole.id,
        });
      }

      logger.info("Admin user created successfully", { email });

      return reply.send({
        status: 200,
        message: "Admin user created successfully",
        data: {
          id: userId,
          email,
          name: name || `${firstName || ''} ${lastName || ''}`.trim(),
          role: ROLES.ADMIN,
        },
      });
    } catch (error) {
      logger.error("Error creating admin user:", error);

      // Return specific error messages for known issues
      if (error.message?.includes('already exists')) {
        return reply.code(409).send({
          status: 409,
          message: "A user with this email already exists.",
        });
      }

      if (error.message?.includes('12 characters')) {
        return reply.code(422).send({
          status: 422,
          message: error.message,
        });
      }

      return reply.code(500).send({
        status: 500,
        message: "Server error while creating admin user",
      });
    }
  });

  // CSRF Token endpoint (SECURITY: TICKET #004)
  // Frontend should call this to get a CSRF token before making state-changing requests
  fastify.get("/csrf-token", async (request, reply) => {
    try {
      // Generate and return CSRF token (if CSRF plugin is enabled)
      const token = reply.generateCsrf ? await reply.generateCsrf() : 'test-csrf-token';

      return reply.send({
        status: 200,
        csrfToken: token
      });
    } catch (error) {
      logger.error("CSRF token generation error:", error);
      return reply.code(500).send({
        status: 500,
        message: "Error generating CSRF token",
      });
    }
  });

  // ============================================================================
  // PASSWORD MANAGEMENT ENDPOINTS
  // ============================================================================

  // Change password endpoint (requires authentication)
  fastify.post("/change-password", {
    preHandler: [authenticate],
    config: {
      csrfProtection: false, // Cookie-based auth is sufficient
      rateLimit: {
        max: 3, // 3 password change attempts
        timeWindow: '15 minutes', // per 15 minutes
        keyGenerator: (request) => request.user?.id || request.ip,
        errorResponseBuilder: function(request, context) {
          return {
            status: 429,
            error: 'Too Many Password Change Attempts',
            message: 'Too many password change attempts. Please try again in 15 minutes.',
            retryAfter: context.after
          };
        }
      }
    }
  }, async (request, reply) => {
    try {
      const { currentPassword, newPassword, revokeOtherSessions = false } = request.body;
      const userId = request.user.id;

      // Validate input
      if (!currentPassword || !newPassword) {
        return reply.code(400).send({
          status: 400,
          message: 'Current password and new password are required',
        });
      }

      // Validate new password against security requirements
      const passwordValidation = await validatePassword(newPassword, {
        userInputs: [request.user.email, request.user.firstName, request.user.lastName].filter(Boolean),
        userId: userId, // Enable password history check
      });

      if (!passwordValidation.valid) {
        return reply.code(422).send({
          status: 422,
          message: 'New password does not meet security requirements',
          errors: passwordValidation.errors.map(error => ({
            type: 'field',
            msg: error,
            path: 'newPassword',
            location: 'body'
          })),
          suggestions: passwordValidation.suggestions,
          strength: passwordValidation.strength ? {
            score: passwordValidation.strength.score,
            crackTime: passwordValidation.strength.crackTime
          } : null
        });
      }

      // Use Better Auth to change password
      try {
        await auth.api.changePassword({
          body: {
            newPassword,
            currentPassword,
            revokeOtherSessions,
          },
          headers: fromNodeHeaders(request.headers),
          cookies: request.cookies,
        });

        // Log password change for audit
        logger.info(`Password changed successfully for user ${userId}`);

        return reply.send({
          status: 200,
          message: 'Password changed successfully',
        });
      } catch (authError) {
        // Log the full error for debugging
        console.error("Better Auth changePassword error:", {
          message: authError.message,
          status: authError.status,
          statusCode: authError.statusCode,
          body: authError.body,
          name: authError.name,
          error: authError
        });
        logger.error("Better Auth changePassword error:", authError);

        // Handle Better Auth errors
        if (authError.status === 400 || authError.message?.includes('incorrect')) {
          return reply.code(400).send({
            status: 400,
            message: 'Current password is incorrect',
          });
        }
        throw authError;
      }
    } catch (error) {
      console.error("Password change error:", {
        message: error.message,
        status: error.status,
        statusCode: error.statusCode,
        body: error.body,
        name: error.name,
        error: error
      });
      logger.error("Password change error:", error);
      return reply.code(500).send({
        status: 500,
        message: "Server error during password change",
      });
    }
  });

  // Password strength check endpoint (public - for real-time feedback)
  fastify.post("/check-password-strength", {
    config: {
      rateLimit: {
        max: 30, // Allow frequent checks for UX
        timeWindow: '1 minute',
        keyGenerator: (request) => request.ip,
      }
    }
  }, async (request, reply) => {
    try {
      const { password, userInputs = [] } = request.body;

      if (!password) {
        return reply.code(400).send({
          status: 400,
          message: 'Password is required',
        });
      }

      // Don't check breached passwords or history for strength-only check
      const validation = await validatePassword(password, {
        userInputs,
        skipBreachCheck: true, // Skip for real-time feedback
        skipHistoryCheck: true, // Skip for real-time feedback
      });

      return {
        status: 200,
        data: {
          valid: validation.valid,
          strength: validation.strength,
          errors: validation.errors,
          suggestions: validation.suggestions,
        }
      };
    } catch (error) {
      logger.error("Password strength check error:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Server error during password strength check",
      };
    }
  });

  // Get password policy endpoint (public - for UI display)
  fastify.get("/password-policy", async (request, reply) => {
    try {
      const policy = passwordHashingService.getPasswordPolicy();

      return {
        status: 200,
        data: {
          policy: {
            ...policy,
            minLength: PASSWORD_REQUIREMENTS.minLength,
            maxLength: PASSWORD_REQUIREMENTS.maxLength,
          }
        }
      };
    } catch (error) {
      logger.error("Password policy fetch error:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Server error fetching password policy",
      };
    }
  });

  // Validate password endpoint (full validation including breach check)
  fastify.post("/validate-password", {
    config: {
      rateLimit: {
        max: 10, // Limit due to external API calls
        timeWindow: '1 minute',
        keyGenerator: (request) => request.ip,
      }
    }
  }, async (request, reply) => {
    try {
      const { password, userInputs = [], userId = null } = request.body;

      if (!password) {
        return reply.code(400).send({
          status: 400,
          message: 'Password is required',
        });
      }

      // Full validation including breach check
      const validation = await validatePassword(password, {
        userInputs,
        skipBreachCheck: false,
        userId: userId, // Optional: include for history check
        skipHistoryCheck: !userId,
      });

      return {
        status: 200,
        data: {
          valid: validation.valid,
          errors: validation.errors,
          warnings: validation.warnings,
          suggestions: validation.suggestions,
          strength: validation.strength,
          breachCheck: validation.breachCheck ? {
            breached: validation.breachCheck.breached,
            message: validation.breachCheck.message,
          } : null,
        }
      };
    } catch (error) {
      logger.error("Password validation error:", error);
      reply.code(500);
      return {
        status: 500,
        message: "Server error during password validation",
      };
    }
  });
}

export default authRoutes;
