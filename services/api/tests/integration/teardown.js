/**
 * Integration Test Teardown
 * Global teardown configuration for all integration tests
 *
 * This file handles:
 * - Final cleanup of test database
 * - Closing all database connections
 * - Cleaning up temporary files
 * - Ensuring no hanging processes or handles
 */

/**
 * Global teardown function
 * Called once after all test suites have finished
 */
export default async function globalTeardown() {
  try {
    console.log('\n🧹 Running global test teardown...');

    // Close database pool if it exists
    try {
      const { pool } = await import('../../src/config/db.drizzle.js');
      if (pool) {
        await pool.end();
        console.log('✅ Database pool closed');
      }
    } catch (err) {
      // Pool may not be initialized, that's okay
      console.log('ℹ️  No database pool to close');
    }

    // Force close any remaining database connections
    try {
      const { closeDB } = await import('../../src/database/connection.js');
      await closeDB();
      console.log('✅ Database connections closed');
    } catch (err) {
      // Connection may not exist, that's okay
      console.log('ℹ️  No database connections to close');
    }

    // Clean up any temporary files or resources
    // (Add any additional cleanup logic here as needed)

    console.log('✅ Global teardown completed\n');
  } catch (err) {
    console.error('❌ Error during global teardown:', err);
    // Don't throw - allow tests to complete even if teardown fails
  }
}
