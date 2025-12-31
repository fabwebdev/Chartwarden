/**
 * Tests for Shared Transformers Module
 *
 * TICKET #017: Extract Shared Validators and Utilities
 */

import { describe, it, expect } from '@jest/globals';
import {
  normalizeBooleanFields,
  normalizeBoolean,
  trimStringFields,
  uppercaseFields,
  lowercaseFields,
  removeNullValues,
  removeEmptyStrings,
  parseJSONFields,
  stringifyJSONFields,
  pickFields,
  omitFields,
  sanitizeData
} from '../../src/utils/transformers.js';

describe('Transformers Module', () => {
  describe('normalizeBooleanFields', () => {
    it('should normalize true values to 1', () => {
      const data = {
        active: true,
        enabled: 1,
        verified: '1',
        other: 'value'
      };

      const result = normalizeBooleanFields(data, ['active', 'enabled', 'verified']);

      expect(result.active).toBe(1);
      expect(result.enabled).toBe(1);
      expect(result.verified).toBe(1);
      expect(result.other).toBe('value');
    });

    it('should normalize false values to 0', () => {
      const data = {
        active: false,
        enabled: 0,
        verified: '0',
        other: 'value'
      };

      const result = normalizeBooleanFields(data, ['active', 'enabled', 'verified']);

      expect(result.active).toBe(0);
      expect(result.enabled).toBe(0);
      expect(result.verified).toBe(0);
    });

    it('should not modify fields not in the list', () => {
      const data = {
        active: true,
        name: 'John',
        count: 5
      };

      const result = normalizeBooleanFields(data, ['active']);

      expect(result.active).toBe(1);
      expect(result.name).toBe('John');
      expect(result.count).toBe(5);
    });

    it('should return new object without mutating original', () => {
      const data = { active: true };
      const result = normalizeBooleanFields(data, ['active']);

      expect(result).not.toBe(data);
      expect(data.active).toBe(true);
      expect(result.active).toBe(1);
    });

    it('should handle patient boolean fields correctly', () => {
      const patientData = {
        oxygen_dependent: true,
        patient_consents: '1',
        hipaa_received: 1,
        veterans_status: false
      };

      const result = normalizeBooleanFields(patientData, [
        'oxygen_dependent',
        'patient_consents',
        'hipaa_received',
        'veterans_status'
      ]);

      expect(result.oxygen_dependent).toBe(1);
      expect(result.patient_consents).toBe(1);
      expect(result.hipaa_received).toBe(1);
      expect(result.veterans_status).toBe(0);
    });
  });

  describe('normalizeBoolean', () => {
    it('should normalize true values to 1', () => {
      expect(normalizeBoolean(true)).toBe(1);
      expect(normalizeBoolean(1)).toBe(1);
      expect(normalizeBoolean('1')).toBe(1);
    });

    it('should normalize false values to 0', () => {
      expect(normalizeBoolean(false)).toBe(0);
      expect(normalizeBoolean(0)).toBe(0);
      expect(normalizeBoolean('0')).toBe(0);
      expect(normalizeBoolean('false')).toBe(0);
      expect(normalizeBoolean(null)).toBe(0);
    });
  });

  describe('trimStringFields', () => {
    it('should trim specified string fields', () => {
      const data = {
        name: '  John  ',
        email: '  john@example.com  ',
        age: 30
      };

      const result = trimStringFields(data, ['name', 'email']);

      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
      expect(result.age).toBe(30);
    });

    it('should not modify non-string fields', () => {
      const data = {
        name: '  John  ',
        age: 30,
        active: true
      };

      const result = trimStringFields(data, ['name', 'age', 'active']);

      expect(result.name).toBe('John');
      expect(result.age).toBe(30);
      expect(result.active).toBe(true);
    });
  });

  describe('uppercaseFields', () => {
    it('should convert specified fields to uppercase', () => {
      const data = {
        state: 'ca',
        country: 'usa',
        name: 'John'
      };

      const result = uppercaseFields(data, ['state', 'country']);

      expect(result.state).toBe('CA');
      expect(result.country).toBe('USA');
      expect(result.name).toBe('John');
    });

    it('should not modify non-string fields', () => {
      const data = {
        state: 'ca',
        count: 5
      };

      const result = uppercaseFields(data, ['state', 'count']);

      expect(result.state).toBe('CA');
      expect(result.count).toBe(5);
    });
  });

  describe('lowercaseFields', () => {
    it('should convert specified fields to lowercase', () => {
      const data = {
        email: 'JOHN@EXAMPLE.COM',
        username: 'JOHN_DOE',
        name: 'John'
      };

      const result = lowercaseFields(data, ['email', 'username']);

      expect(result.email).toBe('john@example.com');
      expect(result.username).toBe('john_doe');
      expect(result.name).toBe('John');
    });
  });

  describe('removeNullValues', () => {
    it('should remove null and undefined values', () => {
      const data = {
        a: 1,
        b: null,
        c: undefined,
        d: 0,
        e: '',
        f: false
      };

      const result = removeNullValues(data);

      expect(result).toEqual({
        a: 1,
        d: 0,
        e: '',
        f: false
      });
    });
  });

  describe('removeEmptyStrings', () => {
    it('should remove empty string values', () => {
      const data = {
        a: 'hello',
        b: '',
        c: '  ',
        d: 0,
        e: null
      };

      const result = removeEmptyStrings(data);

      expect(result).toEqual({
        a: 'hello',
        c: '  ',
        d: 0,
        e: null
      });
    });
  });

  describe('parseJSONFields', () => {
    it('should parse JSON string fields', () => {
      const data = {
        config: '{"key":"value"}',
        name: 'John'
      };

      const result = parseJSONFields(data, ['config']);

      expect(result.config).toEqual({ key: 'value' });
      expect(result.name).toBe('John');
    });

    it('should leave invalid JSON as-is', () => {
      const data = {
        config: 'invalid json',
        name: 'John'
      };

      const result = parseJSONFields(data, ['config']);

      expect(result.config).toBe('invalid json');
    });
  });

  describe('stringifyJSONFields', () => {
    it('should stringify object fields', () => {
      const data = {
        config: { key: 'value' },
        name: 'John'
      };

      const result = stringifyJSONFields(data, ['config']);

      expect(result.config).toBe('{"key":"value"}');
      expect(result.name).toBe('John');
    });

    it('should leave non-object fields as-is', () => {
      const data = {
        config: 'string value',
        name: 'John'
      };

      const result = stringifyJSONFields(data, ['config']);

      expect(result.config).toBe('string value');
    });
  });

  describe('pickFields', () => {
    it('should pick only specified fields', () => {
      const data = {
        a: 1,
        b: 2,
        c: 3,
        d: 4
      };

      const result = pickFields(data, ['a', 'c']);

      expect(result).toEqual({
        a: 1,
        c: 3
      });
    });

    it('should ignore fields that do not exist', () => {
      const data = {
        a: 1,
        b: 2
      };

      const result = pickFields(data, ['a', 'c']);

      expect(result).toEqual({ a: 1 });
    });
  });

  describe('omitFields', () => {
    it('should omit specified fields', () => {
      const data = {
        a: 1,
        b: 2,
        c: 3,
        d: 4
      };

      const result = omitFields(data, ['b', 'd']);

      expect(result).toEqual({
        a: 1,
        c: 3
      });
    });

    it('should not error for fields that do not exist', () => {
      const data = {
        a: 1,
        b: 2
      };

      const result = omitFields(data, ['c', 'd']);

      expect(result).toEqual({
        a: 1,
        b: 2
      });
    });
  });

  describe('sanitizeData', () => {
    it('should apply multiple transformations', () => {
      const data = {
        name: '  John  ',
        email: '  john@example.com  ',
        active: true,
        enabled: '1',
        deleted: null,
        count: 5
      };

      const result = sanitizeData(data, {
        stringFields: ['name', 'email'],
        booleanFields: ['active', 'enabled'],
        removeNulls: true
      });

      expect(result.name).toBe('John');
      expect(result.email).toBe('john@example.com');
      expect(result.active).toBe(1);
      expect(result.enabled).toBe(1);
      expect(result.deleted).toBeUndefined();
      expect(result.count).toBe(5);
    });

    it('should handle patient data sanitization', () => {
      const patientData = {
        first_name: '  John  ',
        last_name: '  Doe  ',
        oxygen_dependent: true,
        patient_consents: '1',
        empty_field: null
      };

      const result = sanitizeData(patientData, {
        stringFields: ['first_name', 'last_name'],
        booleanFields: ['oxygen_dependent', 'patient_consents'],
        removeNulls: true
      });

      expect(result.first_name).toBe('John');
      expect(result.last_name).toBe('Doe');
      expect(result.oxygen_dependent).toBe(1);
      expect(result.patient_consents).toBe(1);
      expect(result.empty_field).toBeUndefined();
    });

    it('should work with empty options', () => {
      const data = {
        name: 'John',
        age: 30,
        active: true
      };

      const result = sanitizeData(data);

      expect(result).toEqual({
        name: 'John',
        age: 30,
        active: true
      });
    });

    it('should preserve nulls when removeNulls is false', () => {
      const data = {
        name: 'John',
        empty: null
      };

      const result = sanitizeData(data, { removeNulls: false });

      expect(result.empty).toBe(null);
    });
  });
});
