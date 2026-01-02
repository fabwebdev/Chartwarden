# Test Setup and Teardown

This directory contains global setup and teardown scripts for E2E tests.

## Purpose

Setup/teardown scripts handle:
- Database seeding with consistent test data
- Environment preparation before tests
- Cleanup after test execution
- Global configuration

## Scripts to be Created

- `global-setup.ts` - Runs once before all tests (environment setup, DB connection)
- `global-teardown.ts` - Runs once after all tests (cleanup, connection closure)
- `seed.ts` - Database seeding functions for consistent test data

## Example Structure

```typescript
// global-setup.ts
import { FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  console.log('Setting up test environment...');

  // Setup tasks:
  // - Verify database connection
  // - Run migrations if needed
  // - Seed base data
  // - Create admin user

  console.log('Test environment ready');
}

export default globalSetup;
```

```typescript
// global-teardown.ts
import { FullConfig } from '@playwright/test';

async function globalTeardown(config: FullConfig) {
  console.log('Cleaning up test environment...');

  // Cleanup tasks:
  // - Remove test data
  // - Close database connections
  // - Clear cache

  console.log('Cleanup complete');
}

export default globalTeardown;
```

```typescript
// seed.ts
export async function seedDatabase() {
  // Create base test data:
  // - Default admin user
  // - Test organization
  // - Sample patients (optional)
  // - User roles and permissions
}

export async function clearTestData() {
  // Remove all test data
  // Preserve base configuration
}
```

## Configuration

Add to `playwright.config.ts`:
```typescript
export default defineConfig({
  globalSetup: require.resolve('./tests/e2e/setup/global-setup'),
  globalTeardown: require.resolve('./tests/e2e/setup/global-teardown'),
  // ... other config
});
```
