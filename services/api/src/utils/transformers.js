/**
 * Shared Transformers Module
 *
 * Purpose: Centralized data transformation functions to eliminate code duplication
 * across controllers and services.
 *
 * TICKET #017: Extract Shared Validators and Utilities
 */

/**
 * Normalize boolean fields to database format (0 or 1)
 *
 * Converts various boolean representations to 0 or 1 for storage in bigint columns.
 *
 * @param {Object} data - Data object containing fields to normalize
 * @param {Array<string>} fields - Array of field names to normalize
 * @returns {Object} New object with normalized boolean fields
 *
 * Examples:
 *   normalizeBooleanFields({ active: true }, ['active'])
 *     => { active: 1 }
 *
 *   normalizeBooleanFields({ active: '1', enabled: false }, ['active', 'enabled'])
 *     => { active: 1, enabled: 0 }
 *
 *   normalizeBooleanFields({ active: 'yes' }, ['active'])
 *     => { active: 0 } (only true, 1, '1' are considered true)
 */
export function normalizeBooleanFields(data, fields) {
  const normalized = { ...data };
  const trueValues = [true, 1, '1'];

  fields.forEach(field => {
    if (field in normalized) {
      normalized[field] = trueValues.includes(normalized[field]) ? 1 : 0;
    }
  });

  return normalized;
}

/**
 * Normalize a single boolean value to database format (0 or 1)
 *
 * @param {any} value - Value to normalize
 * @returns {number} 0 or 1
 *
 * Examples:
 *   normalizeBoolean(true) => 1
 *   normalizeBoolean('1') => 1
 *   normalizeBoolean(false) => 0
 *   normalizeBoolean('false') => 0
 */
export function normalizeBoolean(value) {
  const trueValues = [true, 1, '1'];
  return trueValues.includes(value) ? 1 : 0;
}

/**
 * Trim string fields in an object
 *
 * @param {Object} data - Data object
 * @param {Array<string>} fields - Array of field names to trim
 * @returns {Object} New object with trimmed string fields
 *
 * Examples:
 *   trimStringFields({ name: '  John  ', age: 30 }, ['name'])
 *     => { name: 'John', age: 30 }
 */
export function trimStringFields(data, fields) {
  const trimmed = { ...data };

  fields.forEach(field => {
    if (field in trimmed && typeof trimmed[field] === 'string') {
      trimmed[field] = trimmed[field].trim();
    }
  });

  return trimmed;
}

/**
 * Convert string fields to uppercase
 *
 * @param {Object} data - Data object
 * @param {Array<string>} fields - Array of field names to convert
 * @returns {Object} New object with uppercase string fields
 *
 * Examples:
 *   uppercaseFields({ state: 'ca', name: 'John' }, ['state'])
 *     => { state: 'CA', name: 'John' }
 */
export function uppercaseFields(data, fields) {
  const converted = { ...data };

  fields.forEach(field => {
    if (field in converted && typeof converted[field] === 'string') {
      converted[field] = converted[field].toUpperCase();
    }
  });

  return converted;
}

/**
 * Convert string fields to lowercase
 *
 * @param {Object} data - Data object
 * @param {Array<string>} fields - Array of field names to convert
 * @returns {Object} New object with lowercase string fields
 *
 * Examples:
 *   lowercaseFields({ email: 'JOHN@EXAMPLE.COM' }, ['email'])
 *     => { email: 'john@example.com' }
 */
export function lowercaseFields(data, fields) {
  const converted = { ...data };

  fields.forEach(field => {
    if (field in converted && typeof converted[field] === 'string') {
      converted[field] = converted[field].toLowerCase();
    }
  });

  return converted;
}

/**
 * Remove null and undefined values from an object
 *
 * @param {Object} data - Data object
 * @returns {Object} New object without null/undefined values
 *
 * Examples:
 *   removeNullValues({ a: 1, b: null, c: undefined, d: 0 })
 *     => { a: 1, d: 0 }
 */
export function removeNullValues(data) {
  const cleaned = {};

  Object.keys(data).forEach(key => {
    if (data[key] !== null && data[key] !== undefined) {
      cleaned[key] = data[key];
    }
  });

  return cleaned;
}

/**
 * Remove empty string values from an object
 *
 * @param {Object} data - Data object
 * @returns {Object} New object without empty strings
 *
 * Examples:
 *   removeEmptyStrings({ a: 'hello', b: '', c: '  ', d: 0 })
 *     => { a: 'hello', c: '  ', d: 0 }
 */
export function removeEmptyStrings(data) {
  const cleaned = {};

  Object.keys(data).forEach(key => {
    if (data[key] !== '') {
      cleaned[key] = data[key];
    }
  });

  return cleaned;
}

/**
 * Parse JSON string fields safely
 *
 * @param {Object} data - Data object
 * @param {Array<string>} fields - Array of field names to parse
 * @returns {Object} New object with parsed JSON fields
 *
 * Examples:
 *   parseJSONFields({ config: '{"key":"value"}' }, ['config'])
 *     => { config: { key: 'value' } }
 */
export function parseJSONFields(data, fields) {
  const parsed = { ...data };

  fields.forEach(field => {
    if (field in parsed && typeof parsed[field] === 'string') {
      try {
        parsed[field] = JSON.parse(parsed[field]);
      } catch (error) {
        // Leave as-is if parsing fails
      }
    }
  });

  return parsed;
}

/**
 * Stringify object fields to JSON
 *
 * @param {Object} data - Data object
 * @param {Array<string>} fields - Array of field names to stringify
 * @returns {Object} New object with stringified JSON fields
 *
 * Examples:
 *   stringifyJSONFields({ config: { key: 'value' } }, ['config'])
 *     => { config: '{"key":"value"}' }
 */
export function stringifyJSONFields(data, fields) {
  const stringified = { ...data };

  fields.forEach(field => {
    if (field in stringified && typeof stringified[field] === 'object') {
      try {
        stringified[field] = JSON.stringify(stringified[field]);
      } catch (error) {
        // Leave as-is if stringifying fails
      }
    }
  });

  return stringified;
}

/**
 * Pick specific fields from an object
 *
 * @param {Object} data - Data object
 * @param {Array<string>} fields - Array of field names to pick
 * @returns {Object} New object with only specified fields
 *
 * Examples:
 *   pickFields({ a: 1, b: 2, c: 3 }, ['a', 'c'])
 *     => { a: 1, c: 3 }
 */
export function pickFields(data, fields) {
  const picked = {};

  fields.forEach(field => {
    if (field in data) {
      picked[field] = data[field];
    }
  });

  return picked;
}

/**
 * Omit specific fields from an object
 *
 * @param {Object} data - Data object
 * @param {Array<string>} fields - Array of field names to omit
 * @returns {Object} New object without specified fields
 *
 * Examples:
 *   omitFields({ a: 1, b: 2, c: 3 }, ['b'])
 *     => { a: 1, c: 3 }
 */
export function omitFields(data, fields) {
  const omitted = { ...data };

  fields.forEach(field => {
    delete omitted[field];
  });

  return omitted;
}

/**
 * Sanitize data for database insertion/update
 *
 * Combines multiple transformations:
 * - Trims string fields
 * - Removes null/undefined values
 * - Normalizes boolean fields
 *
 * @param {Object} data - Data object
 * @param {Object} options - Configuration options
 * @param {Array<string>} options.stringFields - Fields to trim
 * @param {Array<string>} options.booleanFields - Fields to normalize as booleans
 * @param {boolean} options.removeNulls - Whether to remove null values (default: true)
 * @returns {Object} Sanitized data object
 */
export function sanitizeData(data, options = {}) {
  const {
    stringFields = [],
    booleanFields = [],
    removeNulls = true
  } = options;

  let sanitized = { ...data };

  // Trim string fields
  if (stringFields.length > 0) {
    sanitized = trimStringFields(sanitized, stringFields);
  }

  // Normalize boolean fields
  if (booleanFields.length > 0) {
    sanitized = normalizeBooleanFields(sanitized, booleanFields);
  }

  // Remove null values
  if (removeNulls) {
    sanitized = removeNullValues(sanitized);
  }

  return sanitized;
}
