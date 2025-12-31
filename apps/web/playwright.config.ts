import { defineConfig, devices } from '@playwright/test';

/**
 * Playwright configuration for Chartwarden Web App
 * See https://playwright.dev/docs/test-configuration
 *
 * NOTE: Start the dev server with `npm run dev` before running tests.
 * For local development: npx playwright test
 * For CI: The webServer config will start the server automatically
 */
export default defineConfig({
  testDir: './tests',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  timeout: 30000,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'mobile',
      use: { ...devices['iPhone 13'] },
    },
  ],
  // Only configure webServer in CI environment
  ...(process.env.CI && {
    webServer: {
      command: 'npm run dev',
      url: 'http://localhost:3000',
      reuseExistingServer: false,
      timeout: 120000,
    },
  }),
});
