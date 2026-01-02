# Integration Test Helpers

This directory contains helper utilities for writing integration tests for the Chartwarden API.

## Available Helpers

### 1. Test Server Builder (`testServer.js`)

Utilities for creating and managing Fastify test servers with full application initialization.

#### Quick Start

```javascript
import { buildTestServer } from './helpers/testServer.js';

describe('My Integration Test', () => {
  let server;

  beforeAll(async () => {
    server = await buildTestServer();
  });

  afterAll(async () => {
    await server.stop();
  });

  it('should work', async () => {
    const response = await server.app.inject({
      method: 'GET',
      url: '/health',
    });

    expect(response.statusCode).toBe(200);
  });
});
```

See the full README and `testServer.example.js` for comprehensive usage examples.

## Main Components

- **`testServer.js`** - Test server builder and request helpers
- **`testDb.js`** - Database utilities and fixture factories  
- **`setup.js`** - Global test setup and configuration
- **`testServer.example.js`** - Comprehensive usage examples
- **`README.md`** - This file (full documentation)

## Quick Reference

### Server Builder Functions
- `buildTestServer(options)` - Build and start a test server
- `createTestServer(options)` - Create a server builder
- `createRequestHelper(app)` - Create authenticated request helper

### Database Functions
- `cleanupDatabase()` - Clean all test data
- `createTestUser(overrides)` - Create test user
- `createTestPatient(overrides)` - Create test patient
- `createFixtures()` - Fluent fixture builder

### Utilities
- `extractCookies(response)` - Extract cookies from response
- `parseJsonResponse(response)` - Parse JSON response body
- `waitForServer(app, timeout)` - Wait for server ready

For detailed documentation, see the files in this directory.
