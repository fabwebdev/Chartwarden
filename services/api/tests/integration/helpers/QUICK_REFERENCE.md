# Test Database Utilities - Quick Reference Card

## Essential Imports

```javascript
import {
  cleanupDatabase,
  createTestUser,
  createTestPatient,
  createTestSession,
  seedTestData,
  createFixtures,
} from './helpers/testDb.js';
```

## Common Patterns

### Pattern 1: Basic Test Setup
```javascript
describe('My Test Suite', () => {
  beforeEach(async () => {
    await cleanupDatabase(); // Always clean before each test
  });

  test('my test', async () => {
    const user = await createTestUser();
    // Your test logic here
  });
});
```

### Pattern 2: Create User with Session
```javascript
const user = await createTestUser({ role: 'nurse' });
const session = await createTestSession(user.id);
// Use session.token for authenticated requests
```

### Pattern 3: Quick Test Environment
```javascript
const { users, patients, admin } = await seedTestData({
  userCount: 5,
  patientCount: 10,
  includeAdmin: true,
});
```

### Pattern 4: Fluent Builder
```javascript
const builder = await createFixtures()
  .then(b => b.withUsers(3))
  .then(b => b.withPatients(5))
  .then(b => b.withSessionsForUsers());

const user = builder.getUser(0);
const patient = builder.getPatient(0);
```

## Most Used Functions

| Function | Purpose | Example |
|----------|---------|---------|
| `cleanupDatabase()` | Clear all tables | `await cleanupDatabase()` |
| `createTestUser(overrides)` | Create one user | `await createTestUser({ email: 'test@test.com' })` |
| `createTestUsers(count, overrides)` | Create multiple users | `await createTestUsers(5, { role: 'nurse' })` |
| `createAdminUser(overrides)` | Create admin user | `await createAdminUser()` |
| `createTestPatient(overrides)` | Create one patient | `await createTestPatient({ first_name: 'John' })` |
| `createTestPatients(count, overrides)` | Create multiple patients | `await createTestPatients(10)` |
| `createTestSession(userId, overrides)` | Create session | `await createTestSession(user.id)` |
| `getTableCount(tableName)` | Get row count | `await getTableCount('users')` |
| `isTableEmpty(tableName)` | Check if empty | `await isTableEmpty('users')` |
| `seedTestData(options)` | Full test environment | `await seedTestData({ userCount: 5 })` |
| `createFixtures()` | Fluent builder | `await createFixtures().then(b => b.withUsers(3))` |

## Default Values

### Test User Defaults
```javascript
{
  name: faker.person.fullName(),
  email: faker.internet.email(),
  emailVerified: true,
  role: 'staff',
  is_active: true,
  plainPassword: 'TestPassword123!', // For login tests
}
```

### Test Patient Defaults
```javascript
{
  first_name: faker.person.firstName(),
  last_name: faker.person.lastName(),
  date_of_birth: faker.date.birthdate(),
  status: 'active',
  patient_consents: 1,
  hipaa_received: 1,
  oxygen_dependent: 0,
  veterans_status: 0,
}
```

### Test Session Defaults
```javascript
{
  token: nanoid(32),
  expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
  ipAddress: faker.internet.ip(),
}
```

## Quick Examples

### Example: Test User Login
```javascript
test('user can login', async () => {
  const user = await createTestUser({ email: 'test@example.com' });

  // user.plainPassword = 'TestPassword123!'
  const response = await request(app)
    .post('/api/auth/login')
    .send({
      email: user.email,
      password: user.plainPassword,
    });

  expect(response.status).toBe(200);
});
```

### Example: Test Protected Route
```javascript
test('protected route requires auth', async () => {
  const user = await createTestUser();
  const session = await createTestSession(user.id);

  const response = await request(app)
    .get('/api/protected')
    .set('Authorization', `Bearer ${session.token}`);

  expect(response.status).toBe(200);
});
```

### Example: Test Patient CRUD
```javascript
test('can create and read patient', async () => {
  const patient = await createTestPatient({
    first_name: 'John',
    last_name: 'Doe',
  });

  expect(patient.first_name).toBe('John');

  const count = await getTableCount('patients');
  expect(count).toBe(1);
});
```

### Example: Test with Multiple Users
```javascript
test('care team workflow', async () => {
  const nurses = await createTestUsers(3, { role: 'nurse' });
  const doctor = await createTestUser({ role: 'doctor' });
  const patients = await createTestPatients(5);

  // Test assignment logic
  expect(nurses).toHaveLength(3);
  expect(patients).toHaveLength(5);
});
```

## Tips

✅ **DO:**
- Always clean database before each test
- Use `createTestUser()` for consistent test data
- Use `seedTestData()` for complex scenarios
- Verify database state with `getTableCount()`
- Use the fluent builder for readable test setup

❌ **DON'T:**
- Don't forget to cleanup (use `beforeEach`)
- Don't share data between tests
- Don't manually hash passwords (use `createTestUser`)
- Don't hardcode test data (use fixtures)

## Troubleshooting

**Problem**: Tests fail due to data from previous tests
**Solution**: Add `beforeEach(async () => await cleanupDatabase())`

**Problem**: Cannot login with test user
**Solution**: Use `user.plainPassword` (default: 'TestPassword123!')

**Problem**: Foreign key constraints failing
**Solution**: Use `cleanupDatabase({ cascade: true })` (default)

**Problem**: Need to test with specific test data
**Solution**: Use the fixture builder or pass overrides to create functions
