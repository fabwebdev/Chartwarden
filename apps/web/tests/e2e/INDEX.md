# E2E Test Directory Index

Quick reference for navigating the E2E test structure.

## 📁 Directory Overview

```
e2e/
├── 📄 README.md          - Complete E2E testing documentation
├── 📄 INDEX.md           - This file - quick reference guide
├── 📄 .gitignore         - Git ignore rules for test artifacts
│
├── 📁 pages/             - Page Object Models (POM)
│   └── README.md         - POM documentation and examples
│
├── 📁 fixtures/          - Reusable test fixtures
│   └── README.md         - Fixtures documentation and examples
│
├── 📁 helpers/           - Utility functions and test data generators
│   └── README.md         - Helpers documentation and examples
│
├── 📁 setup/             - Global setup and teardown scripts
│   └── README.md         - Setup/teardown documentation
│
└── *.spec.ts             - Test suites (to be created)
```

## 🚀 Quick Start

1. **Read the main README**: Start with [README.md](./README.md) for comprehensive documentation
2. **Understand the structure**: Each subdirectory has its own README with examples
3. **Follow the patterns**: Use Page Object Models, fixtures, and test data generators
4. **Write your tests**: Create test spec files in this directory

## 📚 Key Resources

| Resource | Purpose |
|----------|---------|
| [README.md](./README.md) | Main E2E testing documentation |
| [pages/README.md](./pages/README.md) | Page Object Model patterns |
| [fixtures/README.md](./fixtures/README.md) | Test fixture patterns |
| [helpers/README.md](./helpers/README.md) | Test data and utilities |
| [setup/README.md](./setup/README.md) | Global setup/teardown |

## 🎯 Test Suites (Planned)

The following test suites will be created in this directory:

- `auth.spec.ts` - Authentication workflows
- `patient-management.spec.ts` - Patient CRUD operations
- `patient-detail.spec.ts` - Patient detail views and editing
- `user-management.spec.ts` - User administration
- `nursing-note.spec.ts` - Clinical documentation
- `idg-meeting.spec.ts` - IDG meeting documentation
- `session-management.spec.ts` - Session handling
- `form-validation.spec.ts` - Form validation
- `authorization.spec.ts` - RBAC and permissions
- `error-handling.spec.ts` - Error scenarios

## 🏗️ Implementation Status

- [x] Directory structure created
- [x] Documentation written
- [ ] Page Object Models (T002-T004)
- [ ] Test fixtures (T005)
- [ ] Test data generators (T006-T007)
- [ ] Core workflow tests (T009-T014)
- [ ] Edge case tests (T015-T018)
- [ ] CI integration (T019-T025)

## 💡 Need Help?

- Check the [main README](./README.md) for detailed documentation
- Review subdirectory READMEs for specific patterns
- Consult [Playwright docs](https://playwright.dev/) for framework details
