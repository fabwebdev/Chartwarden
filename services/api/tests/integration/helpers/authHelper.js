/**
 * Authentication Helpers for Integration Tests
 *
 * Provides utilities for creating authenticated test users and managing sessions:
 * - User creation with different roles
 * - Session generation for authenticated requests
 * - Better Auth integration for realistic authentication
 * - Token and cookie management for API testing
 * - Role and permission assignment
 *
 * HIPAA Compliance:
 * - Uses isolated test database
 * - Generates realistic but fake user data
 * - Ensures proper cleanup of authentication data
 * - Follows Better Auth security patterns
 */

import { nanoid } from 'nanoid';
import bcrypt from 'bcryptjs';
import { faker } from '@faker-js/faker';
import { db } from '../../../src/config/db.drizzle.js';
import auth from '../../../src/config/betterAuth.js';
import { users } from '../../../src/db/schemas/user.schema.js';
import { accounts } from '../../../src/db/schemas/account.schema.js';
import { sessions } from '../../../src/db/schemas/session.schema.js';
import { roles } from '../../../src/db/schemas/role.schema.js';
import { user_has_roles } from '../../../src/db/schemas/userRole.schema.js';
import { eq, and, gt, sql } from 'drizzle-orm';

/**
 * Default password for test users
 * Strong enough to pass validation but easy to remember for debugging
 */
export const TEST_USER_PASSWORD = 'TestPassword123!@#';

/**
 * Common test user roles
 */
export const TEST_ROLES = {
  ADMIN: 'admin',
  DOCTOR: 'doctor',
  NURSE: 'nurse',
  SOCIAL_WORKER: 'social_worker',
  CHAPLAIN: 'chaplain',
  VOLUNTEER: 'volunteer',
  STAFF: 'staff',
  PATIENT: 'patient',
};

/**
 * Create a test user with authentication credentials
 *
 * @param {Object} options - User creation options
 * @param {string} options.email - User email (auto-generated if not provided)
 * @param {string} options.password - User password (defaults to TEST_USER_PASSWORD)
 * @param {string} options.firstName - User first name
 * @param {string} options.lastName - User last name
 * @param {string} options.role - User role (defaults to 'staff')
 * @param {boolean} options.emailVerified - Email verification status (defaults to true)
 * @param {boolean} options.createSession - Whether to create a session (defaults to false)
 * @param {Object} options.overrides - Additional user properties to override
 * @returns {Promise<Object>} Created user with plainPassword and optional session
 */
export async function createAuthUser(options = {}) {
  const {
    email = faker.internet.email().toLowerCase(),
    password = TEST_USER_PASSWORD,
    firstName = faker.person.firstName(),
    lastName = faker.person.lastName(),
    role = TEST_ROLES.STAFF,
    emailVerified = true,
    createSession = false,
    overrides = {},
  } = options;

  // Hash password
  const hashedPassword = await bcrypt.hash(password, 10);

  // Create user data
  const userData = {
    id: nanoid(),
    name: `${firstName} ${lastName}`,
    firstName,
    lastName,
    email,
    emailVerified,
    password: hashedPassword,
    role,
    is_active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  // Insert user into database
  const [user] = await db.insert(users).values(userData).returning();

  // Create account for Better Auth compatibility
  await createTestAccount(user.id, {
    providerId: 'credential',
    password: hashedPassword,
  });

  // Assign role to user if specified
  if (role) {
    await assignRoleToUser(user.id, role);
  }

  // Create session if requested
  let session = null;
  if (createSession) {
    session = await createAuthSession(user.id);
  }

  // Return user with plaintext password for testing
  return {
    ...user,
    plainPassword: password,
    session,
  };
}

/**
 * Create a Better Auth account for a user
 * Required for Better Auth authentication to work
 *
 * @param {string} userId - User ID
 * @param {Object} options - Account options
 * @returns {Promise<Object>} Created account
 */
export async function createTestAccount(userId, options = {}) {
  const {
    providerId = 'credential',
    accountId = nanoid(),
    password = null,
    accessToken = null,
    refreshToken = null,
    idToken = null,
    expiresAt = null,
  } = options;

  const accountData = {
    id: nanoid(),
    userId,
    accountId,
    providerId,
    password,
    accessToken,
    refreshToken,
    idToken,
    expiresAt,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const [account] = await db.insert(accounts).values(accountData).returning();
  return account;
}

/**
 * Create an authenticated session for a user
 * Compatible with Better Auth session structure
 *
 * @param {string} userId - User ID to create session for
 * @param {Object} options - Session options
 * @returns {Promise<Object>} Created session with token
 */
export async function createAuthSession(userId, options = {}) {
  const {
    expiresInHours = 8, // Default 8 hours (matches HIPAA requirements)
    ipAddress = faker.internet.ip(),
    userAgent = faker.internet.userAgent(),
  } = options;

  const sessionData = {
    id: nanoid(),
    userId,
    token: nanoid(32), // 32-character token for Better Auth
    expiresAt: new Date(Date.now() + expiresInHours * 60 * 60 * 1000),
    ipAddress,
    userAgent,
    created_at: new Date(),
    updated_at: new Date(),
  };

  const [session] = await db.insert(sessions).values(sessionData).returning();
  return session;
}

/**
 * Assign a role to a user
 * Creates the user-role relationship in the database
 *
 * @param {string} userId - User ID
 * @param {string} roleName - Role name (e.g., 'admin', 'nurse', 'doctor')
 * @returns {Promise<Object>} Role assignment result
 */
export async function assignRoleToUser(userId, roleName) {
  try {
    // Find the role by name
    const [roleRecord] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, roleName))
      .limit(1);

    if (!roleRecord) {
      console.warn(`Role "${roleName}" not found. Creating a basic role entry.`);

      // Create the role if it doesn't exist (for testing)
      const [newRole] = await db
        .insert(roles)
        .values({
          name: roleName,
          display_name: roleName.charAt(0).toUpperCase() + roleName.slice(1),
          description: `Test role: ${roleName}`,
          guard_name: 'web',
          created_at: new Date(),
          updated_at: new Date(),
        })
        .returning();

      // Assign the newly created role
      // Only insert required columns (assigned_at and assigned_by may not exist in older schemas)
      try {
        await db.insert(user_has_roles).values({
          user_id: userId,
          role_id: newRole.id,
        });
      } catch (insertError) {
        // If the insert fails due to missing columns, try with raw SQL
        if (insertError.message?.includes('assigned_at') || insertError.message?.includes('assigned_by')) {
          await db.execute(sql`
            INSERT INTO user_has_roles (user_id, role_id)
            VALUES (${userId}, ${newRole.id})
            ON CONFLICT (user_id, role_id) DO NOTHING
          `);
        } else {
          throw insertError;
        }
      }

      return { success: true, role: newRole };
    }

    // Check if user already has this role
    const [existing] = await db
      .select()
      .from(user_has_roles)
      .where(
        and(
          eq(user_has_roles.user_id, userId),
          eq(user_has_roles.role_id, roleRecord.id)
        )
      )
      .limit(1);

    if (existing) {
      return { success: true, role: roleRecord, alreadyAssigned: true };
    }

    // Assign the role to the user
    // Only insert required columns (assigned_at and assigned_by may not exist in older schemas)
    try {
      await db.insert(user_has_roles).values({
        user_id: userId,
        role_id: roleRecord.id,
      });
    } catch (insertError) {
      // If the insert fails due to missing columns, try with raw SQL
      if (insertError.message?.includes('assigned_at') || insertError.message?.includes('assigned_by')) {
        await db.execute(sql`
          INSERT INTO user_has_roles (user_id, role_id)
          VALUES (${userId}, ${roleRecord.id})
          ON CONFLICT (user_id, role_id) DO NOTHING
        `);
      } else {
        throw insertError;
      }
    }

    return { success: true, role: roleRecord };
  } catch (error) {
    console.error(`Failed to assign role "${roleName}" to user ${userId}:`, error);
    throw error;
  }
}

/**
 * Create a user with a specific role
 * Convenience function for common test scenarios
 *
 * @param {string} roleName - Role name
 * @param {Object} options - Additional user options
 * @returns {Promise<Object>} Created user with assigned role
 */
export async function createUserWithRole(roleName, options = {}) {
  return createAuthUser({
    ...options,
    role: roleName,
  });
}

/**
 * Create an admin user for testing
 *
 * @param {Object} options - User options
 * @returns {Promise<Object>} Created admin user
 */
export async function createAdminUser(options = {}) {
  return createUserWithRole(TEST_ROLES.ADMIN, options);
}

/**
 * Create a doctor user for testing
 *
 * @param {Object} options - User options
 * @returns {Promise<Object>} Created doctor user
 */
export async function createDoctorUser(options = {}) {
  return createUserWithRole(TEST_ROLES.DOCTOR, options);
}

/**
 * Create a nurse user for testing
 *
 * @param {Object} options - User options
 * @returns {Promise<Object>} Created nurse user
 */
export async function createNurseUser(options = {}) {
  return createUserWithRole(TEST_ROLES.NURSE, options);
}

/**
 * Create a patient user for testing
 *
 * @param {Object} options - User options
 * @returns {Promise<Object>} Created patient user
 */
export async function createPatientUser(options = {}) {
  return createUserWithRole(TEST_ROLES.PATIENT, options);
}

/**
 * Create multiple authenticated users with sessions
 *
 * @param {number} count - Number of users to create
 * @param {Object} options - User creation options
 * @returns {Promise<Array>} Array of created users with sessions
 */
export async function createAuthUsers(count, options = {}) {
  const usersPromises = [];

  for (let i = 0; i < count; i++) {
    usersPromises.push(createAuthUser(options));
  }

  return Promise.all(usersPromises);
}

/**
 * Authenticate a user and get a session token
 * Simulates a real login flow via Better Auth
 *
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} Authentication result with session token
 */
export async function authenticateUser(email, password) {
  try {
    // Call Better Auth sign-in API
    const response = await auth.api.signInEmail({
      body: { email, password },
      headers: new Headers({
        'content-type': 'application/json',
        'origin': 'http://localhost:3000',
      }),
    });

    if (!response || !response.user) {
      throw new Error('Authentication failed: Invalid credentials');
    }

    // Extract session token from response
    let sessionToken = null;

    // Better Auth should set session cookie in response headers
    if (response.headers) {
      const setCookieHeader = response.headers.get('set-cookie');
      if (setCookieHeader) {
        // Parse session token from cookie
        const match = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
        if (match) {
          sessionToken = match[1];
        }
      }
    }

    // If no token in headers, try to get from database
    if (!sessionToken) {
      const [session] = await db
        .select()
        .from(sessions)
        .where(
          and(
            eq(sessions.userId, response.user.id),
            gt(sessions.expiresAt, new Date())
          )
        )
        .orderBy(sessions.createdAt)
        .limit(1);

      if (session) {
        sessionToken = session.token;
      }
    }

    return {
      success: true,
      user: response.user,
      sessionToken,
      session: response.session,
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
    };
  }
}

/**
 * Get authentication headers for API requests
 * Formats headers with session token for Fastify inject()
 *
 * @param {string} sessionToken - Session token
 * @param {Object} additionalHeaders - Additional headers to include
 * @returns {Object} Headers object for API requests
 */
export function getAuthHeaders(sessionToken, additionalHeaders = {}) {
  return {
    'content-type': 'application/json',
    'origin': 'http://localhost:3000',
    'cookie': `better-auth.session_token=${sessionToken}`,
    ...additionalHeaders,
  };
}

/**
 * Get authentication cookies for API requests
 * Returns cookies object for Fastify inject()
 *
 * @param {string} sessionToken - Session token
 * @param {Object} additionalCookies - Additional cookies to include
 * @returns {Object} Cookies object for API requests
 */
export function getAuthCookies(sessionToken, additionalCookies = {}) {
  return {
    'better-auth.session_token': sessionToken,
    ...additionalCookies,
  };
}

/**
 * Verify session is valid and not expired
 *
 * @param {string} sessionToken - Session token to verify
 * @returns {Promise<Object>} Verification result with session data
 */
export async function verifySession(sessionToken) {
  try {
    const [session] = await db
      .select()
      .from(sessions)
      .where(eq(sessions.token, sessionToken))
      .limit(1);

    if (!session) {
      return {
        valid: false,
        error: 'Session not found',
      };
    }

    // Check if session is expired
    if (session.expiresAt < new Date()) {
      return {
        valid: false,
        error: 'Session expired',
        session,
      };
    }

    // Get user data
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.id, session.userId))
      .limit(1);

    return {
      valid: true,
      session,
      user,
    };
  } catch (error) {
    return {
      valid: false,
      error: error.message,
    };
  }
}

/**
 * Invalidate a session (logout)
 *
 * @param {string} sessionToken - Session token to invalidate
 * @returns {Promise<boolean>} True if session was invalidated
 */
export async function invalidateSession(sessionToken) {
  try {
    await db
      .delete(sessions)
      .where(eq(sessions.token, sessionToken));

    return true;
  } catch (error) {
    console.error('Failed to invalidate session:', error);
    return false;
  }
}

/**
 * Get all active sessions for a user
 *
 * @param {string} userId - User ID
 * @returns {Promise<Array>} Array of active sessions
 */
export async function getUserSessions(userId) {
  try {
    const userSessions = await db
      .select()
      .from(sessions)
      .where(
        and(
          eq(sessions.userId, userId),
          gt(sessions.expiresAt, new Date())
        )
      );

    return userSessions;
  } catch (error) {
    console.error('Failed to get user sessions:', error);
    return [];
  }
}

/**
 * Create a user and authenticate them in one step
 * Convenience function for tests that need authenticated users
 *
 * @param {Object} options - User creation options
 * @returns {Promise<Object>} Created user with session token
 */
export async function createAuthenticatedUser(options = {}) {
  const user = await createAuthUser({
    ...options,
    createSession: true,
  });

  return {
    ...user,
    sessionToken: user.session.token,
    authHeaders: getAuthHeaders(user.session.token),
    authCookies: getAuthCookies(user.session.token),
  };
}

/**
 * Create multiple authenticated users with different roles
 * Useful for testing role-based access control
 *
 * @param {Object} roleOptions - Map of role names to user counts
 * @returns {Promise<Object>} Object with users organized by role
 */
export async function createAuthenticatedUsers(roleOptions = {}) {
  const defaultRoles = {
    [TEST_ROLES.ADMIN]: 1,
    [TEST_ROLES.DOCTOR]: 2,
    [TEST_ROLES.NURSE]: 2,
    [TEST_ROLES.STAFF]: 2,
    [TEST_ROLES.PATIENT]: 3,
  };

  const rolesToCreate = { ...defaultRoles, ...roleOptions };
  const result = {};

  for (const [roleName, count] of Object.entries(rolesToCreate)) {
    if (count > 0) {
      const usersPromises = [];

      for (let i = 0; i < count; i++) {
        usersPromises.push(createAuthenticatedUser({ role: roleName }));
      }

      result[roleName] = await Promise.all(usersPromises);
    }
  }

  return result;
}

/**
 * Create a user with expired session
 * Useful for testing session expiration handling
 *
 * @param {Object} options - User options
 * @returns {Promise<Object>} User with expired session
 */
export async function createUserWithExpiredSession(options = {}) {
  const user = await createAuthUser(options);

  // Create expired session (1 hour in the past)
  const expiredSession = await db.insert(sessions).values({
    id: nanoid(),
    userId: user.id,
    token: nanoid(32),
    expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
    updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
  }).returning();

  return {
    ...user,
    session: expiredSession[0],
    sessionToken: expiredSession[0].token,
  };
}

/**
 * Clean up authentication data for a user
 * Removes sessions and accounts
 *
 * @param {string} userId - User ID to clean up
 * @returns {Promise<void>}
 */
export async function cleanupUserAuth(userId) {
  try {
    // Delete sessions
    await db.delete(sessions).where(eq(sessions.userId, userId));

    // Delete accounts
    await db.delete(accounts).where(eq(accounts.userId, userId));

    // Delete role assignments
    await db.delete(user_has_roles).where(eq(user_has_roles.user_id, userId));

    // Delete user
    await db.delete(users).where(eq(users.id, userId));
  } catch (error) {
    console.error('Failed to cleanup user auth:', error);
    throw error;
  }
}

// Export all functions as default object
export default {
  TEST_USER_PASSWORD,
  TEST_ROLES,
  createAuthUser,
  createTestAccount,
  createAuthSession,
  assignRoleToUser,
  createUserWithRole,
  createAdminUser,
  createDoctorUser,
  createNurseUser,
  createPatientUser,
  createAuthUsers,
  authenticateUser,
  getAuthHeaders,
  getAuthCookies,
  verifySession,
  invalidateSession,
  getUserSessions,
  createAuthenticatedUser,
  createAuthenticatedUsers,
  createUserWithExpiredSession,
  cleanupUserAuth,
};
