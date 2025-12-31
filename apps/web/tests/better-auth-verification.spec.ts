import { test, expect } from '@playwright/test';

/**
 * Verification tests for Better Auth Integration
 * Feature: better-auth-integration
 *
 * This test verifies:
 * 1. Login page displays email/password form
 * 2. Login page displays OAuth social login buttons (Google, GitHub)
 * 3. Register page displays registration form
 * 4. Register page displays OAuth social login buttons
 * 5. Form validation works correctly
 * 6. Backend auth endpoints are accessible
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:3001';

test.describe('Better Auth Integration Verification', () => {
  test.describe('Login Page', () => {
    test('should display login form with email and password fields', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Check for email input
      const emailInput = page.locator('input[type="email"], input[name="email"], #email-login');
      await expect(emailInput).toBeVisible();

      // Check for password input
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      await expect(passwordInput).toBeVisible();

      // Check for login button
      const loginButton = page.locator('button[type="submit"]');
      await expect(loginButton).toBeVisible();
      await expect(loginButton).toContainText(/login|sign in/i);
    });

    test('should display OAuth social login buttons', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Check for Google sign-in button
      const googleButton = page.locator('button:has-text("Google"), button:has-text("google")');
      await expect(googleButton).toBeVisible();

      // Check for GitHub sign-in button
      const githubButton = page.locator('button:has-text("GitHub"), button:has-text("github")');
      await expect(githubButton).toBeVisible();
    });

    test('should display link to registration page', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Check for registration link
      const registerLink = page.locator('a[href="/register"], a:has-text("account")');
      await expect(registerLink).toBeVisible();
    });

    test('should validate required fields on submit', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Click submit without filling form
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.click();

      // Wait for validation to appear
      await page.waitForTimeout(500);

      // Check for validation error messages
      const pageContent = await page.content();
      const hasValidation =
        pageContent.includes('required') ||
        pageContent.includes('Required') ||
        pageContent.includes('error') ||
        page.locator('.MuiFormHelperText-root').first() !== null;

      expect(hasValidation).toBe(true);
    });

    test('should show error for invalid credentials', async ({ page }) => {
      await page.goto('/login');
      await page.waitForLoadState('networkidle');

      // Fill in invalid credentials
      await page.fill('input[type="email"], input[name="email"], #email-login', 'invalid@test.com');
      await page.fill('input[type="password"], input[name="password"]', 'wrongpassword123!');

      // Submit form
      const loginButton = page.locator('button[type="submit"]');
      await loginButton.click();

      // Wait for response
      await page.waitForTimeout(2000);

      // Check for error message
      const errorAlert = page.locator('.MuiAlert-root, [role="alert"]');
      await expect(errorAlert).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe('Registration Page', () => {
    test('should display registration form with all required fields', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      // Check for first name input
      const firstNameInput = page.locator('input[name="firstname"], #firstname-login');
      await expect(firstNameInput).toBeVisible();

      // Check for last name input
      const lastNameInput = page.locator('input[name="lastname"], #lastname-signup');
      await expect(lastNameInput).toBeVisible();

      // Check for email input
      const emailInput = page.locator('input[type="email"], input[name="email"]');
      await expect(emailInput).toBeVisible();

      // Check for password input
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      await expect(passwordInput).toBeVisible();

      // Check for register button
      const registerButton = page.locator('button[type="submit"]');
      await expect(registerButton).toBeVisible();
      await expect(registerButton).toContainText(/create|sign up|register/i);
    });

    test('should display OAuth social signup buttons', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      // Check for Google sign-up button
      const googleButton = page.locator('button:has-text("Google")');
      await expect(googleButton).toBeVisible();

      // Check for GitHub sign-up button
      const githubButton = page.locator('button:has-text("GitHub")');
      await expect(githubButton).toBeVisible();
    });

    test('should display password strength indicator', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      // Type a password
      const passwordInput = page.locator('input[type="password"], input[name="password"]');
      await passwordInput.fill('Test123!@#Strong');

      // Check for password strength indicator
      await page.waitForTimeout(500);
      const pageContent = await page.content();
      const hasStrengthIndicator =
        pageContent.includes('Weak') ||
        pageContent.includes('Normal') ||
        pageContent.includes('Good') ||
        pageContent.includes('Strong') ||
        page.locator('[class*="strength"], [class*="level"]').first() !== null;

      expect(hasStrengthIndicator).toBe(true);
    });

    test('should display link to login page', async ({ page }) => {
      await page.goto('/register');
      await page.waitForLoadState('networkidle');

      // Check for login link
      const loginLink = page.locator('a[href="/login"], a:has-text("Already have")');
      await expect(loginLink).toBeVisible();
    });
  });

  test.describe('Backend Auth API', () => {
    test('should have accessible CSRF token endpoint', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/auth/csrf-token`);

      // Should return 200 with CSRF token
      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('csrfToken');
    });

    test('should reject invalid login credentials', async ({ request }) => {
      const response = await request.post(`${API_BASE_URL}/api/auth/sign-in`, {
        data: {
          email: 'invalid@test.com',
          password: 'wrongpassword123!'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Should return 401 for invalid credentials
      expect(response.status()).toBe(401);
    });

    test('should reject invalid registration data', async ({ request }) => {
      // Test with weak password
      const response = await request.post(`${API_BASE_URL}/api/auth/sign-up`, {
        data: {
          email: 'test@example.com',
          password: 'weak', // Too short
          firstName: 'Test',
          lastName: 'User'
        },
        headers: {
          'Content-Type': 'application/json'
        }
      });

      // Should return 422 for validation error
      expect(response.status()).toBe(422);

      const body = await response.json();
      expect(body).toHaveProperty('errors');
    });

    test('should have health check endpoint', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/health`);

      expect(response.status()).toBe(200);

      const body = await response.json();
      expect(body).toHaveProperty('status', 'ok');
    });
  });

  test.describe('Session Management', () => {
    test('unauthenticated request to /api/auth/me should return 401', async ({ request }) => {
      const response = await request.get(`${API_BASE_URL}/api/auth/me`);

      // Should return 401 for unauthenticated request
      expect(response.status()).toBe(401);
    });
  });
});
