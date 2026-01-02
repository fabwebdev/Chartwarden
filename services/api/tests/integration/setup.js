/**
 * Integration Test Setup
 * Global setup configuration for all integration tests
 *
 * This file provides:
 * - Test database initialization and cleanup
 * - Test server lifecycle management
 * - Global test fixtures and helpers
 * - Environment configuration for integration tests
 */

import { jest } from '@jest/globals';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Get directory name for imports
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment variables
dotenv.config({ path: path.join(__dirname, '../../.env.test') });

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent'; // Suppress logs during tests

// Use a separate test database to avoid contaminating development data
// Format: DATABASE_URL_TEST or append _test to database name
if (!process.env.DATABASE_URL_TEST && process.env.DATABASE_URL) {
  const dbUrl = new URL(process.env.DATABASE_URL);
  const dbName = dbUrl.pathname.slice(1); // Remove leading slash
  dbUrl.pathname = `/${dbName}_test`;
  process.env.DATABASE_URL = dbUrl.toString();
  console.log(`⚠️  Using test database: ${dbName}_test`);
} else if (process.env.DATABASE_URL_TEST) {
  process.env.DATABASE_URL = process.env.DATABASE_URL_TEST;
  console.log('✅ Using DATABASE_URL_TEST');
}

// Disable scheduler and background jobs during tests
process.env.ENABLE_SCHEDULER = 'false';

// Disable rate limiting during tests for faster execution
process.env.DISABLE_RATE_LIMIT = 'true';

// Use shorter session timeouts for testing
process.env.SESSION_TIMEOUT_MINUTES = '5';

// Set test-specific CORS origins
process.env.CORS_ORIGIN = 'http://localhost:3000,http://localhost:3001';

// Global test timeout (30 seconds for integration tests)
jest.setTimeout(30000);

// Global test state
global.testState = {
  server: null,
  db: null,
  cleanup: [],
};

/**
 * Register cleanup function to be called during test teardown
 * @param {Function} fn - Cleanup function
 */
global.registerCleanup = (fn) => {
  if (typeof fn === 'function') {
    global.testState.cleanup.push(fn);
  }
};

/**
 * Run all registered cleanup functions
 */
global.runCleanup = async () => {
  for (const fn of global.testState.cleanup.reverse()) {
    try {
      await fn();
    } catch (err) {
      console.error('Cleanup error:', err);
    }
  }
  global.testState.cleanup = [];
};

// Clean up before each test to ensure isolation
beforeEach(async () => {
  jest.clearAllMocks();

  // Clear any existing cleanup functions from previous tests
  global.testState.cleanup = [];
});

// Clean up after each test
afterEach(async () => {
  await global.runCleanup();
});

// Global cleanup after all tests
afterAll(async () => {
  try {
    // Close any open test server
    if (global.testState.server && typeof global.testState.server.close === 'function') {
      await global.testState.server.close();
      global.testState.server = null;
    }

    // Close database connection
    if (global.testState.db) {
      const { closeDB } = await import('../../src/database/connection.js');
      await closeDB();
      global.testState.db = null;
    }

    // Run any remaining cleanup functions
    await global.runCleanup();
  } catch (err) {
    console.error('Global cleanup error:', err);
  }
});

// Handle unhandled promise rejections in tests
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection in test:', reason);
  // Don't exit the process in tests, just log it
});

// Export helper for dynamic imports in tests
export const importHelper = async (modulePath) => {
  try {
    return await import(modulePath);
  } catch (err) {
    console.error(`Failed to import ${modulePath}:`, err);
    throw err;
  }
};

// Export test utilities
export {
  __dirname,
  __filename,
};
