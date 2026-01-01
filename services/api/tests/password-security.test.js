/**
 * Tests for Password Security Utility
 *
 * Covers:
 * - Password complexity validation
 * - Common password blocking
 * - Password strength estimation (zxcvbn)
 * - Unicode normalization
 * - Max/min length enforcement
 */

import { describe, it, expect, jest } from '@jest/globals';
import {
  validatePassword,
  checkComplexity,
  checkStrength,
  isCommonPassword,
  generateStrongPassword,
  normalizePassword,
  PASSWORD_REQUIREMENTS,
} from '../src/utils/passwordSecurity.js';

describe('Password Security Utility', () => {
  describe('PASSWORD_REQUIREMENTS', () => {
    it('should have HIPAA-compliant settings', () => {
      expect(PASSWORD_REQUIREMENTS.minLength).toBe(12);
      expect(PASSWORD_REQUIREMENTS.maxLength).toBe(128);
      expect(PASSWORD_REQUIREMENTS.requireComplexity).toBe(true);
      expect(PASSWORD_REQUIREMENTS.minStrengthScore).toBe(3);
      expect(PASSWORD_REQUIREMENTS.checkBreached).toBe(true);
      expect(PASSWORD_REQUIREMENTS.blockCommon).toBe(true);
    });
  });

  describe('normalizePassword', () => {
    it('should normalize Unicode to NFC form', () => {
      // café with separate combining character
      const decomposed = 'cafe\u0301';
      const normalized = normalizePassword(decomposed);
      expect(normalized).toBe('café');
    });

    it('should return empty string for null/undefined', () => {
      expect(normalizePassword(null)).toBe('');
      expect(normalizePassword(undefined)).toBe('');
    });

    it('should handle regular ASCII strings', () => {
      expect(normalizePassword('password123')).toBe('password123');
    });
  });

  describe('checkComplexity', () => {
    it('should pass with 3 of 4 character types', () => {
      const result = checkComplexity('Password1');
      expect(result.valid).toBe(true);
      expect(result.count).toBe(3);
    });

    it('should pass with all 4 character types', () => {
      const result = checkComplexity('Password1!');
      expect(result.valid).toBe(true);
      expect(result.count).toBe(4);
    });

    it('should fail with only 2 character types', () => {
      const result = checkComplexity('password');
      expect(result.valid).toBe(false);
      expect(result.count).toBe(1);
    });

    it('should identify missing types', () => {
      const result = checkComplexity('password');
      expect(result.missing).toContain('uppercase');
      expect(result.missing).toContain('numbers');
      expect(result.missing).toContain('special');
    });

    it('should identify present types', () => {
      const result = checkComplexity('Password1!');
      expect(result.types).toContain('lowercase');
      expect(result.types).toContain('uppercase');
      expect(result.types).toContain('numbers');
      expect(result.types).toContain('special');
    });
  });

  describe('isCommonPassword', () => {
    it('should detect common passwords', () => {
      expect(isCommonPassword('password')).toBe(true);
      expect(isCommonPassword('123456')).toBe(true);
      expect(isCommonPassword('qwerty')).toBe(true);
      expect(isCommonPassword('admin')).toBe(true);
    });

    it('should be case-insensitive', () => {
      expect(isCommonPassword('PASSWORD')).toBe(true);
      expect(isCommonPassword('Password')).toBe(true);
    });

    it('should detect common password variations', () => {
      expect(isCommonPassword('password123')).toBe(true);
      expect(isCommonPassword('Password1')).toBe(true);
    });

    it('should not flag unique passwords', () => {
      expect(isCommonPassword('Xk9#mP2qR7vL')).toBe(false);
      expect(isCommonPassword('UniqueP@ssw0rd!')).toBe(false);
    });
  });

  describe('checkStrength', () => {
    it('should rate weak passwords low', () => {
      const result = checkStrength('12345678');
      expect(result.score).toBeLessThan(3);
      expect(result.valid).toBe(false);
    });

    it('should rate strong passwords high', () => {
      const result = checkStrength('Xk9#mP2qR7vL!@Secure');
      expect(result.score).toBeGreaterThanOrEqual(3);
      expect(result.valid).toBe(true);
    });

    it('should provide crack time estimate', () => {
      const result = checkStrength('SomePassword123!');
      expect(result.crackTime).toBeDefined();
      expect(typeof result.crackTime).toBe('string');
    });

    it('should penalize passwords containing user inputs', () => {
      const userInputs = ['john', 'smith', 'john.smith@example.com'];
      const result = checkStrength('johnsmith123', userInputs);
      expect(result.score).toBeLessThan(3);
    });
  });

  describe('validatePassword', () => {
    it('should accept valid strong password', async () => {
      const result = await validatePassword('SecureP@ssw0rd!XY', {
        skipBreachCheck: true, // Skip external API for testing
      });

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject password below minimum length', async () => {
      const result = await validatePassword('Short1!', {
        skipBreachCheck: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('at least 12'))).toBe(true);
    });

    it('should reject password above maximum length', async () => {
      const longPassword = 'A'.repeat(130) + '1!';
      const result = await validatePassword(longPassword, {
        skipBreachCheck: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('not exceed 128'))).toBe(true);
    });

    it('should reject password lacking complexity', async () => {
      const result = await validatePassword('onlylowercase', {
        skipBreachCheck: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('3 of the following'))).toBe(true);
    });

    it('should reject common passwords', async () => {
      const result = await validatePassword('password1234', {
        skipBreachCheck: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too common'))).toBe(true);
    });

    it('should reject weak passwords', async () => {
      const result = await validatePassword('aaaaaaaaaaaa', {
        skipBreachCheck: true,
      });

      expect(result.valid).toBe(false);
      expect(result.errors.some(e => e.includes('too weak'))).toBe(true);
    });

    it('should return null for empty password', async () => {
      const result = await validatePassword('');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('Password is required');
    });

    it('should include strength information', async () => {
      const result = await validatePassword('SecureP@ssw0rd!XY', {
        skipBreachCheck: true,
      });

      expect(result.strength).toBeDefined();
      expect(result.strength.score).toBeDefined();
      expect(result.strength.crackTime).toBeDefined();
    });

    it('should provide suggestions for improvement', async () => {
      const result = await validatePassword('weakpassword', {
        skipBreachCheck: true,
      });

      expect(result.suggestions).toBeDefined();
      expect(Array.isArray(result.suggestions)).toBe(true);
    });

    it('should handle Unicode passwords', async () => {
      const result = await validatePassword('Sécure日本語123!', {
        skipBreachCheck: true,
      });

      expect(result.valid).toBe(true);
    });
  });

  describe('generateStrongPassword', () => {
    it('should generate password of default length', () => {
      const password = generateStrongPassword();
      expect(password.length).toBe(16);
    });

    it('should generate password of specified length', () => {
      const password = generateStrongPassword(24);
      expect(password.length).toBe(24);
    });

    it('should include all character types', () => {
      const password = generateStrongPassword(20);

      expect(/[a-z]/.test(password)).toBe(true);
      expect(/[A-Z]/.test(password)).toBe(true);
      expect(/[0-9]/.test(password)).toBe(true);
      expect(/[^A-Za-z0-9]/.test(password)).toBe(true);
    });

    it('should pass complexity check', () => {
      const password = generateStrongPassword();
      const complexity = checkComplexity(password);

      expect(complexity.valid).toBe(true);
      expect(complexity.count).toBeGreaterThanOrEqual(3);
    });

    it('should generate unique passwords', () => {
      const passwords = new Set();
      for (let i = 0; i < 50; i++) {
        passwords.add(generateStrongPassword());
      }
      expect(passwords.size).toBe(50);
    });
  });

  describe('edge cases', () => {
    it('should handle null password gracefully', async () => {
      const result = await validatePassword(null);
      expect(result.valid).toBe(false);
    });

    it('should handle undefined password gracefully', async () => {
      const result = await validatePassword(undefined);
      expect(result.valid).toBe(false);
    });

    it('should handle number as password', async () => {
      const result = await validatePassword(123456789012);
      expect(result.valid).toBe(false);
    });

    it('should handle password with only spaces', async () => {
      const result = await validatePassword('            ');
      expect(result.valid).toBe(false);
    });
  });
});
