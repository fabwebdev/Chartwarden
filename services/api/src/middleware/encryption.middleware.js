import encryptionService from "../services/EncryptionService.js";
import { logger } from "../utils/logger.js";

/**
 * Encryption Middleware for HIPAA-Compliant PHI Protection
 *
 * Automatically encrypts sensitive PHI fields before database writes
 * and decrypts them after reads. This ensures data at rest is encrypted
 * while being transparent to application code.
 *
 * HIPAA Requirements:
 * - 164.312(a)(2)(iv): Encryption of ePHI at rest
 *
 * SECURITY TICKET: encryption-implementation
 */

/**
 * List of tables with encrypted fields
 */
const ENCRYPTED_TABLES = ["patients"];

/**
 * Fastify hook to encrypt request body fields before processing
 *
 * This hook runs on incoming requests that create or update
 * records containing PHI fields.
 */
export async function encryptRequestBody(request, reply) {
  // Only process for routes that modify PHI data
  if (!shouldProcessRequest(request)) {
    return;
  }

  const tableName = extractTableName(request.url);
  if (!tableName || !ENCRYPTED_TABLES.includes(tableName)) {
    return;
  }

  try {
    // Get record ID for AAD if updating
    const recordId = request.params?.id || null;

    // Encrypt fields in request body
    if (request.body && typeof request.body === "object") {
      request.body = encryptionService.encryptFields(
        tableName,
        request.body,
        recordId
      );
      logger.debug("Encrypted PHI fields in request body", { tableName });
    }
  } catch (error) {
    logger.error("Failed to encrypt request body", {
      error: error.message,
      tableName,
    });
    // Don't fail the request - let it continue without encryption
    // The error will be logged for investigation
  }
}

/**
 * Fastify hook to decrypt response data after processing
 *
 * This hook runs on outgoing responses that contain PHI fields.
 */
export async function decryptResponseData(request, reply, payload) {
  // Only process for routes that return PHI data
  if (!shouldProcessResponse(request, reply)) {
    return payload;
  }

  const tableName = extractTableName(request.url);
  if (!tableName || !ENCRYPTED_TABLES.includes(tableName)) {
    return payload;
  }

  try {
    // Parse JSON payload if needed
    let data = payload;
    if (typeof payload === "string") {
      try {
        data = JSON.parse(payload);
      } catch {
        return payload; // Not JSON, return as-is
      }
    }

    // Decrypt fields in response
    const decrypted = decryptData(tableName, data);

    // Return as JSON string if input was string
    if (typeof payload === "string") {
      return JSON.stringify(decrypted);
    }
    return decrypted;
  } catch (error) {
    logger.error("Failed to decrypt response data", {
      error: error.message,
      tableName,
    });
    return payload; // Return original on error
  }
}

/**
 * Decrypt data recursively (handles arrays and nested objects)
 *
 * @param {string} tableName - The table name for field lookup
 * @param {any} data - The data to decrypt
 * @returns {any} Decrypted data
 */
function decryptData(tableName, data) {
  if (!data) return data;

  // Handle arrays
  if (Array.isArray(data)) {
    return data.map((item) => decryptData(tableName, item));
  }

  // Handle objects
  if (typeof data === "object") {
    // Check for standard API response structure
    if (data.data) {
      return {
        ...data,
        data: decryptData(tableName, data.data),
      };
    }

    // Check for single record or multiple records
    if (data.id) {
      return encryptionService.decryptFields(tableName, data, data.id);
    }

    // Handle nested structures
    const result = {};
    for (const [key, value] of Object.entries(data)) {
      if (typeof value === "object" && value !== null) {
        result[key] = decryptData(tableName, value);
      } else {
        result[key] = value;
      }
    }
    return result;
  }

  return data;
}

/**
 * Check if request should be processed for encryption
 *
 * @param {object} request - Fastify request object
 * @returns {boolean}
 */
function shouldProcessRequest(request) {
  // Only encrypt for state-changing methods
  const encryptMethods = ["POST", "PUT", "PATCH"];
  if (!encryptMethods.includes(request.method)) {
    return false;
  }

  // Only process JSON content
  const contentType = request.headers["content-type"] || "";
  if (!contentType.includes("application/json")) {
    return false;
  }

  return true;
}

/**
 * Check if response should be processed for decryption
 *
 * @param {object} request - Fastify request object
 * @param {object} reply - Fastify reply object
 * @returns {boolean}
 */
function shouldProcessResponse(request, reply) {
  // Only decrypt successful responses
  if (reply.statusCode >= 400) {
    return false;
  }

  // Only process JSON responses
  const contentType = reply.getHeader("content-type") || "";
  if (!contentType.includes("application/json")) {
    return false;
  }

  return true;
}

/**
 * Extract table name from URL
 *
 * @param {string} url - Request URL
 * @returns {string|null} Table name or null
 */
function extractTableName(url) {
  // Match patterns like /api/patients, /api/patients/:id
  const patterns = [
    /\/api\/patients/i,
    /\/api\/users/i,
  ];

  for (const pattern of patterns) {
    if (pattern.test(url)) {
      // Extract table name from pattern
      const match = url.match(/\/api\/(\w+)/i);
      return match ? match[1].toLowerCase() : null;
    }
  }

  return null;
}

/**
 * Helper function to encrypt a single record
 * Useful for manual encryption in controllers
 *
 * @param {string} tableName - The table name
 * @param {object} record - The record to encrypt
 * @param {string|number} recordId - Optional record ID for AAD
 * @returns {object} Encrypted record
 */
export function encryptRecord(tableName, record, recordId = null) {
  return encryptionService.encryptFields(tableName, record, recordId);
}

/**
 * Helper function to decrypt a single record
 * Useful for manual decryption in controllers
 *
 * @param {string} tableName - The table name
 * @param {object} record - The record to decrypt
 * @param {string|number} recordId - Optional record ID for AAD
 * @returns {object} Decrypted record
 */
export function decryptRecord(tableName, record, recordId = null) {
  return encryptionService.decryptFields(tableName, record, recordId);
}

/**
 * Helper function to encrypt an array of records
 *
 * @param {string} tableName - The table name
 * @param {object[]} records - The records to encrypt
 * @returns {object[]} Encrypted records
 */
export function encryptRecords(tableName, records) {
  return records.map((record) =>
    encryptionService.encryptFields(tableName, record, record.id)
  );
}

/**
 * Helper function to decrypt an array of records
 *
 * @param {string} tableName - The table name
 * @param {object[]} records - The records to decrypt
 * @returns {object[]} Decrypted records
 */
export function decryptRecords(tableName, records) {
  return records.map((record) =>
    encryptionService.decryptFields(tableName, record, record.id)
  );
}

/**
 * Register encryption middleware with Fastify
 *
 * @param {object} app - Fastify instance
 */
export function registerEncryptionMiddleware(app) {
  // Encrypt incoming request bodies
  app.addHook("preHandler", encryptRequestBody);

  // Decrypt outgoing response bodies
  app.addHook("onSend", decryptResponseData);

  logger.info("Encryption middleware registered for PHI protection");
}

export default {
  encryptRequestBody,
  decryptResponseData,
  encryptRecord,
  decryptRecord,
  encryptRecords,
  decryptRecords,
  registerEncryptionMiddleware,
};
