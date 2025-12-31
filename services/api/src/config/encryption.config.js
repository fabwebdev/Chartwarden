import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

/**
 * Encryption Configuration for HIPAA-Compliant PHI Protection
 *
 * This module provides configuration for:
 * - AES-256-GCM encryption for data at rest (field-level encryption)
 * - Key derivation using PBKDF2
 * - Key rotation support
 *
 * HIPAA Requirements Addressed:
 * - 164.312(a)(2)(iv): Encryption of ePHI at rest
 * - 164.312(e)(2)(ii): Encryption of ePHI in transit
 *
 * SECURITY TICKET: encryption-implementation
 */

const isProduction = process.env.NODE_ENV === "production";

/**
 * Validate encryption key format and strength
 * Minimum 32 characters (256 bits) for AES-256
 */
function validateEncryptionKey(key, name) {
  if (!key) {
    if (isProduction) {
      throw new Error(
        `SECURITY ERROR: ${name} environment variable is required in production. ` +
        `Generate a secure key using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
      );
    }
    // Use a development-only default (NOT for production)
    return crypto.randomBytes(32).toString("hex");
  }

  // Key should be at least 32 bytes (64 hex characters) for AES-256
  if (key.length < 32) {
    throw new Error(
      `SECURITY ERROR: ${name} must be at least 32 characters. ` +
      `Generate a secure key using: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"`
    );
  }

  return key;
}

/**
 * Derive a 256-bit key from the master key using PBKDF2
 * This adds an extra layer of security and allows using any length master key
 */
function deriveKey(masterKey, salt) {
  return crypto.pbkdf2Sync(
    masterKey,
    salt,
    100000, // 100k iterations - OWASP recommended minimum
    32, // 256 bits for AES-256
    "sha512"
  );
}

// Master encryption key for PHI data
const MASTER_ENCRYPTION_KEY = validateEncryptionKey(
  process.env.ENCRYPTION_MASTER_KEY,
  "ENCRYPTION_MASTER_KEY"
);

// Salt for key derivation (should be unique per application)
const KEY_DERIVATION_SALT = process.env.ENCRYPTION_KEY_SALT ||
  (isProduction
    ? (() => { throw new Error("ENCRYPTION_KEY_SALT is required in production"); })()
    : "chartwarden-dev-salt-not-for-production");

// Previous encryption key for key rotation support
const PREVIOUS_ENCRYPTION_KEY = process.env.ENCRYPTION_PREVIOUS_KEY || null;

/**
 * Encryption Configuration Object
 */
const encryptionConfig = {
  // Algorithm configuration
  algorithm: "aes-256-gcm",

  // IV size for AES-GCM (96 bits / 12 bytes is recommended for GCM)
  ivLength: 12,

  // Authentication tag length for GCM
  authTagLength: 16,

  // Derived encryption key
  key: deriveKey(MASTER_ENCRYPTION_KEY, KEY_DERIVATION_SALT),

  // Previous key for rotation (if available)
  previousKey: PREVIOUS_ENCRYPTION_KEY
    ? deriveKey(PREVIOUS_ENCRYPTION_KEY, KEY_DERIVATION_SALT)
    : null,

  // Key version for tracking rotations
  keyVersion: parseInt(process.env.ENCRYPTION_KEY_VERSION || "1", 10),

  // Fields that should be encrypted (PHI/PII)
  // These fields contain sensitive patient information per HIPAA
  encryptedFields: {
    patients: [
      "ssn",                    // Social Security Number
      "medicare_beneficiary_id", // Medicare Beneficiary Identifier
      "medicaid_id",            // Medicaid ID
    ],
    users: [
      // User sensitive data (if needed)
    ],
  },

  // Searchable encrypted fields (use deterministic encryption for these)
  // Note: This trades some security for searchability
  searchableEncryptedFields: {
    patients: [
      "medical_record_number",  // Needs to be searchable
    ],
  },

  // Additional associated data for AEAD (authenticated encryption)
  // This binds the ciphertext to a specific context
  getAAD: (tableName, fieldName, recordId) => {
    return Buffer.from(`${tableName}:${fieldName}:${recordId || "new"}`);
  },
};

/**
 * TLS Configuration for Database and Service Connections
 */
const tlsConfig = {
  // PostgreSQL TLS Configuration
  postgres: {
    // Enable TLS in production
    enabled: isProduction || process.env.DB_SSL === "true",

    // TLS options
    options: isProduction ? {
      // Require valid certificate in production
      rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",

      // CA certificate (if using self-signed or custom CA)
      ca: process.env.DB_SSL_CA || undefined,

      // Client certificate (for mTLS)
      cert: process.env.DB_SSL_CERT || undefined,
      key: process.env.DB_SSL_KEY || undefined,

      // Minimum TLS version
      minVersion: "TLSv1.2",
    } : false,
  },

  // Redis TLS Configuration
  redis: {
    enabled: isProduction || process.env.REDIS_TLS === "true",

    options: isProduction ? {
      rejectUnauthorized: process.env.REDIS_TLS_REJECT_UNAUTHORIZED !== "false",
      ca: process.env.REDIS_TLS_CA || undefined,
      cert: process.env.REDIS_TLS_CERT || undefined,
      key: process.env.REDIS_TLS_KEY || undefined,
      minVersion: "TLSv1.2",
    } : undefined,
  },

  // HTTPS/TLS 1.3 Configuration for Fastify
  https: {
    // Enable HTTPS if certificates are provided
    enabled: !!(process.env.TLS_CERT_PATH && process.env.TLS_KEY_PATH),

    options: {
      // Certificate paths
      certPath: process.env.TLS_CERT_PATH,
      keyPath: process.env.TLS_KEY_PATH,

      // CA certificate for client verification (mTLS)
      caPath: process.env.TLS_CA_PATH,

      // Enforce TLS 1.2+ (TLS 1.3 preferred)
      minVersion: "TLSv1.2",

      // Prefer server cipher suites
      honorCipherOrder: true,

      // Modern cipher suites (TLS 1.3 ciphers are automatically included)
      ciphers: [
        "TLS_AES_256_GCM_SHA384",
        "TLS_CHACHA20_POLY1305_SHA256",
        "TLS_AES_128_GCM_SHA256",
        "ECDHE-ECDSA-AES256-GCM-SHA384",
        "ECDHE-RSA-AES256-GCM-SHA384",
        "ECDHE-ECDSA-CHACHA20-POLY1305",
        "ECDHE-RSA-CHACHA20-POLY1305",
        "ECDHE-ECDSA-AES128-GCM-SHA256",
        "ECDHE-RSA-AES128-GCM-SHA256",
      ].join(":"),

      // ECDH curves
      ecdhCurve: "X25519:P-256:P-384",
    },

    // HTTP to HTTPS redirect
    redirectHttp: isProduction && process.env.TLS_REDIRECT_HTTP === "true",
    redirectPort: parseInt(process.env.TLS_REDIRECT_PORT || "80", 10),
  },
};

export { encryptionConfig, tlsConfig };
export default encryptionConfig;
