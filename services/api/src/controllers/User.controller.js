// Note: express-validator replaced with Fastify schema validation
// Validation should be done in route definitions using Fastify's schema
import { db } from "../config/db.drizzle.js";
import { users, roles, passwordHistory } from "../db/schemas/index.js";
import { accounts } from "../db/schemas/index.js";
import { user_has_roles } from "../db/schemas/index.js";
import { eq, like, and, isNull, desc, sql, or, ilike } from "drizzle-orm";
import bcrypt from "bcrypt";
import { nanoid } from "nanoid";
import auth from "../config/betterAuth.js";
import { fromNodeHeaders } from "better-auth/node";
import { validatePassword, generateStrongPassword, PASSWORD_REQUIREMENTS } from "../utils/passwordSecurity.js";

import { logger } from '../utils/logger.js';

// User status constants
export const USER_STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
  SUSPENDED: 'suspended',
  LOCKED: 'locked',
};
// Helper function to get user with roles
const getUserWithRoles = async (userId) => {
  const userRoles = await db
    .select({
      user_id: user_has_roles.user_id,
      role_id: user_has_roles.role_id,
    })
    .from(user_has_roles)
    .where(eq(user_has_roles.user_id, userId));

  const roleDetails = [];
  for (const ur of userRoles) {
    const role = await db
      .select({
        id: roles.id,
        name: roles.name,
        guard_name: roles.guard_name,
        createdAt: roles.createdAt,
        updatedAt: roles.updatedAt,
      })
      .from(roles)
      .where(eq(roles.id, ur.role_id));
    if (role.length > 0) {
      roleDetails.push(role[0]);
    }
  }
  return roleDetails;
};

// Helper function to determine user status from database fields
const getUserStatus = (user) => {
  if (user.locked_until && new Date(user.locked_until) > new Date()) {
    return USER_STATUS.LOCKED;
  }
  if (user.deleted_at) {
    return USER_STATUS.INACTIVE;
  }
  if (!user.is_active) {
    return USER_STATUS.SUSPENDED;
  }
  return USER_STATUS.ACTIVE;
};

// Get all users with roles, pagination, and filtering
export const getAllUsers = async (request, reply) => {
  try {
    const {
      page = 1,
      limit = 20,
      search = '',
      status = '',
      role: roleFilter = '',
      sortBy = 'createdAt',
      sortOrder = 'desc',
      includeDeleted = false,
    } = request.query;

    const offset = (parseInt(page) - 1) * parseInt(limit);
    const pageSize = Math.min(parseInt(limit), 100); // Max 100 per page

    // Build where conditions
    const conditions = [];

    // Exclude soft-deleted unless explicitly requested
    if (!includeDeleted || includeDeleted === 'false') {
      conditions.push(isNull(users.deleted_at));
    }

    // Search filter (name, email, firstName, lastName)
    if (search) {
      conditions.push(
        or(
          ilike(users.name, `%${search}%`),
          ilike(users.email, `%${search}%`),
          ilike(users.firstName, `%${search}%`),
          ilike(users.lastName, `%${search}%`)
        )
      );
    }

    // Status filter
    if (status) {
      switch (status) {
        case USER_STATUS.ACTIVE:
          conditions.push(eq(users.is_active, true));
          conditions.push(isNull(users.locked_until));
          break;
        case USER_STATUS.SUSPENDED:
          conditions.push(eq(users.is_active, false));
          break;
        case USER_STATUS.LOCKED:
          conditions.push(sql`${users.locked_until} > NOW()`);
          break;
        case USER_STATUS.INACTIVE:
          conditions.push(sql`${users.deleted_at} IS NOT NULL`);
          break;
      }
    }

    // Role filter
    if (roleFilter) {
      conditions.push(eq(users.role, roleFilter));
    }

    // Build the query
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

    // Get total count
    const countResult = await db
      .select({ count: sql`count(*)::int` })
      .from(users)
      .where(whereClause);
    const totalCount = countResult[0]?.count || 0;

    // Get users with pagination
    const usersList = await db.select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      image: users.image,
      emailVerified: users.emailVerified,
      role: users.role,
      contact: users.contact,
      is_active: users.is_active,
      last_login_at: users.last_login_at,
      locked_until: users.locked_until,
      failed_login_attempts: users.failed_login_attempts,
      deleted_at: users.deleted_at,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    })
    .from(users)
    .where(whereClause)
    .orderBy(sortOrder === 'asc' ? sql`${sql.identifier(sortBy)} ASC` : sql`${sql.identifier(sortBy)} DESC`)
    .limit(pageSize)
    .offset(offset);

    // For each user, get their roles
    const usersWithRoles = await Promise.all(
      usersList.map(async (user) => {
        const roleDetails = await getUserWithRoles(user.id);
        const userStatus = getUserStatus(user);

        return {
          id: user.id,
          name: user.name,
          firstName: user.firstName,
          lastName: user.lastName,
          email: user.email,
          image: user.image,
          emailVerified: user.emailVerified,
          role: user.role,
          contact: user.contact || null,
          status: userStatus,
          is_active: user.is_active,
          last_login_at: user.last_login_at,
          locked_until: user.locked_until,
          createdAt: user.createdAt,
          updatedAt: user.updatedAt,
          roles: roleDetails,
        };
      })
    );

    return {
      status: 200,
      data: usersWithRoles,
      pagination: {
        page: parseInt(page),
        limit: pageSize,
        total: totalCount,
        totalPages: Math.ceil(totalCount / pageSize),
        hasMore: offset + pageSize < totalCount,
      },
    };
  } catch (error) {
    logger.error("Error fetching users:", error)
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching users",
    };
  }
};

// Create a new user
export const createUser = async (request, reply) => {
  try {
    // Note: Validation should be done in route definition using Fastify schema
    // For now, basic validation is handled here
    const {
      name,
      firstName,
      lastName,
      email,
      password,
      role,
      contact,
      action,
    } = request.body;

    // Basic validation (should be done in route schema)
    if (!email || !password) {
      reply.code(400);
      return {
        status: 400,
        message: "Validation failed",
        errors: [
          ...(!email ? [{ field: "email", message: "Email is required" }] : []),
          ...(!password
            ? [{ field: "password", message: "Password is required" }]
            : []),
        ],
      };
    }

    // Validate password length before calling Better Auth
    // Better Auth requires minimum 12 characters (HIPAA requirement)
    if (password.length < 12) {
      reply.code(422);
      return {
        status: 422,
        message: "Password validation failed",
        errors: [
          {
            field: "password",
            message: `Password must be at least 12 characters long. Current length: ${password.length}`,
          },
        ],
      };
    }

    // Check if user already exists
    const existingUser = await db
      .select({
        id: users.id,
      })
      .from(users)
      .where(eq(users.email, email));

    if (existingUser.length > 0) {
      reply.code(400);
      return {
        status: 400,
        message: "User already exists with this email",
      };
    }

    // Generate name from firstName and lastName (name is optional, will be auto-generated)
    const finalName = name || `${firstName} ${lastName}`.trim() || "User";

    // Use Better Auth API to create user (this automatically creates account record)
    let signupResponse;
    try {
      signupResponse = await auth.api.signUpEmail({
        body: {
          email: email,
          password: password,
          name: finalName,
        },
        headers: fromNodeHeaders(request.headers || {}),
        cookies: request.cookies || {},
      });
    } catch (authError) {
      // Handle Better Auth validation errors
      logger.error("Better Auth signup error:", authError);
      
      // Check for password validation errors
      if (authError.message?.includes("too short") || authError.message?.includes("Password is too short")) {
        reply.code(422);
        return {
          status: 422,
          message: "Password validation failed",
          errors: [
            {
              field: "password",
              message: "Password must be at least 12 characters long (HIPAA requirement)",
            },
          ],
        };
      }
      
      // Handle other Better Auth errors
      reply.code(400);
      return {
        status: 400,
        message: "Failed to create user",
        error: authError.message || "Unknown error during user creation",
      };
    }

    if (!signupResponse || !signupResponse.user) {
      reply.code(500);
      return {
        status: 500,
        message: "Failed to create user via Better Auth",
      };
    }

    const userId = signupResponse.user.id;

    // Update user with additional fields (firstName, lastName, contact)
    const now = new Date();
    await db
      .update(users)
      .set({
        firstName: firstName || null,
        lastName: lastName || null,
        contact: contact || null,
        updatedAt: now,
      })
      .where(eq(users.id, userId));

    // Get the updated user (excluding password and remember_token)
    const userResult = await db
      .select({
        id: users.id,
        name: users.name,
        firstName: users.firstName,
        lastName: users.lastName,
        email: users.email,
        image: users.image,
        emailVerified: users.emailVerified,
        role: users.role,
        contact: users.contact,
        createdAt: users.createdAt,
        updatedAt: users.updatedAt,
      })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    const user = userResult[0];

    // Assign role if provided
    if (role) {
      let roleId = null;

      if (typeof role === "object" && role.id) {
        roleId = role.id;
      } else if (typeof role === "string") {
        // Find role by name
        const roleResult = await db
          .select({
            id: roles.id,
            name: roles.name,
          })
          .from(roles)
          .where(eq(roles.name, role));
        if (roleResult.length > 0) {
          roleId = roleResult[0].id;
        }
      } else if (typeof role === "number") {
        roleId = role;
      }

      if (roleId) {
        // Associate user with role
        await db.insert(user_has_roles).values({
          user_id: user.id,
          role_id: roleId,
        });
      }
    }

    // Fetch user with roles
    const userRoles = await db
      .select({
        user_id: user_has_roles.user_id,
        role_id: user_has_roles.role_id,
      })
      .from(user_has_roles)
      .where(eq(user_has_roles.user_id, user.id));

    const roleDetails = [];
    for (const ur of userRoles) {
      const role = await db
        .select({
          id: roles.id,
          name: roles.name,
          guard_name: roles.guard_name,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        })
        .from(roles)
        .where(eq(roles.id, ur.role_id));
      if (role.length > 0) {
        roleDetails.push(role[0]);
      }
    }

    const userWithRoles = {
      ...user,
      contact: user.contact || null,
      roles: roleDetails,
    };

    reply.code(201);
    return {
      status: 201,
      message: "User created successfully",
      data: {
        user: userWithRoles,
      },
    };
  } catch (error) {
    logger.error("Error creating user:", error)
    reply.code(500);
    return {
      status: 500,
      message: "Server error while creating user",
    };
  }
};

// Get user by ID with roles
export const getUserById = async (request, reply) => {
  try {
    const { id } = request.params;

    // Find user by ID (excluding password and remember_token)
    const userResult = await db.select({
      id: users.id,
      name: users.name,
      firstName: users.firstName,
      lastName: users.lastName,
      email: users.email,
      image: users.image,
      emailVerified: users.emailVerified,
      role: users.role,
      contact: users.contact,
      is_active: users.is_active,
      last_login_at: users.last_login_at,
      password_changed_at: users.password_changed_at,
      locked_until: users.locked_until,
      failed_login_attempts: users.failed_login_attempts,
      deleted_at: users.deleted_at,
      createdAt: users.createdAt,
      updatedAt: users.updatedAt,
    }).from(users).where(eq(users.id, id));

    if (userResult.length === 0) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    const user = userResult[0];
    const roleDetails = await getUserWithRoles(user.id);
    const userStatus = getUserStatus(user);

    const userWithRoles = {
      id: user.id,
      name: user.name,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      image: user.image,
      emailVerified: user.emailVerified,
      role: user.role,
      contact: user.contact || null,
      status: userStatus,
      is_active: user.is_active,
      last_login_at: user.last_login_at,
      password_changed_at: user.password_changed_at,
      locked_until: user.locked_until,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      roles: roleDetails,
    };

    return {
      status: 200,
      data: {
        user: userWithRoles,
      },
    };
  } catch (error) {
    logger.error("Error fetching user:", error)
    reply.code(500);
    return {
      status: 500,
      message: "Server error while fetching user",
    };
  }
};

// Update user by ID
export const updateUser = async (request, reply) => {
  try {
    const { id } = request.params;
    const { name, firstName, lastName, email, password, role, contact } =
      request.body;

    // Find user
    const userResult = await db.select({
      id: users.id,
    }).from(users).where(eq(users.id, id));

    if (userResult.length === 0) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    const user = userResult[0];

    // Prepare update data
    const updateData = {};
    if (name !== undefined) updateData.name = name;
    if (firstName !== undefined) updateData.firstName = firstName;
    if (lastName !== undefined) updateData.lastName = lastName;
    if (email !== undefined) updateData.email = email;
    if (contact !== undefined) updateData.contact = contact;
    if (request.body.image !== undefined) updateData.image = request.body.image;

    // Hash password if it's being updated
    let hashedPassword = null;
    if (password !== undefined && password !== null && password !== "") {
      hashedPassword = await bcrypt.hash(password, 10);
      updateData.password = hashedPassword;
    }

    // Check if there are any fields to update
    if (Object.keys(updateData).length === 0) {
      reply.code(400);
      return {
        status: 400,
        message: "No fields provided to update",
      };
    }

    // Add updatedAt timestamp
    updateData.updatedAt = new Date();

    // Update user
    const updatedUserResult = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    const updatedUser = updatedUserResult[0];

    // Update account record if password was changed or if account doesn't exist
    if (hashedPassword !== null) {
      // Check if account exists
      const existingAccount = await db
        .select({
          id: accounts.id,
        })
        .from(accounts)
        .where(eq(accounts.userId, id))
        .limit(1);

      if (existingAccount.length > 0) {
        // Update existing account password
        await db
          .update(accounts)
          .set({
            password: hashedPassword,
            updatedAt: new Date(),
          })
          .where(eq(accounts.userId, id));
      } else {
        // Create account record if it doesn't exist
        const accountId = nanoid();
        await db.insert(accounts).values({
          id: accountId,
          userId: id,
          accountId: updatedUser.email,
          providerId: "credential",
          password: hashedPassword,
          createdAt: new Date(),
          updatedAt: new Date(),
        });
      }
    }

    // Update role if provided
    if (role !== undefined) {
      // Remove all existing roles for this user
      await db.delete(user_has_roles).where(eq(user_has_roles.user_id, id));

      if (role !== null && role !== "") {
        // Assign new role
        let roleId = null;

        if (typeof role === "object" && role.id) {
          roleId = role.id;
        } else if (typeof role === "string") {
          // Find role by name
          const roleResult = await db
            .select({
              id: roles.id,
              name: roles.name,
            })
            .from(roles)
            .where(eq(roles.name, role));
          if (roleResult.length > 0) {
            roleId = roleResult[0].id;
          }
        } else if (typeof role === "number") {
          roleId = role;
        }

        if (roleId) {
          // Associate user with role
          await db.insert(user_has_roles).values({
            user_id: id,
            role_id: roleId,
          });
        }
      }
    }

    // Fetch updated user with roles
    const userRoles = await db
      .select({
        user_id: user_has_roles.user_id,
        role_id: user_has_roles.role_id,
      })
      .from(user_has_roles)
      .where(eq(user_has_roles.user_id, id));

    const roleDetails = [];
    for (const ur of userRoles) {
      const role = await db
        .select({
          id: roles.id,
          name: roles.name,
          guard_name: roles.guard_name,
          createdAt: roles.createdAt,
          updatedAt: roles.updatedAt,
        })
        .from(roles)
        .where(eq(roles.id, ur.role_id));
      if (role.length > 0) {
        roleDetails.push(role[0]);
      }
    }

    // Build response excluding password and remember_token
    const userResponse = {
      id: updatedUser.id,
      name: updatedUser.name,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      email: updatedUser.email,
      image: updatedUser.image,
      emailVerified: updatedUser.emailVerified,
      role: updatedUser.role,
      contact: updatedUser.contact || null,
      createdAt: updatedUser.createdAt,
      updatedAt: updatedUser.updatedAt,
    };

    const userWithRoles = {
      ...userResponse,
      roles: roleDetails,
    };

    return {
      status: 200,
      message: "User updated successfully",
      data: {
        user: userWithRoles,
      },
    };
  } catch (error) {
    logger.error("Error updating user:", error)
    reply.code(500);
    return {
      status: 500,
      message: "Server error while updating user",
    };
  }
};

// Delete user by ID (soft delete by default)
export const deleteUser = async (request, reply) => {
  try {
    const { id } = request.params;
    const { hard = false } = request.query; // Support hard delete via query param

    // Find user
    const userResult = await db.select({
      id: users.id,
      deleted_at: users.deleted_at,
    }).from(users).where(eq(users.id, id));

    if (userResult.length === 0) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    // Check if already soft-deleted
    if (userResult[0].deleted_at && !hard) {
      reply.code(400);
      return {
        status: 400,
        message: "User is already deleted",
      };
    }

    if (hard === 'true' || hard === true) {
      // Hard delete - permanently remove user
      await db.delete(user_has_roles).where(eq(user_has_roles.user_id, id));
      await db.delete(passwordHistory).where(eq(passwordHistory.userId, id));
      await db.delete(accounts).where(eq(accounts.userId, id));
      await db.delete(users).where(eq(users.id, id));

      return {
        status: 200,
        message: "User permanently deleted",
      };
    } else {
      // Soft delete - set deleted_at and deactivate
      await db
        .update(users)
        .set({
          deleted_at: new Date(),
          is_active: false,
          updatedAt: new Date(),
        })
        .where(eq(users.id, id));

      return {
        status: 200,
        message: "User deleted successfully",
      };
    }
  } catch (error) {
    logger.error("Error deleting user:", error)
    reply.code(500);
    return {
      status: 500,
      message: "Server error while deleting user",
    };
  }
};

// Restore a soft-deleted user
export const restoreUser = async (request, reply) => {
  try {
    const { id } = request.params;

    // Find user (including soft-deleted)
    const userResult = await db.select({
      id: users.id,
      deleted_at: users.deleted_at,
    }).from(users).where(eq(users.id, id));

    if (userResult.length === 0) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    if (!userResult[0].deleted_at) {
      reply.code(400);
      return {
        status: 400,
        message: "User is not deleted",
      };
    }

    // Restore user
    const restoredUser = await db
      .update(users)
      .set({
        deleted_at: null,
        is_active: true,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return {
      status: 200,
      message: "User restored successfully",
      data: {
        user: {
          id: restoredUser[0].id,
          name: restoredUser[0].name,
          email: restoredUser[0].email,
          is_active: restoredUser[0].is_active,
        },
      },
    };
  } catch (error) {
    logger.error("Error restoring user:", error)
    reply.code(500);
    return {
      status: 500,
      message: "Server error while restoring user",
    };
  }
};

// ==========================================
// PASSWORD MANAGEMENT FUNCTIONS
// ==========================================

// Change password (authenticated user changing their own password)
export const changePassword = async (request, reply) => {
  try {
    const { id } = request.params;
    const { currentPassword, newPassword } = request.body;
    const requestingUserId = request.user?.id;

    // Authorization: Users can only change their own password, unless admin
    const isAdmin = request.user?.role === 'admin';
    if (!isAdmin && requestingUserId !== id) {
      reply.code(403);
      return {
        status: 403,
        message: "You can only change your own password",
      };
    }

    // Validate required fields
    if (!currentPassword || !newPassword) {
      reply.code(400);
      return {
        status: 400,
        message: "Current password and new password are required",
      };
    }

    // Find user with password
    const userResult = await db.select({
      id: users.id,
      password: users.password,
      email: users.email,
      name: users.name,
    }).from(users).where(eq(users.id, id));

    if (userResult.length === 0) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    const user = userResult[0];

    // Verify current password
    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      reply.code(401);
      return {
        status: 401,
        message: "Current password is incorrect",
      };
    }

    // Validate new password against security requirements
    const validation = await validatePassword(newPassword, {
      userInputs: [user.email, user.name],
      userId: id,
    });

    if (!validation.valid) {
      reply.code(422);
      return {
        status: 422,
        message: "Password validation failed",
        errors: validation.errors,
        warnings: validation.warnings,
        suggestions: validation.suggestions,
        strength: validation.strength,
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Store current password in history before changing
    await db.insert(passwordHistory).values({
      userId: id,
      passwordHash: user.password,
    });

    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        password_changed_at: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    // Update account password too if exists
    await db
      .update(accounts)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(accounts.userId, id));

    return {
      status: 200,
      message: "Password changed successfully",
    };
  } catch (error) {
    logger.error("Error changing password:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while changing password",
    };
  }
};

// Reset password (admin action - sets a new password without knowing the current one)
export const resetPassword = async (request, reply) => {
  try {
    const { id } = request.params;
    const { newPassword, generateRandom = false } = request.body;

    // Find user
    const userResult = await db.select({
      id: users.id,
      password: users.password,
      email: users.email,
      name: users.name,
      is_active: users.is_active,
    }).from(users).where(eq(users.id, id));

    if (userResult.length === 0) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    const user = userResult[0];

    // Generate random password if requested, otherwise use provided password
    let passwordToSet;
    if (generateRandom) {
      passwordToSet = generateStrongPassword(16);
    } else if (newPassword) {
      passwordToSet = newPassword;
    } else {
      reply.code(400);
      return {
        status: 400,
        message: "Either newPassword or generateRandom: true is required",
      };
    }

    // Validate password against security requirements
    const validation = await validatePassword(passwordToSet, {
      userInputs: [user.email, user.name],
      userId: id,
      skipHistoryCheck: true, // Admin reset bypasses history check
    });

    if (!validation.valid) {
      reply.code(422);
      return {
        status: 422,
        message: "Password validation failed",
        errors: validation.errors,
        suggestions: validation.suggestions,
      };
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(passwordToSet, 10);

    // Store current password in history (if exists)
    if (user.password) {
      await db.insert(passwordHistory).values({
        userId: id,
        passwordHash: user.password,
      });
    }

    // Update password
    await db
      .update(users)
      .set({
        password: hashedPassword,
        password_changed_at: new Date(),
        failed_login_attempts: "0", // Reset failed attempts on password reset
        locked_until: null, // Unlock account
        updatedAt: new Date(),
      })
      .where(eq(users.id, id));

    // Update account password too if exists
    await db
      .update(accounts)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(accounts.userId, id));

    const response = {
      status: 200,
      message: "Password reset successfully",
    };

    // Include temporary password only if it was generated
    if (generateRandom) {
      response.data = {
        temporaryPassword: passwordToSet,
        note: "Please securely communicate this password to the user. They should change it on first login.",
      };
    }

    return response;
  } catch (error) {
    logger.error("Error resetting password:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while resetting password",
    };
  }
};

// Request password reset (generates a token for email-based reset)
export const requestPasswordReset = async (request, reply) => {
  try {
    const { email } = request.body;

    if (!email) {
      reply.code(400);
      return {
        status: 400,
        message: "Email is required",
      };
    }

    // Find user by email
    const userResult = await db.select({
      id: users.id,
      email: users.email,
      is_active: users.is_active,
    }).from(users).where(eq(users.email, email.toLowerCase()));

    // Always return success for security (don't reveal if email exists)
    if (userResult.length === 0) {
      return {
        status: 200,
        message: "If a user with this email exists, a password reset link will be sent.",
      };
    }

    const user = userResult[0];

    // Check if user is active
    if (!user.is_active) {
      return {
        status: 200,
        message: "If a user with this email exists, a password reset link will be sent.",
      };
    }

    // Generate a secure reset token
    const resetToken = nanoid(32);
    const resetExpiry = new Date(Date.now() + 3600000); // 1 hour expiry

    // Store token in remember_token field (or could use a separate table)
    await db
      .update(users)
      .set({
        remember_token: resetToken,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // In production, send email with reset link
    // For now, log the token (remove in production)
    logger.info(`Password reset token for ${email}: ${resetToken}`);

    return {
      status: 200,
      message: "If a user with this email exists, a password reset link will be sent.",
      // Only include in development
      ...(process.env.NODE_ENV === 'development' && {
        debug: {
          resetToken,
          expiresAt: resetExpiry.toISOString(),
        }
      }),
    };
  } catch (error) {
    logger.error("Error requesting password reset:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while processing password reset request",
    };
  }
};

// Complete password reset (using token)
export const completePasswordReset = async (request, reply) => {
  try {
    const { token, newPassword } = request.body;

    if (!token || !newPassword) {
      reply.code(400);
      return {
        status: 400,
        message: "Token and new password are required",
      };
    }

    // Find user by reset token
    const userResult = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      password: users.password,
      remember_token: users.remember_token,
      is_active: users.is_active,
    }).from(users).where(eq(users.remember_token, token));

    if (userResult.length === 0) {
      reply.code(400);
      return {
        status: 400,
        message: "Invalid or expired reset token",
      };
    }

    const user = userResult[0];

    // Validate new password
    const validation = await validatePassword(newPassword, {
      userInputs: [user.email, user.name],
      userId: user.id,
    });

    if (!validation.valid) {
      reply.code(422);
      return {
        status: 422,
        message: "Password validation failed",
        errors: validation.errors,
        suggestions: validation.suggestions,
      };
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Store old password in history (if exists)
    if (user.password) {
      await db.insert(passwordHistory).values({
        userId: user.id,
        passwordHash: user.password,
      });
    }

    // Update password and clear reset token
    await db
      .update(users)
      .set({
        password: hashedPassword,
        remember_token: null,
        password_changed_at: new Date(),
        failed_login_attempts: "0",
        locked_until: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, user.id));

    // Update account password
    await db
      .update(accounts)
      .set({
        password: hashedPassword,
        updatedAt: new Date(),
      })
      .where(eq(accounts.userId, user.id));

    return {
      status: 200,
      message: "Password has been reset successfully",
    };
  } catch (error) {
    logger.error("Error completing password reset:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while resetting password",
    };
  }
};

// ==========================================
// STATUS MANAGEMENT FUNCTIONS
// ==========================================

// Update user status (activate, suspend, etc.)
export const updateUserStatus = async (request, reply) => {
  try {
    const { id } = request.params;
    const { status, reason } = request.body;

    if (!status) {
      reply.code(400);
      return {
        status: 400,
        message: "Status is required",
      };
    }

    // Validate status value
    const validStatuses = Object.values(USER_STATUS);
    if (!validStatuses.includes(status)) {
      reply.code(400);
      return {
        status: 400,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      };
    }

    // Find user
    const userResult = await db.select({
      id: users.id,
      is_active: users.is_active,
      deleted_at: users.deleted_at,
    }).from(users).where(eq(users.id, id));

    if (userResult.length === 0) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    const updateData = { updatedAt: new Date() };

    switch (status) {
      case USER_STATUS.ACTIVE:
        updateData.is_active = true;
        updateData.locked_until = null;
        updateData.failed_login_attempts = "0";
        updateData.deleted_at = null;
        break;
      case USER_STATUS.SUSPENDED:
        updateData.is_active = false;
        break;
      case USER_STATUS.LOCKED:
        // Lock for 24 hours by default
        updateData.locked_until = new Date(Date.now() + 24 * 60 * 60 * 1000);
        break;
      case USER_STATUS.INACTIVE:
        updateData.is_active = false;
        updateData.deleted_at = new Date();
        break;
    }

    const updatedUser = await db
      .update(users)
      .set(updateData)
      .where(eq(users.id, id))
      .returning();

    return {
      status: 200,
      message: `User status updated to ${status}`,
      data: {
        user: {
          id: updatedUser[0].id,
          status: status,
          is_active: updatedUser[0].is_active,
          locked_until: updatedUser[0].locked_until,
        },
        reason: reason || null,
      },
    };
  } catch (error) {
    logger.error("Error updating user status:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while updating user status",
    };
  }
};

// Lock user account
export const lockUserAccount = async (request, reply) => {
  try {
    const { id } = request.params;
    const { duration = 24, reason } = request.body; // Duration in hours

    // Find user
    const userResult = await db.select({
      id: users.id,
    }).from(users).where(eq(users.id, id));

    if (userResult.length === 0) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    const lockUntil = new Date(Date.now() + duration * 60 * 60 * 1000);

    const updatedUser = await db
      .update(users)
      .set({
        locked_until: lockUntil,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return {
      status: 200,
      message: `User account locked for ${duration} hours`,
      data: {
        user: {
          id: updatedUser[0].id,
          locked_until: lockUntil,
        },
        reason: reason || null,
      },
    };
  } catch (error) {
    logger.error("Error locking user account:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while locking user account",
    };
  }
};

// Unlock user account
export const unlockUserAccount = async (request, reply) => {
  try {
    const { id } = request.params;

    // Find user
    const userResult = await db.select({
      id: users.id,
      locked_until: users.locked_until,
    }).from(users).where(eq(users.id, id));

    if (userResult.length === 0) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    if (!userResult[0].locked_until) {
      reply.code(400);
      return {
        status: 400,
        message: "User account is not locked",
      };
    }

    const updatedUser = await db
      .update(users)
      .set({
        locked_until: null,
        failed_login_attempts: "0",
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return {
      status: 200,
      message: "User account unlocked successfully",
      data: {
        user: {
          id: updatedUser[0].id,
          locked_until: null,
        },
      },
    };
  } catch (error) {
    logger.error("Error unlocking user account:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while unlocking user account",
    };
  }
};

// Reset failed login attempts
export const resetFailedLoginAttempts = async (request, reply) => {
  try {
    const { id } = request.params;

    // Find user
    const userResult = await db.select({
      id: users.id,
      failed_login_attempts: users.failed_login_attempts,
    }).from(users).where(eq(users.id, id));

    if (userResult.length === 0) {
      reply.code(404);
      return {
        status: 404,
        message: "User not found",
      };
    }

    const updatedUser = await db
      .update(users)
      .set({
        failed_login_attempts: "0",
        locked_until: null,
        updatedAt: new Date(),
      })
      .where(eq(users.id, id))
      .returning();

    return {
      status: 200,
      message: "Failed login attempts reset successfully",
      data: {
        user: {
          id: updatedUser[0].id,
          failed_login_attempts: "0",
          previousAttempts: userResult[0].failed_login_attempts,
        },
      },
    };
  } catch (error) {
    logger.error("Error resetting failed login attempts:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while resetting failed login attempts",
    };
  }
};

// Bulk update user status
export const bulkUpdateUserStatus = async (request, reply) => {
  try {
    const { userIds, status, reason } = request.body;

    if (!userIds || !Array.isArray(userIds) || userIds.length === 0) {
      reply.code(400);
      return {
        status: 400,
        message: "userIds array is required and must not be empty",
      };
    }

    if (!status) {
      reply.code(400);
      return {
        status: 400,
        message: "Status is required",
      };
    }

    // Validate status value
    const validStatuses = Object.values(USER_STATUS);
    if (!validStatuses.includes(status)) {
      reply.code(400);
      return {
        status: 400,
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}`,
      };
    }

    const updateData = { updatedAt: new Date() };

    switch (status) {
      case USER_STATUS.ACTIVE:
        updateData.is_active = true;
        updateData.locked_until = null;
        updateData.failed_login_attempts = "0";
        updateData.deleted_at = null;
        break;
      case USER_STATUS.SUSPENDED:
        updateData.is_active = false;
        break;
      case USER_STATUS.LOCKED:
        updateData.locked_until = new Date(Date.now() + 24 * 60 * 60 * 1000);
        break;
      case USER_STATUS.INACTIVE:
        updateData.is_active = false;
        updateData.deleted_at = new Date();
        break;
    }

    // Update all users
    const updatedCount = await db
      .update(users)
      .set(updateData)
      .where(sql`${users.id} = ANY(${userIds})`);

    return {
      status: 200,
      message: `Updated ${userIds.length} users to status: ${status}`,
      data: {
        updatedCount: userIds.length,
        newStatus: status,
        reason: reason || null,
      },
    };
  } catch (error) {
    logger.error("Error in bulk status update:", error);
    reply.code(500);
    return {
      status: 500,
      message: "Server error while updating user statuses",
    };
  }
};

// Get password requirements (public endpoint)
export const getPasswordRequirements = async (request, reply) => {
  return {
    status: 200,
    data: {
      requirements: {
        minLength: PASSWORD_REQUIREMENTS.minLength,
        maxLength: PASSWORD_REQUIREMENTS.maxLength,
        requireComplexity: PASSWORD_REQUIREMENTS.requireComplexity,
        complexityDescription: "Password must contain at least 3 of the following: lowercase letters, uppercase letters, numbers, special characters",
        minStrengthScore: PASSWORD_REQUIREMENTS.minStrengthScore,
        strengthDescription: "Password strength is measured on a scale of 0-4 (0 = weak, 4 = very strong). Minimum required: 3",
        historyCount: PASSWORD_REQUIREMENTS.historyCount,
        historyDescription: `Cannot reuse any of your last ${PASSWORD_REQUIREMENTS.historyCount} passwords`,
      },
    },
  };
};

// Note: Validation should be done using Fastify's schema validation in route definitions
export const userValidation = async (request, reply) => {
  // Placeholder - validation should be done via Fastify schema
  // This is kept for compatibility but does nothing
};
