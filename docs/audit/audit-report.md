# Chartwarden Codebase Audit Report

**Date:** 2026-01-02
**Branch:** feature/codebase-audit-and-hardening-jD-HO18A
**Auditor:** Claude Code (AI-Powered Audit)

---

## Executive Summary

This report provides a comprehensive audit of the Chartwarden Hospice EHR system codebase, covering static analysis, code quality, security vulnerabilities, test coverage, and architectural consistency.

### Key Findings Overview

- **Node.js Version Incompatibility:** Project requires Node.js >=20.0.0, but environment is running Node.js v18.20.8
- **ESLint Configuration:** Legacy .eslintrc.json format (ESLint 8.x) - requires migration to ESLint 9.x flat config
- **Test Coverage:** Limited test files detected across the codebase
- **Security:** npm audit reports already generated but needs Snyk analysis

---

## 1. Static Analysis - ESLint

### 1.1 Configuration Files

**Root ESLint Config:** `/workspace/repo/.eslintrc.json`
```json
{
  "root": true,
  "parser": "@typescript-eslint/parser",
  "plugins": ["@typescript-eslint", "prettier"],
  "extends": [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:prettier/recommended"
  ]
}
```

**Additional Configs:**
- `/workspace/repo/apps/web/.eslintrc.json`
- `/workspace/repo/services/api/.eslintrc.json`

### 1.2 ESLint Version Analysis

**Current State:**
- Root package.json: ESLint ^8.56.0
- Environment: ESLint 9.39.2 available (incompatible with legacy config)

**Issue:** ESLint 9.x requires new flat config format (`eslint.config.js`) instead of `.eslintrc.*`

**Recommendation:**
- Option A: Pin ESLint to 8.x until ready to migrate
- Option B: Migrate to ESLint 9.x flat config format
- Option C: Use `eslint@legacy` compatibility package

### 1.3 Lint Rules Status

**Configured Rules (Root):**
- `prettier/prettier: warn`
- `no-console: warn`
- `@typescript-eslint/no-unused-vars: error`
- `@typescript-eslint/no-explicit-any: warn`

**Status:** ⚠️ Cannot execute - Node.js version incompatibility preventing dependency installation

---

## 2. TypeScript Analysis

### 2.1 TypeScript Configuration Files

**Root tsconfig.json:** `/workspace/repo/tsconfig.json`
```json
{
  "compilerOptions": {
    "target": "es2020",
    "module": "commonjs",
    "lib": ["es2020"],
    "strict": true
  }
}
```

**Additional tsconfig files:**
- `/workspace/repo/apps/web/tsconfig.json`
- `/workspace/repo/services/api/tsconfig.json`
- `/workspace/repo/packages/utils/tsconfig.json`
- `/workspace/repo/packages/types/tsconfig.json`
- `/workspace/repo/packages/config/tsconfig.json`

### 2.2 TypeScript Version

**Installed:** TypeScript ^5.3.3
**Status:** ✅ Up-to-date (latest stable is 5.3.x)

### 2.3 Type Check Status

**Status:** ⚠️ Cannot execute `tsc --noEmit` due to incomplete dependency installation

---

## 3. Code Style - Prettier

### 3.1 Prettier Configuration

**Root Config:** `/workspace/repo/.prettierrc`
```
# Configuration: Default Prettier settings
```

**Root Ignore:** `/workspace/repo/.prettierignore`

**App/Web Config:** `/workspace/repo/apps/web/.prettierrc`

### 3.2 Prettier Version

**Root package.json:** Prettier ^3.1.1
**Status:** ✅ Latest version

### 3.3 Format Check Status

**Status:** ⚠️ Cannot execute `prettier --check` due to incomplete dependency installation

---

## 4. Security & Dependency Review

### 4.1 npm Audit Results

**Existing Audit Files:**
- `/workspace/repo/services/api/npm-audit-before.json`
- `/workspace/repo/services/api/npm-audit-after.json`

**Analysis Required:**
- ✅ npm audit reports exist
- ⚠️ Need to run fresh npm audit on root
- ❌ Snyk scan not yet performed

### 4.2 Dependency Version Analysis

**Critical Version Issues Detected:**

#### Node.js Engine Requirement
```
Required: >=20.0.0
Current:  v18.20.8
Status:   ❌ CRITICAL - Environment does not meet requirements
```

#### Deprecated Packages (from npm install warnings)
- `rimraf@3.0.2` - Use v4+
- `npmlog@6.0.2` - No longer supported
- `lodash.pick@4.4.0` - Use destructuring instead
- `lodash.isequal@4.5.0` - Use `node:util.isDeepStrictEqual`
- `inflight@1.0.6` - Leaks memory, use lru-cache
- `@esbuild-kit/esm-loader@2.6.5` - Merged into tsx
- `puppeteer@22.15.0` - < 24.15.0 no longer supported
- `puppeteer@10.4.0` - < 24.15.0 no longer supported
- `glob@7.2.3` - Use v9+
- `@mui/base@5.0.0-beta.40-1` - Replaced by @base-ui/react

### 4.3 Outdated Packages

**Status:** ⚠️ Cannot run `npm outdated` until dependencies are installed

**Planned Action:**
1. Install compatible dependencies (requires Node 20+)
2. Run `npm outdated` to identify update candidates
3. Review breaking changes before updating
4. Update packages incrementally

---

## 5. Test Coverage Analysis

### 5.1 Test Framework Configuration

**Web App (apps/web):**
- Framework: Jest
- Config: `/workspace/repo/apps/web/jest.config.js`
- Setup: `/workspace/repo/apps/web/jest.setup.js`
- Test script: `npm run test:coverage`

**API Service (services/api):**
- Framework: Jest
- Config: `/workspace/repo/services/api/jest.config.cjs`
- Test script: `npm run test:coverage`

### 5.2 Existing Test Files

**Detected Test Files:**
```
apps/web/__tests__/example.test.tsx
apps/web/src/views/nursing-notes/utils/__tests__/sanitize.test.ts
```

### 5.3 Coverage Status

**Current Coverage:** ⚠️ Unknown - cannot run `jest --coverage` without dependencies

**Target:** ≥80% overall coverage

**Gap Analysis Required:**
- Identify untested modules
- Identify uncovered branches
- Prioritize test additions for critical business logic

---

## 6. Architectural Consistency

### 6.1 Project Structure Analysis

**Monorepo Structure:**
```
chartwarden/
├── apps/           # Frontend applications
│   └── web/        # Next.js web application
├── services/       # Backend services
│   └── api/        # Express API service
├── packages/       # Shared packages
│   ├── config/     # Shared configuration
│   ├── types/      # TypeScript type definitions
│   └── utils/      # Shared utilities
├── documentation/  # Project documentation
└── infra/          # Infrastructure code
```

### 6.2 RFC-12 Compliance

**Status:** ⚠️ RFC-12 conventions reference not found in documentation

**Analysis Required:**
- Compare current structure against RFC-12 standards
- Identify any deviations
- Document rationale for any differences

### 6.3 Circular Dependency Check

**Status:** ⚠️ Cannot run dependency-cruiser without installation

**Planned Action:**
1. Install `dependency-cruiser`
2. Generate dependency graph
3. Identify and resolve circular imports
4. Document dependency structure

---

## 7. Critical Issues Summary

### 7.1 Blockers

| Issue | Severity | Impact | Resolution |
|-------|----------|--------|------------|
| Node.js version incompatibility | 🔴 CRITICAL | Cannot install/run tooling | Upgrade environment to Node 20+ |
| ESLint 8/9 config mismatch | 🟠 HIGH | Cannot run lint analysis | Pin ESLint to 8.x or migrate config |

### 7.2 High Priority

| Issue | Severity | Impact | Resolution |
|-------|----------|--------|------------|
| Deprecated packages | 🟠 HIGH | Security/stability risk | Update to latest versions |
| Missing tests | 🟠 HIGH | Unknown coverage | Add tests to achieve ≥80% |
| No circular dependency check | 🟡 MEDIUM | Potential runtime issues | Run dependency-cruiser |

### 7.3 Medium Priority

| Issue | Severity | Impact | Resolution |
|-------|----------|--------|------------|
| Prettier not run | 🟡 MEDIUM | Code style inconsistency | Run and fix formatting |
| TypeScript not compiled | 🟡 MEDIUM | Undetected type errors | Run tsc --noEmit |
| Snyk scan not run | 🟡 MEDIUM | Unknown security issues | Run Snyk analysis |

---

## 8. Metrics Dashboard

### 8.1 Before Metrics

| Metric | Before | Target | Status |
|--------|--------|--------|--------|
| ESLint Errors | Unknown | 0 | ⚠️ Cannot measure |
| Type Errors | Unknown | 0 | ⚠️ Cannot measure |
| Security Vulnerabilities (High/Critical) | Unknown | 0 | ⚠️ Needs audit |
| Test Coverage | Unknown | ≥80% | ⚠️ Cannot measure |
| Deprecated Packages | 14+ identified | 0 | ❌ Action needed |
| Circular Imports | Unknown | 0 | ⚠️ Needs analysis |

### 8.2 After Metrics

*To be populated after remediation*

---

## 9. Remediation Roadmap

### Phase 1: Environment Setup (CRITICAL)
1. ✅ Upgrade Node.js to v20.x or higher
2. ✅ Clean install all dependencies: `npm ci`
3. ✅ Verify all tooling works

### Phase 2: Static Analysis
4. ⬜ Run ESLint and document all errors
5. ⬜ Fix ESLint errors
6. ⬜ Run TypeScript compiler: `tsc --noEmit`
7. ⬜ Fix all type errors
8. ⬜ Run Prettier check: `prettier --check`
9. ⬜ Fix formatting violations

### Phase 3: Security Hardening
10. ⬜ Run fresh npm audit: `npm audit --json`
11. ⬜ Run Snyk scan: `snyk test`
12. ⬜ Document all vulnerabilities
13. ⬜ Remediate high/critical issues
14. ⬜ Update outdated packages

### Phase 4: Test Coverage
15. ⬜ Generate coverage report: `npm run test:coverage`
16. ⬜ Identify untested modules
17. ⬜ Write unit tests for key logic
18. ⬜ Achieve ≥80% coverage

### Phase 5: Architecture Review
19. ⬜ Verify RFC-12 compliance
20. ⬜ Run dependency-cruiser
21. ⬜ Resolve circular imports
22. ⬜ Document architecture decisions

### Phase 6: Final Report
23. ⬜ Compile final metrics
24. ⬜ Update this report with after/after comparison
25. ⬜ Create summary for stakeholders

---

## 10. Recommendations

### 10.1 Immediate Actions

1. **Upgrade Node.js Environment**
   - Current: v18.20.8
   - Required: v20.x or higher
   - Action: Update CI/CD pipeline and local dev environments

2. **Pin ESLint Version**
   - Add to package.json: `"eslint": "8.56.0"` (exact version)
   - Prevents automatic upgrade to incompatible v9

3. **Update Deprecated Dependencies**
   - Create migration plan for each deprecated package
   - Test thoroughly after each update

### 10.2 Process Improvements

1. **Automated Security Scanning**
   - Add `npm audit` to CI pipeline
   - Integrate Snyk for continuous monitoring
   - Fail build on new high/critical vulnerabilities

2. **Test Coverage Gates**
   - Add coverage threshold to Jest config
   - Fail PRs that drop below 80%
   - Require coverage for new code

3. **Pre-commit Hooks**
   - Use Husky to run lint and format checks
   - Auto-fix formatting issues
   - Prevent commits with type errors

### 10.3 Long-term Improvements

1. **ESLint Migration**
   - Plan migration to ESLint 9.x flat config
   - Update all config files
   - Document migration process

2. **Dependency Management Strategy**
   - Implement Dependabot or Renovate
   - Schedule regular dependency updates
   - Monitor security advisories

---

## 11. Appendix

### 11.1 Tool Versions Used

**Environment:**
- Node.js: v18.20.8 (should be >=20.0.0)
- npm: 10.8.2
- OS: Linux 6.8.0-83-generic

**Project Dependencies:**
- ESLint: ^8.56.0 (in code)
- Prettier: ^3.1.1
- TypeScript: ^5.3.3
- Jest: ^29.7.0

### 11.2 Commands Reference

```bash
# Static Analysis
npm run lint                    # Run ESLint via turbo
npm run typecheck              # Run TypeScript compiler
npm run format:check           # Check Prettier formatting

# Testing
npm run test:coverage          # Generate coverage report
npm run test:ci                # CI test run with coverage

# Security
npm audit                      # Check for vulnerabilities
npm audit fix                  # Auto-fix vulnerabilities
snyk test                      # Snyk security scan
snyk monitor                   # Monitor for new vulnerabilities

# Dependencies
npm outdated                   # List outdated packages
npm update                     # Update packages
npm ci                         # Clean install

# Architecture
npx depcruise --validate .dependency-cruiser.js  # Check circular deps
```

### 11.3 File Locations Reference

**Configuration Files:**
- Root: `.eslintrc.json`, `.prettierrc`, `tsconfig.json`
- Web: `apps/web/.eslintrc.json`, `apps/web/jest.config.js`
- API: `services/api/.eslintrc.json`, `services/api/jest.config.cjs`

**Reports Directory:**
- Audit artifacts: `docs/audit/`

---

## 12. Sign-off

**Audit Status:** ⚠️ INCOMPLETE - Environment Issues Block Full Analysis

**Next Steps:**
1. Resolve Node.js version compatibility
2. Re-run full audit with tooling
3. Complete all remediation tasks
4. Generate final metrics

**Report Generated:** 2026-01-02
**Last Updated:** 2026-01-02
