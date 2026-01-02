// =============================================================================
// HTML Sanitization Utility for Nursing Notes
// =============================================================================
// XSS prevention for rich text content in nursing clinical documentation
// Ensures HIPAA-compliant secure handling of patient health information (PHI)
// =============================================================================

/**
 * Allowed HTML tags for TipTap rich text editor
 * Based on TipTap StarterKit and clinical documentation extensions
 */
const ALLOWED_TAGS = [
  // Text formatting
  'p', 'br', 'strong', 'em', 'u', 's', 'code', 'mark',

  // Headings
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',

  // Lists
  'ul', 'ol', 'li',

  // Quotes and divisions
  'blockquote', 'pre', 'hr', 'div', 'span',

  // Tables (if using table extension)
  'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td', 'caption',
] as const;

/**
 * Allowed HTML attributes and their valid values
 * Restricts attributes to prevent script injection
 */
const ALLOWED_ATTRIBUTES: Record<string, string[] | RegExp[]> = {
  // Generic attributes for styling and alignment
  '*': ['class', 'style', 'data-*'],

  // Text alignment
  'p': ['class', 'style'],
  'h1': ['class', 'style'],
  'h2': ['class', 'style'],
  'h3': ['class', 'style'],
  'h4': ['class', 'style'],
  'h5': ['class', 'style'],
  'h6': ['class', 'style'],
  'div': ['class', 'style'],
  'span': ['class', 'style'],

  // Highlight/color
  'mark': ['class', 'style', 'data-color'],

  // Tables
  'table': ['class', 'style'],
  'tr': ['class', 'style'],
  'th': ['class', 'style', 'colspan', 'rowspan'],
  'td': ['class', 'style', 'colspan', 'rowspan'],
};

/**
 * Allowed CSS properties for inline styles
 * Prevents malicious CSS injection (e.g., expression(), url() with javascript:)
 */
const ALLOWED_STYLES = [
  'color',
  'background-color',
  'text-align',
  'font-weight',
  'font-style',
  'text-decoration',
  'padding',
  'margin',
  'border',
  'border-color',
  'border-width',
  'border-style',
] as const;

/**
 * Dangerous patterns to detect and remove
 * Protects against common XSS attack vectors
 */
const DANGEROUS_PATTERNS = [
  /javascript:/gi,
  /data:text\/html/gi,
  /vbscript:/gi,
  /on\w+\s*=/gi,  // Event handlers like onclick=, onload=, etc.
  /<script[\s\S]*?<\/script>/gi,
  /<iframe[\s\S]*?<\/iframe>/gi,
  /<object[\s\S]*?<\/object>/gi,
  /<embed[\s\S]*?>/gi,
  /<applet[\s\S]*?<\/applet>/gi,
  /<meta[\s\S]*?>/gi,
  /<link[\s\S]*?>/gi,
  /<style[\s\S]*?<\/style>/gi,
  /expression\s*\(/gi,  // CSS expression()
  /import\s*\(/gi,      // CSS @import
] as const;

/**
 * Sanitization options
 */
export interface SanitizeOptions {
  /**
   * Whether to strip all HTML tags and return plain text
   * @default false
   */
  stripAll?: boolean;

  /**
   * Maximum allowed length of the sanitized content
   * @default undefined (no limit)
   */
  maxLength?: number;

  /**
   * Whether to allow custom data-* attributes
   * @default true
   */
  allowDataAttributes?: boolean;

  /**
   * Additional allowed tags beyond the default set
   * @default []
   */
  additionalAllowedTags?: string[];

  /**
   * Whether to preserve line breaks when stripping HTML
   * @default true
   */
  preserveLineBreaks?: boolean;
}

/**
 * Sanitizes HTML content to prevent XSS attacks
 *
 * @param html - Raw HTML string from rich text editor
 * @param options - Sanitization options
 * @returns Sanitized HTML string safe for storage and display
 *
 * @example
 * ```ts
 * const userInput = '<p>Hello <script>alert("XSS")</script></p>';
 * const safe = sanitizeHtml(userInput);
 * // Returns: '<p>Hello </p>'
 * ```
 */
export function sanitizeHtml(html: string, options: SanitizeOptions = {}): string {
  if (!html || typeof html !== 'string') {
    return '';
  }

  const {
    stripAll = false,
    maxLength,
    allowDataAttributes = true,
    additionalAllowedTags = [],
    preserveLineBreaks = true,
  } = options;

  // If stripping all HTML, return plain text
  if (stripAll) {
    return htmlToPlainText(html, { preserveLineBreaks, maxLength });
  }

  // First pass: Remove dangerous patterns
  let sanitized = html;
  for (const pattern of DANGEROUS_PATTERNS) {
    sanitized = sanitized.replace(pattern, '');
  }

  // Second pass: Parse and filter HTML elements
  sanitized = filterHtmlElements(sanitized, allowDataAttributes, additionalAllowedTags);

  // Third pass: Sanitize inline styles
  sanitized = sanitizeInlineStyles(sanitized);

  // Fourth pass: Apply length limit if specified
  if (maxLength && sanitized.length > maxLength) {
    sanitized = sanitized.substring(0, maxLength);
    // Ensure we don't cut off in the middle of a tag
    sanitized = sanitized.replace(/<[^>]*$/, '');
  }

  // Final pass: Trim whitespace
  sanitized = sanitized.trim();

  return sanitized;
}

/**
 * Converts HTML to plain text
 *
 * @param html - HTML string to convert
 * @param options - Conversion options
 * @returns Plain text without HTML tags
 */
function htmlToPlainText(
  html: string,
  options: { preserveLineBreaks?: boolean; maxLength?: number } = {}
): string {
  const { preserveLineBreaks = true, maxLength } = options;

  let text = html;

  if (preserveLineBreaks) {
    // Convert block elements to newlines
    text = text.replace(/<br\s*\/?>/gi, '\n');
    text = text.replace(/<\/p>/gi, '\n');
    text = text.replace(/<\/div>/gi, '\n');
    text = text.replace(/<\/h[1-6]>/gi, '\n');
    text = text.replace(/<\/li>/gi, '\n');
  }

  // Remove all HTML tags
  text = text.replace(/<[^>]*>/g, '');

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Normalize whitespace
  text = text.replace(/\n\s*\n/g, '\n\n'); // Remove excessive newlines
  text = text.replace(/[ \t]+/g, ' '); // Normalize spaces

  // Apply length limit
  if (maxLength && text.length > maxLength) {
    text = text.substring(0, maxLength);
  }

  return text.trim();
}

/**
 * Filters HTML elements to only allow safe tags and attributes
 *
 * @param html - HTML string to filter
 * @param allowDataAttributes - Whether to allow data-* attributes
 * @param additionalAllowedTags - Additional tags to allow
 * @returns Filtered HTML string
 */
function filterHtmlElements(
  html: string,
  allowDataAttributes: boolean,
  additionalAllowedTags: string[]
): string {
  const allowedTagsSet = new Set([...ALLOWED_TAGS, ...additionalAllowedTags]);

  // Create a DOM parser using a template element approach
  // This is a simple implementation - in production, consider using DOMParser
  let filtered = html;

  // Remove disallowed tags (keep content)
  filtered = filtered.replace(/<(\/?)([\w-]+)([^>]*)>/g, (match, slash, tag, attrs) => {
    const tagLower = tag.toLowerCase();

    // If tag is not allowed, remove it but keep content
    if (!allowedTagsSet.has(tagLower as any)) {
      return '';
    }

    // If it's a closing tag, allow it
    if (slash === '/') {
      return `</${tagLower}>`;
    }

    // Filter attributes
    const filteredAttrs = filterAttributes(tagLower, attrs, allowDataAttributes);

    return `<${tagLower}${filteredAttrs}>`;
  });

  return filtered;
}

/**
 * Filters HTML attributes for a given tag
 *
 * @param tag - HTML tag name
 * @param attributes - Attributes string from HTML tag
 * @param allowDataAttributes - Whether to allow data-* attributes
 * @returns Filtered attributes string
 */
function filterAttributes(
  tag: string,
  attributes: string,
  allowDataAttributes: boolean
): string {
  if (!attributes || !attributes.trim()) {
    return '';
  }

  const allowedForTag = ALLOWED_ATTRIBUTES[tag] || [];
  const allowedGlobal = ALLOWED_ATTRIBUTES['*'] || [];
  const allowedAttrs = [...allowedForTag, ...allowedGlobal];

  // Parse attributes (simple regex-based approach)
  const attrPattern = /(\w+(?:-\w+)*)\s*=\s*["']([^"']*)["']/g;
  const matches = [...attributes.matchAll(attrPattern)];

  const filtered: string[] = [];

  for (const [, name, value] of matches) {
    const nameLower = name.toLowerCase();

    // Check if attribute is allowed
    const isAllowed =
      allowedAttrs.includes(nameLower) ||
      (allowDataAttributes && nameLower.startsWith('data-'));

    if (isAllowed && isSafeAttributeValue(value)) {
      filtered.push(`${nameLower}="${escapeHtml(value)}"`);
    }
  }

  return filtered.length > 0 ? ' ' + filtered.join(' ') : '';
}

/**
 * Checks if an attribute value is safe (doesn't contain malicious code)
 *
 * @param value - Attribute value to check
 * @returns True if safe, false otherwise
 */
function isSafeAttributeValue(value: string): boolean {
  if (!value) return true;

  const valueLower = value.toLowerCase();

  // Check for dangerous patterns in attribute values
  return (
    !valueLower.includes('javascript:') &&
    !valueLower.includes('data:text/html') &&
    !valueLower.includes('vbscript:') &&
    !valueLower.match(/on\w+\s*=/i)
  );
}

/**
 * Sanitizes inline CSS styles to prevent CSS-based attacks
 *
 * @param html - HTML string with inline styles
 * @returns HTML with sanitized styles
 */
function sanitizeInlineStyles(html: string): string {
  return html.replace(/style\s*=\s*["']([^"']*)["']/gi, (match, styleContent) => {
    const sanitizedStyle = filterCssProperties(styleContent);
    return sanitizedStyle ? `style="${sanitizedStyle}"` : '';
  });
}

/**
 * Filters CSS properties to only allow safe ones
 *
 * @param styleContent - CSS style string
 * @returns Filtered CSS string
 */
function filterCssProperties(styleContent: string): string {
  if (!styleContent) return '';

  const properties = styleContent.split(';').map(p => p.trim()).filter(Boolean);
  const allowed: string[] = [];

  for (const prop of properties) {
    const [name, value] = prop.split(':').map(s => s?.trim());
    if (!name || !value) continue;

    const nameLower = name.toLowerCase();

    // Check if property is allowed
    if (ALLOWED_STYLES.includes(nameLower as any)) {
      // Check if value is safe (no expressions, imports, etc.)
      const valueLower = value.toLowerCase();
      if (
        !valueLower.includes('expression') &&
        !valueLower.includes('import') &&
        !valueLower.includes('javascript:') &&
        !valueLower.includes('data:')
      ) {
        allowed.push(`${nameLower}: ${value}`);
      }
    }
  }

  return allowed.join('; ');
}

/**
 * Escapes HTML special characters
 *
 * @param text - Text to escape
 * @returns Escaped text
 */
function escapeHtml(text: string): string {
  const map: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#x27;',
    '/': '&#x2F;',
  };

  return text.replace(/[&<>"'/]/g, char => map[char] || char);
}

/**
 * Decodes HTML entities to plain text
 *
 * @param text - Text with HTML entities
 * @returns Decoded text
 */
function decodeHtmlEntities(text: string): string {
  const map: Record<string, string> = {
    '&amp;': '&',
    '&lt;': '<',
    '&gt;': '>',
    '&quot;': '"',
    '&#x27;': "'",
    '&#x2F;': '/',
    '&nbsp;': ' ',
  };

  return text.replace(/&[#\w]+;/g, entity => map[entity] || entity);
}

/**
 * Validates that HTML content is safe for storage
 * Performs additional validation beyond sanitization
 *
 * @param html - HTML content to validate
 * @returns Validation result with any issues found
 */
export function validateSafeHtml(html: string): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!html) {
    return { isValid: true, errors, warnings };
  }

  // Check for dangerous patterns
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(html)) {
      errors.push(`Dangerous pattern detected: ${pattern.source}`);
    }
  }

  // Check for unbalanced tags (basic check)
  const openTags = (html.match(/<([a-z][a-z0-9]*)\b[^>]*>/gi) || []).length;
  const closeTags = (html.match(/<\/([a-z][a-z0-9]*)>/gi) || []).length;
  const selfClosingTags = (html.match(/<[a-z][a-z0-9]*[^>]*\/>/gi) || []).length;

  if (openTags - selfClosingTags !== closeTags) {
    warnings.push('HTML may contain unbalanced tags');
  }

  // Check for excessive nesting (potential DoS)
  const maxNestingLevel = 20;
  let nestingLevel = 0;
  let maxNesting = 0;

  for (const char of html) {
    if (char === '<') {
      nestingLevel++;
      maxNesting = Math.max(maxNesting, nestingLevel);
    } else if (char === '>') {
      nestingLevel--;
    }
  }

  if (maxNesting > maxNestingLevel) {
    warnings.push(`Excessive HTML nesting detected (${maxNesting} levels)`);
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Sanitizes multiple HTML fields from nursing note content
 * Commonly used when sanitizing entire note objects
 *
 * @param fields - Object with HTML fields to sanitize
 * @returns Object with sanitized HTML fields
 *
 * @example
 * ```ts
 * const note = {
 *   content: '<p>Patient assessment...</p>',
 *   subjective: '<p>Patient reports...</p>',
 *   objective: '<p>Vitals: <strong>BP 120/80</strong></p>',
 * };
 * const sanitized = sanitizeNursingNoteFields(note);
 * ```
 */
export function sanitizeNursingNoteFields<T extends Record<string, any>>(
  fields: T,
  htmlFields: (keyof T)[] = [
    'content',
    'subjective',
    'objective',
    'assessment',
    'plan',
    'interventions',
    'patientResponse',
    'patientEducation',
    'communication',
  ]
): T {
  const sanitized = { ...fields };

  for (const field of htmlFields) {
    if (typeof sanitized[field] === 'string') {
      sanitized[field] = sanitizeHtml(sanitized[field] as string) as any;
    }
  }

  return sanitized;
}

/**
 * Calculates word count from HTML content
 * Strips HTML and counts words for documentation metrics
 *
 * @param html - HTML content
 * @returns Word count
 */
export function getWordCount(html: string): number {
  if (!html) return 0;

  const text = htmlToPlainText(html);
  const words = text.match(/\b\w+\b/g);

  return words ? words.length : 0;
}

/**
 * Calculates character count from HTML content (excluding tags)
 *
 * @param html - HTML content
 * @returns Character count
 */
export function getCharacterCount(html: string): number {
  if (!html) return 0;

  const text = htmlToPlainText(html);
  return text.length;
}

/**
 * Estimates reading time for HTML content
 * Based on average reading speed of 200 words per minute
 *
 * @param html - HTML content
 * @returns Estimated reading time in minutes
 */
export function getEstimatedReadingTime(html: string): number {
  const wordCount = getWordCount(html);
  const wordsPerMinute = 200;

  return Math.ceil(wordCount / wordsPerMinute);
}
