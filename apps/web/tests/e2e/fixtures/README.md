# Test Fixtures

This directory contains reusable test fixtures for E2E tests.

## Purpose

Fixtures provide:
- Pre-authenticated user sessions
- Common test contexts
- Shared test configurations
- Reusable setup/teardown logic

## Fixtures to be Created

- `auth.fixture.ts` - Authentication helpers and authenticated user contexts
- `database.fixture.ts` - Database setup/cleanup helpers
- `api.fixture.ts` - API mocking and request interception

## Example Structure

```typescript
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Setup: Login user
    await page.goto('/login');
    await page.fill('[name="email"]', 'test@example.com');
    await page.fill('[name="password"]', 'password');
    await page.click('button[type="submit"]');
    await page.waitForURL('/dashboard');

    // Provide authenticated page to test
    await use(page);

    // Teardown: Logout (if needed)
  },
});
```
