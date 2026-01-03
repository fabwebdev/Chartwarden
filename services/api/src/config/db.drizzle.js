import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import dotenv from "dotenv";
import fs from "fs";

import { logger } from '../utils/logger.js';
import { tlsConfig } from './encryption.config.js';

// Load environment variables first
dotenv.config();

// Ensure DATABASE_URL is loaded
if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is not defined");
}

const isProduction = process.env.NODE_ENV === "production";

/**
 * Build SSL/TLS configuration for PostgreSQL
 *
 * HIPAA Requirement: 164.312(e)(2)(ii) - Encryption in transit
 * TLS 1.2+ is required for production connections
 */
function buildSSLConfig() {
  // Disable SSL in development unless explicitly enabled
  if (!isProduction && process.env.DB_SSL !== "true") {
    return false;
  }

  const sslConfig = {
    // SECURITY: Always verify certificates in production
    // Setting rejectUnauthorized: false is a security anti-pattern
    rejectUnauthorized: process.env.DB_SSL_REJECT_UNAUTHORIZED !== "false",

    // Minimum TLS version (TLS 1.2+ required for HIPAA)
    minVersion: "TLSv1.2",
  };

  // Load CA certificate if provided (for self-signed or custom CA)
  if (process.env.DB_SSL_CA) {
    try {
      sslConfig.ca = fs.readFileSync(process.env.DB_SSL_CA);
      logger.info("Loaded custom CA certificate for database connection");
    } catch (err) {
      logger.error("Failed to load DB_SSL_CA certificate", { error: err.message });
      // Continue without custom CA - will use system CA store
    }
  }

  // Load client certificate for mTLS (mutual TLS)
  if (process.env.DB_SSL_CERT && process.env.DB_SSL_KEY) {
    try {
      sslConfig.cert = fs.readFileSync(process.env.DB_SSL_CERT);
      sslConfig.key = fs.readFileSync(process.env.DB_SSL_KEY);
      logger.info("Loaded client certificate for mTLS database connection");
    } catch (err) {
      logger.error("Failed to load client certificates for mTLS", { error: err.message });
    }
  }

  return sslConfig;
}

// Create PostgreSQL connection pool using DATABASE_URL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: buildSSLConfig(),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  // Explicitly set password as string (fixes SASL error)
  ...(process.env.DB_PASSWORD && {
    password: String(process.env.DB_PASSWORD)
  })
});

// Test connection
pool.on("connect", () => {
  logger.info("✅ PostgreSQL pool connected")
});

pool.on("error", (err) => {
  logger.error("❌ PostgreSQL pool error:", err.message)
  logger.error("Check DATABASE_URL environment variable")
});

// Handle pool connection promise rejection
pool.on("remove", () => {
  logger.info("🔌 PostgreSQL connection removed from pool")
});

// Create Drizzle ORM instance
// NOTE: Schema with relations not passed here to avoid circular dependency issues
// Better Auth relations are defined in schemas/index.js but may not work with adapter
const db = drizzle(pool);

export { db, pool };
export default db;