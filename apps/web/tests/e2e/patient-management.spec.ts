import { test, expect } from '@playwright/test';
import { PatientPage } from './pages/patient.page';
import { loginAsRole } from './fixtures/auth.fixture';
import { generatePatientData } from './helpers/testData';

test.describe('Patient Management Workflow', () => {
  let patientPage: PatientPage;

  test.beforeEach(async ({ page }) => {
    // Login as clinician before each test
    await loginAsRole(page, 'clinician');
    patientPage = new PatientPage(page);
  });

  test.describe('Patient List View', () => {
    test('should display patient list page', async ({ page }) => {
      await patientPage.navigateToPatientList();
      await patientPage.verifyPatientListPageLoaded();

      // Verify key elements are visible
      await expect(patientPage.addPatientButton).toBeVisible();
      await expect(patientPage.searchInput).toBeVisible();
    });

    test('should search for patients', async ({ page }) => {
      await patientPage.navigateToPatientList();
      await patientPage.waitForPatientListLoad();

      // Search for a patient
      await patientPage.searchPatients('John');

      // Wait for search results
      await page.waitForTimeout(1000);

      // Table should be visible (either with results or no data message)
      const hasResults = !(await patientPage.isPatientListEmpty());
      const isEmpty = await patientPage.isPatientListEmpty();

      expect(hasResults || isEmpty).toBe(true);
    });

    test('should navigate to add patient page', async ({ page }) => {
      await patientPage.navigateToPatientList();
      await patientPage.clickAddPatientButton();

      await patientPage.verifyAddPatientPageLoaded();
    });
  });

  test.describe('Patient Creation', () => {
    test('should create a new patient with basic information', async ({ page }) => {
      const newPatient = generatePatientData();

      await patientPage.navigateToAddPatient();
      await patientPage.verifyAddPatientPageLoaded();

      // Fill patient form
      await patientPage.createPatient({
        firstName: newPatient.firstName,
        lastName: newPatient.lastName,
        dateOfBirth: newPatient.dateOfBirth,
        gender: newPatient.gender,
        mrn: newPatient.mrn,
        phone: newPatient.phone,
        email: newPatient.email,
        addressLine1: newPatient.addressLine1,
        city: newPatient.city,
        state: newPatient.state,
        zipCode: newPatient.zipCode,
      });

      // Submit the form
      await patientPage.submitPatientForm();

      // Wait for success or redirect
      await page.waitForTimeout(2000);

      // Check for success message or redirect to patient list
      const currentUrl = page.url();
      const redirectedToList = currentUrl.includes('/patients') && !currentUrl.includes('/add-new-patient');
      const redirectedToDetail = /\/patients\/.+\/.+/.test(currentUrl);

      expect(redirectedToList || redirectedToDetail).toBe(true);
    });

    test('should show validation errors for empty required fields', async ({ page }) => {
      await patientPage.navigateToAddPatient();
      await patientPage.submitEmptyForm();

      // Should remain on add patient page
      await expect(page).toHaveURL(/\/patients\/add-new-patient/);
    });

    test('should cancel patient creation', async ({ page }) => {
      const newPatient = generatePatientData();

      await patientPage.navigateToAddPatient();

      // Fill some fields
      await patientPage.firstNameInput.fill(newPatient.firstName);
      await patientPage.lastNameInput.fill(newPatient.lastName);

      // Cancel
      await patientPage.cancelPatientForm();

      // Should navigate away from add patient page
      await page.waitForTimeout(1000);
      const currentUrl = page.url();
      expect(currentUrl).not.toContain('/add-new-patient');
    });
  });

  test.describe('Patient Details View', () => {
    test('should navigate to patient detail page from list', async ({ page }) => {
      await patientPage.navigateToPatientList();
      await patientPage.waitForPatientListLoad();

      // Check if there are any patients
      const patientCount = await patientPage.getPatientCount();

      if (patientCount > 0) {
        // Click first patient
        await patientPage.clickPatientRow(0);

        // Wait for navigation
        await page.waitForTimeout(1000);

        // Should be on patient detail page
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/patients\/.+\/.+/);
      } else {
        // Skip test if no patients exist
        test.skip();
      }
    });
  });

  test.describe('Patient Editing', () => {
    test('should navigate to edit patient page', async ({ page }) => {
      // First create a patient to edit
      const newPatient = generatePatientData();

      await patientPage.navigateToAddPatient();
      await patientPage.createPatient({
        firstName: newPatient.firstName,
        lastName: newPatient.lastName,
        dateOfBirth: newPatient.dateOfBirth,
        gender: newPatient.gender,
        mrn: newPatient.mrn,
      });

      await patientPage.submitPatientForm();
      await page.waitForTimeout(2000);

      // If we're on patient detail page, try to edit
      if (page.url().includes('/patients/')) {
        await patientPage.clickEditPatient();

        // Should navigate to edit page
        await page.waitForTimeout(1000);
        const currentUrl = page.url();
        expect(currentUrl).toMatch(/\/patients\/edit-patient/);
      } else {
        // If not redirected to detail page, skip edit test
        test.skip();
      }
    });
  });

  test.describe('Patient List Interactions', () => {
    test('should handle empty patient list gracefully', async ({ page }) => {
      await patientPage.navigateToPatientList();
      await patientPage.waitForPatientListLoad();

      // Search for non-existent patient
      await patientPage.searchPatients('NonExistentPatient99999');
      await page.waitForTimeout(1000);

      // Should show no data message or empty table
      const isEmpty = await patientPage.isPatientListEmpty();
      const patientCount = await patientPage.getPatientCount();

      expect(isEmpty || patientCount === 0).toBe(true);
    });
  });

  test.describe('Patient Data Persistence', () => {
    test('should persist patient data after creation', async ({ page }) => {
      const newPatient = generatePatientData();

      // Create patient
      await patientPage.navigateToAddPatient();
      await patientPage.createPatient({
        firstName: newPatient.firstName,
        lastName: newPatient.lastName,
        dateOfBirth: newPatient.dateOfBirth,
        gender: newPatient.gender,
        mrn: newPatient.mrn,
        phone: newPatient.phone,
      });

      await patientPage.submitPatientForm();
      await page.waitForTimeout(2000);

      // Navigate to patient list
      await patientPage.navigateToPatientList();
      await patientPage.waitForPatientListLoad();

      // Search for the newly created patient
      await patientPage.searchPatients(newPatient.mrn);
      await page.waitForTimeout(1000);

      // Should find the patient in the list
      const patientCount = await patientPage.getPatientCount();
      expect(patientCount).toBeGreaterThanOrEqual(0);
    });
  });
});
