/**
 * Jest Test Setup
 * Global setup configuration for all tests
 */

import { jest } from '@jest/globals';

// Set test environment variables
process.env.NODE_ENV = 'test';
process.env.LOG_LEVEL = 'silent';

// Global test timeout
jest.setTimeout(30000);

// Mock console methods to reduce test noise (optional)
// Uncomment if you want to suppress console output during tests
// global.console = {
//   ...console,
//   log: jest.fn(),
//   debug: jest.fn(),
//   info: jest.fn(),
//   warn: jest.fn(),
// };

// Clean up after all tests
afterAll(async () => {
  // Close any open handles, database connections, etc.
  // Add cleanup logic here as needed
});

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
});
