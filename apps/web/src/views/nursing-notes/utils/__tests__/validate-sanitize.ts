#!/usr/bin/env ts-node
// =============================================================================
// Sanitization Utility Validation Script
// =============================================================================
// Quick validation script to test XSS prevention functionality
// Run with: npx ts-node validate-sanitize.ts
// =============================================================================

import {
  sanitizeHtml,
  validateSafeHtml,
  sanitizeNursingNoteFields,
  getWordCount,
  getCharacterCount,
  getEstimatedReadingTime,
} from '../sanitize';

// Color codes for terminal output
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const RESET = '\x1b[0m';
const BOLD = '\x1b[1m';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`${GREEN}✓${RESET} ${message}`);
    passCount++;
  } else {
    console.log(`${RED}✗${RESET} ${message}`);
    failCount++;
  }
}

function assertNotContains(str: string, substring: string, message: string) {
  assert(!str.includes(substring), message);
}

function assertContains(str: string, substring: string, message: string) {
  assert(str.includes(substring), message);
}

function assertEquals(actual: any, expected: any, message: string) {
  assert(actual === expected, `${message} (expected: ${expected}, got: ${actual})`);
}

console.log(`\n${BOLD}=== HTML Sanitization Utility Validation ===${RESET}\n`);

// Test 1: Script tag removal
console.log(`${BOLD}Test Group: XSS Attack Prevention${RESET}`);
const xss1 = '<p>Hello <script>alert("XSS")</script> World</p>';
const result1 = sanitizeHtml(xss1);
assertNotContains(result1, '<script>', 'Should remove script tags');
assertNotContains(result1, 'alert', 'Should remove script content');

// Test 2: JavaScript protocol removal
const xss2 = '<a href="javascript:alert(\'XSS\')">Click me</a>';
const result2 = sanitizeHtml(xss2);
assertNotContains(result2, 'javascript:', 'Should remove javascript: protocol');

// Test 3: Event handler removal
const xss3 = '<div onclick="alert(\'XSS\')">Click me</div>';
const result3 = sanitizeHtml(xss3);
assertNotContains(result3, 'onclick', 'Should remove event handlers');

// Test 4: Iframe removal
const xss4 = '<p>Text <iframe src="evil.com"></iframe> More text</p>';
const result4 = sanitizeHtml(xss4);
assertNotContains(result4, 'iframe', 'Should remove iframe tags');

// Test 5: Safe HTML preservation
console.log(`\n${BOLD}Test Group: Safe HTML Preservation${RESET}`);
const safe1 = '<p>Text with <strong>bold</strong> and <em>italic</em></p>';
const result5 = sanitizeHtml(safe1);
assertContains(result5, '<strong>', 'Should preserve strong tags');
assertContains(result5, '<em>', 'Should preserve em tags');

// Test 6: Headings
const safe2 = '<h1>Title</h1><h2>Subtitle</h2>';
const result6 = sanitizeHtml(safe2);
assertContains(result6, '<h1>', 'Should preserve h1 tags');
assertContains(result6, '<h2>', 'Should preserve h2 tags');

// Test 7: Lists
const safe3 = '<ul><li>Item 1</li><li>Item 2</li></ul>';
const result7 = sanitizeHtml(safe3);
assertContains(result7, '<ul>', 'Should preserve ul tags');
assertContains(result7, '<li>', 'Should preserve li tags');

// Test 8: CSS Expression removal
console.log(`\n${BOLD}Test Group: CSS Injection Prevention${RESET}`);
const css1 = '<div style="width: expression(alert(\'XSS\'))">Text</div>';
const result8 = sanitizeHtml(css1);
assertNotContains(result8, 'expression', 'Should remove CSS expressions');

// Test 9: Safe CSS preservation
const css2 = '<p style="color: red; text-align: center;">Text</p>';
const result9 = sanitizeHtml(css2);
assertContains(result9, 'color: red', 'Should preserve safe color styles');
assertContains(result9, 'text-align: center', 'Should preserve safe text-align styles');

// Test 10: Strip all HTML
console.log(`\n${BOLD}Test Group: Options${RESET}`);
const html = '<p>Hello <strong>World</strong></p>';
const result10 = sanitizeHtml(html, { stripAll: true });
assertEquals(result10, 'Hello World', 'Should strip all HTML when stripAll is true');

// Test 11: Max length
const longHtml = '<p>This is a very long text that should be truncated</p>';
const result11 = sanitizeHtml(longHtml, { maxLength: 20 });
assert(result11.length <= 20, 'Should respect maxLength option');

// Test 12: Validate safe HTML
console.log(`\n${BOLD}Test Group: Validation${RESET}`);
const safeHtml = '<p><strong>Safe content</strong></p>';
const validation1 = validateSafeHtml(safeHtml);
assert(validation1.isValid, 'Should validate safe HTML as valid');
assertEquals(validation1.errors.length, 0, 'Should have no errors for safe HTML');

// Test 13: Detect dangerous HTML
const dangerousHtml = '<script>alert("XSS")</script>';
const validation2 = validateSafeHtml(dangerousHtml);
assert(!validation2.isValid, 'Should detect script tags as invalid');
assert(validation2.errors.length > 0, 'Should report errors for dangerous HTML');

// Test 14: Sanitize note fields
console.log(`\n${BOLD}Test Group: Nursing Note Sanitization${RESET}`);
const note = {
  content: '<p>Content <script>alert(1)</script></p>',
  subjective: '<p>Subjective <script>alert(2)</script></p>',
  objective: '<p>Safe objective</p>',
  otherField: 'Not HTML',
};

const sanitizedNote = sanitizeNursingNoteFields(note);
assertNotContains(sanitizedNote.content, '<script>', 'Should sanitize content field');
assertNotContains(sanitizedNote.subjective, '<script>', 'Should sanitize subjective field');
assertContains(sanitizedNote.objective, '<p>', 'Should preserve safe HTML in objective field');
assertEquals(sanitizedNote.otherField, 'Not HTML', 'Should preserve non-HTML fields');

// Test 15: Word count
console.log(`\n${BOLD}Test Group: Text Analysis${RESET}`);
const wordHtml = '<p>One two three four five</p>';
const wordCount = getWordCount(wordHtml);
assertEquals(wordCount, 5, 'Should count words correctly');

// Test 16: Character count
const charHtml = '<p>Hello</p>';
const charCount = getCharacterCount(charHtml);
assertEquals(charCount, 5, 'Should count characters correctly (excluding tags)');

// Test 17: Reading time
const longText = Array(400).fill('word').join(' ');
const timeHtml = `<p>${longText}</p>`;
const readingTime = getEstimatedReadingTime(timeHtml);
assertEquals(readingTime, 2, 'Should estimate reading time correctly (400 words = 2 min)');

// Test 18: SOAP note format preservation
console.log(`\n${BOLD}Test Group: Clinical Documentation${RESET}`);
const soapNote = `
  <h3>Subjective</h3>
  <p>Patient reports <strong>shortness of breath</strong></p>
  <h3>Objective</h3>
  <ul>
    <li>BP: 140/90</li>
    <li>HR: 88 bpm</li>
  </ul>
  <h3>Assessment</h3>
  <p>Possible respiratory infection</p>
  <h3>Plan</h3>
  <ol>
    <li>Order chest X-ray</li>
    <li>Start antibiotics</li>
  </ol>
`;

const soapResult = sanitizeHtml(soapNote);
assertContains(soapResult, '<h3>', 'Should preserve headings in SOAP notes');
assertContains(soapResult, '<strong>', 'Should preserve strong tags in SOAP notes');
assertContains(soapResult, '<ul>', 'Should preserve unordered lists in SOAP notes');
assertContains(soapResult, '<ol>', 'Should preserve ordered lists in SOAP notes');
assertContains(soapResult, '<li>', 'Should preserve list items in SOAP notes');

// Test 19: Empty/null input handling
console.log(`\n${BOLD}Test Group: Edge Cases${RESET}`);
const emptyResult = sanitizeHtml('');
assertEquals(emptyResult, '', 'Should handle empty strings');

const nullResult = sanitizeHtml(null as any);
assertEquals(nullResult, '', 'Should handle null input');

const undefinedResult = sanitizeHtml(undefined as any);
assertEquals(undefinedResult, '', 'Should handle undefined input');

// Test 20: Plain text without HTML
const plainText = 'Plain text without HTML';
const plainResult = sanitizeHtml(plainText);
assertEquals(plainResult, plainText, 'Should handle plain text without HTML');

// Summary
console.log(`\n${BOLD}=== Test Summary ===${RESET}`);
console.log(`${GREEN}Passed: ${passCount}${RESET}`);
console.log(`${RED}Failed: ${failCount}${RESET}`);

if (failCount === 0) {
  console.log(`\n${GREEN}${BOLD}✓ All tests passed!${RESET}\n`);
} else {
  console.log(`\n${RED}${BOLD}✗ Some tests failed!${RESET}\n`);
}
