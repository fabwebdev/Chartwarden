import { test as base, Page } from '@playwright/test';
import { AuthPage } from '../pages/auth.page';

/**
 * Test data for different user roles
 */
export const TEST_USERS = {
  admin: {
    email: 'admin@chartwarden.test',
    password: 'Admin@12345',
    role: 'admin',
  },
  clinician: {
    email: 'clinician@chartwarden.test',
    password: 'Clinician@12345',
    role: 'clinician',
  },
  nurse: {
    email: 'nurse@chartwarden.test',
    password: 'Nurse@12345',
    role: 'nurse',
  },
  patient: {
    email: 'patient@chartwarden.test',
    password: 'Patient@12345',
    role: 'patient',
  },
};

/**
 * Extended test fixtures with authentication helpers
 */
type AuthFixtures = {
  authenticatedPage: Page;
  authenticatedAdminPage: Page;
  authenticatedClinicianPage: Page;
  authenticatedNursePage: Page;
  authPage: AuthPage;
};

/**
 * Login helper function
 * @param page - Playwright Page object
 * @param email - User email
 * @param password - User password
 */
export async function loginAs(page: Page, email: string, password: string): Promise<void> {
  const authPage = new AuthPage(page);
  await authPage.navigateToLogin();
  await authPage.login(email, password);
  await authPage.waitForLoginSuccess();
}

/**
 * Login as specific role
 * @param page - Playwright Page object
 * @param role - User role (admin, clinician, nurse, patient)
 */
export async function loginAsRole(page: Page, role: keyof typeof TEST_USERS): Promise<void> {
  const user = TEST_USERS[role];
  await loginAs(page, user.email, user.password);
}

/**
 * Logout helper function
 * @param page - Playwright Page object
 */
export async function logout(page: Page): Promise<void> {
  // Navigate to logout endpoint or clear cookies
  const authPage = new AuthPage(page);
  await authPage.clearAuthCookies();
  await page.goto('/login');
}

/**
 * Check if user is authenticated
 * @param page - Playwright Page object
 */
export async function isAuthenticated(page: Page): Promise<boolean> {
  const authPage = new AuthPage(page);
  return await authPage.isAuthenticated();
}

/**
 * Extended test with authenticated page context
 */
export const authenticatedTest = base.extend<AuthFixtures>({
  /**
   * Provides a page with authenticated session (default clinician role)
   */
  authenticatedPage: async ({ page }, use) => {
    await loginAsRole(page, 'clinician');
    await use(page);
    await logout(page);
  },

  /**
   * Provides a page with authenticated admin session
   */
  authenticatedAdminPage: async ({ page }, use) => {
    await loginAsRole(page, 'admin');
    await use(page);
    await logout(page);
  },

  /**
   * Provides a page with authenticated clinician session
   */
  authenticatedClinicianPage: async ({ page }, use) => {
    await loginAsRole(page, 'clinician');
    await use(page);
    await logout(page);
  },

  /**
   * Provides a page with authenticated nurse session
   */
  authenticatedNursePage: async ({ page }, use) => {
    await loginAsRole(page, 'nurse');
    await use(page);
    await logout(page);
  },

  /**
   * Provides an AuthPage instance for convenience
   */
  authPage: async ({ page }, use) => {
    const authPage = new AuthPage(page);
    await use(authPage);
  },
});

/**
 * Get authentication cookies from a page
 * @param page - Playwright Page object
 */
export async function getAuthCookies(page: Page) {
  return await page.context().cookies();
}

/**
 * Set authentication cookies on a page
 * @param page - Playwright Page object
 * @param cookies - Array of cookies to set
 */
export async function setAuthCookies(page: Page, cookies: any[]) {
  await page.context().addCookies(cookies);
}

/**
 * Save authentication state to a file
 * @param page - Playwright Page object
 * @param path - Path to save the auth state
 */
export async function saveAuthState(page: Page, path: string): Promise<void> {
  await page.context().storageState({ path });
}

/**
 * Load authentication state from a file
 * This function returns the path to be used in browser context creation
 * @param path - Path to the saved auth state
 */
export function loadAuthState(path: string): string {
  return path;
}

/**
 * Create a new user account for testing
 * @param page - Playwright Page object
 * @param userData - User registration data
 */
export async function registerUser(page: Page, userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company?: string;
}): Promise<void> {
  const authPage = new AuthPage(page);
  await authPage.navigateToRegister();
  await authPage.register(userData);
  await authPage.waitForRegisterSuccess();
}

/**
 * Register and login in one flow
 * @param page - Playwright Page object
 * @param userData - User registration data
 */
export async function registerAndLogin(page: Page, userData: {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  company?: string;
}): Promise<void> {
  await registerUser(page, userData);
  await loginAs(page, userData.email, userData.password);
}
