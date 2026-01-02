# Integration Tests

This directory contains integration tests for the Chartwarden API. Integration tests verify that multiple components work together correctly, including API endpoints, database operations, authentication, and business logic.

## Directory Structure

```
tests/integration/
├── README.md                     # This file
├── setup.js                      # Global test setup and configuration
├── teardown.js                   # Global test teardown and cleanup
├── helpers/                      # Test helper utilities
│   ├── testDb.js                # Database utilities (fixtures, cleanup)
│   ├── testServer.js            # Test server builder
│   └── authHelper.js            # Authentication helpers
├── workflows/                    # End-to-end workflow tests
│   ├── authentication.integration.test.js
│   ├── patient-management.integration.test.js
│   ├── clinical-assessment.integration.test.js
│   ├── billing.integration.test.js
│   └── care-coordination.integration.test.js
├── endpoints/                    # API endpoint tests
│   ├── patients.integration.test.js
│   ├── medications.integration.test.js
│   └── billing.integration.test.js
└── edge-cases/                   # Edge case and error handling tests
    ├── concurrency.integration.test.js
    ├── validation.integration.test.js
    └── rate-limiting.integration.test.js
```

## Running Integration Tests

```bash
# Run all integration tests
npm run test:integration

# Run integration tests in watch mode
npm run test:integration:watch

# Run integration tests with coverage
npm run test:integration:coverage

# Run specific test file
npm run test:integration -- workflows/authentication.integration.test.js
```

## Test Database

Integration tests use a separate test database to avoid contaminating development data:

- **Automatic**: If `DATABASE_URL_TEST` is set, it will be used
- **Fallback**: If not set, `_test` is appended to your database name from `DATABASE_URL`

Example:
```env
# Production/Development database
DATABASE_URL=postgresql://user:pass@localhost:5432/chartwarden

# Test database (automatically becomes chartwarden_test if not specified)
DATABASE_URL_TEST=postgresql://user:pass@localhost:5432/chartwarden_test
```

## Writing Integration Tests

### Basic Structure

```javascript
import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { createTestServer } from '../helpers/testServer.js';
import { createTestUser, getAuthToken } from '../helpers/authHelper.js';
import { cleanDatabase, seedFixtures } from '../helpers/testDb.js';

describe('Feature Integration Tests', () => {
  let server;
  let authToken;

  beforeAll(async () => {
    // Initialize test server
    server = await createTestServer();

    // Create test user and get auth token
    const user = await createTestUser({ role: 'nurse' });
    authToken = await getAuthToken(user);
  });

  afterAll(async () => {
    // Clean up
    await cleanDatabase();
    await server.close();
  });

  it('should perform end-to-end workflow', async () => {
    // Make authenticated request
    const response = await server.inject({
      method: 'GET',
      url: '/api/patients',
      headers: {
        authorization: `Bearer ${authToken}`
      }
    });

    expect(response.statusCode).toBe(200);
    expect(response.json()).toHaveProperty('data');
  });
});
```

### Best Practices

1. **Test Isolation**: Each test should be independent and not rely on other tests
2. **Database Cleanup**: Always clean up test data after each test or suite
3. **Real Dependencies**: Use real database and server (not mocks) for integration tests
4. **Meaningful Assertions**: Verify both success and failure scenarios
5. **Performance**: Keep tests fast (<5 minutes for full suite)

### Helper Utilities

#### `testDb.js` - Database Helpers
- `cleanDatabase()` - Wipe all test data
- `seedFixtures(data)` - Insert test data
- `truncateTables(tables)` - Clear specific tables
- `getFixture(name)` - Load fixture data

#### `testServer.js` - Server Helpers
- `createTestServer(options)` - Build test Fastify instance
- `closeTestServer(server)` - Gracefully close server

#### `authHelper.js` - Authentication Helpers
- `createTestUser(data)` - Create user with role/permissions
- `getAuthToken(user)` - Get JWT token for user
- `createTestSession(user)` - Create authenticated session

## Test Categories

### Workflows Tests
End-to-end user workflows testing multiple endpoints:
- User authentication flow
- Patient admission process
- Clinical assessment workflow
- Billing and claims workflow
- Care coordination workflow

### Endpoint Tests
Individual API endpoint testing:
- Request/response validation
- Authentication/authorization
- Error handling
- Data persistence

### Edge Cases Tests
Error scenarios and edge cases:
- Concurrent requests
- Invalid input validation
- Rate limiting
- Resource conflicts

## Coverage Goals

- **Minimum**: 80% coverage of critical API paths
- **Target**: 90% coverage of all API endpoints
- **Focus**: Critical workflows and high-risk areas

## Troubleshooting

### Tests Hanging
- Check for unclosed database connections
- Verify server is properly closed in `afterAll`
- Look for unhandled promises

### Database Errors
- Ensure test database exists
- Verify `DATABASE_URL_TEST` is set correctly
- Check database permissions

### Flaky Tests
- Review test isolation (cleanup between tests)
- Check for race conditions
- Ensure deterministic test data

## CI/CD Integration

Integration tests run automatically on:
- Pull requests
- Commits to main branch
- Nightly builds

See `.github/workflows/ci.yml` for CI configuration.
