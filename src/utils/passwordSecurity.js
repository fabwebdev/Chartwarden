/**
 * Password Security Utility
 *
 * SECURITY: TICKET #006 - Strengthen password policy
 * HIPAA: §164.308(a)(5)(ii)(D) - Password management
 *
 * Features:
 * - Minimum 12 characters
 * - Complexity requirements (3 of 4 character types)
 * - Breached password checking (HaveIBeenPwned)
 * - Common password blocking
 * - Password strength estimation (zxcvbn)
 */

import zxcvbn from 'zxcvbn';
import crypto from 'crypto';
import axios from 'axios';

import { logger } from './logger.js';
/**
 * Common passwords to block
 * Top 100 most common passwords
 */
const COMMON_PASSWORDS = [
  'password', '123456', '12345678', 'qwerty', 'abc123', 'monkey', '1234567',
  'letmein', 'trustno1', 'dragon', 'baseball', 'iloveyou', 'master', 'sunshine',
  'ashley', 'bailey', 'passw0rd', 'shadow', '123123', '654321', 'superman',
  'qazwsx', 'michael', 'football', 'password1', 'password123', 'admin', 'welcome',
  'login', 'princess', 'solo', 'starwars', 'welcome123', 'admin123', 'root',
  'toor', 'pass', 'test', 'guest', 'info', 'adm', 'mysql', 'user', 'administrator',
  'oracle', 'ftp', 'pi', 'puppet', 'ansible', 'ec2-user', 'vagrant', 'azureuser',
  'changeme', 'Password1', 'Password123', 'Passw0rd', 'qwerty123', 'letmein123',
  'welcome1', 'password!', 'Password!', 'P@ssw0rd', 'P@ssword', 'Pa$$w0rd',
  '1q2w3e4r', 'zxcvbnm', 'asdfghjkl', 'qwertyuiop', '1234567890', '0987654321',
  'admin1234', 'root1234', 'password1234', 'test1234', 'demo1234', 'temp1234',
  'temp123', 'demo123', 'test123', 'guest123', 'user123', 'default', 'changeme123',
  'secret', 'secret123', 'password!23', 'qwerty!23', 'iloveyou123', 'sunshine123',
  'charlie', 'charlie123', 'aa123456', 'shadow123', 'master123', 'jennifer',
  'computer', 'computer123', 'freedom', 'freedom123'
];

/**
 * Password requirements
 */
export const PASSWORD_REQUIREMENTS = {
  minLength: 12,
  requireComplexity: true, // Must have 3 of 4 character types
  minStrengthScore: 3, // zxcvbn score 0-4 (3 = strong, 4 = very strong)
  checkBreached: true, // Check against HaveIBeenPwned
  blockCommon: true // Block common passwords
};

/**
 * Check if password contains at least 3 of 4 character types:
 * - Lowercase letters
 * - Uppercase letters
 * - Numbers
 * - Special characters
 *
 * @param {string} password
 * @returns {Object} { valid: boolean, types: string[], missing: string[] }
 */
export function checkComplexity(password) {
  const types = {
    lowercase: /[a-z]/.test(password),
    uppercase: /[A-Z]/.test(password),
    numbers: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password)
  };

  const presentTypes = Object.entries(types)
    .filter(([_, present]) => present)
    .map(([type]) => type);

  const missingTypes = Object.entries(types)
    .filter(([_, present]) => !present)
    .map(([type]) => type);

  return {
    valid: presentTypes.length >= 3,
    types: presentTypes,
    missing: missingTypes,
    count: presentTypes.length
  };
}

/**
 * Check if password is in common passwords list
 *
 * @param {string} password
 * @returns {boolean}
 */
export function isCommonPassword(password) {
  const lowerPassword = password.toLowerCase();
  return COMMON_PASSWORDS.some(common => {
    // Exact match or contains common password
    return lowerPassword === common.toLowerCase() ||
           lowerPassword.includes(common.toLowerCase());
  });
}

/**
 * Check password strength using zxcvbn
 *
 * @param {string} password
 * @param {Array} userInputs - Additional user-specific inputs to check against
 * @returns {Object} zxcvbn result
 */
export function checkStrength(password, userInputs = []) {
  const result = zxcvbn(password, userInputs);

  return {
    score: result.score, // 0-4 (0 = weak, 4 = very strong)
    crackTime: result.crack_times_display.offline_slow_hashing_1e4_per_second,
    warning: result.feedback.warning,
    suggestions: result.feedback.suggestions,
    valid: result.score >= PASSWORD_REQUIREMENTS.minStrengthScore
  };
}

/**
 * Check if password has been breached using HaveIBeenPwned API
 * Uses k-anonymity model - only sends first 5 chars of SHA-1 hash
 *
 * @param {string} password
 * @returns {Promise<Object>} { breached: boolean, count: number }
 */
export async function checkBreached(password) {
  try {
    // Hash the password with SHA-1
    const sha1 = crypto.createHash('sha1').update(password).digest('hex').toUpperCase();
    const prefix = sha1.substring(0, 5);
    const suffix = sha1.substring(5);

    // Query HaveIBeenPwned API with k-anonymity (only first 5 chars)
    const response = await axios.get(
      `https://api.pwnedpasswords.com/range/${prefix}`,
      {
        timeout: 3000, // 3 second timeout
        headers: {
          'User-Agent': 'Hospice-EHR-Password-Check'
        }
      }
    );

    // Parse response - format is "SUFFIX:COUNT\r\n"
    const hashes = response.data.split('\r\n');
    const found = hashes.find(line => line.startsWith(suffix));

    if (found) {
      const count = parseInt(found.split(':')[1]);
      return {
        breached: true,
        count: count,
        message: `This password has been found in ${count.toLocaleString()} data breaches`
      };
    }

    return {
      breached: false,
      count: 0,
      message: 'Password not found in known breaches'
    };

  } catch (error) {
    // If API fails, log error but don't block password (fail open for availability)
    logger.error('HaveIBeenPwned API error:', error.message)

    return {
      breached: false,
      count: 0,
      message: 'Could not verify against breach database',
      error: true
    };
  }
}

/**
 * Validate password against all security requirements
 *
 * @param {string} password
 * @param {Object} options - { userInputs: [], skipBreachCheck: false }
 * @returns {Promise<Object>} Validation result
 */
export async function validatePassword(password, options = {}) {
  const {
    userInputs = [],
    skipBreachCheck = false
  } = options;

  const errors = [];
  const warnings = [];
  const feedback = {
    valid: false,
    errors: [],
    warnings: [],
    suggestions: [],
    strength: null
  };

  // 1. Check minimum length
  if (password.length < PASSWORD_REQUIREMENTS.minLength) {
    errors.push(`Password must be at least ${PASSWORD_REQUIREMENTS.minLength} characters`);
  }

  // 2. Check complexity (3 of 4 character types)
  if (PASSWORD_REQUIREMENTS.requireComplexity) {
    const complexity = checkComplexity(password);

    if (!complexity.valid) {
      const typeNames = {
        lowercase: 'lowercase letters (a-z)',
        uppercase: 'uppercase letters (A-Z)',
        numbers: 'numbers (0-9)',
        special: 'special characters (!@#$%^&*)'
      };

      errors.push(
        `Password must contain at least 3 of the following: ${
          Object.values(typeNames).join(', ')
        }`
      );

      // Add specific suggestion
      if (complexity.count === 2) {
        const missing = complexity.missing.map(t => typeNames[t]);
        feedback.suggestions.push(`Add ${missing.join(' or ')}`);
      }
    }
  }

  // 3. Check common passwords
  if (PASSWORD_REQUIREMENTS.blockCommon && isCommonPassword(password)) {
    errors.push('This password is too common. Please choose a more unique password.');
  }

  // 4. Check password strength with zxcvbn
  const strength = checkStrength(password, userInputs);
  feedback.strength = strength;

  if (!strength.valid) {
    errors.push(
      `Password is too weak (strength: ${strength.score}/4). ` +
      `Estimated time to crack: ${strength.crackTime}`
    );
  }

  // Add zxcvbn warnings and suggestions
  if (strength.warning) {
    warnings.push(strength.warning);
  }

  if (strength.suggestions.length > 0) {
    feedback.suggestions.push(...strength.suggestions);
  }

  // 5. Check against breached passwords (HaveIBeenPwned)
  let breachCheck = null;
  if (PASSWORD_REQUIREMENTS.checkBreached && !skipBreachCheck) {
    breachCheck = await checkBreached(password);

    if (breachCheck.breached) {
      errors.push(
        `This password has been exposed in ${breachCheck.count.toLocaleString()} data breaches. ` +
        'Please choose a different password.'
      );
    } else if (breachCheck.error) {
      warnings.push('Could not verify password against breach database');
    }
  }

  // Build final result
  feedback.valid = errors.length === 0;
  feedback.errors = errors;
  feedback.warnings = warnings;
  feedback.breachCheck = breachCheck;

  return feedback;
}

/**
 * Generate a strong random password
 *
 * @param {number} length - Password length (default: 16)
 * @returns {string} Strong random password
 */
export function generateStrongPassword(length = 16) {
  const lowercase = 'abcdefghijklmnopqrstuvwxyz';
  const uppercase = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  const numbers = '0123456789';
  const special = '!@#$%^&*()_+-=[]{}|;:,.<>?';

  const allChars = lowercase + uppercase + numbers + special;

  // Ensure at least one of each type
  let password = '';
  password += lowercase[crypto.randomInt(lowercase.length)];
  password += uppercase[crypto.randomInt(uppercase.length)];
  password += numbers[crypto.randomInt(numbers.length)];
  password += special[crypto.randomInt(special.length)];

  // Fill the rest randomly
  for (let i = password.length; i < length; i++) {
    password += allChars[crypto.randomInt(allChars.length)];
  }

  // Shuffle the password
  return password.split('').sort(() => crypto.randomInt(3) - 1).join('');
}

export default {
  validatePassword,
  checkComplexity,
  checkStrength,
  checkBreached,
  isCommonPassword,
  generateStrongPassword,
  PASSWORD_REQUIREMENTS
};
