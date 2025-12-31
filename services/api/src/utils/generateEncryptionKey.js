#!/usr/bin/env node

/**
 * Encryption Key Generator
 *
 * Generates secure encryption keys for HIPAA-compliant PHI encryption.
 * Use this script to generate keys for production deployment.
 *
 * Usage:
 *   node src/utils/generateEncryptionKey.js
 *   node src/utils/generateEncryptionKey.js --env  # Output as .env format
 *
 * SECURITY TICKET: encryption-implementation
 */

import crypto from "crypto";

/**
 * Generate a cryptographically secure encryption key
 *
 * @param {number} bytes - Number of bytes (default: 32 for AES-256)
 * @returns {string} Hex-encoded key
 */
function generateKey(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Generate a secure salt for key derivation
 *
 * @param {number} bytes - Number of bytes (default: 16)
 * @returns {string} Hex-encoded salt
 */
function generateSalt(bytes = 16) {
  return crypto.randomBytes(bytes).toString("hex");
}

/**
 * Generate all required encryption keys and salts
 *
 * @returns {object} Object containing all generated values
 */
function generateAllKeys() {
  return {
    masterKey: generateKey(32),      // 256-bit master key
    salt: generateSalt(16),          // 128-bit salt
    version: 1,                       // Initial key version
  };
}

/**
 * Format keys as .env variables
 *
 * @param {object} keys - Generated keys object
 * @returns {string} Formatted .env content
 */
function formatAsEnv(keys) {
  return `# ===========================================
# Encryption Keys - Generated ${new Date().toISOString()}
# ===========================================
# IMPORTANT: Store these securely and never commit to version control!
# Use a secrets manager (AWS Secrets Manager, HashiCorp Vault, etc.)

# Master encryption key for PHI data (256-bit / 64 hex chars)
ENCRYPTION_MASTER_KEY=${keys.masterKey}

# Key derivation salt (128-bit / 32 hex chars)
ENCRYPTION_KEY_SALT=${keys.salt}

# Key version (increment when rotating keys)
ENCRYPTION_KEY_VERSION=${keys.version}
`;
}

/**
 * Format keys as JSON
 *
 * @param {object} keys - Generated keys object
 * @returns {string} Formatted JSON
 */
function formatAsJson(keys) {
  return JSON.stringify({
    generated: new Date().toISOString(),
    keys: {
      ENCRYPTION_MASTER_KEY: keys.masterKey,
      ENCRYPTION_KEY_SALT: keys.salt,
      ENCRYPTION_KEY_VERSION: keys.version,
    },
    note: "Store these securely and never commit to version control!",
  }, null, 2);
}

// Main execution
const args = process.argv.slice(2);
const outputFormat = args.includes("--env") ? "env"
  : args.includes("--json") ? "json"
  : "plain";

const keys = generateAllKeys();

console.log("\n🔐 Chartwarden Encryption Key Generator\n");
console.log("─".repeat(50));

if (outputFormat === "env") {
  console.log(formatAsEnv(keys));
} else if (outputFormat === "json") {
  console.log(formatAsJson(keys));
} else {
  console.log("Generated Encryption Keys:");
  console.log("─".repeat(50));
  console.log(`ENCRYPTION_MASTER_KEY: ${keys.masterKey}`);
  console.log(`ENCRYPTION_KEY_SALT:   ${keys.salt}`);
  console.log(`ENCRYPTION_KEY_VERSION: ${keys.version}`);
  console.log("─".repeat(50));
  console.log("\n⚠️  IMPORTANT:");
  console.log("   - Store these keys securely (use a secrets manager)");
  console.log("   - Never commit keys to version control");
  console.log("   - Back up keys securely (data will be unrecoverable without them)");
  console.log("\nUsage:");
  console.log("   node generateEncryptionKey.js --env   # Output as .env format");
  console.log("   node generateEncryptionKey.js --json  # Output as JSON");
}

console.log("\n");

export { generateKey, generateSalt, generateAllKeys, formatAsEnv, formatAsJson };
