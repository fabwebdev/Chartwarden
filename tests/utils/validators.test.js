/**
 * Tests for Shared Validators Module
 *
 * TICKET #017: Extract Shared Validators and Utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
  ValidationError,
  validateSSN,
  validateDMEProvider,
  validateAddress,
  validateEmail,
  validatePhoneNumber,
  validateDate,
  validateEnum,
  validateRequired,
  validateStringLength,
  validateNumericRange
} from '../../src/utils/validators.js';

describe('Validators Module', () => {
  describe('validateSSN', () => {
    it('should format valid SSN with 9 digits', () => {
      expect(validateSSN('987654321')).toBe('987-65-4321');
    });

    it('should format SSN with hyphens', () => {
      expect(validateSSN('987-65-4321')).toBe('987-65-4321');
    });

    it('should format SSN with spaces', () => {
      expect(validateSSN('987 65 4321')).toBe('987-65-4321');
    });

    it('should return null for empty SSN', () => {
      expect(validateSSN(null)).toBe(null);
      expect(validateSSN(undefined)).toBe(null);
      expect(validateSSN('')).toBe(null);
    });

    it('should throw error for invalid SSN length', () => {
      expect(() => validateSSN('12345')).toThrow(ValidationError);
      expect(() => validateSSN('12345')).toThrow('SSN must be 9 digits');
    });

    it('should throw error for all zeros', () => {
      expect(() => validateSSN('000000000')).toThrow(ValidationError);
      expect(() => validateSSN('000000000')).toThrow('Invalid SSN');
    });

    it('should throw error for sequential pattern', () => {
      expect(() => validateSSN('123456789')).toThrow(ValidationError);
      expect(() => validateSSN('123456789')).toThrow('Invalid SSN');
    });

    it('should throw error for repeating digits', () => {
      expect(() => validateSSN('111111111')).toThrow(ValidationError);
    });
  });

  describe('validateDMEProvider', () => {
    it('should validate and normalize valid DME options', () => {
      expect(validateDMEProvider('wheelchair')).toBe('wheelchair');
      expect(validateDMEProvider('WHEELCHAIR')).toBe('wheelchair');
      expect(validateDMEProvider('  Wheelchair  ')).toBe('wheelchair');
    });

    it('should return null for empty values', () => {
      expect(validateDMEProvider(null)).toBe(null);
      expect(validateDMEProvider(undefined)).toBe(null);
      expect(validateDMEProvider('')).toBe(null);
    });

    it('should accept all valid DME options', () => {
      const validOptions = [
        'none', 'wheelchair', 'walker', 'cane', 'oxygen',
        'hospital_bed', 'bedside_commode', 'bed',
        'over bed table', 'pressure mattress', 'other'
      ];

      validOptions.forEach(option => {
        expect(validateDMEProvider(option)).toBe(option);
      });
    });

    it('should throw error for invalid DME option', () => {
      expect(() => validateDMEProvider('invalid_option')).toThrow(ValidationError);
      expect(() => validateDMEProvider('wheelchair_deluxe')).toThrow(ValidationError);
    });
  });

  describe('validateAddress', () => {
    it('should validate and format valid address', () => {
      const address = {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '12345'
      };

      const result = validateAddress(address);
      expect(result.street).toBe('123 Main St');
      expect(result.city).toBe('Anytown');
      expect(result.state).toBe('CA');
      expect(result.zip).toBe('12345');
    });

    it('should normalize state to uppercase', () => {
      const address = {
        street: '123 Main St',
        city: 'Anytown',
        state: 'ca',
        zip: '12345'
      };

      const result = validateAddress(address);
      expect(result.state).toBe('CA');
    });

    it('should format 9-digit ZIP code', () => {
      const address = {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '123456789'
      };

      const result = validateAddress(address);
      expect(result.zip).toBe('12345-6789');
    });

    it('should throw error for missing address', () => {
      expect(() => validateAddress(null)).toThrow(ValidationError);
      expect(() => validateAddress(null)).toThrow('Address is required');
    });

    it('should throw error for missing required fields', () => {
      const address = { street: '123 Main St' };
      expect(() => validateAddress(address)).toThrow(ValidationError);
    });

    it('should throw error for invalid state', () => {
      const address = {
        street: '123 Main St',
        city: 'Anytown',
        state: 'California',
        zip: '12345'
      };

      expect(() => validateAddress(address)).toThrow(ValidationError);
      expect(() => validateAddress(address)).toThrow('State must be a 2-letter code');
    });

    it('should throw error for invalid ZIP code', () => {
      const address = {
        street: '123 Main St',
        city: 'Anytown',
        state: 'CA',
        zip: '123'
      };

      expect(() => validateAddress(address)).toThrow(ValidationError);
    });
  });

  describe('validateEmail', () => {
    it('should validate and normalize valid email', () => {
      expect(validateEmail('john@example.com')).toBe('john@example.com');
      expect(validateEmail('JOHN@EXAMPLE.COM')).toBe('john@example.com');
      expect(validateEmail('  john@example.com  ')).toBe('john@example.com');
    });

    it('should return null for empty email', () => {
      expect(validateEmail(null)).toBe(null);
      expect(validateEmail(undefined)).toBe(null);
      expect(validateEmail('')).toBe(null);
    });

    it('should throw error for invalid email', () => {
      expect(() => validateEmail('invalid')).toThrow(ValidationError);
      expect(() => validateEmail('invalid@')).toThrow(ValidationError);
      expect(() => validateEmail('@example.com')).toThrow(ValidationError);
      expect(() => validateEmail('invalid@example')).toThrow(ValidationError);
    });
  });

  describe('validatePhoneNumber', () => {
    it('should format valid 10-digit phone number', () => {
      expect(validatePhoneNumber('1234567890')).toBe('123-456-7890');
      expect(validatePhoneNumber('123-456-7890')).toBe('123-456-7890');
      expect(validatePhoneNumber('(123) 456-7890')).toBe('123-456-7890');
    });

    it('should return null for empty phone', () => {
      expect(validatePhoneNumber(null)).toBe(null);
      expect(validatePhoneNumber(undefined)).toBe(null);
      expect(validatePhoneNumber('')).toBe(null);
    });

    it('should throw error for invalid phone length', () => {
      expect(() => validatePhoneNumber('12345')).toThrow(ValidationError);
      expect(() => validatePhoneNumber('12345')).toThrow('Phone number must be 10 digits');
    });
  });

  describe('validateDate', () => {
    it('should validate and format valid date', () => {
      expect(validateDate('2024-01-15')).toBe('2024-01-15');
      expect(validateDate('01/15/2024')).toBe('2024-01-15');
    });

    it('should return null for empty date', () => {
      expect(validateDate(null)).toBe(null);
      expect(validateDate(undefined)).toBe(null);
      expect(validateDate('')).toBe(null);
    });

    it('should throw error for invalid date', () => {
      expect(() => validateDate('invalid')).toThrow(ValidationError);
      expect(() => validateDate('2024-13-01')).toThrow(ValidationError);
    });
  });

  describe('validateEnum', () => {
    it('should validate value in allowed list', () => {
      const allowed = ['red', 'green', 'blue'];
      expect(validateEnum('red', allowed, 'Color')).toBe('red');
    });

    it('should return null for empty value', () => {
      const allowed = ['red', 'green', 'blue'];
      expect(validateEnum(null, allowed, 'Color')).toBe(null);
    });

    it('should throw error for value not in allowed list', () => {
      const allowed = ['red', 'green', 'blue'];
      expect(() => validateEnum('yellow', allowed, 'Color')).toThrow(ValidationError);
      expect(() => validateEnum('yellow', allowed, 'Color')).toThrow('Color must be one of: red, green, blue');
    });
  });

  describe('validateRequired', () => {
    it('should return value if present', () => {
      expect(validateRequired('value', 'Field')).toBe('value');
      expect(validateRequired(0, 'Field')).toBe(0);
      expect(validateRequired(false, 'Field')).toBe(false);
    });

    it('should throw error for missing value', () => {
      expect(() => validateRequired(null, 'Field')).toThrow(ValidationError);
      expect(() => validateRequired(undefined, 'Field')).toThrow(ValidationError);
      expect(() => validateRequired('', 'Field')).toThrow(ValidationError);
      expect(() => validateRequired(null, 'Field')).toThrow('Field is required');
    });
  });

  describe('validateStringLength', () => {
    it('should validate string within length range', () => {
      expect(validateStringLength('hello', 1, 10, 'Name')).toBe('hello');
    });

    it('should return null for empty string', () => {
      expect(validateStringLength(null, 1, 10, 'Name')).toBe(null);
    });

    it('should throw error for string too short', () => {
      expect(() => validateStringLength('ab', 3, 10, 'Name')).toThrow(ValidationError);
    });

    it('should throw error for string too long', () => {
      expect(() => validateStringLength('abcdefghijk', 3, 10, 'Name')).toThrow(ValidationError);
    });
  });

  describe('validateNumericRange', () => {
    it('should validate number within range', () => {
      expect(validateNumericRange(5, 1, 10, 'Count')).toBe(5);
      expect(validateNumericRange('5', 1, 10, 'Count')).toBe(5);
    });

    it('should return null for empty value', () => {
      expect(validateNumericRange(null, 1, 10, 'Count')).toBe(null);
    });

    it('should throw error for non-numeric value', () => {
      expect(() => validateNumericRange('abc', 1, 10, 'Count')).toThrow(ValidationError);
    });

    it('should throw error for number below range', () => {
      expect(() => validateNumericRange(0, 1, 10, 'Count')).toThrow(ValidationError);
    });

    it('should throw error for number above range', () => {
      expect(() => validateNumericRange(11, 1, 10, 'Count')).toThrow(ValidationError);
    });
  });
});
