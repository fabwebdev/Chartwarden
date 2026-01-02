import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for User Management Pages
 * Covers User List, Add User, Edit User, and User Detail functionality
 */
export class UserPage {
  readonly page: Page;

  // User List Page Elements
  readonly addUserButton: Locator;
  readonly searchInput: Locator;
  readonly userTable: Locator;
  readonly userTableRows: Locator;
  readonly noDataMessage: Locator;
  readonly filterButton: Locator;
  readonly exportButton: Locator;
  readonly paginationNextButton: Locator;
  readonly paginationPreviousButton: Locator;
  readonly filterByRoleSelect: Locator;
  readonly filterByStatusSelect: Locator;

  // Add/Edit User Form Elements
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly emailInput: Locator;
  readonly usernameInput: Locator;
  readonly passwordInput: Locator;
  readonly confirmPasswordInput: Locator;
  readonly phoneInput: Locator;
  readonly roleSelect: Locator;
  readonly departmentSelect: Locator;
  readonly jobTitleInput: Locator;
  readonly npiInput: Locator;
  readonly licenseNumberInput: Locator;
  readonly statusSelect: Locator;
  readonly activeCheckbox: Locator;
  readonly sendWelcomeEmailCheckbox: Locator;
  readonly saveUserButton: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;

  // User Detail Page Elements
  readonly userNameHeading: Locator;
  readonly userEmail: Locator;
  readonly userRole: Locator;
  readonly userStatus: Locator;
  readonly userPhone: Locator;
  readonly userDepartment: Locator;
  readonly editUserButton: Locator;
  readonly deleteUserButton: Locator;
  readonly deactivateUserButton: Locator;
  readonly activateUserButton: Locator;
  readonly resetPasswordButton: Locator;
  readonly userInfoTab: Locator;
  readonly permissionsTab: Locator;
  readonly activityTab: Locator;
  readonly auditLogTab: Locator;

  // Role and Permission Elements
  readonly roleCheckboxes: Locator;
  readonly permissionCheckboxes: Locator;
  readonly selectAllPermissionsCheckbox: Locator;
  readonly permissionGroupExpanders: Locator;

  // Validation and Feedback Elements
  readonly successAlert: Locator;
  readonly errorAlert: Locator;
  readonly validationError: Locator;
  readonly confirmDialog: Locator;
  readonly confirmDialogYesButton: Locator;
  readonly confirmDialogNoButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // User List Locators
    this.addUserButton = page.getByRole('button', { name: /add user|new user|create user/i });
    this.searchInput = page.getByPlaceholder(/search|find user/i);
    this.userTable = page.locator('table, [role="table"], .MuiDataGrid-root').first();
    this.userTableRows = page.locator('tbody tr, [role="row"]');
    this.noDataMessage = page.getByText(/no users found|no data|no records/i);
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.paginationNextButton = page.getByRole('button', { name: /next/i });
    this.paginationPreviousButton = page.getByRole('button', { name: /previous|prev/i });
    this.filterByRoleSelect = page.locator('select[name*="role"], [id*="role-filter"]').first();
    this.filterByStatusSelect = page.locator('select[name*="status"], [id*="status-filter"]').first();

    // Add/Edit User Form Locators
    this.firstNameInput = page.locator('input[name="firstName"], input[id*="firstName"]').first();
    this.lastNameInput = page.locator('input[name="lastName"], input[id*="lastName"]').first();
    this.emailInput = page.locator('input[name="email"][type="email"]').first();
    this.usernameInput = page.locator('input[name="username"]').first();
    this.passwordInput = page.locator('input[name="password"][type="password"]').first();
    this.confirmPasswordInput = page.locator('input[name="confirmPassword"], input[name="password_confirmation"]').first();
    this.phoneInput = page.locator('input[name="phone"], input[type="tel"]').first();
    this.roleSelect = page.locator('select[name="role"], [role="combobox"][name*="role"]').first();
    this.departmentSelect = page.locator('select[name="department"], [role="combobox"][name*="department"]').first();
    this.jobTitleInput = page.locator('input[name="jobTitle"], input[name="title"]').first();
    this.npiInput = page.locator('input[name="npi"]').first();
    this.licenseNumberInput = page.locator('input[name="licenseNumber"], input[name="license"]').first();
    this.statusSelect = page.locator('select[name="status"]').first();
    this.activeCheckbox = page.locator('input[name="active"][type="checkbox"], input[name="isActive"]').first();
    this.sendWelcomeEmailCheckbox = page.locator('input[name="sendWelcomeEmail"][type="checkbox"]').first();
    this.saveUserButton = page.getByRole('button', { name: /save|submit|create|update/i }).first();
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.submitButton = page.getByRole('button', { name: /submit/i });

    // User Detail Locators
    this.userNameHeading = page.locator('h1, h2, h3').filter({ hasText: /user|profile|staff/i }).first();
    this.userEmail = page.locator('[data-testid="user-email"], .user-email, #email').first();
    this.userRole = page.locator('[data-testid="user-role"], .user-role, #role').first();
    this.userStatus = page.locator('[data-testid="user-status"], .user-status, #status').first();
    this.userPhone = page.locator('[data-testid="user-phone"], .user-phone, #phone').first();
    this.userDepartment = page.locator('[data-testid="user-department"], .user-department, #department').first();
    this.editUserButton = page.getByRole('button', { name: /edit|modify/i }).first();
    this.deleteUserButton = page.getByRole('button', { name: /delete|remove/i }).first();
    this.deactivateUserButton = page.getByRole('button', { name: /deactivate/i });
    this.activateUserButton = page.getByRole('button', { name: /activate/i });
    this.resetPasswordButton = page.getByRole('button', { name: /reset password/i });
    this.userInfoTab = page.getByRole('tab', { name: /info|details|overview/i });
    this.permissionsTab = page.getByRole('tab', { name: /permission|access/i });
    this.activityTab = page.getByRole('tab', { name: /activity/i });
    this.auditLogTab = page.getByRole('tab', { name: /audit|log/i });

    // Role and Permission Locators
    this.roleCheckboxes = page.locator('input[type="checkbox"][name*="role"]');
    this.permissionCheckboxes = page.locator('input[type="checkbox"][name*="permission"]');
    this.selectAllPermissionsCheckbox = page.getByRole('checkbox', { name: /select all/i });
    this.permissionGroupExpanders = page.locator('[role="button"][aria-expanded]');

    // Validation and Feedback Locators
    this.successAlert = page.locator('.MuiAlert-root.MuiAlert-filledSuccess, [role="alert"].success, .alert-success').first();
    this.errorAlert = page.locator('.MuiAlert-root.MuiAlert-filledError, [role="alert"].error, .alert-error').first();
    this.validationError = page.locator('.MuiFormHelperText-root.Mui-error, .error-text, .field-error').first();
    this.confirmDialog = page.locator('[role="dialog"], .MuiDialog-root').first();
    this.confirmDialogYesButton = page.getByRole('button', { name: /yes|confirm|ok|delete/i }).last();
    this.confirmDialogNoButton = page.getByRole('button', { name: /no|cancel/i }).last();
  }

  /**
   * Navigate to the user list page
   */
  async navigateToUserList(): Promise<void> {
    await this.page.goto('/users');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to admin user management page
   */
  async navigateToAdminUserManagement(): Promise<void> {
    await this.page.goto('/admin/user-management');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to add new user page
   */
  async navigateToAddUser(): Promise<void> {
    await this.page.goto('/users/add-new-user');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to edit user page
   * @param userId - User ID to edit
   */
  async navigateToEditUser(userId: string): Promise<void> {
    await this.page.goto(`/users/edit-user/${userId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to user detail page
   * @param userId - User ID to view
   */
  async navigateToUserDetail(userId: string): Promise<void> {
    await this.page.goto(`/users/${userId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click add user button from list page
   */
  async clickAddUserButton(): Promise<void> {
    await this.addUserButton.click();
    await this.page.waitForURL(/.*\/users\/add-new-user/);
  }

  /**
   * Search for users by name or email
   * @param searchTerm - Search term (name, email, etc.)
   */
  async searchUsers(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Wait for debounced search
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Filter users by role
   * @param role - Role to filter by
   */
  async filterByRole(role: string): Promise<void> {
    await this.filterByRoleSelect.selectOption(role);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Filter users by status
   * @param status - Status to filter by (active, inactive)
   */
  async filterByStatus(status: string): Promise<void> {
    await this.filterByStatusSelect.selectOption(status);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Create a new user with basic information
   * @param userData - User data object
   */
  async createUser(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password?: string;
    role: string;
    phone?: string;
    department?: string;
    jobTitle?: string;
    active?: boolean;
    sendWelcomeEmail?: boolean;
  }): Promise<void> {
    await this.firstNameInput.fill(userData.firstName);
    await this.lastNameInput.fill(userData.lastName);
    await this.emailInput.fill(userData.email);

    if (userData.password) {
      await this.passwordInput.fill(userData.password);
      await this.confirmPasswordInput.fill(userData.password);
    }

    await this.roleSelect.selectOption(userData.role);

    if (userData.phone) {
      await this.phoneInput.fill(userData.phone);
    }

    if (userData.department) {
      await this.departmentSelect.selectOption(userData.department);
    }

    if (userData.jobTitle) {
      await this.jobTitleInput.fill(userData.jobTitle);
    }

    if (userData.active !== undefined) {
      if (userData.active) {
        await this.activeCheckbox.check();
      } else {
        await this.activeCheckbox.uncheck();
      }
    }

    if (userData.sendWelcomeEmail) {
      await this.sendWelcomeEmailCheckbox.check();
    }
  }

  /**
   * Submit user form (create or update)
   */
  async submitUserForm(): Promise<void> {
    await this.saveUserButton.click();
  }

  /**
   * Cancel user form
   */
  async cancelUserForm(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Assign a role to a user
   * @param roleName - Role name to assign
   */
  async assignRole(roleName: string): Promise<void> {
    await this.roleSelect.selectOption(roleName);
  }

  /**
   * Assign permissions to a user
   * @param permissions - Array of permission names
   */
  async assignPermissions(permissions: string[]): Promise<void> {
    for (const permission of permissions) {
      const checkbox = this.page.locator(`input[type="checkbox"][name*="permission"][value="${permission}"]`);
      await checkbox.check();
    }
  }

  /**
   * Select all permissions
   */
  async selectAllPermissions(): Promise<void> {
    await this.selectAllPermissionsCheckbox.check();
  }

  /**
   * Deselect all permissions
   */
  async deselectAllPermissions(): Promise<void> {
    await this.selectAllPermissionsCheckbox.uncheck();
  }

  /**
   * Click edit button on user detail page
   */
  async clickEditUser(): Promise<void> {
    await this.editUserButton.click();
    await this.page.waitForURL(/.*\/users\/edit-user/);
  }

  /**
   * Click delete button and confirm deletion
   */
  async deleteUser(confirm: boolean = true): Promise<void> {
    await this.deleteUserButton.click();
    await this.confirmDialog.waitFor({ state: 'visible' });

    if (confirm) {
      await this.confirmDialogYesButton.click();
    } else {
      await this.confirmDialogNoButton.click();
    }
  }

  /**
   * Deactivate a user
   */
  async deactivateUser(confirm: boolean = true): Promise<void> {
    await this.deactivateUserButton.click();
    await this.confirmDialog.waitFor({ state: 'visible' });

    if (confirm) {
      await this.confirmDialogYesButton.click();
    } else {
      await this.confirmDialogNoButton.click();
    }
  }

  /**
   * Activate a user
   */
  async activateUser(): Promise<void> {
    await this.activateUserButton.click();
  }

  /**
   * Reset user password
   */
  async resetPassword(): Promise<void> {
    await this.resetPasswordButton.click();
    await this.confirmDialog.waitFor({ state: 'visible' });
    await this.confirmDialogYesButton.click();
  }

  /**
   * Get user count from table
   */
  async getUserCount(): Promise<number> {
    await this.userTableRows.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    return await this.userTableRows.count();
  }

  /**
   * Click on a user row in the table by index
   * @param index - Row index (0-based)
   */
  async clickUserRow(index: number): Promise<void> {
    await this.userTableRows.nth(index).click();
  }

  /**
   * Click on a user row by name
   * @param userName - User name to find and click
   */
  async clickUserByName(userName: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${userName}")`).first();
    await row.click();
  }

  /**
   * Click on a user row by email
   * @param email - User email
   */
  async clickUserByEmail(email: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${email}")`).first();
    await row.click();
  }

  /**
   * Switch to a specific tab on user detail page
   * @param tabName - Tab name (info, permissions, activity, audit)
   */
  async switchToTab(tabName: 'info' | 'permissions' | 'activity' | 'audit'): Promise<void> {
    const tabMap = {
      info: this.userInfoTab,
      permissions: this.permissionsTab,
      activity: this.activityTab,
      audit: this.auditLogTab,
    };

    await tabMap[tabName].click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify user list page is loaded
   */
  async verifyUserListPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*\/users$/);
    await expect(this.addUserButton).toBeVisible();
  }

  /**
   * Verify add user page is loaded
   */
  async verifyAddUserPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*\/users\/add-new-user/);
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
    await expect(this.emailInput).toBeVisible();
    await expect(this.saveUserButton).toBeVisible();
  }

  /**
   * Verify user detail page is loaded
   */
  async verifyUserDetailPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*\/users\/.+/);
    await expect(this.userNameHeading).toBeVisible();
  }

  /**
   * Verify success message is displayed
   * @param expectedMessage - Optional expected message text
   */
  async verifySuccessMessage(expectedMessage?: string): Promise<void> {
    await expect(this.successAlert).toBeVisible({ timeout: 5000 });
    if (expectedMessage) {
      await expect(this.successAlert).toContainText(expectedMessage);
    }
  }

  /**
   * Verify error message is displayed
   * @param expectedMessage - Optional expected message text
   */
  async verifyErrorMessage(expectedMessage?: string): Promise<void> {
    await expect(this.errorAlert).toBeVisible({ timeout: 5000 });
    if (expectedMessage) {
      await expect(this.errorAlert).toContainText(expectedMessage);
    }
  }

  /**
   * Verify user appears in the list
   * @param userName - User name or email to verify
   */
  async verifyUserInList(userName: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${userName}")`);
    await expect(row).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify user details are displayed
   * @param expectedData - Expected user data
   */
  async verifyUserDetails(expectedData: {
    name?: string;
    email?: string;
    role?: string;
    status?: string;
    phone?: string;
  }): Promise<void> {
    if (expectedData.name) {
      await expect(this.userNameHeading).toContainText(expectedData.name);
    }
    if (expectedData.email) {
      await expect(this.userEmail).toContainText(expectedData.email);
    }
    if (expectedData.role) {
      await expect(this.userRole).toContainText(expectedData.role);
    }
    if (expectedData.status) {
      await expect(this.userStatus).toContainText(expectedData.status);
    }
    if (expectedData.phone) {
      await expect(this.userPhone).toContainText(expectedData.phone);
    }
  }

  /**
   * Wait for user list to load
   */
  async waitForUserListLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait for either table rows or no data message
    await Promise.race([
      this.userTableRows.first().waitFor({ state: 'visible', timeout: 5000 }),
      this.noDataMessage.waitFor({ state: 'visible', timeout: 5000 }),
    ]).catch(() => {
      // Ignore timeout - page may be loading
    });
  }

  /**
   * Check if user list is empty
   */
  async isUserListEmpty(): Promise<boolean> {
    try {
      await this.noDataMessage.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get user data from detail page
   */
  async getUserDataFromDetailPage(): Promise<{
    name: string;
    email: string;
    role: string;
    status: string;
  }> {
    return {
      name: await this.userNameHeading.textContent() || '',
      email: await this.userEmail.textContent() || '',
      role: await this.userRole.textContent() || '',
      status: await this.userStatus.textContent() || '',
    };
  }

  /**
   * Submit empty form to trigger validation
   */
  async submitEmptyForm(): Promise<void> {
    await this.saveUserButton.click();
    await this.page.waitForTimeout(500); // Wait for validation
  }

  /**
   * Verify validation error is displayed
   */
  async verifyValidationError(): Promise<void> {
    await expect(this.validationError).toBeVisible();
  }

  /**
   * Verify user has specific role
   * @param roleName - Expected role name
   */
  async verifyUserHasRole(roleName: string): Promise<void> {
    await expect(this.userRole).toContainText(roleName, { ignoreCase: true });
  }

  /**
   * Verify user is active
   */
  async verifyUserIsActive(): Promise<void> {
    await expect(this.userStatus).toContainText(/active/i);
  }

  /**
   * Verify user is inactive
   */
  async verifyUserIsInactive(): Promise<void> {
    await expect(this.userStatus).toContainText(/inactive|deactivated/i);
  }
}
