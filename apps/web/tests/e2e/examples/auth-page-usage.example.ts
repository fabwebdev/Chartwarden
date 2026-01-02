import { test, expect } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';

/**
 * Example usage of AuthPage Page Object Model
 * This file demonstrates how to use the auth.page.ts POM in E2E tests
 *
 * Note: This is an example file. Actual tests will be created in Phase 2.
 */

test.describe('AuthPage POM Usage Examples', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test.skip('Example: Login page verification', async () => {
    // Navigate to login page
    await authPage.navigateToLogin();

    // Verify all elements are visible
    await authPage.verifyLoginPageElements();

    // Verify we're on the login page
    expect(await authPage.isOnLoginPage()).toBe(true);
  });

  test.skip('Example: Register page verification', async () => {
    // Navigate to register page
    await authPage.navigateToRegister();

    // Verify all elements are visible
    await authPage.verifyRegisterPageElements();

    // Verify we're on the register page
    expect(await authPage.isOnRegisterPage()).toBe(true);
  });

  test.skip('Example: Login with valid credentials', async () => {
    await authPage.navigateToLogin();

    // Login with credentials
    await authPage.login('test@example.com', 'StrongP@ssw0rd123');

    // Wait for successful login
    await authPage.waitForLoginSuccess();

    // Verify authenticated
    expect(await authPage.isAuthenticated()).toBe(true);
  });

  test.skip('Example: Register new user', async () => {
    await authPage.navigateToRegister();

    // Fill registration form
    await authPage.register({
      firstName: 'John',
      lastName: 'Doe',
      email: `test-${Date.now()}@example.com`,
      password: 'StrongP@ssw0rd123',
      company: 'Test Company'
    });

    // Wait for redirect to login page
    await authPage.waitForRegisterSuccess();
  });

  test.skip('Example: Login validation errors', async () => {
    await authPage.navigateToLogin();

    // Submit empty form
    await authPage.submitEmptyLoginForm();

    // Verify validation errors appear
    await authPage.verifyEmailValidationError('Email is required');
    await authPage.verifyPasswordValidationError('Password is required');
  });

  test.skip('Example: Invalid login credentials', async () => {
    await authPage.navigateToLogin();

    // Login with invalid credentials
    await authPage.login('invalid@test.com', 'wrongpassword');

    // Verify error message is shown
    await authPage.verifyLoginErrorDisplayed();
    const errorMessage = await authPage.getLoginErrorMessage();
    expect(errorMessage).toContain('Invalid');
  });

  test.skip('Example: Password visibility toggle', async () => {
    await authPage.navigateToLogin();

    // Fill password
    await authPage.fillLoginPassword('test123');

    // Initially password should be hidden
    expect(await authPage.isPasswordVisible()).toBe(false);

    // Toggle visibility
    await authPage.togglePasswordVisibility();

    // Password should now be visible
    expect(await authPage.isPasswordVisible()).toBe(true);
  });

  test.skip('Example: Password strength indicator', async () => {
    await authPage.navigateToRegister();

    // Type weak password
    await authPage.typePasswordSlowly('weak');
    let strength = await authPage.getPasswordStrengthLabel();
    expect(strength).toContain('Weak');

    // Clear and type strong password
    await authPage.registerPasswordInput.clear();
    await authPage.typePasswordSlowly('StrongP@ssw0rd123!');
    strength = await authPage.getPasswordStrengthLabel();
    expect(strength).toMatch(/Good|Strong/);
  });

  test.skip('Example: Navigation between login and register', async () => {
    await authPage.navigateToLogin();
    expect(await authPage.isOnLoginPage()).toBe(true);

    // Navigate to register via link
    await authPage.navigateToRegisterFromLogin();
    expect(await authPage.isOnRegisterPage()).toBe(true);

    // Navigate back to login via link
    await authPage.navigateToLoginFromRegister();
    expect(await authPage.isOnLoginPage()).toBe(true);
  });

  test.skip('Example: OAuth button clicks', async () => {
    await authPage.navigateToLogin();

    // These will trigger OAuth flow (in real tests, you'd mock or handle OAuth)
    // For now, just verify the buttons are clickable
    await expect(authPage.loginGoogleButton).toBeEnabled();
    await expect(authPage.loginGitHubButton).toBeEnabled();

    await authPage.navigateToRegister();
    await expect(authPage.registerGoogleButton).toBeEnabled();
    await expect(authPage.registerGitHubButton).toBeEnabled();
  });

  test.skip('Example: Session management', async () => {
    await authPage.navigateToLogin();

    // Check if authenticated before login
    expect(await authPage.isAuthenticated()).toBe(false);

    // Perform login (with valid test credentials)
    await authPage.login('testuser@example.com', 'ValidPassword123!');
    await authPage.waitForLoginSuccess();

    // Check authentication status
    expect(await authPage.isAuthenticated()).toBe(true);

    // Get cookies
    const cookies = await authPage.getCookies();
    expect(cookies.length).toBeGreaterThan(0);

    // Clear auth cookies (logout)
    await authPage.clearAuthCookies();
    expect(await authPage.isAuthenticated()).toBe(false);
  });
});
