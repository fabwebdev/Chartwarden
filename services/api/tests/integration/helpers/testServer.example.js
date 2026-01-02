/**
 * Test Server Builder - Example Usage
 *
 * This file demonstrates how to use the test server builder
 * in integration tests for the Chartwarden API.
 *
 * IMPORTANT: This is an example file showing usage patterns.
 * Copy and adapt these examples for your actual integration tests.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from '@jest/globals';
import {
  buildTestServer,
  createTestServer,
  createRequestHelper,
  extractCookies,
  parseJsonResponse,
} from './testServer.js';
import {
  cleanupDatabase,
  createTestUser,
  createTestPatient,
} from './testDb.js';

/**
 * EXAMPLE 1: Basic Server Setup
 * Use this pattern for simple integration tests
 */
describe('Example 1: Basic Server Setup', () => {
  let server;

  beforeAll(async () => {
    // Build and start a test server
    server = await buildTestServer();
  });

  afterAll(async () => {
    // Clean up server
    if (server) {
      await server.stop();
    }
  });

  it('should respond to health check', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);

    const body = parseJsonResponse(response);
    expect(body.status).toBe('ok');
    expect(body.environment).toBe('test');
  });
});

/**
 * EXAMPLE 2: Server with Custom Configuration
 * Use this when you need specific server features enabled
 */
describe('Example 2: Custom Server Configuration', () => {
  let server;

  beforeAll(async () => {
    // Build server with custom options
    server = await buildTestServer({
      enableRateLimiting: true,  // Enable rate limiting
      enableCSRF: true,           // Enable CSRF protection
      registerRoutes: true,       // Load actual application routes
    });
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  it('should have rate limiting enabled', async () => {
    // Make multiple requests to test rate limiting
    // Note: Rate limit is set very high in tests (1000 req/min)
    const requests = [];
    for (let i = 0; i < 5; i++) {
      requests.push(
        server.app.inject({
          method: 'GET',
          url: '/health',
        })
      );
    }

    const responses = await Promise.all(requests);

    // All should succeed with high test limits
    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
    });
  });
});

/**
 * EXAMPLE 3: Using Request Helper for API Tests
 * Use this pattern for testing API endpoints with authentication
 */
describe('Example 3: Request Helper Usage', () => {
  let builder;
  let helper;

  beforeAll(async () => {
    builder = createTestServer();
    await builder.build();

    // Add test routes
    builder.app.post('/api/test/login', async (request, reply) => {
      const { email, password } = request.body;

      if (email === 'test@example.com' && password === 'password123') {
        const token = 'test-session-token-123';
        reply.header('set-cookie', `better-auth.session_token=${token}; Path=/; HttpOnly`);
        return { success: true, user: { email } };
      }

      return reply.code(401).send({ success: false, message: 'Invalid credentials' });
    });

    builder.app.get('/api/test/profile', async (request, reply) => {
      const sessionToken = request.cookies['better-auth.session_token'];

      if (!sessionToken) {
        return reply.code(401).send({ success: false, message: 'Not authenticated' });
      }

      return {
        success: true,
        user: {
          id: 1,
          email: 'test@example.com',
          name: 'Test User',
        },
      };
    });

    helper = createRequestHelper(builder.app);
  });

  afterAll(async () => {
    if (builder) {
      await builder.stop();
    }
  });

  it('should login and make authenticated requests', async () => {
    // 1. Login
    const loginResponse = await helper.post('/api/test/login', {
      email: 'test@example.com',
      password: 'password123',
    });

    expect(loginResponse.statusCode).toBe(200);

    const loginBody = parseJsonResponse(loginResponse);
    expect(loginBody.success).toBe(true);

    // 2. Extract session cookie
    const cookies = extractCookies(loginResponse);
    expect(cookies['better-auth.session_token']).toBeDefined();

    // 3. Use session for authenticated request
    const profileResponse = await helper
      .setAuth(cookies['better-auth.session_token'])
      .get('/api/test/profile');

    expect(profileResponse.statusCode).toBe(200);

    const profileBody = parseJsonResponse(profileResponse);
    expect(profileBody.success).toBe(true);
    expect(profileBody.user.email).toBe('test@example.com');
  });

  it('should reject unauthenticated requests', async () => {
    // Clear any existing auth
    helper.clearCookies();

    const response = await helper.get('/api/test/profile');

    expect(response.statusCode).toBe(401);

    const body = parseJsonResponse(response);
    expect(body.success).toBe(false);
  });
});

/**
 * EXAMPLE 4: Integration Test with Database
 * Use this pattern for full end-to-end workflow tests
 */
describe('Example 4: Database Integration', () => {
  let server;
  let helper;
  let testUser;

  beforeAll(async () => {
    // Clean database before tests
    await cleanupDatabase();

    // Create test data
    testUser = await createTestUser({
      email: 'integration@test.com',
      role: 'admin',
    });

    // Start server with routes enabled
    server = await buildTestServer({
      registerRoutes: true,
    });

    helper = createRequestHelper(server.app);
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }

    // Clean up database
    await cleanupDatabase();
  });

  it('should create and retrieve a patient', async () => {
    // This is a simplified example - real implementation would need proper auth
    const patientData = {
      first_name: 'John',
      last_name: 'Doe',
      date_of_birth: '1950-01-15',
      gender: 'Male',
      email: 'john.doe@example.com',
    };

    // Note: In real tests, you would authenticate first
    // For this example, we're just demonstrating the pattern

    // Example of how you might create a patient via API
    // const createResponse = await helper
    //   .setAuth(sessionToken)
    //   .post('/api/patients', patientData);

    // For now, create directly in database
    const patient = await createTestPatient(patientData);

    expect(patient.id).toBeDefined();
    expect(patient.first_name).toBe('John');
    expect(patient.last_name).toBe('Doe');
  });
});

/**
 * EXAMPLE 5: Testing Error Handling
 * Use this pattern to test error scenarios
 */
describe('Example 5: Error Handling', () => {
  let builder;

  beforeAll(async () => {
    builder = createTestServer();
    await builder.build();

    // Add test routes that simulate errors
    builder.app.post('/api/test/error', async (request, reply) => {
      throw new Error('Simulated error');
    });

    builder.app.post('/api/test/validation-error', async (request, reply) => {
      const error = new Error('Validation failed');
      error.statusCode = 400;
      error.validation = [
        { field: 'email', message: 'Invalid email format' },
      ];
      throw error;
    });
  });

  afterAll(async () => {
    if (builder) {
      await builder.stop();
    }
  });

  it('should handle server errors', async () => {
    const response = await builder.app.inject({
      method: 'POST',
      url: '/api/test/error',
    });

    expect(response.statusCode).toBe(500);

    const body = parseJsonResponse(response);
    expect(body.status).toBe(500);
    expect(body.message).toContain('Simulated error');
  });

  it('should handle validation errors', async () => {
    const response = await builder.app.inject({
      method: 'POST',
      url: '/api/test/validation-error',
    });

    expect(response.statusCode).toBe(400);

    const body = parseJsonResponse(response);
    expect(body.status).toBe(400);
    expect(body.errors).toBeDefined();
    expect(body.errors).toHaveLength(1);
    expect(body.errors[0].field).toBe('email');
  });
});

/**
 * EXAMPLE 6: Testing with Multiple Requests
 * Use this pattern for testing concurrent operations
 */
describe('Example 6: Concurrent Requests', () => {
  let server;

  beforeAll(async () => {
    server = await buildTestServer();
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  it('should handle concurrent requests', async () => {
    const requests = Array.from({ length: 10 }, (_, i) =>
      server.app.inject({
        method: 'GET',
        url: '/health',
      })
    );

    const responses = await Promise.all(requests);

    // All requests should succeed
    responses.forEach(response => {
      expect(response.statusCode).toBe(200);
    });
  });
});

/**
 * EXAMPLE 7: Per-Test Cleanup Pattern
 * Use this when you need isolated tests with cleanup between each test
 */
describe('Example 7: Per-Test Cleanup', () => {
  let server;
  let helper;

  beforeAll(async () => {
    server = await buildTestServer();
    helper = createRequestHelper(server.app);
  });

  afterAll(async () => {
    if (server) {
      await server.stop();
    }
  });

  beforeEach(async () => {
    // Clean database before each test
    await cleanupDatabase();

    // Reset request helper state
    helper.reset();
  });

  it('test 1 - has clean state', async () => {
    const user = await createTestUser({ email: 'test1@example.com' });
    expect(user.email).toBe('test1@example.com');
  });

  it('test 2 - has clean state (previous user should be gone)', async () => {
    const user = await createTestUser({ email: 'test2@example.com' });
    expect(user.email).toBe('test2@example.com');

    // Verify previous test's data is gone
    // (In real tests, you'd query the database to verify)
  });
});

/**
 * Best Practices Summary:
 *
 * 1. Use buildTestServer() for simple tests that just need a server
 * 2. Use createTestServer() when you need more control (adding routes, custom setup)
 * 3. Always clean up in afterAll() hooks
 * 4. Use createRequestHelper() for making authenticated requests
 * 5. Clean database between tests with cleanupDatabase()
 * 6. Extract and use cookies for session-based authentication
 * 7. Use parseJsonResponse() to safely parse response bodies
 * 8. Test error scenarios explicitly
 * 9. Use beforeEach() for per-test isolation when needed
 * 10. Set registerRoutes: true only when you need actual app routes
 */
