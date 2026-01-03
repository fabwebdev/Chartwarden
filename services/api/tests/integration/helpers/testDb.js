/**
 * Test Database Utilities
 *
 * Provides helper functions for integration tests:
 * - Database connection management
 * - Test data fixtures and factories
 * - Database cleanup and isolation
 * - State verification utilities
 *
 * HIPAA Compliance:
 * - Uses isolated test database
 * - Ensures complete cleanup between tests
 * - Generates realistic but fake PHI data
 */

import { faker } from '@faker-js/faker';
import bcrypt from 'bcryptjs';
import { nanoid } from 'nanoid';
import { sql } from 'drizzle-orm';
import { db, pool } from '../../../src/config/db.drizzle.js';
import { users } from '../../../src/db/schemas/user.schema.js';
import { accounts } from '../../../src/db/schemas/account.schema.js';
import { sessions } from '../../../src/db/schemas/session.schema.js';
import { patients } from '../../../src/db/schemas/patient.schema.js';

/**
 * Initialize test database
 * Ensures database is ready for testing
 */
export async function initTestDatabase() {
  try {
    // Test connection
    const client = await pool.connect();
    await client.query('SELECT NOW()');
    client.release();

    return { success: true, db };
  } catch (error) {
    console.error('Failed to initialize test database:', error);
    throw error;
  }
}

/**
 * Clean up all test data from database
 * Truncates all tables in reverse dependency order
 *
 * @param {Object} options - Cleanup options
 * @param {boolean} options.cascade - Use CASCADE when truncating (default: true)
 */
export async function cleanupDatabase(options = { cascade: true }) {
  try {
    const client = await pool.connect();

    try {
      // Disable foreign key checks temporarily for faster cleanup
      await client.query('SET session_replication_role = replica;');

      // Get all table names from the database
      const result = await client.query(`
        SELECT tablename
        FROM pg_tables
        WHERE schemaname = 'public'
        AND tablename NOT LIKE 'drizzle%'
        ORDER BY tablename;
      `);

      const tables = result.rows.map(row => row.tablename);

      // Truncate all tables
      if (tables.length > 0) {
        const cascadeOption = options.cascade ? 'CASCADE' : '';
        const truncateQuery = `TRUNCATE TABLE ${tables.map(t => `"${t}"`).join(', ')} ${cascadeOption};`;
        await client.query(truncateQuery);
      }

      // Re-enable foreign key checks
      await client.query('SET session_replication_role = DEFAULT;');

      return { success: true, tablesCleared: tables.length };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Database cleanup failed:', error);
    throw error;
  }
}

/**
 * Clean specific tables
 *
 * @param {string[]} tableNames - Array of table names to clean
 * @param {Object} options - Cleanup options
 */
export async function cleanupTables(tableNames, options = { cascade: true }) {
  try {
    const client = await pool.connect();

    try {
      const cascadeOption = options.cascade ? 'CASCADE' : '';

      for (const tableName of tableNames) {
        await client.query(`TRUNCATE TABLE "${tableName}" ${cascadeOption};`);
      }

      return { success: true, tablesCleared: tableNames.length };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to cleanup tables:', error);
    throw error;
  }
}

/**
 * Reset database sequences
 * Resets auto-increment sequences for all tables
 */
export async function resetSequences() {
  try {
    const client = await pool.connect();

    try {
      const result = await client.query(`
        SELECT sequence_name
        FROM information_schema.sequences
        WHERE sequence_schema = 'public';
      `);

      for (const row of result.rows) {
        await client.query(`ALTER SEQUENCE "${row.sequence_name}" RESTART WITH 1;`);
      }

      return { success: true, sequencesReset: result.rows.length };
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Failed to reset sequences:', error);
    throw error;
  }
}

/**
 * Create test user fixture
 *
 * @param {Object} overrides - Properties to override default values
 * @returns {Promise<Object>} Created user object
 */
export async function createTestUser(overrides = {}) {
  const defaultPassword = 'TestPassword123!';
  const hashedPassword = await bcrypt.hash(defaultPassword, 10);

  const userData = {
    id: nanoid(),
    name: faker.person.fullName(),
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: faker.internet.email().toLowerCase(),
    emailVerified: true,
    password: hashedPassword,
    role: 'staff',
    is_active: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  const [user] = await db.insert(users).values(userData).returning();

  // Return user with plaintext password for testing
  return {
    ...user,
    plainPassword: defaultPassword,
  };
}

/**
 * Create multiple test users
 *
 * @param {number} count - Number of users to create
 * @param {Object} overrides - Properties to override for all users
 * @returns {Promise<Array>} Array of created users
 */
export async function createTestUsers(count, overrides = {}) {
  const users = [];

  for (let i = 0; i < count; i++) {
    const user = await createTestUser(overrides);
    users.push(user);
  }

  return users;
}

/**
 * Create test user with specific role
 *
 * @param {string} role - User role (admin, nurse, doctor, staff, etc.)
 * @param {Object} overrides - Additional properties to override
 * @returns {Promise<Object>} Created user
 */
export async function createTestUserWithRole(role, overrides = {}) {
  return createTestUser({ role, ...overrides });
}

/**
 * Create admin user for testing
 *
 * @param {Object} overrides - Additional properties to override
 * @returns {Promise<Object>} Created admin user
 */
export async function createAdminUser(overrides = {}) {
  return createTestUserWithRole('admin', overrides);
}

/**
 * Create test session for user
 *
 * @param {string} userId - User ID to create session for
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created session
 */
export async function createTestSession(userId, overrides = {}) {
  const sessionData = {
    id: nanoid(),
    userId,
    token: nanoid(32),
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
    ipAddress: faker.internet.ip(),
    userAgent: faker.internet.userAgent(),
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  const [session] = await db.insert(sessions).values(sessionData).returning();
  return session;
}

/**
 * Create test patient fixture
 *
 * @param {Object} overrides - Properties to override default values
 * @returns {Promise<Object>} Created patient object
 */
export async function createTestPatient(overrides = {}) {
  const patientData = {
    first_name: faker.person.firstName(),
    last_name: faker.person.lastName(),
    middle_name: faker.person.middleName(),
    date_of_birth: faker.date.birthdate({ min: 60, max: 100, mode: 'age' }).toISOString().split('T')[0],
    gender: faker.helpers.arrayElement(['Male', 'Female', 'Other']),
    marital_status: faker.helpers.arrayElement(['Single', 'Married', 'Divorced', 'Widowed']),
    preferred_language: 'English',
    email: faker.internet.email().toLowerCase(),
    primary_phone: faker.phone.number('###-###-####'),
    medicare_beneficiary_id: faker.string.alphanumeric(11).toUpperCase(),
    medical_record_number: faker.string.alphanumeric(10).toUpperCase(),
    emergency_contact_name: faker.person.fullName(),
    emergency_contact_phone: faker.phone.number('###-###-####'),
    emergency_contact_relationship: faker.helpers.arrayElement(['Spouse', 'Child', 'Sibling', 'Friend']),
    status: 'active',
    oxygen_dependent: 0,
    patient_consents: 1,
    hipaa_received: 1,
    veterans_status: 0,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  const [patient] = await db.insert(patients).values(patientData).returning();
  return patient;
}

/**
 * Create multiple test patients
 *
 * @param {number} count - Number of patients to create
 * @param {Object} overrides - Properties to override for all patients
 * @returns {Promise<Array>} Array of created patients
 */
export async function createTestPatients(count, overrides = {}) {
  const patientList = [];

  for (let i = 0; i < count; i++) {
    const patient = await createTestPatient(overrides);
    patientList.push(patient);
  }

  return patientList;
}

/**
 * Create test account for user
 *
 * @param {string} userId - User ID
 * @param {Object} overrides - Properties to override
 * @returns {Promise<Object>} Created account
 */
export async function createTestAccount(userId, overrides = {}) {
  const accountData = {
    id: nanoid(),
    userId,
    accountId: nanoid(),
    providerId: 'credential',
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };

  const [account] = await db.insert(accounts).values(accountData).returning();
  return account;
}

/**
 * Get table row count
 *
 * @param {string} tableName - Name of the table
 * @returns {Promise<number>} Row count
 */
export async function getTableCount(tableName) {
  try {
    const result = await db.execute(sql`SELECT COUNT(*) as count FROM ${sql.raw(tableName)}`);
    return parseInt(result.rows[0].count, 10);
  } catch (error) {
    console.error(`Failed to get count for table ${tableName}:`, error);
    return 0;
  }
}

/**
 * Verify table is empty
 *
 * @param {string} tableName - Table name to check
 * @returns {Promise<boolean>} True if table is empty
 */
export async function isTableEmpty(tableName) {
  const count = await getTableCount(tableName);
  return count === 0;
}

/**
 * Get all records from a table
 *
 * @param {string} tableName - Table name
 * @returns {Promise<Array>} All records
 */
export async function getAllRecords(tableName) {
  try {
    const result = await db.execute(sql`SELECT * FROM ${sql.raw(tableName)}`);
    return result.rows;
  } catch (error) {
    console.error(`Failed to get records from ${tableName}:`, error);
    return [];
  }
}

/**
 * Execute raw SQL query (use with caution in tests)
 *
 * @param {string} query - SQL query to execute
 * @param {Array} params - Query parameters
 * @returns {Promise<Object>} Query result
 */
export async function executeQuery(query, params = []) {
  const client = await pool.connect();

  try {
    const result = await client.query(query, params);
    return result;
  } finally {
    client.release();
  }
}

/**
 * Wait for database operation to complete
 * Useful for testing async operations
 *
 * @param {number} ms - Milliseconds to wait
 * @returns {Promise<void>}
 */
export function waitFor(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Create a transaction for testing
 * Automatically rolls back after test
 *
 * @param {Function} callback - Test function to run in transaction
 * @returns {Promise<void>}
 */
export async function withTransaction(callback) {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    await callback(client);
    await client.query('ROLLBACK');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Seed database with test data
 * Creates a complete test environment
 *
 * @param {Object} options - Seeding options
 * @returns {Promise<Object>} Created test data
 */
export async function seedTestData(options = {}) {
  const {
    userCount = 5,
    patientCount = 10,
    includeAdmin = true,
  } = options;

  const testData = {
    users: [],
    patients: [],
    admin: null,
    sessions: [],
  };

  // Create admin user
  if (includeAdmin) {
    testData.admin = await createAdminUser();
    testData.users.push(testData.admin);
  }

  // Create regular users
  const regularUsers = await createTestUsers(userCount);
  testData.users.push(...regularUsers);

  // Create sessions for all users
  for (const user of testData.users) {
    const session = await createTestSession(user.id);
    testData.sessions.push(session);
  }

  // Create patients
  testData.patients = await createTestPatients(patientCount);

  return testData;
}

/**
 * Fixture builder for chaining
 * Allows fluent API for creating test data
 */
export class FixtureBuilder {
  constructor() {
    this.fixtures = {
      users: [],
      patients: [],
      sessions: [],
      accounts: [],
    };
  }

  async withUser(overrides = {}) {
    const user = await createTestUser(overrides);
    this.fixtures.users.push(user);
    return this;
  }

  async withUsers(count, overrides = {}) {
    const users = await createTestUsers(count, overrides);
    this.fixtures.users.push(...users);
    return this;
  }

  async withAdmin(overrides = {}) {
    const admin = await createAdminUser(overrides);
    this.fixtures.users.push(admin);
    return this;
  }

  async withPatient(overrides = {}) {
    const patient = await createTestPatient(overrides);
    this.fixtures.patients.push(patient);
    return this;
  }

  async withPatients(count, overrides = {}) {
    const patients = await createTestPatients(count, overrides);
    this.fixtures.patients.push(...patients);
    return this;
  }

  async withSessionsForUsers() {
    for (const user of this.fixtures.users) {
      const session = await createTestSession(user.id);
      this.fixtures.sessions.push(session);
    }
    return this;
  }

  getFixtures() {
    return this.fixtures;
  }

  getUser(index = 0) {
    return this.fixtures.users[index];
  }

  getPatient(index = 0) {
    return this.fixtures.patients[index];
  }

  getSession(index = 0) {
    return this.fixtures.sessions[index];
  }
}

/**
 * Create a new fixture builder
 *
 * @returns {FixtureBuilder}
 */
export function createFixtures() {
  return Promise.resolve(new FixtureBuilder());
}

/**
 * Database state snapshot for rollback testing
 */
export class DatabaseSnapshot {
  constructor() {
    this.snapshot = {};
  }

  async capture(tableNames) {
    for (const tableName of tableNames) {
      this.snapshot[tableName] = await getAllRecords(tableName);
    }
    return this;
  }

  async restore() {
    // Clear current data
    await cleanupDatabase();

    // Restore snapshot data
    for (const [tableName, records] of Object.entries(this.snapshot)) {
      if (records.length > 0) {
        const columns = Object.keys(records[0]);
        const values = records.map(record =>
          `(${columns.map(col => {
            const value = record[col];
            if (value === null) return 'NULL';
            if (typeof value === 'string') return `'${value.replace(/'/g, "''")}'`;
            if (value instanceof Date) return `'${value.toISOString()}'`;
            return value;
          }).join(', ')})`
        ).join(', ');

        const query = `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES ${values}`;
        await executeQuery(query);
      }
    }

    return this;
  }

  getSnapshot() {
    return this.snapshot;
  }
}

/**
 * Create a database snapshot
 *
 * @param {string[]} tableNames - Tables to snapshot
 * @returns {Promise<DatabaseSnapshot>}
 */
export async function createSnapshot(tableNames) {
  const snapshot = new DatabaseSnapshot();
  await snapshot.capture(tableNames);
  return snapshot;
}

// Export database instance for direct queries
export { db };

// Default export with all utilities
export default {
  initTestDatabase,
  cleanupDatabase,
  cleanupTables,
  resetSequences,
  createTestUser,
  createTestUsers,
  createTestUserWithRole,
  createAdminUser,
  createTestSession,
  createTestPatient,
  createTestPatients,
  createTestAccount,
  getTableCount,
  isTableEmpty,
  getAllRecords,
  executeQuery,
  waitFor,
  withTransaction,
  seedTestData,
  createFixtures,
  FixtureBuilder,
  createSnapshot,
  DatabaseSnapshot,
  db,
};
