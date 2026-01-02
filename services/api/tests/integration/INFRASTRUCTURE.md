# Integration Test Infrastructure

## Overview

This document explains the integration test infrastructure for the Chartwarden API. The infrastructure provides a robust, isolated testing environment for end-to-end testing of API endpoints, workflows, and business logic.

## Architecture

### Core Components

1. **setup.js** - Global test setup and configuration
2. **teardown.js** - Global test cleanup
3. **jest.integration.config.cjs** - Jest configuration for integration tests
4. **helpers/** - Test utility functions
5. **workflows/** - End-to-end workflow tests
6. **endpoints/** - API endpoint tests
7. **edge-cases/** - Error handling and edge case tests

### Test Environment Isolation

The integration test infrastructure ensures complete isolation from development and production environments:

#### Database Isolation
- **Separate Test Database**: Uses `DATABASE_URL_TEST` or appends `_test` to database name
- **Automatic Cleanup**: Teardown scripts ensure no test data persists
- **Connection Pooling**: Optimized pool settings for test performance

#### Server Isolation
- **Independent Server Instance**: Each test suite can create its own Fastify server
- **Port Configuration**: Tests use separate ports to avoid conflicts
- **Clean State**: Server is rebuilt for each test suite

#### Environment Variables
```javascript
NODE_ENV=test                    // Identifies test environment
LOG_LEVEL=silent                 // Suppresses logs during tests
ENABLE_SCHEDULER=false          // Disables background jobs
DISABLE_RATE_LIMIT=true         // Disables rate limiting for faster tests
SESSION_TIMEOUT_MINUTES=5       // Shorter timeouts for testing
```

## Setup and Configuration

### Global Setup (setup.js)

The global setup file runs before all tests and configures:

1. **Environment Variables**
   - Loads `.env.test` if present
   - Sets test-specific environment variables
   - Configures database connection

2. **Global Test State**
   ```javascript
   global.testState = {
     server: null,  // Shared test server instance
     db: null,      // Database instance
     cleanup: []    // Cleanup function registry
   }
   ```

3. **Cleanup Registry**
   - `global.registerCleanup(fn)` - Register cleanup function
   - `global.runCleanup()` - Execute all cleanup functions
   - Ensures proper cleanup even if tests fail

4. **Jest Configuration**
   - 30-second timeout for integration tests
   - Automatic mock clearing between tests
   - Promise rejection handling

### Global Teardown (teardown.js)

The global teardown file runs after all tests and:

1. Closes database connections
2. Shuts down any running servers
3. Cleans up temporary files
4. Ensures no hanging processes

### Jest Configuration (jest.integration.config.cjs)

Key configuration options:

```javascript
{
  testEnvironment: 'node',           // Node.js environment
  testMatch: ['**/*.integration.test.js'],
  maxWorkers: 1,                     // Serial execution to avoid conflicts
  testTimeout: 30000,                // 30-second timeout
  detectOpenHandles: true,           // Detect unclosed connections
  forceExit: true,                   // Force exit after tests
  coverageThreshold: {               // Minimum 80% coverage
    global: {
      statements: 80,
      branches: 75,
      functions: 80,
      lines: 80
    }
  }
}
```

## Test Lifecycle

### Test Suite Lifecycle

```
1. Global Setup (setup.js)
   ↓
2. beforeAll() - Suite-specific setup
   ↓
3. beforeEach() - Test-specific setup
   ↓
4. Test Execution
   ↓
5. afterEach() - Test-specific cleanup
   ↓
6. afterAll() - Suite-specific cleanup
   ↓
7. Global Teardown (teardown.js)
```

### Cleanup Mechanism

The infrastructure provides a cleanup registry for managing test resources:

```javascript
// In your test
beforeAll(async () => {
  // Create test data
  const user = await createTestUser();

  // Register cleanup
  global.registerCleanup(async () => {
    await deleteTestUser(user.id);
  });
});

// Cleanup runs automatically in afterEach and afterAll
```

### Best Practices

1. **Always Register Cleanup**
   - Register cleanup for any created resources
   - Cleanup functions run in reverse order (LIFO)
   - Cleanup runs even if tests fail

2. **Use Serial Execution**
   - Integration tests run with `maxWorkers: 1`
   - Prevents database conflicts
   - Ensures predictable test order

3. **Isolate Test Data**
   - Each test should create its own data
   - Don't rely on data from other tests
   - Clean up data after each test

4. **Handle Async Operations**
   - Use async/await for all database operations
   - Ensure promises are properly awaited
   - Handle errors appropriately

## Directory Structure

```
tests/integration/
├── setup.js                      # Global setup
├── teardown.js                   # Global teardown
├── README.md                     # User documentation
├── INFRASTRUCTURE.md            # This file
├── .env.test.example            # Example test environment
├── example.integration.test.js  # Example test
│
├── helpers/                     # Test utilities
│   ├── testDb.js               # Database helpers
│   ├── testServer.js           # Server helpers
│   └── authHelper.js           # Authentication helpers
│
├── workflows/                   # End-to-end workflows
│   ├── authentication.integration.test.js
│   ├── patient-management.integration.test.js
│   └── ...
│
├── endpoints/                   # API endpoint tests
│   ├── patients.integration.test.js
│   ├── medications.integration.test.js
│   └── ...
│
└── edge-cases/                  # Error handling tests
    ├── concurrency.integration.test.js
    ├── validation.integration.test.js
    └── ...
```

## Helper Utilities (To Be Implemented)

### testDb.js - Database Helpers

```javascript
// Clean entire database
await cleanDatabase();

// Seed test data
await seedFixtures({
  users: [...],
  patients: [...]
});

// Truncate specific tables
await truncateTables(['users', 'patients']);

// Get fixture data
const patient = await getFixture('patient', 'john-doe');
```

### testServer.js - Server Helpers

```javascript
// Create test server
const server = await createTestServer({
  port: 3001,
  logLevel: 'silent'
});

// Close server
await closeTestServer(server);
```

### authHelper.js - Authentication Helpers

```javascript
// Create test user with role
const user = await createTestUser({
  email: 'nurse@test.com',
  role: 'nurse'
});

// Get JWT token
const token = await getAuthToken(user);

// Create authenticated session
const session = await createTestSession(user);
```

## Performance Considerations

### Optimization Strategies

1. **Database Connection Pooling**
   - Reuse connections across tests
   - Configure pool size for test workload
   - Close connections in teardown

2. **Serial Execution**
   - Single worker prevents database conflicts
   - Trade-off: slower execution, more reliable

3. **Selective Testing**
   - Use `--testPathPattern` to run specific tests
   - Run critical tests in CI/CD
   - Run full suite nightly

4. **Coverage Optimization**
   - Collect coverage only when needed
   - Use `--no-coverage` for faster development
   - Target 80% coverage for critical paths

### Typical Execution Times

- **Single Test**: < 1 second
- **Test Suite**: 5-10 seconds
- **Full Integration Suite**: < 5 minutes (target)

## Troubleshooting

### Common Issues

#### Tests Hang
**Symptoms**: Tests don't complete, Jest waits indefinitely

**Solutions**:
1. Check for unclosed database connections
2. Verify server is closed in `afterAll`
3. Look for unhandled promises
4. Use `--detectOpenHandles` to find issues

#### Database Connection Errors
**Symptoms**: `ECONNREFUSED` or `database does not exist`

**Solutions**:
1. Ensure test database exists
2. Verify `DATABASE_URL_TEST` is set correctly
3. Check database is running
4. Verify connection credentials

#### Flaky Tests
**Symptoms**: Tests pass/fail inconsistently

**Solutions**:
1. Check test isolation (cleanup between tests)
2. Look for race conditions
3. Ensure deterministic test data
4. Verify no shared state between tests

#### Memory Leaks
**Symptoms**: Tests slow down over time, high memory usage

**Solutions**:
1. Close all connections in teardown
2. Clear large objects in afterEach
3. Don't store test data in global scope
4. Use `--runInBand` to isolate issue

### Debug Mode

Enable verbose logging for debugging:

```bash
# Run with debug output
NODE_OPTIONS='--experimental-vm-modules' \
LOG_LEVEL=debug \
jest --config=jest.integration.config.cjs \
     --verbose \
     --detectOpenHandles
```

## CI/CD Integration

### GitHub Actions Configuration

```yaml
- name: Run Integration Tests
  run: |
    cd services/api
    npm run test:integration
  env:
    DATABASE_URL_TEST: ${{ secrets.DATABASE_URL_TEST }}
    NODE_ENV: test
```

### Pre-commit Hooks

Consider running integration tests before commit:

```json
{
  "husky": {
    "hooks": {
      "pre-push": "npm run test:integration"
    }
  }
}
```

## Future Enhancements

### Planned Features

1. **Parallel Test Execution**
   - Database sharding for parallel tests
   - Isolated test databases per worker

2. **Test Data Builders**
   - Factory pattern for test data
   - Realistic test fixtures

3. **Snapshot Testing**
   - API response snapshots
   - Database state snapshots

4. **Performance Benchmarks**
   - Track test execution time
   - Identify slow tests
   - Performance regression detection

5. **Visual Test Reports**
   - HTML coverage reports
   - Test execution timeline
   - Failure diagnostics

## References

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Fastify Testing](https://www.fastify.io/docs/latest/Guides/Testing/)
- [Drizzle ORM](https://orm.drizzle.team/docs/overview)
- [Integration Testing Best Practices](https://martinfowler.com/articles/practical-test-pyramid.html)

## Support

For questions or issues with the integration test infrastructure:

1. Check this documentation
2. Review example.integration.test.js
3. Check troubleshooting section
4. Open an issue in the project repository
