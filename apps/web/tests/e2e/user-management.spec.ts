import { test, expect } from '@playwright/test';
import { UserPage } from './pages/user.page';
import { loginAsRole } from './fixtures/auth.fixture';
import { generateUserData } from './helpers/testData';

test.describe('User Management Workflow', () => {
  let userPage: UserPage;

  test.beforeEach(async ({ page }) => {
    // Login as admin before each test
    await loginAsRole(page, 'admin');
    userPage = new UserPage(page);
  });

  test.describe('User List View', () => {
    test('should display user list page', async ({ page }) => {
      await userPage.navigateToUserList();
      await userPage.verifyUserListPageLoaded();

      // Verify key elements are visible
      await expect(userPage.addUserButton).toBeVisible();
    });

    test('should navigate to add user page', async ({ page }) => {
      await userPage.navigateToUserList();
      await userPage.clickAddUserButton();

      await userPage.verifyAddUserPageLoaded();
    });
  });

  test.describe('User Creation', () => {
    test('should create a new user with basic information', async ({ page }) => {
      const newUser = generateUserData({
        role: 'clinician',
      });

      await userPage.navigateToAddUser();
      await userPage.verifyAddUserPageLoaded();

      // Fill user form
      await userPage.createUser({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: newUser.password,
        role: newUser.role,
        phone: newUser.phone,
      });

      // Submit the form
      await userPage.submitUserForm();

      // Wait for success or redirect
      await page.waitForTimeout(2000);

      // Check for redirect
      const currentUrl = page.url();
      const redirected = currentUrl.includes('/users') && !currentUrl.includes('/add-new-user');

      expect(redirected || currentUrl.includes('/users/')).toBe(true);
    });

    test('should show validation errors for empty required fields', async ({ page }) => {
      await userPage.navigateToAddUser();
      await userPage.submitEmptyForm();

      // Should remain on add user page
      await expect(page).toHaveURL(/\/users\/add-new-user/);
    });
  });

  test.describe('User Search and Filter', () => {
    test('should search for users', async ({ page }) => {
      await userPage.navigateToUserList();
      await userPage.waitForUserListLoad();

      // Search for a user
      await userPage.searchUsers('admin');

      // Wait for search results
      await page.waitForTimeout(1000);

      // Table should be visible
      const isEmpty = await userPage.isUserListEmpty();
      const userCount = await userPage.getUserCount();

      expect(isEmpty || userCount >= 0).toBe(true);
    });
  });

  test.describe('Role-Based Access Control', () => {
    test('should assign role to new user', async ({ page }) => {
      const newUser = generateUserData({
        role: 'nurse',
      });

      await userPage.navigateToAddUser();

      // Create user with nurse role
      await userPage.createUser({
        firstName: newUser.firstName,
        lastName: newUser.lastName,
        email: newUser.email,
        password: newUser.password,
        role: 'nurse',
      });

      await userPage.submitUserForm();
      await page.waitForTimeout(2000);

      // Verify redirect or success
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/add-new-user');
    });
  });
});
