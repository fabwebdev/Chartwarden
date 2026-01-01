/**
 * Tests for Password Hashing Service
 *
 * Covers:
 * - Argon2id hashing with OWASP parameters
 * - Password verification
 * - Password validation (length, complexity, Unicode)
 * - Secure random password generation
 * - Timing-safe comparison
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import PasswordHashingService, {
  passwordHashingService,
  ARGON2_CONFIG,
  PASSWORD_POLICY,
} from '../src/services/PasswordHashing.service.js';

describe('Password Hashing Service', () => {
  let service;

  beforeEach(() => {
    service = new PasswordHashingService();
  });

  describe('ARGON2_CONFIG', () => {
    it('should use OWASP recommended parameters', () => {
      expect(ARGON2_CONFIG.memoryCost).toBe(65536); // 64 MiB
      expect(ARGON2_CONFIG.timeCost).toBe(3); // 3 iterations
      expect(ARGON2_CONFIG.parallelism).toBe(4); // 4 threads
      expect(ARGON2_CONFIG.hashLength).toBe(32); // 32 bytes
      expect(ARGON2_CONFIG.saltLength).toBe(16); // 16 bytes
    });
  });

  describe('PASSWORD_POLICY', () => {
    it('should have HIPAA-compliant minimum length', () => {
      expect(PASSWORD_POLICY.minLength).toBe(12);
    });

    it('should have DoS prevention max length', () => {
      expect(PASSWORD_POLICY.maxLength).toBe(128);
    });

    it('should track password history', () => {
      expect(PASSWORD_POLICY.historyCount).toBe(12);
    });
  });

  describe('hashPassword', () => {
    it('should hash a valid password', async () => {
      const password = 'SecurePass123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$'); // Argon2id format
      expect(hash.length).toBeGreaterThan(50);
    });

    it('should generate different hashes for same password', async () => {
      const password = 'SecurePass123!';
      const hash1 = await service.hashPassword(password);
      const hash2 = await service.hashPassword(password);

      expect(hash1).not.toBe(hash2); // Different salts
    });

    it('should handle Unicode passwords', async () => {
      const password = 'Sécure日本語123!';
      const hash = await service.hashPassword(password);

      expect(hash).toBeDefined();
      expect(hash).toContain('$argon2id$');
    });

    it('should throw error for password below minimum length', async () => {
      const password = 'Short1!'; // 7 characters
      await expect(service.hashPassword(password)).rejects.toThrow(
        'Password must be at least 12 characters long'
      );
    });

    it('should throw error for password above maximum length', async () => {
      const password = 'A'.repeat(129) + '1!'; // 131 characters
      await expect(service.hashPassword(password)).rejects.toThrow(
        'Password must not exceed 128 characters'
      );
    });

    it('should throw error for empty password', async () => {
      await expect(service.hashPassword('')).rejects.toThrow(
        'Password is required'
      );
    });

    it('should throw error for null password', async () => {
      await expect(service.hashPassword(null)).rejects.toThrow(
        'Password is required'
      );
    });
  });

  describe('verifyPassword', () => {
    it('should verify correct password', async () => {
      const password = 'SecurePass123!';
      const hash = await service.hashPassword(password);

      const isValid = await service.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should reject incorrect password', async () => {
      const password = 'SecurePass123!';
      const wrongPassword = 'WrongPass123!';
      const hash = await service.hashPassword(password);

      const isValid = await service.verifyPassword(wrongPassword, hash);
      expect(isValid).toBe(false);
    });

    it('should handle Unicode password verification', async () => {
      const password = 'Sécure日本語123!';
      const hash = await service.hashPassword(password);

      const isValid = await service.verifyPassword(password, hash);
      expect(isValid).toBe(true);
    });

    it('should return false for empty password', async () => {
      const hash = await service.hashPassword('SecurePass123!');
      const isValid = await service.verifyPassword('', hash);
      expect(isValid).toBe(false);
    });

    it('should return false for null password', async () => {
      const hash = await service.hashPassword('SecurePass123!');
      const isValid = await service.verifyPassword(null, hash);
      expect(isValid).toBe(false);
    });

    it('should return false for invalid hash', async () => {
      const isValid = await service.verifyPassword('SecurePass123!', 'invalid-hash');
      expect(isValid).toBe(false);
    });
  });

  describe('timingSafeEqual', () => {
    it('should return true for equal strings', () => {
      expect(service.timingSafeEqual('hello', 'hello')).toBe(true);
    });

    it('should return false for different strings', () => {
      expect(service.timingSafeEqual('hello', 'world')).toBe(false);
    });

    it('should return false for different length strings', () => {
      expect(service.timingSafeEqual('hello', 'hello world')).toBe(false);
    });

    it('should handle empty strings', () => {
      expect(service.timingSafeEqual('', '')).toBe(true);
      expect(service.timingSafeEqual('hello', '')).toBe(false);
    });

    it('should handle Unicode strings', () => {
      expect(service.timingSafeEqual('日本語', '日本語')).toBe(true);
      expect(service.timingSafeEqual('日本語', '中文')).toBe(false);
    });
  });

  describe('validatePasswordFormat', () => {
    it('should accept valid password', () => {
      expect(() => service.validatePasswordFormat('SecurePass123!')).not.toThrow();
    });

    it('should reject password below minimum length', () => {
      expect(() => service.validatePasswordFormat('Short1!')).toThrow(
        'Password must be at least 12 characters long'
      );
    });

    it('should reject password above maximum length', () => {
      const longPassword = 'A'.repeat(129) + '1!';
      expect(() => service.validatePasswordFormat(longPassword)).toThrow(
        'Password must not exceed 128 characters'
      );
    });

    it('should accept password at minimum length', () => {
      const password = 'SecurePwd12!';
      expect(() => service.validatePasswordFormat(password)).not.toThrow();
    });

    it('should accept password at maximum length', () => {
      const password = 'A'.repeat(125) + '1!a';
      expect(() => service.validatePasswordFormat(password)).not.toThrow();
    });

    it('should accept Unicode passwords', () => {
      expect(() => service.validatePasswordFormat('Sécure日本語123!')).not.toThrow();
    });
  });

  describe('needsRehash', () => {
    it('should return false for recently hashed password', async () => {
      const hash = await service.hashPassword('SecurePass123!');
      const needsRehash = await service.needsRehash(hash);

      expect(needsRehash).toBe(false);
    });

    it('should return true for invalid hash format', async () => {
      const needsRehash = await service.needsRehash('invalid-hash');
      expect(needsRehash).toBe(true);
    });
  });

  describe('generateSecurePassword', () => {
    it('should generate password of specified length', () => {
      const password = service.generateSecurePassword(20);
      expect(password.length).toBe(20);
    });

    it('should generate password with default length of 16', () => {
      const password = service.generateSecurePassword();
      expect(password.length).toBe(16);
    });

    it('should include all character types', () => {
      // Generate multiple passwords to ensure character types are included
      let hasLower = false;
      let hasUpper = false;
      let hasNumber = false;
      let hasSpecial = false;

      for (let i = 0; i < 10; i++) {
        const password = service.generateSecurePassword(20);
        if (/[a-z]/.test(password)) hasLower = true;
        if (/[A-Z]/.test(password)) hasUpper = true;
        if (/[0-9]/.test(password)) hasNumber = true;
        if (/[^A-Za-z0-9]/.test(password)) hasSpecial = true;
      }

      expect(hasLower).toBe(true);
      expect(hasUpper).toBe(true);
      expect(hasNumber).toBe(true);
      expect(hasSpecial).toBe(true);
    });

    it('should generate unique passwords', () => {
      const passwords = new Set();
      for (let i = 0; i < 100; i++) {
        passwords.add(service.generateSecurePassword());
      }
      // All 100 passwords should be unique
      expect(passwords.size).toBe(100);
    });
  });

  describe('getPasswordPolicy', () => {
    it('should return policy with required fields', () => {
      const policy = service.getPasswordPolicy();

      expect(policy.minLength).toBe(12);
      expect(policy.maxLength).toBe(128);
      expect(policy.requirements).toBeDefined();
      expect(policy.requirements.length).toBeGreaterThan(0);
      expect(policy.recommendations).toBeDefined();
      expect(policy.recommendations.length).toBeGreaterThan(0);
    });

    it('should include HIPAA compliance info', () => {
      const policy = service.getPasswordPolicy();

      expect(policy.requirements.some(r => r.includes('12'))).toBe(true);
      expect(policy.requirements.some(r => r.includes('reuse'))).toBe(true);
    });
  });

  describe('singleton instance', () => {
    it('should export a singleton instance', () => {
      expect(passwordHashingService).toBeDefined();
      expect(passwordHashingService instanceof PasswordHashingService).toBe(true);
    });
  });
});
