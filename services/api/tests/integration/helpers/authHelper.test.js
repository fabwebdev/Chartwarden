/**
 * Integration Tests for Authentication Helpers
 *
 * Tests the authHelper.js utilities to ensure they correctly:
 * - Create authenticated users with various roles
 * - Generate valid sessions
 * - Assign roles properly
 * - Provide authentication headers/cookies
 * - Verify and invalidate sessions
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { nanoid } from 'nanoid';
import {
  createAuthUser,
  createAuthSession,
  createAdminUser,
  createDoctorUser,
  createNurseUser,
  createPatientUser,
  createAuthenticatedUser,
  createAuthenticatedUsers,
  createUserWithExpiredSession,
  assignRoleToUser,
  verifySession,
  invalidateSession,
  getUserSessions,
  getAuthHeaders,
  getAuthCookies,
  cleanupUserAuth,
  TEST_USER_PASSWORD,
  TEST_ROLES,
} from './authHelper.js';
import { cleanupDatabase } from './testDb.js';
import { db } from '../../../src/config/db.drizzle.js';
import { users, sessions, user_has_roles, roles } from '../../../src/db/schemas/index.js';
import { eq } from 'drizzle-orm';

describe('Auth Helper - User Creation', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should create a basic auth user with default values', async () => {
    const user = await createAuthUser();

    expect(user).toBeDefined();
    expect(user.id).toBeDefined();
    expect(user.email).toBeDefined();
    expect(user.firstName).toBeDefined();
    expect(user.lastName).toBeDefined();
    expect(user.plainPassword).toBe(TEST_USER_PASSWORD);
    expect(user.emailVerified).toBe(true);
    expect(user.is_active).toBe(true);
  });

  it('should create a user with custom email and password', async () => {
    const customEmail = 'test@example.com';
    const customPassword = 'CustomPassword123!@#';

    const user = await createAuthUser({
      email: customEmail,
      password: customPassword,
    });

    expect(user.email).toBe(customEmail);
    expect(user.plainPassword).toBe(customPassword);
  });

  it('should create a user with a specific role', async () => {
    const user = await createAuthUser({
      role: TEST_ROLES.DOCTOR,
    });

    expect(user.role).toBe(TEST_ROLES.DOCTOR);

    // Verify role assignment in database
    const [roleAssignment] = await db
      .select()
      .from(user_has_roles)
      .where(eq(user_has_roles.user_id, user.id))
      .limit(1);

    expect(roleAssignment).toBeDefined();
  });

  it('should create users with role-specific helper functions', async () => {
    const admin = await createAdminUser();
    const doctor = await createDoctorUser();
    const nurse = await createNurseUser();
    const patient = await createPatientUser();

    expect(admin.role).toBe(TEST_ROLES.ADMIN);
    expect(doctor.role).toBe(TEST_ROLES.DOCTOR);
    expect(nurse.role).toBe(TEST_ROLES.NURSE);
    expect(patient.role).toBe(TEST_ROLES.PATIENT);
  });

  it('should create a user with a session when requested', async () => {
    const user = await createAuthUser({
      createSession: true,
    });

    expect(user.session).toBeDefined();
    expect(user.session.userId).toBe(user.id);
    expect(user.session.token).toBeDefined();
    expect(user.session.expiresAt).toBeInstanceOf(Date);
  });

  it('should create a user without a session by default', async () => {
    const user = await createAuthUser();

    expect(user.session).toBeNull();
  });
});

describe('Auth Helper - Session Management', () => {
  let testUser;

  beforeEach(async () => {
    await cleanupDatabase();
    testUser = await createAuthUser();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should create a valid session for a user', async () => {
    const session = await createAuthSession(testUser.id);

    expect(session).toBeDefined();
    expect(session.userId).toBe(testUser.id);
    expect(session.token).toBeDefined();
    expect(session.token.length).toBeGreaterThan(20);
    expect(session.expiresAt).toBeInstanceOf(Date);
    expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
  });

  it('should create sessions with custom expiration', async () => {
    const expiresInHours = 2;
    const session = await createAuthSession(testUser.id, {
      expiresInHours,
    });

    const expectedExpiry = Date.now() + expiresInHours * 60 * 60 * 1000;
    const actualExpiry = session.expiresAt.getTime();

    // Allow 5 second tolerance for test execution time
    expect(Math.abs(actualExpiry - expectedExpiry)).toBeLessThan(5000);
  });

  it('should verify a valid session', async () => {
    const session = await createAuthSession(testUser.id);
    const verification = await verifySession(session.token);

    expect(verification.valid).toBe(true);
    expect(verification.session).toBeDefined();
    expect(verification.user).toBeDefined();
    expect(verification.user.id).toBe(testUser.id);
  });

  it('should reject an invalid session token', async () => {
    const verification = await verifySession('invalid-token-12345');

    expect(verification.valid).toBe(false);
    expect(verification.error).toBeDefined();
  });

  it('should reject an expired session', async () => {
    const expiredUser = await createUserWithExpiredSession();
    const verification = await verifySession(expiredUser.sessionToken);

    expect(verification.valid).toBe(false);
    expect(verification.error).toContain('expired');
  });

  it('should invalidate a session', async () => {
    const session = await createAuthSession(testUser.id);

    // Verify session exists
    let verification = await verifySession(session.token);
    expect(verification.valid).toBe(true);

    // Invalidate session
    const result = await invalidateSession(session.token);
    expect(result).toBe(true);

    // Verify session is gone
    verification = await verifySession(session.token);
    expect(verification.valid).toBe(false);
  });

  it('should get all active sessions for a user', async () => {
    // Create multiple sessions
    await createAuthSession(testUser.id);
    await createAuthSession(testUser.id);
    await createAuthSession(testUser.id);

    const userSessions = await getUserSessions(testUser.id);

    expect(userSessions).toHaveLength(3);
    userSessions.forEach(session => {
      expect(session.userId).toBe(testUser.id);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });
  });

  it('should not return expired sessions for a user', async () => {
    // Create one valid session
    await createAuthSession(testUser.id);

    // Create an expired session for the same user directly in database
    await db.insert(sessions).values({
      id: nanoid(),
      userId: testUser.id,
      token: nanoid(32),
      expiresAt: new Date(Date.now() - 60 * 60 * 1000), // 1 hour ago
      ipAddress: '127.0.0.1',
      userAgent: 'Test Agent',
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000), // 2 hours ago
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000),
    });

    const userSessions = await getUserSessions(testUser.id);

    // Should only return the valid session (getUserSessions filters out expired ones)
    expect(userSessions).toHaveLength(1);
    expect(userSessions[0].expiresAt.getTime()).toBeGreaterThan(Date.now());
  });
});

describe('Auth Helper - Role Management', () => {
  let testUser;

  beforeEach(async () => {
    await cleanupDatabase();
    testUser = await createAuthUser({ role: null }); // Create without role
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should assign a role to a user', async () => {
    const result = await assignRoleToUser(testUser.id, TEST_ROLES.NURSE);

    expect(result.success).toBe(true);
    expect(result.role).toBeDefined();
    expect(result.role.name).toBe(TEST_ROLES.NURSE);

    // Verify in database
    const [assignment] = await db
      .select()
      .from(user_has_roles)
      .where(eq(user_has_roles.user_id, testUser.id))
      .limit(1);

    expect(assignment).toBeDefined();
  });

  it('should create a role if it does not exist', async () => {
    const customRole = 'test_custom_role';
    const result = await assignRoleToUser(testUser.id, customRole);

    expect(result.success).toBe(true);
    expect(result.role.name).toBe(customRole);

    // Verify role exists in database
    const [role] = await db
      .select()
      .from(roles)
      .where(eq(roles.name, customRole))
      .limit(1);

    expect(role).toBeDefined();
  });

  it('should not duplicate role assignments', async () => {
    // Assign role twice
    await assignRoleToUser(testUser.id, TEST_ROLES.DOCTOR);
    const result = await assignRoleToUser(testUser.id, TEST_ROLES.DOCTOR);

    expect(result.success).toBe(true);
    expect(result.alreadyAssigned).toBe(true);

    // Verify only one assignment exists
    const assignments = await db
      .select()
      .from(user_has_roles)
      .where(eq(user_has_roles.user_id, testUser.id));

    expect(assignments).toHaveLength(1);
  });
});

describe('Auth Helper - Authentication Utilities', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should create an authenticated user with session', async () => {
    const user = await createAuthenticatedUser();

    expect(user).toBeDefined();
    expect(user.session).toBeDefined();
    expect(user.sessionToken).toBe(user.session.token);
    expect(user.authHeaders).toBeDefined();
    expect(user.authCookies).toBeDefined();
  });

  it('should generate correct auth headers', async () => {
    const sessionToken = 'test-session-token-12345';
    const headers = getAuthHeaders(sessionToken);

    expect(headers['content-type']).toBe('application/json');
    expect(headers.origin).toBe('http://localhost:3000');
    expect(headers.cookie).toContain('better-auth.session_token=');
    expect(headers.cookie).toContain(sessionToken);
  });

  it('should generate correct auth cookies', async () => {
    const sessionToken = 'test-session-token-12345';
    const cookies = getAuthCookies(sessionToken);

    expect(cookies['better-auth.session_token']).toBe(sessionToken);
  });

  it('should merge additional headers', async () => {
    const sessionToken = 'test-session-token';
    const additionalHeaders = {
      'x-custom-header': 'custom-value',
      'accept': 'application/json',
    };

    const headers = getAuthHeaders(sessionToken, additionalHeaders);

    expect(headers['x-custom-header']).toBe('custom-value');
    expect(headers.accept).toBe('application/json');
    expect(headers.cookie).toContain(sessionToken);
  });

  it('should create multiple authenticated users with different roles', async () => {
    const users = await createAuthenticatedUsers({
      [TEST_ROLES.ADMIN]: 1,
      [TEST_ROLES.NURSE]: 2,
      [TEST_ROLES.PATIENT]: 3,
    });

    expect(users[TEST_ROLES.ADMIN]).toHaveLength(1);
    expect(users[TEST_ROLES.NURSE]).toHaveLength(2);
    expect(users[TEST_ROLES.PATIENT]).toHaveLength(3);

    // Verify all have sessions
    users[TEST_ROLES.ADMIN].forEach(user => {
      expect(user.session).toBeDefined();
      expect(user.sessionToken).toBeDefined();
    });
  });
});

describe('Auth Helper - Cleanup', () => {
  beforeEach(async () => {
    await cleanupDatabase();
  });

  afterEach(async () => {
    await cleanupDatabase();
  });

  it('should clean up all user authentication data', async () => {
    const user = await createAuthenticatedUser();
    await createAuthSession(user.id); // Create additional session

    // Verify data exists
    const [userBefore] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    expect(userBefore).toBeDefined();

    // Clean up
    await cleanupUserAuth(user.id);

    // Verify all data is gone
    const [userAfter] = await db
      .select()
      .from(users)
      .where(eq(users.id, user.id))
      .limit(1);

    expect(userAfter).toBeUndefined();

    const sessionsAfter = await db
      .select()
      .from(sessions)
      .where(eq(sessions.userId, user.id));

    expect(sessionsAfter).toHaveLength(0);
  });
});
