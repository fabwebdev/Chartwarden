/**
 * Example Usage of Test Database Utilities
 *
 * This file demonstrates how to use the testDb helpers in integration tests.
 * Use these patterns in your own integration tests.
 */

import { describe, test, expect, beforeEach } from '@jest/globals';
import {
  cleanupDatabase,
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
} from './testDb.js';

describe('Example: Test Database Utilities Usage', () => {
  // Always clean the database before each test for isolation
  beforeEach(async () => {
    await cleanupDatabase();
  });

  describe('Example 1: Creating Individual Test Users', () => {
    test('create a basic test user', async () => {
      const user = await createTestUser();

      // Every test user gets:
      // - Unique email
      // - Hashed password
      // - Plain password for testing: 'TestPassword123!'
      expect(user).toHaveProperty('id');
      expect(user).toHaveProperty('email');
      expect(user).toHaveProperty('password'); // Hashed
      expect(user.plainPassword).toBe('TestPassword123!');
      expect(user.emailVerified).toBe(true);
    });

    test('create a user with custom properties', async () => {
      const customUser = await createTestUser({
        email: 'nurse@hospital.com',
        role: 'nurse',
        firstName: 'Jane',
        lastName: 'Smith',
      });

      expect(customUser.email).toBe('nurse@hospital.com');
      expect(customUser.role).toBe('nurse');
      expect(customUser.firstName).toBe('Jane');
      expect(customUser.lastName).toBe('Smith');
    });

    test('create an admin user', async () => {
      const admin = await createAdminUser();

      expect(admin.role).toBe('admin');
      expect(admin.is_active).toBe(true);
    });
  });

  describe('Example 2: Creating Multiple Test Users', () => {
    test('create 5 test users at once', async () => {
      const users = await createTestUsers(5);

      expect(users).toHaveLength(5);

      // Each user has a unique email
      const emails = users.map(u => u.email);
      const uniqueEmails = new Set(emails);
      expect(uniqueEmails.size).toBe(5);

      // Verify they're in the database
      const dbCount = await getTableCount('users');
      expect(dbCount).toBe(5);
    });

    test('create multiple users with same role', async () => {
      const nurses = await createTestUsers(3, { role: 'nurse' });

      nurses.forEach(nurse => {
        expect(nurse.role).toBe('nurse');
      });
    });
  });

  describe('Example 3: Creating Test Patients', () => {
    test('create a basic test patient', async () => {
      const patient = await createTestPatient();

      // Patients get realistic hospice data
      expect(patient).toHaveProperty('id');
      expect(patient).toHaveProperty('first_name');
      expect(patient).toHaveProperty('last_name');
      expect(patient).toHaveProperty('date_of_birth');
      expect(patient).toHaveProperty('medicare_beneficiary_id');
      expect(patient.status).toBe('active');
      expect(patient.hipaa_received).toBe(1);
    });

    test('create patient with custom data', async () => {
      const patient = await createTestPatient({
        first_name: 'John',
        last_name: 'Doe',
        status: 'discharged',
        oxygen_dependent: 1,
      });

      expect(patient.first_name).toBe('John');
      expect(patient.last_name).toBe('Doe');
      expect(patient.status).toBe('discharged');
      expect(patient.oxygen_dependent).toBe(1);
    });

    test('create multiple patients', async () => {
      const patients = await createTestPatients(10);

      expect(patients).toHaveLength(10);

      const dbCount = await getTableCount('patients');
      expect(dbCount).toBe(10);
    });
  });

  describe('Example 4: Creating Sessions for Authentication', () => {
    test('create a session for user authentication testing', async () => {
      // First create a user
      const user = await createTestUser();

      // Then create a session for that user
      const session = await createTestSession(user.id);

      expect(session.userId).toBe(user.id);
      expect(session.token).toBeDefined();
      expect(session.expiresAt).toBeInstanceOf(Date);
      expect(session.expiresAt.getTime()).toBeGreaterThan(Date.now());
    });

    test('create session with custom expiry', async () => {
      const user = await createTestUser();
      const expiryDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

      const session = await createTestSession(user.id, {
        expiresAt: expiryDate,
      });

      expect(session.expiresAt.getTime()).toBeCloseTo(expiryDate.getTime(), -3);
    });
  });

  describe('Example 5: Using seedTestData for Complex Scenarios', () => {
    test('seed complete test environment', async () => {
      const testData = await seedTestData({
        userCount: 3,
        patientCount: 5,
        includeAdmin: true,
      });

      // Returns organized test data
      expect(testData.users).toHaveLength(4); // 3 regular + 1 admin
      expect(testData.patients).toHaveLength(5);
      expect(testData.sessions).toHaveLength(4); // One session per user
      expect(testData.admin).toBeDefined();
      expect(testData.admin.role).toBe('admin');

      // Verify in database
      expect(await getTableCount('users')).toBe(4);
      expect(await getTableCount('patients')).toBe(5);
      expect(await getTableCount('sessions')).toBe(4);
    });
  });

  describe('Example 6: Using Fixture Builder (Fluent API)', () => {
    test('build complex fixtures with chaining', async () => {
      const builder = await createFixtures()
        .then(b => b.withUser({ email: 'user1@test.com' }))
        .then(b => b.withUser({ email: 'user2@test.com' }))
        .then(b => b.withAdmin())
        .then(b => b.withPatient())
        .then(b => b.withPatient())
        .then(b => b.withSessionsForUsers());

      const fixtures = builder.getFixtures();

      expect(fixtures.users).toHaveLength(3);
      expect(fixtures.patients).toHaveLength(2);
      expect(fixtures.sessions).toHaveLength(3);
    });

    test('create bulk fixtures with fluent API', async () => {
      const builder = await createFixtures()
        .then(b => b.withUsers(5))
        .then(b => b.withPatients(10));

      const fixtures = builder.getFixtures();

      expect(fixtures.users).toHaveLength(5);
      expect(fixtures.patients).toHaveLength(10);
    });

    test('retrieve specific fixtures by index', async () => {
      const builder = await createFixtures()
        .then(b => b.withUser({ email: 'first@test.com' }))
        .then(b => b.withUser({ email: 'second@test.com' }))
        .then(b => b.withPatient({ first_name: 'John' }));

      // Get specific items
      const firstUser = builder.getUser(0);
      const secondUser = builder.getUser(1);
      const patient = builder.getPatient(0);

      expect(firstUser.email).toBe('first@test.com');
      expect(secondUser.email).toBe('second@test.com');
      expect(patient.first_name).toBe('John');
    });
  });

  describe('Example 7: Verifying Database State', () => {
    test('check table counts', async () => {
      await createTestUser();
      await createTestUser();
      await createTestPatient();

      const userCount = await getTableCount('users');
      const patientCount = await getTableCount('patients');

      expect(userCount).toBe(2);
      expect(patientCount).toBe(1);
    });

    test('verify table is empty', async () => {
      const isEmpty = await isTableEmpty('users');
      expect(isEmpty).toBe(true);

      await createTestUser();

      const isEmptyAfter = await isTableEmpty('users');
      expect(isEmptyAfter).toBe(false);
    });
  });

  describe('Example 8: Test Isolation with Cleanup', () => {
    test('first test - creates data', async () => {
      await createTestUser();
      await createTestPatient();

      const userCount = await getTableCount('users');
      const patientCount = await getTableCount('patients');

      expect(userCount).toBe(1);
      expect(patientCount).toBe(1);
    });

    test('second test - starts fresh', async () => {
      // Thanks to beforeEach cleanup, this test starts with empty tables
      const userCount = await getTableCount('users');
      const patientCount = await getTableCount('patients');

      expect(userCount).toBe(0);
      expect(patientCount).toBe(0);
    });
  });

  describe('Example 9: Real-World Workflow Simulation', () => {
    test('simulate patient admission workflow', async () => {
      // 1. Create admin user who will admit the patient
      const admin = await createAdminUser();
      const adminSession = await createTestSession(admin.id);

      // 2. Create patient record
      const patient = await createTestPatient({
        first_name: 'John',
        last_name: 'Doe',
        status: 'active',
        hipaa_received: 1,
      });

      // 3. Verify the workflow state
      expect(admin.role).toBe('admin');
      expect(adminSession.userId).toBe(admin.id);
      expect(patient.status).toBe('active');
      expect(patient.hipaa_received).toBe(1);

      // Now you can test API endpoints with this setup
      // Example: POST /api/patients/:id/admit
    });

    test('simulate care team assignment', async () => {
      // Create a care team
      const builder = await createFixtures()
        .then(b => b.withUser({ role: 'doctor', firstName: 'Dr. Smith' }))
        .then(b => b.withUsers(2, { role: 'nurse' }))
        .then(b => b.withUsers(1, { role: 'social_worker' }))
        .then(b => b.withPatients(5));

      const fixtures = builder.getFixtures();
      const doctor = builder.getUser(0);
      const nurses = [builder.getUser(1), builder.getUser(2)];
      const socialWorker = builder.getUser(3);
      const patients = fixtures.patients;

      // Verify care team setup
      expect(doctor.role).toBe('doctor');
      expect(nurses).toHaveLength(2);
      expect(socialWorker.role).toBe('social_worker');
      expect(patients).toHaveLength(5);

      // Now test care team assignment logic
    });
  });
});
