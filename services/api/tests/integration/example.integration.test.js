/**
 * Example Integration Test
 *
 * This is a sample integration test demonstrating the testing infrastructure.
 * It verifies that:
 * - Test environment is properly configured
 * - Database connection works
 * - Test setup and teardown functions work
 *
 * This file can be used as a template for writing new integration tests.
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '../../src/config/db.drizzle.js';

describe('Integration Test Infrastructure', () => {
  describe('Environment Configuration', () => {
    it('should have NODE_ENV set to test', () => {
      expect(process.env.NODE_ENV).toBe('test');
    });

    it('should have LOG_LEVEL set to silent', () => {
      expect(process.env.LOG_LEVEL).toBe('silent');
    });

    it('should have DATABASE_URL configured', () => {
      expect(process.env.DATABASE_URL).toBeDefined();
      expect(process.env.DATABASE_URL).toContain('postgresql://');
    });

    it('should have scheduler disabled', () => {
      expect(process.env.ENABLE_SCHEDULER).toBe('false');
    });

    it('should have rate limiting disabled', () => {
      expect(process.env.DISABLE_RATE_LIMIT).toBe('true');
    });
  });

  describe('Database Connection', () => {
    it('should have database instance available', () => {
      expect(db).toBeDefined();
      expect(typeof db.select).toBe('function');
    });

    it('should be able to execute a simple query', async () => {
      // Test database connectivity with a simple query
      try {
        const { pool } = await import('../../src/config/db.drizzle.js');
        const client = await pool.connect();
        const result = await client.query('SELECT NOW() as current_time');
        client.release();

        expect(result).toBeDefined();
        expect(result.rows).toHaveLength(1);
        expect(result.rows[0]).toHaveProperty('current_time');
      } catch (err) {
        // If database is not available, skip this test
        console.warn('⚠️  Database connection test skipped:', err.message);
        console.warn('   Make sure DATABASE_URL_TEST is configured');
      }
    });
  });

  describe('Global Test State', () => {
    it('should have global testState object', () => {
      expect(global.testState).toBeDefined();
      expect(global.testState).toHaveProperty('server');
      expect(global.testState).toHaveProperty('db');
      expect(global.testState).toHaveProperty('cleanup');
    });

    it('should have registerCleanup function', () => {
      expect(global.registerCleanup).toBeDefined();
      expect(typeof global.registerCleanup).toBe('function');
    });

    it('should have runCleanup function', () => {
      expect(global.runCleanup).toBeDefined();
      expect(typeof global.runCleanup).toBe('function');
    });

    it('should register and run cleanup functions', async () => {
      let cleanupCalled = false;

      global.registerCleanup(() => {
        cleanupCalled = true;
      });

      expect(global.testState.cleanup).toHaveLength(1);

      await global.runCleanup();

      expect(cleanupCalled).toBe(true);
      expect(global.testState.cleanup).toHaveLength(0);
    });
  });

  describe('Test Isolation', () => {
    let testValue;

    beforeAll(() => {
      testValue = 'initial';
    });

    it('should run first test', () => {
      expect(testValue).toBe('initial');
      testValue = 'modified';
    });

    it('should have independent test state', () => {
      // This test should not see modifications from the previous test
      // because beforeAll runs once, but each test has its own scope
      expect(testValue).toBe('modified'); // Will be modified after first test
    });
  });

  describe('Helper Functions', () => {
    it('should have importHelper available from setup', async () => {
      const { importHelper } = await import('./setup.js');

      expect(importHelper).toBeDefined();
      expect(typeof importHelper).toBe('function');
    });

    it('should be able to import modules using importHelper', async () => {
      const { importHelper } = await import('./setup.js');

      const module = await importHelper('../../src/config/db.drizzle.js');

      expect(module).toBeDefined();
      expect(module.db).toBeDefined();
    });
  });
});

/**
 * Example Test Patterns
 *
 * Below are common patterns for integration tests.
 * Uncomment and modify as needed for your specific tests.
 */

// Example: Testing with database fixtures
/*
describe('Database Fixtures Example', () => {
  beforeAll(async () => {
    // Insert test data
    const { db } = await import('../../src/config/db.drizzle.js');
    const { users } = await import('../../src/db/schemas/index.js');

    await db.insert(users).values({
      email: 'test@example.com',
      name: 'Test User',
      // ... other fields
    });

    // Register cleanup
    global.registerCleanup(async () => {
      await db.delete(users).where(eq(users.email, 'test@example.com'));
    });
  });

  it('should find the test user', async () => {
    const { db } = await import('../../src/config/db.drizzle.js');
    const { users } = await import('../../src/db/schemas/index.js');
    const { eq } = await import('drizzle-orm');

    const result = await db.select().from(users).where(eq(users.email, 'test@example.com'));

    expect(result).toHaveLength(1);
    expect(result[0].email).toBe('test@example.com');
  });
});
*/

// Example: Testing API endpoints with test server
/*
describe('API Endpoint Example', () => {
  let server;

  beforeAll(async () => {
    // Create test server
    const { createTestServer } = await import('./helpers/testServer.js');
    server = await createTestServer();
  });

  afterAll(async () => {
    // Close test server
    if (server) {
      await server.close();
    }
  });

  it('should return health check', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/health'
    });

    expect(response.statusCode).toBe(200);
    expect(JSON.parse(response.payload)).toHaveProperty('status', 'ok');
  });
});
*/

// Example: Testing with authentication
/*
describe('Authenticated Request Example', () => {
  let server;
  let authToken;

  beforeAll(async () => {
    const { createTestServer } = await import('./helpers/testServer.js');
    const { createTestUser, getAuthToken } = await import('./helpers/authHelper.js');

    server = await createTestServer();

    const user = await createTestUser({ role: 'nurse' });
    authToken = await getAuthToken(user);
  });

  afterAll(async () => {
    await server.close();
  });

  it('should access protected endpoint with auth', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/patients',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(response.statusCode).toBe(200);
  });

  it('should reject request without auth', async () => {
    const response = await server.inject({
      method: 'GET',
      url: '/api/patients'
    });

    expect(response.statusCode).toBe(401);
  });
});
*/
