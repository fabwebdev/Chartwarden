# Test Helpers

This directory contains utility functions and test data generators.

## Purpose

Helpers provide:
- Synthetic test data generation (HIPAA-compliant)
- Common utility functions
- Shared test logic
- Data transformation utilities

## Helpers to be Created

- `testData.ts` - Synthetic data generators for patients, users, encounters, etc.
- `utils.ts` - Common test utilities (date formatting, string manipulation, etc.)
- `api.ts` - API helper functions for direct API interactions

## Example Structure

```typescript
// testData.ts
import { faker } from '@faker-js/faker';

export function generatePatient() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    mrn: `MRN-${Date.now()}-${faker.string.uuid().substring(0, 8)}`,
    dateOfBirth: faker.date.birthdate({ min: 65, max: 100, mode: 'age' }),
    // ... other fields
  };
}

export function generateUser(role: string = 'clinician') {
  return {
    email: `test-${Date.now()}@example.com`,
    password: 'TestPassword123!',
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    role,
  };
}
```

```typescript
// utils.ts
export function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export function waitForApiResponse(page: Page, endpoint: string) {
  return page.waitForResponse(response =>
    response.url().includes(endpoint) && response.status() === 200
  );
}
```
