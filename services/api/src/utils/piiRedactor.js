/**
 * PII Redaction Utility
 *
 * SECURITY: TICKET #005 - Prevent PHI/PII leakage in logs and error messages
 * HIPAA: §164.514(b) - De-identification of Protected Health Information
 *
 * Redacts sensitive information from strings:
 * - Social Security Numbers (SSN)
 * - Phone numbers
 * - Email addresses
 * - Names (basic pattern matching)
 * - Medical Record Numbers (MRN)
 * - Credit card numbers
 * - IP addresses (optional)
 */

/**
 * Redact Social Security Numbers
 * Patterns: 123-45-6789, 123456789
 */
function redactSSN(text) {
  if (!text) return text;

  return text
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, 'XXX-XX-XXXX') // With dashes
    .replace(/\b\d{9}\b/g, 'XXXXXXXXX'); // Without dashes
}

/**
 * Redact phone numbers
 * Patterns: (123) 456-7890, 123-456-7890, 1234567890, +1 123 456 7890
 */
function redactPhone(text) {
  if (!text) return text;

  return text
    .replace(/\b\(\d{3}\)\s*\d{3}-\d{4}\b/g, '(XXX) XXX-XXXX') // (123) 456-7890
    .replace(/\b\d{3}-\d{3}-\d{4}\b/g, 'XXX-XXX-XXXX') // 123-456-7890
    .replace(/\b\d{10}\b/g, 'XXXXXXXXXX') // 1234567890
    .replace(/\+\d{1,3}\s*\d{3}\s*\d{3}\s*\d{4}/g, '+X XXX XXX XXXX'); // +1 123 456 7890
}

/**
 * Redact email addresses
 */
function redactEmail(text) {
  if (!text) return text;

  return text.replace(/\b[\w\.-]+@[\w\.-]+\.\w+\b/g, '[REDACTED_EMAIL]');
}

/**
 * Redact names (basic pattern - may have false positives)
 * Matches capitalized words that look like names
 */
function redactNames(text) {
  if (!text) return text;

  // Match "First Last" patterns (two capitalized words)
  return text.replace(/\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}\b/g, '[REDACTED_NAME]');
}

/**
 * Redact Medical Record Numbers
 * Patterns: MRN-123456, MRN123456, various formats
 */
function redactMRN(text) {
  if (!text) return text;

  return text
    .replace(/\bMRN[-:]?\s*\d+\b/gi, 'MRN-XXXXXX')
    .replace(/\bmedical\s+record\s+number[-:]?\s*\d+\b/gi, 'Medical Record Number: XXXXXX');
}

/**
 * Redact credit card numbers
 * Patterns: 1234-5678-9012-3456, 1234567890123456
 */
function redactCreditCard(text) {
  if (!text) return text;

  return text
    .replace(/\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, 'XXXX-XXXX-XXXX-XXXX')
    .replace(/\b\d{16}\b/g, 'XXXXXXXXXXXXXXXX');
}

/**
 * Redact IP addresses
 */
function redactIPAddress(text) {
  if (!text) return text;

  return text.replace(/\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/g, 'XXX.XXX.XXX.XXX');
}

/**
 * Redact dates of birth
 * Patterns: 01/15/1980, 1980-01-15, etc.
 */
function redactDOB(text) {
  if (!text) return text;

  return text
    .replace(/\b\d{2}\/\d{2}\/\d{4}\b/g, 'XX/XX/XXXX') // MM/DD/YYYY
    .replace(/\b\d{4}-\d{2}-\d{2}\b/g, 'XXXX-XX-XX') // YYYY-MM-DD
    .replace(/\b(date\s+of\s+birth|dob|birthdate):\s*[\d\/\-]+\b/gi, 'Date of Birth: REDACTED');
}

/**
 * Redact database connection strings
 */
function redactConnectionString(text) {
  if (!text) return text;

  return text
    .replace(/postgresql:\/\/[^:]+:[^@]+@[^\s]+/g, 'postgresql://[REDACTED]:[REDACTED]@[REDACTED]')
    .replace(/mysql:\/\/[^:]+:[^@]+@[^\s]+/g, 'mysql://[REDACTED]:[REDACTED]@[REDACTED]')
    .replace(/mongodb(\+srv)?:\/\/[^:]+:[^@]+@[^\s]+/g, 'mongodb://[REDACTED]:[REDACTED]@[REDACTED]');
}

/**
 * Redact SQL queries that might contain PHI
 */
function redactSQL(text) {
  if (!text) return text;

  // Redact values in WHERE clauses
  let redacted = text.replace(
    /(WHERE|AND|OR)\s+\w+\s*=\s*'([^']+)'/gi,
    (match, clause, value) => `${clause} [REDACTED]`
  );

  // Redact INSERT values
  redacted = redacted.replace(
    /VALUES\s*\(([^)]+)\)/gi,
    'VALUES ([REDACTED])'
  );

  return redacted;
}

/**
 * Redact common password patterns from error messages
 */
function redactPasswords(text) {
  if (!text) return text;

  return text
    .replace(/password["']?\s*[:=]\s*["']?[^"'\s]+["']?/gi, 'password: [REDACTED]')
    .replace(/token["']?\s*[:=]\s*["']?[^"'\s]+["']?/gi, 'token: [REDACTED]')
    .replace(/secret["']?\s*[:=]\s*["']?[^"'\s]+["']?/gi, 'secret: [REDACTED]');
}

/**
 * Main redaction function - applies all PII redaction patterns
 *
 * @param {string} text - Text to redact
 * @param {Object} options - Redaction options
 * @param {boolean} options.aggressive - Use aggressive redaction (may have false positives)
 * @param {boolean} options.keepIPAddresses - Don't redact IP addresses
 * @returns {string} Redacted text
 */
export function redactPII(text, options = {}) {
  if (!text || typeof text !== 'string') {
    return text;
  }

  const {
    aggressive = false,
    keepIPAddresses = false
  } = options;

  let redacted = text;

  // Always redact these
  redacted = redactSSN(redacted);
  redacted = redactPhone(redacted);
  redacted = redactEmail(redacted);
  redacted = redactMRN(redacted);
  redacted = redactCreditCard(redacted);
  redacted = redactDOB(redacted);
  redacted = redactConnectionString(redacted);
  redacted = redactPasswords(redacted);

  // Optional redactions
  if (!keepIPAddresses) {
    redacted = redactIPAddress(redacted);
  }

  if (aggressive) {
    redacted = redactNames(redacted);
    redacted = redactSQL(redacted);
  }

  return redacted;
}

/**
 * Redact PII from an object (recursively)
 *
 * @param {Object} obj - Object to redact
 * @param {Object} options - Redaction options
 * @returns {Object} Redacted object
 */
export function redactPIIFromObject(obj, options = {}) {
  if (!obj || typeof obj !== 'object') {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(item => redactPIIFromObject(item, options));
  }

  const redacted = {};

  for (const [key, value] of Object.entries(obj)) {
    // Redact sensitive field values completely
    const sensitiveFields = [
      'password', 'ssn', 'social_security_number', 'credit_card',
      'token', 'api_key', 'secret', 'access_token', 'refresh_token'
    ];

    if (sensitiveFields.includes(key.toLowerCase())) {
      redacted[key] = '[REDACTED]';
      continue;
    }

    // Recursively redact objects
    if (typeof value === 'object' && value !== null) {
      redacted[key] = redactPIIFromObject(value, options);
    }
    // Redact strings
    else if (typeof value === 'string') {
      redacted[key] = redactPII(value, options);
    }
    // Keep other types as-is
    else {
      redacted[key] = value;
    }
  }

  return redacted;
}

/**
 * Test if text contains potential PII
 *
 * @param {string} text - Text to check
 * @returns {boolean} True if PII detected
 */
export function containsPII(text) {
  if (!text || typeof text !== 'string') {
    return false;
  }

  const patterns = [
    /\b\d{3}-\d{2}-\d{4}\b/, // SSN
    /\b\d{9}\b/, // SSN without dashes
    /\b[\w\.-]+@[\w\.-]+\.\w+\b/, // Email
    /\b\d{3}-\d{3}-\d{4}\b/, // Phone
    /\b\d{10}\b/, // Phone without dashes
    /\bMRN[-:]?\s*\d+\b/i, // MRN
  ];

  return patterns.some(pattern => pattern.test(text));
}

export default {
  redactPII,
  redactPIIFromObject,
  containsPII,
  redactSSN,
  redactPhone,
  redactEmail,
  redactMRN,
  redactCreditCard,
  redactIPAddress,
  redactDOB
};
