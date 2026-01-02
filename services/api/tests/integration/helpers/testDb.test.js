/**
 * Test Database Utilities Test Suite
 * Validates test database helper functions
 */

import { describe, test, expect, beforeEach, afterEach } from '@jest/globals';
import {
  initTestDatabase,
  cleanupDatabase,
  cleanupTables,
  createTestUser,
  createTestUsers,
  createAdminUser,
  createTestPatient,
  createTestPatients,
  createTestSession,
  getTableCount,
  isTableEmpty,
  seedTestData,
  createFixtures,
  FixtureBuilder,
} from './testDb.js';

describe('Test Database Utilities', () => {
  beforeEach(async () => {
    // Clean database before each test
    await cleanupDatabase();
  });

  afterEach(async () => {
    // Clean database after each test
    await cleanupDatabase();
  });

  describe('Database Initialization', () => {
    test('should initialize test database successfully', async () => {
      const result = await initTestDatabase();

      expect(result).toHaveProperty('success', true);
      expect(result).toHaveProperty('db');
    });
  });

  describe('Database Cleanup', () => {
    test('should cleanup all tables', async () => {
      // Create some test data
      await createTestUser();
      await createTestPatient();

      // Verify data exists
      const userCount = await getTableCount('users');
      const patientCount = await getTableCount('patients');
      expect(userCount).toBeGreaterThan(0);
      expect(patientCount).toBeGreaterThan(0);

      // Cleanup
      const result = await cleanupDatabase();

      expect(result).toHaveProperty('success', true);
      expect(result.tablesCleared).toBeGreaterThan(0);

      // Verify tables are empty
      const userCountAfter = await getTableCount('users');
      const patientCountAfter = await getTableCount('patients');
      expect(userCountAfter).toBe(0);
      expect(patientCountAfter).toBe(0);
    });

    test('should cleanup specific tables', async () => {
      // Create test data
      await createTestUser();
      await createTestPatient();

      // Cleanup only users table
      await cleanupTables(['users']);

      // Verify only users table is empty
      const userCount = await getTableCount('users');
      const patientCount = await getTableCount('patients');

      expect(userCount).toBe(0);
      expect(patientCount).toBeGreaterThan(0);
    });
  });

  describe('User Fixtures', () => {
    test('should create a test user with default values', async () => {
      const user = await createTestUser();

      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('name');
      expect(user).toHaveProperty('password');
      expect(user).toHaveProperty('plainPassword');
      expect(user.emailVerified).toBe(true);
      expect(user.is_active).toBe(true);
      expect(user.role).toBe('staff');
    });

    test('should create a test user with custom values', async () => {
      const customEmail = 'custom@test.com';
      const customRole = 'nurse';

      const user = await createTestUser({
        email: customEmail,
        role: customRole,
      });

      expect(user.email).toBe(customEmail);
      expect(user.role).toBe(customRole);
    });

    test('should create multiple test users', async () => {
      const count = 5;
      const users = await createTestUsers(count);

      expect(users).toHaveLength(count);

      // Verify each user has unique email
      const emails = users.map(u => u.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(count);
    });

    test('should create admin user', async () => {
      const admin = await createAdminUser();

      expect(admin.role).toBe('admin');
      expect(admin.is_active).toBe(true);
    });

    test('should verify users are stored in database', async () => {
      await createTestUser();
      await createTestUser();

      const userCount = await getTableCount('users');
      expect(userCount).toBe(2);
    });
  });

  describe('Patient Fixtures', () => {
    test('should create a test patient with default values', async () => {
      const patient = await createTestPatient();

      expect(patient).toHaveProperty('id');
      expect(patient).toHaveProperty('first_name');
      expect(patient).toHaveProperty('last_name');
      expect(patient).toHaveProperty('date_of_birth');
      expect(patient).toHaveProperty('gender');
      expect(patient).toHaveProperty('medicare_beneficiary_id');
      expect(patient.status).toBe('active');
      expect(patient.patient_consents).toBe(1);
      expect(patient.hipaa_received).toBe(1);
    });

    test('should create a test patient with custom values', async () => {
      const customFirstName = 'John';
      const customLastName = 'Doe';

      const patient = await createTestPatient({
        first_name: customFirstName,
        last_name: customLastName,
      });

      expect(patient.first_name).toBe(customFirstName);
      expect(patient.last_name).toBe(customLastName);
    });

    test('should create multiple test patients', async () => {
      const count = 3;
      const patients = await createTestPatients(count);

      expect(patients).toHaveLength(count);

      // Verify each patient has unique medical record number
      const mrns = patients.map(p => p.medical_record_number);
      const uniqueMrns = new Set(mrns);
      expect(uniqueMrns.size).toBe(count);
    });

    test('should verify patients are stored in database', async () => {
      await createTestPatient();
      await createTestPatient();
      await createTestPatient();

      const patientCount = await getTableCount('patients');
      expect(patientCount).toBe(3);
    });
  });

  describe('Session Fixtures', () => {
    test('should create a test session for user', async () => {
      const user = await createTestUser();
      const session = await createTestSession(user.id);

      expect(session).toHaveProperty('id');
      expect(session).toHaveProperty('userId', user.id);
      expect(session).toHaveProperty('token');
      expect(session).toHaveProperty('expiresAt');
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('should create session with custom expiry', async () => {
      const user = await createTestUser();
      const futureDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const session = await createTestSession(user.id, {
        expiresAt: futureDate,
      });

      expect(session.expiresAt.getTime()).toBeCloseTo(futureDate.getTime(), -3);
    });
  });

  describe('Table Utilities', () => {
    test('should get correct table count', async () => {
      await createTestUser();
      await createTestUser();
      await createTestUser();

      const count = await getTableCount('users');
      expect(count).toBe(3);
    });

    test('should verify table is empty', async () => {
      const isEmpty = await isTableEmpty('users');
      expect(isEmpty).toBe(true);

      await createTestUser();

      const isEmptyAfter = await isTableEmpty('users');
      expect(isEmptyAfter).toBe(false);
    });
  });

  describe('Seed Test Data', () => {
    test('should seed database with test data', async () => {
      const testData = await seedTestData({
        userCount: 3,
        patientCount: 5,
        includeAdmin: true,
      });

      expect(testData.users).toHaveLength(4); // 3 regular + 1 admin
      expect(testData.patients).toHaveLength(5);
      expect(testData.sessions).toHaveLength(4);
      expect(testData.admin).toBeDefined();
      expect(testData.admin.role).toBe('admin');

      // Verify data in database
      const userCount = await getTableCount('users');
      const patientCount = await getTableCount('patients');
      const sessionCount = await getTableCount('sessions');

      expect(userCount).toBe(4);
      expect(patientCount).toBe(5);
      expect(sessionCount).toBe(4);
    });

    test('should seed without admin user', async () => {
      const testData = await seedTestData({
        userCount: 2,
        patientCount: 2,
        includeAdmin: false,
      });

      expect(testData.users).toHaveLength(2);
      expect(testData.admin).toBeNull();
    });
  });

  describe('Fixture Builder', () => {
    test('should build fixtures with fluent API', async () => {
      const builder = await createFixtures()
        .then(b => b.withUser())
        .then(b => b.withUser({ role: 'nurse' }))
        .then(b => b.withAdmin())
        .then(b => b.withPatient())
        .then(b => b.withPatient());

      const fixtures = builder.getFixtures();

      expect(fixtures.users).toHaveLength(3);
      expect(fixtures.patients).toHaveLength(2);
    });

    test('should create multiple fixtures at once', async () => {
      const builder = await createFixtures()
        .then(b => b.withUsers(5))
        .then(b => b.withPatients(3));

      const fixtures = builder.getFixtures();

      expect(fixtures.users).toHaveLength(5);
      expect(fixtures.patients).toHaveLength(3);
    });

    test('should retrieve specific fixtures by index', async () => {
      const builder = await createFixtures()
        .then(b => b.withUser({ email: 'first@test.com' }))
        .then(b => b.withUser({ email: 'second@test.com' }));

      const firstUser = builder.getUser(0);
      const secondUser = builder.getUser(1);

      expect(firstUser.email).toBe('first@test.com');
      expect(secondUser.email).toBe('second@test.com');
    });

    test('should create sessions for all users in builder', async () => {
      const builder = await createFixtures()
        .then(b => b.withUsers(3))
        .then(b => b.withSessionsForUsers());

      const fixtures = builder.getFixtures();

      expect(fixtures.users).toHaveLength(3);
      expect(fixtures.sessions).toHaveLength(3);

      // Verify each session belongs to a user
      fixtures.sessions.forEach(session => {
        const user = fixtures.users.find(u => u.id === session.userId);
        expect(user).toBeDefined();
      });
    });
  });

  describe('Instance of FixtureBuilder', () => {
    test('should create instance of FixtureBuilder', () => {
      const builder = new FixtureBuilder();
      expect(builder).toBeInstanceOf(FixtureBuilder);
      expect(builder.fixtures).toHaveProperty('users');
      expect(builder.fixtures).toHaveProperty('patients');
      expect(builder.fixtures).toHaveProperty('sessions');
    });
  });
});
