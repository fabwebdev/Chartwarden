/**
 * Shared Validators Module
 *
 * Purpose: Centralized validation functions to eliminate code duplication
 * across controllers and services.
 *
 * TICKET #017: Extract Shared Validators and Utilities
 */

/**
 * Custom validation error class
 */
export class ValidationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ValidationError';
    this.statusCode = 400;
  }
}

/**
 * Validate and format SSN
 *
 * @param {string|null|undefined} ssn - Social Security Number
 * @returns {string|null} Formatted SSN (xxx-xx-xxxx) or null
 * @throws {ValidationError} If SSN format is invalid
 *
 * Examples:
 *   validateSSN('123456789') => '123-45-6789'
 *   validateSSN('123-45-6789') => '123-45-6789'
 *   validateSSN(null) => null
 *   validateSSN('12345') => throws ValidationError
 */
export function validateSSN(ssn) {
  if (!ssn || ssn === null || ssn === undefined) {
    return null;
  }

  // Remove all non-digit characters
  const digits = String(ssn).replace(/\D/g, '');

  // If empty after cleaning, return null
  if (digits.length === 0) {
    return null;
  }

  // Must be 9 digits
  if (digits.length !== 9) {
    throw new ValidationError('SSN must be 9 digits');
  }

  // Invalid SSN patterns
  if (digits === '000000000' ||
      digits === '123456789' ||
      /^(\d)\1{8}$/.test(digits)) {
    throw new ValidationError('Invalid SSN');
  }

  // Format as xxx-xx-xxxx
  return `${digits.slice(0, 3)}-${digits.slice(3, 5)}-${digits.slice(5)}`;
}

/**
 * Validate DME (Durable Medical Equipment) provider option
 *
 * @param {string|null|undefined} value - DME provider type
 * @returns {string|null} Normalized DME provider value (lowercase, trimmed)
 * @throws {ValidationError} If DME provider is not a valid option
 *
 * Valid options: none, wheelchair, walker, cane, oxygen, hospital_bed,
 *                bedside_commode, bed, over bed table, pressure mattress, other
 */
export function validateDMEProvider(value) {
  const validOptions = [
    "none",
    "wheelchair",
    "walker",
    "cane",
    "oxygen",
    "hospital_bed",
    "bedside_commode",
    "bed",
    "over bed table",
    "pressure mattress",
    "other"
  ];

  if (!value || value === null || value === undefined) {
    return null;
  }

  const normalizedValue = String(value).toLowerCase().trim();

  if (!validOptions.includes(normalizedValue)) {
    throw new ValidationError(
      `DME provider must be one of: ${validOptions.join(', ')}`
    );
  }

  return normalizedValue;
}

/**
 * Validate address fields
 *
 * @param {Object} address - Address object
 * @param {string} address.street - Street address
 * @param {string} address.city - City
 * @param {string} address.state - State (2-letter code)
 * @param {string} address.zip - ZIP code
 * @returns {Object} Validated and normalized address
 * @throws {ValidationError} If any address field is invalid
 */
export function validateAddress(address) {
  if (!address) {
    throw new ValidationError('Address is required');
  }

  const { street, city, state, zip } = address;

  // Validate required fields
  if (!street || !city || !state || !zip) {
    throw new ValidationError('Street, city, state, and ZIP are required');
  }

  // Validate state (2-letter code)
  if (!/^[A-Z]{2}$/i.test(state)) {
    throw new ValidationError('State must be a 2-letter code (e.g., CA, NY)');
  }

  // Validate ZIP code (5 digits or 5+4 format)
  const zipDigits = String(zip).replace(/\D/g, '');
  if (zipDigits.length !== 5 && zipDigits.length !== 9) {
    throw new ValidationError('ZIP code must be 5 or 9 digits');
  }

  // Format ZIP code
  const formattedZip = zipDigits.length === 9
    ? `${zipDigits.slice(0, 5)}-${zipDigits.slice(5)}`
    : zipDigits;

  return {
    street: String(street).trim(),
    city: String(city).trim(),
    state: String(state).toUpperCase().trim(),
    zip: formattedZip
  };
}

/**
 * Validate email address
 *
 * @param {string|null|undefined} email - Email address
 * @returns {string|null} Normalized email (lowercase, trimmed)
 * @throws {ValidationError} If email format is invalid
 */
export function validateEmail(email) {
  if (!email || email === null || email === undefined) {
    return null;
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  // Basic email regex pattern
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail)) {
    throw new ValidationError('Invalid email format');
  }

  return normalizedEmail;
}

/**
 * Validate phone number
 *
 * @param {string|null|undefined} phone - Phone number
 * @returns {string|null} Formatted phone number (xxx-xxx-xxxx)
 * @throws {ValidationError} If phone number is invalid
 */
export function validatePhoneNumber(phone) {
  if (!phone || phone === null || phone === undefined) {
    return null;
  }

  // Remove all non-digit characters
  const digits = String(phone).replace(/\D/g, '');

  // Must be 10 digits (US phone number)
  if (digits.length !== 10) {
    throw new ValidationError('Phone number must be 10 digits');
  }

  // Format as xxx-xxx-xxxx
  return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
}

/**
 * Validate date string
 *
 * @param {string|null|undefined} dateString - Date string in various formats
 * @returns {string|null} ISO date string (YYYY-MM-DD)
 * @throws {ValidationError} If date is invalid
 */
export function validateDate(dateString) {
  if (!dateString || dateString === null || dateString === undefined) {
    return null;
  }

  const date = new Date(dateString);

  if (isNaN(date.getTime())) {
    throw new ValidationError('Invalid date format');
  }

  // Return ISO date string (YYYY-MM-DD)
  return date.toISOString().split('T')[0];
}

/**
 * Validate that a value is one of the allowed options
 *
 * @param {any} value - Value to validate
 * @param {Array} allowedValues - Array of allowed values
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {any} The validated value
 * @throws {ValidationError} If value is not in allowed values
 */
export function validateEnum(value, allowedValues, fieldName = 'Field') {
  if (!value || value === null || value === undefined) {
    return null;
  }

  if (!allowedValues.includes(value)) {
    throw new ValidationError(
      `${fieldName} must be one of: ${allowedValues.join(', ')}`
    );
  }

  return value;
}

/**
 * Validate required field
 *
 * @param {any} value - Value to check
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {any} The value if present
 * @throws {ValidationError} If value is missing
 */
export function validateRequired(value, fieldName = 'Field') {
  if (value === null || value === undefined || value === '') {
    throw new ValidationError(`${fieldName} is required`);
  }

  return value;
}

/**
 * Validate string length
 *
 * @param {string} value - String to validate
 * @param {number} min - Minimum length
 * @param {number} max - Maximum length
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {string} The validated string
 * @throws {ValidationError} If string length is invalid
 */
export function validateStringLength(value, min, max, fieldName = 'Field') {
  if (!value || value === null || value === undefined) {
    return null;
  }

  const str = String(value);

  if (str.length < min || str.length > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max} characters`
    );
  }

  return str;
}

/**
 * Validate numeric range
 *
 * @param {number} value - Number to validate
 * @param {number} min - Minimum value
 * @param {number} max - Maximum value
 * @param {string} fieldName - Name of the field (for error messages)
 * @returns {number} The validated number
 * @throws {ValidationError} If number is out of range
 */
export function validateNumericRange(value, min, max, fieldName = 'Field') {
  if (value === null || value === undefined) {
    return null;
  }

  const num = Number(value);

  if (isNaN(num)) {
    throw new ValidationError(`${fieldName} must be a number`);
  }

  if (num < min || num > max) {
    throw new ValidationError(
      `${fieldName} must be between ${min} and ${max}`
    );
  }

  return num;
}
