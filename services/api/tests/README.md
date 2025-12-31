# Test Documentation
## Certifications & Medications Modules

This directory contains comprehensive test suites for the Certifications and Medications modules.

---

## 📁 Test Structure

```
tests/
├── README.md                          # This file
├── fixtures/
│   ├── certification.fixtures.js      # Test data for certifications
│   └── medication.fixtures.js         # Test data for medications
├── certification.test.js              # Unit/integration tests for certifications
├── medication.test.js                 # Unit/integration tests for medications
└── postman/
    └── Hospice_EHR_Certifications_Medications.postman_collection.json
```

---

## 🧪 Test Types

### 1. Unit/Integration Tests (Jest)

Located in:
- `certification.test.js`
- `medication.test.js`

These tests verify controller logic, database operations, and business rules.

#### Running Jest Tests

```bash
# Run all tests
npm test

# Run specific test file
npm test certification.test.js

# Run with coverage
npm test:coverage

# Watch mode for development
npm test:watch
```

#### Test Categories

**Certifications Module:**
- ✅ Certification CRUD operations
- ✅ Electronic signature generation (SHA-256)
- ✅ Face-to-Face encounter tracking
- ✅ Physician order management
- ✅ Verbal order 48-hour signature tracking
- ✅ Recertification scheduling
- ✅ Due and overdue certification alerts
- ✅ Authorization & RBAC
- ✅ Audit logging
- ✅ Soft delete functionality

**Medications Module:**
- ✅ Medication lifecycle (create, hold, discontinue)
- ✅ Controlled substance tracking (DEA compliance)
- ✅ MAR (Medication Administration Record)
- ✅ Comfort kit management
- ✅ Comfort kit destruction with witness logging
- ✅ Medication reconciliation (CMS requirement)
- ✅ Filter by status and hospice-related flag
- ✅ Authorization & RBAC
- ✅ Audit logging
- ✅ Soft delete functionality

---

### 2. API Endpoint Tests (Postman/Insomnia)

Located in: `postman/Hospice_EHR_Certifications_Medications.postman_collection.json`

#### Importing into Postman

1. Open Postman
2. Click **Import** button
3. Select the JSON file
4. Collection will appear in your workspace

#### Importing into Insomnia

1. Open Insomnia
2. Click **Create** → **File**
3. Select the JSON file
4. Collection will be imported

#### Environment Variables

Set these variables before running the collection:

| Variable | Description | Example |
|----------|-------------|---------|
| `baseUrl` | API base URL | `http://localhost:3000/api` |
| `authToken` | Bearer authentication token | `your_jwt_token_here` |
| `patientId` | Test patient ID | `1` |

#### Collection Organization

**1. Certifications (5 requests)**
- Get Patient Certifications
- Create Initial 90-Day Certification
- Sign Certification
- Get Certifications Due
- Get Overdue Certifications

**2. Face-to-Face Encounters (3 requests)**
- Get Patient F2F Encounters
- Create F2F Encounter
- Attest F2F Encounter

**3. Orders (4 requests)**
- Get Patient Orders
- Create Medication Order
- Create Verbal Order
- Sign Order

**4. Medications (5 requests)**
- Get Patient Medications
- Get Active Hospice Medications (filtered)
- Create Medication (Controlled)
- Discontinue Medication
- Hold Medication

**5. MAR (4 requests)**
- Get Patient MAR
- Get MAR by Date Range
- Record Medication Given
- Record Medication Refused

**6. Comfort Kits (3 requests)**
- Get Patient Comfort Kits
- Create Comfort Kit
- Destroy Comfort Kit

**7. Medication Reconciliation (1 request)**
- Create Admission Reconciliation

---

## 🎯 Test Fixtures

### Certification Fixtures

Located in: `fixtures/certification.fixtures.js`

**Includes:**
- Valid/invalid certification data
- Initial 90-day and subsequent certifications
- F2F encounter data (in-person and telehealth)
- Order data (medication, DME, verbal, laboratory)
- Mock request/response objects
- Expected response matchers

**Usage Example:**
```javascript
import { validCertification, mockRequest, mockReply } from './fixtures/certification.fixtures.js';

it('should create certification', async () => {
  const request = mockRequest(validCertification, { id: 1 });
  const reply = mockReply();

  await controller.createCertification(request, reply);

  expect(reply.code).toHaveBeenCalledWith(201);
});
```

### Medication Fixtures

Located in: `fixtures/medication.fixtures.js`

**Includes:**
- Valid/invalid medication data
- Controlled and non-controlled substances
- MAR entry samples (given, refused, held, not given)
- Comfort kit data with medication arrays
- Controlled substance log entries
- Medication reconciliation scenarios
- Mock request/response objects
- Expected response matchers

---

## 📋 Test Checklist

### Before Running Tests

- [ ] Database is running and accessible
- [ ] Environment variables configured (.env file)
- [ ] Dependencies installed (`npm install`)
- [ ] Migrations applied (`npm run migrate:run`)
- [ ] Test database seeded (if using separate test DB)

### Pre-Production Testing

**Certifications:**
- [ ] Can create initial 90-day certification
- [ ] Can create subsequent certifications
- [ ] Electronic signatures generate valid SHA-256 hashes
- [ ] Face-to-Face encounters link to certifications
- [ ] Recertification schedule created for subsequent periods
- [ ] Due certifications alert works (30-day window)
- [ ] Overdue certifications detected
- [ ] Physician orders created and signed
- [ ] Verbal orders tracked with 48-hour requirement
- [ ] RBAC permissions enforced
- [ ] Audit logs capture user actions

**Medications:**
- [ ] Can create controlled substance medications
- [ ] Controlled substance log entries created on dispensing
- [ ] Can discontinue medications with reason
- [ ] Can hold medications temporarily
- [ ] MAR entries record administration accurately
- [ ] MAR requires reason when medication not given/refused/held
- [ ] Comfort kits created with medication arrays
- [ ] Comfort kit destruction logs all medications
- [ ] Witness required for controlled substance destruction
- [ ] Medication reconciliation captures all actions
- [ ] Filters work (status, hospice-related, date range)
- [ ] RBAC permissions enforced
- [ ] Audit logs capture user actions

---

## 🔬 Manual Test Scenarios

### Scenario 1: Complete Certification Workflow

1. **Create Patient** (prerequisite)
2. **Create Initial 90-Day Certification**
   - POST `/patients/1/certifications`
   - Verify recertification schedule NOT created (only for subsequent)
3. **Sign Certification**
   - POST `/certifications/{id}/sign`
   - Verify status changes to ACTIVE
   - Verify signature hash is 64-character hex string
4. **Create F2F Encounter** (before recertification)
   - POST `/patients/1/f2f`
   - Link to certification
5. **Attest F2F**
   - POST `/f2f/{id}/attestation`
   - Verify attestation signature created
6. **Create Subsequent Certification**
   - POST `/patients/1/certifications`
   - Use SUBSEQUENT_60 or SUBSEQUENT_90
   - Verify recertification schedule IS created
7. **Check Due Certifications**
   - GET `/certifications/due`
   - Should appear when within 30 days of end date

### Scenario 2: Medication Lifecycle

1. **Create Patient** (prerequisite)
2. **Create Controlled Substance**
   - POST `/patients/1/medications`
   - Include controlled_schedule: "SCHEDULE_II"
   - Verify controlled_substance_log entry created (DISPENSED)
3. **Record MAR Entry**
   - POST `/patients/1/mar`
   - Status: GIVEN
   - Include patient_response
4. **Record Refusal**
   - POST `/patients/1/mar`
   - Status: REFUSED
   - Include reason_not_given (required)
5. **Hold Medication**
   - POST `/patients/1/medications/{id}/hold`
   - Verify status changes to HELD
6. **Discontinue Medication**
   - POST `/patients/1/medications/{id}/discontinue`
   - Verify controlled_substance_log entry (RETURNED)
   - Verify status changes to DISCONTINUED

### Scenario 3: Comfort Kit Management

1. **Create Patient** (prerequisite)
2. **Create Comfort Kit**
   - POST `/patients/1/comfort-kit`
   - Include array of 4+ medications
   - Verify status is ACTIVE
3. **Record Usage** (future feature)
   - Track medication usage from kit
4. **Destroy Kit**
   - POST `/patients/1/comfort-kit/destroy`
   - Include witness information
   - Verify controlled_substance_log entries for each medication
   - Verify status changes to DESTROYED

### Scenario 4: Medication Reconciliation

1. **Admission Reconciliation**
   - POST `/patients/1/medication-reconciliation`
   - Type: ADMISSION
   - Review home medications
   - Add hospice medications
   - Discontinue inappropriate medications
2. **Routine Reconciliation**
   - Type: ROUTINE
   - Verify current medication list
   - Document discrepancies
3. **Discharge Reconciliation**
   - Type: DISCHARGE
   - Discontinue hospice medications
   - Provide list to patient/family

---

## 🐛 Common Issues & Troubleshooting

### Issue: Tests fail with "DATABASE_URL not defined"

**Solution:**
```bash
# Create .env.test file
cp .env.example .env.test

# Set test database URL
DATABASE_URL=postgresql://user:password@localhost:5432/hospice_ehr_test
```

### Issue: Foreign key constraint violations

**Cause:** Test data references non-existent patients or users

**Solution:**
- Ensure test patient exists before running tests
- Use fixtures that create necessary prerequisite data
- Check `beforeAll()` setup in test files

### Issue: Signature hash validation fails

**Cause:** Data used for hashing doesn't match

**Solution:**
- Verify exact fields used in signature generation
- Check that data hasn't changed between create and sign
- Ensure JSON.stringify produces consistent output

### Issue: 403 Forbidden on all requests

**Cause:** RBAC permissions not configured or token invalid

**Solution:**
- Verify auth token is valid
- Check user has required permissions
- Review RBAC middleware configuration

### Issue: Soft-deleted records appearing in results

**Cause:** Query missing `isNull(deleted_at)` filter

**Solution:**
- Add `isNull(table.deleted_at)` to all queries
- Check controller methods for proper filtering

---

## 📊 Test Coverage Goals

| Module | Target Coverage | Current Status |
|--------|----------------|----------------|
| Certifications Controller | 80%+ | ⏳ Pending run |
| Medications Controller | 80%+ | ⏳ Pending run |
| Certification Routes | 100% | ⏳ Pending run |
| Medication Routes | 100% | ⏳ Pending run |
| Schemas | N/A | ✅ Validated |

---

## 🚀 Continuous Integration

### GitHub Actions Example

```yaml
name: Run Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    services:
      postgres:
        image: postgres:15
        env:
          POSTGRES_PASSWORD: postgres
          POSTGRES_DB: hospice_ehr_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5

    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - run: npm install
      - run: npm run migrate:run
      - run: npm test
      - run: npm run test:coverage
```

---

## 📝 Additional Resources

- **API Documentation**: See `/docs/API.md`
- **Database Schema**: See `/docs/SCHEMA.md`
- **RBAC Permissions**: See `/src/config/rbac.js`
- **Implementation Guide**: See `/IMPLEMENTATION_GUIDE.md`

---

## 🤝 Contributing

When adding new features:

1. ✅ Add test fixtures in `fixtures/` directory
2. ✅ Write unit tests in corresponding `.test.js` file
3. ✅ Add API requests to Postman collection
4. ✅ Update this README with new test scenarios
5. ✅ Ensure tests pass before committing
6. ✅ Aim for 80%+ code coverage

---

## 📞 Support

For questions or issues with tests:

1. Check this documentation first
2. Review error messages carefully
3. Check existing test examples
4. Consult implementation guide
5. Report issues with detailed reproduction steps

---

**Last Updated:** 2024-12-27
**Test Suite Version:** 1.0.0
**Modules Covered:** Certifications, Medications
