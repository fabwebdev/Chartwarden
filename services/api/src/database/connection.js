import { db, pool } from "../config/db.drizzle.js";

import { info, error, warn } from '../utils/logger.js';

const connectDB = async () => {
  try {
    // Check if DATABASE_URL exists
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL is not defined in environment variables");
    }

    info("Connecting to database...");

    // Test connection using the pool from db.drizzle.js
    const client = await pool.connect();
    await client.query("SELECT NOW()");
    client.release();

    info("Database connected successfully", { environment: process.env.NODE_ENV || "development" });

    return db;
  } catch (err) {
    error("Database connection failed", err);

    if (process.env.NODE_ENV === "production") {
      warn("Application will continue running without database connection. Please check DATABASE_URL.");
      return null;
    } else {
      error("Exiting in development mode. Please fix database connection.");
      process.exit(1);
    }
  }
};

// Graceful shutdown
const closeDB = async () => {
  if (pool) {
    await pool.end();
    info("Database connection closed");
  }
};

// Export functions and db instance
export default connectDB;
export { db, closeDB };
