import crypto from "crypto";
import { encryptionConfig } from "../config/encryption.config.js";
import { logger } from "../utils/logger.js";

/**
 * EncryptionService - HIPAA-Compliant Field-Level Encryption
 *
 * Provides AES-256-GCM encryption for PHI data at rest.
 * Uses authenticated encryption with associated data (AEAD) for integrity.
 *
 * Features:
 * - AES-256-GCM authenticated encryption
 * - Automatic key derivation using PBKDF2
 * - Key rotation support with version tracking
 * - Deterministic encryption for searchable fields
 * - Automatic IV generation for each encryption
 *
 * HIPAA Requirements:
 * - 164.312(a)(2)(iv): Encryption and decryption
 * - 164.312(c)(1): Integrity controls
 *
 * SECURITY TICKET: encryption-implementation
 */
class EncryptionService {
  constructor() {
    this.config = encryptionConfig;
    this.algorithm = this.config.algorithm;
    this.ivLength = this.config.ivLength;
    this.authTagLength = this.config.authTagLength;
    this.key = this.config.key;
    this.previousKey = this.config.previousKey;
    this.keyVersion = this.config.keyVersion;
  }

  /**
   * Encrypt a plaintext value using AES-256-GCM
   *
   * @param {string|Buffer} plaintext - The data to encrypt
   * @param {Buffer} [aad] - Additional authenticated data (optional)
   * @returns {string} Encrypted value in format: version:iv:authTag:ciphertext (base64)
   */
  encrypt(plaintext, aad = null) {
    if (plaintext === null || plaintext === undefined || plaintext === "") {
      return plaintext;
    }

    try {
      // Convert to buffer if string
      const plaintextBuffer = Buffer.isBuffer(plaintext)
        ? plaintext
        : Buffer.from(String(plaintext), "utf8");

      // Generate random IV for each encryption
      const iv = crypto.randomBytes(this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.authTagLength,
      });

      // Set AAD if provided
      if (aad) {
        cipher.setAAD(aad);
      }

      // Encrypt
      const ciphertext = Buffer.concat([
        cipher.update(plaintextBuffer),
        cipher.final(),
      ]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine components: version:iv:authTag:ciphertext
      // Using base64 encoding for storage efficiency
      const combined = Buffer.concat([
        Buffer.from([this.keyVersion]), // 1 byte version
        iv,                              // 12 bytes IV
        authTag,                         // 16 bytes auth tag
        ciphertext,                      // Variable length ciphertext
      ]);

      return combined.toString("base64");
    } catch (error) {
      logger.error("Encryption failed", { error: error.message });
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Decrypt a ciphertext value encrypted with AES-256-GCM
   *
   * @param {string} encryptedValue - The encrypted value (base64 format)
   * @param {Buffer} [aad] - Additional authenticated data (must match encryption AAD)
   * @returns {string} Decrypted plaintext
   */
  decrypt(encryptedValue, aad = null) {
    if (encryptedValue === null || encryptedValue === undefined || encryptedValue === "") {
      return encryptedValue;
    }

    try {
      // Decode from base64
      const combined = Buffer.from(encryptedValue, "base64");

      // Extract components
      const version = combined[0];
      const iv = combined.subarray(1, 1 + this.ivLength);
      const authTag = combined.subarray(
        1 + this.ivLength,
        1 + this.ivLength + this.authTagLength
      );
      const ciphertext = combined.subarray(1 + this.ivLength + this.authTagLength);

      // Determine which key to use based on version
      let key = this.key;
      if (version !== this.keyVersion && this.previousKey) {
        // Use previous key for old encrypted data
        key = this.previousKey;
        logger.debug("Using previous encryption key for decryption", { version });
      }

      // Create decipher
      const decipher = crypto.createDecipheriv(this.algorithm, key, iv, {
        authTagLength: this.authTagLength,
      });

      // Set auth tag
      decipher.setAuthTag(authTag);

      // Set AAD if provided
      if (aad) {
        decipher.setAAD(aad);
      }

      // Decrypt
      const plaintext = Buffer.concat([
        decipher.update(ciphertext),
        decipher.final(),
      ]);

      return plaintext.toString("utf8");
    } catch (error) {
      // Check if this looks like unencrypted data (for migration)
      if (!encryptedValue.includes(":") && !this.isBase64(encryptedValue)) {
        logger.warn("Data appears to be unencrypted, returning as-is");
        return encryptedValue;
      }

      logger.error("Decryption failed", { error: error.message });
      throw new Error("Failed to decrypt data - integrity check failed");
    }
  }

  /**
   * Check if a string is valid base64
   *
   * @param {string} str - String to check
   * @returns {boolean}
   */
  isBase64(str) {
    try {
      return Buffer.from(str, "base64").toString("base64") === str;
    } catch {
      return false;
    }
  }

  /**
   * Encrypt a value with deterministic encryption (for searchable fields)
   * Uses HMAC-based IV derivation for consistent ciphertext
   *
   * WARNING: This is less secure than random IV encryption.
   * Only use for fields that must be searchable.
   *
   * @param {string} plaintext - The data to encrypt
   * @param {string} fieldContext - Context for IV derivation (e.g., "patients:mrn")
   * @returns {string} Encrypted value
   */
  encryptDeterministic(plaintext, fieldContext) {
    if (plaintext === null || plaintext === undefined || plaintext === "") {
      return plaintext;
    }

    try {
      // Derive IV from HMAC of plaintext and context
      // This produces the same IV for the same plaintext, making it searchable
      const ivSource = crypto.createHmac("sha256", this.key)
        .update(`${fieldContext}:${plaintext}`)
        .digest();

      // Take first 12 bytes for IV
      const iv = ivSource.subarray(0, this.ivLength);

      // Create cipher
      const cipher = crypto.createCipheriv(this.algorithm, this.key, iv, {
        authTagLength: this.authTagLength,
      });

      // Encrypt
      const ciphertext = Buffer.concat([
        cipher.update(Buffer.from(plaintext, "utf8")),
        cipher.final(),
      ]);

      // Get authentication tag
      const authTag = cipher.getAuthTag();

      // Combine components with "d" prefix to indicate deterministic
      const combined = Buffer.concat([
        Buffer.from([0x64, this.keyVersion]), // "d" + version
        iv,
        authTag,
        ciphertext,
      ]);

      return combined.toString("base64");
    } catch (error) {
      logger.error("Deterministic encryption failed", { error: error.message });
      throw new Error("Failed to encrypt data");
    }
  }

  /**
   * Encrypt sensitive fields in an object
   *
   * @param {string} tableName - The table name (for field list lookup)
   * @param {object} data - The data object with fields to encrypt
   * @param {string|number} [recordId] - Record ID for AAD generation
   * @returns {object} Data object with encrypted fields
   */
  encryptFields(tableName, data, recordId = null) {
    if (!data || typeof data !== "object") {
      return data;
    }

    const encryptedFields = this.config.encryptedFields[tableName] || [];
    const searchableFields = this.config.searchableEncryptedFields[tableName] || [];
    const result = { ...data };

    // Encrypt regular fields with random IV
    for (const field of encryptedFields) {
      if (result[field] !== undefined && result[field] !== null) {
        const aad = this.config.getAAD(tableName, field, recordId);
        result[field] = this.encrypt(result[field], aad);
      }
    }

    // Encrypt searchable fields with deterministic encryption
    for (const field of searchableFields) {
      if (result[field] !== undefined && result[field] !== null) {
        result[field] = this.encryptDeterministic(
          result[field],
          `${tableName}:${field}`
        );
      }
    }

    return result;
  }

  /**
   * Decrypt sensitive fields in an object
   *
   * @param {string} tableName - The table name (for field list lookup)
   * @param {object} data - The data object with fields to decrypt
   * @param {string|number} [recordId] - Record ID for AAD verification
   * @returns {object} Data object with decrypted fields
   */
  decryptFields(tableName, data, recordId = null) {
    if (!data || typeof data !== "object") {
      return data;
    }

    const encryptedFields = this.config.encryptedFields[tableName] || [];
    const searchableFields = this.config.searchableEncryptedFields[tableName] || [];
    const result = { ...data };

    // Decrypt regular fields
    for (const field of encryptedFields) {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          const aad = this.config.getAAD(tableName, field, recordId);
          result[field] = this.decrypt(result[field], aad);
        } catch (error) {
          logger.warn(`Failed to decrypt field ${field}`, { error: error.message });
          // Leave field as-is if decryption fails (might be unencrypted legacy data)
        }
      }
    }

    // Decrypt searchable fields
    for (const field of searchableFields) {
      if (result[field] !== undefined && result[field] !== null) {
        try {
          result[field] = this.decrypt(result[field]);
        } catch (error) {
          logger.warn(`Failed to decrypt searchable field ${field}`, { error: error.message });
        }
      }
    }

    return result;
  }

  /**
   * Encrypt a value for searching (deterministic)
   * Use this to create search tokens for encrypted fields
   *
   * @param {string} tableName - The table name
   * @param {string} fieldName - The field name
   * @param {string} searchValue - The value to search for
   * @returns {string} Encrypted search token
   */
  createSearchToken(tableName, fieldName, searchValue) {
    return this.encryptDeterministic(searchValue, `${tableName}:${fieldName}`);
  }

  /**
   * Hash a value for blind indexing (one-way, non-reversible)
   * Use for equality searches without revealing the original value
   *
   * @param {string} value - The value to hash
   * @param {string} context - Context for the hash (e.g., "patients:ssn")
   * @returns {string} Base64-encoded hash
   */
  createBlindIndex(value, context) {
    if (!value) return null;

    return crypto.createHmac("sha256", this.key)
      .update(`${context}:${value}`)
      .digest("base64");
  }

  /**
   * Re-encrypt data with the current key (for key rotation)
   *
   * @param {string} encryptedValue - Value encrypted with previous key
   * @param {Buffer} [oldAad] - AAD used during original encryption
   * @param {Buffer} [newAad] - AAD for new encryption (optional, defaults to oldAad)
   * @returns {string} Re-encrypted value with current key
   */
  reencrypt(encryptedValue, oldAad = null, newAad = null) {
    const plaintext = this.decrypt(encryptedValue, oldAad);
    return this.encrypt(plaintext, newAad || oldAad);
  }

  /**
   * Generate a secure random encryption key
   *
   * @returns {string} 64-character hex string (256 bits)
   */
  static generateKey() {
    return crypto.randomBytes(32).toString("hex");
  }

  /**
   * Check if a value appears to be encrypted
   *
   * @param {string} value - Value to check
   * @returns {boolean}
   */
  isEncrypted(value) {
    if (!value || typeof value !== "string") {
      return false;
    }

    // Check if it's a valid base64 string of expected minimum length
    // Minimum length: 1 (version) + 12 (IV) + 16 (authTag) + 1 (min ciphertext) = 30 bytes = 40 base64 chars
    if (value.length < 40) {
      return false;
    }

    try {
      const decoded = Buffer.from(value, "base64");
      // Check version byte is valid
      const version = decoded[0];
      return version === this.keyVersion || version === 0x64; // Regular or deterministic
    } catch {
      return false;
    }
  }
}

// Export singleton instance
const encryptionService = new EncryptionService();

export { EncryptionService, encryptionService };
export default encryptionService;
