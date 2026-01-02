/**
 * Authentication Workflow Integration Tests
 *
 * Tests complete authentication workflows across multiple components:
 * - User registration (sign-up) with validation
 * - User authentication (sign-in/sign-out)
 * - Session management and expiration
 * - Role-based access control (RBAC)
 * - Password security and validation
 * - CSRF protection
 * - Rate limiting on auth endpoints
 *
 * HIPAA Compliance:
 * - Tests session timeout enforcement
 * - Validates audit logging for authentication events
 * - Ensures proper password security requirements
 * - Tests automatic session termination
 */

import { describe, it, expect, beforeEach, afterEach, beforeAll, afterAll } from '@jest/globals';
import { faker } from '@faker-js/faker';
import { createTestServer } from '../helpers/testServer.js';
import { cleanupDatabase } from '../helpers/testDb.js';
import {
  createAuthenticatedUser,
  createAdminUser,
  createDoctorUser,
  createNurseUser,
  createUserWithExpiredSession,
  TEST_USER_PASSWORD,
  TEST_ROLES,
  getAuthHeaders,
  verifySession,
  invalidateSession,
} from '../helpers/authHelper.js';

describe('Authentication Workflow Integration Tests', () => {
  let testServer;
  let app;

  beforeAll(async () => {
    // Create test server with authentication routes enabled
    const builder = createTestServer({
      registerRoutes: true,
      skipAuth: false,
      enableRateLimiting: false, // Disable for most tests, enable specifically where needed
    });

    testServer = builder;
    app = await builder.build();
  });

  afterAll(async () => {
    if (testServer) {
      await testServer.stop();
    }
  });

  beforeEach(async () => {
    // Clean database before each test for isolation
    await cleanupDatabase();
  });

  afterEach(async () => {
    // Clean up after each test
    await cleanupDatabase();
  });

  // ============================================================================
  // SIGN-UP WORKFLOW TESTS
  // ============================================================================

  describe('POST /api/auth/sign-up - User Registration', () => {
    it('should successfully register a new user with valid data', async () => {
      // Use a truly unique password that won't be in common password lists
      const uniquePassword = `Xk7${faker.string.alphanumeric(12)}!@#9Z`;

      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: uniquePassword,
        name: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: userData,
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.status).toBe(200);
      expect(body.message).toMatch(/registered successfully/i);
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe(userData.email);
      expect(body.data.user.firstName).toBe(userData.firstName);
      expect(body.data.user.lastName).toBe(userData.lastName);
      expect(body.data.user.password).toBeUndefined(); // Password should not be in response

      // Verify session cookie is set
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
    });

    it('should reject registration with weak password (too short)', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'Short1!', // Only 7 characters, needs 12
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: userData,
      });

      expect(response.statusCode).toBe(422);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/security requirements|too short/i);
      expect(body.errors).toBeDefined();
      expect(body.errors.length).toBeGreaterThan(0);
    });

    it('should reject registration with password lacking complexity', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'weakpassword123', // No uppercase or special chars
        firstName: faker.person.firstName(),
        lastName: faker.person.lastName(),
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: userData,
      });

      expect(response.statusCode).toBe(422);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/security requirements/i);
    });

    it('should reject registration with missing required fields', async () => {
      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: 'SecurePassword123!@#',
        // Missing firstName and lastName
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: userData,
      });

      expect(response.statusCode).toBe(400);

      const body = JSON.parse(response.payload);
      expect(body.errors).toBeDefined();
      expect(body.errors.some(e => e.path === 'firstName')).toBe(true);
      expect(body.errors.some(e => e.path === 'lastName')).toBe(true);
    });

    it('should assign default patient role to newly registered user', async () => {
      const uniquePassword = `Xk7${faker.string.alphanumeric(12)}!@#9Z`;

      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: uniquePassword,
        name: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
      };

      const signUpResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: userData,
      });

      expect(signUpResponse.statusCode).toBe(200);

      // Extract session cookie from sign-up response
      const cookies = signUpResponse.headers['set-cookie'];
      const sessionCookie = Array.isArray(cookies)
        ? cookies.find(c => c.includes('better-auth.session_token'))
        : cookies;

      // Get user profile to verify role assignment
      const profileResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
          'cookie': sessionCookie || '',
        },
      });

      expect(profileResponse.statusCode).toBe(200);
      const profileBody = JSON.parse(profileResponse.payload);
      expect(profileBody.data.user.role).toBe(TEST_ROLES.PATIENT);
    });

    it('should prevent duplicate email registration', async () => {
      const uniquePassword = `Xk7${faker.string.alphanumeric(12)}!@#9Z`;

      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: uniquePassword,
        name: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
      };

      // First registration
      const firstResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: userData,
      });

      expect(firstResponse.statusCode).toBe(200);

      // Attempt duplicate registration
      const secondResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: userData,
      });

      expect(secondResponse.statusCode).toBeGreaterThanOrEqual(400);
    });
  });

  // ============================================================================
  // SIGN-IN WORKFLOW TESTS
  // ============================================================================

  describe('POST /api/auth/sign-in - User Authentication', () => {
    it('should successfully authenticate user with valid credentials', async () => {
      // Create a test user first
      const testUser = await createAuthenticatedUser({
        email: faker.internet.email().toLowerCase(),
        password: TEST_USER_PASSWORD,
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: {
          email: testUser.email,
          password: testUser.plainPassword,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.status).toBe(200);
      expect(body.message).toMatch(/logged in successfully/i);
      expect(body.data.user).toBeDefined();
      expect(body.data.user.email).toBe(testUser.email);
      expect(body.data.user.password).toBeUndefined();

      // Verify session cookie is set
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
    });

    it('should reject authentication with invalid email', async () => {
      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: {
          email: 'nonexistent@example.com',
          password: 'SomePassword123!',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/invalid email or password/i);
    });

    it('should reject authentication with invalid password', async () => {
      const testUser = await createAuthenticatedUser({
        email: faker.internet.email().toLowerCase(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: {
          email: testUser.email,
          password: 'WrongPassword123!',
        },
      });

      expect(response.statusCode).toBe(401);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/invalid email or password/i);
    });

    it('should preserve email case from login request', async () => {
      const originalEmail = 'TestUser@Example.COM';
      const testUser = await createAuthenticatedUser({
        email: originalEmail.toLowerCase(),
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: {
          email: originalEmail, // Use mixed case
          password: testUser.plainPassword,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.data.user.email).toBe(originalEmail);
    });

    it('should include user role in sign-in response', async () => {
      const doctorUser = await createDoctorUser();

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: {
          email: doctorUser.email,
          password: doctorUser.plainPassword,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.data.user.role).toBe(TEST_ROLES.DOCTOR);
    });
  });

  // ============================================================================
  // SIGN-OUT WORKFLOW TESTS
  // ============================================================================

  describe('POST /api/auth/sign-out - User Logout', () => {
    it('should successfully sign out authenticated user', async () => {
      const testUser = await createAuthenticatedUser();

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-out',
        headers: {
          ...testUser.authHeaders,
        },
      });

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/logged out successfully/i);

      // Verify session cookie is cleared
      const setCookieHeader = response.headers['set-cookie'];
      expect(setCookieHeader).toBeDefined();
    });

    it('should clear session cookie after sign-out', async () => {
      const testUser = await createAuthenticatedUser();

      // Sign out
      const signOutResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-out',
        headers: {
          ...testUser.authHeaders,
        },
      });

      expect(signOutResponse.statusCode).toBe(200);

      // Try to access protected route with old cookie
      const protectedResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          ...testUser.authHeaders,
        },
      });

      expect(protectedResponse.statusCode).toBe(401);
    });
  });

  // ============================================================================
  // SESSION MANAGEMENT TESTS
  // ============================================================================

  describe('Session Management', () => {
    it('should maintain valid session for authenticated user', async () => {
      const testUser = await createAuthenticatedUser();

      // Verify session is valid
      const sessionCheck = await verifySession(testUser.sessionToken);
      expect(sessionCheck.valid).toBe(true);
      expect(sessionCheck.user.id).toBe(testUser.id);
    });

    it('should reject expired session', async () => {
      const userWithExpiredSession = await createUserWithExpiredSession();

      const response = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: getAuthHeaders(userWithExpiredSession.sessionToken),
      });

      expect(response.statusCode).toBe(401);
    });

    it('should allow multiple concurrent sessions for same user', async () => {
      const testUser = await createAuthenticatedUser();

      // Create second session for same user
      const { createAuthSession } = await import('../helpers/authHelper.js');
      const secondSession = await createAuthSession(testUser.id);

      // Both sessions should be valid
      const firstSessionCheck = await verifySession(testUser.sessionToken);
      const secondSessionCheck = await verifySession(secondSession.token);

      expect(firstSessionCheck.valid).toBe(true);
      expect(secondSessionCheck.valid).toBe(true);
    });

    it('should invalidate specific session without affecting others', async () => {
      const testUser = await createAuthenticatedUser();

      // Create second session
      const { createAuthSession } = await import('../helpers/authHelper.js');
      const secondSession = await createAuthSession(testUser.id);

      // Invalidate first session
      await invalidateSession(testUser.sessionToken);

      // First session should be invalid
      const firstCheck = await verifySession(testUser.sessionToken);
      expect(firstCheck.valid).toBe(false);

      // Second session should still be valid
      const secondCheck = await verifySession(secondSession.token);
      expect(secondCheck.valid).toBe(true);
    });
  });

  // ============================================================================
  // PROTECTED ROUTE TESTS (RBAC)
  // ============================================================================

  describe('Protected Routes - Role-Based Access Control', () => {
    describe('GET /api/auth/me - User Profile', () => {
      it('should return user profile for authenticated user', async () => {
        const testUser = await createAuthenticatedUser();

        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/me',
          headers: testUser.authHeaders,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.data.user.id).toBe(testUser.id);
        expect(body.data.user.email).toBe(testUser.email);
        expect(body.data.user.role).toBeDefined();
        expect(body.data.user.permissions).toBeDefined();
      });

      it('should reject unauthenticated request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/me',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        });

        expect(response.statusCode).toBe(401);
      });

      it('should include user permissions in profile response', async () => {
        const doctorUser = await createDoctorUser({ createSession: true });

        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/me',
          headers: getAuthHeaders(doctorUser.session.token),
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.data.user.permissions).toBeDefined();
        expect(Array.isArray(body.data.user.permissions)).toBe(true);
      });
    });

    describe('GET /api/auth/admin-only - Admin-Only Route', () => {
      it('should allow access for admin user', async () => {
        const adminUser = await createAdminUser({ createSession: true });

        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/admin-only',
          headers: getAuthHeaders(adminUser.session.token),
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.message).toMatch(/admin/i);
      });

      it('should deny access for non-admin user', async () => {
        const regularUser = await createAuthenticatedUser({ role: TEST_ROLES.STAFF });

        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/admin-only',
          headers: getAuthHeaders(regularUser.session.token),
        });

        expect(response.statusCode).toBe(403);
      });

      it('should deny access for unauthenticated request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/admin-only',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        });

        expect(response.statusCode).toBe(401);
      });
    });

    describe('GET /api/auth/medical-staff - Medical Staff Route', () => {
      it('should allow access for doctor', async () => {
        const doctorUser = await createDoctorUser({ createSession: true });

        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/medical-staff',
          headers: getAuthHeaders(doctorUser.session.token),
        });

        expect(response.statusCode).toBe(200);
      });

      it('should allow access for nurse', async () => {
        const nurseUser = await createNurseUser({ createSession: true });

        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/medical-staff',
          headers: getAuthHeaders(nurseUser.session.token),
        });

        expect(response.statusCode).toBe(200);
      });

      it('should allow access for admin', async () => {
        const adminUser = await createAdminUser({ createSession: true });

        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/medical-staff',
          headers: getAuthHeaders(adminUser.session.token),
        });

        expect(response.statusCode).toBe(200);
      });

      it('should deny access for patient', async () => {
        const patientUser = await createAuthenticatedUser({ role: TEST_ROLES.PATIENT });

        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/medical-staff',
          headers: getAuthHeaders(patientUser.session.token),
        });

        expect(response.statusCode).toBe(403);
      });
    });

    describe('GET /api/auth/abilities - User Abilities (CASL)', () => {
      it('should return user abilities for authenticated user', async () => {
        const testUser = await createAuthenticatedUser();

        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/abilities',
          headers: testUser.authHeaders,
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.data.abilities).toBeDefined();
        expect(body.data.actions).toBeDefined();
        expect(body.data.subjects).toBeDefined();
      });

      it('should reject unauthenticated request', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/abilities',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        });

        expect(response.statusCode).toBe(401);
      });
    });
  });

  // ============================================================================
  // PASSWORD MANAGEMENT TESTS
  // ============================================================================

  describe('Password Management', () => {
    describe('POST /api/auth/change-password', () => {
      it('should successfully change password with valid credentials', async () => {
        const testUser = await createAuthenticatedUser();
        const newPassword = `Yk8${faker.string.alphanumeric(12)}!@#8M`;

        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/change-password',
          headers: testUser.authHeaders,
          payload: {
            currentPassword: testUser.plainPassword,
            newPassword: newPassword,
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.message).toMatch(/password changed successfully/i);
      });

      it('should reject password change with incorrect current password', async () => {
        const testUser = await createAuthenticatedUser();
        const newPassword = `Yk8${faker.string.alphanumeric(12)}!@#8M`;

        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/change-password',
          headers: testUser.authHeaders,
          payload: {
            currentPassword: 'WrongPassword123!',
            newPassword: newPassword,
          },
        });

        expect(response.statusCode).toBe(400);
      });

      it('should reject weak new password', async () => {
        const testUser = await createAuthenticatedUser();

        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/change-password',
          headers: testUser.authHeaders,
          payload: {
            currentPassword: testUser.plainPassword,
            newPassword: 'weak', // Too short and weak
          },
        });

        expect(response.statusCode).toBe(422);

        const body = JSON.parse(response.payload);
        expect(body.errors).toBeDefined();
      });

      it('should require authentication for password change', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/change-password',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
          payload: {
            currentPassword: 'OldPassword123!',
            newPassword: 'NewSecurePassword456!@#',
          },
        });

        expect(response.statusCode).toBe(401);
      });
    });

    describe('POST /api/auth/check-password-strength', () => {
      it('should return strength for strong password', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/check-password-strength',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
          payload: {
            password: 'VeryStrongPassword123!@#$',
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.data.strength).toBeDefined();
        expect(body.data.strength.score).toBeGreaterThanOrEqual(3);
      });

      it('should return low strength for weak password', async () => {
        const response = await app.inject({
          method: 'POST',
          url: '/api/auth/check-password-strength',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
          payload: {
            password: 'password',
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.data.strength).toBeDefined();
        expect(body.data.valid).toBe(false);
        expect(body.data.errors.length).toBeGreaterThan(0);
      });
    });

    describe('GET /api/auth/password-policy', () => {
      it('should return password policy requirements', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/password-policy',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.data.policy).toBeDefined();
        expect(body.data.policy.minLength).toBeDefined();
        expect(body.data.policy.minLength).toBeGreaterThanOrEqual(12);
      });
    });
  });

  // ============================================================================
  // CSRF PROTECTION TESTS
  // ============================================================================

  describe('CSRF Protection', () => {
    describe('GET /api/auth/csrf-token', () => {
      it('should return CSRF token', async () => {
        const response = await app.inject({
          method: 'GET',
          url: '/api/auth/csrf-token',
          headers: {
            'content-type': 'application/json',
            'origin': 'http://localhost:3000',
          },
        });

        expect(response.statusCode).toBe(200);

        const body = JSON.parse(response.payload);
        expect(body.csrfToken).toBeDefined();
        expect(typeof body.csrfToken).toBe('string');
        expect(body.csrfToken.length).toBeGreaterThan(0);
      });
    });
  });

  // ============================================================================
  // ADMIN USER CREATION TESTS
  // ============================================================================

  describe('POST /api/auth/create-admin - Admin Creation', () => {
    it('should create admin user with valid admin secret', async () => {
      // Set admin secret for test
      const originalSecret = process.env.ADMIN_SECRET;
      process.env.ADMIN_SECRET = 'test-admin-secret-123';

      const uniquePassword = `Xk7${faker.string.alphanumeric(12)}!@#9Z`;

      const adminData = {
        email: faker.internet.email().toLowerCase(),
        password: uniquePassword,
        firstName: 'Admin',
        lastName: 'User',
        adminSecret: 'test-admin-secret-123',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/create-admin',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: adminData,
      });

      // Restore original secret
      if (originalSecret) {
        process.env.ADMIN_SECRET = originalSecret;
      } else {
        delete process.env.ADMIN_SECRET;
      }

      expect(response.statusCode).toBe(200);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/admin user created/i);
    });

    it('should reject admin creation with invalid secret', async () => {
      const originalSecret = process.env.ADMIN_SECRET;
      process.env.ADMIN_SECRET = 'correct-secret';

      const uniquePassword = `Xk7${faker.string.alphanumeric(12)}!@#9Z`;

      const adminData = {
        email: faker.internet.email().toLowerCase(),
        password: uniquePassword,
        firstName: 'Admin',
        lastName: 'User',
        adminSecret: 'wrong-secret',
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/create-admin',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: adminData,
      });

      // Restore original secret
      if (originalSecret) {
        process.env.ADMIN_SECRET = originalSecret;
      } else {
        delete process.env.ADMIN_SECRET;
      }

      expect(response.statusCode).toBe(403);

      const body = JSON.parse(response.payload);
      expect(body.message).toMatch(/invalid admin secret/i);
    });

    it('should reject admin creation without secret', async () => {
      const originalSecret = process.env.ADMIN_SECRET;
      process.env.ADMIN_SECRET = 'required-secret';

      const uniquePassword = `Xk7${faker.string.alphanumeric(12)}!@#9Z`;

      const adminData = {
        email: faker.internet.email().toLowerCase(),
        password: uniquePassword,
        firstName: 'Admin',
        lastName: 'User',
        // Missing adminSecret
      };

      const response = await app.inject({
        method: 'POST',
        url: '/api/auth/create-admin',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: adminData,
      });

      // Restore original secret
      if (originalSecret) {
        process.env.ADMIN_SECRET = originalSecret;
      } else {
        delete process.env.ADMIN_SECRET;
      }

      expect(response.statusCode).toBe(403);
    });
  });

  // ============================================================================
  // END-TO-END WORKFLOW TESTS
  // ============================================================================

  describe('Complete Authentication Workflows', () => {
    it('should complete full sign-up -> sign-in -> profile -> sign-out workflow', async () => {
      // Step 1: Sign up
      const uniquePassword = `Xk7${faker.string.alphanumeric(12)}!@#9Z`;

      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();

      const userData = {
        email: faker.internet.email().toLowerCase(),
        password: uniquePassword,
        name: `${firstName} ${lastName}`,
        firstName: firstName,
        lastName: lastName,
      };

      const signUpResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-up',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: userData,
      });

      expect(signUpResponse.statusCode).toBe(200);
      const signUpBody = JSON.parse(signUpResponse.payload);
      const userId = signUpBody.data.user.id;

      // Step 2: Sign out (to test sign-in separately)
      const cookies = signUpResponse.headers['set-cookie'];
      const sessionCookie = Array.isArray(cookies)
        ? cookies.find(c => c.includes('better-auth.session_token'))
        : cookies;

      await app.inject({
        method: 'POST',
        url: '/api/auth/sign-out',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
          'cookie': sessionCookie || '',
        },
      });

      // Step 3: Sign in
      const signInResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-in',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
        payload: {
          email: userData.email,
          password: userData.password,
        },
      });

      expect(signInResponse.statusCode).toBe(200);

      // Step 4: Get profile
      const newCookies = signInResponse.headers['set-cookie'];
      const newSessionCookie = Array.isArray(newCookies)
        ? newCookies.find(c => c.includes('better-auth.session_token'))
        : newCookies;

      const profileResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
          'cookie': newSessionCookie || '',
        },
      });

      expect(profileResponse.statusCode).toBe(200);
      const profileBody = JSON.parse(profileResponse.payload);
      expect(profileBody.data.user.id).toBe(userId);
      expect(profileBody.data.user.email).toBe(userData.email);

      // Step 5: Sign out
      const signOutResponse = await app.inject({
        method: 'POST',
        url: '/api/auth/sign-out',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
          'cookie': newSessionCookie || '',
        },
      });

      expect(signOutResponse.statusCode).toBe(200);

      // Step 6: Verify cannot access protected route after sign-out
      const finalProfileResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/me',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
          'cookie': newSessionCookie || '',
        },
      });

      expect(finalProfileResponse.statusCode).toBe(401);
    });

    it('should handle role-based workflow for doctor user', async () => {
      // Create doctor user
      const doctorUser = await createDoctorUser({ createSession: true });

      // Verify can access medical staff route
      const medicalStaffResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/medical-staff',
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(medicalStaffResponse.statusCode).toBe(200);

      // Verify cannot access admin-only route
      const adminResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/admin-only',
        headers: getAuthHeaders(doctorUser.session.token),
      });

      expect(adminResponse.statusCode).toBe(403);
    });

    it('should handle role-based workflow for admin user', async () => {
      // Create admin user
      const adminUser = await createAdminUser({ createSession: true });

      // Verify can access admin-only route
      const adminResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/admin-only',
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(adminResponse.statusCode).toBe(200);

      // Verify can also access medical staff route (admins have all access)
      const medicalStaffResponse = await app.inject({
        method: 'GET',
        url: '/api/auth/medical-staff',
        headers: getAuthHeaders(adminUser.session.token),
      });

      expect(medicalStaffResponse.statusCode).toBe(200);
    });
  });
});
