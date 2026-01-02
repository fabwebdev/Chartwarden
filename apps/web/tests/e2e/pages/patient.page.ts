import { Page, Locator, expect } from '@playwright/test';

/**
 * Page Object Model for Patient Management Pages
 * Covers Patient List, Add Patient, Edit Patient, and Patient Detail functionality
 */
export class PatientPage {
  readonly page: Page;

  // Patient List Page Elements
  readonly addPatientButton: Locator;
  readonly searchInput: Locator;
  readonly patientTable: Locator;
  readonly patientTableRows: Locator;
  readonly noDataMessage: Locator;
  readonly filterButton: Locator;
  readonly exportButton: Locator;
  readonly paginationNextButton: Locator;
  readonly paginationPreviousButton: Locator;

  // Add/Edit Patient Form Elements
  readonly firstNameInput: Locator;
  readonly lastNameInput: Locator;
  readonly middleNameInput: Locator;
  readonly dateOfBirthInput: Locator;
  readonly genderSelect: Locator;
  readonly ssnInput: Locator;
  readonly mrnInput: Locator;
  readonly phoneInput: Locator;
  readonly emailInput: Locator;
  readonly addressLine1Input: Locator;
  readonly addressLine2Input: Locator;
  readonly cityInput: Locator;
  readonly stateSelect: Locator;
  readonly zipCodeInput: Locator;
  readonly emergencyContactNameInput: Locator;
  readonly emergencyContactPhoneInput: Locator;
  readonly emergencyContactRelationshipInput: Locator;
  readonly savePatientButton: Locator;
  readonly cancelButton: Locator;
  readonly submitButton: Locator;

  // Patient Detail Page Elements
  readonly patientNameHeading: Locator;
  readonly patientInfoTab: Locator;
  readonly encountersTab: Locator;
  readonly medicationsTab: Locator;
  readonly vitalsTab: Locator;
  readonly notesTab: Locator;
  readonly editPatientButton: Locator;
  readonly deletePatientButton: Locator;
  readonly patientMRN: Locator;
  readonly patientDOB: Locator;
  readonly patientGender: Locator;
  readonly patientPhone: Locator;
  readonly patientAddress: Locator;

  // Validation and Feedback Elements
  readonly successAlert: Locator;
  readonly errorAlert: Locator;
  readonly validationError: Locator;
  readonly confirmDialog: Locator;
  readonly confirmDialogYesButton: Locator;
  readonly confirmDialogNoButton: Locator;

  constructor(page: Page) {
    this.page = page;

    // Patient List Locators
    this.addPatientButton = page.getByRole('button', { name: /add patient|new patient|create patient/i });
    this.searchInput = page.getByPlaceholder(/search|find patient/i);
    this.patientTable = page.locator('table, [role="table"], .MuiDataGrid-root').first();
    this.patientTableRows = page.locator('tbody tr, [role="row"]');
    this.noDataMessage = page.getByText(/no patients found|no data|no records/i);
    this.filterButton = page.getByRole('button', { name: /filter/i });
    this.exportButton = page.getByRole('button', { name: /export/i });
    this.paginationNextButton = page.getByRole('button', { name: /next/i });
    this.paginationPreviousButton = page.getByRole('button', { name: /previous|prev/i });

    // Add/Edit Patient Form Locators
    this.firstNameInput = page.locator('input[name="firstName"], input[id*="firstName"], input[label*="First Name"]').first();
    this.lastNameInput = page.locator('input[name="lastName"], input[id*="lastName"], input[label*="Last Name"]').first();
    this.middleNameInput = page.locator('input[name="middleName"], input[id*="middleName"]').first();
    this.dateOfBirthInput = page.locator('input[name="dateOfBirth"], input[name="dob"], input[type="date"]').first();
    this.genderSelect = page.locator('select[name="gender"], [role="combobox"][name*="gender"]').first();
    this.ssnInput = page.locator('input[name="ssn"], input[name="socialSecurityNumber"]').first();
    this.mrnInput = page.locator('input[name="mrn"], input[name="medicalRecordNumber"]').first();
    this.phoneInput = page.locator('input[name="phone"], input[name="phoneNumber"], input[type="tel"]').first();
    this.emailInput = page.locator('input[name="email"][type="email"]').first();
    this.addressLine1Input = page.locator('input[name="addressLine1"], input[name="address1"], input[name="street"]').first();
    this.addressLine2Input = page.locator('input[name="addressLine2"], input[name="address2"]').first();
    this.cityInput = page.locator('input[name="city"]').first();
    this.stateSelect = page.locator('select[name="state"], [role="combobox"][name*="state"]').first();
    this.zipCodeInput = page.locator('input[name="zipCode"], input[name="zip"], input[name="postalCode"]').first();
    this.emergencyContactNameInput = page.locator('input[name*="emergencyContactName"], input[name*="emergency"][name*="name"]').first();
    this.emergencyContactPhoneInput = page.locator('input[name*="emergencyContactPhone"], input[name*="emergency"][name*="phone"]').first();
    this.emergencyContactRelationshipInput = page.locator('input[name*="emergencyContactRelationship"], select[name*="relationship"]').first();
    this.savePatientButton = page.getByRole('button', { name: /save|submit|create|update/i }).first();
    this.cancelButton = page.getByRole('button', { name: /cancel/i });
    this.submitButton = page.getByRole('button', { name: /submit/i });

    // Patient Detail Locators
    this.patientNameHeading = page.locator('h1, h2, h3').filter({ hasText: /patient|profile/i }).first();
    this.patientInfoTab = page.getByRole('tab', { name: /info|details|overview/i });
    this.encountersTab = page.getByRole('tab', { name: /encounter/i });
    this.medicationsTab = page.getByRole('tab', { name: /medication/i });
    this.vitalsTab = page.getByRole('tab', { name: /vital/i });
    this.notesTab = page.getByRole('tab', { name: /note/i });
    this.editPatientButton = page.getByRole('button', { name: /edit|modify/i }).first();
    this.deletePatientButton = page.getByRole('button', { name: /delete|remove/i }).first();
    this.patientMRN = page.locator('[data-testid="patient-mrn"], .patient-mrn, #mrn').first();
    this.patientDOB = page.locator('[data-testid="patient-dob"], .patient-dob, #dob').first();
    this.patientGender = page.locator('[data-testid="patient-gender"], .patient-gender, #gender').first();
    this.patientPhone = page.locator('[data-testid="patient-phone"], .patient-phone, #phone').first();
    this.patientAddress = page.locator('[data-testid="patient-address"], .patient-address, #address').first();

    // Validation and Feedback Locators
    this.successAlert = page.locator('.MuiAlert-root.MuiAlert-filledSuccess, [role="alert"].success, .alert-success').first();
    this.errorAlert = page.locator('.MuiAlert-root.MuiAlert-filledError, [role="alert"].error, .alert-error').first();
    this.validationError = page.locator('.MuiFormHelperText-root.Mui-error, .error-text, .field-error').first();
    this.confirmDialog = page.locator('[role="dialog"], .MuiDialog-root').first();
    this.confirmDialogYesButton = page.getByRole('button', { name: /yes|confirm|ok|delete/i }).last();
    this.confirmDialogNoButton = page.getByRole('button', { name: /no|cancel/i }).last();
  }

  /**
   * Navigate to the patient list page
   */
  async navigateToPatientList(): Promise<void> {
    await this.page.goto('/patients');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to add new patient page
   */
  async navigateToAddPatient(): Promise<void> {
    await this.page.goto('/patients/add-new-patient');
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to edit patient page
   * @param patientId - Patient ID to edit
   */
  async navigateToEditPatient(patientId: string): Promise<void> {
    await this.page.goto(`/patients/edit-patient/${patientId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Navigate to patient detail page
   * @param patientId - Patient ID to view
   * @param tab - Optional tab to open (default: info)
   */
  async navigateToPatientDetail(patientId: string, tab: string = 'info'): Promise<void> {
    await this.page.goto(`/patients/${tab}/${patientId}`);
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Click add patient button from list page
   */
  async clickAddPatientButton(): Promise<void> {
    await this.addPatientButton.click();
    await this.page.waitForURL(/.*\/patients\/add-new-patient/);
  }

  /**
   * Search for patients by name or MRN
   * @param searchTerm - Search term (name, MRN, etc.)
   */
  async searchPatients(searchTerm: string): Promise<void> {
    await this.searchInput.fill(searchTerm);
    await this.page.waitForTimeout(500); // Wait for debounced search
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Create a new patient with basic information
   * @param patientData - Patient data object
   */
  async createPatient(patientData: {
    firstName: string;
    lastName: string;
    dateOfBirth: string;
    gender?: string;
    mrn?: string;
    phone?: string;
    email?: string;
    addressLine1?: string;
    city?: string;
    state?: string;
    zipCode?: string;
  }): Promise<void> {
    await this.firstNameInput.fill(patientData.firstName);
    await this.lastNameInput.fill(patientData.lastName);
    await this.dateOfBirthInput.fill(patientData.dateOfBirth);

    if (patientData.gender) {
      await this.genderSelect.selectOption(patientData.gender);
    }

    if (patientData.mrn) {
      await this.mrnInput.fill(patientData.mrn);
    }

    if (patientData.phone) {
      await this.phoneInput.fill(patientData.phone);
    }

    if (patientData.email) {
      await this.emailInput.fill(patientData.email);
    }

    if (patientData.addressLine1) {
      await this.addressLine1Input.fill(patientData.addressLine1);
    }

    if (patientData.city) {
      await this.cityInput.fill(patientData.city);
    }

    if (patientData.state) {
      await this.stateSelect.selectOption(patientData.state);
    }

    if (patientData.zipCode) {
      await this.zipCodeInput.fill(patientData.zipCode);
    }
  }

  /**
   * Submit patient form (create or update)
   */
  async submitPatientForm(): Promise<void> {
    await this.savePatientButton.click();
  }

  /**
   * Cancel patient form
   */
  async cancelPatientForm(): Promise<void> {
    await this.cancelButton.click();
  }

  /**
   * Click edit button on patient detail page
   */
  async clickEditPatient(): Promise<void> {
    await this.editPatientButton.click();
    await this.page.waitForURL(/.*\/patients\/edit-patient/);
  }

  /**
   * Click delete button and confirm deletion
   */
  async deletePatient(confirm: boolean = true): Promise<void> {
    await this.deletePatientButton.click();
    await this.confirmDialog.waitFor({ state: 'visible' });

    if (confirm) {
      await this.confirmDialogYesButton.click();
    } else {
      await this.confirmDialogNoButton.click();
    }
  }

  /**
   * Get patient count from table
   */
  async getPatientCount(): Promise<number> {
    await this.patientTableRows.first().waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
    return await this.patientTableRows.count();
  }

  /**
   * Click on a patient row in the table by index
   * @param index - Row index (0-based)
   */
  async clickPatientRow(index: number): Promise<void> {
    await this.patientTableRows.nth(index).click();
  }

  /**
   * Click on a patient row by name
   * @param patientName - Patient name to find and click
   */
  async clickPatientByName(patientName: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${patientName}")`).first();
    await row.click();
  }

  /**
   * Click on a patient row by MRN
   * @param mrn - Medical Record Number
   */
  async clickPatientByMRN(mrn: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${mrn}")`).first();
    await row.click();
  }

  /**
   * Switch to a specific tab on patient detail page
   * @param tabName - Tab name (info, encounters, medications, vitals, notes)
   */
  async switchToTab(tabName: 'info' | 'encounters' | 'medications' | 'vitals' | 'notes'): Promise<void> {
    const tabMap = {
      info: this.patientInfoTab,
      encounters: this.encountersTab,
      medications: this.medicationsTab,
      vitals: this.vitalsTab,
      notes: this.notesTab,
    };

    await tabMap[tabName].click();
    await this.page.waitForLoadState('networkidle');
  }

  /**
   * Verify patient list page is loaded
   */
  async verifyPatientListPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*\/patients$/);
    await expect(this.addPatientButton).toBeVisible();
  }

  /**
   * Verify add patient page is loaded
   */
  async verifyAddPatientPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*\/patients\/add-new-patient/);
    await expect(this.firstNameInput).toBeVisible();
    await expect(this.lastNameInput).toBeVisible();
    await expect(this.savePatientButton).toBeVisible();
  }

  /**
   * Verify patient detail page is loaded
   */
  async verifyPatientDetailPageLoaded(): Promise<void> {
    await expect(this.page).toHaveURL(/.*\/patients\/.+\/.+/);
    await expect(this.patientNameHeading).toBeVisible();
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
   * Verify patient appears in the list
   * @param patientName - Patient name to verify
   */
  async verifyPatientInList(patientName: string): Promise<void> {
    const row = this.page.locator(`tr:has-text("${patientName}")`);
    await expect(row).toBeVisible({ timeout: 5000 });
  }

  /**
   * Verify patient details are displayed
   * @param expectedData - Expected patient data
   */
  async verifyPatientDetails(expectedData: {
    name?: string;
    mrn?: string;
    dob?: string;
    gender?: string;
    phone?: string;
  }): Promise<void> {
    if (expectedData.name) {
      await expect(this.patientNameHeading).toContainText(expectedData.name);
    }
    if (expectedData.mrn) {
      await expect(this.patientMRN).toContainText(expectedData.mrn);
    }
    if (expectedData.dob) {
      await expect(this.patientDOB).toContainText(expectedData.dob);
    }
    if (expectedData.gender) {
      await expect(this.patientGender).toContainText(expectedData.gender);
    }
    if (expectedData.phone) {
      await expect(this.patientPhone).toContainText(expectedData.phone);
    }
  }

  /**
   * Wait for patient list to load
   */
  async waitForPatientListLoad(): Promise<void> {
    await this.page.waitForLoadState('networkidle');
    // Wait for either table rows or no data message
    await Promise.race([
      this.patientTableRows.first().waitFor({ state: 'visible', timeout: 5000 }),
      this.noDataMessage.waitFor({ state: 'visible', timeout: 5000 }),
    ]).catch(() => {
      // Ignore timeout - page may be loading
    });
  }

  /**
   * Check if patient list is empty
   */
  async isPatientListEmpty(): Promise<boolean> {
    try {
      await this.noDataMessage.waitFor({ state: 'visible', timeout: 2000 });
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Get patient data from detail page
   */
  async getPatientDataFromDetailPage(): Promise<{
    name: string;
    mrn: string;
    dob: string;
    gender: string;
  }> {
    return {
      name: await this.patientNameHeading.textContent() || '',
      mrn: await this.patientMRN.textContent() || '',
      dob: await this.patientDOB.textContent() || '',
      gender: await this.patientGender.textContent() || '',
    };
  }

  /**
   * Fill emergency contact information
   */
  async fillEmergencyContact(contactData: {
    name: string;
    phone: string;
    relationship: string;
  }): Promise<void> {
    await this.emergencyContactNameInput.fill(contactData.name);
    await this.emergencyContactPhoneInput.fill(contactData.phone);
    await this.emergencyContactRelationshipInput.fill(contactData.relationship);
  }

  /**
   * Submit empty form to trigger validation
   */
  async submitEmptyForm(): Promise<void> {
    await this.savePatientButton.click();
    await this.page.waitForTimeout(500); // Wait for validation
  }

  /**
   * Verify validation error is displayed
   */
  async verifyValidationError(): Promise<void> {
    await expect(this.validationError).toBeVisible();
  }
}
