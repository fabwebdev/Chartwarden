# End-to-End (E2E) Tests

This directory contains comprehensive end-to-end tests for critical user workflows in the Chartwarden hospice EHR system.

## Directory Structure

```
e2e/
├── README.md                    # This file - documentation for E2E tests
├── pages/                       # Page Object Models (POM)
│   ├── auth.page.ts            # Authentication pages (login, register, logout)
│   ├── patient.page.ts         # Patient management pages (list, create, edit)
│   ├── user.page.ts            # User management pages
│   └── ...                     # Additional page objects
├── fixtures/                    # Reusable test fixtures
│   ├── auth.fixture.ts         # Authentication helpers and authenticated contexts
│   └── ...                     # Additional fixtures
├── helpers/                     # Utility functions and test data generators
│   ├── testData.ts             # Synthetic test data generators (patients, users, etc.)
│   ├── utils.ts                # Common test utilities
│   └── ...                     # Additional helpers
├── setup/                       # Global setup and teardown scripts
│   ├── global-setup.ts         # Pre-test environment setup
│   ├── global-teardown.ts      # Post-test cleanup
│   └── seed.ts                 # Database seeding for consistent test data
├── auth.spec.ts                # Authentication workflow tests
├── patient-management.spec.ts  # Patient creation and management tests
├── user-management.spec.ts     # User administration tests
├── nursing-note.spec.ts        # Clinical documentation tests
└── ...                         # Additional test suites
```

## Design Patterns

### Page Object Model (POM)

We use the Page Object Model pattern to:
- **Encapsulate** page-specific selectors and actions
- **Reduce duplication** across test files
- **Improve maintainability** when UI changes occur
- **Enhance readability** of test specs

Example:
```typescript
// pages/patient.page.ts
export class PatientPage {
  constructor(private page: Page) {}

  async navigateToPatientList() {
    await this.page.goto('/patients');
  }

  async createPatient(data: PatientData) {
    // Implementation
  }
}

// patient-management.spec.ts
test('should create a new patient', async ({ page }) => {
  const patientPage = new PatientPage(page);
  await patientPage.navigateToPatientList();
  await patientPage.createPatient(testData.patient);
  // Assertions
});
```

### Test Fixtures

Fixtures provide reusable test contexts:
- **Authentication state** - Pre-authenticated user sessions
- **Test data setup** - Seeded database records
- **Common configurations** - Shared test settings

Example:
```typescript
// fixtures/auth.fixture.ts
export const authenticatedTest = base.extend({
  authenticatedPage: async ({ page }, use) => {
    await loginAsUser(page, 'clinician');
    await use(page);
  }
});

// Usage in tests
authenticatedTest('should access dashboard', async ({ authenticatedPage }) => {
  await authenticatedPage.goto('/dashboard');
  // Test with authenticated session
});
```

### Test Data Generators

We use synthetic data generators to:
- **Ensure HIPAA compliance** - No real PHI in tests
- **Create unique data** - Prevent test conflicts with timestamps/UUIDs
- **Maintain consistency** - Standardized test data format

Example:
```typescript
// helpers/testData.ts
export function generatePatient() {
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    mrn: `MRN-${Date.now()}-${faker.string.uuid()}`,
    // ...
  };
}
```

## Test Organization

### Test Suites by Workflow

Each test file focuses on a complete user workflow:

- **auth.spec.ts** - Registration, login, logout, session management
- **patient-management.spec.ts** - Patient creation, listing, searching
- **patient-detail.spec.ts** - Patient details, editing, viewing
- **user-management.spec.ts** - User creation, role assignment, RBAC
- **nursing-note.spec.ts** - Clinical note creation and documentation
- **idg-meeting.spec.ts** - IDG meeting scheduling and documentation
- **session-management.spec.ts** - Session expiration, re-authentication
- **form-validation.spec.ts** - Form validation and error handling
- **authorization.spec.ts** - Role-based access control tests
- **error-handling.spec.ts** - API errors, network issues, recovery

### Test Naming Convention

Follow this pattern for test descriptions:
```typescript
test.describe('User Management Workflow', () => {
  test('should create new user and assign clinician role', async ({ page }) => {
    // Test implementation
  });

  test('should prevent unauthorized access to admin routes', async ({ page }) => {
    // Test implementation
  });
});
```

## Running Tests

### Local Development

```bash
# Run all E2E tests
npm run test:e2e

# Run specific test file
npx playwright test tests/e2e/auth.spec.ts

# Run in headed mode (see browser)
npx playwright test --headed

# Run in debug mode
npx playwright test --debug

# Run specific project (chromium or mobile)
npx playwright test --project=chromium
```

### CI/CD Environment

Tests run automatically in CI with:
- **Parallel execution** disabled (workers: 1) for consistency
- **Automatic retries** (2 retries) for flaky test recovery
- **Web server auto-start** via playwright config
- **HTML reports** generated for test results

```bash
# CI command (from root)
npm run test:e2e:ci
```

## Writing New Tests

### Step 1: Identify the Workflow

Determine the complete user journey you want to test:
- What is the starting state?
- What actions does the user take?
- What is the expected outcome?

### Step 2: Create/Update Page Objects

If testing a new page, create a Page Object Model in `pages/`:

```typescript
// pages/example.page.ts
import { Page, Locator } from '@playwright/test';

export class ExamplePage {
  readonly page: Page;
  readonly submitButton: Locator;
  readonly titleInput: Locator;

  constructor(page: Page) {
    this.page = page;
    this.submitButton = page.getByRole('button', { name: 'Submit' });
    this.titleInput = page.getByLabel('Title');
  }

  async navigate() {
    await this.page.goto('/example');
  }

  async fillForm(data: { title: string }) {
    await this.titleInput.fill(data.title);
  }

  async submit() {
    await this.submitButton.click();
  }
}
```

### Step 3: Create Test Data

Add test data generators in `helpers/testData.ts`:

```typescript
export function generateExampleData() {
  return {
    title: `Example-${Date.now()}`,
    description: faker.lorem.sentence(),
  };
}
```

### Step 4: Write the Test

Create a new test file in `e2e/`:

```typescript
import { test, expect } from '@playwright/test';
import { ExamplePage } from './pages/example.page';
import { generateExampleData } from './helpers/testData';

test.describe('Example Workflow', () => {
  test('should complete example workflow', async ({ page }) => {
    const examplePage = new ExamplePage(page);
    const testData = generateExampleData();

    await examplePage.navigate();
    await examplePage.fillForm(testData);
    await examplePage.submit();

    await expect(page).toHaveURL(/\/example\/success/);
  });
});
```

## Best Practices

### 1. Test Isolation
- Each test should be independent
- Use unique test data (timestamps, UUIDs)
- Clean up after tests (if needed)

### 2. Explicit Waits
- Use Playwright's auto-waiting features
- Avoid `page.waitForTimeout()` - use `waitForSelector()` or `waitForLoadState()`
- Wait for network idle when needed: `await page.waitForLoadState('networkidle')`

### 3. Assertions
- Use specific assertions: `toHaveText()`, `toBeVisible()`, `toHaveURL()`
- Assert on multiple conditions for clarity
- Use soft assertions for non-critical checks

### 4. Error Handling
- Test both happy paths and error cases
- Verify error messages are user-friendly
- Test form validation thoroughly

### 5. HIPAA Compliance
- **NEVER** use real PHI in tests
- Use synthetic data generators only
- Document data handling practices

### 6. Performance
- Keep tests focused and concise
- Reuse authentication state where possible
- Run independent tests in parallel
- Aim for < 10 minutes total execution time

## Debugging Tests

### View Test Reports
```bash
npx playwright show-report
```

### View Traces
When tests fail with retries, traces are automatically captured:
```bash
npx playwright show-trace trace.zip
```

### Screenshots
Failed tests automatically capture screenshots in `test-results/`

### Use Debug Mode
```bash
npx playwright test --debug
```
This opens Playwright Inspector for step-by-step debugging.

## Common Issues

### Authentication Issues
- Ensure Better Auth cookies are properly set
- Check session expiration settings
- Verify API base URL configuration

### Timing Issues
- Use Playwright's auto-waiting instead of hardcoded timeouts
- Wait for network idle on complex pages
- Use `waitForSelector()` for dynamic elements

### Test Data Conflicts
- Ensure unique identifiers (timestamps, UUIDs)
- Clean up test data between runs
- Use isolated test database if possible

### CI Failures
- Check that web server starts successfully
- Verify database is seeded correctly
- Review HTML reports for detailed error messages

## Resources

- [Playwright Documentation](https://playwright.dev/)
- [Page Object Model Guide](https://playwright.dev/docs/pom)
- [Best Practices](https://playwright.dev/docs/best-practices)
- [Debugging Guide](https://playwright.dev/docs/debug)

## Contributing

When adding new E2E tests:
1. Follow the existing patterns (POM, fixtures, test data)
2. Document complex workflows
3. Ensure tests pass locally before committing
4. Update this README if adding new patterns or conventions
