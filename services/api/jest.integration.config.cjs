/**
 * Jest Configuration for Integration Tests
 *
 * This configuration is optimized for integration testing:
 * - Uses real database connections with test database isolation
 * - Runs tests serially (maxWorkers: 1) to avoid database conflicts
 * - Longer timeouts (30s) for database operations and API calls
 * - Separate coverage reporting (coverage/integration/)
 * - Global setup/teardown for database lifecycle management
 * - JUnit reporter for CI/CD integration
 * - Higher coverage thresholds for critical paths (controllers, routes)
 *
 * Usage:
 *   npm run test:integration              # Run all integration tests
 *   npm run test:integration:watch        # Watch mode
 *   npm run test:integration:coverage     # With coverage report
 *
 * @see tests/integration/README.md for more details
 */

module.exports = {
  // Test environment
  testEnvironment: 'node',

  // Test file patterns - only integration tests
  testMatch: [
    '**/tests/integration/**/*.integration.test.js',
    '**/tests/integration/**/*.test.js'
  ],

  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/dist/',
    '/coverage/',
    '/tests/fixtures/',
    '/tests/setup.js',
    '/tests/integration/setup.js',
    '/tests/integration/teardown.js',
    '/tests/integration/helpers/',
    '/tests/integration/README.md'
  ],

  // Setup files
  setupFilesAfterEnv: ['<rootDir>/tests/integration/setup.js'],

  // Note: Global teardown removed - cleanup handled in afterAll hooks
  // to avoid "import after teardown" errors with ES modules

  // Coverage collection
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!src/config/**/*.js',
    '!src/database/migrations/**/*.js',
    '!src/database/seeds/**/*.js',
    '!src/console/**/*.js'
  ],

  // Coverage output
  coverageDirectory: 'coverage/integration',

  // Coverage reporters
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],

  // Coverage thresholds for integration tests
  coverageThreshold: {
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    },
    // Critical paths should have higher coverage
    './src/controllers/**/*.js': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    },
    './src/routes/**/*.js': {
      statements: 85,
      branches: 80,
      functions: 85,
      lines: 85
    },
    './src/middleware/**/*.js': {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  },

  // Module file extensions
  moduleFileExtensions: [
    'js',
    'json'
  ],

  // Transform - no transformation for ES modules
  transform: {},

  // Note: No moduleNameMapper needed with experimental VM modules
  // Node.js handles .js extensions natively in ES module mode

  // Mock configuration
  clearMocks: true,
  resetMocks: false, // Don't reset mocks - we want real implementations
  restoreMocks: true,

  // Timeout configuration (longer for integration tests)
  testTimeout: 30000, // 30 seconds per test

  // Run tests serially to avoid database conflicts
  maxWorkers: 1, // Single worker for integration tests

  // Verbose output
  verbose: true,

  // Display name for test output
  displayName: {
    name: 'INTEGRATION',
    color: 'blue'
  },

  // Detect open handles (important for integration tests)
  detectOpenHandles: false, // Disabled to avoid conflicts with ES modules

  // Force exit after tests complete (reduced timeout)
  forceExit: false, // Let Jest exit naturally after cleanup

  // Bail on first test failure (optional - set to true to fail fast)
  bail: false,

  // Error handling
  errorOnDeprecated: false,

  // Test name pattern (can be overridden via CLI)
  // testNamePattern: undefined,

  // Globals
  globals: {
    __INTEGRATION_TEST__: true
  },

  // Reporters
  reporters: [
    'default',
    [
      'jest-junit',
      {
        outputDirectory: 'coverage/integration',
        outputName: 'junit.xml',
        classNameTemplate: '{classname}',
        titleTemplate: '{title}',
        ancestorSeparator: ' › ',
        usePathForSuiteName: true
      }
    ]
  ],

  // Notify configuration (optional)
  // notify: true,
  // notifyMode: 'failure-change',

  // Watch plugins (for watch mode)
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ].filter(plugin => {
    try {
      require.resolve(plugin);
      return true;
    } catch {
      return false;
    }
  }),

  // Cache directory
  cacheDirectory: '<rootDir>/.jest-cache/integration'
};
