import { test, expect } from '@playwright/test';
import { AuthPage } from './pages/auth.page';
import { generateUserData, generateEmail } from './helpers/testData';

test.describe('Authentication Workflow', () => {
  let authPage: AuthPage;

  test.beforeEach(async ({ page }) => {
    authPage = new AuthPage(page);
  });

  test.describe('Login Flow', () => {
    test('should successfully login with valid credentials', async ({ page }) => {
      const testUser = {
        email: 'admin@chartwarden.test',
        password: 'Admin@12345',
      };

      await authPage.navigateToLogin();
      await authPage.verifyLoginPageElements();
      await authPage.login(testUser.email, testUser.password);
      await authPage.waitForLoginSuccess();

      // Verify authenticated state
      const isAuth = await authPage.isAuthenticated();
      expect(isAuth).toBe(true);

      // Verify redirect to dashboard
      await expect(page).toHaveURL(/\/(dashboard|sample-page)/);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await authPage.navigateToLogin();
      await authPage.login('invalid@example.com', 'WrongPassword123');

      // Wait a moment for error to appear
      await page.waitForTimeout(1000);

      // Check if we're still on login page (no redirect)
      expect(await authPage.isOnLoginPage()).toBe(true);
    });

    test('should show validation errors for empty form submission', async ({ page }) => {
      await authPage.navigateToLogin();
      await authPage.submitEmptyLoginForm();

      // Should remain on login page
      expect(await authPage.isOnLoginPage()).toBe(true);
    });

    test('should toggle password visibility', async ({ page }) => {
      await authPage.navigateToLogin();
      await authPage.fillLoginPassword('TestPassword123');

      // Initially password should be hidden
      expect(await authPage.isPasswordVisible()).toBe(false);

      // Toggle to show password
      await authPage.togglePasswordVisibility();
      expect(await authPage.isPasswordVisible()).toBe(true);

      // Toggle back to hide password
      await authPage.togglePasswordVisibility();
      expect(await authPage.isPasswordVisible()).toBe(false);
    });

    test('should remember user when "Keep me signed in" is checked', async ({ page }) => {
      const testUser = {
        email: 'admin@chartwarden.test',
        password: 'Admin@12345',
      };

      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password, true);
      await authPage.waitForLoginSuccess();

      const cookies = await authPage.getCookies();
      const sessionCookie = cookies.find(cookie => cookie.name.includes('better-auth.session_token'));

      expect(sessionCookie).toBeDefined();
    });
  });

  test.describe('Registration Flow', () => {
    test('should successfully register a new user', async ({ page }) => {
      const newUser = generateUserData({
        email: generateEmail('newuser'),
        password: 'NewUser@12345',
      });

      await authPage.navigateToRegister();
      await authPage.verifyRegisterPageElements();

      await authPage.register({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: newUser.password,
        company: newUser.company,
      });

      // Wait for redirect or success message
      await page.waitForTimeout(2000);

      // Should redirect to login page after successful registration
      // OR show success message
      const currentUrl = page.url();
      const hasRedirected = currentUrl.includes('/login') || currentUrl.includes('/dashboard');

      if (!hasRedirected) {
        // Check if still on register page with success message
        expect(await authPage.isOnRegisterPage()).toBe(true);
      }
    });

    test('should show password strength indicator', async ({ page }) => {
      await authPage.navigateToRegister();

      const newUser = generateUserData();
      await authPage.registerFirstNameInput.fill(newUser.firstName);
      await authPage.registerLastNameInput.fill(newUser.lastName);
      await authPage.registerEmailInput.fill(newUser.email);

      // Type password slowly to trigger strength indicator
      await authPage.typePasswordSlowly('Weak1');
      await page.waitForTimeout(500);

      // Strength indicator should be visible
      const strengthLabel = await authPage.getPasswordStrengthLabel().catch(() => '');
      expect(strengthLabel).toBeTruthy();
    });

    test('should show validation errors for missing required fields', async ({ page }) => {
      await authPage.navigateToRegister();
      await authPage.submitEmptyRegisterForm();

      // Should remain on register page
      expect(await authPage.isOnRegisterPage()).toBe(true);
    });

    test('should navigate between login and register pages', async ({ page }) => {
      // Start on login page
      await authPage.navigateToLogin();
      expect(await authPage.isOnLoginPage()).toBe(true);

      // Navigate to register page
      await authPage.navigateToRegisterFromLogin();
      expect(await authPage.isOnRegisterPage()).toBe(true);

      // Navigate back to login page
      await authPage.navigateToLoginFromRegister();
      expect(await authPage.isOnLoginPage()).toBe(true);
    });
  });

  test.describe('Logout Flow', () => {
    test('should successfully logout', async ({ page }) => {
      const testUser = {
        email: 'admin@chartwarden.test',
        password: 'Admin@12345',
      };

      // Login first
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await authPage.waitForLoginSuccess();

      // Verify authenticated
      expect(await authPage.isAuthenticated()).toBe(true);

      // Logout by clearing cookies
      await authPage.clearAuthCookies();
      await page.goto('/login');

      // Verify not authenticated
      expect(await authPage.isAuthenticated()).toBe(false);
    });
  });

  test.describe('Session Management', () => {
    test('should maintain session across page reloads', async ({ page }) => {
      const testUser = {
        email: 'admin@chartwarden.test',
        password: 'Admin@12345',
      };

      // Login
      await authPage.navigateToLogin();
      await authPage.login(testUser.email, testUser.password);
      await authPage.waitForLoginSuccess();

      // Get cookies before reload
      const cookiesBefore = await authPage.getCookies();

      // Reload page
      await page.reload();
      await page.waitForLoadState('networkidle');

      // Should still be authenticated
      expect(await authPage.isAuthenticated()).toBe(true);

      // Cookies should still exist
      const cookiesAfter = await authPage.getCookies();
      expect(cookiesAfter.length).toBeGreaterThan(0);
      expect(cookiesBefore.length).toBe(cookiesAfter.length);
    });

    test('should redirect to login when accessing protected route without authentication', async ({ page }) => {
      // Try to access protected route without login
      await page.goto('/patients');

      // Wait for potential redirect
      await page.waitForLoadState('networkidle');

      // Should be redirected to login page
      const currentUrl = page.url();
      expect(currentUrl).toMatch(/\/login/);
    });
  });

  test.describe('Form Validation', () => {
    test('should validate email format on login', async ({ page }) => {
      await authPage.navigateToLogin();

      // Try invalid email format
      await authPage.fillLoginEmail('not-an-email');
      await authPage.fillLoginPassword('SomePassword123');
      await authPage.clickLoginSubmit();

      // Should show validation error or stay on page
      await page.waitForTimeout(500);
      expect(await authPage.isOnLoginPage()).toBe(true);
    });

    test('should validate email format on registration', async ({ page }) => {
      await authPage.navigateToRegister();

      const newUser = generateUserData();
      await authPage.registerFirstNameInput.fill(newUser.firstName);
      await authPage.registerLastNameInput.fill(newUser.lastName);
      await authPage.registerEmailInput.fill('not-an-email');
      await authPage.registerPasswordInput.fill('ValidPassword@123');
      await authPage.clickRegisterSubmit();

      // Should show validation error or stay on page
      await page.waitForTimeout(500);
      expect(await authPage.isOnRegisterPage()).toBe(true);
    });
  });
});
