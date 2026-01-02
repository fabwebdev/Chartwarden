import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Authentication Pages
 * Covers Login, Registration, and Logout functionality
 */
export class AuthPage {
  readonly page: Page;

  // Login Page Elements
  readonly loginEmailInput: Locator;
  readonly loginPasswordInput: Locator;
  readonly loginSubmitButton: Locator;
  readonly loginGoogleButton: Locator;
  readonly loginGitHubButton: Locator;
  readonly loginKeepMeSignedInCheckbox: Locator;
  readonly loginRegisterLink: Locator;
  readonly loginErrorAlert: Locator;

  // Register Page Elements
  readonly registerFirstNameInput: Locator;
  readonly registerLastNameInput: Locator;
  readonly registerEmailInput: Locator;
  readonly registerCompanyInput: Locator;
  readonly registerPasswordInput: Locator;
  readonly registerSubmitButton: Locator;
  readonly registerGoogleButton: Locator;
  readonly registerGitHubButton: Locator;
  readonly registerLoginLink: Locator;
  readonly registerErrorAlert: Locator;
  readonly registerPasswordStrengthIndicator: Locator;
  readonly registerPasswordStrengthLabel: Locator;

  // Common Elements
  readonly pageTitle: Locator;
  readonly showPasswordButton: Locator;

  // Form Validation Elements
  readonly emailValidationError: Locator;
  readonly passwordValidationError: Locator;
  readonly firstNameValidationError: Locator;
  readonly lastNameValidationError: Locator;

  constructor(page: Page) {
    this.page = page;

    // Login Page Locators
    this.loginEmailInput = page.locator('input#email-login, input[name="email"][type="email"]').first();
    this.loginPasswordInput = page.locator('input#-password-login, input[name="password"][type="password"]').first();
    this.loginSubmitButton = page.getByRole('button', { name: /login/i }).filter({ hasText: /^Login$/ });
    this.loginGoogleButton = page.getByRole('button', { name: /sign in with google/i });
    this.loginGitHubButton = page.getByRole('button', { name: /sign in with github/i });
    this.loginKeepMeSignedInCheckbox = page.getByRole('checkbox', { name: /keep me sign in/i });
    this.loginRegisterLink = page.getByRole('link', { name: /don't have an account/i });
    this.loginErrorAlert = page.locator('.MuiAlert-root[role="alert"]').first();

    // Register Page Locators
    this.registerFirstNameInput = page.locator('input#firstname-login, input[name="firstname"]');
    this.registerLastNameInput = page.locator('input#lastname-signup, input[name="lastname"]');
    this.registerEmailInput = page.locator('input#email-login[type="email"]').last();
    this.registerCompanyInput = page.locator('input#company-signup, input[name="company"]');
    this.registerPasswordInput = page.locator('input#password-signup, input[name="password"][type="password"]');
    this.registerSubmitButton = page.getByRole('button', { name: /create account/i });
    this.registerGoogleButton = page.getByRole('button', { name: /sign up with google/i });
    this.registerGitHubButton = page.getByRole('button', { name: /sign up with github/i });
    this.registerLoginLink = page.getByRole('link', { name: /already have an account/i });
    this.registerErrorAlert = page.locator('.MuiAlert-root[role="alert"]').first();
    this.registerPasswordStrengthIndicator = page.locator('[class*="bgcolor"]').first();
    this.registerPasswordStrengthLabel = page.locator('text=/Weak|Normal|Good|Strong/i').first();

    // Common Elements
    this.pageTitle = page.locator('h3, h1').first();
    this.showPasswordButton = page.getByRole('button', { name: /toggle password visibility/i });

    // Form Validation Locators
    this.emailValidationError = page.locator('#standard-weight-helper-text-email-login, #helper-text-email-signup').first();
    this.passwordValidationError = page.locator('#standard-weight-helper-text-password-login, #helper-text-password-signup').first();
    this.firstNameValidationError = page.locator('#helper-text-firstname-signup');
    this.lastNameValidationError = page.locator('#helper-text-lastname-signup');
  }

  /**
   * Navigate to the login page
   */
  async navigateToLogin(): Promise<void> {
    await this.page.goto('/login');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to the register page
   */
  async navigateToRegister(): Promise<void> {
    await this.page.goto('/register');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Perform login with email and password
   * @param email - User email address
   * @param password - User password
   * @param keepSignedIn - Whether to check "Keep me signed in" (default: false)
   */
  async login(email: string, password: string, keepSignedIn: boolean = false): Promise<void> {
    await this.loginEmailInput.fill(email);
    await this.loginPasswordInput.fill(password);

    if (keepSignedIn) {
      await this.loginKeepMeSignedInCheckbox.check();
    }

    await this.loginSubmitButton.click();
  }

  /**
   * Perform registration with all required fields
   * @param userData - Object containing user registration data
   */
  async register(userData: {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    company?: string;
  }): Promise<void> {
    await this.registerFirstNameInput.fill(userData.firstName);
    await this.registerLastNameInput.fill(userData.lastName);
    await this.registerEmailInput.fill(userData.email);

    if (userData.company) {
      await this.registerCompanyInput.fill(userData.company);
    }

    await this.registerPasswordInput.fill(userData.password);
    await this.registerSubmitButton.click();
  }

  /**
   * Click Google OAuth button on login page
   */
  async clickGoogleLoginButton(): Promise<void> {
    await this.loginGoogleButton.click();
  }

  /**
   * Click GitHub OAuth button on login page
   */
  async clickGitHubLoginButton(): Promise<void> {
    await this.loginGitHubButton.click();
  }

  /**
   * Click Google OAuth button on register page
   */
  async clickGoogleRegisterButton(): Promise<void> {
    await this.registerGoogleButton.click();
  }

  /**
   * Click GitHub OAuth button on register page
   */
  async clickGitHubRegisterButton(): Promise<void> {
    await this.registerGitHubButton.click();
  }

  /**
   * Toggle password visibility
   */
  async togglePasswordVisibility(): Promise<void> {
    await this.showPasswordButton.click();
  }

  /**
   * Navigate from login to register page via link
   */
  async navigateToRegisterFromLogin(): Promise<void> {
    await this.loginRegisterLink.click();
    await this.page.waitForURL(/.*\/register/);
  }

  /**
   * Navigate from register to login page via link
   */
  async navigateToLoginFromRegister(): Promise<void> {
    await this.registerLoginLink.click();
    await this.page.waitForURL(/.*\/login/);
  }

  /**
   * Get the current error message displayed on login page
   */
  async getLoginErrorMessage(): Promise<string> {
    await this.loginErrorAlert.waitFor({ state: 'visible', timeout: 5000 });
    return await this.loginErrorAlert.textContent() || '';
  }

  /**
   * Get the current error message displayed on register page
   */
  async getRegisterErrorMessage(): Promise<string> {
    await this.registerErrorAlert.waitFor({ state: 'visible', timeout: 5000 });
    return await this.registerErrorAlert.textContent() || '';
  }

  /**
   * Wait for successful login redirect (to dashboard/sample-page)
   */
  async waitForLoginSuccess(): Promise<void> {
    await this.page.waitForURL(/.*\/(sample-page|dashboard)/, { timeout: 10000 });
  }

  /**
   * Wait for successful registration redirect (to login page)
   */
  async waitForRegisterSuccess(): Promise<void> {
    await this.page.waitForURL(/.*\/login/, { timeout: 10000 });
  }

  /**
   * Check if login page is loaded
   */
  async isOnLoginPage(): Promise<boolean> {
    return this.page.url().includes('/login');
  }

  /**
   * Check if register page is loaded
   */
  async isOnRegisterPage(): Promise<boolean> {
    return this.page.url().includes('/register');
  }

  /**
   * Verify login page elements are visible
   */
  async verifyLoginPageElements(): Promise<void> {
    await expect(this.pageTitle).toContainText(/login/i);
    await expect(this.loginEmailInput).toBeVisible();
    await expect(this.loginPasswordInput).toBeVisible();
    await expect(this.loginSubmitButton).toBeVisible();
    await expect(this.loginGoogleButton).toBeVisible();
    await expect(this.loginGitHubButton).toBeVisible();
    await expect(this.loginRegisterLink).toBeVisible();
  }

  /**
   * Verify register page elements are visible
   */
  async verifyRegisterPageElements(): Promise<void> {
    await expect(this.pageTitle).toContainText(/sign up/i);
    await expect(this.registerFirstNameInput).toBeVisible();
    await expect(this.registerLastNameInput).toBeVisible();
    await expect(this.registerEmailInput).toBeVisible();
    await expect(this.registerPasswordInput).toBeVisible();
    await expect(this.registerSubmitButton).toBeVisible();
    await expect(this.registerGoogleButton).toBeVisible();
    await expect(this.registerGitHubButton).toBeVisible();
    await expect(this.registerLoginLink).toBeVisible();
  }

  /**
   * Submit login form without filling fields (for validation testing)
   */
  async submitEmptyLoginForm(): Promise<void> {
    await this.loginSubmitButton.click();
    // Wait for validation to trigger
    await this.page.waitForTimeout(500);
  }

  /**
   * Submit register form without filling fields (for validation testing)
   */
  async submitEmptyRegisterForm(): Promise<void> {
    await this.registerSubmitButton.click();
    // Wait for validation to trigger
    await this.page.waitForTimeout(500);
  }

  /**
   * Get password strength label text (e.g., "Weak", "Strong")
   */
  async getPasswordStrengthLabel(): Promise<string> {
    await this.registerPasswordStrengthLabel.waitFor({ state: 'visible', timeout: 2000 });
    return await this.registerPasswordStrengthLabel.textContent() || '';
  }

  /**
   * Verify email validation error is shown
   */
  async verifyEmailValidationError(expectedMessage?: string): Promise<void> {
    await expect(this.emailValidationError).toBeVisible();
    if (expectedMessage) {
      await expect(this.emailValidationError).toContainText(expectedMessage);
    }
  }

  /**
   * Verify password validation error is shown
   */
  async verifyPasswordValidationError(expectedMessage?: string): Promise<void> {
    await expect(this.passwordValidationError).toBeVisible();
    if (expectedMessage) {
      await expect(this.passwordValidationError).toContainText(expectedMessage);
    }
  }

  /**
   * Verify first name validation error is shown
   */
  async verifyFirstNameValidationError(expectedMessage?: string): Promise<void> {
    await expect(this.firstNameValidationError).toBeVisible();
    if (expectedMessage) {
      await expect(this.firstNameValidationError).toContainText(expectedMessage);
    }
  }

  /**
   * Verify last name validation error is shown
   */
  async verifyLastNameValidationError(expectedMessage?: string): Promise<void> {
    await expect(this.lastNameValidationError).toBeVisible();
    if (expectedMessage) {
      await expect(this.lastNameValidationError).toContainText(expectedMessage);
    }
  }

  /**
   * Verify login error alert is displayed
   */
  async verifyLoginErrorDisplayed(expectedMessage?: string): Promise<void> {
    await expect(this.loginErrorAlert).toBeVisible({ timeout: 5000 });
    if (expectedMessage) {
      await expect(this.loginErrorAlert).toContainText(expectedMessage);
    }
  }

  /**
   * Verify register error alert is displayed
   */
  async verifyRegisterErrorDisplayed(expectedMessage?: string): Promise<void> {
    await expect(this.registerErrorAlert).toBeVisible({ timeout: 5000 });
    if (expectedMessage) {
      await expect(this.registerErrorAlert).toContainText(expectedMessage);
    }
  }

  /**
   * Check if user is authenticated by checking for session cookie
   */
  async isAuthenticated(): Promise<boolean> {
    const cookies = await this.page.context().cookies();
    return cookies.some(cookie => cookie.name.includes('better-auth.session_token'));
  }

  /**
   * Clear all auth cookies (logout)
   */
  async clearAuthCookies(): Promise<void> {
    await this.page.context().clearCookies();
  }

  /**
   * Get all cookies from the current context
   */
  async getCookies(): Promise<any[]> {
    return await this.page.context().cookies();
  }

  /**
   * Check if password field is visible (not masked)
   */
  async isPasswordVisible(): Promise<boolean> {
    const type = await this.loginPasswordInput.getAttribute('type');
    return type === 'text';
  }

  /**
   * Fill only email field on login page
   */
  async fillLoginEmail(email: string): Promise<void> {
    await this.loginEmailInput.fill(email);
  }

  /**
   * Fill only password field on login page
   */
  async fillLoginPassword(password: string): Promise<void> {
    await this.loginPasswordInput.fill(password);
  }

  /**
   * Click the login submit button
   */
  async clickLoginSubmit(): Promise<void> {
    await this.loginSubmitButton.click();
  }

  /**
   * Click the register submit button
   */
  async clickRegisterSubmit(): Promise<void> {
    await this.registerSubmitButton.click();
  }

  /**
   * Wait for navigation to complete after form submission
   */
  async waitForNavigation(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Type password slowly to trigger strength indicator updates
   */
  async typePasswordSlowly(password: string): Promise<void> {
    await this.registerPasswordInput.click();
    for (const char of password) {
      await this.registerPasswordInput.type(char, { delay: 100 });
    }
  }
}
