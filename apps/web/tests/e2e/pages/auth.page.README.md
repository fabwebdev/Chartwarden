# AuthPage - Page Object Model

## Overview

The `AuthPage` class is a comprehensive Page Object Model (POM) that encapsulates all interactions with the authentication pages in the Chartwarden application, including:

- **Login Page** (`/login`)
- **Register Page** (`/register`)
- Authentication state management
- Form validation handling
- OAuth integration points

## File Location

`apps/web/tests/e2e/pages/auth.page.ts`

## Basic Usage

```typescript
import { test } from '@playwright/test';
import { AuthPage } from './pages/auth.page';

test('login flow', async ({ page }) => {
  const authPage = new AuthPage(page);

  await authPage.navigateToLogin();
  await authPage.login('user@example.com', 'password123');
  await authPage.waitForLoginSuccess();
});
```

## Key Features

### 1. Navigation Methods

```typescript
// Navigate to login page
await authPage.navigateToLogin();

// Navigate to register page
await authPage.navigateToRegister();

// Navigate from login to register via link
await authPage.navigateToRegisterFromLogin();

// Navigate from register to login via link
await authPage.navigateToLoginFromRegister();
```

### 2. Login Operations

```typescript
// Basic login
await authPage.login('email@example.com', 'password');

// Login with "Keep me signed in" checked
await authPage.login('email@example.com', 'password', true);

// Fill fields individually
await authPage.fillLoginEmail('email@example.com');
await authPage.fillLoginPassword('password');
await authPage.clickLoginSubmit();

// OAuth login
await authPage.clickGoogleLoginButton();
await authPage.clickGitHubLoginButton();
```

### 3. Registration Operations

```typescript
// Register new user
await authPage.register({
  firstName: 'John',
  lastName: 'Doe',
  email: 'john.doe@example.com',
  password: 'StrongP@ssw0rd123',
  company: 'Test Company' // Optional
});

// OAuth registration
await authPage.clickGoogleRegisterButton();
await authPage.clickGitHubRegisterButton();
```

### 4. Form Validation

```typescript
// Submit empty forms to trigger validation
await authPage.submitEmptyLoginForm();
await authPage.submitEmptyRegisterForm();

// Verify validation errors
await authPage.verifyEmailValidationError('Email is required');
await authPage.verifyPasswordValidationError('Password is required');
await authPage.verifyFirstNameValidationError('First Name is required');
await authPage.verifyLastNameValidationError('Last Name is required');
```

### 5. Error Handling

```typescript
// Get error messages
const loginError = await authPage.getLoginErrorMessage();
const registerError = await authPage.getRegisterErrorMessage();

// Verify error alerts are displayed
await authPage.verifyLoginErrorDisplayed();
await authPage.verifyRegisterErrorDisplayed('Invalid email or password');
```

### 6. Page State Verification

```typescript
// Check current page
const isOnLogin = await authPage.isOnLoginPage();
const isOnRegister = await authPage.isOnRegisterPage();

// Verify page elements are visible
await authPage.verifyLoginPageElements();
await authPage.verifyRegisterPageElements();
```

### 7. Authentication State

```typescript
// Check if user is authenticated (via session cookie)
const isAuth = await authPage.isAuthenticated();

// Get all cookies
const cookies = await authPage.getCookies();

// Clear authentication cookies (logout)
await authPage.clearAuthCookies();
```

### 8. Password Features

```typescript
// Toggle password visibility
await authPage.togglePasswordVisibility();

// Check if password is visible
const isVisible = await authPage.isPasswordVisible();

// Type password slowly to trigger strength indicator
await authPage.typePasswordSlowly('MyStrongPassword123!');

// Get password strength label
const strength = await authPage.getPasswordStrengthLabel(); // "Weak", "Normal", "Good", or "Strong"
```

### 9. Wait Helpers

```typescript
// Wait for successful login redirect
await authPage.waitForLoginSuccess();

// Wait for successful registration redirect
await authPage.waitForRegisterSuccess();

// Wait for page navigation to complete
await authPage.waitForNavigation();
```

## Element Locators

The AuthPage class provides direct access to all page elements if needed:

### Login Page Elements
- `loginEmailInput`
- `loginPasswordInput`
- `loginSubmitButton`
- `loginGoogleButton`
- `loginGitHubButton`
- `loginKeepMeSignedInCheckbox`
- `loginRegisterLink`
- `loginErrorAlert`

### Register Page Elements
- `registerFirstNameInput`
- `registerLastNameInput`
- `registerEmailInput`
- `registerCompanyInput`
- `registerPasswordInput`
- `registerSubmitButton`
- `registerGoogleButton`
- `registerGitHubButton`
- `registerLoginLink`
- `registerErrorAlert`
- `registerPasswordStrengthIndicator`
- `registerPasswordStrengthLabel`

### Validation Elements
- `emailValidationError`
- `passwordValidationError`
- `firstNameValidationError`
- `lastNameValidationError`

## Complete Test Example

```typescript
import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';

test.describe('User Authentication', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test('successful user registration and login flow', async () => {
    // 1. Navigate to register page
    await authPage.navigateToRegister();
    await authPage.verifyRegisterPageElements();

    // 2. Register new user
    const timestamp = Date.now();
    const email = `test-${timestamp}@example.com`;
    const password = 'StrongP@ssw0rd123!';

    await authPage.register({
      firstName: 'Test',
      lastName: 'User',
      email: email,
      password: password,
      company: 'Test Company'
    });

    // 3. Wait for redirect to login page
    await authPage.waitForRegisterSuccess();
    expect(await authPage.isOnLoginPage()).toBe(true);

    // 4. Login with newly created credentials
    await authPage.login(email, password);
    await authPage.waitForLoginSuccess();

    // 5. Verify authentication
    expect(await authPage.isAuthenticated()).toBe(true);
  });

  test('login validation errors', async () => {
    await authPage.navigateToLogin();

    // Submit empty form
    await authPage.submitEmptyLoginForm();

    // Verify validation errors
    await authPage.verifyEmailValidationError();
    await authPage.verifyPasswordValidationError();
  });

  test('invalid credentials error handling', async () => {
    await authPage.navigateToLogin();

    // Attempt login with invalid credentials
    await authPage.login('invalid@test.com', 'wrongpassword');

    // Verify error message is displayed
    await authPage.verifyLoginErrorDisplayed();
    const errorMessage = await authPage.getLoginErrorMessage();
    expect(errorMessage.toLowerCase()).toContain('invalid');
  });

  test('password strength indicator', async () => {
    await authPage.navigateToRegister();

    // Test weak password
    await authPage.typePasswordSlowly('weak');
    let strength = await authPage.getPasswordStrengthLabel();
    expect(strength).toContain('Weak');

    // Test strong password
    await authPage.registerPasswordInput.clear();
    await authPage.typePasswordSlowly('StrongP@ssw0rd123!');
    strength = await authPage.getPasswordStrengthLabel();
    expect(strength).toMatch(/Good|Strong/);
  });

  test('session management', async () => {
    // Ensure not authenticated initially
    await authPage.navigateToLogin();
    expect(await authPage.isAuthenticated()).toBe(false);

    // Login
    await authPage.login('user@example.com', 'ValidPassword123!');
    await authPage.waitForLoginSuccess();
    expect(await authPage.isAuthenticated()).toBe(true);

    // Logout by clearing cookies
    await authPage.clearAuthCookies();
    expect(await authPage.isAuthenticated()).toBe(false);
  });
});
```

## Implementation Details

### Locator Strategy

The AuthPage uses a combination of Playwright locator strategies:

1. **ID-based**: `input#email-login` (most specific)
2. **Attribute-based**: `input[name="email"]` (fallback)
3. **Role-based**: `getByRole('button', { name: /login/i })` (accessible)
4. **Text-based**: For dynamic content and labels

### Error Handling

The page object includes built-in timeout handling and waiting strategies:
- Default Playwright auto-waiting for most actions
- Explicit waits for async operations (e.g., `waitForLoginSuccess`)
- Timeout parameters for error message visibility

### Better Auth Integration

The page object is designed to work with Better Auth's cookie-based authentication:
- Checks for `better-auth.session_token` cookie
- Handles session management through browser context
- Supports cookie clearing for logout

## Best Practices

1. **Always use the POM**: Don't access elements directly in tests
2. **Use descriptive method names**: The POM provides clear, intention-revealing methods
3. **Handle async properly**: Always await asynchronous operations
4. **Leverage verification methods**: Use built-in verification methods for assertions
5. **Reuse in fixtures**: Create test fixtures that initialize AuthPage for reuse

## See Also

- [Example Usage](../examples/auth-page-usage.example.ts)
- [Playwright Documentation](https://playwright.dev/docs/pom)
- [Better Auth Documentation](https://better-auth.com)
