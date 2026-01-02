# Project Requirements Document

## 1. Project Overview

Chartwarden is a specialized Electronic Health Record (EHR) system tailored for hospice and palliative care providers. It centralizes patient admission, clinical documentation, compliance tracking, billing operations, staff scheduling, and bereavement services into one user-friendly web application. By consolidating these varied workflows, Chartwarden reduces manual paperwork, enforces HIPAA-compliant data handling, and speeds up administrative tasks so care teams can focus more on patients.

We’re building Chartwarden to solve the common pain points hospice organizations face: fragmented record-keeping, manual claim processing delays, and disparate communication channels. The key objectives for the first release are:

- Provide a secure, role-based portal for patient and staff management.
- Automate core billing tasks (claims, remittance parsing, payment posting).
- Offer basic reporting and analytics dashboards.
- Ensure HIPAA compliance with audit logging, data encryption, and fine-grained access control.

Success will be measured by adoption rate among pilot users, reduction in claim turnaround time, and positive feedback on ease of use and reliability.

---

## 2. In-Scope vs. Out-of-Scope

### In-Scope (Version 1)

- Patient admission and demographic management
- Clinical documentation: visits, assessments (cardiac, care plans, medications)
- Vital signs entry and trend charts
- Patient goals & problem tracking
- HIPAA compliance: audit logs, PII redaction, encryption in transit and at rest
- Role-Based Access Control (RBAC) for user permissions
- Billing & revenue cycle: claim submission, ERA parsing, payment posting, denial management
- Staff management: credentialing, caseload assignments, scheduling, GPS check-in/out
- Internal secure messaging between care team members
- Basic reporting: predefined clinical, financial, and operational dashboards
- Bereavement module: case tracking, follow-ups, resource management
- System administration: code tables, workflow configuration, data import/export

### Out-of-Scope (Later Phases)

- Mobile (iOS/Android) apps
- External secure messaging (with patients or external providers)
- Advanced ad-hoc report builder or BI integration
- Automated API documentation (Swagger/OpenAPI)
- Dedicated background job queue beyond simple schedulers
- AI-driven clinical decision support
- ABAC (Attribute-Based Access Control) beyond basic RBAC
- Automated security or accessibility scanning in CI/CD pipeline

---

## 3. User Flow

When a new hospice staff member logs into Chartwarden, they land on a unified dashboard showing high-level patient counts, upcoming visits, and pending claims. A left-hand menu gives quick access to Patients, Clinical Notes, Billing, Scheduling, Messaging, and Reports. From the Patients screen, users can search or filter by name, admission date, or status. Selecting a patient opens their profile, where tabs allow entry of assessments, vital signs, goals, and care plans. Users can save drafts or finalize notes based on their role.

Billing staff navigate to the Billing section to see claim queues and ERA remittances. They can upload EDI files for auto-parsing, review suggested payment postings, and handle denials. Once claims are posted, financial dashboards update in near real-time. Throughout the system, secure in-app messaging lets users notify colleagues of critical updates. Administrators use the System Settings area to manage user roles, permission levels, code tables, and scheduler rules for background tasks like report generation.

---

## 4. Core Features

- **Authentication & Authorization**: JWT-based login, session management, RBAC for pages and APIs.
- **Patient Management**: CRUD operations for patient demographics, status, and discharge.
- **Clinical Documentation**: Visit notes, assessments (cardiac, care plans, medications), POC updates.
- **Vital Signs Module**: Entry forms, trend visualizations, export options.
- **Goals & Problems Tracker**: Create, edit, close patient goals and problems with timestamps.
- **Billing & Claims**: Submit claims, parse 835/ERA files, auto-post payments, track denials.
- **Staff Scheduling**: Calendar view, GPS check-in/out, on-call rotations.
- **Messaging**: Secure internal chat with audit trail.
- **Reporting & Dashboards**: Prebuilt clinical, financial, and operational dashboards; CSV/PDF export.
- **Bereavement Services**: Case management, scheduled follow-ups, resource tracking.
- **System Administration**: Code table management, workflow configuration, environment setup.
- **Security & Compliance**: Audit logging, PII redaction, encrypted storage and transport.

---

## 5. Tech Stack & Tools

**Frontend**
- Next.js (React framework) with App Router
- TypeScript for type safety
- Material-UI (MUI) for UI components
- Zustand for state management
- SWR + Axios for data fetching
- Socket.IO Client for real-time updates

**Backend**
- Node.js with Fastify for REST APIs
- PostgreSQL 16 for relational data
- Drizzle ORM for type-safe database queries
- Better Auth (JWT + session) and custom RBAC middleware
- Redis 7 for caching and session storage
- Socket.IO Server for real-time communication
- Pino logger with PII/PHI redaction
- Custom EDI parsers (835) and PDF/Excel generation services

**Monorepo & Tooling**
- Turborepo + npm workspaces
- Docker Compose for local dev (PostgreSQL, Redis)
- ESLint, Prettier for code style
- Jest for unit/integration tests
- Playwright for E2E tests
- GitHub Actions (CI/CD)

---

## 6. Non-Functional Requirements

- **Performance**: API responses under 200 ms on average; page load time under 2 s.
- **Scalability**: Handle up to 500 concurrent users; vertical scaling via Docker.
- **Security & Compliance**: Full HIPAA compliance, encryption in transit (TLS) and at rest (AES-256), audit logs with tamper-proof storage.
- **Availability**: 99.5% uptime target; graceful degradation of non-critical features.
- **Usability**: WCAG 2.1 AA accessibility; intuitive UI with inline help.
- **Maintainability**: 80% test coverage, consistent linting, and code reviews.

---

## 7. Constraints & Assumptions

- The system runs in a Node.js 18+ environment with Docker support.
- PostgreSQL and Redis must be available (self-hosted or managed). 
- Fastify plugins for CORS, CSRF, and rate limiting are configured.
- Users have modern browsers (latest Chrome, Firefox, Safari).
- Development uses a single monorepo managed by Turborepo.
- Shared types (`@chartwarden/types`) keep frontend and backend in sync.
- Background tasks run via Fastify’s built-in scheduler (no external queue).

---

## 8. Known Issues & Potential Pitfalls

- **Bulk Report Performance**: Generating large reports can block event loop; mitigate by chunked processing or moving to a job queue later.
- **Database Indexing**: Without proper indexes, queries on large tables (e.g., vital signs history) may slow down; review and optimize periodically.
- **Cache Invalidation**: Redis caching of frequently accessed data must include clear invalidation policies to avoid stale reads.
- **API Rate Limits**: If hosted behind API gateways, ensure rate limits accommodate expected load or implement fallback.
- **PII Leakage**: Improper logging could expose sensitive data; rely on centralized PII redaction utilities and test thoroughly.
- **Schema Migrations**: Drizzle ORM migrations must be carefully versioned; use migration scripts and verify rollbacks.
- **Real-time Failover**: Socket.IO relies on persistent connections—plan fallbacks for network interruptions or consider polling as backup.


---

This PRD captures the core vision and requirements for Chartwarden’s first release. All subsequent technical documents—tech stack deep-dives, frontend guidelines, backend architecture, file structure, and CI/CD rules—should align with the details outlined here to keep the project consistent, compliant, and on schedule.