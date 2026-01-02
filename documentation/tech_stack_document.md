# Chartwarden Tech Stack Document

This document explains the technology choices behind Chartwarden—a hospice EHR system—in everyday language. It describes how each piece of technology fits into the big picture, ensuring anyone can understand why these tools were chosen and how they work together.

## Frontend Technologies

These tools power everything your users see and interact with in their web browser:

- **Next.js (React framework)**
  • Builds the user interface with React
  • Provides server-side rendering and static site generation for fast page loads and better SEO

- **React**
  • Lets us create reusable components (buttons, forms, charts) for a consistent look and feel

- **Material-UI (MUI)**
  • A library of pre-built, accessible UI components (buttons, tables, dialogs)
  • Speeds up design and keeps the interface consistent

- **TypeScript**
  • Adds type checking to JavaScript code
  • Catches errors early and improves developer confidence

- **Zustand (state management)**
  • A lightweight way to share data (like user login status or theme settings) across components

- **SWR (data fetching)**
  • Handles API calls, caching, and background revalidation of data for smooth user experiences

- **Axios (HTTP client)**
  • Simplifies API requests to our backend services

- **Socket.IO Client**
  • Enables real-time features (like live notifications or chat) by opening a two-way connection to the server

- **CASL (frontend authorization)**
  • Helps manage which UI actions are allowed based on a user’s permissions

## Backend Technologies

These components run on the server, handle data storage, and expose APIs that the frontend uses:

- **Fastify (Node.js framework)**
  • A fast, low-overhead server framework for building our RESTful APIs

- **PostgreSQL 16 (relational database)**
  • A reliable, open-source database for storing patient records, clinical notes, billing data, and more

- **Drizzle ORM**
  • A TypeScript-friendly tool that helps us write database queries safely and predictably

- **Better Auth (authentication layer)**
  • Manages user login and sessions using tokens (JWTs) or secure cookies

- **RBAC (Role-Based Access Control)**
  • Controls who can read, write, or modify each type of data (patients, billing, reports)

- **Redis 7**
  • An in-memory data store used for caching frequent queries and managing user sessions

- **Socket.IO Server**
  • Handles real-time communication with the frontend, powering live updates and notifications

- **Pino Logger**
  • Records structured logs (with PII redaction) for monitoring, troubleshooting, and audit purposes

- **Fastify Plugins**
  • Add built-in support for CORS, CSRF protection, rate limiting, file uploads, and static file serving

- **EDI Parsers and Billing Services**
  • Custom modules to process healthcare-specific data formats (e.g., 835 ERA files) for automated insurance claims handling

- **PDF & Excel Generation Services**
  • Create downloadable reports (PDF, XLSX) for financial, clinical, and operational data

## Infrastructure and Deployment

These choices ensure the system is reliable, easy to update, and can grow with demand:

- **Monorepo with Turborepo & npm workspaces**
  • All frontend, backend, and shared code live in one repository
  • Simplifies dependency management, code sharing, and consistent versioning

- **Docker & Docker Compose**
  • Containers package each service (database, backend, frontend) for consistent local setups and easy deployment

- **Version Control: Git & GitHub**
  • Tracks all code changes and enables collaboration through pull requests

- **CI/CD with GitHub Actions**
  • Automated pipelines run tests, linting, and deploy code when changes are merged

- **Cloud-Ready Deployment**
  • Docker images can be deployed to any cloud provider (AWS, Azure, GCP) or container platform (Kubernetes, ECS)

## Third-Party Integrations

Chartwarden connects to a few external services to extend functionality:

- **Healthcare Clearinghouses (via EDI)**
  • Sends and receives insurance claims and remittance advice in standard formats

- **Email Service (e.g., Nodemailer or SendGrid)**
  • Sends account notifications, certification reminders, and other patient/family communications

- **Charting & Visualization Libraries**
  • Powers trend charts and dashboards for vital signs and key performance indicators

## Security and Performance Considerations

We built Chartwarden with strong security and fast performance in mind:

- **Authentication & Authorization:**
  • Secure login with JWT or session tokens
  • Fine-grained permissions (RBAC) both on frontend (CASL) and backend middleware

- **Data Protection:**
  • Encryption in transit (TLS) and at rest
  • PII/PHI redaction in logs and error messages to maintain HIPAA compliance

- **Web Security:**
  • CORS, CSRF protection, rate limiting to prevent abuse
  • Strict validation of all incoming data

- **Audit Logging:**
  • Tracks every access and change to sensitive records for regulatory compliance

- **Caching & Performance:**
  • Redis caching for frequent queries
  • SWR on the frontend to reduce redundant API calls
  • Server-side rendering (Next.js) for faster initial page loads
  • Asynchronous operations (`async/await`) keep the server responsive under load

- **Monitoring & Alerts:**
  • Structured logs (Pino) and potential integration with monitoring tools (e.g., Datadog, New Relic)

## Conclusion and Overall Tech Stack Summary

Chartwarden’s technology choices were driven by the need for security, scalability, and a smooth user experience in a regulated healthcare environment. By combining a modern React/Next.js frontend with a high-performance Fastify backend, type-safe tooling (TypeScript, Drizzle), real-time features (Socket.IO), and robust infrastructure practices (monorepo, Docker, CI/CD), we ensure:

- A consistent, user-friendly interface that clinicians and administrators can rely on
- Secure, audit-ready handling of sensitive patient and billing data
- A modular architecture that can grow with new features and regulations

Together, these technologies form a cohesive, maintainable, and future-proof platform for hospice and palliative care providers.