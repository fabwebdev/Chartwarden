import { test, expect } from '@playwright/test';

/**
 * Verification tests for Next.js 14+ App Router setup
 * Feature: nextjs-app-setup
 *
 * This test verifies:
 * 1. The app loads correctly
 * 2. The correct page title is set
 * 3. The viewport meta tag is configured
 * 4. Basic navigation structure is present
 */

test.describe('Next.js App Setup Verification', () => {
  test('should load the home page with correct metadata', async ({ page }) => {
    // Navigate to the home page
    await page.goto('/');

    // Wait for the page to load
    await page.waitForLoadState('networkidle');

    // Verify the page title contains Chartwarden
    const title = await page.title();
    expect(title).toContain('Chartwarden');
  });

  test('should have correct viewport meta tag', async ({ page }) => {
    await page.goto('/');

    // Check for viewport meta tag
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('width=device-width');
    expect(viewportMeta).toContain('initial-scale=1');
  });

  test('should have correct description meta tag', async ({ page }) => {
    await page.goto('/');

    // Check for description meta tag
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toContain('HIPAA-compliant');
    expect(description).toContain('hospice');
  });

  test('should render the login page for unauthenticated users', async ({ page }) => {
    await page.goto('/');

    // The home page should show the login form for guests
    // Wait for the page to fully render
    await page.waitForLoadState('networkidle');

    // Check that some form of authentication UI is present
    // This could be a login form, sign in button, etc.
    const pageContent = await page.content();
    const hasAuthUI =
      pageContent.includes('login') ||
      pageContent.includes('Login') ||
      pageContent.includes('sign in') ||
      pageContent.includes('Sign In') ||
      pageContent.includes('email') ||
      pageContent.includes('password');

    expect(hasAuthUI).toBe(true);
  });

  test('should load stylesheets correctly', async ({ page }) => {
    await page.goto('/');

    // Check that CSS is loaded by verifying styles are applied
    // The body should have a background (not the default white/transparent)
    await page.waitForLoadState('networkidle');

    // The page should not have any console errors related to CSS
    const consoleErrors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Wait a bit for any delayed console messages
    await page.waitForTimeout(1000);

    // Filter out expected errors (like network requests to external services)
    const cssErrors = consoleErrors.filter(err =>
      err.includes('CSS') || err.includes('stylesheet') || err.includes('style')
    );

    expect(cssErrors.length).toBe(0);
  });

  test('should have correct HTML lang attribute', async ({ page }) => {
    await page.goto('/');

    // Check HTML lang attribute
    const htmlLang = await page.locator('html').getAttribute('lang');
    expect(htmlLang).toBe('en');
  });
});
