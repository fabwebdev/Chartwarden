# Audit Remediation - Quick Start Checklist

**Last Updated:** 2026-01-02
**For:** Chartwarden Development Team

---

## 🚨 Critical Path (Do These First)

### Day 1-3: Unblock Development

- [ ] **Upgrade Node.js to v20.x**
  ```bash
  # Check current version
  node --version  # Should show v20.x

  # If not v20.x:
  nvm install 20
  nvm use 20

  # Update package.json engines if needed
  ```

- [ ] **Clean Install Dependencies**
  ```bash
  cd /workspace/repo
  rm -rf node_modules apps/*/node_modules services/*/node_modules packages/*/node_modules
  npm ci
  ```

- [ ] **Verify Tooling Works**
  ```bash
  npm run lint        # Should execute without errors
  npm run typecheck   # Should complete successfully
  npm run test        # Should run tests
  ```

- [ ] **Update CI/CD Pipeline**
  - Update GitHub Actions to use Node 20.x
  - Update all environment variables
  - Test deployment pipeline

---

## Week 1: Security Fixes

- [ ] **Update drizzle-kit**
  ```bash
  cd services/api
  npm install drizzle-kit@0.18.1 --save-dev
  ```

- [ ] **Test Database Migrations**
  ```bash
  npm run db:migrate
  npm run db:generate
  ```

- [ ] **Run Full Test Suite**
  ```bash
  npm test
  npm run test:coverage
  ```

- [ ] **Run npm Audit**
  ```bash
  npm audit
  npm audit fix
  ```

- [ ] **Install Snyk**
  ```bash
  npm install -g snyk
  snyk auth
  snyk test
  snyk monitor
  ```

---

## Week 2-5: Critical Path Testing

### Priority 1: Authentication (Week 2)

- [ ] **Web App Auth Tests**
  ```bash
  # Create test files
  apps/web/src/app/(auth)/login/__tests__/login.test.tsx
  apps/web/src/app/(auth)/forgot-password/__tests__/forgot-password.test.tsx

  # Target: 85% coverage for auth modules
  ```

- [ ] **API Auth Middleware Tests**
  ```bash
  services/api/src/middleware/__tests__/auth.test.js
  services/api/src/middleware/__tests__/role-check.test.js

  # Target: 90% coverage (security critical)
  ```

### Priority 2: Patient Management (Week 3)

- [ ] **Patient CRUD Tests (API)**
  ```bash
  services/api/src/controllers/patient/__tests__/
  - create-patient.test.js
  - get-patient.test.js
  - update-patient.test.js
  - delete-patient.test.js
  - list-patients.test.js

  # Target: 80% coverage
  ```

- [ ] **Patient Display Tests (Web)**
  ```bash
  apps/web/src/views/patients/__tests__/
  - patient-list.test.tsx
  - patient-detail.test.tsx
  - patient-form.test.tsx
  ```

### Priority 3: Clinical Documentation (Week 4-5)

- [ ] **Nursing Notes Tests**
  ```bash
  # Expand existing test
  apps/web/src/views/nursing-notes/utils/__tests__/sanitize.test.ts

  # Add new tests
  apps/web/src/views/nursing-notes/__tests__/
  - note-creation.test.tsx
  - note-editing.test.tsx
  - note-validation.test.tsx
  ```

- [ ] **Care Plan Tests**
  ```bash
  services/api/src/services/care-plan/__tests__/
  apps/web/src/views/care-plans/__tests__/
  ```

---

## Week 6-9: Core Feature Testing

### Week 6: Medication Management

- [ ] **Medication Tests (API)**
  ```bash
  services/api/src/controllers/medication/__tests__/
  ```

- [ ] **Allergy Tests**
  ```bash
  services/api/src/controllers/allergy/__tests__/
  ```

- [ ] **Drug Interaction Tests**
  ```bash
  services/api/src/services/drug-interactions/__tests__/
  ```

### Week 7: QAPI Module

- [ ] **Quality Metrics Tests**
  ```bash
  services/api/src/services/qapi/__tests__/
  apps/web/src/views/qapi/__tests__/
  ```

### Week 8: Revenue/Billing

- [ ] **Billing Calculation Tests**
  ```bash
  services/api/src/services/billing/__tests__/
  ```

- [ ] **Claims Tests**
  ```bash
  services/api/src/controllers/claims/__tests__/
  ```

### Week 9: Team Communication

- [ ] **Chat/Message Tests**
  ```bash
  services/api/src/controllers/messages/__tests__/
  apps/web/src/components/chat/__tests__/
  ```

---

## Week 10-13: Comprehensive Coverage

- [ ] **UI Component Tests**
  ```bash
  # Target: 70% coverage for UI components
  apps/web/src/components/**/__tests__/
  ```

- [ ] **Error Handling Tests**
  ```bash
  services/api/src/middleware/__tests__/error-handler.test.js
  apps/web/src/app/error.tsx.test.tsx
  ```

- [ ] **E2E Tests**
  ```bash
  # Critical user workflows
  apps/web/e2e/
  - patient-registration.spec.ts
  - nursing-documentation.spec.ts
  - medication-administration.spec.ts
  ```

- [ ] **Edge Cases**
  ```bash
  # Boundary conditions
  # Null/undefined handling
  # Invalid input scenarios
  ```

---

## Week 14: Quality Gates

- [ ] **Setup Coverage Thresholds**
  ```javascript
  // jest.config.js
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80,
    },
  },
  ```

- [ ] **Configure CI/CD**
  ```yaml
  # .github/workflows/test.yml
  - name: Check coverage
    run: npm run test:ci

  - name: Upload coverage
    run: codecov
  ```

- [ ] **Add Coverage Badge**
  ```markdown
  # README.md
  ![Coverage](https://img.shields.io/badge/coverage-80%25-brightgreen)
  ```

---

## Week 15-17: Dependency Updates

- [ ] **Update Puppeteer**
  ```bash
  npm install puppeteer@latest --save-dev
  ```

- [ ] **Update glob**
  ```bash
  npm install glob@latest --save-dev
  npm install glob@latest --save
  ```

- [ ] **Migrate @mui/base**
  ```bash
  npm uninstall @mui/base
  npm install @base-ui/react@latest
  # Update imports across codebase
  ```

- [ ] **Update rimraf**
  ```bash
  npm install rimraf@latest --save-dev
  ```

- [ ] **Test All Updates**
  ```bash
  npm run test:ci
  npm run build
  ```

---

## Week 18: Process & Documentation

- [ ] **Document Development Workflow**
  ```markdown
  # docs/development-workflow.md
  - TDD guidelines
  - Code review checklist
  - Testing requirements
  ```

- [ ] **Create Testing Guidelines**
  ```markdown
  # docs/testing-guidelines.md
  - Unit test standards
  - Integration test patterns
  - E2E test scenarios
  ```

- [ ] **Setup Pre-commit Hooks**
  ```bash
  npm install husky --save-dev
  npx husky install
  npx husky add .husky/pre-commit "npm run lint:fix && npm run test"
  ```

- [ ] **Train Team**
  - TDD workshop
  - Testing best practices
  - Code review training

---

## Ongoing: Monthly Maintenance

- [ ] **Run Security Audit**
  ```bash
  npm audit
  snyk test
  ```

- [ ] **Check for Outdated Packages**
  ```bash
  npm outdated
  ```

- [ ] **Review Coverage Reports**
  ```bash
  npm run test:coverage
  # Review coverage/lcov-report/index.html
  ```

- [ ] **Update Dependencies**
  ```bash
  npm update
  # Test thoroughly
  ```

- [ ] **Review Audit Reports**
  ```bash
  cat docs/audit/EXECUTIVE-SUMMARY.md
  # Update metrics
  ```

---

## Quick Commands Reference

```bash
# Setup
npm ci                           # Clean install dependencies
npm audit                        # Check for vulnerabilities
npm audit fix                    # Auto-fix vulnerabilities

# Development
npm run lint                     # Run ESLint
npm run lint:fix                 # Fix linting issues
npm run typecheck                # Run TypeScript compiler
npm run format                   # Format code with Prettier

# Testing
npm test                         # Run all tests
npm run test:watch               # Watch mode
npm run test:coverage            # Generate coverage report
npm run test:ci                  # CI test run

# API-specific
cd services/api
npm run db:migrate               # Run database migrations
npm run db:generate              # Generate migrations

# Coverage Review
open coverage/lcov-report/index.html  # Mac
xdg-open coverage/lcov-report/index.html  # Linux
```

---

## Progress Tracking

### Phase Completion Checklist

- [ ] **Phase 0: Unblock** (Week 1)
  - Node.js upgraded
  - Dependencies installed
  - Tooling working

- [ ] **Phase 1: Security** (Week 2)
  - drizzle-kit updated
  - 0 moderate vulnerabilities
  - Snyk integrated

- [ ] **Phase 2: Critical Testing** (Weeks 3-6)
  - 110 test files created
  - 40% coverage achieved
  - All critical paths tested

- [ ] **Phase 3: Core Features** (Weeks 7-10)
  - 78 tests added
  - 70% coverage achieved
  - Integration tests complete

- [ ] **Phase 4: Comprehensive** (Weeks 11-14)
  - 115 tests added
  - ≥80% coverage achieved
  - E2E tests complete
  - CI/CD gates active

- [ ] **Phase 5: Dependencies** (Weeks 15-17)
  - 0 deprecated packages
  - All tests passing
  - Documentation updated

- [ ] **Phase 6: Process** (Week 18)
  - Quality gates active
  - Team trained
  - Documentation complete

---

## Status Dashboard

Update weekly:

```
Week of: ___________

┌─────────────────────┬──────────┬─────────┐
│ Metric              │ Current  │ Target  │
├─────────────────────┼──────────┼─────────┤
│ Node.js Version     │          │ 20.x    │
│ Vulnerabilities     │          │ 0       │
│ Test Files          │          │ 599     │
│ Coverage            │          │ ≥80%    │
│ Deprecated Packages │          │ 0       │
└─────────────────────┴──────────┴─────────┘

Completed: [ ] Phase 0
           [ ] Phase 1
           [ ] Phase 2
           [ ] Phase 3
           [ ] Phase 4
           [ ] Phase 5
           [ ] Phase 6
```

---

## Contact & Support

**Questions?** Refer to:
- 📋 Executive Summary: `docs/audit/EXECUTIVE-SUMMARY.md`
- 🔒 Security Analysis: `docs/audit/security-analysis.md`
- ✅ Test Coverage: `docs/audit/test-coverage-analysis.md`
- 📊 Full Audit: `docs/audit/audit-report.md`

** blockers?** Escalate to Tech Lead or DevOps

**Weekly Sync:** [Schedule team standup to review progress]

---

**Checklist Version:** 1.0
**Last Updated:** 2026-01-02
**Next Review:** Weekly during sprint
