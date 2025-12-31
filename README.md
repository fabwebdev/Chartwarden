# Hospice EHR Backend - Fastify API

> **A comprehensive, HIPAA-compliant Electronic Health Record system for hospice care providers**

**Version:** 2.0.0
**Framework:** Fastify + Drizzle ORM
**Database:** PostgreSQL
**Authentication:** Better Auth (Cookie-based)
**Last Updated:** December 27, 2024

---

## 📋 Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Modules](#modules)
- [Tech Stack](#tech-stack)
- [Installation](#installation)
- [Configuration](#configuration)
- [Database Setup](#database-setup)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Security & Compliance](#security--compliance)
- [Development](#development)
- [Architecture](#architecture)
- [License](#license)

---

## 🎯 Overview

This is a **production-ready Hospice EHR backend** built with Node.js, Fastify, and PostgreSQL. The system implements comprehensive hospice care management with full CMS/Medicare compliance, including HOPE assessments, IDG meetings, certifications, medications, billing, and staff management.

### Key Statistics

- **9 Clinical Modules** fully implemented
- **50+ Database Tables** with proper relationships
- **110+ API Endpoints** with RBAC protection
- **44 Enum Groups** for standardized data
- **HIPAA Compliant** with comprehensive audit logging
- **CMS Compliant** (HOPE, Face-to-Face, NOE, etc.)

---

## ✨ Features

### Core Infrastructure
- ✅ **Better Auth** - Secure cookie-based authentication with session management
- ✅ **RBAC + ABAC + CASL** - Multi-layer authorization system
- ✅ **HIPAA Audit Logging** - Comprehensive tracking of all data access and changes
- ✅ **Drizzle ORM** - Type-safe database operations with PostgreSQL
- ✅ **Fastify** - High-performance HTTP server (10x faster than Express)
- ✅ **Electronic Signatures** - 21 CFR Part 11 compliant signatures (SHA-256)

### Clinical Capabilities
- ✅ **HOPE Assessments** - CMS-required outcomes and assessment data set
- ✅ **Encounter Management** - Visit documentation with GPS tracking
- ✅ **Care Planning** - Interdisciplinary care plans with goals and interventions
- ✅ **IDG Meetings** - 14-day interdisciplinary group meeting compliance
- ✅ **Certifications** - Medicare certification periods with F2F tracking
- ✅ **Medication Management** - MAR, comfort kits, controlled substance tracking
- ✅ **Pain & Vital Signs** - Comprehensive pain assessment tools
- ✅ **Billing & Claims** - Revenue cycle management with NOE submission
- ✅ **Staff Management** - Employee tracking, credentials, caseload, productivity

---

## 📦 Modules

### Module A: Enums System ✅
**44 enum groups** for standardized clinical data
- Encounter types, visit types, levels of care
- Medication routes, frequencies, statuses
- Training types, credential types
- Clinical assessment categories

### Module B: HOPE Assessments ✅
**4 tables, 13 routes** - CMS HOPE compliance
- `hope_assessments` - Primary assessment data
- `hope_responses` - Individual item responses
- `hope_item_sets` - Response option sets
- `hope_validation_rules` - Data validation

**Key Features:**
- Initial, comprehensive, and resumption of care assessments
- CMS quality measure calculations
- Signature workflow with OASIS compliance

### Module C: Encounters ✅
**4 tables, 12 routes** - Visit documentation
- `encounters` - Visit records
- `encounter_signatures` - Multi-disciplinary signatures
- `encounter_vitals` - Vital signs per visit
- `encounter_diagnoses` - ICD-10 diagnosis tracking

**Key Features:**
- GPS check-in/checkout for field visits
- Visit type tracking (RN, LPN, CNA, Social Worker, Chaplain)
- Billing integration ready

### Module D: Care Planning ✅
**6 tables, 12 routes** - Interdisciplinary care plans
- `care_plans` - Master care plan
- `care_plan_problems` - Patient problems/diagnoses
- `care_plan_goals` - Patient-centered goals
- `care_plan_interventions` - Planned interventions
- `care_plan_revisions` - Change tracking
- `care_plan_signatures` - IDG approval signatures

**Key Features:**
- Problem-Goal-Intervention framework
- Automatic revision tracking
- Multi-disciplinary team collaboration

### Module E: IDG Meetings ✅
**4 tables, 15 routes** - 14-day IDG compliance
- `idg_meetings` - Meeting records
- `idg_attendees` - Participant tracking
- `idg_patient_reviews` - Patient-specific discussions
- `idg_meeting_signatures` - Attendance verification

**Key Features:**
- 14-day compliance tracking
- Overdue meeting alerts
- Patient review documentation

### Module F: Certifications ✅
**5 tables, 11 routes** - Medicare certification
- `certifications` - Certification periods (90/60 day)
- `face_to_face_encounters` - F2F encounter tracking
- `orders` - Physician orders with electronic signatures
- `verbal_orders_tracking` - 48-hour signature requirement
- `recertification_schedule` - Due date alerts

**Key Features:**
- INITIAL_90, SUBSEQUENT_90, SUBSEQUENT_60 periods
- Face-to-Face encounter compliance (30-day window)
- Verbal order 48-hour tracking
- Terminal illness narrative documentation

### Module G: Medications ✅
**6 tables, 10 routes** - Medication management
- `medications` - Patient medication list
- `mar_entries` - Medication Administration Record
- `comfort_kits` - Emergency medication kits
- `comfort_kit_usage_log` - Kit usage tracking
- `controlled_substance_log` - DEA compliance
- `medication_reconciliation` - CMS med rec requirement

**Key Features:**
- MAR documentation (given, refused, held, not given)
- Comfort kit management with destruction tracking
- Automatic controlled substance logging (Schedule II-V)
- Medication reconciliation at admission/transfer/discharge

### Module H: Billing ✅
**9 tables, 13 routes** - Revenue cycle management
- `payers` - Insurance companies and payer info
- `notice_of_election` - NOE submission (5-day rule)
- `claims` - UB-04 institutional claims
- `claim_service_lines` - Revenue codes (0651-0659)
- `payments` - Payment receipts (EOB/ERA)
- `payment_applications` - Payment allocation
- `billing_periods` - Level of care billing periods
- `ar_aging` - Accounts receivable aging
- `contracts` - Payer contracts and rates

**Key Features:**
- Notice of Election (NOE) with automatic timeliness calculation
- Claims management (create, submit, void)
- Payment application with adjustment tracking
- AR aging reports (0-30, 31-60, 61-90, 90+ buckets)

### Module I: Staff Management ✅
**6 tables, 15 routes** - Employee tracking
- `staff_profiles` - Employee demographics and info
- `staff_credentials` - Licenses, certifications with expiration alerts
- `staff_caseload` - Patient assignments
- `staff_schedule` - Work schedules, on-call, time-off
- `staff_productivity` - Performance metrics
- `staff_training` - Continuing education tracking

**Key Features:**
- Credential expiration alerts (configurable threshold)
- Caseload management with transfer tracking
- Schedule management (shifts, on-call, PTO)
- Productivity metrics (visits, documentation, quality scores)
- Training compliance with CEU tracking

---

## 🛠 Tech Stack

### Backend Framework
- **Fastify** - Lightning-fast web framework
- **Drizzle ORM** - TypeScript-first ORM for PostgreSQL
- **Better Auth** - Modern authentication library

### Database
- **PostgreSQL** - Production-grade relational database
- **Drizzle Kit** - Schema migration management

### Security & Auth
- **Better Auth** - Cookie-based authentication
- **RBAC** - Role-based access control
- **ABAC** - Attribute-based access control
- **CASL** - Authorization library for complex permissions

### Testing
- **Jest** - JavaScript testing framework
- **Test Fixtures** - Comprehensive mock data for all modules

### Code Quality
- **ES Modules** - Modern JavaScript modules
- **Node.js 22+** - Latest LTS Node.js version

---

## 📥 Installation

### Prerequisites
- Node.js 22.x or higher
- PostgreSQL 14.x or higher
- npm or yarn package manager

### Quick Start

```bash
# Clone the repository
git clone <repository-url>
cd ehr_backend-main

# Install dependencies
npm install

# Copy environment configuration
cp .env.example .env

# Configure your database in .env
# DATABASE_URL=postgresql://user:password@localhost:5432/hospice_ehr

# Run database migrations
npm run migrate:run

# Start the development server
npm run dev
```

The server will start on `http://localhost:3000` (or your configured PORT).

---

## ⚙️ Configuration

### Environment Variables

Create a `.env` file in the root directory:

```env
# Application
APP_NAME=Hospice EHR Backend
APP_ENV=development
APP_DEBUG=true
APP_URL=http://localhost:3000
PORT=3000

# Database (PostgreSQL)
DATABASE_URL=postgresql://hospici:hospici@localhost:5432/postgresdb
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=postgresdb
DB_USERNAME=hospici
DB_PASSWORD=hospici

# Authentication
BETTER_AUTH_SECRET=your-super-secret-auth-key-change-in-production
BETTER_AUTH_URL=http://localhost:3000

# JWT Configuration
JWT_SECRET=your-super-secret-jwt-key
JWT_EXPIRES_IN=24h

# Admin Creation
ADMIN_CREATION_SECRET=your-super-secret-admin-creation-key
```

### Security Notes

⚠️ **IMPORTANT**: Change all secret keys before deploying to production!

---

## 🗄 Database Setup

### Using Drizzle Migrations

```bash
# Generate new migration (after schema changes)
npx drizzle-kit generate

# Run migrations
npm run migrate:run

# Check migration status
npm run migrate:status
```

### Manual Database Setup

If you prefer to run migrations manually:

```bash
# Connect to PostgreSQL
psql -U postgres

# Create database
CREATE DATABASE hospice_ehr;

# Create user
CREATE USER hospici WITH PASSWORD 'hospici';

# Grant privileges
GRANT ALL PRIVILEGES ON DATABASE hospice_ehr TO hospici;
```

### Included Migrations

The following migrations are included:

1. **0010_add_billing_tables.sql** - Billing and revenue cycle tables
2. **0011_add_staff_management_tables.sql** - Staff management tables

---

## 📚 API Documentation

### Base URL
```
http://localhost:3000/api
```

### Authentication

All endpoints (except `/api/auth/*`) require authentication via cookie-based session.

#### Sign Up
```http
POST /api/auth/sign-up
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!",
  "name": "John Doe"
}
```

#### Sign In
```http
POST /api/auth/sign-in
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "SecurePassword123!"
}
```

#### Get Session
```http
GET /api/auth/session
```

### Module Endpoints

#### HOPE Assessments (13 endpoints)
```http
GET    /api/patients/:id/hope-assessments
POST   /api/patients/:id/hope-assessments
GET    /api/hope-assessments/:id
POST   /api/hope-assessments/:id/sign
GET    /api/hope-assessments/due
# ... 8 more endpoints
```

#### Encounters (12 endpoints)
```http
GET    /api/patients/:id/encounters
POST   /api/patients/:id/encounters
GET    /api/encounters/:id
POST   /api/encounters/:id/sign
POST   /api/encounters/:id/checkin
POST   /api/encounters/:id/checkout
# ... 6 more endpoints
```

#### Care Plans (12 endpoints)
```http
GET    /api/patients/:id/care-plans
POST   /api/patients/:id/care-plans
GET    /api/care-plans/:id
POST   /api/care-plans/:id/sign
POST   /api/care-plans/:id/problems
# ... 7 more endpoints
```

#### IDG Meetings (15 endpoints)
```http
GET    /api/idg-meetings
POST   /api/idg-meetings
GET    /api/idg-meetings/:id
POST   /api/idg-meetings/:id/attendees
POST   /api/idg-meetings/:id/sign
GET    /api/idg-meetings/due
# ... 9 more endpoints
```

#### Certifications (11 endpoints)
```http
GET    /api/patients/:id/certifications
POST   /api/patients/:id/certifications
POST   /api/certifications/:id/sign
GET    /api/patients/:id/f2f
POST   /api/patients/:id/orders
# ... 6 more endpoints
```

#### Medications (10 endpoints)
```http
GET    /api/patients/:id/medications
POST   /api/patients/:id/medications
POST   /api/medications/:id/hold
POST   /api/medications/:id/discontinue
POST   /api/patients/:id/mar
GET    /api/patients/:id/comfort-kits
# ... 4 more endpoints
```

#### Billing (13 endpoints)
```http
GET    /api/claims
POST   /api/claims
GET    /api/claims/:id
POST   /api/claims/:id/submit
POST   /api/claims/:id/void
GET    /api/claims/unbilled
POST   /api/patients/:id/noe
GET    /api/payments
POST   /api/payments/:id/apply
GET    /api/billing/ar-aging
# ... 3 more endpoints
```

#### Staff Management (15 endpoints)
```http
GET    /api/staff
POST   /api/staff
GET    /api/staff/:id
PATCH  /api/staff/:id
GET    /api/staff/:id/credentials
POST   /api/staff/:id/credentials
GET    /api/staff/credentials/expiring
GET    /api/staff/:id/caseload
POST   /api/staff/:id/caseload
GET    /api/staff/:id/schedule
POST   /api/staff/:id/schedule
GET    /api/staff/:id/productivity
POST   /api/staff/:id/productivity
GET    /api/staff/:id/training
POST   /api/staff/:id/training
```

### Complete API Documentation

For detailed API documentation with request/response schemas:
- See `docs/API_CLINICAL_MODULES.md` (2,700+ lines)
- See `docs/API_CERTIFICATIONS_MEDICATIONS.md` (1,250+ lines)
- See `docs/openapi.yaml` for OpenAPI 3.0.3 specification
- Open `docs/swagger-ui.html` for interactive documentation

---

## 🧪 Testing

### Run Tests

```bash
# Run all tests
npm test

# Run tests in watch mode
npm run test:watch

# Run tests with coverage
npm run test:coverage
```

### Test Files

- `tests/certification.test.js` - 75+ test cases for certifications
- `tests/medication.test.js` - 80+ test cases for medications
- `tests/staff.test.js` - 90+ test cases for staff management

### Test Fixtures

All test fixtures are located in `tests/fixtures/`:
- `certification.fixtures.js` - Mock data for certifications
- `medication.fixtures.js` - Mock data for medications
- `staff.fixtures.js` - Mock data for staff management

---

## 🔒 Security & Compliance

### HIPAA Compliance

✅ **Access Controls**
- Role-based access control (RBAC)
- Attribute-based access control (ABAC)
- User authentication and session management

✅ **Audit Logging**
- Comprehensive audit trail for all PHI access
- User action tracking
- Change history for all records

✅ **Data Protection**
- Encrypted database connections
- Secure password hashing
- Cookie-based session management with HTTP-only flags

✅ **Electronic Signatures**
- 21 CFR Part 11 compliant
- SHA-256 signature hashing
- IP address and user agent tracking

### CMS Compliance

✅ **HOPE Assessments** - Required for hospice quality reporting
✅ **Face-to-Face Encounters** - Within 30 days of recertification
✅ **Notice of Election** - 5-day filing requirement
✅ **IDG Meetings** - 14-day requirement
✅ **Medication Reconciliation** - Required at admission/transfer/discharge

---

## 👨‍💻 Development

### Project Structure

```
ehr_backend-main/
├── src/
│   ├── config/          # Configuration files
│   ├── controllers/     # Request handlers
│   ├── db/
│   │   └── schemas/     # Drizzle ORM schemas
│   ├── enums/           # Enumeration definitions
│   ├── middleware/      # Custom middleware
│   └── routes/          # API route definitions
├── database/
│   └── migrations/      # Database migrations
│       └── drizzle/     # Drizzle migration files
├── tests/               # Test suites
│   └── fixtures/        # Test mock data
├── docs/                # API documentation
├── .env.example         # Environment template
├── drizzle.config.js    # Drizzle configuration
├── package.json         # Dependencies
└── server.js            # Application entry point
```

### Database Schema Patterns

All schemas follow these conventions:
- Audit fields: `created_by_id`, `updated_by_id`, `deleted_at`
- Timestamps: `createdAt`, `updatedAt`
- Soft deletes: `deleted_at` for recoverable deletions
- Foreign keys: Proper relationships with cascade rules

### Adding a New Module

1. **Create Schema** (`src/db/schemas/moduleName.schema.js`)
2. **Export Schema** (add to `src/db/schemas/index.js`)
3. **Create Controller** (`src/controllers/ModuleName.controller.js`)
4. **Create Routes** (`src/routes/moduleName.routes.js`)
5. **Register Routes** (add to `src/routes/api.routes.js`)
6. **Generate Migration** (`npx drizzle-kit generate`)
7. **Run Migration** (`npm run migrate:run`)

### Development Commands

```bash
# Start development server with auto-reload
npm run dev

# Run linter
npm run lint

# Format code
npm run format

# Generate migration
npx drizzle-kit generate

# Run migrations
npm run migrate:run

# Seed database
npm run seed
```

---

## 🏗 Architecture

### Design Patterns

- **Repository Pattern** - Data access abstraction
- **Service Layer** - Business logic separation
- **Middleware Pipeline** - Request processing chain
- **Dependency Injection** - Loose coupling

### Key Principles

- **SOLID Principles** - Clean, maintainable code
- **DRY (Don't Repeat Yourself)** - Code reusability
- **Separation of Concerns** - Modular architecture
- **Type Safety** - Leveraging TypeScript/Drizzle ORM

---

## 📊 Project Status

### Completed Modules (9/12)

✅ Enums System
✅ HOPE Assessments
✅ Encounters
✅ Care Planning
✅ IDG Meetings
✅ Certifications
✅ Medications
✅ Billing
✅ Staff Management

### Remaining Modules (3/12)

⏳ Scheduling (5 tables, 22 routes)
⏳ Bereavement (8 tables, 14 routes)
⏳ QAPI (7 tables, 18 routes)
⏳ Reports (0 tables, 20 routes)

### Current Statistics

- **50 Database Tables** implemented
- **110 API Endpoints** with RBAC
- **44 Enum Groups** for standardized data
- **7,000+ lines** of documentation
- **245+ test cases** with comprehensive fixtures

---

## 📄 License

This project is licensed under the **MIT License**.

Copyright © 2024 Hospice EHR Development Team

---

## 🤝 Contributing

We welcome contributions! Please see our contributing guidelines for details.

### Development Team

- Backend Architecture
- Database Design
- API Development
- Security Implementation
- Testing & QA

---

## 📞 Support

For questions, issues, or feature requests:
- Create an issue on GitHub
- Email: support@hospice-ehr.org
- Documentation: `/docs` folder

---

## 🎯 Roadmap

### Q1 2025
- [ ] Complete Scheduling module
- [ ] Complete Bereavement module
- [ ] Complete QAPI module
- [ ] Complete Reports module

### Q2 2025
- [ ] Mobile API enhancements
- [ ] Real-time notifications
- [ ] Advanced analytics dashboard
- [ ] HL7 FHIR integration


### Future
- [ ] Machine learning predictions
- [ ] Natural language processing for documentation
- [ ] Multi-facility support
- [ ] Telehealth integration

---

**Built with ❤️ for hospice care providers**
