import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import { createTestServer } from './helpers/testServer.js';
import { cleanupDatabase } from './helpers/testDb.js';
import { createAuthenticatedUser } from './helpers/authHelper.js';

describe('Quick Auth Cookie Test', () => {
  let testServer, app;

  beforeAll(async () => {
    console.log('BETTER_AUTH_URL:', process.env.BETTER_AUTH_URL);
    console.log('BETTER_AUTH_SECRET:', process.env.BETTER_AUTH_SECRET?.substring(0, 20) + '...');
    console.log('NODE_ENV:', process.env.NODE_ENV);

    const builder = createTestServer({ registerRoutes: true, skipAuth: false });
    testServer = builder;
    app = await builder.build();
  });

  afterAll(async () => {
    if (testServer) await testServer.stop();
  });

  beforeEach(async () => {
    await cleanupDatabase();
  });

  it('should test if auth routes are registered', async () => {
    // First, try an unprotected route
    const healthResponse = await app.inject({
      method: 'GET',
      url: '/health',
    });
    console.log('Health route status:', healthResponse.statusCode);

    // Try sign-in route (should exist even if not authenticated)
    const signInResponse = await app.inject({
      method: 'POST',
      url: '/api/auth/sign-in',
      headers: {
        'content-type': 'application/json',
        'origin': 'http://localhost:3000',
      },
      payload: {
        email: 'test@example.com',
        password: 'wrongpassword',
      },
    });
    console.log('Sign-in route status:', signInResponse.statusCode);
    console.log('Sign-in route body:', signInResponse.payload);

    // Now test protected route
    const testUser = await createAuthenticatedUser();
    console.log('Session token:', testUser.sessionToken);

    const meResponse = await app.inject({
      method: 'GET',
      url: '/api/auth/me',
      headers: testUser.authHeaders,
    });

    console.log('/me route status:', meResponse.statusCode);
    console.log('/me route body:', meResponse.payload);
  });
});
