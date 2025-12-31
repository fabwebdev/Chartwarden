import fs from "fs";
import path from "path";
import { logger } from "../utils/logger.js";

/**
 * TLS Configuration for Fastify HTTPS Server
 *
 * Provides TLS 1.2/1.3 configuration for the Fastify server.
 * This enables end-to-end encryption for data in transit.
 *
 * HIPAA Requirements:
 * - 164.312(e)(2)(ii): Encryption of ePHI in transit
 *
 * Usage:
 * 1. Set TLS_CERT_PATH and TLS_KEY_PATH environment variables
 * 2. Optionally set TLS_CA_PATH for client certificate verification (mTLS)
 * 3. The server will automatically use HTTPS when certificates are configured
 *
 * SECURITY TICKET: encryption-implementation
 */

const isProduction = process.env.NODE_ENV === "production";

/**
 * Load a certificate file safely
 *
 * @param {string} filePath - Path to the certificate file
 * @param {string} name - Name for logging purposes
 * @returns {Buffer|null} Certificate contents or null if not found
 */
function loadCertFile(filePath, name) {
  if (!filePath) {
    return null;
  }

  try {
    const absolutePath = path.isAbsolute(filePath)
      ? filePath
      : path.resolve(process.cwd(), filePath);

    if (!fs.existsSync(absolutePath)) {
      logger.warn(`${name} file not found`, { path: absolutePath });
      return null;
    }

    const content = fs.readFileSync(absolutePath);
    logger.info(`Loaded ${name}`, { path: absolutePath });
    return content;
  } catch (error) {
    logger.error(`Failed to load ${name}`, {
      path: filePath,
      error: error.message,
    });
    return null;
  }
}

/**
 * Modern TLS cipher suites for TLS 1.2 and 1.3
 *
 * TLS 1.3 ciphers (automatically negotiated when available):
 * - TLS_AES_256_GCM_SHA384
 * - TLS_CHACHA20_POLY1305_SHA256
 * - TLS_AES_128_GCM_SHA256
 *
 * TLS 1.2 ciphers (fallback):
 * - ECDHE with AES-GCM (perfect forward secrecy)
 */
const MODERN_CIPHERS = [
  // TLS 1.3 cipher suites (order doesn't matter, automatically negotiated)
  "TLS_AES_256_GCM_SHA384",
  "TLS_CHACHA20_POLY1305_SHA256",
  "TLS_AES_128_GCM_SHA256",

  // TLS 1.2 cipher suites (order matters - prefer ECDSA)
  "ECDHE-ECDSA-AES256-GCM-SHA384",
  "ECDHE-RSA-AES256-GCM-SHA384",
  "ECDHE-ECDSA-CHACHA20-POLY1305",
  "ECDHE-RSA-CHACHA20-POLY1305",
  "ECDHE-ECDSA-AES128-GCM-SHA256",
  "ECDHE-RSA-AES128-GCM-SHA256",
].join(":");

/**
 * Build Fastify HTTPS options
 *
 * @returns {object|null} HTTPS options for Fastify or null if TLS is disabled
 */
function buildHttpsOptions() {
  const certPath = process.env.TLS_CERT_PATH;
  const keyPath = process.env.TLS_KEY_PATH;

  // TLS is optional - if no certificates are provided, skip HTTPS
  if (!certPath || !keyPath) {
    if (isProduction) {
      logger.warn(
        "SECURITY WARNING: TLS certificates not configured. " +
        "Set TLS_CERT_PATH and TLS_KEY_PATH for HTTPS support. " +
        "Ensure a reverse proxy (nginx, Render, etc.) provides TLS termination."
      );
    }
    return null;
  }

  const cert = loadCertFile(certPath, "TLS certificate");
  const key = loadCertFile(keyPath, "TLS private key");

  if (!cert || !key) {
    logger.error("TLS certificates configured but failed to load");
    return null;
  }

  const httpsOptions = {
    // Certificate and private key
    cert,
    key,

    // Minimum TLS version (TLS 1.2 required for HIPAA compliance)
    minVersion: "TLSv1.2",

    // Maximum TLS version (allow TLS 1.3 for best security)
    maxVersion: "TLSv1.3",

    // Prefer server's cipher order
    honorCipherOrder: true,

    // Modern cipher suites
    ciphers: MODERN_CIPHERS,

    // ECDH curves (X25519 is fastest and most secure)
    ecdhCurve: "X25519:P-256:P-384",

    // Enable session tickets for performance
    // Note: Disable if key rotation is a concern
    sessionTimeout: 300, // 5 minutes

    // Disable insecure renegotiation
    secureOptions:
      // eslint-disable-next-line no-bitwise
      require("constants").SSL_OP_NO_SSLv2 |
      require("constants").SSL_OP_NO_SSLv3 |
      require("constants").SSL_OP_NO_TLSv1 |
      require("constants").SSL_OP_NO_TLSv1_1 |
      require("constants").SSL_OP_NO_RENEGOTIATION,
  };

  // Load CA certificate for client certificate verification (mTLS)
  const caPath = process.env.TLS_CA_PATH;
  if (caPath) {
    const ca = loadCertFile(caPath, "TLS CA certificate");
    if (ca) {
      httpsOptions.ca = ca;
      httpsOptions.requestCert = true;
      httpsOptions.rejectUnauthorized = true;
      logger.info("mTLS enabled - client certificates will be verified");
    }
  }

  // Load certificate chain (if provided separately)
  const chainPath = process.env.TLS_CHAIN_PATH;
  if (chainPath) {
    const chain = loadCertFile(chainPath, "TLS certificate chain");
    if (chain) {
      // Append chain to cert
      httpsOptions.cert = Buffer.concat([httpsOptions.cert, chain]);
    }
  }

  // Load passphrase for encrypted private key
  if (process.env.TLS_KEY_PASSPHRASE) {
    httpsOptions.passphrase = process.env.TLS_KEY_PASSPHRASE;
  }

  return httpsOptions;
}

/**
 * Get Fastify server options with HTTPS if configured
 *
 * @param {object} baseOptions - Base Fastify options
 * @returns {object} Fastify options with HTTPS if available
 */
function getFastifyServerOptions(baseOptions = {}) {
  const httpsOptions = buildHttpsOptions();

  if (httpsOptions) {
    return {
      ...baseOptions,
      https: httpsOptions,
    };
  }

  return baseOptions;
}

/**
 * TLS Configuration object for export
 */
const tlsServerConfig = {
  // Whether HTTPS is enabled
  enabled: !!(process.env.TLS_CERT_PATH && process.env.TLS_KEY_PATH),

  // HTTPS options builder
  buildHttpsOptions,

  // Fastify options helper
  getFastifyServerOptions,

  // HTTP to HTTPS redirect configuration
  redirect: {
    enabled: isProduction && process.env.TLS_REDIRECT_HTTP === "true",
    httpPort: parseInt(process.env.TLS_REDIRECT_PORT || "80", 10),
    httpsPort: parseInt(process.env.PORT || "3001", 10),
  },

  // Cipher information for logging
  ciphers: MODERN_CIPHERS,
};

export { tlsServerConfig, buildHttpsOptions, getFastifyServerOptions };
export default tlsServerConfig;
