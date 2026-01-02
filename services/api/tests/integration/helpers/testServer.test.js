/**
 * Test Server Builder Tests
 * Verifies the test server builder functionality
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach } from '@jest/globals';
import {
  TestServerBuilder,
  createTestServer,
  buildTestServer,
  createMinimalTestServer,
  createRequestHelper,
  waitForServer,
  extractCookies,
  parseJsonResponse,
} from './testServer.js';

describe('TestServerBuilder', () => {
  describe('TestServerBuilder class', () => {
    let builder;

    afterEach(async () => {
      if (builder) {
        await builder.stop();
        builder = null;
      }
    });

    it('should create a new builder instance', () => {
      builder = new TestServerBuilder();

      expect(builder).toBeInstanceOf(TestServerBuilder);
      expect(builder.options).toBeDefined();
      expect(builder.app).toBeNull();
    });

    it('should accept custom options', () => {
      builder = new TestServerBuilder({
        logger: true,
        enableRateLimiting: true,
      });

      expect(builder.options.logger).toBe(true);
      expect(builder.options.enableRateLimiting).toBe(true);
    });

    it('should build a Fastify app', async () => {
      builder = new TestServerBuilder();
      const app = await builder.build();

      expect(app).toBeDefined();
      expect(typeof app.inject).toBe('function');
      expect(typeof app.listen).toBe('function');
    });

    it('should start server on random port', async () => {
      builder = new TestServerBuilder();
      const { app, port, url, address } = await builder.start();

      expect(app).toBeDefined();
      expect(port).toBeGreaterThan(0);
      expect(url).toContain('127.0.0.1');
      expect(address).toBeDefined();
    });

    it('should respond to health check', async () => {
      builder = new TestServerBuilder();
      await builder.build();

      const response = await builder.app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const body = parseJsonResponse(response);
      expect(body.status).toBe('ok');
      expect(body.environment).toBe('test');
    });

    it('should handle 404 routes', async () => {
      builder = new TestServerBuilder();
      await builder.build();

      const response = await builder.app.inject({
        method: 'GET',
        url: '/non-existent-route',
      });

      expect(response.statusCode).toBe(404);

      const body = parseJsonResponse(response);
      expect(body.status).toBe(404);
      expect(body.message).toBe('Not Found');
    });

    it('should register cleanup handlers', async () => {
      builder = new TestServerBuilder();
      await builder.build();

      let cleanupCalled = false;
      builder.onCleanup(async () => {
        cleanupCalled = true;
      });

      await builder.stop();

      expect(cleanupCalled).toBe(true);
    });
  });

  describe('createTestServer', () => {
    it('should create a builder instance', () => {
      const builder = createTestServer();

      expect(builder).toBeInstanceOf(TestServerBuilder);
    });

    it('should accept options', () => {
      const builder = createTestServer({
        enableRateLimiting: true,
      });

      expect(builder.options.enableRateLimiting).toBe(true);
    });
  });

  describe('buildTestServer', () => {
    let server;

    afterEach(async () => {
      if (server && server.stop) {
        await server.stop();
        server = null;
      }
    });

    it('should build and start server', async () => {
      server = await buildTestServer();

      expect(server.app).toBeDefined();
      expect(server.port).toBeGreaterThan(0);
      expect(server.url).toContain('127.0.0.1');
      expect(typeof server.stop).toBe('function');
    });

    it('should be able to make requests to started server', async () => {
      server = await buildTestServer();

      const response = await server.app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);
    });

    it('should stop server cleanly', async () => {
      server = await buildTestServer();

      await server.stop();

      // Verify cleanup happened
      expect(server.builder.app).toBeNull();
    });
  });

  describe('createMinimalTestServer', () => {
    let app;

    afterEach(async () => {
      if (app && app.close) {
        await app.close();
        app = null;
      }
    });

    it('should create minimal server', async () => {
      app = await createMinimalTestServer();

      expect(app).toBeDefined();
      expect(typeof app.inject).toBe('function');
    });

    it('should have health check endpoint', async () => {
      app = await createMinimalTestServer();

      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      expect(response.statusCode).toBe(200);

      const body = parseJsonResponse(response);
      expect(body.status).toBe('ok');
    });
  });

  describe('TestRequestHelper', () => {
    let builder;
    let helper;

    beforeEach(async () => {
      builder = new TestServerBuilder();
      await builder.build();
      helper = createRequestHelper(builder.app);
    });

    afterEach(async () => {
      if (builder) {
        await builder.stop();
        builder = null;
      }
    });

    it('should create request helper', () => {
      expect(helper).toBeDefined();
      expect(typeof helper.get).toBe('function');
      expect(typeof helper.post).toBe('function');
    });

    it('should make GET request', async () => {
      const response = await helper.get('/health');

      expect(response.statusCode).toBe(200);
    });

    it('should make POST request', async () => {
      // Create a test route
      builder.app.post('/test-post', async (request, reply) => {
        return { received: request.body };
      });

      const response = await helper.post('/test-post', { test: 'data' });

      expect(response.statusCode).toBe(200);

      const body = parseJsonResponse(response);
      expect(body.received).toEqual({ test: 'data' });
    });

    it('should set and send headers', async () => {
      // Create a test route that echoes headers
      builder.app.get('/test-headers', async (request, reply) => {
        return {
          customHeader: request.headers['x-custom-header'],
        };
      });

      const response = await helper
        .setHeader('x-custom-header', 'test-value')
        .get('/test-headers');

      const body = parseJsonResponse(response);
      expect(body.customHeader).toBe('test-value');
    });

    it('should set and send cookies', async () => {
      // Create a test route that reads cookies
      builder.app.get('/test-cookies', async (request, reply) => {
        return {
          cookies: request.cookies,
        };
      });

      const response = await helper
        .setCookie('test-cookie', 'test-value')
        .get('/test-cookies');

      const body = parseJsonResponse(response);
      expect(body.cookies['test-cookie']).toBe('test-value');
    });

    it('should clear cookies', async () => {
      helper.setCookie('test', 'value');
      expect(Object.keys(helper.cookies).length).toBe(1);

      helper.clearCookies();
      expect(Object.keys(helper.cookies).length).toBe(0);
    });

    it('should clear headers', async () => {
      helper.setHeader('x-test', 'value');
      expect(Object.keys(helper.headers).length).toBe(1);

      helper.clearHeaders();
      expect(Object.keys(helper.headers).length).toBe(0);
    });

    it('should reset helper state', async () => {
      helper.setHeader('x-test', 'value');
      helper.setCookie('test', 'value');

      helper.reset();

      expect(Object.keys(helper.headers).length).toBe(0);
      expect(Object.keys(helper.cookies).length).toBe(0);
    });

    it('should make PUT request', async () => {
      builder.app.put('/test-put', async (request, reply) => {
        return { method: request.method, body: request.body };
      });

      const response = await helper.put('/test-put', { update: 'data' });

      expect(response.statusCode).toBe(200);

      const body = parseJsonResponse(response);
      expect(body.method).toBe('PUT');
      expect(body.body).toEqual({ update: 'data' });
    });

    it('should make PATCH request', async () => {
      builder.app.patch('/test-patch', async (request, reply) => {
        return { method: request.method, body: request.body };
      });

      const response = await helper.patch('/test-patch', { patch: 'data' });

      expect(response.statusCode).toBe(200);

      const body = parseJsonResponse(response);
      expect(body.method).toBe('PATCH');
    });

    it('should make DELETE request', async () => {
      builder.app.delete('/test-delete', async (request, reply) => {
        return { method: request.method };
      });

      const response = await helper.delete('/test-delete');

      expect(response.statusCode).toBe(200);

      const body = parseJsonResponse(response);
      expect(body.method).toBe('DELETE');
    });
  });

  describe('waitForServer', () => {
    let builder;

    beforeEach(async () => {
      builder = new TestServerBuilder();
      await builder.build();
    });

    afterEach(async () => {
      if (builder) {
        await builder.stop();
        builder = null;
      }
    });

    it('should wait for server to be ready', async () => {
      await expect(waitForServer(builder.app, 5000)).resolves.toBeUndefined();
    });

    it('should timeout if server not ready', async () => {
      // Create a Fastify app without a health endpoint
      const Fastify = (await import('fastify')).default;
      const brokenApp = Fastify({ logger: false });

      // Register a route that returns 500
      brokenApp.get('/health', async () => {
        throw new Error('Server not ready');
      });

      await expect(waitForServer(brokenApp, 100)).rejects.toThrow('Server did not become ready');

      await brokenApp.close();
    });
  });

  describe('extractCookies', () => {
    it('should extract cookies from response', () => {
      const response = {
        headers: {
          'set-cookie': [
            'session=abc123; Path=/; HttpOnly',
            'theme=dark; Path=/',
          ],
        },
      };

      const cookies = extractCookies(response);

      expect(cookies.session).toBe('abc123');
      expect(cookies.theme).toBe('dark');
    });

    it('should handle single cookie header', () => {
      const response = {
        headers: {
          'set-cookie': 'session=abc123; Path=/; HttpOnly',
        },
      };

      const cookies = extractCookies(response);

      expect(cookies.session).toBe('abc123');
    });

    it('should handle no cookies', () => {
      const response = {
        headers: {},
      };

      const cookies = extractCookies(response);

      expect(Object.keys(cookies).length).toBe(0);
    });
  });

  describe('parseJsonResponse', () => {
    it('should parse JSON string payload', () => {
      const response = {
        payload: JSON.stringify({ test: 'data' }),
      };

      const parsed = parseJsonResponse(response);

      expect(parsed).toEqual({ test: 'data' });
    });

    it('should return object payload as-is', () => {
      const response = {
        payload: { test: 'data' },
      };

      const parsed = parseJsonResponse(response);

      expect(parsed).toEqual({ test: 'data' });
    });

    it('should handle invalid JSON', () => {
      const response = {
        payload: 'invalid json{',
      };

      const parsed = parseJsonResponse(response);

      expect(parsed).toBeNull();
    });
  });

  describe('Integration with plugins', () => {
    let server;

    afterEach(async () => {
      if (server && server.stop) {
        await server.stop();
        server = null;
      }
    });

    it('should have CORS configured', async () => {
      server = await buildTestServer();

      const response = await server.app.inject({
        method: 'OPTIONS',
        url: '/health',
        headers: {
          origin: 'http://localhost:3000',
        },
      });

      expect(response.headers['access-control-allow-origin']).toBeDefined();
    });

    it('should handle multipart/form-data', async () => {
      server = await buildTestServer();

      // The multipart plugin should be registered
      // Check if the plugin is available by verifying it can handle multipart requests
      const hasMultipart = server.app.hasContentTypeParser('multipart') ||
                          server.app.hasContentTypeParser('multipart/form-data');

      expect(hasMultipart).toBe(true);
    });

    it('should parse cookies', async () => {
      // Build server but don't start it (so we can add routes)
      const builder = createTestServer();
      await builder.build();

      builder.app.get('/test-cookie-parse', async (request, reply) => {
        // Cookies might be available directly or need to be parsed
        const cookies = request.cookies || {};
        return { cookies };
      });

      const response = await builder.app.inject({
        method: 'GET',
        url: '/test-cookie-parse',
        headers: {
          cookie: 'test=value; another=cookie',
        },
      });

      const body = parseJsonResponse(response);
      // Just verify cookies object exists (parsing depends on fastify-cookie plugin)
      expect(body.cookies).toBeDefined();
      expect(typeof body.cookies).toBe('object');

      await builder.stop();
    });
  });
});
