# Nursing Notes HTML Sanitization Utility

## Overview

This utility provides comprehensive HTML sanitization for nursing clinical notes to prevent XSS (Cross-Site Scripting) attacks while preserving safe rich text formatting. It is designed specifically for healthcare applications handling Protected Health Information (PHI) in compliance with HIPAA requirements.

## Features

- **XSS Prevention**: Removes dangerous HTML tags, attributes, and JavaScript code
- **Rich Text Preservation**: Maintains safe formatting from TipTap editor (bold, italic, lists, headings, etc.)
- **CSS Sanitization**: Filters inline styles to prevent CSS-based attacks
- **HIPAA Compliant**: Ensures secure handling of patient health information
- **Text Analysis**: Provides word count, character count, and reading time estimation
- **Validation**: Validates HTML content for security issues
- **Flexible Options**: Supports various sanitization modes (strip all, max length, etc.)

## Installation

The utility is already included in the nursing notes module. Import the functions you need:

```typescript
import {
  sanitizeHtml,
  validateSafeHtml,
  sanitizeNursingNoteFields,
  getWordCount,
  getCharacterCount,
  getEstimatedReadingTime,
} from '@/views/nursing-notes/utils/sanitize';
```

## Usage

### Basic HTML Sanitization

```typescript
import { sanitizeHtml } from '@/views/nursing-notes/utils/sanitize';

// Sanitize user input from rich text editor
const userInput = '<p>Patient assessment <script>alert("XSS")</script></p>';
const safe = sanitizeHtml(userInput);
// Returns: '<p>Patient assessment </p>'

// Preserve safe formatting
const clinicalNote = '<p>Patient reports <strong>shortness of breath</strong></p>';
const sanitized = sanitizeHtml(clinicalNote);
// Returns: '<p>Patient reports <strong>shortness of breath</strong></p>'
```

### Sanitization Options

```typescript
// Strip all HTML tags and return plain text
const plainText = sanitizeHtml(html, { stripAll: true });

// Limit content length
const truncated = sanitizeHtml(html, { maxLength: 500 });

// Disable data-* attributes
const noDataAttrs = sanitizeHtml(html, { allowDataAttributes: false });

// Allow additional custom tags
const custom = sanitizeHtml(html, {
  additionalAllowedTags: ['article', 'section']
});

// Preserve line breaks when stripping HTML
const text = sanitizeHtml(html, {
  stripAll: true,
  preserveLineBreaks: true
});
```

### Sanitize Complete Nursing Notes

```typescript
import { sanitizeNursingNoteFields } from '@/views/nursing-notes/utils/sanitize';

const note = {
  content: '<p>Patient assessment...</p>',
  subjective: '<p>Patient reports <strong>pain</strong></p>',
  objective: '<p>BP: <strong>140/90</strong></p>',
  assessment: '<p>Hypertension</p>',
  plan: '<ol><li>Start medication</li><li>Follow up in 2 weeks</li></ol>',
  interventions: '<p>Administered medication</p>',
  patientResponse: '<p>Patient tolerated well</p>',
  patientEducation: '<p>Educated on diet</p>',
  communication: '<p>Contacted physician</p>',
};

const sanitizedNote = sanitizeNursingNoteFields(note);
// All HTML fields are now sanitized
```

### Validate HTML Content

```typescript
import { validateSafeHtml } from '@/views/nursing-notes/utils/sanitize';

const html = '<p>Clinical note content</p>';
const validation = validateSafeHtml(html);

if (!validation.isValid) {
  console.error('Validation errors:', validation.errors);
}

if (validation.warnings.length > 0) {
  console.warn('Validation warnings:', validation.warnings);
}
```

### Text Analysis

```typescript
import {
  getWordCount,
  getCharacterCount,
  getEstimatedReadingTime
} from '@/views/nursing-notes/utils/sanitize';

const html = '<p>Clinical documentation content...</p>';

const wordCount = getWordCount(html);
// Returns: number of words (excluding HTML tags)

const charCount = getCharacterCount(html);
// Returns: number of characters (excluding HTML tags)

const readingTime = getEstimatedReadingTime(html);
// Returns: estimated reading time in minutes (based on 200 words/min)
```

## Allowed HTML Tags

The following HTML tags are allowed by default:

### Text Formatting
- `<p>`, `<br>`, `<strong>`, `<em>`, `<u>`, `<s>`, `<code>`, `<mark>`

### Headings
- `<h1>`, `<h2>`, `<h3>`, `<h4>`, `<h5>`, `<h6>`

### Lists
- `<ul>`, `<ol>`, `<li>`

### Quotes and Divisions
- `<blockquote>`, `<pre>`, `<hr>`, `<div>`, `<span>`

### Tables
- `<table>`, `<thead>`, `<tbody>`, `<tfoot>`, `<tr>`, `<th>`, `<td>`, `<caption>`

## Allowed Attributes

- **Generic**: `class`, `style`, `data-*` (when enabled)
- **Text Elements**: `class`, `style`
- **Tables**: `class`, `style`, `colspan`, `rowspan`
- **Highlights**: `class`, `style`, `data-color`

## Allowed CSS Properties

Only the following inline CSS properties are permitted:

- `color`, `background-color`
- `text-align`, `font-weight`, `font-style`, `text-decoration`
- `padding`, `margin`
- `border`, `border-color`, `border-width`, `border-style`

## Security Features

### Blocked Patterns

The sanitizer actively removes:

1. **Script Tags**: `<script>`, `<iframe>`, `<object>`, `<embed>`, `<applet>`
2. **Dangerous Protocols**: `javascript:`, `vbscript:`, `data:text/html`
3. **Event Handlers**: `onclick=`, `onload=`, `onerror=`, etc.
4. **CSS Exploits**: `expression()`, `@import`, `url(javascript:)`
5. **Meta Tags**: `<meta>`, `<link>`, `<style>`

### Attribute Filtering

All HTML attributes are filtered to:
- Allow only whitelisted attributes
- Validate attribute values for dangerous content
- Escape special characters in attribute values

### Style Sanitization

Inline CSS is filtered to:
- Allow only safe CSS properties
- Remove CSS expressions and imports
- Prevent URL-based attacks

## Best Practices

### 1. Always Sanitize Before Storage

```typescript
// GOOD: Sanitize before saving to database
const sanitized = sanitizeHtml(userInput);
await saveNursingNote({ content: sanitized });

// BAD: Store unsanitized input
await saveNursingNote({ content: userInput }); // ❌ Don't do this
```

### 2. Sanitize on Input, Not Output

```typescript
// GOOD: Sanitize when receiving data
const handleSubmit = (data) => {
  const sanitizedData = sanitizeNursingNoteFields(data);
  saveNote(sanitizedData);
};

// LESS IDEAL: Sanitize when displaying (data already in DB)
const display = (note) => {
  return sanitizeHtml(note.content); // Data should already be clean
};
```

### 3. Validate Before Sanitizing

```typescript
// GOOD: Check for issues first
const validation = validateSafeHtml(input);
if (!validation.isValid) {
  // Log security issue for review
  console.error('Potential XSS attempt detected:', validation.errors);
}
const safe = sanitizeHtml(input);
```

### 4. Use Appropriate Options

```typescript
// For display: preserve formatting
const displayHtml = sanitizeHtml(content);

// For search/indexing: strip to plain text
const searchText = sanitizeHtml(content, { stripAll: true });

// For previews: limit length
const preview = sanitizeHtml(content, {
  maxLength: 200,
  stripAll: true
});
```

## Integration with TipTap Editor

The sanitizer is designed to work seamlessly with the TipTap rich text editor:

```typescript
import RichTextEditor from '@/components/@extended/RichTextEditor';
import { sanitizeHtml } from '@/views/nursing-notes/utils/sanitize';

const [content, setContent] = useState('');

const handleEditorChange = (html: string) => {
  // Sanitize on change (optional - can also sanitize on submit)
  const safe = sanitizeHtml(html);
  setContent(safe);
};

return (
  <RichTextEditor
    value={content}
    onChange={handleEditorChange}
    placeholder="Enter clinical documentation..."
  />
);
```

## Testing

Run the validation script to test the sanitization utility:

```bash
# From apps/web directory
npx tsx src/views/nursing-notes/utils/__tests__/validate-sanitize.ts
```

All tests should pass, validating:
- XSS attack prevention
- Safe HTML preservation
- CSS injection prevention
- Text analysis functions
- Clinical documentation scenarios
- Edge cases

## Performance Considerations

- **Lightweight**: No external dependencies (DOMPurify-free)
- **Fast**: Regex-based parsing for common cases
- **Cached**: Consider caching sanitized content for repeated access
- **Async-ready**: Can be wrapped in async operations for large content

```typescript
// For large content, consider debouncing
import { debounce } from 'lodash';

const debouncedSanitize = debounce((html: string) => {
  return sanitizeHtml(html);
}, 300);
```

## HIPAA Compliance Notes

This sanitizer helps maintain HIPAA compliance by:

1. **Preventing Script Injection**: Protects against malicious code that could exfiltrate PHI
2. **Audit Trail Safe**: Sanitized content is safe for logging and audit trails
3. **No Data Leakage**: Removes potential vectors for data exfiltration (external URLs, scripts)
4. **Secure Storage**: Ensures only safe HTML is stored in the database

**Important**: While this utility provides XSS protection, HIPAA compliance requires additional measures:
- Encryption at rest and in transit (handled at infrastructure level)
- Access controls and authentication (handled by auth system)
- Audit logging (handled by application logging)
- Business Associate Agreements with vendors

## Troubleshooting

### Content Being Over-Sanitized?

If legitimate content is being removed:

1. Check if the HTML tag is in the allowed list
2. Use `additionalAllowedTags` option to add custom tags
3. Verify CSS properties are in the allowed styles list

### Content Not Being Sanitized?

If dangerous content is getting through:

1. Run `validateSafeHtml()` to identify the issue
2. Check the `DANGEROUS_PATTERNS` array in the source code
3. Report the issue for security review

### Performance Issues?

For large notes:

1. Consider sanitizing once on submit, not on every keystroke
2. Use debouncing for real-time sanitization
3. Cache sanitized results when possible

## License

This utility is part of the Chartwarden application and is subject to the same license terms.

## Support

For issues or questions:
- File an issue in the project repository
- Contact the development team
- Review the test cases for usage examples
