I'll analyze the codebase to understand the current testing infrastructure and then generate a comprehensive specification for the integration test suite.

🔧 Tool: Glob
Input: {
  "pattern": "**/*.test.js"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/*.test.ts"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/*.spec.js"
}

🔧 Tool: Glob
Input: {
  "pattern": "**/*.spec.ts"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/jest.config.cjs"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/tests/setup.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/tests/reportsREST.test.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/tests/qapi.test.js"
}

🔧 Tool: Grep
Input: {
  "pattern": "export (default )?app",
  "path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api",
  "glob": "*.js",
  "output_mode": "files_with_matches"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/server.js"
}

🔧 Tool: Grep
Input: {
  "pattern": "buildApp|createApp",
  "path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api",
  "glob": "*.js",
  "output_mode": "files_with_matches"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/services/api/src/routes/api.routes.js",
  "limit": 100
}

🔧 Tool: Glob
Input: {
  "pattern": "services/api/src/controllers/*.controller.js"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/.github/workflows"
}

🔧 Tool: Glob
Input: {
  "pattern": ".github/workflows/*.yml"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/turbo.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/package.json"
}

🔧 Tool: Read
Input: {
  "file_path": "/Users/fabrice/Sites/chartwarden/Chartwarden/.github/workflows/ci.yml"
}

Now I'll generate the specification for the integration test suite based on my analysis of the codebase.

---

## Integration Test Suite for Critical Workflows and API Endpoints

### 1. Problem
The Chartwarden hospice EHR system currently lacks comprehensive integration tests to verify that critical workflows (authentication, patient management, clinical assessments, billing, etc.) function correctly across multiple components, services, and database operations. This creates risks for production deployments and makes it difficult to catch regressions when modifying interconnected features.

### 2. Solution
Implement a comprehensive integration testing framework using Jest that validates end-to-end workflows, API endpoint interactions, database state changes, authentication/authorization flows, and error handling across critical hospice EHR operations.

### 3. Acceptance Criteria

**AC1**: GIVEN a critical user workflow (e.g., patient admission, clinical assessment), WHEN integration tests run, THEN all API endpoints in the workflow execute successfully with valid data persistence

**AC2**: GIVEN an API endpoint with authentication requirements, WHEN integration tests execute with invalid/missing credentials, THEN appropriate 401/403 responses are returned with audit logging

**AC3**: GIVEN concurrent API requests to the same resource, WHEN integration tests run with race conditions, THEN data integrity is maintained and appropriate locking/transaction handling prevents corruption

**AC4**: GIVEN the test suite execution in CI/CD, WHEN tests run on pull requests, THEN minimum 80% coverage of critical API paths is achieved with idempotent, order-independent tests

**AC5**: GIVEN failed integration tests, WHEN reviewing results, THEN clear error messages indicate which workflow step failed, expected vs actual database state, and relevant API responses

### 4. Files to Modify

| File | Purpose | Action |
|------|---------|--------|
| services/api/tests/integration/setup.js | Global integration test setup with database initialization | create |
| services/api/tests/integration/teardown.js | Global integration test teardown with database cleanup | create |
| services/api/tests/integration/helpers/testDb.js | Test database utilities (fixtures, cleanup, state verification) | create |
| services/api/tests/integration/helpers/testServer.js | Test server builder with full middleware stack | create |
| services/api/tests/integration/helpers/authHelper.js | Authentication helpers for test users/sessions | create |
| services/api/tests/integration/workflows/authentication.integration.test.js | Auth workflow tests (sign-up, sign-in, session, permissions) | create |
| services/api/tests/integration/workflows/patient-management.integration.test.js | Patient CRUD workflow tests | create |
| services/api/tests/integration/workflows/clinical-assessment.integration.test.js | Clinical assessments workflow tests (HOPE, pain, vitals) | create |
| services/api/tests/integration/workflows/billing.integration.test.js | Billing workflow tests (claims, eligibility, ERA processing) | create |
| services/api/tests/integration/workflows/care-coordination.integration.test.js | IDG meetings, care plans, certifications workflow | create |
| services/api/tests/integration/endpoints/patients.integration.test.js | Patient API endpoint integration tests | create |
| services/api/tests/integration/endpoints/medications.integration.test.js | Medication API endpoint integration tests | create |
| services/api/tests/integration/endpoints/billing.integration.test.js | Billing API endpoint integration tests | create |
| services/api/tests/integration/edge-cases/concurrency.integration.test.js | Concurrent request handling tests | create |
| services/api/tests/integration/edge-cases/validation.integration.test.js | Input validation and malformed data tests | create |
| services/api/tests/integration/edge-cases/rate-limiting.integration.test.js | Rate limiting behavior tests | create |
| services/api/jest.integration.config.cjs | Jest configuration for integration tests | create |
| services/api/package.json | Add integration test scripts | modify |
| .github/workflows/ci.yml | Add integration test job to CI pipeline | modify |

### 5. Implementation Tasks

```tasks
- [ ] T001: Create integration test infrastructure and helpers | File: services/api/tests/integration/setup.js
- [ ] T002: Implement test database utilities with fixtures and cleanup | File: services/api/tests/integration/helpers/testDb.js
- [ ] T003: Create test server builder with full Fastify app initialization | File: services/api/tests/integration/helpers/testServer.js
- [ ] T004: Implement authentication helpers for creating test users and sessions | File: services/api/tests/integration/helpers/authHelper.js
- [ ] T005: Create authentication workflow integration tests | File: services/api/tests/integration/workflows/authentication.integration.test.js
- [ ] T006: Create patient management workflow integration tests | File: services/api/tests/integration/workflows/patient-management.integration.test.js
- [ ] T007: Create clinical assessment workflow integration tests | File: services/api/tests/integration/workflows/clinical-assessment.integration.test.js
- [ ] T008: Create billing workflow integration tests | File: services/api/tests/integration/workflows/billing.integration.test.js
- [ ] T009: Create care coordination workflow integration tests | File: services/api/tests/integration/workflows/care-coordination.integration.test.js
- [ ] T010: Create patient API endpoint integration tests | File: services/api/tests/integration/endpoints/patients.integration.test.js
- [ ] T011: Create medication API endpoint integration tests | File: services/api/tests/integration/endpoints/medications.integration.test.js
- [ ] T012: Create billing API endpoint integration tests | File: services/api/tests/integration/endpoints/billing.integration.test.js
- [ ] T013: Create concurrency edge case tests | File: services/api/tests/integration/edge-cases/concurrency.integration.test.js
- [ ] T014: Create validation edge case tests | File: services/api/tests/integration/edge-cases/validation.integration.test.js
- [ ] T015: Create rate limiting edge case tests | File: services/api/tests/integration/edge-cases/rate-limiting.integration.test.js
- [ ] T016: Configure Jest for integration tests | File: services/api/jest.integration.config.cjs
- [ ] T017: Add integration test scripts to package.json | File: services/api/package.json
- [ ] T018: Update CI pipeline with integration test job | File: .github/workflows/ci.yml
- [ ] T019: Run integration tests and verify coverage thresholds | File: services/api
- [ ] T020: Create verification test with Playwright for integration suite | File: apps/web/tests/integration-test-suite-verification.spec.ts
```

### 6. Verification

**Manual Verification**:
1. Run `npm run test:integration` in services/api directory
2. Verify all integration tests pass with minimum 80% coverage
3. Confirm tests are idempotent (can run multiple times without failure)
4. Check test execution time is reasonable (<5 minutes for full suite)
5. Verify CI pipeline runs integration tests on pull requests

**Automated Verification with Playwright**:
1. Create temporary Playwright test that verifies:
   - Integration test suite exists and is configured
   - Tests can execute successfully
   - Database isolation works correctly
   - Test server starts and stops cleanly
2. Run the verification test
3. Delete the verification test after confirmation

**Success Criteria**:
- All integration tests pass
- Code coverage ≥80% for critical API endpoints
- Tests complete in <5 minutes
- No test interference or order dependencies
- CI pipeline includes integration test job

---

[SPEC_GENERATED] Please review the specification above. Reply with 'approved' to proceed or provide feedback for revisions.