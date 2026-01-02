import { Page, expect } from '@playwright/test';

/**
 * Common utility functions for E2E tests
 */

/**
 * Wait for page to be fully loaded with network idle
 * @param page - Playwright Page object
 * @param timeout - Optional timeout in milliseconds
 */
export async function waitForPageLoad(page: Page, timeout: number = 30000): Promise<void> {
  await page.waitForLoadState('networkidle', { timeout });
}

/**
 * Wait for DOM content to be loaded
 * @param page - Playwright Page object
 * @param timeout - Optional timeout in milliseconds
 */
export async function waitForDOMLoad(page: Page, timeout: number = 30000): Promise<void> {
  await page.waitForLoadState('domcontentloaded', { timeout });
}

/**
 * Take a screenshot with a descriptive name
 * @param page - Playwright Page object
 * @param name - Screenshot name
 */
export async function takeScreenshot(page: Page, name: string): Promise<void> {
  await page.screenshot({
    path: `test-results/screenshots/${name}-${Date.now()}.png`,
    fullPage: true,
  });
}

/**
 * Wait for element to be visible and ready for interaction
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @param timeout - Optional timeout in milliseconds
 */
export async function waitForElement(page: Page, selector: string, timeout: number = 10000): Promise<void> {
  await page.waitForSelector(selector, { state: 'visible', timeout });
}

/**
 * Scroll element into view
 * @param page - Playwright Page object
 * @param selector - Element selector
 */
export async function scrollIntoView(page: Page, selector: string): Promise<void> {
  await page.locator(selector).scrollIntoViewIfNeeded();
}

/**
 * Clear input field and fill with new value
 * @param page - Playwright Page object
 * @param selector - Input selector
 * @param value - Value to fill
 */
export async function clearAndFill(page: Page, selector: string, value: string): Promise<void> {
  const input = page.locator(selector);
  await input.clear();
  await input.fill(value);
}

/**
 * Wait for API response
 * @param page - Playwright Page object
 * @param urlPattern - URL pattern to match (string or regex)
 * @param timeout - Optional timeout in milliseconds
 */
export async function waitForAPIResponse(
  page: Page,
  urlPattern: string | RegExp,
  timeout: number = 10000
): Promise<any> {
  const response = await page.waitForResponse(
    (response) => {
      const url = response.url();
      if (typeof urlPattern === 'string') {
        return url.includes(urlPattern);
      }
      return urlPattern.test(url);
    },
    { timeout }
  );
  return response;
}

/**
 * Wait for multiple API responses
 * @param page - Playwright Page object
 * @param urlPatterns - Array of URL patterns to match
 * @param timeout - Optional timeout in milliseconds
 */
export async function waitForMultipleAPIResponses(
  page: Page,
  urlPatterns: (string | RegExp)[],
  timeout: number = 10000
): Promise<any[]> {
  const promises = urlPatterns.map(pattern => waitForAPIResponse(page, pattern, timeout));
  return Promise.all(promises);
}

/**
 * Get element text content
 * @param page - Playwright Page object
 * @param selector - Element selector
 */
export async function getTextContent(page: Page, selector: string): Promise<string> {
  return await page.locator(selector).textContent() || '';
}

/**
 * Check if element exists on page
 * @param page - Playwright Page object
 * @param selector - Element selector
 */
export async function elementExists(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).count() > 0;
}

/**
 * Check if element is visible
 * @param page - Playwright Page object
 * @param selector - Element selector
 */
export async function isElementVisible(page: Page, selector: string): Promise<boolean> {
  try {
    await page.locator(selector).waitFor({ state: 'visible', timeout: 2000 });
    return true;
  } catch {
    return false;
  }
}

/**
 * Wait for element to disappear
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @param timeout - Optional timeout in milliseconds
 */
export async function waitForElementToDisappear(
  page: Page,
  selector: string,
  timeout: number = 10000
): Promise<void> {
  await page.waitForSelector(selector, { state: 'hidden', timeout });
}

/**
 * Click element and wait for navigation
 * @param page - Playwright Page object
 * @param selector - Element selector
 */
export async function clickAndWaitForNavigation(page: Page, selector: string): Promise<void> {
  await Promise.all([
    page.waitForNavigation({ waitUntil: 'networkidle' }),
    page.click(selector),
  ]);
}

/**
 * Fill form fields from object
 * @param page - Playwright Page object
 * @param formData - Object with field names as keys and values to fill
 */
export async function fillForm(page: Page, formData: Record<string, string>): Promise<void> {
  for (const [fieldName, value] of Object.entries(formData)) {
    const input = page.locator(`input[name="${fieldName}"], select[name="${fieldName}"], textarea[name="${fieldName}"]`);
    const tagName = await input.evaluate(el => el.tagName.toLowerCase());

    if (tagName === 'select') {
      await input.selectOption(value);
    } else {
      await input.fill(value);
    }
  }
}

/**
 * Select option from dropdown by label
 * @param page - Playwright Page object
 * @param selector - Select element selector
 * @param label - Option label to select
 */
export async function selectByLabel(page: Page, selector: string, label: string): Promise<void> {
  await page.locator(selector).selectOption({ label });
}

/**
 * Select option from dropdown by value
 * @param page - Playwright Page object
 * @param selector - Select element selector
 * @param value - Option value to select
 */
export async function selectByValue(page: Page, selector: string, value: string): Promise<void> {
  await page.locator(selector).selectOption({ value });
}

/**
 * Get all table row data
 * @param page - Playwright Page object
 * @param tableSelector - Table selector
 */
export async function getTableData(page: Page, tableSelector: string = 'table'): Promise<string[][]> {
  return await page.locator(tableSelector).evaluate((table: HTMLTableElement) => {
    const rows = Array.from(table.querySelectorAll('tbody tr'));
    return rows.map(row => {
      const cells = Array.from(row.querySelectorAll('td'));
      return cells.map(cell => cell.textContent?.trim() || '');
    });
  });
}

/**
 * Get table row count
 * @param page - Playwright Page object
 * @param tableSelector - Table selector
 */
export async function getTableRowCount(page: Page, tableSelector: string = 'table'): Promise<number> {
  return await page.locator(`${tableSelector} tbody tr`).count();
}

/**
 * Click table row by index
 * @param page - Playwright Page object
 * @param index - Row index (0-based)
 * @param tableSelector - Table selector
 */
export async function clickTableRow(page: Page, index: number, tableSelector: string = 'table'): Promise<void> {
  await page.locator(`${tableSelector} tbody tr`).nth(index).click();
}

/**
 * Assert element has text
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @param expectedText - Expected text content
 */
export async function assertElementHasText(page: Page, selector: string, expectedText: string): Promise<void> {
  await expect(page.locator(selector)).toHaveText(expectedText);
}

/**
 * Assert element contains text
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @param expectedText - Expected text to contain
 */
export async function assertElementContainsText(page: Page, selector: string, expectedText: string): Promise<void> {
  await expect(page.locator(selector)).toContainText(expectedText);
}

/**
 * Assert element is visible
 * @param page - Playwright Page object
 * @param selector - Element selector
 */
export async function assertElementVisible(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeVisible();
}

/**
 * Assert element is hidden
 * @param page - Playwright Page object
 * @param selector - Element selector
 */
export async function assertElementHidden(page: Page, selector: string): Promise<void> {
  await expect(page.locator(selector)).toBeHidden();
}

/**
 * Assert URL contains text
 * @param page - Playwright Page object
 * @param expectedText - Expected text in URL
 */
export async function assertURLContains(page: Page, expectedText: string): Promise<void> {
  await expect(page).toHaveURL(new RegExp(expectedText));
}

/**
 * Assert URL matches pattern
 * @param page - Playwright Page object
 * @param pattern - URL pattern (regex)
 */
export async function assertURLMatches(page: Page, pattern: RegExp): Promise<void> {
  await expect(page).toHaveURL(pattern);
}

/**
 * Get current URL
 * @param page - Playwright Page object
 */
export function getCurrentURL(page: Page): string {
  return page.url();
}

/**
 * Reload page
 * @param page - Playwright Page object
 */
export async function reloadPage(page: Page): Promise<void> {
  await page.reload({ waitUntil: 'networkidle' });
}

/**
 * Go back in browser history
 * @param page - Playwright Page object
 */
export async function goBack(page: Page): Promise<void> {
  await page.goBack({ waitUntil: 'networkidle' });
}

/**
 * Go forward in browser history
 * @param page - Playwright Page object
 */
export async function goForward(page: Page): Promise<void> {
  await page.goForward({ waitUntil: 'networkidle' });
}

/**
 * Press keyboard key
 * @param page - Playwright Page object
 * @param key - Key to press (e.g., 'Enter', 'Escape', 'Tab')
 */
export async function pressKey(page: Page, key: string): Promise<void> {
  await page.keyboard.press(key);
}

/**
 * Type text slowly (character by character)
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @param text - Text to type
 * @param delay - Delay between characters in milliseconds
 */
export async function typeSlowly(
  page: Page,
  selector: string,
  text: string,
  delay: number = 100
): Promise<void> {
  const element = page.locator(selector);
  await element.click();
  for (const char of text) {
    await page.keyboard.type(char, { delay });
  }
}

/**
 * Hover over element
 * @param page - Playwright Page object
 * @param selector - Element selector
 */
export async function hover(page: Page, selector: string): Promise<void> {
  await page.locator(selector).hover();
}

/**
 * Double click element
 * @param page - Playwright Page object
 * @param selector - Element selector
 */
export async function doubleClick(page: Page, selector: string): Promise<void> {
  await page.locator(selector).dblclick();
}

/**
 * Right click element
 * @param page - Playwright Page object
 * @param selector - Element selector
 */
export async function rightClick(page: Page, selector: string): Promise<void> {
  await page.locator(selector).click({ button: 'right' });
}

/**
 * Get element attribute value
 * @param page - Playwright Page object
 * @param selector - Element selector
 * @param attribute - Attribute name
 */
export async function getAttributeValue(page: Page, selector: string, attribute: string): Promise<string | null> {
  return await page.locator(selector).getAttribute(attribute);
}

/**
 * Check if checkbox is checked
 * @param page - Playwright Page object
 * @param selector - Checkbox selector
 */
export async function isCheckboxChecked(page: Page, selector: string): Promise<boolean> {
  return await page.locator(selector).isChecked();
}

/**
 * Check checkbox
 * @param page - Playwright Page object
 * @param selector - Checkbox selector
 */
export async function checkCheckbox(page: Page, selector: string): Promise<void> {
  await page.locator(selector).check();
}

/**
 * Uncheck checkbox
 * @param page - Playwright Page object
 * @param selector - Checkbox selector
 */
export async function uncheckCheckbox(page: Page, selector: string): Promise<void> {
  await page.locator(selector).uncheck();
}

/**
 * Upload file
 * @param page - Playwright Page object
 * @param selector - File input selector
 * @param filePath - Path to file to upload
 */
export async function uploadFile(page: Page, selector: string, filePath: string): Promise<void> {
  await page.locator(selector).setInputFiles(filePath);
}

/**
 * Drag and drop element
 * @param page - Playwright Page object
 * @param sourceSelector - Source element selector
 * @param targetSelector - Target element selector
 */
export async function dragAndDrop(page: Page, sourceSelector: string, targetSelector: string): Promise<void> {
  await page.locator(sourceSelector).dragTo(page.locator(targetSelector));
}

/**
 * Wait for specific amount of time
 * @param ms - Milliseconds to wait
 */
export async function wait(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Execute JavaScript in page context
 * @param page - Playwright Page object
 * @param script - JavaScript code to execute
 */
export async function executeScript(page: Page, script: string): Promise<any> {
  return await page.evaluate(script);
}

/**
 * Get local storage item
 * @param page - Playwright Page object
 * @param key - Local storage key
 */
export async function getLocalStorageItem(page: Page, key: string): Promise<string | null> {
  return await page.evaluate((key) => localStorage.getItem(key), key);
}

/**
 * Set local storage item
 * @param page - Playwright Page object
 * @param key - Local storage key
 * @param value - Value to set
 */
export async function setLocalStorageItem(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(
    ({ key, value }) => localStorage.setItem(key, value),
    { key, value }
  );
}

/**
 * Clear local storage
 * @param page - Playwright Page object
 */
export async function clearLocalStorage(page: Page): Promise<void> {
  await page.evaluate(() => localStorage.clear());
}

/**
 * Get session storage item
 * @param page - Playwright Page object
 * @param key - Session storage key
 */
export async function getSessionStorageItem(page: Page, key: string): Promise<string | null> {
  return await page.evaluate((key) => sessionStorage.getItem(key), key);
}

/**
 * Set session storage item
 * @param page - Playwright Page object
 * @param key - Session storage key
 * @param value - Value to set
 */
export async function setSessionStorageItem(page: Page, key: string, value: string): Promise<void> {
  await page.evaluate(
    ({ key, value }) => sessionStorage.setItem(key, value),
    { key, value }
  );
}

/**
 * Clear session storage
 * @param page - Playwright Page object
 */
export async function clearSessionStorage(page: Page): Promise<void> {
  await page.evaluate(() => sessionStorage.clear());
}
