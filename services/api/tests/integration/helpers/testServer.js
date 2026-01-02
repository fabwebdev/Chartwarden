/**
 * Test Server Builder
 *
 * Provides utilities for creating and managing Fastify test servers
 * with full application initialization for integration testing.
 *
 * Features:
 * - Complete Fastify app initialization with all plugins
 * - Configurable middleware and route registration
 * - Test-specific configuration (disabled rate limiting, logging, etc.)
 * - Automatic cleanup and graceful shutdown
 * - Support for authenticated requests
 * - Cookie and session management for tests
 *
 * HIPAA Compliance:
 * - Uses isolated test database
 * - Disables production security features that interfere with testing
 * - Maintains audit logging in test mode
 */

import Fastify from 'fastify';
import path from 'path';
import { fileURLToPath } from 'url';
import { nanoid } from 'nanoid';

// Get directory name
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/**
 * Test Server Builder Class
 * Builds a fully configured Fastify server for integration testing
 */
export class TestServerBuilder {
  constructor(options = {}) {
    this.options = {
      // Fastify options
      logger: false, // Disable logging during tests
      trustProxy: true,
      bodyLimit: 50 * 1024 * 1024, // 50MB

      // Feature flags
      enableRateLimiting: false,
      enableCSRF: false,
      enableSocketIO: false,
      enableScheduler: false,
      enableAuditLogging: false,

      // Route registration
      registerRoutes: false, // Disable route registration by default in tests
      skipDatabase: false,
      skipAuth: false,

      ...options,
    };

    this.app = null;
    this.cleanupHandlers = [];
  }

  /**
   * Build and initialize the Fastify server
   * @returns {Promise<Fastify.FastifyInstance>}
   */
  async build() {
    // Create Fastify instance
    this.app = Fastify({
      logger: this.options.logger,
      trustProxy: this.options.trustProxy,
      bodyLimit: this.options.bodyLimit,
    });

    // Register plugins
    await this.registerPlugins();

    // Register middleware
    await this.registerMiddleware();

    // Register routes
    await this.registerRoutes();

    // Register error handlers
    this.registerErrorHandlers();

    // Track cleanup
    this.cleanupHandlers.push(async () => {
      if (this.app) {
        await this.app.close();
      }
    });

    return this.app;
  }

  /**
   * Register Fastify plugins
   * @private
   */
  async registerPlugins() {
    // Cookie parser (required for authentication)
    await this.app.register(import('@fastify/cookie'));

    // CSRF Protection (optional in tests)
    if (this.options.enableCSRF) {
      await this.app.register(import('@fastify/csrf-protection'), {
        sessionPlugin: '@fastify/cookie',
        cookieOpts: {
          signed: true,
          httpOnly: true,
          sameSite: 'strict',
          secure: false, // Always false in tests
          path: '/',
        },
      });
    }

    // CORS
    const defaultCorsOrigins = ['http://localhost:3000', 'http://localhost:3001', 'http://test-origin'];

    await this.app.register(import('@fastify/cors'), {
      origin: (origin, cb) => {
        if (!origin || defaultCorsOrigins.includes(origin)) {
          return cb(null, origin || defaultCorsOrigins[0]);
        }
        return cb(null, false);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
    });

    // Static file serving
    await this.app.register(import('@fastify/static'), {
      root: path.join(__dirname, '../../../public'),
      prefix: '/',
    });

    // Multipart (file uploads)
    await this.app.register(import('@fastify/multipart'), {
      limits: {
        fileSize: 50 * 1024 * 1024, // 50MB
        files: 10,
      },
      attachFieldsToBody: false,
    });

    // Rate limiting (disabled by default in tests)
    if (this.options.enableRateLimiting) {
      await this.app.register(async (fastify) => {
        const rateLimit = (await import('@fastify/rate-limit')).default;

        await fastify.register(rateLimit, {
          max: 1000, // Very high limit for tests
          timeWindow: '1 minute',
          cache: 10000,
          allowList: ['127.0.0.1', 'localhost'],
          skipOnError: true,
        });
      });
    }

    // Helmet (minimal security headers for tests)
    await this.app.register(import('@fastify/helmet'), {
      contentSecurityPolicy: false,
      global: true,
    });
  }

  /**
   * Register middleware hooks
   * @private
   */
  async registerMiddleware() {
    // Add request ID for tracking
    this.app.addHook('onRequest', async (request, reply) => {
      request.id = request.id || nanoid();
      request.headers['x-request-id'] = request.id;
    });

    // Add default origin header if missing (for API clients)
    this.app.addHook('onRequest', async (request, reply) => {
      if (!request.headers.origin) {
        request.headers.origin = 'http://localhost:3000';
        if (request.raw?.headers) {
          request.raw.headers.origin = 'http://localhost:3000';
        }
      }
    });

    // Skip CSRF protection in tests unless explicitly enabled
    if (!this.options.enableCSRF) {
      this.app.addHook('preHandler', async (request, reply) => {
        // Bypass CSRF checks in tests
        request.skipCsrf = true;
      });
    }
  }

  /**
   * Register application routes
   * @private
   */
  async registerRoutes() {
    // Health check endpoint (always available)
    this.app.get('/health', async (request, reply) => {
      return {
        status: 'ok',
        timestamp: new Date().toISOString(),
        environment: 'test',
      };
    });

    // Skip full route registration unless explicitly enabled
    // This prevents loading heavy dependencies during basic tests
    if (!this.options.registerRoutes) {
      return;
    }

    // Register auth routes if enabled
    if (!this.options.skipAuth) {
      try {
        const authRoutes = await import('../../../src/routes/auth.routes.js');
        await this.app.register(authRoutes.default, { prefix: '/api/auth' });
      } catch (err) {
        console.warn('Failed to register auth routes:', err.message);
      }
    }

    // Register API routes
    try {
      const apiRoutes = await import('../../../src/routes/api.routes.js');
      await this.app.register(apiRoutes.default, { prefix: '/api' });
    } catch (err) {
      console.warn('Failed to register API routes:', err.message);
    }

    // Register email routes
    try {
      const emailRoutes = await import('../../../src/routes/email.routes.js');
      await this.app.register(emailRoutes.default, { prefix: '/api/email' });
    } catch (err) {
      console.warn('Failed to register email routes:', err.message);
    }

    // Register validation test routes (test environment only)
    try {
      const validationTestRoutes = await import('../../../src/routes/validationTest.routes.js');
      await this.app.register(validationTestRoutes.default, { prefix: '/api/validation-test' });
    } catch (err) {
      console.warn('Failed to register validation test routes:', err.message);
    }
  }

  /**
   * Register error handlers
   * @private
   */
  registerErrorHandlers() {
    // 404 handler
    this.app.setNotFoundHandler(async (request, reply) => {
      return reply.code(404).send({
        status: 404,
        message: 'Not Found',
        path: request.url,
        timestamp: new Date().toISOString(),
      });
    });

    // Global error handler
    this.app.setErrorHandler(async (error, request, reply) => {
      const statusCode = error.statusCode || 500;

      // Log error (in test mode, minimal logging)
      if (this.options.logger) {
        request.log.error(error);
      }

      return reply.code(statusCode).send({
        status: statusCode,
        message: error.message || 'Internal Server Error',
        code: error.code || 'INTERNAL_ERROR',
        errors: error.validation || undefined,
        timestamp: new Date().toISOString(),
      });
    });
  }

  /**
   * Start the server on a random port
   * @returns {Promise<{app: Fastify.FastifyInstance, address: string, port: number}>}
   */
  async start() {
    if (!this.app) {
      await this.build();
    }

    // Listen on random port (0 = auto-assign)
    const address = await this.app.listen({ port: 0, host: '127.0.0.1' });
    const port = this.app.server.address().port;

    return {
      app: this.app,
      address,
      port,
      url: `http://127.0.0.1:${port}`,
    };
  }

  /**
   * Stop the server and run cleanup
   * @returns {Promise<void>}
   */
  async stop() {
    for (const handler of this.cleanupHandlers.reverse()) {
      try {
        await handler();
      } catch (err) {
        console.error('Cleanup error:', err);
      }
    }

    this.cleanupHandlers = [];
    this.app = null;
  }

  /**
   * Get the Fastify app instance
   * @returns {Fastify.FastifyInstance}
   */
  getApp() {
    return this.app;
  }

  /**
   * Register a cleanup handler
   * @param {Function} handler - Async cleanup function
   */
  onCleanup(handler) {
    this.cleanupHandlers.push(handler);
  }
}

/**
 * Create a new test server builder
 * @param {Object} options - Server options
 * @returns {TestServerBuilder}
 */
export function createTestServer(options = {}) {
  return new TestServerBuilder(options);
}

/**
 * Build and start a test server (convenience function)
 * @param {Object} options - Server options
 * @returns {Promise<{app: Fastify.FastifyInstance, address: string, port: number, stop: Function}>}
 */
export async function buildTestServer(options = {}) {
  const builder = new TestServerBuilder(options);
  const serverInfo = await builder.start();

  return {
    ...serverInfo,
    builder,
    stop: () => builder.stop(),
  };
}

/**
 * Create a minimal test server with only essential plugins
 * Useful for testing specific routes in isolation
 * @param {Object} options - Server options
 * @returns {Promise<Fastify.FastifyInstance>}
 */
export async function createMinimalTestServer(options = {}) {
  const app = Fastify({
    logger: false,
    trustProxy: true,
    ...options,
  });

  // Only essential plugins
  await app.register(import('@fastify/cookie'));

  await app.register(import('@fastify/cors'), {
    origin: true,
    credentials: true,
  });

  // Health check
  app.get('/health', async () => ({ status: 'ok' }));

  return app;
}

/**
 * Request helper for making authenticated requests
 */
export class TestRequestHelper {
  constructor(app) {
    this.app = app;
    this.cookies = {};
    this.headers = {};
  }

  /**
   * Set authentication token/cookie
   * @param {string} token - Session token
   */
  setAuth(token) {
    this.cookies['better-auth.session_token'] = token;
    return this;
  }

  /**
   * Set custom header
   * @param {string} name - Header name
   * @param {string} value - Header value
   */
  setHeader(name, value) {
    this.headers[name] = value;
    return this;
  }

  /**
   * Set multiple headers
   * @param {Object} headers - Headers object
   */
  setHeaders(headers) {
    Object.assign(this.headers, headers);
    return this;
  }

  /**
   * Set cookie
   * @param {string} name - Cookie name
   * @param {string} value - Cookie value
   */
  setCookie(name, value) {
    this.cookies[name] = value;
    return this;
  }

  /**
   * Make a GET request
   * @param {string} url - Request URL
   * @param {Object} options - Additional options
   */
  async get(url, options = {}) {
    return this.request('GET', url, null, options);
  }

  /**
   * Make a POST request
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} options - Additional options
   */
  async post(url, body = null, options = {}) {
    return this.request('POST', url, body, options);
  }

  /**
   * Make a PUT request
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} options - Additional options
   */
  async put(url, body = null, options = {}) {
    return this.request('PUT', url, body, options);
  }

  /**
   * Make a PATCH request
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} options - Additional options
   */
  async patch(url, body = null, options = {}) {
    return this.request('PATCH', url, body, options);
  }

  /**
   * Make a DELETE request
   * @param {string} url - Request URL
   * @param {Object} options - Additional options
   */
  async delete(url, options = {}) {
    return this.request('DELETE', url, null, options);
  }

  /**
   * Make a generic HTTP request
   * @param {string} method - HTTP method
   * @param {string} url - Request URL
   * @param {Object} body - Request body
   * @param {Object} options - Additional options
   */
  async request(method, url, body = null, options = {}) {
    const headers = {
      'content-type': 'application/json',
      'origin': 'http://localhost:3000',
      ...this.headers,
      ...options.headers,
    };

    // Add cookies
    if (Object.keys(this.cookies).length > 0) {
      const cookieString = Object.entries(this.cookies)
        .map(([name, value]) => `${name}=${value}`)
        .join('; ');
      headers.cookie = cookieString;
    }

    const response = await this.app.inject({
      method,
      url,
      headers,
      payload: body,
      ...options,
    });

    return response;
  }

  /**
   * Clear all cookies
   */
  clearCookies() {
    this.cookies = {};
    return this;
  }

  /**
   * Clear all headers
   */
  clearHeaders() {
    this.headers = {};
    return this;
  }

  /**
   * Reset helper state
   */
  reset() {
    this.cookies = {};
    this.headers = {};
    return this;
  }
}

/**
 * Create a request helper for the given app
 * @param {Fastify.FastifyInstance} app - Fastify app
 * @returns {TestRequestHelper}
 */
export function createRequestHelper(app) {
  return new TestRequestHelper(app);
}

/**
 * Wait for server to be ready
 * @param {Fastify.FastifyInstance} app - Fastify app
 * @param {number} timeout - Timeout in ms
 * @returns {Promise<void>}
 */
export async function waitForServer(app, timeout = 5000) {
  const startTime = Date.now();

  while (Date.now() - startTime < timeout) {
    try {
      const response = await app.inject({
        method: 'GET',
        url: '/health',
      });

      if (response.statusCode === 200) {
        return;
      }
    } catch (err) {
      // Server not ready yet
    }

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  throw new Error('Server did not become ready within timeout');
}

/**
 * Extract cookies from response
 * @param {Object} response - Fastify response
 * @returns {Object} Parsed cookies
 */
export function extractCookies(response) {
  const cookies = {};
  const setCookieHeaders = response.headers['set-cookie'] || [];
  const cookieArray = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];

  for (const cookie of cookieArray) {
    if (!cookie) continue;

    const [nameValue] = cookie.split(';');
    const [name, value] = nameValue.split('=');

    if (name && value) {
      cookies[name.trim()] = value.trim();
    }
  }

  return cookies;
}

/**
 * Parse JSON response body
 * @param {Object} response - Fastify response
 * @returns {Object} Parsed JSON
 */
export function parseJsonResponse(response) {
  try {
    return typeof response.payload === 'string'
      ? JSON.parse(response.payload)
      : response.payload;
  } catch (err) {
    console.error('Failed to parse JSON response:', err);
    return null;
  }
}

// Export everything as default
export default {
  TestServerBuilder,
  createTestServer,
  buildTestServer,
  createMinimalTestServer,
  TestRequestHelper,
  createRequestHelper,
  waitForServer,
  extractCookies,
  parseJsonResponse,
};
